/**
 * YouTube Music Non-Music Content Unlocker Addon
 * 功能：強制解鎖非音樂內容 + 恢復原生右鍵選單
 */

(function() {
    const addonName = "UnlockNonMusic";
    const log = (msg) => console.log(`[${addonName}] ${msg}`);

    // --- 1. 恢復原生右鍵選單 ---
    // 透過在 capture 階段攔截並阻止事件冒泡，防止 YouTube Music 接管右鍵
    function restoreContextMenu() {
        window.addEventListener('contextmenu', (e) => {
            e.stopPropagation();
        }, true);
        log("原生右鍵選單已強制恢復");
    }

    // --- 2. 強制解鎖播放狀態 ---
    function forceUnlock() {
        const unlock = (obj) => {
            if (!obj || !obj.playabilityStatus) return;

            const status = obj.playabilityStatus.status;
            if (status !== "OK") {
                log(`解鎖狀態: ${status} -> OK`);
                obj.playabilityStatus.status = "OK";
                
                // 移除限制型屬性
                delete obj.playabilityStatus.reason;
                delete obj.playabilityStatus.messages;
                
                // 騙過 YT Music 的音樂內容判定
                if (obj.videoDetails) {
                    obj.videoDetails.isMusic = true;
                }
            }
        };

        // 輪詢檢查全域變數，YT Music 的單頁應用切換常會重刷這些物件
        setInterval(() => {
            // 針對頁面初始載入的 config
            if (window.ytplayer && window.ytplayer.config && window.ytplayer.config.args) {
                const args = window.ytplayer.config.args;
                if (args.player_response) {
                    // 有些版本是 JSON 字串，有些是物件
                    if (typeof args.player_response === 'string') {
                        try {
                            let resp = JSON.parse(args.player_response);
                            unlock(resp);
                            args.player_response = JSON.stringify(resp);
                        } catch (e) {}
                    } else {
                        unlock(args.player_response);
                    }
                }
            }

            // 針對 YouTube 內部變數
            if (window.ytPlayerResponse) {
                unlock(window.ytPlayerResponse);
            }
            
            // 移除出錯的遮罩元件
            const errorOverlay = document.querySelector('ytmusic-player-error-message-renderer');
            if (errorOverlay) {
                errorOverlay.remove();
            }
        }, 1000);
    }

    // --- 3. 處理 Trusted Types 下的腳本載入 ---
    // 確保不會因 YouTube 的安全性原則被擋
    function handleTrustedTypes() {
        if (window.trustedTypes && window.trustedTypes.createPolicy) {
            if (!window.trustedTypes.defaultPolicy) {
                window.trustedTypes.createPolicy('default', {
                    createHTML: (string) => string,
                    createScriptURL: (string) => string,
                    createScript: (string) => string,
                });
            }
        }
    }

    function init() {
        handleTrustedTypes();
        restoreContextMenu();
        forceUnlock();
        log("Addon 初始化完成");
    }

    if (document.readyState === 'complete') {
        init();
    } else {
        window.addEventListener('load', init);
    }
})();