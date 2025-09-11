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

const scroller = document.querySelector(".scroller");
const scrollerInner = document.querySelector(".scroller-inner");

const animationSecond = 10;

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
    scrollerInner.innerHTML = "";

    const originalFragment = document.createDocumentFragment();
    const imageElements = imageUrls.map(url => {
      const img = document.createElement("img");
      img.src = url;
      img.alt = "gallery image";
      originalFragment.appendChild(img);
      return img;
    });

    scrollerInner.appendChild(originalFragment);

    const promises = imageElements.map(
      img => new Promise(resolve => (img.onload = resolve))
    );
    await Promise.all(promises);

    while (scrollerInner.scrollWidth < scroller.clientWidth) {
      console.log("Content is narrower than scroller. Duplicationg...");
      const fragment = document.createDocumentFragment();
      const newImageElements = imageUrls.map(url => {
        const img = document.createElement("img");
        img.src = url;
        img.alt = "gallery image";
        fragment.appendChild(img);
        return img;
      });

      const newPromises = newImageElements.map(
        img => new Promise(resolve => (img.onload = resolve))
      );

      scrollerInner.appendChild(fragment);

      await Promise.all(newPromises);
    }

    const currentImages = Array.from(scrollerInner.children);
    currentImages.forEach(img => {
      scrollerInner.appendChild(img.cloneNode(true));
    });

    const finalImageCount = scrollerInner.children.length / 2;
    const animationDuration = finalImageCount * animationSecond;
    scrollerInner.style.animationDuration = `${animationDuration}s`;
  } catch (error) {
    console.error("Error: Cannot get Image URLs", error);
    scrollerInner.textContent = "False get Images";
  }
}

document.addEventListener("DOMContentLoaded", initializeImageScroller);
