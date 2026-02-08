export default async function ({ addon, msg }) {
    const folder = "free_controler";

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

        let policy = { createScript: (s) => s };
        if (win.trustedTypes?.createPolicy) {
            try {
                policy = win.trustedTypes.createPolicy('yt-fix-remote', {
                    createScript: (s) => s
                });
            } catch (e) { }
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
            prevBtn.onclick = () => (window.opener?.document || document).querySelector('.previous-button, .ytp-prev-button')?.click();

            const pBtn = winDoc.createElement('button');
            pBtn.id = 'play-btn';
            pBtn.className = 'ctrl-btn btn-play';
            pBtn.textContent = '▶ PLAY';
            pBtn.onclick = () => (window.opener?.document || document).querySelector('video')?.play();

            const sBtn = winDoc.createElement('button');
            sBtn.id = 'pause-btn';
            sBtn.className = 'ctrl-btn btn-pause';
            sBtn.textContent = '|| PAUSE';
            sBtn.onclick = () => (window.opener?.document || document).querySelector('video')?.pause();

            const nextBtn = winDoc.createElement('button');
            nextBtn.id = 'next-btn';
            nextBtn.className = 'ctrl-btn btn-next';
            nextBtn.textContent = '⏭';
            nextBtn.onclick = () => (window.opener?.document || document).querySelector('.next-button, .ytp-next-button')?.click();

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

        const check = setInterval(async () => {
            const shell = winDoc.getElementById('remote-shell');
            if (shell) {
                clearInterval(check);

                const baseUrl = document.documentElement.dataset.extensionBaseUrl;
                const speedBase = `${baseUrl}functions/speed_controler/`;

                // 遙控器預先準備好速度盒樣式（使用 link 確保基礎樣式存在）
                if (!winDoc.getElementById('speed-box-style')) {
                    const speedCss = winDoc.createElement('link');
                    speedCss.id = 'speed-box-style';
                    speedCss.rel = 'stylesheet';
                    speedCss.href = `${speedBase}speed_box.css`;
                    winDoc.head.appendChild(speedCss);
                }

                try {
                    const speedModule = await import(`${speedBase}addon.js`);

                    const injectionString = `
                        const mockAddon = {
                            Url: { 
                                Get: function(path) {
                                    // 2. 攔截法：如果速度盒要拿 CSS，強制導向我們指定的路徑
                                    if (path.endsWith('.css')) {
                                        return "${speedBase}" + "speed_box.css";
                                    }
                                    return "${speedBase}" + path;
                                }
                            },
                            settings: { 
                                get: function(key) { 
                                    const val = window.opener.document.documentElement.dataset['speed_controler_' + key];
                                    return val !== undefined ? JSON.parse(val) : null;
                                } 
                            }
                        };
                        const mockMsg = (k) => k;
                        
                        const run = ${speedModule.default.toString()};
                        run({ 
                            addon: mockAddon, 
                            msg: mockMsg 
                        });
                    `;

                    win.setTimeout(policy.createScript(injectionString), 0);

                } catch (e) { console.error("Speed box boot failed", e); }

                setInterval(() => {
                    const targetDoc = window.opener?.document || document;
                    const v = targetDoc.querySelector('ytd-reel-video-renderer[is-active] video, video');
                    if (!v) return;
                    const tName = winDoc.getElementById('track-name'), tTime = winDoc.getElementById('track-time');
                    const fmt = (s) => (isNaN(s) || !isFinite(s)) ? '0:00' : `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}`;
                    if (tTime) tTime.textContent = `${fmt(v.currentTime)} / ${fmt(v.duration)}`;
                    const title = (window.opener?.navigator || navigator).mediaSession?.metadata?.title || msg('not_playing');
                    if (tName) tName.textContent = title;
                }, 1000);
            }
        }, 100);
    };

    setInterval(() => {
        const logo = document.querySelector('ytmusic-logo, #logo');
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