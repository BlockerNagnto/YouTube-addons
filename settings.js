async function initManager() {
  const container = document.getElementById('addon-list-container');
  if (!container) return;

  const isPopup = window.innerWidth < 500;
  const defaultAddons = ["speed_controler", "list_auto", "no_warning", "none_stop"];

  try {
    const allResp = await fetch(chrome.runtime.getURL('functions/addons.json'));
    const allAddons = await allResp.json();

    const storage = await chrome.storage.local.get(['enabled_addons', 'addon_settings']);
    let enabledList = storage.enabled_addons || defaultAddons;
    let addonSettings = storage.addon_settings || {};

    let html = '';
    for (const addonId of allAddons) {
      // 預設值
      let finalInfo = {
        name: addonId.replace(/_/g, ' '),
        version: '?',
        description: ''
      };
      let customConfigs = [];

      // 1. 先抓 addon.json (獲取細項設定與基礎資料)
      try {
        const addonResp = await fetch(chrome.runtime.getURL(`functions/${addonId}/addon.json`));
        if (addonResp.ok) {
          const addonData = await addonResp.json();
          // 先填入 addon.json 的資料
          if (addonData.name) finalInfo.name = addonData.name;
          if (addonData.version) finalInfo.version = addonData.version;
          if (addonData.description) finalInfo.description = addonData.description;
          // 細項設定固定來源
          customConfigs = addonData.settings || [];
        }
      } catch (e) { /* 忽略錯誤 */ }

      // 2. 再抓 manifest.json (覆蓋基礎資料，實現 mani 優先)
      try {
        const maniResp = await fetch(chrome.runtime.getURL(`functions/${addonId}/manifest.json`));
        if (maniResp.ok) {
          const maniData = await maniResp.json();
          if (maniData.name) finalInfo.name = maniData.name;
          if (maniData.version) finalInfo.version = maniData.version;
          if (maniData.description) finalInfo.description = maniData.description;
        }
      } catch (e) { /* 忽略錯誤 */ }

      const isChecked = enabledList.includes(addonId);

      html += `
        <div class="addon-item-container" style="margin-bottom: 10px;">
          <div class="addon-item">
            <div class="addon-info">
              <span class="addon-name">${finalInfo.name}</span>
              ${!isPopup ? `<div class="addon-desc">${finalInfo.description}</div>` : ''}
            </div>
            <label class="switch">
              <input type="checkbox" class="addon-toggle" data-id="${addonId}" ${isChecked ? 'checked' : ''}>
              <span class="slider"></span>
            </label>
          </div>`;

      // 渲染細項設定 (僅在設定頁面顯示)
      if (!isPopup && customConfigs.length > 0) {
        html += `<div class="addon-custom-settings" style="padding: 10px 20px; border: 1px solid #333; border-top:none; background:#161616; display: ${isChecked ? 'block' : 'none'};">`;
        customConfigs.forEach(conf => {
          const val = (addonSettings[addonId] && addonSettings[addonId][conf.id] !== undefined)
            ? addonSettings[addonId][conf.id]
            : conf.default;

          html += `<div class="setting-row" style="margin-bottom:8px; display:flex; align-items:flex-start; justify-content:space-between;">
    <label style="font-size:13px; color:#ccc; margin-top:5px;">${conf.text}</label>`;

          const baseAttr = `class="opt-input" data-addon="${addonId}" data-sid="${conf.id}" data-type="${conf.type}"`;

          if (conf.type === 'bool') {
            html += `<input type="checkbox" ${baseAttr} ${val ? 'checked' : ''}>`;
          } else if (conf.type === 'string') {
            html += `<input type="text" ${baseAttr} value="${val}" style="width:120px; background:#000; color:#fff; border:1px solid #444; padding:2px;">`;
          } else if (conf.type === 'list') {
            // 新增 list 類型：使用 textarea 並保持換行顯示
            html += `<textarea ${baseAttr} style="width:120px; height:60px; background:#000; color:#fff; border:1px solid #444; padding:2px; font-size:12px; resize:vertical;">${val}</textarea>`;
          } else if (conf.type === 'integer' || conf.type === 'float') {
            html += `<input type="number" ${baseAttr} step="${conf.type === 'float' ? '0.1' : '1'}" 
             min="${conf.min ?? 0}" max="${conf.max ?? 100}" value="${val}" style="width:60px; background:#000; color:#fff; border:1px solid #444; padding:2px;">`;
          } else if (conf.type === 'color') {
            html += `<input type="color" ${baseAttr} value="${val}">`;
          }
          html += `</div>`;
        });
        html += `</div>`;
      }
      html += `</div>`;
    }
    container.innerHTML = html;

    // 事件監聽 (保持不變)
    container.addEventListener('change', async (e) => {
      if (e.target.classList.contains('addon-toggle')) {
        const id = e.target.dataset.id;
        const res = await chrome.storage.local.get('enabled_addons');
        let list = res.enabled_addons || [...defaultAddons];

        if (e.target.checked) {
          if (!list.includes(id)) list.push(id);
        } else {
          list = list.filter(item => item !== id);
        }
        await chrome.storage.local.set({ 'enabled_addons': list });

        const sub = e.target.closest('.addon-item-container').querySelector('.addon-custom-settings');
        if (sub) sub.style.display = e.target.checked ? 'block' : 'none';
      }

      if (e.target.classList.contains('opt-input')) {
        const { addon, sid, type } = e.target.dataset;
        let value;

        if (type === 'bool') value = e.target.checked;
        else if (type === 'integer') value = parseInt(e.target.value);
        else if (type === 'float') value = parseFloat(e.target.value);
        else value = e.target.value; // string 和 list 都直接存字串內容

        const res = await chrome.storage.local.get('addon_settings');
        let settings = res.addon_settings || {};
        if (!settings[addon]) settings[addon] = {};
        settings[addon][sid] = value;
        await chrome.storage.local.set({ 'addon_settings': settings });
      }
    });

  } catch (err) { console.error('Init Error:', err); }
}

function bindActionButtons() {
  const openBtn = document.getElementById('open-settings-btn');
  if (openBtn) openBtn.onclick = () => chrome.tabs.create({ url: chrome.runtime.getURL('setting.html') });

  const exportBtn = document.getElementById('export-btn');
  if (exportBtn) {
    exportBtn.onclick = async () => {
      const data = await chrome.storage.local.get(['enabled_addons', 'addon_settings']);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'yt_addons_config.json';
      a.click();
    };
  }

  const importBtn = document.getElementById('import-btn');
  const importFile = document.getElementById('import-file');
  if (importBtn && importFile) {
    importBtn.onclick = () => importFile.click();
    importFile.onchange = (e) => {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = async (ev) => {
        try {
          const config = JSON.parse(ev.target.result);
          if (config.enabled_addons) {
            await chrome.storage.local.set(config);
            alert('匯入成功');
            location.reload();
          }
        } catch (err) { alert('匯入失敗'); }
      };
      reader.readAsText(file);
    };
  }
}

document.addEventListener('DOMContentLoaded', () => {
  initManager();
  bindActionButtons();
});