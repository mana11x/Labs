// MiniCalc — Vanilla JS
const $ = id => document.getElementById(id);
const app = $('app');

// Storage
function loadInputs() { try { return JSON.parse(localStorage.getItem('minicalc_inputs')) || {}; } catch { return {}; } }
function saveInput(key, val) { const d = loadInputs(); d[key] = val; localStorage.setItem('minicalc_inputs', JSON.stringify(d)); }
function getInput(key, def) { return loadInputs()[key] ?? def; }

// Router
function route() {
    const hash = location.hash.slice(1) || 'budget';
    document.querySelectorAll('.bottom-nav a').forEach(a => {
        a.classList.toggle('active', a.getAttribute('href') === '#' + hash);
    });
    const routes = { budget: renderBudget, sixjars: renderSixJars, percent: renderPercent };
    (routes[hash] || renderBudget)();
}
window.addEventListener('hashchange', route);
window.addEventListener('load', route);

// === BUDGET ===
function renderBudget() {
    app.innerHTML = `
        <h4 class="text-center mb-3">💰 คำนวณงบ</h4>
        <div class="card">
            <label class="form-label">ยอดคงเหลือ (Balance)</label>
            <input id="b-balance" type="tel" inputmode="numeric" placeholder="0" value="${getInput('b-balance','')}" oninput="saveInput('b-balance',this.value)" class="mb-2">
            <label class="form-label">งบต่อวัน (Per Day)</label>
            <input id="b-perday" type="tel" inputmode="numeric" placeholder="0" value="${getInput('b-perday','')}" oninput="saveInput('b-perday',this.value)" class="mb-2">
            <button class="btn btn-primary" onclick="calcBudget()">คำนวณ</button>
            <div id="b-result" class="mt-2"></div>
        </div>
        ${footer()}`;
}

function calcBudget() {
    const balance = parseFloat($('b-balance').value) || 0;
    const perDay = parseFloat($('b-perday').value) || 0;
    const today = new Date();
    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    const dayRemain = daysInMonth - today.getDate();

    let html = `<hr><p>📅 วันที่เหลือในเดือน: <strong>${dayRemain}</strong> วัน</p>`;
    if (dayRemain <= 0) {
        html += `<p>วันสุดท้ายของเดือนแล้ว!</p><p>ยอดคงเหลือ: <strong>${balance.toLocaleString()}</strong></p>`;
    } else {
        const perDayResult = balance / dayRemain;
        const over = balance - (dayRemain * perDay);
        html += `<p>💵 ใช้ได้วันละ: <strong>${Math.round(perDayResult).toLocaleString()}</strong> บาท</p>`;
        html += `<p>${over >= 0 ? '✅' : '⚠️'} ส่วนเกิน: <strong style="color:${over >= 0 ? 'var(--accent)' : 'var(--primary)'}">${Math.round(over).toLocaleString()}</strong> บาท</p>`;
    }
    $('b-result').innerHTML = html;
}

// === SIX JARS ===
function renderSixJars() {
    app.innerHTML = `
        <h4 class="text-center mb-3">🏺 6 Jars</h4>
        <div class="card">
            <label class="form-label">รายได้ (Income)</label>
            <input id="sj-income" type="tel" inputmode="numeric" placeholder="0" value="${getInput('sj-income','')}" oninput="saveInput('sj-income',this.value)" class="mb-2">
            <button class="btn btn-primary" onclick="calcJars()">คำนวณ</button>
            <div id="sj-result" class="mt-2"></div>
        </div>
        ${footer()}`;
}

function calcJars() {
    const income = parseFloat($('sj-income').value) || 0;
    const jars = [
        { code: 'NECE', pct: 55, desc: 'ใช้ตามจำเป็น', icon: '🏠' },
        { code: 'PLAY', pct: 10, desc: 'ให้รางวัลตัวเอง', icon: '🎉' },
        { code: 'FREE', pct: 10, desc: 'อิสรภาพการเงิน', icon: '💎' },
        { code: 'EDUC', pct: 10, desc: 'การศึกษา พัฒนาตัวเอง', icon: '📚' },
        { code: 'LTSS', pct: 10, desc: 'ออมระยะยาว', icon: '🏦' },
        { code: 'GIVE', pct: 5, desc: 'บริจาค ให้ส่วนรวม', icon: '🤝' },
    ];
    let html = '<hr>';
    jars.forEach(j => {
        const amt = income * j.pct / 100;
        html += `<div class="flex items-center gap-2 mb-1" style="font-size:0.9rem">
            <span>${j.icon}</span>
            <strong style="min-width:50px">${j.code}</strong>
            <span>[${j.pct}%]</span>
            <span class="ml-auto" style="color:var(--primary);font-weight:600">${amt.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 0})}</span>
        </div>
        <small class="text-muted" style="margin-left:28px">${j.desc}</small>
        <div class="bar-bg mb-2"><div class="bar-fill" style="width:${j.pct}%"></div></div>`;
    });
    $('sj-result').innerHTML = html;
}

// === PERCENT CALC ===
let percentMode = parseInt(getInput('percentMode', 1));

function renderPercent() {
    app.innerHTML = `
        <h4 class="text-center mb-3">📊 %Calc</h4>
        <div class="flex gap-1 mb-3">
            <button class="btn ${percentMode === 1 ? 'btn-primary' : 'btn-outline'}" style="flex:1" onclick="percentMode=1;saveInput('percentMode',1);renderPercent()">หา %เปลี่ยนแปลง</button>
            <button class="btn ${percentMode === 2 ? 'btn-primary' : 'btn-outline'}" style="flex:1" onclick="percentMode=2;saveInput('percentMode',2);renderPercent()">หายอดจาก %</button>
        </div>
        <div class="card">
            ${percentMode === 1 ? renderMode1() : renderMode2()}
        </div>
        ${footer()}`;
}

function renderMode1() {
    return `
        <label class="form-label">ค่าเดิม</label>
        <input id="pc-old" type="tel" inputmode="numeric" placeholder="0" value="${getInput('pc-old','')}" oninput="saveInput('pc-old',this.value)" class="mb-2">
        <label class="form-label">ค่าใหม่</label>
        <input id="pc-new" type="tel" inputmode="numeric" placeholder="0" value="${getInput('pc-new','')}" oninput="saveInput('pc-new',this.value)" class="mb-2">
        <button class="btn btn-primary" onclick="calcMode1()">คำนวณ</button>
        <div id="pc-result" class="mt-2"></div>`;
}

function renderMode2() {
    return `
        <label class="form-label">ค่าเดิม</label>
        <input id="pc-base" type="tel" inputmode="numeric" placeholder="0" value="${getInput('pc-base','')}" oninput="saveInput('pc-base',this.value)" class="mb-2">
        <label class="form-label">เปอร์เซ็นต์ (%)</label>
        <input id="pc-pct" type="tel" inputmode="numeric" placeholder="0" value="${getInput('pc-pct','')}" oninput="saveInput('pc-pct',this.value)" class="mb-2">
        <div class="flex gap-1 mb-2" id="dir-buttons">
            <button class="btn btn-sm ${percentDir === 'up' ? 'btn-primary' : 'btn-outline'}" onclick="setDir('up')">เพิ่มขึ้น</button>
            <button class="btn btn-sm ${percentDir === 'down' ? 'btn-primary' : 'btn-outline'}" onclick="setDir('down')">ลดลง</button>
        </div>
        <button class="btn btn-primary" onclick="calcMode2()">คำนวณ</button>
        <div id="pc-result2" class="mt-2"></div>`;
}

function setDir(dir) {
    percentDir = dir;
    saveInput('percentDir', dir);
    $('dir-buttons').innerHTML = `
        <button class="btn btn-sm ${percentDir === 'up' ? 'btn-primary' : 'btn-outline'}" onclick="setDir('up')">เพิ่มขึ้น</button>
        <button class="btn btn-sm ${percentDir === 'down' ? 'btn-primary' : 'btn-outline'}" onclick="setDir('down')">ลดลง</button>`;
}

let percentDir = getInput('percentDir', 'up');

function calcMode1() {
    const oldVal = parseFloat($('pc-old').value) || 0;
    const newVal = parseFloat($('pc-new').value) || 0;
    if (oldVal === 0) return;
    const pct = (newVal - oldVal) / oldVal * 100;
    const dir = pct >= 0 ? 'เพิ่มขึ้น ↑' : 'ลดลง ↓';
    const color = pct >= 0 ? 'var(--accent)' : 'var(--primary)';
    $('pc-result').innerHTML = `<hr><p style="font-size:1.1rem">${dir} <strong style="color:${color}">${Math.abs(pct).toFixed(2)}%</strong></p>`;
}

function calcMode2() {
    const base = parseFloat($('pc-base').value) || 0;
    const pct = parseFloat($('pc-pct').value) || 0;
    const diff = base * pct / 100;
    const total = percentDir === 'up' ? base + diff : base - diff;
    const sign = percentDir === 'up' ? '+' : '-';
    $('pc-result2').innerHTML = `<hr>
        <p>ส่วนต่าง: <strong>${sign}${diff.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</strong> บาท</p>
        <p>ยอดรวมใหม่: <strong style="color:var(--primary)">${total.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</strong> บาท</p>`;
}

// Footer
function footer() {
    return `<div class="text-center text-muted mt-3" style="border-top:2px solid #D4DBDF;padding-top:16px">
        <p><strong>MiniCalc</strong></p>
        <small>เครื่องคิดเลขจิ๋ว ใช้ฟรี ไม่มีโฆษณา</small><br>
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
