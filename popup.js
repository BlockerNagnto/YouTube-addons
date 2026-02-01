async function renderPopup() {
  const listContainer = document.getElementById('addon-list');

  try {
    // 1. 讀取名單 (格式：["name1", "name2"...])
    const resp = await fetch(chrome.runtime.getURL('libs/addons.json'));
    const enabledList = await resp.json();

    // 確保 enabledList 是陣列才執行遍歷
    if (Array.isArray(enabledList)) {
      for (const addonId of enabledList) {
        try {
          // 2. 抓取各插件各自的 manifest.json
          const manifestResp = await fetch(chrome.runtime.getURL(`functions/${addonId}/manifest.json`));
          const info = await manifestResp.json();

          // 3. 建立 UI 項目
          const item = document.createElement('div');
          item.className = 'addon-item';

          // 處理圖示路徑 (優先找 48px，沒有就找 128px)
          let iconUrl = 'images/default.png'; 
          if (info.icons) {
            const iconFile = info.icons["48"] || info.icons["128"];
            iconUrl = chrome.runtime.getURL(`functions/${addonId}/${iconFile}`);
          }

          item.innerHTML = `
            <img src="${iconUrl}" class="addon-icon">
            <div class="addon-info">
              <span class="addon-name">${info.name}</span>
              <span class="addon-status">運行中</span>
            </div>
          `;
          listContainer.appendChild(item);
        } catch (e) {
          console.error(`[YouTube addons] Failed to load info for: ${addonId}`, e);
        }
      }
    }
  } catch (err) {
    console.error('[YouTube addons] Popup render failed.', err);
  }
}

// 跳轉設定
const settingsBtn = document.getElementById('open-settings');
if (settingsBtn) {
  settingsBtn.onclick = () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('setting.html') });
  };
}

renderPopup();