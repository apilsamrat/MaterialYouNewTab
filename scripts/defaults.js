/*
 * Default settings initializer for Material You NewTab
 * This script writes predefined localStorage keys on first run only.
 */
// Async defaults loader: network-first with cache fallback
(async function () {
    try {
        // Fetch defaults.json network-first, then fallback to cache
        var parsed = {};
        try {
            var resp = await fetch('/defaults.json', { cache: 'no-store' });
            if (resp && resp.ok) {
                var txt = await resp.text();
                try { parsed = JSON.parse(txt || '{}'); } catch (e) { parsed = {}; }
                // update runtime cache for offline use
                try {
                    if ('caches' in window) {
                        var c = await caches.open('mynt-runtime-v1');
                        c.put('/defaults.json', new Response(txt, { headers: { 'Content-Type': 'application/json' } }));
                    }
                } catch (e) { /* ignore caching errors */ }
            } else {
                throw new Error('Network response not ok');
            }
        } catch (err) {
            // network failed, try cache
            try {
                if ('caches' in window) {
                    var cached = await caches.match('/defaults.json');
                    if (cached) {
                        var txt2 = await cached.text();
                        try { parsed = JSON.parse(txt2 || '{}'); } catch (e) { parsed = {}; }
                    } else {
                        // no defaults available
                        if (typeof console !== 'undefined' && console.debug) console.debug('[defaults] no defaults.json found in network or cache');
                        return;
                    }
                } else {
                    if (typeof console !== 'undefined' && console.debug) console.debug('[defaults] no cache API available and network failed');
                    return;
                }
            } catch (e2) {
                if (typeof console !== 'undefined' && console.debug) console.debug('[defaults] error reading cache', e2);
                return;
            }
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

        // Apply defaults (localStorage)
        Object.entries(defaults).forEach(function (_ref) {
            var key = _ref[0], value = _ref[1];
            try {
                if (volatileKeys.indexOf(key) !== -1) return; // skip volatile/runtime keys
                if (!alreadyInitialized) {
                    localStorage.setItem(key, value);
                } else if (autoUpdate === 'true') {
                    localStorage.setItem(key, value);
                } else {
                    // preserve
                }
            } catch (e) {
                // ignore
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
        } catch (e) { /* ignore */ }

        // If defaults.json contains indexedDB data (backup-style), restore it into ImageDB
        try {
            var indexed = parsed.indexedDB || parsed.indexedDb || null;
            if (indexed && typeof window !== 'undefined') {
                window.mynt_defaults_restoringIndexDB = true;
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
                    var mime = (meta.match(/:(.*?);/) || [])[1] || 'application/octet-stream';
                    var ab = new ArrayBuffer(byteString.length);
                    var ia = new Uint8Array(ab);
                    for (var i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
                    return new Blob([ab], { type: mime });
                }
                (function restoreIndexedDB() {
                    openImageDB().then(function (db) {
                        var tx = db.transaction('backgroundImages', 'readwrite');
                        var store = tx.objectStore('backgroundImages');
                        var entries = Object.entries(indexed || {});
                        entries.forEach(function (_ref2) {
                            var k = _ref2[0], v = _ref2[1];
                            try {
                                if (v && typeof v === 'object' && v.isBlob && v.blob) {
                                    var blob = dataUrlToBlob(v.blob);
                                    store.put(blob, k);
                                } else if (typeof v === 'string' && v.startsWith('data:')) {
                                    try { store.put(dataUrlToBlob(v), k); } catch (e) { store.put(v, k); }
                                } else {
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
        } catch (e) { /* ignore restore errors */ }

    } catch (e) {
        console.error("defaults initialization failed:", e);
    }
})();
