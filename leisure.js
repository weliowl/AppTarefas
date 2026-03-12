// leisure.js — Create and manage leisure activities

const Leisure = {
    render() {
        const list = document.getElementById('leisure-list');
        const leisures = Storage.getLeisures();
        const wallet = Storage.getWallet();
        list.innerHTML = '';

        if (leisures.length === 0) {
            list.innerHTML = '<p class="empty-msg">Nenhum lazer criado ainda.</p>';
            return;
        }

        leisures.forEach((item, idx) => {
            const div = document.createElement('div');
            div.className = 'leisure-card';
            const canAfford = wallet >= item.cost;
            div.innerHTML = `
        <div class="leisure-info">
          <span class="leisure-name">${item.name}</span>
          <span class="leisure-cost">${item.cost} pts</span>
        </div>
        <div class="leisure-actions">
          <button class="btn-use ${canAfford ? '' : 'disabled'}" onclick="Leisure.use(${idx})" ${canAfford ? '' : 'disabled'}>
            Usar
          </button>
          <button class="btn-delete-small" onclick="Leisure.delete(${idx})">✕</button>
        </div>
      `;
            list.appendChild(div);
        });
    },

    use(idx) {
        const leisures = Storage.getLeisures();
        const item = leisures[idx];
        if (!item) return;
        if (!Points.spendWallet(item.cost)) {
            App.showToast(`❌ Pontos insuficientes! Necessário: ${item.cost} pts`, 'error');
            return;
        }
        App.showToast(`🎉 Aproveite: ${item.name}!`, 'success');
        this.render();
    },

    delete(idx) {
        const leisures = Storage.getLeisures();
        leisures.splice(idx, 1);
        Storage.saveLeisures(leisures);
        this.render();
    },

    create(name, cost) {
        const leisures = Storage.getLeisures();
        leisures.push({ name, cost: parseInt(cost) });
        Storage.saveLeisures(leisures);
        this.render();
    },
};
