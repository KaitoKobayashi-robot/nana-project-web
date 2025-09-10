document.addEventListener("DOMContentLoaded", async () => {
  try {
    const functions = firebase.functions();
    const getImageUrls = functions.httpsCallable("getImageUrls");
    const result = await getImageUrls();
    const urls = result.data;

    const scrollerInner = document.querySelector(".scroller-inner");

    const imageElements = [...urls, ...urls].map((url) => {
      const img = document.createElement("img");
      img.src = url;
      return img;
    });

    scrollerInner.append(...imageElements);
  } catch (error) {
    console.error("Error fetching image URLs:", error);
  }
});
