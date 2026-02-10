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
        <div class="addon-item-container">
          <div class="addon-item">
            <div class="addon-info">
              <div class="addon-name-row" ${!isPopup && customConfigs.length > 0 ? `style="display:flex; align-items:center; gap:8px; cursor:pointer;"` : ''}>
                ${!isPopup && customConfigs.length > 0 ? `<span class="expand-arrow-small ${isChecked ? 'expanded' : ''}">▶</span>` : ''}
                <span class="addon-name">${finalInfo.name}</span>
              </div>
              ${!isPopup ? `<div class="addon-desc">${finalInfo.description}</div>` : ''}
            </div>
            <label class="switch">
              <input type="checkbox" class="addon-toggle" data-id="${addonId}" ${isChecked ? 'checked' : ''}>
              <span class="slider"></span>
            </label>
          </div>`;

      // 渲染細項設定 (僅在設定頁面顯示)
      if (!isPopup && customConfigs.length > 0) {
        html += `<div class="addon-custom-settings ${!isChecked ? 'hidden' : ''}">`;
        customConfigs.forEach(conf => {
          const val = (addonSettings[addonId] && addonSettings[addonId][conf.id] !== undefined)
            ? addonSettings[addonId][conf.id]
            : conf.default;

          html += `<div class="setting-row">
    <label>${conf.text}</label>`;

          // normalize type names from addon.json to internal names
          const normalizedType = (conf.type === 'bool' || conf.type === 'boolean') ? 'boolean'
            : (conf.type === 'string' || conf.type === 'text') ? 'text'
            : conf.type;

          const baseAttr = `class="opt-input" data-addon="${addonId}" data-sid="${conf.id}" data-type="${normalizedType}"`;

          if (normalizedType === 'boolean') {
            html += `<input type="checkbox" ${baseAttr} ${val ? 'checked' : ''}>`;
          } else if (normalizedType === 'text') {
            html += `<input type="text" ${baseAttr} value="${val}">`;
          } else if (normalizedType === 'list') {
            // list 類型使用 textarea
            html += `<textarea ${baseAttr}>${val}</textarea>`;
          } else if (normalizedType === 'integer' || normalizedType === 'float') {
            html += `<input type="number" ${baseAttr} step="${normalizedType === 'float' ? '0.1' : '1'}" 
             min="${conf.min ?? 0}" max="${conf.max ?? 100}" value="${val}">`;
          } else if (normalizedType === 'color') {
            html += `<input type="color" ${baseAttr} value="${val}">`;
          } else if (normalizedType === 'select') {
            // select 下拉選單
            html += `<select ${baseAttr} style="background:#000;color:#fff;border:1px solid #444;padding:2px;">`;
            (conf.potentialValues || []).forEach(opt => {
              html += `<option value="${opt.id}" ${val === opt.id ? 'selected' : ''}>${opt.name}</option>`;
            });
            html += `</select>`;
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
        if (sub) sub.classList.toggle('hidden', !e.target.checked);
      }

      if (e.target.classList.contains('opt-input')) {
        const { addon, sid, type } = e.target.dataset;
        let value;

        // 支援 normalized type names: boolean, integer, float, text, list, color, select
        if (type === 'boolean') value = e.target.checked;
        else if (type === 'integer') value = parseInt(e.target.value);
        else if (type === 'float') value = parseFloat(e.target.value);
        else value = e.target.value; // text, list, select, color 都直接存字串

        const res = await chrome.storage.local.get('addon_settings');
        let settings = res.addon_settings || {};
        if (!settings[addon]) settings[addon] = {};
        settings[addon][sid] = value;
        await chrome.storage.local.set({ 'addon_settings': settings });
      }
    });

    // 細項設定展開/收合
    container.addEventListener('click', (e) => {
      const arrow = e.target.closest('.expand-arrow-small');
      const nameRow = e.target.closest('.addon-name-row');
      
      if (arrow || nameRow) {
        const container = e.target.closest('.addon-item-container');
        if (!container) return;
        
        const settingsPanel = container.querySelector('.addon-custom-settings');
        const arrowEl = container.querySelector('.expand-arrow-small');
        
        if (settingsPanel && arrowEl) {
          arrowEl.classList.toggle('expanded');
          settingsPanel.classList.toggle('hidden');
        }
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
            alert('匯入成功，即將重新載入頁面以套用設定');
            location.reload();
          }
        } catch (err) { alert('匯入失敗: ' + err.message); }
      };
      reader.readAsText(file);
    };
  }
}

document.addEventListener('DOMContentLoaded', () => {
  initManager();
  bindActionButtons();
});