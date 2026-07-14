// === State ===
const MAX_SLOTS = 5;
let currentSlot = 0;
let billNames = ['', '', '', '', ''];
let state = { members: [], groups: [], expenses: [], idCounter: 0 };
let ui = { membersExpanded: true, groupsExpanded: false, memberAction: null, editingName: false, renamingBill: false, confirmDelete: null, confirmDeleteGroup: null, confirmDeleteExpense: null, confirmClear: false, addingGroup: false, pendingGroupMembers: [] };

// === Storage ===
const Store = {
    get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
    set(k, v) { localStorage.setItem(k, JSON.stringify(v)); }
};

function slotKey() { return `splitbill_slot${currentSlot}`; }
function save() { Store.set(slotKey(), state); }
function saveBillNames() { Store.set('splitbill_names', billNames); }

function load() {
    const d = Store.get(slotKey());
    state = d ? { members: d.members || [], groups: d.groups || [], expenses: d.expenses || [], idCounter: d.idCounter || 0 } :
        { members: [], groups: [], expenses: [], idCounter: 0 };
}

function loadBillNames() {
    const n = Store.get('splitbill_names');
    if (n) billNames = n;
}

// === Calculator ===
function calculate() {
    const { members, groups, expenses } = state;
    if (!members.length) return [];
    const balance = {};
    members.forEach(m => balance[m] = 0);

    expenses.forEach(ex => {
        if (!ex.payer || !ex.participants.length || ex.amount <= 0) return;
        const share = ex.amount / ex.participants.length;
        ex.participants.forEach(p => { if (p in balance) balance[p] -= share; });
        if (ex.payer in balance) balance[ex.payer] += ex.amount;
    });

    const hub = members[0];
    const results = [];
    const groupedMembers = new Set();
    groups.forEach(g => g.members.forEach(m => groupedMembers.add(m)));

    Object.entries(balance).forEach(([name, val]) => {
        if (name === hub || groupedMembers.has(name)) return;
        if (val < -0.005) results.push({ from: name, to: hub, amount: Math.round(-val * 100) / 100 });
        else if (val > 0.005) results.push({ from: hub, to: name, amount: Math.round(val * 100) / 100 });
    });

    groups.forEach(g => {
        if (g.members.includes(hub)) return;
        const groupBal = g.members.reduce((s, m) => s + (balance[m] || 0), 0);
        const displayName = `[${g.members.join(',')}]`;
        if (groupBal < -0.005) results.push({ from: displayName, to: hub, amount: Math.round(-groupBal * 100) / 100 });
        else if (groupBal > 0.005) results.push({ from: hub, to: displayName, amount: Math.round(groupBal * 100) / 100 });
    });

    return results;
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

// === Render ===
function render() {
    const { members, groups, expenses } = state;
    const results = calculate();
    const total = expenses.reduce((s, e) => s + (e.amount > 0 ? e.amount : 0), 0);

    // Payer breakdown
    const payerBreakdown = {};
    expenses.forEach(ex => {
        if (!ex.payer || ex.amount <= 0 || !ex.title) return;
        if (!payerBreakdown[ex.payer]) payerBreakdown[ex.payer] = [];
        payerBreakdown[ex.payer].push({ title: ex.title, amount: ex.amount });
    });

    let html = '';

    // Header
    html += `<div class="flex items-center gap-2 mb-3">
        <h4>🧾 Split Bill</h4>
        <button class="btn btn-sm btn-outline-danger ml-auto" onclick="askClear()">🗑️ เคลียร์บิล</button>
    </div>`;
    if (ui.confirmClear) {
        html += `<div class="card mb-3"><div class="flex items-center gap-1">
            <small>ลบข้อมูลทั้งหมดแล้วเริ่มใหม่?</small>
            <button class="btn btn-sm btn-danger" onclick="doClear()">ยืนยัน</button>
            <button class="btn btn-sm btn-outline" onclick="ui.confirmClear=false;render()">ยกเลิก</button>
        </div></div>`;
    }

    // Slot picker
    html += `<div class="flex items-center gap-2 mb-3">
        <select style="max-width:200px" onchange="changeSlot(this.value)">`;
    for (let i = 0; i < MAX_SLOTS; i++) {
        const name = billNames[i] || '(ว่าง)';
        html += `<option value="${i}" ${i === currentSlot ? 'selected' : ''}>Bill ${i + 1} - ${name}</option>`;
    }
    html += `</select>
        <button class="btn btn-sm btn-outline" onclick="renameBill()">✏️</button>
    </div>`;
    if (ui.renamingBill) {
        html += `<div class="input-group mb-3">
            <input id="billNameInput" value="${esc(billNames[currentSlot] || '')}" placeholder="ตั้งชื่อ Bill" onkeydown="if(event.key==='Enter')confirmRenameBill();if(event.key==='Escape'){ui.renamingBill=false;render();}">
            <button class="btn btn-primary" onclick="confirmRenameBill()">ตกลง</button>
        </div>`;
    }

    // Members section
    html += `<div class="mb-3">
        <div class="section-header" onclick="toggleMembers()">
            ${ui.membersExpanded ? '▼' : '▶'} สมาชิก (${members.length} คน)
        </div>`;
    if (ui.membersExpanded) {
        html += `<div class="input-group mt-2 mb-2">
            <input id="newMember" placeholder="พิมพ์ชื่อ..." onkeydown="if(event.key==='Enter')addMember()">
            <button class="btn btn-primary" onclick="addMember()">เพิ่ม</button>
        </div>
        <div class="flex flex-wrap gap-1">`;
        members.forEach((m, i) => {
            const cls = i === 0 ? 'badge-hub' : 'badge-member';
            html += `<span class="badge ${cls}" onclick="showMemberAction('${esc(m)}')">${i === 0 ? '⭐ ' : ''}${esc(m)}</span>`;
        });
        html += `</div>`;
    }
    html += `</div>`;

    // Member action panel
    if (ui.memberAction) {
        html += `<div class="card mb-2">`;
        if (ui.confirmDelete) {
            html += `<strong>${esc(ui.memberAction)}</strong>
            <div class="flex items-center gap-1 mt-1">
                <small>ลบสมาชิกนี้?</small>
                <button class="btn btn-sm btn-danger" onclick="removeMember()">ยืนยัน</button>
                <button class="btn btn-sm btn-outline" onclick="cancelDelete()">ยกเลิก</button>
            </div>`;
        } else if (ui.editingName) {
            html += `<div class="input-group mb-2">
                <input id="renameInput" value="${esc(ui.memberAction)}" onkeydown="if(event.key==='Enter')confirmRename();if(event.key==='Escape')closeMemberAction()">
                <button class="btn btn-primary" onclick="confirmRename()">ตกลง</button>
            </div>
            <div class="flex flex-wrap gap-1">
                <button class="btn btn-sm btn-outline" onclick="closeMemberAction()">ยกเลิก</button>
            </div>`;
        } else {
            html += `<strong onclick="startEditName()" style="cursor:pointer">${esc(ui.memberAction)}</strong>
            <div class="flex flex-wrap gap-1 mt-1">
                <button class="btn btn-sm btn-danger" onclick="setHub()">⭐ ตั้งเป็นตัวกลาง</button>
                <button class="btn btn-sm btn-outline-danger" onclick="askDelete()">✕ ลบ</button>
                <button class="btn btn-sm btn-outline" onclick="closeMemberAction()">ยกเลิก</button>
            </div>`;
        }
        html += `</div>`;
    }

    // Groups section
    html += `<div class="mb-3">
        <div class="section-header" onclick="toggleGroups()">
            ${ui.groupsExpanded ? '▼' : '▶'} กลุ่มรวมจ่าย (${groups.length} กลุ่ม)
        </div>`;
    if (ui.groupsExpanded) {
        groups.forEach((g, gi) => {
            html += `<div class="flex items-center gap-2 mt-1">
                <span class="badge" style="background:var(--border);color:var(--muted-bg)">[${g.members.map(esc).join(', ')}]</span>`;
            if (ui.confirmDeleteGroup === gi) {
                html += `<small>ลบ?</small>
                    <button class="btn btn-sm btn-danger" onclick="doRemoveGroup(${gi})">ยืนยัน</button>
                    <button class="btn btn-sm btn-outline" onclick="ui.confirmDeleteGroup=null;render()">ยกเลิก</button>`;
            } else {
                html += `<button class="btn btn-sm btn-outline-danger" onclick="askRemoveGroup(${gi})">✕</button>`;
            }
            html += `</div>`;
        });
        if (ui.addingGroup) {
            html += `<div class="card mt-2"><small>เลือกสมาชิกเข้ากลุ่ม:</small>
                <div class="flex flex-wrap gap-1 mt-1">`;
            members.forEach(m => {
                const sel = ui.pendingGroupMembers.includes(m);
                html += `<button class="btn btn-sm ${sel ? 'btn-success' : 'btn-outline'}" onclick="toggleGroupMember('${esc(m)}')">${esc(m)}</button>`;
            });
            html += `</div><div class="flex gap-1 mt-2">
                <button class="btn btn-sm btn-primary" onclick="confirmAddGroup()">ยืนยัน</button>
                <button class="btn btn-sm btn-outline" onclick="ui.addingGroup=false;render()">ยกเลิก</button>
            </div></div>`;
        } else {
            html += `<button class="btn btn-sm btn-outline mt-2" onclick="showAddGroup()">＋ สร้างกลุ่ม</button>`;
        }
    }
    html += `</div>`;

    html += `<hr>`;

    // Expenses
    html += `<div class="mb-3"><div class="section-header mb-2">รายการค่าใช้จ่าย</div>`;
    expenses.forEach((ex, ei) => {
        const partLabel = ex.participants.length === members.length ? 'ทุกคน' : `${ex.participants.length} คน`;
        html += `<div class="card">
            <div class="section-header" onclick="toggleExpense(${ei})">
                ${ex.expanded ? '▼' : '▶'} ${esc(ex.title || '(ไม่มีชื่อ)')} — ${ex.amount > 0 ? ex.amount.toLocaleString() + '฿' : '0฿'}
                (${esc(ex.payer || '?')} จ่าย, ${partLabel})
            </div>`;
        if (ex.expanded) {
            html += `<div class="mt-2">
                <input class="mb-1" placeholder="ชื่อรายการ" value="${esc(ex.title || '')}" oninput="updateExpense(${ei},'title',this.value)" onblur="render()">
                <input class="mb-1" type="text" inputmode="decimal" placeholder="ยอดเงิน" value="${ex.amount || ''}" oninput="updateExpense(${ei},'amount',this.value)" onblur="render()">
                <select class="mb-1" onchange="updateExpense(${ei},'payer',this.value)">
                    <option value="">-- ใครจ่าย? --</option>`;
            members.forEach(m => {
                html += `<option value="${esc(m)}" ${ex.payer === m ? 'selected' : ''}>${esc(m)}</option>`;
            });
            html += `</select>
                <small>หารใครบ้าง?</small>
                <div class="flex flex-wrap gap-1 mt-1">
                    <button class="btn btn-sm btn-outline-primary" onclick="selectAll(${ei})">ทั้งหมด</button>
                    <button class="btn btn-sm btn-outline" onclick="selectNone(${ei})">ไม่เลือก</button>
                </div>
                <div class="flex flex-wrap gap-1 mt-1">`;
            members.forEach(m => {
                const sel = ex.participants.includes(m);
                html += `<button class="btn btn-sm ${sel ? 'btn-success' : 'btn-outline'}" onclick="toggleParticipant(${ei},'${esc(m)}')">${esc(m)}</button>`;
            });
            html += `</div>
                <button class="btn btn-sm btn-outline-danger mt-2" onclick="askDeleteExpense(${ei})">🗑️ ลบรายการ</button>`;
            if (ui.confirmDeleteExpense === ei) {
                html += `<div class="flex items-center gap-1 mt-1">
                    <small>ลบรายการนี้?</small>
                    <button class="btn btn-sm btn-danger" onclick="doDeleteExpense(${ei})">ยืนยัน</button>
                    <button class="btn btn-sm btn-outline" onclick="ui.confirmDeleteExpense=null;render()">ยกเลิก</button>
                </div>`;
            }
            html += `</div>`;
        }
        html += `</div>`;
    });
    html += `<button class="btn btn-outline-primary mt-3" onclick="addExpense()">＋ เพิ่มรายการ</button></div>`;

    html += `<hr>`;

    // Summary
    html += `<div class="mb-3">
        <div class="section-header mb-2">สรุปยอดโอน</div>
        <p>รวมทั้งหมด: <strong>${total.toLocaleString(undefined, {minimumFractionDigits:2})} บาท</strong></p>`;

    if (Object.keys(payerBreakdown).length) {
        html += `<p class="mt-2" style="font-weight:600">🧾 ใครออกค่าอะไรบ้าง</p>`;
        Object.entries(payerBreakdown).forEach(([payer, items]) => {
            const sum = items.reduce((s, x) => s + x.amount, 0);
            html += `<p class="mb-1"><strong>${esc(payer)}</strong> (รวม ${sum.toFixed(2)}฿)</p>`;
            items.forEach(it => { html += `<small class="text-muted" style="margin-left:10px">• ${esc(it.title)} — ${it.amount.toFixed(2)}฿</small><br>`; });
        });
        html += `<hr>`;
    }

    if (!results.length) {
        html += `<p class="text-muted">ยังไม่มีรายการ หรือยอดเท่ากันพอดี</p>`;
    } else {
        if (members.length) html += `<small class="text-muted">📌 ตัวกลาง: ${esc(members[0])}</small><br>`;
        results.forEach(r => {
            html += `<p class="mb-1">${esc(r.from)} → โอนให้ ${esc(r.to)} : <strong>${r.amount.toFixed(2)} บาท</strong></p>`;
        });
    }
    html += `</div>`;

    html += `<button class="btn btn-secondary mb-3" onclick="copySummary()">📋 คัดลอกข้อความสรุป</button>`;

    // Footer
    html += `<div class="text-center text-muted mt-3" style="border-top:2px solid #D4DBDF;padding-top:16px">
        <p><strong>Split Bill</strong></p>
        <small>แอพหารบิลง่ายๆ ใช้ฟรี ไม่มีโฆษณา</small><br>
        <small>สร้างโดย Mana11Lab</small><br>
        <div class="mt-2">
            <a href="https://promptpay.io/0923959404" target="_blank" class="btn btn-sm btn-outline-warning">☕ เลี้ยงน้ำหวานผ่าน PromptPay</a>
        </div>
        <button class="btn btn-sm btn-outline" onclick="copyLink()" style="margin-top:8px">📎 แชร์แอพนี้</button>
        <div style="margin-top:8px;display:flex;gap:6px;justify-content:center">
            <button class="btn btn-sm btn-outline" onclick="manualBackup()">💾 Backup</button>
            <button class="btn btn-sm btn-outline" onclick="restoreBackup()">📂 Restore</button>
        </div>
    </div>`;

    document.getElementById('app').innerHTML = html;
}

// === Escape HTML ===
function esc(s) { return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }

// === Actions ===
function changeSlot(v) { currentSlot = parseInt(v); load(); render(); }
function renameBill() { ui.renamingBill = true; render(); setTimeout(() => { const el = document.getElementById('billNameInput'); if (el) { el.focus(); el.select(); } }, 0); }
function confirmRenameBill() {
    const el = document.getElementById('billNameInput');
    billNames[currentSlot] = (el ? el.value.trim() : ''); ui.renamingBill = false; saveBillNames(); render();
}

function addMember() {
    const input = document.getElementById('newMember');
    const name = input.value.trim();
    if (!name || state.members.includes(name)) return;
    state.members.push(name);
    input.value = '';
    save(); render();
}

function showMemberAction(name) { ui.memberAction = name; ui.confirmDelete = null; ui.editingName = false; render(); }
function closeMemberAction() { ui.memberAction = null; ui.confirmDelete = null; ui.editingName = false; render(); }
function startEditName() { ui.editingName = true; render(); setTimeout(() => { const el = document.getElementById('renameInput'); if (el) { el.focus(); el.select(); } }, 0); }

function setHub() {
    const m = ui.memberAction;
    state.members = [m, ...state.members.filter(x => x !== m)];
    ui.memberAction = null;
    save(); render();
}

function confirmRename() {
    const el = document.getElementById('renameInput');
    const newName = el ? el.value.trim() : '';
    const oldName = ui.memberAction;
    if (!newName || newName === oldName || state.members.includes(newName)) { closeMemberAction(); return; }
    const idx = state.members.indexOf(oldName);
    state.members[idx] = newName;
    state.expenses.forEach(ex => {
        if (ex.payer === oldName) ex.payer = newName;
        ex.participants = ex.participants.map(p => p === oldName ? newName : p);
    });
    state.groups.forEach(g => { g.members = g.members.map(m => m === oldName ? newName : m); });
    ui.memberAction = null;
    save(); render();
}

function askDelete() { ui.confirmDelete = true; render(); }
function cancelDelete() { ui.confirmDelete = null; render(); }
function removeMember() {
    const m = ui.memberAction;
    if (state.expenses.some(ex => ex.payer === m || ex.participants.includes(m))) {
        showToast(`ลบไม่ได้: '${m}' ถูกใช้ในรายการค่าใช้จ่ายอยู่`, 'danger');
        ui.memberAction = null; ui.confirmDelete = null; render(); return;
    }
    state.members = state.members.filter(x => x !== m);
    state.groups.forEach(g => { g.members = g.members.filter(x => x !== m); });
    state.groups = state.groups.filter(g => g.members.length >= 2);
    ui.memberAction = null; ui.confirmDelete = null;
    save(); render();
}

function toggleMembers() { ui.membersExpanded = !ui.membersExpanded; render(); }
function toggleGroups() { ui.groupsExpanded = !ui.groupsExpanded; render(); }

function showAddGroup() { ui.addingGroup = true; ui.pendingGroupMembers = []; render(); }
function toggleGroupMember(m) {
    const idx = ui.pendingGroupMembers.indexOf(m);
    if (idx >= 0) ui.pendingGroupMembers.splice(idx, 1); else ui.pendingGroupMembers.push(m);
    render();
}
function confirmAddGroup() {
    if (ui.pendingGroupMembers.length < 2) { showToast('ต้องเลือกอย่างน้อย 2 คน', 'danger'); return; }
    const existing = new Set();
    state.groups.forEach(g => g.members.forEach(m => existing.add(m)));
    const dup = ui.pendingGroupMembers.find(m => existing.has(m));
    if (dup) { showToast(`'${dup}' อยู่ในกลุ่มอื่นแล้ว`, 'danger'); return; }
    state.groups.push({ members: [...ui.pendingGroupMembers] });
    ui.addingGroup = false; ui.pendingGroupMembers = [];
    save(); render();
}
function askRemoveGroup(gi) { ui.confirmDeleteGroup = gi; render(); }
function doRemoveGroup(gi) { state.groups.splice(gi, 1); ui.confirmDeleteGroup = null; save(); render(); }

function addExpense() {
    state.expenses.push({ id: ++state.idCounter, title: '', amount: 0, payer: '', participants: [...state.members], expanded: true });
    save(); render();
}

function toggleExpense(ei) { state.expenses[ei].expanded = !state.expenses[ei].expanded; render(); }

function updateExpense(ei, field, value) {
    if (field === 'amount') state.expenses[ei].amount = parseFloat(value) || 0;
    else state.expenses[ei][field] = value;
    save();
}

function selectAll(ei) { state.expenses[ei].participants = [...state.members]; save(); render(); }
function selectNone(ei) { state.expenses[ei].participants = []; save(); render(); }

function toggleParticipant(ei, m) {
    const p = state.expenses[ei].participants;
    const idx = p.indexOf(m);
    if (idx >= 0) p.splice(idx, 1); else p.push(m);
    save(); render();
}

function askDeleteExpense(ei) { ui.confirmDeleteExpense = ei; render(); }
function doDeleteExpense(ei) { state.expenses.splice(ei, 1); ui.confirmDeleteExpense = null; save(); render(); }

function askClear() { ui.confirmClear = true; render(); }
function doClear() {
    state = { members: [], groups: [], expenses: [], idCounter: 0 };
    ui.confirmClear = false;
    save(); render();
}

function copySummary() {
    const { members, expenses } = state;
    const results = calculate();
    const total = expenses.reduce((s, e) => s + (e.amount > 0 ? e.amount : 0), 0);

    let text = `บิลค่าใช้จ่ายกลุ่ม\nรวมค่าใช้จ่ายทั้งหมด: ${total.toFixed(2)} บาท\n\n`;

    const payerBreakdown = {};
    expenses.forEach(ex => {
        if (!ex.payer || ex.amount <= 0 || !ex.title) return;
        if (!payerBreakdown[ex.payer]) payerBreakdown[ex.payer] = [];
        payerBreakdown[ex.payer].push({ title: ex.title, amount: ex.amount });
    });

    if (Object.keys(payerBreakdown).length) {
        text += '🧾 ใครออกค่าอะไรบ้าง:\n';
        Object.entries(payerBreakdown).forEach(([payer, items]) => {
            text += `👤 ${payer} (รวม ${items.reduce((s, x) => s + x.amount, 0).toFixed(2)}฿)\n`;
            items.forEach(it => { text += `   • ${it.title} — ${it.amount.toFixed(2)}฿\n`; });
        });
        text += '\n';
    }

    text += '💸 สรุปยอดโอน:\n';
    if (members.length) text += `📌 ตัวกลาง: ${members[0]}\n`;
    results.forEach(r => { text += `- ${r.from} ➡️ โอนให้ ${r.to} : ${r.amount.toFixed(2)} บาท\n`; });

    navigator.clipboard.writeText(text).then(() => showToast('คัดลอกข้อความแล้ว ✅')).catch(() => showToast('คัดลอกไม่สำเร็จ', 'danger'));
}

// === AutoBackup ===
function autoBackup() {
    if (!state.members.length && !state.expenses.length) return;
    const key = 'splitbill_last_backup';
    const todayStr = new Date().toISOString().slice(0,10);
    if (localStorage.getItem(key) === todayStr) return;
    const allSlots = [];
    for (let i = 0; i < MAX_SLOTS; i++) { allSlots.push(Store.get(`splitbill_slot${i}`)); }
    const data = { slots: allSlots, billNames, backupDate: todayStr };
    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `SplitBill_${todayStr}.json`; a.click();
    localStorage.setItem(key, todayStr);
    showToast('💾 Auto-backup สำเร็จ');
}

function restoreBackup() {
    const input = document.createElement('input'); input.type = 'file'; input.accept = '.json';
    input.onchange = e => { const f = e.target.files[0]; if (!f) return;
        const r = new FileReader(); r.onload = ev => { try {
            const d = JSON.parse(ev.target.result);
            if (d.slots) { d.slots.forEach((s, i) => { if (s) Store.set(`splitbill_slot${i}`, s); }); }
            if (d.billNames) { billNames = d.billNames; saveBillNames(); }
            load(); showToast('✅ Restore สำเร็จ'); render();
        } catch { showToast('ไฟล์ไม่ถูกต้อง', 'danger'); } }; r.readAsText(f); };
    input.click();
}

function manualBackup() {
    const allSlots = [];
    for (let i = 0; i < MAX_SLOTS; i++) { allSlots.push(Store.get(`splitbill_slot${i}`)); }
    const data = { slots: allSlots, billNames, backupDate: new Date().toISOString().slice(0,10) };
    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `SplitBill_${new Date().toISOString().slice(0,10)}.json`; a.click();
    showToast('💾 Backup สำเร็จ');
}

// === Init ===
document.addEventListener('DOMContentLoaded', () => {
    loadBillNames();
    load();
    render();
    autoBackup();
});

function copyLink() {
    navigator.clipboard.writeText(location.href).then(() => {
        let t = document.getElementById('toast');
        if (!t) { t = document.createElement('div'); t.id = 'toast'; document.body.appendChild(t); }
        t.innerHTML = '<div class="alert alert-success">คัดลอกลิงก์แล้ว</div>';
        t.style.display = 'block';
        setTimeout(() => t.style.display = 'none', 2000);
    });
}
