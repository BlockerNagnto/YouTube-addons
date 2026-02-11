async function initManager() {
  const container = document.getElementById('addon-list-container');
  if (!container) return;

  const isPopup = window.innerWidth < 500;

  try {
    const defaultResp = await fetch(chrome.runtime.getURL('libs/default_addons.json')).catch(() => ({ json: () => [] }));
    const defaultAddons = await defaultResp.json();

    const storage = await chrome.storage.local.get(['enabled_addons', 'addon_settings']);
    let enabledList = storage.enabled_addons || defaultAddons;
    let addonSettings = storage.addon_settings || {};

    let html = '';

    const loadFromDir = async (dirName) => {
      try {
        const resp = await fetch(chrome.runtime.getURL(`${dirName}/addons.json`));
        if (!resp.ok) return '';
        const addonsList = await resp.json();
        let sectionHtml = '';

        for (const addonId of addonsList) {
          let finalInfo = {
            name: addonId.replace(/_/g, ' '),
            version: '?',
            description: ''
          };
          let customConfigs = [];

          // 1. 先抓 addon.json
          try {
            const addonResp = await fetch(chrome.runtime.getURL(`${dirName}/${addonId}/addon.json`));
            if (addonResp.ok) {
              const addonData = await addonResp.json();
              if (addonData.name) finalInfo.name = addonData.name;
              if (addonData.version) finalInfo.version = addonData.version;
              if (addonData.description) finalInfo.description = addonData.description;
              customConfigs = addonData.settings || [];
            }
          } catch (e) { }

          // 2. 抓 manifest.json (覆蓋)
          try {
            const maniResp = await fetch(chrome.runtime.getURL(`${dirName}/${addonId}/manifest.json`));
            if (maniResp.ok) {
              const maniData = await maniResp.json();
              if (maniData.name) finalInfo.name = maniData.name;
              if (maniData.version) finalInfo.version = maniData.version;
              if (maniData.description) finalInfo.description = maniData.description;
            }
          } catch (e) { }

          const isChecked = enabledList.includes(addonId);

          // 結構調整：addon-main-row 處理開關，細項直接跟在下方
          sectionHtml += `
            <div class="addon-item-container">
              <div class="addon-item">
                <div class="addon-main-row">
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

          // 細項設定：直接作為 addon-item 的內容
          if (!isPopup && customConfigs.length > 0) {
            sectionHtml += `<div class="addon-custom-settings ${!isChecked ? 'hidden' : ''}">`;
            customConfigs.forEach(conf => {
              const val = (addonSettings[addonId] && addonSettings[addonId][conf.id] !== undefined)
                ? addonSettings[addonId][conf.id]
                : conf.default;

              sectionHtml += `<div class="setting-row"><label>${conf.text}</label>`;

              const type = (conf.type === 'bool' || conf.type === 'boolean') ? 'boolean' : conf.type;
              const baseAttr = `class="opt-input" data-addon="${addonId}" data-sid="${conf.id}" data-type="${type}"`;

              if (type === 'boolean') {
                sectionHtml += `<label class="switch small-switch">
                    <input type="checkbox" ${baseAttr} ${val ? 'checked' : ''}>
                    <span class="slider"></span>
                  </label>`;
              } else if (type === 'select') {
                sectionHtml += `<select ${baseAttr}>`;
                (conf.potentialValues || []).forEach(opt => {
                  sectionHtml += `<option value="${opt.id}" ${val === opt.id ? 'selected' : ''}>${opt.name}</option>`;
                });
                sectionHtml += `</select>`;
              } else if (type === 'color') {
                sectionHtml += `<input type="color" ${baseAttr} value="${val}">`;
              } else if (type === 'list') {
                sectionHtml += `<textarea ${baseAttr}>${val}</textarea>`;
              } else {
                const inputType = (type === 'integer' || type === 'float') ? 'number' : 'text';
                sectionHtml += `<input type="${inputType}" ${baseAttr} step="${type === 'float' ? '0.1' : '1'}" value="${val}">`;
              }
              sectionHtml += `</div>`;
            });
            sectionHtml += `</div>`;
          }
          sectionHtml += `</div></div>`;
        }
        return sectionHtml;
      } catch (e) { return ''; }
    };

    html += await loadFromDir('functions');
    html += await loadFromDir('functions(main)');

    container.innerHTML = html;

    // 事件處理
    container.addEventListener('change', async (e) => {
      if (e.target.classList.contains('addon-toggle')) {
        const id = e.target.dataset.id;
        const res = await chrome.storage.local.get('enabled_addons');
        let list = res.enabled_addons || [...defaultAddons];
        if (e.target.checked) { if (!list.includes(id)) list.push(id); }
        else { list = list.filter(item => item !== id); }
        await chrome.storage.local.set({ 'enabled_addons': list });
        const sub = e.target.closest('.addon-item-container').querySelector('.addon-custom-settings');
        if (sub) sub.classList.toggle('hidden', !e.target.checked);
      }

      if (e.target.classList.contains('opt-input')) {
        const { addon, sid, type } = e.target.dataset;
        let value = type === 'boolean' ? e.target.checked :
          type === 'integer' ? parseInt(e.target.value) :
            type === 'float' ? parseFloat(e.target.value) : e.target.value;

        const res = await chrome.storage.local.get('addon_settings');
        let settings = res.addon_settings || {};
        if (!settings[addon]) settings[addon] = {};
        settings[addon][sid] = value;
        await chrome.storage.local.set({ 'addon_settings': settings });
      }
    });

    container.addEventListener('click', (e) => {
      const arrow = e.target.closest('.expand-arrow-small');
      const nameRow = e.target.closest('.addon-name-row');
      if (arrow || nameRow) {
        const itemContainer = e.target.closest('.addon-item-container');
        const settingsPanel = itemContainer?.querySelector('.addon-custom-settings');
        const arrowEl = itemContainer?.querySelector('.expand-arrow-small');
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