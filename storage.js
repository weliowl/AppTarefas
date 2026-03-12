// storage.js — Firebase Firestore + Google Auth

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
  _cache: {
    tasks: [], archive: [], leisures: [],
    dailyPoints: 0, wallet: 0, lastReset: null, dismissedAlerts: {}
  },
  _docRef: null,
  _auth: null,
  _user: null,
  _ready: false,
  _lastSaveAt: 0,

  // Returns true if signed in, false if sign-in required
  async init() {
    if (!firebase.apps.length) firebase.initializeApp(FIREBASE_CONFIG);
    this._auth = firebase.auth();
    const db = firebase.firestore();

    // Wait for Firebase to determine auth state
    const user = await new Promise(resolve => {
      const unsub = this._auth.onAuthStateChanged(u => { unsub(); resolve(u); });
    });

    if (!user) return false; // App should show sign-in screen

    this._user = user;
    // Each user gets their own private data path
    this._docRef = db.collection('users').doc(user.uid).collection('appdata').doc('main');

    // Load user's data
    try {
      const snap = await this._docRef.get();
      if (snap.exists) Object.assign(this._cache, snap.data());
    } catch (e) {
      console.warn('[Storage] Load failed, using local fallback:', e);
      try {
        const local = localStorage.getItem('appdata_backup');
        if (local) Object.assign(this._cache, JSON.parse(local));
      } catch (_) { }
    }

    this._ready = true;

    // Real-time listener — syncs changes from other devices
    this._docRef.onSnapshot(snap => {
      if (!snap.exists || !this._ready) return;
      if ((Date.now() - this._lastSaveAt) < 2000) return;
      Object.assign(this._cache, snap.data());
      if (typeof Tasks !== 'undefined') Tasks.renderAll();
      if (typeof App !== 'undefined') { App.updatePointsDisplay(); App.renderArchive(); }
      if (typeof Leisure !== 'undefined') Leisure.render();
    });

    return true;
  },

  async signInWithGoogle() {
    if (!this._auth) {
      if (!firebase.apps.length) firebase.initializeApp(FIREBASE_CONFIG);
      this._auth = firebase.auth();
    }
    const provider = new firebase.auth.GoogleAuthProvider();
    await this._auth.signInWithPopup(provider);
    window.location.reload();
  },

  async signOut() {
    await this._auth.signOut();
    window.location.reload();
  },

  getUser() { return this._user; },

  _save() {
    this._lastSaveAt = Date.now();
    try { localStorage.setItem('appdata_backup', JSON.stringify(this._cache)); } catch (_) { }
    if (this._docRef) {
      this._docRef.set(this._cache)
        .catch(e => console.error('[Storage] Write error:', e));
    }
  },

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
