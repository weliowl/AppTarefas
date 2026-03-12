// app.js — Main entry point, init, UI glue

const App = {
    currentView: 'tasks',

    async init() {
        // Show loading state while Firebase loads
        document.body.style.opacity = '0.4';
        document.body.style.pointerEvents = 'none';
        try {
            await Storage.init();
        } catch (e) {
            console.error('[App] Storage init failed:', e);
        }
        document.body.style.opacity = '';
        document.body.style.pointerEvents = '';

        Points.checkMidnightReset();
        Tasks.renderAll();
        Tasks.setupDropZones();
        Leisure.render();
        this.renderArchive();
        this.updatePointsDisplay();
        this.bindEvents();
        this.startTimerLoop();

        // Check midnight every minute
        setInterval(() => Points.checkMidnightReset(), 60000);
    },

    bindEvents() {
        // Tab navigation
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                this.switchView(tab.dataset.view);
            });
        });

        // Task create form
        document.getElementById('task-form').addEventListener('submit', e => {
            e.preventDefault();
            const title = document.getElementById('t-title').value.trim();
            const desc = document.getElementById('t-desc').value.trim();
            const deadline = document.getElementById('t-deadline').value.trim();
            const points = document.getElementById('t-points').value;
            const rank = document.getElementById('t-rank').value;
            if (!title || !deadline) return;
            if (Tasks.create({ title, desc, deadline, points, rank })) {
                this.closeModal('task-modal');
                e.target.reset();
            }
        });

        // Leisure create form
        document.getElementById('leisure-form').addEventListener('submit', e => {
            e.preventDefault();
            const name = document.getElementById('l-name').value.trim();
            const cost = document.getElementById('l-cost').value;
            if (!name || !cost) return;
            Leisure.create(name, cost);
            e.target.reset();
        });

        // Add task buttons per column
        document.querySelectorAll('.btn-add-task').forEach(btn => {
            btn.addEventListener('click', () => {
                const rank = btn.dataset.rank;
                document.getElementById('t-rank').value = rank;
                this.openModal('task-modal');
            });
        });

        // Modal close on backdrop
        document.querySelectorAll('.modal-backdrop').forEach(m => {
            m.addEventListener('click', e => {
                if (e.target === m) this.closeModal(m.id);
            });
        });
    },

    switchView(view) {
        this.currentView = view;
        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
        document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
        document.getElementById(`view-${view}`)?.classList.add('active');
        document.querySelector(`.nav-tab[data-view="${view}"]`)?.classList.add('active');
    },

    openModal(id) { document.getElementById(id)?.classList.add('open'); },
    closeModal(id) { document.getElementById(id)?.classList.remove('open'); },

    updatePointsDisplay() {
        const daily = Storage.getDailyPoints();
        const wallet = Storage.getWallet();
        document.getElementById('daily-pts').textContent = daily;
        document.getElementById('wallet-pts').textContent = wallet;
        // Re-render leisure to update "can afford" state
        Leisure.render();
    },

    renderArchive() {
        const list = document.getElementById('archive-list');
        const archive = Storage.getArchive();
        if (!list) return;
        list.innerHTML = '';
        if (archive.length === 0) {
            list.innerHTML = '<p class="empty-msg">Nenhuma tarefa arquivada ainda.</p>';
            return;
        }
        archive.forEach(task => {
            const d = new Date(task.completedAt).toLocaleString('pt-BR');
            const div = document.createElement('div');
            div.className = `archive-card ${task.delayed ? 'delayed' : 'ontime'}`;
            div.innerHTML = `
        <div class="archive-header">
          <span class="archive-rank rank-${task.rank}">${RANK_LABELS[task.rank]}</span>
          <span class="archive-title">${task.title}</span>
          <span class="archive-pts ${task.finalPoints < 0 ? 'negative' : ''}">${task.finalPoints > 0 ? '+' : ''}${task.finalPoints} pts</span>
        </div>
        ${task.desc ? `<p class="archive-desc">${task.desc}</p>` : ''}
        <span class="archive-date">Concluída em ${d} ${task.delayed ? '⚠ Com atraso' : '✔ No prazo'}</span>
      `;
            list.appendChild(div);
        });
    },

    renderAlerts() {
        const container = document.getElementById('alerts-container');
        if (!container) return;
        const tasks = Storage.getTasks();
        const dismissed = Storage.getDismissedAlerts();

        tasks.forEach(task => {
            const thresholds = Timer.getAlertThresholds(task);
            thresholds.forEach(pct => {
                const key = `${task.id}-${pct}`;
                if (dismissed[key]) return;
                if (document.getElementById(`alert-${key}`)) return;

                const alert = document.createElement('div');
                alert.className = `alert-banner alert-${pct <= 5 ? 'critical' : pct <= 10 ? 'danger' : 'warning'}`;
                alert.id = `alert-${key}`;
                alert.innerHTML = `
          <span>⏰ <strong>"${task.title}"</strong> — restam apenas ${pct <= 5 ? '❗❗' : pct <= 10 ? '❗' : ''} ${pct}% do prazo!</span>
          <button onclick="App.dismissAlert('${key}')">✕</button>
        `;
                container.prepend(alert);
            });
        });
    },

    dismissAlert(key) {
        const dismissed = Storage.getDismissedAlerts();
        dismissed[key] = true;
        Storage.saveDismissedAlerts(dismissed);
        document.getElementById(`alert-${key}`)?.remove();
    },

    showToast(msg, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = msg;
        document.getElementById('toast-container').appendChild(toast);
        setTimeout(() => toast.classList.add('show'), 10);
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 400);
        }, 3500);
    },

    startTimerLoop() {
        setInterval(() => {
            const tasks = Storage.getTasks();
            tasks.forEach(task => {
                const el = document.getElementById(`timer-${task.id}`);
                if (!el) return;
                const { remaining, percentLeft, overdue, overdueMs } = Timer.getStatus(task);
                const timerClass = overdue ? 'overdue' : percentLeft <= 10 ? 'critical' : percentLeft <= 25 ? 'warning' : 'normal';
                el.textContent = overdue ? '⚠ +' + Timer.formatMs(overdueMs) : Timer.formatMs(remaining);
                el.className = `timer-label ${timerClass}`;
                const bar = el.parentElement.querySelector('.timer-bar');
                if (bar) {
                    bar.style.width = Math.min(100, percentLeft) + '%';
                    bar.className = `timer-bar ${timerClass}`;
                }
            });
            this.renderAlerts();
        }, 1000);
    },
};

document.addEventListener('DOMContentLoaded', () => App.init().catch(console.error));
