(function() {
    const addonName = 'youtube_nonstop';
    if (window[`__loaded_${addonName}`]) return;
    window[`__loaded_${addonName}`] = true;

    const isInterrupting = () => {
        // 增加對彈窗「按鈕」的直接偵測，這是最準確的
        const confirmBtn = document.querySelector('ytmusic-confirm-dialog-renderer #confirm-button, yt-confirm-dialog-renderer #confirm-button, .ytmusic-you-there-renderer #button');
        return !!(confirmBtn && confirmBtn.offsetHeight > 0);
    };

    const forcePlay = () => {
        const video = document.querySelector('video');
        if (!video) return;

        // 核心邏輯：如果是暫停狀態 且 畫面上出現了確認彈窗
        if (video.paused && isInterrupting()) {
            console.log(`[${addonName}] 偵測到 YouTube 停頓彈窗，自動恢復中...`);
            
            // 嘗試點擊確認按鈕 (這比單純 video.play() 更能徹底關閉彈窗)
            const btn = document.querySelector('ytmusic-confirm-dialog-renderer #confirm-button, yt-confirm-dialog-renderer #confirm-button');
            if (btn) btn.click();

            // 補償性播放
            setTimeout(() => {
                if (video.paused) video.play().catch(() => {
                    window.dispatchEvent(new Event('keydown', { keyCode: 32 }));
                });
            }, 500);
        }
    };

    // 巡檢頻率提高到 3 秒，因為彈窗出現後應儘速處理
    setInterval(forcePlay, 3000);
})();