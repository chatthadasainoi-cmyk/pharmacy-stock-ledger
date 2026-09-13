'use strict';
/* ================= helpers ================= */
const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pad = n => String(n).padStart(2, '0');
const uid = p => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const dayKey = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const todayKey = () => dayKey(new Date());
const TH_M = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
const TH_D = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];
const fmtExp = iso => { if (!iso) return '—'; const [y, m, d] = iso.split('-'); return `${d}/${m}/${y}`; };
const fmtTime = iso => { const d = new Date(iso); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
const fmtDate = iso => { const d = new Date(iso); return `${d.getDate()} ${TH_M[d.getMonth()]} ${d.getFullYear()}`; };
const fmtDT = iso => `${fmtDate(iso)} ${fmtTime(iso)}`;
const daysLeft = exp => { const [y, m, d] = exp.split('-').map(Number); const t = new Date(); t.setHours(0, 0, 0, 0); return Math.round((new Date(y, m - 1, d) - t) / 864e5); };
const trimNum = n => String(Math.round(n * 100) / 100);
const clone = o => JSON.parse(JSON.stringify(o ?? null));
const lsGet = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* storage blocked */ } };
const lsDel = k => { try { localStorage.removeItem(k); } catch (e) { /* storage blocked */ } };
const safeId = s => String(s).trim().replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 120) || 'x';
function hash(s) {
  let a = 0x811c9dc5, b = 0x9747b28c;
  for (let i = 0; i < s.length; i++) { const c = s.charCodeAt(i); a = Math.imul(a ^ c, 16777619); b = Math.imul(b ^ c, 2246822507); }
  return (a >>> 0).toString(36) + (b >>> 0).toString(36);
}
function addMonthsISO(iso, n) {
  const [y, m, d] = iso.split('-').map(Number);
  const first = new Date(y, m - 1 + n, 1);
  const last = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  return dayKey(new Date(first.getFullYear(), first.getMonth(), Math.min(d, last)));
}
const ic = (d, s = 20) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const ICON = {
  bell: '<path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
  calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18M8 15h.01M12 15h.01M16 15h.01"/>',
  receive: '<path d="M21 8v8l-9 5-9-5V8l9-5z"/><path d="M3 8l9 5 9-5M12 13v8"/>',
  box: '<rect x="3" y="4" width="18" height="16" rx="1"/><path d="M3 12h18M9 4v16"/>',
  file: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 14l2 2 4-4"/>',
  ledger: '<path d="M9 6h12M9 12h12M9 18h12"/><path d="M4 6h.01M4 12h.01M4 18h.01"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9 7 7M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
};
const BRAND_MARK = '<svg width="22" height="22" viewBox="0 0 22 22"><g fill="currentColor"><rect x="2" y="4" width="2" height="14"/><rect x="5.5" y="4" width="1" height="14"/><rect x="8" y="4" width="3" height="14"/><rect x="12.5" y="4" width="1" height="14"/><rect x="15" y="4" width="2" height="14"/><rect x="18.5" y="4" width="1.5" height="14"/></g></svg>';

const KINDS = { credit: 'Credit', consignment: 'Consignment' };
const TYPES = {
  receive: { label: 'รับเข้า', cls: 'in' },
  opening: { label: 'ยอดยกมา', cls: 'in' },
  return: { label: 'ทำคืน', cls: 'out' },
  clear: { label: 'ไม่มีของแล้ว', cls: 'out' },
  adjust: { label: 'นับสต็อก', cls: 'adj' },
  sale: { label: 'ขาย', cls: 'out' },
  void: { label: 'ยกเลิกบิล', cls: 'adj' },
  dispose: { label: 'ตัดทิ้ง', cls: 'out' },
};
const CLASS_HINTS = ['NON OTC DRUGS', 'OTC DRUGS', 'VITAMINS AND MINERALS', 'DIETARY SUPPLEMENT', 'MEDICAL DEVICE', 'PERSONAL CARE'];
const PAGES = [
  { id: 'home', label: 'แจ้งเตือน', icon: 'bell', tab: true, mode: 'ดูข้อมูล', hint: 'สแกนเพื่อดูล็อตและวันหมดอายุของสินค้า' },
  { id: 'expiry', label: 'วันหมดอายุ', icon: 'calendar', tab: true, mode: 'ดูข้อมูล', hint: 'สแกนเพื่อดูล็อตของสินค้า' },
  { id: 'receive', label: 'รับสินค้า', icon: 'receive', tab: true, mode: 'รับเข้า', hint: 'สแกนสินค้าที่รับเข้า — DataMatrix จะกรอก LOT/EXP ให้เอง' },
  { id: 'products', label: 'สินค้า', icon: 'box', tab: true, mode: 'ดูข้อมูล', hint: 'สแกนเพื่อเปิดข้อมูลสินค้า' },
  { id: 'import', label: 'นำเข้า Excel', icon: 'file', tab: true, mode: 'ดูข้อมูล', hint: 'สแกนเพื่อเปิดข้อมูลสินค้า' },
  { id: 'ledger', label: 'ประวัติ', icon: 'ledger', tab: false, mode: 'ดูข้อมูล', hint: 'สแกนเพื่อเปิดข้อมูลสินค้า' },
  { id: 'settings', label: 'ตั้งค่า', icon: 'settings', tab: true, mode: 'ดูข้อมูล', hint: 'สแกนเพื่อเปิดข้อมูลสินค้า' },
];

/* ================= state ================= */
const S = {
  ready: { products: false, moves: false },
  products: {}, days: {}, meta: {},
  page: 'home',
  receive: { pid: null, kind: 'credit', lot: '', exp: '', qty: '', note: '', fromScan: false },
  exp: { band: 'all', status: '', cls: '', vendor: '', kind: '', q: '' },
  prod: { q: '', cls: '', vendor: '' },
  lg: { from: '', to: '', type: '', q: '' },
  imp: null, drawer: null, modal: null, suggest: [], suggestSel: 0, busy: false,
};
let D = { moves: [], lotQty: {}, pQty: {}, codeIndex: {}, skuIndex: {}, lots: [], moveIds: new Set(), lotKind: {} };
const DEFAULTS = {
  shopName: 'ร้านยาของฉัน',
  yellowM: 7, blackM: 5, redM: 4,
  yellowNote: 'ทำคืนสินค้าส่วนใหญ่ในเดือนที่ตรวจสอบ', blackNote: 'ทำคืนสินค้ากลุ่ม Accucheck', redNote: 'ทำคืนสินค้ากลุ่ม Gummy',
  nearlyDays: 250, defaultReturnMonths: 7, soonDays: 30,
};
const settings = () => Object.assign({}, DEFAULTS, S.meta.settings || {});

/* ================= storage ================= */
async function getCap(name) {
  try { return (window.claude && typeof window.claude.use === 'function') ? await window.claude.use(name) : null; }
  catch (e) { return null; }
}
function loadScript(src) {
  return new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => rej(new Error('โหลด ' + src + ' ไม่สำเร็จ')); document.head.appendChild(s); });
}
function deepMerge(a, b) {
  for (const k of Object.keys(b)) { const v = b[k]; if (v && typeof v === 'object' && !Array.isArray(v) && a[k] && typeof a[k] === 'object' && !Array.isArray(a[k])) deepMerge(a[k], v); else a[k] = v; }
  return a;
}
// Artifact runtime database (used when the page runs as a claude.ai artifact).
function dbStore(db) {
  const api = {
    kind: 'db',
    watch(col, cb) {
      return db.collection(col).onSnapshot(s => { const out = {}; s.docs.forEach(d => { if (d.exists) out[d.id] = d.data(); }); cb(out); },
        e => toast('การเชื่อมต่อข้อมูลขัดข้อง: ' + (e.message || e.code), 'err'));
    },
    set: (col, id, data) => db.doc(col + '/' + id).set(data),
    async update(col, id, data) { const ref = db.doc(col + '/' + id); const snap = await ref.get(); if (snap.exists) await ref.update(data); else await ref.set(data); },
    del: (col, id) => db.doc(col + '/' + id).delete(),
    addEntries: (day, entries) => api.update('moves', day, { date: day, entries }),
    async bulk(ops) {
      for (const o of ops) {
        if (o.op === 'entries') await api.addEntries(o.day, o.entries);
        else if (o.op === 'set') await api.set(o.col, o.id, o.data);
        else if (o.op === 'merge') await api.update(o.col, o.id, o.data);
        else if (o.op === 'del') await api.del(o.col, o.id);
      }
    },
  };
  return api;
}
// Browser-only storage. Saves and change events are coalesced so bulk imports stay fast.
function localStore() {
  const KEY = 'samut-khlang-ya:v1';
  let data = { products: {}, moves: {}, meta: {} };
  try { const raw = localStorage.getItem(KEY); if (raw) data = Object.assign(data, JSON.parse(raw)); } catch (e) { /* storage blocked */ }
  const subs = {}, dirty = new Set(); let timer = 0;
  const flush = () => {
    timer = 0;
    try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) { toast('บันทึกลงเบราว์เซอร์ไม่สำเร็จ — พื้นที่อาจเต็ม ให้สำรองข้อมูลเป็นไฟล์', 'err'); }
    const cols = [...dirty]; dirty.clear();
    cols.forEach(col => (subs[col] || []).forEach(cb => cb(clone(data[col] || {}))));
  };
  const touch = col => { dirty.add(col); if (!timer) timer = setTimeout(flush, 0); };
  const col = c => (data[c] = data[c] || {});
  const apply = o => {
    if (o.op === 'entries') { col('moves')[o.day] = deepMerge(col('moves')[o.day] || { date: o.day, entries: {} }, { entries: clone(o.entries) }); touch('moves'); }
    else if (o.op === 'set') { col(o.col)[o.id] = clone(o.data); touch(o.col); }
    else if (o.op === 'merge') { col(o.col)[o.id] = deepMerge(col(o.col)[o.id] || {}, clone(o.data)); touch(o.col); }
    else if (o.op === 'del') { delete col(o.col)[o.id]; touch(o.col); }
  };
  return {
    kind: 'local',
    watch(c, cb) { (subs[c] = subs[c] || []).push(cb); setTimeout(() => cb(clone(data[c] || {})), 0); return () => {}; },
    async set(c, id, doc) { apply({ op: 'set', col: c, id, data: doc }); },
    async update(c, id, part) { apply({ op: 'merge', col: c, id, data: part }); },
    async del(c, id) { apply({ op: 'del', col: c, id }); },
    async addEntries(day, entries) { apply({ op: 'entries', day, entries }); },
    async bulk(ops) { ops.forEach(apply); },
  };
}
function showGate(inner) { const g = $('#gate'); g.innerHTML = `<div class="gate-card"><div class="brand"><div class="brand-mark" aria-hidden="true">${BRAND_MARK}</div><div class="brand-name">สมุดคลังยา</div></div>${inner}</div>`; g.hidden = false; }
// Firebase (Firestore + Google sign-in). Writes are fired without awaiting the server so the
// app keeps working offline; Firestore applies them locally at once and syncs later.
async function firebaseStore(cfg) {
  const base = 'https://www.gstatic.com/firebasejs/10.14.1/';
  await loadScript(base + 'firebase-app-compat.js');
  await loadScript(base + 'firebase-auth-compat.js');
  await loadScript(base + 'firebase-firestore-compat.js');
  const fb = window.firebase;
  if (!fb.apps.length) fb.initializeApp(cfg.firebase);
  const auth = fb.auth(), fs = fb.firestore();
  try { fs.settings({ ignoreUndefinedProperties: true, merge: true }); } catch (e) { /* settings already applied */ }
  try { await fs.enablePersistence({ synchronizeTabs: true }); } catch (e) { /* private window or unsupported: online only */ }
  const user = await new Promise(res => { const un = auth.onAuthStateChanged(u => { un(); res(u); }); });
  if (!user) {
    showGate(`<h2>เข้าสู่ระบบ</h2><p>ใช้บัญชี Google เพื่อเข้าร้าน ข้อมูลจะซิงก์ทุกเครื่องที่ล็อกอิน</p>
      <button class="btn primary lg" id="gateLogin">เข้าสู่ระบบด้วย Google</button><p class="small" id="gateMsg"></p>`);
    $('#gateLogin').addEventListener('click', async () => {
      const provider = new fb.auth.GoogleAuthProvider(); provider.setCustomParameters({ prompt: 'select_account' });
      $('#gateMsg').textContent = '';
      try { await auth.signInWithPopup(provider); location.reload(); }
      catch (e) {
        if (e.code === 'auth/popup-blocked' || e.code === 'auth/operation-not-supported-in-this-environment') return auth.signInWithRedirect(provider);
        if (e.code === 'auth/popup-closed-by-user' || e.code === 'auth/cancelled-popup-request') return;
        $('#gateMsg').textContent = e.code === 'auth/unauthorized-domain'
          ? `โดเมน ${location.hostname} ยังไม่ได้เพิ่มใน Firebase → Authentication → Settings → Authorized domains`
          : 'เข้าสู่ระบบไม่สำเร็จ: ' + (e.message || e.code);
      }
    });
    return null;
  }
  const root = 'shops/' + (cfg.shopId || 'main');
  const denied = () => {
    showGate(`<h2>ฐานข้อมูลยังไม่อนุญาตให้เข้า</h2><p>ล็อกอินเป็น <b class="mono">${esc(user.email)}</b> แล้ว แต่ Firestore ปฏิเสธการอ่านข้อมูล — ตรวจว่าวาง Rules ใน Firebase console แล้วกด Publish (รอประมาณ 1 นาทีให้มีผล)</p>
      <button class="btn primary" id="gateRetry">ลองอีกครั้ง</button><button class="btn" id="gateOut">ออกจากระบบแล้วใช้บัญชีอื่น</button>`);
    $('#gateRetry').addEventListener('click', () => location.reload());
    $('#gateOut').addEventListener('click', () => auth.signOut().then(() => location.reload()));
  };
  try { await fs.doc(root + '/meta/settings').get(); }
  catch (e) { if (e.code === 'permission-denied') { denied(); return null; } }
  const fire = p => { p.catch(e => { if (e.code === 'permission-denied') denied(); else toast(errText(e), 'err'); }); return Promise.resolve(); };
  const ref = (c, id) => fs.doc(`${root}/${c}/${id}`);
  return {
    kind: 'firebase', email: user.email,
    watch(c, cb) {
      return fs.collection(root + '/' + c).onSnapshot(s => { const out = {}; s.forEach(d => { out[d.id] = d.data(); }); cb(out); },
        e => { if (e.code === 'permission-denied') denied(); else toast('การเชื่อมต่อข้อมูลขัดข้อง: ' + (e.message || e.code), 'err'); });
    },
    set: (c, id, data) => fire(ref(c, id).set(data)),
    update: (c, id, data) => fire(ref(c, id).set(data, { merge: true })),
    del: (c, id) => fire(ref(c, id).delete()),
    addEntries: (day, entries) => fire(ref('moves', day).set({ date: day, entries }, { merge: true })),
    bulk(ops) {
      let batch = fs.batch(), n = 0;
      const commit = () => { fire(batch.commit()); batch = fs.batch(); n = 0; };
      for (const o of ops) {
        if (o.op === 'entries') batch.set(ref('moves', o.day), { date: o.day, entries: o.entries }, { merge: true });
        else if (o.op === 'set') batch.set(ref(o.col, o.id), o.data);
        else if (o.op === 'merge') batch.set(ref(o.col, o.id), o.data, { merge: true });
        else if (o.op === 'del') batch.delete(ref(o.col, o.id));
        if (++n >= 400) commit();
      }
      if (n) commit();
      return Promise.resolve();
    },
    signOut: () => auth.signOut().then(() => location.reload()),
  };
}
let Store = null;

/* ================= expiry rules ================= */
const BAND_ORDER = ['green', 'yellow', 'black', 'red', 'expired'];
function bandInfo(b) {
  const s = settings();
  return {
    green: { label: 'เขียว', desc: `เหลือมากกว่า ${s.yellowM} เดือน`, note: 'ยังไม่ต้องทำอะไร' },
    yellow: { label: 'เหลือง', desc: `เหลือไม่เกิน ${s.yellowM} เดือน`, note: s.yellowNote },
    black: { label: 'ดำ', desc: `เหลือไม่เกิน ${s.blackM} เดือน`, note: s.blackNote },
    red: { label: 'แดง', desc: `เหลือไม่เกิน ${s.redM} เดือน`, note: s.redNote },
    expired: { label: 'หมดอายุ', desc: 'เลยวันหมดอายุแล้ว', note: 'แยกออกจากชั้นวาง' },
  }[b];
}
function bandOf(days) {
  const s = settings(); const months = days / 30.4375;
  if (days < 0) return 'expired';
  if (months <= s.redM) return 'red';
  if (months <= s.blackM) return 'black';
  if (months <= s.yellowM) return 'yellow';
  return 'green';
}
// Reads the return window out of the head-office condition text, e.g.
// "ทำคืนก่อนหมดอายุ 7 เดือน หากติดนับสต็อก ให้ทำคืนก่อนหมดอายุ 6 เดือน" → 7, "ทำคืนหมดอายุแล้ว" → 0.
function parseReturnCond(t) {
  t = String(t || '');
  if (!t.trim()) return null;
  if (/ไม่รับคืน|ห้ามคืน|คืนไม่ได้|ไม่สามารถ(ทำ)?คืน|no\s*return/i.test(t)) return -1;
  const m = t.match(/(?:คืน|return)\D{0,24}?(\d{1,2})\s*(?:เดือน|month)/i);
  if (m) return +m[1];
  if (/หมดอายุแล้ว|after\s*exp/i.test(t)) return 0;
  return null;
}
const returnMonthsOf = p => (typeof p.returnMonths === 'number' ? p.returnMonths : settings().defaultReturnMonths);
const rmText = rm => rm < 0 ? 'ไม่รับคืน' : rm === 0 ? 'ทำคืนเมื่อหมดอายุแล้ว' : `ทำคืนก่อนหมดอายุ ${rm} เดือน`;
function lotInfo(pid, l) {
  const s = settings(); const p = S.products[pid];
  const days = daysLeft(l.exp); const rm = returnMonthsOf(p);
  let deadline = null, dDays = null, status;
  if (rm >= 0) {
    deadline = rm === 0 ? l.exp : addMonthsISO(l.exp, -rm);
    dDays = daysLeft(deadline);
    status = dDays <= 0 ? 'due' : dDays <= s.soonDays ? 'soon' : 'ok';
  } else status = days < 0 ? 'due' : days < s.nearlyDays ? 'soon' : 'ok';
  return { pid, p, id: l.id, lot: l.lot, exp: l.exp, qty: l.qty, days, months: days / 30.4375, band: bandOf(days), nearly: days < s.nearlyDays, rm, deadline, dDays, status, kind: D.lotKind[pid + '|' + l.id] || '' };
}

/* ================= derived data ================= */
function compute() {
  const moves = [];
  for (const doc of Object.values(S.days)) for (const e of Object.values(doc.entries || {})) moves.push(e);
  moves.sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0));
  const lotQty = {}, pQty = {}, codeIndex = {}, skuIndex = {}, lotKind = {}, moveIds = new Set();
  for (const m of moves) {
    const k = m.pid + '|' + m.lotId;
    lotQty[k] = (lotQty[k] || 0) + m.qty; pQty[m.pid] = (pQty[m.pid] || 0) + m.qty; moveIds.add(m.id);
    if (m.kind) lotKind[k] = m.kind;
  }
  for (const [pid, p] of Object.entries(S.products)) {
    for (const [code, unit] of Object.entries(p.codes || {})) codeIndex[normCode(code)] = { pid, unit };
    if (p.sku) skuIndex[String(p.sku).trim().toUpperCase()] = pid;
  }
  D = { moves, lotQty, pQty, codeIndex, skuIndex, lotKind, moveIds, lots: [] };
  const lots = [];
  for (const [pid, p] of Object.entries(S.products)) for (const [id, l] of Object.entries(p.lots || {})) {
    const qty = lotQty[pid + '|' + id] || 0;
    if (qty > 0 && l.exp) lots.push(lotInfo(pid, { id, lot: l.lot, exp: l.exp, qty }));
  }
  lots.sort((a, b) => (a.exp < b.exp ? -1 : a.exp > b.exp ? 1 : 0));
  D.lots = lots;
}
const unitsOf = p => ((p && p.units && p.units.length) ? p.units : [{ name: 'ชิ้น', size: 1, price: 0 }]).slice().sort((a, b) => a.size - b.size);
const unitName = p => unitsOf(p)[0].name;
const fmtQty = (p, q) => `${trimNum(q || 0)} ${unitName(p)}`;
function lotsOf(pid) {
  const p = S.products[pid]; if (!p) return [];
  return Object.entries(p.lots || {}).map(([id, l]) => ({ id, lot: l.lot, exp: l.exp, qty: D.lotQty[pid + '|' + id] || 0 }))
    .sort((a, b) => (a.exp < b.exp ? -1 : a.exp > b.exp ? 1 : 0));
}
function worstBand(pid) {
  let worst = -1;
  for (const l of D.lots) if (l.pid === pid) worst = Math.max(worst, BAND_ORDER.indexOf(l.band));
  return worst < 0 ? null : BAND_ORDER[worst];
}

/* ================= barcode parsing ================= */
const GS = '';
function normCode(c) {
  c = String(c).trim();
  if (/^\d+$/.test(c)) { if (c.length === 14 && c[0] === '0') c = c.slice(1); if (c.length === 12) c = '0' + c; }
  return c.toUpperCase();
}
const AI = { '00': [18], '01': [14], '02': [14], '10': [0, 20], '11': [6], '12': [6], '13': [6], '15': [6], '16': [6], '17': [6], '20': [2], '21': [0, 20], '22': [0, 20], '30': [0, 8], '37': [0, 8], '90': [0, 30], '91': [0, 90], '92': [0, 90], '93': [0, 90], '94': [0, 90], '95': [0, 90], '96': [0, 90], '97': [0, 90], '98': [0, 90], '99': [0, 90] };
function parseGS1(s) {
  const out = {};
  s = s.replace(/^\][A-Za-z]\d/, '');
  if (s[0] === GS) s = s.slice(1);
  if (/^\(\d{2,4}\)/.test(s)) {
    const re = /\((\d{2,4})\)([^(]*)/g; let m;
    while ((m = re.exec(s))) out[m[1]] = m[2].split(GS).join('').trim();
    return out;
  }
  s = s.replace(/\s+/g, '');
  let i = 0;
  while (i < s.length) {
    const ai = s.substr(i, 2), spec = AI[ai];
    if (!spec) break;
    i += 2;
    if (spec.length === 1) { out[ai] = s.substr(i, spec[0]); i += spec[0]; if (s[i] === GS) i++; }
    else {
      let j = s.indexOf(GS, i); const toEnd = j < 0; if (toEnd) j = s.length;
      let v = s.slice(i, j);
      if (toEnd) { const m = v.match(/^(.+?)(1[17])(\d{2})(0[1-9]|1[0-2])(\d{2})$/); if (m) { v = m[1]; out[m[2]] = m[3] + m[4] + m[5]; } }
      out[ai] = v.slice(0, spec[1]); i = j + 1;
    }
  }
  return out;
}
function gs1Date(s) {
  if (!/^\d{6}$/.test(s)) return '';
  const y = 2000 + +s.slice(0, 2), m = +s.slice(2, 4); let d = +s.slice(4, 6);
  if (!d) d = new Date(y, m, 0).getDate();
  return `${y}-${pad(m)}-${pad(d)}`;
}
function parseScan(raw) {
  const s = raw.trim();
  if (/^\]/.test(s) || s.includes(GS) || /^\(\d{2}\)/.test(s) || /^01\d{14}/.test(s)) {
    const ai = parseGS1(s); const g = ai['01'] || ai['02'];
    if (g && /^\d{14}$/.test(g)) return { raw, kind: 'gs1', key: normCode(g), code: g, lot: (ai['10'] || '').toUpperCase(), exp: gs1Date(ai['17'] || '') };
  }
  const digits = s.replace(/\s/g, '');
  if (/^\d{8,14}$/.test(digits)) return { raw, kind: 'ean', key: normCode(digits), code: digits, lot: '', exp: '' };
  const up = s.toUpperCase();
  if (/^[A-Z0-9\-.]{4,}$/.test(up) && (D.codeIndex[up] || /\d/.test(up))) return { raw, kind: 'code', key: up, code: up, lot: '', exp: '' };
  return null;
}
const eanCheck = d12 => { let s = 0; for (let i = 0; i < 12; i++) s += +d12[i] * (i % 2 ? 3 : 1); return (10 - (s % 10)) % 10; };
function newStoreCode() {
  for (;;) { const b = '20' + String(Math.floor(Math.random() * 1e10)).padStart(10, '0'); const c = b + eanCheck(b); if (!D.codeIndex[c]) return c; }
}
function ean13Svg(code) {
  if (!/^\d{13}$/.test(code)) return '';
  const L = ['0001101', '0011001', '0010011', '0111101', '0100011', '0110001', '0101111', '0111011', '0110111', '0001011'];
  const G = ['0100111', '0110011', '0011011', '0100001', '0011101', '0111001', '0000101', '0010001', '0001001', '0010111'];
  const R = ['1110010', '1100110', '1101100', '1000010', '1011100', '1001110', '1010000', '1000100', '1001000', '1110100'];
  const P = ['LLLLLL', 'LLGLGG', 'LLGGLG', 'LLGGGL', 'LGLLGG', 'LGGLLG', 'LGGGLL', 'LGLGLG', 'LGLGGL', 'LGGLGL'];
  const d = code.split('').map(Number);
  let bits = '101';
  for (let i = 1; i <= 6; i++) bits += (P[d[0]][i - 1] === 'L' ? L : G)[d[i]];
  bits += '01010';
  for (let i = 7; i <= 12; i++) bits += R[d[i]];
  bits += '101';
  const m = 2, q = 20, h = 64, W = q * 2 + 95 * m;
  let rects = '';
  for (let i = 0; i < bits.length; i++) if (bits[i] === '1') { const guard = i < 3 || (i >= 45 && i < 50) || i >= 92; rects += `<rect x="${q + i * m}" y="0" width="${m}" height="${guard ? h + 8 : h}"/>`; }
  return `<svg viewBox="0 0 ${W} ${h + 22}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="บาร์โค้ด ${code}"><rect width="${W}" height="${h + 22}" fill="#fff"/><g fill="#000">${rects}</g><g fill="#000" font-family="IBM Plex Mono, monospace" font-size="14" text-anchor="middle"><text x="${q - 9}" y="${h + 18}">${d[0]}</text><text x="${q + 24 * m}" y="${h + 18}">${code.slice(1, 7)}</text><text x="${q + 70 * m}" y="${h + 18}">${code.slice(7)}</text></g></svg>`;
}

/* ================= writes ================= */
function entriesOps(entries) {
  const byDay = {};
  for (const e of entries) { const k = dayKey(new Date(e.at)); (byDay[k] = byDay[k] || {})[e.id] = e; }
  return Object.entries(byDay).map(([day, ents]) => ({ op: 'entries', day, entries: ents }));
}
const record = entries => Store.bulk(entriesOps(entries));
function errText(e) {
  if (e && e.code === 'quota_exceeded') return 'ฐานข้อมูลเต็ม — สำรองข้อมูลเป็นไฟล์แล้วลบข้อมูลที่ไม่ใช้';
  if (e && (e.code === 'resource_exhausted' || e.code === 'resource-exhausted')) return 'บันทึกถี่เกินไป รอสักครู่แล้วลองอีกครั้ง';
  return 'บันทึกไม่สำเร็จ: ' + ((e && (e.message || e.code)) || e);
}
async function safe(fn) {
  if (S.busy) return; S.busy = true;
  try { await fn(); } catch (e) { console.error(e); toast(errText(e), 'err'); } finally { S.busy = false; }
}
function toast(msg, kind) {
  const el = document.createElement('div'); el.className = 'toast' + (kind === 'err' ? ' err' : ''); el.textContent = msg;
  $('#toasts').appendChild(el); setTimeout(() => el.remove(), kind === 'err' ? 5200 : 3000);
}

/* ================= UI atoms ================= */
const lotChip = l => `<span class="lotchip"><span>LOT <b>${esc(l.lot)}</b></span><span>EXP <b>${fmtExp(l.exp)}</b></span></span>`;
const bandChip = b => b ? `<span class="band ${b}"><i></i>${bandInfo(b).label}</span>` : '<span class="muted">—</span>';
const nearlyPill = l => l.nearly ? '<span class="pill warn">Nearly Expired</span>' : '<span class="pill ok">OK</span>';
function statusPill(l) {
  if (l.rm < 0) return l.days < 0 ? '<span class="pill crit">หมดอายุ · ไม่รับคืน</span>' : '<span class="pill">ไม่รับคืน</span>';
  if (l.status === 'due') return '<span class="pill crit">ถึงกำหนดทำคืน</span>';
  if (l.status === 'soon') return `<span class="pill warn">อีก ${l.dDays} วันถึงกำหนด</span>`;
  return '<span class="pill ok">ยังไม่ถึงกำหนด</span>';
}
function deadlineText(l) {
  if (l.rm < 0) return l.days < 0 ? `หมดอายุมาแล้ว ${-l.days} วัน` : `อีก ${l.days} วันหมดอายุ`;
  const when = l.dDays === 0 ? 'วันนี้' : l.dDays < 0 ? `เลยมา ${-l.dDays} วัน` : `อีก ${l.dDays} วัน`;
  return `กำหนดคืน ${fmtExp(l.deadline)} · ${when}`;
}
const pSub = p => [p.sku && `SKU ${esc(p.sku)}`, p.vendor && esc(p.vendor)].filter(Boolean).join(' · ');
const options = (list, sel, blank) => (blank != null ? `<option value="">${blank}</option>` : '') + list.map(v => `<option value="${esc(v)}"${v === sel ? ' selected' : ''}>${esc(v)}</option>`).join('');
const uniq = arr => [...new Set(arr.filter(Boolean))].sort((a, b) => a.localeCompare(b, 'th'));
