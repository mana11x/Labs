// ===== LuX - Step 1: Core Logic =====

// --- NumberParser ---
function parseToNumberList(input) {
    const lines = input.split('\n');
    const raw = [];
    for (const line of lines) {
        if (line.trim().length <= 2) continue;
        const parts = splitExpression(line.trim());
        if (parts.length === 0) continue;
        const num = parts[0];
        let v1 = 0, v2 = 0, v3 = 0;
        for (let i = 1; i < parts.length; i++) {
            if (parts[i].includes('+')) v1 = extractNumber(parts[i]);
            else if (parts[i].includes('-')) v2 = extractNumber(parts[i]);
            else if (parts[i].includes('x') || parts[i].includes('*')) v3 = extractNumber(parts[i]);
        }
        raw.push({ number: num, v1, v2, v3 });
    }
    return mergeNumberList(raw);
}

function splitExpression(expr) {
    const matches = expr.match(/([-+*x/])?\d+|\w+/gi);
    return matches || [];
}

function extractNumber(s) {
    const m = s.match(/\d+/);
    return m ? parseInt(m[0]) : 0;
}

function mergeNumberList(raw) {
    const map = {};
    for (const item of raw) {
        if (map[item.number]) {
            map[item.number].v1 += item.v1;
            map[item.number].v2 += item.v2;
            map[item.number].v3 += item.v3;
        } else {
            map[item.number] = { number: item.number, v1: item.v1, v2: item.v2, v3: item.v3 };
        }
    }
    return Object.values(map);
}

// --- NumberInfo ---
function createSwapNumberList(input) {
    if (!input || !input.trim()) return [];
    const parts = input.trim().split(/\s+/);
    const list = [];
    for (const part of parts) {
        if (part.length === 2) {
            addIfNotExists(list, `${part[1]}${part[0]}`);
            addIfNotExists(list, `${part[0]}${part[1]}`);
        } else if (part.length === 3) {
            const perms = [
                `${part[0]}${part[1]}${part[2]}`,
                `${part[0]}${part[2]}${part[1]}`,
                `${part[1]}${part[0]}${part[2]}`,
                `${part[1]}${part[2]}${part[0]}`,
                `${part[2]}${part[0]}${part[1]}`,
                `${part[2]}${part[1]}${part[0]}`
            ];
            for (const p of perms) addIfNotExists(list, p);
        }
    }
    list.sort((a, b) => a.length === b.length ? a.localeCompare(b) : a.length - b.length);
    return list;
}

function createRejectList(input) {
    if (!input || !input.trim()) return [];
    const parts = input.trim().split(/\s+/);
    const list = [];
    for (const part of parts) {
        if (part.endsWith('*')) {
            const num = part.slice(0, -1);
            if (num.length === 2) {
                addIfNotExists(list, `${num[0]}${num[1]}`);
                addIfNotExists(list, `${num[1]}${num[0]}`);
            } else if (num.length === 3) {
                const perms = [
                    `${num[0]}${num[1]}${num[2]}`, `${num[0]}${num[2]}${num[1]}`,
                    `${num[1]}${num[0]}${num[2]}`, `${num[1]}${num[2]}${num[0]}`,
                    `${num[2]}${num[0]}${num[1]}`, `${num[2]}${num[1]}${num[0]}`
                ];
                for (const p of perms) addIfNotExists(list, p);
            } else {
                addIfNotExists(list, num);
            }
        } else {
            addIfNotExists(list, part);
        }
    }
    return list;
}

function addIfNotExists(list, item) {
    if (!list.includes(item)) list.push(item);
}

// --- LotteryCalculator ---
function createNumberListSplit(dataLines, exceptList, rejectList) {
    const allRaw = parseToNumberList(dataLines.join('\n'));
    const filtered = rejectList.length > 0
        ? allRaw.filter(n => !rejectList.includes(n.number))
        : allRaw;

    const normal = [], except = [];
    for (const item of filtered) {
        if (exceptList.includes(item.number)) {
            except.push({ ...item });
        } else {
            normal.push({ ...item });
        }
    }
    return { all: filtered, normal, except };
}

function calculateTotal(list) {
    const t = { nTotal: 0, n1aTotal: 0, n1bTotal: 0, n2aTotal: 0, n2bTotal: 0, n3aTotal: 0, n3bTotal: 0, n3cTotal: 0 };
    for (const l of list) {
        t.nTotal += l.v1 + l.v2 + l.v3;
        if (l.number.trim().length === 1) { t.n1aTotal += l.v1; t.n1bTotal += l.v2; }
        else if (l.number.trim().length === 2) { t.n2aTotal += l.v1; t.n2bTotal += l.v2; }
        else if (l.number.trim().length === 3) { t.n3aTotal += l.v1; t.n3bTotal += l.v2; t.n3cTotal += l.v3; }
    }
    return t;
}

function createWinPrize(config) {
    const win = { n3: null, n32: null, n3x: null, n2: null, n3ps: null };
    const n6 = config.N6 || '';
    if (n6.length >= 6) {
        win.n3 = n6.substring(n6.length - 3);
        win.n32 = n6.substring(n6.length - 2);
        const x = createSwapNumberList(win.n3);
        win.n3x = x.join(' ');
    }
    const n2 = config.N2 || '';
    if (n2.length === 2) win.n2 = n2;

    win.n3ps = [config.N31 || '', config.N32 || '', config.N33 || '', config.N34 || ''].join(' ').trim();
    return win;
}

function checkPrize(winNumberList, numberList, win) {
    for (const num of numberList) {
        if (num.number.length === 1) {
            if (win.n3 && win.n3.includes(num.number))
                updateWinNumber(winNumberList, { number: num.number, v1: num.v1, v2: 0, v3: 0 });
            if (win.n2 && win.n2.includes(num.number))
                updateWinNumber(winNumberList, { number: num.number, v1: 0, v2: num.v2, v3: 0 });
        } else if (num.number.length === 2) {
            if (num.number === win.n32)
                updateWinNumber(winNumberList, { number: num.number, v1: num.v1, v2: 0, v3: 0 });
            if (num.number === win.n2)
                updateWinNumber(winNumberList, { number: num.number, v1: 0, v2: num.v2, v3: 0 });
        } else if (num.number.length === 3) {
            if (num.number === win.n3)
                updateWinNumber(winNumberList, { number: num.number, v1: num.v1, v2: 0, v3: 0 });
            if (win.n3x && win.n3x.includes(num.number))
                updateWinNumber(winNumberList, { number: num.number, v1: 0, v2: 0, v3: num.v3 });
            if (win.n3ps && win.n3ps.includes(num.number))
                updateWinNumber(winNumberList, { number: num.number, v1: 0, v2: num.v2, v3: 0 });
        }
    }
}

function calculateWinPrizeTotal(winList, profile, exceptList, specialExceptList) {
    const t = { n3Total: 0, n32Total: 0, n3xTotal: 0, n2Total: 0, n3psTotal: 0, n31Total: 0, n21Total: 0, total: 0 };
    for (const num of winList) {
        const isExcept = (num.number.length === 2 || num.number.length === 3)
            && exceptList.includes(num.number)
            && !specialExceptList.includes(num.number);
        const mult = isExcept ? 0.5 : 1.0;

        if (num.number.length === 3 && num.v1 > 0)
            t.n3Total += Math.floor(num.v1 * mult) * profile.PrizeN3;
        if (num.number.length === 3 && num.v3 > 0)
            t.n3xTotal += Math.floor(num.v3 * mult) * profile.PrizeN3x;
        if (num.number.length === 2 && num.v1 > 0)
            t.n32Total += Math.floor(num.v1 * mult) * profile.PrizeN2;
        if (num.number.length === 2 && num.v2 > 0)
            t.n2Total += Math.floor(num.v2 * mult) * profile.PrizeN2;
        if (num.number.length === 3 && num.v2 > 0)
            t.n3psTotal += Math.floor(num.v2 * mult) * profile.PrizeN3x;
        if (num.number.length === 1 && num.v1 > 0)
            t.n31Total += num.v1 * profile.PrizeN13;
        if (num.number.length === 1 && num.v2 > 0)
            t.n21Total += num.v2 * profile.PrizeN12;
    }
    t.total = t.n3Total + t.n3xTotal + t.n32Total + t.n2Total + t.n3psTotal + t.n31Total + t.n21Total;
    return t;
}

function updateWinNumber(winList, num) {
    const item = winList.find(n => n.number === num.number);
    if (item) { item.v1 += num.v1; item.v2 += num.v2; item.v3 += num.v3; }
    else winList.push({ ...num });
}

function getNormalDealerNumberList(dataSections, exceptList, rejectList) {
    const raw = [];
    for (const data of dataSections) {
        const parsed = parseToNumberList(data.lines.join('\n'));
        for (const item of parsed) {
            if (rejectList.includes(item.number)) continue;
            if (!(exceptList.includes(item.number) && item.number.length === 2))
                raw.push(item);
        }
    }
    return mergeNumberList(raw);
}

function getExceptDealerNumberList(dataSections, exceptList, rejectList) {
    const raw = [];
    for (const data of dataSections) {
        const parsed = parseToNumberList(data.lines.join('\n'));
        for (const item of parsed) {
            if (rejectList.includes(item.number)) continue;
            if (exceptList.includes(item.number) && item.number.length === 2)
                raw.push(item);
        }
    }
    return mergeNumberList(raw);
}

function concatNumberList(list) {
    const sorted = [...list].sort((a, b) => a.number.length === b.number.length
        ? a.number.localeCompare(b.number) : a.number.length - b.number.length);
    let result = '';
    for (const l of sorted) {
        let line = l.number;
        if (l.v1 > 0) line += `+${l.v1}`;
        if (l.v2 > 0) line += `-${l.v2}`;
        if (l.v3 > 0) line += `x${l.v3}`;
        result += line + '\n';
    }
    return result;
}

// --- Profile Configs ---
function getCustomerProfileConfig() {
    return { PrizeN3: 500, PrizeN3x: 100, PrizeN2: 65, PrizeN13: 3, PrizeN12: 4, Discount1: 20, Discount2: 0 };
}
function getNormalDealerProfileConfig() {
    return { Code: 'NN', PrizeN3: 500, PrizeN3x: 100, PrizeN2: 65, PrizeN13: 3, PrizeN12: 4, Discount1: 30, Discount2: 10 };
}
function getExceptDealerProfileConfig() {
    return { Code: 'EE', PrizeN3: 450, PrizeN3x: 100, PrizeN2: 70, PrizeN13: 3, PrizeN12: 4, Discount1: 20, Discount2: 0 };
}

// --- Helper ---
function getExceptList(config) {
    const list = createSwapNumberList(config.ExceptNum1 || '');
    const except2 = config.ExceptNum2 || '';
    if (except2) list.push(...createSwapNumberList(except2));
    return list;
}

function getRejectListFromConfig(config) {
    return createRejectList(config.RejectNum || '');
}

// ===== Step 2: MessageManager =====

function buildWinPrizeMessage(winList, exceptList, profile, specialExceptList) {
    if (!winList || winList.length === 0) return '';
    let sb = '';
    const sorted = [...winList].sort((a, b) => a.number.length === b.number.length
        ? a.number.localeCompare(b.number) : a.number.length - b.number.length);
    for (const num of sorted) {
        const isExcept = (num.number.length === 2 || num.number.length === 3)
            && exceptList.includes(num.number)
            && !specialExceptList.includes(num.number);
        const exceptMsg = isExcept ? '  <<*** 50% ***' : '';

        if (num.number.length === 3 && num.v1 > 0)
            sb += `** 3 ตัวตรง ${num.number}+${num.v1} : ${num.v1} x ${profile.PrizeN3} = ${num.v1 * profile.PrizeN3}${exceptMsg}\n`;
        if (num.number.length === 3 && num.v3 > 0)
            sb += `** 3 ตัวโต๊ด ${num.number}x${num.v3} : ${num.v3} x ${profile.PrizeN3x} = ${num.v3 * profile.PrizeN3x}${exceptMsg}\n`;
        if (num.number.length === 2 && num.v1 > 0)
            sb += `** 2 ตัวบน ${num.number}+${num.v1} : ${num.v1} x ${profile.PrizeN2} = ${num.v1 * profile.PrizeN2}${exceptMsg}\n`;
        if (num.number.length === 2 && num.v2 > 0)
            sb += `** 2 ตัวล่าง ${num.number}-${num.v2} : ${num.v2} x ${profile.PrizeN2} = ${num.v2 * profile.PrizeN2}${exceptMsg}\n`;
        if (num.number.length === 3 && num.v2 > 0)
            sb += `** 3 ตัวล่าง ${num.number}-${num.v2} : ${num.v2} x ${profile.PrizeN3x} = ${num.v2 * profile.PrizeN3x}${exceptMsg}\n`;
        if (num.number.length === 1 && num.v1 > 0)
            sb += `** วิ่งบน ${num.number}+${num.v1} : ${num.v1} x ${profile.PrizeN13} = ${num.v1 * profile.PrizeN13}\n`;
        if (num.number.length === 1 && num.v2 > 0)
            sb += `** วิ่งล่าง ${num.number}-${num.v2} : ${num.v2} x ${profile.PrizeN12} = ${num.v2 * profile.PrizeN12}\n`;
    }
    return sb + '\n';
}

function createConfirmMessage(cust, config) {
    const exceptList = getExceptList(config);
    const rejectList = getRejectListFromConfig(config);
    const { all } = createNumberListSplit(cust.lines, exceptList, rejectList);
    const allTotal = calculateTotal(all);
    const title = config.Title || '';
    const name = cust.name || '';
    const now = new Date();
    const ts = `${now.getDate()}/${now.getMonth()+1}/${now.getFullYear()} ${now.toTimeString().slice(0,8)}`;

    let sb = `### ${title} ## ${name} ###\n`;
    sb += `ยอดทั้งหมด: ${allTotal.nTotal}\n`;
    for (const line of cust.lines) sb += line + '\n';
    sb += '\n' + ts + '\n';

    if (cust.showDetail) {
        const { normal, except } = createNumberListSplit(cust.lines, exceptList, rejectList);
        sb += '\n### รายละเอียด ###\n';
        if (normal.length > 0) { sb += '*** เลขปกติ ***\n' + concatNumberList(normal) + '\n'; }
        if (except.length > 0) { sb += '*** เลขอั้น ***\n' + concatNumberList(except) + '\n'; }
    }
    return sb;
}

function createPrizeMessage(cust, config) {
    const exceptList = getExceptList(config);
    const rejectList = getRejectListFromConfig(config);
    const specialExceptList = createSwapNumberList('');
    const { all, normal, except } = createNumberListSplit(cust.lines, exceptList, rejectList);
    const allTotal = calculateTotal(all);
    const normalTotal = calculateTotal(normal);
    const exceptTotal = calculateTotal(except);

    const winList = [];
    const winPrize = createWinPrize(config);
    checkPrize(winList, normal, winPrize);
    checkPrize(winList, except, winPrize);

    const profile = getCustomerProfileConfig();
    profile.Code = cust.name || '';
    const winPrizeTotal = calculateWinPrizeTotal(winList, profile, exceptList, specialExceptList);

    const title = config.Title || '';
    const now = new Date();
    const ts = `${now.getDate()}/${now.getMonth()+1}/${now.getFullYear()} ${now.toTimeString().slice(0,8)}`;

    let sb = `### ${title} ## ${profile.Code} ###\n`;
    sb += buildWinPrizeMessage(winList, exceptList, profile, specialExceptList);
    sb += `## ยอดทั้งหมด: ${allTotal.nTotal}\n`;

    const discount1 = parseInt(cust.discount1) || 0;
    const discount2 = parseInt(cust.discount2) || 0;
    const n1Total = allTotal.n1aTotal + allTotal.n1bTotal;

    if (discount1 > 0 || discount2 > 0) {
        const discAmt1 = discount1 > 0 ? Math.floor((normalTotal.nTotal - n1Total) * (discount1 / 100)) : 0;
        const discAmt2 = discount2 > 0 ? Math.floor(n1Total * (discount2 / 100)) : 0;
        const grandTotal = allTotal.nTotal - discAmt1 - discAmt2 - winPrizeTotal.total;

        if (n1Total > 0) sb += `## ยอดเลขวิ่ง: ${n1Total}\n`;
        sb += `## เลขอั้น: ${exceptTotal.nTotal}\n`;
        sb += `## + ถูกรางวัล: ${winPrizeTotal.total}\n`;
        if (discAmt1 > 0) sb += `## - หักส่วนลด: ${discAmt1} <= (${allTotal.nTotal}-${n1Total}-${exceptTotal.nTotal})x${discount1}%\n`;
        if (discAmt2 > 0) sb += `## - หักส่วนลดวิ่ง: ${discAmt2} <= ${n1Total}x${discount2}%\n`;
        sb += `## = คงเหลือ: ${grandTotal}\n`;
    } else {
        sb += `## + ถูกรางวัล: ${winPrizeTotal.total}\n`;
        sb += `## = คงเหลือ: ${allTotal.nTotal - winPrizeTotal.total}\n`;
    }
    sb += ts + '\n';
    return sb;
}

function createConfirmMessageNormalDealer(dataSections, config) {
    const exceptList = getExceptList(config);
    const rejectList = getRejectListFromConfig(config);
    const dealerList = getNormalDealerNumberList(dataSections, exceptList, rejectList);
    const total = calculateTotal(dealerList);
    return buildDealerConfirmMessage(config, 'NN', dealerList, total);
}

function createConfirmMessageExceptDealer(dataSections, config) {
    const exceptList = getExceptList(config);
    const rejectList = getRejectListFromConfig(config);
    const dealerList = getExceptDealerNumberList(dataSections, exceptList, rejectList);
    const total = calculateTotal(dealerList);
    return buildDealerConfirmMessage(config, 'EE', dealerList, total);
}

function buildDealerConfirmMessage(config, code, list, total) {
    const title = config.Title || '';
    const now = new Date();
    const ts = `${now.getDate()}/${now.getMonth()+1}/${now.getFullYear()} ${now.toTimeString().slice(0,8)}`;
    let sb = `### ${title} - ${code} ###\n`;
    sb += concatNumberList(list);
    sb += '__________________________________________\n';
    sb += ":::: '+' = บน, '-' = ล่าง, 'x' = โต๊ด\n";
    sb += `:::: ยอดทั้งหมด: ${total.nTotal}\n`;
    sb += `:::: เลขวิ่ง: ${total.n1aTotal + total.n1bTotal}\n`;
    sb += `:::: ${ts}\n`;
    return sb;
}

function createPrizeMessageNormalDealer(dataSections, config, profile) {
    const exceptList = getExceptList(config);
    const rejectList = getRejectListFromConfig(config);
    const specialExceptList = createSwapNumberList('');
    const dealerList = getNormalDealerNumberList(dataSections, exceptList, rejectList);
    const total = calculateTotal(dealerList);

    const winList = [];
    const winPrize = createWinPrize(config);
    checkPrize(winList, dealerList, winPrize);
    const winPrizeTotal = calculateWinPrizeTotal(winList, profile, exceptList, specialExceptList);

    const title = config.Title || '';
    const now = new Date();
    const ts = `${now.getDate()}/${now.getMonth()+1}/${now.getFullYear()} ${now.toTimeString().slice(0,8)}`;

    let sb = `### ${title} ## ${profile.Code} ###\n`;
    sb += buildWinPrizeMessage(winList, exceptList, profile, specialExceptList);

    const n1Total = total.n1aTotal + total.n1bTotal;
    const discount1 = Math.floor((total.nTotal - n1Total) * (profile.Discount1 / 100));
    const discount2 = Math.floor(n1Total * (profile.Discount2 / 100));
    const grandTotal = total.nTotal - discount1 - discount2 - winPrizeTotal.total;

    sb += `## ยอดทั้งหมด: ${total.nTotal}\n`;
    sb += `## ยอดเลขวิ่ง: ${n1Total}\n`;
    sb += `## - หักส่วนลด: ${discount1}    *** (${total.nTotal} - ${n1Total}) x ${profile.Discount1}%\n`;
    sb += `## - หักส่วนลด เลขวิ่ง: ${discount2}    *** ${n1Total} x ${profile.Discount2}%\n`;
    sb += `## - ถูกรางวัล: ${winPrizeTotal.total}\n`;
    sb += `## = คงเหลือ: ${grandTotal}    *** ${total.nTotal} - ${discount1} - ${discount2} - ${winPrizeTotal.total}\n`;
    sb += ts + '\n';
    return sb;
}

function createPrizeMessageExceptDealer(dataSections, config, profile) {
    const exceptList = getExceptList(config);
    const rejectList = getRejectListFromConfig(config);
    const specialExceptList = createSwapNumberList(config.ExceptNum2 || '');
    const dealerList = getExceptDealerNumberList(dataSections, exceptList, rejectList);
    const total = calculateTotal(dealerList);

    const winList = [];
    const winPrize = createWinPrize(config);
    checkPrize(winList, dealerList, winPrize);
    const winPrizeTotal = calculateWinPrizeTotal(winList, profile, exceptList, specialExceptList);

    const title = config.Title || '';
    const now = new Date();
    const ts = `${now.getDate()}/${now.getMonth()+1}/${now.getFullYear()} ${now.toTimeString().slice(0,8)}`;

    let sb = `### ${title} ## ${profile.Code} ###\n`;
    sb += buildWinPrizeMessage(winList, exceptList, profile, specialExceptList);

    const n1Total = total.n1aTotal + total.n1bTotal;
    const discount1 = Math.floor((total.nTotal - n1Total) * (profile.Discount1 / 100));
    const grandTotal = total.nTotal - discount1 - winPrizeTotal.total;

    sb += `## ยอดทั้งหมด: ${total.nTotal}\n`;
    if (n1Total > 0)
        sb += `## - หักส่วนลด: ${discount1}    *** (${total.nTotal} - ${n1Total}) x ${profile.Discount1}%\n`;
    else
        sb += `## - หักส่วนลด: ${discount1}    *** ${total.nTotal} x ${profile.Discount1}%\n`;
    sb += `## - ถูกรางวัล: ${winPrizeTotal.total}\n`;
    sb += `## = คงเหลือ: ${grandTotal}    *** ${total.nTotal} - ${discount1} - ${winPrizeTotal.total}\n`;
    sb += ts + '\n';
    return sb;
}

// ===== Step 3: Data Layer (localStorage) =====

const STORAGE_SESSIONS = 'lux_sessions';
const STORAGE_TEMPLATES = 'lux_templates';
const STORAGE_CURRENT = 'lux_current_id';

function loadSessions() {
    return JSON.parse(localStorage.getItem(STORAGE_SESSIONS) || '[]');
}

function saveSessions(sessions) {
    localStorage.setItem(STORAGE_SESSIONS, JSON.stringify(sessions));
}

function loadTemplates() {
    return JSON.parse(localStorage.getItem(STORAGE_TEMPLATES) || '[]');
}

function saveTemplates(templates) {
    localStorage.setItem(STORAGE_TEMPLATES, JSON.stringify(templates));
}

function getCurrentSessionId() {
    return localStorage.getItem(STORAGE_CURRENT) || '';
}

function setCurrentSessionId(id) {
    localStorage.setItem(STORAGE_CURRENT, id);
}

function getCurrentSession() {
    const sessions = loadSessions();
    const id = getCurrentSessionId();
    return sessions.find(s => s.id === id) || null;
}

function saveCurrentSession(session) {
    const sessions = loadSessions();
    const idx = sessions.findIndex(s => s.id === session.id);
    if (idx >= 0) sessions[idx] = session;
    else sessions.unshift(session);
    saveSessions(sessions);
}

function deleteSession(id) {
    let sessions = loadSessions();
    sessions = sessions.filter(s => s.id !== id);
    saveSessions(sessions);
    if (getCurrentSessionId() === id) setCurrentSessionId('');
}

function createNewSession(name, prevConfig) {
    const session = {
        id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2),
        name,
        config: {
            Title: '', ExceptNum1: '', ExceptNum2: '', RejectNum: '',
            N6: '', N2: '', N31: '', N32: '', N33: '', N34: '',
            PrizeN3: '500', PrizeN2: '65', PrizeN3x: '100', PrizeN13: '3', PrizeN12: '4',
            NN_PrizeN3: '500', NN_PrizeN2: '65', NN_PrizeN3x: '100', NN_PrizeN13: '3', NN_PrizeN12: '4', NN_Discount1: '30', NN_Discount2: '10',
            EE_PrizeN3: '450', EE_PrizeN2: '70', EE_PrizeN3x: '100', EE_PrizeN13: '3', EE_PrizeN12: '4', EE_Discount1: '20', EE_Discount2: '0'
        },
        customers: []
    };
    // Copy config from previous session (except prize results)
    if (prevConfig) {
        const copyKeys = ['ExceptNum1','ExceptNum2','RejectNum','PrizeN3','PrizeN2','PrizeN3x','PrizeN13','PrizeN12',
            'NN_PrizeN3','NN_PrizeN2','NN_PrizeN3x','NN_PrizeN13','NN_PrizeN12','NN_Discount1','NN_Discount2',
            'EE_PrizeN3','EE_PrizeN2','EE_PrizeN3x','EE_PrizeN13','EE_PrizeN12','EE_Discount1','EE_Discount2'];
        for (const k of copyKeys) if (prevConfig[k]) session.config[k] = prevConfig[k];
    }
    // Load templates as customers
    const templates = loadTemplates();
    for (const t of templates) {
        session.customers.push({ code: t.code, name: t.name, discount1: t.discount1 || '', discount2: t.discount2 || '', showDetail: t.showDetail || false, entries: '' });
    }
    saveCurrentSession(session);
    setCurrentSessionId(session.id);
    return session;
}

// --- Export / Import ---
function exportSession(session) {
    let sb = '[CONFIG]\n';
    const c = session.config;
    sb += `Title:"${c.Title}"\n`;
    sb += `ExceptNum1:"${c.ExceptNum1}"\n`;
    sb += `ExceptNum2:"${c.ExceptNum2}"\n`;
    sb += `RejectNum:"${c.RejectNum}"\n`;
    sb += `N6:"${c.N6}"\n`;
    sb += `N2:"${c.N2}"\n`;
    sb += `N31:"${c.N31}"\n`;
    sb += `N32:"${c.N32}"\n`;
    sb += `N33:"${c.N33}"\n`;
    sb += `N34:"${c.N34}"\n`;
    sb += `PrizeN3:"${c.PrizeN3}"\n`;
    sb += `PrizeN2:"${c.PrizeN2}"\n`;
    sb += `PrizeN3x:"${c.PrizeN3x}"\n`;
    sb += `PrizeN13:"${c.PrizeN13}"\n`;
    sb += `PrizeN12:"${c.PrizeN12}"\n\n`;

    for (const cust of session.customers) {
        let header = `[DATA Code="${cust.code}" Name="${cust.name}"`;
        if (cust.discount1 && cust.discount1 !== '0') header += ` Discount1="${cust.discount1}"`;
        if (cust.discount2 && cust.discount2 !== '0') header += ` Discount2="${cust.discount2}"`;
        if (cust.showDetail) header += ` Detail="Y"`;
        header += ']';
        sb += header + '\n';
        if (cust.entries && cust.entries.trim()) sb += cust.entries.trim() + '\n';
        sb += '\n';
    }
    return sb;
}

function importSession(content, sessionName) {
    const session = createNewSession(sessionName || '', null);
    session.customers = [];
    const lines = content.split(/\r?\n/);
    let inConfig = false;
    let currentCust = null;
    let currentEntries = '';

    for (const line of lines) {
        if (line.trim() === '[CONFIG]') { inConfig = true; continue; }
        if (line.startsWith('[DATA')) {
            if (currentCust && currentEntries.trim()) currentCust.entries = currentEntries.trim();
            inConfig = false;
            currentCust = { code: '', name: '', discount1: '', discount2: '', showDetail: false, entries: '' };
            const codeM = line.match(/Code="([^"]*)"/); if (codeM) currentCust.code = codeM[1];
            const nameM = line.match(/Name="([^"]*)"/); if (nameM) currentCust.name = nameM[1];
            const d1M = line.match(/Discount1="([^"]*)"/); if (d1M) currentCust.discount1 = d1M[1];
            const d2M = line.match(/Discount2="([^"]*)"/); if (d2M) currentCust.discount2 = d2M[1];
            const detM = line.match(/Detail="([^"]*)"/); if (detM) currentCust.showDetail = detM[1] === 'Y';
            session.customers.push(currentCust);
            currentEntries = '';
            continue;
        }
        if (inConfig) {
            const m = line.match(/^([^:]+):"([^"]*)"/);
            if (m) session.config[m[1]] = m[2];
        } else if (currentCust) {
            if (line.trim()) currentEntries += line + '\n';
        }
    }
    if (currentCust && currentEntries.trim()) currentCust.entries = currentEntries.trim();
    if (!sessionName && session.config.Title) session.name = session.config.Title;

    saveCurrentSession(session);
    setCurrentSessionId(session.id);
    return session;
}

function createBackupJson() {
    return JSON.stringify({
        sessions: loadSessions(),
        templates: loadTemplates(),
        backupDate: new Date().toISOString()
    }, null, 2);
}

function restoreFromJson(json) {
    const data = JSON.parse(json);
    if (data.sessions) saveSessions(data.sessions);
    if (data.templates) saveTemplates(data.templates);
    return { sessions: (data.sessions || []).length, templates: (data.templates || []).length };
}

// --- Build InputData for MessageManager ---
function buildDataSections(session) {
    const sections = [];
    for (const cust of session.customers) {
        if (!cust.entries || !cust.entries.trim()) continue;
        const lines = cust.entries.split(/\r?\n/).filter(l => l.trim());
        sections.push({ name: cust.name, code: cust.code, discount1: cust.discount1, discount2: cust.discount2, showDetail: cust.showDetail, lines });
    }
    return sections;
}

function buildNNProfile(config) {
    return {
        Code: 'NN',
        PrizeN3: parseInt(config.NN_PrizeN3) || 500,
        PrizeN2: parseInt(config.NN_PrizeN2) || 65,
        PrizeN3x: parseInt(config.NN_PrizeN3x) || 100,
        PrizeN13: parseInt(config.NN_PrizeN13) || 3,
        PrizeN12: parseInt(config.NN_PrizeN12) || 4,
        Discount1: parseInt(config.NN_Discount1) || 30,
        Discount2: parseInt(config.NN_Discount2) || 10
    };
}

function buildEEProfile(config) {
    return {
        Code: 'EE',
        PrizeN3: parseInt(config.EE_PrizeN3) || 450,
        PrizeN2: parseInt(config.EE_PrizeN2) || 70,
        PrizeN3x: parseInt(config.EE_PrizeN3x) || 100,
        PrizeN13: parseInt(config.EE_PrizeN13) || 3,
        PrizeN12: parseInt(config.EE_PrizeN12) || 4,
        Discount1: parseInt(config.EE_Discount1) || 20,
        Discount2: parseInt(config.EE_Discount2) || 0
    };
}

// ===== Step 4: UI - Tab งวด + ลูกค้า =====

const app = document.getElementById('app');
let currentTab = 'session';

function showTab(tab) {
    currentTab = tab;
    document.querySelectorAll('.bottom-nav a').forEach(a => a.classList.remove('active'));
    const navEl = document.getElementById('nav-' + tab);
    if (navEl) navEl.classList.add('active');
    render();
}

function render() {
    if (currentTab === 'session') renderSession();
    else if (currentTab === 'customer') renderCustomer();
    else if (currentTab === 'entry') renderEntry();
    else if (currentTab === 'output') renderOutput();
    else if (currentTab === 'tool') renderTool();
}

function toast(msg) {
    let t = document.getElementById('toast');
    if (!t) { t = document.createElement('div'); t.id = 'toast'; document.body.appendChild(t); }
    t.textContent = msg; t.style.display = 'block';
    setTimeout(() => t.style.display = 'none', 2000);
}

// --- Tab: งวด ---
let sessionSections = { except: false, prize: false, custPrize: false, nn: false, ee: false };

function renderSession() {
    const sessions = loadSessions();
    const cur = getCurrentSession();
    const c = cur ? cur.config : null;

    app.innerHTML = `
        <h4>📅 งวด</h4>
        <div class="flex gap-2 mb-2">
            <select id="selSession" style="flex:1">
                <option value="">-- เลือกงวด --</option>
                ${sessions.map(s => `<option value="${s.id}" ${cur && cur.id === s.id ? 'selected' : ''}>${s.name}</option>`).join('')}
            </select>
            <button class="btn btn-primary" onclick="onNewSession()">+ ใหม่</button>
        </div>
        ${showNewSessionInput ? `<div class="card mb-2"><label class="form-label">ชื่องวดใหม่</label><div class="flex gap-1"><input id="newSessionName" value="${new Date().toLocaleDateString('th-TH')}" style="flex:1"><button class="btn btn-sm btn-success" onclick="confirmNewSession()">✓</button><button class="btn btn-sm btn-secondary" onclick="cancelNewSession()">✕</button></div></div>` : ''}
        ${confirmDeleteSession && cur ? `<div class="card mb-2" style="border-color:var(--primary)"><p style="font-size:0.85rem">ลบงวด "${esc(cur.name)}"?</p><div class="flex gap-1 mt-1"><button class="btn btn-sm btn-danger" onclick="doDeleteSession()">ยืนยัน</button><button class="btn btn-sm btn-secondary" onclick="cancelDeleteSession()">ยกเลิก</button></div></div>` : ''}
        ${cur && !confirmDeleteSession ? `<div class="flex gap-1 mb-2">
            <button class="btn btn-sm btn-danger" onclick="onDeleteSession()">🗑️ ลบงวดนี้</button>
            <button class="btn btn-sm btn-outline" onclick="onExportSession()">📤 Export</button>
            <button class="btn btn-sm btn-outline" onclick="onImportSession()">📥 Import</button>
        </div>` : ''}
        ${cur ? renderConfigUI(c) : '<p class="text-muted mt-2">กรุณาเลือกหรือสร้างงวดใหม่</p>'}
    `;
    document.getElementById('selSession').addEventListener('change', e => {
        setCurrentSessionId(e.target.value);
        renderSession();
    });
}

function renderConfigUI(c) {
    return `
        <div class="card">
            <label class="form-label">ชื่องวด / Title</label>
            <input id="cfgTitle" value="${esc(c.Title)}" placeholder="เช่น 1/6/68">
        </div>
        <div class="section-toggle" onclick="toggleSec('except')">${sessionSections.except ? '▼' : '▶'} เลขอั้น / ไม่รับ</div>
        <div class="card ${sessionSections.except ? '' : 'hidden'}" id="secExcept">
            <label class="form-label">เลขอั้น 1 (swap)</label>
            <input id="cfgExcept1" value="${esc(c.ExceptNum1)}" placeholder="เช่น 123 45">
            <label class="form-label mt-1">เลขอั้น 2 (swap)</label>
            <input id="cfgExcept2" value="${esc(c.ExceptNum2)}" placeholder="เช่น 678">
            <label class="form-label mt-1">เลขไม่รับ (* = swap)</label>
            <input id="cfgReject" value="${esc(c.RejectNum)}" placeholder="เช่น 19 91 456*">
        </div>
        <div class="section-toggle" onclick="toggleSec('prize')">${sessionSections.prize ? '▼' : '▶'} ผลรางวัล</div>
        <div class="card ${sessionSections.prize ? '' : 'hidden'}" id="secPrize">
            <label class="form-label">เลข 6 ตัว (N6)</label>
            <input id="cfgN6" value="${esc(c.N6)}" placeholder="เช่น 123456">
            <div class="config-grid mt-1">
                <div><label class="form-label">2 ตัวล่าง</label><input id="cfgN2" value="${esc(c.N2)}" placeholder="N2"></div>
                <div><label class="form-label">3 ตัวล่าง 1</label><input id="cfgN31" value="${esc(c.N31)}"></div>
                <div><label class="form-label">3 ตัวล่าง 2</label><input id="cfgN32x" value="${esc(c.N32)}"></div>
                <div><label class="form-label">3 ตัวล่าง 3</label><input id="cfgN33" value="${esc(c.N33)}"></div>
                <div><label class="form-label">3 ตัวล่าง 4</label><input id="cfgN34" value="${esc(c.N34)}"></div>
            </div>
        </div>
        <div class="section-toggle" onclick="toggleSec('custPrize')">${sessionSections.custPrize ? '▼' : '▶'} อัตราจ่ายลูกค้า</div>
        <div class="card ${sessionSections.custPrize ? '' : 'hidden'}" id="secCustPrize">
            <div class="config-grid col3">
                <div><label class="form-label">3ตัวตรง</label><input id="cfgPN3" value="${esc(c.PrizeN3)}"></div>
                <div><label class="form-label">2ตัว</label><input id="cfgPN2" value="${esc(c.PrizeN2)}"></div>
                <div><label class="form-label">โต๊ด</label><input id="cfgPN3x" value="${esc(c.PrizeN3x)}"></div>
                <div><label class="form-label">วิ่งบน</label><input id="cfgPN13" value="${esc(c.PrizeN13)}"></div>
                <div><label class="form-label">วิ่งล่าง</label><input id="cfgPN12" value="${esc(c.PrizeN12)}"></div>
            </div>
        </div>
        <div class="section-toggle" onclick="toggleSec('nn')">${sessionSections.nn ? '▼' : '▶'} อัตราจ่าย NN (เจ้ามือปกติ)</div>
        <div class="card ${sessionSections.nn ? '' : 'hidden'}" id="secNN">
            <div class="config-grid col3">
                <div><label class="form-label">3ตัวตรง</label><input id="cfgNN3" value="${esc(c.NN_PrizeN3)}"></div>
                <div><label class="form-label">2ตัว</label><input id="cfgNN2" value="${esc(c.NN_PrizeN2)}"></div>
                <div><label class="form-label">โต๊ด</label><input id="cfgNN3x" value="${esc(c.NN_PrizeN3x)}"></div>
                <div><label class="form-label">วิ่งบน</label><input id="cfgNN13" value="${esc(c.NN_PrizeN13)}"></div>
                <div><label class="form-label">วิ่งล่าง</label><input id="cfgNN12" value="${esc(c.NN_PrizeN12)}"></div>
                <div><label class="form-label">ส่วนลด%</label><input id="cfgNND1" value="${esc(c.NN_Discount1)}"></div>
                <div><label class="form-label">ลดวิ่ง%</label><input id="cfgNND2" value="${esc(c.NN_Discount2)}"></div>
            </div>
        </div>
        <div class="section-toggle" onclick="toggleSec('ee')">${sessionSections.ee ? '▼' : '▶'} อัตราจ่าย EE (เจ้ามือเลขอั้น)</div>
        <div class="card ${sessionSections.ee ? '' : 'hidden'}" id="secEE">
            <div class="config-grid col3">
                <div><label class="form-label">3ตัวตรง</label><input id="cfgEE3" value="${esc(c.EE_PrizeN3)}"></div>
                <div><label class="form-label">2ตัว</label><input id="cfgEE2" value="${esc(c.EE_PrizeN2)}"></div>
                <div><label class="form-label">โต๊ด</label><input id="cfgEE3x" value="${esc(c.EE_PrizeN3x)}"></div>
                <div><label class="form-label">วิ่งบน</label><input id="cfgEE13" value="${esc(c.EE_PrizeN13)}"></div>
                <div><label class="form-label">วิ่งล่าง</label><input id="cfgEE12" value="${esc(c.EE_PrizeN12)}"></div>
                <div><label class="form-label">ส่วนลด%</label><input id="cfgEED1" value="${esc(c.EE_Discount1)}"></div>
            </div>
        </div>
        <button class="btn btn-success mt-2" onclick="saveConfig()">💾 บันทึก Config</button>
    `;
}

function toggleSec(key) {
    sessionSections[key] = !sessionSections[key];
    renderSession();
}

function saveConfig() {
    const cur = getCurrentSession();
    if (!cur) return;
    const g = id => (document.getElementById(id) || {}).value || '';
    cur.config.Title = g('cfgTitle'); cur.name = g('cfgTitle') || cur.name;
    cur.config.ExceptNum1 = g('cfgExcept1'); cur.config.ExceptNum2 = g('cfgExcept2');
    cur.config.RejectNum = g('cfgReject');
    cur.config.N6 = g('cfgN6'); cur.config.N2 = g('cfgN2');
    cur.config.N31 = g('cfgN31'); cur.config.N32 = g('cfgN32x'); cur.config.N33 = g('cfgN33'); cur.config.N34 = g('cfgN34');
    cur.config.PrizeN3 = g('cfgPN3'); cur.config.PrizeN2 = g('cfgPN2'); cur.config.PrizeN3x = g('cfgPN3x');
    cur.config.PrizeN13 = g('cfgPN13'); cur.config.PrizeN12 = g('cfgPN12');
    cur.config.NN_PrizeN3 = g('cfgNN3'); cur.config.NN_PrizeN2 = g('cfgNN2'); cur.config.NN_PrizeN3x = g('cfgNN3x');
    cur.config.NN_PrizeN13 = g('cfgNN13'); cur.config.NN_PrizeN12 = g('cfgNN12');
    cur.config.NN_Discount1 = g('cfgNND1'); cur.config.NN_Discount2 = g('cfgNND2');
    cur.config.EE_PrizeN3 = g('cfgEE3'); cur.config.EE_PrizeN2 = g('cfgEE2'); cur.config.EE_PrizeN3x = g('cfgEE3x');
    cur.config.EE_PrizeN13 = g('cfgEE13'); cur.config.EE_PrizeN12 = g('cfgEE12');
    cur.config.EE_Discount1 = g('cfgEED1');
    saveCurrentSession(cur);
    toast('บันทึกแล้ว');
}

let showNewSessionInput = false;

function onNewSession() {
    showNewSessionInput = true;
    renderSession();
    setTimeout(() => { const el = document.getElementById('newSessionName'); if (el) el.focus(); }, 50);
}

function confirmNewSession() {
    const name = (document.getElementById('newSessionName').value || '').trim();
    if (!name) return;
    const sessions = loadSessions();
    const prevConfig = sessions.length > 0 ? sessions[0].config : null;
    createNewSession(name, prevConfig);
    showNewSessionInput = false;
    renderSession();
}

function cancelNewSession() {
    showNewSessionInput = false;
    renderSession();
}

let confirmDeleteSession = false;

function onDeleteSession() {
    confirmDeleteSession = true;
    renderSession();
}

function doDeleteSession() {
    const cur = getCurrentSession();
    if (cur) deleteSession(cur.id);
    confirmDeleteSession = false;
    renderSession();
}

function cancelDeleteSession() {
    confirmDeleteSession = false;
    renderSession();
}

function onExportSession() {
    const cur = getCurrentSession();
    if (!cur) return;
    const text = exportSession(cur);
    const blob = new Blob([text], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `LuX_${cur.name.replace(/\//g, '-')}.txt`;
    a.click();
}

function onImportSession() {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = '.txt,.json';
    input.onchange = e => {
        const file = e.target.files[0]; if (!file) return;
        const reader = new FileReader();
        reader.onload = ev => {
            const content = ev.target.result;
            if (content.trim().startsWith('{')) {
                // JSON backup
                const r = restoreFromJson(content);
                toast(`Restore: ${r.sessions} งวด, ${r.templates} template`);
            } else {
                const session = importSession(content, file.name.replace(/\.txt$/, ''));
                toast(`Import "${session.name}" (${session.customers.length} คน)`);
            }
            renderSession();
        };
        reader.readAsText(file);
    };
    input.click();
}

// --- Tab: ลูกค้า ---
let editingCustIdx = -1;

function renderCustomer() {
    const cur = getCurrentSession();
    if (!cur) { app.innerHTML = '<h4>👥 ลูกค้า</h4><p class="text-muted">กรุณาเลือกงวดก่อน</p>'; return; }

    let grandTotal = 0;
    const custHtml = cur.customers.map((cust, i) => {
        const total = calcEntryTotal(cust.entries);
        grandTotal += total;
        if (editingCustIdx === i) return renderCustEditRow(cust, i);
        if (confirmDeleteCustIdx === i) return `<div class="card mb-1" style="border-color:var(--primary)"><p style="font-size:0.85rem">ลบ ${esc(cust.name)}?</p><div class="flex gap-1 mt-1"><button class="btn btn-sm btn-danger" onclick="doDeleteCust(${i})">ยืนยัน</button><button class="btn btn-sm btn-secondary" onclick="cancelDeleteCust()">ยกเลิก</button></div></div>`;
        return `<div class="cust-item">
            <div class="move-btns"><button onclick="moveCust(${i},-1)">▲</button><button onclick="moveCust(${i},1)">▼</button></div>
            <span class="code">${esc(cust.code)}</span>
            <span class="name">${esc(cust.name)}${cust.discount1 ? ' ('+cust.discount1+'%)' : ''}</span>
            <span class="total">${total > 0 ? '฿'+total.toLocaleString() : '-'}</span>
            <div class="actions">
                <button onclick="editingCustIdx=${i};renderCustomer()">✏️</button>
                <button onclick="deleteCust(${i})">✕</button>
            </div>
        </div>`;
    }).join('');

    app.innerHTML = `
        <h4>👥 ลูกค้า <small style="color:var(--success)">ยอดรวม: ฿${grandTotal.toLocaleString()}</small></h4>
        ${custHtml}
        <hr>
        <div class="card">
            <div class="flex gap-1">
                <input id="addCode" placeholder="รหัส" style="width:60px">
                <input id="addName" placeholder="ชื่อ" style="flex:1">
                <button class="btn btn-primary" onclick="addCust()">+</button>
            </div>
        </div>
    `;
}

function renderCustEditRow(cust, i) {
    return `<div class="card mb-1">
        <div class="flex gap-1 mb-1">
            <input id="editCode" value="${esc(cust.code)}" style="width:60px" placeholder="รหัส">
            <input id="editName" value="${esc(cust.name)}" style="flex:1" placeholder="ชื่อ">
        </div>
        <div class="flex gap-1 mb-1">
            <input id="editD1" value="${esc(cust.discount1)}" placeholder="ส่วนลด%" style="width:80px">
            <input id="editD2" value="${esc(cust.discount2)}" placeholder="ลดวิ่ง%" style="width:80px">
            <label style="font-size:0.78rem;color:var(--accent);display:flex;align-items:center;gap:4px">
                <input type="checkbox" id="editDetail" ${cust.showDetail ? 'checked' : ''}> รายละเอียด
            </label>
        </div>
        <div class="flex gap-1">
            <button class="btn btn-sm btn-success" onclick="saveCustEdit(${i})">✓ บันทึก</button>
            <button class="btn btn-sm btn-secondary" onclick="editingCustIdx=-1;renderCustomer()">ยกเลิก</button>
        </div>
    </div>`;
}

function addCust() {
    const cur = getCurrentSession(); if (!cur) return;
    const code = document.getElementById('addCode').value.trim() || `C${(cur.customers.length+1).toString().padStart(2,'0')}`;
    const name = document.getElementById('addName').value.trim();
    if (!name) return;
    cur.customers.push({ code, name, discount1: '', discount2: '', showDetail: false, entries: '' });
    saveCurrentSession(cur);
    renderCustomer();
}

function saveCustEdit(i) {
    const cur = getCurrentSession(); if (!cur) return;
    cur.customers[i].code = document.getElementById('editCode').value.trim();
    cur.customers[i].name = document.getElementById('editName').value.trim();
    cur.customers[i].discount1 = document.getElementById('editD1').value.trim();
    cur.customers[i].discount2 = document.getElementById('editD2').value.trim();
    cur.customers[i].showDetail = document.getElementById('editDetail').checked;
    saveCurrentSession(cur);
    editingCustIdx = -1;
    renderCustomer();
}

let confirmDeleteCustIdx = -1;

function deleteCust(i) {
    confirmDeleteCustIdx = i;
    renderCustomer();
}

function doDeleteCust(i) {
    const cur = getCurrentSession(); if (!cur) return;
    cur.customers.splice(i, 1);
    saveCurrentSession(cur);
    confirmDeleteCustIdx = -1;
    renderCustomer();
}

function cancelDeleteCust() {
    confirmDeleteCustIdx = -1;
    renderCustomer();
}

function moveCust(i, dir) {
    const cur = getCurrentSession(); if (!cur) return;
    const j = i + dir;
    if (j < 0 || j >= cur.customers.length) return;
    [cur.customers[i], cur.customers[j]] = [cur.customers[j], cur.customers[i]];
    saveCurrentSession(cur);
    renderCustomer();
}

function calcEntryTotal(entries) {
    if (!entries || !entries.trim()) return 0;
    let total = 0;
    for (const line of entries.split(/\r?\n/)) {
        const m = line.trim().match(/^(\d{1,3})(?:\+(\d+))?(?:-(\d+))?(?:[*x](\d+))?$/i);
        if (m) {
            if (m[2]) total += parseInt(m[2]);
            if (m[3]) total += parseInt(m[3]);
            if (m[4]) total += parseInt(m[4]);
        }
    }
    return total;
}

function esc(s) { return (s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

// --- Tab: กรอกเลข ---
let selectedCustIdx = 0;

function renderEntry() {
    const cur = getCurrentSession();
    if (!cur || cur.customers.length === 0) {
        app.innerHTML = '<h4>✏️ กรอกเลข</h4><p class="text-muted">กรุณาเพิ่มลูกค้าก่อน</p>'; return;
    }
    if (selectedCustIdx >= cur.customers.length) selectedCustIdx = 0;
    const cust = cur.customers[selectedCustIdx];
    const total = calcEntryTotal(cust.entries);
    const lineCount = cust.entries ? cust.entries.split(/\r?\n/).filter(l => l.trim().match(/^\d{1,3}(?:[+\-*x]\d+)/i)).length : 0;

    app.innerHTML = `
        <h4>✏️ กรอกเลข</h4>
        <select id="selCust" class="mb-2">
            ${cur.customers.map((c, i) => `<option value="${i}" ${i === selectedCustIdx ? 'selected' : ''}>${c.code} - ${c.name}</option>`).join('')}
        </select>
        <div class="card">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
                <span style="color:var(--gold);font-weight:600">${esc(cust.code)} - ${esc(cust.name)}</span>
                <span style="color:var(--success);font-weight:600">ยอด: ฿${total.toLocaleString()} | ${lineCount} เลข</span>
            </div>
            <textarea id="txtEntries" rows="12" placeholder="พิมพ์เลข เช่น 93+20-20&#10;398+20-20*30&#10;5+100-100">${esc(cust.entries)}</textarea>
        </div>
        <div class="flex gap-1 mt-1">
            <button class="btn btn-success" onclick="saveEntries()">💾 บันทึก</button>
            <button class="btn btn-secondary" onclick="copyExcel()">📊 Excel</button>
            <button class="btn btn-outline" onclick="clearEntries()">🗑️ ล้าง</button>
        </div>
        ${confirmClearEntries ? `<div class="card mt-1" style="border-color:var(--primary)"><p style="font-size:0.85rem">ล้างเลขทั้งหมด?</p><div class="flex gap-1 mt-1"><button class="btn btn-sm btn-danger" onclick="doClearEntries()">ยืนยัน</button><button class="btn btn-sm btn-secondary" onclick="cancelClearEntries()">ยกเลิก</button></div></div>` : ''}
    `;
    document.getElementById('selCust').addEventListener('change', e => {
        saveEntriesSilent();
        selectedCustIdx = parseInt(e.target.value);
        renderEntry();
    });
    document.getElementById('txtEntries').addEventListener('input', updateEntryStatus);
}

function updateEntryStatus() {
    const text = document.getElementById('txtEntries').value || '';
    const cur = getCurrentSession(); if (!cur) return;
    const cust = cur.customers[selectedCustIdx];
    cust.entries = text;
    // Update total display live
    const total = calcEntryTotal(text);
    const lineCount = text.split(/\r?\n/).filter(l => l.trim().match(/^\d{1,3}(?:[+\-*x]\d+)/i)).length;
    const statusEl = document.querySelector('.card span[style*="success"]');
    if (statusEl) statusEl.textContent = `ยอด: ฿${total.toLocaleString()} | ${lineCount} เลข`;
}

function saveEntries() {
    saveEntriesSilent();
    toast('บันทึกแล้ว');
}

function saveEntriesSilent() {
    const cur = getCurrentSession(); if (!cur) return;
    const txt = document.getElementById('txtEntries');
    if (txt) cur.customers[selectedCustIdx].entries = txt.value || '';
    saveCurrentSession(cur);
}

function copyExcel() {
    const cur = getCurrentSession(); if (!cur) return;
    const entries = cur.customers[selectedCustIdx].entries || '';
    if (!entries.trim()) { toast('ยังไม่มีข้อมูล'); return; }
    let sb = '';
    for (const line of entries.split(/\r?\n/)) {
        const m = line.trim().match(/^(\d{1,3})(?:\+(\d+))?(?:-(\d+))?(?:[*x](\d+))?$/i);
        if (m && (m[2] || m[3] || m[4])) {
            const num = m[1], v1 = m[2] || '', v2 = m[3] || '', v3 = m[4] || '';
            if (num.length === 1) sb += `${num}\t\t\t\t${v1}\t${v2}\n`;
            else sb += `${num}\t${v1}\t${v2}\t${v3}\t\t\n`;
        }
    }
    navigator.clipboard.writeText(sb).then(() => toast('คัดลอกแล้ว วางใน Excel ได้เลย'));
}

let confirmClearEntries = false;

function clearEntries() {
    const cur = getCurrentSession(); if (!cur) return;
    if (!cur.customers[selectedCustIdx].entries) return;
    confirmClearEntries = true;
    renderEntry();
}

function doClearEntries() {
    const cur = getCurrentSession(); if (!cur) return;
    cur.customers[selectedCustIdx].entries = '';
    saveCurrentSession(cur);
    confirmClearEntries = false;
    renderEntry();
}

function cancelClearEntries() {
    confirmClearEntries = false;
    renderEntry();
}

// --- Tab: ผลลัพธ์ ---
let outputMode = 'confirm';
let outputTarget = 0;
let lastOutput = '';

function renderOutput() {
    const cur = getCurrentSession();
    if (!cur) { app.innerHTML = '<h4>📊 ผลลัพธ์</h4><p class="text-muted">กรุณาเลือกงวดก่อน</p>'; return; }

    const targets = [
        { label: 'NN - เจ้ามือปกติ', value: 'nn' },
        { label: 'EE - เจ้ามือเลขอั้น', value: 'ee' },
        ...cur.customers.map((c, i) => ({ label: `${c.code} - ${c.name}`, value: `cust_${i}` }))
    ];

    app.innerHTML = `
        <h4>📊 ผลลัพธ์</h4>
        <div class="flex gap-1 mb-2">
            <button class="tab-btn ${outputMode === 'confirm' ? 'active' : ''}" onclick="outputMode='confirm';renderOutput()">ยืนยัน</button>
            <button class="tab-btn ${outputMode === 'prize' ? 'active' : ''}" onclick="outputMode='prize';renderOutput()">ตรวจรางวัล</button>
        </div>
        <select id="selTarget" class="mb-2">
            ${targets.map((t, i) => `<option value="${t.value}" ${i === outputTarget ? 'selected' : ''}>${t.label}</option>`).join('')}
        </select>
        <div class="flex gap-1 mb-2">
            <button class="btn btn-primary" onclick="generateOutput()">⚡ Generate</button>
            <button class="btn btn-secondary" onclick="copyOutput()">📋 Copy</button>
            <button class="btn btn-secondary" onclick="copyOutputExcel()">📊 Excel</button>
        </div>
        <div class="output-box" id="outputBox">${esc(lastOutput) || '<span style="color:var(--accent)">กด Generate เพื่อสร้างข้อความ</span>'}</div>
    `;
    document.getElementById('selTarget').addEventListener('change', e => {
        const sel = document.getElementById('selTarget');
        outputTarget = sel.selectedIndex;
    });
}

function generateOutput() {
    const cur = getCurrentSession(); if (!cur) return;
    const sel = document.getElementById('selTarget');
    const val = sel.value;
    outputTarget = sel.selectedIndex;
    const config = cur.config;
    const dataSections = buildDataSections(cur);

    try {
        if (val === 'nn') {
            if (outputMode === 'confirm') lastOutput = createConfirmMessageNormalDealer(dataSections, config);
            else lastOutput = createPrizeMessageNormalDealer(dataSections, config, buildNNProfile(config));
        } else if (val === 'ee') {
            if (outputMode === 'confirm') lastOutput = createConfirmMessageExceptDealer(dataSections, config);
            else lastOutput = createPrizeMessageExceptDealer(dataSections, config, buildEEProfile(config));
        } else if (val.startsWith('cust_')) {
            const idx = parseInt(val.split('_')[1]);
            const cust = cur.customers[idx];
            const lines = (cust.entries || '').split(/\r?\n/).filter(l => l.trim());
            if (lines.length === 0) { lastOutput = `${cust.name} ยังไม่มีเลข`; }
            else {
                const custData = { name: cust.name, lines, discount1: cust.discount1, discount2: cust.discount2, showDetail: cust.showDetail };
                if (outputMode === 'confirm') lastOutput = createConfirmMessage(custData, config);
                else lastOutput = createPrizeMessage(custData, config);
            }
        }
    } catch (e) {
        lastOutput = 'ผิดพลาด: ' + e.message;
    }
    document.getElementById('outputBox').textContent = lastOutput;
}

function copyOutput() {
    if (!lastOutput) { toast('ยังไม่มีข้อความ'); return; }
    navigator.clipboard.writeText(lastOutput).then(() => toast('คัดลอกแล้ว'));
}

function copyOutputExcel() {
    const cur = getCurrentSession(); if (!cur) return;
    const sel = document.getElementById('selTarget');
    const val = sel.value;
    const config = cur.config;
    const exceptList = getExceptList(config);
    const rejectList = getRejectListFromConfig(config);
    const dataSections = buildDataSections(cur);
    let numberList;

    if (val === 'nn') {
        numberList = getNormalDealerNumberList(dataSections, exceptList, rejectList);
    } else if (val === 'ee') {
        numberList = getExceptDealerNumberList(dataSections, exceptList, rejectList);
    } else if (val.startsWith('cust_')) {
        const idx = parseInt(val.split('_')[1]);
        const cust = cur.customers[idx];
        const lines = (cust.entries || '').split(/\r?\n/).filter(l => l.trim());
        const { all } = createNumberListSplit(lines, exceptList, rejectList);
        numberList = all;
    }

    if (!numberList || numberList.length === 0) { toast('ไม่มีข้อมูล'); return; }

    let sb = '';
    const sorted = [...numberList].sort((a, b) => a.number.length === b.number.length ? a.number.localeCompare(b.number) : a.number.length - b.number.length);
    for (const num of sorted) {
        if (num.number.length === 1) sb += `${num.number}\t\t\t\t${num.v1}\t${num.v2}\n`;
        else sb += `${num.number}\t${num.v1}\t${num.v2}\t${num.v3}\t\t\n`;
    }
    navigator.clipboard.writeText(sb).then(() => toast('คัดลอก Excel แล้ว'));
}

// --- Tab: เครื่องมือ ---
let toolSubTab = 'convert';
let convertOutput = '';
let convertStatus = '';
let editingTplIdx = -1;

function renderTool() {
    app.innerHTML = `
        <h4>🔧 เครื่องมือ</h4>
        <div class="flex gap-1 mb-2">
            <button class="tab-btn ${toolSubTab === 'convert' ? 'active' : ''}" onclick="toolSubTab='convert';renderTool()">แปลงเลข</button>
            <button class="tab-btn ${toolSubTab === 'template' ? 'active' : ''}" onclick="toolSubTab='template';renderTool()">ลูกค้าประจำ</button>
            <button class="tab-btn ${toolSubTab === 'backup' ? 'active' : ''}" onclick="toolSubTab='backup';renderTool()">Backup</button>
        </div>
        <div id="toolContent"></div>
        <div class="footer">
            <p><strong>LuX</strong></p>
            <p>ระบบจัดการเลข</p>
            <p style="margin-top:8px">สร้างโดย <a href="https://promptpay.io/0923959404">Mana11Lab</a></p>
            <p style="margin-top:8px"><button class="btn btn-outline" onclick="copyLink()">📎 แชร์แอพนี้</button></p>
        </div>
    `;
    const content = document.getElementById('toolContent');
    if (toolSubTab === 'convert') renderConvert(content);
    else if (toolSubTab === 'template') renderTemplate(content);
    else if (toolSubTab === 'backup') renderBackup(content);
}

// --- Shorthand Converter ---
function renderConvert(el) {
    el.innerHTML = `
        <div class="card">
            <label class="form-label">พิมพ์แบบย่อ (คำสั่ง + เลข)</label>
            <textarea id="convertInput" rows="8" placeholder="ตัวอย่าง:\n+20-20\n93\n398\n//10-10*10\n123\n456"></textarea>
            <div class="flex gap-1 mt-1">
                <button class="btn btn-primary" onclick="doConvert()">⚡ แปลง</button>
                <button class="btn btn-secondary" onclick="copyConvert()">📋 Copy</button>
                <button class="btn btn-outline" onclick="clearConvert()">ล้าง</button>
            </div>
            ${convertStatus ? `<p class="mt-1" style="font-size:0.8rem;color:${convertStatus.startsWith('⚠') ? 'var(--primary)' : 'var(--success)'}"> ${convertStatus}</p>` : ''}
        </div>
        ${convertOutput ? `<div class="output-box mt-1">${esc(convertOutput)}</div>` : ''}
    `;
}

function doConvert() {
    const input = document.getElementById('convertInput').value || '';
    if (!input.trim()) { convertOutput = ''; convertStatus = ''; renderTool(); return; }
    const result = convertShorthand(input);
    convertOutput = result.output;
    convertStatus = result.hasError
        ? `⚠️ มี ${result.errorCount} บรรทัดที่ parse ไม่ได้`
        : `✅ ${result.lineCount} รายการ`;
    renderTool();
}

function copyConvert() {
    if (!convertOutput) { toast('ยังไม่มีผลลัพธ์'); return; }
    navigator.clipboard.writeText(convertOutput).then(() => toast('คัดลอกแล้ว'));
}

function clearConvert() {
    convertOutput = ''; convertStatus = '';
    renderTool();
}

function convertShorthand(input) {
    const lines = input.split(/\r?\n/);
    let sb = '', currentVolume = '', swapMode = false, lineCount = 0, errorCount = 0;

    for (const rawLine of lines) {
        const line = rawLine.trim();
        if (!line) continue;

        // Swap command: //
        if (line.startsWith('//')) {
            const vol = line.substring(2).trim();
            if (!vol) { sb += `⚠️ // (ไม่มียอดกำกับ)\n`; errorCount++; continue; }
            swapMode = true;
            currentVolume = normalizeVolume(vol);
            continue;
        }

        // Volume command: starts with + - *
        if (line.length > 1 && (line[0] === '+' || line[0] === '-' || line[0] === '*') && /\d/.test(line[1])) {
            swapMode = false;
            currentVolume = normalizeVolume(line);
            continue;
        }

        // Pure number (1-3 digits)
        if (/^\d{1,3}$/.test(line)) {
            if (!currentVolume) { sb += `⚠️ ${line} (ไม่มีคำสั่งกำกับ)\n`; errorCount++; continue; }
            if (swapMode) {
                const swapped = createSwapNumberList(line);
                for (const num of swapped) { sb += `${num}${currentVolume}\n`; lineCount++; }
            } else {
                sb += `${line}${currentVolume}\n`; lineCount++;
            }
            continue;
        }

        // Number with own volume: e.g. 39-100*100
        const numMatch = line.match(/^(\d{1,3})([+\-*x].+)$/i);
        if (numMatch) {
            const num = numMatch[1], vol = numMatch[2];
            const normVol = normalizeVolumeForNumber(vol, num.length);
            if (swapMode) {
                const swapped = createSwapNumberList(num);
                for (const s of swapped) { sb += `${s}${normVol}\n`; lineCount++; }
            } else {
                sb += `${num}${normVol}\n`; lineCount++;
            }
            continue;
        }

        sb += `⚠️ ${line}\n`; errorCount++;
    }
    return { output: sb.trimEnd(), lineCount, errorCount, hasError: errorCount > 0 };
}

function normalizeVolume(vol) {
    if (vol.startsWith('+') || vol.startsWith('-') || vol.startsWith('*')) return vol;
    return '+' + vol;
}

function normalizeVolumeForNumber(vol, numLength) {
    const parts = [...vol.matchAll(/([+\-*x])(\d+)/gi)];
    if (parts.length === 0) return vol;
    const values = parts.map(m => parseInt(m[2]));
    const ops = parts.map(m => m[1]);

    if (numLength === 1) {
        if (values.length >= 2) return `+${values[0]}-${values[1]}`;
        if (ops[0] === '-') return `-${values[0]}`;
        return `+${values[0]}`;
    } else if (numLength === 2) {
        if (values.length >= 2) return `+${values[0]}-${values[1]}`;
        if (ops[0] === '-') return `-${values[0]}`;
        return `+${values[0]}`;
    } else if (numLength === 3) {
        if (values.length >= 3) return `+${values[0]}-${values[1]}*${values[2]}`;
        if (values.length === 2) {
            if (ops.some(o => o === '*' || o.toLowerCase() === 'x')) return `+${values[0]}*${values[1]}`;
            return `+${values[0]}-${values[1]}`;
        }
        if (ops[0] === '-') return `-${values[0]}`;
        if (ops[0] === '*' || ops[0].toLowerCase() === 'x') return `*${values[0]}`;
        return `+${values[0]}`;
    }
    return vol;
}

// --- Template (ลูกค้าประจำ) ---
function renderTemplate(el) {
    const templates = loadTemplates();
    const listHtml = templates.map((t, i) => {
        if (editingTplIdx === i) return renderTplEditRow(t, i);
        const info = t.name + (t.discount1 ? ` (${t.discount1}%)` : '') + (t.discount2 ? ` วิ่ง${t.discount2}%` : '');
        return `<div class="cust-item">
            <div class="move-btns"><button onclick="moveTpl(${i},-1)">▲</button><button onclick="moveTpl(${i},1)">▼</button></div>
            <span class="code">${esc(t.code)}</span>
            <span class="name">${esc(info)}${t.showDetail ? ' 📋' : ''}</span>
            <div class="actions">
                <button onclick="editingTplIdx=${i};renderTool()">✏️</button>
                <button onclick="deleteTpl(${i})">✕</button>
            </div>
        </div>`;
    }).join('');

    el.innerHTML = `
        <p class="text-muted mb-2" style="font-size:0.8rem">ลูกค้าประจำจะถูกเพิ่มอัตโนมัติเมื่อสร้างงวดใหม่</p>
        ${listHtml}
        <div class="card mt-2">
            <div class="flex gap-1 mb-1">
                <input id="tplCode" placeholder="รหัส" style="width:60px">
                <input id="tplName" placeholder="ชื่อ" style="flex:1">
            </div>
            <div class="flex gap-1">
                <input id="tplD1" placeholder="ส่วนลด%" style="width:70px">
                <input id="tplD2" placeholder="ลดวิ่ง%" style="width:70px">
                <label style="font-size:0.75rem;color:var(--accent);display:flex;align-items:center;gap:3px">
                    <input type="checkbox" id="tplDetail"> รายละเอียด
                </label>
                <button class="btn btn-primary btn-sm" onclick="addTpl()">+</button>
            </div>
        </div>
    `;
}

function renderTplEditRow(t, i) {
    return `<div class="card mb-1">
        <div class="flex gap-1 mb-1">
            <input id="eTplCode" value="${esc(t.code)}" style="width:60px">
            <input id="eTplName" value="${esc(t.name)}" style="flex:1">
        </div>
        <div class="flex gap-1">
            <input id="eTplD1" value="${esc(t.discount1)}" placeholder="%" style="width:70px">
            <input id="eTplD2" value="${esc(t.discount2)}" placeholder="วิ่ง%" style="width:70px">
            <label style="font-size:0.75rem;color:var(--accent);display:flex;align-items:center;gap:3px">
                <input type="checkbox" id="eTplDetail" ${t.showDetail ? 'checked' : ''}> รายละเอียด
            </label>
        </div>
        <div class="flex gap-1 mt-1">
            <button class="btn btn-sm btn-success" onclick="saveTplEdit(${i})">✓</button>
            <button class="btn btn-sm btn-secondary" onclick="editingTplIdx=-1;renderTool()">ยกเลิก</button>
        </div>
    </div>`;
}

function addTpl() {
    const templates = loadTemplates();
    const code = document.getElementById('tplCode').value.trim() || `C${(templates.length+1).toString().padStart(2,'0')}`;
    const name = document.getElementById('tplName').value.trim();
    if (!name) return;
    templates.push({
        code, name,
        discount1: document.getElementById('tplD1').value.trim(),
        discount2: document.getElementById('tplD2').value.trim(),
        showDetail: document.getElementById('tplDetail').checked
    });
    saveTemplates(templates);
    renderTool();
}

function saveTplEdit(i) {
    const templates = loadTemplates();
    templates[i].code = document.getElementById('eTplCode').value.trim();
    templates[i].name = document.getElementById('eTplName').value.trim();
    templates[i].discount1 = document.getElementById('eTplD1').value.trim();
    templates[i].discount2 = document.getElementById('eTplD2').value.trim();
    templates[i].showDetail = document.getElementById('eTplDetail').checked;
    saveTemplates(templates);
    editingTplIdx = -1;
    renderTool();
}

function deleteTpl(i) {
    const templates = loadTemplates();
    templates.splice(i, 1);
    saveTemplates(templates);
    renderTool();
}

function moveTpl(i, dir) {
    const templates = loadTemplates();
    const j = i + dir;
    if (j < 0 || j >= templates.length) return;
    [templates[i], templates[j]] = [templates[j], templates[i]];
    saveTemplates(templates);
    renderTool();
}

// --- Backup/Restore ---
function renderBackup(el) {
    el.innerHTML = `
        <div class="card">
            <p style="font-size:0.85rem;margin-bottom:10px">สำรอง/กู้คืนข้อมูลทั้งหมด (งวด + ลูกค้าประจำ)</p>
            <div class="flex gap-1">
                <button class="btn btn-gold" onclick="doBackup()">📤 Backup</button>
                <button class="btn btn-secondary" onclick="doRestore()">📥 Restore</button>
            </div>
        </div>
    `;
}

function doBackup() {
    const json = createBackupJson();
    const blob = new Blob([json], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `LuX_Backup_${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    toast('Backup สำเร็จ');
}

function doRestore() {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = '.json';
    input.onchange = e => {
        const file = e.target.files[0]; if (!file) return;
        const reader = new FileReader();
        reader.onload = ev => {
            try {
                const r = restoreFromJson(ev.target.result);
                toast(`Restore: ${r.sessions} งวด, ${r.templates} template`);
                renderTool();
            } catch (err) {
                toast('ไฟล์ไม่ถูกต้อง');
            }
        };
        reader.readAsText(file);
    };
    input.click();
}

// --- Share ---
function copyLink() {
    navigator.clipboard.writeText(location.href).then(() => toast('คัดลอกลิงก์แล้ว'));
}

// --- Init ---
showTab('session');
