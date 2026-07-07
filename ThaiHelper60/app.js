const $ = s => document.querySelector(s);
const app = $('#app');

let state = JSON.parse(localStorage.getItem('th60') || 'null') || {
    dailyLimit: 200,
    remaining: 200
};

function save() { localStorage.setItem('th60', JSON.stringify(state)); }

function calc(price) {
    const gov = Math.min(price * 0.60, state.dailyLimit);
    const user = price - gov;
    const newRemaining = Math.max(state.remaining - gov, 0);
    return { gov: r2(gov), user: r2(user), newRemaining: r2(newRemaining) };
}

function calcReverse(remaining) {
    return r2(remaining / 0.60);
}

function r2(n) { return Math.round(n * 100) / 100; }

function render() {
    app.innerHTML = `
        <h4>🇹🇭 ไทยช่วยไทย 60/40</h4>
        <p class="text-muted" style="margin-bottom:16px">รัฐจ่าย 60% · ผู้ใช้จ่าย 40%</p>

        <div class="card">
            <label class="form-label">เพดานสิทธิ์ต่อวัน (บาท)</label>
            <input id="inLimit" type="tel" inputmode="numeric" value="${state.dailyLimit}" placeholder="200">
            <div class="mt-2">
                <label class="form-label">สิทธิ์คงเหลือวันนี้ (บาท)</label>
                <input id="inRemaining" type="tel" inputmode="numeric" value="${state.remaining}" placeholder="200">
            </div>
        </div>

        <hr>

        <div class="card">
            <label class="form-label">💰 ราคาสินค้า → ฉันต้องจ่ายเท่าไร?</label>
            <div class="flex gap-2">
                <input id="inPrice" type="tel" inputmode="numeric" placeholder="กรอกราคาสินค้า">
                <button class="btn btn-primary" onclick="doCalc()">คำนวณ</button>
            </div>
            <div id="result1"></div>
        </div>

        <hr>

        <div class="card">
            <label class="form-label">🎯 สิทธิ์คงเหลือ → ต้องซื้อของราคาเท่าไร?</label>
            <div class="flex gap-2">
                <input id="inRem2" type="tel" inputmode="numeric" placeholder="กรอกสิทธิ์คงเหลือ" value="${state.remaining}">
                <button class="btn btn-primary" onclick="doReverse()">คำนวณ</button>
            </div>
            <div id="result2"></div>
        </div>

        <div class="footer">
            <p><strong>ThaiHelper60</strong></p>
            <p>คำนวณสิทธิ์ไทยช่วยไทย 60/40</p>
            <p style="margin-top:8px">สร้างโดย <a href="https://promptpay.io/0923959404">Mana11Lab</a></p>
            <p style="margin-top:8px"><button class="btn btn-outline" onclick="copyLink()">📎 แชร์แอพนี้</button></p>
        </div>
        <div id="toast"></div>
    `;

    $('#inLimit').addEventListener('change', e => {
        state.dailyLimit = parseFloat(e.target.value) || 200;
        save();
    });
    $('#inRemaining').addEventListener('change', e => {
        state.remaining = parseFloat(e.target.value) || 0;
        save();
        $('#inRem2').value = state.remaining;
    });
}

function doCalc() {
    const price = parseFloat($('#inPrice').value) || 0;
    if (price <= 0) return;
    const { gov, user, newRemaining } = calc(price);
    $('#result1').innerHTML = `
        <div class="result-box">
            <p>รัฐช่วยจ่าย: <strong>${gov.toFixed(2)} บาท</strong></p>
            <p>ฉันจ่ายเอง: <span class="big">${user.toFixed(2)} บาท</span></p>
            <p>สิทธิ์คงเหลือใหม่: <strong>${newRemaining.toFixed(2)} บาท</strong></p>
        </div>
        <button class="btn btn-secondary mt-2" onclick="applyRemaining(${newRemaining})">✓ ใช้สิทธิ์คงเหลือใหม่</button>
    `;
}

function applyRemaining(val) {
    state.remaining = val;
    save();
    render();
}

function doReverse() {
    const rem = parseFloat($('#inRem2').value) || 0;
    if (rem <= 0) return;
    const target = calcReverse(rem);
    const userPay = r2(target - rem);
    $('#result2').innerHTML = `
        <div class="result-box">
            <p>ต้องซื้อของราคา: <span class="big">${target.toFixed(2)} บาท</span></p>
            <p>รัฐช่วย: <strong>${rem.toFixed(2)} บาท</strong> · จ่ายเอง: <strong>${userPay.toFixed(2)} บาท</strong></p>
        </div>
    `;
}

function copyLink() {
    navigator.clipboard.writeText(location.href).then(() => {
        const t = $('#toast');
        t.textContent = 'คัดลอกลิงก์แล้ว';
        t.style.display = 'block';
        setTimeout(() => t.style.display = 'none', 2000);
    });
}

render();
