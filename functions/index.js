/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */
const { setGlobalOptions } = require("firebase-functions");
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const BUCKET_NAME = "nana-project-firebase.firebasestorage.app";

admin.initializeApp({
  storageBucket: BUCKET_NAME,
});

const bucket = admin.storage().bucket();

console.log("Get storage: ", bucket);

exports.getImageUrls = functions.https.onCall(async (data, context) => {
  const folder = "user_images/";

  const expirationDate = new Date();
  // Set expiration to 1 month from now
  expirationDate.setMonth(expirationDate.getMonth() + 1);

  const config = { action: "read", expires: expirationDate };

  try {
    const [files] = await bucket.getFiles({ prefix: folder });
    const imageFiles = files.filter(file => !file.name.endsWith("/"));
    if (imageFiles.length === 0) {
      console.log("No image files found in the specified folder.");
      return [];
    }

    const urlPromises = imageFiles.map(file => file.getSignedUrl(config));
    const signnedUrls = await Promise.all(urlPromises);
    const imageUrls = signnedUrls.map(urlArray => urlArray[0]);
    console.log("Retrieved image URLs:", imageUrls);
    return imageUrls;
  } catch (error) {
    console.error("Error retrieving image URLs:", error);
    throw new functions.https.HttpsError(
      "internal",
      "Cannot get image URL",
      error
    );
  }
});

// For cost control, you can set the maximum number of containers that can be
// running at the same time. This helps mitigate the impact of unexpected
// traffic spikes by instead downgrading performance. This limit is a
// per-function limit. You can override the limit for each function using the
// `maxInstances` option in the function's options, e.g.
// `onRequest({ maxInstances: 5 }, (req, res) => { ... })`.
// NOTE: setGlobalOptions does not apply to functions using the v1 API. V1
// functions should each use functions.runWith({ maxInstances: 10 }) instead.
// In the v1 API, each function can only serve one request per container, so
// this will be the maximum concurrent request count.
setGlobalOptions({ maxInstances: 10 });

// Create and deploy your first functions
// https://firebase.google.com/docs/functions/get-started

// exports.helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });
