// Builds clearly fictional sample data for trying the app.
//   node tools/make-sample.mjs <outDir> [path-to-xlsx-module]
// Writes <outDir>/sample-backup.json (import via ตั้งค่า → นำเข้าไฟล์สำรอง, or the "ลองกับข้อมูลตัวอย่าง" button)
// and, when the SheetJS module path is given, <outDir>/ตัวอย่างไฟล์รับสินค้า.xlsx laid out like the shop's receiving sheet.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';

const out = process.argv[2] || 'sample';
const xlsxPath = process.argv[3];
const TODAY = new Date(2026, 8, 13);
const pad = n => String(n).padStart(2, '0');
const dayKey = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const addDays = n => { const d = new Date(TODAY); d.setDate(d.getDate() + n); return dayKey(d); };
const eanCheck = d12 => { let s = 0; for (let i = 0; i < 12; i++) s += +d12[i] * (i % 2 ? 3 : 1); return (10 - (s % 10)) % 10; };
const ean = n => { const b = '2000000' + String(n).padStart(5, '0'); return b + eanCheck(b); };
const safeId = s => String(s).trim().replace(/[^A-Za-z0-9_-]/g, '_');

const V1 = 'บริษัท ตัวอย่างฟาร์มา จำกัด-110001', V2 = 'บริษัท สมมติเฮลท์แคร์ จำกัด-110002', V3 = 'บริษัท เดโมเมดิคอล จำกัด-110003';
const C7 = 'ทำคืนก่อนหมดอายุ 7 เดือน หากติดนับสต็อก ให้ทำคืนก่อนหมดอายุ 6 เดือน';
const C5 = 'ทำคืนก่อนหมดอายุ 5 เดือน หากติดนับสต็อก ให้ทำคืนก่อนหมดอายุ 4 เดือน';
const C3 = 'ทำคืนก่อนหมดอายุ 3 เดือน หากติดนับสต็อก ให้ทำคืนก่อนหมดอายุ 2 เดือน';
const C0 = 'ทำคืนหมดอายุแล้ว';
// [sku, name, vendor, class, condition, [[lot, expOffsetDays, qty, receivedDaysAgo, kind]]]
const ITEMS = [
  ['90000101', 'D_พาราเซตามอล 500 มก. 10X10 เม็ด', V1, 'OTC DRUGS', C7, [['PA2507A', 150, 12, 40, 'credit'], ['PA2601B', 520, 24, 10, 'credit']]],
  ['90000102', 'D_ยาแก้ไอน้ำดำ 60 มล.', V1, 'OTC DRUGS', C7, [['CG2410', 200, 6, 55, 'credit']]],
  ['90000103', 'S_D_เจลลดไข้ 120 มล.', V2, 'NON OTC DRUGS', C5, [['GL2503', 140, 3, 20, 'consignment']]],
  ['90000104', 'D_ยาดมสมุนไพร 5 มล.', V2, 'NON OTC DRUGS', C5, [['HB2411', 30, 10, 90, 'consignment'], ['HB2507', 400, 20, 5, 'consignment']]],
  ['90000105', 'กัมมี่วิตามินซี 20 ชิ้น', V3, 'DIETARY SUPPLEMENT', C3, [['GM2504', 110, 8, 30, 'credit']]],
  ['90000106', 'แถบตรวจน้ำตาลในเลือด 50 ชิ้น', V3, 'MEDICAL DEVICE', C5, [['ST2502', 145, 4, 60, 'credit']]],
  ['90000107', 'D_ผงเกลือแร่ 3.3 กรัม X50 ซอง', V1, 'OTC DRUGS', C7, [['OR2412', -12, 5, 120, 'credit']]],
  ['90000108', 'วิตามินรวม 30 เม็ด', V3, 'VITAMINS AND MINERALS', C0, [['VT2506', 60, 6, 25, 'consignment']]],
  ['90000109', 'S_D_ครีมทาแก้ผื่น 15 กรัม', V2, 'NON OTC DRUGS', C7, [['CR2505', 230, 9, 15, 'credit']]],
  ['90000110', 'D_ยาหยอดตาน้ำตาเทียม 10 มล.', V1, 'NON OTC DRUGS', C3, [['EY2508', 700, 12, 7, 'credit']]],
];

const products = {}, days = {}, rows = [];
const nowISO = TODAY.toISOString();
ITEMS.forEach(([sku, name, vendor, cls, cond, lots], i) => {
  const code = ean(101 + i); const pid = 'p-' + code;
  const rm = cond === C0 ? 0 : +cond.match(/(\d+) เดือน/)[1];
  const p = products[pid] = { name, sku, codes: { [code]: 'ชิ้น' }, vendor, cls, returnCond: cond, returnMonths: rm, units: [{ name: 'ชิ้น', size: 1, price: 0 }], lots: {}, sample: true };
  lots.forEach(([lot, expOff, qty, ago, kind], j) => {
    const exp = addDays(expOff); const lotId = 'l-' + safeId(lot) + '-' + exp.replace(/-/g, '');
    p.lots[lotId] = { lot, exp, addedAt: nowISO };
    const recv = addDays(-ago); const [y, m, d] = recv.split('-').map(Number);
    const e = { id: `m-s${i}-${j}`, at: new Date(y, m - 1, d, 9, 30).toISOString(), type: 'receive', kind, pid, lotId, qty, note: 'ข้อมูลตัวอย่าง', sample: true };
    (days[recv] = days[recv] || { date: recv, entries: {} }).entries[e.id] = e;
    rows.push([recv, code, sku, name, qty, lot, exp, vendor, cls, cond]);
  });
});
// One lot of the first item was partly returned already, to show history.
{ const k = addDays(-3); const e = { id: 'm-s-ret', at: new Date(2026, 8, 10, 15, 0).toISOString(), type: 'return', pid: 'p-' + ean(104), lotId: 'l-HB2411-' + addDays(30).replace(/-/g, ''), qty: -4, note: 'ใบคืนตัวอย่าง RT-001', sample: true };
  (days[k] = days[k] || { date: k, entries: {} }).entries[e.id] = e; }

const demo = { sample: true, codes: [
  { label: 'พาราเซตามอล (EAN-13)', code: ean(101) },
  { label: 'กัมมี่วิตามินซี', code: ean(105) },
  { label: 'ยาดม (GS1 DataMatrix)', code: `010${ean(104)}17${addDays(400).slice(2).replace(/-/g, '')}<GS>10HB2507` },
  { label: 'สินค้าที่ยังไม่มีในระบบ', code: ean(999) },
] };

mkdirSync(out, { recursive: true });
writeFileSync(join(out, 'sample-backup.json'), JSON.stringify({ app: 'samut-khlang-ya', version: 2, exportedAt: nowISO, products, moves: days, meta: { demo } }));
if (xlsxPath) {
  const XLSX = createRequire(import.meta.url)(xlsxPath);
  const toDMY = iso => { const [y, m, d] = iso.split('-'); return new Date(+y, +m - 1, +d); };
  const aoa = [
    ['แบบบันทึกการรับสินค้า และตรวจสอบวันหมดอายุ (Credit) — ข้อมูลตัวอย่าง'],
    ['Date (DD/MM/YY)', 'Barcode', 'SKU', 'Description thai', 'Amount', 'Lot no.', 'EXP Date (DD/MM/YYYY)', 'Vendor Name', 'Class', ''],
    ...rows.map(r => [toDMY(r[0]), r[1], r[2], r[3], r[4], r[5], toDMY(r[6]), r[7], r[8], r[9]]),
  ];
  const ws = XLSX.utils.aoa_to_sheet(aoa, { cellDates: true, dateNF: 'dd/mm/yyyy' });
  ws['!cols'] = [12, 16, 11, 38, 8, 12, 14, 34, 20, 60].map(wch => ({ wch }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sc Credit');
  XLSX.writeFile(wb, join(out, 'ตัวอย่างไฟล์รับสินค้า.xlsx'));
}
console.log('products', Object.keys(products).length, 'rows', rows.length, 'days', Object.keys(days).length);
