import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";
import {
  getFunctions,
  httpsCallable,
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-functions.js";

const firebaseConfig = {
  apiKey: "AIzaSyBS_S8Tfa_nNqH5TtrooC9EY4Be1qapIAk",
  authDomain: "nana-project-firebase.firebaseapp.com",
  projectId: "nana-project-firebase",
  storageBucket: "nana-project-firebase.firebasestorage.app",
  messagingSenderId: "146917195160",
  appId: "1:146917195160:web:5ceaf0d6333e0eb644bfed",
  measurementId: "G-CNDQ5N1D5P",
};

const app = initializeApp(firebaseConfig);
const functions = getFunctions(app);

const getImageUrls = httpsCallable(functions, "getImageUrls");

const scrollerInner = document.querySelector(".scroller-inner");

async function initializeImageScroller() {
  console.log("Getting Image URLs...");
  try {
    const result = await getImageUrls();
    const imageUrls = result.data;

    if (!imageUrls || imageUrls.length == 0) {
      console.warn("NO IMAGES");
      scrollerInner.textContent = "No Image";
      return;
    }

    console.log(`Success!!: ${imageUrls.length} images`);

    const imagesToDisplay = [...imageUrls, ...imageUrls];

    const fragment = document.createDocumentFragment();
    imagesToDisplay.forEach(url => {
      const img = document.createElement("img");
      img.src = url;
      img.alt = "gallary image";
      fragment.appendChild(img);
    });
    scrollerInner.appendChild(fragment);
  } catch (error) {
    console.error("Error: Cannot get Image URLs", error);
    scrollerInner.textContent = "False get Images";
  }
}

document.addEventListener("DOMContentLoaded", initializeImageScroller);
