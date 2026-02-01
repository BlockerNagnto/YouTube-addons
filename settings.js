async function initManager() {
  const container = document.getElementById('addon-list-container');
  if (!container) return;

  const isPopup = window.innerWidth < 500;
  const defaultAddons = ["speed_controler", "list_auto", "no_warning", "none_stop"];

  try {
    // 1. 抓取所有可用插件清單
    const allResp = await fetch(chrome.runtime.getURL('functions/addons.json'));
    const allAddons = await allResp.json();

    // 2. 抓取啟用的狀態
    const storage = await chrome.storage.local.get('enabled_addons');
    let enabledList = storage.enabled_addons || defaultAddons;

    let html = '';
    for (const addonId of allAddons) {
      const formattedId = addonId.replace(/_/g, ' ');
      const defaultName = formattedId.charAt(0).toUpperCase() + formattedId.slice(1).toLowerCase();
      
      let info = { name: defaultName, version: '', description: '' };
      
      try {
        const infoResp = await fetch(chrome.runtime.getURL(`functions/${addonId}/manifest.json`));
        if (infoResp.ok) info = await infoResp.json();
      } catch (e) {}

      const isChecked = enabledList.includes(addonId);
      const content = isPopup 
        ? `<span class="addon-name">${info.name}</span>`
        : `<div class="addon-header">
             <span class="addon-name">${info.name}</span>
             <span class="addon-version">${info.version}</span>
           </div>
           <div class="addon-desc">${info.description}</div>`;

      html += `
        <div class="addon-item">
          <div class="addon-info">${content}</div>
          <label class="switch">
            <input type="checkbox" class="addon-toggle" data-id="${addonId}" ${isChecked ? 'checked' : ''}>
            <span class="slider"></span>
          </label>
        </div>`;
    }
    container.innerHTML = html;

    // 3. 綁定開關監聽 (使用事件委託提高可靠性)
    container.addEventListener('change', async (e) => {
      if (e.target.classList.contains('addon-toggle')) {
        const id = e.target.dataset.id;
        const currentData = await chrome.storage.local.get('enabled_addons');
        let currentList = currentData.enabled_addons || [...defaultAddons];

        if (e.target.checked) {
          if (!currentList.includes(id)) currentList.push(id);
        } else {
          currentList = currentList.filter(item => item !== id);
        }
        await chrome.storage.local.set({ 'enabled_addons': currentList });
      }
    });

  } catch (err) {
    console.error('[YouTube addons] UI Init Error:', err);
  }
}

// 綁定所有按鈕事件
function bindActionButtons() {
  // 開啟設定按鈕 (僅在 popup.html 有效)
  const openBtn = document.getElementById('open-settings-btn');
  if (openBtn) {
    openBtn.onclick = () => chrome.tabs.create({ url: chrome.runtime.getURL('setting.html') });
  }

  // 匯出按鈕
  const exportBtn = document.getElementById('export-btn');
  if (exportBtn) {
    exportBtn.onclick = async () => {
      const data = await chrome.storage.local.get('enabled_addons');
      const list = data.enabled_addons || ["speed_controler", "list_auto", "no_warning", "none_stop"];
      const blob = new Blob([JSON.stringify(list, null, 2)], {type: 'application/json'});
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'yt_addons_config.json';
      a.click();
      URL.revokeObjectURL(url);
    };
  }

  // 匯入按鈕
  const importBtn = document.getElementById('import-btn');
  const importFile = document.getElementById('import-file');
  if (importBtn && importFile) {
    importBtn.onclick = () => importFile.click();
    importFile.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async (ev) => {
        try {
          const list = JSON.parse(ev.target.result);
          if (Array.isArray(list)) {
            await chrome.storage.local.set({ 'enabled_addons': list });
            alert('匯入成功，即將重新載入頁面');
            location.reload();
          } else {
            alert('格式錯誤');
          }
        } catch (err) {
          alert('匯入失敗：請確保檔案為 JSON 格式');
        }
      };
      reader.readAsText(file);
    };
  }
}

// 初始化
document.addEventListener('DOMContentLoaded', () => {
  initManager();
  bindActionButtons();
});