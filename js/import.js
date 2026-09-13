'use strict';
/* ================= Excel import / export ================= */
const XLSX_URL = 'https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js';
async function ensureXLSX() { if (!window.XLSX) await loadScript(XLSX_URL); return window.XLSX; }

// Column matchers, tried in this order so "EXP Date" is claimed before the plain "Date" column.
const FIELDS = [
  { k: 'barcode', label: 'Barcode', re: /bar\s*code|บาร์โค้ด|^ean/i },
  { k: 'exp', label: 'EXP Date', re: /exp|หมดอายุ/i, not: /nearly|shelf|remain|เหลือ|status|สถานะ|เงื่อนไข|คืน/i },
  { k: 'name', label: 'ชื่อสินค้า (Description)', re: /desc|ชื่อสินค้า|product\s*name|รายการสินค้า|^name$|^ชื่อ/i },
  { k: 'sku', label: 'SKU', re: /sku|รหัสสินค้า|article|item\s*code/i },
  { k: 'qty', label: 'จำนวน (Amount)', re: /^amo|จำนวน|qty|quantity/i },
  { k: 'lot', label: 'Lot no.', re: /lot|ล็อต|batch/i },
  { k: 'date', label: 'วันที่รับ (Date)', re: /date|วันที่/i, not: /exp|หมดอายุ/i },
  { k: 'vendor', label: 'Vendor Name', re: /vendor|supplier|ผู้จำหน่าย|ผู้ขาย/i },
  { k: 'cls', label: 'Class', re: /^class|ประเภทสินค้า|หมวด|category/i },
  { k: 'cond', label: 'เงื่อนไขทำคืน', re: /เงื่อนไข|return|การคืน/i },
];
const colLetter = i => { let s = ''; i++; while (i > 0) { const r = (i - 1) % 26; s = String.fromCharCode(65 + r) + s; i = Math.floor((i - 1) / 26); } return s; };
const cellStr = v => (v == null ? '' : String(v).trim().replace(/^'/, ''));
function cellCode(v) {
  let s = cellStr(v).replace(/\s/g, '');
  if (/^\d+\.0+$/.test(s)) s = s.replace(/\.0+$/, '');
  return s ? normCode(s) : '';
}
function isoDate(y, m, d) {
  if (y > 2400) y -= 543;
  if (!(y > 1900 && y < 2200 && m >= 1 && m <= 12 && d >= 1 && d <= 31)) return '';
  const dt = new Date(y, m - 1, d);
  return dt.getMonth() === m - 1 ? dayKey(dt) : '';
}
function parseDateCell(v) {
  if (v === '' || v == null) return '';
  if (typeof v === 'number') {
    if (v > 20000 && v < 80000 && window.XLSX) { const o = window.XLSX.SSF.parse_date_code(v); if (o) return isoDate(o.y, o.m, o.d); }
    return '';
  }
  if (v instanceof Date && !isNaN(v)) return dayKey(v);
  const s = String(v).trim(); let m;
  if ((m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/))) return isoDate(+m[1], +m[2], +m[3]);
  if ((m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})$/))) {
    let a = +m[1], b = +m[2], y = +m[3]; if (y < 100) y += 2000;
    return a <= 12 && b > 12 ? isoDate(y, a, b) : isoDate(y, b, a); // sheets use DD/MM/YYYY unless the day is clearly second
  }
  if ((m = s.match(/^(\d{1,2})[-/.](\d{4})$/))) { const mo = +m[1], y = +m[2]; return isoDate(y, mo, new Date(y > 2400 ? y - 543 : y, mo, 0).getDate()); }
  return '';
}
const guessKind = name => /consign|ฝากขาย/i.test(name) ? 'consignment' : 'credit';
function headerScore(row) {
  const seen = new Set(); let score = 0;
  for (const c of row) { const t = cellStr(c); if (!t) continue; for (const f of FIELDS) if (!seen.has(f.k) && f.re.test(t) && !(f.not && f.not.test(t))) { seen.add(f.k); score++; break; } }
  return score;
}
function detectHeader(aoa) {
  let row = 0, score = 0;
  for (let r = 0; r < Math.min(aoa.length, 30); r++) { const sc = headerScore(aoa[r] || []); if (sc > score) { score = sc; row = r; } }
  return { row, score };
}
function autoMap(aoa, hr) {
  const hdr = (aoa[hr] || []).map(cellStr); const map = {}; const used = new Set();
  for (const f of FIELDS) {
    const idx = hdr.findIndex((t, i) => !used.has(i) && t && f.re.test(t) && !(f.not && f.not.test(t)));
    if (idx >= 0) { map[f.k] = idx; used.add(idx); }
  }
  if (map.cond == null) { // the return-condition column often has no header: find it by its text
    const body = aoa.slice(hr + 1, hr + 301); const width = Math.max(hdr.length, ...body.map(r => r.length));
    let best = -1, bestN = 0;
    for (let i = 0; i < width; i++) { if (used.has(i)) continue; const n = body.filter(r => /ทำคืน|คืนสินค้า/.test(cellStr(r[i]))).length; if (n > bestN) { bestN = n; best = i; } }
    if (bestN >= 2) map.cond = best;
  }
  return map;
}
function readImportFile(file) {
  if (!file) return;
  S.imp = { loading: true, fileName: file.name }; render();
  const reader = new FileReader();
  reader.onerror = () => { S.imp = null; toast('อ่านไฟล์ไม่ได้', 'err'); render(); };
  reader.onload = async () => {
    try {
      const X = await ensureXLSX();
      const wb = X.read(new Uint8Array(reader.result), { type: 'array' });
      const sheets = wb.SheetNames.map(name => ({ name, aoa: X.utils.sheet_to_json(wb.Sheets[name], { header: 1, raw: true, defval: '', blankrows: true }) }))
        .filter(s => s.aoa.length);
      if (!sheets.length) throw new Error('empty');
      let best = 0, bestScore = -1;
      sheets.forEach((s, i) => { const h = detectHeader(s.aoa); if (h.score > bestScore) { bestScore = h.score; best = i; } });
      S.imp = { fileName: file.name, sheets };
      selectSheet(best);
    } catch (e) { console.error(e); S.imp = null; toast('อ่านไฟล์ไม่ได้ — ต้องเป็นไฟล์ .xlsx, .xls หรือ .csv', 'err'); }
    render();
  };
  reader.readAsArrayBuffer(file);
}
function selectSheet(i) {
  const imp = S.imp; const sh = imp.sheets[i]; const h = detectHeader(sh.aoa);
  Object.assign(imp, { sheet: i, headerRow: h.row, map: autoMap(sh.aoa, h.row), kind: guessKind(sh.name), plan: null });
}
function planImport() {
  const imp = S.imp; if (imp.plan) return imp.plan;
  const aoa = imp.sheets[imp.sheet].aoa; const m = imp.map;
  const get = (row, k) => (m[k] == null ? '' : row[m[k]]);
  const recs = []; const problems = { noId: 0, badExp: 0, sci: 0 };
  for (let r = imp.headerRow + 1; r < aoa.length; r++) {
    const row = aoa[r]; if (!row || row.every(c => cellStr(c) === '')) continue;
    let barcode = cellCode(get(row, 'barcode'));
    if (/E\+/.test(barcode)) { problems.sci++; barcode = ''; }
    const sku = cellStr(get(row, 'sku')).toUpperCase(); const name = cellStr(get(row, 'name'));
    if (!barcode && !sku) { if (name || cellStr(get(row, 'lot'))) problems.noId++; continue; }
    const expRaw = get(row, 'exp'); const exp = parseDateCell(expRaw);
    if (cellStr(expRaw) && !exp) problems.badExp++;
    const lot = cellStr(get(row, 'lot')).toUpperCase();
    const q = Number(cellStr(get(row, 'qty')).replace(/,/g, ''));
    recs.push({ r, barcode, sku, name, lot, exp, qty: q > 0 ? q : 1, date: parseDateCell(get(row, 'date')), vendor: cellStr(get(row, 'vendor')), cls: cellStr(get(row, 'cls')), cond: cellStr(get(row, 'cond')) });
  }
  const created = {}, patches = {}, entries = [], occ = {}, localCode = {}, localSku = {};
  let dup = 0, lotsNew = 0, masterOnly = 0;
  const nowISO = new Date().toISOString();
  for (const rec of recs) {
    let pid = (rec.barcode && (localCode[rec.barcode] || (D.codeIndex[rec.barcode] && D.codeIndex[rec.barcode].pid))) || (rec.sku && (localSku[rec.sku] || D.skuIndex[rec.sku]));
    if (!pid) pid = 'p-' + safeId(rec.barcode || 'sku-' + rec.sku);
    if (rec.barcode) localCode[rec.barcode] = pid;
    if (rec.sku) localSku[rec.sku] = pid;
    const existing = S.products[pid];
    const doc = existing ? (patches[pid] = patches[pid] || {}) : (created[pid] = created[pid] || { name: '', sku: '', codes: {}, vendor: '', cls: '', returnCond: '', returnMonths: null, units: [{ name: 'ชิ้น', size: 1, price: 0 }], lots: {} });
    if (rec.name) doc.name = rec.name; else if (!existing && !doc.name) doc.name = rec.barcode || rec.sku;
    if (rec.sku) doc.sku = rec.sku;
    if (rec.vendor) doc.vendor = rec.vendor;
    if (rec.cls) doc.cls = rec.cls;
    if (rec.cond) { doc.returnCond = rec.cond; const rm = parseReturnCond(rec.cond); if (rm != null) doc.returnMonths = rm; }
    if (rec.barcode && !(existing && existing.codes && existing.codes[rec.barcode])) (doc.codes = doc.codes || {})[rec.barcode] = existing ? unitName(existing) : 'ชิ้น';
    if (!(rec.lot && rec.exp)) { masterOnly++; continue; }
    const lotId = 'l-' + safeId(rec.lot) + '-' + rec.exp.replace(/-/g, '');
    const known = (existing && existing.lots && existing.lots[lotId]) || (doc.lots && doc.lots[lotId]);
    if (!known) { (doc.lots = doc.lots || {})[lotId] = { lot: rec.lot, exp: rec.exp, addedAt: nowISO }; lotsNew++; }
    const key = [rec.barcode || rec.sku, rec.lot, rec.exp, rec.qty, rec.date, imp.kind].join('|');
    occ[key] = (occ[key] || 0) + 1;
    const id = 'i' + hash(key + '#' + occ[key]);
    if (D.moveIds.has(id)) { dup++; continue; }
    let at = nowISO;
    if (rec.date) { const [y, mo, d] = rec.date.split('-').map(Number); at = new Date(y, mo - 1, d, 9, 0).toISOString(); }
    entries.push({ id, at, type: 'receive', kind: imp.kind, pid, lotId, qty: rec.qty, note: 'นำเข้าจาก ' + imp.fileName });
  }
  imp.plan = { recs, problems, created, patches, entries, dup, lotsNew, masterOnly };
  return imp.plan;
}
async function runImport() {
  const plan = planImport();
  if (!plan.recs.length) return toast('ไม่พบแถวที่นำเข้าได้ — ตรวจว่าเลือกคอลัมน์ Barcode หรือ SKU ถูกต้อง', 'err');
  const ops = [];
  for (const [id, data] of Object.entries(plan.created)) ops.push({ op: 'set', col: 'products', id, data });
  for (const [id, data] of Object.entries(plan.patches)) if (Object.keys(data).length) ops.push({ op: 'merge', col: 'products', id, data });
  ops.push(...entriesOps(plan.entries));
  await Store.bulk(ops);
  const nNew = Object.keys(plan.created).length, nUpd = Object.keys(plan.patches).length;
  toast(`นำเข้าแล้ว — สินค้าใหม่ ${nNew} · อัปเดต ${nUpd} · รับเข้า ${plan.entries.length} รายการ${plan.dup ? ` · ข้ามรายการที่เคยนำเข้า ${plan.dup}` : ''}`);
  S.imp = null; S.exp = { band: 'all', status: '', cls: '', vendor: '', kind: '', q: '' }; S.page = 'expiry'; render();
}
function viewImport() {
  const imp = S.imp;
  const head = `<div class="page-h"><div><h1>นำเข้า Excel</h1><p>ใช้ได้ทั้งไฟล์บันทึกการรับสินค้า (Credit / Consignment) และไฟล์ Build Update จากสำนักงานใหญ่ นำเข้าไฟล์เดิมซ้ำได้ ระบบข้ามแถวที่เคยนำเข้าแล้ว</p></div></div>`;
  if (!imp) return head + `<label class="drop" id="dropZone">${ic(ICON.file, 34)}<h3>ลากไฟล์มาวางที่นี่ หรือกดเพื่อเลือกไฟล์</h3><span>.xlsx · .xls · .csv</span><input type="file" id="xlsxInput" accept=".xlsx,.xls,.xlsm,.csv" hidden></label>
    <section class="sec panel rc-form"><h2>ระบบอ่านอะไรจากไฟล์</h2><dl class="kv">
      <dt>ต้องมี</dt><dd>Barcode หรือ SKU และชื่อสินค้า (Description)</dd>
      <dt>ถ้ามี Lot no. + EXP</dt><dd>สร้างล็อตพร้อมจำนวน (Amount) และวันที่รับ แล้วคิดสีให้ทันที</dd>
      <dt>ถ้าไม่มี Lot / EXP</dt><dd>อัปเดตข้อมูลสินค้าอย่างเดียว เช่นไฟล์ Build Update</dd>
      <dt>Vendor · Class</dt><dd>เก็บไว้กรองในหน้าวันหมดอายุ</dd>
      <dt>เงื่อนไขทำคืน</dt><dd>อ่านข้อความ “ทำคืนก่อนหมดอายุ X เดือน” หรือ “ทำคืนหมดอายุแล้ว” มาคิดกำหนดทำคืนของแต่ละล็อต</dd></dl></section>`;
  if (imp.loading) return head + `<div class="panel empty">กำลังอ่าน ${esc(imp.fileName)}…</div>`;
  const sh = imp.sheets[imp.sheet]; const hdr = (sh.aoa[imp.headerRow] || []).map(cellStr);
  const width = Math.max(hdr.length, ...(sh.aoa.slice(imp.headerRow + 1, imp.headerRow + 20).map(r => r.length)));
  const firstRow = sh.aoa.slice(imp.headerRow + 1).find(r => r && r.some(c => cellStr(c))) || [];
  const plan = planImport();
  const mapFields = FIELDS.map(f => `<div class="field"><label for="map-${f.k}">${f.label}${f.k === 'barcode' || f.k === 'name' ? ' <span class="req">*</span>' : ''}</label>
      <select id="map-${f.k}" data-map="${f.k}"><option value="">— ไม่ใช้ —</option>${Array.from({ length: width }, (_, i) => `<option value="${i}"${imp.map[f.k] === i ? ' selected' : ''}>${colLetter(i)} · ${esc(hdr[i] || '(ไม่มีหัวคอลัมน์)')}</option>`).join('')}</select>
      <span class="sample">${imp.map[f.k] != null ? 'เช่น ' + esc(cellStr(firstRow[imp.map[f.k]]).slice(0, 60) || '—') : ''}</span></div>`).join('');
  const preview = plan.recs.slice(0, 8).map(r => {
    const band = r.exp ? bandOf(daysLeft(r.exp)) : null;
    return `<tr><td class="mono small">${r.r + 1}</td><td class="mono small">${esc(r.barcode || '—')}<div class="muted">${esc(r.sku)}</div></td><td>${esc(r.name)}</td><td class="r mono">${trimNum(r.qty)}</td><td class="mono">${esc(r.lot || '—')}</td><td class="mono">${fmtExp(r.exp)}</td><td>${bandChip(band)}</td><td class="small">${r.cond ? esc(rmText(parseReturnCond(r.cond) ?? settings().defaultReturnMonths)) : '<span class="muted">ค่าเริ่มต้น</span>'}</td></tr>`;
  }).join('');
  const pr = plan.problems;
  const warn = [pr.noId && `${pr.noId} แถวไม่มี Barcode/SKU (ข้าม)`, pr.badExp && `${pr.badExp} แถวอ่าน EXP ไม่ได้`, pr.sci && `${pr.sci} แถว Barcode เป็นรูปแบบ 8.85E+12 (ให้จัดรูปแบบคอลัมน์เป็นข้อความใน Excel)`].filter(Boolean);
  return head + `<section class="panel">
    <div class="step"><div class="step-h"><span class="n">1</span><h2>ไฟล์และชีต</h2></div>
      <div class="actions"><span class="name">${esc(imp.fileName)}</span><button class="btn sm ghost" data-action="imp-reset">เลือกไฟล์อื่น</button></div>
      <div class="field"><span class="label">ชีต</span><div class="seg">${imp.sheets.map((s, i) => `<button data-action="imp-sheet" data-i="${i}" aria-pressed="${imp.sheet === i}">${esc(s.name)}</button>`).join('')}</div></div>
      <div class="grid3"><div class="field"><label for="imp-hr">แถวหัวตาราง</label><input id="imp-hr" class="mono" type="number" min="1" value="${imp.headerRow + 1}"></div>
        <div class="field" style="grid-column:span 2"><span class="label">ประเภทการรับ</span><div class="seg"><button data-action="imp-kind" data-kind="credit" aria-pressed="${imp.kind === 'credit'}">Credit</button><button data-action="imp-kind" data-kind="consignment" aria-pressed="${imp.kind === 'consignment'}">Consignment</button></div></div></div></div>
    <div class="step"><div class="step-h"><span class="n">2</span><h2>จับคู่คอลัมน์</h2><span class="small muted">ระบบเลือกให้แล้ว แก้ได้ถ้าไม่ตรง</span></div><div class="mapgrid">${mapFields}</div></div>
    <div class="step"><div class="step-h"><span class="n">3</span><h2>ตรวจก่อนนำเข้า</h2></div>
      <div class="sumline"><span><b>${plan.recs.length}</b> แถว</span><span>สินค้าใหม่ <b>${Object.keys(plan.created).length}</b></span><span>อัปเดตสินค้าเดิม <b>${Object.keys(plan.patches).length}</b></span><span>รับเข้า <b>${plan.entries.length}</b> รายการ</span>${plan.dup ? `<span>เคยนำเข้าแล้ว <b>${plan.dup}</b></span>` : ''}${plan.masterOnly ? `<span>ไม่มี Lot/EXP <b>${plan.masterOnly}</b></span>` : ''}</div>
      ${warn.length ? `<div class="small" style="color:var(--warn)">${warn.join(' · ')}</div>` : ''}
      ${preview ? `<div class="tablewrap"><table><thead><tr><th>แถว</th><th>Barcode / SKU</th><th>ชื่อสินค้า</th><th class="r">จำนวน</th><th>Lot</th><th>EXP</th><th>สี</th><th>ทำคืน</th></tr></thead><tbody>${preview}</tbody></table></div>` : '<div class="empty">ยังไม่พบแถวข้อมูล — ตรวจแถวหัวตารางและคอลัมน์ Barcode / SKU</div>'}
      <div class="actions" style="justify-content:flex-end"><button class="btn primary lg" data-action="imp-run"${plan.recs.length ? '' : ' disabled'}>นำเข้า ${plan.recs.length} แถว</button></div></div>
  </section>`;
}
function exportRows(lots) {
  return lots.map(l => [bandInfo(l.band).label, Object.keys(l.p.codes || {})[0] || '', l.p.sku || '', l.p.name, l.qty, l.lot, fmtExp(l.exp), l.days, Math.round(l.months * 10) / 10,
    l.nearly ? 'Nearly Expired' : 'OK', l.deadline ? fmtExp(l.deadline) : '', { due: 'ถึงกำหนดทำคืน', soon: 'ใกล้ถึงกำหนด', ok: 'ยังไม่ถึงกำหนด' }[l.status], l.p.returnCond || rmText(l.rm), l.p.vendor || '', l.p.cls || '', KINDS[l.kind] || '']);
}
async function exportXlsx(lots, filename) {
  let X; try { X = await ensureXLSX(); } catch (e) { return toast('โหลดตัวสร้างไฟล์ Excel ไม่สำเร็จ', 'err'); }
  const head = ['สี', 'Barcode', 'SKU', 'Description', 'คงเหลือ', 'Lot no.', 'EXP Date', 'เหลือ (วัน)', 'เหลือ (เดือน)', 'สถานะ', 'กำหนดทำคืน', 'การทำคืน', 'เงื่อนไขทำคืน', 'Vendor Name', 'Class', 'ประเภทรับ'];
  const ws = X.utils.aoa_to_sheet([head, ...exportRows(lots)]);
  ws['!cols'] = [8, 15, 11, 40, 8, 12, 12, 9, 9, 14, 12, 14, 40, 30, 18, 12].map(w => ({ wch: w }));
  const wb = X.utils.book_new(); X.utils.book_append_sheet(wb, ws, 'วันหมดอายุ');
  const buf = X.write(wb, { bookType: 'xlsx', type: 'array' });
  saveFile(filename, new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
}
async function saveFile(filename, data) {
  const dl = await getCap('downloads');
  if (dl) { try { await dl.save({ filename, data }); toast('บันทึกไฟล์แล้ว'); } catch (e) { if (e && e.code !== 'declined') toast('บันทึกไฟล์ไม่สำเร็จ: ' + (e.message || e.code), 'err'); } return; }
  const blob = data instanceof Blob ? data : new Blob([data], { type: 'application/json' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename;
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 3000);
}
