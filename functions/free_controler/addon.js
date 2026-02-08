export default async function ({ addon, msg }) {
    const folder = "free_controler";

    // 修正：不再依賴 currentScript，統一使用 addon.Url.Get 取得資源
    if (!document.getElementById('free-ctrl-style-link')) {
        const link = document.createElement('link');
        link.id = 'free-ctrl-style-link';
        link.rel = 'stylesheet';
        link.href = addon.Url.Get('active_button.css');
        document.head.appendChild(link);
    }

    const openPanel = () => {
        const win = window.open('', 'FreeControlerPanel', 'width=416,height=292');
        if (!win) return;
        const winDoc = win.document;

        let policy = { createScript: (s) => s, createHTML: (h) => h };
        if (win.trustedTypes?.createPolicy) {
            try { 
                policy = win.trustedTypes.createPolicy('yt-fix-final', { 
                    createScript: (s) => s,
                    createHTML: (h) => h 
                }); 
            } catch (e) { console.error("Policy creation failed", e); }
        }

        if (!winDoc.getElementById('remote-shell')) {
            winDoc.body.style.cssText = "margin:0; padding:0; background:#121212; color:white; overflow:hidden;";
            
            const shell = winDoc.createElement('div');
            shell.id = 'remote-shell';
            shell.className = 'remote-body'; 
            
            const infoDisplay = winDoc.createElement('div');
            infoDisplay.id = 'info-display';
            
            const tName = winDoc.createElement('div');
            tName.id = 'track-name';
            tName.textContent = msg('loading');
            
            const tTime = winDoc.createElement('div');
            tTime.id = 'track-time';
            tTime.textContent = '0:00 / 0:00';
            
            infoDisplay.append(tName, tTime);

            const btnGroup = winDoc.createElement('div');
            btnGroup.className = 'btn-group';
            
            const prevBtn = winDoc.createElement('button');
            prevBtn.id = 'prev-btn';
            prevBtn.className = 'ctrl-btn btn-prev';
            prevBtn.textContent = '⏮';
            prevBtn.onclick = () => {
                const targetDoc = window.opener ? window.opener.document : document;
                const prevTrack = targetDoc.querySelector('.previous-button') || targetDoc.querySelector('.ytp-prev-button');
                if (prevTrack) prevTrack.click();
            };

            const pBtn = winDoc.createElement('button');
            pBtn.id = 'play-btn';
            pBtn.className = 'ctrl-btn btn-play';
            pBtn.textContent = '▶ PLAY';
            pBtn.onclick = () => {
                const targetVideo = (window.opener ? window.opener.document : document).querySelector('video');
                if (targetVideo) targetVideo.play();
            };
            
            const sBtn = winDoc.createElement('button');
            sBtn.id = 'pause-btn';
            sBtn.className = 'ctrl-btn btn-pause';
            sBtn.textContent = '|| PAUSE';
            sBtn.onclick = () => {
                const targetVideo = (window.opener ? window.opener.document : document).querySelector('video');
                if (targetVideo) targetVideo.pause();
            };

            const nextBtn = winDoc.createElement('button');
            nextBtn.id = 'next-btn';
            nextBtn.className = 'ctrl-btn btn-next';
            nextBtn.textContent = '⏭';
            nextBtn.onclick = () => {
                const targetDoc = window.opener ? window.opener.document : document;
                const nextTrack = targetDoc.querySelector('.next-button') || targetDoc.querySelector('.ytp-next-button');
                if (nextTrack) nextTrack.click();
            };
            
            btnGroup.append(prevBtn, pBtn, sBtn, nextBtn);
            shell.append(infoDisplay, btnGroup);
            winDoc.body.appendChild(shell);
        }

        if (!winDoc.getElementById('panel-style')) {
            const link = winDoc.createElement('link');
            link.id = 'panel-style';
            link.rel = 'stylesheet';
            link.href = addon.Url.Get('control_panel.css');
            winDoc.head.appendChild(link);
        }

        const check = setInterval(() => {
            const shell = winDoc.getElementById('remote-shell');
            if (shell) {
                clearInterval(check);

                // 修正：使用 addon.Url.Get 跨插件獲取資源 (需確保 speed_controler 路徑邏輯正確)
                // 由於 Url.Get 是綁定在當前插件目錄，跨插件需手動替換路徑或透過全域 baseUrl
                const speedCssUrl = addon.Url.Get('../../functions/speed_controler/speed_box.css');
                const speedJsUrl = addon.Url.Get('../../functions/speed_controler/addon.js');

                fetch(speedCssUrl).then(r => r.text()).then(css => {
                    const style = winDoc.createElement('style');
                    style.textContent = css;
                    winDoc.head.appendChild(style);
                }).catch(e => {});

                fetch(speedJsUrl).then(r => r.text()).then(code => {
                    const s = winDoc.createElement('script');
                    s.textContent = policy.createScript(code);
                    winDoc.head.appendChild(s);
                }).catch(e => {});

                setInterval(() => {
                    const targetDoc = window.opener ? window.opener.document : document;
                    const v = targetDoc.querySelector('ytd-reel-video-renderer[is-active] video') || targetDoc.querySelector('video');
                    if (!v) return;
                    const tName = winDoc.getElementById('track-name'), tTime = winDoc.getElementById('track-time');
                    const fmt = (s) => (isNaN(s) || !isFinite(s)) ? '0:00' : `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}`;
                    if (tTime) tTime.textContent = `${fmt(v.currentTime)} / ${fmt(v.duration)}`;
                    const title = (window.opener ? window.opener.navigator : navigator).mediaSession?.metadata?.title || msg('not_playing') || '未在播放';
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
            newBtn.textContent = msg('summon_remote');
            newBtn.onclick = (e) => { e.preventDefault(); openPanel(); };
            logo.appendChild(newBtn);
        }
    }, 1000);
};