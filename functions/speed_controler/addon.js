(function() {
    const folder = "speed_controler";
    const lastKey = 'yt-last-non-1';
    let last = localStorage.getItem(lastKey) || "5";
    window.yt_speed_init = false;

    const isRemote = window.name === 'FreeControlerPanel';
    const getTargetDoc = () => isRemote ? window.opener.document : document;
    
    if (isRemote) document.body.setAttribute('name', 'FreeControlerPanel');

    const getTargetVideo = () => {
        const doc = getTargetDoc();
        const shortsVideo = doc.querySelector('ytd-reel-video-renderer[is-active] video');
        if (shortsVideo) return shortsVideo;
        return doc.querySelector('video.html5-main-video') || doc.querySelector('video');
    };

    const currentScript = document.currentScript || Array.from(document.getElementsByTagName('script')).find(s => s.src.includes(`${folder}/addon.js`));
    if (!isRemote && currentScript && !document.getElementById('yt-speed-style')) {
        const link = document.createElement('link');
        link.id = 'yt-speed-style';
        link.rel = 'stylesheet';
        link.href = currentScript.src.replace('addon.js', 'speed_box.css');
        document.head.appendChild(link);
    }

    const panel = document.createElement('div');
    panel.id = 'yt-speed-panel';
    if (!isRemote) panel.classList.add('collapsed');

    // 圓形懸浮球 (僅 YouTube 模式)
    if (!isRemote) {
        const toggleBtn = document.createElement('button');
        toggleBtn.id = 'yt-speed-toggle';
        const svgNS = "http://www.w3.org/2000/svg";
        const svg = document.createElementNS(svgNS, "svg");
        svg.setAttribute("viewBox", "0 0 24 24"); svg.setAttribute("width", "24"); svg.setAttribute("height", "24");
        const path = document.createElementNS(svgNS, "path");
        path.setAttribute("d", "M13 10V4.5C13 3.67 12.33 3 11.5 3S10 3.67 10 4.5V11L11.5 12.5L13 11M19.73 14.58L21 13.31C20.45 12.76 19.85 12.26 19.22 11.82L18.17 13.12C18.72 13.56 19.24 14.05 19.73 14.58M4.27 14.58C4.76 14.05 5.28 13.56 5.83 13.12L4.78 11.82C4.15 12.26 3.55 12.76 3 13.31L4.27 14.58M7.06 8.3L6 7.25C5.08 8.17 4.25 9.18 3.55 10.28L4.85 11.1C5.46 10.1 6.21 9.15 7.06 8.3M19.15 11.1L20.45 10.28C19.75 9.18 18.92 8.17 18 7.25L16.94 8.3C17.79 9.15 18.54 10.1 19.15 11.1Z");
        path.setAttribute("fill", "currentColor"); svg.appendChild(path); toggleBtn.appendChild(svg);
        
        let isDragging = false, moved = false, startX, startY, offsetX, offsetY;
        toggleBtn.onmousedown = (e) => {
            isDragging = true; moved = false;
            startX = e.clientX; startY = e.clientY;
            offsetX = e.clientX - panel.offsetLeft;
            offsetY = e.clientY - panel.offsetTop;
            panel.style.transition = 'none';
        };
        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            if (Math.abs(e.clientX - startX) > 5 || Math.abs(e.clientY - startY) > 5) moved = true;
            panel.style.left = (e.clientX - offsetX) + 'px';
            panel.style.top = (e.clientY - offsetY) + 'px';
            panel.style.bottom = 'auto';
        });
        document.addEventListener('mouseup', () => {
            if (isDragging && !moved) panel.classList.toggle('collapsed');
            isDragging = false;
        });
        panel.appendChild(toggleBtn);
    }

    const apply = (s) => {
        const v = getTargetVideo();
        if (!v) return;
        v.playbackRate = parseFloat(s);
        if (parseFloat(s) !== 1) localStorage.setItem(lastKey, s);
    };

    const rowS = document.createElement('div');
    rowS.className = 'speed-btn-row';
    rowS.style.display = 'flex';
    [0.1, 1, 2, 3, 4, 5, 6, 8, 16].forEach(s => {
        const b = document.createElement('button');
        b.className = 'spd-btn'; b.textContent = s + 'x';
        b.onclick = () => apply(s);
        rowS.appendChild(b);
    });

    const btnL = document.createElement('button');
    btnL.className = 'spd-btn';
    btnL.id = 'spd-shortcut-toggle';
    
    // 獨立的速度盒，用來放紅框
    const speedBox = document.createElement('div');
    speedBox.id = 'yt-speed-box';
    speedBox.append(rowS, btnL);
    panel.appendChild(speedBox);

    setInterval(() => {
        const v = getTargetVideo();
        const p = document.getElementById('yt-speed-panel');
        const loc = isRemote ? window.opener.location : location;
        const isVideoPage = loc.pathname.includes('/watch') || loc.pathname.includes('/shorts') || isRemote;

        if (!isVideoPage || !v) {
            if (p) p.style.display = 'none';
            document.body.classList.remove('yt-speed-margin');
            return;
        } else {
            if (isRemote) {
                const shell = document.getElementById('remote-shell');
                if (shell && !p) {
                    shell.style.cssText = "display:flex; flex-direction:column; min-height:100vh; margin:0;";
                    shell.appendChild(panel);
                }
            } else if (!p && document.body) {
                document.body.appendChild(panel);
                document.body.classList.add('yt-speed-margin');
            }
            if (p) p.style.display = 'flex';
        }

        const bO = document.getElementById('spd-shortcut-toggle');
        if (bO && v) {
            const cur = v.playbackRate;
            const saved = localStorage.getItem(lastKey) || "5";
            bO.textContent = (cur === 1) ? `${saved}x` : '1x';
            bO.onclick = () => apply(cur === 1 ? saved : 1);
        }

        if (v && v.readyState >= 1) {
            const activeVid = v.src || "";
            if (v.dataset.lastVid !== activeVid) { window.yt_speed_init = false; v.dataset.lastVid = activeVid; }
            if (!window.yt_speed_init) {
                if (loc.href.includes("&list=") || loc.href.includes("/shorts/") || loc.hostname.includes("music.youtube")) {
                    v.playbackRate = 1;
                } else {
                    apply(localStorage.getItem(lastKey) || "5");
                }
                window.yt_speed_init = true;
            }
        }
    }, 500);

    window.addEventListener('yt-navigate-finish', () => { window.yt_speed_init = false; });
})();