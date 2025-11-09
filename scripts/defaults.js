/*
 * Default settings initializer for Material You NewTab
 * This script writes predefined localStorage keys on first run only.
 */
(function () {
    try {
        // Marker to avoid overwriting user settings after first initialization
        if (localStorage.getItem("myntrun_initialized")) return;

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

        Object.entries(defaults).forEach(function (_ref) {
            var key = _ref[0],
                value = _ref[1];
            if (!localStorage.getItem(key)) {
                localStorage.setItem(key, value);
            }
        });

        // Set marker so this initializer doesn't run again
        localStorage.setItem("myntrun_initialized", new Date().toISOString());
    } catch (e) {
        // Fail silently; nothing to do during initialization
        console.error("defaults initialization failed:", e);
    }
})();
