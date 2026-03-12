// timer.js — Deadline parsing, countdown, alert triggers

const Timer = {
    // Parse human-readable deadline string → milliseconds
    parseDuration(str) {
        str = str.trim().toLowerCase();
        const num = parseFloat(str);
        if (isNaN(num)) return null;

        if (/semana/.test(str)) return num * 7 * 24 * 3600 * 1000;
        if (/dia/.test(str)) return num * 24 * 3600 * 1000;
        if (/hr|hora/.test(str)) return num * 3600 * 1000;
        if (/min/.test(str)) return num * 60 * 1000;
        if (/seg|s$/.test(str)) return num * 1000;
        return null;
    },

    // Returns { remaining, total, percentLeft, overdue, overdueMs }
    getStatus(task) {
        const now = Date.now();
        const deadline = task.createdAt + task.durationMs;
        const remaining = deadline - now;
        const total = task.durationMs;
        const percentLeft = Math.max(0, (remaining / total) * 100);
        const overdue = remaining < 0;
        const overdueMs = overdue ? Math.abs(remaining) : 0;
        return { remaining, total, percentLeft, overdue, overdueMs };
    },

    // Format ms to readable string
    formatMs(ms) {
        if (ms <= 0) return '00:00:00';
        const totalSec = Math.floor(Math.abs(ms) / 1000);
        const d = Math.floor(totalSec / 86400);
        const h = Math.floor((totalSec % 86400) / 3600);
        const m = Math.floor((totalSec % 3600) / 60);
        const s = totalSec % 60;
        if (d > 0) return `${d}d ${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    },

    // Check which alert thresholds have been crossed (25, 10, 5)
    getAlertThresholds(task) {
        const { percentLeft, overdue } = this.getStatus(task);
        const thresholds = [];
        if (!overdue) {
            if (percentLeft <= 25) thresholds.push(25);
            if (percentLeft <= 10) thresholds.push(10);
            if (percentLeft <= 5) thresholds.push(5);
        }
        return thresholds;
    },

    // Calculate final points on completion
    calcFinalPoints(task) {
        const { overdue, overdueMs, total } = this.getStatus(task);
        if (!overdue) return task.points;
        const overduePercent = (overdueMs / total) * 100;
        const deductionBlocks = Math.floor(overduePercent / 10);
        const deduction = deductionBlocks * 0.1 * task.points;
        return Math.round(task.points - deduction);
    },
};
