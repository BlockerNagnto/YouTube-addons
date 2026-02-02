(function() {
    const addonName = 'youtube_nonstop';
    if (window[`__loaded_${addonName}`]) return;
    window[`__loaded_${addonName}`] = true;

    /**
     * 偵測 YT Music 或 YouTube 的「影片已暫停」彈窗按鈕
     */
    const getConfirmButton = () => {
        // 優先匹配你提供的 ytmusic-you-there-renderer 結構
        // 包含一般 YouTube 的確認按鈕與 YouTube Music 特有的按鈕路徑
        return document.querySelector(
            'ytmusic-you-there-renderer yt-button-renderer#button, ' +
            'ytmusic-you-there-renderer .actions yt-button-renderer, ' + 
            'yt-confirm-dialog-renderer #confirm-button, ' +
            '#confirm-button.yt-button-renderer'
        );
    };

    const isInterrupting = () => {
        const btn = getConfirmButton();
        // 確保按鈕存在且在畫面上可見 (offsetHeight > 0)
        return !!(btn && (btn.offsetWidth > 0 || btn.offsetHeight > 0));
    };

    const forcePlay = () => {
        const video = document.querySelector('video');
        if (!video) return;

        // 當影片暫停且偵測到中斷彈窗時執行
        if (video.paused && isInterrupting()) {
            const btn = getConfirmButton();
            
            // 優先透過模擬點擊按鈕來解除彈窗狀態
            if (btn) {
                const clickTarget = btn.querySelector('button') || btn;
                clickTarget.click();
            }

            // 補償性播放：確保彈窗關閉後影片恢復執行
            setTimeout(() => {
                if (video.paused) {
                    video.play().catch(() => {
                        // 若被瀏覽器阻擋，嘗試觸發空白鍵事件
                        window.dispatchEvent(new KeyboardEvent('keydown', { 
                            bubbles: true, 
                            cancelable: true, 
                            keyCode: 32, 
                            which: 32 
                        }));
                    });
                }
            }, 300);
        }
    };

    // 提高巡檢頻率至 2 秒，以確保聽歌體驗不間斷
    setInterval(forcePlay, 2000);
})();