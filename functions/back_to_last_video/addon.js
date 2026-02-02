(function() {
    const RESUME_ID = 'yt-float-resume-btn';
    const SYNC_KEY = 'yt_resume_storage';

    // 1. 掃描端：在新視窗背景執行
    if (location.pathname === '/feed/history' && window.name === 'yt_scanner') {
        const grab = () => {
            if (window.ytInitialData) {
                localStorage.setItem(SYNC_KEY, JSON.stringify({
                    d: window.ytInitialData,
                    t: Date.now()
                }));
                window.close();
            } else { setTimeout(grab, 500); }
        };
        grab();
        return;
    }

    // 2. 建立 UI：懸浮球
    function injectUI() {
        if (document.getElementById(RESUME_ID)) return;

        const btn = document.createElement('div');
        btn.id = RESUME_ID;
        btn.textContent = "🔍 續看掃描";
        
        // 使用 Fixed 定位，確保 100% 可見
        Object.assign(btn.style, {
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            width: '90px',
            height: '90px',
            backgroundColor: '#ff0000',
            color: '#fff',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: 'bold',
            boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
            zIndex: '9999',
            transition: 'all 0.3s ease',
            lineHeight: '1.2',
            border: '3px solid white'
        });

        // 滑鼠懸停效果
        btn.onmouseover = () => btn.style.transform = 'scale(1.1)';
        btn.onmouseout = () => btn.style.transform = 'scale(1.0)';

        btn.onclick = (e) => {
            e.stopPropagation();
            window.open('/feed/history', 'yt_scanner', 'width=200,height=200,left=5000');
            btn.textContent = "⌛\n掃描中";
            btn.style.backgroundColor = "#555";
        };

        document.body.appendChild(btn);
    }

    // 3. 數據回傳處理
    window.addEventListener('storage', (e) => {
        if (e.key === SYNC_KEY) {
            const raw = JSON.parse(e.newValue);
            const videos = [];
            const extract = (obj) => {
                if (!obj || typeof obj !== 'object' || videos.length > 60) return;
                if (obj.videoId && (obj.title || obj.headline)) videos.push(obj);
                else Object.values(obj).forEach(extract);
            };
            extract(raw.d);

            const target = videos.find(v => {
                const overlays = v.thumbnailOverlays || [];
                return overlays.some(o => o.thumbnailOverlayResumePlaybackRenderer?.percentDurationWatched < 95);
            });

            const btn = document.getElementById(RESUME_ID);
            if (target && btn) {
                btn.style.backgroundColor = "#27ae60"; // 找到後變綠色
                btn.textContent = "▶\n立即續看";
                btn.onclick = () => location.href = `/watch?v=${target.videoId}`;
            } else if (btn) {
                btn.textContent = "❌\n無紀錄";
                btn.style.backgroundColor = "#ff0000";
                setTimeout(() => { btn.textContent = "🔍\n續看掃描"; }, 3000);
            }
        }
    });

    // 循環檢查確保按鈕存在
    setInterval(injectUI, 2000);
})();