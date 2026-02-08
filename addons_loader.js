export async function runAddonLoader({ enabledList, baseUrl, manifestMap, currentWorld, settings }) {
    const langCode = navigator.language || 'en';

    for (const addonId of enabledList) {
        const config = manifestMap[addonId] || { world: "ISOLATED" };
        if (config.world !== currentWorld) continue;

        try {
            const addonBaseUrl = `${baseUrl}functions/${addonId}/`;

            // 1. 判定 addon.js 是否存在 (最終依據)
            const checkRes = await fetch(`${addonBaseUrl}addon.js`, { method: 'HEAD' }).catch(() => ({ ok: false }));
            if (!checkRes.ok) {
                console.error(`[${currentWorld}] Addon file not found: ${addonId}/addon.js`);
                continue;
            }

            // 2. 靜默加載 CSS (避免 ERR_FILE_NOT_FOUND 噴在 Log)
            const cssUrl = `${addonBaseUrl}addon.css`;
            fetch(cssUrl, { method: 'HEAD' }).then(res => {
                if (res.ok) {
                    const link = document.createElement('link');
                    link.rel = 'stylesheet';
                    link.href = cssUrl;
                    document.head.appendChild(link);
                }
            }).catch(() => { });

            // 3. 強化語言載入邏輯：支援預設語言 (en) 回退機制
            let langData = {};
            let enData = {};

            // 優先抓取目標語言
            try {
                const langRes = await fetch(`${baseUrl}lang/${langCode}/${addonId}.json`);
                if (langRes.ok) langData = await langRes.json();
            } catch (e) { }

            // 如果目標語言不是 en，則抓取 en 作為備援
            if (langCode !== 'en') {
                try {
                    const enRes = await fetch(`${baseUrl}lang/en/${addonId}.json`);
                    if (enRes.ok) enData = await enRes.json();
                } catch (e) { }
            }

            // 優先級：目標語言 > en > 原始 key
            const msg = (key) => langData[key] || enData[key] || key;

            // 4. 封裝 addon 對象 (嚴格遵守使用者命名：Url.Get)
            const addonObject = {
                Url: {
                    Get: (path = "") => `${addonBaseUrl}${path}`
                },
                settings: {
                    get: (key) => {
                        const addonSet = settings[addonId] || {};
                        return addonSet[key];
                    }
                }
            };

            // 5. 執行插件
            const moduleUrl = `${addonBaseUrl}addon.js`;
            const addonModule = await import(moduleUrl);

            if (addonModule.default) {
                await addonModule.default({
                    addon: addonObject,
                    msg
                });
                console.log(`[${currentWorld}] Summoned ${addonId}.`);
            }
        } catch (err) {
            console.error(`[${currentWorld}] Failed to load addon ${addonId}:`, err);
        }
    }
}