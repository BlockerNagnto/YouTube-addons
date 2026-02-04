async function initializeAddons() {
  // 檢查環境，防止在非 extension 環境報錯
  if (typeof chrome === 'undefined' || !chrome.runtime || !chrome.runtime.getURL) {
    return;
  }

  try {
    console.log('[YouTube addons] loading...');

    const defaultAddons = ["speed_controler", "list_auto", "no_warning", "none_stop", "free_controler"];
    const storage = await chrome.storage.local.get('enabled_addons');
    let enabledList = storage.enabled_addons || defaultAddons;

    // Trusted Types 處理
    let policy = { createScriptURL: (s) => s };
    if (window.trustedTypes && window.trustedTypes.createPolicy) {
      policy = window.trustedTypes.defaultPolicy ||
        window.trustedTypes.createPolicy('yt-addon-loader', {
          createScriptURL: (s) => s
        });
    }

    enabledList.forEach(addonId => {
      // 根據你的需求，這裡可以擴充哪些要進 MAIN
      // 目前設定：只有 none_stop 會被注入到 MAIN World
      const isMainWorldTarget = (addonId === "none_stop");

      if (isMainWorldTarget) {
        // 注入到頁面環境 (MAIN World)
        const script = document.createElement('script');
        const rawUrl = chrome.runtime.getURL(`functions/${addonId}/addon.js`);
        script.src = policy.createScriptURL(rawUrl);
        script.async = false;
        
        script.onload = () => {
          console.log(`[YouTube addons] ${addonId} injected to MAIN world.`);
          // 樣式解耦：注入對應的 CSS
          injectAddonStyles(addonId);
        };
        
        (document.head || document.documentElement).appendChild(script);
      } else {
        // 留在原本環境執行 (或是你原本其他的執行邏輯)
        // 這裡暫時比照辦理注入，但如果你其他要留在 ISOLATED，則需另外處理
        injectAddonScript(addonId, policy);
      }
    });
  } catch (err) {
    console.error('[YouTube addons] addons load failed.', err);
  }
}

// 輔助函式：處理腳本注入
function injectAddonScript(addonId, policy) {
  const script = document.createElement('script');
  const rawUrl = chrome.runtime.getURL(`functions/${addonId}/addon.js`);
  script.src = policy.createScriptURL(rawUrl);
  script.onload = () => injectAddonStyles(addonId);
  (document.head || document.documentElement).appendChild(script);
}

// 輔助函式：樣式解耦 (CSS Injected)
function injectAddonStyles(addonId) {
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.type = 'text/css';
  link.href = chrome.runtime.getURL(`functions/${addonId}/addon.css`);
  (document.head || document.documentElement).appendChild(link);
}

initializeAddons();