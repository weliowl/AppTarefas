// storage.js — LocalStorage abstraction

const Storage = {
  get(key, fallback = null) {
    try {
      const val = localStorage.getItem(key);
      return val !== null ? JSON.parse(val) : fallback;
    } catch { return fallback; }
  },
  set(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  },

  getTasks()        { return this.get('tasks', []); },
  saveTasks(v)      { this.set('tasks', v); },

  getArchive()      { return this.get('archive', []); },
  saveArchive(v)    { this.set('archive', v); },

  getDailyPoints()  { return this.get('dailyPoints', 0); },
  saveDailyPoints(v){ this.set('dailyPoints', v); },

  getWallet()       { return this.get('wallet', 0); },
  saveWallet(v)     { this.set('wallet', v); },

  getLeisures()     { return this.get('leisures', []); },
  saveLeisures(v)   { this.set('leisures', v); },

  getLastReset()    { return this.get('lastReset', null); },
  saveLastReset(v)  { this.set('lastReset', v); },

  getDismissedAlerts() { return this.get('dismissedAlerts', {}); },
  saveDismissedAlerts(v){ this.set('dismissedAlerts', v); },
};
