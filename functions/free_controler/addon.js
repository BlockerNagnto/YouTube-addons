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
        const win = window.open('', 'FreeControlerPanel', 'width=416,height=292');
        if (!win) return;
        const winDoc = win.document;

        // --- Trusted Types 安全策略建立 ---
        let policy = { createScript: (s) => s, createHTML: (h) => h };
        if (win.trustedTypes?.createPolicy) {
            try { 
                policy = win.trustedTypes.createPolicy('yt-fix-final', { 
                    createScript: (s) => s,
                    createHTML: (h) => h 
                }); 
            } catch (e) { console.error("Policy creation failed", e); }
        }

        // --- 安全地建立 DOM 結構，完全不使用 innerHTML ---
        if (!winDoc.getElementById('remote-shell')) {
            winDoc.body.style.cssText = "margin:0; padding:0; background:#121212; color:white; overflow:hidden;";
            
            const shell = winDoc.createElement('div');
            shell.id = 'remote-shell';
            shell.className = 'remote-body'; // 對應 control_panel.css
            
            const infoDisplay = winDoc.createElement('div');
            infoDisplay.id = 'info-display';
            
            const tName = winDoc.createElement('div');
            tName.id = 'track-name';
            tName.textContent = '載入中...';
            
            const tTime = winDoc.createElement('div');
            tTime.id = 'track-time';
            tTime.textContent = '0:00 / 0:00';
            
            infoDisplay.append(tName, tTime);

            const btnGroup = winDoc.createElement('div');
            btnGroup.className = 'btn-group';
            
            const pBtn = winDoc.createElement('button');
            pBtn.id = 'play-btn';
            pBtn.className = 'ctrl-btn btn-play';
            pBtn.textContent = '▶ PLAY';
            pBtn.onclick = () => document.querySelector('video')?.play();
            
            const sBtn = winDoc.createElement('button');
            sBtn.id = 'pause-btn';
            sBtn.className = 'ctrl-btn btn-pause';
            sBtn.textContent = '|| PAUSE';
            sBtn.onclick = () => document.querySelector('video')?.pause();
            
            btnGroup.append(pBtn, sBtn);
            shell.append(infoDisplay, btnGroup);
            winDoc.body.appendChild(shell);
        }

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
                
                const speedBase = basePath.replace('free_controler', 'speed_controler');

                // 2. 載入樣式
                fetch(basePath + 'speed_box.css').then(r => r.text()).then(css => {
                    const style = winDoc.createElement('style');
                    style.textContent = css;
                    winDoc.head.appendChild(style);
                });

                // 3. 注入速度控制 JS (使用 Trusted Types 安全路徑)
                fetch(speedBase + 'addon.js').then(r => r.text()).then(code => {
                    const s = winDoc.createElement('script');
                    s.textContent = policy.createScript(code);
                    winDoc.head.appendChild(s);
                });

                // 4. 定時更新遙控器狀態
                setInterval(() => {
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