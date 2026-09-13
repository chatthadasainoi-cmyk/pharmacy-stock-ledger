'use strict';
/* ================= product drawer ================= */
function openDrawer(pid) { S.drawer = { mode: 'view', pid }; render(); }
function draftFrom(p, scan) {
  const code = scan ? (scan.kind === 'gs1' ? scan.key : scan.code) : '';
  return {
    name: p.name || '', sku: p.sku || '', vendor: p.vendor || '', cls: p.cls || '', unit: p ? unitName(p) : 'ชิ้น',
    returnCond: p.returnCond || '', rm: typeof p.returnMonths === 'number' ? String(p.returnMonths) : '',
    codes: Object.keys(p.codes || {}).concat(code && !(p.codes || {})[code] ? [code] : []),
  };
}
function openNewProduct(scan) {
  S.drawer = { mode: 'edit', pid: null, draft: draftFrom({}, scan), scan: scan || null }; render();
  const el = document.getElementById('pd-name'); if (el) el.focus();
}
function renderDrawer() {
  const dr = S.drawer;
  if (!dr) { $('#drawerRoot').innerHTML = ''; return; }
  const html = dr.mode === 'view' ? drawerView(dr) : drawerEdit(dr);
  if (!html) { S.drawer = null; $('#drawerRoot').innerHTML = ''; return; }
  const body = $('#drawerRoot .drawer-b'); const top = body ? body.scrollTop : 0;
  $('#drawerRoot').innerHTML = `<div class="scrim" data-action="close-drawer"></div><aside class="drawer" role="dialog" aria-modal="true" aria-label="ข้อมูลสินค้า">${html}</aside>`;
  const nb = $('#drawerRoot .drawer-b'); if (nb) nb.scrollTop = top;
}
function drawerView({ pid }) {
  const p = S.products[pid]; if (!p) return '';
  const lots = lotsOf(pid);
  const lotRows = lots.map(l => {
    if (l.qty <= 0) return `<tr><td class="swatch"></td><td>${lotChip(l)}</td><td class="r mono muted">0</td><td colspan="2"><span class="pill">ปิดล็อตแล้ว</span></td></tr>`;
    const li = lotInfo(pid, l);
    return `<tr><td class="swatch sw-${li.band}"></td><td>${lotChip(l)}<div style="margin-top:4px">${bandChip(li.band)} ${nearlyPill(li)}</div></td><td class="r mono">${trimNum(l.qty)}</td>
      <td class="small">${statusPill(li)}<div class="muted" style="margin-top:3px">${deadlineText(li)}</div></td>
      <td class="r" style="white-space:nowrap"><button class="btn sm" data-action="lot-return" data-pid="${esc(pid)}" data-lot="${esc(l.id)}">ทำคืน</button> <button class="btn sm ghost" data-action="lot-clear" data-pid="${esc(pid)}" data-lot="${esc(l.id)}">หมด</button> <button class="btn sm ghost" data-action="lot-adjust" data-pid="${esc(pid)}" data-lot="${esc(l.id)}">นับ</button></td></tr>`;
  }).join('');
  const hist = D.moves.filter(m => m.pid === pid).slice(0, 40).map(m => {
    const l = (p.lots || {})[m.lotId]; const t = TYPES[m.type] || { label: m.type, cls: '' };
    return `<div class="item"><span class="mono small muted" style="white-space:nowrap">${fmtDate(m.at)}</span><span class="pill ${t.cls}">${t.label}</span><span class="small muted mono" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${l ? 'LOT ' + esc(l.lot) : ''}${m.kind ? ' · ' + KINDS[m.kind] : ''}</span><span class="mono small ${m.qty > 0 ? 'qty-plus' : ''}">${m.qty > 0 ? '+' : ''}${trimNum(m.qty)}</span></div>`;
  }).join('');
  const codes = Object.keys(p.codes || {});
  const rm = returnMonthsOf(p);
  return `
  <div class="drawer-h"><div><h2 style="font-size:21px">${esc(p.name)}</h2><div class="sub">${pSub(p)}</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:6px">${p.cls ? `<span class="pill">${esc(p.cls)}</span>` : ''}${p.sample ? '<span class="pill">ตัวอย่าง</span>' : ''}</div></div>
    <button class="icon-btn" data-action="close-drawer" aria-label="ปิด">${ic(ICON.x)}</button></div>
  <div class="drawer-b">
    <div class="actions"><button class="btn primary" data-action="drawer-receive">${ic(ICON.receive, 18)}รับสินค้า</button><button class="btn" data-action="edit-product">แก้ไขข้อมูล</button>${codes.some(c => /^\d{13}$/.test(c)) ? '<button class="btn ghost" data-action="label">พิมพ์บาร์โค้ด</button>' : ''}</div>
    <section><div class="sec-h"><h3>เงื่อนไขทำคืน</h3></div>
      <div class="preview-line"><b>${esc(rmText(rm))}</b>${typeof p.returnMonths === 'number' ? '' : '<span class="muted">(ค่าเริ่มต้นของร้าน)</span>'}</div>
      ${p.returnCond ? `<p class="small muted" style="margin-top:6px">${esc(p.returnCond)}</p>` : ''}</section>
    <section><div class="sec-h"><h3>ล็อต</h3><span class="small muted">คงเหลือรวม ${esc(fmtQty(p, D.pQty[pid] || 0))}</span></div>
      ${lotRows ? `<div class="tablewrap"><table><tbody>${lotRows}</tbody></table></div>` : '<div class="panel empty">ยังไม่มีล็อต — กด “รับสินค้า”</div>'}</section>
    <section><div class="sec-h"><h3>ข้อมูลสินค้า</h3></div>
      <dl class="kv"><dt>SKU</dt><dd class="mono">${esc(p.sku || '—')}</dd><dt>Barcode</dt><dd class="mono">${esc(codes.join(', ') || '—')}</dd><dt>Vendor</dt><dd>${esc(p.vendor || '—')}</dd><dt>Class</dt><dd>${esc(p.cls || '—')}</dd><dt>หน่วยนับ</dt><dd>${esc(unitName(p))}</dd></dl></section>
    <section><div class="sec-h"><h3>ประวัติ</h3></div><div class="panel feed">${hist || '<div class="empty">ยังไม่มีการเคลื่อนไหว</div>'}</div></section>
  </div>`;
}
function drawerEdit(dr) {
  const d = dr.draft; const isNew = !dr.pid; const r = dr.scan; const s = settings();
  const parsed = parseReturnCond(d.returnCond);
  const products = Object.values(S.products);
  const rmOpts = [['', `ค่าเริ่มต้นของร้าน (${s.defaultReturnMonths} เดือน)`], ...Array.from({ length: 12 }, (_, i) => [String(12 - i), `ทำคืนก่อนหมดอายุ ${12 - i} เดือน`]), ['0', 'ทำคืนเมื่อหมดอายุแล้ว'], ['-1', 'ไม่รับคืน']];
  return `
  <div class="drawer-h"><div><h2 style="font-size:21px">${isNew ? 'เพิ่มสินค้า' : 'แก้ไขข้อมูลสินค้า'}</h2>${isNew && r ? `<div class="sub">ยังไม่มีบาร์โค้ด <span class="mono">${esc(r.code)}</span> ในระบบ — กรอกครั้งเดียว ครั้งหน้าสแกนแล้วขึ้นเลย</div>` : ''}
    ${r && (r.lot || r.exp) ? `<div class="gs1note" style="margin-top:6px">อ่านจาก DataMatrix: ${lotChip({ lot: r.lot || '—', exp: r.exp || '' })} — จะพาไปรับสินค้าหลังบันทึก</div>` : ''}</div>
    <button class="icon-btn" data-action="close-drawer" aria-label="ปิด">${ic(ICON.x)}</button></div>
  <div class="drawer-b">
    <section style="display:flex;flex-direction:column;gap:14px">
      <div class="field"><label for="pd-name">ชื่อสินค้า (Description)</label><input id="pd-name" type="text" data-draft="name" value="${esc(d.name)}"></div>
      <div class="grid2">
        <div class="field"><label for="pd-sku">SKU</label><input id="pd-sku" class="mono" type="text" data-draft="sku" value="${esc(d.sku)}"></div>
        <div class="field"><label for="pd-unit">หน่วยนับ</label><input id="pd-unit" type="text" data-draft="unit" value="${esc(d.unit)}"></div>
        <div class="field"><label for="pd-vendor">Vendor Name</label><input id="pd-vendor" type="text" list="vendorList" data-draft="vendor" value="${esc(d.vendor)}"><datalist id="vendorList">${uniq(products.map(p => p.vendor)).map(v => `<option value="${esc(v)}">`).join('')}</datalist></div>
        <div class="field"><label for="pd-cls">Class</label><input id="pd-cls" type="text" list="clsList" data-draft="cls" value="${esc(d.cls)}"><datalist id="clsList">${uniq([...CLASS_HINTS, ...products.map(p => p.cls)]).map(v => `<option value="${esc(v)}">`).join('')}</datalist></div>
      </div>
    </section>
    <section style="display:flex;flex-direction:column;gap:10px"><h3>เงื่อนไขทำคืน</h3>
      <div class="field"><label for="pd-cond">ข้อความเงื่อนไข (จากไฟล์สำนักงานใหญ่)</label><textarea id="pd-cond" rows="2" data-draft="returnCond" data-draft-render placeholder="เช่น ทำคืนก่อนหมดอายุ 7 เดือน หากติดนับสต็อก ให้ทำคืนก่อนหมดอายุ 6 เดือน">${esc(d.returnCond)}</textarea>
        ${parsed != null ? `<span class="help">อ่านได้ว่า: ${esc(rmText(parsed))}</span>` : ''}</div>
      <div class="field"><label for="pd-rm">รอบทำคืนที่ใช้คำนวณ</label><select id="pd-rm" data-draft="rm">${rmOpts.map(([v, t]) => `<option value="${v}"${d.rm === v ? ' selected' : ''}>${t}</option>`).join('')}</select></div>
    </section>
    <section><div class="sec-h"><h3>บาร์โค้ด</h3></div>
      <div class="editrows">${d.codes.map((c, i) => `<div class="editrow"><input id="pc-${i}" class="mono" type="text" data-code="${i}" value="${esc(c)}" aria-label="เลขบาร์โค้ด"><button class="icon-btn" data-action="code-remove" data-i="${i}" aria-label="ลบบาร์โค้ด">${ic(ICON.x, 16)}</button></div>`).join('') || '<div class="small muted">ยังไม่มีบาร์โค้ด</div>'}</div>
      <div class="actions" style="margin-top:8px"><button class="btn sm ghost" data-action="code-add">${ic(ICON.plus, 16)}เพิ่มบาร์โค้ด</button><button class="btn sm ghost" data-action="code-gen">สร้างบาร์โค้ดร้าน</button></div></section>
  </div>
  <div class="drawer-f">${!isNew && !D.moves.some(m => m.pid === dr.pid) ? '<button class="btn danger" data-action="delete-product" style="margin-right:auto">ลบสินค้านี้</button>' : ''}<button class="btn ghost" data-action="${isNew ? 'close-drawer' : 'cancel-edit'}">ยกเลิก</button><button class="btn primary" data-action="save-product">${isNew ? 'บันทึกสินค้า' : 'บันทึกการแก้ไข'}</button></div>`;
}
async function saveProduct() {
  const dr = S.drawer; const d = dr.draft;
  const name = d.name.trim(); if (!name) { toast('ใส่ชื่อสินค้า', 'err'); $('#pd-name').focus(); return; }
  const codes = {}; const prev = dr.pid ? S.products[dr.pid] : null;
  const unit = d.unit.trim() || 'ชิ้น';
  for (const c of d.codes) {
    const code = normCode(c || ''); if (!code) continue;
    const hit = D.codeIndex[code]; if (hit && hit.pid !== dr.pid) return toast(`บาร์โค้ด ${code} เป็นของ ${S.products[hit.pid].name} อยู่แล้ว`, 'err');
    codes[code] = unit;
  }
  const pid = dr.pid || (Object.keys(codes)[0] ? 'p-' + safeId(Object.keys(codes)[0]) : uid('p'));
  if (!dr.pid && S.products[pid]) return toast('มีสินค้าบาร์โค้ดนี้อยู่แล้ว', 'err');
  const doc = Object.assign(clone(prev) || {}, {
    name, sku: d.sku.trim().toUpperCase(), vendor: d.vendor.trim(), cls: d.cls.trim(), returnCond: d.returnCond.trim(),
    returnMonths: d.rm === '' ? null : Number(d.rm), codes, units: [{ name: unit, size: 1, price: 0 }], lots: (prev && clone(prev.lots)) || {},
  });
  await Store.set('products', pid, doc);
  S.products[pid] = doc; compute();
  toast(dr.pid ? 'บันทึกการแก้ไขแล้ว' : `เพิ่ม ${name} แล้ว`);
  if (!dr.pid && (dr.scan || S.page === 'receive')) { S.drawer = null; startReceive(pid, dr.scan); }
  else { S.drawer = { mode: 'view', pid }; render(); }
}

/* ================= receive ================= */
function startReceive(pid, r) {
  const p = S.products[pid]; const prev = S.receive;
  let exp = (r && r.exp) || '';
  if (r && r.lot && !exp) { const l = Object.values(p.lots || {}).find(x => x.lot.toUpperCase() === r.lot); if (l) exp = l.exp; }
  S.receive = { pid, kind: prev.kind || 'credit', lot: (r && r.lot) || '', exp, qty: '', note: prev.note || '', fromScan: !!(r && (r.lot || r.exp)) };
  S.page = 'receive'; S.drawer = null; render();
  const el = document.getElementById(S.receive.lot && S.receive.exp ? 'rc-qty' : 'rc-lot'); if (el) el.focus();
}
async function commitReceive() {
  const R = S.receive; const p = S.products[R.pid];
  if (!p) return toast('สแกนหรือเลือกสินค้าก่อน', 'err');
  const bad = (id, msg) => { toast(msg, 'err'); const el = document.getElementById(id); if (el) el.focus(); };
  const lot = (R.lot || '').trim().toUpperCase();
  if (!lot) return bad('rc-lot', 'กรอก Lot no. ตามที่พิมพ์บนกล่อง');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(R.exp)) return bad('rc-exp', 'ใส่ EXP Date ตามที่พิมพ์บนกล่อง');
  const qty = Number(R.qty); if (!(qty > 0)) return bad('rc-qty', 'ใส่จำนวนที่รับมากกว่า 0');
  const at = new Date().toISOString();
  const lotId = 'l-' + safeId(lot) + '-' + R.exp.replace(/-/g, '');
  const ops = [];
  if (!(p.lots || {})[lotId]) ops.push({ op: 'merge', col: 'products', id: R.pid, data: { lots: { [lotId]: { lot, exp: R.exp, addedAt: at } } } });
  ops.push(...entriesOps([{ id: uid('m'), at, type: 'receive', kind: R.kind, pid: R.pid, lotId, qty, note: (R.note || '').trim() }]));
  await Store.bulk(ops);
  const li = lotInfo(R.pid, { id: lotId, lot, exp: R.exp, qty });
  toast(`รับ ${p.name} ${trimNum(qty)} ${unitName(p)} (LOT ${lot}) แล้ว · สี${bandInfo(li.band).label}`);
  S.receive = { pid: null, kind: R.kind, lot: '', exp: '', qty: '', note: R.note, fromScan: false };
  render(); $('#scanInput').focus();
}

/* ================= modals ================= */
function modalLot(m) { const l = lotsOf(m.pid).find(x => x.id === m.lotId); return l ? lotInfo(m.pid, l) : null; }
function renderModal() {
  const m = S.modal;
  if (!m) { $('#modalRoot').innerHTML = ''; return; }
  let inner = '';
  if (m.kind === 'return' || m.kind === 'clear' || m.kind === 'adjust') {
    const l = modalLot(m); if (!l) { S.modal = null; $('#modalRoot').innerHTML = ''; return; }
    const headBlock = `<div><div class="name">${esc(l.p.name)}</div><div style="margin-top:6px;display:flex;gap:8px;flex-wrap:wrap">${lotChip(l)}${bandChip(l.band)}</div><div class="small muted" style="margin-top:6px">คงเหลือในระบบ ${esc(fmtQty(l.p, l.qty))} · ${esc(rmText(l.rm))}</div></div>`;
    if (m.kind === 'return') inner = `<h2>บันทึกทำคืน</h2>${headBlock}
      <div class="grid2"><div class="field"><label for="md-qty">จำนวนที่ทำคืน</label><input id="md-qty" class="mono" type="number" min="1" step="1" value="${esc(m.qty)}" data-modal="qty"></div>
      <div class="field"><label for="md-note">เลขที่ใบคืน / หมายเหตุ</label><input id="md-note" type="text" value="${esc(m.note)}" data-modal="note"></div></div>
      <div class="foot"><button class="btn ghost" data-action="modal-close">ยกเลิก</button><button class="btn primary" data-action="return-save">บันทึกทำคืน</button></div>`;
    else if (m.kind === 'clear') inner = `<h2>ล็อตนี้ไม่มีของแล้ว?</h2>${headBlock}<p class="muted">ใช้เมื่อขายหมดหรือนับแล้วไม่มีของ ระบบจะตัดยอดล็อตนี้เป็น 0 และเลิกแจ้งเตือน (ประวัติยังอยู่)</p>
      <div class="foot"><button class="btn ghost" data-action="modal-close">ยกเลิก</button><button class="btn danger" data-action="clear-save">ตัดยอดเป็น 0</button></div>`;
    else inner = `<h2>นับสต็อกล็อตนี้</h2>${headBlock}
      <div class="field"><label for="md-qty">นับได้จริง (${esc(unitName(l.p))})</label><input id="md-qty" class="mono" type="number" min="0" step="1" value="${esc(m.qty)}" data-modal="qty"></div>
      <div class="foot"><button class="btn ghost" data-action="modal-close">ยกเลิก</button><button class="btn primary" data-action="adjust-save">บันทึกยอดที่นับ</button></div>`;
  } else if (m.kind === 'clear-sample') {
    inner = `<h2>ลบข้อมูลตัวอย่าง?</h2><p class="muted">ลบสินค้า ล็อต และรายการตัวอย่างทั้งหมด ข้อมูลที่นำเข้าหรือเพิ่มเองจะยังอยู่</p>
      <div class="foot"><button class="btn ghost" data-action="modal-close">ยกเลิก</button><button class="btn danger" data-action="clear-sample-confirm">ลบข้อมูลตัวอย่าง</button></div>`;
  } else if (m.kind === 'import-json') {
    inner = `<h2>นำเข้าไฟล์สำรอง?</h2><p class="muted">พบสินค้า ${Object.keys(m.data.products || {}).length} รายการ และประวัติ ${Object.keys(m.data.moves || {}).length} วัน ข้อมูลที่รหัสตรงกันจะถูกเขียนทับ</p>
      <div class="foot"><button class="btn ghost" data-action="modal-close">ยกเลิก</button><button class="btn primary" data-action="import-json-confirm">นำเข้า</button></div>`;
  } else if (m.kind === 'label') {
    const p = S.products[m.pid]; const codes = Object.keys(p.codes || {}).filter(c => /^\d{13}$/.test(c)); const cur = codes.includes(m.code) ? m.code : codes[0];
    inner = `<h2>พิมพ์บาร์โค้ด</h2>
      <div class="field"><label for="md-code">บาร์โค้ด</label><select id="md-code" data-modal="code">${codes.map(c => `<option${c === cur ? ' selected' : ''}>${c}</option>`).join('')}</select></div>
      <div class="label-sheet" id="printArea"><div class="ln">${esc(p.name)}</div>${ean13Svg(cur)}</div>
      <div class="foot"><button class="btn ghost" data-action="modal-close">ปิด</button><button class="btn primary" data-action="print-label">พิมพ์</button></div>`;
  }
  $('#modalRoot').innerHTML = `<div class="scrim" style="z-index:69" data-action="modal-close"></div><div class="modal-wrap"><div class="modal" role="dialog" aria-modal="true">${inner}</div></div>`;
}

/* ================= scanning ================= */
function handleScan(raw) {
  raw = String(raw || '').replace(/[\r\n]+$/, '');
  if (!raw.trim()) return;
  hideSuggest();
  const r = parseScan(raw);
  const hit = r && D.codeIndex[r.key];
  if (hit) return actOnProduct(hit.pid, r);
  const skuPid = D.skuIndex[raw.trim().toUpperCase()];
  if (skuPid) return actOnProduct(skuPid, null);
  const ids = searchProducts(raw);
  if (ids.length && (!r || r.kind === 'code')) return actOnProduct(ids[0], null);
  if (r) return openNewProduct(r);
  toast(`ไม่พบสินค้า “${raw}” — ลองพิมพ์ชื่ออื่น หรือเพิ่มสินค้าในหน้าสินค้า`, 'err');
}
function actOnProduct(pid, r) {
  S.modal = null;
  if (S.page === 'receive') startReceive(pid, r); else openDrawer(pid);
}
function searchProducts(q) {
  q = q.trim().toLowerCase(); if (!q) return [];
  return Object.entries(S.products).filter(([, p]) => [p.name, p.sku, ...Object.keys(p.codes || {})].join(' ').toLowerCase().includes(q))
    .sort((a, b) => String(a[1].name).localeCompare(String(b[1].name), 'th')).slice(0, 6).map(([id]) => id);
}
function showSuggest() {
  const v = $('#scanInput').value;
  S.suggest = v.trim().length >= 2 && !/^[\d\s()\]]+$/.test(v) ? searchProducts(v) : [];
  S.suggestSel = 0;
  const box = $('#suggest');
  if (!S.suggest.length) { box.hidden = true; box.innerHTML = ''; return; }
  box.innerHTML = S.suggest.map((pid, i) => { const p = S.products[pid]; return `<button type="button" class="${i === 0 ? 'sel' : ''}" data-action="suggest-pick" data-pid="${esc(pid)}"><span class="name">${esc(p.name)}</span><span class="sub">${esc(p.sku || '')}</span><span class="small mono muted" style="margin-left:auto">${trimNum(D.pQty[pid] || 0)}</span></button>`; }).join('');
  box.hidden = false;
}
function hideSuggest() { S.suggest = []; const box = $('#suggest'); box.hidden = true; box.innerHTML = ''; }

/* ================= camera ================= */
let cam = null, camDone = false, camCaps = null;
function formats() { const F = window.Html5QrcodeSupportedFormats; return [F.EAN_13, F.EAN_8, F.UPC_A, F.UPC_E, F.DATA_MATRIX, F.CODE_128, F.QR_CODE]; }
function scanFeedback() {
  try { const Ctx = window.AudioContext || window.webkitAudioContext; const ctx = scanFeedback.ctx || (scanFeedback.ctx = new Ctx()); const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.value = 1800; g.gain.value = 0.07; o.connect(g); g.connect(ctx.destination); o.start(); o.stop(ctx.currentTime + 0.08); } catch (e) { /* no audio */ }
  try { if (navigator.vibrate) navigator.vibrate(50); } catch (e) { /* no vibration */ }
}
async function openCamera() {
  if (typeof window.Html5Qrcode === 'undefined') return toast('โหลดตัวอ่านบาร์โค้ดจากกล้องไม่สำเร็จ — ใช้เครื่องสแกน USB หรือพิมพ์เลขแทน', 'err');
  $('#camera').hidden = false;
  await startCamera();
}
async function stopCamera() {
  if (cam) { try { if (cam.isScanning) await cam.stop(); cam.clear(); } catch (e) { /* already stopped */ } }
  cam = null; camCaps = null;
}
async function startCamera() {
  await stopCamera();
  camDone = false;
  $('#camMsg').textContent = 'กำลังเปิดกล้อง…'; $('#zoomRow').hidden = true; $('#torchBtn').hidden = true;
  const fail = () => { $('#camMsg').innerHTML = 'เปิดกล้องสดไม่ได้ — ตรวจว่าอนุญาตให้เว็บนี้ใช้กล้อง หรือปิดหน้านี้แล้วใช้ปุ่ม <b>ถ่ายรูป</b> / เครื่องสแกน USB แทน'; };
  let cams = [];
  try { cams = await window.Html5Qrcode.getCameras(); } catch (e) { return fail(); }
  const saved = lsGet('khlangya:camera');
  const useId = saved && cams.some(c => c.id === saved) ? saved : '';
  const sel = $('#camSelect');
  sel.innerHTML = '<option value="">กล้องหลัง (อัตโนมัติ)</option>' + cams.map((c, i) => `<option value="${esc(c.id)}"${c.id === useId ? ' selected' : ''}>${esc(c.label || 'กล้อง ' + (i + 1))}</option>`).join('');
  sel.hidden = cams.length < 2;
  // Ask for a sharp stream: the library's default is ~640×480, which blurs thin 1D bars.
  const vc = { width: { ideal: 1920 }, height: { ideal: 1080 } };
  if (useId) vc.deviceId = { exact: useId }; else vc.facingMode = 'environment';
  try {
    cam = new window.Html5Qrcode('reader', { formatsToSupport: formats(), verbose: false, experimentalFeatures: { useBarCodeDetectorIfSupported: true } });
    await cam.start(useId || { facingMode: 'environment' }, {
      fps: 15, disableFlip: true, videoConstraints: vc,
      qrbox: (w, h) => ({ width: Math.max(180, Math.round(Math.min(w * 0.9, 560))), height: Math.max(120, Math.round(Math.min(h * 0.5, 280))) }),
    }, text => { if (camDone) return; camDone = true; scanFeedback(); closeCamera().then(() => handleScan(text)); }, () => {});
  } catch (e) { return fail(); }
  $('#camMsg').textContent = 'วางบาร์โค้ดให้อยู่ในกรอบ ถ้าภาพเบลอให้ถอยออกประมาณ 20 ซม. แล้วเลื่อนซูมแทนการเอาเข้าใกล้';
  try { await cam.applyVideoConstraints({ advanced: [{ focusMode: 'continuous' }] }); } catch (e) { /* focus control not supported */ }
  try {
    const caps = cam.getRunningTrackCameraCapabilities();
    const z = caps.zoomFeature();
    if (z.isSupported()) {
      const r = $('#zoomRange'); const max = Math.min(z.max(), 8);
      r.min = z.min(); r.max = max; r.step = z.step() || 0.1;
      const start = Math.min(Math.max(z.min(), 1.5), max);
      r.value = start; await z.apply(start); $('#zoomVal').textContent = trimNum(start) + '×'; $('#zoomRow').hidden = false;
    }
    if (caps.torchFeature().isSupported()) $('#torchBtn').hidden = false;
    camCaps = caps;
  } catch (e) { /* capabilities API not available on this browser */ }
}
async function closeCamera() { $('#camera').hidden = true; await stopCamera(); }
async function scanPhoto(file) {
  if (!file) return;
  if (typeof window.Html5Qrcode === 'undefined') return toast('โหลดตัวอ่านบาร์โค้ดไม่สำเร็จ', 'err');
  const r = new window.Html5Qrcode('fileReaderBox', { formatsToSupport: formats(), verbose: false });
  try { const text = await r.scanFile(file, false); scanFeedback(); handleScan(text); }
  catch (e) { toast('อ่านบาร์โค้ดจากรูปไม่ได้ — ถ่ายให้ใกล้ ชัด และไม่สะท้อนแสง', 'err'); }
  finally { try { r.clear(); } catch (e) { /* noop */ } }
}

/* ================= notifications ================= */
async function showSystemNotification(title, body) {
  const opts = { body, tag: 'khlangya-daily', icon: 'icon.svg', badge: 'icon.svg' };
  try {
    const reg = navigator.serviceWorker && await Promise.race([navigator.serviceWorker.getRegistration(), new Promise(r => setTimeout(r, 1500))]);
    if (reg && reg.showNotification) return reg.showNotification(title, opts);
  } catch (e) { /* fall through to the page notification */ }
  const n = new Notification(title, opts);
  n.onclick = () => { window.focus(); S.page = 'home'; render(); n.close(); };
}
function checkNotify(force) {
  if (notifyState() !== 'on') return;
  const tk = todayKey();
  if (!force && lsGet('khlangya:notified') === tk) return;
  const due = D.lots.filter(l => l.status === 'due'), soon = D.lots.filter(l => l.status === 'soon');
  lsSet('khlangya:notified', tk);
  if (!due.length && !soon.length && !force) return;
  const names = arr => arr.slice(0, 3).map(l => l.p.name).join(', ') + (arr.length > 3 ? ` และอีก ${arr.length - 3}` : '');
  const body = [due.length && `ถึงกำหนดทำคืน ${due.length} ล็อต: ${names(due)}`, soon.length && `ใกล้ถึงกำหนดใน ${settings().soonDays} วัน ${soon.length} ล็อต`].filter(Boolean).join('\n') || 'ไม่มีล็อตที่ต้องทำคืนตอนนี้';
  showSystemNotification(due.length ? `ถึงกำหนดทำคืน ${due.length} ล็อต` : 'สมุดคลังยา — แจ้งเตือนวันหมดอายุ', body).catch(() => {});
}
async function enableNotify() {
  if (!('Notification' in window)) return toast('เบราว์เซอร์นี้ไม่รองรับการแจ้งเตือน — บน iPhone ให้ “เพิ่มไปยังหน้าจอโฮม” แล้วเปิดจากไอคอน', 'err');
  const perm = await Notification.requestPermission();
  if (perm === 'granted') { lsSet('khlangya:notify', '1'); toast('เปิดแจ้งเตือนแล้ว'); checkNotify(true); }
  else toast('ไม่ได้รับอนุญาตให้แจ้งเตือน — เปิดได้ที่การตั้งค่าเว็บไซต์ของเบราว์เซอร์', 'err');
  render();
}
