const app = document.getElementById('app');
const STORE = 'checkpack';

const DEFAULT_TEMPLATES = [
    { id: 't1', name: '🏸 ตีแบด', items: ['รองเท้าแบด','แร็กเก็ต','เสื้อกีฬา','กางเกงกีฬา','ถุงเท้า','ผ้าเช็ดตัว','กระบอกน้ำ','เสื้อผ้าเปลี่ยน','กระเป๋า'] },
    { id: 't2', name: '🏠 กลับบ้าน', items: ['เสื้อผ้า','ของฝาก','ที่ชาร์จ/สายชาร์จ','ยา','บัตรประชาชน','กุญแจบ้าน','กระเป๋าสตางค์','โทรศัพท์'] },
    { id: 't3', name: '✈️ ไปเที่ยว', items: ['เสื้อผ้า','ชุดชั้นใน','ของใช้ส่วนตัว','ที่ชาร์จ/สายชาร์จ','Powerbank','ยา','บัตรประชาชน/พาสปอร์ต','กล้อง','ร่ม/หมวก','รองเท้า','กระเป๋าสตางค์','โทรศัพท์'] }
];

function load() {
    const d = JSON.parse(localStorage.getItem(STORE) || 'null');
    if (!d) return { templates: DEFAULT_TEMPLATES, checks: {}, activeId: '' };
    return d;
}

function save(data) { localStorage.setItem(STORE, JSON.stringify(data)); }

let state = load();
let view = 'list'; // 'list' | 'check' | 'edit'
let editingItemIdx = -1;
let confirmResetActive = false;
let confirmDeleteTplId = '';

function render() {
    if (view === 'list') renderList();
    else if (view === 'check') renderCheck();
    else if (view === 'edit') renderEdit();
}

// --- Template List ---
function renderList() {
    const html = state.templates.map(t => {
        const checks = state.checks[t.id] || [];
        const done = checks.filter(Boolean).length;
        const total = t.items.length;
        const pct = total > 0 ? Math.round(done / total * 100) : 0;

        if (confirmDeleteTplId === t.id) {
            return `<div class="card" style="border-color:var(--primary)">
                <p style="font-size:0.85rem">ลบ "${t.name}"?</p>
                <div class="flex gap-1 mt-1">
                    <button class="btn btn-sm btn-primary" onclick="doDeleteTpl('${t.id}')">ยืนยัน</button>
                    <button class="btn btn-sm btn-secondary" onclick="confirmDeleteTplId='';render()">ยกเลิก</button>
                </div>
            </div>`;
        }

        return `<div class="tpl-card" onclick="openCheck('${t.id}')">
            <div class="flex items-center">
                <span style="font-weight:600;font-size:0.95rem">${esc(t.name)}</span>
                <span class="ml-auto" style="font-size:0.8rem;color:${done===total && total>0 ? 'var(--success)' : 'var(--accent)'}">${done}/${total}</span>
                <button class="btn btn-sm btn-outline" style="margin-left:8px" onclick="event.stopPropagation();openEdit('${t.id}')">✏️</button>
                <button class="btn btn-sm btn-outline" style="margin-left:4px" onclick="event.stopPropagation();confirmDeleteTplId='${t.id}';render()">✕</button>
            </div>
            ${total > 0 ? `<div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div>` : ''}
        </div>`;
    }).join('');

    app.innerHTML = `
        <h4>✅ CheckPack</h4>
        ${html}
        <hr>
        <div class="card">
            <div class="flex gap-1">
                <input id="newTplName" placeholder="ชื่อ template ใหม่" style="flex:1">
                <button class="btn btn-primary" onclick="addTemplate()">+ เพิ่ม</button>
            </div>
        </div>
        <div class="footer">
            <p><strong>CheckPack</strong></p>
            <p>เช็คลิสต์เตรียมของ ใช้ซ้ำได้</p>
            <p style="margin-top:8px">สร้างโดย <a href="https://promptpay.io/0923959404">Mana11Lab</a></p>
            <p style="margin-top:8px"><button class="btn btn-outline" onclick="copyLink()">📎 แชร์แอพนี้</button></p>
            <div style="margin-top:8px;display:flex;gap:6px;justify-content:center">
                <button class="btn btn-sm btn-outline" onclick="manualBackup()">💾 Backup</button>
                <button class="btn btn-sm btn-outline" onclick="restoreBackup()">📂 Restore</button>
            </div>
        </div>
        <div id="toast"></div>
    `;
}

function addTemplate() {
    const name = document.getElementById('newTplName').value.trim();
    if (!name) return;
    const id = 't' + Date.now();
    state.templates.push({ id, name, items: [] });
    save(state);
    render();
}

function doDeleteTpl(id) {
    state.templates = state.templates.filter(t => t.id !== id);
    delete state.checks[id];
    confirmDeleteTplId = '';
    save(state);
    render();
}

// --- Checklist View ---
function openCheck(id) {
    state.activeId = id;
    const tpl = state.templates.find(t => t.id === id);
    if (!tpl) return;
    if (!state.checks[id] || state.checks[id].length !== tpl.items.length) {
        state.checks[id] = new Array(tpl.items.length).fill(false);
    }
    save(state);
    view = 'check';
    confirmResetActive = false;
    render();
}

function renderCheck() {
    const tpl = state.templates.find(t => t.id === state.activeId);
    if (!tpl) { view = 'list'; render(); return; }
    const checks = state.checks[tpl.id] || [];
    const done = checks.filter(Boolean).length;
    const total = tpl.items.length;
    const pct = total > 0 ? Math.round(done / total * 100) : 0;

    const itemsHtml = tpl.items.map((item, i) => `
        <div class="check-item ${checks[i] ? 'checked' : ''}" onclick="toggleCheck(${i})">
            <div class="check-box">${checks[i] ? '✓' : ''}</div>
            <span class="item-text">${esc(item)}</span>
        </div>
    `).join('');

    app.innerHTML = `
        <div class="flex items-center mb-2">
            <button class="btn btn-sm btn-secondary" onclick="view='list';render()">← กลับ</button>
            <h4 style="margin:0 0 0 10px;flex:1">${esc(tpl.name)}</h4>
            <span style="font-size:0.85rem;color:${done===total && total>0 ? 'var(--success)' : 'var(--accent)'}">${done}/${total}</span>
        </div>
        <div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div>
        ${done === total && total > 0 ? '<p style="text-align:center;color:var(--success);font-weight:600;margin-bottom:8px">🎉 ครบแล้ว!</p>' : ''}
        ${itemsHtml}
        <hr>
        <div class="flex gap-1">
            <button class="btn btn-outline" onclick="resetChecks()">🔄 Reset</button>
            <button class="btn btn-outline" onclick="openEdit('${tpl.id}')">✏️ แก้ไข</button>
        </div>
        ${confirmResetActive ? `<div class="card mt-1" style="border-color:var(--primary)"><p style="font-size:0.85rem">Reset ทั้งหมด?</p><div class="flex gap-1 mt-1"><button class="btn btn-sm btn-primary" onclick="doReset()">ยืนยัน</button><button class="btn btn-sm btn-secondary" onclick="confirmResetActive=false;render()">ยกเลิก</button></div></div>` : ''}
    `;
}

function toggleCheck(i) {
    const checks = state.checks[state.activeId];
    checks[i] = !checks[i];
    save(state);
    render();
}

function resetChecks() {
    confirmResetActive = true;
    render();
}

function doReset() {
    const tpl = state.templates.find(t => t.id === state.activeId);
    if (tpl) state.checks[tpl.id] = new Array(tpl.items.length).fill(false);
    confirmResetActive = false;
    save(state);
    render();
}

// --- Edit Template ---
function openEdit(id) {
    state.activeId = id;
    view = 'edit';
    editingItemIdx = -1;
    save(state);
    render();
}

function renderEdit() {
    const tpl = state.templates.find(t => t.id === state.activeId);
    if (!tpl) { view = 'list'; render(); return; }

    const itemsHtml = tpl.items.map((item, i) => {
        if (editingItemIdx === i) {
            return `<div class="flex gap-1 mb-1">
                <input id="editItem" value="${esc(item)}" style="flex:1">
                <button class="btn btn-sm btn-success" onclick="saveEditItem(${i})">✓</button>
                <button class="btn btn-sm btn-secondary" onclick="editingItemIdx=-1;render()">✕</button>
            </div>`;
        }
        return `<div class="check-item">
            <span class="item-text">${esc(item)}</span>
            <div class="item-actions">
                <button onclick="editingItemIdx=${i};render()">✏️</button>
                <button onclick="deleteItem(${i})">✕</button>
                ${i > 0 ? `<button onclick="moveItem(${i},-1)">▲</button>` : ''}
                ${i < tpl.items.length-1 ? `<button onclick="moveItem(${i},1)">▼</button>` : ''}
            </div>
        </div>`;
    }).join('');

    app.innerHTML = `
        <div class="flex items-center mb-2">
            <button class="btn btn-sm btn-secondary" onclick="view='check';render()">← กลับ</button>
            <h4 style="margin:0 0 0 10px">แก้ไข: ${esc(tpl.name)}</h4>
        </div>
        <div class="card mb-2">
            <label class="form-label">ชื่อ template</label>
            <input id="editTplName" value="${esc(tpl.name)}" oninput="updateTplName(this.value)">
        </div>
        ${itemsHtml}
        <div class="flex gap-1 mt-2">
            <input id="newItem" placeholder="เพิ่มรายการใหม่" style="flex:1">
            <button class="btn btn-primary" onclick="addItem()">+</button>
        </div>
    `;
}

function updateTplName(val) {
    const tpl = state.templates.find(t => t.id === state.activeId);
    if (tpl) { tpl.name = val; save(state); }
}

function addItem() {
    const tpl = state.templates.find(t => t.id === state.activeId);
    if (!tpl) return;
    const val = document.getElementById('newItem').value.trim();
    if (!val) return;
    tpl.items.push(val);
    // Sync checks array
    if (state.checks[tpl.id]) state.checks[tpl.id].push(false);
    save(state);
    render();
}

function saveEditItem(i) {
    const tpl = state.templates.find(t => t.id === state.activeId);
    if (!tpl) return;
    tpl.items[i] = document.getElementById('editItem').value.trim() || tpl.items[i];
    editingItemIdx = -1;
    save(state);
    render();
}

function deleteItem(i) {
    const tpl = state.templates.find(t => t.id === state.activeId);
    if (!tpl) return;
    tpl.items.splice(i, 1);
    if (state.checks[tpl.id]) state.checks[tpl.id].splice(i, 1);
    save(state);
    render();
}

function moveItem(i, dir) {
    const tpl = state.templates.find(t => t.id === state.activeId);
    if (!tpl) return;
    const j = i + dir;
    [tpl.items[i], tpl.items[j]] = [tpl.items[j], tpl.items[i]];
    if (state.checks[tpl.id]) {
        [state.checks[tpl.id][i], state.checks[tpl.id][j]] = [state.checks[tpl.id][j], state.checks[tpl.id][i]];
    }
    save(state);
    render();
}

// --- Helpers ---
function esc(s) { return (s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

function toast(msg) {
    let t = document.getElementById('toast');
    if (!t) { t = document.createElement('div'); t.id = 'toast'; document.body.appendChild(t); }
    t.textContent = msg; t.style.display = 'block';
    setTimeout(() => t.style.display = 'none', 2000);
}

function copyLink() {
    navigator.clipboard.writeText(location.href).then(() => toast('คัดลอกลิงก์แล้ว'));
}

// === AutoBackup ===
function autoBackup() {
    if (!state.templates.length) return;
    const key = 'checkpack_last_backup';
    const todayStr = new Date().toISOString().slice(0,10);
    if (localStorage.getItem(key) === todayStr) return;
    const blob = new Blob([JSON.stringify({ data: state, backupDate: todayStr })], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `CheckPack_${todayStr}.json`; a.click();
    localStorage.setItem(key, todayStr);
    toast('💾 Auto-backup สำเร็จ');
}

function restoreBackup() {
    const input = document.createElement('input'); input.type = 'file'; input.accept = '.json';
    input.onchange = e => { const f = e.target.files[0]; if (!f) return;
        const r = new FileReader(); r.onload = ev => { try {
            const d = JSON.parse(ev.target.result);
            if (d.data) { state = d.data; save(state); toast('✅ Restore สำเร็จ'); render(); }
        } catch { toast('ไฟล์ไม่ถูกต้อง'); } }; r.readAsText(f); };
    input.click();
}

function manualBackup() {
    const blob = new Blob([JSON.stringify({ data: state, backupDate: new Date().toISOString().slice(0,10) })], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `CheckPack_${new Date().toISOString().slice(0,10)}.json`; a.click();
    toast('💾 Backup สำเร็จ');
}

render();
autoBackup();
