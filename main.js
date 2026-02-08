(async function initializeMainWorld() {
    const dataset = document.documentElement.dataset;
    if (!dataset.enabledAddons || !dataset.extensionBaseUrl) return;

    try {
        console.log('[YouTube addons] loading addons in MAIN world...');

        const enabledList = JSON.parse(dataset.enabledAddons);
        const baseUrl = dataset.extensionBaseUrl;
        const manifestMap = JSON.parse(dataset.manifestMap || '{}');
        const addonSettings = JSON.parse(dataset.addonSettings || '{}');

        const loaderUrl = `${baseUrl}addons_loader.js`;
        const { runAddonLoader } = await import(loaderUrl);

        await runAddonLoader({
            enabledList,
            baseUrl,
            manifestMap,
            currentWorld: "MAIN",
            settings: addonSettings
        });

    } catch (err) {
        console.error('[main.js] Loader failed:', err);
    }
})();