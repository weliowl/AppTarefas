// tasks.js — Task CRUD, rendering, drag-and-drop, completion

const RANKS = ['S', 'A', 'B', 'C', 'D', 'Sec'];
const RANK_LABELS = { S: 'Rank S', A: 'Rank A', B: 'Rank B', C: 'Rank C', D: 'Rank D', Sec: 'Secundárias' };

const Tasks = {
    dragSrcId: null,

    create({ title, desc, deadline, points, rank }) {
        const durationMs = Timer.parseDuration(deadline);
        if (!durationMs) {
            App.showToast('❌ Prazo inválido! Ex: "2 dias", "8 hrs", "30 min"', 'error');
            return false;
        }
        const task = {
            id: Date.now().toString(),
            title,
            desc,
            deadline,
            durationMs,
            createdAt: Date.now(),
            points: parseInt(points) || 10,
            rank,
            alertsDismissed: [],
        };
        const tasks = Storage.getTasks();
        tasks.push(task);
        Storage.saveTasks(tasks);
        this.renderAll();
        return true;
    },

    delete(id) {
        const tasks = Storage.getTasks().filter(t => t.id !== id);
        Storage.saveTasks(tasks);
        this.renderAll();
    },

    complete(id) {
        const tasks = Storage.getTasks();
        const idx = tasks.findIndex(t => t.id === id);
        if (idx === -1) return;
        const task = tasks[idx];
        const finalPoints = Timer.calcFinalPoints(task);
        Points.addDaily(finalPoints);

        const archive = Storage.getArchive();
        archive.unshift({
            ...task,
            completedAt: Date.now(),
            finalPoints,
            delayed: finalPoints < task.points
        });
        Storage.saveArchive(archive);

        tasks.splice(idx, 1);
        Storage.saveTasks(tasks);
        App.renderArchive();
        this.renderAll();

        const msg = finalPoints < task.points
            ? `✅ "${task.title}" concluída com atraso! ${finalPoints} pts (era ${task.points})`
            : `✅ "${task.title}" concluída! +${finalPoints} pts`;
        App.showToast(msg, finalPoints >= 0 ? 'success' : 'warning');
    },

    moveRank(id, newRank) {
        const tasks = Storage.getTasks();
        const task = tasks.find(t => t.id === id);
        if (task) { task.rank = newRank; Storage.saveTasks(tasks); this.renderAll(); }
    },

    renderAll() {
        RANKS.forEach(rank => this.renderColumn(rank));
        App.renderAlerts();
    },

    renderColumn(rank) {
        const col = document.getElementById(`col-${rank}`);
        if (!col) return;
        const tasks = Storage.getTasks().filter(t => t.rank === rank);
        col.innerHTML = '';

        if (tasks.length === 0) {
            col.innerHTML = '<p class="empty-col">Nenhuma tarefa</p>';
        }

        tasks.forEach(task => {
            const card = this.buildCard(task);
            col.appendChild(card);
        });
    },

    buildCard(task) {
        const card = document.createElement('div');
        card.className = 'task-card';
        card.dataset.id = task.id;
        card.draggable = true;

        const { remaining, percentLeft, overdue, overdueMs } = Timer.getStatus(task);
        const timerClass = overdue ? 'overdue' : percentLeft <= 10 ? 'critical' : percentLeft <= 25 ? 'warning' : 'normal';

        card.innerHTML = `
      <div class="card-header">
        <span class="card-title">${task.title}</span>
        <div class="card-actions">
          <button class="btn-complete" onclick="Tasks.complete('${task.id}')" title="Concluir">✔</button>
          <button class="btn-delete" onclick="Tasks.delete('${task.id}')" title="Excluir">✕</button>
        </div>
      </div>
      ${task.desc ? `<p class="card-desc">${task.desc}</p>` : ''}
      <div class="card-footer">
        <div class="timer-wrap">
          <span class="timer-label ${timerClass}" id="timer-${task.id}">
            ${overdue ? '⚠ +' + Timer.formatMs(overdueMs) : Timer.formatMs(remaining)}
          </span>
          <div class="timer-bar-bg">
            <div class="timer-bar ${timerClass}" style="width:${Math.min(100, percentLeft)}%"></div>
          </div>
        </div>
        <span class="card-points">${task.points} pts</span>
      </div>
      <div class="card-move">
        ${RANKS.filter(r => r !== task.rank).map(r =>
            `<button class="btn-move" onclick="Tasks.moveRank('${task.id}','${r}')">${RANK_LABELS[r]}</button>`
        ).join('')}
      </div>
    `;

        // Drag events
        card.addEventListener('dragstart', e => {
            this.dragSrcId = task.id;
            card.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
        });
        card.addEventListener('dragend', () => card.classList.remove('dragging'));

        return card;
    },

    setupDropZones() {
        RANKS.forEach(rank => {
            const zone = document.getElementById(`col-${rank}`);
            if (!zone) return;
            zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('drag-over'); });
            zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
            zone.addEventListener('drop', e => {
                e.preventDefault();
                zone.classList.remove('drag-over');
                if (this.dragSrcId) {
                    this.moveRank(this.dragSrcId, rank);
                    this.dragSrcId = null;
                }
            });
        });
    },
};
