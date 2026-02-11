async function initializeMainLoader() {
    try {
        let retry = 0;
        while (!(document.documentElement.dataset.enabledAddons && document.documentElement.dataset.extensionBaseUrl) && retry < 100) {
            await new Promise(r => setTimeout(r, 10));
            retry++;
        }

        const baseUrl = document.documentElement.dataset.extensionBaseUrl;
        if (!baseUrl) return;

        const res = await fetch(`${baseUrl}functions(main)/addons.json`);
        if (!res.ok) return;
        const addonsList = await res.json();

        const enabledList = JSON.parse(document.documentElement.dataset.enabledAddons || "[]");
        const allSettings = JSON.parse(document.documentElement.dataset.addonSettings || "{}");

        for (const addonId of addonsList) {
            if (!enabledList.includes(addonId)) continue;

            const addonBase = `${baseUrl}functions(main)/${addonId}/`;
            const langCode = (navigator.language || 'en').toLowerCase();
            let langData = {};

            const fetchLang = async (c) => {
                try {
                    const langPath = `lang/${c}/${addonId}.json`;
                    const lRes = await fetch(`${baseUrl}${langPath}`);
                    if (lRes.ok) return await lRes.json();
                    console.log(`[youtube addons] no ${langPath} for ${addonId}`);
                } catch (e) { }
                return null;
            };

            const enData = await fetchLang('en');
            if (enData) Object.assign(langData, enData);
            if (langCode !== 'en') {
                const locData = await fetchLang(langCode);
                if (locData) Object.assign(langData, locData);
            }
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
            } catch (e) {
                console.error(`[youtube addons] ${addonId} (MAIN) addon.js not found at ${addonBase}`);
            }
        }
    } catch (err) { }
}

initializeMainLoader();