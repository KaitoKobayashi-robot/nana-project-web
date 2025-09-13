// モジュールのインポート
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";
import {
  getFunctions,
  httpsCallable,
  connectFunctionsEmulator,
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-functions.js";
import {
  getFirestore,
  collection,
  onSnapshot,
  query,
  orderBy,
  getDocs,
  connectFirestoreEmulator,
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";
import {
  getStorage,
  ref as storageRef,
  getDownloadURL,
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-storage.js";

// firebaseの設定
const firebaseConfig = {
  apiKey: "AIzaSyBS_S8Tfa_nNqH5TtrooC9EY4Be1qapIAk",
  authDomain: "nana-project-firebase.firebaseapp.com",
  projectId: "nana-project-firebase",
  storageBucket: "nana-project-firebase.firebasestorage.app",
  messagingSenderId: "146917195160",
  appId: "1:146917195160:web:5ceaf0d6333e0eb644bfed",
  measurementId: "G-CNDQ5N1D5P",
};
console.log("main.js script started!");

// firebase, functions, firestore, storage の初期化
const app = initializeApp(firebaseConfig);
const functions = getFunctions(app, "us-central1");
const db = getFirestore(app);
const storage = getStorage(app);

// hosting がローカルかどうかを判定
const isLocal =
  location.hostname === "localhost" ||
  location.hostname === "127.0.0.1" ||
  location.hostname === "::1";

if (isLocal) {
  console.log("Connecting to Functions Emulators...");
  connectFunctionsEmulator(functions, "127.0.0.1", 5001);
  console.log("Connecting to Firestore Emulator...");
  connectFirestoreEmulator(db, "127.0.0.1", 8080);
}

// グローバル変数を定義
const loader = document.querySelector(".loader"); // 画像変更時のインジケータ
const scroller = document.querySelector(".scroller"); // スクロール
const scrollerInner = document.querySelector(".scroller-inner"); // スクロールの中身
let latestImageId = null; // 最後に更新された画像
let isInitialLoad = true; // 初回起動時のフラグ
const animationSecond = 10; // 画像1枚あたりの表示秒数

// インジケータの表示関数
function showLoader() {
  loader.classList.remove("hidden");
}

// インジケータの非表示関数
function hideLoader() {
  loader.classList.add("hidden");
}

// 画像データを更新日時の降順で並べ替えたクエリ
const q = query(collection(db, "images"), orderBy("updatedAt", "desc"));

// 画像をドキュメントへ追加する関数
async function addImageByDoc(docData, id) {
  try {
    const path = docData.path;
    if (!path) return;
    let url = docData.url;

    url = await getDownloadURL(storageRef(storage, path));

    addImageToScroller(url, id);
  } catch (e) {
    console.error("Failed to resolve URL for", id, e);
  }
}

// firestore の更新を監視する関数
async function startListeningForChanges() {
  onSnapshot(
    q,
    async snapshot => {
      if (!isInitialLoad) {
        showLoader();
        console.log("Firestore change detected. Show Loader...");
      } else {
        console.log("Firestore initialize...");
      }

      if (isInitialLoad && snapshot.empty) {
        console.log("No initial images found.");
        hideLoader();
        isInitialLoad = false;
        return;
      }

      if (snapshot.docs.length > 0) {
        latestImageId = snapshot.docs[0].id;
      } else {
        latestImageId = null;
      }

      const changes = snapshot.docChanges();
      await Promise.all(
        changes.map(async change => {
          const docData = change.doc.data();
          console.log("Firestore change detected: ", change.type, docData);

          if (change.type === "added") {
            if (!document.querySelector(`[data-id="${change.doc.id}"]`)) {
              await addImageByDoc(docData, change.doc.id);
            }
          }
          if (change.type === "removed") {
            removeImageFromScroller(change.doc.id);
          }
        })
      );

      await updateAnimation();
      console.log("Animation updated. Hiding loader.");
      isInitialLoad = false;
    },
    error => {
      console.error("Error listening to Firestore: ", error);
      hideLoader();
    }
  );
}

// 画像をスクロールの中に追加する関数
function addImageToScroller(url, id) {
  const img = document.createElement("img");
  img.src = url;
  img.alt = "gallery image";
  img.dataset.id = id;
  scrollerInner.appendChild(img);
}

// 画像をスクロールの中から消去する関数
function removeImageFromScroller(id) {
  const imgToRemove = scrollerInner.querySelectorAll(`[data-id="${id}"]`);
  if (imgToRemove) {
    imgToRemove.forEach(img => img.remove());
  }
}

// アニメーションを更新する関数
async function updateAnimation() {
  const allImagesInDom = Array.from(scrollerInner.children);

  await Promise.all(
    allImagesInDom
      .filter(img => !img.complete)
      .map(
        img =>
          new Promise(resolve => {
            img.onload = img.onerror = resolve;
          })
      )
  );

  const originalImages = [];
  const seenIds = new Set();
  allImagesInDom.forEach(img => {
    if (!seenIds.has(img.dataset.id)) {
      originalImages.push(img);
      seenIds.add(img.dataset.id);
    }
  });

  if (originalImages.length === 0) {
    scrollerInner.style.animation = "none";
    scrollerInner.innerHTML = "";
    hideLoader();
    return;
  }

  scrollerInner.innerHTML = "";
  originalImages.forEach(img => scrollerInner.appendChild(img));

  while (scrollerInner.scrollWidth < scroller.clientWidth) {
    originalImages.forEach(img => {
      scrollerInner.appendChild(img.cloneNode(true));
    });
    if (scrollerInner.children.length > originalImages.length * 20) {
      console.warn(
        "Image duplication has been STOPPED !!! ( the possibility of an infinite loop )"
      );
      break;
    }
  }

  const currentImagesSet = Array.from(scrollerInner.children);
  currentImagesSet.forEach(img => {
    scrollerInner.appendChild(img.cloneNode(true));
  });

  currentImagesSet.forEach(img => img.classList.remove("highlight"));

  if (latestImageId) {
    const imagesToHighlight = scrollerInner.querySelectorAll(
      `[data-id="${latestImageId}"]`
    );
    imagesToHighlight.forEach(img => img.classList.add("highlight"));
  }

  const finalImageCount = scrollerInner.children.length / 2;
  const animationDuration = finalImageCount * animationSecond;
  scrollerInner.style.animation = `scroll ${animationDuration}s infinite linear`;

  hideLoader();
}

// onCall の synchronizeStorageAndFirestore を呼ぶ準備
const synchronize = httpsCallable(functions, "synchronizeStorageAndFirestore");
async function runSynchronization() {
  showLoader();
  console.log("Requesting synchronization...");
  try {
    const result = await synchronize();
    console.log("Synchronization result:", result.data);
  } catch (error) {
    console.error("Synchronization failed:", error);
  }
}

// firestore を storage に同期させてから監視
runSynchronization().then(() => {
  startListeningForChanges();
});
