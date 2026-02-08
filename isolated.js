async function initializeIsolatedLoader() {
    if (typeof chrome === 'undefined' || !chrome.runtime || !chrome.runtime.getURL) return;

    try {
        console.log('[YouTube addons] loading addons in ISOLATED world...');

        const baseUrl = chrome.runtime.getURL('');
        let enabledList = [];
        let addonSettings = {};

        // 1. 取得全域名單與設定 (functions/addons.json)
        try {
            const resAddons = await fetch(`${baseUrl}functions/addons.json`);
            if (resAddons.ok) {
                const globalConfig = await resAddons.json();
                enabledList = globalConfig.enabled_addons || [];
                addonSettings = globalConfig.settings || {};
            }
        } catch (e) {}

        const storage = await chrome.storage.local.get(['enabled_addons', 'settings']);
        if (storage.enabled_addons) enabledList = storage.enabled_addons;
        if (storage.settings) addonSettings = storage.settings;

        // 2. 預檢設定檔以判定 World
        const manifestMap = {};
        for (const addonId of enabledList) {
            let world = "ISOLATED"; 
            
            // 先看 addon.json
            try {
                const resAddonJson = await fetch(`${baseUrl}functions/${addonId}/addon.json`);
                if (resAddonJson.ok) {
                    const data = await resAddonJson.json();
                    if (data.world) world = data.world;
                }
            } catch (e) {}

            // 再看 manifest.json (優先級高)
            try {
                const resManifest = await fetch(`${baseUrl}functions/${addonId}/manifest.json`);
                if (resManifest.ok) {
                    const data = await resManifest.json();
                    if (data.world) world = data.world;
                }
            } catch (e) {}

            manifestMap[addonId] = { world };
        }

        // 3. 跨環境同步資料
        document.documentElement.dataset.enabledAddons = JSON.stringify(enabledList);
        document.documentElement.dataset.extensionBaseUrl = baseUrl;
        document.documentElement.dataset.manifestMap = JSON.stringify(manifestMap);
        document.documentElement.dataset.addonSettings = JSON.stringify(addonSettings);

        // 4. 執行載入器
        const loaderUrl = `${baseUrl}addons_loader.js`;
        const { runAddonLoader } = await import(loaderUrl);
        
        await runAddonLoader({
            enabledList,
            baseUrl,
            manifestMap,
            currentWorld: "ISOLATED",
            settings: addonSettings
        });

        console.log('[YouTube addons] All scripts injected.');
    } catch (err) {
        console.error('[isolated.js] Loader failed:', err);
    }
}
initializeIsolatedLoader();