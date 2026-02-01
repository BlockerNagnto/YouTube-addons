(function () {
    const folder = "free_controler";
    const currentScript = document.currentScript || Array.from(document.getElementsByTagName('script')).find(s => s.src.includes(`${folder}/addon.js`));
    const basePath = currentScript ? currentScript.src.replace('addon.js', '') : '';

    if (currentScript && !document.getElementById('free-ctrl-style-link')) {
        const link = document.createElement('link');
        link.id = 'free-ctrl-style-link';
        link.rel = 'stylesheet';
        link.href = basePath + 'active_button.css';
        document.head.appendChild(link);
    }

    const openPanel = () => {
        const win = window.open('', 'FreeControlerPanel', 'width=416,height=212');
        if (!win) return;
        win.resizeTo(416, 292);
        fetch(basePath + 'control_panel.html')
            .then(r => r.text())
            .then(htmlString => {
                const winDoc = win.document;
                winDoc.body.textContent = "";
                const parser = new DOMParser();
                const docParsed = parser.parseFromString(htmlString, 'text/html');
                Array.from(docParsed.body.childNodes).forEach(node => winDoc.body.appendChild(winDoc.importNode(node, true)));

                // 1. 載入遙控器主樣式
                if (!winDoc.getElementById('panel-style')) {
                    const link = winDoc.createElement('link');
                    link.id = 'panel-style';
                    link.rel = 'stylesheet';
                    link.href = basePath + 'control_panel.css';
                    winDoc.head.appendChild(link);
                }

                const check = setInterval(() => {
                    const shell = winDoc.getElementById('remote-shell');
                    if (shell) {
                        clearInterval(check);
                        
                        const pBtn = winDoc.getElementById('play-btn');
                        const sBtn = winDoc.getElementById('pause-btn');
                        pBtn.onclick = () => document.querySelector('video')?.play();
                        sBtn.onclick = () => document.querySelector('video')?.pause();

                        // Trusted Types 處理
                        let policy = { createScript: (s) => s };
                        if (win.trustedTypes?.createPolicy) {
                            try { policy = win.trustedTypes.createPolicy('yt-fix-final', { createScript: (s) => s }); } catch (e) {}
                        }

                        const speedBase = basePath.replace('free_controler', 'speed_controler');

                        // 2. 載入遙控器專用的 speed_box.css (從 free_controler 讀取)
                        fetch(basePath + 'speed_box.css').then(r => r.text()).then(css => {
                            const style = winDoc.createElement('style');
                            style.textContent = css;
                            winDoc.head.appendChild(style);
                        });

                        // 3. 注入速度控制 JS (從 speed_controler 讀取)
                        fetch(speedBase + 'remote.js').then(r => r.text()).then(code => {
                            const s = winDoc.createElement('script');
                            s.textContent = policy.createScript(code);
                            winDoc.head.appendChild(s);
                        });

                        // 4. 定時更新遙控器狀態
                        setInterval(() => {
                            // 修正：鎖定主視窗目前活動影片
                            const v = document.querySelector('ytd-reel-video-renderer[is-active] video') || document.querySelector('video');
                            if (!v) return;
                            const tName = winDoc.getElementById('track-name'), tTime = winDoc.getElementById('track-time');
                            const fmt = (s) => (isNaN(s) || !isFinite(s)) ? '0:00' : `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}`;
                            if (tTime) tTime.textContent = `${fmt(v.currentTime)} / ${fmt(v.duration)}`;
                            const title = navigator.mediaSession?.metadata?.title || '未在播放';
                            if (tName) tName.textContent = title.trim();
                        }, 1000);
                    }
                }, 100);
            });
    };

    setInterval(() => {
        const logo = document.querySelector('ytmusic-logo') || document.querySelector('#logo');
        if (logo && !document.getElementById('free-ctrl-btn')) {
            const logoLink = logo.querySelector('a');
            if (logoLink) logoLink.style.display = 'none';
            const newBtn = document.createElement('button');
            newBtn.id = 'free-ctrl-btn';
            newBtn.textContent = '召喚遙控器';
            newBtn.onclick = (e) => { e.preventDefault(); openPanel(); };
            logo.appendChild(newBtn);
        }
    }, 1000);
})();