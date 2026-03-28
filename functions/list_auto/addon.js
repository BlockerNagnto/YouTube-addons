export default async function ({ addon, msg }) {
  const realClick = (el) => {
    if (!el) return;
    const opts = { bubbles: true, cancelable: true, view: window };
    el.dispatchEvent(new MouseEvent("mousedown", opts));
    el.dispatchEvent(new MouseEvent("mouseup", opts));
    el.click();
  };

  let lastProcessedHref = "";
  let isMatched = false;

  setInterval(() => {
    const currentHref = window.location.href;
    const listMatch = currentHref.match(/[?&]list=([^&]+)/);
    const currentListId = listMatch ? listMatch[1] : null;
    if (currentHref !== lastProcessedHref) {

      const rawWhitelist = addon.settings.get("whitelist_ids") || "";
      const whitelist = rawWhitelist.split(/[\n\r]+/).map((id) => id.trim()).filter((id) => id);

      isMatched = currentListId && whitelist.includes(String(currentListId));

      if (currentListId) {
        console.log(`[Addon] 偵測到換頁，歌單 ID: "${currentListId}"，匹配: ${isMatched}`);
      }
      lastProcessedHref = currentHref;
    }

    // 3. 嚴格比對：如果 ID 不在陣列裡，直接結束這一次循環，後面什麼都不准按
    if (isMatched) {
      // --- 只有通過上面比對，才能執行下面的點擊邏輯 ---
      const video = document.querySelector("video");
      const playlist = document.querySelector("ytd-playlist-panel-renderer");
      const nextBtn = document.querySelector(".ytp-next-button");

      if (video && playlist && nextBtn) {
        const allItems = playlist.querySelectorAll(
          "ytd-playlist-panel-video-renderer",
        );
        const currentItem = playlist.querySelector(
          "ytd-playlist-panel-video-renderer[selected]",
        );

        if (currentItem && allItems.length > 0) {
          const isLastVideo = currentItem === allItems[allItems.length - 1];
          const nextHref = nextBtn.getAttribute("href") || "";
          const isLeaving =
            nextHref !== "" && !nextHref.includes(currentListId);

          // 到底判定：剩餘時間 < 1.5秒
          if (
            (isLastVideo || isLeaving) &&
            video.duration - video.currentTime < 1.5
          ) {
            const firstItemAnchor = allItems[0].querySelector("a#wc-endpoint");
            if (firstItemAnchor) {
              console.log(
                "%c[Addon] 檢測到歌單末端，跳回第一首",
                "color: #00ff00; font-weight: bold;",
              );
              firstItemAnchor.click();
            }
          }
        }
      }
    }
    const shuffleRnd = document.querySelector(
      'ytd-toggle-button-renderer[button-renderer="true"]',
    );
    const loopRnd = document.querySelector("ytd-playlist-loop-button-renderer");

    if (shuffleRnd && loopRnd) {
      const shuffleBtn = shuffleRnd.querySelector("button");
      const loopBtn = loopRnd.querySelector("button");

      // 隨機播放：沒開就補點
      if (shuffleBtn && shuffleBtn.getAttribute("aria-pressed") === "false") {
        realClick(shuffleBtn);
      }

      if (loopBtn) {
        const svgPath = loopBtn.querySelector("path")?.getAttribute("d") || "";

        // 1. 單曲循環判定：只有單曲循環會有畫數字「1」的這段座標 (M13 15V8h-2.5)
        const isSingle = svgPath.includes("M13 15V8h-2.5");

        // 2. 開啟狀態判定：清單或單曲循環都會有代表圓圈的特徵 (a2 2 0)
        const hasCircle = svgPath.includes("a2 2 0");

        // 只有在 SVG 載入完整時才判斷 (長度 > 50)
        if (svgPath.length > 50) {
          // 如果是單曲(isSingle) 或 根本沒開(!hasCircle)，就點擊
          if (isSingle || !hasCircle) {
            realClick(loopBtn);
          }
        }
      }
    }
  }, 1000);
}
