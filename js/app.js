'use strict';
/* ================= walkthrough ================= */
const TOUR = [
  { title: 'ยินดีต้อนรับสู่สมุดคลังยา', body: 'แอปนี้ช่วยตรวจวันหมดอายุแทนการกรองสีใน Excel และแจ้งเตือนเมื่อถึงกำหนดทำคืน — ขอพาดูหน้าจอสั้น ๆ ไม่ถึง 1 นาที' },
  { nav: 'import', title: 'เริ่มที่นี่: นำเข้า Excel', body: 'เลือกไฟล์บันทึกการรับสินค้าหรือไฟล์ Build Update ระบบจับคอลัมน์ Barcode, SKU, Lot, EXP, Vendor, Class และเงื่อนไขทำคืนให้เอง นำเข้าไฟล์เดิมซ้ำได้ไม่เบิ้ล' },
  { nav: 'expiry', title: 'ตรวจวันหมดอายุด้วยสี', body: 'เหมือน Filter By Color ใน Excel กดสีเพื่อกรอง — เขียว เหลือง ดำ แดง และหมดอายุแล้ว พร้อมสถานะ OK / Nearly Expired และกำหนดทำคืนของแต่ละล็อต' },
  { nav: 'home', title: 'แจ้งเตือน', body: 'รวมล็อตที่ถึงกำหนดทำคืนและใกล้ถึงกำหนด ทำคืนแล้วกด “ทำคืนแล้ว” ขายหมดกด “ไม่มีของแล้ว” รายการจะหายจากแจ้งเตือน' },
  { target: '.scanfield', title: 'ช่องสแกน ใช้ได้ทุกหน้า', body: 'ยิงเครื่องสแกนบาร์โค้ดได้ทันทีโดยไม่ต้องคลิกช่อง หรือพิมพ์ชื่อ / SKU เพื่อค้นหา ป้ายสีเขียวบอกว่าสแกนแล้วจะเปิดข้อมูลหรือรับสินค้า' },
  { target: '[data-action="camera-open"]', title: 'ไม่มีเครื่องสแกน ใช้กล้องได้', body: 'ถ้าภาพเบลอให้ถอยออกแล้วเลื่อนซูม ยังอ่านไม่ได้ให้กด “ถ่ายรูป” ข้าง ๆ แล้วถ่ายบาร์โค้ดให้ชัด' },
  { nav: 'receive', title: 'รับสินค้าใหม่', body: 'สแกน เลือก Credit หรือ Consignment ใส่จำนวน Lot no. และ EXP ระบบบอกสีและกำหนดทำคืนทันทีก่อนบันทึก' },
  { target: '.help-btn', title: 'เปิดคู่มือนี้อีกครั้งได้เสมอ', body: 'กดปุ่ม ? เมื่อไหร่ก็ได้ ส่วนเกณฑ์สี การแจ้งเตือน และการสำรองข้อมูลอยู่ในหน้าตั้งค่า' },
];
let tourI = -1, tourHome = 'home';
function tourTarget(step) {
  if (step.nav) return document.querySelector(`${getComputedStyle($('.rail')).display !== 'none' ? '#nav' : '#tabbar'} [data-page="${step.nav}"]`);
  return step.target ? document.querySelector(step.target) : null;
}
function startTour() { tourHome = S.page; tourI = 0; S.drawer = null; S.modal = null; hideSuggest(); render(); drawTour(); }
function endTour() {
  tourI = -1; lsSet('khlangya:tour-done', '1');
  const t = $('#tour'); t.hidden = true; t.innerHTML = '';
  S.page = tourHome; render();
}
function drawTour() {
  const step = TOUR[tourI]; if (!step) return endTour();
  if (step.nav && S.page !== step.nav) { S.page = step.nav; render(); }
  const root = $('#tour'); root.hidden = false;
  const last = tourI === TOUR.length - 1; const el = tourTarget(step);
  const card = `<div class="tour-card" role="dialog" aria-modal="true" aria-labelledby="tourTitle">
    <div class="tour-step">${tourI + 1} / ${TOUR.length}</div><h3 id="tourTitle">${step.title}</h3><p>${step.body}</p>
    <div class="tour-foot">${last ? '' : '<button class="btn ghost sm" data-action="tour-skip">ข้ามคู่มือ</button>'}<span style="flex:1"></span>
    ${tourI > 0 ? '<button class="btn sm" data-action="tour-prev">ย้อนกลับ</button>' : ''}<button class="btn primary sm" data-action="tour-next" id="tourNext">${last ? 'เริ่มใช้งาน' : 'ถัดไป'}</button></div></div>`;
  if (!el) {
    root.innerHTML = '<div class="tour-dim"></div>' + card;
    root.querySelector('.tour-card').style.cssText = 'left:50%;top:50%;transform:translate(-50%,-50%);width:min(400px,calc(100% - 24px))';
  } else {
    const r = el.getBoundingClientRect(), p = 6;
    root.innerHTML = `<div class="tour-hole" style="left:${r.left - p}px;top:${r.top - p}px;width:${r.width + p * 2}px;height:${r.height + p * 2}px"></div>` + card;
    const c = root.querySelector('.tour-card'); const w = Math.min(360, innerWidth - 24);
    c.style.width = w + 'px';
    c.style.left = Math.min(Math.max(12, r.left + r.width / 2 - w / 2), innerWidth - w - 12) + 'px';
    const h = c.offsetHeight;
    c.style.top = (r.bottom + 16 + h < innerHeight - 8 ? r.bottom + 16 : Math.max(8, r.top - 16 - h)) + 'px';
  }
  const nb = $('#tourNext'); if (nb) nb.focus();
}

/* ================= actions ================= */
const lotModal = (kind, el, extra) => { const l = modalLot({ pid: el.dataset.pid, lotId: el.dataset.lot }); if (!l) return; S.modal = Object.assign({ kind, pid: el.dataset.pid, lotId: el.dataset.lot }, extra(l)); render(); const i = $('#md-qty'); if (i) i.select(); };
const A = {
  go(el) { S.page = el.dataset.page; S.drawer = null; hideSuggest(); render(); window.scrollTo(0, 0); },
  'open-product'(el) { openDrawer(el.dataset.pid); },
  'close-drawer'() { S.drawer = null; render(); },
  'new-product'() { openNewProduct(null); },
  'edit-product'() { S.drawer = { mode: 'edit', pid: S.drawer.pid, draft: draftFrom(S.products[S.drawer.pid]) }; render(); },
  'cancel-edit'() { S.drawer = { mode: 'view', pid: S.drawer.pid }; render(); },
  'drawer-receive'() { startReceive(S.drawer.pid, null); },
  'code-add'() { const d = S.drawer.draft; d.codes.push(''); render(); const el = document.getElementById('pc-' + (d.codes.length - 1)); if (el) el.focus(); },
  'code-remove'(el) { S.drawer.draft.codes.splice(+el.dataset.i, 1); render(); },
  'code-gen'() { S.drawer.draft.codes.push(newStoreCode()); render(); },
  'save-product'() { safe(saveProduct); },
  'delete-product'() { safe(async () => { const pid = S.drawer.pid; const name = S.products[pid].name; await Store.del('products', pid); S.drawer = null; toast(`ลบ ${name} แล้ว`); render(); }); },
  'receive-clear'() { S.receive.pid = null; S.receive.fromScan = false; render(); $('#scanInput').focus(); },
  'receive-kind'(el) { S.receive.kind = el.dataset.kind; render(); },
  'commit-receive'() { safe(commitReceive); },
  'exp-band'(el) { S.exp.band = S.page === 'expiry' && S.exp.band === el.dataset.band ? 'all' : el.dataset.band; if (el.dataset.band === 'all') S.exp.band = 'all'; S.exp.status = ''; S.page = 'expiry'; S.drawer = null; render(); },
  'exp-status'(el) { S.exp = { band: 'all', status: el.dataset.status, cls: '', vendor: '', kind: '', q: '' }; S.page = 'expiry'; render(); window.scrollTo(0, 0); },
  'lot-return'(el) { lotModal('return', el, l => ({ qty: l.qty, note: '' })); },
  'lot-clear'(el) { lotModal('clear', el, () => ({})); },
  'lot-adjust'(el) { lotModal('adjust', el, l => ({ qty: l.qty })); },
  'return-save'() { safe(async () => { const m = S.modal; const l = modalLot(m); const n = Number(m.qty);
    if (!(n > 0)) return toast('ใส่จำนวนที่ทำคืน', 'err'); if (n > l.qty) return toast(`ล็อตนี้เหลือแค่ ${fmtQty(l.p, l.qty)}`, 'err');
    await record([{ id: uid('m'), at: new Date().toISOString(), type: 'return', pid: m.pid, lotId: m.lotId, qty: -n, note: (m.note || '').trim() }]);
    S.modal = null; toast(n === l.qty ? 'บันทึกทำคืนแล้ว — ล็อตนี้ปิดแล้ว' : `บันทึกทำคืน ${trimNum(n)} แล้ว`); render(); }); },
  'clear-save'() { safe(async () => { const m = S.modal; const l = modalLot(m);
    await record([{ id: uid('m'), at: new Date().toISOString(), type: 'clear', pid: m.pid, lotId: m.lotId, qty: -l.qty, note: 'ไม่มีของแล้ว' }]);
    S.modal = null; toast('ตัดยอดล็อตเป็น 0 แล้ว'); render(); }); },
  'adjust-save'() { safe(async () => { const m = S.modal; const l = modalLot(m); const n = Number(m.qty);
    if (m.qty === '' || !(n >= 0)) return toast('ใส่จำนวนที่นับได้', 'err');
    const diff = n - l.qty; if (!diff) { S.modal = null; render(); return toast('ยอดตรงกับในระบบ'); }
    await record([{ id: uid('m'), at: new Date().toISOString(), type: 'adjust', pid: m.pid, lotId: m.lotId, qty: diff, note: 'นับสต็อก' }]);
    S.modal = null; toast('บันทึกยอดที่นับแล้ว'); render(); }); },
  'modal-close'() { S.modal = null; render(); },
  label() { S.modal = { kind: 'label', pid: S.drawer.pid, code: null }; render(); },
  'print-label'() { try { window.print(); } catch (e) { toast('หน้านี้สั่งพิมพ์ไม่ได้', 'err'); } },
  'camera-open'() { openCamera(); },
  'camera-close'() { closeCamera(); },
  torch() { if (!camCaps) return; const t = camCaps.torchFeature(); const on = !t.value(); t.apply(on).then(() => { $('#torchBtn').textContent = on ? 'ปิดไฟฉาย' : 'ไฟฉาย'; }).catch(() => toast('เปิดไฟฉายไม่ได้บนกล้องนี้', 'err')); },
  'suggest-pick'(el) { $('#scanInput').value = ''; hideSuggest(); actOnProduct(el.dataset.pid, null); },
  'demo-scan'(el) { const d = S.meta.demo.codes[+el.dataset.i]; handleScan(d.code.split('<GS>').join(GS)); },
  tour() { startTour(); },
  'tour-next'() { tourI++; if (tourI >= TOUR.length) endTour(); else drawTour(); },
  'tour-prev'() { tourI = Math.max(0, tourI - 1); drawTour(); },
  'tour-skip'() { endTour(); },
  'onboard-hide'() { lsSet('khlangya:onboard-hidden', '1'); render(); },
  'onboard-show'() { lsDel('khlangya:onboard-hidden'); S.page = 'home'; render(); },
  'notify-on'() { enableNotify(); },
  'notify-off'() { lsDel('khlangya:notify'); toast('ปิดแจ้งเตือนบนเครื่องนี้แล้ว'); render(); },
  'notify-test'() { checkNotify(true); },
  'imp-reset'() { S.imp = null; render(); },
  'imp-sheet'(el) { selectSheet(+el.dataset.i); render(); },
  'imp-kind'(el) { S.imp.kind = el.dataset.kind; S.imp.plan = null; render(); },
  'imp-run'() { safe(runImport); },
  'export-xlsx'() { exportXlsx(expiryRows(), `วันหมดอายุ_${todayKey()}.xlsx`); },
  'export-xlsx-all'() { exportXlsx(D.lots, `วันหมดอายุ_ทั้งหมด_${todayKey()}.xlsx`); },
  'save-settings'() { safe(async () => {
    const n = id => Number($('#' + id).value);
    const next = { shopName: $('#set-shop').value.trim() || DEFAULTS.shopName, yellowM: n('set-y'), blackM: n('set-b'), redM: n('set-r'),
      yellowNote: $('#set-yn').value.trim(), blackNote: $('#set-bn').value.trim(), redNote: $('#set-rn').value.trim(),
      nearlyDays: n('set-nearly'), defaultReturnMonths: n('set-drm'), soonDays: n('set-soon') };
    if (!(next.yellowM > next.blackM && next.blackM > next.redM && next.redM > 0)) return toast('เกณฑ์สีต้องเรียงจากมากไปน้อย: เหลือง > ดำ > แดง > 0', 'err');
    if (!(next.nearlyDays > 0 && next.defaultReturnMonths >= 0 && next.soonDays >= 0)) return toast('ตัวเลขต้องไม่ติดลบ', 'err');
    await Store.set('meta', 'settings', next); S.meta.settings = next; compute(); toast('บันทึกการตั้งค่าแล้ว'); render(); }); },
  'export-json'() { saveFile(`สมุดคลังยา_สำรอง_${todayKey()}.json`, JSON.stringify({ app: 'samut-khlang-ya', version: 2, exportedAt: new Date().toISOString(), products: S.products, moves: S.days, meta: { settings: S.meta.settings || null } }, null, 1)); },
  'import-json'() { $('#importInput').click(); },
  'import-json-confirm'() { safe(async () => { const data = S.modal.data; const ops = [];
    for (const [id, p] of Object.entries(data.products || {})) ops.push({ op: 'set', col: 'products', id, data: p });
    for (const [id, dd] of Object.entries(data.moves || {})) ops.push({ op: 'set', col: 'moves', id, data: dd });
    if (data.meta && data.meta.settings) ops.push({ op: 'set', col: 'meta', id: 'settings', data: data.meta.settings });
    if (data.meta && data.meta.demo) ops.push({ op: 'set', col: 'meta', id: 'demo', data: data.meta.demo });
    await Store.bulk(ops); S.modal = null; toast('นำเข้าข้อมูลแล้ว'); render(); }); },
  'load-sample'() {
    fetch('sample/sample-backup.json').then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(data => { S.modal = { kind: 'import-json', data }; render(); })
      .catch(() => toast('โหลดข้อมูลตัวอย่างไม่ได้ในหน้านี้', 'err'));
  },
  'clear-sample'() { S.modal = { kind: 'clear-sample' }; render(); },
  'clear-sample-confirm'() { safe(async () => {
    const samplePids = new Set(Object.keys(S.products).filter(id => S.products[id].sample)); const ops = [];
    for (const [id, dd] of Object.entries(S.days)) {
      const all = Object.entries(dd.entries || {}); const keep = Object.fromEntries(all.filter(([, e]) => !e.sample && !samplePids.has(e.pid)));
      if (!Object.keys(keep).length) ops.push({ op: 'del', col: 'moves', id });
      else if (Object.keys(keep).length !== all.length) ops.push({ op: 'set', col: 'moves', id, data: { date: dd.date || id, entries: keep } });
    }
    samplePids.forEach(id => ops.push({ op: 'del', col: 'products', id }));
    if (S.meta.demo) ops.push({ op: 'del', col: 'meta', id: 'demo' });
    await Store.bulk(ops); S.modal = null; S.drawer = null; toast('ลบข้อมูลตัวอย่างแล้ว — นำเข้าไฟล์ Excel ของร้านได้เลย'); render(); }); },
  'sign-out'() { if (Store && Store.signOut) Store.signOut(); },
};
function setPath(path, value) { const ks = path.split('.'); let o = S; while (ks.length > 1) o = o[ks.shift()]; o[ks[0]] = value; }

document.addEventListener('click', e => {
  const el = e.target.closest('[data-action]'); if (!el) return;
  const fn = A[el.dataset.action]; if (!fn) return;
  if (el.tagName === 'BUTTON' || el.tagName === 'A') e.preventDefault();
  fn(el, e);
});
document.addEventListener('input', e => {
  const el = e.target;
  if (el.id === 'scanInput') return showSuggest();
  if (el.id === 'zoomRange') { const v = Number(el.value); $('#zoomVal').textContent = trimNum(v) + '×'; if (camCaps) camCaps.zoomFeature().apply(v).catch(() => {}); return; }
  if (el.dataset.bind) { setPath(el.dataset.bind, el.value); if (el.dataset.inputRender !== undefined) render(); }
  if (el.dataset.draft) {
    const d = S.drawer.draft; d[el.dataset.draft] = el.value;
    if (el.dataset.draft === 'returnCond') { const rm = parseReturnCond(el.value); if (rm != null) d.rm = String(rm); render(); }
  }
  if (el.dataset.code != null) S.drawer.draft.codes[+el.dataset.code] = el.value;
  if (el.dataset.modal) S.modal[el.dataset.modal] = el.value;
});
document.addEventListener('change', e => {
  const el = e.target;
  if (el.id === 'photoInput') { scanPhoto(el.files[0]); el.value = ''; return; }
  if (el.id === 'xlsxInput') { readImportFile(el.files[0]); el.value = ''; return; }
  if (el.id === 'camSelect') { lsSet('khlangya:camera', el.value); startCamera(); return; }
  if (el.id === 'imp-hr') { const imp = S.imp; imp.headerRow = Math.max(0, Math.min(imp.sheets[imp.sheet].aoa.length - 1, (Number(el.value) || 1) - 1)); imp.map = autoMap(imp.sheets[imp.sheet].aoa, imp.headerRow); imp.plan = null; render(); return; }
  if (el.id === 'importInput') { const f = el.files[0]; el.value = ''; if (!f) return;
    f.text().then(t => { const data = JSON.parse(t); if (!data || data.app !== 'samut-khlang-ya') throw new Error('bad'); S.modal = { kind: 'import-json', data }; render(); })
      .catch(() => toast('ไฟล์นี้ไม่ใช่ไฟล์สำรองของสมุดคลังยา', 'err')); return; }
  if (el.dataset.map) { S.imp.map[el.dataset.map] = el.value === '' ? null : Number(el.value); S.imp.plan = null; render(); return; }
  if (el.dataset.bind) { setPath(el.dataset.bind, el.value); if (el.dataset.rerender !== undefined) render(); }
  if (el.dataset.draft) S.drawer.draft[el.dataset.draft] = el.value;
  if (el.dataset.modal) { S.modal[el.dataset.modal] = el.value; if (el.tagName === 'SELECT') render(); }
  if (el.dataset.change === 'receive-lot') { const p = S.products[S.receive.pid]; const v = el.value.trim().toUpperCase(); const l = p && Object.values(p.lots || {}).find(x => x.lot.toUpperCase() === v); if (l && !S.receive.exp) { S.receive.exp = l.exp; render(); } }
});
document.addEventListener('dragover', e => { if (S.page !== 'import' || S.imp) return; e.preventDefault(); const z = $('#dropZone'); if (z) z.classList.add('over'); });
document.addEventListener('dragleave', e => { const z = $('#dropZone'); if (z && !z.contains(e.relatedTarget)) z.classList.remove('over'); });
document.addEventListener('drop', e => { if (S.page !== 'import' || S.imp) return; e.preventDefault(); const f = e.dataTransfer && e.dataTransfer.files[0]; if (f) readImportFile(f); });
$('#scanForm').addEventListener('submit', e => {
  e.preventDefault();
  const inp = $('#scanInput'); const v = inp.value;
  if (S.suggest.length && !parseScan(v)) { const pid = S.suggest[S.suggestSel] || S.suggest[0]; inp.value = ''; hideSuggest(); actOnProduct(pid, null); return; }
  inp.value = ''; handleScan(v);
});
$('#scanInput').addEventListener('keydown', e => {
  if (!S.suggest.length) return;
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    e.preventDefault(); S.suggestSel = (S.suggestSel + (e.key === 'ArrowDown' ? 1 : -1) + S.suggest.length) % S.suggest.length;
    [...$('#suggest').children].forEach((b, i) => b.classList.toggle('sel', i === S.suggestSel));
  } else if (e.key === 'Escape') hideSuggest();
});
$('#scanInput').addEventListener('blur', () => setTimeout(hideSuggest, 180));
document.addEventListener('keydown', e => {
  if (tourI >= 0) { if (e.key === 'Escape') endTour(); else if (e.key === 'ArrowRight') A['tour-next'](); else if (e.key === 'ArrowLeft') A['tour-prev'](); return; }
  if (e.key === 'Escape') { if (!$('#camera').hidden) closeCamera(); else if (S.modal) { S.modal = null; render(); } else if (S.drawer) { S.drawer = null; render(); } return; }
  if (e.key === 'Enter' && e.target.matches && e.target.matches('tr[data-action]')) { e.target.click(); return; }
  const t = e.target;
  if (t.closest && t.closest('input,textarea,select,[contenteditable]')) return;
  if (e.ctrlKey || e.metaKey || e.altKey || S.modal || !$('#camera').hidden) return;
  if (e.key.length === 1) $('#scanInput').focus();
});
window.addEventListener('resize', () => { if (tourI >= 0) drawTour(); });

/* ================= boot ================= */
(async function boot() {
  const d = new Date(); d.setDate(d.getDate() - 30); S.lg.from = dayKey(d); S.lg.to = todayKey();
  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
  render();
  const cfg = window.KHLANGYA_CONFIG;
  if (cfg && cfg.firebase && cfg.firebase.apiKey) {
    try { Store = await firebaseStore(cfg); }
    catch (e) { showGate(`<h2>เชื่อมต่อฐานข้อมูลไม่ได้</h2><p>${esc(e.message || e)} — ตรวจอินเทอร์เน็ตแล้วรีโหลดหน้า</p><button class="btn primary" id="gateRetry">รีโหลด</button>`); $('#gateRetry').addEventListener('click', () => location.reload()); return; }
    if (!Store) return;
  } else {
    const db = await getCap('db');
    Store = db ? dbStore(db) : localStore();
  }
  $('#storeDot').classList.add('on');
  $('#storeText').innerHTML = Store.kind === 'firebase'
    ? `ซิงก์กับ Firebase<br><span class="mono" style="word-break:break-all">${esc(Store.email)}</span><br><button class="linkbtn" data-action="sign-out">ออกจากระบบ</button>`
    : Store.kind === 'db' ? 'ซิงก์ข้อมูลข้ามอุปกรณ์' : 'เก็บข้อมูลในเบราว์เซอร์นี้';
  let first = true;
  const onData = () => {
    compute(); scheduleRender();
    if (first && S.ready.products && S.ready.moves) {
      first = false;
      setTimeout(() => { checkNotify(false); if (!lsGet('khlangya:tour-done')) startTour(); }, 500);
    }
  };
  Store.watch('products', data => { S.products = data; S.ready.products = true; onData(); });
  Store.watch('moves', data => { S.days = data; S.ready.moves = true; onData(); });
  Store.watch('meta', data => { S.meta = data; onData(); });
  setInterval(() => { compute(); scheduleRender(); checkNotify(false); }, 60 * 60 * 1000);
})();
