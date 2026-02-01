// QuickVault Popup Logic - Version 2.1 (Fixes Applied)
document.addEventListener('DOMContentLoaded', async () => {
  // Elements
  const get = (id) => document.getElementById(id);
  const setupScreen = get('setup-screen');
  const mainScreen = get('main-screen');
  const notesView = get('notes-view');
  const secretsView = get('secrets-view');
  const settingsView = get('settings-view');
  const secretsContent = get('secrets-content');
  const notesList = get('notes-list');
  const confirmModal = get('confirm-modal');
  const modalTitle = get('modal-title');
  const modalMessage = get('modal-message');
  const modalConfirmBtn = get('modal-confirm');
  const modalCancelBtn = get('modal-cancel');

  let resolveModal;
  const AUTO_LOCK_TIMEOUT = 5 * 60 * 1000;
  let isSecretsUnlocked = false;

  console.log("QuickVault: Initializing...");

  // Custom Modal
  const showConfirm = (title, message, confirmText = 'Delete') => {
    if (!confirmModal) return Promise.resolve(confirm(message));
    modalTitle.textContent = title;
    modalMessage.textContent = message;
    modalConfirmBtn.textContent = confirmText;
    confirmModal.classList.remove('hidden');
    return new Promise(resolve => { resolveModal = resolve; });
  };

  if (modalConfirmBtn) modalConfirmBtn.onclick = () => { confirmModal.classList.add('hidden'); if (resolveModal) resolveModal(true); };
  if (modalCancelBtn) modalCancelBtn.onclick = () => { confirmModal.classList.add('hidden'); if (resolveModal) resolveModal(false); };

  // Helper for safe events
  const on = (id, event, handler) => {
    const el = get(id);
    if (el) el[event] = handler;
  };

  // Safe escape helper
  const esc = (str) => {
    if (str === null || str === undefined) return '';
    const p = document.createElement('p');
    p.textContent = String(str);
    return p.innerHTML;
  };

  // Initialize
  const data = await chrome.storage.local.get(['pin', 'secrets', 'notes', 'clearDelay']);
  const session = await chrome.storage.session.get(['unlockedUntil']);

  if (data.clearDelay !== undefined && get('clear-delay-input')) {
    get('clear-delay-input').value = data.clearDelay;
  }

  if (!data.pin) {
    if (setupScreen) setupScreen.classList.remove('hidden');
  } else {
    if (mainScreen) mainScreen.classList.remove('hidden');
    renderNotes(data.notes || []);
    if (session.unlockedUntil && Date.now() < session.unlockedUntil) isSecretsUnlocked = true;
  }

  // Navigation
  on('unlock-secrets-btn', 'onclick', () => {
    switchView(secretsView);
    if (isSecretsUnlocked) {
      chrome.storage.local.get('secrets', (res) => renderSecrets(res.secrets || []));
    } else renderSecretsLocked();
  });
  on('settings-toggle-btn', 'onclick', () => switchView(settingsView));
  document.querySelectorAll('.back-btn').forEach(btn => btn.onclick = () => switchView(notesView));

  function switchView(target) {
    if (!target) return;
    [notesView, secretsView, settingsView].forEach(v => v && v.classList.add('hidden'));
    target.classList.remove('hidden');
  }

  // PIN Setup
  on('save-pin', 'onclick', async () => {
    const el = get('new-pin');
    const pin = el ? el.value : '';
    if (pin) {
      await chrome.storage.local.get(['secrets', 'notes'], async (existing) => {
        await chrome.storage.local.set({ pin, secrets: existing.secrets || [], notes: existing.notes || [] });
        if (setupScreen) setupScreen.classList.add('hidden');
        if (mainScreen) mainScreen.classList.remove('hidden');
        renderNotes(existing.notes || []);
        switchView(notesView);
      });
    }
  });

  function renderSecretsLocked() {
    if (!secretsContent) return;
    secretsContent.innerHTML = `
      <div class="section" style="text-align: center; padding: 20px;">
        <p style="margin-bottom: 12px; color: var(--text-secondary);">Vault is locked.</p>
        <input type="password" id="unlock-pin" placeholder="Enter PIN" style="margin-bottom: 12px;">
        <button id="unlock-btn" class="primary" style="margin-top: 0;">Unlock Secrets</button>
      </div>
    `;
    on('unlock-btn', 'onclick', async () => {
      const inputPin = get('unlock-pin').value;
      const data = await chrome.storage.local.get(['pin', 'secrets']);
      if (inputPin === data.pin) {
        isSecretsUnlocked = true;
        await chrome.storage.session.set({ unlockedUntil: Date.now() + AUTO_LOCK_TIMEOUT });
        renderSecrets(data.secrets || []);
      } else alert('Incorrect PIN');
    });
  }

  async function renderSecrets(secrets) {
    if (!secretsContent) return;
    secretsContent.innerHTML = `
      <div class="section">
        <div id="secrets-list"></div>
        <div class="controls">
          <input type="text" id="secret-label-input" placeholder="Label">
          <input type="password" id="secret-value-input" placeholder="Value">
          <button id="add-secret" class="primary">Save Secret</button>
        </div>
      </div>
    `;
    const list = get('secrets-list');
    secrets.forEach((s, index) => {
      const item = document.createElement('div');
      item.className = 'item';
      item.innerHTML = `
        <div class="item-header">
          <span class="item-label">${esc(s.label)}</span>
          <div class="btn-group">
            <button class="reveal-btn icon-btn" data-id="${index}" title="Reveal">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            </button>
            <button class="copy-btn icon-btn" data-index="${index}" title="Copy">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
            </button>
            <button class="delete-btn icon-btn" data-type="secret" data-index="${index}" title="Delete">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            </button>
          </div>
        </div>
        <div class="item-content">
          <span class="value masked" id="secret-${index}">${esc(s.value)}</span>
        </div>
      `;
      if (list) list.appendChild(item);
    });

    document.querySelectorAll('.reveal-btn').forEach(btn => {
      btn.onclick = (e) => {
        const el = get(`secret-${e.currentTarget.dataset.id}`);
        if (!el) return;
        const isMasked = el.classList.toggle('masked');
        btn.innerHTML = isMasked
          ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`
          : `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`;
      };
    });

    const addSecret = async () => {
      const labelEl = get('secret-label-input');
      const valueEl = get('secret-value-input');
      if (!labelEl || !valueEl) return;

      const label = labelEl.value;
      const value = valueEl.value;
      if (label && value) {
        const { secrets } = await chrome.storage.local.get('secrets');
        const newList = Array.isArray(secrets) ? secrets : [];
        newList.push({ label, value });
        await chrome.storage.local.set({ secrets: newList });
        renderSecrets(newList);
      }
    };
    on('add-secret', 'onclick', addSecret);
    on('secret-value-input', 'onkeydown', (e) => { if (e.key === 'Enter') addSecret(); });
    on('secret-label-input', 'onkeydown', (e) => { if (e.key === 'Enter') addSecret(); });
    attachActionListeners('.copy-btn', '.delete-btn', 'secret');
  }

  function renderNotes(notes) {
    if (!notesList) return;
    notesList.innerHTML = '';
    const actualNotes = Array.isArray(notes) ? notes : [];
    actualNotes.forEach((n, index) => {
      const item = document.createElement('div');
      item.className = 'item';
      item.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 12px;">
          <span class="value" style="font-size: 0.85rem; line-height: 1.4; padding-top: 4px;">${esc(n)}</span>
          <div class="btn-group" style="flex-shrink: 0;">
            <button class="copy-btn icon-btn" data-index="${index}" title="Copy">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
            </button>
            <button class="delete-btn icon-btn" data-type="note" data-index="${index}" title="Delete">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            </button>
          </div>
        </div>
      `;
      notesList.appendChild(item);
    });
    attachActionListeners('.copy-btn', '.delete-btn', 'note');
  }

  const addNote = async () => {
    const el = get('note-input');
    if (!el) return;
    const val = el.value;
    if (val) {
      const { notes } = await chrome.storage.local.get('notes');
      const newList = Array.isArray(notes) ? notes : [];
      newList.push(val);
      await chrome.storage.local.set({ notes: newList });
      renderNotes(newList);
      el.value = '';
    }
  };
  on('add-note', 'onclick', addNote);
  on('note-input', 'onkeydown', (e) => { if (e.key === 'Enter') addNote(); });

  function attachActionListeners(copySelector, deleteSelector, type) {
    document.querySelectorAll(copySelector).forEach(btn => {
      btn.onclick = async () => {
        const index = parseInt(btn.dataset.index);
        const key = type === 'secret' ? 'secrets' : 'notes';
        const storage = await chrome.storage.local.get(key);
        const list = storage[key] || [];
        const val = type === 'secret' ? (list[index] ? list[index].value : '') : list[index];

        if (val) {
          await navigator.clipboard.writeText(val);
          await chrome.storage.local.set({ lastCopied: val });
          showToast('Copied!');
          const { clearDelay } = await chrome.storage.local.get('clearDelay');
          const delay = clearDelay || 30000;
          if (delay > 0) chrome.runtime.sendMessage({ type: 'start-clear-timer', delay, value: val });
        }
      };
    });

    document.querySelectorAll(deleteSelector).forEach(btn => {
      btn.onclick = async () => {
        const typeLabel = type === 'secret' ? 'Secret' : 'Quick Paste';
        const confirmed = await showConfirm(`Delete ${typeLabel}?`, `This action cannot be undone.`);
        if (confirmed) {
          const index = parseInt(btn.dataset.index);
          const key = type === 'secret' ? 'secrets' : 'notes';
          const storage = await chrome.storage.local.get(key);
          const list = storage[key] || [];
          list.splice(index, 1);
          await chrome.storage.local.set({ [key]: list });
          if (type === 'secret') renderSecrets(list);
          else renderNotes(list);
          showToast('Deleted!');
        }
      };
    });
  }

  on('clear-delay-input', 'onchange', (e) => chrome.storage.local.set({ clearDelay: parseInt(e.target.value) }));
  on('export-btn', 'onclick', async () => {
    const data = await chrome.storage.local.get(null);
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'vault_export.json'; a.click();
  });
  on('import-trigger-btn', 'onclick', () => get('import-input').click());
  if (get('import-input')) get('import-input').onchange = (e) => {
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const imported = JSON.parse(event.target.result);
        const confirmed = await showConfirm('Import Data?', 'This will overwrite your existing secrets and pastes.');
        if (confirmed) { await chrome.storage.local.set(imported); window.location.reload(); }
      } catch (err) { alert('Invalid file format'); }
    };
    reader.readAsText(e.target.files[0]);
  };

  on('clear-notes-btn', 'onclick', async () => {
    const confirmed = await showConfirm('Clear All Pastes?', 'This will permanently remove all snippets. Secrets will be safe.');
    if (confirmed) {
      await chrome.storage.local.set({ notes: [] });
      renderNotes([]);
      showToast('All cleared!');
    }
  });

  function showToast(message) {
    const toast = document.createElement('div');
    toast.style.cssText = `position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%); background: var(--accent-primary); color: white; padding: 8px 16px; border-radius: 20px; font-size: 0.8rem; z-index: 1000; animation: fadeIn 0.3s; pointer-events: none; opacity: 1; transition: opacity 0.3s;`;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 300); }, 2000);
  }
});
