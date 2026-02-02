(function () {
    let hasClickedShow = false; // 紀錄是否已經叫出死片

    const isPlaylistPage = () => location.href.includes('list=') && !location.href.includes('watch?v=');
    const realClick = (el) => {
        if (!el)
            return;['mousedown', 'mouseup', 'click'].forEach(
                t => el.dispatchEvent(new MouseEvent(t, { bubbles: true, cancelable: true, view: window }))
            );
    };
    const getTargetTotal = () => {
        try {
            const metaRows = document.querySelectorAll('.yt-content-metadata-view-model__metadata-text');

            // 遍歷所有 Metadata 標籤
            for (let row of metaRows) {
                const raw = row.innerText.trim();
                // 1. 先把逗號拿掉（處理 2,042 -> 2042）
                // 2. 提取純數字
                const cleanNum = raw.replace(/,/g, '').match(/\d+/);

                if (cleanNum) {
                    const num = parseInt(cleanNum[0]);
                    // 排除掉「觀看次數」這種大數字，或是太小的數字
                    // 總數通常在第二個位置，且不會帶有「次」或「ago」
                    if (num > 0 && !raw.includes(':') && !raw.includes('/') && raw.length < 15) {
                        return num;
                    }
                }
            }
        } catch (e) { return 0; }
        return 0;
    };
    // 紅按鈕功能：全載入並置頂
    const runRedAction = (prog) => {
        let lastCount = 0, retry = 0, startY = window.scrollY;
        const total = parseInt(getTargetTotal()) || 9999; // 抓不到就假定很大，靠底部的 retry 停下來
        const mask = document.createElement('div');
        let deadCount = 0;
        mask.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.85); color:#fff; display:flex; align-items:center; justify-content:center; font-size:22px; font-family:monospace;';
        document.body.appendChild(mask);
        const timer = setInterval(() => {
            const items = document.querySelectorAll('ytd-playlist-video-list-renderer ytd-playlist-video-renderer');
            mask.innerText = prog.innerText = `[載入: ${items.length} / ${total}]`;

            const sug = document.querySelector('ytd-rich-grid-renderer, ytd-item-section-renderer #contents ytd-item-section-renderer');
            const sugVisible = sug && sug.getBoundingClientRect().top < window.innerHeight;

            window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' });
            setTimeout(() => window.scrollTo({ top: startY, behavior: 'instant' }), 5);

            if (items.length === lastCount) retry++; else retry = 0;
            if ((total > 0 && items.length >= total) || retry > 6 || (sugVisible && items.length > 20)) {
                clearInterval(timer);
                mask.remove();
                window.scrollTo({ top: 0, behavior: 'instant' });
                const list = document.querySelector('ytd-playlist-video-list-renderer #contents');
                list.querySelectorAll('ytd-playlist-video-renderer').forEach(item => {
                    const channel = item.querySelector('#channel-name yt-formatted-string');
                    const isDead = !channel || channel.innerText.trim() === "" || item.querySelector('img')?.src.includes('no_thumbnail.jpg');
                    if (isDead) {
                        list.prepend(item);
                        item.style.cssText = 'background:rgba(255,0,0,0.2)!important; border-left:10px solid red!important;';
                        deadCount++;
                    }
                });
                prog.innerText = ` [標記完畢,已標記 ${deadCount} 部]`;
            }
            lastCount = items.length;
        }, 850);
    };

    const injectUI = () => {
        if (!isPlaylistPage()) return;
        const alertBox = document.querySelector('ytd-alert-with-button-renderer');

        // 如果 Alert 不在了，或者已經有按鈕組了，就不重複執行
        if (!alertBox) {
            hasClickedShow = false; // 重置狀態
            return;
        }

        const group = document.getElementById('yt-clean-group');
        if (group) {
            // 檢查狀態是否與當前 UI 吻合
            const currentIsGray = !!group.querySelector('.btn-gray');
            if (hasClickedShow && currentIsGray) {
                group.remove(); // 狀態不符，刪除重刷
            } else {
                return; // 狀態正確，跳出
            }
        }

        const container = document.createElement('span');
        container.id = 'yt-clean-group';
        container.style.marginLeft = '10px';

        if (!hasClickedShow) {
            // 狀態 A: 顯示灰按鈕
            const grayBtn = document.createElement('button');
            grayBtn.className = 'btn-gray';
            grayBtn.innerText = '👁️ 快捷顯示';
            grayBtn.style = 'cursor:pointer; background:#444; color:#eee; border:1px solid #777; padding:4px 8px; border-radius:3px;';
            grayBtn.onclick = () => {
                const header = document.querySelector('yt-page-header-view-model');
                const menuBtn = header?.querySelector('button[aria-label*="動作"]') || header?.querySelector('yt-icon-button#button button') || Array.from(header?.querySelectorAll('button') || []).pop();
                if (menuBtn) {
                    realClick(menuBtn);
                    let wait = 0;
                    const check = setInterval(() => {
                        const target = Array.from(document.querySelectorAll('yt-list-item-view-model, ytd-menu-service-item-renderer')).find(el => el.innerText.includes('顯示') || el.innerText.includes('Show'));
                        if (target) {
                            realClick(target);
                            hasClickedShow = true; // 標記為已顯示
                            clearInterval(check);
                        }
                        if (++wait > 20) clearInterval(check);
                    }, 200);
                }
            };
            container.appendChild(grayBtn);
        } else {
            // 狀態 B: 顯示紅按鈕
            const prog = document.createElement('span');
            prog.style.cssText = 'color:#ffaa00; font-size:11px; margin-right:5px; font-weight:bold;';
            const redBtn = document.createElement('button');
            redBtn.className = 'btn-red';
            redBtn.innerText = '🧹 全載入置頂';
            redBtn.style = 'cursor:pointer; background:#cc0000; color:#fff; border:none; padding:4px 8px; border-radius:3px; font-weight:bold;';
            redBtn.onclick = () => runRedAction(prog);
            container.append(prog, redBtn);
        }

        const target = alertBox.querySelector('#text') || alertBox;
        target.appendChild(container);
    };

    // 監控器：確保狀態切換時立刻重刷按鈕
    const initObserver = () => {
        if (!document.body) { setTimeout(initObserver, 200); return; }
        const observer = new MutationObserver(() => {
            // 額外判定：如果使用者手動點了 YouTube 原生的顯示按鈕，也要切換狀態
            const alertBox = document.querySelector('ytd-alert-with-button-renderer');
            if (alertBox && !alertBox.innerText.includes('隱藏') && !alertBox.innerText.includes('Hidden')) {
                if (!hasClickedShow) hasClickedShow = true;
            }
            injectUI();
        });
        observer.observe(document.body, { childList: true, subtree: true });
    };

    initObserver();
    setInterval(injectUI, 1500);
})();