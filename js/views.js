'use strict';
/* ================= rendering ================= */
let renderQueued = 0;
const scheduleRender = () => { if (!renderQueued) renderQueued = requestAnimationFrame(() => { renderQueued = 0; render(); }); };
function render() {
  const ae = document.activeElement; const fid = ae && ae.id && ae.id !== 'scanInput' ? ae.id : null;
  let ss = null, se = null; try { ss = ae.selectionStart; se = ae.selectionEnd; } catch (e) { /* not a text input */ }
  renderChrome();
  const ready = S.ready.products && S.ready.moves;
  $('#view').innerHTML = ready ? VIEWS[S.page]() : '<div class="empty">กำลังโหลดข้อมูล…</div>';
  renderBanner(); renderDrawer(); renderModal();
  if (fid) { const el = document.getElementById(fid); if (el && el !== document.activeElement) { el.focus(); try { if (ss != null) el.setSelectionRange(ss, se); } catch (e) { /* not a text input */ } } }
}
function renderChrome() {
  const due = D.lots.filter(l => l.status === 'due').length;
  const badge = id => id === 'home' && due ? `<span class="count">${due}</span>` : '';
  $('#nav').innerHTML = PAGES.map(p => `<button data-action="go" data-page="${p.id}"${S.page === p.id ? ' aria-current="page"' : ''}>${ic(ICON[p.icon])}<span>${p.label}</span>${badge(p.id)}</button>`).join('');
  $('#tabbar').innerHTML = PAGES.filter(p => p.tab).map(p => `<button data-action="go" data-page="${p.id}"${S.page === p.id ? ' aria-current="page"' : ''}>${ic(ICON[p.icon], 22)}<span>${p.label}</span>${badge(p.id)}</button>`).join('');
  const pg = PAGES.find(p => p.id === S.page);
  $('#modeBadge').textContent = pg.mode; $('#scanHint').textContent = pg.hint;
  $('#shopName').textContent = settings().shopName;
  document.title = (due ? `(${due}) ` : '') + 'สมุดคลังยา';
  try { if (navigator.setAppBadge) { if (due) navigator.setAppBadge(due); else navigator.clearAppBadge(); } } catch (e) { /* badging unsupported */ }
}
function renderBanner() {
  if (!Object.values(S.products).some(p => p.sample)) { $('#banner').innerHTML = ''; return; }
  const demo = (S.meta.demo && S.meta.demo.codes) || [];
  $('#banner').innerHTML = `<div class="banner"><div class="grow"><b>ข้อมูลตัวอย่าง</b> — สินค้าและล็อตในหน้านี้เป็นตัวอย่างสำหรับลองใช้ ไม่ใช่ข้อมูลร้านจริง${demo.length ? ' · ลองจำลองการสแกน:' : ''}</div>
    ${demo.map((d, i) => `<button class="demo-chip" data-action="demo-scan" data-i="${i}" title="${esc(d.code)}">${esc(d.label)}</button>`).join('')}
    <button class="btn sm ghost" data-action="clear-sample">ลบข้อมูลตัวอย่าง</button></div>`;
}
function lotRow(l) {
  return `<div class="lrow">${bandChip(l.band)}
    <div><button class="pname" data-action="open-product" data-pid="${esc(l.pid)}">${esc(l.p.name)}</button>
      <div class="meta">${lotChip(l)}<span class="sub">${pSub(l.p)}</span></div></div>
    <div class="end"><div class="mono">${esc(fmtQty(l.p, l.qty))}</div><div class="muted">${deadlineText(l)}</div></div>
    <div class="actions"><button class="btn sm" data-action="lot-return" data-pid="${esc(l.pid)}" data-lot="${esc(l.id)}">ทำคืนแล้ว</button><button class="btn sm ghost" data-action="lot-clear" data-pid="${esc(l.pid)}" data-lot="${esc(l.id)}">ไม่มีของแล้ว</button></div></div>`;
}

/* ---------- home: alerts ---------- */
function notifyState() {
  if (!('Notification' in window)) return 'unsupported';
  if (Notification.permission === 'denied') return 'denied';
  return Notification.permission === 'granted' && lsGet('khlangya:notify') ? 'on' : 'off';
}
function viewOnboarding() {
  if (lsGet('khlangya:onboard-hidden')) return '';
  const done = [Object.keys(S.products).length > 0, !!lsGet('khlangya:seen-expiry'), notifyState() === 'on' || notifyState() === 'unsupported'];
  if (done.every(Boolean)) return '';
  const items = [
    ['นำเข้าไฟล์ Excel ของร้าน', 'ไฟล์รับสินค้า (Credit / Consignment) หรือไฟล์ Build Update — ระบบจับคอลัมน์ให้เอง', '<button class="btn sm" data-action="go" data-page="import">ไปหน้านำเข้า</button>'],
    ['ตรวจสีในหน้าวันหมดอายุ', 'กดสีเพื่อกรองเหมือน Filter By Color ใน Excel', '<button class="btn sm" data-action="go" data-page="expiry">ดูวันหมดอายุ</button>'],
    ['เปิดแจ้งเตือนบนเครื่องนี้', 'เด้งเตือนวันละครั้งเมื่อมีล็อตถึงกำหนดทำคืน', '<button class="btn sm" data-action="notify-on">เปิดแจ้งเตือน</button>'],
  ];
  return `<section class="panel onboard"><div class="sec-h" style="margin:0"><h2>เริ่มต้นใช้งาน 3 ขั้น</h2><button class="btn sm ghost" data-action="onboard-hide">ซ่อน</button></div>
    <ol>${items.map(([t, d, b], i) => `<li class="${done[i] ? 'done' : ''}"><span class="n">${done[i] ? '✓' : i + 1}</span><div><div class="t">${t}</div><div class="small muted">${d}</div></div>${done[i] ? '' : b}</li>`).join('')}</ol>
    <div class="actions"><button class="btn sm" data-action="tour">ดูคู่มือแนะนำหน้าจอ</button><button class="btn sm ghost" data-action="load-sample">ลองกับข้อมูลตัวอย่างก่อน</button></div></section>`;
}
function viewHome() {
  const s = settings(); const now = new Date();
  const counts = Object.fromEntries(BAND_ORDER.map(b => [b, 0]));
  D.lots.forEach(l => counts[l.band]++);
  const byDeadline = (a, b) => (a.dDays ?? a.days) - (b.dDays ?? b.days);
  const due = D.lots.filter(l => l.status === 'due').sort(byDeadline);
  const soon = D.lots.filter(l => l.status === 'soon').sort(byDeadline);
  const ns = notifyState();
  const notice = ns === 'on' || ns === 'unsupported' || !D.lots.length ? '' : `<section class="panel notice"><div class="grow"><h3>${ns === 'denied' ? 'เบราว์เซอร์บล็อกการแจ้งเตือนของเว็บนี้' : 'เปิดแจ้งเตือนบนเครื่องนี้'}</h3>
    <p class="small muted">${ns === 'denied' ? 'กดรูปแม่กุญแจข้างแถบที่อยู่เว็บ → การแจ้งเตือน → อนุญาต แล้วรีโหลดหน้า' : 'เมื่อเปิดแอป ระบบจะเด้งเตือนวันละครั้งว่ามีล็อตไหนถึงกำหนดทำคืน'}</p></div>
    ${ns === 'denied' ? '' : '<button class="btn primary" data-action="notify-on">เปิดแจ้งเตือน</button>'}</section>`;
  const tiles = BAND_ORDER.map(b => { const info = bandInfo(b); return `<button class="bandtile sw-${b}" data-action="exp-band" data-band="${b}"><span class="sw"></span><span class="v">${counts[b]}</span><span class="k">${info.label}</span><span class="d">${info.desc}<br>${esc(info.note)}</span></button>`; }).join('');
  const list = (arr, empty) => arr.length ? `<div class="panel lrows">${arr.slice(0, 40).map(lotRow).join('')}</div>${arr.length > 40 ? `<p class="small muted" style="margin-top:8px">แสดง 40 จาก ${arr.length} ล็อต — ดูทั้งหมดในหน้าวันหมดอายุ</p>` : ''}` : `<div class="panel empty">${empty}</div>`;
  return `${viewOnboarding()}${notice}
  <div class="page-h"><div><h1>แจ้งเตือนวันหมดอายุ</h1><p>วัน${TH_D[now.getDay()]}ที่ ${fmtDate(now.toISOString())} · ${D.lots.length} ล็อตที่ยังมีของ</p></div>
    <div class="actions"><button class="btn primary" data-action="go" data-page="receive">${ic(ICON.receive, 18)}รับสินค้า</button><button class="btn" data-action="go" data-page="import">${ic(ICON.file, 18)}นำเข้า Excel</button></div></div>
  <div class="bandtiles">${tiles}</div>
  <section class="sec"><div class="sec-h"><h2>ถึงกำหนดทำคืนแล้ว <span class="mono muted">${due.length}</span></h2><button class="btn sm ghost" data-action="exp-status" data-status="due">ดูในตาราง</button></div>
    ${list(due, '<h3>ไม่มีล็อตที่ถึงกำหนดทำคืน</h3>ระบบจะแสดงที่นี่เมื่อถึงรอบทำคืนตามเงื่อนไขของสินค้า')}</section>
  <section class="sec"><div class="sec-h"><h2>จะถึงกำหนดภายใน ${s.soonDays} วัน <span class="mono muted">${soon.length}</span></h2><button class="btn sm ghost" data-action="exp-status" data-status="soon">ดูในตาราง</button></div>
    ${list(soon, 'ยังไม่มีล็อตที่ใกล้ถึงกำหนด')}</section>`;
}

/* ---------- expiry table ---------- */
function expiryRows() {
  const f = S.exp; const q = f.q.trim().toLowerCase();
  return D.lots.filter(l => {
    if (f.band !== 'all' && l.band !== f.band) return false;
    if (f.status === 'nearly' ? !l.nearly : f.status && l.status !== f.status) return false;
    if (f.cls && l.p.cls !== f.cls) return false;
    if (f.vendor && l.p.vendor !== f.vendor) return false;
    if (f.kind && l.kind !== f.kind) return false;
    if (q && ![l.p.name, l.p.sku, l.lot, ...Object.keys(l.p.codes || {})].join(' ').toLowerCase().includes(q)) return false;
    return true;
  });
}
function viewExpiry() {
  lsSet('khlangya:seen-expiry', '1');
  const f = S.exp; const rows = expiryRows();
  const counts = Object.fromEntries(BAND_ORDER.map(b => [b, 0])); D.lots.forEach(l => counts[l.band]++);
  const products = Object.values(S.products);
  const seg = BAND_ORDER.map(b => `<button data-action="exp-band" data-band="${b}" aria-pressed="${f.band === b}" class="sw-${b}"><span class="band ${b}" style="padding:0;background:none"><i></i></span>${bandInfo(b).label} <span class="mono">${counts[b]}</span></button>`).join('');
  const body = rows.slice(0, 500).map(l => `<tr class="click" data-action="open-product" data-pid="${esc(l.pid)}">
      <td class="swatch sw-${l.band}" title="${bandInfo(l.band).label}"></td>
      <td><div class="name">${esc(l.p.name)}</div><div class="sub mono">${esc(l.p.sku || '')}${l.p.sku ? ' · ' : ''}${esc(Object.keys(l.p.codes || {})[0] || '')}</div></td>
      <td class="mono">${esc(l.lot)}</td><td class="mono">${fmtExp(l.exp)}</td>
      <td class="r mono">${l.days}<div class="small muted">${trimNum(Math.round(l.months * 10) / 10)} ด.</div></td>
      <td>${bandChip(l.band)}<div style="margin-top:4px">${nearlyPill(l)}</div></td>
      <td>${statusPill(l)}<div class="small muted" style="margin-top:3px">${l.deadline ? 'คืนภายใน ' + fmtExp(l.deadline) : rmText(l.rm)}</div></td>
      <td class="r mono">${trimNum(l.qty)}</td>
      <td class="small">${esc(l.p.vendor || '—')}<div class="muted">${esc(l.p.cls || '')}${l.kind ? ' · ' + KINDS[l.kind] : ''}</div></td>
      <td class="r" style="white-space:nowrap"><button class="btn sm" data-action="lot-return" data-pid="${esc(l.pid)}" data-lot="${esc(l.id)}">ทำคืน</button> <button class="btn sm ghost" data-action="lot-clear" data-pid="${esc(l.pid)}" data-lot="${esc(l.id)}">หมด</button></td></tr>`).join('');
  return `
  <div class="page-h"><div><h1>ตรวจวันหมดอายุ</h1><p>ทุกล็อตที่ยังมีของ เรียงจากหมดอายุก่อน กดสีเพื่อกรองแทน Filter By Color · Nearly Expired เมื่อเหลือน้อยกว่า ${settings().nearlyDays} วัน</p></div>
    <button class="btn" data-action="export-xlsx">ส่งออก Excel</button></div>
  <div class="filters"><div class="field"><span class="label">สี</span><div class="seg"><button data-action="exp-band" data-band="all" aria-pressed="${f.band === 'all'}">ทั้งหมด <span class="mono">${D.lots.length}</span></button>${seg}</div></div></div>
  <div class="filters">
    <div class="field"><label for="ex-q">ค้นหา</label><input id="ex-q" type="search" data-bind="exp.q" data-input-render value="${esc(f.q)}" placeholder="ชื่อ SKU บาร์โค้ด ล็อต"></div>
    <div class="field"><label for="ex-status">สถานะ</label><select id="ex-status" data-bind="exp.status" data-rerender>${options([], '', 'ทุกสถานะ')}<option value="due"${f.status === 'due' ? ' selected' : ''}>ถึงกำหนดทำคืน</option><option value="soon"${f.status === 'soon' ? ' selected' : ''}>ใกล้ถึงกำหนด</option><option value="ok"${f.status === 'ok' ? ' selected' : ''}>ยังไม่ถึงกำหนด</option><option value="nearly"${f.status === 'nearly' ? ' selected' : ''}>Nearly Expired</option></select></div>
    <div class="field"><label for="ex-cls">Class</label><select id="ex-cls" data-bind="exp.cls" data-rerender>${options(uniq(products.map(p => p.cls)), f.cls, 'ทุก Class')}</select></div>
    <div class="field"><label for="ex-vendor">Vendor</label><select id="ex-vendor" data-bind="exp.vendor" data-rerender>${options(uniq(products.map(p => p.vendor)), f.vendor, 'ทุก Vendor')}</select></div>
    <div class="field"><label for="ex-kind">ประเภทรับ</label><select id="ex-kind" data-bind="exp.kind" data-rerender><option value="">ทั้งหมด</option><option value="credit"${f.kind === 'credit' ? ' selected' : ''}>Credit</option><option value="consignment"${f.kind === 'consignment' ? ' selected' : ''}>Consignment</option></select></div>
  </div>
  <div class="sumline"><span><b>${rows.length}</b> ล็อต</span><span>จำนวนรวม <b>${trimNum(rows.reduce((s, l) => s + l.qty, 0))}</b></span>${rows.length > 500 ? '<span>แสดง 500 แถวแรก — ส่งออก Excel เพื่อดูทั้งหมด</span>' : ''}</div>
  ${body ? `<div class="tablewrap"><table><thead><tr><th></th><th>สินค้า</th><th>Lot no.</th><th>EXP</th><th class="r">เหลือ (วัน)</th><th>สี</th><th>ทำคืน</th><th class="r">คงเหลือ</th><th>Vendor / Class</th><th></th></tr></thead><tbody>${body}</tbody></table></div>`
    : `<div class="panel empty"><h3>${D.lots.length ? 'ไม่พบล็อตตามเงื่อนไข' : 'ยังไม่มีล็อตในระบบ'}</h3>${D.lots.length ? 'ลองล้างตัวกรอง' : 'นำเข้าไฟล์ Excel หรือสแกนรับสินค้า'}</div>`}`;
}

/* ---------- receive ---------- */
function viewReceive() {
  const R = S.receive; const p = R.pid && S.products[R.pid];
  const recent = D.moves.filter(m => m.type === 'receive').slice(0, 12).map(m => {
    const pp = S.products[m.pid]; if (!pp) return ''; const l = (pp.lots || {})[m.lotId];
    return `<div class="item" style="grid-template-columns:minmax(0,1fr) auto"><div><div class="name">${esc(pp.name)}</div><div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:2px">${l ? lotChip(l) : ''}<span class="small muted">${fmtDT(m.at)}${m.kind ? ' · ' + KINDS[m.kind] : ''}</span></div></div><span class="mono small qty-plus">+${esc(trimNum(m.qty))}</span></div>`;
  }).join('');
  let form;
  if (!p) {
    form = `<div class="placeholder">${ic(ICON.receive, 28)}<h3 style="color:var(--ink);margin:6px 0 2px">สแกนสินค้าที่รับเข้า</h3>หรือพิมพ์ชื่อ / SKU ในแถบด้านบน · สินค้าที่ยังไม่มีในระบบจะเปิดฟอร์มเพิ่มให้</div>`;
  } else {
    const lots = lotsOf(R.pid);
    let preview = '<span class="muted">ใส่ EXP เพื่อดูสีและกำหนดทำคืน</span>';
    if (/^\d{4}-\d{2}-\d{2}$/.test(R.exp)) { const li = lotInfo(R.pid, { id: '', lot: R.lot, exp: R.exp, qty: 0 }); preview = `${bandChip(li.band)} ${nearlyPill(li)} <span>${li.rm < 0 ? 'ไม่รับคืน' : 'กำหนดทำคืน ' + fmtExp(li.deadline)}</span> ${statusPill(li)}`; }
    form = `
      <div class="picked"><div><div class="name">${esc(p.name)}</div><div class="sub">${pSub(p)}${p.sku || p.vendor ? ' · ' : ''}คงเหลือ ${esc(fmtQty(p, D.pQty[R.pid] || 0))}</div><div class="small muted">${esc(rmText(returnMonthsOf(p)))}</div></div><button class="icon-btn" data-action="receive-clear" aria-label="เปลี่ยนสินค้า">${ic(ICON.x, 18)}</button></div>
      <div class="field"><span class="label">ประเภทการรับ</span><div class="seg"><button data-action="receive-kind" data-kind="credit" aria-pressed="${R.kind === 'credit'}">รับ Credit</button><button data-action="receive-kind" data-kind="consignment" aria-pressed="${R.kind === 'consignment'}">รับ Consignment</button></div></div>
      ${R.fromScan ? '<div class="gs1note">LOT และ EXP อ่านจาก DataMatrix — ตรวจกับกล่องอีกครั้ง</div>' : ''}
      <div class="grid3">
        <div class="field"><label for="rc-lot">Lot no.</label><input id="rc-lot" class="mono" type="text" list="lotlist" data-bind="receive.lot" data-change="receive-lot" value="${esc(R.lot)}" placeholder="เช่น A2507B" autocapitalize="characters"><datalist id="lotlist">${lots.map(l => `<option value="${esc(l.lot)}">EXP ${fmtExp(l.exp)}</option>`).join('')}</datalist></div>
        <div class="field"><label for="rc-exp">EXP Date</label><input id="rc-exp" type="date" data-bind="receive.exp" data-rerender value="${esc(R.exp)}"></div>
        <div class="field"><label for="rc-qty">จำนวน (${esc(unitName(p))})</label><input id="rc-qty" class="mono" type="number" min="0" step="1" inputmode="numeric" data-bind="receive.qty" value="${esc(R.qty)}"></div>
      </div>
      <div class="preview-line">${preview}</div>
      <div class="field"><label for="rc-note">เลขที่ใบรับ / หมายเหตุ</label><input id="rc-note" type="text" data-bind="receive.note" value="${esc(R.note)}" placeholder="ใช้ซ้ำกับทุกรายการในใบเดียวกัน"></div>
      <div style="display:flex;justify-content:flex-end;border-top:1px solid var(--line);padding-top:14px"><button class="btn primary lg" data-action="commit-receive">บันทึกรับสินค้า</button></div>`;
  }
  return `
  <div class="page-h"><div><h1>รับสินค้า</h1><p>สแกนบาร์โค้ด แล้วใส่จำนวน Lot no. และ EXP ข้อมูลอื่นขึ้นให้เอง ระบบบอกสีและกำหนดทำคืนทันที</p></div></div>
  <div class="rc-grid">
    <section class="panel rc-form">${form}</section>
    <aside><div class="sec-h"><h2>รับเข้าล่าสุด</h2></div><div class="panel feed">${recent || '<div class="empty">ยังไม่มีรายการรับเข้า</div>'}</div></aside>
  </div>`;
}

/* ---------- products ---------- */
function viewProducts() {
  const f = S.prod; const q = f.q.trim().toLowerCase(); const all = Object.entries(S.products);
  const rows = all.filter(([, p]) => (!f.cls || p.cls === f.cls) && (!f.vendor || p.vendor === f.vendor) && (!q || [p.name, p.sku, p.vendor, ...Object.keys(p.codes || {})].join(' ').toLowerCase().includes(q)))
    .sort((a, b) => String(a[1].name).localeCompare(String(b[1].name), 'th'));
  const body = rows.slice(0, 500).map(([pid, p]) => `<tr class="click" data-action="open-product" data-pid="${esc(pid)}">
    <td><div class="name">${esc(p.name)}</div><div class="sub mono">${esc(p.sku || '')}</div></td>
    <td class="mono small">${esc(Object.keys(p.codes || {}).join(', ') || '—')}</td>
    <td class="small">${esc(p.vendor || '—')}<div class="muted">${esc(p.cls || '')}</div></td>
    <td class="small">${esc(rmText(returnMonthsOf(p)))}${typeof p.returnMonths === 'number' ? '' : '<div class="muted">ค่าเริ่มต้นของร้าน</div>'}</td>
    <td class="r mono">${trimNum(D.pQty[pid] || 0)}</td><td>${bandChip(worstBand(pid))}</td></tr>`).join('');
  const products = all.map(([, p]) => p);
  return `
  <div class="page-h"><div><h1>สินค้า</h1><p>${all.length} รายการ · สีคือล็อตที่หมดอายุเร็วที่สุดของสินค้านั้น</p></div><button class="btn primary" data-action="new-product">${ic(ICON.plus, 18)}เพิ่มสินค้า</button></div>
  <div class="filters">
    <div class="field"><label for="pr-q">ค้นหา</label><input id="pr-q" type="search" data-bind="prod.q" data-input-render value="${esc(f.q)}" placeholder="ชื่อ SKU บาร์โค้ด Vendor"></div>
    <div class="field"><label for="pr-cls">Class</label><select id="pr-cls" data-bind="prod.cls" data-rerender>${options(uniq(products.map(p => p.cls)), f.cls, 'ทุก Class')}</select></div>
    <div class="field"><label for="pr-vendor">Vendor</label><select id="pr-vendor" data-bind="prod.vendor" data-rerender>${options(uniq(products.map(p => p.vendor)), f.vendor, 'ทุก Vendor')}</select></div>
  </div>
  ${body ? `<div class="tablewrap"><table><thead><tr><th>สินค้า</th><th>Barcode</th><th>Vendor / Class</th><th>เงื่อนไขทำคืน</th><th class="r">คงเหลือ</th><th>สี</th></tr></thead><tbody>${body}</tbody></table></div>`
    : `<div class="panel empty"><h3>${all.length ? 'ไม่พบสินค้าตามเงื่อนไข' : 'ยังไม่มีสินค้า'}</h3>${all.length ? 'ลองล้างคำค้น' : 'นำเข้าไฟล์ Excel หรือกด “เพิ่มสินค้า”'}</div>`}`;
}

/* ---------- ledger ---------- */
function ledgerRows() {
  const f = S.lg; const q = f.q.trim().toLowerCase();
  return D.moves.filter(m => {
    const p = S.products[m.pid]; if (!p) return false;
    const k = dayKey(new Date(m.at));
    if ((f.from && k < f.from) || (f.to && k > f.to) || (f.type && m.type !== f.type)) return false;
    if (q) { const l = (p.lots || {})[m.lotId]; if (![p.name, p.sku, l && l.lot, m.note].join(' ').toLowerCase().includes(q)) return false; }
    return true;
  });
}
function viewLedger() {
  const rows = ledgerRows(); const shown = rows.slice(0, 400);
  const body = shown.map(m => {
    const p = S.products[m.pid]; const l = (p.lots || {})[m.lotId]; const t = TYPES[m.type] || { label: m.type, cls: '' };
    return `<tr class="click" data-action="open-product" data-pid="${esc(m.pid)}"><td class="mono small" style="white-space:nowrap">${fmtDate(m.at)}<br><span class="muted">${fmtTime(m.at)}</span></td>
      <td><span class="pill ${t.cls}">${t.label}</span>${m.kind ? `<div class="small muted">${KINDS[m.kind]}</div>` : ''}</td>
      <td><div class="name">${esc(p.name)}</div><div class="sub mono">${esc(p.sku || '')}</div></td>
      <td>${l ? lotChip(l) : '—'}</td>
      <td class="r mono ${m.qty > 0 ? 'qty-plus' : ''}">${m.qty > 0 ? '+' : ''}${trimNum(m.qty)}</td>
      <td class="small muted">${esc(m.note || '')}</td></tr>`;
  }).join('');
  return `
  <div class="page-h"><div><h1>ประวัติ</h1><p>ทุกการรับเข้า ทำคืน นับสต็อก และปิดล็อต พร้อมวันเวลา</p></div></div>
  <div class="filters">
    <div class="field"><label for="lg-from">ตั้งแต่</label><input id="lg-from" type="date" data-bind="lg.from" data-rerender value="${esc(S.lg.from)}"></div>
    <div class="field"><label for="lg-to">ถึง</label><input id="lg-to" type="date" data-bind="lg.to" data-rerender value="${esc(S.lg.to)}"></div>
    <div class="field"><label for="lg-type">รายการ</label><select id="lg-type" data-bind="lg.type" data-rerender><option value="">ทุกรายการ</option>${['receive', 'return', 'clear', 'adjust'].map(k => `<option value="${k}"${k === S.lg.type ? ' selected' : ''}>${TYPES[k].label}</option>`).join('')}</select></div>
    <div class="field"><label for="lg-q">ค้นหา</label><input id="lg-q" type="search" data-bind="lg.q" data-input-render value="${esc(S.lg.q)}" placeholder="ชื่อ SKU ล็อต หมายเหตุ"></div>
  </div>
  <div class="sumline"><span><b>${rows.length}</b> รายการ</span>${rows.length > shown.length ? '<span>แสดง 400 รายการล่าสุด</span>' : ''}</div>
  ${body ? `<div class="tablewrap"><table><thead><tr><th>วันเวลา</th><th>รายการ</th><th>สินค้า</th><th>ล็อต</th><th class="r">จำนวน</th><th>หมายเหตุ</th></tr></thead><tbody>${body}</tbody></table></div>` : '<div class="panel empty">ไม่มีรายการในช่วงนี้</div>'}`;
}

/* ---------- settings ---------- */
function viewSettings() {
  const s = settings(); const ns = notifyState();
  const num = (id, label, val, help) => `<div class="field"><label for="${id}">${label}</label><input id="${id}" class="mono" type="number" min="0" max="999" value="${val}">${help ? `<span class="help">${help}</span>` : ''}</div>`;
  return `
  <div class="page-h"><div><h1>ตั้งค่า</h1></div><div class="actions"><button class="btn" data-action="go" data-page="ledger">${ic(ICON.ledger, 18)}ดูประวัติ</button><button class="btn" data-action="tour">คู่มือแนะนำหน้าจอ</button></div></div>
  <div class="grid2" style="align-items:start">
    <section class="panel rc-form">
      <h2>เกณฑ์สีวันหมดอายุ</h2>
      <p class="small muted">ตรงกับไอคอนสีในไฟล์ Excel — สีเขียวคือเหลือมากกว่าเกณฑ์สีเหลือง</p>
      <div class="grid3">${num('set-y', 'เหลือง: เหลือไม่เกิน (เดือน)', s.yellowM)}${num('set-b', 'ดำ: เหลือไม่เกิน (เดือน)', s.blackM)}${num('set-r', 'แดง: เหลือไม่เกิน (เดือน)', s.redM)}</div>
      <div class="field"><label for="set-yn">หมายเหตุสีเหลือง</label><input id="set-yn" type="text" value="${esc(s.yellowNote)}"></div>
      <div class="field"><label for="set-bn">หมายเหตุสีดำ</label><input id="set-bn" type="text" value="${esc(s.blackNote)}"></div>
      <div class="field"><label for="set-rn">หมายเหตุสีแดง</label><input id="set-rn" type="text" value="${esc(s.redNote)}"></div>
      <div class="grid3">${num('set-nearly', 'Nearly Expired เมื่อเหลือน้อยกว่า (วัน)', s.nearlyDays)}${num('set-drm', 'รอบทำคืนเริ่มต้น (เดือน)', s.defaultReturnMonths, 'ใช้กับสินค้าที่ไม่มีเงื่อนไขทำคืน')}${num('set-soon', 'เตือนล่วงหน้าก่อนกำหนดคืน (วัน)', s.soonDays)}</div>
      <div class="field"><label for="set-shop">ชื่อร้าน</label><input id="set-shop" type="text" value="${esc(s.shopName)}"></div>
      <div><button class="btn primary" data-action="save-settings">บันทึกการตั้งค่า</button></div>
    </section>
    <div style="display:flex;flex-direction:column;gap:14px">
      <section class="panel rc-form">
        <h2>การแจ้งเตือน</h2>
        <p class="small muted">${ns === 'on' ? 'เปิดอยู่บนเครื่องนี้ — เด้งเตือนวันละครั้งเมื่อเปิดแอปและมีล็อตถึงกำหนด' : ns === 'denied' ? 'เบราว์เซอร์บล็อกไว้ — กดรูปแม่กุญแจข้างแถบที่อยู่ → การแจ้งเตือน → อนุญาต' : ns === 'unsupported' ? 'เบราว์เซอร์นี้ไม่รองรับการแจ้งเตือน (บน iPhone ต้อง “เพิ่มไปยังหน้าจอโฮม” ก่อน)' : 'ยังไม่ได้เปิดบนเครื่องนี้'}</p>
        <p class="small muted">การเตือนทำงานเมื่อเปิดแอปหรือเปิดค้างไว้ ยังเด้งตอนปิดแอปอยู่ไม่ได้</p>
        <div class="actions">${ns === 'on' ? '<button class="btn" data-action="notify-test">ทดสอบแจ้งเตือน</button><button class="btn ghost" data-action="notify-off">ปิดแจ้งเตือน</button>' : ns === 'off' ? '<button class="btn primary" data-action="notify-on">เปิดแจ้งเตือน</button>' : ''}</div>
      </section>
      <section class="panel rc-form">
        <h2>ข้อมูล</h2>
        <p class="small muted">${Store.kind === 'firebase' ? `ซิงก์กับ Firebase · ล็อกอินเป็น <span class="mono">${esc(Store.email)}</span>` : Store.kind === 'db' ? 'ข้อมูลเก็บบนคลาวด์ของลิงก์นี้' : 'ข้อมูลเก็บในเบราว์เซอร์เครื่องนี้เท่านั้น — สำรองเป็นไฟล์เป็นประจำ'} · สินค้า ${Object.keys(S.products).length} รายการ · ${D.lots.length} ล็อตที่มีของ</p>
        <div class="actions"><button class="btn" data-action="export-xlsx-all">ส่งออกทุกล็อต (Excel)</button><button class="btn" data-action="export-json">สำรองข้อมูล (.json)</button><button class="btn" data-action="import-json">นำเข้าไฟล์สำรอง</button></div>
        <div class="actions"><button class="btn ghost" data-action="onboard-show">แสดงขั้นเริ่มต้นใช้งานอีกครั้ง</button></div>
      </section>
    </div>
  </div>`;
}
const VIEWS = { home: viewHome, expiry: viewExpiry, receive: viewReceive, products: viewProducts, import: () => viewImport(), ledger: viewLedger, settings: viewSettings };
