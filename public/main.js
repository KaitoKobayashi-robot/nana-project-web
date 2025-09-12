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

const app = initializeApp(firebaseConfig);
const functions = getFunctions(app, "us-central1");
const db = getFirestore(app);
const storage = getStorage(app);

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
// if (location.hostname === "localhost") {
//   console.log("Connectiong to Firestore Emulator...");
//   connectFirestoreEmulator(db, "localhost", 8080);
// }

// const getImageUrls = httpsCallable(functions, "getImageUrls");

const scroller = document.querySelector(".scroller");
const scrollerInner = document.querySelector(".scroller-inner");

const animationSecond = 10;

const q = query(collection(db, "images"), orderBy("updatedAt"));

// async function loadInitialImages() {
//   console.log("Loading initial images...");
//   try {
//     const querySnapshot = await getDocs(q);

//     querySnapshot.forEach(doc => {
//       const docData = doc.data();
//       addImageToScroller(docData.url, doc.id);
//     });

//     await updateAnimation();
//     console.log("Initial images loaded successfully.");
//   } catch (error) {
//     console.error("Error loading initial images: ", error);
//   }
// }

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

async function startListeningForChanges() {
  onSnapshot(
    q,
    snapshot => {
      snapshot.docChanges().forEach(change => {
        const docData = change.doc.data();
        console.log("Firestore change detected: ", change.type, docData);

        if (change.type === "added") {
          if (!document.querySelector(`[data-id="${change.doc.id}"]`)) {
            addImageByDoc(docData, change.doc.id);
          }
        }
        if (change.type === "removed") {
          removeImageFromeScroller(change.doc.id);
        }
      });
      updateAnimation();
    },
    error => {
      console.error("Error listening to Firestore: ", error);
    }
  );
}

function addImageToScroller(url, id) {
  const img = document.createElement("img");
  img.src = url;
  img.alt = "gallery image";
  img.dataset.id = id;
  scrollerInner.appendChild(img);
}

function removeImageFromeScroller(id) {
  const imgToRemove = scrollerInner.querySelector(`[data-id="${id}"]`);
  if (imgToRemove) {
    imgToRemove.remove();
  }
}

async function updateAnimation() {
  const currentImages = Array.from(scrollerInner.children);
  if (currentImages.length === 0) {
    scrollerInner.style.animation = "none";
    return;
  }
  while (scrollerInner.scrollWidth < scroller.clientWidth) {
    currentImages.forEach(img => {
      scrollerInner.appendChild(img.cloneNode(true));
    });
  }

  const finalImageCount = scrollerInner.children.length / 2;
  const animationDuration = finalImageCount * animationSecond;
  scrollerInner.style.animationDuration = `${animationDuration}s`;
}

const synchronize = httpsCallable(functions, "synchronizeStorageAndFirestore");
async function runSynchronization() {
  console.log("Requesting synchronization...");
  try {
    const result = await synchronize();
    console.log("Synchronization result:", result.data);
  } catch (error) {
    console.error("Synchronization failed:", error);
  }
}
runSynchronization().then(() => {
  startListeningForChanges();
});
// async function initializeImageScroller() {
//   console.log("Getting Image URLs...");
//   try {
//     const result = await getImageUrls();
//     const imageUrls = result.data;

//     if (!imageUrls || imageUrls.length == 0) {
//       console.warn("NO IMAGES");
//       scrollerInner.textContent = "No Image";
//       return;
//     }

//     console.log(`Success!!: ${imageUrls.length} images`);
//     scrollerInner.innerHTML = "";

//     const originalFragment = document.createDocumentFragment();
//     const imageElements = imageUrls.map(url => {
//       const img = document.createElement("img");
//       img.src = url;
//       img.alt = "gallery image";
//       originalFragment.appendChild(img);
//       return img;
//     });

//     scrollerInner.appendChild(originalFragment);

//     const promises = imageElements.map(
//       img => new Promise(resolve => (img.onload = resolve))
//     );
//     await Promise.all(promises);

//     while (scrollerInner.scrollWidth < scroller.clientWidth) {
//       console.log("Content is narrower than scroller. Duplicationg...");
//       const fragment = document.createDocumentFragment();
//       const newImageElements = imageUrls.map(url => {
//         const img = document.createElement("img");
//         img.src = url;
//         img.alt = "gallery image";
//         fragment.appendChild(img);
//         return img;
//       });

//       const newPromises = newImageElements.map(
//         img => new Promise(resolve => (img.onload = resolve))
//       );

//       scrollerInner.appendChild(fragment);

//       await Promise.all(newPromises);
//     }

//     const currentImages = Array.from(scrollerInner.children);
//     currentImages.forEach(img => {
//       scrollerInner.appendChild(img.cloneNode(true));
//     });

//     const finalImageCount = scrollerInner.children.length / 2;
//     const animationDuration = finalImageCount * animationSecond;
//     scrollerInner.style.animationDuration = `${animationDuration}s`;
//   } catch (error) {
//     console.error("Error: Cannot get Image URLs", error);
//     scrollerInner.textContent = "False get Images";
//   }
// }

// document.addEventListener("DOMContentLoaded", initializeImageScroller);
