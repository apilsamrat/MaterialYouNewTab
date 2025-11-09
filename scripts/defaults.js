/*
 * Default settings initializer for Material You NewTab
 * This script writes predefined localStorage keys on first run only.
 */
(function () {
    try {
    // Marker to avoid overwriting user settings after first initialization
    // (handled below depending on `autoUpdateDefaults`)

        // Load defaults from defaults.json synchronously to avoid race with other deferred scripts
        var xhr = new XMLHttpRequest();
        xhr.open('GET', '/defaults.json', false); // false -> synchronous
        try {
            xhr.send(null);
        } catch (e) {
            // If request fails (e.g., file not found), fall back to no-op
            console.error('Failed to load /defaults.json:', e);
            return;
        }

        if (xhr.status !== 200 && xhr.status !== 0) {
            // status 0 can be returned for file:// loads in some environments; accept 0 as well
            console.warn('defaults.json not available (status ' + xhr.status + ')');
            return;
        }

        var parsed = {};
        try {
            parsed = JSON.parse(xhr.responseText || '{}');
        } catch (e) {
            console.error('Failed to parse defaults.json:', e);
            return;
        }

        var defaults = parsed.localStorage || parsed;
        var volatileKeys = parsed.volatileKeys || [];
        var autoUpdate = localStorage.getItem('autoUpdateDefaults');
        if (autoUpdate === null) autoUpdate = 'true';

        var alreadyInitialized = !!localStorage.getItem("myntrun_initialized");

        // If we've already initialized and autoUpdate is false, skip applying incoming defaults
        if (alreadyInitialized && autoUpdate !== 'true') {
            if (typeof console !== 'undefined' && console.debug) console.debug('[defaults] initialization skipped (already initialized and autoUpdate=false)');
            return;
        }

        // Apply defaults:
        // - On first run: write all defaults (including creating keys)
        // - On subsequent runs: if autoUpdate==true, overwrite non-volatile keys from network defaults
        Object.entries(defaults).forEach(function (_ref) {
            var key = _ref[0],
                value = _ref[1];

            try {
                if (volatileKeys.indexOf(key) !== -1) {
                    // skip volatile/runtime keys
                    return;
                }

                if (!alreadyInitialized) {
                    // first run: set everything
                    localStorage.setItem(key, value);
                } else if (autoUpdate === 'true') {
                    // subsequent runs: overwrite with network default when autoUpdate enabled
                    localStorage.setItem(key, value);
                } else {
                    // autoUpdate == false and already initialized: preserve local value
                }
            } catch (e) {
                // ignore quota/storage errors
            }
        });

        // Set marker so this initializer doesn't run again unless autoUpdate is true
        try { localStorage.setItem("myntrun_initialized", new Date().toISOString()); } catch (e) {}
        // Expose explicit API so UI handlers can mark that the user edited defaults
        try {
            if (typeof window !== 'undefined') {
                window.mynt_defaults_mark_user_modified = function () {
                    try { localStorage.setItem('myntrun_user_modified', 'true'); } catch (e) {}
                    if (typeof console !== 'undefined' && console.debug) console.debug('[defaults] explicitly marked user modified via mynt_defaults_mark_user_modified()');
                };
            }
        } catch (e) {
            // ignore
        }
        // If defaults.json contains indexedDB data (backup-style), restore it into ImageDB
        try {
            var indexed = parsed.indexedDB || parsed.indexedDb || null;
            if (indexed && typeof window !== 'undefined') {
                // Expose a flag so other scripts (wallpaper.js) can wait for this restore
                window.mynt_defaults_restoringIndexDB = true;

                // Minimal IndexedDB helper to open ImageDB
                function openImageDB() {
                    return new Promise(function (resolve, reject) {
                        var req = indexedDB.open('ImageDB', 1);
                        req.onupgradeneeded = function (ev) {
                            var db = ev.target.result;
                            if (!db.objectStoreNames.contains('backgroundImages')) db.createObjectStore('backgroundImages');
                        };
                        req.onsuccess = function (ev) { resolve(ev.target.result); };
                        req.onerror = function (ev) { reject(ev); };
                    });
                }

                function dataUrlToBlob(dataUrl) {
                    var parts = dataUrl.split(',');
                    var meta = parts[0];
                    var byteString = atob(parts[1]);
                    var mime = meta.match(/:(.*?);/)[1];
                    var ab = new ArrayBuffer(byteString.length);
                    var ia = new Uint8Array(ab);
                    for (var i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
                    return new Blob([ab], { type: mime });
                }

                (function restoreIndexedDB() {
                    // We'll attempt to write only the keys present under indexed (typical keys: backgroundImage, lastUpdateTime, imageType)
                    openImageDB().then(function (db) {
                        var tx = db.transaction('backgroundImages', 'readwrite');
                        var store = tx.objectStore('backgroundImages');

                        var entries = Object.entries(indexed || {});
                        entries.forEach(function (_ref2) {
                            var k = _ref2[0], v = _ref2[1];
                            try {
                                // If value looks like backup blob wrapper { isBlob: true, blob: dataUrl }
                                if (v && typeof v === 'object' && v.isBlob && v.blob) {
                                    var blob = dataUrlToBlob(v.blob);
                                    store.put(blob, k);
                                } else if (typeof v === 'string' && v.startsWith('data:')) {
                                    // direct dataURL string
                                    try { store.put(dataUrlToBlob(v), k); } catch (e) { store.put(v, k); }
                                } else {
                                    // plain value (timestamp or type)
                                    store.put(v, k);
                                }
                            } catch (e) {
                                try { store.put(v, k); } catch (ee) { /* ignore */ }
                            }
                        });

                        tx.oncomplete = function () {
                            try { window.mynt_defaults_restoringIndexDB = false; } catch (e) {}
                            try { window.dispatchEvent(new CustomEvent('mynt-indexeddb-restored')); } catch (e) {}
                            db.close();
                            if (typeof console !== 'undefined' && console.debug) console.debug('[defaults] restored indexedDB entries from defaults.json');
                        };

                        tx.onerror = function (ev) {
                            try { window.mynt_defaults_restoringIndexDB = false; } catch (e) {}
                            try { window.dispatchEvent(new CustomEvent('mynt-indexeddb-restored')); } catch (e) {}
                            db.close();
                        };
                    }).catch(function (err) {
                        try { window.mynt_defaults_restoringIndexDB = false; } catch (e) {}
                        try { window.dispatchEvent(new CustomEvent('mynt-indexeddb-restored')); } catch (e) {}
                    });
                })();
            }
        } catch (e) {
            // ignore restore errors
        }
    } catch (e) {
        // Fail silently; nothing to do during initialization
        console.error("defaults initialization failed:", e);
    }
})();
