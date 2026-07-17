// === State ===
// type: 'receive' = ลูกหนี้ (เขาต้องจ่ายเรา), 'pay' = เจ้าหนี้ (เราต้องจ่ายเขา)
// entry: { id, type, person, items:[{id,desc,amount}], payments:[{id,amount,note,date}], accountId, note }
// account: { id, name, detail }

let state = { entries: [], accounts: [], idCounter: 0 };
let ui = { tab: 'receive', editingEntry: null, confirmDelete: null, confirmClear: false, addingPayment: null };

// === Storage ===
const Store = {
    get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
    set(k, v) { localStorage.setItem(k, JSON.stringify(v)); }
};
function save() { Store.set('debttracker_state', state); }
function load() {
    const d = Store.get('debttracker_state');
    if (d) state = { entries: d.entries || [], accounts: d.accounts || [], idCounter: d.idCounter || 0 };
}
function nextId() { return ++state.idCounter; }

// === Helpers ===
function esc(s) { return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }
function fmt(n) { return Number(n || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function entryTotal(entry) { return entry.items.reduce((s, it) => s + (Number(it.amount) || 0), 0); }
function entryPaid(entry) { return (entry.payments || []).reduce((s, p) => s + (Number(p.amount) || 0), 0); }
function entryUnpaid(entry) { return Math.max(0, entryTotal(entry) - entryPaid(entry)); }

// === Toast ===
let toastTimer;
function showToast(msg, type = 'success') {
    let el = document.getElementById('toast');
    if (!el) { el = document.createElement('div'); el.id = 'toast'; document.body.prepend(el); }
    el.className = `alert alert-${type}`;
    el.textContent = msg;
    el.classList.remove('hidden');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.add('hidden'), 2200);
}

// === Render ===
function render() {
    const { entries, accounts } = state;
    const { tab } = ui;

    const receives = entries.filter(e => e.type === 'receive');
    const pays = entries.filter(e => e.type === 'pay');

    const totalReceive = receives.reduce((s, e) => s + entryUnpaid(e), 0);
    const totalPay = pays.reduce((s, e) => s + entryUnpaid(e), 0);
    const net = totalReceive - totalPay;
    const closedCount = entries.filter(e => entryUnpaid(e) <= 0 && entryTotal(e) > 0).length;

    let html = '';

    // Header
    html += `<div class="flex items-center gap-2 mb-3">
        <h4>💰 DebtTracker</h4>
        <button class="btn btn-sm btn-outline-danger ml-auto" onclick="askClear()">🗑️</button>
    </div>`;

    if (ui.confirmClear) {
        html += `<div class="card mb-3"><div class="flex items-center gap-1">
            <small>ลบข้อมูลทั้งหมด?</small>
            <button class="btn btn-sm btn-danger" onclick="doClear()">ยืนยัน</button>
            <button class="btn btn-sm btn-outline" onclick="ui.confirmClear=false;render()">ยกเลิก</button>
        </div></div>`;
    }

    // Summary bar
    html += `<div class="flex gap-2 mb-3">
        <div class="summary-box summary-receive" style="flex:1;text-align:center">
            <div class="label">คนอื่นค้างจ่ายเรา</div>
            <div class="amount-receive" style="font-size:1.1rem">${fmt(totalReceive)} ฿</div>
        </div>
        <div class="summary-box summary-pay" style="flex:1;text-align:center">
            <div class="label">เราค้างจ่ายคนอื่น</div>
            <div class="amount-pay" style="font-size:1.1rem">${fmt(totalPay)} ฿</div>
        </div>
    </div>`;

    // Tabs
    html += `<div class="tab-bar">
        <button class="tab ${tab==='receive'?'active-receive':''}" onclick="setTab('receive')">💚 ทวงเงิน (${receives.length})</button>
        <button class="tab ${tab==='pay'?'active-pay':''}" onclick="setTab('pay')">🟠 หนี้ฉัน (${pays.length})</button>
        <button class="tab ${tab==='accounts'?'active-accounts':''}" onclick="setTab('accounts')">🏦 บัญชี (${accounts.length})</button>
        <button class="tab ${tab==='summary'?'active-summary':''}" onclick="setTab('summary')">📊 สรุป</button>
    </div>`;

    if (tab === 'receive') html += renderEntryList('receive', receives, accounts);
    else if (tab === 'pay') html += renderEntryList('pay', pays, accounts);
    else if (tab === 'accounts') html += renderAccounts(accounts);
    else if (tab === 'summary') html += renderSummary(receives, pays, accounts, totalReceive, totalPay, net, closedCount);

    html += `<div class="text-center text-muted mt-3" style="border-top:2px solid #D4DBDF;padding-top:16px">
        <p><strong>DebtTracker</strong></p>
        <small>สร้างโดย Mana11Lab</small><br>
        <div class="mt-2 flex gap-1" style="justify-content:center">
            <button class="btn btn-sm btn-outline" onclick="manualBackup()">💾 Backup</button>
            <button class="btn btn-sm btn-outline" onclick="restoreBackup()">📂 Restore</button>
        </div>
    </div>`;

    document.getElementById('app').innerHTML = html;
}

function renderEntryList(type, list, accounts) {
    const isReceive = type === 'receive';
    const color = isReceive ? 'receive' : 'pay';
    const label = isReceive ? 'ลูกหนี้' : 'เจ้าหนี้';
    const payBtnLabel = isReceive ? '💵 รับเงิน' : '💸 บันทึกจ่าย';
    let html = '';

    list.forEach(entry => {
        const unpaid = entryUnpaid(entry);
        const total = entryTotal(entry);
        const paid = entryPaid(entry);
        const closed = unpaid <= 0 && total > 0;
        const isEditing = ui.editingEntry === entry.id;
        const isAddingPayment = ui.addingPayment === entry.id;
        const account = isReceive ? accounts.find(a => a.id === entry.accountId) : null;
        const payments = entry.payments || [];

        html += `<div class="card card-${color}">`;  

        if (isEditing) {
            html += renderEditEntry(entry, accounts);
        } else {
            // Header row
            html += `<div class="flex items-center gap-2 mb-1">
                <span class="tag-${color}">${label}</span>
                <strong style="font-size:1rem${closed ? ';opacity:0.5;text-decoration:line-through' : ''}">${esc(entry.person)}</strong>
                <span class="ml-auto amount-${color}" style="${closed ? 'opacity:0.5' : ''}">${closed ? '✅ ปิดแล้ว' : fmt(unpaid) + ' ฿'}</span>
            </div>`;

            if (entry.note) html += `<small class="text-muted">${esc(entry.note)}</small><br>`;

            // Items
            entry.items.forEach(it => {
                html += `<div class="flex gap-1 mt-1" style="font-size:0.88rem">
                    <span style="flex:1;color:var(--text-secondary)">• ${esc(it.desc)}</span>
                    <span class="amount-${color}">${fmt(it.amount)} ฿</span>
                </div>`;
            });

            // Payment history
            if (payments.length) {
                html += `<div style="margin-top:8px;padding-top:8px;border-top:1px solid var(--border)">`;
                if (paid > 0) html += `<small style="color:var(--accent)">รับแล้ว ${fmt(paid)} ฿ จาก ${fmt(total)} ฿</small><br>`;
                payments.forEach((p, pi) => {
                    html += `<div class="flex items-center gap-1" style="font-size:0.8rem;margin-top:4px">
                        <span style="color:var(--accent)">${p.date}</span>
                        <span class="amount-${color}" style="margin-left:4px">+${fmt(p.amount)} ฿</span>
                        ${p.note ? `<span style="color:var(--text-secondary);flex:1"> — ${esc(p.note)}</span>` : '<span style="flex:1"></span>'}
                        <button class="btn btn-sm btn-outline-danger" style="padding:2px 7px;font-size:0.7rem" onclick="removePayment(${entry.id},${pi})">✕</button>
                    </div>`;
                });
                html += `</div>`;
            }

            // Add payment form
            if (isAddingPayment) {
                html += `<div style="margin-top:10px;padding-top:10px;border-top:1px solid var(--border)">
                    <div class="flex gap-1 mb-1">
                        <input id="pay_amt_${entry.id}" type="text" inputmode="decimal" placeholder="ยอดเงิน" style="flex:1">
                        <input id="pay_note_${entry.id}" placeholder="หมายเหตุ" style="flex:2">
                    </div>
                    <div class="flex gap-1">
                        <button class="btn btn-sm btn-${color}" onclick="confirmPayment(${entry.id})">✅ บันทึก</button>
                        <button class="btn btn-sm btn-outline" onclick="ui.addingPayment=null;render()">ยกเลิก</button>
                    </div>
                </div>`;
            }

            if (isReceive && account) {
                html += `<div class="mt-2" style="font-size:0.8rem;color:var(--accent)">🏦 รับเงินที่: <strong style="color:var(--text)">${esc(account.name)}</strong>${account.detail ? ` — ${esc(account.detail)}` : ''}</div>`;
            }

            html += `<div class="flex gap-1 mt-2">`;
            if (!isAddingPayment && !closed) {
                html += `<button class="btn btn-sm btn-${color}" onclick="startAddPayment(${entry.id})">${payBtnLabel}</button>`;
            }
            html += `<button class="btn btn-sm btn-outline" onclick="startEdit(${entry.id})">✏️</button>`;
            if (ui.confirmDelete === entry.id) {
                html += `<small>ลบ?</small>
                    <button class="btn btn-sm btn-danger" onclick="doDelete(${entry.id})">ยืนยัน</button>
                    <button class="btn btn-sm btn-outline" onclick="ui.confirmDelete=null;render()">ยกเลิก</button>`;
            } else {
                html += `<button class="btn btn-sm btn-outline-danger" onclick="askDelete(${entry.id})">🗑️</button>`;
            }
            html += `</div>`;
        }

        html += `</div>`;
    });

    html += `<button class="btn btn-outline-${color} w-full mt-2" onclick="addEntry('${type}')">＋ เพิ่ม${label}</button>`;
    return html;
}

function renderEditEntry(entry, accounts) {
    const isReceive = entry.type === 'receive';
    let html = `<div class="label mb-1">${isReceive ? '👤 ชื่อลูกหนี้' : '👤 ชื่อเจ้าหนี้'}</div>
        <input class="mb-2" value="${esc(entry.person)}" oninput="updateField(${entry.id},'person',this.value)" placeholder="ชื่อ...">
        <div class="label mb-1">📝 หมายเหตุ</div>
        <input class="mb-2" value="${esc(entry.note||'')}" oninput="updateField(${entry.id},'note',this.value)" placeholder="หมายเหตุ (ไม่บังคับ)">`;

    if (isReceive) {
        html += `<div class="label mb-1">🏦 บัญชีรับเงิน</div>
        <select class="mb-2" onchange="updateField(${entry.id},'accountId',this.value?parseInt(this.value):null)">
            <option value="">-- ไม่ระบุ --</option>`;
        accounts.forEach(a => {
            html += `<option value="${a.id}" ${entry.accountId === a.id ? 'selected' : ''}>${esc(a.name)}${a.detail ? ' — ' + esc(a.detail) : ''}</option>`;
        });
        html += `</select>`;
    }

    html += `<div class="label mb-1">📋 รายการ</div>`;
    entry.items.forEach((it, ii) => {
        html += `<div class="flex gap-1 items-center mb-1">
            <input style="flex:2" value="${esc(it.desc)}" oninput="updateItem(${entry.id},${ii},'desc',this.value)" placeholder="รายการ...">
            <input style="flex:1" type="text" inputmode="decimal" value="${it.amount||''}" oninput="updateItem(${entry.id},${ii},'amount',this.value)" placeholder="ยอด">
            <button class="btn btn-sm btn-outline-danger" onclick="removeItem(${entry.id},${ii})">✕</button>
        </div>`;
    });

    if ((entry.payments||[]).length) {
        const paid = entryPaid(entry);
        html += `<div class="label mt-2">💵 รับ/จ่ายแล้ว ${fmt(paid)} ฿ (แก้ไขได้ที่หน้าหลัก)</div>`;
    }

    html += `<button class="btn btn-sm btn-outline mt-1 mb-2" onclick="addItem(${entry.id})">＋ เพิ่มรายการ</button>
        <div class="flex gap-1 mt-1">
            <button class="btn btn-sm btn-primary" onclick="doneEdit()">✅ เสร็จ</button>
        </div>`;
    return html;
}

function renderAccounts(accounts) {
    let html = '';
    accounts.forEach(a => {
        const isEditing = ui.editingEntry === `acc_${a.id}`;
        html += `<div class="card">`;
        if (isEditing) {
            html += `<div class="label mb-1">ชื่อบัญชี / ธนาคาร</div>
                <input class="mb-1" value="${esc(a.name)}" oninput="updateAcc(${a.id},'name',this.value)" placeholder="เช่น กสิกร, PromptPay">
                <div class="label mb-1">เลขบัญชี / เบอร์ / รายละเอียด</div>
                <input class="mb-2" value="${esc(a.detail||'')}" oninput="updateAcc(${a.id},'detail',this.value)" placeholder="เช่น 0xx-x-xxxxx-x">
                <button class="btn btn-sm btn-primary" onclick="doneEdit()">✅ เสร็จ</button>`;
        } else {
            html += `<div class="flex items-center gap-2">
                <span style="font-size:1.1rem">🏦</span>
                <div style="flex:1">
                    <strong>${esc(a.name)}</strong>
                    ${a.detail ? `<br><small>${esc(a.detail)}</small>` : ''}
                </div>
                <button class="btn btn-sm btn-outline" onclick="startEdit('acc_${a.id}')">✏️</button>`;
            if (ui.confirmDelete === `acc_${a.id}`) {
                html += `<small>ลบ?</small>
                    <button class="btn btn-sm btn-danger" onclick="doDeleteAcc(${a.id})">ยืนยัน</button>
                    <button class="btn btn-sm btn-outline" onclick="ui.confirmDelete=null;render()">ยกเลิก</button>`;
            } else {
                html += `<button class="btn btn-sm btn-outline-danger" onclick="askDelete('acc_${a.id}')">🗑️</button>`;
            }
            html += `</div>`;
        }
        html += `</div>`;
    });
    html += `<button class="btn btn-outline w-full mt-2" onclick="addAccount()">＋ เพิ่มบัญชีรับเงิน</button>`;
    return html;
}

function renderSummary(receives, pays, accounts, totalReceive, totalPay, net, closedCount) {
    let html = '';

    const netClass = net > 0.005 ? 'summary-net-pos' : net < -0.005 ? 'summary-net-neg' : 'summary-net-zero';
    const netColor = net > 0.005 ? 'amount-receive' : net < -0.005 ? 'amount-pay' : '';
    const netLabel = net > 0.005 ? '✅ ยอดสุทธิ: คนอื่นยังค้างเรา' : net < -0.005 ? '⚠️ ยอดสุทธิ: เรายังค้างคนอื่น' : '✅ ยอดสุทธิ: เท่ากันพอดี';

    html += `<div class="summary-box ${netClass} text-center mb-3">
        <div class="label">${netLabel}</div>
        <div class="${netColor}" style="font-size:1.4rem;font-weight:700">${fmt(Math.abs(net))} ฿</div>
    </div>`;

    if (closedCount > 0) html += `<p class="text-muted mb-2" style="font-size:0.82rem">✅ ปิดแล้ว ${closedCount} รายการ</p>`;

    // Receive breakdown
    if (receives.length) {
        html += `<div class="section-header mb-2">💚 ลูกหนี้ — คนที่ค้างจ่ายเรา</div>`;
        receives.forEach(e => {
            const unpaid = entryUnpaid(e);
            const total = entryTotal(e);
            const paid = entryPaid(e);
            const closed = unpaid <= 0 && total > 0;
            const acc = accounts.find(a => a.id === e.accountId);
            html += `<div class="card card-receive mb-1" style="${closed ? 'opacity:0.55' : ''}">
                <div class="flex items-center gap-2">
                    <strong>${esc(e.person)}</strong>
                    <span class="ml-auto amount-receive">${closed ? '✅ ปิดแล้ว' : fmt(unpaid) + ' ฿'}</span>
                </div>`;
            if (paid > 0 && !closed) html += `<small style="color:var(--accent)">รับแล้ว ${fmt(paid)} ฿ / รวม ${fmt(total)} ฿</small><br>`;
            if (acc) html += `<small>🏦 รับที่: ${esc(acc.name)}${acc.detail ? ' ' + esc(acc.detail) : ''}</small><br>`;
            e.items.forEach(it => {
                html += `<div class="flex gap-1" style="font-size:0.82rem">
                    <span style="flex:1">• ${esc(it.desc)}</span>
                    <span>${fmt(it.amount)} ฿</span>
                </div>`;
            });
            html += `</div>`;
        });
    }

    // Pay breakdown
    if (pays.length) {
        html += `<div class="section-header mb-2 mt-3">🟠 เจ้าหนี้ — คนที่เราค้างจ่าย</div>`;
        pays.forEach(e => {
            const unpaid = entryUnpaid(e);
            const total = entryTotal(e);
            const paid = entryPaid(e);
            const closed = unpaid <= 0 && total > 0;
            html += `<div class="card card-pay mb-1" style="${closed ? 'opacity:0.55' : ''}">
                <div class="flex items-center gap-2">
                    <strong>${esc(e.person)}</strong>
                    <span class="ml-auto amount-pay">${closed ? '✅ ปิดแล้ว' : fmt(unpaid) + ' ฿'}</span>
                </div>`;
            if (paid > 0 && !closed) html += `<small style="color:var(--accent)">จ่ายแล้ว ${fmt(paid)} ฿ / รวม ${fmt(total)} ฿</small><br>`;
            e.items.forEach(it => {
                html += `<div class="flex gap-1" style="font-size:0.82rem">
                    <span style="flex:1">• ${esc(it.desc)}</span>
                    <span>${fmt(it.amount)} ฿</span>
                </div>`;
            });
            html += `</div>`;
        });
    }

    html += `<button class="btn btn-secondary w-full mt-3" onclick="copySummary()">📋 คัดลอกสรุป</button>`;
    return html;
}

// === Actions ===
function setTab(t) { ui.tab = t; ui.editingEntry = null; ui.confirmDelete = null; ui.addingPayment = null; render(); }

function addEntry(type) {
    const id = nextId();
    state.entries.push({ id, type, person: '', items: [], payments: [], accountId: null, note: '' });
    ui.editingEntry = id;
    save(); render();
}

function startEdit(id) { ui.editingEntry = id; ui.confirmDelete = null; ui.addingPayment = null; render(); }
function doneEdit() { ui.editingEntry = null; save(); render(); }

function startAddPayment(id) { ui.addingPayment = id; ui.editingEntry = null; render();
    setTimeout(() => { const el = document.getElementById(`pay_amt_${id}`); if (el) el.focus(); }, 0);
}

function confirmPayment(entryId) {
    const amtEl = document.getElementById(`pay_amt_${entryId}`);
    const noteEl = document.getElementById(`pay_note_${entryId}`);
    const amount = parseFloat(amtEl?.value) || 0;
    if (amount <= 0) { showToast('กรุณาใส่ยอดเงิน', 'danger'); return; }
    const e = state.entries.find(x => x.id === entryId);
    if (!e) return;
    if (!e.payments) e.payments = [];
    const date = new Date().toLocaleDateString('th-TH', { day:'2-digit', month:'2-digit', year:'2-digit' });
    e.payments.push({ id: nextId(), amount, note: noteEl?.value.trim() || '', date });
    ui.addingPayment = null;
    save(); render();
    showToast('บันทึกแล้ว ✅');
}

function removePayment(entryId, pi) {
    const e = state.entries.find(x => x.id === entryId);
    if (!e || !e.payments) return;
    e.payments.splice(pi, 1);
    save(); render();
}

function updateField(id, field, value) {
    const e = state.entries.find(x => x.id === id);
    if (!e) return;
    if (field === 'accountId') e.accountId = value;
    else e[field] = value;
    save();
}

function addItem(entryId) {
    const e = state.entries.find(x => x.id === entryId);
    if (!e) return;
    e.items.push({ id: nextId(), desc: '', amount: 0, paid: false });
    save(); render();
}

function updateItem(entryId, ii, field, value) {
    const e = state.entries.find(x => x.id === entryId);
    if (!e) return;
    if (field === 'amount') e.items[ii].amount = parseFloat(value) || 0;
    else e.items[ii][field] = value;
    save();
}

function removeItem(entryId, ii) {
    const e = state.entries.find(x => x.id === entryId);
    if (!e) return;
    e.items.splice(ii, 1);
    save(); render();
}


function askDelete(id) { ui.confirmDelete = id; render(); }
function doDelete(id) {
    state.entries = state.entries.filter(e => e.id !== id);
    ui.confirmDelete = null;
    save(); render();
}

function addAccount() {
    const id = nextId();
    state.accounts.push({ id, name: '', detail: '' });
    ui.editingEntry = `acc_${id}`;
    save(); render();
}

function updateAcc(id, field, value) {
    const a = state.accounts.find(x => x.id === id);
    if (a) { a[field] = value; save(); }
}

function doDeleteAcc(id) {
    state.accounts = state.accounts.filter(a => a.id !== id);
    state.entries.forEach(e => { if (e.accountId === id) e.accountId = null; });
    ui.confirmDelete = null;
    save(); render();
}

function askClear() { ui.confirmClear = true; render(); }
function doClear() {
    state = { entries: [], accounts: [], idCounter: 0 };
    ui.confirmClear = false;
    save(); render();
}

function copySummary() {
    const receives = state.entries.filter(e => e.type === 'receive');
    const pays = state.entries.filter(e => e.type === 'pay');
    const totalReceive = receives.reduce((s, e) => s + entryUnpaid(e), 0);
    const totalPay = pays.reduce((s, e) => s + entryUnpaid(e), 0);
    const net = totalReceive - totalPay;

    let text = `💰 สรุปหนี้สิน\n`;
    text += `คนอื่นค้างจ่ายเรา: ${fmt(totalReceive)} ฿\n`;
    text += `เราค้างจ่ายคนอื่น: ${fmt(totalPay)} ฿\n`;
    text += `ยอดสุทธิ: ${net >= 0 ? '+' : ''}${fmt(net)} ฿\n\n`;

    if (receives.length) {
        text += `💚 ลูกหนี้:\n`;
        receives.forEach(e => {
            const unpaid = entryUnpaid(e);
            const paid = entryPaid(e);
            text += `• ${e.person} — ค้าง ${fmt(unpaid)} ฿`;
            if (paid > 0) text += ` (รับแล้ว ${fmt(paid)} ฿)`;
            text += `\n`;
            e.items.forEach(it => { text += `   - ${it.desc}: ${fmt(it.amount)} ฿\n`; });
            const acc = state.accounts.find(a => a.id === e.accountId);
            if (acc) text += `   🏦 โอนมาที่: ${acc.name}${acc.detail ? ' ' + acc.detail : ''}\n`;
        });
        text += '\n';
    }

    if (pays.length) {
        text += `🟠 เจ้าหนี้:\n`;
        pays.forEach(e => {
            const unpaid = entryUnpaid(e);
            const paid = entryPaid(e);
            text += `• ${e.person} — ค้าง ${fmt(unpaid)} ฿`;
            if (paid > 0) text += ` (จ่ายแล้ว ${fmt(paid)} ฿)`;
            text += `\n`;
            e.items.forEach(it => { text += `   - ${it.desc}: ${fmt(it.amount)} ฿\n`; });
        });
    }

    navigator.clipboard.writeText(text)
        .then(() => showToast('คัดลอกสรุปแล้ว ✅'))
        .catch(() => showToast('คัดลอกไม่สำเร็จ', 'danger'));
}

function manualBackup() {
    const blob = new Blob([JSON.stringify(state)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `DebtTracker_${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    showToast('💾 Backup สำเร็จ');
}

function restoreBackup() {
    const input = document.createElement('input'); input.type = 'file'; input.accept = '.json';
    input.onchange = e => {
        const f = e.target.files[0]; if (!f) return;
        const r = new FileReader();
        r.onload = ev => {
            try {
                state = JSON.parse(ev.target.result);
                save(); showToast('✅ Restore สำเร็จ'); render();
            } catch { showToast('ไฟล์ไม่ถูกต้อง', 'danger'); }
        };
        r.readAsText(f);
    };
    input.click();
}

// === Init ===
document.addEventListener('DOMContentLoaded', () => { load(); render(); });
