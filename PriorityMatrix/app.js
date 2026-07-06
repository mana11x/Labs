// PriorityMatrix — Vanilla JS
const $ = id => document.getElementById(id);
const app = $('app');
const STORAGE_KEY = 'prioritymatrix_data';

const quadrants = [
    { key: 'q1', icon: '🔴', title: 'สำคัญ & เร่งด่วน', desc: 'ทำทันที' },
    { key: 'q2', icon: '🟢', title: 'สำคัญ แต่ไม่เร่งด่วน', desc: 'วางแผนทำ' },
    { key: 'q3', icon: '🟡', title: 'ไม่สำคัญ แต่เร่งด่วน', desc: 'มอบหมายคนอื่น' },
    { key: 'q4', icon: '⚫', title: 'ไม่สำคัญ & ไม่เร่งด่วน', desc: 'ตัดทิ้ง' },
];

let data = { q1: [], q2: [], q3: [], q4: [] };
let ui = { collapsed: {}, editingItem: null, confirmDelete: null };

function load() {
    try { const d = JSON.parse(localStorage.getItem(STORAGE_KEY)); if (d) data = d; } catch {}
}
function save() { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); }

function render() {
    let html = `<h4 class="text-center mb-3">📋 Priority Matrix</h4>`;

    quadrants.forEach(q => {
        const items = data[q.key] || [];
        const collapsed = ui.collapsed[q.key];
        html += `<div class="card mb-2">
            <div class="section-header flex items-center gap-2" onclick="toggle('${q.key}')">
                <span>${collapsed ? '▶' : '▼'}</span>
                <span>${q.icon} ${q.title}</span>
                <small class="ml-auto" style="color:var(--accent)">(${items.length})</small>
            </div>
            <small class="text-muted">${q.desc}</small>`;

        if (!collapsed) {
            html += `<div class="mt-2">`;
            items.forEach((item, i) => {
                if (ui.editingItem && ui.editingItem.key === q.key && ui.editingItem.idx === i) {
                    html += `<div class="flex gap-1 mb-1">
                        <input id="edit-input" value="${esc(item)}" style="flex:1" onkeydown="if(event.key==='Enter')saveEdit()">
                        <button class="btn btn-sm btn-primary" onclick="saveEdit()">✓</button>
                        <button class="btn btn-sm btn-outline" onclick="cancelEdit()">✕</button>
                    </div>`;
                } else if (ui.confirmDelete && ui.confirmDelete.key === q.key && ui.confirmDelete.idx === i) {
                    html += `<div class="flex items-center gap-1 mb-1" style="font-size:0.85rem">
                        <span style="flex:1;color:var(--primary)">ลบ?</span>
                        <button class="btn btn-sm btn-danger" onclick="doDelete('${q.key}',${i})">ยืนยัน</button>
                        <button class="btn btn-sm btn-outline" onclick="cancelDelete()">✕</button>
                    </div>`;
                } else {
                    html += `<div class="flex items-center gap-1 mb-1" style="font-size:0.85rem">
                        <span style="flex:1;cursor:pointer" onclick="startEdit('${q.key}',${i})">${esc(item)}</span>
                        <button class="btn btn-sm btn-outline-danger" onclick="askDelete('${q.key}',${i})">✕</button>
                    </div>`;
                }
            });
            html += `<div class="input-group mt-1">
                <input id="add-${q.key}" placeholder="เพิ่มรายการ..." onkeydown="if(event.key==='Enter')addItem('${q.key}')">
                <button class="btn btn-primary" onclick="addItem('${q.key}')">+</button>
            </div></div>`;
        }
        html += `</div>`;
    });

    html += footer();
    app.innerHTML = html;
    if (ui.editingItem) { const el = $('edit-input'); if (el) { el.focus(); el.select(); } }
}

function esc(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

function toggle(key) { ui.collapsed[key] = !ui.collapsed[key]; render(); }

function addItem(key) {
    const el = $('add-' + key);
    const text = el.value.trim();
    if (!text) return;
    data[key].push(text);
    save(); render();
}

function startEdit(key, idx) { ui.editingItem = { key, idx }; ui.confirmDelete = null; render(); }
function cancelEdit() { ui.editingItem = null; render(); }
function saveEdit() {
    const el = $('edit-input');
    const val = el.value.trim();
    if (val && ui.editingItem) {
        data[ui.editingItem.key][ui.editingItem.idx] = val;
        save();
    }
    ui.editingItem = null;
    render();
}

function askDelete(key, idx) { ui.confirmDelete = { key, idx }; ui.editingItem = null; render(); }
function cancelDelete() { ui.confirmDelete = null; render(); }
function doDelete(key, idx) {
    data[key].splice(idx, 1);
    ui.confirmDelete = null;
    save(); render();
}

function footer() {
    return `<div class="text-center text-muted mt-3" style="border-top:2px solid #D4DBDF;padding-top:16px">
        <p><strong>Priority Matrix</strong></p>
        <small>จัดลำดับงาน Eisenhower Matrix ใช้ฟรี ไม่มีโฆษณา</small><br>
        <small>สร้างโดย Mana11Lab</small><br>
        <div class="mt-2">
            <a href="https://promptpay.io/0923959404" target="_blank" class="btn btn-sm btn-outline-warning">☕ เลี้ยงน้ำหวานผ่าน PromptPay</a>
        </div>
        <button class="btn btn-sm btn-outline" onclick="copyLink()" style="margin-top:8px">📎 แชร์แอพนี้</button>
    </div>`;
}

function copyLink() {
    navigator.clipboard.writeText(location.href).then(() => {
        let t = document.getElementById('toast');
        if (!t) { t = document.createElement('div'); t.id = 'toast'; document.body.appendChild(t); }
        t.innerHTML = '<div class="alert alert-success">คัดลอกลิงก์แล้ว</div>';
        t.style.display = 'block';
        setTimeout(() => t.style.display = 'none', 2000);
    });
}

load();
render();
