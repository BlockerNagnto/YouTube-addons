async function initializeAddons() {
  // 檢查環境，防止在非 extension 環境報錯
  if (typeof chrome === 'undefined' || !chrome.runtime || !chrome.runtime.getURL) {
    return;
  }

  try {
    console.log('[YouTube addons] loading...');

    // 硬編碼預設清單
    const defaultAddons = ["speed_controler", "list_auto", "no_warning", "none_stop"];

    // 優先從 storage 抓取使用者設定
    const storage = await chrome.storage.local.get('enabled_addons');
    let enabledList = storage.enabled_addons;

    // 如果是第一次執行，存入預設清單
    if (!enabledList) {
      enabledList = defaultAddons;
      await chrome.storage.local.set({ 'enabled_addons': enabledList });
    }

    // 處理 Trusted Types 政策
    let policy = { createScriptURL: (s) => s };
    if (window.trustedTypes && window.trustedTypes.createPolicy) {
      policy = window.trustedTypes.defaultPolicy ||
        window.trustedTypes.createPolicy('yt-addon-loader', {
          createScriptURL: (s) => s
        });
    }

    enabledList.forEach(addonId => {
      const script = document.createElement('script');
      const rawUrl = chrome.runtime.getURL(`functions/${addonId}/addon.js`);
      
      script.src = policy.createScriptURL(rawUrl);
      script.onerror = () => console.error(`[YouTube addons] Failed to load addon: ${addonId}`);
      (document.head || document.documentElement).appendChild(script);
    });
  } catch (err) {
    console.error('[YouTube addons] addons load failed.', err);
  }
}

initializeAddons();