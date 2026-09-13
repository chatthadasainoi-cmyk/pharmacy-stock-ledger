// Generates sample data (clearly flagged `sample: true`) for trying the app.
// Usage: node tools/make-sample.mjs <outDir>
// Writes products/<id>.json, moves/<YYYY-MM-DD>.json, meta/demo.json and sample-backup.json
// (the last one can be imported through ตั้งค่า → นำเข้าไฟล์สำรอง).
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const out = process.argv[2] || 'sample';
const pad = n => String(n).padStart(2, '0');
const dayKey = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const eanCheck = d12 => { let s = 0; for (let i = 0; i < 12; i++) s += +d12[i] * (i % 2 ? 3 : 1); return (10 - (s % 10)) % 10; };
const ean = body12 => body12 + eanCheck(body12);
let seed = 20260913;
const rnd = () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const pick = arr => arr[Math.floor(rnd() * arr.length)];

const U = (name, size, price) => ({ name, size, price });
const P = [
  { id: 'p-para500', name: 'พาราเซตามอล 500', generic: 'Paracetamol', strength: '500 mg', form: 'เม็ด', cat: 'ยาสามัญประจำบ้าน', reorder: 200, w: 10,
    units: [U('เม็ด', 1, 1), U('แผง', 10, 10), U('กล่อง', 100, 85)], codes: [['2000000100010', 'กล่อง'], ['2000000100027', 'แผง']],
    lots: [['P2507A', '2027-06-30', 600]] },
  { id: 'p-amox500', name: 'อะม็อกซีซิลลิน 500', generic: 'Amoxicillin', strength: '500 mg', form: 'แคปซูล', cat: 'ยาอันตราย', reorder: 100, w: 6,
    units: [U('แคปซูล', 1, 4), U('แผง', 10, 35), U('กล่อง', 100, 300)], codes: [['2000000200017', 'กล่อง']],
    lots: [['AM2411', '2026-12-31', 300]] },
  { id: 'p-cet10', name: 'เซทิริซีน 10', generic: 'Cetirizine', strength: '10 mg', form: 'เม็ด', cat: 'ยาอันตราย', reorder: 50, w: 6,
    units: [U('เม็ด', 1, 2), U('แผง', 10, 15), U('กล่อง', 50, 65)], codes: [['2000000300014', 'กล่อง']],
    lots: [['CZ2308', '2026-08-28', 120], ['CZ2503', '2027-09-30', 400]] },
  { id: 'p-ome20', name: 'โอเมพราโซล 20', generic: 'Omeprazole', strength: '20 mg', form: 'แคปซูล', cat: 'ยาอันตราย', reorder: 60, w: 5,
    units: [U('แคปซูล', 1, 3), U('แผง', 10, 25), U('กล่อง', 100, 220)], codes: [['2000000400011', 'กล่อง']],
    lots: [['OM2410', '2026-10-31', 240], ['OM2505', '2028-04-30', 200]] },
  { id: 'p-ors', name: 'ผงเกลือแร่ ORS', generic: 'Oral rehydration salts', strength: '3.3 g', form: 'ผง', cat: 'ยาสามัญประจำบ้าน', reorder: 30, w: 5,
    units: [U('ซอง', 1, 5), U('กล่อง', 50, 220)], codes: [['2000000500018', 'กล่อง'], ['2000000500025', 'ซอง']],
    lots: [['OR2411', '2026-11-30', 80]] },
  { id: 'p-ibu400', name: 'ไอบูโพรเฟน 400', generic: 'Ibuprofen', strength: '400 mg', form: 'เม็ด', cat: 'ยาอันตราย', reorder: 80, w: 5,
    units: [U('เม็ด', 1, 2), U('แผง', 10, 18), U('กล่อง', 100, 150)], codes: [['2000000600015', 'กล่อง']],
    lots: [['IB2502', '2027-11-30', 400]] },
  { id: 'p-lora10', name: 'ลอราทาดีน 10', generic: 'Loratadine', strength: '10 mg', form: 'เม็ด', cat: 'ยาอันตราย', reorder: 50, w: 4,
    units: [U('เม็ด', 1, 3), U('แผง', 10, 25), U('กล่อง', 100, 200)], codes: [['2000000700012', 'กล่อง']],
    lots: [['LR2504', '2028-03-31', 200]] },
  { id: 'p-tram50', name: 'ทรามาดอล 50', generic: 'Tramadol HCl', strength: '50 mg', form: 'แคปซูล', cat: 'ยาควบคุมพิเศษ', reorder: 20, w: 1.2,
    units: [U('แคปซูล', 1, 5), U('แผง', 10, 45), U('กล่อง', 100, 400)], codes: [['2000000800019', 'กล่อง']],
    lots: [['TM2501', '2027-12-31', 120]] },
  { id: 'p-calam', name: 'คาลาไมน์ โลชั่น', generic: 'Calamine lotion', strength: '60 ml', form: 'น้ำ', cat: 'ยาสามัญประจำบ้าน', reorder: 6, w: 2,
    units: [U('ขวด', 1, 35), U('โหล', 12, 380)], codes: [['2000000900016', 'ขวด']],
    lots: [['CL2506', '2028-05-31', 24]] },
  { id: 'p-salb', name: 'ซาลบูทามอล สเปรย์พ่น', generic: 'Salbutamol', strength: '100 mcg/พัฟ', form: 'สเปรย์', cat: 'ยาอันตราย', reorder: 5, w: 1.6,
    units: [U('หลอด', 1, 120)], codes: [['2000001000013', 'หลอด']],
    lots: [['SB25K07', '2027-10-31', 10]] },
];
// sanity: all codes valid EAN-13
for (const p of P) for (const [c] of p.codes) if (ean(c.slice(0, 12)) !== c) { p.codes = p.codes.map(([cc, u]) => [ean(cc.slice(0, 12)), u]); break; }

const products = {};
const lotIds = {};
for (const p of P) {
  const lots = {};
  for (const [lot, exp] of p.lots) { const id = 'l-' + lot.toLowerCase(); lots[id] = { lot, exp, addedAt: '2026-08-25T02:00:00.000Z' }; lotIds[p.id + lot] = id; }
  products[p.id] = { name: p.name, generic: p.generic, strength: p.strength, form: p.form, cat: p.cat, regNo: '', reorder: p.reorder,
    units: p.units, codes: Object.fromEntries(p.codes), lots, sample: true };
}
const receipts = [
  { day: '2026-09-02', h: 10, pid: 'p-amox500', lot: 'AM2508', exp: '2028-07-31', unit: 'กล่อง', n: 2, cost: 180, note: 'บ.ตัวอย่างเภสัช · INV-0912' },
  { day: '2026-09-08', h: 14, pid: 'p-para500', lot: 'P2601B', exp: '2028-01-31', unit: 'กล่อง', n: 5, cost: 55, note: 'บ.ตัวอย่างเภสัช · INV-0957' },
  { day: '2026-09-11', h: 11, pid: 'p-ors', lot: 'OR2508', exp: '2028-08-31', unit: 'กล่อง', n: 2, cost: 150, note: 'ร้านส่งตัวอย่าง · 11/09' },
];
for (const r of receipts) { const id = 'l-' + r.lot.toLowerCase(); products[r.pid].lots[id] = { lot: r.lot, exp: r.exp, addedAt: `${r.day}T0${r.h - 7}:00:00.000Z` }; lotIds[r.pid + r.lot] = id; }

const moves = [];
let mseq = 0;
const mid = () => 'm-s' + (++mseq).toString(36);
const at = (day, h, m) => { const [y, mo, d] = day.split('-').map(Number); return new Date(y, mo - 1, d, h, m).toISOString(); };
const unitOf = (pid, name) => P.find(p => p.id === pid).units.find(u => u.name === name);
const stock = {}; // pid|lotId -> qty
const add = e => { e.sample = true; moves.push(e); const k = e.pid + '|' + e.lotId; stock[k] = (stock[k] || 0) + e.qty; };

for (const p of P) for (const [lot, , qty] of p.lots) {
  const base = p.units[0];
  add({ id: mid(), at: at('2026-08-25', 9, 0), type: 'opening', pid: p.id, lotId: lotIds[p.id + lot], qty, unit: base.name, unitQty: qty, unitPrice: 0, amount: 0, note: 'นับสต็อกตั้งต้น' });
}
const daysFrom = new Date(2026, 7, 26), today = new Date(2026, 8, 13);
const totalW = P.reduce((s, p) => s + p.w, 0);
const choose = () => { let r = rnd() * totalW; for (const p of P) { r -= p.w; if (r <= 0) return p; } return P[0]; };
for (let d = new Date(daysFrom); d <= today; d.setDate(d.getDate() + 1)) {
  const day = dayKey(d);
  for (const r of receipts.filter(x => x.day === day)) {
    const u = unitOf(r.pid, r.unit);
    add({ id: mid(), at: at(day, r.h, 5), type: 'receive', pid: r.pid, lotId: lotIds[r.pid + r.lot], qty: r.n * u.size, unit: u.name, unitQty: r.n, unitPrice: r.cost, amount: r.n * r.cost, note: r.note });
  }
  if (day === '2026-09-05') add({ id: mid(), at: at(day, 19, 40), type: 'adjust', pid: 'p-ibu400', lotId: lotIds['p-ibu400IB2502'], qty: -3, unit: 'เม็ด', unitQty: -3, unitPrice: 0, amount: 0, note: 'นับสต็อกไม่ตรง' });
  const isToday = day === dayKey(today);
  const nBills = isToday ? 5 : 3 + Math.floor(rnd() * 4);
  const times = Array.from({ length: nBills }, () => isToday ? 8.5 + rnd() * 3.2 : 8.5 + rnd() * 12).sort((a, b) => a - b);
  let seq = 0;
  for (const t of times) {
    const bill = `B${day.replace(/-/g, '').slice(2)}-${pad(++seq)}`;
    const when = at(day, Math.floor(t), Math.floor((t % 1) * 60));
    const nLines = rnd() < 0.7 ? 1 : 2;
    const used = new Set();
    for (let i = 0; i < nLines; i++) {
      const p = choose(); if (used.has(p.id)) continue; used.add(p.id);
      const u = p.units.length < 3 ? p.units[0] : rnd() < 0.72 ? p.units[1] : rnd() < 0.8 ? p.units[0] : p.units[p.units.length - 1];
      let n = u.size === 1 && p.units.length > 2 ? pick([2, 4, 6]) : u.size === 1 && p.units.length === 2 ? pick([1, 2, 3]) : rnd() < 0.8 ? 1 : 2;
      if (u.size >= 50) n = 1;
      let need = n * u.size;
      const lots = Object.entries(products[p.id].lots).map(([id, l]) => ({ id, ...l, qty: stock[p.id + '|' + id] || 0 }))
        .filter(l => l.qty > 0 && l.exp >= day).sort((a, b) => a.exp < b.exp ? -1 : 1);
      if (lots.reduce((s, l) => s + l.qty, 0) < need) continue;
      for (const l of lots) {
        if (need <= 0) break; const take = Math.min(l.qty, need); need -= take;
        const uq = take / u.size;
        add({ id: mid(), at: when, type: 'sale', pid: p.id, lotId: l.id, qty: -take, unit: u.name, unitQty: uq, unitPrice: u.price, amount: uq * u.price, bill, note: '' });
      }
    }
  }
}

const days = {};
for (const m of moves) { const k = dayKey(new Date(m.at)); (days[k] = days[k] || { date: k, entries: {} }).entries[m.id] = m; }

const demo = { codes: [
  { label: 'กล่องพาราเซตามอล (EAN-13)', code: Object.keys(products['p-para500'].codes)[0] },
  { label: 'แผงพาราเซตามอล', code: Object.keys(products['p-para500'].codes)[1] },
  { label: 'ซาลบูทามอล (GS1 DataMatrix)', code: `010${Object.keys(products['p-salb'].codes)[0]}17271031<GS>10SB25K07<GS>21A7K2Q9` },
  { label: 'ยาที่ยังไม่มีในคลัง', code: ean('200000999001') },
], sample: true };

for (const dir of ['products', 'moves', 'meta']) mkdirSync(join(out, dir), { recursive: true });
for (const [id, p] of Object.entries(products)) writeFileSync(join(out, 'products', id + '.json'), JSON.stringify(p));
for (const [id, d] of Object.entries(days)) writeFileSync(join(out, 'moves', id + '.json'), JSON.stringify(d));
writeFileSync(join(out, 'meta', 'demo.json'), JSON.stringify(demo));
writeFileSync(join(out, 'sample-backup.json'), JSON.stringify({ app: 'samut-khlang-ya', version: 1, exportedAt: new Date().toISOString(), products, moves: days, meta: { demo } }));

const summary = {};
for (const [k, q] of Object.entries(stock)) { const [pid] = k.split('|'); summary[pid] = (summary[pid] || 0) + q; }
console.log('moves', moves.length, 'days', Object.keys(days).length);
console.log(summary); console.log(stock);
console.log(demo.codes.map(c => c.code));
