(function () {
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
        const iconx = 32, icony = 40;
        const toggleBtn = document.createElement('button');
        toggleBtn.id = 'yt-speed-toggle';
        const svgNS = "http://www.w3.org/2000/svg";
        const svg = document.createElementNS(svgNS, "svg");
        svg.setAttribute("viewBox", "0 0 64 64");
        svg.setAttribute("width", "64");
        svg.setAttribute("height", "64");

        // 1. 儀表板白色半圓弧 (中心 32,40)
        const gauge = document.createElementNS(svgNS, "path");
        gauge.setAttribute("d", `M 12 40 A 20 20 0 0 1 52 40`);
        gauge.setAttribute("fill", "none");
        gauge.setAttribute("stroke", "#ffffff");
        gauge.setAttribute("stroke-width", "2.5");
        svg.appendChild(gauge);

        // 2. 17 條等粗白色刻度線
        for (let i = 0; i <= 16; i++) {
            const line = document.createElementNS(svgNS, "line");
            const ang = Math.PI + (i * (Math.PI / 16));
            const rOuter = 20;
            const rInner = 14;
            line.setAttribute("x1", (32 + rOuter * Math.cos(ang)).toFixed(2));
            line.setAttribute("y1", (40 + rOuter * Math.sin(ang)).toFixed(2));
            line.setAttribute("x2", (32 + rInner * Math.cos(ang)).toFixed(2));
            line.setAttribute("y2", (40 + rInner * Math.sin(ang)).toFixed(2));
            line.setAttribute("stroke", "#fff");
            line.setAttribute("stroke-width", "2.5");
            svg.appendChild(line);
        }

        // 3. 白色中心圓點
        const centerCircle = document.createElementNS(svgNS, "circle");
        centerCircle.setAttribute("cx", "32");
        centerCircle.setAttribute("cy", "40");
        centerCircle.setAttribute("r", "3.5");
        centerCircle.setAttribute("fill", "#fff");
        svg.appendChild(centerCircle);

        // 4. 白色指針 (不再頂天)
        const needle = document.createElementNS(svgNS, "path");
        needle.id = "spd-gauge-needle";
        needle.setAttribute("d", "M 32 40 L 32 18");
        needle.setAttribute("stroke", "#fff");
        needle.setAttribute("stroke-width", "3.5");
        needle.setAttribute("stroke-linecap", "round");
        needle.style.transformOrigin = "32px 40px";
        needle.style.transition = "transform 0.15s ease-out";
        svg.appendChild(needle);

        toggleBtn.appendChild(svg);

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
        // 更新指針角度：0x 對應 -90deg，16x 對應 90deg
        const ndl = document.getElementById('spd-gauge-needle');
        if (ndl && v) {
            const rate = Math.min(Math.max(v.playbackRate, 0), 16);
            const deg = (rate * (180 / 16)) - 90;
            ndl.style.transform = `rotate(${deg}deg)`;
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