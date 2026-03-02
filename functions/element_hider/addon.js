(function() {
    const selectors = {
        hide_guide_sidebar: 'ytd-guide-section-renderer.ytd-guide-renderer[mini-guide-visible]',
        hide_grid_header: 'div#header.ytd-rich-grid-renderer'
    };

    const updateElements = () => {
        // 假設 addonSettings 經由你的載入器注入
        if (typeof addonSettings === 'undefined') return;

        addonSettings.forEach(set => {
            const selector = selectors[set.id];
            if (!selector) return;

            const target = document.querySelector(selector);
            if (target) {
                target.style.display = set.value ? 'none' : '';
            }
        });
    };

    const observer = new MutationObserver(updateElements);
    observer.observe(document.body, { childList: true, subtree: true });
    
    // 初始執行
    updateElements();
})();