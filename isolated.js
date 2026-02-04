async function initializeIsolatedLoader() {
    // 檢查環境，防止在非 extension 環境報錯
    if (typeof chrome === 'undefined' || !chrome.runtime || !chrome.runtime.getURL) {
        return;
    }

    try {
        console.log('[YouTube addons] loading addons in ISOLATED world...');

        // 1. 取得設定與預設清單
        const defaultAddons = ["speed_controler", "list_auto", "no_warning", "none_stop", "free_controler"];
        const storage = await chrome.storage.local.get('enabled_addons');
        const enabledList = storage.enabled_addons || defaultAddons;

        // 準備一個 Map 用來存放預檢後的 manifest 內容
        const manifestMap = {};

        // 輔助：使用 getPackageDirectoryEntry 檢查檔案是否存在，避免 fetch 報錯
        const checkFileExists = (path) => new Promise((resolve) => {
            chrome.runtime.getPackageDirectoryEntry((root) => {
                root.getFile(path, {}, () => resolve(true), () => resolve(false));
            });
        });

        // 2. 處理 Trusted Types (針對注入的 script)
        let policy = { createScriptURL: (s) => s };
        if (window.trustedTypes && window.trustedTypes.createPolicy) {
            policy = window.trustedTypes.defaultPolicy ||
                window.trustedTypes.createPolicy('isolated-policy', {
                    createScriptURL: (s) => s
                });
        }

        // 3. 遍歷並執行載入
        for (const addonId of enabledList) {
            try {
                const manifestPath = `functions/${addonId}/manifest.json`;
                const hasManifest = await checkFileExists(manifestPath);

                if (hasManifest) {
                    const manifestUrl = chrome.runtime.getURL(manifestPath);
                    const response = await fetch(manifestUrl);
                    const addonConfig = await response.json();

                    // 存入 Map，稍後同步給 MAIN world
                    manifestMap[addonId] = addonConfig;

                    // 判斷：沒定義 world 或定義為 ISOLATED 都在此執行
                    if (!addonConfig.world || addonConfig.world === "ISOLATED") {
                        injectAddon(addonId, policy);
                    }
                } else {
                    // 找不到 manifest.json 則視為舊版或預設，直接在 isolated 執行
                    injectAddon(addonId, policy);
                }
            } catch (e) {
                // 發生非檔案不存在的錯誤時，仍按預設執行
                injectAddon(addonId, policy);
            }
        }

        // 4. 跨環境同步：將開啟清單與預檢結果寫入 DOM
        document.documentElement.dataset.enabledAddons = JSON.stringify(enabledList);
        document.documentElement.dataset.extensionBaseUrl = chrome.runtime.getURL('');
        document.documentElement.dataset.manifestMap = JSON.stringify(manifestMap);

    } catch (err) {
        console.error('[isolated.js] Loader failed:', err);
    }
}

//執行腳本注入
function injectAddon(addonId, policy) {
    const script = document.createElement('script');
    const rawUrl = chrome.runtime.getURL(`functions/${addonId}/addon.js`);

    script.src = policy.createScriptURL(rawUrl);
    script.async = false;
    /*
    script.onload = () => {
        console.log(`[isolated.js] Loaded: ${addonId}`);
    };
    */
    script.onerror = () => console.error(`[isolated.js] Failed to load: ${addonId}`);

    (document.head || document.documentElement).appendChild(script);
}

// 啟動載入器
initializeIsolatedLoader();