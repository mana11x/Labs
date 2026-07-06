// CardBank-v2 — Vanilla JS
const $ = id => document.getElementById(id);
const app = $('app');

const STORAGE_KEY = 'CardBank_Session';

function loadSession() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || defaultSession(); } catch { return defaultSession(); }
}
function defaultSession() { return { players: [], logs: [], presets: [100, 500, 1000], isActive: true }; }
function saveSession() { localStorage.setItem(STORAGE_KEY, JSON.stringify(session)); }

let session = loadSession();
let ui = { confirmResetId: null, confirmDeleteId: null, confirmResetAll: false, confirmEndGame: false, customAmounts: {}, confirmDeletePreset: null, confirmNewGame: false };

// Toast
function toast(msg) {
    let t = $('toast');
    if (!t) { t = document.createElement('div'); t.id = 'toast'; document.body.appendChild(t); }
    t.innerHTML = `<div class="alert alert-success">${msg}</div>`;
    t.style.display = 'block';
    setTimeout(() => t.style.display = 'none', 2000);
}

// Router
function route() {
    const hash = location.hash.slice(1) || 'play';
    document.querySelectorAll('.bottom-nav a').forEach(a => {
        a.classList.toggle('active', a.getAttribute('href') === '#' + hash);
    });
    const routes = { play: renderPlay, summary: renderSummary, settings: renderSettings };
    (routes[hash] || renderPlay)();
}
window.addEventListener('hashchange', route);
window.addEventListener('load', route);

// === PLAY ===
function renderPlay() {
    let html = `<h4 class="text-center mb-3">🃏 Chip Table</h4>`;

    if (session.isActive) {
        html += `<div class="input-group mb-3">
            <input id="newPlayer" placeholder="ชื่อผู้เล่น" onkeydown="if(event.key==='Enter')addPlayer()">
            <button class="btn btn-primary" onclick="addPlayer()">+ เพิ่ม</button>
        </div>`;

        session.players.forEach(p => {
            const custom = ui.customAmounts[p.id] || 0;
            html += `<div class="card mb-2">
                <div class="flex items-center mb-2" style="justify-content:space-between">
                    <strong>${p.name}</strong>
                    <span class="badge badge-member" style="font-size:1rem">${p.chipBalance}</span>
                </div>
                <div class="flex flex-wrap gap-1 mb-1">`;
            session.presets.forEach(amt => {
                html += `<button class="btn btn-sm btn-primary" onclick="borrow('${p.id}',${amt})">+${amt}</button>
                    <button class="btn btn-sm btn-outline-warning" onclick="returnChip('${p.id}',${amt})">-${amt}</button>`;
            });
            html += `</div>
                <div class="flex items-center gap-1 mt-1">
                    <input type="tel" inputmode="numeric" style="width:70px;text-align:center" class="inline-edit" value="${custom}" onchange="setCustom('${p.id}',this.value)">
                    <button class="btn btn-sm btn-primary" onclick="borrowCustom('${p.id}')">เบิก</button>
                    <button class="btn btn-sm btn-outline-warning" onclick="returnCustom('${p.id}')">คืน</button>`;

            // Reset
            if (ui.confirmResetId === p.id) {
                html += `<button class="btn btn-sm btn-secondary ml-auto" onclick="confirmReset('${p.id}')">ยืนยัน?</button>
                    <button class="btn btn-sm btn-outline" onclick="ui.confirmResetId=null;render()">✕</button>`;
            } else {
                html += `<button class="btn btn-sm btn-outline ml-auto" onclick="askReset('${p.id}')">รีเซต</button>`;
            }

            // Delete
            if (ui.confirmDeleteId === p.id) {
                html += `<button class="btn btn-sm btn-danger" onclick="confirmDelete('${p.id}')">ลบ?</button>
                    <button class="btn btn-sm btn-outline" onclick="ui.confirmDeleteId=null;render()">✕</button>`;
            } else {
                html += `<button class="btn btn-sm btn-outline-danger" onclick="askDelete('${p.id}')">ลบ</button>`;
            }

            html += `</div></div>`;
        });

        // Bottom actions
        html += `<div class="flex gap-1 mt-3">
            <button class="btn btn-secondary" style="flex:1" onclick="undo()" ${session.logs.length === 0 ? 'disabled' : ''}>↩ Undo</button>`;

        if (ui.confirmResetAll) {
            html += `<button class="btn btn-secondary" style="flex:1" onclick="doResetAll()">ยืนยันรีเซต?</button>
                <button class="btn btn-outline" onclick="ui.confirmResetAll=false;render()">✕</button>`;
        } else {
            html += `<button class="btn btn-outline" style="flex:1" onclick="ui.confirmResetAll=true;render()">รีเซตทั้งหมด</button>`;
        }

        if (ui.confirmEndGame) {
            html += `<button class="btn btn-danger" style="flex:1" onclick="endGame()">ยืนยันเลิก?</button>
                <button class="btn btn-outline" onclick="ui.confirmEndGame=false;render()">✕</button>`;
        } else {
            html += `<button class="btn btn-outline-danger" style="flex:1" onclick="ui.confirmEndGame=true;render()">เลิกเล่น</button>`;
        }
        html += `</div>`;
    } else {
        html += `<div class="text-center mt-3"><p class="text-muted mb-2">ยังไม่มีเกม</p>`;
        if (ui.confirmNewGame) {
            html += `<p style="font-size:0.85rem;color:var(--primary)">เริ่มเกมใหม่? (ข้อมูลเก่าจะหาย)</p>
                <button class="btn btn-primary" onclick="newGame()">ยืนยัน</button>
                <button class="btn btn-outline" onclick="ui.confirmNewGame=false;render()">ยกเลิก</button>`;
        } else {
            html += `<button class="btn btn-primary btn-lg" onclick="newGameAsk()">เริ่มเกมใหม่</button>`;
        }
        html += `</div>`;
    }

    // Footer
    html += `<div class="text-center text-muted mt-3" style="border-top:2px solid #D4DBDF;padding-top:16px">
        <p><strong>CardBank</strong></p>
        <small>แอพจัดการ Chip วงไพ่ ใช้ฟรี ไม่มีโฆษณา</small><br>
        <small>สร้างโดย Mana11Lab</small><br>
        <div class="mt-2">
            <a href="https://promptpay.io/0923959404" target="_blank" class="btn btn-sm btn-outline-warning">☕ เลี้ยงน้ำหวานผ่าน PromptPay</a>
        </div>
        <button class="btn btn-sm btn-outline" onclick="copyLink()" style="margin-top:8px">📎 แชร์แอพนี้</button>
    </div>`;

    app.innerHTML = html;
}

function addPlayer() {
    const el = $('newPlayer');
    const name = el.value.trim();
    if (!name) return;
    session.players.push({ id: Date.now().toString(36), name, chipBalance: 0, totalBorrowed: 0, totalReturned: 0 });
    el.value = '';
    saveSession(); render();
}

function borrow(id, amt) {
    const p = session.players.find(x => x.id === id);
    p.chipBalance += amt;
    p.totalBorrowed += amt;
    session.logs.push({ playerId: id, amount: amt, ts: Date.now() });
    saveSession(); render();
}

function returnChip(id, amt) {
    const p = session.players.find(x => x.id === id);
    p.chipBalance -= amt;
    p.totalReturned += amt;
    session.logs.push({ playerId: id, amount: -amt, ts: Date.now() });
    saveSession(); render();
}

function setCustom(id, val) { ui.customAmounts[id] = parseInt(val) || 0; }

function borrowCustom(id) {
    const amt = ui.customAmounts[id] || 0;
    if (amt > 0) borrow(id, amt);
}

function returnCustom(id) {
    const amt = ui.customAmounts[id] || 0;
    if (amt > 0) returnChip(id, amt);
}

function undo() {
    if (!session.logs.length) return;
    const last = session.logs.pop();
    const p = session.players.find(x => x.id === last.playerId);
    if (p) {
        p.chipBalance -= last.amount;
        if (last.amount > 0) p.totalBorrowed -= last.amount;
        else p.totalReturned -= (-last.amount);
    }
    saveSession(); render();
    toast('Undo แล้ว');
}

function askReset(id) { ui.confirmResetId = id; render(); }
function confirmReset(id) {
    const p = session.players.find(x => x.id === id);
    p.chipBalance = 0; p.totalBorrowed = 0; p.totalReturned = 0;
    session.logs = session.logs.filter(l => l.playerId !== id);
    ui.confirmResetId = null;
    saveSession(); render();
}

function askDelete(id) { ui.confirmDeleteId = id; render(); }
function confirmDelete(id) {
    session.players = session.players.filter(x => x.id !== id);
    session.logs = session.logs.filter(l => l.playerId !== id);
    ui.confirmDeleteId = null;
    saveSession(); render();
}

function doResetAll() {
    session.players.forEach(p => { p.chipBalance = 0; p.totalBorrowed = 0; p.totalReturned = 0; });
    session.logs = [];
    ui.confirmResetAll = false;
    saveSession(); render();
}

function endGame() {
    session.isActive = false;
    ui.confirmEndGame = false;
    saveSession(); render();
}

function newGameAsk() {
    if (session.players.length > 0) { ui.confirmNewGame = true; render(); }
    else newGame();
}

function newGame() {
    const presets = session.presets;
    session = { players: [], logs: [], presets, isActive: true };
    ui.confirmNewGame = false;
    saveSession(); render();
}

// === SUMMARY ===
function renderSummary() {
    let html = `<h4 class="text-center mb-3">📊 สรุปผล</h4>`;

    if (!session.players.length) {
        html += `<p class="text-center text-muted">ยังไม่มีข้อมูล</p>`;
    } else {
        session.players.forEach(p => {
            const net = p.totalReturned - p.totalBorrowed;
            html += `<div class="card mb-2">
                <div class="flex items-center" style="justify-content:space-between">
                    <strong>${p.name}</strong>
                    <span class="badge ${net >= 0 ? 'badge-hub' : 'badge-member'}" style="background:${net >= 0 ? 'var(--accent)' : 'var(--primary)'}">${net >= 0 ? '+' : ''}${net}</span>
                </div>
                <div class="flex gap-2 mt-1" style="font-size:0.82rem;color:var(--accent)">
                    <span>เบิก: ${p.totalBorrowed}</span>
                    <span>คืน: ${p.totalReturned}</span>
                    <span>ถือ: ${p.chipBalance}</span>
                </div>
            </div>`;
        });

        if (!session.isActive) {
            html += `<button class="btn btn-primary mt-3" onclick="newGameFromSummary()">เริ่มเกมใหม่</button>`;
        }
    }

    app.innerHTML = html;
}

function newGameFromSummary() { newGame(); location.hash = '#play'; }

// === SETTINGS ===
function renderSettings() {
    let html = `<h4 class="text-center mb-3">⚙️ ตั้งค่า Preset</h4>
        <div class="input-group mb-3">
            <input id="newPreset" type="tel" inputmode="numeric" placeholder="จำนวน" onkeydown="if(event.key==='Enter')addPreset()">
            <button class="btn btn-primary" onclick="addPreset()">+ เพิ่ม</button>
        </div>`;

    session.presets.forEach(amt => {
        html += `<div class="card mb-2">
            <div class="flex items-center" style="justify-content:space-between">
                <strong>${amt}</strong>`;
        if (ui.confirmDeletePreset === amt) {
            html += `<div class="flex gap-1">
                <button class="btn btn-sm btn-danger" onclick="doRemovePreset(${amt})">ยืนยัน</button>
                <button class="btn btn-sm btn-outline" onclick="ui.confirmDeletePreset=null;render()">ยกเลิก</button>
            </div>`;
        } else {
            html += `<button class="btn btn-sm btn-outline-danger" onclick="ui.confirmDeletePreset=${amt};render()">ลบ</button>`;
        }
        html += `</div></div>`;
    });

    app.innerHTML = html;
}

function addPreset() {
    const el = $('newPreset');
    const val = parseInt(el.value) || 0;
    if (val > 0 && !session.presets.includes(val)) {
        session.presets.push(val);
        session.presets.sort((a, b) => a - b);
        el.value = '';
        saveSession(); render();
    }
}

function doRemovePreset(amt) {
    session.presets = session.presets.filter(x => x !== amt);
    ui.confirmDeletePreset = null;
    saveSession(); render();
}

// Render alias
function render() { route(); }

function copyLink() {
    navigator.clipboard.writeText(location.href).then(() => {
        let t = document.getElementById('toast');
        if (!t) { t = document.createElement('div'); t.id = 'toast'; document.body.appendChild(t); }
        t.innerHTML = '<div class="alert alert-success">คัดลอกลิงก์แล้ว</div>';
        t.style.display = 'block';
        setTimeout(() => t.style.display = 'none', 2000);
    });
}
