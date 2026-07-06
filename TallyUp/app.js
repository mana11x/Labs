// === State ===
let session = { players: [], rounds: [], presets: [10, 50, 100], lastDealerId: null };
let ui = { dealerId: null, activePreset: 10, roundInputs: {}, confirmReset: false, confirmClear: false, editingRound: null, editValues: {}, confirmDeleteRound: null, confirmDeletePreset: null, confirmDeletePlayer: null, editingPlayer: null, newPreset: '' };

// === Storage ===
const STORAGE_KEY = 'TallyUp_Session';
function save() { localStorage.setItem(STORAGE_KEY, JSON.stringify(session)); }
function load() {
    try { const d = JSON.parse(localStorage.getItem(STORAGE_KEY)); if (d) session = d; } catch {}
    if (!session.presets) session.presets = [10, 50, 100];
    if (!session.players) session.players = [];
    if (!session.rounds) session.rounds = [];
    ui.dealerId = session.lastDealerId || (session.players[0]?.id || null);
    if (session.presets.length) ui.activePreset = session.presets[0];
}

// === Helpers ===
function esc(s) { return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }
function genId() { return Math.random().toString(36).substr(2, 8); }
function getTotal(playerId) { return session.rounds.reduce((s, r) => s + (r.scores[playerId] || 0), 0); }

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

// === Router ===
function route() {
    const hash = window.location.hash || '#play';
    document.querySelectorAll('.bottom-nav a').forEach(a => a.classList.remove('active'));
    const nav = document.getElementById('nav-' + hash.slice(1));
    if (nav) nav.classList.add('active');

    if (hash === '#play') renderPlay();
    else if (hash === '#history') renderHistory();
    else if (hash === '#summary') renderSummary();
    else if (hash === '#settings') renderSettings();
    else renderPlay();
}

// === Page: Play ===
function renderPlay() {
    const { players } = session;
    let html = `<h4 class="text-center mb-3">🎯 TallyUp</h4>`;

    // Add player
    html += `<div class="input-group mb-3">
        <input id="newPlayer" placeholder="ชื่อผู้เล่น" onkeydown="if(event.key==='Enter')addPlayer()">
        <button class="btn btn-primary" onclick="addPlayer()">+ เพิ่ม</button>
    </div>`;

    if (players.length > 0) {
        // Dealer select
        html += `<div class="card mb-3"><small class="text-muted">เจ้ามือ:</small>
            <div class="flex flex-wrap gap-1 mt-1">`;
        players.forEach(p => {
            html += `<button class="btn btn-sm ${ui.dealerId === p.id ? 'btn-danger' : 'btn-outline'}" onclick="setDealer('${p.id}')">${esc(p.name)}</button>`;
        });
        html += `</div></div>`;

        // Presets
        html += `<div class="card mb-3"><small class="text-muted">ค่า +/- :</small>
            <div class="flex flex-wrap gap-1 mt-1">`;
        session.presets.forEach(amt => {
            html += `<button class="btn btn-sm ${ui.activePreset === amt ? 'btn-primary' : 'btn-outline-primary'}" onclick="setPreset(${amt})">${amt}</button>`;
        });
        html += `</div></div>`;

        // Dealer card
        const dealer = players.find(p => p.id === ui.dealerId);
        if (dealer) {
            const dealerTotal = getTotal(dealer.id);
            const othersSum = players.filter(p => p.id !== ui.dealerId).reduce((s, p) => s + (ui.roundInputs[p.id] || 0), 0);
            const dealerRoundScore = -othersSum;
            html += `<div class="card mb-2" style="border-left:3px solid var(--primary)">
                <div class="flex items-center" style="justify-content:space-between">
                    <strong>👑 ${esc(dealer.name)} <small class="text-muted">(เจ้า)</small></strong>
                    <span class="badge badge-member">รวม ${dealerTotal}</span>
                </div>
                <div class="text-center mt-1">
                    <span class="badge ${dealerRoundScore >= 0 ? 'badge-hub' : 'badge-member'}" style="background:${dealerRoundScore >= 0 ? 'var(--accent)' : 'var(--primary)'}">
                        เกมนี้: ${dealerRoundScore >= 0 ? '+' : ''}${dealerRoundScore}
                    </span>
                    <small class="text-muted"> (อัตโนมัติ)</small>
                </div>
            </div>`;
        }

        // Other players
        players.filter(p => p.id !== ui.dealerId).forEach(p => {
            const total = getTotal(p.id);
            const input = ui.roundInputs[p.id] || 0;
            html += `<div class="card mb-2">`;
            if (ui.editingPlayer === p.id) {
                html += `<div class="input-group mb-1">
                    <input id="editPlayerInput" value="${esc(p.name)}" onkeydown="if(event.key==='Enter')confirmEditPlayerById('${p.id}');if(event.key==='Escape'){ui.editingPlayer=null;render();}">
                    <button class="btn btn-primary" onclick="confirmEditPlayerById('${p.id}')">ตกลง</button>
                </div>
                <div class="flex gap-1">`;
                if (total === 0) {
                    if (ui.confirmDeletePlayer === p.id) {
                        html += `<small>ลบผู้เล่นนี้?</small>
                            <button class="btn btn-sm btn-danger" onclick="doRemovePlayerById('${p.id}')">ยืนยัน</button>`;
                    } else {
                        html += `<button class="btn btn-sm btn-outline-danger" onclick="ui.confirmDeletePlayer='${p.id}';render()">✕ ลบ</button>`;
                    }
                }
                html += `<button class="btn btn-sm btn-outline" onclick="ui.editingPlayer=null;ui.confirmDeletePlayer=null;render()">ยกเลิก</button>
                </div>`;
            } else {
                html += `<div class="flex items-center mb-1" style="justify-content:space-between">
                    <strong onclick="startEditPlayerById('${p.id}')" style="cursor:pointer">${esc(p.name)}</strong>
                    <span class="badge badge-member">รวม ${total}</span>
                </div>
                <div class="flex items-center gap-1">
                    <button class="btn btn-sm btn-primary" onclick="addToInput('${p.id}',${ui.activePreset})">+${ui.activePreset}</button>
                    <button class="btn btn-sm btn-danger" onclick="addToInput('${p.id}',${-ui.activePreset})">-${ui.activePreset}</button>
                    <input type="text" inputmode="numeric" style="width:70px;text-align:center" value="${input}" onfocus="this.select()" onchange="setInput('${p.id}',this.value)">
                    <span class="badge ${input >= 0 ? 'badge-hub' : 'badge-member'}" style="background:${input >= 0 ? 'var(--accent)' : 'var(--primary)'}">${input >= 0 ? '+' : ''}${input}</span>
                </div>`;
            }
            html += `</div>`;
        });

        // Submit
        html += `<div class="flex gap-2 mt-3">
            <button class="btn btn-primary" style="flex:1" onclick="submitRound()">✓ บันทึกเกม</button>
            <button class="btn btn-outline" onclick="clearInputs()">ล้าง</button>
        </div>`;

        // Reset / Clear
        html += `<div class="flex gap-2 mt-2">`;
        if (ui.confirmReset) {
            html += `<button class="btn btn-secondary" style="flex:1" onclick="doReset()">ยืนยันรีเซตแต้ม?</button>
                <button class="btn btn-outline" onclick="ui.confirmReset=false;render()">ยกเลิก</button>`;
        } else {
            html += `<button class="btn btn-outline" style="flex:1" onclick="ui.confirmReset=true;render()">รีเซตแต้ม</button>`;
        }
        if (ui.confirmClear) {
            html += `<button class="btn btn-danger" style="flex:1" onclick="doClearAll()">ยืนยันเริ่มใหม่?</button>
                <button class="btn btn-outline" onclick="ui.confirmClear=false;render()">ยกเลิก</button>`;
        } else {
            html += `<button class="btn btn-outline-danger" style="flex:1" onclick="ui.confirmClear=true;render()">เริ่มใหม่</button>`;
        }
        html += `</div>`;
    }

    // Footer
    html += footer();
    document.getElementById('app').innerHTML = html;
}

// === Page: History ===
function renderHistory() {
    let html = `<h4 class="text-center mb-3">📜 ประวัติ</h4>`;
    if (!session.rounds.length) {
        html += `<p class="text-center text-muted">ยังไม่มีเกม</p>`;
    } else {
        [...session.rounds].reverse().forEach((round, ri) => {
            const actualIdx = session.rounds.length - 1 - ri;
            const dealer = session.players.find(p => p.id === round.dealerId);
            const isEditing = ui.editingRound === round.roundNumber;
            html += `<div class="card mb-2">
                <div class="flex items-center" style="justify-content:space-between;cursor:pointer" onclick="toggleEditRound(${round.roundNumber})">
                    <strong>${isEditing ? '▼' : '▶'} เกมที่ ${round.roundNumber}</strong>`;
            if (!isEditing) {
                if (ui.confirmDeleteRound === round.roundNumber) {
                    html += `<div class="flex gap-1">
                        <button class="btn btn-sm btn-danger" onclick="event.stopPropagation();doRemoveRound(${actualIdx})">ยืนยัน</button>
                        <button class="btn btn-sm btn-outline" onclick="event.stopPropagation();ui.confirmDeleteRound=null;render()">ยกเลิก</button>
                    </div>`;
                } else {
                    html += `<button class="btn btn-sm btn-outline-danger" onclick="event.stopPropagation();ui.confirmDeleteRound=${round.roundNumber};render()">ลบ</button>`;
                }
            }
            html += `</div>`;
            if (dealer) html += `<small class="text-muted">👑 เจ้า: ${esc(dealer.name)}</small>`;

            if (isEditing) {
                session.players.filter(p => p.id !== round.dealerId).forEach(p => {
                    const val = ui.editValues[p.id] !== undefined ? ui.editValues[p.id] : (round.scores[p.id] || 0);
                    html += `<div class="flex items-center gap-2 mt-2">
                        <span style="min-width:60px">${esc(p.name)}</span>
                        <input type="text" inputmode="numeric" style="width:70px;text-align:center" value="${val}" onchange="setEditValue('${p.id}',this.value)">
                    </div>`;
                });
                if (dealer) {
                    const editOthers = session.players.filter(p => p.id !== round.dealerId).reduce((s, p) => s + (ui.editValues[p.id] !== undefined ? ui.editValues[p.id] : (round.scores[p.id] || 0)), 0);
                    const ds = -editOthers;
                    html += `<div class="flex items-center gap-2 mt-2">
                        <span style="min-width:60px">👑 ${esc(dealer.name)}</span>
                        <span class="badge ${ds >= 0 ? 'badge-hub' : 'badge-member'}" style="background:${ds >= 0 ? 'var(--accent)' : 'var(--primary)'}">${ds >= 0 ? '+' : ''}${ds} (อัตโนมัติ)</span>
                    </div>`;
                }
                html += `<div class="flex gap-2 mt-2">
                    <button class="btn btn-sm btn-primary" onclick="saveEditRound(${actualIdx})">บันทึก</button>
                    <button class="btn btn-sm btn-outline" onclick="ui.editingRound=null;render()">ยกเลิก</button>
                </div>`;
            } else {
                html += `<div class="flex flex-wrap gap-2 mt-1">`;
                session.players.forEach(p => {
                    const score = round.scores[p.id] || 0;
                    html += `<small>${esc(p.name)}: <span style="color:${score >= 0 ? 'var(--accent)' : 'var(--primary)'}">${score >= 0 ? '+' : ''}${score}</span></small>`;
                });
                html += `</div>`;
            }
            html += `</div>`;
        });
    }
    document.getElementById('app').innerHTML = html;
}

// === Page: Summary ===
function renderSummary() {
    let html = `<h4 class="text-center mb-3">📊 สรุปผล</h4>`;
    if (!session.players.length) {
        html += `<p class="text-center text-muted">ยังไม่มีข้อมูล</p>`;
    } else {
        const sorted = [...session.players].sort((a, b) => getTotal(b.id) - getTotal(a.id));
        sorted.forEach(p => {
            const total = getTotal(p.id);
            html += `<div class="card mb-2">
                <div class="flex items-center" style="justify-content:space-between">
                    <strong>${esc(p.name)}</strong>
                    <span class="badge ${total >= 0 ? 'badge-hub' : 'badge-member'}" style="background:${total >= 0 ? 'var(--accent)' : 'var(--primary)'}">${total >= 0 ? '+' : ''}${total}</span>
                </div>
            </div>`;
        });
        const systemTotal = session.players.reduce((s, p) => s + getTotal(p.id), 0);
        html += `<div class="card mb-2 text-center">
            <small class="text-muted">รวมทั้งระบบ: ${systemTotal}</small>
            ${systemTotal !== 0 ? '<br><small style="color:var(--primary)">⚠️ ยอดรวมไม่เป็น 0 (อาจป้อนไม่ครบ)</small>' : ''}
        </div>`;
    }
    document.getElementById('app').innerHTML = html;
}

// === Page: Settings ===
function renderSettings() {
    let html = `<h4 class="text-center mb-3">⚙️ ตั้งค่า Preset</h4>`;
    html += `<div class="input-group mb-3">
        <input id="newPresetInput" type="text" inputmode="numeric" placeholder="จำนวน" value="${ui.newPreset}" onkeydown="if(event.key==='Enter')addPreset()">
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

    document.getElementById('app').innerHTML = html;
}

// === Footer ===
function footer() {
    return `<div class="text-center text-muted mt-3" style="border-top:2px solid #D4DBDF;padding-top:16px">
        <p><strong>TallyUp</strong></p>
        <small>แอพจดแต้มวงไพ่ ใช้ฟรี ไม่มีโฆษณา</small><br>
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

// === Actions: Play ===
function addPlayer() {
    const el = document.getElementById('newPlayer');
    const name = el.value.trim();
    if (!name) return;
    session.players.push({ id: genId(), name });
    if (!ui.dealerId) ui.dealerId = session.players[0].id;
    el.value = '';
    save(); render();
}

function setDealer(id) { ui.dealerId = id; render(); }
function setPreset(amt) { ui.activePreset = amt; render(); }
function addToInput(id, amt) { ui.roundInputs[id] = (ui.roundInputs[id] || 0) + amt; render(); }
function setInput(id, val) { ui.roundInputs[id] = parseInt(val) || 0; render(); }
function clearInputs() { ui.roundInputs = {}; render(); }

function submitRound() {
    if (!ui.dealerId) return;
    const playerScores = {};
    session.players.filter(p => p.id !== ui.dealerId).forEach(p => {
        playerScores[p.id] = ui.roundInputs[p.id] || 0;
    });
    const dealerScore = -Object.values(playerScores).reduce((s, v) => s + v, 0);
    const allScores = { ...playerScores, [ui.dealerId]: dealerScore };
    session.rounds.push({ roundNumber: session.rounds.length + 1, dealerId: ui.dealerId, scores: allScores, timestamp: new Date().toISOString() });
    session.lastDealerId = ui.dealerId;
    // Keep inputs for next round
    save(); render();
    showToast(`บันทึกเกมที่ ${session.rounds.length} แล้ว ✅`);
}

function doReset() { session.rounds = []; ui.confirmReset = false; ui.roundInputs = {}; save(); render(); }
function doClearAll() { const presets = session.presets; session = { players: [], rounds: [], presets, lastDealerId: null }; ui.confirmClear = false; ui.dealerId = null; ui.roundInputs = {}; save(); render(); }

// === Actions: History ===
function toggleEditRound(roundNum) {
    if (ui.editingRound === roundNum) { ui.editingRound = null; render(); return; }
    ui.editingRound = roundNum;
    const round = session.rounds.find(r => r.roundNumber === roundNum);
    ui.editValues = {};
    if (round) session.players.filter(p => p.id !== round.dealerId).forEach(p => { ui.editValues[p.id] = round.scores[p.id] || 0; });
    render();
}

function setEditValue(id, val) { ui.editValues[id] = parseInt(val) || 0; }
function saveEditRound(idx) {
    const round = session.rounds[idx];
    Object.entries(ui.editValues).forEach(([id, val]) => { round.scores[id] = val; });
    round.scores[round.dealerId] = -Object.entries(ui.editValues).reduce((s, [, v]) => s + v, 0);
    ui.editingRound = null;
    save(); render();
}

function doRemoveRound(idx) { session.rounds.splice(idx, 1); session.rounds.forEach((r, i) => r.roundNumber = i + 1); ui.confirmDeleteRound = null; save(); render(); }

// === Actions: Settings ===
function addPreset() {
    const el = document.getElementById('newPresetInput');
    const val = parseInt(el.value) || 0;
    if (val > 0 && !session.presets.includes(val)) {
        session.presets.push(val);
        session.presets.sort((a, b) => a - b);
        el.value = '';
        ui.newPreset = '';
        save(); render();
    }
}

function doRemovePreset(amt) { session.presets = session.presets.filter(x => x !== amt); ui.confirmDeletePreset = null; save(); render(); }

function startEditPlayerById(id) {
    ui.editingPlayer = id; ui.confirmDeletePlayer = null; render();
    setTimeout(() => { const el = document.getElementById('editPlayerInput'); if (el) { el.focus(); el.select(); } }, 0);
}
function confirmEditPlayerById(id) {
    const el = document.getElementById('editPlayerInput');
    const newName = el ? el.value.trim() : '';
    const p = session.players.find(x => x.id === id);
    if (!newName || !p || session.players.some(x => x.id !== id && x.name === newName)) { ui.editingPlayer = null; render(); return; }
    p.name = newName;
    ui.editingPlayer = null;
    save(); render();
}
function doRemovePlayerById(id) {
    const idx = session.players.findIndex(x => x.id === id);
    if (idx < 0) return;
    session.rounds.forEach(r => delete r.scores[id]);
    session.players.splice(idx, 1);
    if (ui.dealerId === id) ui.dealerId = session.players[0]?.id || null;
    ui.confirmDeletePlayer = null; ui.editingPlayer = null;
    save(); render();
}

// === Render (route alias) ===
function render() { route(); }

// === Init ===
document.addEventListener('DOMContentLoaded', () => {
    load();
    route();
});
window.addEventListener('hashchange', route);
