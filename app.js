/**
 * OmniCounter — Modern Web Application Logic with Backend API Integration
 */

// ==========================================
// Sound Synthesizer (Web Audio API)
// ==========================================
class SoundFX {
  constructor() {
    this.enabled = true;
    this.ctx = null;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playTap(isIncrement = true) {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      const freq = isIncrement ? 580 : 380;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.3, this.ctx.currentTime + 0.05);

      gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.08);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.08);
    } catch (e) {
      console.warn('Audio not allowed or supported', e);
    }
  }

  playReset() {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(400, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(180, this.ctx.currentTime + 0.15);

      gain.gain.setValueAtTime(0.18, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.16);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.16);
    } catch (e) {}
  }

  playSuccess() {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;

      const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
      notes.forEach((freq, i) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const start = this.ctx.currentTime + (i * 0.08);

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, start);

        gain.gain.setValueAtTime(0.16, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.22);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(start);
        osc.stop(start + 0.22);
      });
    } catch (e) {}
  }
}

// ==========================================
// Application State & REST API Integration
// ==========================================
class CounterApp {
  constructor() {
    this.sound = new SoundFX();
    this.stepSize = 1;
    this.zenMode = false;
    this.theme = 'dark';
    this.backendConnected = false;

    // Default template for counter
    this.defaultCounter = {
      id: 'default',
      name: 'Primary Counter',
      value: 0,
      target: 100,
      totalClicks: 0,
      peakValue: 0,
      sessionDelta: 0,
      history: []
    };

    this.counters = [];
    this.activeCounterId = 'default';

    this.initElements();
    this.loadLocalPreferences();
    this.initEvents();
    this.initBackendOrLocal();
  }

  initElements() {
    // Header & Badges
    this.serverBadge = document.getElementById('serverStatusBadge');
    this.serverStatusText = document.getElementById('serverStatusText');

    this.themeToggleBtn = document.getElementById('themeToggleBtn');
    this.themeIconSun = document.getElementById('themeIconSun');
    this.themeIconMoon = document.getElementById('themeIconMoon');
    this.soundToggleBtn = document.getElementById('soundToggleBtn');
    this.soundIconOn = document.getElementById('soundIconOn');
    this.soundIconOff = document.getElementById('soundIconOff');
    this.zenModeBtn = document.getElementById('zenModeBtn');
    this.shortcutsBtn = document.getElementById('shortcutsBtn');

    // Tabs
    this.tabsList = document.getElementById('countersTabsList');
    this.newCounterBtn = document.getElementById('newCounterBtn');

    // Main Card
    this.counterTitleInput = document.getElementById('counterTitleInput');
    this.counterValueEl = document.getElementById('counterValue');
    this.targetStatusEl = document.getElementById('targetStatusText');
    this.progressRingBar = document.getElementById('progressRingBar');
    this.counterClickArea = document.getElementById('counterClickArea');

    // Controls
    this.undoBtn = document.getElementById('undoBtn');
    this.resetBtn = document.getElementById('resetBtn');
    this.stepButtons = document.getElementById('stepButtons');
    this.incBtn = document.getElementById('incBtn');
    this.decBtn = document.getElementById('decBtn');
    this.incQuickBtn = document.getElementById('incQuickBtn');
    this.decQuickBtn = document.getElementById('decQuickBtn');

    // Card footer triggers
    this.setSpecificValueBtn = document.getElementById('setSpecificValueBtn');
    this.setTargetBtn = document.getElementById('setTargetBtn');

    // Sidebar Stats
    this.statTotalClicks = document.getElementById('statTotalClicks');
    this.statSessionDelta = document.getElementById('statSessionDelta');
    this.statPeakValue = document.getElementById('statPeakValue');
    this.statProgressPercent = document.getElementById('statProgressPercent');
    this.activityList = document.getElementById('activityList');
    this.clearHistoryBtn = document.getElementById('clearHistoryBtn');

    // Modals
    this.customValueDialog = document.getElementById('customValueDialog');
    this.customValueInput = document.getElementById('customValueInput');
    this.saveCustomValBtn = document.getElementById('saveCustomValBtn');
    this.cancelCustomValBtn = document.getElementById('cancelCustomValBtn');

    this.targetDialog = document.getElementById('targetDialog');
    this.targetGoalInput = document.getElementById('targetGoalInput');
    this.saveTargetBtn = document.getElementById('saveTargetBtn');
    this.cancelTargetBtn = document.getElementById('cancelTargetBtn');

    this.shortcutsDialog = document.getElementById('shortcutsDialog');
    this.closeShortcutsBtn = document.getElementById('closeShortcutsBtn');
  }

  loadLocalPreferences() {
    const savedTheme = localStorage.getItem('omnicounter_theme');
    if (savedTheme) {
      this.theme = savedTheme;
    } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
      this.theme = 'light';
    }
    this.applyTheme();

    const savedSound = localStorage.getItem('omnicounter_sound');
    if (savedSound !== null) {
      this.sound.enabled = savedSound === 'true';
    }
    this.updateSoundIcon();
  }

  // Check Backend Server connection and fetch initial data
  async initBackendOrLocal() {
    this.updateServerStatus('checking', 'Connecting...');
    try {
      const res = await fetch('/api/counters', { signal: AbortSignal.timeout(2000) });
      if (res.ok) {
        const data = await res.json();
        this.backendConnected = true;
        this.counters = data.counters && data.counters.length > 0 ? data.counters : [{ ...this.defaultCounter }];
        this.activeCounterId = data.activeCounterId || this.counters[0].id;
        this.updateServerStatus('online', 'Backend Online');
        this.render();
        return;
      }
    } catch (e) {
      // Offline fallback
    }

    // Fallback: LocalStorage
    this.backendConnected = false;
    this.updateServerStatus('offline', 'Local Storage');
    this.loadFromLocalStorage();
    this.render();
  }

  updateServerStatus(status, text) {
    if (!this.serverBadge) return;
    this.serverBadge.className = `server-badge ${status}`;
    if (this.serverStatusText) {
      this.serverStatusText.textContent = text;
    }
  }

  loadFromLocalStorage() {
    const saved = localStorage.getItem('omnicounter_data');
    if (saved) {
      try {
        this.counters = JSON.parse(saved);
      } catch (e) {
        this.counters = [{ ...this.defaultCounter }];
      }
    } else {
      this.counters = [{ ...this.defaultCounter }];
    }

    const savedId = localStorage.getItem('omnicounter_active_id');
    if (savedId && this.counters.some(c => c.id === savedId)) {
      this.activeCounterId = savedId;
    } else if (this.counters.length > 0) {
      this.activeCounterId = this.counters[0].id;
    }
  }

  saveState() {
    // Always mirror to localStorage as backup
    localStorage.setItem('omnicounter_data', JSON.stringify(this.counters));
    localStorage.setItem('omnicounter_active_id', this.activeCounterId);
    localStorage.setItem('omnicounter_theme', this.theme);
    localStorage.setItem('omnicounter_sound', this.sound.enabled.toString());
  }

  getActiveCounter() {
    let current = this.counters.find(c => c.id === this.activeCounterId);
    if (!current) {
      current = this.counters[0] || { ...this.defaultCounter };
      this.activeCounterId = current.id;
    }
    return current;
  }

  applyTheme() {
    document.documentElement.setAttribute('data-theme', this.theme);
    if (this.theme === 'light') {
      this.themeIconSun.classList.add('hidden');
      this.themeIconMoon.classList.remove('hidden');
    } else {
      this.themeIconSun.classList.remove('hidden');
      this.themeIconMoon.classList.add('hidden');
    }
  }

  toggleTheme() {
    this.theme = this.theme === 'dark' ? 'light' : 'dark';
    this.applyTheme();
    this.saveState();
  }

  toggleSound() {
    this.sound.enabled = !this.sound.enabled;
    this.updateSoundIcon();
    this.saveState();
  }

  updateSoundIcon() {
    if (this.sound.enabled) {
      this.soundIconOn.classList.remove('hidden');
      this.soundIconOff.classList.add('hidden');
      this.soundToggleBtn.classList.add('active');
    } else {
      this.soundIconOn.classList.add('hidden');
      this.soundIconOff.classList.remove('hidden');
      this.soundToggleBtn.classList.remove('active');
    }
  }

  toggleZenMode() {
    this.zenMode = !this.zenMode;
    document.body.classList.toggle('zen-mode', this.zenMode);

    if (this.zenMode) {
      let exitBtn = document.getElementById('exitZenBtn');
      if (!exitBtn) {
        exitBtn = document.createElement('button');
        exitBtn.id = 'exitZenBtn';
        exitBtn.className = 'icon-btn exit-zen-btn';
        exitBtn.title = 'Exit Zen Mode (Esc / F)';
        exitBtn.innerHTML = `
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        `;
        exitBtn.onclick = () => this.toggleZenMode();
        document.body.appendChild(exitBtn);
      }
      exitBtn.classList.remove('hidden');
    } else {
      const exitBtn = document.getElementById('exitZenBtn');
      if (exitBtn) exitBtn.classList.add('hidden');
    }
  }

  // ==========================================
  // Counter Operations (Optimistic UI + API)
  // ==========================================
  async modifyCounter(delta, isAbsolute = false) {
    const counter = this.getActiveCounter();
    const prevValue = counter.value;
    const newValue = isAbsolute ? delta : counter.value + delta;

    if (newValue === prevValue && !isAbsolute) return;

    // Optimistic UI updates
    const effectiveDelta = newValue - prevValue;
    counter.totalClicks += 1;
    counter.sessionDelta += effectiveDelta;
    if (newValue > counter.peakValue) counter.peakValue = newValue;

    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    counter.history.unshift({
      delta: effectiveDelta,
      prevValue,
      value: newValue,
      time: timeStr
    });
    if (counter.history.length > 50) counter.history.pop();
    counter.value = newValue;

    // Sound and animation
    if (effectiveDelta > 0) {
      this.sound.playTap(true);
      this.triggerPulse('pulse-up');
    } else if (effectiveDelta < 0) {
      this.sound.playTap(false);
      this.triggerPulse('pulse-down');
    }

    if (counter.target && prevValue < counter.target && newValue >= counter.target) {
      this.celebrateGoal();
    }

    this.saveState();
    this.render();

    // Sync to backend if available
    if (this.backendConnected) {
      try {
        if (isAbsolute) {
          await fetch(`/api/counters/${counter.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ value: newValue })
          });
        } else {
          await fetch(`/api/counters/${counter.id}/step`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ delta: effectiveDelta })
          });
        }
      } catch (err) {
        console.warn('Failed to sync step with backend:', err);
      }
    }
  }

  async undo() {
    const counter = this.getActiveCounter();
    if (!counter.history || counter.history.length === 0) return;

    const last = counter.history.shift();
    counter.value = last.prevValue;
    counter.sessionDelta -= last.delta;

    this.sound.playTap(false);
    this.triggerPulse('pulse-down');

    this.saveState();
    this.render();

    if (this.backendConnected) {
      try {
        await fetch(`/api/counters/${counter.id}/undo`, { method: 'POST' });
      } catch (err) {
        console.warn('Failed to sync undo with backend:', err);
      }
    }
  }

  async reset() {
    const counter = this.getActiveCounter();
    if (counter.value === 0) return;

    const prevValue = counter.value;
    counter.history.unshift({
      delta: -prevValue,
      prevValue,
      value: 0,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      isReset: true
    });

    counter.value = 0;
    counter.sessionDelta = 0;

    this.sound.playReset();
    this.triggerPulse('pulse-down');

    this.saveState();
    this.render();

    if (this.backendConnected) {
      try {
        await fetch(`/api/counters/${counter.id}/step`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isReset: true })
        });
      } catch (err) {
        console.warn('Failed to sync reset with backend:', err);
      }
    }
  }

  triggerPulse(className) {
    this.counterValueEl.classList.remove('pulse-up', 'pulse-down');
    void this.counterValueEl.offsetWidth; // Force reflow
    this.counterValueEl.classList.add(className);
  }

  celebrateGoal() {
    this.sound.playSuccess();
    if (typeof confetti === 'function') {
      confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
      setTimeout(() => {
        confetti({ particleCount: 50, angle: 60, spread: 55, origin: { x: 0 } });
        confetti({ particleCount: 50, angle: 120, spread: 55, origin: { x: 1 } });
      }, 250);
    }
  }

  // ==========================================
  // Counter Management (Tabs)
  // ==========================================
  async addNewCounter() {
    const count = this.counters.length + 1;
    const name = `Counter ${count}`;

    if (this.backendConnected) {
      try {
        const res = await fetch('/api/counters', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, target: 100 })
        });
        if (res.ok) {
          const newCounter = await res.json();
          this.counters.push(newCounter);
          this.activeCounterId = newCounter.id;
          this.saveState();
          this.render();
          return;
        }
      } catch (err) {
        console.warn('Failed to add counter to backend:', err);
      }
    }

    // Local fallback
    const newCounter = {
      id: 'counter_' + Date.now(),
      name,
      value: 0,
      target: 100,
      totalClicks: 0,
      peakValue: 0,
      sessionDelta: 0,
      history: []
    };
    this.counters.push(newCounter);
    this.activeCounterId = newCounter.id;
    this.saveState();
    this.render();
  }

  async deleteCounter(id, event) {
    if (event) event.stopPropagation();
    if (this.counters.length <= 1) {
      alert("You need to keep at least one counter!");
      return;
    }

    const idx = this.counters.findIndex(c => c.id === id);
    if (idx !== -1) {
      this.counters.splice(idx, 1);
      if (this.activeCounterId === id) {
        this.activeCounterId = this.counters[Math.max(0, idx - 1)].id;
      }
      this.saveState();
      this.render();

      if (this.backendConnected) {
        try {
          await fetch(`/api/counters/${id}`, { method: 'DELETE' });
        } catch (err) {
          console.warn('Failed to delete on backend:', err);
        }
      }
    }
  }

  async selectCounter(id) {
    this.activeCounterId = id;
    this.saveState();
    this.render();

    if (this.backendConnected) {
      try {
        await fetch('/api/counters/active', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id })
        });
      } catch (err) {}
    }
  }

  async updateActiveCounterSettings(updates) {
    const counter = this.getActiveCounter();
    Object.assign(counter, updates);
    this.saveState();
    this.render();

    if (this.backendConnected) {
      try {
        await fetch(`/api/counters/${counter.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates)
        });
      } catch (err) {
        console.warn('Failed to update settings on backend:', err);
      }
    }
  }

  // ==========================================
  // Rendering
  // ==========================================
  render() {
    const counter = this.getActiveCounter();

    // 1. Title
    this.counterTitleInput.value = counter.name || 'Counter';

    // 2. Numerical Value
    this.counterValueEl.textContent = counter.value;

    // 3. Goal & Progress Ring
    const target = counter.target || 100;
    const progress = Math.min(1, Math.max(0, counter.value / target));
    const circumference = 2 * Math.PI * 126; // ~791.68
    const offset = circumference - (progress * circumference);
    this.progressRingBar.style.strokeDashoffset = offset;

    if (counter.value >= target) {
      this.progressRingBar.style.stroke = 'var(--accent-success)';
      this.targetStatusEl.textContent = `Goal Reached! (${counter.value}/${target})`;
      this.targetStatusEl.style.color = 'var(--accent-success)';
    } else {
      this.progressRingBar.style.stroke = 'var(--ring-active)';
      this.targetStatusEl.textContent = `Target: ${target}`;
      this.targetStatusEl.style.color = 'var(--text-secondary)';
    }

    // 4. Quick step button labels
    this.incQuickBtn.textContent = `+${this.stepSize * 5}`;
    this.decQuickBtn.textContent = `-${this.stepSize * 5}`;

    // 5. Undo button state
    this.undoBtn.disabled = !counter.history || counter.history.length === 0;

    // 6. Tabs rendering
    this.renderTabs();

    // 7. Stats & Activity
    this.statTotalClicks.textContent = counter.totalClicks || 0;
    this.statSessionDelta.textContent = (counter.sessionDelta > 0 ? '+' : '') + (counter.sessionDelta || 0);
    this.statPeakValue.textContent = counter.peakValue || 0;
    const pct = target > 0 ? Math.round((counter.value / target) * 100) : 0;
    this.statProgressPercent.textContent = `${pct}%`;

    this.renderActivityList(counter);
  }

  renderTabs() {
    this.tabsList.innerHTML = '';
    this.counters.forEach(c => {
      const pill = document.createElement('div');
      pill.className = `tab-pill ${c.id === this.activeCounterId ? 'active' : ''}`;
      pill.onclick = () => this.selectCounter(c.id);

      const nameSpan = document.createElement('span');
      nameSpan.textContent = c.name;

      const badge = document.createElement('span');
      badge.className = 'tab-count-badge';
      badge.textContent = c.value;

      pill.appendChild(nameSpan);
      pill.appendChild(badge);

      if (this.counters.length > 1) {
        const delBtn = document.createElement('button');
        delBtn.className = 'tab-delete-btn';
        delBtn.title = 'Delete Counter';
        delBtn.innerHTML = `
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        `;
        delBtn.onclick = (e) => this.deleteCounter(c.id, e);
        pill.appendChild(delBtn);
      }

      this.tabsList.appendChild(pill);
    });
  }

  renderActivityList(counter) {
    if (!counter.history || counter.history.length === 0) {
      this.activityList.innerHTML = '<li class="empty-state">No counts recorded yet. Tap + or - to begin!</li>';
      return;
    }

    this.activityList.innerHTML = '';
    counter.history.slice(0, 15).forEach(item => {
      const li = document.createElement('li');
      li.className = 'activity-item';

      const sign = item.delta > 0 ? `+${item.delta}` : `${item.delta}`;
      const badgeClass = item.isReset ? 'neutral' : (item.delta >= 0 ? 'plus' : 'minus');

      li.innerHTML = `
        <div class="act-info">
          <span class="act-badge ${badgeClass}">${item.isReset ? 'RESET' : sign}</span>
          <span class="act-time">${item.time}</span>
        </div>
        <span class="act-res">${item.value}</span>
      `;
      this.activityList.appendChild(li);
    });
  }

  // ==========================================
  // Event Bindings
  // ==========================================
  initEvents() {
    this.themeToggleBtn.addEventListener('click', () => this.toggleTheme());
    this.soundToggleBtn.addEventListener('click', () => this.toggleSound());
    this.zenModeBtn.addEventListener('click', () => this.toggleZenMode());
    this.shortcutsBtn.addEventListener('click', () => this.shortcutsDialog.showModal());
    this.closeShortcutsBtn.addEventListener('click', () => this.shortcutsDialog.close());

    this.newCounterBtn.addEventListener('click', () => this.addNewCounter());

    this.counterTitleInput.addEventListener('change', (e) => {
      const name = e.target.value.trim() || 'Counter';
      this.updateActiveCounterSettings({ name });
    });
    this.counterTitleInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') e.target.blur();
    });

    this.counterClickArea.addEventListener('click', () => {
      this.modifyCounter(this.stepSize);
    });

    this.incBtn.addEventListener('click', () => this.modifyCounter(this.stepSize));
    this.decBtn.addEventListener('click', () => this.modifyCounter(-this.stepSize));
    this.incQuickBtn.addEventListener('click', () => this.modifyCounter(this.stepSize * 5));
    this.decQuickBtn.addEventListener('click', () => this.modifyCounter(-(this.stepSize * 5)));

    this.undoBtn.addEventListener('click', () => this.undo());
    this.resetBtn.addEventListener('click', () => {
      if (confirm('Reset this counter to 0?')) {
        this.reset();
      }
    });

    this.stepButtons.addEventListener('click', (e) => {
      const btn = e.target.closest('.step-btn');
      if (!btn) return;
      const step = parseInt(btn.dataset.step, 10);
      if (!isNaN(step)) {
        this.stepSize = step;
        this.stepButtons.querySelectorAll('.step-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.render();
      }
    });

    this.clearHistoryBtn.addEventListener('click', async () => {
      const counter = this.getActiveCounter();
      counter.history = [];
      this.saveState();
      this.render();
      if (this.backendConnected) {
        try {
          await fetch(`/api/counters/${counter.id}/clear-history`, { method: 'POST' });
        } catch (e) {}
      }
    });

    // Custom Value Dialog
    this.setSpecificValueBtn.addEventListener('click', () => {
      const counter = this.getActiveCounter();
      this.customValueInput.value = counter.value;
      this.customValueDialog.showModal();
      this.customValueInput.select();
    });
    this.cancelCustomValBtn.addEventListener('click', () => this.customValueDialog.close());
    this.saveCustomValBtn.addEventListener('click', () => {
      const val = parseInt(this.customValueInput.value, 10);
      if (!isNaN(val)) {
        this.modifyCounter(val, true);
      }
      this.customValueDialog.close();
    });

    // Target Dialog
    this.setTargetBtn.addEventListener('click', () => {
      const counter = this.getActiveCounter();
      this.targetGoalInput.value = counter.target || 100;
      this.targetDialog.showModal();
      this.targetGoalInput.select();
    });
    this.cancelTargetBtn.addEventListener('click', () => this.targetDialog.close());
    this.saveTargetBtn.addEventListener('click', () => {
      const target = parseInt(this.targetGoalInput.value, 10);
      if (!isNaN(target) && target > 0) {
        this.updateActiveCounterSettings({ target });
      }
      this.targetDialog.close();
    });

    // Keyboard Shortcuts
    window.addEventListener('keydown', (e) => {
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;
      if (this.shortcutsDialog.open || this.customValueDialog.open || this.targetDialog.open) {
        if (e.key === 'Escape') {
          this.shortcutsDialog.close();
          this.customValueDialog.close();
          this.targetDialog.close();
        }
        return;
      }

      if (e.code === 'Space' || e.key === 'ArrowUp' || e.key === '+') {
        e.preventDefault();
        this.modifyCounter(this.stepSize);
      } else if (e.key === 'ArrowDown' || e.key === '-') {
        e.preventDefault();
        this.modifyCounter(-this.stepSize);
      } else if (e.key.toLowerCase() === 'z' || (e.ctrlKey && e.key.toLowerCase() === 'z')) {
        e.preventDefault();
        this.undo();
      } else if (e.key.toLowerCase() === 'r') {
        e.preventDefault();
        this.reset();
      } else if (e.key.toLowerCase() === 't') {
        e.preventDefault();
        this.toggleTheme();
      } else if (e.key.toLowerCase() === 'm') {
        e.preventDefault();
        this.toggleSound();
      } else if (e.key.toLowerCase() === 'f') {
        e.preventDefault();
        this.toggleZenMode();
      } else if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        e.preventDefault();
        this.shortcutsDialog.showModal();
      } else if (e.key === 'Escape' && this.zenMode) {
        this.toggleZenMode();
      }
    });
  }
}

// Start application
document.addEventListener('DOMContentLoaded', () => {
  window.counterApp = new CounterApp();
});
