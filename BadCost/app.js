// BadCost — Vanilla JS
const $ = id => document.getElementById(id);
const app = $('app');
const STORAGE_KEY = 'badcost_data';

let data = { courtFee: '', discount: '', shuttlePrice: '', matches: [] };
let ui = { editingMatch: null, confirmDelete: null, confirmReset: false };

function load() { try { const d = JSON.parse(localStorage.getItem(STORAGE_KEY)); if (d) data = d; } catch {} }
function save() { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); }

function getLastPrice() {
    if (data.matches.length) return data.matches[data.matches.length - 1].price;
    return data.shuttlePrice || '';
}

function render() {
    const courtFee = parseFloat(data.courtFee) || 0;
    const discount = parseFloat(data.discount) || 0;
    const shuttleCost = data.matches.reduce((s, m) => s + m.shuttles * m.price, 0);
    const totalShuttles = data.matches.reduce((s, m) => s + m.shuttles, 0);
    const total = courtFee + shuttleCost - discount;

    let html = `<h4 class="text-center mb-3">🏸 BadCost</h4>`;

    // Settings
    html += `<div class="card mb-2">
        <div class="flex gap-1 mb-1">
            <div style="flex:1"><label class="form-label">ค่าสนาม/คน</label>
                <input id="courtFee" type="tel" inputmode="numeric" value="${data.courtFee}" oninput="data.courtFee=this.value;save();updateSummary()"></div>
            <div style="flex:1"><label class="form-label">ส่วนลด</label>
                <input id="discount" type="tel" inputmode="numeric" value="${data.discount}" oninput="data.discount=this.value;save();updateSummary()"></div>
        </div>
    </div>`;

    // Add match
    html += `<div class="card mb-2">
        <label class="form-label">บันทึกแมทช์</label>
        <div class="flex gap-1">
            <div style="flex:1"><input id="m-shuttles" type="tel" inputmode="numeric" placeholder="ลูก"></div>
            <div style="flex:1"><input id="m-price" type="tel" inputmode="numeric" placeholder="ราคา/ลูก" value="${getLastPrice()}"></div>
            <button class="btn btn-primary btn-sm" onclick="addMatch()">+ บันทึก</button>
        </div>
    </div>`;

    // Match list
    if (data.matches.length) {
        html += `<div class="card mb-2">`;
        data.matches.forEach((m, i) => {
            const cost = m.shuttles * m.price;
            if (ui.editingMatch === i) {
                html += `<div class="flex gap-1 items-center mb-1">
                    <input id="em-sh" type="tel" inputmode="numeric" value="${m.shuttles}" style="width:50px" class="inline-edit">
                    <span>×</span>
                    <input id="em-pr" type="tel" inputmode="numeric" value="${m.price}" style="width:60px" class="inline-edit">
                    <button class="btn btn-sm btn-primary" onclick="saveMatch(${i})">✓</button>
                    <button class="btn btn-sm btn-outline" onclick="ui.editingMatch=null;render()">✕</button>
                </div>`;
            } else if (ui.confirmDelete === i) {
                html += `<div class="flex gap-1 items-center mb-1" style="font-size:0.85rem">
                    <span style="flex:1;color:var(--primary)">ลบแมทช์ #${i + 1}?</span>
                    <button class="btn btn-sm btn-danger" onclick="doDelete(${i})">ยืนยัน</button>
                    <button class="btn btn-sm btn-outline" onclick="ui.confirmDelete=null;render()">✕</button>
                </div>`;
            } else {
                html += `<div class="flex items-center gap-2 mb-1" style="font-size:0.85rem">
                    <span style="flex:1;cursor:pointer" onclick="ui.editingMatch=${i};render()">#${i + 1}: ${m.shuttles} ลูก × ${m.price} = ${cost}</span>
                    <button class="btn btn-sm btn-outline-danger" onclick="ui.confirmDelete=${i};render()">✕</button>
                </div>`;
            }
        });
        html += `</div>`;
    }

    // Summary
    html += `<div class="card mb-2" id="summary-card">
        <label class="form-label">สรุป</label>
        <div style="font-size:0.9rem">
            <p>ค่าสนาม: <strong>${courtFee.toLocaleString()}</strong></p>
            <p>ค่าลูก: ${totalShuttles} ลูก = <strong>${shuttleCost.toLocaleString()}</strong></p>
            ${discount > 0 ? `<p>ส่วนลด: <strong>-${discount.toLocaleString()}</strong></p>` : ''}
            <hr>
            <p style="font-size:1.1rem">💰 รวมจ่าย: <strong style="color:var(--primary)">${total.toLocaleString()}</strong> บาท</p>
        </div>
    </div>`;

    // Reset
    if (data.matches.length) {
        if (ui.confirmReset) {
            html += `<div class="flex gap-1 items-center">
                <span style="font-size:0.85rem;color:var(--primary)">ล้างแมทช์ทั้งหมด?</span>
                <button class="btn btn-sm btn-danger" onclick="doReset()">ยืนยัน</button>
                <button class="btn btn-sm btn-outline" onclick="ui.confirmReset=false;render()">ยกเลิก</button>
            </div>`;
        } else {
            html += `<button class="btn btn-outline-danger btn-sm" onclick="ui.confirmReset=true;render()">🔄 รีเซ็ตแมทช์</button>`;
        }
    }

    // Footer
    html += `<div class="text-center text-muted mt-3" style="border-top:2px solid #D4DBDF;padding-top:16px">
        <p><strong>BadCost</strong></p>
        <small>คำนวณค่าตีแบด ใช้ฟรี ไม่มีโฆษณา</small><br>
        <small>สร้างโดย Mana11Lab</small><br>
        <div class="mt-2">
            <a href="https://promptpay.io/0923959404" target="_blank" class="btn btn-sm btn-outline-warning">☕ เลี้ยงน้ำหวานผ่าน PromptPay</a>
        </div>
        <button class="btn btn-sm btn-outline" onclick="copyLink()" style="margin-top:8px">📎 แชร์แอพนี้</button>
    </div>`;

    app.innerHTML = html;
}

function updateSummary() { /* summary updates on next render, but for live update: */ }

function addMatch() {
    const shuttles = parseInt($('m-shuttles').value) || 0;
    const price = parseFloat($('m-price').value) || 0;
    if (shuttles <= 0) return;
    data.matches.push({ shuttles, price });
    data.shuttlePrice = price.toString();
    save(); render();
}

function saveMatch(i) {
    data.matches[i].shuttles = parseInt($('em-sh').value) || 0;
    data.matches[i].price = parseFloat($('em-pr').value) || 0;
    ui.editingMatch = null;
    save(); render();
}

function doDelete(i) {
    data.matches.splice(i, 1);
    ui.confirmDelete = null;
    save(); render();
}

function doReset() {
    data.matches = [];
    ui.confirmReset = false;
    save(); render();
}

load();
render();

function copyLink() {
    navigator.clipboard.writeText(location.href).then(() => {
        let t = document.getElementById('toast');
        if (!t) { t = document.createElement('div'); t.id = 'toast'; document.body.appendChild(t); }
        t.innerHTML = '<div class="alert alert-success">คัดลอกลิงก์แล้ว</div>';
        t.style.display = 'block';
        setTimeout(() => t.style.display = 'none', 2000);
    });
}
