(function () {
    let lastUrl = "";

    const realClick = (el) => {
        if (!el) return;
        const opts = { bubbles: true, cancelable: true, view: window };
        el.dispatchEvent(new MouseEvent('mousedown', opts));
        el.dispatchEvent(new MouseEvent('mouseup', opts));
        el.click();
    };

    setInterval(() => {
        const url = location.href;

        if (url.includes("list=") && url !== lastUrl) {
            lastUrl = url;
            window.yt_speed_init = false;
        }
        // --- 重點修正區塊：改用狀態鎖定 ---
        const shuffleRnd = document.querySelector('ytd-toggle-button-renderer[button-renderer="true"]');
        const loopRnd = document.querySelector('ytd-playlist-loop-button-renderer');

        if (shuffleRnd && loopRnd) {
            const shuffleBtn = shuffleRnd.querySelector('button');
            const loopBtn = loopRnd.querySelector('button');

            // 隨機播放：沒開就補點
            if (shuffleBtn && shuffleBtn.getAttribute('aria-pressed') === 'false') {
                realClick(shuffleBtn);
            }

            if (loopBtn) {
                const svgPath = loopBtn.querySelector('path')?.getAttribute('d') || "";

                // 1. 單曲循環判定：只有單曲循環會有畫數字「1」的這段座標 (M13 15V8h-2.5)
                const isSingle = svgPath.includes('M13 15V8h-2.5');

                // 2. 開啟狀態判定：清單或單曲循環都會有代表圓圈的特徵 (a2 2 0)
                const hasCircle = svgPath.includes('a2 2 0');

                // 只有在 SVG 載入完整時才判斷 (長度 > 50)
                if (svgPath.length > 50) {
                    // 如果是單曲(isSingle) 或 根本沒開(!hasCircle)，就點擊
                    if (isSingle || !hasCircle) {
                        realClick(loopBtn);
                    }
                }

            }
        }
    }, 1000);
})();