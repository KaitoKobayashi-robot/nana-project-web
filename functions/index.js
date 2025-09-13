// v2 を v2 のパスで import
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const {
  onObjectFinalized,
  onObjectDeleted,
} = require("firebase-functions/v2/storage");
const { setGlobalOptions, logger } = require("firebase-functions/v2");

// Admin を import
const admin = require("firebase-admin");

// バケットの名前と参照するフォルダを定義
const BUCKET_NAME = "nana-project-firebase.firebasestorage.app";
const SAMPLE_FOLDER = "sample_images/"; // テスト用のフォルダ
const USER_FOLDER = "user_images/"; // ユーザのフォルダ
const FOLDER = SAMPLE_FOLDER; // フォルダを選択

//サービスアカウントキーを読み込む
const serviceAccountKey = require("./serviceAccountKey.json");

// admin 初期化
admin.initializeApp({
  credential: admin.credential.cert(serviceAccountKey),
  storageBucket: BUCKET_NAME,
});

// バケットを作成
const bucket = admin.storage().bucket();

// console.log("Get Bucket: ", bucket);

// setGlobalOptions を使う（region/timeout/memoryなど）
setGlobalOptions({
  region: "us-central1",
  timeoutSeconds: 60,
  memory: "256MiB",
  maxInstances: 5,
});

const { v4: uuidv4 } = require("uuid");
async function ensureDownloadToken(file) {
  const [md] = await file.getMetadata();
  const existing = md.metadata?.firebaseStorageDownloadTokens;
  if (existing && String(existing).trim().length) return existing;
  const token = uuidv4();
  await file.setMetadata({
    metadata: { firebaseStorageDownloadTokens: token },
    cacheControl: "public,max-age=325360000,immutable",
  });
  return token;
}

// ========== Storage → Firestore 反映（upload時） ==========
exports.onImageUpload = onObjectFinalized(async event => {
  try {
    const filePath = event.data.name || "";
    if (!filePath.startsWith(FOLDER) || filePath.endsWith("/")) return;

    const file = bucket.file(filePath);

    // 署名URLは「必要になってから生成」。ここは1枚分だけなのでOK
    // const [signedUrl] = await file.getSignedUrl({
    //   action: "read",
    //   expires: Date.now() + 365 * 24 * 60 * 60 * 1000, // 1年
    // });
    await ensureDownloadToken(file);

    const id = filePath.replace(/\//g, "_");
    await admin
      .firestore()
      .collection("images")
      .doc(id)
      .set(
        {
          path: filePath,
          // url: signedUrl,
          updatedAt: new Date(event.data.updated),
        },
        { merge: true }
      );

    logger.info(`Updated Firestore for ${filePath}`);
  } catch (e) {
    logger.error("onImageUpload failed", e);
    throw e;
  }
});

// ========== Storage → Firestore 反映（delete時）==========
exports.onImageDelete = onObjectDeleted(async event => {
  try {
    const filePath = event.data.name || "";
    if (!filePath.startsWith(FOLDER) || filePath.endsWith("/")) return;

    const id = filePath.replace(/\//g, "_");
    await admin.firestore().collection("images").doc(id).delete();

    logger.info(`Deleted document from Firestore for ${filePath}`);
  } catch (e) {
    logger.error("onImageDelete failed", e);
    throw e;
  }
});

// ========== 手動同期（callable） ==========
// 本番StorageのFOLDERを走査して Firestore を同期
exports.synchronizeStorageAndFirestore = onCall(async req => {
  try {
    const db = admin.firestore();
    const col = db.collection("images");
    const metadataDocRef = db.collection("metadata").doc("lastSync");

    const metadataDoc = await metadataDocRef.get();
    const lastSync = metadataDoc.exists
      ? metadataDoc.data().timestamp.toDate()
      : new Date(0);

    const [files] = await bucket.getFiles({ prefix: FOLDER });

    console.log("Get file:", files);

    const storageDocIds = new Set();
    files.forEach(f => {
      if (!f.name.endsWith("/")) {
        storageDocIds.add(f.name.replace(/\//g, "_"));
      }
    });

    const firestoreSnapshot = await col.get();
    const firestoreDocIds = new Set();
    firestoreSnapshot.forEach(doc => {
      firestoreDocIds.add(doc.id);
    });

    const batch = db.batch();
    let added = 0;
    let deleted = 0;

    for (const f of files) {
      if (f.name.endsWith("/")) continue;

      const docId = f.name.replace(/\//g, "_");
      const [metadata] = await f.getMetadata();
      const updatedTime = new Date(metadata.updated);

      if (updatedTime > lastSync || !firestoreDocIds.has(docId)) {
        await ensureDownloadToken(f);

        batch.set(
          col.doc(docId),
          {
            path: f.name,
            // url,
            updatedAt: updatedTime,
          },
          { merge: true }
        );
        added++;
      }
    }

    firestoreSnapshot.forEach(doc => {
      if (!storageDocIds.has(doc.id)) {
        batch.delete(doc.ref);
        deleted++;
      }
    });

    batch.set(metadataDocRef, {
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });

    await batch.commit();
    return {
      message: `OK: added=${added}, deleted=${deleted}`,
      added,
      deleted,
    };
  } catch (error) {
    logger.error("synchronizeStorageAndFirestore failed", error);
    // v2 の HttpsError で返す
    throw new HttpsError("internal", String(error?.message || error));
  }
});
