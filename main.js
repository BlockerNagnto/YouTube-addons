async function initializeMainLoader() {
  try {
    console.log('[YouTube addons] loading addons in MAIN world...');

    // 2. 等待 isolated.js 寫入 dataset
    let retry = 0;
    while (!(document.documentElement.dataset.enabledAddons && document.documentElement.dataset.extensionBaseUrl) && retry < 100) {
      await new Promise(r => setTimeout(r, 10));
      retry++;
    }

    const enabledList = JSON.parse(document.documentElement.dataset.enabledAddons || "[]");
    const baseUrl = document.documentElement.dataset.extensionBaseUrl;
    // 讀取由 isolated.js 預檢後寫入的 manifestMap
    const manifestMap = JSON.parse(document.documentElement.dataset.manifestMap || "{}");

    if (!baseUrl) {
      console.warn('[main.js] No enabled addons found from isolated.js');
      return;
    }

    const listUrl = `${baseUrl}functions/addons.json`;
    const listResponse = await fetch(listUrl);
    const addonsToCheck = await listResponse.json();

    // 3. 處理 Trusted Types
    let policy = { createScriptURL: (s) => s };
    if (window.trustedTypes && window.trustedTypes.createPolicy) {
      policy = window.trustedTypes.defaultPolicy ||
        window.trustedTypes.createPolicy('main-policy', { 
          createScriptURL: (s) => s 
        });
    }

    // 4. 遍歷並載入
    for (const addonId of addonsToCheck) {
      if (!enabledList.includes(addonId)) continue;

      // 只有在 manifestMap 裡確認存在的才 fetch，徹底消滅 ERR_FILE_NOT_FOUND
      if (manifestMap[addonId]) {
        const addonConfig = manifestMap[addonId];
        if (addonConfig.world === "MAIN") {
          const script = document.createElement('script');
          script.src = policy.createScriptURL(`${baseUrl}functions/${addonId}/addon.js`);
          script.async = false;
          (document.head || document.documentElement).appendChild(script);
          console.log(`[main.js] Summoned ${addonId} to MAIN world.`);
        }
      }
    }
  } catch (err) {
    console.error('[main.js] Loader failed:', err);
  }
}

initializeMainLoader();