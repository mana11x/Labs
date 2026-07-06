// KuanBad-v2 — Vanilla JS
const $ = id => document.getElementById(id);
const app = $('app');

// Storage
const SESSIONS_KEY = 'kuanbad_sessions';
const CURRENT_KEY = 'kuanbad_current';
const NAMES_KEY = 'kuanbad_known_names';

function loadSessions() { return JSON.parse(localStorage.getItem(SESSIONS_KEY) || '[]'); }
function saveSessions(s) { localStorage.setItem(SESSIONS_KEY, JSON.stringify(s)); }
function loadCurrent() { return localStorage.getItem(CURRENT_KEY) || ''; }
function saveCurrent(id) { localStorage.setItem(CURRENT_KEY, id); }
function loadNames() { return JSON.parse(localStorage.getItem(NAMES_KEY) || '[]'); }
function saveNames(n) { localStorage.setItem(NAMES_KEY, JSON.stringify([...new Set(n)])); }

function getSession() {
    const sessions = loadSessions();
    return sessions.find(s => s.id === loadCurrent()) || null;
}
function updateSession(sess) {
    const sessions = loadSessions();
    const i = sessions.findIndex(s => s.id === sess.id);
    if (i >= 0) { sessions[i] = sess; saveSessions(sessions); }
}

// Calc
function calcTotal(player, matches) {
    let shuttleCost = 0;
    for (const m of matches) {
        if (m.players.includes(player.name)) {
            shuttleCost += (m.shuttles * m.pricePerShuttle) / m.players.length;
        }
    }
    return (player.courtFee || 0) + shuttleCost - (player.discount || 0);
}

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
    const hash = location.hash.slice(1) || 'home';
    const page = hash.split('/')[0];
    document.querySelectorAll('.bottom-nav a').forEach(a => {
        a.classList.toggle('active', a.getAttribute('href') === '#' + page);
    });
    const routes = { home: renderHome, players: renderPlayers, match: renderMatch, summary: renderSummary, settings: renderSettings };
    (routes[page] || renderHome)();
}
window.addEventListener('hashchange', route);
window.addEventListener('load', route);

// ===== HOME =====
function renderHome() {
    const sessions = loadSessions();
    const cur = loadCurrent();
    const sess = getSession();

    let dashboard = '';
    if (sess) {
        const players = sess.players.filter(p => !p.disabled);
        const matches = sess.matches || [];
        const totalShuttles = matches.reduce((s, m) => s + m.shuttles, 0);
        const unpaid = players.filter(p => !p.paid);
        const paid = players.filter(p => p.paid);
        // top player (most matches)
        const countMap = {};
        matches.forEach(m => m.players.forEach(n => { countMap[n] = (countMap[n] || 0) + 1; }));
        const topPlayer = Object.entries(countMap).sort((a, b) => b[1] - a[1])[0];
        // top shuttle user (นับลูกทั้งหมดจากทุกแมทช์ที่ลงเล่น)
        const shuttleMap = {};
        matches.forEach(m => m.players.forEach(n => { shuttleMap[n] = (shuttleMap[n] || 0) + m.shuttles; }));
        const shuttleEntries = Object.entries(shuttleMap).sort((a, b) => b[1] - a[1]);
        const topShuttleCount = shuttleEntries.length ? shuttleEntries[0][1] : 0;
        const topShuttleNames = shuttleEntries.filter(e => e[1] === topShuttleCount).map(e => e[0]);

        dashboard = `
            <div class="card mb-2">
                <div class="flex items-center gap-2 mb-1">
                    <span style="font-size:1.3rem">🏸</span>
                    <strong>${sess.name}</strong>
                </div>
                <div class="flex flex-wrap gap-2 mt-2" style="font-size:0.85rem">
                    <span>👥 ${players.length} คน</span>
                    <span>🎮 ${matches.length} แมทช์</span>
                    <span>🪶 ${totalShuttles} ลูก</span>
                </div>
                <div class="flex flex-wrap gap-2 mt-2" style="font-size:0.82rem">
                    <span class="text-muted">💸 ยังไม่จ่าย ${unpaid.length} | จ่ายแล้ว ${paid.length}</span>
                </div>
                ${topPlayer ? `<div class="mt-1" style="font-size:0.82rem">🏆 เล่นเยอะสุด: <strong>${topPlayer[0]}</strong> (${topPlayer[1]} แมทช์)</div>` : ''}
                ${topShuttleNames.length ? `<div style="font-size:0.82rem">🪶 ใช้ลูกเยอะสุด: <strong>${topShuttleNames.join(', ')}</strong> (${topShuttleCount} ลูก)</div>` : ''}
            </div>`;
    }

    app.innerHTML = `
        <h4 class="mb-2">🏸 KuanBad</h4>
        <label class="form-label">เลือก Session</label>
        <div class="flex gap-1 mb-2">
            <select id="sess-select" style="flex:1">
                <option value="">-- เลือก --</option>
                ${sessions.map(s => `<option value="${s.id}" ${s.id === cur ? 'selected' : ''}>${s.name}</option>`).join('')}
            </select>
            <button class="btn btn-primary btn-sm" onclick="createSession()">+</button>
        </div>
        ${showingCreateSession ? `
        <div class="card mb-2">
            <label class="form-label">ชื่อ Session ใหม่</label>
            <div class="flex gap-1">
                <input id="new-sess-name" placeholder="ชื่อ Session" style="flex:1">
                <button class="btn btn-primary btn-sm" onclick="confirmCreateSession()">สร้าง</button>
                <button class="btn btn-secondary btn-sm" onclick="cancelCreateSession()">ยกเลิก</button>
            </div>
        </div>` : ''}
        ${dashboard}
        ${sess && !showingDeleteSession ? `<button class="btn btn-outline-danger btn-sm mt-2" onclick="deleteSession()">ลบ Session นี้</button>` : ''}
        ${showingDeleteSession ? `
        <div class="flex gap-1 items-center mt-2">
            <span style="font-size:0.85rem;color:var(--primary)">ลบ Session นี้?</span>
            <button class="btn btn-danger btn-sm" onclick="confirmDeleteSession()">ลบ</button>
            <button class="btn btn-secondary btn-sm" onclick="cancelDeleteSession()">ยกเลิก</button>
        </div>` : ''}
    `;
    $('sess-select').onchange = e => { saveCurrent(e.target.value); renderHome(); };
    if (showingCreateSession && $('new-sess-name')) {
        $('new-sess-name').addEventListener('keydown', e => { if (e.key === 'Enter') confirmCreateSession(); });
    }
}

let showingCreateSession = false;
let showingDeleteSession = false;

function createSession() {
    showingCreateSession = true;
    renderHome();
    setTimeout(() => $('new-sess-name') && $('new-sess-name').focus(), 0);
}

function confirmCreateSession() {
    const name = $('new-sess-name').value.trim();
    if (!name) return;
    const sess = { id: Date.now().toString(), name, players: [], matches: [] };
    const sessions = loadSessions();
    sessions.push(sess);
    saveSessions(sessions);
    saveCurrent(sess.id);
    showingCreateSession = false;
    renderHome();
}

function cancelCreateSession() { showingCreateSession = false; renderHome(); }

function deleteSession() { showingDeleteSession = true; renderHome(); }

function confirmDeleteSession() {
    const sessions = loadSessions().filter(s => s.id !== loadCurrent());
    saveSessions(sessions);
    saveCurrent(sessions.length ? sessions[0].id : '');
    showingDeleteSession = false;
    renderHome();
}

function cancelDeleteSession() { showingDeleteSession = false; renderHome(); }

// ===== PLAYERS =====
let editingPlayer = null;

function renderPlayers() {
    const sess = getSession();
    if (!sess) { app.innerHTML = '<p class="text-muted text-center mt-3">เลือก Session ก่อน</p>'; return; }

    const knownNames = loadNames();
    const players = sess.players;

    app.innerHTML = `
        <h4 class="mb-2">👥 ผู้เล่น (${players.filter(p => !p.disabled).length})</h4>
        <div class="flex gap-1 mb-2">
            <input id="new-player" list="name-list" placeholder="ชื่อผู้เล่น" style="flex:1">
            <button class="btn btn-primary btn-sm" onclick="addPlayer()">เพิ่ม</button>
        </div>
        <datalist id="name-list">${knownNames.map(n => `<option value="${n}">`).join('')}</datalist>
        <div id="player-list"></div>
    `;
    $('new-player').addEventListener('keydown', e => { if (e.key === 'Enter') addPlayer(); });
    renderPlayerList();
}

function renderPlayerList() {
    const sess = getSession();
    if (!sess) return;
    const el = $('player-list');
    if (!el) return;

    el.innerHTML = sess.players.map((p, i) => {
        if (editingPlayer === i) {
            return `<div class="card mb-1">
                <div class="mb-1"><label class="form-label">ชื่อ</label><input id="ep-name" value="${p.name}"></div>
                <div class="flex gap-1 mb-1">
                    <div style="flex:1"><label class="form-label">ค่าสนาม</label><input id="ep-court" type="tel" inputmode="numeric" value="${p.courtFee || 0}"></div>
                    <div style="flex:1"><label class="form-label">ส่วนลด</label><input id="ep-disc" type="tel" inputmode="numeric" value="${p.discount || 0}"></div>
                </div>
                <div class="mb-1"><label class="form-label">หมายเหตุ</label><input id="ep-note" value="${p.note || ''}"></div>
                <div class="flex gap-1 flex-wrap">
                    <button class="btn btn-primary btn-sm" onclick="savePlayer(${i})">บันทึก</button>
                    <button class="btn btn-secondary btn-sm" onclick="cancelEditPlayer()">ยกเลิก</button>
                    <button class="btn btn-outline-danger btn-sm" onclick="deletePlayer(${i})">ลบ</button>
                </div>
                ${confirmingDeletePlayer === i ? `<div class="flex gap-1 items-center mt-1"><span style="font-size:0.82rem;color:var(--primary)">ลบ &quot;${p.name}&quot;?</span><button class="btn btn-danger btn-sm" onclick="confirmDeletePlayer(${i})">ยืนยัน</button><button class="btn btn-secondary btn-sm" onclick="cancelDeletePlayer()">ยกเลิก</button></div>` : ''}
            </div>`;
        }
        const opacity = p.disabled ? 'opacity:0.5' : '';
        const paidBadge = p.paid ? '<span style="color:var(--success);font-size:0.75rem"> ✓จ่ายแล้ว</span>' : '';
        return `<div class="card mb-1 flex items-center gap-2" style="${opacity}">
            <span style="cursor:pointer;flex:1" onclick="editPlayer(${i})">${p.name}${paidBadge}</span>
            <button class="btn btn-sm ${p.disabled ? 'btn-outline' : 'btn-secondary'}" onclick="toggleDisable(${i})">${p.disabled ? '🔇' : '🔊'}</button>
            <button class="btn btn-sm ${p.paid ? 'btn-success' : 'btn-outline'}" onclick="togglePaid(${i})">${p.paid ? '💚' : '💰'}</button>
        </div>`;
    }).join('');
}

function addPlayer() {
    const input = $('new-player');
    const name = input.value.trim();
    if (!name) return;
    const sess = getSession();
    if (sess.players.find(p => p.name === name)) { toast('มีชื่อนี้แล้ว'); return; }
    sess.players.push({ name, courtFee: 0, discount: 0, paid: false, disabled: false, note: '' });
    updateSession(sess);
    const names = loadNames(); names.push(name); saveNames(names);
    input.value = '';
    renderPlayerList();
}

function editPlayer(i) { editingPlayer = i; renderPlayerList(); }
function cancelEditPlayer() { editingPlayer = null; renderPlayerList(); }

function savePlayer(i) {
    const sess = getSession();
    const oldName = sess.players[i].name;
    const newName = $('ep-name').value.trim();
    if (!newName) return;
    // rename in matches
    if (oldName !== newName) {
        sess.matches.forEach(m => { const idx = m.players.indexOf(oldName); if (idx >= 0) m.players[idx] = newName; });
    }
    sess.players[i].name = newName;
    sess.players[i].courtFee = parseFloat($('ep-court').value) || 0;
    sess.players[i].discount = parseFloat($('ep-disc').value) || 0;
    sess.players[i].note = $('ep-note').value;
    updateSession(sess);
    const names = loadNames(); names.push(newName); saveNames(names);
    editingPlayer = null;
    renderPlayerList();
}

let confirmingDeletePlayer = null;

function deletePlayer(i) {
    const sess = getSession();
    const name = sess.players[i].name;
    const inMatch = sess.matches.some(m => m.players.includes(name));
    if (inMatch) { toast('ลบไม่ได้ — มีแมทช์อยู่'); return; }
    confirmingDeletePlayer = i;
    renderPlayerList();
}

function confirmDeletePlayer(i) {
    const sess = getSession();
    sess.players.splice(i, 1);
    updateSession(sess);
    editingPlayer = null;
    confirmingDeletePlayer = null;
    renderPlayerList();
}

function cancelDeletePlayer() { confirmingDeletePlayer = null; renderPlayerList(); }

function togglePaid(i) {
    const sess = getSession();
    sess.players[i].paid = !sess.players[i].paid;
    updateSession(sess);
    renderPlayerList();
}

function toggleDisable(i) {
    const sess = getSession();
    sess.players[i].disabled = !sess.players[i].disabled;
    updateSession(sess);
    renderPlayerList();
}

// ===== MATCH =====
let selectedPlayers = [];
let editingMatch = null;

function renderMatch() {
    const sess = getSession();
    if (!sess) { app.innerHTML = '<p class="text-muted text-center mt-3">เลือก Session ก่อน</p>'; return; }

    const activePlayers = sess.players.filter(p => !p.disabled);

    app.innerHTML = `
        <h4 class="mb-2">🏸 แมทช์</h4>
        <label class="form-label">เลือกผู้เล่น (2 หรือ 4 คน)</label>
        <div class="chip-group mb-2" id="match-chips">
            ${activePlayers.map(p => `<button class="chip ${selectedPlayers.includes(p.name) ? 'chip-active' : ''}" onclick="toggleMatchPlayer('${p.name}')">${p.name}</button>`).join('')}
        </div>
        <div class="flex gap-1 mb-1">
            <div style="flex:1"><label class="form-label">ลูกขนไก่</label><input id="m-shuttles" type="tel" inputmode="numeric" value="1"></div>
            <div style="flex:1"><label class="form-label">ราคา/ลูก</label><input id="m-price" type="tel" inputmode="numeric" value="${getLastPrice()}"></div>
        </div>
        <div class="mb-2"><label class="form-label">สนาม/หมายเหตุ</label><input id="m-court" placeholder="สนาม"></div>
        <button class="btn btn-primary mb-3" onclick="addMatch()">เพิ่มแมทช์</button>
        <hr>
        <div id="match-list"></div>
    `;
    renderMatchList();
}

function toggleMatchPlayer(name) {
    const i = selectedPlayers.indexOf(name);
    if (i >= 0) selectedPlayers.splice(i, 1); else selectedPlayers.push(name);
    // re-render chips only
    const sess = getSession();
    const activePlayers = sess.players.filter(p => !p.disabled);
    $('match-chips').innerHTML = activePlayers.map(p => `<button class="chip ${selectedPlayers.includes(p.name) ? 'chip-active' : ''}" onclick="toggleMatchPlayer('${p.name}')">${p.name}</button>`).join('');
}

function getLastPrice() {
    const sess = getSession();
    const matches = sess.matches || [];
    if (matches.length > 0) return matches[matches.length - 1].pricePerShuttle;
    return 0;
}

function addMatch() {
    if (selectedPlayers.length !== 2 && selectedPlayers.length !== 4) { toast('เลือก 2 หรือ 4 คน'); return; }
    const sess = getSession();
    sess.matches.push({
        id: Date.now().toString(),
        players: [...selectedPlayers],
        shuttles: parseInt($('m-shuttles').value) || 1,
        pricePerShuttle: parseFloat($('m-price').value) || 30,
        court: $('m-court').value,
        note: ''
    });
    updateSession(sess);
    selectedPlayers = [];
    renderMatch();
    toast('เพิ่มแมทช์แล้ว');
}

function renderMatchList() {
    const sess = getSession();
    const el = $('match-list');
    if (!el) return;
    const matches = sess.matches || [];

    el.innerHTML = matches.length === 0 ? '<p class="text-muted text-center">ยังไม่มีแมทช์</p>' :
        matches.map((m, i) => {
            if (editingMatch === i) {
                return `<div class="card mb-1">
                    <div class="mb-1"><label class="form-label">ผู้เล่น</label><p style="font-size:0.85rem">${m.players.join(', ')}</p></div>
                    <div class="flex gap-1 mb-1">
                        <div style="flex:1"><label class="form-label">ลูก</label><input id="em-sh" type="tel" inputmode="numeric" value="${m.shuttles}"></div>
                        <div style="flex:1"><label class="form-label">ราคา/ลูก</label><input id="em-pr" type="tel" inputmode="numeric" value="${m.pricePerShuttle}"></div>
                    </div>
                    <div class="mb-1"><label class="form-label">สนาม</label><input id="em-ct" value="${m.court || ''}"></div>
                    <div class="flex gap-1">
                        <button class="btn btn-primary btn-sm" onclick="saveMatch(${i})">บันทึก</button>
                        <button class="btn btn-secondary btn-sm" onclick="cancelEditMatch()">ยกเลิก</button>
                        <button class="btn btn-outline-danger btn-sm" onclick="deleteMatch(${i})">ลบ</button>
                    </div>
                    ${confirmingDeleteMatch === i ? `<div class="flex gap-1 items-center mt-1"><span style="font-size:0.82rem;color:var(--primary)">ลบแมทช์นี้?</span><button class="btn btn-danger btn-sm" onclick="confirmDeleteMatch(${i})">ยืนยัน</button><button class="btn btn-secondary btn-sm" onclick="cancelDeleteMatch()">ยกเลิก</button></div>` : ''}
                </div>`;
            }
            const cost = m.shuttles * m.pricePerShuttle;
            return `<div class="card mb-1 expense-item" onclick="editMatch(${i})">
                <div class="flex items-center gap-2">
                    <span style="flex:1;font-size:0.85rem">${m.players.join(', ')}</span>
                    <span style="font-size:0.82rem;color:var(--accent)">${cost}฿</span>
                </div>
                <small>🪶${m.shuttles} × ${m.pricePerShuttle}฿ ${m.court ? '| ' + m.court : ''}</small>
            </div>`;
        }).join('');
}

function editMatch(i) { editingMatch = i; renderMatchList(); }
function cancelEditMatch() { editingMatch = null; renderMatchList(); }

function saveMatch(i) {
    const sess = getSession();
    sess.matches[i].shuttles = parseInt($('em-sh').value) || 1;
    sess.matches[i].pricePerShuttle = parseFloat($('em-pr').value) || 30;
    sess.matches[i].court = $('em-ct').value;
    updateSession(sess);
    editingMatch = null;
    renderMatchList();
}

let confirmingDeleteMatch = null;

function deleteMatch(i) { confirmingDeleteMatch = i; renderMatchList(); }

function confirmDeleteMatch(i) {
    const sess = getSession();
    sess.matches.splice(i, 1);
    updateSession(sess);
    editingMatch = null;
    confirmingDeleteMatch = null;
    renderMatchList();
}

function cancelDeleteMatch() { confirmingDeleteMatch = null; renderMatchList(); }

// ===== SUMMARY =====
let expandedSummary = null;

function renderSummary() {
    const sess = getSession();
    if (!sess) { app.innerHTML = '<p class="text-muted text-center mt-3">เลือก Session ก่อน</p>'; return; }

    const matches = sess.matches || [];
    const players = sess.players.filter(p => !p.disabled);
    const unpaid = players.filter(p => !p.paid);
    const paid = players.filter(p => p.paid);

    const renderPlayer = (p, i) => {
        const total = calcTotal(p, matches);
        const expanded = expandedSummary === p.name;
        let detail = '';
        if (expanded) {
            const lines = [];
            if (p.courtFee) lines.push(`ค่าสนาม: ${p.courtFee}฿`);
            matches.filter(m => m.players.includes(p.name)).forEach((m, mi) => {
                const share = (m.shuttles * m.pricePerShuttle) / m.players.length;
                lines.push(`แมทช์${mi + 1}: ${m.shuttles}×${m.pricePerShuttle}÷${m.players.length} = ${Math.round(share)}฿`);
            });
            if (p.discount) lines.push(`ส่วนลด: -${p.discount}฿`);
            detail = `<div style="font-size:0.78rem;color:var(--accent);margin-top:6px;padding-left:8px">${lines.join('<br>')}</div>`;
        }
        return `<div class="card mb-1">
            <div class="flex items-center gap-2" style="cursor:pointer" onclick="toggleSummaryExpand('${p.name}')">
                <span style="flex:1">${p.name}</span>
                <strong style="color:var(--primary)">${Math.round(total)}฿</strong>
                <button class="btn btn-sm ${p.paid ? 'btn-success' : 'btn-outline'}" onclick="event.stopPropagation();togglePaidSummary('${p.name}')">${p.paid ? '✓' : '💰'}</button>
            </div>
            ${detail}
        </div>`;
    };

    app.innerHTML = `
        <h4 class="mb-2">💰 สรุป</h4>
        ${unpaid.length ? `<label class="form-label">ยังไม่จ่าย (${unpaid.length})</label>` : ''}
        ${unpaid.map(renderPlayer).join('')}
        ${paid.length ? `<hr><label class="form-label">จ่ายแล้ว (${paid.length})</label>` : ''}
        ${paid.map(renderPlayer).join('')}
        <hr>
        <div class="flex gap-1 flex-wrap">
            <button class="btn btn-secondary btn-sm" onclick="copySummary()">📋 คัดลอกสรุป</button>
            <button class="btn btn-outline btn-sm" onclick="copyAllBills()">📋 บิลทุกคน</button>
        </div>
    `;
}

function toggleSummaryExpand(name) {
    expandedSummary = expandedSummary === name ? null : name;
    renderSummary();
}

function togglePaidSummary(name) {
    const sess = getSession();
    const p = sess.players.find(x => x.name === name);
    if (p) { p.paid = !p.paid; updateSession(sess); }
    renderSummary();
}

function copySummary() {
    const sess = getSession();
    const matches = sess.matches || [];
    const players = sess.players.filter(p => !p.disabled);
    const lines = [`🏸 ${sess.name}`, ''];
    players.forEach(p => {
        const total = calcTotal(p, matches);
        lines.push(`${p.name}: ${Math.round(total)}฿${p.paid ? ' ✓' : ''}`);
    });
    const totalAll = players.reduce((s, p) => s + calcTotal(p, matches), 0);
    lines.push('', `รวม: ${Math.round(totalAll)}฿`);
    navigator.clipboard.writeText(lines.join('\n')).then(() => toast('คัดลอกแล้ว'));
}

function copyAllBills() {
    const sess = getSession();
    const matches = sess.matches || [];
    const players = sess.players.filter(p => !p.disabled && !p.paid);
    const lines = [`🏸 ${sess.name}`, ''];
    players.forEach(p => {
        const total = calcTotal(p, matches);
        lines.push(`${p.name}: ${Math.round(total)}฿`);
        if (p.courtFee) lines.push(`  ค่าสนาม ${p.courtFee}`);
        matches.filter(m => m.players.includes(p.name)).forEach((m, i) => {
            const share = (m.shuttles * m.pricePerShuttle) / m.players.length;
            lines.push(`  แมทช์${i + 1}: ${Math.round(share)}฿`);
        });
        if (p.discount) lines.push(`  ส่วนลด -${p.discount}`);
        lines.push('');
    });
    navigator.clipboard.writeText(lines.join('\n')).then(() => toast('คัดลอกแล้ว'));
}

// ===== SETTINGS =====
function renderSettings() {
    app.innerHTML = `
        <h4 class="mb-2">⚙️ ตั้งค่า</h4>
        <div class="card mb-2">
            <label class="form-label">Backup</label>
            <button class="btn btn-secondary btn-sm" onclick="exportBackup()">📥 Export JSON</button>
        </div>
        <div class="card mb-2">
            <label class="form-label">Restore</label>
            <input type="file" id="import-file" accept=".json" style="font-size:0.8rem" class="mb-1">
            <button class="btn btn-primary btn-sm" onclick="importBackup()">📤 Import</button>
        </div>
        <div class="card">
            <label class="form-label">ล้างชื่อที่จำไว้</label>
            <button class="btn btn-outline-danger btn-sm" onclick="clearNames()">ล้าง Known Names</button>
            ${showingClearNames ? `<div class="flex gap-1 items-center mt-1"><span style="font-size:0.82rem;color:var(--primary)">ล้างทั้งหมด?</span><button class="btn btn-danger btn-sm" onclick="confirmClearNames()">ยืนยัน</button><button class="btn btn-secondary btn-sm" onclick="cancelClearNames()">ยกเลิก</button></div>` : ''}
        </div>
        <hr>
        <div class="text-center text-muted" style="border-top:2px solid #D4DBDF;padding-top:16px">
            <p><strong>KuanBad</strong></p>
            <small>แอพคิดเงินก๊วนแบด ใช้ฟรี ไม่มีโฆษณา</small><br>
            <small>สร้างโดย Mana11Lab</small><br>
            <div class="mt-2">
                <a href="https://promptpay.io/0923959404" target="_blank" class="btn btn-sm btn-outline-warning">☕ เลี้ยงน้ำหวานผ่าน PromptPay</a>
            </div>
            <button class="btn btn-sm btn-outline" onclick="copyLink()" style="margin-top:8px">📎 แชร์แอพนี้</button>
        </div>
    `;
}

function exportBackup() {
    const data = { sessions: loadSessions(), knownNames: loadNames(), currentId: loadCurrent() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `kuanbad_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
}

function importBackup() {
    const file = $('import-file').files[0];
    if (!file) { toast('เลือกไฟล์ก่อน'); return; }
    const reader = new FileReader();
    reader.onload = e => {
        try {
            const data = JSON.parse(e.target.result);
            if (data.sessions) saveSessions(data.sessions);
            if (data.knownNames) saveNames(data.knownNames);
            if (data.currentId) saveCurrent(data.currentId);
            toast('Import สำเร็จ');
            route();
        } catch { toast('ไฟล์ไม่ถูกต้อง'); }
    };
    reader.readAsText(file);
}

let showingClearNames = false;

function clearNames() { showingClearNames = true; renderSettings(); }

function confirmClearNames() {
    saveNames([]);
    showingClearNames = false;
    toast('ล้างแล้ว');
    renderSettings();
}

function cancelClearNames() { showingClearNames = false; renderSettings(); }

function copyLink() {
    navigator.clipboard.writeText(location.href).then(() => {
        let t = document.getElementById('toast');
        if (!t) { t = document.createElement('div'); t.id = 'toast'; document.body.appendChild(t); }
        t.innerHTML = '<div class="alert alert-success">คัดลอกลิงก์แล้ว</div>';
        t.style.display = 'block';
        setTimeout(() => t.style.display = 'none', 2000);
    });
}
