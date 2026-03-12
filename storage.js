// storage.js — Firebase Firestore-backed storage with in-memory cache

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyDFjndIlH0BY-b3Z_4Fg649PcKEHkHEbOw",
  authDomain: "apptarefas-3063e.firebaseapp.com",
  projectId: "apptarefas-3063e",
  storageBucket: "apptarefas-3063e.firebasestorage.app",
  messagingSenderId: "1024620915770",
  appId: "1:1024620915770:web:135349692122f8db8e9903",
  measurementId: "G-Y52KLCDEGJ"
};

const Storage = {
  // In-memory cache — keeps all reads synchronous
  _cache: {
    tasks: [], archive: [], leisures: [],
    dailyPoints: 0, wallet: 0, lastReset: null, dismissedAlerts: {}
  },
  _docRef: null,
  _ready: false,
  _lastSaveAt: 0,

  async init() {
    // Initialize Firebase
    firebase.initializeApp(FIREBASE_CONFIG);
    const db = firebase.firestore();
    this._docRef = db.collection('appdata').doc('main');

    // Load initial data from Firestore
    try {
      const snap = await this._docRef.get();
      if (snap.exists) {
        Object.assign(this._cache, snap.data());
      }
    } catch (e) {
      console.warn('[Storage] Firestore load failed, using local fallback:', e);
      // Fallback: try localStorage backup
      try {
        const local = localStorage.getItem('appdata_backup');
        if (local) Object.assign(this._cache, JSON.parse(local));
      } catch (_) { }
    }

    this._ready = true;

    // Real-time listener — syncs updates from other devices
    this._docRef.onSnapshot(snap => {
      if (!snap.exists || !this._ready) return;
      // Skip our own recent writes (within 2 seconds) to avoid re-render flicker
      if ((Date.now() - this._lastSaveAt) < 2000) return;
      Object.assign(this._cache, snap.data());
      // Re-render everything with fresh data
      if (typeof Tasks !== 'undefined') Tasks.renderAll();
      if (typeof App !== 'undefined') {
        App.updatePointsDisplay();
        App.renderArchive();
      }
      if (typeof Leisure !== 'undefined') Leisure.render();
    });
  },

  _save() {
    this._lastSaveAt = Date.now();
    // Backup to localStorage in case of offline
    try { localStorage.setItem('appdata_backup', JSON.stringify(this._cache)); } catch (_) { }
    // Persist to Firestore
    if (this._docRef) {
      this._docRef.set(this._cache)
        .catch(e => console.error('[Storage] Firestore write error:', e));
    }
  },

  // Deep clone helpers to avoid cache mutation bugs
  _cloneArr(key) { return JSON.parse(JSON.stringify(this._cache[key] || [])); },
  _cloneObj(key) { return JSON.parse(JSON.stringify(this._cache[key] || {})); },

  getTasks() { return this._cloneArr('tasks'); },
  saveTasks(v) { this._cache.tasks = v; this._save(); },

  getArchive() { return this._cloneArr('archive'); },
  saveArchive(v) { this._cache.archive = v; this._save(); },

  getDailyPoints() { return this._cache.dailyPoints || 0; },
  saveDailyPoints(v) { this._cache.dailyPoints = v; this._save(); },

  getWallet() { return this._cache.wallet || 0; },
  saveWallet(v) { this._cache.wallet = v; this._save(); },

  getLeisures() { return this._cloneArr('leisures'); },
  saveLeisures(v) { this._cache.leisures = v; this._save(); },

  getLastReset() { return this._cache.lastReset || null; },
  saveLastReset(v) { this._cache.lastReset = v; this._save(); },

  getDismissedAlerts() { return this._cloneObj('dismissedAlerts'); },
  saveDismissedAlerts(v) { this._cache.dismissedAlerts = v; this._save(); },
};
