async function initializeIsolatedLoader() {
    if (typeof chrome === 'undefined' || !chrome.runtime || !chrome.runtime.getURL) {
        return;
    }

    try {
        console.log('[YouTube addons] loading addons in ISOLATED world...');

        const defaultAddons = ["speed_controler", "list_auto", "no_warning", "none_stop", "free_controler"];
        const storage = await chrome.storage.local.get('enabled_addons');
        const enabledList = storage.enabled_addons || defaultAddons;

        document.documentElement.dataset.enabledAddons = JSON.stringify(enabledList);
        document.documentElement.dataset.extensionBaseUrl = chrome.runtime.getURL('');

        let policy = { createScriptURL: (s) => s };
        if (window.trustedTypes && window.trustedTypes.createPolicy) {
            policy = window.trustedTypes.defaultPolicy ||
                window.trustedTypes.createPolicy('isolated-policy', {
                    createScriptURL: (s) => s
                });
        }

        for (const addonId of enabledList) {
            try {
                const manifestUrl = chrome.runtime.getURL(`functions/${addonId}/manifest.json`);
                const response = await fetch(manifestUrl);
                const addonConfig = await response.json();

                if (!addonConfig.world || addonConfig.world === "ISOLATED") {
                    injectAddon(addonId, policy);
                }
            } catch (e) {
                injectAddon(addonId, policy);
            }
        }
    } catch (err) {
        console.error('[isolated.js] Loader failed:', err);
    }
}

function injectAddon(addonId, policy) {
    const script = document.createElement('script');
    const rawUrl = chrome.runtime.getURL(`functions/${addonId}/addon.js`);

    script.src = policy.createScriptURL(rawUrl);
    script.async = false;
    script.onerror = () => console.error(`[isolated.js] Failed to load: ${addonId}`);

    (document.head || document.documentElement).appendChild(script);
}

initializeIsolatedLoader();