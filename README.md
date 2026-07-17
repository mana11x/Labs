# Mana11Lab

เครื่องมือเล็กๆ ใช้ฟรี ไม่มีโฆษณา — [mana11x.github.io/Labs](https://mana11x.github.io/Labs)

## Deploy

GitHub Pages serve จาก branch `gh-pages` ต้อง push ทั้งสอง branch ทุกครั้ง

```bash
git push origin main
git checkout gh-pages && git reset --hard main && git push origin gh-pages --force && git checkout main
```

---

## สำหรับ AI — Context ของโปรเจกต์

### Tech Stack

- **Vanilla JS** — ไม่มี framework ไม่มี build step
- **localStorage** — เก็บข้อมูลทั้งหมด ไม่มี backend
- **PWA** — ทุกแอพมี manifest.json + service-worker.js
- **Font** — IBM Plex Sans Thai จาก Google Fonts
- **Render pattern** — `render()` function เดียว สร้าง HTML string แล้ว `innerHTML` ทั้งหมด ไม่ใช้ DOM manipulation

### โครงสร้างโปรเจกต์

```
Mana11Lab/
├── index.html          ← หน้า landing page รวมทุกแอพ
├── favicon.svg
├── {AppName}/
│   ├── index.html      ← shell เปล่า โหลด app.css + app.js
│   ├── app.css         ← styles ทั้งหมดของแอพ
│   ├── app.js          ← logic ทั้งหมดของแอพ
│   ├── icon.svg        ← icon ของแอพ (SVG วาดเอง)
│   ├── manifest.json   ← PWA manifest
│   └── service-worker.js ← cache-first SW
```

### แอพที่มีอยู่

| แอพ | หมวด | คำอธิบาย |
|-----|------|-----------|
| DebtTracker | การเงิน | จัดการหนี้ ทวงเงิน/โอนคืน มีประวัติการรับ-จ่าย |
| SplitBill | การเงิน | หารบิลกลุ่ม มี 5 slot |
| CreditCardTracker | การเงิน | ติดตามค่าใช้จ่ายบัตรเครดิต |
| MiniCalc | การเงิน | คำนวณงบ / 6 โถ / %Calc |
| ThaiHelper60 | การเงิน | คำนวณสิทธิ์ 60/40 |
| LuX | เครื่องมือ | ระบบจัดการเลข |
| KuanBad | กีฬา | คิดเงินก๊วนแบด |
| BadCost | กีฬา | คำนวณค่าตีแบดส่วนตัว |
| TallyUp | เกม | จดแต้มวงไพ่ |
| CardBank | เกม | จัดการ Chip วงไพ่ |
| QuickPaste | จัดการชีวิต | เก็บข้อความใช้บ่อย |
| CheckPack | จัดการชีวิต | เช็คลิสต์เตรียมของ |
| StockLife | จัดการชีวิต | สต๊อกของใช้ส่วนตัว |
| PriorityMatrix | จัดการชีวิต | จัดลำดับงาน 4 ช่อง |
| ParetoFocus | จัดการชีวิต | กฎพาเรโต โฟกัสสิ่งสำคัญ |

### Design System (CSS Variables)

```css
--bg: #12101A          /* พื้นหลังหลัก */
--surface: #1E1A24     /* พื้นหลัง card */
--border: #3D3644      /* เส้นขอบ */
--text: #F9F9F9        /* ข้อความหลัก */
--text-secondary: #CEACBD
--primary: #ED153E     /* สีหลัก (แดง) */
--primary-hover: #D01035
--accent: #A7777D      /* สีรอง / placeholder */
--muted-bg: #EEEDED    /* ใช้กับ strong, h4 */
--radius: 14px
--radius-sm: 10px
```

### CSS Classes หลักที่ใช้ซ้ำทุกแอพ

- Layout: `.container`, `.flex`, `.flex-wrap`, `.gap-1`, `.gap-2`, `.items-center`, `.ml-auto`, `.w-full`
- Spacing: `.mt-1/2/3`, `.mb-1/2/3`
- Components: `.card`, `.btn`, `.btn-sm`, `.input-group`, `.alert`, `.badge`, `.section-header`
- Button variants: `.btn-primary`, `.btn-danger`, `.btn-secondary`, `.btn-outline`, `.btn-outline-danger`, `.btn-outline-warning`
- Utility: `.hidden`, `.text-center`, `.text-muted`, `#toast`

### Pattern การสร้างแอพใหม่

1. สร้างโฟลเดอร์ `{AppName}/` พร้อมไฟล์ครบ 6 ไฟล์
2. `index.html` — copy จากแอพอื่น เปลี่ยนแค่ `<title>`
3. `app.css` — copy base styles จาก SplitBill หรือ DebtTracker เพิ่ม custom ได้
4. `app.js` — pattern: `state` → `save/load` → `render()` → actions
5. `manifest.json` — เปลี่ยน `name` และ `short_name`
6. `service-worker.js` — เปลี่ยน `CACHE_NAME`
7. เพิ่ม card ใน `index.html` หลัก ในหมวดที่เหมาะสม

### Pattern app.js

```js
let state = { /* ข้อมูล */ };
let ui = { /* ui state เช่น editingId, confirmDelete */ };

const Store = {
    get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
    set(k, v) { localStorage.setItem(k, JSON.stringify(v)); }
};
function save() { Store.set('appname_state', state); }
function load() { const d = Store.get('appname_state'); if (d) state = d; }

function render() {
    let html = '';
    // สร้าง html string ทั้งหมด
    document.getElementById('app').innerHTML = html;
}

// helper
function esc(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }
function fmt(n) { return Number(n||0).toLocaleString('th-TH', {minimumFractionDigits:2, maximumFractionDigits:2}); }

document.addEventListener('DOMContentLoaded', () => { load(); render(); });
```

### หมวดใน index.html หลัก

```
💸 การเงิน
⭐ เครื่องมือ
🏸 กีฬา & 🎯 เกม
📋 จัดการชีวิต
```
