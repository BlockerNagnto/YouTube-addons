/**
 * YouTube Music / YouTube 自動跳過內容警告視窗
 */

(function() {
    let video = null;
    let timer = null;
    const mutationConfig = { attributes: true, childList: true, subtree: true };

    // 處理影片結束或來源變更
    const videoEnded = function (mutationList, observer) {
        for (const mutation of mutationList) {
            if (mutation.type === "attributes" && mutation.attributeName === "src") {
                console.log("[AutoConfirm] 影片來源已變更，重新啟動監測");
                observer.disconnect();
                startTimer();
                return;
            }
        }
    };

    const videoObserver = new MutationObserver(videoEnded);

    const checkAndConfirm = function () {
        video = document.querySelector("video");
        const isWatchPage = window.location.href.includes("watch");

        if (!isWatchPage || !video) return;

        // 情況 A: 影片正常播放中
        if (video.currentTime > 0 && !video.paused && !video.ended && video.readyState > 2) {
            videoObserver.observe(video, { attributes: true, attributeFilter: ["src"] });
            stopTimer();
            return;
        }

        // 情況 B: 影片未播放，檢查是否有警告按鈕
        // 針對 YT Music 的按鈕特徵進行選取
        const confirmBtn = document.querySelector(
            'button.yt-spec-button-shape-next--call-to-action[aria-label*="瞭解"], ' +
            'button.yt-spec-button-shape-next--call-to-action[aria-label*="continue"], ' +
            'yt-player-error-message-renderer button'
        );

        if (confirmBtn) {
            console.log("[AutoConfirm] 偵測到警告按鈕，執行點擊...");
            confirmBtn.click();
            
            // 點擊後短暫觀察，若無效則使用 bpctr 備案
            setTimeout(() => {
                if (video.paused) {
                    applyBpctrFix();
                }
            }, 1000);
        }
    };

    // 強制更新 URL 參數的備用方案
    const applyBpctrFix = function() {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get("bpctr") !== "9999999999") {
            console.log("[AutoConfirm] 嘗試透過 URL 參數繞過限制");
            urlParams.set("bpctr", "9999999999");
            window.location.search = urlParams.toString();
        }
    };

    const startTimer = () => {
        if (!timer) {
            timer = setInterval(checkAndConfirm, 2000);
        }
    };

    const stopTimer = () => {
        if (timer) {
            clearInterval(timer);
            timer = null;
        }
    };

    // 初始啟動
    startTimer();
})();