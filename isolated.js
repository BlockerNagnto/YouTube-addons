async function initializeLoader() {
    if (typeof chrome === 'undefined' || !chrome.runtime?.getURL) return;
    const baseUrl = chrome.runtime.getURL('');

    try {
        const res = await fetch(`${baseUrl}functions/addons.json`);
        const addonsList = await res.json();

        const storage = await chrome.storage.local.get(['enabled_addons', 'settings']);
        const enabledList = storage.enabled_addons || addonsList;
        const allSettings = storage.settings || {};

        // 準備數據給 main.js
        document.documentElement.dataset.extensionBaseUrl = baseUrl;
        document.documentElement.dataset.enabledAddons = JSON.stringify(enabledList);
        document.documentElement.dataset.addonSettings = JSON.stringify(allSettings);

        for (const addonId of addonsList) {
            if (!enabledList.includes(addonId)) continue;

            const addonBase = `${baseUrl}functions/${addonId}/`;
            const langCode = (navigator.language || 'en').toLowerCase();
            let langData = {};

            const fetchLang = async (c) => {
                try {
                    const lRes = await fetch(`${baseUrl}lang/${c}/${addonId}.json`);
                    if (lRes.ok) return await lRes.json();
                    console.log(`[youtube addons] no lang/${c}/${addonId}.json for ${addonId}`);
                } catch (e) { }
                return null;
            };

            Object.assign(langData, await fetchLang('en') || {});
            if (langCode !== 'en') Object.assign(langData, await fetchLang(langCode) || {});
            const t = (key) => langData[key] || key;

            try {
                const module = await import(`${addonBase}addon.js`);
                if (module.default) {
                    await module.default({
                        addon: {
                            Url: { Get: (p = "") => addonBase + p },
                            settings: { get: (k) => (allSettings[addonId] || {})[k] }
                        },
                        msg: t
                    });
                }
            } catch (e) { }
        }
    } catch (err) { }
}
initializeLoader();