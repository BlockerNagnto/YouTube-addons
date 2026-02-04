async function initializeMainLoader() {
  try {
    console.log('[YouTube addons] loading addons in MAIN world...');

    let retry = 0;
    while (!(document.documentElement.dataset.enabledAddons && document.documentElement.dataset.extensionBaseUrl) && retry < 100) {
      await new Promise(r => setTimeout(r, 10));
      retry++;
    }

    const enabledList = JSON.parse(document.documentElement.dataset.enabledAddons || "[]");
    const baseUrl = document.documentElement.dataset.extensionBaseUrl;

    if (!baseUrl) {
      console.warn('[main.js] No enabled addons found from isolated.js');
      return;
    }

    const listUrl = `${baseUrl}functions/addons.json`;
    const listResponse = await fetch(listUrl);
    const addonsToCheck = await listResponse.json();

    let policy = { createScriptURL: (s) => s };
    if (window.trustedTypes && window.trustedTypes.createPolicy) {
      policy = window.trustedTypes.defaultPolicy ||
        window.trustedTypes.createPolicy('main-policy', { 
          createScriptURL: (s) => s 
        });
    }

    for (const addonId of addonsToCheck) {
      if (!enabledList.includes(addonId)) continue;

      try {
        const manifestUrl = `${baseUrl}functions/${addonId}/manifest.json`;
        const response = await fetch(manifestUrl);
        const addonConfig = await response.json();

        if (addonConfig.world === "MAIN") {
          const script = document.createElement('script');
          script.src = policy.createScriptURL(`${baseUrl}functions/${addonId}/addon.js`);
          script.async = false;
          (document.head || document.documentElement).appendChild(script);
          console.log(`[main.js] Summoned ${addonId} to MAIN world.`);
        }
      } catch (e) {
      }
    }
  } catch (err) {
    console.error('[main.js] Loader failed:', err);
  }
}

initializeMainLoader();