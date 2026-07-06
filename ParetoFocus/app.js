// ParetoFocus — Vanilla JS
const $ = id => document.getElementById(id);
const app = $('app');
const STORAGE_KEY = 'paretofocus_data';

const sections = [
    { key: 'sec1', icon: '💼', title: 'งานสร้างเงิน' },
    { key: 'sec2', icon: '💰', title: 'เงินสร้างตัว' },
    { key: 'sec3', icon: '❤️', title: 'พลังชีวิต' },
    { key: 'sec4', icon: '🏠', title: 'พื้นที่ชีวิต' },
    { key: 'warn', icon: '⚠️', title: 'สิ่งที่ต้องตัดทิ้ง' },
];

const defaults = {
    sec1: [
        '[รายได้หลัก] ทุ่มพลังสมองช่วง Prime Time ให้งานประจำเต็มที่',
        '[ธุรกิจขายของ] เช็กยอดขายและจัดการสต็อกสินค้าเป็นรอบเวลาท้ายวัน',
        '[ระบบปล่อยกู้] คัดกรองและเคลียร์บัญชีเงินกู้ตามดิวที่กำหนดไว้',
        '[จัดแข่งแบด] ใช้ระบบ Spreadsheet อัตโนมัติคุมแมตช์เพื่อประหยัดแรง',
    ],
    sec2: [
        '[หักออมก่อน] ตั้งระบบตัดเงินเก็บอัตโนมัติทันทีที่รายได้เข้ามา',
        '[สะสมทองคำ] แบ่งเงินซื้อทองคำ 96.5% สะสมเพื่อความมั่นคงระยะยาว',
        '[ออมสินทรัพย์] จัดสรรเงินเข้าหุ้นสหกรณ์และกองทุนสำรองเลี้ยงชีพ',
        '[ดูแลครอบครัว] ล็อกงบแยกสำหรับดูแลพ่อแม่และทุนการศึกษาหลาน',
    ],
    sec3: [
        '[เล่นกีฬา] ล็อกวันและเวลาสำหรับไปเล่นแบดมินตันเพื่อคลายเครียด',
        '[ชาร์จพลังใจ] จัดเวลาอยู่เงียบๆ หรือไปพักผ่อนกับธรรมชาติและเสียงน้ำ',
        '[คุมเวลานอน] รักษาเวลาเข้านอนและตื่นนอนให้คงที่เพื่อให้ร่างกายฟื้นฟู',
        '[กรองความสัมพันธ์] เลือกอยู่กับคนที่สร้างพลังบวกและพาเติบโต',
        '[คุมอาหาร] ลดน้ำตาลและอาหารแปรรูป พร้อมดื่มน้ำให้เพียงพอ',
    ],
    sec4: [
        '[โต๊ะทำงาน] เคลียร์สิ่งของบนโต๊ะให้โล่ง เหลือเฉพาะสิ่งที่ต้องใช้จริง',
        '[จัดระเบียบห้อง] คัดแยกของที่ไม่จำเป็นออกไป ให้พื้นที่ดูคลีนและมินิมอล',
        '[หน้าจอมือถือ] ลบแอปที่ไม่ได้ใช้ จัดหน้าโฮมให้เหลือเฉพาะแอปหลัก',
        '[ของใช้หลัก] แยกของใช้ที่หยิบใช้บ่อย 20% ให้อยู่ในจุดที่หยิบง่ายที่สุด',
    ],
    warn: [
        '[ดราม่า & พลังลบ] ดราม่าออนไลน์ เรื่องซุบซิบ ข่าวบันเทิง หรือการบ่นที่ไม่มีทางแก้ไข',
        '[ความสัมพันธ์ดูดพลัง] คนที่ทักมาเฉพาะตอนเดือดร้อน คนที่ชอบเรียกร้องความสนใจ',
        '[งาน/กิจกรรมนอกเป้าหมาย] โปรเจกต์ที่ไม่สร้างเงินและไม่เติมพลัง',
        '[สิ่งของและดิจิทัลรก] แอปหรือแชทกลุ่มที่ไม่ได้เปิดดูแต่คอยแจ้งเตือนรบกวนสมาธิ',
    ],
};

let data = {};
let ui = { collapsed: {}, editingItem: null, confirmDelete: null };

function load() {
    try {
        const d = JSON.parse(localStorage.getItem(STORAGE_KEY));
        if (d && Object.keys(d).length) { data = d; return; }
    } catch {}
    data = JSON.parse(JSON.stringify(defaults));
    save();
}
function save() { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); }

function render() {
    let html = `<h4 class="text-center mb-3">⚡ 80/20 Focus</h4>
        <p class="text-center text-muted mb-3" style="font-size:0.82rem">โฟกัส 20% ที่สร้างผลลัพธ์ 80%</p>`;

    sections.forEach(s => {
        const items = data[s.key] || [];
        const collapsed = ui.collapsed[s.key];
        html += `<div class="card mb-2">
            <div class="section-header flex items-center gap-2" onclick="toggle('${s.key}')">
                <span>${collapsed ? '▶' : '▼'}</span>
                <span>${s.icon} ${s.title}</span>
                <small class="ml-auto" style="color:var(--accent)">(${items.length})</small>
            </div>`;

        if (!collapsed) {
            html += `<div class="mt-2">`;
            items.forEach((item, i) => {
                if (ui.editingItem && ui.editingItem.key === s.key && ui.editingItem.idx === i) {
                    html += `<div class="flex gap-1 mb-1">
                        <input id="edit-input" value="${esc(item)}" style="flex:1" onkeydown="if(event.key==='Enter')saveEdit()">
                        <button class="btn btn-sm btn-primary" onclick="saveEdit()">✓</button>
                        <button class="btn btn-sm btn-outline" onclick="cancelEdit()">✕</button>
                    </div>`;
                } else if (ui.confirmDelete && ui.confirmDelete.key === s.key && ui.confirmDelete.idx === i) {
                    html += `<div class="flex items-center gap-1 mb-1" style="font-size:0.85rem">
                        <span style="flex:1;color:var(--primary)">ลบ?</span>
                        <button class="btn btn-sm btn-danger" onclick="doDelete('${s.key}',${i})">ยืนยัน</button>
                        <button class="btn btn-sm btn-outline" onclick="cancelDelete()">✕</button>
                    </div>`;
                } else {
                    html += `<div class="flex items-center gap-1 mb-1" style="font-size:0.85rem">
                        <span style="flex:1;cursor:pointer" onclick="startEdit('${s.key}',${i})">${esc(item)}</span>
                        <button class="btn btn-sm btn-outline-danger" onclick="askDelete('${s.key}',${i})">✕</button>
                    </div>`;
                }
            });
            html += `<div class="input-group mt-1">
                <input id="add-${s.key}" placeholder="เพิ่มรายการ..." onkeydown="if(event.key==='Enter')addItem('${s.key}')">
                <button class="btn btn-primary" onclick="addItem('${s.key}')">+</button>
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
    if (!data[key]) data[key] = [];
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
        <p><strong>80/20 Focus</strong></p>
        <small>กฎพาเรโต โฟกัสสิ่งสำคัญ ใช้ฟรี ไม่มีโฆษณา</small><br>
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
