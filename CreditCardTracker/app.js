// === State ===
let cards = [];
let expenses = [];
let ui = { selectedCard: null, selectedCycle: '', expenseDate: today(), expenseNote: '', expenseAmount: '', expandedId: null, editingCard: null, confirmDeleteCard: null, confirmDeleteExpense: null, selectedSummaryCycle: '' };

function today() { return new Date().toISOString().slice(0, 10); }
function genId() { return crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substr(2, 12); }
function esc(s) { return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }

// === Storage ===
function saveCards() { localStorage.setItem('credit_cards', JSON.stringify(cards)); }
function saveExpenses() { localStorage.setItem('credit_card_expenses', JSON.stringify(expenses)); }
function loadAll() {
    try { cards = JSON.parse(localStorage.getItem('credit_cards')) || []; } catch { cards = []; }
    try { expenses = JSON.parse(localStorage.getItem('credit_card_expenses')) || []; } catch { expenses = []; }
}

// === Helpers ===
function getBillingCycles() {
    const now = new Date();
    const cycles = [];
    for (let i = 1; i >= -2; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
        cycles.push(`${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}`);
    }
    return cycles;
}

function getCardName(cardId) { return cards.find(c => c.id === cardId)?.name || 'ไม่ทราบ'; }
function getExpensesByCycle(cycle) { return expenses.filter(e => e.billingCycle === cycle).sort((a, b) => b.date.localeCompare(a.date)); }
function getTotalByCycle(cycle) { return getExpensesByCycle(cycle).reduce((s, e) => s + e.amount, 0); }
function getTotalsByCard(cycle) {
    const map = {};
    getExpensesByCycle(cycle).forEach(e => { map[e.cardId] = (map[e.cardId] || 0) + e.amount; });
    return map;
}

// === Toast ===
let toastTimer;
function showToast(msg, type = 'success') {
    let el = document.getElementById('toast');
    if (!el) { el = document.createElement('div'); el.id = 'toast'; document.body.prepend(el); }
    el.className = `alert alert-${type}`;
    el.textContent = msg;
    el.classList.remove('hidden');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.add('hidden'), 2000);
}

// === Router ===
function route() {
    const hash = window.location.hash || '#add';
    document.querySelectorAll('.bottom-nav a').forEach(a => a.classList.remove('active'));
    const nav = document.getElementById('nav-' + hash.slice(1));
    if (nav) nav.classList.add('active');

    if (hash === '#add') renderAdd();
    else if (hash === '#expenses') renderExpenses();
    else if (hash === '#summary') renderSummary();
    else if (hash === '#cards') renderCards();
    else renderAdd();
}
function render() { route(); }

// === Page: Add Expense ===
function renderAdd() {
    const cycles = getBillingCycles();
    if (!ui.selectedCycle) ui.selectedCycle = cycles[1] || cycles[0] || '';

    let html = `<h4 class="text-center mb-3">บันทึกรายการ</h4>`;

    const activeCards = cards.filter(c => c.active !== false);
    if (!activeCards.length) {
        html += `<div class="text-center mt-3"><p class="text-muted">ยังไม่มีบัตรที่ Active กรุณาเพิ่มหรือเปิดบัตรก่อน</p>
            <a href="#cards" class="btn btn-primary">💳 จัดการบัตร</a></div>`;
    } else {
        // Card select (only active)
        html += `<div class="mb-3"><span class="form-label">ชื่อบัตร</span><div class="chip-group">`;
        activeCards.forEach(c => {
            html += `<button class="chip ${ui.selectedCard === c.id ? 'chip-active' : ''}" onclick="ui.selectedCard='${c.id}';render()">${esc(c.name)}</button>`;
        });
        html += `</div></div>`;

        // Amount
        html += `<div class="mb-3"><span class="form-label">จำนวนเงิน (บาท)</span>
            <input id="amountInput" type="text" inputmode="decimal" placeholder="0.00" value="${ui.expenseAmount}" onfocus="this.select()" oninput="ui.expenseAmount=this.value"></div>`;

        // Billing cycle
        html += `<div class="mb-3"><span class="form-label">รอบบิล</span><div class="chip-group">`;
        cycles.forEach(c => {
            html += `<button class="chip ${ui.selectedCycle === c ? 'chip-active' : ''}" onclick="ui.selectedCycle='${c}';render()">${c}</button>`;
        });
        html += `</div></div>`;

        // Date
        html += `<div class="mb-3"><span class="form-label">วันที่</span>
            <input type="date" value="${ui.expenseDate}" onchange="ui.expenseDate=this.value"></div>`;

        // Note
        html += `<div class="mb-3"><span class="form-label">หมายเหตุ</span>
            <input type="text" placeholder="ไม่บังคับ" value="${esc(ui.expenseNote)}" oninput="ui.expenseNote=this.value"></div>`;

        // Save button
        html += `<button class="btn btn-primary" style="width:100%" onclick="saveExpense()">💾 บันทึก</button>`;
    }

    document.getElementById('app').innerHTML = html;
}

// === Page: Expenses ===
function renderExpenses() {
    const cycles = getBillingCycles();
    if (!ui.selectedCycle) ui.selectedCycle = cycles[1] || cycles[0] || '';
    const list = getExpensesByCycle(ui.selectedCycle);

    let html = `<h4 class="text-center mb-3">รายการใช้จ่าย</h4>`;

    // Cycle picker
    html += `<div class="mb-3"><span class="form-label">เลือกรอบบิล</span><div class="chip-group">`;
    cycles.forEach(c => {
        html += `<button class="chip ${ui.selectedCycle === c ? 'chip-active' : ''}" onclick="ui.selectedCycle='${c}';ui.expandedId=null;render()">${c}</button>`;
    });
    html += `</div></div>`;

    if (!list.length) {
        html += `<p class="text-center text-muted">ไม่มีรายการในรอบนี้</p>`;
    } else {
        list.forEach(ex => {
            const expanded = ui.expandedId === ex.id;
            html += `<div class="card mb-2 expense-item ${ex.reserved ? 'expense-reserved' : ''}" onclick="toggleExpand('${ex.id}')">
                <div class="flex items-center" style="justify-content:space-between">
                    <div>
                        ${ex.reserved ? '<span class="reserved-badge">✅</span>' : ''}
                        <small class="text-muted">${ex.date.slice(8,10)}/${ex.date.slice(5,7)}</small>
                        <strong style="margin-left:8px">${esc(getCardName(ex.cardId))}</strong>
                        ${ex.note ? `<small class="text-muted" style="margin-left:6px">${esc(ex.note)}</small>` : ''}
                    </div>
                    <div class="flex items-center gap-1">
                        <strong>${ex.amount.toLocaleString(undefined,{minimumFractionDigits:2})} ฿</strong>
                        <small>${expanded ? '▲' : '▼'}</small>
                    </div>
                </div>`;
            if (expanded) {
                html += `<div class="mt-2" onclick="event.stopPropagation()">
                    <div class="mb-2"><span class="form-label">บัตร</span><div class="chip-group">`;
                cards.forEach(c => {
                    html += `<button class="chip ${ex.cardId === c.id ? 'chip-active' : ''}" onclick="editExpenseField('${ex.id}','cardId','${c.id}')">${esc(c.name)}</button>`;
                });
                html += `</div></div>
                    <div class="mb-2"><span class="form-label">จำนวนเงิน</span>
                        <input type="text" inputmode="decimal" value="${ex.amount}" onfocus="this.select()" onchange="editExpenseField('${ex.id}','amount',this.value)"></div>
                    <div class="mb-2"><span class="form-label">วันที่</span>
                        <input type="date" value="${ex.date}" onchange="editExpenseField('${ex.id}','date',this.value)"></div>
                    <div class="mb-2"><span class="form-label">หมายเหตุ</span>
                        <input type="text" value="${esc(ex.note)}" onchange="editExpenseField('${ex.id}','note',this.value)"></div>
                    <div class="flex gap-2">`;
                if (ui.confirmDeleteExpense === ex.id) {
                    html += `<button class="btn btn-danger btn-sm" onclick="doDeleteExpense('${ex.id}')">ยืนยันลบ</button>
                        <button class="btn btn-outline btn-sm" onclick="ui.confirmDeleteExpense=null;render()">ยกเลิก</button>`;
                } else {
                    html += `<button class="btn btn-outline-danger btn-sm" onclick="ui.confirmDeleteExpense='${ex.id}';render()">🗑️ ลบ</button>`;
                }
                html += `</div>
                    <button class="btn btn-sm ${ex.reserved ? 'btn-reserved-active' : 'btn-reserved'}" onclick="toggleReserved('${ex.id}')">${ex.reserved ? '✅ สำรองแล้ว' : '💰 สำรองเงิน'}</button>
                </div>`;
            }
            html += `</div>`;
        });
    }
    document.getElementById('app').innerHTML = html;
}

// === Page: Summary ===
function renderSummary() {
    const cycles = getBillingCycles();
    if (!ui.selectedSummaryCycle) ui.selectedSummaryCycle = cycles[1] || cycles[0] || '';
    const total = getTotalByCycle(ui.selectedSummaryCycle);
    const byCard = getTotalsByCard(ui.selectedSummaryCycle);

    let html = `<h4 class="text-center mb-3">สรุปรายเดือน</h4>`;

    // Cycle picker
    html += `<div class="mb-3"><span class="form-label">เลือกรอบบิล</span><div class="chip-group">`;
    cycles.forEach(c => {
        html += `<button class="chip ${ui.selectedSummaryCycle === c ? 'chip-active' : ''}" onclick="ui.selectedSummaryCycle='${c}';render()">${c}</button>`;
    });
    html += `</div></div>`;

    // Total + reserved breakdown
    const cycleExpenses = getExpensesByCycle(ui.selectedSummaryCycle);
    const reservedTotal = cycleExpenses.filter(e => e.reserved).reduce((s, e) => s + e.amount, 0);
    const unreservedTotal = total - reservedTotal;

    html += `<div class="card mb-3 text-center">
        <small class="text-muted">ยอดรวมทุกบัตร</small>
        <h4 style="margin-top:4px">${total.toLocaleString(undefined,{minimumFractionDigits:2})} บาท</h4>
        <div class="flex" style="justify-content:center;gap:16px;margin-top:8px">
            <small class="reserved-summary">✅ สำรองแล้ว ${reservedTotal.toLocaleString(undefined,{minimumFractionDigits:2})}</small>
            <small class="unreserved-summary">⏳ ยังไม่สำรอง ${unreservedTotal.toLocaleString(undefined,{minimumFractionDigits:2})}</small>
        </div>
    </div>`;

    // By card
    const entries = Object.entries(byCard).sort((a, b) => b[1] - a[1]);
    if (entries.length) {
        entries.forEach(([cardId, amt]) => {
            const pct = total > 0 ? (amt / total * 100) : 0;
            html += `<div class="card mb-2">
                <div class="flex items-center" style="justify-content:space-between">
                    <span>💳 ${esc(getCardName(cardId))}</span>
                    <strong>${amt.toLocaleString(undefined,{minimumFractionDigits:2})} ฿</strong>
                </div>
                <div class="bar-bg"><div class="bar-fill" style="width:${pct}%"></div></div>
            </div>`;
        });
    } else {
        html += `<p class="text-center text-muted">ไม่มีรายการในรอบนี้</p>`;
    }
    document.getElementById('app').innerHTML = html;
}

// === Page: Cards ===
function renderCards() {
    let html = `<h4 class="text-center mb-3">จัดการบัตร</h4>`;

    // Add card
    html += `<div class="input-group mb-3">
        <input id="newCardInput" placeholder="ชื่อบัตร เช่น KBank, SCB" onkeydown="if(event.key==='Enter')addCard()">
        <button class="btn btn-primary" onclick="addCard()">เพิ่ม</button>
    </div>`;

    if (!cards.length) {
        html += `<p class="text-center text-muted">ยังไม่มีบัตร</p>`;
    } else {
        cards.forEach((c, idx) => {
            const isActive = c.active !== false;
            html += `<div class="card mb-2 ${!isActive ? 'card-inactive' : ''}">`;
            if (ui.editingCard === c.id) {
                html += `<div class="input-group">
                    <input id="editCardInput" value="${esc(c.name)}" onkeydown="if(event.key==='Enter')saveEditCard('${c.id}');if(event.key==='Escape'){ui.editingCard=null;render();}">
                    <button class="btn btn-primary" onclick="saveEditCard('${c.id}')">✓</button>
                </div>`;
            } else {
                html += `<div class="flex items-center" style="justify-content:space-between">
                    <div class="flex items-center gap-1">
                        <div class="flex" style="flex-direction:column;gap:2px">
                            ${idx > 0 ? `<button class="btn btn-sm btn-outline" style="padding:2px 6px;font-size:0.7rem" onclick="moveCard(${idx},-1)">▲</button>` : ''}
                            ${idx < cards.length - 1 ? `<button class="btn btn-sm btn-outline" style="padding:2px 6px;font-size:0.7rem" onclick="moveCard(${idx},1)">▼</button>` : ''}
                        </div>
                        <strong onclick="startEditCard('${c.id}')" style="cursor:pointer">${isActive ? '💳' : '🚫'} ${esc(c.name)}</strong>
                    </div>
                    <div class="flex gap-1">
                        <button class="btn btn-sm ${isActive ? 'btn-card-active' : 'btn-card-inactive'}" onclick="toggleCardActive('${c.id}')">${isActive ? 'Active' : 'Inactive'}</button>`;
                if (ui.confirmDeleteCard === c.id) {
                    html += `<button class="btn btn-sm btn-danger" onclick="doDeleteCard('${c.id}')">ยืนยัน</button>
                        <button class="btn btn-sm btn-outline" onclick="ui.confirmDeleteCard=null;render()">ยกเลิก</button>`;
                } else {
                    html += `<button class="btn btn-sm btn-outline-danger" onclick="askDeleteCard('${c.id}')">🗑️</button>`;
                }
                html += `</div></div>`;
            }
            html += `</div>`;
        });
    }

    html += footer();
    document.getElementById('app').innerHTML = html;
}

// === Footer ===
function footer() {
    return `<div class="text-center text-muted mt-3" style="border-top:1px solid var(--border);padding-top:16px">
        <p><strong>Credit Card Tracker</strong></p>
        <small>บันทึกการใช้บัตรเครดิต ใช้ฟรี ไม่มีโฆษณา</small><br>
        <small>สร้างโดย Mana11Lab</small><br>
        <div class="mt-2">
            <a href="https://promptpay.io/0923959404" target="_blank" class="btn btn-sm btn-outline-warning">☕ เลี้ยงน้ำหวานผ่าน PromptPay</a>
        </div>
        <button class="btn btn-sm btn-outline" onclick="copyLink()" style="margin-top:8px">📎 แชร์แอพนี้</button>
        <div class="mt-2" style="display:flex;gap:6px;justify-content:center">
            <button class="btn btn-sm btn-outline" onclick="manualBackup()">💾 Backup</button>
            <button class="btn btn-sm btn-outline" onclick="restoreBackup()">📂 Restore</button>
        </div>
    </div>`;
}

function copyLink() {
    navigator.clipboard.writeText(location.href).then(() => {
        showToast('คัดลอกลิงก์แล้ว');
    });
}

// === Actions: Add ===
function saveExpense() {
    const amount = parseFloat(ui.expenseAmount) || 0;
    if (!ui.selectedCard || amount <= 0 || !ui.selectedCycle) { showToast('กรุณากรอกข้อมูลให้ครบ', 'danger'); return; }
    expenses.push({ id: genId(), date: ui.expenseDate, cardId: ui.selectedCard, amount, billingCycle: ui.selectedCycle, note: ui.expenseNote, reserved: false });
    saveExpenses();
    ui.expenseAmount = '';
    ui.expenseNote = '';
    ui.expenseDate = today();
    showToast('บันทึกเรียบร้อย ✅');
    render();
}

// === Actions: Expenses ===
function toggleExpand(id) { ui.expandedId = ui.expandedId === id ? null : id; ui.confirmDeleteExpense = null; render(); }
function editExpenseField(id, field, value) {
    const ex = expenses.find(e => e.id === id);
    if (!ex) return;
    if (field === 'amount') ex.amount = parseFloat(value) || 0;
    else ex[field] = value;
    saveExpenses(); render();
}
function doDeleteExpense(id) { expenses = expenses.filter(e => e.id !== id); saveExpenses(); ui.expandedId = null; ui.confirmDeleteExpense = null; render(); }

// === Actions: Cards ===
function addCard() {
    const el = document.getElementById('newCardInput');
    const name = el.value.trim();
    if (!name) return;
    cards.push({ id: genId(), name, active: true });
    el.value = '';
    saveCards(); render();
}
function startEditCard(id) { ui.editingCard = id; render(); setTimeout(() => { const el = document.getElementById('editCardInput'); if (el) { el.focus(); el.select(); } }, 0); }
function saveEditCard(id) {
    const el = document.getElementById('editCardInput');
    const name = el ? el.value.trim() : '';
    if (!name) { ui.editingCard = null; render(); return; }
    const card = cards.find(c => c.id === id);
    if (card) card.name = name;
    ui.editingCard = null;
    saveCards(); render();
}
function askDeleteCard(id) {
    const hasExpenses = expenses.some(e => e.cardId === id);
    if (hasExpenses) { showToast('ลบไม่ได้ บัตรนี้มีรายการใช้จ่ายอยู่', 'danger'); return; }
    ui.confirmDeleteCard = id; render();
}
function doDeleteCard(id) { cards = cards.filter(c => c.id !== id); ui.confirmDeleteCard = null; saveCards(); render(); }
function moveCard(idx, dir) {
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= cards.length) return;
    [cards[idx], cards[newIdx]] = [cards[newIdx], cards[idx]];
    saveCards(); render();
}
function toggleCardActive(id) {
    const card = cards.find(c => c.id === id);
    if (card) card.active = card.active === false ? true : false;
    saveCards(); render();
}

// === Actions: Reserved ===
function toggleReserved(id) {
    const ex = expenses.find(e => e.id === id);
    if (ex) ex.reserved = !ex.reserved;
    saveExpenses(); render();
}

// === AutoBackup ===
function autoBackup() {
    if (!cards.length && !expenses.length) return;
    const key = 'credit_card_last_backup';
    const todayStr = today();
    if (localStorage.getItem(key) === todayStr) return;
    const data = JSON.stringify({ cards, expenses, backupDate: todayStr });
    const blob = new Blob([data], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `CreditCardTracker_${todayStr}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    localStorage.setItem(key, todayStr);
    showToast('💾 Auto-backup สำเร็จ');
}

function restoreBackup() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = e => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = ev => {
            try {
                const data = JSON.parse(ev.target.result);
                if (data.cards) { cards = data.cards; saveCards(); }
                if (data.expenses) { expenses = data.expenses; saveExpenses(); }
                showToast('✅ Restore สำเร็จ');
                render();
            } catch { showToast('ไฟล์ไม่ถูกต้อง', 'danger'); }
        };
        reader.readAsText(file);
    };
    input.click();
}

function manualBackup() {
    const data = JSON.stringify({ cards, expenses, backupDate: today() });
    const blob = new Blob([data], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `CreditCardTracker_${today()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    showToast('💾 Backup สำเร็จ');
}

// === Init ===
document.addEventListener('DOMContentLoaded', () => { loadAll(); route(); autoBackup(); });
window.addEventListener('hashchange', route);
