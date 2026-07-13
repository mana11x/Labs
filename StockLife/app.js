const app = document.getElementById('app');
const STORE = 'stocklife';

const DEFAULT_DATA = {
    categories: [
        { id: 'c1', name: '🧴 ของใช้', items: [
            { name: 'สบู่', qty: 2, min: 1 },
            { name: 'แชมพู', qty: 1, min: 1 },
            { name: 'ยาสีฟัน', qty: 1, min: 1 },
            { name: 'ผงซักฟอก', qty: 1, min: 1 },
            { name: 'กระดาษทิชชู่', qty: 3, min: 2 }
        ]},
        { id: 'c2', name: '👕 เสื้อผ้า', items: [
            { name: 'เสื้อยืด', qty: 8, min: 5 },
            { name: 'กางเกงขาสั้น', qty: 4, min: 3 },
            { name: 'ถุงเท้า (คู่)', qty: 6, min: 4 },
            { name: 'ชุดกีฬา', qty: 3, min: 2 }
        ]},
        { id: 'c3', name: '🏸 กีฬา', items: [
            { name: 'กริปแร็กเก็ต', qty: 3, min: 2 },
            { name: 'ถุงเท้ากีฬา (คู่)', qty: 4, min: 3 },
            { name: 'ลูกขนไก่ (หลอด)', qty: 2, min: 1 }
        ]}
    ]
};

function load() {
    const d = JSON.parse(localStorage.getItem(STORE) || 'null');
    return d || JSON.parse(JSON.stringify(DEFAULT_DATA));
}
function save() { localStorage.setItem(STORE, JSON.stringify(state)); }

let state = load();
let view = 'main'; // 'main' | 'shop'
let editingItem = null; // { catIdx, itemIdx }
let confirmDelete = null; // { catIdx, itemIdx } or { catIdx }
let confirmDeleteCat = null;
let collapsed = new Set(); // catIdx ที่ย่ออยู่

function render() {
    if (view === 'main') renderMain();
    else if (view === 'shop') renderShop();
}

function renderMain() {
    const lowCount = countLow();
    let html = `<div class="flex items-center mb-2">
        <h4 style="margin:0">📦 StockLife</h4>
        <button class="btn btn-sm ${lowCount > 0 ? 'btn-primary' : 'btn-outline'}" style="margin-left:auto" onclick="view='shop';render()">🛒 ต้องซื้อ${lowCount > 0 ? ` (${lowCount})` : ''}</button>
    </div>`;

    state.categories.forEach((cat, ci) => {
        const isCollapsed = collapsed.has(ci);
        const lowInCat = cat.items.filter(it => it.qty <= it.min).length;
        html += `<div class="cat-header" onclick="toggleCat(${ci})">
            <span class="chevron ${isCollapsed ? '' : 'open'}">▶</span>
            ${esc(cat.name)} <small>(${cat.items.length})</small>
            ${lowInCat > 0 ? `<span class="badge-low">${lowInCat}</span>` : ''}
            <button class="btn btn-sm btn-outline" style="margin-left:auto;font-size:0.7rem" onclick="event.stopPropagation();editingItem={catIdx:${ci},itemIdx:-1};collapsed.delete(${ci});render()">+ เพิ่ม</button>
        </div>`;

        if (confirmDeleteCat === ci) {
            html += `<div class="card" style="border-color:var(--primary)"><p style="font-size:0.85rem">ลบหมวด "${esc(cat.name)}" ทั้งหมด?</p><div class="flex gap-1 mt-1"><button class="btn btn-sm btn-primary" onclick="doDeleteCat(${ci})">ยืนยัน</button><button class="btn btn-sm btn-secondary" onclick="confirmDeleteCat=null;render()">ยกเลิก</button></div></div>`;
        }

        if (!isCollapsed) {
        cat.items.forEach((item, ii) => {
            const status = item.qty <= 0 ? 'low' : item.qty <= item.min ? 'warn' : 'ok';

            if (confirmDelete && confirmDelete.catIdx === ci && confirmDelete.itemIdx === ii) {
                html += `<div class="card" style="border-color:var(--primary)"><p style="font-size:0.85rem">ลบ "${esc(item.name)}"?</p><div class="flex gap-1 mt-1"><button class="btn btn-sm btn-primary" onclick="doDeleteItem(${ci},${ii})">ยืนยัน</button><button class="btn btn-sm btn-secondary" onclick="confirmDelete=null;render()">ยกเลิก</button></div></div>`;
                return;
            }

            if (editingItem && editingItem.catIdx === ci && editingItem.itemIdx === ii) {
                html += renderEditItem(ci, ii, item);
                return;
            }

            html += `<div class="stock-item ${status === 'low' ? 'low' : status === 'warn' ? 'warn' : ''}">
                <button class="btn-round btn-secondary" onclick="changeQty(${ci},${ii},-1)">−</button>
                <span class="qty ${status}">${item.qty}</span>
                <button class="btn-round btn-success" onclick="changeQty(${ci},${ii},1)">+</button>
                <span class="name">${esc(item.name)}</span>
                <span class="min-label">min:${item.min}</span>
                <div class="actions">
                    <button onclick="editingItem={catIdx:${ci},itemIdx:${ii}};render()">✏️</button>
                    <button onclick="confirmDelete={catIdx:${ci},itemIdx:${ii}};render()">✕</button>
                </div>
            </div>`;
        });

        // Add new item form
        if (editingItem && editingItem.catIdx === ci && editingItem.itemIdx === -1) {
            html += renderAddItem(ci);
        }
        } // end !isCollapsed
    });

    html += `<hr>
        <div class="card">
            <div class="flex gap-1">
                <input id="newCatName" placeholder="ชื่อหมวดใหม่ เช่น 🍜 อาหาร" style="flex:1">
                <button class="btn btn-primary" onclick="addCategory()">+ หมวด</button>
            </div>
        </div>
        ${state.categories.length > 0 ? `<div class="flex gap-1 mt-1">${state.categories.map((c,i) => `<button class="btn btn-sm btn-outline" onclick="confirmDeleteCat=${i};render()">ลบ ${esc(c.name)}</button>`).join('')}</div>` : ''}
        <div class="footer">
            <p><strong>StockLife</strong></p>
            <p>จัดการสต๊อกของใช้ส่วนตัว</p>
            <p style="margin-top:8px">สร้างโดย <a href="https://promptpay.io/0923959404">Mana11Lab</a></p>
            <p style="margin-top:8px"><button class="btn btn-outline" onclick="copyLink()">📎 แชร์แอพนี้</button></p>
        </div>
        <div id="toast"></div>`;

    app.innerHTML = html;
}

function renderEditItem(ci, ii, item) {
    return `<div class="card mb-1">
        <div class="flex gap-1 mb-1">
            <input id="eName" value="${esc(item.name)}" placeholder="ชื่อ" style="flex:1">
            <input id="eQty" type="tel" inputmode="numeric" value="${item.qty}" style="width:50px" placeholder="จำนวน">
            <input id="eMin" type="tel" inputmode="numeric" value="${item.min}" style="width:50px" placeholder="min">
        </div>
        <div class="flex gap-1">
            <button class="btn btn-sm btn-success" onclick="saveEditItem(${ci},${ii})">✓ บันทึก</button>
            <button class="btn btn-sm btn-secondary" onclick="editingItem=null;render()">ยกเลิก</button>
        </div>
    </div>`;
}

function renderAddItem(ci) {
    return `<div class="card mb-1">
        <div class="flex gap-1 mb-1">
            <input id="aName" placeholder="ชื่อรายการ" style="flex:1">
            <input id="aQty" type="tel" inputmode="numeric" value="1" style="width:50px" placeholder="จำนวน">
            <input id="aMin" type="tel" inputmode="numeric" value="1" style="width:50px" placeholder="min">
        </div>
        <div class="flex gap-1">
            <button class="btn btn-sm btn-success" onclick="doAddItem(${ci})">✓ เพิ่ม</button>
            <button class="btn btn-sm btn-secondary" onclick="editingItem=null;render()">ยกเลิก</button>
        </div>
    </div>`;
}

// --- Shopping List ---
function renderShop() {
    const lowItems = [];
    state.categories.forEach(cat => {
        cat.items.forEach(item => {
            if (item.qty <= item.min) lowItems.push({ cat: cat.name, ...item });
        });
    });

    let html = `<div class="flex items-center mb-2">
        <button class="btn btn-sm btn-secondary" onclick="view='main';render()">← กลับ</button>
        <h4 style="margin:0 0 0 10px">🛒 ต้องซื้อ</h4>
    </div>`;

    if (lowItems.length === 0) {
        html += '<p style="text-align:center;color:var(--success);margin-top:20px">✅ สต๊อกครบ ไม่ต้องซื้ออะไร</p>';
    } else {
        lowItems.forEach(item => {
            const status = item.qty <= 0 ? 'low' : 'warn';
            const need = item.min - item.qty + 1;
            html += `<div class="stock-item ${status}">
                <span class="qty ${status}">${item.qty}</span>
                <span class="name">${esc(item.name)}</span>
                <span class="min-label">${esc(item.cat)}</span>
                <span class="badge-low">ซื้อ ${need}+</span>
            </div>`;
        });
        html += `<button class="btn btn-outline mt-2" onclick="copyShopping()">📋 คัดลอกรายการ</button>`;
    }

    app.innerHTML = html;
}

function copyShopping() {
    const lines = [];
    state.categories.forEach(cat => {
        cat.items.forEach(item => {
            if (item.qty <= item.min) {
                const need = item.min - item.qty + 1;
                lines.push(`☐ ${item.name} (ซื้อ ${need}+)`);
            }
        });
    });
    navigator.clipboard.writeText(lines.join('\n')).then(() => toast('คัดลอกรายการแล้ว'));
}

// --- Toggle ---
function toggleCat(ci) {
    if (collapsed.has(ci)) collapsed.delete(ci); else collapsed.add(ci);
    render();
}

// --- Actions ---
function changeQty(ci, ii, delta) {
    const item = state.categories[ci].items[ii];
    item.qty = Math.max(0, item.qty + delta);
    save();
    render();
}

function saveEditItem(ci, ii) {
    const name = document.getElementById('eName').value.trim();
    if (!name) return;
    state.categories[ci].items[ii].name = name;
    state.categories[ci].items[ii].qty = Math.max(0, parseInt(document.getElementById('eQty').value) || 0);
    state.categories[ci].items[ii].min = Math.max(0, parseInt(document.getElementById('eMin').value) || 0);
    editingItem = null;
    save();
    render();
}

function doAddItem(ci) {
    const name = document.getElementById('aName').value.trim();
    if (!name) return;
    const qty = Math.max(0, parseInt(document.getElementById('aQty').value) || 0);
    const min = Math.max(0, parseInt(document.getElementById('aMin').value) || 0);
    state.categories[ci].items.push({ name, qty, min });
    editingItem = null;
    save();
    render();
}

function doDeleteItem(ci, ii) {
    state.categories[ci].items.splice(ii, 1);
    confirmDelete = null;
    save();
    render();
}

function addCategory() {
    const name = document.getElementById('newCatName').value.trim();
    if (!name) return;
    state.categories.push({ id: 'c' + Date.now(), name, items: [] });
    save();
    render();
}

function doDeleteCat(ci) {
    state.categories.splice(ci, 1);
    confirmDeleteCat = null;
    save();
    render();
}

function countLow() {
    let count = 0;
    state.categories.forEach(cat => {
        cat.items.forEach(item => { if (item.qty <= item.min) count++; });
    });
    return count;
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

render();
