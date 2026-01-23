/*
 * Material You NewTab
 * Copyright (c) 2023-2025 XengShi
 * Licensed under the GNU General Public License v3.0 (GPL-3.0)
 * You should have received a copy of the GNU General Public License along with this program.
 * If not, see <https://www.gnu.org/licenses/>.
 */


// -------------------------- Wallpaper -----------------------------
const dbName = "ImageDB";
const storeName = "backgroundImages";
const timestampKey = "lastUpdateTime"; // Key to store last update time
const imageTypeKey = "imageType"; // Key to store the type of image ("random" or "upload")

// Open IndexedDB database
function openDatabase() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(dbName, 1);
        request.onupgradeneeded = function (event) {
            const db = event.target.result;
            db.createObjectStore(storeName);
        };
        request.onsuccess = (event) => resolve(event.target.result);
        request.onerror = (event) => reject("Database error: " + event.target.errorCode);
    });
}

// Save image Blob, timestamp, and type to IndexedDB
async function saveImageToIndexedDB(imageBlob, isRandom) {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, "readwrite");
        const store = transaction.objectStore(storeName);

        store.put(imageBlob, "backgroundImage"); // Save Blob
        store.put(new Date().toISOString(), timestampKey);
        store.put(isRandom ? "random" : "upload", imageTypeKey);

        transaction.oncomplete = () => resolve();
        transaction.onerror = (event) => reject("Transaction error: " + event.target.errorCode);
    });
}

// Load image Blob, timestamp, and type from IndexedDB
async function loadImageAndDetails() {
    const db = await openDatabase();
    return Promise.all([
        getFromStore(db, "backgroundImage"),
        getFromStore(db, timestampKey),
        getFromStore(db, imageTypeKey)
    ]);
}

function getFromStore(db, key) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, "readonly");
        const store = transaction.objectStore(storeName);
        const request = store.get(key);

        request.onsuccess = () => resolve(request.result);
        request.onerror = (event) => reject("Request error: " + event.target.errorCode);
    });
}

// Clear image data from IndexedDB
async function clearImageFromIndexedDB() {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, "readwrite");
        const store = transaction.objectStore(storeName);
        store.delete("backgroundImage");
        store.delete(timestampKey);
        store.delete(imageTypeKey);

        transaction.oncomplete = () => resolve();
        transaction.onerror = (event) => reject("Delete error: " + event.target.errorCode);
    });
}

// Handle file input and save image as upload
document.getElementById("imageUpload").addEventListener("change", function (event) {
    const file = event.target.files[0];
    if (file) {
        const imageUrl = URL.createObjectURL(file); // Create temporary Blob URL
        const image = new Image();

        image.onload = function () {
            document.body.style.setProperty("--bg-image", `url(${imageUrl})`);
            saveImageToIndexedDB(file, false)
                .then(() => {
                    toggleBackgroundType(true);
                    URL.revokeObjectURL(imageUrl); // Clean up memory
                })
                .catch(error => console.error(error));
        };

        image.src = imageUrl;
    }
});

// Fetch and apply random image as background from local images
const LOCAL_IMAGES_FOLDER = "images/landscapes/";
const TOTAL_LOCAL_IMAGES = 19;
const WALLPAPER_TIMESTAMP_KEY = "wallpaper_last_update_timestamp";
const WALLPAPER_IMAGE_NUMBER_KEY = "wallpaper_current_image_number";

async function applyRandomImage(showConfirmation = true) {
   
    try {
        // Select a random image from 1 to 19
        const randomImageNumber = Math.floor(Math.random() * TOTAL_LOCAL_IMAGES) + 1;
        const imageUrl = `${LOCAL_IMAGES_FOLDER}${randomImageNumber}.jpg`;
        
        // Fetch the local image
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);

        document.body.style.setProperty("--bg-image", `url(${blobUrl})`);
        await saveImageToIndexedDB(blob, true);
        
        // Store current timestamp and image number in localStorage
        localStorage.setItem(WALLPAPER_TIMESTAMP_KEY, new Date().getTime().toString());
        localStorage.setItem(WALLPAPER_IMAGE_NUMBER_KEY, randomImageNumber.toString());
        
        toggleBackgroundType(true);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 2000); // Delay URL revocation
    } catch (error) {
        console.error("Error fetching random image:", error);
    }
}

// Function to update the background type attribute
function toggleBackgroundType(hasWallpaper) {
    document.body.setAttribute("data-bg", hasWallpaper ? "wallpaper" : "color");
}

// Check and update image on page load
function checkAndUpdateImage() {
    // Get timestamp from localStorage
    const lastUpdateTimestamp = localStorage.getItem(WALLPAPER_TIMESTAMP_KEY);
    const now = new Date().getTime();
    
    // First check if we need to update based on time
    let needsUpdate = false;
    
    if (!lastUpdateTimestamp) {
        needsUpdate = true;
    } else {
        const lastUpdate = parseInt(lastUpdateTimestamp);
        const hoursDifference = (now - lastUpdate) / (1000 * 60 * 60);
        if (hoursDifference >= 24) {
            needsUpdate = true;
        }
    }
    
    loadImageAndDetails()
        .then(([blob, savedTimestamp, imageType]) => {

            // If it's an uploaded image, always show it
            if (blob && imageType === "upload") {
                const imageUrl = URL.createObjectURL(blob);
                document.body.style.setProperty("--bg-image", `url(${imageUrl})`);
                toggleBackgroundType(true);
                setTimeout(() => URL.revokeObjectURL(imageUrl), 1500);
                return;
            }

            // For random images, check if we need to update
            if (needsUpdate || !blob) {
                // Fetch a new random image
                applyRandomImage(false);
            } else {
                // Reapply the saved random image
                const imageUrl = URL.createObjectURL(blob);
                document.body.style.setProperty("--bg-image", `url(${imageUrl})`);
                toggleBackgroundType(true);
                setTimeout(() => URL.revokeObjectURL(imageUrl), 1500);
            }
        })
        .catch((error) => {
            console.error("Error loading image details:", error);
            applyRandomImage(false);
        });
}

// Event listeners for buttons
document.getElementById("uploadTrigger").addEventListener("click", () =>
    document.getElementById("imageUpload").click()
);

document.getElementById("clearImage").addEventListener("click", async function () {
    try {
        const [blob] = await loadImageAndDetails();
        if (!blob) {
            await alertPrompt(translations[currentLanguage]?.Nobackgroundset || translations["en"].Nobackgroundset);
            return;
        }

        const confirmationMessage = translations[currentLanguage]?.clearbackgroundimage || translations["en"].clearbackgroundimage;
        if (await confirmPrompt(confirmationMessage)) {
            try {
                await clearImageFromIndexedDB();
                localStorage.removeItem(WALLPAPER_TIMESTAMP_KEY);
                localStorage.removeItem(WALLPAPER_IMAGE_NUMBER_KEY);
                document.body.style.removeProperty("--bg-image");
                toggleBackgroundType(false);
            } catch (error) {
                console.error(error);
            }
        }
    } catch (error) {
        console.error(error);
    }
});
document.getElementById("randomImageTrigger").addEventListener("click", applyRandomImage);

// Start image check on page load. If defaults.js is restoring IndexedDB entries, wait for it.
if (typeof window !== 'undefined' && window.mynt_defaults_restoringIndexDB) {
    // Wait for the restore event (or fallback to timeout)
    var restoreHandler = function () {
        try { window.removeEventListener('mynt-indexeddb-restored', restoreHandler); } catch (e) {}
        checkAndUpdateImage();
    };
    window.addEventListener('mynt-indexeddb-restored', restoreHandler);
    // Fallback: if no event after 2s, just run the check
    setTimeout(function () {
        try { window.removeEventListener('mynt-indexeddb-restored', restoreHandler); } catch (e) {}
        checkAndUpdateImage();
    }, 2000);
} else {
    checkAndUpdateImage();
}
// ------------------------ End of BG Image --------------------------