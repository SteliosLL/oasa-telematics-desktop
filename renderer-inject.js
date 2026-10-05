(function () {
  const CONTAINER_ID = 'oasa-fav-container';

  // Strictly use IPC storage via preload.js — NO LocalStorage fallbacks
  const getFavorites = async () => {
    try {
      if (window.oasaAPI && typeof window.oasaAPI.getFavorites === 'function') {
        return await window.oasaAPI.getFavorites();
      }
    } catch (e) {
      console.error('[OASA-Wrapper] Failed to fetch favorites via IPC:', e);
    }
    return [];
  };

  const saveFavorites = async (favs) => {
    try {
      if (window.oasaAPI && typeof window.oasaAPI.saveFavorites === 'function') {
        return await window.oasaAPI.saveFavorites(favs);
      }
    } catch (e) {
      console.error('[OASA-Wrapper] Failed to save favorites via IPC:', e);
    }
    return false;
  };

  function triggerChange(element) {
    if (!element) return;
    const event = new Event('change', { bubbles: true });
    element.dispatchEvent(event);
  }

  function waitForOption(selectElement, targetValue, timeout = 5000) {
    return new Promise((resolve) => {
      if (!selectElement) return resolve(false);

      const checkOption = () => Array.from(selectElement.options).some(opt => opt.value === String(targetValue));
      if (checkOption()) return resolve(true);

      const startTime = Date.now();
      const interval = setInterval(() => {
        if (checkOption()) {
          clearInterval(interval);
          resolve(true);
        } else if (Date.now() - startTime > timeout) {
          clearInterval(interval);
          resolve(false);
        }
      }, 100);
    });
  }

  if (!document.getElementById('oasa-fav-styles')) {
    const style = document.createElement('style');
    style.id = 'oasa-fav-styles';
    style.textContent = `
      #oasa-fav-container {
        background: #0f172a !important;
        color: #f8fafc !important;
        padding: 16px !important;
        margin: 12px 0 !important;
        border-radius: 8px !important;
        font-family: system-ui, -apple-system, sans-serif !important;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4) !important;
        border: 2px solid #38bdf8 !important;
        width: 100% !important;
        box-sizing: border-box !important;
      }
      #oasa-fav-container h3 { margin: 0 0 12px 0 !important; color: #38bdf8 !important; font-size: 15px !important; }
      .oasa-fav-form { display: flex !important; gap: 8px !important; margin-bottom: 12px !important; }
      .oasa-fav-form input { flex: 1 !important; padding: 8px 12px !important; border: 1px solid #334155 !important; border-radius: 6px !important; background: #1e293b !important; color: #ffffff !important; }
      .oasa-fav-btn { background: #0284c7 !important; color: #ffffff !important; border: none !important; padding: 8px 14px !important; border-radius: 6px !important; cursor: pointer !important; font-weight: 600 !important; }
      .oasa-fav-list { list-style: none !important; padding: 0 !important; margin: 0 !important; display: flex !important; flex-direction: column !important; gap: 6px !important; }
      .oasa-fav-item { display: flex !important; justify-content: space-between !important; align-items: center !important; background: #1e293b !important; padding: 8px 12px !important; border-radius: 6px !important; }
      .oasa-fav-click-area { cursor: pointer !important; color: #f1f5f9 !important; font-weight: 500 !important; }
      .oasa-fav-del-btn { background: #ef4444 !important; color: white !important; border: none !important; padding: 4px 8px !important; border-radius: 4px !important; cursor: pointer !important; }
    `;
    document.head.appendChild(style);
  }

  function createContainer() {
    const container = document.createElement('div');
    container.id = CONTAINER_ID;
    container.innerHTML = `
      <h3>⭐ My Favorite Stops</h3>
      <div class="oasa-fav-form">
        <input type="text" id="oasa-fav-name-input" placeholder="Custom Label (e.g. Home -> Work)">
        <button class="oasa-fav-btn" id="oasa-fav-add-btn">Add Favorite</button>
      </div>
      <ul class="oasa-fav-list" id="oasa-fav-list"></ul>
    `;
    return container;
  }

  function bindEvents() {
    const addBtn = document.getElementById('oasa-fav-add-btn');
    if (!addBtn) return;

    addBtn.onclick = async () => {
      const lSel = document.getElementById('line');
      const dSel = document.getElementById('direction');
      const sSel = document.getElementById('station');
      const nameInput = document.getElementById('oasa-fav-name-input');

      const name = nameInput ? nameInput.value.trim() : '';
      const lineValue = lSel ? lSel.value : '';
      const dirValue = dSel ? dSel.value : '';
      const stationValue = sSel ? sSel.value : '';

      if (!name) { alert('Please enter a custom name.'); return; }
      if (!lineValue || !dirValue || !stationValue) { alert('Please select Line, Direction, and Station first.'); return; }

      const favorites = await getFavorites();
      favorites.push({ name, lineValue, dirValue, stationValue });
      await saveFavorites(favorites);
      if (nameInput) nameInput.value = '';
      await renderFavorites();
    };
  }

  async function renderFavorites() {
    const listEl = document.getElementById('oasa-fav-list');
    if (!listEl) return;

    const favorites = await getFavorites();
    listEl.innerHTML = '';

    if (favorites.length === 0) {
      listEl.innerHTML = '<li style="color:#94a3b8; font-size:12px; padding: 4px;">No saved favorites yet in oasa-favorites.json.</li>';
      return;
    }

    favorites.forEach((fav, index) => {
      const li = document.createElement('li');
      li.className = 'oasa-fav-item';

      const labelSpan = document.createElement('span');
      labelSpan.className = 'oasa-fav-click-area';
      labelSpan.textContent = fav.name;
      labelSpan.onclick = () => applyFavorite(fav);

      const delBtn = document.createElement('button');
      delBtn.className = 'oasa-fav-del-btn';
      delBtn.textContent = 'Delete';
      delBtn.onclick = async (e) => {
        e.stopPropagation();
        const favs = await getFavorites();
        favs.splice(index, 1);
        await saveFavorites(favs);
        await renderFavorites();
      };

      li.appendChild(labelSpan);
      li.appendChild(delBtn);
      listEl.appendChild(li);
    });
  }

  async function applyFavorite(fav) {
    const lSel = document.getElementById('line');
    const dSel = document.getElementById('direction');
    const sSel = document.getElementById('station');

    if (lSel) { lSel.value = fav.lineValue; triggerChange(lSel); }
    await waitForOption(dSel, fav.dirValue);
    if (dSel) { dSel.value = fav.dirValue; triggerChange(dSel); }
    await waitForOption(sSel, fav.stationValue);
    if (sSel) { sSel.value = fav.stationValue; triggerChange(sSel); }
  }

  async function tryInject() {
    if (document.getElementById(CONTAINER_ID)) return true;
    const lineSelect = document.getElementById('line');
    if (lineSelect) {
      const targetParent = lineSelect.closest('form') || lineSelect.parentElement;
      targetParent.prepend(createContainer());
      bindEvents();
      await renderFavorites();
      return true;
    }
    return false;
  }

  let attempts = 0;
  const pollInterval = setInterval(async () => {
    attempts++;
    if (await tryInject() || attempts > 50) clearInterval(pollInterval);
  }, 200);
})();