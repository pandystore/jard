const store = (() => {

  const mem = new Map();
  return {
    getItem: k => (mem.has(k) ? mem.get(k) : null),
    setItem: (k, v) => { mem.set(k, String(v)); },
    removeItem: k => { mem.delete(k); },
    clear: () => { mem.clear(); }
 };
})();

(function purgeLegacyStorage(){
  const KILL = /^(jard::.*)|(inventoryData|localRev|logBook|selectedDateTime|customLogo|adminHash|usersList|sessionUser|firebaseCfg|soundOn|lockOnOpen|syncPath|deviceId|branchesList|branch|lastForceWipe|lastNotifTs|notifEnabled|uploadDateTime|lastEditAt|lastEditBy)(::.*)?$/;
  ['localStorage', 'sessionStorage'].forEach(kind => {
    try {
      const box = window[kind];
      const kill = [];
      for (let i = 0; i < box.length; i++) {
        const k = box.key(i);

        if (k && KILL.test(k)) kill.push(k);
 }
      kill.forEach(k => { try { box.removeItem(k); } catch (e) {} });
 } catch (e) {}
 });
})();

const FIREBASE_CONFIG = (window.FIREBASE_CONFIG && window.FIREBASE_CONFIG.apiKey !== undefined) ? window.FIREBASE_CONFIG : { apiKey: "", authDomain: "", databaseURL: "", projectId: "", appId: "" };

function bootShow(){
  if (document.getElementById('bootGate')) return;
  const d = document.createElement('div');
  d.id = 'bootGate';
  d.style.cssText = 'position:fixed;inset:0;background:#f8fafc;z-index:700;display:flex;align-items:center;justify-content:center;padding:1rem;font-family:Cairo,Tahoma,sans-serif';

  d.innerHTML =
    '<div style="background:#fff;border:1px solid #e2e8f0;border-radius:1.25rem;padding:2rem;max-width:380px;width:100%;text-align:center;box-shadow:0 20px 25px -5px rgba(0,0,0,.1)">' +
    '<div id="bootTitle" style="font-weight:800;font-size:1.05rem;color:#1f2937;margin-bottom:.4rem">جاري الاتصال بقاعدة البيانات...</div>' +
    '<div style="font-size:1.6rem;padding:1rem 0" id="bootIcon">⏳</div>' +
    '<div id="bootCfgWrap" style="display:none;margin-top:1rem;text-align:right">' +
    '<div style="font-size:.72rem;font-weight:700;color:#475569;margin-bottom:.3rem">البرنامج الأول على الجهاز ده — الصق بيانات Firebase هنا (مرة واحدة):</div>' +
    '<textarea id="bootCfg" placeholder=\'{"apiKey":"...","databaseURL":"...","projectId":"..."}\' style="width:100%;min-height:100px;font-size:.68rem;direction:ltr;text-align:left;border:1px solid #e2e8f0;border-radius:.5rem;padding:.5rem;font-family:monospace"></textarea>' +
    '<button id="bootCfgBtn" style="width:100%;margin-top:.5rem;background:#2563eb;color:#fff;border:none;border-radius:.5rem;padding:.6rem;font-weight:700;cursor:pointer">ربط واستمرار</button></div>' +
    '</div>';
  const attach = () => { if (document.body) document.body.appendChild(d); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', attach, { once: true });
  else attach();
}
function bootMsg(t){ const m = document.getElementById('bootTitle'); if (m) m.textContent = t || 'جاري الاتصال بقاعدة البيانات...'; }
function bootHide(){ const g = document.getElementById('bootGate'); if (g) g.remove(); }

function bigBlock(icon, title, sub, btnLabel, onBtn){
  document.querySelectorAll('.big-block-ov').forEach(x => x.remove());
  const ov = document.createElement('div');
  ov.className = 'big-block-ov';
  ov.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,.94);z-index:800;display:flex;align-items:center;justify-content:center;padding:1rem;font-family:Cairo,Tahoma,sans-serif';
  ov.innerHTML =
    '<div style="background:#fff;border-radius:1.25rem;padding:2.2rem 2rem;max-width:430px;width:100%;text-align:center;box-shadow:0 25px 50px -12px rgba(0,0,0,.5)">' +
    '<div style="font-size:3.2rem;margin-bottom:.5rem">' + icon + '</div>' +
    '<div style="font-size:1.6rem;font-weight:900;color:#b91c1c;margin-bottom:.6rem;line-height:1.5">' + title + '</div>' +
    (sub ? '<div style="font-size:.95rem;color:#475569;margin-bottom:1.3rem;line-height:2">' + sub + '</div>' : '<div style="margin-bottom:1.3rem"></div>') +
    (btnLabel ? '<button class="big-block-btn" style="background:#2563eb;color:#fff;border:none;border-radius:.6rem;padding:.8rem 1.8rem;font-weight:800;font-size:1.05rem;cursor:pointer;font-family:inherit">' + btnLabel + '</button>' : '') +
    '</div>';
  document.body.appendChild(ov);
  if (btnLabel) ov.querySelector('.big-block-btn').onclick = onBtn || (() => ov.remove());
  return ov;
}

function tabGuard(proceed){
  try {
    if (!('BroadcastChannel' in window)) { proceed(); return; }

    if (window.__jardTabCh) { window.__jardTabCh.close(); window.__jardTabCh = null; }
    const ch = window.__jardTabCh = new BroadcastChannel('jard-tabs');
    const myId = 'tab-' + Math.random().toString(36).slice(2, 9);
    let decided = false, active = false;
    ch.onmessage = ev => {
      const m = ev.data || {};
      if (m.t === 'ping' && active && m.id !== myId) ch.postMessage({ t: 'pong', to: m.id });
      if (m.t === 'pong' && m.to === myId && !decided && !active) {
        decided = true;
        bigBlock('🖥️', 'البرنامج مفتوح بالفعل على الجهاز ده',
          'فيه تبويب أو نافذة تانية شغالة في نفس اللحظة.<br>البرنامج بيمنع التشغيل في مكانين على نفس الجهاز عشان الجرد مايتلخبطش.',
          '✋ اشتغل هنا واقفل التبويب التاني', () => {
            try { ch.postMessage({ t: 'takeover' }); } catch (e) {}
            document.querySelectorAll('.big-block-ov').forEach(x => x.remove());
            active = true;
            proceed();
 });
 }
      if (m.t === 'takeover' && active) {
        active = false;
        try { stopCameraScanner(); } catch (e) {}
        try { releaseSession(); } catch (e) {}
        bigBlock('🖥️', 'البرنامج اتقفل من هنا',
          'اتفتح من تبويب تاني على نفس الجهاز — الجلسة اتنقلت هناك.<br>عايز ترجع؟ اقفل التبويب التاني وحدّث الصفحة.',
          'حسنًا', () => {});
 }
 };
    ch.postMessage({ t: 'ping', id: myId });
    setTimeout(() => { if (!decided) { decided = true; active = true; proceed(); } }, 400);
 } catch (e) { proceed(); }
}

window.addEventListener('error', function (e) {
  try {
    if (typeof sessionUser !== 'undefined' && sessionUser && typeof isElevated === 'function' && !isElevated()) return;
    var box = document.getElementById('toasts');
    if (!box || !e || !e.message) return;
    var t = document.createElement('div');
    t.className = 'toast error';
    t.textContent = 'خطأ في الصفحة: ' + e.message;
    box.appendChild(t);
    setTimeout(function () { t.remove(); }, 7000);
 } catch (err) {}
});

const LOGO_URI = "data:image/png;base64,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";

function fbRoot(){ return 'jard'; }
function fbPath(){ return 'jard'; }

let inventoryData = [];
let currentCategory = 'all';

let currentStatus = 'hide_equal';
let workbookData = null, sheetNames = [], isCsvSource = false, csvRows = [];
let selectedSerials = new Set();
let logBook = JSON.parse(store.getItem('logBook') || '[]');
let soundOn = store.getItem('soundOn') !== '0';
let adminHash = store.getItem('adminHash') || '';
let usersList = JSON.parse(store.getItem('usersList') || '[]');
let sessionUser = null;

/* تاريخ رفع الجرد = آخر مرة اترفع فيها ملف الإكسيل على السيستم (دمج أو استبدال).
   تاريخ التعديل = آخر مرة عدّل فيها الأدمن/المشرف في بيانات الجرد. */
let uploadDateTime = store.getItem('uploadDateTime') || '';
let lastEditAt = Number(store.getItem('lastEditAt')) || 0;
let lastEditBy = store.getItem('lastEditBy') || '';

let setupDone = false;
let userFilter = '';
let qrScanner = null, qrScanCount = 0, qrCamOn = false;

/* الكاميرا بتقرا نفس الباركود في كل فريم (10-18 مرة في الثانية) طول ما هو قدامها —
   فنفس الكود بيتحسب تاني بس لما يختفي من قدام الكاميرا CAM_GONE_MS على الأقل.
   أي كود مختلف بيتقرا فورًا من غير أي انتظار، ومفيش أي رسالة «اتقرا مرتين». */
const CAM_GONE_MS = 450;
const CAM_MIN_SAME_MS = 600;
let firebaseCfgLS = JSON.parse(store.getItem('firebaseCfg') || 'null');

let db = null, syncOn = false, refOff = null;

let pendingItemWrites = {};
let itemPushTimers = {};

let pendingCountOps = {};
let countPushTimers = {};
let countRetry = {};

let committedItemKeys = {};
let editingCount = 0, pendingRemote = false;
let failCount = 0, lockUntil = 0;

let loginFails = 0, loginLockUntil = 0;

let localAdminVerified = false;
let pendingMetaPush = false;

let lastUsersRev = 0;

let fbConnected = null;
let lastSyncErr = '';
let accessDenied = false;
let connectRetryTimer = null;

let notifOff = null;
let lastNotifTs = parseInt(store.getItem('lastNotifTs') || '0') || 0;
const deviceId = (() => {
  try {
    const saved = localStorage.getItem('jardDevId');
    if (saved) return saved;
    const id = 'dev-' + Math.random().toString(36).slice(2, 9);
    localStorage.setItem('jardDevId', id);
    return id;
  } catch (e) { return 'dev-' + Math.random().toString(36).slice(2, 9); }
})();

function $(id){ return document.getElementById(id); }
function esc(s){ return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }

function sanitizeCode(s){
  const AR = '٠١٢٣٤٥٦٧٨٩', FA = '۰۱۲۳۴۵۶۷۸۹';
  s = String(s == null ? '' : s);
  let out = '';
  for (const ch of s) {
    let i = AR.indexOf(ch); if (i !== -1) { out += String(i); continue; }
    i = FA.indexOf(ch); if (i !== -1) { out += String(i); continue; }
    if (ch.charCodeAt(0) >= 32 && ch.charCodeAt(0) <= 126) out += ch;
 }
  return out.trim();
}
function fmtQ(n){ n = Number(n) || 0; return Number.isInteger(n) ? n : +n.toFixed(2); }
function parseQty(v){ const n = parseFloat(String(v).replace(/[^\d.\-]/g, '')); return isNaN(n) ? 0 : Math.round(n * 100) / 100; }
function pad2(n){ return String(n).padStart(2, '0'); }
function nowLocalDT(){ const d = new Date(); return d.getFullYear()+'-'+pad2(d.getMonth()+1)+'-'+pad2(d.getDate())+'T'+pad2(d.getHours())+':'+pad2(d.getMinutes()); }
function stamp(){ const d = new Date(); return d.getFullYear()+'-'+pad2(d.getMonth()+1)+'-'+pad2(d.getDate())+'_'+pad2(d.getHours())+pad2(d.getMinutes()); }

function itemKey(code){
  return 'c_' + String(code == null ? '' : code).replace(/[.#$\[\]\/]/g, '_');
}
function normItem(i, fallbackCode){
  i = i || {};
  return {
    serial: Number(i.serial) || 0,
    code: String(i.code == null ? (fallbackCode || '') : i.code),
    name: String(i.name == null ? '' : i.name),
    group: String(i.group || 'غير مصنف'),
    systemQuantity: Number(i.systemQuantity) || 0,
    actualQuantity: Number(i.actualQuantity) || 0,
    isJarded: !!i.isJarded,
    difference: Number(i.difference) || 0,
    status: String(i.status || 'متساوي'),
    note: String(i.note || ''),
    countedBy: String(i.countedBy || ''),
    counts: (i.counts && typeof i.counts === 'object') ? i.counts : {},
    conflict: !!i.conflict,
    editedAt: Number(i.editedAt) || 0,
    /* تحديد يدوي للرصيد الفعلى — بيحصل من المسؤول/المشرف فقط من الجدول */
    manualQty: !!i.manualQty,
    manualBy: String(i.manualBy || ''),
    manualAt: Number(i.manualAt) || 0,
    manualPrev: String(i.manualPrev || '')
 };
}

/* الرصيد الفعلى (العمود الأزرق في الجدول) يتعدّل يدويًا من المسؤول أو المشرف فقط.
   المستخدم العادي يعدّ بالباركود/الكاميرا بس — العدّة بتتسجّل كحصة باسمه. */
function canEditActual(){
  if (!loginRequired()) return true;
  return isElevated();
}

function fmtTs(ts){
  const n = Number(ts) || 0;
  if (!n) return '';
  const d = new Date(n);
  return d.getFullYear()+'-'+pad2(d.getMonth()+1)+'-'+pad2(d.getDate())+' '+pad2(d.getHours())+':'+pad2(d.getMinutes());
}

/* -------------------------------------------------------
   تاريخ رفع الجرد / تاريخ التعديل (أسفل الصفحة من الشمال)
   - تاريخ رفع الجرد: بيتسجّل تلقائيًا أول ما الأدمن يرفع ملف إكسيل
     جديد على السيستم (دمج أو استبدال) — مش بيتغيّر لوحده.
   - تاريخ التعديل: بيتحدّث تلقائيًا عند أي تعديل من الأدمن/المشرف
     في بيانات الجرد (رفع ملف، تعديل يدوي، حذف، مسح الكل).
   الاتنين بيتزامنوا من meta على Firebase عشان كل الأجهزة
   تشوف نفس التاريخ.
   ------------------------------------------------------- */
function renderFileDates(){
  const up = $('uploadDateLabel');
  if (up) {
    up.textContent = uploadDateTime ? uploadDateTime.replace('T', ' ') : '—';
    up.title = uploadDateTime ? 'تاريخ رفع ملف جرد الإكسيل على السيستم' : 'لسه مفيش ملف جرد مرفوع';
 }
  const le = $('lastEditLabel');
  if (le) {
    le.textContent = lastEditAt ? fmtTs(lastEditAt) : '—';
    le.title = lastEditBy ? ('آخر تعديل بواسطة: ' + lastEditBy) : (lastEditAt ? 'آخر تعديل في بيانات الجرد' : 'لسه مفيش تعديل');
 }
  /* حقل "تاريخ الجرد" المخفي — التقارير والطباعة بيقروا منه */
  const dtEl = $('currentDateTime');
  if (dtEl && uploadDateTime) dtEl.value = uploadDateTime;
}
function markAdminEdit(){
  lastEditAt = Date.now();
  lastEditBy = (sessionUser && sessionUser.name) || 'النظام';
  store.setItem('lastEditAt', String(lastEditAt));
  store.setItem('lastEditBy', lastEditBy);
  renderFileDates();
  scheduleMetaPush();
}
function markInventoryUploaded(){
  uploadDateTime = nowLocalDT();
  store.setItem('uploadDateTime', uploadDateTime);
  store.setItem('selectedDateTime', uploadDateTime);
  const dtEl = $('currentDateTime'); if (dtEl) dtEl.value = uploadDateTime;
  renderFileDates();
  markAdminEdit();
}
function clearInventoryUpload(){
  uploadDateTime = '';
  store.removeItem('uploadDateTime');
  const dtEl = $('currentDateTime'); if (dtEl) dtEl.value = nowLocalDT();
  renderFileDates();
  if (syncOn && db) { try { db.ref(fbPath() + '/meta/uploadedAt').remove().catch(() => {}); } catch(e){} }
}

function mergeOneItem(l, r, me){
  const rRole = getUserRole(r.countedBy);
  const rTs = Number(r.editedAt) || 0;
  const lTs = Number(l.editedAt) || 0;
  const lManualAt = Number(l.manualAt) || 0;
  const rManualAt = Number(r.manualAt) || 0;

  /* تحديد يدوي من المسؤول/المشرف: بيمسح كل الحصص اللي كانت موجودة وقت التحديد
     ويحط الرقم الجديد باسمه. النسخة اللي فيها تحديد يدوي أحدث من توقيت النسخة
     التانية هي اللي بتكسب — وأي عدّة اتعملت بعد التحديد بتتضاف فوقه وما بتتمسحش. */
  const lManualWins = lManualAt > 0 && lManualAt >= rTs;
  const rManualWins = !lManualWins && rManualAt > 0 && rManualAt >= lTs;

  const counts = Object.assign({}, lManualWins ? (l.counts || {}) : (r.counts || {}));
  if (!lManualWins && !rManualWins) {
    Object.keys(l.counts || {}).forEach(u => {
      if (u === me || counts[u] === undefined) counts[u] = l.counts[u];
 });
 }
  const m = Object.assign({}, r);
  m.counts = counts;
  if (lManualAt && lManualAt >= rManualAt) {
    m.manualQty = !!l.manualQty;
    m.manualBy = String(l.manualBy || '');
    m.manualAt = lManualAt;
    m.manualPrev = String(l.manualPrev || '');
 }
  if (Object.keys(counts).length) {
    const tot = Object.keys(counts).reduce((a, u) => a + (Number(counts[u]) || 0), 0);

    m.actualQuantity = Math.round(tot * 100) / 100;
    m.isJarded = true;
    if (me) m.countedBy = me;
    else if (rRole === 'admin' && rTs >= lTs) m.countedBy = r.countedBy;
    m.isJarded = true;
 } else {
    if (rTs && lTs) {
      if (rTs >= lTs) { m.actualQuantity = r.actualQuantity; m.countedBy = r.countedBy || l.countedBy; }
      else { m.actualQuantity = l.actualQuantity; m.countedBy = l.countedBy || r.countedBy; }
 } else if (rRole === 'admin') {
      m.actualQuantity = r.actualQuantity; m.countedBy = r.countedBy || l.countedBy;
 } else {
      m.actualQuantity = l.actualQuantity; m.countedBy = l.countedBy || r.countedBy;
 }
    m.isJarded = r.isJarded || l.isJarded;
 }
  m.editedAt = Math.max(rTs, lTs);
  if (me && l.note) m.note = l.note;
  if (r.note && rRole === 'admin') m.note = r.note;
  calculateRow(m);
  return m;
}

function round2(n){ return Math.round((Number(n) || 0) * 100) / 100; }

function sumCounts(counts){
  const c = (counts && typeof counts === 'object') ? counts : {};
  return round2(Object.keys(c).reduce((a, u) => a + (Number(c[u]) || 0), 0));
}

/* وصف مقروء للحصص: "محمد: 5 + admin: 2" — بيستخدم في التلميحات وسجل العمليات */
function countsSummary(counts){
  const c = (counts && typeof counts === 'object') ? counts : {};
  const keys = Object.keys(c).filter(k => Number(c[k]) > 0);
  if (!keys.length) return '';
  return keys.map(k => k + ': ' + fmtQ(c[k])).join(' + ');
}

function applyCountOps(cur, ops, me, code, localBase){
  const list = Array.isArray(ops) ? ops : [];
  const src = (cur && typeof cur === 'object') ? cur : (localBase || null);
  const item = normItem(src, code);
  if (code) item.code = code;

  let counts = (cur && cur.counts && typeof cur.counts === 'object') ? Object.assign({}, cur.counts) : {};
  let lastWho = '', lastTs = Number(item.editedAt) || 0, manual = null;
  for (let i = 0; i < list.length; i++){
    const op = list[i];
    if (!op) continue;
    const who = op.who || '';
    if (op.t === 'seed'){

      if (!Object.keys(counts).length && who) counts[who] = Math.max(0, round2(op.v));
 } else if (op.t === 'delta'){
      if (who) counts[who] = round2((Number(counts[who]) || 0) + (Number(op.d) || 0));
 } else if (op.t === 'manual'){
      /* تحديد يدوي من المسؤول/المشرف: يمسح كل العدّات السابقة (من الأدمن أو أي يوزر)
         ويحط الرقم اللي اتكتب بإيده كحصة واحدة باسمه — الإجمالي يبقى هو الرقم ده بالظبط */
      if (who) {
        manual = { by: who, at: Number(op.ts) || 0, prev: countsSummary(counts) || String(op.prev || '') };
        counts = {};
        counts[who] = Math.max(0, round2(op.v));
 }
 } else if (op.t === 'set'){

      if (who) counts[who] = Math.max(0, round2(op.v));
 } else continue;
    if (who) lastWho = who;
    lastTs = Math.max(lastTs, Number(op.ts) || 0);
 }
  item.counts = counts;
  item.actualQuantity = sumCounts(counts);
  item.isJarded = true;
  item.countedBy = lastWho || me || item.countedBy || '';
  item.editedAt = lastTs;
  if (manual) {
    item.manualQty = true;
    item.manualBy = manual.by;
    item.manualAt = manual.at;
    item.manualPrev = manual.prev;
 }
  calculateRow(item);
  return item;
}

function legacySeedOp(item, bag, ts){
  if (!item) return null;
  if (item.counts && Object.keys(item.counts).length) return null;
  const base = round2(item.actualQuantity);
  const owner = item.countedBy || bag;
  if (!owner) return null;
  if (base === 0 && !item.countedBy) return null;
  return { t: 'seed', who: owner, v: base, ts: ts };
}

function applyMetaPatch(cur, local, code){
  if (!cur || typeof cur !== 'object') return normItem(local, code);
  const item = normItem(cur, code);
  const l = normItem(local, code);
  ['name', 'group', 'systemQuantity', 'note'].forEach(f => { item[f] = l[f]; });
  item.serial = Number(l.serial) || item.serial;

  if (Object.keys(item.counts || {}).length) item.actualQuantity = sumCounts(item.counts);
  item.editedAt = Math.max(Number(item.editedAt) || 0, Number(l.editedAt) || 0);
  calculateRow(item);
  return item;
}

function resolveIncomingItem(key, local, incoming, me){
  if (committedItemKeys[key]) { delete committedItemKeys[key]; return incoming; }

  if (pendingItemWrites[key]) return mergeOneItem(local, incoming, me);
  return incoming;
}

const PASS_PREFIX = 'bjrd::';

function randomSalt(){
  const b = new Uint8Array(16);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) crypto.getRandomValues(b);
  else for (let i = 0; i < 16; i++) b[i] = Math.floor(Math.random() * 256);
  return [...b].map(x => x.toString(16).padStart(2, '0')).join('');
}
async function sha256Hex(txt){
  try {
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(txt));
      return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');
    }
  } catch (e) {}
  return null;
}

async function legacyHash(p){
  const h = await sha256Hex(PASS_PREFIX + p);
  if (h) return h;
  let x = 5381; const t = PASS_PREFIX + p;
  for (let i = 0; i < t.length; i++) x = ((x << 5) + x + t.charCodeAt(i)) >>> 0;
  return 'fb' + x.toString(16);
}
/* ===== كلمات المرور بالعربي =====
   - normPass: بيوحّد الأشكال المختلفة لنفس الحرف العربي (أ/إ/آ ← ا، ى ← ي، ة ← ه،
     ی/ک الفارسي، التشكيل، التطويل، علامات الاتجاه الخفية اللي بعض الكيبوردات
     بتحطها، الأرقام العربية ← إنجليزية، والمسافات في الأطراف) — فالباسورد العربي
     يتقبل مهما كان الجهاز/الكيبورد.
   - passCandidates: لو الكيبورد كان على العربي والباسورد إنجليزي (أو العكس) بيجرّب
     نفس الزراير على اللغة التانية (كيبورد عربي 101 القياسي). */
const AR_KEYS = {
  '`':'ذ','q':'ض','w':'ص','e':'ث','r':'ق','t':'ف','y':'غ','u':'ع','i':'ه','o':'خ','p':'ح','[':'ج',']':'د',
  'a':'ش','s':'س','d':'ي','f':'ب','g':'ل','h':'ا','j':'ت','k':'ن','l':'م',';':'ك',"'":'ط',
  'z':'ئ','x':'ء','c':'ؤ','v':'ر','b':'لا','n':'ى','m':'ة',',':'و','.':'ز','/':'ظ',
  '~':'\u0651','Q':'\u064E','W':'\u064B','E':'\u064F','R':'\u064C','T':'لإ','Y':'إ','U':'\u2018','I':'÷','O':'×','P':'؛',
  '{':'<','}':'>','A':'\u0650','S':'\u064D','D':']','F':'[','G':'لأ','H':'أ','J':'\u0640','K':'،','L':'/',
  'Z':'~','X':'\u0652','C':'}','V':'{','B':'لآ','N':'آ','M':'\u2019','<':',','>':'.','?':'؟'
};
function normPass(p){
  let s = String(p == null ? '' : p);
  try { s = s.normalize('NFKC'); } catch (e) {}
  const AR = '٠١٢٣٤٥٦٧٨٩', FA = '۰۱۲۳۴۵۶۷۸۹';
  s = s.replace(/[\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF\u061C\u00AD]/g, '')
    .replace(/[\u0640\u064B-\u065F\u0670]/g, '')
    .replace(/[\u0622\u0623\u0625\u0671]/g, '\u0627')
    .replace(/\u0649/g, '\u064A').replace(/\u06CC/g, '\u064A')
    .replace(/\u0629/g, '\u0647').replace(/\u06A9/g, '\u0643')
    .replace(/[٠-٩]/g, d => String(AR.indexOf(d)))
    .replace(/[۰-۹]/g, d => String(FA.indexOf(d)));
  return s.trim();
}
function enToArKeys(p){
  let out = '';
  for (const ch of String(p)) out += Object.prototype.hasOwnProperty.call(AR_KEYS, ch) ? AR_KEYS[ch] : ch;
  return out;
}
function arToEnKeys(p){
  const rev = {};
  Object.keys(AR_KEYS).forEach(k => { const v = AR_KEYS[k]; if (v.length === 1 && !rev[v]) rev[v] = k; });
  const pairs = {};
  Object.keys(AR_KEYS).forEach(k => { const v = AR_KEYS[k]; if (v.length === 2) pairs[v] = k; });
  const s = String(p), outs = [];
  const walk = (i, acc) => {
    if (outs.length >= 16) return;
    if (i >= s.length) { outs.push(acc); return; }
    const two = s.substr(i, 2);
    /* «لا» ممكن تكون زرار B لوحده أو G وبعدها H — بنجرّب الاحتمالين */
    if (pairs[two]) walk(i + 2, acc + pairs[two]);
    const ch = s[i];
    walk(i + 1, acc + (rev[ch] || ch));
  };
  walk(0, '');
  return outs;
}
function passCandidates(p){
  p = String(p == null ? '' : p);
  const list = [p, normPass(p)];
  if (/[\u0600-\u06FF\u2018\u2019÷×]/.test(p)) arToEnKeys(p).forEach(x => { list.push(x, normPass(x)); });
  if (/[A-Za-z`\[\];',.\/~{}<>?]/.test(p)) { const a = enToArKeys(p); list.push(a, normPass(a)); }
  return list.filter((x, i) => x && list.indexOf(x) === i);
}
async function hashRaw(p, salt){
  const s = salt || randomSalt();
  const h = await sha256Hex(PASS_PREFIX + s + '::' + p);

  if (!h) {
    let x = 5381; const t = PASS_PREFIX + s + '::' + p;
    for (let i = 0; i < t.length; i++) x = ((x << 5) + x + t.charCodeAt(i)) >>> 0;
    return 'v1$' + s + '$' + x.toString(16);
  }
  return 'v2$' + s + '$' + h;
}
async function hashPass(p, salt){
  return hashRaw(normPass(p), salt);
}

async function verifyPass(p, stored){
  if (!stored || typeof stored !== 'string') return null;
  const cands = passCandidates(p);
  const parts = stored.split('$');
  if (parts.length === 3 && (parts[0] === 'v1' || parts[0] === 'v2')) {
    for (const c of cands) {
      if (await hashRaw(c, parts[1]) === stored) {
        /* هاش قديم اتعمل قبل التوحيد — بنحدّثه للصيغة الموحّدة عشان يتقبل بأي شكل بعد كده */
        return normPass(c) === c ? stored : await hashPass(c);
      }
    }
    return null;
  }

  for (const c of cands) {
    if (await legacyHash(c) === stored) return await hashPass(c);
  }
  return null;
}

let AC = null, masterGain = null;
function audioCtx(){
  AC = AC || new (window.AudioContext || window.webkitAudioContext)();
  if (AC.state === 'suspended') AC.resume();
  if (!masterGain) {
    const comp = AC.createDynamicsCompressor();
    comp.threshold.value = -4; comp.knee.value = 0; comp.ratio.value = 12;
    comp.attack.value = .001; comp.release.value = .08;
    masterGain = AC.createGain(); masterGain.gain.value = 1;
    masterGain.connect(comp); comp.connect(AC.destination);
 }
  return AC;
}

function tone(freq, start, dur, type, vol, sweepTo){
  const t0 = AC.currentTime + start;
  const o = AC.createOscillator(), g = AC.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t0);
  if (sweepTo) o.frequency.exponentialRampToValueAtTime(sweepTo, t0 + dur);
  g.gain.setValueAtTime(.0001, t0);
  g.gain.linearRampToValueAtTime(vol, t0 + .002);
  g.gain.setValueAtTime(vol, t0 + dur - .004);
  g.gain.linearRampToValueAtTime(.0001, t0 + dur);
  o.connect(g); g.connect(masterGain);
  o.start(t0); o.stop(t0 + dur + .02);
}
function beep(kind){
  if (!soundOn) return;
  try {
    audioCtx();
    if (kind === 'ok') {

      tone(2093, 0, .09, 'sine', 1);
      tone(2093 * 2, 0, .09, 'sine', .18);
      tone(2093, 0, .09, 'square', .25);
 } else if (kind === 'unk') {

      tone(1300, 0, .06, 'square', .9, 2000);
      tone(2000, .08, .06, 'square', .9, 3100);
 } else if (kind === 'bad') {

      tone(600, 0, .12, 'square', .75, 300);
      tone(1200, .13, .1, 'square', .4, 400);
 }
 } catch (e) {}
}

function primeAudio(){
  if (!soundOn) return;
  try { audioCtx(); } catch (e) {}
}

function toast(msg, type, opts){
  /* المستخدم العادي لا تظهر له أي رسائل Toast؛ تظل رسائل المسؤول والمشرف ظاهرة. */
  if (sessionUser && typeof isElevated === 'function' && !isElevated()) return;
  opts = opts || {};
  const t = document.createElement('div');
  t.className = 'toast ' + (type || 'info');
  const span = document.createElement('span'); span.textContent = msg;
  t.appendChild(span);

  let life = (opts.life != null) ? opts.life : 8000, killed = false;
  const kill = () => { if (!killed) { killed = true; t.remove(); } };
  if (opts.actionLabel) {
    life = 15000;
    const b = document.createElement('button');
    b.className = 'act'; b.textContent = opts.actionLabel;
    b.onclick = () => { kill(); opts.onAction && opts.onAction(); };
    t.appendChild(b);
 }
  $('toasts').appendChild(t);
  setTimeout(kill, life);
}

function closeModal(id){ $(id).style.display = 'none'; }
function showModal(title, bodyHTML, buttons, onDismiss, opts){
  const ov = document.createElement('div');
  ov.className = 'modal-overlay'; ov.style.zIndex = 150;
  const box = document.createElement('div'); box.className = 'modal-box' + ((opts && opts.wide) ? ' wide' : '');
  const h = document.createElement('h3'); h.className = 'modal-title'; h.textContent = title;
  const body = document.createElement('div'); body.innerHTML = bodyHTML;
  const foot = document.createElement('div'); foot.className = 'modal-foot';
  let closed = false;
  const close = () => { if (closed) return; closed = true; ov.remove(); if (onDismiss) onDismiss(); };
  (buttons || []).forEach(bd => {
    const b = document.createElement('button');
    b.className = 'mbtn ' + (bd.kind || 'ghost'); b.textContent = bd.label;
    b.onclick = () => { bd.onClick && bd.onClick(body, close); if (bd.autoClose !== false) close(); };
    foot.appendChild(b);
 });
  box.appendChild(h); box.appendChild(body); if (buttons && buttons.length) box.appendChild(foot);
  ov.appendChild(box);
  ov.addEventListener('click', e => { if (e.target === ov) close(); });
  document.body.appendChild(ov);
  return { body, close };
}
function confirmDlg(title, text, okLabel, danger){
  return new Promise(res => {
    showModal(title, '<div style="font-size:.9rem;color:#475569;line-height:1.7">' + esc(text) + '</div>', [
      { label: okLabel || 'تأكيد', kind: danger ? 'danger' : 'primary', onClick: () => res(true) },
      { label: 'إلغاء', kind: 'ghost', onClick: () => res(false) }
    ], () => res(false));
 });
}

function importPreviewDlg(title, summaryText, rowsHTML, okLabel){
  return new Promise(res => {
    const body = '<div style="font-size:.85rem;color:#475569;line-height:1.7;margin-bottom:.6rem">' + esc(summaryText) + '</div>' +
      '<div style="max-height:280px;overflow:auto;border:1px solid #e2e8f0;border-radius:.5rem">' +
      '<table style="width:100%;font-size:.75rem;border-collapse:collapse">' + rowsHTML + '</table></div>';
    showModal(title, body, [
      { label: okLabel || 'تأكيد', kind: 'primary', onClick: () => res(true) },
      { label: 'إلغاء', kind: 'ghost', onClick: () => res(false) }
    ], () => res(false));
 });
}
function inputDlg(title, ph, isPass){
  return new Promise(res => {
    const m = showModal(title, '<div class="fld"><input id="_dlgInp" type="' + (isPass ? 'password' : 'text') + '" placeholder="' + esc(ph || '') + '" dir="auto" autocapitalize="off" autocorrect="off" spellcheck="false"></div>' +
      (isPass ? '<label class="show-pass"><input type="checkbox" id="_dlgShow"> إظهار كلمة المرور</label>' : ''), [
      { label: 'تأكيد', kind: 'primary', onClick: (body) => res(body.querySelector('#_dlgInp').value || '') },
      { label: 'إلغاء', kind: 'ghost', onClick: () => res(null) }
    ], () => res(null));
    const inp = m.body.querySelector('#_dlgInp');
    const sh = m.body.querySelector('#_dlgShow');
    if (sh) sh.onchange = () => { inp.type = sh.checked ? 'text' : 'password'; inp.focus(); };
    inp.addEventListener('keydown', e => { if (e.key === 'Enter') { res(inp.value || ''); m.close(); } });
    setTimeout(() => inp.focus(), 50);
 });
}

async function ensureAdmin(){
  if (!adminHash) {
    const p1 = await inputDlg('إنشاء كلمة مرور admin', 'أول مرة — اختر كلمة مرور', true);
    if (p1 === null) return false;
    if (p1.length < 3) { toast('كلمة المرور قصيرة (3 أحرف على الأقل)', 'error'); return false; }
    const p2 = await inputDlg('تأكيد كلمة المرور', 'أعد كتابة كلمة المرور', true);
    if (p1 !== p2) { toast('كلمتا المرور غير متطابقتين', 'error'); return false; }
    adminHash = await hashPass(p1);
    store.setItem('adminHash', adminHash);

    localAdminVerified = true;
    pushMeta(false);
    addLog('تم إنشاء كلمة مرور admin');
    toast('تم إنشاء كلمة المرور بنجاح', 'success');
    return true;
 }
  if (Date.now() < lockUntil) {
    const secs = Math.ceil((lockUntil - Date.now()) / 1000);
    toast('محاولات كثيرة — انتظر ' + secs + ' ثانية', 'error');
    return false;
 }
  const p = await inputDlg('كلمة المرور', 'أدخل كلمة المرور', true);
  if (p === null) return false;
  const upg = await verifyPass(p, adminHash);
  if (upg) {
    failCount = 0; localAdminVerified = true;

    if (upg !== adminHash) { adminHash = upg; store.setItem('adminHash', adminHash); scheduleMetaPush(); }
    return true;
 }
  failCount++;
  if (failCount >= 5) {

    const level = Math.floor(failCount / 5) - 1;
    lockUntil = Date.now() + Math.min(300000, 30000 * Math.pow(2, level));
 }
  toast('كلمة مرور غير صحيحة', 'error');
  return false;
}

const DEFAULT_ADMIN = { user: 'admin', pass: '123456' };

async function seedDefaultAdmin(){
  if (usersList.length) return;

  try {
    if (syncOn && db) {
      const snap = await db.ref(fbPath() + '/meta/users').get();
      const rv = snap.val();
      const arr = rv ? (Array.isArray(rv) ? rv : Object.values(rv)).filter(u => u && u.name) : [];
      if (arr.length) {
        usersList = arr;
        store.setItem('usersList', JSON.stringify(usersList));
        addLog('استرجاع المستخدمين من السيرفر بدل الزرع: ' + arr.length + ' مستخدم');
        return;
 }
 }
 } catch (e) {}
  usersList = [{ name: DEFAULT_ADMIN.user, hash: await hashPass(DEFAULT_ADMIN.pass), role: 'admin', active: true }];
  store.setItem('usersList', JSON.stringify(usersList));
  pushMeta(true);
  addLog('تم إنشاء المستخدم الافتراضي: admin');
}

function loginRequired(){

  return true;
}
function isAdmin(){

  if (!loginRequired()) return true;
  return sessionUser && sessionUser.role === 'admin';
}

function isElevated(){
  if (!loginRequired()) return true;
  return sessionUser && (sessionUser.role === 'admin' || sessionUser.role === 'supervisor');
}
function getUserRole(name){
  if (!name || name === 'بدون مستخدم') return '';
  if (name === 'admin') return 'admin';
  const u = usersList.find(x=> x.name === name);
  return u ? (u.role||'user') : 'user';
}

function needAdmin(){
  if (loginRequired() && !isElevated()) { toast('⛔ الصلاحية دي للمسؤول أو المشرف فقط', 'error'); return true; }
  return false;
}
function applyUserUI(){

  document.getElementById('initialLock')?.remove();
  document.querySelectorAll('.lock-overlay').forEach(o => o.remove());
  const line = $('userLine');
  const sb = $('settingsBtn');
  const lbl = $('currentUserLabel');
  if (sessionUser && loginRequired()) {
    if (line) line.style.display = 'flex';
    if (lbl) {
      const roleTxt = sessionUser.role === 'admin' ? ' (admin)' : (sessionUser.role === 'supervisor' ? ' (مشرف)' : '');
      lbl.textContent = '👤 ' + sessionUser.name + roleTxt;
 }
 } else if (line) line.style.display = 'none';
  const adm = isAdmin();
  const elev = isElevated();
  if (sb) sb.style.display = adm ? '' : 'none';
  ['btnExport', 'btnExportCsv', 'btnPrint', 'btnUpload', 'btnImport', 'btnClearAll', 'btnClearSel', 'btnReports'].forEach(id => {
    const b = $(id); if (b) b.style.display = elev ? '' : 'none';
 });

  /* رأس عمود «الفعلي»: يقفل بصريًا لغير المسؤول/المشرف */
  const thAct = $('thActual');
  if (thAct) {
    const canAct = canEditActual();
    thAct.textContent = 'الفعلي' + (canAct ? '' : ' 🔒');
    thAct.title = canAct
      ? 'تعديل يدوي من المسؤول/المشرف: يمسح العدّات السابقة من أي حد ويخلي الإجمالي هو الرقم ده'
      : 'الرصيد الفعلى يعدّله المسؤول أو المشرف فقط — انت تعدّ بالباركود/الكاميرا بس';
 }

  try { updateTable(); } catch (e) {}
  try {
    if (adm && sessionUser && syncOn) {
      if (store.getItem('notifEnabled') === '1' && window.Notification && Notification.permission === 'granted') {
        attachNotifListener();
 }
 } else {
      detachNotifListener();
 }
 } catch(e){}
}

function saveAuth(name){
  try { if (name) localStorage.setItem('jardAuthUser', name); } catch (e) {}
}
function clearAuth(){
  try { localStorage.removeItem('jardAuthUser'); } catch (e) {}
}
function restoreSession(){
  return (async () => {
    let name = '';
    try { name = localStorage.getItem('jardAuthUser') || ''; } catch (e) { return false; }
    if (!name) return false;
    const user = usersList.find(u => u && u.name === name);
    if (!user || user.active === false) { clearAuth(); return false; }
    const restoredUser = { name: user.name, role: user.role || 'user' };
    let claim;
    try { claim = await claimSession(restoredUser); }
    catch (e) { return false; }
    if (claim && claim.offline) return false;
    if (!claim || !claim.ok) { clearAuth(); return false; }
    sessionUser = restoredUser;
    return true;
  })();
}
function logoutUser(){
  clearAuth();
  if (sessionUser) addLog('خروج المستخدم: ' + sessionUser.name);
  releaseSession();
  sessionUser = null;
  localAdminVerified = false;
  userFilter = '';

  try { stopCameraScanner(); } catch (e) {}
  document.querySelectorAll('.modal-overlay, .big-block-ov, .lock-overlay').forEach(x => x.remove());
  applyUserUI();
  showLock();
}

let idleTimer = null;
const IDLE_LIMIT = 30 * 60 * 1000;
function resetIdleTimer(){
  if (idleTimer) clearTimeout(idleTimer);
  if (!sessionUser) return;
  idleTimer = setTimeout(autoLogout, IDLE_LIMIT);
}
function autoLogout(){
  if (!sessionUser) return;
  clearAuth();
  addLog('خروج تلقائي للخمول: ' + sessionUser.name);
  releaseSession();
  sessionUser = null;
  localAdminVerified = false;
  userFilter = '';
  try { stopCameraScanner(); } catch (e) {}
  document.querySelectorAll('.modal-overlay, .big-block-ov, .lock-overlay').forEach(x => x.remove());
  applyUserUI();
  toast('⏱️ تم تسجيل الخروج تلقائيًا بعد 30 دقيقة خمول', 'warning');
  showLock();
}
function setupIdleWatch(){

  ['pointerdown', 'keydown', 'touchstart', 'mousemove', 'scroll', 'input', 'wheel'].forEach(ev =>
    document.addEventListener(ev, resetIdleTimer, { passive: true })
  );
  resetIdleTimer();
}
let mySessionRef = null;
function sessionKey(u){ return u.replace(/[.#$\[\]\/]/g, '_'); }

async function claimSession(u){

  if (navigator && navigator.onLine === false) return { ok: false, offline: true };

  if ((!syncOn || !db) && effectiveCfg() && effectiveCfg().apiKey) {
    await Promise.race([
      connectFirebase(true).catch(() => {}),
      new Promise(r => setTimeout(r, 2500))
    ]);
 }
  if (!syncOn || !db) return { ok: false, offline: true };

  const ref = db.ref(fbRoot() + '/sessions/' + sessionKey(u.name));
  try {
    const snap = await ref.get();
    const v = snap.val();
    const now = Date.now();

    if (v && v.deviceId !== deviceId && v.ts && (now - v.ts) < 80000) {
      return { ok: false, since: v.ts, name: u.name };
 }
    await ref.set({ deviceId: deviceId, ts: firebase.database.ServerValue.TIMESTAMP, name: u.name });

    try { ref.onDisconnect().remove(); } catch (e) {}

    const kickRef = db.ref(fbRoot() + '/kicks/' + sessionKey(u.name));
    try { await kickRef.remove(); } catch (e) {}

    if (window.__sessBeat) clearInterval(window.__sessBeat);
    const forceOut = () => {
      if (!sessionUser || !loginRequired()) return;
      clearAuth();
      addLog('تم طرد الجلسة بواسطة admin: ' + sessionUser.name);
      sessionUser = null;
      bigBlock('⛔', 'تم إنهاء جلستك',
        'الأدمن سجّل خروجك من الجهاز ده.<br>لو ده حصل بالخطأ، كلم المسؤول وادخل من جديد.',
        'حسنًا — دخول من جديد', () => logoutUser());
 };
    const onMissing = async () => {
      if (!sessionUser || !loginRequired()) return;
      try {
        const k = await kickRef.get();
        if (k.val() !== null) {
          try { await kickRef.remove(); } catch (e) {}
          forceOut();
          return;
        }
        const again = await claimSession(sessionUser);
        if (!again.ok) forceOut();
      } catch (e) {}
 };
    window.__sessBeat = setInterval(async () => {
      try {
        if (!sessionUser || !loginRequired()) { clearInterval(window.__sessBeat); window.__sessBeat = null; return; }
        const kv = (await kickRef.get()).val();
        if (kv !== null) {
          try { await kickRef.remove(); } catch (e) {}
          clearInterval(window.__sessBeat); window.__sessBeat = null;
          forceOut();
          return;
        }
        const s = await ref.get();
        if (s.val() === null) {
          clearInterval(window.__sessBeat); window.__sessBeat = null;
          onMissing();
          return;
        }
        await ref.update({ ts: firebase.database.ServerValue.TIMESTAMP });
      } catch (e) {}
    }, 20000);

    try { if (window.__sessWatch) window.__sessWatch(); } catch (e) {}
    window.__sessWatch = ref.on('value', snap => {
      if (snap.val() !== null) return;
      if (!sessionUser || !loginRequired()) return;
      setTimeout(() => { ref.get().then(c => { if (c.val() === null) onMissing(); }).catch(() => {}); }, 1200);
    });
    mySessionRef = ref;
    return { ok: true };
 } catch (e) { return { ok: false, offline: true }; }
}
function releaseSession(){
  if (window.__sessBeat) { clearInterval(window.__sessBeat); window.__sessBeat = null; }
  if (window.__sessWatch) { try { window.__sessWatch(); } catch (e) {} window.__sessWatch = null; }
  if (mySessionRef) {
    try { mySessionRef.onDisconnect().cancel(); } catch (e) {}
    mySessionRef.remove().catch(() => {});
    mySessionRef = null;
 }
}

async function kickUserOut(userName){
  if (!syncOn || !db) { toast('لازم تكون متصل بالإنترنت عشان تطرد مستخدم', 'error'); return false; }
  try {
    await db.ref(fbRoot() + '/kicks/' + sessionKey(userName)).set(firebase.database.ServerValue.TIMESTAMP);
    await db.ref(fbRoot() + '/sessions/' + sessionKey(userName)).remove();
    toast('✅ اتطرد ' + userName + ' — جهازه هيسجل خروج خلال ثواني', 'success');
    addLog('طرد يدوي: ' + userName);
    return true;
 } catch (e) {
    toast('فشل الطرد: ' + (e.message || 'خطأ'), 'error');
    return false;
 }
}
async function getOnlineSessions(){
  if (!syncOn || !db) return [];
  try {
    const snap = await db.ref(fbRoot() + '/sessions').get();
    const v = snap.val() || {};
    const now = Date.now();
    return Object.entries(v)
      .filter(([, s]) => s && s.ts && (now - s.ts) < 80000)
      .map(([k, s]) => ({ key: k, name: s.name || k, ts: s.ts, deviceId: s.deviceId }));
 } catch (e) { return []; }
}

function tellSW(msg){
  try {
    if (navigator.serviceWorker && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage(msg);
 }
    if (navigator.serviceWorker) {
      navigator.serviceWorker.ready.then(reg=>{
        if (reg.active) reg.active.postMessage(msg);
 }).catch(()=>{});
 }
 } catch(e){}
}
let swPingTimer = null;
function pushNotifConfigToSW(enabled){
  const cfg = effectiveCfg() || {};
  const payload = {
    type: 'JARD_NOTIF',
    enabled: !!enabled,
    lastTs: lastNotifTs || 0,
    dbUrl: (cfg && cfg.databaseURL) || '',
    path: fbRoot(),
    selfName: (sessionUser && sessionUser.name) || ''
  };
  tellSW(payload);
  if (!enabled) return;
  try {
    if (typeof firebase !== 'undefined' && firebase.auth) {
      const cu = firebase.auth().currentUser;
      if (cu && cu.getIdToken) {
        cu.getIdToken().then(tok => {
          payload.auth = tok || '';
          tellSW(payload);
        }).catch(() => {});
      }
    }
  } catch (e) {}
}
function startSwPing(){
  if (swPingTimer) clearInterval(swPingTimer);
  const beat = () => {
    try {
      if (typeof firebase !== 'undefined' && firebase.auth && firebase.auth().currentUser) {
        firebase.auth().currentUser.getIdToken().then(tok => {
          tellSW({ type: 'JARD_PING', auth: tok || '' });
        }).catch(() => { tellSW({ type: 'JARD_PING' }); });
      } else {
        tellSW({ type: 'JARD_PING' });
      }
    } catch (e) { tellSW({ type: 'JARD_PING' }); }
  };
  beat();
  swPingTimer = setInterval(beat, 15000);
}
function stopSwPing(){
  if (swPingTimer) { clearInterval(swPingTimer); swPingTimer=null; }
}
function canShowNotif(){ return ('Notification' in window); }
function updateNotifUI(){
  const buttons = [document.getElementById('notifBtn'), document.getElementById('notifBtnSettings')].filter(Boolean);
  const hints = [document.getElementById('notifHint'), document.getElementById('notifHintSettings')].filter(Boolean);
  if (!buttons.length && !hints.length) return;
  if (!canShowNotif()) {
    buttons.forEach(b=>{ if(b){ b.textContent='🚫 المتصفح لا يدعم الإشعارات'; b.disabled=true; }});
    hints.forEach(h=>{ if(h) h.textContent='جرب Chrome أو Edge'; });
    return;
 }
  const perm = Notification.permission;
  const enabled = store.getItem('notifEnabled') === '1';
  buttons.forEach(btn=>{
    if(!btn) return;
    if (perm === 'granted' && enabled) {
      btn.textContent='🔔 الإشعارات مفعّلة ✅';
      btn.style.background='#16a34a';
 } else if (perm === 'denied') {
      btn.textContent='🚫 الإشعارات محظورة';
      btn.style.background='#ef4444';
 } else {
      btn.textContent='🔔 فعّل إشعارات الجرد على سطح المكتب';
      btn.style.background='#2563eb';
 }
 });
  hints.forEach(hint=>{
    if (!hint) return;
    if (perm === 'granted' && enabled) {
      hint.textContent='شغال ✅ - إشعار زي الواتساب حتى لو الصفحة متصغرة';
 } else if (perm === 'denied') {
      hint.textContent='مقفولة - افتح القفل 🔒 فوق واسمح بالإشعارات';
 } else {
      hint.textContent='اضغط الزر واسمح - هتظهر على الديسكتوب';
 }
 });
}
async function toggleNotif(){
  if (!canShowNotif()) { toast('المتصفح لا يدعم الإشعارات', 'error'); return; }
  if (Notification.permission === 'granted' && store.getItem('notifEnabled') === '1') {
    toast('✅ الإشعارات مفعّلة - سيب الصفحة مفتوحة', 'success');
    attachNotifListener();
    updateNotifUI();
    showJardNotification({by:'اختبار', role:'user', code:'TEST', name:'إشعار تجريبي - لو شفته على الديسكتوب يبقى تمام ✅', qty:1, ts:Date.now()}, true);
    return;
 }
  if (Notification.permission === 'denied') {
    toast('🚫 مانع الإشعارات من المتصفح - افتح القفل 🔒 فوق', 'error');
    updateNotifUI();
    return;
 }
  try {
    const p = await Notification.requestPermission();
    updateNotifUI();
    if (p === 'granted') {
      store.setItem('notifEnabled','1');
      toast('✅ تم تفعيل الإشعارات - هتوصلك حتى لو minimize', 'success');
      attachNotifListener();
      showJardNotification({by:'النظام', role:'user', code:'TEST', name:'الإشعارات شغالة ✅', qty:1, ts:Date.now()}, true);
 } else {
      store.setItem('notifEnabled','0');
 }
 } catch(e){ toast('تعذر طلب الإشعارات', 'error'); }
}
function showJardNotification(ev, isTest){
  if (!isTest && !isAdmin()) return;
  if (!canShowNotif()) return;
  if (Notification.permission !== 'granted') return;
  if (!isTest) {
    if (ev.by === (sessionUser && sessionUser.name)) return;
    if (ev.role === 'admin') return;
 }
  const title = isTest ? '🔔 بيمبو ستور - الجرد' : ('📦 جرد جديد — ' + ev.by);
  const body = isTest ? ev.name : ((ev.name || 'صنف') + ' \nالكود: ' + (ev.code||'') + ' | القطعة: ' + (ev.qty||'') + '\nبواسطة: ' + ev.by);
  const opts = { body: body, tag: 'jard-'+(ev.ts||Date.now()), renotify: true, requireInteraction: false, vibrate: [200,100,200], data: {url:'./'} };
  try {
    if (navigator.serviceWorker && navigator.serviceWorker.ready) {
      navigator.serviceWorker.ready.then(reg=>{
        reg.showNotification(title, opts).catch(()=>{
          try { const n=new Notification(title, opts); n.onclick=()=>{window.focus(); n.close();}; setTimeout(()=>{try{n.close();}catch(e){}},20000);} catch(e){}
 });
 }).catch(()=>{
        try { const n=new Notification(title, opts); n.onclick=()=>{window.focus(); n.close();}; } catch(e){}
 });
 } else {
      const n=new Notification(title, opts);
      n.onclick=()=>{window.focus(); n.close();};
 }
 } catch(e){
    try { const n=new Notification(title, opts); n.onclick=()=>{window.focus(); n.close();}; } catch(e2){}
 }
  try { if (soundOn) beep('ok'); } catch(e){}
  if (!isTest) toast('🔔 ' + ev.by + ' جرد: ' + (ev.name||ev.code) + ' ×' + (ev.qty||1), 'info');
}
function pushCountNotif(item, delta, action){
  try {
    if (!syncOn || !db) return;
    if (!sessionUser) return;
    if (navigator && navigator.onLine === false) return;

    const scanDelta = (action === 'edit') ? (delta || 1) : 1;
    const ev = {
      by: sessionUser.name,
      role: sessionUser.role || 'user',
      code: item.code,
      name: item.name,
      qty: scanDelta,
      totalQty: item.actualQuantity,
      delta: scanDelta,
      action: action || 'count',
      ts: firebase.database.ServerValue.TIMESTAMP
 };
    db.ref(fbPath() + '/notifs').push(ev).catch(()=>{});

    if (isAdmin()) {
      try {
        db.ref(fbPath() + '/notifs').get().then(all=>{
          const v = all.val(); if (!v) return;
          const keys = Object.keys(v);
          if (keys.length > 200) {
            const sorted = Object.entries(v).sort((a,b)=> (a[1].ts||0)-(b[1].ts||0));
            const toDel = sorted.slice(0, keys.length - 150);
            toDel.forEach(([k])=>{ db.ref(fbPath() + '/notifs/' + k).remove().catch(()=>{}); });
 }
 });
 } catch(e){}
 }
 } catch(e){}
}
function attachNotifListener(){
  if (!isAdmin()) return;
  if (!syncOn || !db) return;
  if (store.getItem('notifEnabled') !== '1') return;
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
  if (notifOff) { try{ notifOff(); }catch(e){} notifOff=null; }
  if (!lastNotifTs) { lastNotifTs = Date.now(); store.setItem('lastNotifTs', String(lastNotifTs)); }
  const ref = db.ref(fbPath() + '/notifs').orderByKey().limitToLast(30);
  const cb = ref.on('child_added', snap=>{
    const ev = snap.val(); if (!ev) return;
    const ts = Number(ev.ts) || Date.now();
    if (ts <= lastNotifTs) return;
    lastNotifTs = Math.max(lastNotifTs, ts);
    store.setItem('lastNotifTs', String(lastNotifTs));
    showJardNotification(ev, false);
 });
  notifOff = ()=>{ try{ ref.off('child_added', cb); }catch(e){} };
  pushNotifConfigToSW(true);
  startSwPing();
}
function clearAllLocalCaches(){

  try {
    if ('caches' in window) {
      caches.keys().then(keys=>{ keys.forEach(k=>{ if(k.startsWith('jard-')) caches.delete(k); }); });
 }
 } catch(e){}
  try { tellSW({type:'JARD_WIPE_CACHE'}); } catch(e){}
}
function detachNotifListener(){
  if (notifOff) { try{ notifOff(); }catch(e){} notifOff=null; }
  pushNotifConfigToSW(false);
  stopSwPing();
}

async function verifyUserOnServer(name){
  if (!syncOn || !db) return false;
  try {
    const snap = await db.ref(fbPath() + '/meta/users').get();
    const rv = snap.val();
    if (!rv) return false;
    const arr = Array.isArray(rv) ? rv : Object.values(rv);
    return arr.some(u => u && u.name === name);
  } catch (e) { return false; }
}
async function editUser(i){
  const u = usersList[i];
  if (!u) return;
  const action = await new Promise(res => {
    showModal('تعديل "' + u.name + '"', '<div class="hint" style="font-size:.85rem">اختار اللي عايز تغيّره:</div>', [
      { label: '✏️ تغيير الاسم', kind: 'primary', onClick: () => res('name') },
      { label: '🔑 تغيير الباسورد', kind: 'primary', onClick: () => res('pass') },
      { label: '🏷️ تغيير الصلاحية', kind: 'primary', onClick: () => res('role') },
      { label: 'إلغاء', kind: 'ghost', onClick: () => res(null) }
    ], () => res(null));
 });
  if (!action) return;
  if (action === 'role') {
    if (u.name === DEFAULT_ADMIN.user) { toast('مايتغيرش صلاحية حساب admin الافتراضي', 'error'); return; }
    const roles = [
      { label: 'مستخدم (جرد فقط)', kind: 'ghost', onClick: () => res2('user') },
      { label: 'مشرف (جرد + استيراد + حذف + طباعة)', kind: 'primary', onClick: () => res2('supervisor') },
      { label: 'admin (كل الصلاحيات)', kind: 'primary', onClick: () => res2('admin') },
      { label: 'إلغاء', kind: 'ghost', onClick: () => res2(null) }
    ];
    let res2;
    const newRole = await new Promise(r => { res2 = r; showModal('صلاحية "' + u.name + '"', '<div class="hint" style="font-size:.85rem">الصلاحية الحالية: ' + (u.role || 'user') + '</div>', roles, () => r(null)); });
    if (!newRole) return;
    u.role = newRole;
    store.setItem('usersList', JSON.stringify(usersList));
    pushMeta(true);
    addLog('تعديل صلاحية مستخدم: ' + u.name + ' → ' + newRole);
    toast('تم تغيير صلاحية ' + u.name, 'success');
    return;
 }
  if (action === 'name') {
    const nn = await inputDlg('اسم جديد للمستخدم', 'الاسم الحالي: ' + u.name);
    if (nn === null) return;
    const v = nn.trim();
    if (!v || v.length < 2) { toast('الاسم قصير', 'error'); return; }
    if (usersList.find((x, ix) => ix !== i && x.name === v)) { toast('الاسم ده موجود ليوزر تاني', 'error'); return; }
    const old = u.name;
    u.name = v;
    store.setItem('usersList', JSON.stringify(usersList));
    pushMeta(true);
    addLog('تعديل اسم مستخدم: ' + old + ' → ' + v);
    toast('تم تغيير الاسم', 'success');
    return;
 }
  const np = await inputDlg('كلمة مرور جديدة لـ "' + u.name + '"', '3 أحرف على الأقل', true);
  if (np === null) return;
  if (np.length < 3) { toast('كلمة المرور قصيرة', 'error'); return; }
  u.hash = await hashPass(np);
  store.setItem('usersList', JSON.stringify(usersList));
  pushMeta(true);
  addLog('تعديل كلمة مرور مستخدم: ' + u.name);
  toast('تم تغيير كلمة المرور لـ ' + u.name, 'success');
}
/* اسم المستخدم: الأول بالتطابق الحرفي، ولو مالقاش بيقبله لو اتكتب بشكل عربي مختلف
   (أ/ا، ى/ي...) أو والكيبورد على اللغة التانية — بشرط يطلع يوزر واحد بس */
function findLoginUser(user){
  const exact = usersList.find(x => x.name === user);
  if (exact) return exact;
  const key = v => normPass(v).toLowerCase();
  const cands = passCandidates(user).map(key);
  const hits = usersList.filter(x => cands.indexOf(key(x.name)) !== -1);
  return hits.length === 1 ? hits[0] : undefined;
}
async function tryLogin(user, pass){
  if (user === '__admin__' || user === '') {
    const up = await verifyPass(pass, adminHash);
    if (up) {
      localAdminVerified = true;

      if (up !== adminHash) { adminHash = up; store.setItem('adminHash', adminHash); scheduleMetaPush(); }
      return { name: 'admin', role: 'admin' };
    }
    return null;
 }
  const u = findLoginUser(user);
  if (u && u.active === false) return { blocked: true, name: u.name };
  if (!u) return null;
  const okHash = await verifyPass(pass, u.hash);
  if (!okHash) return null;

  if (okHash !== u.hash) { u.hash = okHash; store.setItem('usersList', JSON.stringify(usersList)); scheduleMetaPush(); }
  return { name: u.name, role: u.role || 'user' };
}
function showLock(){

  document.getElementById('initialLock')?.remove();
  if (sessionUser) { applyUserUI(); return; }
  if (!loginRequired()) { applyUserUI(); return; }

  if (document.querySelector('.lock-overlay')) return;
  const hasUsers = usersList.length > 0;
  const ov = document.createElement('div');
  ov.className = 'lock-overlay';
  ov.innerHTML = '<div class="lock-card">' +
    '<img src="' + getLogo() + '" alt="">' +
    '<h2>تسجيل الدخول</h2>' +
    '<div class="lock-sub">أدخل اسم المستخدم وكلمة المرور</div>' +

    ((navigator && navigator.onLine === false)
      ? '<div style="background:#fef2f2;border:1px solid #fca5a5;color:#991b1b;border-radius:.6rem;padding:.55rem .7rem;font-size:.78rem;font-weight:800;margin-bottom:.8rem;line-height:1.9">📡 النت مقطوع دلوقتي — البرنامج أونلاين فقط، ومينفعش دخول من غير اتصال. وصّل النت وحاول تاني</div>'
      : '') +

    '<div id="lockMsg" style="display:none;background:#fef2f2;color:#b91c1c;border:1px solid #fca5a5;border-radius:.6rem;padding:.55rem .7rem;font-size:.9rem;font-weight:800;margin-bottom:.8rem;line-height:1.8"></div>' +
    (hasUsers ? '<div class="fld"><label>اسم المستخدم</label><input type="text" id="lockUser" placeholder="اكتب اسم المستخدم" autocomplete="username" dir="auto" autocapitalize="off" autocorrect="off" spellcheck="false"></div>' : '') +
    '<div class="fld"><label>كلمة المرور</label><input type="password" id="lockInp" placeholder="كلمة المرور" autocomplete="current-password" dir="auto" autocapitalize="off" autocorrect="off" spellcheck="false"></div>' +
    '<label class="show-pass"><input type="checkbox" id="lockShowPass"> إظهار كلمة المرور (عربي أو إنجليزي)</label>' +
    '<button class="mbtn primary" style="width:100%" id="lockBtn">🔑 دخول</button></div>';
  document.body.appendChild(ov);
  const inp = ov.querySelector('#lockInp');
  const uInp = ov.querySelector('#lockUser');
  const msg = ov.querySelector('#lockMsg');
  const showP = ov.querySelector('#lockShowPass');
  if (showP) showP.onchange = () => { inp.type = showP.checked ? 'text' : 'password'; inp.focus(); };
  const say = t => { if (msg) { msg.textContent = t; msg.style.display = t ? 'block' : 'none'; } };
  let lockTicker = null;
  const startLockCountdown = () => {
    if (lockTicker) clearInterval(lockTicker);
    lockTicker = setInterval(() => {
      const left = Math.ceil((loginLockUntil - Date.now()) / 1000);
      if (left <= 0) { clearInterval(lockTicker); lockTicker = null; say(''); const btn = ov.querySelector('#lockBtn'); if (btn) btn.disabled = false; return; }
      say('⛔ محاولات دخول كتير غلط — القفل مؤقت للحماية. حاول بعد ' + left + ' ثانية');
 }, 500);
 };
  const tryOpen = async () => {

    if (Date.now() < loginLockUntil) { startLockCountdown(); return; }
    const uname = uInp ? uInp.value.trim() : '__admin__';
    const u = await tryLogin(uname, inp.value);
    if (u && u.blocked) {
      say('⛔ المستخدم "' + u.name + '" موقوف — راجع الأدمن');
      const c = ov.querySelector('.lock-card');
      c.classList.remove('shake'); void c.offsetWidth; c.classList.add('shake');
      inp.value = ''; inp.focus();
      return;
 }
    if (u) {

      const btn = ov.querySelector('#lockBtn');
      btn.disabled = true; btn.textContent = '⏳ جاري التحقق...';
      const claim = await claimSession(u);
      btn.disabled = false; btn.textContent = 'دخول';
      if (claim && claim.offline) {
        say('📡 مفيش اتصال بالإنترنت — البرنامج أونلاين فقط. وصّل النت وحاول تاني');
        return;
      }
      if (!claim.ok) {

        bigBlock('🚫', 'الحساب ده مفتوح على جهاز تاني',
          'المستخدم "<b>' + esc(u.name) + '</b>" شغال دلوقتي على جهاز آخر.<br>سجّل خروجه من هناك الأول، أو استنى حوالي دقيقة ونص ويسيب الجلسة لوحده.',
          'حاول تاني', () => { document.querySelectorAll('.big-block-ov').forEach(x => x.remove()); inp.focus(); });
        inp.value = '';
        return;
 }
      loginFails = 0; say('');

      sessionUser = u;
      saveAuth(u.name);
      ov.remove();
      applyUserUI();
      resetIdleTimer();
      addLog('دخول المستخدم: ' + u.name);
      toast('أهلًا ' + u.name, 'success');

 } else {
      loginFails++;
      const c = ov.querySelector('.lock-card');
      c.classList.remove('shake'); void c.offsetWidth; c.classList.add('shake');
      if (loginFails >= 5) {
        loginFails = 0;
        loginLockUntil = Date.now() + 60000;
        const btn = ov.querySelector('#lockBtn'); if (btn) btn.disabled = true;
        addLog('⚠️ قفل مؤقت لشاشة الدخول: محاولات تخمين متكررة');
        startLockCountdown();
 } else {
        say('❌ اسم المستخدم أو كلمة المرور غلط — فاضل ' + (5 - loginFails) + ' محاولات قبل القفل المؤقت');
 }
      inp.value = ''; inp.focus();
 }
 };
  ov.querySelector('#lockBtn').onclick = tryOpen;
  [inp, uInp].forEach(el => el && el.addEventListener('keydown', e => { if (e.key === 'Enter') tryOpen(); }));
  setTimeout(() => (uInp || inp).focus(), 100);
}
function getLogo(){
  return store.getItem('customLogo') || LOGO_URI;
}

function resizeLogoFile(file, done, fail){
  const r = new FileReader();
  r.onload = e => {
    const img = new Image();
    img.onload = () => {
      const cv = document.createElement('canvas');
      const scale = Math.min(1, 220 / Math.max(img.width, img.height));
      cv.width = Math.round(img.width * scale); cv.height = Math.round(img.height * scale);
      cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
      const dataUrl = cv.toDataURL('image/png');
      if (dataUrl.length > 250000) { fail && fail(); return; }
      done(dataUrl);
 };
    img.src = e.target.result;
 };
  r.readAsDataURL(file);
}
function applyLogo(src){
  const s = src || getLogo();
  document.querySelectorAll('.logo-wrap img, .lock-card img').forEach(im => { im.src = s; });
}
function pickNewLogo(){
  const inp = document.createElement('input');
  inp.type = 'file'; inp.accept = 'image/*';
  inp.onchange = () => {
    const f = inp.files[0]; if (!f) return;
    resizeLogoFile(f, dataUrl => {
      store.setItem('customLogo', dataUrl);
      applyLogo(dataUrl);
      pushMeta(false);
      addLog('تم تغيير اللوجو');
      toast('تم تغيير اللوجو — بيتزامن على كل الأجهزة', 'success');
      const lp = document.querySelector('#logoPrev'); if (lp) lp.src = dataUrl;
 }, () => toast('الصورة كبيرة — جرب صورة أصغر', 'error'));
 };
  inp.click();
}
function resetLogo(){
  store.removeItem('customLogo');
  applyLogo(LOGO_URI);
  pushMeta(false);
  toast('تمت استعادة اللوجو الأصلي', 'success');
}

function groupsList(){
  return [...new Set(inventoryData.map(i => i.group))].filter(g => g && g !== 'غير مصنف' && g !== 'غير معروف');
}
function getFiltered(){
  const search = $('smartSearch').value.toLowerCase();
  return inventoryData.filter(i => {
    const ms = i.code.toLowerCase().includes(search) || i.name.toLowerCase().includes(search);
    const mc = currentCategory === 'all' || i.group === currentCategory;

    if (userFilter) {
      const hasCounts = i.counts && Object.keys(i.counts).length > 0;
      const hasUser = hasCounts ? (i.counts[userFilter] !== undefined && Number(i.counts[userFilter]) > 0) : (i.countedBy === userFilter);
      if (!hasUser) return false;
 }
    let st = true;
    if (currentStatus === 'زيادة') st = i.status === 'زيادة';
    else if (currentStatus === 'عجز') st = i.status === 'عجز';
    else if (currentStatus === 'hide_equal') st = i.status !== 'متساوي';
    else if (currentStatus === 'equal') st = i.status === 'متساوي';
    else if (currentStatus === 'not_jarded') st = !(Number(i.actualQuantity) > 0);
    return ms && mc && st;
 });
}

let currentPage = 0;
let pageSize = 100;
let printAllRows = false;

function updatePager(total, pages){
  const box = $('pager');
  if (!box) return;
  if (total === 0 || printAllRows) { box.style.display = 'none'; return; }
  box.style.display = '';
  const perPage = pageSize > 0 ? pageSize : total;
  const from = pages > 1 ? currentPage * perPage + 1 : 1;
  const to = Math.min(total, (currentPage + 1) * perPage);
  const info = $('pagerInfo');
  if (info) info.textContent = 'بنعرض ' + from + '–' + to + ' من ' + total + ' صنف';
  const pos = $('pagerPos');
  if (pos) pos.textContent = pages > 1 ? (currentPage + 1) + ' / ' + pages : '1 / 1';
}
function gotoPage(where){
  const total = getFiltered().length;
  const perPage = pageSize > 0 ? pageSize : total;
  const pages = perPage > 0 ? Math.max(1, Math.ceil(total / perPage)) : 1;
  if (where === 'first') currentPage = 0;
  else if (where === 'last') currentPage = pages - 1;
  else if (where === 'prev') currentPage = Math.max(0, currentPage - 1);
  else if (where === 'next') currentPage = Math.min(pages - 1, currentPage + 1);
  else currentPage = Math.max(0, Math.min(pages - 1, Number(where) || 0));
  updateTable();
  const tc = document.querySelector('.table-container');
  if (tc && tc.scrollIntoView) tc.scrollIntoView({ block:'start', behavior:'smooth' });
}
function setPageSize(v){
  pageSize = Math.max(0, parseInt(v, 10) || 0);
  currentPage = 0;
  updateTable();
}

function resetPage(){ currentPage = 0; }

/* حالة خانة «الفعلي» في الجدول: مين يقدر يعدّلها وإيه اللي حصل فيها */
function actCellAttrs(item){
  const editable = canEditActual() && !userFilter;
  const cls = 'tc fwb tblue' + (editable ? '' : ' qty-locked');
  let title;
  if (!editable) title = '🔒 الرصيد الفعلى يعدّله المسؤول أو المشرف فقط — انت تعدّ بالباركود/الكاميرا بس';
  else {
    title = '✍️ تعديل يدوي (للمسؤول/المشرف): يمسح العدّات السابقة من أي حد ويخلي الإجمالي هو الرقم ده';
    if (item && item.manualQty) {
      title += '\n— محدد يدويًا بواسطة ' + (item.manualBy || 'المسؤول') + (item.manualAt ? ' في ' + fmtTs(item.manualAt) : '');
      if (item.manualPrev) title += '\n— كان قبلها: ' + item.manualPrev;
 }
 }
  return { cls: cls, title: title, editable: editable };
}

function updateTable(){
  const filtered = getFiltered();

  const canEdit = isElevated();

  const totalAll = filtered.length;
  const perPage = (printAllRows || pageSize <= 0) ? totalAll : pageSize;
  const pages = perPage > 0 ? Math.max(1, Math.ceil(totalAll / perPage)) : 1;
  if (currentPage > pages - 1) currentPage = pages - 1;
  if (currentPage < 0) currentPage = 0;
  const startIdx = perPage > 0 ? currentPage * perPage : 0;
  const view = perPage > 0 ? filtered.slice(startIdx, startIdx + perPage) : filtered;

  const rows = new Array(view.length);
  const ceName = canEdit ? 'true' : 'false';
  const ceSys = (userFilter || !canEdit) ? 'false' : 'true';
  for (let i = 0; i < view.length; i++) {
    const item = view[i];
    const d = displayQty(item);
    const sel = selectedSerials.has(item.serial);
    const act = actCellAttrs(item);
    const actCe = act.editable ? 'true' : 'false';

    const groupCell = canEdit
      ? '<td class="p3 txs"><select data-gsel class="rowselect"><option value="' + esc(item.group) + '" selected>' + esc(item.group) + '</option></select></td>'
      : '<td class="p3 txs">' + esc(item.group) + '</td>';
    rows[i] = '<tr class="' + rowClass(d.status, item.serial) + '" data-serial="' + item.serial + '">' +
      '<td class="tc no-print"><input type="checkbox" class="item-checkbox"' + (sel ? ' checked' : '') + '></td>' +
      '<td class="p3 txs fwb tc">' + item.serial + '</td>' +
      '<td class="p3 fw6">' + esc(item.code) + '</td>' +
      '<td class="p3 tsm" contenteditable="' + ceName + '" data-edit="name">' + esc(item.name) + '</td>' +
      groupCell +
      '<td class="tc fwb" contenteditable="' + ceSys + '" data-qty="systemQuantity" data-cell="sys">' + fmtQ(item.systemQuantity) + '</td>' +
      '<td class="' + act.cls + '" contenteditable="' + actCe + '" title="' + esc(act.title) + '" data-qty="actualQuantity" data-cell="act">' + fmtQ(d.act) + '</td>' +
      '<td class="tc fwb" data-cell="diff">' + fmtQ(d.diff) + '</td>' +
      '<td class="tc txs fwb" data-cell="status">' + esc(d.status) + '</td>' +
      '<td class="p3 txs" contenteditable="' + ceName + '" data-edit="note">' + esc(item.note) + '</td>' +
    '</tr>';
  }
  const tb = $('tableBody');
  if (tb) tb.innerHTML = rows.join('');
  const selAll = $('selectAll'); if (selAll) selAll.checked = view.length > 0 && view.every(i => selectedSerials.has(i.serial));
  updatePager(totalAll, pages);
}

function ensureItemVisible(code){
  if (printAllRows || pageSize <= 0) return;
  const filtered = getFiltered();
  const idx = filtered.findIndex(i => i.code === code);
  if (idx < 0) return;
  const pg = Math.floor(idx / pageSize);
  if (pg === currentPage) return;
  currentPage = pg;
  updateTable();
}
function refreshRow(tr, item){
  tr.className = (item.status === 'زيادة' ? 'row-surplus' : item.status === 'عجز' ? 'row-deficit' : '') + (selectedSerials.has(item.serial) ? ' selected-for-print' : '');
  const d = tr.querySelector('[data-cell="diff"]'); if (d) d.textContent = fmtQ(item.difference);
  const s = tr.querySelector('[data-cell="status"]'); if (s) s.textContent = item.status;
}

function displayQty(item){
  /* فلتر المستخدم يختار الأصناف التي شارك فيها، لكن الجرد يعرض الإجمالي
     المشترك للصنف ولا يستبدله بحصة مستخدم واحد. */
  return { act: item.actualQuantity, diff: item.difference, status: item.status };
}
function rowClass(status, serial){
  return (status === 'زيادة' ? 'row-surplus' : status === 'عجز' ? 'row-deficit' : '') +
    (selectedSerials.has(serial) ? ' selected-for-print' : '');
}

function expandGroupSelect(gsel){
  if (!gsel || gsel.options.length > 1) return;
  const cur = gsel.value;
  const groups = groupsList();
  const mk = (v, sel) => { const o = document.createElement('option'); o.value = v; o.textContent = v; if (sel) o.selected = true; return o; };
  const frag = document.createDocumentFragment();
  frag.appendChild(mk('غير مصنف', cur === 'غير مصنف'));
  if (cur === 'غير معروف') frag.appendChild(mk('غير معروف', true));
  for (let i = 0; i < groups.length; i++) frag.appendChild(mk(groups[i], cur === groups[i]));
  gsel.textContent = '';
  gsel.appendChild(frag);
  gsel.value = cur;
}

function setGroupSelect(gsel, group){
  if (!gsel) return;
  if (gsel.options.length > 1) { gsel.value = group; return; }
  if (gsel.options.length === 1) { gsel.options[0].value = group; gsel.options[0].textContent = group; gsel.options[0].selected = true; }
  else { const o = document.createElement('option'); o.value = group; o.textContent = group; o.selected = true; gsel.appendChild(o); }
}
function patchSingleRow(item){
  const tr = document.querySelector('#tableBody tr[data-serial="' + item.serial + '"]');
  if (!tr) return;
  const nameEl = tr.querySelector('[data-edit="name"]'); if (nameEl && document.activeElement !== nameEl) nameEl.textContent = item.name;
  const gsel = tr.querySelector('select[data-gsel]'); if (gsel && document.activeElement !== gsel) setGroupSelect(gsel, item.group);
  const sysEl = tr.querySelector('[data-cell="sys"]'); if (sysEl && document.activeElement !== sysEl) sysEl.textContent = fmtQ(item.systemQuantity);
  const d = displayQty(item);
  const actEl = tr.querySelector('[data-cell="act"]');
  if (actEl) {
    const act = actCellAttrs(item);
    actEl.className = act.cls;
    actEl.setAttribute('title', act.title);
    actEl.setAttribute('contenteditable', act.editable ? 'true' : 'false');
    if (document.activeElement !== actEl) actEl.textContent = fmtQ(d.act);
 }
  const diffEl = tr.querySelector('[data-cell="diff"]'); if (diffEl) diffEl.textContent = fmtQ(d.diff);
  const stEl = tr.querySelector('[data-cell="status"]'); if (stEl) stEl.textContent = d.status;
  const noteEl = tr.querySelector('[data-edit="note"]'); if (noteEl && document.activeElement !== noteEl) noteEl.textContent = item.note;
  tr.className = rowClass(d.status, item.serial);
}

function updateStats(){
  const total = inventoryData.length;

  let jarded = 0, deficit = 0, surplus = 0, sumSys = 0, sumAct = 0, sumDiff = 0;
  const gs = {};
  for (let i = 0; i < total; i++){
    const it = inventoryData[i];
    if (Number(it.actualQuantity) > 0) jarded++;
    if (it.status === 'عجز') deficit++;
    else if (it.status === 'زيادة') surplus++;
    sumSys += Number(it.systemQuantity) || 0;
    sumAct += Number(it.actualQuantity) || 0;
    sumDiff += Number(it.difference) || 0;
    let g = gs[it.group];
    if (!g) { g = gs[it.group] = { d: 0, s: 0 }; }
    if (it.status === 'عجز') g.d++;
    else if (it.status === 'زيادة') g.s++;
  }
  $('completionPercent').textContent = (total ? ((jarded / total) * 100).toFixed(1) : 0) + '%';
  $('cardJarded').textContent = jarded;
  $('cardNotJarded').textContent = total - jarded;
  $('cardDeficit').textContent = deficit;
  $('cardSurplus').textContent = surplus;

  const dParts = [], sParts = [];
  Object.keys(gs).forEach(g => {
    if (gs[g].d > 0) dParts.push('<div class="analysis-row"><span>' + esc(g) + '</span><span class="fwb">' + gs[g].d + ' صنف</span></div>');
    if (gs[g].s > 0) sParts.push('<div class="analysis-row"><span>' + esc(g) + '</span><span class="fwb">' + gs[g].s + ' صنف</span></div>');
  });
  const dg = $('deficitGroups'); if (dg) dg.innerHTML = dParts.join('') || '<div style="font-size:9px;color:#9ca3af">لا يوجد عجز</div>';
  const sg = $('surplusGroups'); if (sg) sg.innerHTML = sParts.join('') || '<div style="font-size:9px;color:#9ca3af">لا يوجد زيادة</div>';

  $('summarySystemQuantity').textContent = fmtQ(sumSys);
  $('summaryActualQuantity').textContent = fmtQ(sumAct);
  $('summaryDifference').textContent = fmtQ(sumDiff);
}

function setUserFilter(name){
  userFilter = name || '';
  resetPage();
  const chip = $('userChip');
  if (userFilter) { chip.classList.add('show'); $('userChipText').textContent = 'جرد: ' + userFilter; }
  else chip.classList.remove('show');
  updateTable();
}
function setStatusFilter(s){
  currentStatus = s;
  resetPage();
  document.querySelectorAll('.filter-toolbar .filter-btn').forEach(b => b.classList.remove('active'));
  const map = { 'all': 'status-all', 'زيادة': 'status-plus', 'عجز': 'status-minus', 'equal': 'status-eq', 'not_jarded': 'status-nj' };
  const el = $(map[s]); if (el) el.classList.add('active');
  document.querySelectorAll('#categoryButtonsContainer .filter-btn').forEach(b => { if (b.dataset.cat === currentCategory) b.classList.add('active'); });
  updateTable();
}
function setCategoryFilter(c){ currentCategory = c; resetPage(); renderCategoryButtons(); updateTable(); }
function renderCategoryButtons(){
  const box = $('categoryButtonsContainer');
  if (!box) return;
  const groups = [...new Set(inventoryData.map(i => i.group))].filter(Boolean);
  let html = '<button class="filter-btn' + (currentCategory === 'all' ? ' active' : '') + '" data-cat="all">الكل</button>';
  groups.forEach(g => { html += '<button class="filter-btn' + (currentCategory === g ? ' active' : '') + '" data-cat="' + esc(g) + '">' + esc(g) + '</button>'; });
  box.innerHTML = html;
}

function calculateRow(item){
  item.difference = Math.round((item.actualQuantity - item.systemQuantity) * 100) / 100;
  item.status = item.difference > 0 ? 'زيادة' : item.difference < 0 ? 'عجز' : 'متساوي';
}
function updateField(serial, field, value){
  const item = inventoryData.find(x => x.serial === serial);
  if (!item) return;

  if (needAdmin()) return;
  if (onlineGuard('التعديل ده')) return;
  const v = String(value).trim();
  if (item[field] === v) return;
  item[field] = v;
  item.editedAt = Date.now();
  saveAndRefresh(false, item);
  markAdminEdit();
  if (field === 'group') { renderCategoryButtons(); updateStats(); }
}
function restoreQtyCell(tr, field, item){
  if (!item) return;
  const cell = field === 'actualQuantity' ? 'act' : 'sys';
  const td = (tr && tr.querySelector) ? tr.querySelector('[data-cell="' + cell + '"]') : null;
  if (td) td.textContent = fmtQ(item[field]);
  else if (field === 'actualQuantity') { try { patchSingleRow(item); } catch(e){} }
}

async function updateQty(serial, field, value, tr){
  const item = inventoryData.find(x => x.serial === serial);
  if (!item) return;
  const v = parseQty(value);
  const who = sessionUser ? sessionUser.name : '';
  const whoRole = sessionUser ? (sessionUser.role||'user') : 'user';
  const bag = who || 'بدون مستخدم';

  /* الرصيد الفعلى وكمية السيستم: تعديل يدوي للمسؤول أو المشرف فقط */
  if (needAdmin()) {
    restoreQtyCell(tr, field, item);
    return;
 }

  /* لو الرقم المكتوب = الرصيد الحالي (حتى لو بصيغة تانية زي "8.00"، أو دخول
     الخانة والخروج منها من غير تغيير) → مفيش أي حاجة: مفيش رسالة ولا سجل
     ولا رفع للسيرفر */
  if (item[field] === v) return;

  if (field === 'actualQuantity' && onlineGuard('التعديل ده')) return;
  const prevQty = item.actualQuantity;
  let viaOps = false;
  if (field === 'systemQuantity') {
    item[field] = v;
 } else if (field === 'actualQuantity') {

    const nowTs = Date.now();
    const prevBreakdown = countsSummary(item.counts) ||
      (Number(item.actualQuantity) > 0
        ? (item.countedBy ? item.countedBy + ': ' + fmtQ(item.actualQuantity) : fmtQ(item.actualQuantity))
        : '');

    /* يتنفذ على طول من غير أي شاشة تأكيد — العدّات القديمة بتتسجل في prev والسجل */
    const op = { t: 'manual', who: bag, v: v, ts: nowTs, prev: prevBreakdown };

    const opt = applyCountOps(item, [op], who, item.code, item);
    opt.serial = item.serial;
    Object.assign(item, opt);
    enqueueCountOp(item.code, op);
    viaOps = true;

    addLog('تحديد يدوي للرصيد الفعلى: ' + item.code + ' «' + item.name + '» → ' + fmtQ(v) +
      ' بواسطة ' + bag + (prevBreakdown ? ' (اتمسح: ' + prevBreakdown + ')' : ''));
    toast('✍️ الرصيد الفعلى بقى ' + fmtQ(v) +
      (prevBreakdown ? ' — العدّات السابقة (' + prevBreakdown + ') اتحذفت' : ''), 'success');
 } else {
    item[field] = v;
 }
  item.editedAt = Date.now();
  calculateRow(item);
  if (tr) refreshRow(tr, item);
  if (field === 'actualQuantity') patchSingleRow(item);
  updateStats();
  markAdminEdit();
  if (viaOps) scheduleCountPush(item.code); else schedulePushItem(item);

  try {
    if (field === 'actualQuantity' && who && v !== prevQty && whoRole !== 'admin') {
      pushCountNotif(item, (v - prevQty), 'edit');
 }
 } catch(e){}
}

function eanOk(code){
  if (!/^\d+$/.test(code) || code.length < 8) return true;
  const d = code.split('').map(Number);
  const chk = d.pop();
  let s = 0;
  for (let i = d.length - 1, w = 3; i >= 0; i--, w = (w === 3 ? 1 : 3)) s += d[i] * w;
  return (10 - (s % 10)) % 10 === chk;
}

function fmtCountsBreakdown(counts){
  return countsSummary(counts);
}
function processCode(code){
  code = sanitizeCode(code);
  if (!code) return;

  if (onlineGuard('العدّة دي')) return;
  const nowTs = Date.now();
  const who = sessionUser ? sessionUser.name : '';
  const bag = who || 'بدون مستخدم';
  const item = inventoryData.find(i => i.code === code);
  let done = null, qty = 0, isNewItem = false;
  const ops = [];
  if (item) {
    const prevBy = item.countedBy;
    if (item.isJarded && who && prevBy && prevBy !== who) {
      toast('ℹ️ "' + item.name + '" اتجرد قبل كده بواسطة ' + prevBy + ' — العدّة الجديدة هتتضاف للإجمالي المشترك.', 'info');
      addLog('إضافة جرد مشترك: ' + item.code + ' بواسطة ' + prevBy + ' ثم ' + who);
 }

    const seed = legacySeedOp(item, bag, nowTs);
    if (seed) ops.push(seed);

    ops.push({ t: 'delta', who: bag, d: 1, ts: nowTs });
    const opt = applyCountOps(item, ops, who, item.code, item);
    opt.serial = item.serial;
    Object.assign(item, opt);
    beep('ok');
    done = item; qty = item.actualQuantity;

    try { if (sessionUser && (!sessionUser.role || sessionUser.role === 'user')) pushCountNotif(item, 1); } catch(e){}
 } else {
    const ns = inventoryData.length ? Math.max.apply(null, inventoryData.map(i => i.serial)) + 1 : 1;
    const nv = { serial: ns, code: code, name: 'صنف جديد', group: 'غير معروف', systemQuantity: 0, actualQuantity: 1, isJarded: true, difference: 1, status: 'زيادة', note: '', countedBy: who, counts: { [bag]: 1 }, conflict: false, editedAt: nowTs };
    inventoryData.push(nv);
    isNewItem = true;

    ops.push({ t: 'delta', who: bag, d: 1, ts: nowTs });

    if (!eanOk(code)) { beep('bad'); toast('⚠️ كود غير معروف واحتمال قراءة غلط (checksum مش سليم) — اتسجل كزيادة: ' + code, 'warning'); }
    else { beep('unk'); toast('كود غير معروف — اتسجل كزيادة: ' + code, 'warning'); }
    done = nv; qty = 1;
    try { if (sessionUser && (!sessionUser.role || sessionUser.role === 'user')) pushCountNotif(nv, 1); } catch(e){}
 }

  if (isNewItem) { updateTable(); renderCategoryButtons(); ensureItemVisible(code); }
  else if (done) { patchSingleRow(done); }
  updateStats();
  if (done && ops.length) {
    ops.forEach(op => enqueueCountOp(done.code, op));
    scheduleCountPush(done.code);
 } else if (done) {
    schedulePushItem(done);
 }
  const ls = $('lastScan');
  if (ls && done) {
    ls.style.display = 'block';
    ls.textContent = '✓ ' + done.name + ' — الكمية الإجمالية الآن: ' + fmtQ(qty) +
      (done.manualQty
        ? ' (منها ' + fmtQ(Number(done.counts && done.counts[done.manualBy]) || 0) + ' تحديد يدوي من ' + (done.manualBy || 'المسؤول') + ' — عدّتك بتتضاف فوقها)'
        : '');
 }
}

function saveAndRefresh(rebuildCats, item){
  updateTable();
  updateStats();
  if (rebuildCats !== false) renderCategoryButtons();
  if (item) schedulePushItem(item);
}

function scheduleMetaPush(){
  if (syncOn && db) pushMeta(true);
  else pendingMetaPush = true;
}

function cleanCfgVal(v){
  v = String(v == null ? '' : v).trim();
  const m = v.match(/\[([^\]]*)\]\(([^)]*)\)/);
  if (m) v = (m[1] || '').trim() || (m[2] || '').trim();
  return v.replace(/[\[\]()]/g, '').trim();
}
function normCfg(c){
  if (!c) return null;
  const o = {};
  Object.keys(c).forEach(k => { o[k] = cleanCfgVal(c[k]); });
  return o;
}
const FIREBASE_CONFIG_BOOT = (function(){
  let c = null;
  try { if (window.FIREBASE_CONFIG && window.FIREBASE_CONFIG.apiKey) c = window.FIREBASE_CONFIG; } catch (e) {}
  try { if (!c && typeof firebaseConfig !== 'undefined' && firebaseConfig && firebaseConfig.apiKey) c = firebaseConfig; } catch (e) {}
  if (!c || !cleanCfgVal(c.apiKey)) return null;
  return normCfg(c);
})();
function effectiveCfg(){ return (FIREBASE_CONFIG_BOOT && FIREBASE_CONFIG_BOOT.apiKey) ? FIREBASE_CONFIG_BOOT : firebaseCfgLS; }

let _anonTokenCache = null, _anonTokenExp = 0;
async function getAnonIdToken(cfg){
  if (_anonTokenCache && Date.now() < _anonTokenExp) return _anonTokenCache;
  const r = await fetch('https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=' + encodeURIComponent(cfg.apiKey), {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ returnSecureToken: true })
 });
  if (!r.ok) throw new Error('تعذر الدخول المجهول (HTTP ' + r.status + ') — تأكد إن "Anonymous" مفعّل في Firebase Console ← Authentication ← Sign-in method');
  const j = await r.json();
  _anonTokenCache = j.idToken;
  _anonTokenExp = Date.now() + 50 * 60 * 1000;
  return _anonTokenCache;
}

function parseCfgLoose(txt){
  txt = String(txt || '').trim();
  if (!txt) return null;

  txt = txt.replace(/\[([^\]]*)\]\(([^)]*)\)/g, function (m, label, url) {
    label = label.trim(); url = url.trim();
    if (/^https?:\/\//.test(label)) return label;
    if (/^https?:\/\//.test(url)) return label || url;
    return label || url;
 });
  try { const c = JSON.parse(txt); if (c && c.apiKey) return c; } catch (e) {}
  try {
    let t = txt.split('\n').filter(l => !l.trim().startsWith('//')).join('\n');

    t = t.replace(/([{,\s])([A-Za-z_$][\w$]*)\s*:/g, '$1"$2":');
    t = t.replace(/'/g, '"').replace(/,\s*([\]}])/g, '$1');

    let ai = t.indexOf('"apiKey"');
    if (ai === -1) ai = t.indexOf('apiKey');
    if (ai === -1) return null;
    const start = t.lastIndexOf('{', ai);
    if (start === -1) return null;
    let depth = 0, end = -1;
    for (let i = start; i < t.length; i++) {
      if (t[i] === '{') depth++;
      else if (t[i] === '}') { depth--; if (depth === 0) { end = i; break; } }
 }
    if (end === -1) return null;
    const c = JSON.parse(t.slice(start, end + 1));
    if (c && c.apiKey) return c;
 } catch (e) {}
  return null;
}
function loadScript(src){
  return new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = rej; document.head.appendChild(s); });
}
function setSyncUI(state, txt){
  document.querySelectorAll('[data-syncdot]').forEach(d => { d.className = 'sync-dot ' + (state === 'on' ? 'on' : state === 'mid' ? 'mid' : ''); });
  if (txt) document.querySelectorAll('[data-synctext]').forEach(t => t.textContent = txt);
}function flashDot(){
  document.querySelectorAll('[data-syncdot]').forEach(d => { d.classList.remove('flash'); void d.offsetWidth; d.classList.add('flash'); });
  const d = new Date();
  const txt = 'آخر مزامنة ' + pad2(d.getHours()) + ':' + pad2(d.getMinutes());
  const el = $('syncTime'); if (el) el.textContent = txt;
}

async function connectFirebase(silent, retryCount){
  const cfg = effectiveCfg();
  if (!cfg || !cfg.apiKey) { setSyncUI('off', 'وضع محلي'); return false; }
  setSyncUI('mid', 'جاري الاتصال...');
  try {
    if (typeof firebase === 'undefined') {
      await loadScript('https://www.gstatic.com/firebasejs/10.12.5/firebase-app-compat.js');
      await Promise.all([
        loadScript('https://www.gstatic.com/firebasejs/10.12.5/firebase-auth-compat.js'),
        loadScript('https://www.gstatic.com/firebasejs/10.12.5/firebase-database-compat.js')
      ]);
 }
    if (!firebase.apps.length) firebase.initializeApp(cfg);

    try {
      if (!firebase.auth().currentUser) {
        await new Promise(resolve => {
          const stop = firebase.auth().onAuthStateChanged(u => { stop(); resolve(u); });
        });
      }
      if (!firebase.auth().currentUser) await firebase.auth().signInAnonymously();
    } catch (e) {
      setSyncUI('off', 'فشل الدخول المجهول ⚠️');
      lastSyncErr = 'الدخول المجهول فشل: ' + (e && e.message ? e.message : String(e));
      toast('⚠️ لازم تفعّل "Anonymous" في Firebase Console ← Authentication ← Sign-in method عشان البرنامج يقدر يتصل', 'error');
      return false;
 }
    db = firebase.database();
    try { db.setPersistenceEnabled && db.setPersistenceEnabled(true); } catch (e) {}
    try {
      db.ref('.info/connected').on('value', s => {
        const wasOff = fbConnected === false;
        if (s.val() === true) {
          fbConnected = true;
          setSyncUI('on', 'متصل — مزامنة حية');

 } else if (syncOn) {
          fbConnected = false;
          setSyncUI('off', '📡 مفيش اتصال — الجرد أونلاين فقط');
 }
 });
 } catch (e) {}

    await Promise.race([
      db.ref('.info/connected').once('value'),
      new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 8000))
    ]);
    attachSync();
    syncOn = true;
    accessDenied = false;
    lastSyncErr = '';
    clearTimeout(connectRetryTimer);
    setSyncUI('on', 'متصل — مزامنة حية');
    addLog('تم الاتصال بـ Firebase');
    try { if (pendingWipe) scheduleWipeRetry(); } catch(e){}

    if (sessionUser && loginRequired()) claimSession(sessionUser).then(c => {
      if (c && c.ok === false) {
        bigBlock('🚫', 'الحساب ده مفتوح على جهاز تاني',
          'اتسجل دخول "<b>' + esc(sessionUser.name) + '</b>" من جهاز آخر.<br>سجّل خروجه من هناك الأول وبعدين ادخل من جديد.',
          'حسنًا', () => logoutUser());
 }
 });

    if (!silent) toast('تم الاتصال — المزامنة شغالة بين كل الأجهزة', 'success');
    return true;
 } catch (e) {
    syncOn = false;
    lastSyncErr = e && e.message ? e.message : String(e);

    setSyncUI('mid', 'بيحاول يتصل بالسيرفر...');
    clearTimeout(connectRetryTimer);
    connectRetryTimer = setTimeout(() => connectFirebase(true, (retryCount || 0) + 1), 6000);
    if (!silent) toast('لسه مفيش اتصال — هنحاول تاني تلقائيًا', 'warning');
    return false;
 }
}
function findItemIndexByCode(code){
  for (let i = 0; i < inventoryData.length; i++) if (inventoryData[i].code === code) return i;
  return -1;
}
function renumberSerials(){
  inventoryData.forEach((it, ix) => { it.serial = ix + 1; });
}
function attachSync(){
  if (!db) return;
  if (refOff) { try { refOff(); } catch (e) {} }
  const ref = db.ref(fbPath());
  const itemsRef = ref.child('items');
  let initialLoadDone = false;
  let bulkTimer = null;
  const bootCodeIndex = new Map();
  function scheduleBulkRefresh(){
    if (!initialLoadDone) return;
    clearTimeout(bulkTimer);
    bulkTimer = setTimeout(() => {
      renumberSerials();
      updateStats(); renderCategoryButtons();
      if (editingCount > 0) pendingRemote = true; else updateTable();
      flashDot();
 }, 50);
 }

  const hAdded = itemsRef.on('child_added', snap => {
    const item = normItem(snap.val(), snap.key);

    const idx = initialLoadDone ? findItemIndexByCode(item.code) : (bootCodeIndex.has(item.code) ? bootCodeIndex.get(item.code) : -1);
    if (idx === -1) {
      if (!initialLoadDone) bootCodeIndex.set(item.code, inventoryData.length);
      inventoryData.push(item);
 } else {

      const local = inventoryData[idx];
      inventoryData[idx] = (Number(item.editedAt)||0) >= (Number(local.editedAt)||0) ? item : local;
 }
    scheduleBulkRefresh();
 });

  const hChanged = itemsRef.on('child_changed', snap => {
    const incoming = normItem(snap.val(), snap.key);
    const idx = findItemIndexByCode(incoming.code);
    const key = snap.key;
    let finalItem = incoming;
    if (idx !== -1) {
      const local = inventoryData[idx];
      finalItem = resolveIncomingItem(key, local, incoming, sessionUser ? sessionUser.name : '');
      finalItem.serial = local.serial;
      inventoryData[idx] = finalItem;
      if (!initialLoadDone) return;
      calculateRow(finalItem);
      if (editingCount > 0) { pendingRemote = true; }
      else { patchSingleRow(finalItem); updateStats(); }
      flashDot();
 } else {

      inventoryData.push(finalItem);
      if (!initialLoadDone) return;
      calculateRow(finalItem);
      scheduleBulkRefresh();
 }
 });

  const hRemoved = itemsRef.on('child_removed', snap => {
    const val = snap.val();
    const code = val && val.code;
    const idx = code ? findItemIndexByCode(code) : -1;
    if (idx !== -1) {
      selectedSerials.delete(inventoryData[idx].serial);
      inventoryData.splice(idx, 1);
 }
    scheduleBulkRefresh();
 });

  itemsRef.once('value').then(() => {
    initialLoadDone = true;
    bootCodeIndex.clear();
    seenData = true;
    maybeFinishBoot();
    renumberSerials();
    updateTable(); updateStats(); renderCategoryButtons();
    flashDot();
 }).catch(err => {
    seenData = true;
    maybeFinishBoot();
    syncOn = false;
    accessDenied = true;
    lastSyncErr = err && err.message ? err.message : String(err);
    setSyncUI('off', 'مرفوض من السيرفر ⚠️');

    toast('السيرفر رفض المزامنة — افتح الإعدادات ← "🔌 الاتصال والمزامنة" واضغط "ربط قاعدة البيانات" عشان تشوف السبب', 'error');
 });

  const h2 = ref.child('meta').on('value', snap => {
    const meta = snap.val() || {};

    if (meta.forceWipe) {
      const lastWipe = Number(store.getItem('lastForceWipe') || '0');
      const thisBootHandled = sessionStorage.getItem('forceWipeHandled_' + meta.forceWipe);
      if (meta.forceWipe > lastWipe && !thisBootHandled) {
        store.setItem('lastForceWipe', String(meta.forceWipe));
        sessionStorage.setItem('forceWipeHandled_' + meta.forceWipe, '1');

        try { db.ref(fbRoot() + '/meta/forceWipe').remove(); } catch(e){}
        toast('💥 تم مسح البيانات من جهاز آخر — الصفحة هتتحدث خلال لحظة', 'warning');
        setTimeout(() => location.reload(), 1500);
        return;
 }
 }

    if (meta.setupDone) setupDone = true;
    seenMeta = true;
    maybeFinishBoot();
    if (meta.adminHash && meta.adminHash !== adminHash) { adminHash = meta.adminHash; store.setItem('adminHash', adminHash); }

    const rawUsers = (meta.users === undefined || meta.users === null)
      ? []
      : (Array.isArray(meta.users) ? meta.users : Object.values(meta.users));
    const incoming = rawUsers.filter(u => u && u.name);
    const uRev = meta.usersRev || 0;
    if (uRev && uRev >= lastUsersRev && lastUsersRev > 0) {

      if (uRev > lastUsersRev) lastUsersRev = uRev;
      if (JSON.stringify(incoming) !== JSON.stringify(usersList)) {
        usersList = incoming;
        store.setItem('usersList', JSON.stringify(usersList));
        applyUserUI();
        if (loginRequired() && !sessionUser && !document.querySelector('.lock-overlay')) showLock();
 }
 } else {

      const byName = {};
      incoming.forEach(u => { if (u && u.name) byName[u.name] = u; });
      usersList.forEach(u => { if (u && u.name && !(u.name in byName)) byName[u.name] = u; });
      const merged = Object.values(byName);
      if (JSON.stringify(merged) !== JSON.stringify(usersList)) {
        usersList = merged;
        store.setItem('usersList', JSON.stringify(usersList));
        applyUserUI();

        if (loginRequired() && !sessionUser && !document.querySelector('.lock-overlay')) showLock();
 }
      if (usersList.length > incoming.length) scheduleMetaPush();
 }
    if (meta.dt && meta.dt !== store.getItem('selectedDateTime')) {
      store.setItem('selectedDateTime', meta.dt);
      const dtEl = $('currentDateTime'); if (dtEl) dtEl.value = meta.dt;
 }
    /* تاريخ رفع الجرد وتاريخ التعديل — بيتزامنان من Firebase لكل الأجهزة */
    if (meta.uploadedAt && meta.uploadedAt !== store.getItem('uploadDateTime')) {
      store.setItem('uploadDateTime', meta.uploadedAt);
      uploadDateTime = meta.uploadedAt;
      const upEl = $('currentDateTime'); if (upEl) upEl.value = meta.uploadedAt;
      renderFileDates();
 }
    const rLastEditAt = Number(meta.lastEditAt) || 0;
    if (rLastEditAt && rLastEditAt !== lastEditAt) {
      lastEditAt = rLastEditAt;
      lastEditBy = String(meta.lastEditBy || '');
      store.setItem('lastEditAt', String(lastEditAt));
      store.setItem('lastEditBy', lastEditBy);
      renderFileDates();
 }
    if (meta.logo && meta.logo !== store.getItem('customLogo')) {
      store.setItem('customLogo', meta.logo);
      applyLogo(meta.logo);
 }

    if (pendingMetaPush) { pendingMetaPush = false; pushMeta(true);  }
 }, () => {});
  try { if (isAdmin() && sessionUser) attachNotifListener(); } catch(e){}
  refOff = () => {
    itemsRef.off('child_added', hAdded);
    itemsRef.off('child_changed', hChanged);
    itemsRef.off('child_removed', hRemoved);
    ref.child('meta').off('value', h2);
    try{ detachNotifListener(); }catch(e){}
 };
}

function onlineGuard(action){
  if (syncOn && db && !(navigator && navigator.onLine === false)) return false;
  setSyncUI('off', '📡 مفيش اتصال — الجرد أونلاين فقط');
  beep('bad');
  toast('📡 مفيش اتصال بالإنترنت — الجرد أونلاين فقط. ' + (action || 'العملية دي') + ' مااتسجلتش، حاول تاني لما النت يرجع', 'error');
  return true;
}
function schedulePushItem(item){
  if (!item || !item.code) return;
  if (!syncOn || !db) { setSyncUI('off', '📡 مفيش اتصال — الجرد أونلاين فقط'); return; }
  clearTimeout(itemPushTimers[item.code]);
  itemPushTimers[item.code] = setTimeout(() => pushItemNow(item), 450);
}

function pushItemNow(item){
  if (!item || !item.code) return;
  if (!syncOn || !db) { return; }
  clearTimeout(itemPushTimers[item.code]); itemPushTimers[item.code] = null;
  const key = itemKey(item.code);
  const code = item.code;
  pendingItemWrites[key] = true;
  if (navigator && navigator.onLine === false) { setSyncUI('off', '📡 مفيش اتصال — الجرد أونلاين فقط'); }
  db.ref(fbPath() + '/items/' + key).transaction(cur => {
    return applyMetaPatch(cur, item, code);
 }, (err, committed, snap) => {
    delete pendingItemWrites[key];
    if (err || !committed) {
      lastSyncErr = err && err.message ? err.message : String(err || 'transaction not committed');
      if (String(lastSyncErr).indexOf('PERMISSION_DENIED') !== -1) {
        accessDenied = true;
        setSyncUI('off', 'مرفوض من السيرفر ⚠️');
        toast('⚠️ السيرفر رفض الكتابة — افتح الإعدادات ← "🔌 الاتصال والمزامنة" ← "ربط قاعدة البيانات"', 'error');
 } else {
        setSyncUI('mid', 'انقطع مؤقتًا — محفوظ عندك وهيترفع تلقائيًا');
 }

      return;
 }
    committedItemKeys[key] = true;
    adoptCommittedItem(code, snap ? snap.val() : null);
    flashDot(); accessDenied = false;
 }, false
);
}

function enqueueCountOp(code, op){
  if (!code || !op) return;
  if (!pendingCountOps[code]) pendingCountOps[code] = [];
  pendingCountOps[code].push(op);
}
function scheduleCountPush(code, delay){
  if (!code) return;
  if (!syncOn || !db) { setSyncUI('off', '📡 مفيش اتصال — الجرد أونلاين فقط'); return; }
  clearTimeout(countPushTimers[code]);
  countPushTimers[code] = setTimeout(() => pushCountOpsNow(code), delay == null ? 350 : delay);
}
function pushCountOpsNow(code){
  if (!code) return;
  clearTimeout(countPushTimers[code]); countPushTimers[code] = null;
  const ops = pendingCountOps[code];
  if (!ops || !ops.length) { delete pendingCountOps[code];  return; }
  if (!syncOn || !db || (navigator && navigator.onLine === false)) {
    setSyncUI('off', '📡 مفيش اتصال — الجرد أونلاين فقط');

    return;
 }
  const key = itemKey(code);
  const local = inventoryData.find(i => i.code === code) || null;
  const me = sessionUser ? sessionUser.name : '';

  delete pendingCountOps[code];
  pendingItemWrites[key] = true;
  db.ref(fbPath() + '/items/' + key).transaction(cur => {

    return applyCountOps(cur, ops, me, code, local);
 }, (err, committed, snap) => {
    delete pendingItemWrites[key];
    if (err || !committed) {
      requeueCountOps(code, ops);
      lastSyncErr = err && err.message ? err.message : String(err || 'transaction not committed');
      if (String(lastSyncErr).indexOf('PERMISSION_DENIED') !== -1) {
        accessDenied = true;
        setSyncUI('off', 'مرفوض من السيرفر ⚠️');
        toast('⚠️ السيرفر رفض الكتابة — افتح الإعدادات ← "🔌 الاتصال والمزامنة" ← "ربط قاعدة البيانات"', 'error');
 } else {
        setSyncUI('mid', 'انقطع مؤقتًا — العدّ محفوظ عندك وهيترفع تلقائيًا');
 }

      return;
 }
    countRetry[code] = 0;
    committedItemKeys[key] = true;
    adoptCommittedItem(code, snap ? snap.val() : null);
    flashDot(); accessDenied = false;

    if (pendingCountOps[code] && pendingCountOps[code].length) scheduleCountPush(code);
 }, false );
}

function requeueCountOps(code, ops){
  if (!code || !ops || !ops.length) return;
  const rest = pendingCountOps[code] || [];
  pendingCountOps[code] = ops.concat(rest);
  countRetry[code] = (countRetry[code] || 0) + 1;
  if (countRetry[code] > 5) {
    toast('⚠️ تعذّر رفع عدّ "' + code + '" دلوقتي — محفوظ عندك وهيترفع أول ما الاتصال يستقر', 'warning');
    return;
 }
  if (syncOn && db && !accessDenied) scheduleCountPush(code, 1200 * countRetry[code]);
}

function adoptCommittedItem(code, raw){
  if (!code) return;
  const idx = findItemIndexByCode(code);
  if (raw == null) {

    if (idx !== -1) {
      selectedSerials.delete(inventoryData[idx].serial);
      inventoryData.splice(idx, 1);
      updateTable(); updateStats(); renderCategoryButtons();
 }
    flashDot();
    return;
 }
  const item = normItem(raw, code);
  if (idx === -1) inventoryData.push(item);
  else { item.serial = inventoryData[idx].serial; inventoryData[idx] = item; }
  calculateRow(item);
  if (editingCount > 0) { pendingRemote = true; return; }
  patchSingleRow(item);
  updateStats();
  flashDot();
}

function pushFullReplace(items){
  if (!syncOn || !db) { toast('📡 مفيش اتصال — العملية دي أونلاين فقط ومااتنفذتش', 'error'); return Promise.resolve(false); }
  const obj = {};
  items.forEach(it => { obj[itemKey(it.code)] = it; });
  return db.ref(fbPath() + '/items').set(obj).then(() => { flashDot(); accessDenied = false; return true; }).catch(err => {
    lastSyncErr = err && err.message ? err.message : String(err);
    if (String(lastSyncErr).indexOf('PERMISSION_DENIED') !== -1) {
      toast('⚠️ العملية دي (استبدال كامل/استرجاع) محصورة على الأدمن الحقيقي فقط — سجّل دخول admin من الإعدادات وحاول تاني', 'error');
 } else {
      toast('⚠️ فشل رفع البيانات (' + lastSyncErr + ')', 'error');
 }
    return false;
 });
}

function pushMergeUpdate(changedItems, removedCodes){
  if (!syncOn || !db) { toast('📡 مفيش اتصال — العملية دي أونلاين فقط ومااتنفذتش', 'error'); return Promise.resolve(false); }
  const patch = {};
  (changedItems||[]).forEach(it => { patch[itemKey(it.code)] = it; });
  (removedCodes||[]).forEach(code => { patch[itemKey(code)] = null; });
  if (!Object.keys(patch).length) return Promise.resolve(true);
  return db.ref(fbPath() + '/items').update(patch).then(() => { flashDot(); accessDenied = false; return true; }).catch(err => {
    lastSyncErr = err && err.message ? err.message : String(err);
    toast('⚠️ فشل رفع التغييرات (' + lastSyncErr + ')', 'error');
    return false;
 });
}

function pushMergeMeta(changes){
  if (!syncOn || !db) { toast('📡 مفيش اتصال — العملية دي أونلاين فقط ومااتنفذتش', 'error'); return Promise.resolve(false); }
  const list = (changes || []).filter(Boolean);
  if (!list.length) return Promise.resolve(true);
  let failed = false;

  const CHUNK = 25;
  const runOne = ch =>
    db.ref(fbPath() + '/items/' + itemKey(ch.code)).transaction(cur => {
      const base = (cur && typeof cur === 'object') ? cur : {};
      const sys = Number(ch.sys) || 0;
      const out = Object.assign({}, base, { code: ch.code, name: ch.name, group: ch.group, systemQuantity: sys, editedAt: Date.now() });
      if (ch.reset) { out.actualQuantity = 0; out.isJarded = false; out.counts = {}; out.countedBy = ''; out.manualQty = false; out.manualBy = ''; out.manualAt = 0; out.manualPrev = ''; }
      out.actualQuantity = Number(out.actualQuantity) || 0;
      out.difference = out.actualQuantity - sys;
      out.status = out.difference > 0 ? 'زيادة' : out.difference < 0 ? 'عجز' : 'متساوي';
      return out;
    }, (err, committed, snap) => {
      if (err || !committed) { failed = true; return; }

      try { adoptCommittedItem(ch.code, snap ? snap.val() : null); } catch (e) {}
    }, false);
  let i = 0;
  const step = () => {
    if (i >= list.length) return Promise.resolve(!failed);
    const batch = list.slice(i, i + CHUNK);
    i += CHUNK;
    return Promise.all(batch.map(runOne)).then(step);
  };
  return step().then(ok => {
    if (ok) { flashDot(); accessDenied = false; }
    else { lastSyncErr = 'بعض الأصناف ماترفعتش'; toast('⚠️ بعض الأصناف ماترفعتش — حاول تاني', 'error'); }
    return ok;
 });
}
function pushMeta(withUsers){
  if (!syncOn || !db) { pendingMetaPush = true; return Promise.resolve(false); }
  pendingMetaPush = false;
  const meta = {};
  meta.setupDone = true;

  const canWriteAdminMeta = !!localAdminVerified;
  if (adminHash && canWriteAdminMeta) meta.adminHash = adminHash;

  if (withUsers && canWriteAdminMeta) {

    if (usersList.length) {
      meta.users = {};
      usersList.forEach(u => { if (u && u.name) meta.users['u_' + sessionKey(u.name)] = u; });
 } else {
      meta.users = null;
 }

    meta.usersRev = firebase.database.ServerValue.TIMESTAMP;

    lastUsersRev = Date.now();
 }
  const logo = store.getItem('customLogo');
  if (logo) meta.logo = logo;
  const dt = store.getItem('selectedDateTime');
  if (dt) meta.dt = dt;
  const upAt = store.getItem('uploadDateTime');
  if (upAt) meta.uploadedAt = upAt;
  const leAt = Number(store.getItem('lastEditAt')) || 0;
  if (leAt) { meta.lastEditAt = leAt; meta.lastEditBy = store.getItem('lastEditBy') || ''; }
  return db.ref(fbPath() + '/meta').update(meta).then(() => {

    if (withUsers) {
      db.ref(fbPath() + '/meta/usersRev').once('value').then(s => {
        const v = s.val();
        if (v) lastUsersRev = v;
 }).catch(() => {});
 }
    return true;
 }).catch(e => {
    lastSyncErr = (e && e.message) ? e.message : String(e);
    if (String(lastSyncErr).indexOf('PERMISSION_DENIED') !== -1) {
      toast('⛔ السيرفر رفض الحفظ — راجع صلاحيات Firebase Realtime Database Rules.', 'error', { life: 12000 });
      addLog('⛔ رفض من السيرفر عند حفظ meta: ' + lastSyncErr);
    }
    return false;
 });
}

function setupBarcodeInput(){
  const inp = $('addCode');
  const commit = () => {
    const v = inp.value.trim();
    if (!v) return;
    v.split(/[\n\r,;\t]+/).map(s => s.trim()).filter(Boolean).forEach(processCode);
    inp.value = '';
    setTimeout(() => inp.focus(), 30);
 };

  const form = document.getElementById('codeForm');
  if (form) form.addEventListener('submit', e => { e.preventDefault(); commit(); });

  const keyHandler = e => {
    if (e.key === 'Enter' || e.key === 'Tab' || e.keyCode === 13 || e.which === 13) {
      e.preventDefault();
      commit();
 }
 };

  inp.addEventListener('input', () => {
    const v = sanitizeCode(inp.value);
    if (v !== inp.value) inp.value = v;
 });
  inp.addEventListener('keydown', keyHandler);
  inp.addEventListener('keyup', e => { if ((e.key === 'Enter' || e.keyCode === 13) && inp.value.trim()) commit(); });

  inp.addEventListener('paste', e => {
    const txt = (e.clipboardData || window.clipboardData).getData('text') || '';
    if (/[\n\r\t]/.test(txt)) {
      e.preventDefault();
      txt.split(/[\n\r,;\t]+/).map(s => s.trim()).filter(Boolean).forEach(processCode);
      setTimeout(() => inp.focus(), 30);
 }
 });

  const cb = $('camBtn'); if (cb) cb.onclick = openCameraScanner;
}

function setupKeyboardShortcuts(){
  const typing = t => {
    if (!t) return false;
    const tag = (t.tagName || '').toLowerCase();
    return tag === 'input' || tag === 'textarea' || tag === 'select' || t.isContentEditable === true;
  };
  document.addEventListener('keydown', e => {
    const k = (e.key || '').toLowerCase();

    if (k === 'escape') {
      const ov = document.querySelector('.modal-overlay');
      if (ov) { ov.remove(); return; }
      const ss = $('smartSearch');
      if (ss && ss.value) { ss.value = ''; resetPage(); updateTable(); }
      return;
    }

    if (k === 'f2') { e.preventDefault(); const i = $('addCode'); if (i) { i.focus(); i.select(); } return; }
    if (k === 'f3' || ((e.ctrlKey || e.metaKey) && k === 'f')) {
      e.preventDefault(); const s2 = $('smartSearch'); if (s2) { s2.focus(); s2.select(); } return;
    }
    if (k === 'f4') { e.preventDefault(); if (typeof openCameraScanner === 'function') openCameraScanner(); return; }
    if (k === 'f9') { e.preventDefault(); if (typeof openReports === 'function') openReports(); return; }

    if (k === 'enter' && (e.ctrlKey || e.metaKey)) {
      const i = $('addCode');
      if (i && document.activeElement !== i) { e.preventDefault(); const f = $('codeForm'); if (f) f.requestSubmit ? f.requestSubmit() : f.dispatchEvent(new Event('submit')); }
    }
  });
}
function setupTableEvents(){
  const tb = $('tableBody');
  document.addEventListener('focusin', e => {
    if (e.target.closest && e.target.closest('td[contenteditable]')) editingCount++;

    if (e.target.matches && e.target.matches('select[data-gsel]')) expandGroupSelect(e.target);
  });
  tb.addEventListener('mousedown', e => {
    if (e.target.matches && e.target.matches('select[data-gsel]')) expandGroupSelect(e.target);
  });
  document.addEventListener('focusout', e => {
    if (e.target.closest && e.target.closest('td[contenteditable]')) {
      editingCount = Math.max(0, editingCount - 1);
      if (editingCount === 0 && pendingRemote) {
        pendingRemote = false;
        updateTable(); updateStats(); renderCategoryButtons();
      }
 }
 });
  tb.addEventListener('focusout', e => {
    const td = e.target.closest('td[contenteditable]');
    if (!td) return;
    const tr = td.closest('tr');
    const serial = parseInt(tr.dataset.serial);
    if (td.dataset.edit === 'name' || td.dataset.edit === 'note') updateField(serial, td.dataset.edit, td.innerText);
    else if (td.dataset.qty) updateQty(serial, td.dataset.qty, td.innerText, tr);
 });
  tb.addEventListener('change', e => {
    const tr = e.target.closest('tr'); if (!tr) return;
    const serial = parseInt(tr.dataset.serial);
    if (e.target.matches('select[data-gsel]')) updateField(serial, 'group', e.target.value);
    else if (e.target.classList.contains('item-checkbox')) {
      if (e.target.checked) selectedSerials.add(serial); else selectedSerials.delete(serial);
      tr.classList.toggle('selected-for-print', e.target.checked);
 }
 });

  tb.addEventListener('keydown', e => {
    const td = e.target.closest('td[contenteditable]');
    if (!td) return;
    if (e.key === 'Enter') {
      e.preventDefault();
      td.blur();
      const tr = td.closest('tr');
      const nextTr = tr && tr.nextElementSibling;
      if (nextTr) {
        const key = td.dataset.edit || td.dataset.qty;
        const sel = td.dataset.edit ? '[data-edit="' + key + '"]' : '[data-qty="' + key + '"]';
        const nextTd = nextTr.querySelector(sel);
        if (nextTd) { nextTd.focus(); document.execCommand('selectAll', false, null); }
 }
 } else if (e.key === 'Escape') {
      const item = inventoryData.find(x => x.serial === parseInt(td.closest('tr').dataset.serial));
      if (item) {
        if (td.dataset.edit === 'name') td.innerText = item.name;
        else if (td.dataset.edit === 'note') td.innerText = item.note;
        else if (td.dataset.qty) td.innerText = fmtQ(item[td.dataset.qty]);
 }
      td.blur();
 }
 });
  $('categoryButtonsContainer').addEventListener('click', e => {
    const b = e.target.closest('[data-cat]');
    if (b) setCategoryFilter(b.dataset.cat);
 });
  let searchTimer = null;
  $('smartSearch').addEventListener('input', () => { clearTimeout(searchTimer); searchTimer = setTimeout(() => { resetPage(); updateTable(); }, 200); });
}
function toggleSelectAll(master){

  const filtered = getFiltered();
  filtered.forEach(item => {
    if (master.checked) selectedSerials.add(item.serial); else selectedSerials.delete(item.serial);
 });
  document.querySelectorAll('#tableBody .item-checkbox').forEach(cb => {
    cb.checked = master.checked;
    const tr = cb.closest('tr');
    tr.classList.toggle('selected-for-print', master.checked);
 });
}

function applyAndPush(applyFn, label){
  applyFn();
  updateTable(); updateStats(); renderCategoryButtons();
  pushFullReplace(inventoryData).then(ok => {
    if (!ok) toast('⚠️ اتحفظ عندك بس السيرفر لم يستجب — حاول تاني لما النت يرجع', 'error');
 });
  toast(label, 'success');
}
async function openClearModal(){
  if (needAdmin()) return;
  if (!(await ensureAdmin())) return;
  const ok = await confirmDlg('مسح كل الأصناف نهائياً؟', 'سيتم مسح كل الأصناف من السيرفر ومن كل الأجهزة نهائياً ومش هترجع إلا لما ترفع ملف جديد. متأكد؟' + wipeWarningHTML(), 'نعم - امسح نهائي', true);
  if (!ok) return;
  await doWipeAll();
}
let wipeRetryTimer = null;
let pendingWipe = false;

async function doWipeAll(){
  inventoryData = [];
  selectedSerials.clear();
  updateTable(); updateStats(); renderCategoryButtons();
  let serverOk = false;
  let failReason = '';
  try {
    if (syncOn && db) {
      await db.ref(fbPath() + '/items').set(null);
      await db.ref(fbPath() + '/notifs').remove();
      serverOk = true;
 }
 } catch(e){ failReason = e && e.message ? e.message : String(e); }
  if (!serverOk) {
    try {
      const cfg = effectiveCfg();
      if (cfg && cfg.databaseURL) {
        const base = cfg.databaseURL.replace(/\/$/, '');
        const tok = '?auth=' + encodeURIComponent(await getAnonIdToken(cfg));
        const r1 = await fetch(base + '/' + fbPath() + '/items.json' + tok, { method: 'DELETE' });
        const r2 = await fetch(base + '/' + fbPath() + '/notifs.json' + tok, { method: 'DELETE' });
        serverOk = !!(r1.ok && r2.ok);
        if (!serverOk) failReason = 'HTTP ' + r1.status + '/' + r2.status;
 } else if (!failReason) {
        failReason = 'مفيش اتصال بقاعدة البيانات دلوقتي';
 }
 } catch(e){ failReason = e && e.message ? e.message : String(e); }
 }
  try { clearAllLocalCaches(); } catch(e){}
  /* بعد المسح النهائي: ملف الجرد اتمسح — تاريخ الرفع بيتصفّر
     وتاريخ التعديل يسجّل وقت المسح */
  clearInventoryUpload();
  markAdminEdit();
  if (serverOk) {
    pendingWipe = false;
    toast('🔥 تم مسح كل البيانات نهائياً من السيرفر والكاش - البرنامج فاضي', 'success');
    addLog('مسح نهائي كامل');
 } else {
    pendingWipe = true;
    toast('⚠️ اتمسح عندك، لكن السيرفر لم يستجب (' + (failReason || 'خطأ اتصال') + ') — هيتحاول المسح تلقائياً تاني أول ما النت يرجع. لو قفلت الصفحة قبل ما ينجح، اضغط "مسح الكل" تاني بعد ما ترجع، أو استخدم صفحة wipe.html', 'error');
    addLog('مسح محلي فقط - فشل مسح السيرفر: ' + failReason);
    scheduleWipeRetry();
 }
}
function scheduleWipeRetry(){
  clearTimeout(wipeRetryTimer);
  wipeRetryTimer = setTimeout(async () => {
    if (!pendingWipe) return;
    if (!syncOn || !db) { scheduleWipeRetry(); return; }
    try {
      await db.ref(fbPath() + '/items').set(null);
      await db.ref(fbPath() + '/notifs').remove();
      pendingWipe = false;
      toast('✅ نجح المسح المؤجل — البيانات اتمسحت من السيرفر فعلياً', 'success');
      addLog('نجح إعادة محاولة المسح');
 } catch(e){ scheduleWipeRetry(); }
 }, 8000);
}
async function deleteSelected(){
  if (needAdmin()) return;
  const serials = [...selectedSerials];
  if (!serials.length) { toast('حدد صنفًا واحدًا على الأقل', 'warning'); return; }
  const ok = await confirmDlg('حذف المحدد نهائياً؟', 'سيتم حذف ' + serials.length + ' صنف نهائياً من السيرفر ومن كل الأجهزة ومش هيرجع إلا بملف جديد. باقي الأصناف مش هتتأثر خالص. متأكد؟', 'حذف نهائي', true);
  if (!ok) return;

  if (!(await ensureAdmin())) { toast('لازم تأكيد كلمة مرور الأدمن للحذف', 'error'); return; }
  const removedCodes = inventoryData.filter(i => serials.indexOf(i.serial) !== -1).map(i => i.code);
  inventoryData = inventoryData.filter(i => serials.indexOf(i.serial) === -1);
  renumberSerials();
  serials.forEach(s => selectedSerials.delete(s));
  updateTable(); updateStats(); renderCategoryButtons();
  const okServer = await pushMergeUpdate([], removedCodes);
  if (okServer) {
    toast('تم حذف ' + serials.length + ' صنف نهائياً من كل الأجهزة', 'success');
 } else {
    toast('⚠️ اتحذف عندك بس السيرفر لم يستجب — حاول تاني لما النت يرجع', 'error');
 }
  markAdminEdit();
  addLog('حذف محدد نهائي - ' + serials.length + ' صنف');
}

function loadExcelFile(){
  if (needAdmin()) { const i0 = $('systemInventoryFile'); if (i0) i0.value = ''; return; }
  const inp = $('systemInventoryFile');
  const file = inp.files[0];
  if (!file) return;
  const isCsv = /\.(csv|txt)$/i.test(file.name);
  if (typeof XLSX === 'undefined' && !isCsv) {
    loadScript('https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js')
      .then(() => readImportFile(file, inp, isCsv))
      .catch(() => { toast('لا يوجد إنترنت لقراءة xlsx — احفظ الملف كـ CSV وارفعه', 'error'); inp.value = ''; });
    return;
 }
  readImportFile(file, inp, isCsv);
}
function readImportFile(file, inp, isCsv){
  const reader = new FileReader();
  reader.onload = e => {
    try {
      if (typeof XLSX !== 'undefined' && !isCsv) {
        workbookData = XLSX.read(new Uint8Array(e.target.result), { type: 'array' });
        sheetNames = workbookData.SheetNames;
        isCsvSource = false;
 } else if (typeof XLSX !== 'undefined' && isCsv) {
        workbookData = XLSX.read(new TextDecoder().decode(new Uint8Array(e.target.result)), { type: 'string' });
        sheetNames = workbookData.SheetNames;
        isCsvSource = false;
 } else {
        csvRows = parseCSV(new TextDecoder().decode(new Uint8Array(e.target.result)));
        sheetNames = ['CSV'];
        isCsvSource = true;
        if (!csvRows.length) throw new Error('empty');
 }
      toast('تم قراءة الملف — اضغط "إضافة جرد" لإتمام الاستيراد', 'success');
 } catch (err) {
      workbookData = null; csvRows = [];
      toast('تعذر قراءة الملف — جرب ملف xlsx أو csv', 'error');
 }
    inp.value = '';
 };
  reader.readAsArrayBuffer(file);
}
function parseCSV(text){
  text = text.replace(/^﻿/, '');
  const first = text.split(/\r?\n/)[0] || '';
  const delim = [first.split(';').length, first.split('\t').length, first.split(',').length].indexOf(Math.max(first.split(';').length, first.split('\t').length, first.split(',').length));
  const d = [';', '\t', ','][delim];
  const rows = []; let row = [], f = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') { if (text[i + 1] === '"') { f += '"'; i++; } else q = false; }
      else f += c;
 } else if (c === '"') q = true;
    else if (c === d) { row.push(f); f = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(f); f = '';
      if (row.some(x => String(x).trim() !== '')) rows.push(row);
      row = [];
 } else f += c;
 }
  if (f !== '' || row.length) { row.push(f); if (row.some(x => String(x).trim() !== '')) rows.push(row); }
  return rows;
}
function getSheetRows(idx){
  if (isCsvSource) return csvRows;
  if (!workbookData) return [];
  return XLSX.utils.sheet_to_json(workbookData.Sheets[sheetNames[idx]], { header: 1, defval: '' });
}
function openImportModal(){
  if (needAdmin()) return;
  if (!workbookData && !csvRows.length) { toast('ارفع ملف الجرد أولًا من زر "رفع جرد"', 'warning'); return; }
  const sheetSel = $('sheetSel');
  if (!sheetSel) { toast('واجهة الاستيراد غير جاهزة - حدث الصفحة', 'error'); return; }
  sheetSel.innerHTML = sheetNames.map((n, i) => '<option value="' + i + '">' + esc(n || ('شيت ' + (i + 1))) + '</option>').join('');
  const wrap = $('sheetSelWrap'); if (wrap) wrap.style.display = sheetNames.length > 1 ? '' : 'none';
  const fillCols = () => {
    const rows = getSheetRows(+sheetSel.value) || [];
    const cols = rows[0] || [];
    ['codeColumn', 'nameColumn', 'quantityColumn', 'groupColumn'].forEach(id => {
      const el = $(id);
      if (!el) return;
      el.innerHTML = cols.map((c, i) => '<option value="' + i + '">' + esc(String(c).trim() || ('عمود ' + (i + 1))) + '</option>').join('');
 });
    guessCol(cols, 'codeColumn', ['كود', 'code', 'barcode', 'باركود', 'item']);
    guessCol(cols, 'nameColumn', ['اسم', 'name', 'صنف', 'desc', 'وصف']);
    guessCol(cols, 'quantityColumn', ['كمية', 'qty', 'quantity', 'رصيد', 'stock']);
    guessCol(cols, 'groupColumn', ['مجموع', 'group', 'فئة', 'قسم', 'categ']);
 };
  sheetSel.onchange = fillCols;
  fillCols();
  const colMod = $('columnSelectors'); if (colMod) colMod.style.display = 'flex';
}

function guessCol(cols, id, keys){
  const sel = $(id);
  for (let i = 0; i < cols.length; i++) {
    const h = String(cols[i]).toLowerCase();
    if (keys.some(k => h.indexOf(k) !== -1)) { sel.value = i; return; }
 }
}
async function confirmImport(){
  const allRows = getSheetRows(+$('sheetSel').value) || [];
  if (!allRows.length) { toast('الملف فاضي', 'error'); return; }

  const headerKeys = ['م','مسلسل','الكود','كود','barcode','باركود','code','الصنف','اسم الصنف','الاسم','name','الوحدة','وحدة','unit','الكمية','كمية','الرصيد','رصيد','quantity','qty','stock','المجموعة','مجموعة','group','فئة','قسم'];
  function isHeaderCell(v){
    const s = String(v||'').trim().toLowerCase();
    return headerKeys.some(k=> s === k.toLowerCase() || s.includes(k.toLowerCase()));
 }

  function headerScore(row){
    let score = 0;
    for (const c of row) {
      const s = String(c||'').trim().toLowerCase();
      if (!s) continue;
      if (headerKeys.some(k => s === k.toLowerCase())) score += 2;
      else if (headerKeys.some(k => s.includes(k.toLowerCase()))) score += 1;
 }
    return score;
 }
  let headerIdx = -1, bestScore = 1;
  for (let i=0;i<Math.min(allRows.length, 15);i++){
    const sc = headerScore(allRows[i]||[]);
    if (sc > bestScore) { bestScore = sc; headerIdx = i; }
 }
  const dataRows = headerIdx >=0 ? allRows.slice(headerIdx+1) : allRows.slice(1);
  const ci = +$('codeColumn').value, ni = +$('nameColumn').value, qi = +$('quantityColumn').value, gi = +$('groupColumn').value;
  const mode = document.querySelector('input[name="imode"]:checked').value;
  const incoming = [];
  const headerSkipSet = new Set(headerKeys.map(k=>k.toLowerCase()));
  let skippedEmpty = 0, skippedHeader = 0;
  dataRows.forEach(r=>{
    if (!r) { skippedEmpty++; return; }

    const allEmpty = r.every(cell=> String(cell==null?'':cell).trim() === '');
    if (allEmpty) { skippedEmpty++; return; }
    const codeRaw = String(r[ci] == null ? '' : r[ci]).trim();
    if (!codeRaw) { skippedEmpty++; return; }
    const codeLow = codeRaw.toLowerCase();

    if (headerSkipSet.has(codeLow)) { skippedHeader++; return; }

    let headerCells = 0;
    for (const cell of r) {
      if (isHeaderCell(cell)) headerCells++;
 }
    if (headerCells >= 2 && r.length <= 8) { skippedHeader++; return; }

    const nameRaw = String(r[ni] == null ? '' : r[ni]).trim();
    const qtyRaw = r[qi];
    const groupRaw = String(r[gi] == null ? '' : r[gi]).trim();

    incoming.push({
      code: codeRaw,
      name: nameRaw || 'صنف غير مسمى',
      group: groupRaw || 'عام',
      sys: parseQty(qtyRaw)
 });
 });
  if (!incoming.length) { toast('لم يتم العثور على بيانات بعد تجاهل الرؤوس والفارغ', 'error'); return; }
  if (mode === 'replace') {
    if (needAdmin()) return;
    const previewRows = incoming.slice(0, 15).map(r =>
      '<tr><td style="padding:.3rem .5rem;border-bottom:1px solid #f1f5f9">' + esc(r.code) + '</td>' +
      '<td style="padding:.3rem .5rem;border-bottom:1px solid #f1f5f9">' + esc(r.name) + '</td>' +
      '<td style="padding:.3rem .5rem;border-bottom:1px solid #f1f5f9;text-align:center">' + fmtQ(r.sys) + '</td></tr>'
    ).join('');
    const rowsHTML = '<thead><tr style="background:#f8fafc;font-weight:700"><td style="padding:.3rem .5rem">الكود</td><td style="padding:.3rem .5rem">الاسم</td><td style="padding:.3rem .5rem;text-align:center">كمية السيستم</td></tr></thead><tbody>' +
      previewRows + (incoming.length > 15 ? '<tr><td colspan="3" style="padding:.4rem;text-align:center;color:#94a3b8">و ' + (incoming.length - 15) + ' صنف تاني...</td></tr>' : '') + '</tbody>';
    const ok = await importPreviewDlg('استبدال البيانات — معاينة', 'سيتم استبدال كل البيانات الحالية (' + inventoryData.length + ' صنف) بمحتوى الملف (' + incoming.length + ' صنف). تم تجاهل ' + (skippedEmpty+skippedHeader) + ' صف فاضي/رأس. سيتم إرسال الجرد الجديد لكل الأجهزة فوراً.' + wipeWarningHTML(), rowsHTML, 'استبدال');
    if (!ok) return;

    if (!(await ensureAdmin())) { toast('لازم تأكيد كلمة مرور الأدمن للاستبدال', 'error'); return; }
    applyAndPush(() => {
      let s = 1;
      inventoryData = incoming.map(r => {
        const item = { serial: s++, code: r.code, name: r.name, group: r.group, systemQuantity: r.sys, actualQuantity: 0, isJarded: false, difference: -r.sys, status: r.sys === 0 ? 'متساوي' : 'عجز', note: '', countedBy: '', counts: {}, editedAt: Date.now() };
        return item;
 });
      selectedSerials.clear();
 }, 'تم استيراد ' + incoming.length + ' صنف (تجاهل ' + (skippedEmpty+skippedHeader) + ' فارغ/رأس) - اتبعت لكل الأجهزة');
    markInventoryUploaded();
    addLog('استيراد باستبدال — ' + incoming.length + ' صنف (تجاهل رؤوس/فارغ)');
 } else {
    if (needAdmin()) return;
    const resetActual = !!($('resetActualOnMerge') && $('resetActualOnMerge').checked);
    const willUpdate = [], willAdd = [];
    incoming.forEach(r => {
      const ex = inventoryData.find(i => i.code === r.code);
      if (ex) willUpdate.push({ r, ex }); else willAdd.push(r);
 });

    const countedAffected = resetActual ? willUpdate.filter(({ex}) => ex.isJarded || (ex.counts && Object.keys(ex.counts).length) || Number(ex.actualQuantity) > 0) : [];
    const countedPieces = countedAffected.reduce((a,{ex}) => a + (Number(ex.actualQuantity) || 0), 0);
    const msg = 'هيتم تحديث اسم/مجموعة/كمية السيستم لـ ' + willUpdate.length + ' صنف موجود، وإضافة ' + willAdd.length + ' صنف جديد. ' +
      (resetActual ? 'هيتصفّر الجرد الفعلي للأصناف الموجودة (عدّ جديد).' : 'الجرد الفعلي الحالي للأصناف الموجودة هيفضل زي ما هو — مش هنتلمس عدّة أي حد.') +
      ' تم تجاهل ' + (skippedEmpty+skippedHeader) + ' صف فاضي/رأس.' +
      (countedAffected.length
        ? '<div style="margin-top:.6rem;padding:.6rem;background:#fef2f2;border:1px solid #fecaca;border-radius:.5rem;color:#991b1b;font-weight:700">' +
          '⚠️ انتبه: فيه ' + countedAffected.length + ' صنف متجرد فعلاً بإجمالي ' + fmtQ(countedPieces) +
          ' قطعة — التصفير هيمسح عدّة الناس دي كلها ومش هترجع.<br>العملية دي ملهاش تراجع.</div>'
        : '');
    const updRows = willUpdate.slice(0, 15).map(({r, ex}) =>
      '<tr><td style="padding:.3rem .5rem;border-bottom:1px solid #f1f5f9">' + esc(r.code) + '</td>' +
      '<td style="padding:.3rem .5rem;border-bottom:1px solid #f1f5f9">' + esc(ex.name) + (ex.name !== r.name ? ' → ' + esc(r.name) : '') + '</td>' +
      '<td style="padding:.3rem .5rem;border-bottom:1px solid #f1f5f9;text-align:center">' + fmtQ(ex.systemQuantity) + (ex.systemQuantity !== r.sys ? ' → ' + fmtQ(r.sys) : '') + '</td></tr>'
    ).join('');
    const addRows = willAdd.slice(0, 15).map(r =>
      '<tr><td style="padding:.3rem .5rem;border-bottom:1px solid #f1f5f9">' + esc(r.code) + '</td>' +
      '<td style="padding:.3rem .5rem;border-bottom:1px solid #f1f5f9">' + esc(r.name) + '</td>' +
      '<td style="padding:.3rem .5rem;border-bottom:1px solid #f1f5f9;text-align:center">' + fmtQ(r.sys) + '</td></tr>'
    ).join('');
    let rowsHTML = '<thead><tr style="background:#f8fafc;font-weight:700"><td style="padding:.3rem .5rem">الكود</td><td style="padding:.3rem .5rem">الاسم</td><td style="padding:.3rem .5rem;text-align:center">كمية السيستم</td></tr></thead><tbody>';
    if (willUpdate.length) rowsHTML += '<tr><td colspan="3" style="padding:.3rem .5rem;background:#fef9c3;font-weight:700">🔄 هيتحدّث (' + willUpdate.length + ')</td></tr>' + updRows +
      (willUpdate.length > 15 ? '<tr><td colspan="3" style="padding:.4rem;text-align:center;color:#94a3b8">و ' + (willUpdate.length - 15) + ' صنف تاني...</td></tr>' : '');
    if (willAdd.length) rowsHTML += '<tr><td colspan="3" style="padding:.3rem .5rem;background:#dcfce7;font-weight:700">➕ هيتضاف (' + willAdd.length + ')</td></tr>' + addRows +
      (willAdd.length > 15 ? '<tr><td colspan="3" style="padding:.4rem;text-align:center;color:#94a3b8">و ' + (willAdd.length - 15) + ' صنف تاني...</td></tr>' : '');
    rowsHTML += '</tbody>';
    const ok = await importPreviewDlg('دمج البيانات — معاينة', msg, rowsHTML, 'دمج');
    if (!ok) return;
    let added = 0, updated = 0;
    const changed = [];
    const now = Date.now();
    incoming.forEach(r => {
      const ex = inventoryData.find(i => i.code === r.code);
      if (ex) {
        ex.name = r.name; ex.group = r.group; ex.systemQuantity = r.sys;

        if (resetActual) { ex.actualQuantity = 0; ex.isJarded = false; ex.counts = {}; ex.countedBy = ''; ex.manualQty = false; ex.manualBy = ''; ex.manualAt = 0; ex.manualPrev = ''; }
        ex.editedAt = now;
        calculateRow(ex); updated++;
        changed.push({ code: r.code, name: r.name, group: r.group, sys: r.sys, reset: !!resetActual });
 } else {
        const ns = inventoryData.length ? Math.max.apply(null, inventoryData.map(i => i.serial)) + 1 : 1;
        const nv = { serial: ns, code: r.code, name: r.name, group: r.group, systemQuantity: r.sys, actualQuantity: 0, isJarded: false, difference: -r.sys, status: r.sys === 0 ? 'متساوي' : 'عجز', note: '', countedBy: '', counts: {}, editedAt: now };
        inventoryData.push(nv);
        added++;

        changed.push({ code: r.code, name: r.name, group: r.group, sys: r.sys, reset: true });
 }
 });
    renumberSerials();
    updateTable(); updateStats(); renderCategoryButtons();

    pushMergeMeta(changed).then(okServer => {
      if (!okServer) toast('⚠️ اتدمج عندك بس السيرفر لم يستجب — حاول تاني لما النت يرجع', 'error');
 });
    markInventoryUploaded();
    toast('تم الدمج: ' + added + ' جديد + ' + updated + ' محدّث (تجاهل ' + (skippedEmpty+skippedHeader) + ' فارغ/رأس)', 'success');
    addLog('دمج ملف — ' + added + ' جديد / ' + updated + ' محدّث');
 }
  closeModal('columnSelectors');
}

function exportToExcel(){
  if (needAdmin()) return;
  if (!inventoryData.length) { toast('لا توجد بيانات للتصدير', 'warning'); return; }
  const totalS = inventoryData.reduce((a, i) => a + i.systemQuantity, 0);
  const totalA = inventoryData.reduce((a, i) => a + i.actualQuantity, 0);
  let rows = '';
  inventoryData.forEach(i => {
    const bg = i.difference > 0 ? '#dcfce7' : i.difference < 0 ? '#fee2e2' : '#ffffff';
    rows += '<tr style="background:' + bg + '">' +
      '<td>' + i.serial + '</td><td>' + esc(i.code) + '</td><td>' + esc(i.name) + '</td><td>' + esc(i.group) + '</td>' +
      '<td>' + fmtQ(i.systemQuantity) + '</td><td>' + fmtQ(i.actualQuantity) + '</td><td><b>' + fmtQ(i.difference) + '</b></td>' +
      '<td>' + esc(i.status) + '</td><td>' + esc(i.countedBy || '—') + '</td><td>' + esc(i.note) + '</td></tr>';
 });
  const html = '<html dir="rtl"><head><meta charset="utf-8"></head><body>' +
    '<h3 style="font-family:tahoma">تقرير جرد الأصناف — بيمبو ستور</h3>' +
    '<table border="1" cellspacing="0" cellpadding="5" style="border-collapse:collapse;font-family:tahoma;font-size:11pt">' +
    '<thead><tr style="background:#1e293b;color:#fff"><th>م</th><th>الكود</th><th>اسم الصنف</th><th>المجموعة</th><th>السيستم</th><th>الفعلي</th><th>الفرق</th><th>الحالة</th><th>بواسطة</th><th>ملاحظات</th></tr></thead>' +
    '<tbody>' + rows + '</tbody>' +
    '<tfoot><tr style="background:#f1f5f9;font-weight:bold"><td colspan="4">الإجماليات</td><td>' + fmtQ(totalS) + '</td><td>' + fmtQ(totalA) + '</td><td>' + fmtQ(totalA - totalS) + '</td><td colspan="2">' + inventoryData.length + ' صنف</td></tr></tfoot>' +
    '</table></body></html>';
  downloadBlob(new Blob(['﻿' + html], { type: 'application/vnd.ms-excel' }), 'Jard-' + stamp() + '.xls');
  addLog('تصدير إكسيل — ' + inventoryData.length + ' صنف');
  toast('تم التصدير بنجاح', 'success');
}

function csvEscape(v){
  const s = String(v == null ? '' : v);
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}
function exportToCSV(){
  if (needAdmin()) return;
  if (!inventoryData.length) { toast('لا توجد بيانات للتصدير', 'warning'); return; }
  const headers = ['م','الكود','اسم الصنف','المجموعة','السيستم','الفعلي','الفرق','الحالة','بواسطة','ملاحظات'];
  let csv = headers.map(csvEscape).join(',') + '\r\n';
  inventoryData.forEach(i => {
    csv += [i.serial, i.code, i.name, i.group, fmtQ(i.systemQuantity), fmtQ(i.actualQuantity), fmtQ(i.difference), i.status, i.countedBy || '', i.note].map(csvEscape).join(',') + '\r\n';
 });
  downloadBlob(new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' }), 'Jard-' + stamp() + '.csv');
  addLog('تصدير CSV — ' + inventoryData.length + ' صنف');
  toast('تم تصدير CSV بنجاح', 'success');
}
function downloadBlob(blob, name){
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}

let repUser = '';

function reportUsers(){
  const set = {};
  inventoryData.forEach(i => { if (i.counts && typeof i.counts === 'object') Object.keys(i.counts).forEach(u => { set[u] = 1; }); });
  usersList.forEach(u => { if (u && u.name) set[u.name] = set[u.name] || 1; });
  const rank = n => getUserRole(n) === 'admin' ? 0 : getUserRole(n) === 'supervisor' ? 1 : 2;
  return Object.keys(set).sort((a,b) => rank(a) - rank(b) || a.localeCompare(b,'ar'));
}
const REPORTS = [
  { id:'full',    name:'تقرير الجرد الكامل',        desc:'كل الأصناف: جرد الأدمن في عمود واليوزر في عمود، والفرق والحالة' },
  { id:'detail',  name:'تفاصيل الجرد بالمستخدمين',  desc:'على مستوى الصنف: كل مستخدم (أدمن/يوزر) جرد كام قطعة' },
  { id:'byUser',  name:'تقرير نهاية اليوم — بالمستخدمين', desc:'كل مستخدم جرد كام صنف وكام قطعة' },
  { id:'deficit', name:'تقرير العجز',               desc:'الأصناف اللي فعليها أقل من السيستم بس' },
  { id:'surplus', name:'تقرير الزيادة',             desc:'الأصناف اللي فعليها أكتر من السيستم بس' },
  { id:'uncounted', name:'تقرير الأصناف اللي مجردتش', desc:'الأصناف اللي محدش جردها لسه' }
];

function reportWhen(){
  const d = new Date();
  return d.getFullYear() + '-' + pad2(d.getMonth()+1) + '-' + pad2(d.getDate()) + '  ' +
         pad2(d.getHours()) + ':' + pad2(d.getMinutes());
}

function buildReport(kind){
  const when = reportWhen();
  const dt = ($('currentDateTime') && $('currentDateTime').value || '').replace('T',' ');
  const base = { subtitle:'تاريخ الجرد: ' + (dt || '—') + '   •   وقت التقرير: ' + when };

  if (kind === 'byUser') {

    const per = {};
    inventoryData.forEach(it => {
      const cs = it.counts && typeof it.counts === 'object' ? it.counts : null;
      if (cs && Object.keys(cs).length) {
        Object.keys(cs).forEach(u => {
          const q = Number(cs[u]) || 0;
          if (!per[u]) per[u] = { items:0, qty:0 };
          if (q > 0) per[u].items++;
          per[u].qty += q;
        });
      } else if (it.countedBy && Number(it.actualQuantity) > 0) {

        const u = it.countedBy;
        if (!per[u]) per[u] = { items:0, qty:0 };
        per[u].items++; per[u].qty += Number(it.actualQuantity) || 0;
      }
    });
    let names = Object.keys(per).sort((a,b) => per[b].qty - per[a].qty);
    if (repUser) names = names.filter(u => u === repUser);
    const rows = names.map((u,i) => [i+1, u, getUserRole(u) === 'admin' ? 'مسؤول' : getUserRole(u) === 'supervisor' ? 'مشرف' : 'مستخدم', per[u].items, fmtQ(per[u].qty)]);
    const ti = names.reduce((a,u) => a + per[u].items, 0);
    const tq = names.reduce((a,u) => a + per[u].qty, 0);
    return Object.assign(base, {
      title:'تقرير نهاية اليوم — بالمستخدمين',
      headers:['م','المستخدم','الصلاحية','عدد الأصناف','إجمالي القطع'],
      rows, foot:['الإجمالي', names.length + ' مستخدم', '', fmtQ(ti), fmtQ(tq)]
    });
  }

  if (kind === 'detail') {
    const allUsers = reportUsers();
    const shownUsers = repUser ? allUsers.filter(u => u === repUser) : allUsers;
    let items = inventoryData.filter(i => i.isJarded && i.counts && Object.keys(i.counts).length);
    if (repUser) items = items.filter(i => Number(i.counts[repUser]) > 0);
    const uQty = (i,u) => Number(i.counts && i.counts[u]) || 0;
    const headers = ['م','الكود','اسم الصنف','المجموعة','رصيد السيستم'].concat(shownUsers).concat(['الإجمالي','الفرق','الحالة']);
    const rows = items.map((i,idx) => {
      const row = [idx+1, i.code, i.name, i.group, fmtQ(i.systemQuantity)];
      shownUsers.forEach(u => row.push(fmtQ(uQty(i,u))));
      row.push(fmtQ(i.actualQuantity), fmtQ(i.difference), i.status);
      return row;
    });
    const sumSys = items.reduce((a,i)=>a+(Number(i.systemQuantity)||0),0);
    const sumAct = items.reduce((a,i)=>a+(Number(i.actualQuantity)||0),0);
    const foot = ['الإجمالي', items.length + ' صنف','','', fmtQ(sumSys)];
    shownUsers.forEach(u => foot.push(fmtQ(items.reduce((a,i)=>a+uQty(i,u),0))));
    foot.push(fmtQ(sumAct), fmtQ(sumAct-sumSys), '');
    return Object.assign(base, { title:'تفاصيل الجرد بالمستخدمين' + (repUser ? ' — ' + repUser : ''), headers, rows, foot });
  }

  let items;
  if (kind === 'deficit')        items = inventoryData.filter(i => i.difference < 0);
  else if (kind === 'surplus')   items = inventoryData.filter(i => i.difference > 0);
  else if (kind === 'uncounted') items = inventoryData.filter(i => !(Number(i.actualQuantity) > 0));
  else                           items = inventoryData.slice();

  if (repUser && kind !== 'uncounted') items = items.filter(i => Number(i.counts && i.counts[repUser]) > 0);

  if (kind === 'full' && repUser) {
    const headers = ['م','الكود','اسم الصنف','المجموعة','السيستم','جرد '+repUser,'الإجمالي','الفرق','الحالة','بواسطة','ملاحظات'];
    const rows = items.map(i => [ i.serial, i.code, i.name, i.group, fmtQ(i.systemQuantity), fmtQ(Number(i.counts&&i.counts[repUser])||0), fmtQ(i.actualQuantity), fmtQ(i.difference), i.status, i.countedBy||'—', i.note||'' ]);
    const sum = f => items.reduce((a,i)=>a+(Number(i[f])||0),0);
    const uq = items.reduce((a,i)=>a+(Number(i.counts&&i.counts[repUser])||0),0);
    return Object.assign(base, { title:'تقرير الجرد الكامل — '+repUser, headers, rows,
      foot:['الإجمالي', items.length+' صنف','','', fmtQ(sum('systemQuantity')), fmtQ(uq), fmtQ(sum('actualQuantity')), fmtQ(sum('actualQuantity')-sum('systemQuantity')),'','',''] });
  }

  if (kind === 'full') {
    const adminQty = i => {
      let s = 0; const c = (i.counts && typeof i.counts === 'object') ? i.counts : {};
      Object.keys(c).forEach(n => { if (getUserRole(n) === 'admin' && Number(c[n]) > 0) s += Number(c[n]); });
      return s;
    };
    const userQty = i => {
      let s = 0; const c = (i.counts && typeof i.counts === 'object') ? i.counts : {};
      Object.keys(c).forEach(n => { if (getUserRole(n) !== 'admin' && Number(c[n]) > 0) s += Number(c[n]); });
      return s;
    };
    const headers = ['م','الكود','اسم الصنف','المجموعة','رصيد السيستم','الادمن','اليوزر','الفرق','الحالة'];
    const rows = items.map(i => {
      const a = adminQty(i), uq = userQty(i);
      const diff = (a + uq) - (Number(i.systemQuantity) || 0);
      return [ i.serial, i.code, i.name, i.group, fmtQ(i.systemQuantity), fmtQ(a), fmtQ(uq), fmtQ(diff), i.status ];
    });
    const sumSys = items.reduce((x,i) => x + (Number(i.systemQuantity) || 0), 0);
    const sumA = items.reduce((x,i) => x + adminQty(i), 0);
    const sumU = items.reduce((x,i) => x + userQty(i), 0);
    return Object.assign(base, {
      title:'تقرير الجرد الكامل',
      headers, rows,
      foot:['الإجمالي', items.length + ' صنف', '', '', fmtQ(sumSys), fmtQ(sumA), fmtQ(sumU), fmtQ(sumA + sumU - sumSys), '']
    });
  }

  const titles = { full:'تقرير الجرد الكامل', deficit:'تقرير العجز', surplus:'تقرير الزيادة', uncounted:'تقرير الأصناف اللي مجردتش' };
  const rows = items.map(i => [
    i.serial, i.code, i.name, i.group,
    fmtQ(i.systemQuantity), fmtQ(i.actualQuantity), fmtQ(i.difference),
    i.status, i.countedBy || '—', i.note || ''
  ]);
  const sum = f => items.reduce((a,i) => a + (Number(i[f]) || 0), 0);
  return Object.assign(base, {
    title: titles[kind] || 'تقرير الجرد',
    headers:['م','الكود','اسم الصنف','المجموعة','السيستم','الفعلي','الفرق','الحالة','بواسطة','ملاحظات'],
    rows,
    foot:['الإجمالي', items.length + ' صنف', '', '', fmtQ(sum('systemQuantity')), fmtQ(sum('actualQuantity')), fmtQ(sum('actualQuantity') - sum('systemQuantity')), '', '', '']
  });
}

function reportToExcel(kind){
  if (needAdmin()) return;
  const r = buildReport(kind);
  if (!r.rows.length) { toast('مفيش بيانات للتقرير ده', 'warning'); return; }
  const th = r.headers.map(h => '<th style="background:#1e293b;color:#fff;padding:6px;border:1px solid #94a3b8">' + esc(h) + '</th>').join('');
  const tr = r.rows.map(row =>
    '<tr>' + row.map(c => '<td style="padding:5px;border:1px solid #cbd5e1">' + esc(c == null ? '' : c) + '</td>').join('') + '</tr>'
  ).join('');
  const tf = r.foot ? '<tr style="background:#f1f5f9;font-weight:bold">' + r.foot.map(c => '<td style="padding:6px;border:1px solid #94a3b8">' + esc(c == null ? '' : c) + '</td>').join('') + '</tr>' : '';
  const html = '<html dir="rtl"><head><meta charset="utf-8"></head><body>' +
    '<h3 style="font-family:tahoma">' + esc(r.title) + '</h3>' +
    '<div style="font-family:tahoma;font-size:10pt;color:#475569">' + esc(r.subtitle) + '</div><br>' +
    '<table border="1" cellspacing="0" cellpadding="4" style="border-collapse:collapse;font-family:tahoma;font-size:10pt">' +
    '<thead><tr>' + th + '</tr></thead><tbody>' + tr + '</tbody><tfoot>' + tf + '</tfoot></table></body></html>';
  downloadBlob(new Blob(['\uFEFF' + html], { type:'application/vnd.ms-excel' }), 'Jard-' + kind + '-' + stamp() + '.xls');
  addLog('تصدير تقرير إكسيل: ' + r.title);
  toast('تم تصدير التقرير إكسيل', 'success');
}

function reportToPDF(kind){
  if (needAdmin()) return;
  const r = buildReport(kind);
  if (!r.rows.length) { toast('مفيش بيانات للتقرير ده', 'warning'); return; }
  const th = r.headers.map(h => '<th>' + esc(h) + '</th>').join('');
  const tr = r.rows.map(row =>
    '<tr>' + row.map(c => '<td>' + esc(c == null ? '' : c) + '</td>').join('') + '</tr>'
  ).join('');
  const tf = r.foot ? '<tfoot><tr>' + r.foot.map(c => '<td>' + esc(c == null ? '' : c) + '</td>').join('') + '</tr></tfoot>' : '';
  const doc = '<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="utf-8">' +
    '<title>' + esc(r.title) + '</title><style>' +
    '@page{ size:A4 landscape; margin:12mm; }' +
    'body{ font-family:"Segoe UI",Tahoma,Arial,sans-serif; color:#0f172a; }' +
    'h1{ font-size:18pt; margin:0 0 4px; }' +
    '.sub{ font-size:9.5pt; color:#475569; margin-bottom:10px; }' +
    'table{ width:100%; border-collapse:collapse; font-size:9pt; }' +
    'th{ background:#1e293b; color:#fff; padding:6px; border:1px solid #94a3b8; }' +
    'td{ padding:5px; border:1px solid #cbd5e1; }' +
    'tfoot td{ background:#f1f5f9; font-weight:700; }' +
    'tr:nth-child(even) td{ background:#f8fafc; }' +
    '</style></head><body>' +
    '<h1>' + esc(r.title) + '</h1><div class="sub">' + esc(r.subtitle) + '</div>' +
    '<table><thead><tr>' + th + '</tr></thead><tbody>' + tr + '</tbody>' + tf + '</table>' +
    '</body></html>';

  const old = document.getElementById('reportPrintFrame');
  if (old) old.remove();
  const fr = document.createElement('iframe');
  fr.id = 'reportPrintFrame';
  fr.setAttribute('aria-hidden', 'true');
  fr.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden';
  document.body.appendChild(fr);
  const d = fr.contentDocument || fr.contentWindow.document;
  d.open(); d.write(doc); d.close();

  setTimeout(() => {
    try { fr.contentWindow.focus(); fr.contentWindow.print(); }
    catch(e){ toast('مقدرتش أفتح نافذة الطباعة — جرّب تاني', 'error'); }
  }, 300);
  addLog('تصدير تقرير PDF: ' + r.title);
}

function wipeWarningHTML(scope){
  const items = scope || inventoryData;
  const hit = items.filter(i => i.isJarded || (i.counts && Object.keys(i.counts).length) || Number(i.actualQuantity) > 0);
  if (!hit.length) return '';
  const pieces = hit.reduce((a,i) => a + (Number(i.actualQuantity) || 0), 0);
  const who = {};
  hit.forEach(i => {
    const cs = i.counts && Object.keys(i.counts).length ? i.counts : (i.countedBy ? { [i.countedBy]: i.actualQuantity } : null);
    if (cs) Object.keys(cs).forEach(u => { who[u] = (who[u] || 0) + (Number(cs[u]) || 0); });
  });
  const names = Object.keys(who);
  return '<div style="margin-top:.6rem;padding:.65rem;background:#fef2f2;border:1px solid #fecaca;border-radius:.5rem;color:#991b1b">' +
    '<b>⚠️ العملية دي هتمسح عدّة ناس:</b><br>' +
    hit.length + ' صنف متجرد بإجمالي <b>' + fmtQ(pieces) + '</b> قطعة' +
    (names.length ? '<br>حسب المستخدم: ' + names.map(u => esc(u) + ' (' + fmtQ(who[u]) + ')').join('، ') : '') +
    '<br><b>العملية ملهاش تراجع — التراجع اتلغى من البرنامج.</b></div>';
}

function openReports(){
  if (needAdmin()) return;
  const cards = REPORTS.map(r =>
    '<div class="rep-card">' +
      '<div class="rep-info"><div class="rep-name">' + esc(r.name) + '</div><div class="rep-desc">' + esc(r.desc) + '</div></div>' +
      '<div class="rep-acts">' +
        '<button class="mbtn primary" data-rep-pdf="' + r.id + '">📄 PDF</button>' +
        '<button class="mbtn" data-rep-xls="' + r.id + '">📊 إكسيل</button>' +
      '</div>' +
    '</div>'
  ).join('');
  const opts = ['<option value=""' + (repUser ? '' : ' selected') + '>الكل (كل المستخدمين)</option>']
    .concat(usersList.filter(u => u && u.name).map(u =>
      '<option value="' + esc(u.name) + '"' + (repUser === u.name ? ' selected' : '') + '>' + esc(u.name) + (getUserRole(u.name) === 'admin' ? ' (أدمن)' : '') + '</option>'))
    .join('');
  const body =
    '<div style="display:flex;align-items:center;gap:.5rem;margin-bottom:.6rem;flex-wrap:wrap">' +
      '<label style="font-weight:700;font-size:.85rem">👤 المسؤول عن الجرد:</label>' +
      '<select id="repUserSel" class="inp" style="flex:1;min-width:140px">' + opts + '</select>' +
    '</div>' +
    '<div class="hint" style="font-size:.8rem;margin-bottom:.6rem">كل التقارير بتتحسب من البيانات الحالية على طول. اختار المستخدم عشان تشوف جرد إيه بالظبط قبل ما تصدّر.</div>' + cards;
  showModal('التقارير', body, [{ label:'إغلاق', kind:'ghost' }]);
  const ov = document.querySelector('.modal-overlay:last-of-type');
  if (!ov) return;
  const sel = ov.querySelector('#repUserSel');
  if (sel) sel.addEventListener('change', () => { repUser = sel.value; });
  ov.addEventListener('click', e => {
    const pdf = e.target.closest('[data-rep-pdf]');
    const xls = e.target.closest('[data-rep-xls]');
    if (pdf) reportToPDF(pdf.getAttribute('data-rep-pdf'));
    else if (xls) reportToExcel(xls.getAttribute('data-rep-xls'));
  });
}

function prepareAndPrint(){
  if (needAdmin()) return;
  const anySel = document.querySelectorAll('#tableBody .item-checkbox:checked').length > 0;
  document.body.classList.toggle('print-selection', anySel);
  $('printDate').textContent = 'تاريخ الجرد: ' + (($('currentDateTime').value || '').replace('T', ' ')) + (userFilter ? ' — المستخدم: ' + userFilter : '');
  const rows = anySel ? inventoryData.filter(i => selectedSerials.has(i.serial)) : getFiltered();

  const q = i => i.actualQuantity;
  $('footSys').textContent = fmtQ(rows.reduce((a, i) => a + i.systemQuantity, 0));
  $('footAct').textContent = fmtQ(rows.reduce((a, i) => a + q(i), 0));
  $('footDiff').textContent = fmtQ(rows.reduce((a, i) => a + (q(i) - i.systemQuantity), 0));
  $('footCount').textContent = rows.length + ' صنف';
  $('tableFoot').style.display = '';

  const wasAll = printAllRows;
  printAllRows = true;
  updateTable();
  window.onafterprint = () => { printAllRows = wasAll; updateTable(); window.onafterprint = null; };
  window.print();

  setTimeout(() => { if (printAllRows && !window.onafterprint) { printAllRows = wasAll; updateTable(); } }, 1500);
}

function addLog(action){
  const d = new Date();
  logBook.unshift({ a: action, t: d.getFullYear()+'-'+pad2(d.getMonth()+1)+'-'+pad2(d.getDate())+' '+pad2(d.getHours())+':'+pad2(d.getMinutes()) });
  if (logBook.length > 50) logBook.length = 50;
  store.setItem('logBook', JSON.stringify(logBook));
}
function showLog(){
  const html = logBook.length
    ? logBook.map(l => '<div class="log-item"><span>' + esc(l.a) + '</span><span class="lt">' + esc(l.t) + '</span></div>').join('')
    : '<div style="color:#94a3b8;font-size:.85rem;text-align:center;padding:1rem">لا يوجد سجل بعد</div>';
  showModal('سجل العمليات (آخر 50)', '<div style="max-height:50vh;overflow-y:auto">' + html + '</div>', [{ label: 'إغلاق', kind: 'ghost' }]);
}

function showUserReport(){
  const byUser = {};
  inventoryData.forEach(i => {
    const cs = i.counts || {};
    const users = Object.keys(cs).length ? Object.keys(cs) : (i.isJarded ? [i.countedBy || 'بدون مستخدم'] : []);
    users.forEach(w => {
      const q = cs[w] !== undefined ? Number(cs[w]) : (i.countedBy === w ? Number(i.actualQuantity) : 0);
      if (!q && q !== 0) return;
      byUser[w] = byUser[w] || { count: 0, qty: 0 };
      byUser[w].count++;
      byUser[w].qty += Math.abs(q || 0);
 });
 });
  const names = Object.keys(byUser);
  let html;
  if (!names.length) {
    html = '<div style="color:#94a3b8;font-size:.85rem;text-align:center;padding:1rem">لم يتم جرد أي صنف بعد</div>';
 } else {
    html = names.sort((a, b) => byUser[b].count - byUser[a].count).map(n =>
      '<div class="urep-row">' +
      '<span class="who">👤 ' + esc(n) + '<div class="meta">إجمالي القطع: ' + fmtQ(byUser[n].qty) + '</div></span>' +
      '<span style="display:flex;align-items:center;gap:.4rem">' +
      '<span class="cnt">' + byUser[n].count + ' صنف</span>' +
      '<button class="view" data-u="' + esc(n) + '">عرض الأصناف</button>' +
      '</span></div>'
    ).join('');
 }
  const m = showModal('📊 تقرير الجرد حسب المستخدم', '<div style="max-height:55vh;overflow-y:auto">' + html + '</div>', [{ label: 'إغلاق', kind: 'ghost' }]);
  m.body.querySelectorAll('.view').forEach(b => b.onclick = () => {
    const u = b.dataset.u === 'بدون مستخدم' ? '' : b.dataset.u;
    if (u) {
      setUserFilter(u);
      m.close();
      closeSidebar();
      toast('يعرض الآن أصناف "' + u + '" فقط — اضغط الشريط البرتقالي لإلغاء الفلتر', 'info');
      updateStatsForUser(u);
 }
 });
}
function updateStatsForUser(name){

  setTimeout(() => {
    const items = inventoryData.filter(i => i.countedBy === name && Number(i.actualQuantity) > 0);
    toast(name + ' جرد ' + items.length + ' صنف من أصل ' + inventoryData.length, 'info');
 }, 50);
}

async function loadCountLog(){
  const box = document.getElementById('countLogBox');
  if (!box) return;
  box.innerHTML = '<div style="text-align:center;color:#94a3b8;padding:1rem">⏳ جاري التحميل...</div>';
  if (!syncOn || !db) { box.innerHTML = '<div style="text-align:center;color:#ef4444;padding:1rem">لازم تكون متصل بالإنترنت</div>'; return; }
  try {
    const snap = await db.ref(fbPath() + '/notifs').orderByKey().limitToLast(100).get();
    const data = snap.val() || {};
    const items = Object.values(data).filter(Boolean).sort((a,b)=> (b.ts||0)-(a.ts||0));
    if (!items.length) { box.innerHTML = '<div style="text-align:center;color:#94a3b8;padding:1rem">لا يوجد سجل جرد بعد</div>'; return; }
    let html = '<table id="countLogTable" style="width:100%;font-size:.75rem;border-collapse:collapse"><thead><tr style="background:#1e293b;color:#fff"><th style="padding:6px">الوقت والتاريخ</th><th style="padding:6px">المستخدم</th><th style="padding:6px">كود الصنف</th><th style="padding:6px">اسم الصنف</th><th style="padding:6px">الكمية</th></tr></thead><tbody>';
    items.forEach(ev=>{
      const d = ev.ts ? new Date(ev.ts) : new Date();
      const time = d.toLocaleString('ar-EG', { hour12:false });
      html += '<tr style="border-bottom:1px dashed #e2e8f0"><td style="padding:5px;direction:ltr;text-align:center">' + time + '</td><td style="padding:5px">👤 ' + esc(ev.by||'') + '</td><td style="padding:5px;font-family:monospace">' + esc(ev.code||'') + '</td><td style="padding:5px">' + esc(ev.name||'') + '</td><td style="padding:5px;font-weight:800;text-align:center;color:#16a34a">' + fmtQ(ev.qty||1) + '</td></tr>';
 });
    html += '</tbody></table>';
    box.innerHTML = html;
 } catch(e){ box.innerHTML = '<div style="color:#ef4444">خطأ: ' + esc(e.message||'') + '</div>'; }
}
async function clearCountLog(){
  if (needAdmin()) return;
  const ok = await confirmDlg('مسح سجل الجرد؟', 'سيتم مسح سجل التتبع (jard/notifs) نهائياً من السيرفر. بيانات الجرد نفسها مش هتتمسح.', 'مسح السجل', true);
  if (!ok) return;
  let okServer = false, failReason = '';
  try {
    if (syncOn && db) {
      await db.ref(fbPath() + '/notifs').remove();
      okServer = true;
 } else {
      const cfg = effectiveCfg();
      if (cfg && cfg.databaseURL) {
        const base = cfg.databaseURL.replace(/\/$/, '');
        const tok = '?auth=' + encodeURIComponent(await getAnonIdToken(cfg));
        const r = await fetch(base + '/' + fbPath() + '/notifs.json' + tok, { method: 'DELETE' });
        okServer = r.ok;
        if (!okServer) failReason = 'HTTP ' + r.status;
 } else {
        failReason = 'مفيش اتصال بقاعدة البيانات دلوقتي';
 }
 }
 } catch(e) { failReason = e && e.message ? e.message : String(e); }
  if (okServer) {
    toast('تم مسح سجل الجرد فعلياً من السيرفر', 'success');
    addLog('مسح سجل الجرد');
 } else {
    toast('⚠️ فشل مسح السجل من السيرفر (' + (failReason || 'خطأ اتصال') + ') — حاول تاني لما النت يرجع', 'error');
 }
  loadCountLog();
}
function exportCountLog(){
  if (!syncOn || !db) return;
  db.ref(fbPath() + '/notifs').orderByKey().limitToLast(200).get().then(snap=>{
    const data = snap.val()||{};
    const items = Object.values(data).sort((a,b)=> (a.ts||0)-(b.ts||0));
    let csv = 'الوقت والتاريخ,المستخدم,كود الصنف,اسم الصنف,الكمية\n';
    items.forEach(ev=>{
      const d = ev.ts ? new Date(ev.ts).toISOString() : '';
      csv += '"' + d + '","' + (ev.by||'') + '","' + (ev.code||'') + '","' + (ev.name||'').replace(/"/g,'""') + '",' + (ev.qty||1) + '\n';
 });
    const blob = new Blob(['\ufeff' + csv], {type:'text/csv;charset=utf-8;'});
    const a = document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='jard-log-' + stamp() + '.csv'; a.click();
 });
}

function exportCountLogPDF(){
  if (!syncOn || !db) return;
  db.ref(fbPath() + '/notifs').orderByKey().limitToLast(200).get().then(snap=>{
    const data = snap.val()||{};
    const items = Object.values(data).sort((a,b)=> (b.ts||0)-(a.ts||0));
    let rows = '';
    items.forEach(ev=>{
      const d = ev.ts ? new Date(ev.ts) : new Date();
      const time = d.toLocaleString('ar-EG', { hour12:false });
      rows += '<tr><td>' + esc(time) + '</td><td>' + esc(ev.by||'') + '</td><td>' + esc(ev.code||'') + '</td><td>' + esc(ev.name||'') + '</td><td>' + fmtQ(ev.qty||1) + '</td></tr>';
 });
    const html = '<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><title>سجل الجرد</title><style>' +
      '@page{ size:A4; margin:14mm; } body{ font-family:Cairo,Tahoma,Arial,sans-serif; direction:rtl; } ' +
      'h1{ font-size:18px; text-align:center; margin-bottom:4px; } .sub{ text-align:center; color:#64748b; font-size:11px; margin-bottom:16px; } ' +
      'table{ width:100%; border-collapse:collapse; font-size:12px; } th,td{ border:1px solid #cbd5e1; padding:6px 8px; text-align:center; } ' +
      'th{ background:#1f2937; color:#fff; }' +
      '</style></head><body>' +
      '<h1>سجل الجرد</h1><div class="sub">تاريخ التصدير: ' + new Date().toLocaleString('ar-EG', { hour12:false }) + '</div>' +
      '<table><thead><tr><th>الوقت والتاريخ</th><th>المستخدم</th><th>كود الصنف</th><th>اسم الصنف</th><th>الكمية</th></tr></thead><tbody>' + rows + '</tbody></table>' +
      '</body></html>';
    const w = window.open('', '_blank');
    if (!w) { toast('المتصفح منع فتح نافذة الطباعة — اسمح بها وحاول تاني', 'error'); return; }
    w.document.write(html);
    w.document.close();
    w.onload = () => { w.focus(); w.print(); };
 });
}

async function factoryReset(){
  const c1 = await confirmDlg('إعادة ضبط مصنع', '⚠️ دي عملية نهائية — هيتم مسح كل بيانات البرنامج من على السيرفر بالكامل (الأصناف + المستخدمين + الجلسات + سجل الجرد) من كل الأجهزة، والبرنامج هيرجع زي أول يوم. بيانات الربط (Firebase) فقط هي اللي هتفضل محفوظة. متأكد؟', 'نعم — امسح كل حاجة', true);
  if (!c1) return;
  const okPass = await inputDlg('تأكيد كلمة مرور admin', 'اكتب كلمة المرور للمتابعة', true);
  if (okPass === null) return;

  const defaultStillActive = !adminHash || (await verifyPass(DEFAULT_ADMIN.pass, adminHash)) !== null;
  const okDefault = defaultStillActive && okPass === DEFAULT_ADMIN.pass;
  if (!okDefault && !(await verifyPass(okPass, adminHash))) { toast('كلمة مرور غلط — مفيش إعادة ضبط', 'error'); return; }

  toast('⏳ جاري مسح البيانات من السيرفر — استنى ثواني...', 'info');

  const nodesToDelete = ['items','notifs','sessions','auditLog'];
  let serverOk = true, failReason = '';

  async function deleteNode(path){
    if (syncOn && db) {
      try { await db.ref(path).remove(); return true; } catch(e){}
 }
    try {
      const cfg = effectiveCfg();
      if (cfg && cfg.databaseURL) {
        const base = cfg.databaseURL.replace(/\/$/, '');
        const tok = '?auth=' + encodeURIComponent(await getAnonIdToken(cfg));
        const r = await fetch(base + path + '.json' + tok, { method: 'DELETE' });
        return r.ok;
 }
 } catch(e){}
    return false;
 }

  for (const n of nodesToDelete){
    const ok = await deleteNode('/' + fbRoot() + '/' + n);
    if (!ok) { serverOk = false; failReason = 'فشل مسح ' + n; }
 }

  let keepConfig = null, keepConfigRev = null;
  try {
    if (syncOn && db) {
      const snap = await db.ref(fbRoot() + '/meta').get();
      const mv = snap.val() || {};
      keepConfig = mv.config || null;
      keepConfigRev = mv.configRev || null;
 }
 } catch(e){}
  const metaOk = await deleteNode('/' + fbRoot() + '/meta');
  if (!metaOk) serverOk = false;

  try {
    if (syncOn && db) {
      const toSet = { setupDone: true };
      if (keepConfig) toSet.config = keepConfig;
      if (keepConfigRev) toSet.configRev = keepConfigRev;
      await db.ref(fbRoot() + '/meta').update(toSet);
 }
 } catch(e){}

  let serverWipeTs = Date.now();
  try {
    if (syncOn && db) {
      const wipeRef = db.ref(fbRoot() + '/meta/forceWipe');
      await wipeRef.set(firebase.database.ServerValue.TIMESTAMP);
      try {
        const s = await wipeRef.get();
        if (s.exists()) serverWipeTs = Number(s.val()) || serverWipeTs;
 } catch(e){}
 }
 } catch(e){}

  let savedCfg = null;
  try { savedCfg = store.getItem('firebaseCfg'); } catch(e){}
  try {
    inventoryData = [];
    usersList = [];
    adminHash = '';
    setupDone = true;
    selectedSerials.clear();
    logBook = [];
    store.clear();
    store.setItem('lastForceWipe', String(serverWipeTs));
    if (savedCfg) store.setItem('firebaseCfg', savedCfg);

    sessionStorage.setItem('forceWipeHandled_' + serverWipeTs, '1');
 } catch(e){}
  if (serverOk) {
    toast('💥 تمت إعادة ضبط المصنع - اتمسح كل شيء (الأصناف + المستخدمين) من السيرفر والكاش', 'success');
 } else {
    toast('⚠️ اتمسح عندك بس السيرفر لم يستجب (' + (failReason || 'خطأ اتصال') + ') — البيانات القديمة ممكن ترجع من أي جهاز تاني متصل. جرب تاني لما النت يرجع', 'error');
 }
  setTimeout(() => location.reload(), 1000);
}

function setHead(icon, color, title, sub){
  return '<div class="set-card-head"><span class="set-icon" style="background:' + color + '">' + icon + '</span>' +
    '<div><div class="set-card-title">' + title + '</div>' + (sub ? '<div class="set-card-sub">' + sub + '</div>' : '') + '</div></div>';
}
const IC = {
  cloud: '<svg viewBox="0 0 24 24"><path d="M17.5 19a4.5 4.5 0 0 0 .42-8.98 6 6 0 0 0-11.7-1.62A4 4 0 0 0 6 19z"/></svg>',
  users: '<svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
  image: '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>',
  shield: '<svg viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
  save: '<svg viewBox="0 0 24 24"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>',
  phone: '<svg viewBox="0 0 24 24"><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>',
  office: '<svg viewBox="0 0 24 24"><path d="M3 21h18M5 21V7l7-4 7 4v14M9 10h1M9 14h1M14 10h1M14 14h1M10 21v-4h4v4"/></svg>'
};

async function openSettings(){
  if (loginRequired()) {
    if (!isAdmin()) {
      const ok = await ensureAdmin();
      if (!ok) { toast('الإعدادات للمسؤول فقط', 'error'); return; }
 } else if (!localAdminVerified) {

      const ok = await ensureAdmin();
      if (!ok) { toast('لازم تأكيد كلمة مرور admin قبل فتح الإعدادات', 'error'); return; }
 }
 }
  const cfg = effectiveCfg();
  const body =
    '<div class="set-tabs">' +
    '<button class="set-tab active" data-tab="users">👥 المستخدمون</button>' +
    '<button class="set-tab" data-tab="notifs">🔔 الإشعارات</button>' +
    '<button class="set-tab" data-tab="sync">🔌 الاتصال</button>' +
    '<button class="set-tab" data-tab="log">📜 سجل الجرد</button><button class="set-tab" data-tab="security">🛠️ النظام</button>' +
    '</div>' +

    '<div class="set-pane active" data-pane="users"><div class="set-card">' +
    setHead(IC.users, '#16a34a', 'المستخدمون وكلمات المرور', 'كل واحد يدخل بيوزر وباسورد خاصين به — وبحساب واحد بس على جهاز واحد في نفس الوقت') +
    '<div class="add-user-card">' +
    '<div class="add-user-title">➕ إضافة مستخدم جديد</div>' +
    '<div class="add-user-grid">' +
    '<div class="fld"><label>اسم المستخدم</label><input id="newUserName" placeholder="مثال: ahmed" autocomplete="off"></div>' +
    '<div class="fld"><label>كلمة المرور</label><input id="newUserPass" type="password" placeholder="••••" autocomplete="new-password" dir="auto" autocapitalize="off" autocorrect="off" spellcheck="false"></div>' +
    '<div class="fld"><label>الصلاحية</label><select id="newUserRole"><option value="user">مستخدم (جرد فقط)</option><option value="supervisor">مشرف</option><option value="admin">admin</option></select></div>' +
    '</div>' +
    '<div class="modal-foot"><button class="mbtn primary" style="background:var(--green)" id="addUserBtn">💾 حفظ المستخدم</button><button class="mbtn ghost" id="urepBtn">📊 تقرير الجرد بالمستخدمين</button></div>' +
    '</div>' +
    '<div class="users-table-wrap"><table class="users-table"><thead><tr><th>اسم المستخدم</th><th>الاتصال</th><th>الحالة</th><th style="text-align:center">إجراءات</th></tr></thead><tbody id="usersBox"></tbody></table></div>' +
    '</div></div>' +

    '<div class="set-pane" data-pane="notifs"><div class="set-card">' +
    setHead('<svg viewBox="0 0 24 24"><path d="M18 8A6 6 0 0 0 6 8c0 7-6 9-6 9h18s-6-2-6-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>', '#f59e0b', 'إشعارات سطح المكتب', 'إشعارات فورية زي الواتساب - حتى لو الصفحة minimized') +
    '<div style="background:#fffbeb;border:1px solid #fde68a;border-radius:.75rem;padding:.7rem .9rem;margin-bottom:.8rem">' +
    '<div style="font-size:.8rem;font-weight:800;color:#92400e">🔔 ازاي تشتغل؟</div>' +
    '<div style="font-size:.72rem;color:#78350f;line-height:1.9">1️⃣ اضغط تفعيل واسمح<br>2️⃣ سيب صفحة الأدمن مفتوحة وممكن minimize<br>3️⃣ أي جرد من موظف → إشعار على الديسكتوب فوراً</div></div>' +
    '<div class="fld" style="text-align:center"><button class="mbtn primary" id="notifBtnSettings" style="padding:.8rem">🔔 تفعيل الإشعارات على سطح المكتب</button><div id="notifHintSettings" style="font-size:.7rem;color:#64748b;margin-top:.5rem"></div></div>' +
    '<div style="display:flex;gap:.5rem;margin-top:.8rem"><button class="mbtn ghost" id="testNotifBtn">🧪 جرّب الإشعار</button><button class="mbtn ghost" id="resetNotifCnt">🔄 تصفير</button></div>' +
    '</div></div>' +

    '<div class="set-pane" data-pane="sync"><div class="set-card">' +
    setHead(IC.cloud, '#2563eb', 'الاتصال بقاعدة البيانات (Firebase)', 'اربط هنا مرة واحدة — وبعد ما ينجح الاتصال ابعت اللينك لكل المستخدمين') +
    '<div class="fld"><label>بيانات الاتصال (الصق الكود كاملًا من Firebase)</label>' +
    '<textarea id="cfgText" placeholder=\'{"apiKey":"...","databaseURL":"..."}\'>' + esc(cfg && cfg.apiKey ? JSON.stringify(cfg, null, 1) : '') + '</textarea></div>' +
    '<div class="fld"><label>جذر قاعدة البيانات</label>' +
    '<input id="pathInp" value="' + esc(fbRoot()) + '" style="direction:ltr;text-align:left"></div>' +
    '<div class="modal-foot"><button class="mbtn primary" id="saveFb" style="flex:2">🔗 ربط قاعدة البيانات</button></div>' +
    '<div id="connResult" style="display:none;margin-top:.6rem;padding:.6rem .8rem;border-radius:.6rem;font-size:.78rem;font-weight:700;text-align:center"></div>' +
    '</div></div>' +

    '<div class="set-pane" data-pane="log"><div class="set-card">' +
    setHead('<svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>', '#0ea5e9', 'سجل تتبع الجرد لحظياً', 'يعرض آخر 100 عملية جرد بالوقت والمستخدم والكمية') +
    '<div style="display:flex;gap:.5rem;margin-bottom:.7rem;flex-wrap:wrap"><button class="mbtn primary" id="refreshLogBtn">🔄 تحديث السجل</button><button class="mbtn ghost" id="clearLogBtn">🗑️ مسح سجل الجرد</button><button class="mbtn ghost" id="exportLogBtn">⬇️ تصدير CSV</button><button class="mbtn ghost" id="exportLogPdfBtn">📄 تصدير PDF</button></div>' +
    '<div style="font-size:.65rem;color:#94a3b8;margin:-.4rem 0 .6rem">"كل تعديلات الأصناف" تقرير شامل لأي تغيير (اسم/مجموعة/ملاحظة/كمية) مخزّن مع كل صنف نفسه، ومش بيتأثر لو مسحت سجل الجرد فوق.</div>' +
    '<div id="countLogBox" style="max-height:55vh;overflow-y:auto;border:1px solid #e2e8f0;border-radius:.75rem;padding:.5rem;background:#f8fafc"><div style="text-align:center;color:#94a3b8;padding:1rem">جاري تحميل السجل...</div></div>' +
    '</div></div>' +
    '<div class="set-pane" data-pane="security"><div class="set-card">' +    setHead(IC.shield, '#dc2626', 'النظام والأمان', 'القفل وأصوات المسح واللوجو والنسخ الاحتياطي') +
    '<div class="sec-title">🔐 القفل والصوت</div>' +
    '<label class="check-row"><input type="checkbox" id="soundChk"' + (soundOn ? ' checked' : '') + '> أصوات المسح</label>' +
    '<div class="sec-title" style="margin-top:.9rem">لوجو البرنامج</div>' +
    '<div style="display:flex;align-items:center;gap:.7rem;background:#f8fafc;border:1px dashed var(--border);border-radius:.75rem;padding:.55rem .8rem;margin-bottom:.6rem">' +
    '<img id="logoPrev" style="width:44px;height:44px;object-fit:contain;background:#fff;border:1px solid #e2e8f0;border-radius:.5rem;padding:2px">' +
    '<div style="flex:1"><div style="font-size:.75rem;font-weight:800;color:#1e293b">اللوجو الحالي</div>' +
    '<div style="font-size:.65rem;color:#94a3b8">يتزامن على كل الأجهزة</div></div>' +
    '<button class="mbtn ghost" id="chgLogoBtn" style="flex:0;padding:.45rem .7rem">تغيير</button>' +
    '<button class="mbtn ghost" id="rstLogoBtn" style="flex:0;padding:.45rem .7rem">↩️</button>' +
    '</div>' +
    '<div class="modal-foot" style="flex-wrap:wrap"><button class="mbtn ghost" id="chgPass">🔑 تغيير كلمة مرور admin</button>' +
    '<div class="sec-title" style="margin-top:.9rem">🕘 السجل</div>' +
    '<div class="modal-foot" style="flex-wrap:wrap;margin-top:.2rem">' +
    '<button class="mbtn ghost" id="logBtn">🕘 عرض السجل</button></div>' +
    '<div class="sec-title" style="margin-top:.9rem;color:#b91c1c">منطقة الخطر</div>' +
    '<div class="modal-foot"><button class="mbtn danger" id="factoryResetBtn">💥 إعادة ضبط المصنع (مسح كل حاجة)</button></div>' +
    '</div></div>';

  const m = showModal('⚙️ شاشة الإعدادات', body, [{ label: 'إغلاق', kind: 'ghost' }], null, { wide: true });

  m.body.querySelectorAll('.set-tab').forEach(tab => {
    tab.onclick = () => {
      m.body.querySelectorAll('.set-tab').forEach(t => t.classList.remove('active'));
      m.body.querySelectorAll('.set-pane').forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      const pane = m.body.querySelector('[data-pane="' + tab.dataset.tab + '"]');
      if (pane) pane.classList.add('active');
 };
 });

  let onlineSess = [];
  const renderUsers = () => {
    const box = m.body.querySelector('#usersBox');
    if (!usersList.length) { box.innerHTML = '<tr><td colspan="4" class="users-empty">لا يوجد مستخدمون — أضف أول مستخدم بالأعلى</td></tr>'; return; }
    box.innerHTML = usersList.map((u, i) => {
      const on = u.active !== false;
      const online = onlineSess.find(s => s.name === u.name || sessionKey(s.name) === sessionKey(u.name));
      return '<tr class="' + (on ? '' : 'row-off') + '">' +
        '<td>👤 ' + esc(u.name) + '<span class="role-tag">' + esc(u.role === 'admin' ? 'مسؤول' : u.role === 'supervisor' ? 'مشرف' : 'مستخدم') + '</span></td>' +
        '<td>' + (online ? '<span class="sess-dot on" title="متصل الآن"></span> متصل الآن 🟢' : '<span class="sess-dot" title="مش متصل"></span> غير متصل') + '</td>' +
        '<td>' + (on ? '<span class="role-tag" style="background:#dcfce7;color:#166534">شغّال</span>' : '<span class="role-tag" style="background:#fee2e2;color:#b91c1c">موقوف</span>') + '</td>' +
        '<td style="text-align:center"><div class="users-actions">' +
        (online && sessionUser && online.name !== sessionUser.name ? '<button class="icon-btn kick" data-kick="' + esc(u.name) + '" title="طرده من جهازه فورًا">🥾 طرد</button>' : '') +
        '<button class="icon-btn b-open" data-editu="' + i + '" title="تعديل الاسم/الباسورد">✏️ تعديل</button>' +
        '<button class="icon-btn utoggle ' + (on ? 'on' : 'off') + '" data-tg="' + i + '" title="' + (on ? 'إيقاف مؤقت' : 'تشغيل') + '">' + (on ? '✅ شغّال' : '⛔ موقوف') + '</button>' +
        '<button class="icon-btn del" data-i="' + i + '">🗑️ حذف</button>' +
        '</div></td></tr>';
 }).join('');

    box.querySelectorAll('[data-editu]').forEach(b => b.onclick = async () => { await editUser(+b.dataset.editu); renderUsers(); });

    box.querySelectorAll('[data-kick]').forEach(b => b.onclick = async () => {
      const name = b.dataset.kick;
      const ok = await confirmDlg('طرد مستخدم', 'هيتسجل خروجه من جهازه فورًا: "' + name + '"', 'طرد', true);
      if (!ok) return;
      await kickUserOut(name);
      onlineSess = onlineSess.filter(s => s.name !== name);
      renderUsers();
 });

    box.querySelectorAll('[data-tg]').forEach(b => b.onclick = () => {
      const u = usersList[+b.dataset.tg];
      u.active = u.active === false ? true : false;
      store.setItem('usersList', JSON.stringify(usersList));
      pushMeta(true);
      addLog((u.active ? 'تشغيل المستخدم: ' : 'إيقاف المستخدم: ') + u.name);
      toast(u.active ? '✅ ' + u.name + ' شغّال تاني' : '⛔ ' + u.name + ' اتوقف — هيقدرش يدخل', u.active ? 'success' : 'warning');
      renderUsers();
 });
    box.querySelectorAll('.del').forEach(b => b.onclick = async () => {
      const u = usersList[+b.dataset.i];
      const idx = +b.dataset.i;
      const ok = await confirmDlg('حذف مستخدم', 'سيتم حذف "' + u.name + '" ولن يستطيع الدخول بعدها.', 'حذف', true);
      if (!ok) return;
      usersList.splice(idx, 1);
      store.setItem('usersList', JSON.stringify(usersList));
      pushMeta(true);
      addLog('حذف مستخدم: ' + u.name);
      renderUsers();
      toast('تم حذف "' + u.name + '"', 'success', { actionLabel: 'تراجع', onAction: () => {
        usersList.splice(idx, 0, u);
        store.setItem('usersList', JSON.stringify(usersList));
        pushMeta(true);
        addLog('استرجاع مستخدم: ' + u.name);
        renderUsers();
 }});
 });
 };
  renderUsers();

  getOnlineSessions().then(list => { onlineSess = list; renderUsers(); });
  m.body.querySelector('#addUserBtn').onclick = async () => {
    const name = m.body.querySelector('#newUserName').value.trim();
    const pass = m.body.querySelector('#newUserPass').value.trim();
    const role = m.body.querySelector('#newUserRole').value;
    if (!name || name.length < 2) { toast('اكتب اسم مستخدم صحيح', 'error'); return; }
    if (usersList.find(u => u.name === name)) { toast('الاسم موجود بالفعل', 'error'); return; }
    if (!pass || pass.length < 3) { toast('كلمة المرور 3 أحرف على الأقل', 'error'); return; }

    if (!usersList.length && !adminHash) {
      toast('الخطوة الأخيرة: أنشئ كلمة مرور admin (هتدخل بها على الإعدادات)', 'info');
      const ok = await ensureAdmin();
      if (!ok) { toast('لازم تنشئ كلمة مرور admin الأول', 'error'); return; }
 }
    usersList.push({ name, hash: await hashPass(pass), role });
    store.setItem('usersList', JSON.stringify(usersList));
    m.body.querySelector('#newUserName').value = '';
    m.body.querySelector('#newUserPass').value = '';
    renderUsers();

    toast('⏳ بحفظ ' + name + ' على السيرفر...', 'info');
    const okPush = await pushMeta(true);
    const onServer = await verifyUserOnServer(name);
    if (okPush && onServer) {
      addLog('إضافة مستخدم: ' + name);
      toast('✅ تمت إضافة ' + name + ' — موجود على السيرفر ويقدر يدخل من أي جهاز', 'success', { life: 12000 });
    } else {
      addLog('⛔ فشل حفظ المستخدم على السيرفر: ' + name);
      toast('⛔ ' + name + ' ماتحفظش على السيرفر — راجع صلاحيات Firebase Rules.', 'error', { life: 12000 });
    }
 };

  const logoCard = m.body.querySelector('#chgLogoBtn');
  if (logoCard) logoCard.onclick = pickNewLogo;
  const logoRst = m.body.querySelector('#rstLogoBtn');
  if (logoRst) logoRst.onclick = resetLogo;

  m.body.querySelector('#urepBtn').onclick = () => { m.close(); showUserReport(); };

  m.body.querySelector('#saveFb').onclick = async () => {
    const txt = m.body.querySelector('#cfgText').value.trim();
    const path = m.body.querySelector('#pathInp').value.trim() || 'jard';
    const resultBox = m.body.querySelector('#connResult');
    const showRes = (ok, msg) => {
      if (!resultBox) return;
      resultBox.style.display = 'block';
      resultBox.style.background = ok ? '#f0fdf4' : '#fef2f2';
      resultBox.style.color = ok ? '#166534' : '#b91c1c';
      resultBox.style.border = '1px solid ' + (ok ? '#86efac' : '#fca5a5');
      resultBox.textContent = msg;
 };
    if (txt) {
      const cfg2 = parseCfgLoose(txt);
      if (!cfg2) { showRes(false, '❌ فشل — الكود اللي اتلصق مش مفهوم'); toast('تعذّر فهم الكود — انسخه كاملًا من Firebase كما هو والصقه هنا', 'error'); return; }
      firebaseCfgLS = cfg2;
      store.setItem('firebaseCfg', JSON.stringify(cfg2));
 }

    store.setItem('syncPath', path);
    const btn = m.body.querySelector('#saveFb');
    btn.disabled = true; btn.textContent = '⏳ جاري الاتصال...';
    showRes(true, '🔄 جاري الاتصال واختبار الكتابة والقراءة...');
    const ok = await connectFirebase(true);
    btn.disabled = false; btn.textContent = '🔗 ربط قاعدة البيانات';
    if (!ok) { showRes(false, '❌ فشل الاتصال — راجع بيانات Firebase أو الإنترنت'); return; }

    try {
      const probe = { t: 'ok', at: Date.now(), by: deviceId };
      await db.ref(fbRoot() + '/probe-test').set(probe);
      const snap = await db.ref(fbRoot() + '/probe-test').get();
      await db.ref(fbRoot() + '/probe-test').remove().catch(() => {});
      const v = snap.val();
      if (v && v.by === deviceId) {
        showRes(true, '✅ نجح الاتصال — الكتابة والقراءة شغالين تمام. ابعت لينك البرنامج لكل المستخدمين دلوقتي 📲');
        toast('✅ نجح الاتصال والمزامنة شغالة — ابعت اللينك للمستخدمين', 'success');
        addLog('اختبار الاتصال نجح');
 } else {
        showRes(false, '❌ فشل — القراءة رجعت بيانات غير متوقعة');
 }
 } catch (e) {
      const msg = e && e.message ? e.message : String(e);
      if (msg.indexOf('PERMISSION_DENIED') !== -1) {
        showRes(false, '❌ فشل — القواعد رافضة: اكتب ".read": true ".write": true في Rules');
 } else if (msg.indexOf('auth') !== -1) {
        showRes(false, '❌ فشل — فعّل Anonymous Auth في Firebase Console');
 } else {
        showRes(false, '❌ فشل — ' + msg);
 }
 }
 };
  m.body.querySelector('#soundChk').onchange = e => {
    soundOn = e.target.checked;
    store.setItem('soundOn', soundOn ? '1' : '0');
    if (soundOn) beep('ok');
 };
  m.body.querySelector('#chgPass').onclick = async () => {
    let old = '';
    if (adminHash) {
      old = await inputDlg('كلمة المرور الحالية', 'أدخل كلمة المرور الحالية', true);
      if (old === null) return;
      const upOld = await verifyPass(old, adminHash);
      if (!upOld) { toast('كلمة المرور الحالية غير صحيحة', 'error'); return; }
      if (upOld !== adminHash) { adminHash = upOld; store.setItem('adminHash', adminHash); }
 }
    const p1 = await inputDlg('كلمة مرور جديدة', '3 أحرف على الأقل', true);
    if (p1 === null) return;
    if (p1.length < 3) { toast('كلمة المرور قصيرة', 'error'); return; }
    const p2 = await inputDlg('تأكيد كلمة المرور الجديدة', '', true);
    if (p1 !== p2) { toast('غير متطابقتين', 'error'); return; }
    adminHash = await hashPass(p1);
    store.setItem('adminHash', adminHash);
    localAdminVerified = true;
    pushMeta(false);

    addLog('تغيير كلمة المرور');
    toast('تم تغيير كلمة المرور', 'success');
 };
  m.body.querySelector('#logBtn').onclick = () => { m.close(); showLog(); };

  try {
    const nb = m.body.querySelector('#notifBtnSettings');
    if (nb) nb.onclick = () => toggleNotif();
    const tb = m.body.querySelector('#testNotifBtn');
    if (tb) tb.onclick = () => showJardNotification({by:'اختبار', role:'user', code:'TEST', name:'إشعار تجريبي - لو ظهر على الديسكتوب يبقى تمام ✅', qty:1, ts:Date.now()}, true);
    const rb = m.body.querySelector('#resetNotifCnt');
    if (rb) rb.onclick = () => { store.setItem('lastNotifTs', String(Date.now())); lastNotifTs = Date.now(); toast('تم تصفير العداد', 'success'); };
    updateNotifUI();
 } catch(e){}
  try {
    const rBtn = m.body.querySelector('#refreshLogBtn');
    if (rBtn) rBtn.onclick = () => loadCountLog();
    const cBtn = m.body.querySelector('#clearLogBtn');
    if (cBtn) cBtn.onclick = () => clearCountLog();
    const eBtn = m.body.querySelector('#exportLogBtn');
    if (eBtn) eBtn.onclick = () => exportCountLog();
    const pBtn = m.body.querySelector('#exportLogPdfBtn');
    if (pBtn) pBtn.onclick = () => exportCountLogPDF();

    setTimeout(()=>{ loadCountLog(); }, 300);
 } catch(e){}
  const frBtn = m.body.querySelector('#factoryResetBtn');
  if (frBtn) frBtn.onclick = () => { m.close(); factoryReset(); };
}

let lastCamCode = '', lastCamTime = 0, lastCamSeen = 0, lastCamBad = 0, camFlashT = null;
async function openCameraScanner(){
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    toast('الكاميرا غير مدعومة على هذا الجهاز/المتصفح', 'error');
    return;
 }
  primeAudio();
  const bodyHTML =
    '<div class="cam-stage">' +
    '<div id="qrReader"></div>' +
    '<div class="scan-flash" id="scanFlash">' +
    '<div class="big" id="scanFlashTitle">✓ تم الجرد</div>' +
    '<div class="code" id="scanFlashCode"></div>' +
    '<div class="small" id="scanFlashItem"></div>' +
    '</div>' +
    '<div class="low-light-hint" id="lowLightHint" style="display:none">💡 الإضاءة ضعيفة — الفلاش اشتغل تلقائيًا</div>' +
    '</div>' +

    '<div class="scan-count" id="scanCount">وجّه الكاميرا نحو الباركود — عدد المسحات: <b id="scanCountNum">0</b></div>' +
    '<div class="cam-zoom-wrap no-print" id="camZoomWrap" style="display:none">' +
    '🔍 <input type="range" id="camZoom" min="1" max="1" step="0.1" value="1" style="flex:1"> <span id="camZoomVal">1x</span>' +
    '</div>' +
    '<div class="cam-actions no-print">' +
    '<button class="mbtn orange" id="camTorch" style="display:none">🔦 تشغيل الفلاش</button>' +
    '<button class="mbtn danger" id="camClose">إغلاق الكاميرا</button>' +
    '</div>';
  const m = showModal('📷 مسح بالكاميرا', bodyHTML, [], () => stopCameraScanner());
  qrScanCount = 0; lastCamCode = ''; lastCamTime = 0; lastCamSeen = 0; lastCamBad = 0;
  try {
    if (typeof Html5Qrcode === 'undefined') {
      await loadScript('https://cdnjs.cloudflare.com/ajax/libs/html5-qrcode/2.3.8/html5-qrcode.min.js');
 }
 } catch (e) {
    m.close();
    toast('تعذر تحميل مكتبة الكاميرا — تحتاج إنترنت في أول مرة فقط', 'error');
    return;
 }
  if (!document.getElementById('qrReader')) return;

  const camFps = (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4) ? 10 : 18;
  try {
    qrScanner = new Html5Qrcode('qrReader', {
      verbose: false,

      experimentalFeatures: { useBarCodeDetectorIfSupported: true },
      formatsToSupport: [
        Html5QrcodeSupportedFormats.QR_CODE, Html5QrcodeSupportedFormats.EAN_13,
        Html5QrcodeSupportedFormats.EAN_8, Html5QrcodeSupportedFormats.CODE_128,
        Html5QrcodeSupportedFormats.CODE_39, Html5QrcodeSupportedFormats.CODE_93,
        Html5QrcodeSupportedFormats.UPC_A, Html5QrcodeSupportedFormats.UPC_E,
        Html5QrcodeSupportedFormats.UPC_EAN_EXTENSION, Html5QrcodeSupportedFormats.ITF,
        Html5QrcodeSupportedFormats.CODABAR, Html5QrcodeSupportedFormats.DATA_MATRIX,
        Html5QrcodeSupportedFormats.PDF_417, Html5QrcodeSupportedFormats.AZTEC
      ]
 });
    let camTarget;
    try {
      const warm = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
      try { warm.getTracks().forEach(t => t.stop()); } catch (e) {}
      const cams = await Html5Qrcode.getCameras();
      const back = cams && cams.length ? (cams.find(c => /back|rear|environment/i.test(c.label)) || cams[cams.length - 1]) : null;
      camTarget = back ? { deviceId: { exact: back.id } } : { facingMode: { ideal: 'environment' } };
    } catch (e) {
      camTarget = { facingMode: { ideal: 'environment' } };
    }

    const videoConstraints = Object.assign({}, camTarget, {
      width: { ideal: 1920 }, height: { ideal: 1080 },
      advanced: [{ focusMode: 'continuous' }, { exposureMode: 'continuous' }, { whiteBalanceMode: 'continuous' }]
 });
    const camConfig = {
      fps: camFps,
      qrbox: (w, h) => ({ width: Math.floor(w * 0.9), height: Math.floor(h * 0.62) }),
      aspectRatio: 1.7778,
      disableFlip: false,
      videoConstraints
 };

    const baseTarget = camTarget;
    const startScanner = (target, cfg) => qrScanner.start(target, cfg, onScanSuccess, () => {});
    async function onScanSuccess(txt){
        const now = Date.now();
        txt = sanitizeCode(txt);
        if (!txt) return;

        const f = $('scanFlash'), ft = $('scanFlashTitle'), fc = $('scanFlashCode'), fi = $('scanFlashItem');
        const sc = $('scanCount');
        const flash = (err, ms) => {
          if (!f) return;
          clearTimeout(camFlashT);
          f.classList.remove('err');
          f.classList.add('show');
          if (err) f.classList.add('err');
          camFlashT = setTimeout(() => { f.classList.remove('show', 'err'); }, ms);
        };

        if (!eanOk(txt)) {
          /* قراءة ناقصة: بنبلّغ بس من غير ما نوقف قراية أي كود تاني */
          if (now - lastCamBad < 1200) return;
          lastCamBad = now;
          beep('bad');
          if (ft) ft.textContent = '✗ قراءة ناقصة';
          if (fc) fc.textContent = txt;
          if (fi) fi.textContent = 'الباركود اتقص — وجّه الكاميرا صح وامسح تاني';
          flash(true, 1000);
          if (sc) sc.innerHTML = '⚠️ قراءة مرفوضة — الكود ناقص — عدد المسحات: <b id="scanCountNum">' + qrScanCount + '</b>';
          return;
        }

        /* نفس الباركود لسه قدام الكاميرا = نفس القطعة، مش قطعة جديدة (من غير أي رسالة) */
        if (txt === lastCamCode) {
          const stillInView = (now - lastCamSeen) < CAM_GONE_MS || (now - lastCamTime) < CAM_MIN_SAME_MS;
          lastCamSeen = now;
          if (stillInView) return;
        }

        lastCamCode = txt; lastCamTime = now; lastCamSeen = now;
        qrScanCount++;
        resetIdleTimer();
        processCode(txt);
        const after = inventoryData.find(i => i.code === txt);
        if (ft) ft.textContent = '✓ تم الجرد';
        if (fc) fc.textContent = txt;
        if (fi) fi.textContent = (after ? after.name : txt) + ' — القطعة رقم: ' + (after ? fmtQ(after.actualQuantity) : '1');
        flash(false, 700);
        if (sc) sc.innerHTML = '✅ تم مسح <b id="scanCountNum" style="color:#059669;font-size:1.1rem">' + qrScanCount + '</b> قطعة — جاهز للمسح';
    }

    try {
      await startScanner(baseTarget, camConfig);
 } catch (e1) {
      try {

        await startScanner(baseTarget, { fps: camFps, qrbox: camConfig.qrbox, aspectRatio: 1.7778, disableFlip: false, videoConstraints: Object.assign({}, camTarget, { width: { ideal: 1920 }, height: { ideal: 1080 } }) });
 } catch (e2) {
      try {
        await startScanner({ facingMode: { ideal: 'environment' } }, { fps: camFps, qrbox: camConfig.qrbox, aspectRatio: 1.7778, disableFlip: false });
 } catch (e3) {
        await new Promise(r => setTimeout(r, 900));
        await startScanner({ facingMode: { ideal: 'environment' } }, { fps: camFps, qrbox: camConfig.qrbox, aspectRatio: 1.7778, disableFlip: false });
 }
 }
 }
    qrCamOn = true;
    const closeBtn = $('camClose');
    if (closeBtn) closeBtn.onclick = () => { stopCameraScanner(); m.close(); };

    let torchOn = false, torchManual = false, torchCapable = false;
    function setTorch(on, manual){
      if (!torchCapable) return;
      torchOn = on;
      if (manual) torchManual = true;
      qrScanner.applyVideoConstraints({ advanced: [{ torch: on }] }).catch(() => {});
      const tb = $('camTorch');
      if (tb) {
        tb.textContent = on ? '🔦 إطفاء الفلاش' : '🔦 تشغيل الفلاش';
        tb.classList.toggle('orange', !on);
        tb.classList.toggle('red', on);
 }
      const hint = $('lowLightHint');
      if (hint) hint.style.display = (on && !manual) ? '' : 'none';
 }

    try {
      const caps = qrScanner.getRunningTrackCapabilities && qrScanner.getRunningTrackCapabilities();
      if (caps && caps.torch) {
        torchCapable = true;
        const tb = $('camTorch');
        tb.style.display = '';
        tb.onclick = () => setTorch(!torchOn, true);
 }

      if (caps && caps.zoom && caps.zoom.max && caps.zoom.max > (caps.zoom.min || 1)) {
        const wrap = $('camZoomWrap'), slider = $('camZoom'), val = $('camZoomVal');
        if (wrap && slider) {
          wrap.style.display = 'flex';
          slider.min = caps.zoom.min || 1;
          slider.max = caps.zoom.max;
          slider.step = caps.zoom.step || 0.1;
          slider.value = caps.zoom.min || 1;
          slider.oninput = () => {
            const z = parseFloat(slider.value);
            if (val) val.textContent = z.toFixed(1) + 'x';
            qrScanner.applyVideoConstraints({ advanced: [{ zoom: z }] }).catch(() => {});
 };
 }
 }
 } catch (e) {}

    let dimStreak = 0;
    const lightTimer = setInterval(() => {
      if (!qrCamOn || torchManual) return;
      try {
        const video = document.querySelector('#qrReader video');
        if (!video || !video.videoWidth) return;
        const cvs = document.createElement('canvas');
        cvs.width = 24; cvs.height = 16;
        const ctx = cvs.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(video, 0, 0, 24, 16);
        const data = ctx.getImageData(0, 0, 24, 16).data;
        let sum = 0;
        for (let i = 0; i < data.length; i += 4) sum += (data[i] * 0.299 + data[i+1] * 0.587 + data[i+2] * 0.114);
        const avg = sum / (data.length / 4);
        if (avg < 55) { dimStreak++; if (dimStreak >= 2 && torchCapable && !torchOn) setTorch(true, false); }
        else { dimStreak = 0; if (torchCapable && torchOn && avg > 90) setTorch(false, false); }
 } catch (e) {}
 }, 1000);
    qrScanner.__lightTimer = lightTimer;
 } catch (e) {
    m.close();
    let msg = 'تعذر فتح الكاميرا — تأكد من السماح بالوصول للكاميرا';
    const name = e && e.name;
    if (name === 'NotAllowedError' || name === 'PermissionDeniedError') msg = '🚫 الإذن مرفوض — افتح إعدادات المتصفح وسمح بالوصول للكاميرا لهذا الموقع';
    else if (name === 'NotFoundError' || name === 'DevicesNotFoundError') msg = 'مفيش كاميرا متاحة دلوقتي — اتأكد إن مفيش تطبيق تاني ماسك الكاميرا وجرّب تاني';
    else if (name === 'NotReadableError' || name === 'TrackStartError') msg = 'الكاميرا مستخدمة في تطبيق تاني دلوقتي — قفله وحاول تاني';
    toast(msg, 'error');
 }
}
function stopCameraScanner(){
  if (qrScanner && qrCamOn) {
    qrCamOn = false;
    if (qrScanner.__lightTimer) { clearInterval(qrScanner.__lightTimer); qrScanner.__lightTimer = null; }
    qrScanner.stop().then(() => { try { qrScanner.clear(); } catch (e) {} }).catch(() => {});
 }
}

function registerSW(){
  if (!('serviceWorker' in navigator)) return;
  if (location.protocol !== 'https:' && location.hostname !== 'localhost') return;

  navigator.serviceWorker.register('sw.js')
    .then(reg => { if (reg && reg.update) reg.update().catch(() => {}); })
    .catch(() => {});
}

let autoUpdBase = null, autoUpdFired = false;
function autoUpdateBusy(){
  try {
    if (Object.keys(pendingCountOps || {}).length) return 'فيه عدّة لسه بتتحفظ';
    if (Object.keys(pendingItemWrites || {}).length) return 'فيه تعديل لسه بيتحفظ';
    if (editingCount > 0) return 'فيه خلية لسه بتتكتب';
    const overlays = Array.prototype.slice.call(document.querySelectorAll('.modal-overlay'));
    const openOne = overlays.some(o => {
      if (!o) return false;
      if (o.style && o.style.display === 'none') return false;
      try { if (getComputedStyle(o).display === 'none') return false; } catch (e) {}
      return true;
    });
    if (openOne) return 'فيه نافذة مفتوحة';
    if (typeof qrCamOn !== 'undefined' && qrCamOn) return 'الكاميرا شغالة';
  } catch (e) {}
  return null;
}
function autoUpdateCheck(first){
  if (autoUpdFired) return;
  if (document.hidden) return;
  fetch('app.js', { method: 'HEAD', cache: 'no-store' })
    .then(r => {
      const lm = r.headers.get('Last-Modified') || r.headers.get('ETag') || '';
      if (!lm) return;
      if (first) { autoUpdBase = lm; return; }
      if (autoUpdBase && lm !== autoUpdBase) {
        const why = autoUpdateBusy();
        if (why) {
          if (!autoUpdFired) { toast('🔄 فيه تحديث جديد للبرنامج — ' + why + '، هيتم التحديث أول ما تخلص', 'info'); autoUpdFired = 'warned'; }
          return;
        }
        autoUpdFired = true;
        toast('🔄 فيه تحديث جديد — الصفحة هتتحدث خلال 3 ثواني', 'info');
        setTimeout(() => { try { location.reload(); } catch (e) {} }, 3000);
      }
    })
    .catch(() => {});
}
function startAutoUpdate(){
  if (location.protocol !== 'https:' && location.hostname !== 'localhost') return;
  setTimeout(() => autoUpdateCheck(true), 4000);
  setInterval(() => { if (autoUpdFired !== true) autoUpdateCheck(false); }, 30000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden && autoUpdFired !== true) autoUpdateCheck(false); });
}

function toggleFullScreen(){
  try {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen();
    else document.exitFullscreen();
 } catch (e) {}
}
function openSidebar(){ $('sidebar').classList.add('open'); $('sidebarOverlay').classList.add('show'); }
function closeSidebar(){ $('sidebar').classList.remove('open'); $('sidebarOverlay').classList.remove('show'); }

let bootDone = false, seenData = false, seenMeta = false;
function maybeFinishBoot(){
  if (bootDone) return;
  if (!seenData || !seenMeta) return;
  bootDone = true;
  const done = () => { bootHide(); finalize(); };

  if (usersList.length === 0) {
    seedDefaultAdmin().then(done);
    return;
 }

  done();
}
function finalize(){
  updateTable(); updateStats(); renderCategoryButtons(); applyLogo();
  if (loginRequired()) {
    restoreSession().then(restored => {
      if (restored) { applyUserUI(); resetIdleTimer(); }
      else showLock();
    }).catch(() => showLock());
  } else applyUserUI();
  try { if (isAdmin() && syncOn) attachNotifListener(); } catch(e){}
  try {

    if (isAdmin() && inventoryData.length > 3000) {
      toast('ℹ️ الكتالوج فيه ' + inventoryData.length + ' صنف — مع الأعداد الكبيرة جداً، بعض العمليات (زي المزامنة الكاملة) ممكن تبقى أبطأ شوية', 'info');
 }
 } catch(e){}
}
window.addEventListener('load', () => {
  try {
    const man = { name: 'جرد الأصناف — بيمبو ستور', short_name: 'جرد بيمبو', start_url: '.', display: 'standalone', background_color: '#f8fafc', theme_color: '#2563eb', icons: [{ src: LOGO_URI, sizes: '220x200', type: 'image/png' }] };
    const l = document.createElement('link');
    l.rel = 'manifest';
    l.href = 'data:application/manifest+json,' + encodeURIComponent(JSON.stringify(man));
    document.head.appendChild(l);
 } catch (e) {}
  const dt = $('currentDateTime');
  /* تاريخ الجرد = تاريخ رفع ملف الإكسيل (إن وجد)، غير كده تاريخ اليوم */
  dt.value = uploadDateTime || nowLocalDT();
  renderFileDates();
  setupBarcodeInput();
  setupTableEvents();
  setupKeyboardShortcuts();
  $('userChip').addEventListener('click', () => setUserFilter(''));
  setupIdleWatch();
  registerSW();
  startAutoUpdate();
  bootMsg('جاري الاتصال بقاعدة البيانات...');

  document.addEventListener('pointerdown', primeAudio, { once: true });
  document.addEventListener('keydown', primeAudio, { once: true });

  window.addEventListener('offline', () => { setSyncUI('off', '📡 مفيش اتصال — الجرد أونلاين فقط'); });

  window.addEventListener('online', () => { if (!syncOn) connectFirebase(true); });

  setInterval(() => {
    if (syncOn && seenMeta && pendingMetaPush) { pendingMetaPush = false; pushMeta(true); }
 }, 10000);

  function startApp(){
    const cfg = effectiveCfg();
    if (!cfg || !cfg.apiKey) {

      bootShow();
      const wrap = document.getElementById('bootCfgWrap');
      if (wrap) wrap.style.display = 'block';
      bootMsg('مفيش قاعدة بيانات متوصلة. الأدمن لازم يلصق بيانات Firebase هنا مرة واحدة.');
      const btn = document.getElementById('bootCfgBtn');
      if (btn) btn.onclick = async () => {
        const v = document.getElementById('bootCfg').value.trim();
        const c = parseCfgLoose(v);
        if (!c) { toast('الكود مش مفهوم — الصق كود Firebase كامل', 'error'); return; }
        firebaseCfgLS = c;
        bootMsg('جاري الربط...');
        const ok = await connectFirebase(true);
        if (ok) {
          wrap.style.display = 'none';
          bootHide();

          showLock();
 }
 };
      return;
 }

    bootShow();

    updateTable(); updateStats(); renderCategoryButtons(); applyLogo();

    connectFirebase(true);
 }

  let bootRetryTimer = null;
  const tryAutoReconnect = () => {
    if (bootDone || !document.getElementById('bootGate')) return;
    bootMsg('جاري الاتصال بقاعدة البيانات...');
    const ic = document.getElementById('bootIcon');
    if (ic) ic.textContent = '⏳';
    connectFirebase(true).then(ok => {
      if (!ok) {

        if (ic) ic.textContent = '🔁';
        clearTimeout(bootRetryTimer);
        bootRetryTimer = setTimeout(tryAutoReconnect, 5000);
 }
 });
 };

  window.addEventListener('online', tryAutoReconnect);
  tabGuard(startApp);
});
