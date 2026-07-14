const app = document.getElementById('app');
const STORE = 'quickpaste';

const DEFAULT_DATA = {
    groups: [
        { id: 'g1', name: '🏦 บัญชีธนาคาร', items: [
            { name: 'กสิกร', text: '123-4-56789-0' },
            { name: 'กรุงไทย', text: '987-6-54321-0' },
            { name: 'ไทยพาณิชย์', text: '111-2-33333-4' }
        ]},
        { id: 'g2', name: '🏠 ที่อยู่', items: [
            { name: 'บ้าน', text: '123/45 ซ.ตัวอย่าง ถ.สุขุมวิท แขวงคลองเตย เขตคลองเตย กรุงเทพฯ 10110' },
            { name: 'ที่ทำงาน', text: '99 อาคารตัวอย่าง ชั้น 5 ถ.รัชดาภิเษก แขวงดินแดง เขตดินแดง กรุงเทพฯ 10400' }
        ]},
        { id: 'g3', name: '📱 อื่นๆ', items: [
            { name: 'เบอร์โทร', text: '081-234-5678' },
            { name: 'อีเมล', text: 'example@mail.com' }
        ]}
    ]
};

function load() {
    const d = JSON.parse(localStorage.getItem(STORE) || 'null');
    return d || JSON.parse(JSON.stringify(DEFAULT_DATA));
}
function save() { localStorage.setItem(STORE, JSON.stringify(state)); }

let state = load();
let collapsed = new Set();
let editing = null; // { gIdx, iIdx }
let adding = null; // gIdx
let confirmDel = null; // { gIdx, iIdx } or { gIdx }

function render() {
    let html = `<div class="flex items-center mb-1">
        <h4 style="margin:0">📋 QuickPaste</h4>
    </div>`;

    state.groups.forEach((group, gi) => {
        const isCollapsed = collapsed.has(gi);
        html += `<div class="group-header" onclick="toggle(${gi})">
            <span class="chevron ${isCollapsed ? '' : 'open'}">▶</span>
            ${esc(group.name)} <small>(${group.items.length})</small>
            <button class="btn btn-sm btn-outline" style="margin-left:auto;font-size:0.7rem" onclick="event.stopPropagation();adding=${gi};collapsed.delete(${gi});render()">+ เพิ่ม</button>
        </div>`;

        if (confirmDel && confirmDel.gIdx === gi && confirmDel.iIdx === undefined) {
            html += `<div class="card" style="border-color:var(--primary)"><p style="font-size:0.85rem">ลบกลุ่ม "${esc(group.name)}" ทั้งหมด?</p><div class="flex gap-1 mt-1"><button class="btn btn-sm btn-primary" onclick="delGroup(${gi})">ยืนยัน</button><button class="btn btn-sm btn-secondary" onclick="confirmDel=null;render()">ยกเลิก</button></div></div>`;
        }

        if (!isCollapsed) {
            group.items.forEach((item, ii) => {
                if (confirmDel && confirmDel.gIdx === gi && confirmDel.iIdx === ii) {
                    html += `<div class="card" style="border-color:var(--primary)"><p style="font-size:0.85rem">ลบ "${esc(item.name)}"?</p><div class="flex gap-1 mt-1"><button class="btn btn-sm btn-primary" onclick="delItem(${gi},${ii})">ยืนยัน</button><button class="btn btn-sm btn-secondary" onclick="confirmDel=null;render()">ยกเลิก</button></div></div>`;
                    return;
                }
                if (editing && editing.gIdx === gi && editing.iIdx === ii) {
                    html += renderEdit(gi, ii, item);
                    return;
                }
                html += `<div class="snippet-item">
                    <div style="flex:1;min-width:0">
                        <div class="name">${esc(item.name)}</div>
                        <div class="preview">${esc(item.text)}</div>
                    </div>
                    <button class="copy-btn" onclick="copyText(${gi},${ii})">📋</button>
                    <div class="actions">
                        <button onclick="editing={gIdx:${gi},iIdx:${ii}};render()">✏️</button>
                        <button onclick="confirmDel={gIdx:${gi},iIdx:${ii}};render()">✕</button>
                    </div>
                </div>`;
            });

            if (adding === gi) {
                html += renderAdd(gi);
            }
        }
    });

    html += `<hr>
        <div class="card">
            <div class="flex gap-1">
                <input id="newGroup" placeholder="ชื่อกลุ่มใหม่ เช่น 📧 อีเมล" style="flex:1">
                <button class="btn btn-primary" onclick="addGroup()">+ กลุ่ม</button>
            </div>
        </div>
        ${state.groups.length > 0 ? `<div class="flex gap-1 mt-1" style="flex-wrap:wrap">${state.groups.map((g, i) => `<button class="btn btn-sm btn-outline" onclick="confirmDel={gIdx:${i}};render()">ลบ ${esc(g.name)}</button>`).join('')}</div>` : ''}
        <div class="footer">
            <p><strong>QuickPaste</strong></p>
            <p>เก็บข้อความที่ใช้บ่อย คัดลอกได้ทันที</p>
            <p style="margin-top:8px">สร้างโดย <a href="https://promptpay.io/0923959404">Mana11Lab</a></p>
            <div style="margin-top:8px;display:flex;gap:6px;justify-content:center">
                <button class="btn btn-sm btn-outline" onclick="manualBackup()">💾 Backup</button>
                <button class="btn btn-sm btn-outline" onclick="restoreBackup()">📂 Restore</button>
            </div>
        </div>
        <div id="toast"></div>`;

    app.innerHTML = html;
}

function renderEdit(gi, ii, item) {
    return `<div class="card mb-1">
        <input id="eName" value="${esc(item.name)}" placeholder="ชื่อ" class="mb-1">
        <textarea id="eText" placeholder="ข้อความ">${esc(item.text)}</textarea>
        <div class="flex gap-1 mt-1">
            <button class="btn btn-sm btn-success" onclick="saveEdit(${gi},${ii})">✓ บันทึก</button>
            <button class="btn btn-sm btn-secondary" onclick="editing=null;render()">ยกเลิก</button>
        </div>
    </div>`;
}

function renderAdd(gi) {
    return `<div class="card mb-1">
        <input id="aName" placeholder="ชื่อ เช่น กสิกร" class="mb-1">
        <textarea id="aText" placeholder="ข้อความ เช่น 123-4-56789-0"></textarea>
        <div class="flex gap-1 mt-1">
            <button class="btn btn-sm btn-success" onclick="doAdd(${gi})">✓ เพิ่ม</button>
            <button class="btn btn-sm btn-secondary" onclick="adding=null;render()">ยกเลิก</button>
        </div>
    </div>`;
}

function toggle(gi) {
    if (collapsed.has(gi)) collapsed.delete(gi); else collapsed.add(gi);
    render();
}

function copyText(gi, ii) {
    const text = state.groups[gi].items[ii].text;
    navigator.clipboard.writeText(text).then(() => toast('คัดลอกแล้ว'));
}

function saveEdit(gi, ii) {
    const name = document.getElementById('eName').value.trim();
    const text = document.getElementById('eText').value.trim();
    if (!name || !text) return;
    state.groups[gi].items[ii] = { name, text };
    editing = null;
    save(); render();
}

function doAdd(gi) {
    const name = document.getElementById('aName').value.trim();
    const text = document.getElementById('aText').value.trim();
    if (!name || !text) return;
    state.groups[gi].items.push({ name, text });
    adding = null;
    save(); render();
}

function delItem(gi, ii) {
    state.groups[gi].items.splice(ii, 1);
    confirmDel = null;
    save(); render();
}

function addGroup() {
    const name = document.getElementById('newGroup').value.trim();
    if (!name) return;
    state.groups.push({ id: 'g' + Date.now(), name, items: [] });
    save(); render();
}

function delGroup(gi) {
    state.groups.splice(gi, 1);
    confirmDel = null;
    save(); render();
}

function esc(s) { return (s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

function toast(msg) {
    let t = document.getElementById('toast');
    if (!t) { t = document.createElement('div'); t.id = 'toast'; document.body.appendChild(t); }
    t.textContent = msg; t.style.display = 'block';
    setTimeout(() => t.style.display = 'none', 2000);
}

// === AutoBackup ===
function autoBackup() {
    if (!state.groups.length) return;
    const key = 'quickpaste_last_backup';
    const todayStr = new Date().toISOString().slice(0,10);
    if (localStorage.getItem(key) === todayStr) return;
    const blob = new Blob([JSON.stringify({ data: state, backupDate: todayStr })], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `QuickPaste_${todayStr}.json`; a.click();
    localStorage.setItem(key, todayStr);
    toast('💾 Auto-backup สำเร็จ');
}

function restoreBackup() {
    const input = document.createElement('input'); input.type = 'file'; input.accept = '.json';
    input.onchange = e => { const f = e.target.files[0]; if (!f) return;
        const r = new FileReader(); r.onload = ev => { try {
            const d = JSON.parse(ev.target.result);
            if (d.data) { state = d.data; save(); toast('✅ Restore สำเร็จ'); render(); }
        } catch { toast('ไฟล์ไม่ถูกต้อง'); } }; r.readAsText(f); };
    input.click();
}

function manualBackup() {
    const blob = new Blob([JSON.stringify({ data: state, backupDate: new Date().toISOString().slice(0,10) })], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `QuickPaste_${new Date().toISOString().slice(0,10)}.json`; a.click();
    toast('💾 Backup สำเร็จ');
}

render();
autoBackup();
