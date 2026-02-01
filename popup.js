// QuickVault Popup Logic - Version 2.1 (Fixes Applied)
document.addEventListener('DOMContentLoaded', async () => {
  // Elements
  const get = (id) => document.getElementById(id);
  const setupScreen = get('setup-screen');
  const mainScreen = get('main-screen');
  const notesView = get('notes-view');
  const secretsView = get('secrets-view');
  const settingsView = get('settings-view');
  const aboutView = get('about-view');
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

  // Custom Modal with enhanced animation
  const showConfirm = (title, message, confirmText = 'Delete') => {
    if (!confirmModal) return Promise.resolve(confirm(message));
    modalTitle.textContent = title;
    modalMessage.textContent = message;
    modalConfirmBtn.textContent = confirmText;
    confirmModal.classList.remove('hidden');
    // Add entrance animation
    setTimeout(() => {
      confirmModal.style.opacity = '1';
    }, 10);
    return new Promise(resolve => { resolveModal = resolve; });
  };

  if (modalConfirmBtn) modalConfirmBtn.onclick = () => {
    confirmModal.style.opacity = '0';
    setTimeout(() => {
      confirmModal.classList.add('hidden');
      if (resolveModal) resolveModal(true);
    }, 300);
  };
  if (modalCancelBtn) modalCancelBtn.onclick = () => {
    confirmModal.style.opacity = '0';
    setTimeout(() => {
      confirmModal.classList.add('hidden');
      if (resolveModal) resolveModal(false);
    }, 300);
  };

  // Enhanced toast notification
  const showToast = (message, type = 'success') => {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    toast.style.cssText = `
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: ${type === 'success' ? 'var(--accent-primary)' : 'var(--danger)'};
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      font-weight: 600;
      z-index: 10000;
      opacity: 0;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
    `;
    document.body.appendChild(toast);

    // Animate in
    setTimeout(() => {
      toast.style.opacity = '1';
      toast.style.transform = 'translateX(-50%) translateY(-10px)';
    }, 10);

    // Remove after delay
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(-50%) translateY(10px)';
      setTimeout(() => document.body.removeChild(toast), 300);
    }, 3000);
  };

  // Enhanced button interactions
  const addRippleEffect = (button) => {
    button.addEventListener('click', function (e) {
      const ripple = document.createElement('span');
      const rect = this.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height);
      const x = e.clientX - rect.left - size / 2;
      const y = e.clientY - rect.top - size / 2;

      ripple.style.cssText = `
        position: absolute;
        width: ${size}px;
        height: ${size}px;
        left: ${x}px;
        top: ${y}px;
        background: rgba(255, 255, 255, 0.3);
        border-radius: 50%;
        transform: scale(0);
        animation: ripple 0.6s linear;
        pointer-events: none;
      `;

      this.style.position = 'relative';
      this.style.overflow = 'hidden';
      this.appendChild(ripple);

      setTimeout(() => ripple.remove(), 600);
    });
  };

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

  // Add ripple effects to all buttons
  document.querySelectorAll('button').forEach(addRippleEffect);

  // Handle external links
  document.querySelectorAll('.external-link').forEach(el => {
    el.onclick = () => {
      const url = el.getAttribute('data-url');
      if (url) chrome.tabs.create({ url });
    };
  });

  // Update notes count display
  const updateNotesCount = (count) => {
    const countEl = get('notes-count');
    if (countEl) countEl.textContent = count;
  };

  // Initialize
  const data = await chrome.storage.local.get(['pin', 'secrets', 'notes', 'clearDelay']);
  const session = await chrome.storage.session.get(['unlockedUntil']);

  if (!data.pin) {
    if (setupScreen) setupScreen.classList.remove('hidden');
  } else {
    if (mainScreen) mainScreen.classList.remove('hidden');
    renderNotes(data.notes || []);
    updateNotesCount((data.notes || []).length);
    if (session.unlockedUntil && Date.now() < session.unlockedUntil) isSecretsUnlocked = true;
    updateHeader();
  }

  // Navigation
  on('unlock-secrets-btn', 'onclick', () => {
    if (isSecretsUnlocked && secretsView.classList.contains('hidden')) {
      switchView(secretsView);
      chrome.storage.local.get('secrets', (res) => renderSecrets(res.secrets || []));
    } else if (isSecretsUnlocked && !secretsView.classList.contains('hidden')) {
      // Manual Lock if already inside
      isSecretsUnlocked = false;
      chrome.storage.session.remove('unlockedUntil');
      switchView(notesView);
      showToast('Vault Locked');
    } else {
      switchView(secretsView);
      renderSecretsLocked();
    }
  });

  on('settings-toggle-btn', 'onclick', () => switchView(settingsView));
  on('profile-trigger', 'onclick', () => switchView(aboutView));
  document.querySelectorAll('.back-btn').forEach(btn => btn.onclick = () => switchView(notesView));

  function switchView(target) {
    if (!target) return;
    [notesView, secretsView, settingsView, aboutView].forEach(v => v && v.classList.add('hidden'));
    target.classList.remove('hidden');
    updateHeader();
  }

  function updateHeader() {
    const unlockBtn = get('unlock-secrets-btn');
    if (!unlockBtn) return;

    if (isSecretsUnlocked) {
      unlockBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent-primary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>`;
      unlockBtn.title = "Vault Unlocked (Click to Lock)";
    } else {
      unlockBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>`;
      unlockBtn.title = "Open Secrets";
    }
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
      <div class="settings-group" style="margin-bottom: 20px;">
        <div class="input-stack">
          <input type="text" id="secret-label-input" placeholder="Label (e.g. Gmail Password)">
          <input type="password" id="secret-value-input" placeholder="Value">
        </div>
        <button id="add-secret" class="primary">Save Encrypted Secret</button>
      </div>
      <div id="secrets-list"></div>
    `;

    const list = get('secrets-list');
    if (secrets.length === 0) {
      list.innerHTML = `<div style="text-align: center; color: var(--text-secondary); padding: 40px 20px; font-size: 0.85rem;">No secrets saved yet. Add your first secret above.</div>`;
    }

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
        <div class="item-content" style="margin-top: 4px;">
          <span class="value masked line-clamp" id="secret-${index}">${esc(s.value)}</span>
        </div>
        <button class="read-more-toggle" style="display:none; position: absolute; bottom: 12px; right: 12px;" title="Toggle Read More">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="7 10 12 15 17 10"/></svg>
        </button>
      `;
      if (list) list.appendChild(item);
    });

    // Check for overflow after all items are in DOM
    document.querySelectorAll('.item').forEach(item => {
      const val = item.querySelector('.value');
      const btn = item.querySelector('.read-more-toggle');
      if (val && btn && val.scrollHeight > val.offsetHeight + 2) {
        btn.style.display = 'inline-flex';
      }
    });

    document.querySelectorAll('.read-more-toggle').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const item = btn.closest('.item');
        item.classList.toggle('expanded');
      };
    });
    // ... rest of the setup logic remains identical
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
        newList.unshift({ label, value });
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

    if (actualNotes.length === 0) {
      notesList.innerHTML = `<div style="text-align: center; color: var(--text-secondary); padding: 40px 20px; font-size: 0.85rem;">No pastes yet. Add your first snippet above!</div>`;
    }

    actualNotes.forEach((n, index) => {
      const isImage = typeof n === 'string' && n.startsWith('data:image/');
      const item = document.createElement('div');
      item.className = 'item';

      let contentHtml = '';
      if (isImage) {
        contentHtml = `<img src="${n}" style="max-width: 100%; border-radius: 6px; margin-top: 4px; box-shadow: 0 4px 12px rgba(0,0,0,0.2);">`;
      } else {
        contentHtml = `<span class="value line-clamp">${esc(n)}</span>`;
      }

      item.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; margin-bottom: 24px;">
          <div class="item-body" style="font-size: 0.85rem; line-height: 1.4; padding-top: 4px; flex-grow: 1; overflow: hidden;">
            ${contentHtml}
          </div>
          <div class="btn-group" style="flex-shrink: 0;">
            <button class="copy-btn icon-btn" data-index="${index}" title="Copy">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
            </button>
            <button class="delete-btn icon-btn" data-type="note" data-index="${index}" title="Delete">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            </button>
          </div>
        </div>
        ${!isImage ? `
        <button class="read-more-toggle" style="display:none; position: absolute; bottom: 12px; right: 12px;" title="Toggle Read More">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="7 10 12 15 17 10"/></svg>
        </button>` : ''}
      `;
      notesList.appendChild(item);
    });

    // Handle overflow detection
    document.querySelectorAll('.item').forEach(item => {
      const val = item.querySelector('.value');
      const btn = item.querySelector('.read-more-toggle');
      if (val && btn && val.scrollHeight > val.offsetHeight + 2) {
        btn.style.display = 'inline-flex';
      }
    });

    document.querySelectorAll('.read-more-toggle').forEach(btn => {
      btn.onclick = () => {
        const item = btn.closest('.item');
        item.classList.toggle('expanded');
      };
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

      if (newList.length >= 20) {
        showToast("Limit reached! Maximum 20 quick pastes allowed.", 'error');
        return;
      }

      newList.unshift(val);
      await chrome.storage.local.set({ notes: newList });
      el.value = '';
      renderNotes(newList);
      updateNotesCount(newList.length);
      showToast('Item saved successfully!');
    }
  };

  on('add-note', 'onclick', addNote);
  on('note-input', 'onkeydown', (e) => { if (e.key === 'Enter') addNote(); });
  on('note-input', 'onblur', addNote);

  // Paste handler for images
  const noteInput = get('note-input');
  if (noteInput) {
    noteInput.onpaste = async (e) => {
      const items = (e.clipboardData || e.originalEvent.clipboardData).items;
      for (const item of items) {
        if (item.type.indexOf('image') !== -1) {
          const blob = item.getAsFile();
          const reader = new FileReader();
          reader.onload = async (event) => {
            const base64 = event.target.result;
            const { notes } = await chrome.storage.local.get('notes');
            const newList = Array.isArray(notes) ? notes : [];
            if (newList.length < 20) {
              newList.unshift(base64);
              await chrome.storage.local.set({ notes: newList });
              renderNotes(newList);
              updateNotesCount(newList.length);
              showToast('Image saved!');
            } else {
              showToast('Limit reached!', 'error');
            }
          };
          reader.readAsDataURL(blob);
          // Prevent text paste if we handled it as image
          e.preventDefault();
        }
      }
    };
  }

  function attachActionListeners(copySelector, deleteSelector, type) {
    document.querySelectorAll(copySelector).forEach(btn => {
      btn.onclick = async () => {
        const index = parseInt(btn.dataset.index);
        const key = type === 'secret' ? 'secrets' : 'notes';
        const storage = await chrome.storage.local.get(key);
        const list = storage[key] || [];
        const val = type === 'secret' ? (list[index] ? list[index].value : '') : list[index];

        if (val) {
          if (typeof val === 'string' && val.startsWith('data:image/')) {
            // Send binary copy request via background worker
            chrome.runtime.sendMessage({ type: 'copy-to-clipboard', target: 'offscreen', data: val });
          } else {
            await navigator.clipboard.writeText(val);
          }
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


  on('change-pin-btn', 'onclick', async () => {
    const currentPinEl = get('current-pin-input');
    const newPinEl = get('new-pin-input');
    if (!currentPinEl || !newPinEl) return;

    const currentPin = currentPinEl.value;
    const newPin = newPinEl.value;

    if (!currentPin || !newPin) {
      alert('Please fill in both fields.');
      return;
    }

    const { pin } = await chrome.storage.local.get('pin');
    if (currentPin !== pin) {
      alert('Current PIN is incorrect.');
      return;
    }

    await chrome.storage.local.set({ pin: newPin });
    showToast('PIN Updated Successfully!');
    currentPinEl.value = '';
    newPinEl.value = '';
  });
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
});
