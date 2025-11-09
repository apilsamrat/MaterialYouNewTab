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
    } catch (e) {
        // Fail silently; nothing to do during initialization
        console.error("defaults initialization failed:", e);
    }
})();
