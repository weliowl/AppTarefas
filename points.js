// points.js — Daily points, wallet, midnight reset, leisure spending

const Points = {
    getDailyPoints() { return Storage.getDailyPoints(); },
    getWallet() { return Storage.getWallet(); },

    addDaily(amount) {
        const current = Storage.getDailyPoints();
        Storage.saveDailyPoints(current + amount);
        App.updatePointsDisplay();
    },

    spendWallet(amount) {
        const wallet = Storage.getWallet();
        if (wallet < amount) return false;
        Storage.saveWallet(wallet - amount);
        App.updatePointsDisplay();
        return true;
    },

    // Called on load and every minute: checks if we crossed midnight
    checkMidnightReset() {
        const now = new Date();
        const lastReset = Storage.getLastReset();
        const today = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;

        if (lastReset !== today) {
            const daily = Storage.getDailyPoints();
            const wallet = Storage.getWallet();
            Storage.saveWallet(wallet + daily);
            Storage.saveDailyPoints(0);
            Storage.saveLastReset(today);
            App.updatePointsDisplay();
            if (lastReset !== null) {
                App.showToast(`🌙 Meia-noite! +${daily} pts adicionados à carteira.`, 'success');
            }
        }
    },
};
