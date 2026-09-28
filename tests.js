/* ============================================================
   اختبارات آلية أساسية — بيمبو جرد
   شغّلها بـ: node tests.js

   ملاحظة مهمة: الاختبارات دي بتستخرج نص الدوال الحقيقي من app.js
   وتشغّله في بيئة معزولة (مش نسخة منقولة بإيد) — يعني لو حد غيّر
   منطق الدالة في app.js وماحدّثش نتيجة متوقعة هنا، الاختبار هيفشل
   ويقولك بالظبط مين الدالة اللي اتغيّر سلوكها.

   الدوال دي مختارة لأنها "نقية" (pure) — مالهاش علاقة بالـ DOM
   ولا بـ Firebase، فتقدر تتاختبر لوحدها من غير أي تجهيز معقد.
   الدوال اللي متشابكة مع الشاشة أو المزامنة الحية (زي updateTable
   أو pushNow) محتاجة اختبارات تكامل حقيقية (Cypress/Playwright)
   مش unit tests، وده شغل تاني لو حبيت نعمله لاحقاً.
============================================================ */
const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(path.join(__dirname, 'app.js'), 'utf-8');

function extractFn(name) {
  const marker = 'function ' + name + '(';
  const start = src.indexOf(marker);
  if (start === -1) throw new Error('مالقتش الدالة: ' + name);
  let depth = 0, i = start, bodyStart = -1;
  for (; i < src.length; i++) {
    if (src[i] === '{') { if (depth === 0) bodyStart = i; depth++; }
    else if (src[i] === '}') { depth--; if (depth === 0) { i++; break; } }
  }
  return src.slice(start, i);
}

function loadFns(names) {
  const code = names.map(extractFn).join('\n') + '\nmodule.exports = {' + names.join(',') + '};';
  const Module = require('module');
  const m = new Module();
  m._compile(code, 'extracted.js');
  return m.exports;
}

let pass = 0, fail = 0;
function eq(actual, expected, label) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) { pass++; console.log('  ✅ ' + label); }
  else { fail++; console.log('  ❌ ' + label + ' — المتوقع: ' + JSON.stringify(expected) + ' | النتيجة: ' + JSON.stringify(actual)); }
}
/* مقارنة map من غير اهتمام بترتيب المفاتيح (counts عبارة عن object وترتيب مفاتيحه مالوش معنى) */
function eqMap(actual, expected, label) {
  const s = o => JSON.stringify(Object.keys(o || {}).sort().reduce((a, k) => { a[k] = (o || {})[k]; return a; }, {}));
  const ok = s(actual) === s(expected);
  if (ok) { pass++; console.log('  ✅ ' + label); }
  else { fail++; console.log('  ❌ ' + label + ' — المتوقع: ' + s(expected) + ' | النتيجة: ' + s(actual)); }
}

console.log('== sanitizeCode / parseQty / fmtQ ==');
{
  const { sanitizeCode, parseQty, fmtQ } = loadFns(['sanitizeCode', 'parseQty', 'fmtQ']);
  eq(sanitizeCode('١٢٣٤'), '1234', 'أرقام عربية تتحول لإنجليزية');
  eq(sanitizeCode('  ABC123  '), 'ABC123', 'مسافات بتتشال من الطرفين');
  eq(sanitizeCode('كود'), '', 'حروف عربية غير أرقام بتتشال');
  eq(parseQty('12.5'), 12.5, 'رقم عشري عادي');
  eq(parseQty('  7 قطعة'), 7, 'رقم مع نص عربي حواليه');
  eq(parseQty('abc'), 0, 'نص غير رقمي = صفر');
  eq(fmtQ(5.0), 5, 'رقم صحيح من غير كسور عشرية');
  eq(fmtQ(5.126), 5.13, 'تقريب لمنزلتين عشريتين');
}

console.log('== calculateRow ==');
{
  const { calculateRow } = loadFns(['calculateRow']);
  const surplus = { actualQuantity: 12, systemQuantity: 10 };
  calculateRow(surplus);
  eq(surplus.status, 'زيادة', 'فعلي أكبر من سيستم = زيادة');
  eq(surplus.difference, 2, 'الفرق بيتحسب صح');

  const deficit = { actualQuantity: 3, systemQuantity: 10 };
  calculateRow(deficit);
  eq(deficit.status, 'عجز', 'فعلي أقل من سيستم = عجز');

  const equal = { actualQuantity: 10, systemQuantity: 10 };
  calculateRow(equal);
  eq(equal.status, 'متساوي', 'فعلي = سيستم = متساوي');
}

console.log('== eanOk (فحص checksum الباركود) ==');
{
  const { eanOk } = loadFns(['eanOk']);
  eq(eanOk('6291041500213'), true, 'باركود EAN-13 صحيح الـ checksum');
  eq(eanOk('6291041500219'), false, 'نفس الباركود برقم أخير غلط');
  eq(eanOk('ABC-123'), true, 'كود فيه حروف بيتقبل زي ما هو (مش EAN رقمي)');
  eq(eanOk('123'), true, 'كود أقصر من 8 أرقام بيتقبل زي ما هو');
}

console.log('== getUserRole ==');
{
  const code = extractFn('getUserRole');
  const wrapped = code + '\nmodule.exports = { getUserRole, usersList: typeof usersList !== "undefined" ? usersList : [] };';
  const Module = require('module');
  const m = new Module();
  // getUserRole بيعتمد على usersList العام — بنجهزها هنا زي ما البرنامج بيعملها
  m._compile('let usersList = [{name:"ahmed",role:"supervisor"}];\n' + wrapped, 'extracted2.js');
  const { getUserRole } = m.exports;
  eq(getUserRole('admin'), 'admin', 'اسم "admin" دايماً أدمن');
  eq(getUserRole('ahmed'), 'supervisor', 'مستخدم موجود بصلاحية مشرف');
  eq(getUserRole('غير موجود'), 'user', 'مستخدم مش موجود بالقايمة = user افتراضي');
  eq(getUserRole('بدون مستخدم'), '', '"بدون مستخدم" مالوش صلاحية عالية (إصلاح باج قديم)');
  eq(getUserRole(''), '', 'اسم فاضي = مفيش صلاحية');
}

console.log('== itemKey (مفتاح Firebase آمن لكل صنف) ==');
{
  const { itemKey } = loadFns(['itemKey']);
  eq(itemKey('6291041500213'), 'c_6291041500213', 'كود رقمي بحت بياخد بادئة c_ (يمنع Firebase يحوله لمصفوفة)');
  eq(itemKey('ABC-123'), 'c_ABC-123', 'كود عادي بياخد بادئة c_ بس من غير تغيير تاني');
  eq(itemKey('A/B.C#D'), 'c_A_B_C_D', 'الرموز الممنوعة في مفاتيح Firebase (./#) بتتحول لـ _');
  eq(itemKey('X'), itemKey('X'), 'نفس الكود بيدي نفس المفتاح دايماً (ثبات)');
}

console.log('== mergeOneItem (حل تعارض على مستوى صنف واحد) ==');
{
  const code = ['getUserRole', 'calculateRow', 'mergeOneItem'].map(extractFn).join('\n');
  const Module = require('module');
  const m = new Module();
  m._compile(
    'let usersList = [{name:"ahmed",role:"admin"},{name:"sara",role:"user"},{name:"mona",role:"user"}];\n' + code +
    '\nmodule.exports = { mergeOneItem, usersList };',
    'extracted4.js'
  );
  const { mergeOneItem } = m.exports;

  // تعديل قديم من أدمن ضد تعديل جديد من مستخدم عادي على نفس الصنف → الأحدث فعلياً يكسب (مش الدور بس)
  const staleAdmin = { code: 'X1', actualQuantity: 5, countedBy: 'ahmed', counts: {}, editedAt: 1000 };
  const freshUser = { code: 'X1', actualQuantity: 9, countedBy: 'sara', counts: {}, editedAt: 5000 };
  const r1 = mergeOneItem(freshUser, staleAdmin, 'sara');
  eq(r1.actualQuantity, 9, 'تعديل مستخدم عادي أحدث بيكسب تعديل أدمن أقدم (الإصلاح الأساسي اللي اتعمل قبل كده)');

  // تعديل أدمن أحدث فعلياً ضد تعديل مستخدم عادي أقدم → الأدمن يكسب
  const freshAdmin = { code: 'X2', actualQuantity: 3, countedBy: 'ahmed', counts: {}, editedAt: 9000 };
  const staleUser = { code: 'X2', actualQuantity: 1, countedBy: 'sara', counts: {}, editedAt: 2000 };
  const r2 = mergeOneItem(staleUser, freshAdmin, 'sara');
  eq(r2.actualQuantity, 3, 'تعديل أدمن أحدث فعلياً بيكسب تعديل مستخدم عادي أقدم');

  // مستخدمين عاديين (مش أدمن) مختلفين بيعدّوا نفس الصنف (counts) → الاتنين يتحسبوا مع بعض
  const l3 = { code: 'X3', actualQuantity: 2, countedBy: 'sara', counts: { sara: 2 }, editedAt: 1000 };
  const r3 = { code: 'X3', actualQuantity: 3, countedBy: 'mona', counts: { mona: 3 }, editedAt: 1500 };
  const m3 = mergeOneItem(l3, r3, 'sara');
  eq(m3.actualQuantity, 5, 'اتنين مستخدمين عاديين مختلفين بيعدّوا نفس الصنف — حصصهم بتتجمع (2+3=5)');
}

console.log('== mergeOneItem: حصص المستخدمين ماتضيعش (نسخة محلية قديمة) ==');
{
  /* الاختبارات اللي فوق بتستخدم أصناف من غير حصص (counts فاضية) فبتمشي في فرع
     الوقت. دي الحالة الأخطر: جهاز عنده نسخة قديمة ما شافش فيها عدّة حد تاني،
     ووصله تحديث من السيرفر. زمان كان فيه فرعين بيرجّعوا نسخة واحدة كاملة
     ويسقطوا حصص باقي الناس — فكمية حد كانت بتختفي من غير سبب. */
  const code = ['getUserRole', 'calculateRow', 'mergeOneItem'].map(extractFn).join('\n');
  const Module = require('module');
  const m = new Module();
  m._compile(
    'let usersList = [{name:"admin",role:"admin"},{name:"محمد",role:"user"},{name:"سعاد",role:"user"}];\n' + code +
    '\nmodule.exports = { mergeOneItem };',
    'extracted-merge-safety.js'
  );
  const { mergeOneItem } = m.exports;

  const it = (counts, by, ts) => ({ code:'10001', name:'أرز', group:'g', systemQuantity:10,
    actualQuantity: Object.keys(counts).reduce((a,u)=>a+counts[u],0),
    isJarded:true, counts, countedBy: by, editedAt: ts });

  /* 1) الأدمن عدّل وجهازه لسه ما شافش إن محمد جرد — عدّة محمد لازم ماتروحش */
  const r1 = mergeOneItem(it({admin:3}, 'admin', 200), it({'محمد':5}, 'محمد', 100), 'admin');
  eqMap(r1.counts, { admin:3, 'محمد':5 }, 'تعديل الأدمن مامسحش عدّة محمد (اللي جهازه ماكانش شايفها)');
  eq(r1.actualQuantity, 8, 'والإجمالي 8 مش 3');

  /* 2) العكس: مستخدم عادي بيعدّل، والسيرفر عنده نسخة أدمن أحدث — عدّته هو ماتروحش */
  const r2 = mergeOneItem(it({'محمد':4}, 'محمد', 200), it({admin:7}, 'admin', 300), 'محمد');
  eqMap(r2.counts, { admin:7, 'محمد':4 }, 'نسخة الأدمن الأحدث مابلعتش عدّة محمد');
  eq(r2.actualQuantity, 11, 'والإجمالي 11 مش 7');

  /* 3) تلات مستخدمين، والنسخة المحلية فيها واحد بس */
  const r3 = mergeOneItem(it({admin:1}, 'admin', 400), it({'محمد':2, 'سعاد':3}, 'محمد', 350), 'admin');
  eqMap(r3.counts, { admin:1, 'محمد':2, 'سعاد':3 }, 'التلاتة محفوظين');
  eq(r3.actualQuantity, 6, 'والإجمالي 6 مش 1');

  /* 4) نسخة محلية قديمة ماتنزّلش عدّة حد حدّثها على السيرفر */
  const r4 = mergeOneItem(it({admin:2, 'محمد':5}, 'admin', 500), it({'محمد':9}, 'محمد', 600), 'admin');
  eq(r4.counts['محمد'], 9, 'السيرفر أحدث (9) — النسخة المحلية القديمة (5) ما نزلتوش');
  eq(r4.actualQuantity, 11, 'والإجمالي 11 مش 7');

  /* 5) مفيش حصص خالص على الطرفين — مفيش حاجة تضيع أصلاً */
  const r5 = mergeOneItem(it({}, '', 200), it({}, '', 100), 'admin');
  eq(r5.actualQuantity, 0, 'صنف لسه مجردش — يفضل صفر');
}

console.log('== النيّات: applyCountOps / legacySeedOp / applyMetaPatch ==');
{
  const code = ['round2', 'sumCounts', 'normItem', 'calculateRow', 'applyCountOps', 'legacySeedOp', 'applyMetaPatch'].map(extractFn).join('\n');
  const Module = require('module');
  const m = new Module();
  m._compile(code + '\nmodule.exports = { round2, sumCounts, applyCountOps, legacySeedOp, applyMetaPatch };', 'pure.js');
  const { applyCountOps, legacySeedOp, applyMetaPatch, sumCounts } = m.exports;

  const base = { serial: 1, code: '10001', name: 'صنف', group: 'عام', systemQuantity: 20, actualQuantity: 5,
                 isJarded: true, countedBy: 'admin', counts: { admin: 5 }, editedAt: 100 };

  // السيرفر عنده 5 للأدمن — مستخدم تاني بيقول "زوّد حصتي واحد" → الاتنين يتحسبوا
  const r1 = applyCountOps(base, [{ t: 'delta', who: 'محمد', d: 1, ts: 200 }], 'محمد', '10001', base);
  eq(r1.actualQuantity, 6, 'delta على قيمة السيرفر بتزوّد فوقها (5 + 1 = 6)');
  eq(r1.counts, { admin: 5, 'محمد': 1 }, 'delta مابيمسحش حصّة مستخدم تاني');

  // نفس النيّة بس السيرفر بقى عنده 9 (حد تاني كتب في النص) → النتيجة 10 مش 6
  const raced = Object.assign({}, base, { actualQuantity: 9, counts: { admin: 5, 'محمد': 4 } });
  const r2 = applyCountOps(raced, [{ t: 'delta', who: 'محمد', d: 1, ts: 200 }], 'محمد', '10001', base);
  eq(r2.actualQuantity, 10, 'لو السيرفر اتغيّر، النيّة بتتنفّذ على القيمة الجديدة (9 + 1 = 10)');
  eq(r2.counts['محمد'], 5, 'حصتي بتزوّد على حصتي القديمة مش بتستبدلها');

  // cur = null (الصنف لسه مش موجود على السيرفر) → مفيش عدّ مزدوج
  const localOptimistic = { serial: 1, code: 'X9', name: 'صنف جديد', systemQuantity: 0, actualQuantity: 1,
                            isJarded: true, countedBy: 'محمد', counts: { 'محمد': 1 }, editedAt: 300 };
  const r3 = applyCountOps(null, [{ t: 'delta', who: 'محمد', d: 1, ts: 300 }], 'محمد', 'X9', localOptimistic);
  eq(r3.actualQuantity, 1, 'صنف جديد: النيّة بتتطبق من الصفر — مفيش double counting');
  eq(r3.code, 'X9', 'الكود بييجي من المفتاح حتى لو cur null');
  eq(r3.name, 'صنف جديد', 'البيانات الوصفية بتاخد من النسخة المحلية لما السيرفر مفيهوش الصنف');

  // دالة نقية: نفس المدخلات = نفس الناتج (مهم لأن Firebase بيناديها أكتر من مرة)
  const a = JSON.stringify(applyCountOps(base, [{ t: 'delta', who: 'محمد', d: 1, ts: 200 }], 'محمد', '10001', base));
  const b = JSON.stringify(applyCountOps(base, [{ t: 'delta', who: 'محمد', d: 1, ts: 200 }], 'محمد', '10001', base));
  eq(a, b, 'applyCountOps نقية — إعادة التنفيذ بتدي نفس النتيجة بالظبط');
  eq(JSON.stringify(base.counts), JSON.stringify({ admin: 5 }), 'applyCountOps مابتعدّلش نسخة السيرفر اللي جاتلها');

  // الكتابة اليدوية: الرقم ده حصّة صاحبها هو بس — والإجمالي = المجموع
  const r4 = applyCountOps(base, [{ t: 'set', who: 'محمد', v: 3, ts: 400 }], 'محمد', '10001', base);
  eq(r4.counts, { admin: 5, 'محمد': 3 }, 'كتابة يدوية بتكتب في كيس صاحبها بس');
  eq(r4.actualQuantity, 8, 'أدمن 5 + محمد كتب 3 = 8 على مستوى الصنف (الكمية بتتجمع)');

  // مثال المستخدم التاني: أدمن كتب 3 ومحمد كتب 2 → 5
  const base2 = { serial: 2, code: '10002', name: 'صنف', systemQuantity: 10, actualQuantity: 3,
                  isJarded: true, countedBy: 'admin', counts: { admin: 3 }, editedAt: 100 };
  const r5 = applyCountOps(base2, [{ t: 'set', who: 'محمد', v: 2, ts: 500 }], 'محمد', '10002', base2);
  eq(r5.actualQuantity, 5, 'أدمن 3 + محمد كتب 2 = 5 على مستوى الصنف');
  eq(r5.counts, { admin: 3, 'محمد': 2 }, 'كتابة محمد مامسحتش الـ 3 بتاعة الأدمن');

  // الأدمن كمان بيكتب في كيسه هو بس — مفيش أي عملية بتمسح حصص حد
  const r5b = applyCountOps(base, [{ t: 'set', who: 'admin', v: 12, ts: 600 }], 'admin', '10001', base);
  eq(r5b.counts, { admin: 12 }, 'الأدمن بيعدّل كيسه هو (5 → 12)');
  const withUser = applyCountOps({ serial: 1, code: '10001', actualQuantity: 1, counts: { 'محمد': 1 }, editedAt: 100 },
                                 [{ t: 'set', who: 'admin', v: 12, ts: 600 }], 'admin', '10001', null);
  eq(withUser.actualQuantity, 13, 'كتابة الأدمن 12 + عدّة محمد 1 = 13 (الأدمن مابقاش يمسح حد)');
  eq(withUser.counts, { 'محمد': 1, admin: 12 }, 'عدّة محمد فضلت موجودة بعد كتابة الأدمن');

  // seed: بيانات قديمة فيها كمية من غير حصص
  const legacy = { serial: 2, code: '20002', name: 'قديم', systemQuantity: 4, actualQuantity: 10,
                   isJarded: true, countedBy: 'سعاد', counts: {}, editedAt: 50 };
  const seedOp = legacySeedOp(legacy, 'محمد', 600);
  eq(seedOp, { t: 'seed', who: 'سعاد', v: 10, ts: 600 }, 'legacySeedOp بينسب الكمية القديمة لصاحبها الأصلي');
  const r6 = applyCountOps(legacy, [seedOp, { t: 'delta', who: 'محمد', d: 1, ts: 600 }], 'محمد', '20002', legacy);
  eq(r6.actualQuantity, 11, 'بيانات قديمة: 10 القديمة + 1 الجديدة = 11 (مش 1)');
  eq(r6.counts, { 'سعاد': 10, 'محمد': 1 }, 'الكمية القديمة اتنسبت لسعاد والعدّة الجديدة لمحمد');

  // seed بيتجاهل لو السيرفر عنده حصص حقيقية — مستحيل يبوظ شغل موجود
  const r7 = applyCountOps(base, [seedOp, { t: 'delta', who: 'محمد', d: 1, ts: 700 }], 'محمد', '10001', base);
  eq(r7.counts, { admin: 5, 'محمد': 1 }, 'seed بيتجاهل تماماً لو فيه حصص حقيقية على السيرفر');
  eq(legacySeedOp(base, 'محمد', 1), null, 'مفيش seed لصنف عنده حصص أصلاً');

  // applyMetaPatch: تعديل الاسم مايمسحش العدّ
  const r8 = applyMetaPatch(base, Object.assign({}, base, { name: 'الاسم الجديد', group: 'أدوات' }), '10001');
  eq(r8.name, 'الاسم الجديد', 'الاسم الجديد اتحفظ');
  eq(r8.counts, { admin: 5 }, 'تعديل بيانات وصفية مايلمسش حصص العد');
  eq(r8.actualQuantity, 5, 'تعديل بيانات وصفية ماغيّرش الكمية الفعلية');
  eq(sumCounts({ a: 1.005, b: 2 }), 3.01, 'sumCounts بيقرّب لمنزلتين');
}

console.log('== جرد متزامن فعلي: جهازين على نفس الصنف في نفس اللحظة ==');
{
  /* Firebase وهمي بيحاكي سلوك RTDB الحقيقي بالظبط:
       - أول نداء لدالة الـ transaction بيكون بـ null (البيانات لسه مش في الكاش)
       - لو القيمة على السيرفر اتغيّرت بين القراءة والكتابة، السيرفر بيرفض
         ويبعت القيمة الجديدة والدالة تتنفّذ تاني (optimistic concurrency) */
  function makeFakeDb(initial){
    const data = Object.assign({}, initial || {});
    const listeners = [];
    const notify = [];
    let depth = 0;
    const api = {
      data,
      stats: { attempts: 0, retries: 0, delivered: 0 },
      hook: null, /* بتتنفذ بين القراءة والكتابة — بنحاكي بيها جهاز تاني بيكتب في نفس اللحظة */
      ref(path){
        const key = path.split('/').pop();
        return {
          on(event, cb){ if (event === 'child_changed') listeners.push(cb); return cb; },
          transaction(updateFn, onComplete){
            const outer = (depth === 0);
            depth++;
            try {
              let base = null; /* أول نداء دايمًا null زي ما Firebase بيعمل */
              for (let attempt = 1; attempt <= 40; attempt++){
                const proposed = updateFn(base);
                api.stats.attempts++;
                if (api.hook){ const h = api.hook; api.hook = null; h(); } /* جهاز تاني بيقطع علينا */
                const current = (key in data) ? data[key] : null;
                if (JSON.stringify(base) === JSON.stringify(current)){
                  data[key] = proposed;
                  if (onComplete) onComplete(null, true, { val: () => data[key] });
                  notify.push([key, data[key]]);
                  return;
                }
                api.stats.retries++;
                base = current; /* السيرفر بعت القيمة الجديدة → نعيد تنفيذ النيّة عليها */
              }
              if (onComplete) onComplete(new Error('maxretries'), false, null);
            } finally {
              depth--;
              /* البثّ لباقي الأجهزة بيحصل بعد ما العملية تكمل — زي ما السيرفر بيعمل */
              if (outer){
                while (notify.length){
                  const pair = notify.shift();
                  api.stats.delivered++;
                  listeners.forEach(cb => cb({ key: pair[0], val: () => pair[1] }));
                }
              }
            }
          }
        };
      }
    };
    return api;
  }

  /* جهاز كامل: بنستخرج الدوال الحقيقية من app.js (مش نسخة منقولة بإيد) وبنشغّلها
     على Firebase الوهمي — فالاختبار بيمرّ فعلًا على الكود اللي اتغيّر */
  function makeDevice(fakeDb, user, role, items){
    globalThis.__FAKE_DB__ = fakeDb;
    const names = ['round2', 'sumCounts', 'normItem', 'calculateRow', 'applyCountOps', 'legacySeedOp',
                   'getUserRole', 'mergeOneItem', 'resolveIncomingItem',
                   'itemKey', 'enqueueCountOp', 'pushCountOpsNow', 'requeueCountOps', 'adoptCommittedItem'];
    const prelude = [
      'const db = globalThis.__FAKE_DB__;',
      'let syncOn = true, accessDenied = false, pendingOfflinePush = false, lastSyncErr = "";',
      'let editingCount = 0, pendingRemote = false;',
      'const navigator = { onLine: true };',
      'let usersList = [{name:"admin",role:"admin"},{name:"محمد",role:"user"},{name:"منى",role:"user"}];',
      'let pendingItemWrites = {}, pendingCountOps = {}, countPushTimers = {}, countRetry = {}, committedItemKeys = {};',
      'let dirtyItemCodes = new Set(), selectedSerials = new Set();',
      'const inventoryData = ' + JSON.stringify(items) + ';',
      'const sessionUser = ' + JSON.stringify({ name: user, role: role }) + ';',
      'function fbPath(){ return "jard"; }',
      'function setSyncUI(){} function updateOfflineBar(){} function flashDot(){} function toast(){}',
      'function updateTable(){} function updateStats(){} function renderCategoryButtons(){} function patchSingleRow(){}',
      'function findItemIndexByCode(c){ return inventoryData.findIndex(i => i.code === c); }',
      /* الجدولة فورية عشان الاختبار deterministic — زي setTimeout بس من غير انتظار */
      'function scheduleCountPush(code){ if (pendingCountOps[code] && pendingCountOps[code].length) pushCountOpsNow(code); }',
      /* استقبال تحديثات السيرفر — بيمرّر لـ resolveIncomingItem الحقيقية من app.js
         (الجزء ده نسخة مصغّرة من hChanged: نفس القرار + نفس الإسناد في inventoryData) */
      'function deliverIncoming(key, raw){',
      '  const incoming = normItem(raw, String(key).replace(/^c_/, ""));',
      '  const idx = findItemIndexByCode(incoming.code);',
      '  if (idx === -1){ inventoryData.push(incoming); calculateRow(incoming); return; }',
      '  const local = inventoryData[idx];',
      '  const finalItem = resolveIncomingItem(key, local, incoming, sessionUser ? sessionUser.name : "");',
      '  finalItem.serial = local.serial;',
      '  inventoryData[idx] = finalItem;',
      '  calculateRow(finalItem);',
      '}'
    ].join('\n');
    const Module = require('module');
    const m = new Module();
    m._compile(prelude + '\n' + names.map(extractFn).join('\n') +
      '\ndb.ref("jard/items").on("child_changed", snap => { deliverIncoming(snap.key, snap.val()); });' +
      '\nmodule.exports = { inventoryData, enqueueCountOp, pushCountOpsNow, queue: () => pendingCountOps, keys: () => committedItemKeys };',
      'device.js');
    return m.exports;
  }

  const SERVER = { c_10001: { serial: 1, code: '10001', name: 'صنف تجريبي', group: 'عام', systemQuantity: 20,
                              actualQuantity: 0, isJarded: false, difference: -20, status: 'عجز', note: '',
                              countedBy: '', counts: {}, conflict: false, editedAt: 100 } };

  // ---- السيناريو المبلّغ عنه: الأدمن بيعدّ 5 والمستخدم التاني بيعدّ 3 في نفس اللحظة ----
  const fake = makeFakeDb(SERVER);
  const adminDev = makeDevice(fake, 'admin', 'admin', [JSON.parse(JSON.stringify(SERVER.c_10001))]);
  const userDev  = makeDevice(fake, 'محمد', 'user',  [JSON.parse(JSON.stringify(SERVER.c_10001))]);

  let userScans = 0;
  for (let i = 0; i < 5; i++){
    if (userScans < 3){
      userScans++;
      /* كل عدّة من الأدمن، المستخدم بيكتب في نفس اللحظة بالظبط (قبل ما كتابة الأدمن تكمل) */
      fake.hook = () => {
        userDev.enqueueCountOp('10001', { t: 'delta', who: 'محمد', d: 1, ts: 1000 + i });
        userDev.pushCountOpsNow('10001');
      };
    } else fake.hook = null;
    adminDev.enqueueCountOp('10001', { t: 'delta', who: 'admin', d: 1, ts: 2000 + i });
    adminDev.pushCountOpsNow('10001');
  }

  const finalItem = fake.data['c_10001'];
  eq(finalItem.actualQuantity, 8, '5 من الأدمن + 3 من المستخدم في نفس اللحظة = 8 (مفيش عدّة ضاعت)');
  eqMap(finalItem.counts, { admin: 5, 'محمد': 3 }, 'كل جهاز شاف حصّة التاني ومحصلش مسح');
  eq(finalItem.difference, -12, 'الفرق اتحسب من المجموع الحقيقي (8 − 20 = −12)');
  eq(fake.stats.retries > 0, true, 'السيرفر رفض وأعاد المحاولة فعلًا وقت التعارض (retries=' + fake.stats.retries + ')');
  eq(fake.stats.delivered > 0, true, 'التحديثات اتبثّت للأجهزة التانية (delivered=' + fake.stats.delivered + ')');
  eq(adminDev.inventoryData[0].actualQuantity, 8, 'شاشة الأدمن عرضت المجموع الصحيح بعد التأكيد');
  eq(userDev.inventoryData[0].actualQuantity, 8, 'شاشة المستخدم عرضت نفس المجموع بعد ما وصله البثّ');
  eqMap(userDev.inventoryData[0].counts, { admin: 5, 'محمد': 3 }, 'المستخدم شاف عدّة الأدمن على شاشته');
  eqMap(adminDev.inventoryData[0].counts, { admin: 5, 'محمد': 3 }, 'الأدمن شاف عدّة المستخدم على شاشته');

  // ---- للمقارنة: نفس السيناريو بالطريقة القديمة (set كامل) كان بيضيّع العدّ ----
  {
    const data = JSON.parse(JSON.stringify(SERVER));
    const oldWrite = (localItem) => { data['c_10001'] = JSON.parse(JSON.stringify(localItem)); };
    const localAdmin = JSON.parse(JSON.stringify(SERVER.c_10001));
    const localUser  = JSON.parse(JSON.stringify(SERVER.c_10001));
    localAdmin.actualQuantity = 5; localAdmin.counts = { admin: 5 }; localAdmin.isJarded = true;
    localUser.actualQuantity  = 3; localUser.counts  = { 'محمد': 3 }; localUser.isJarded = true;
    oldWrite(localAdmin); oldWrite(localUser); /* آخر كتابة بتمسح الأولى */
    eq(data['c_10001'].actualQuantity, 3, '⚠️ الطريقة القديمة كانت بتضيّع 5 عدّات وتسيب 3 بس — دي المشكلة اللي اتقفلت');
  }

  // ---- صنف جديد بيظهر على الجهازين في نفس اللحظة ----
  const fake2 = makeFakeDb({});
  const d1 = makeDevice(fake2, 'admin', 'admin', []);
  const d2 = makeDevice(fake2, 'منى', 'user', []);
  const newItem = { serial: 1, code: 'X9', name: 'صنف جديد', group: 'غير معروف', systemQuantity: 0,
                    actualQuantity: 1, isJarded: true, countedBy: 'admin', counts: { admin: 1 }, editedAt: 500 };
  fake2.hook = () => { d2.enqueueCountOp('X9', { t: 'delta', who: 'منى', d: 1, ts: 501 }); d2.pushCountOpsNow('X9'); };
  d1.inventoryData.push(JSON.parse(JSON.stringify(newItem)));
  d1.enqueueCountOp('X9', { t: 'delta', who: 'admin', d: 1, ts: 500 });
  d1.pushCountOpsNow('X9');
  eq(fake2.data['c_X9'].actualQuantity, 2, 'صنف جديد اتعمل على جهازين في نفس اللحظة → الاتنين اتحسبوا (2)');
  eqMap(fake2.data['c_X9'].counts, { admin: 1, 'منى': 1 }, 'حصص الجهازين محفوظة على الصنف الجديد');

  // ---- جرد أوفلاين: العدّات تتجمّع في الطابور وتتنفّذ بالترتيب لما النت يرجع ----
  const fake3 = makeFakeDb(SERVER);
  const offDev = makeDevice(fake3, 'محمد', 'user', [JSON.parse(JSON.stringify(SERVER.c_10001))]);
  for (let i = 0; i < 4; i++) offDev.enqueueCountOp('10001', { t: 'delta', who: 'محمد', d: 1, ts: 900 + i });
  offDev.pushCountOpsNow('10001');
  eq(fake3.data['c_10001'].actualQuantity, 4, '4 عدّات أوفلاين مترفعة كلها في Transaction واحدة');
  eq(Object.keys(offDev.queue()).indexOf('10001'), -1, 'الطابور اتفضى بعد ما الكتابة نجحت');
}

console.log('== فلاتر الحالة وتفصيل الحصص والتقارير بالمستخدم ==');
{
  const Module = require('module');

  /* fmtCountsBreakdown — دالة نقية */
  const m1 = new Module();
  m1._compile(extractFn('fmtQ') + '\n' + extractFn('fmtCountsBreakdown') + '\nmodule.exports = { fmtCountsBreakdown };', 'bd-extracted.js');
  const { fmtCountsBreakdown } = m1.exports;
  eq(fmtCountsBreakdown(null), '', 'تفصيل الحصص: مفيش حصص → فاضي');
  eq(fmtCountsBreakdown({}), '', 'قايمة حصص فاضية → فاضي');
  eq(fmtCountsBreakdown({ 'أحمد': 0, 'منى': -2 }), '', 'الحصص الصفرية والسالبة بتتشال من التفصيل');
  eq(fmtCountsBreakdown({ 'أحمد': 3, 'منى': 2 }), 'أحمد: 3 + منى: 2', 'الحصص بتتجمع "أحمد: 3 + منى: 2"');
  eq(fmtCountsBreakdown({ 'س': 1.5 }), 'س: 1.5', 'الأرقام العشرية بتتعرض صح في التفصيل');

  /* getFiltered — بفلتر الحالة الجديد «إظهار المتساوي» */
  const prelude2 = [
    "var $ = function(){ return { value: '' }; };",
    "var inventoryData = [",
    "  { code: 'A1', name: 'صنف متساوي', group: 'عام', status: 'متساوي', isJarded: true, counts: { 'أحمد': 5 } },",
    "  { code: 'A2', name: 'صنف زيادة', group: 'عام', status: 'زيادة', isJarded: true, counts: { 'أحمد': 2 } },",
    "  { code: 'A3', name: 'صنف عجز', group: 'عام', status: 'عجز', isJarded: true, counts: { 'منى': 1 } },",
    "  { code: 'A4', name: 'صنف مجردش', group: 'عام', status: 'عجز', isJarded: false, counts: {} }",
    "];",
    "var currentCategory = 'all', currentStatus = 'all', userFilter = '';",
    "var setStatus = function(s){ currentStatus = s; };"
  ].join('\n');
  const m2 = new Module();
  m2._compile(prelude2 + '\n' + extractFn('getFiltered') + '\nmodule.exports = { getFiltered, setStatus };', 'gf-extracted.js');
  const { getFiltered, setStatus } = m2.exports;
  const codes = () => getFiltered().map(i => i.code).join(',');
  eq(codes(), 'A1,A2,A3,A4', 'فلتر «الكل» بيرجع كل الأصناف');
  setStatus('equal');
  eq(codes(), 'A1', 'فلتر «إظهار المتساوي» الجديد بيرجع المتساوي بس');
  setStatus('hide_equal');
  eq(codes(), 'A2,A3,A4', '«إخفاء المتساوي» (الافتراضي الجديد) بيشيل المتساوي');
  setStatus('not_jarded');
  eq(codes(), 'A4', '«غير مُجرد» زي ما هو شغال');

  /* reportUsers — ترتيب الأدمن ثم المشرف ثم الباقي أبجدي */
  const prelude3 = [
    "var inventoryData = [ { code: 'A1', counts: { 'منى': 2 } }, { code: 'A2', counts: { 'أحمد': 1 } } ];",
    "var usersList = [ { name: 'admin', role: 'admin' }, { name: 'سعيد', role: 'supervisor' }, { name: 'منى' } ];"
  ].join('\n');
  const m3 = new Module();
  m3._compile(prelude3 + '\n' + extractFn('getUserRole') + '\n' + extractFn('reportUsers') + '\nmodule.exports = { reportUsers };', 'ru-extracted.js');
  const { reportUsers } = m3.exports;
  eq(JSON.stringify(reportUsers()), JSON.stringify(['admin', 'سعيد', 'أحمد', 'منى']),
    'أسماء التقارير: الأدمن الأول، المشرف بعده، والباقي أبجدي — حتى اللي جرد من غير حساب');

  /* buildReport — تقرير التفاصيل + التقرير الكامل بمستخدم معيّن */
  const prelude4 = [
    "var $ = function(){ return { value: '' }; };",
    "var inventoryData = [",
    "  { serial: 1, code: 'A1', name: 'صنف 1', group: 'عام', systemQuantity: 5, actualQuantity: 9, difference: 4, status: 'زيادة', isJarded: true, counts: { 'admin': 2, 'أحمد': 4, 'منى': 3 }, countedBy: 'أحمد', note: '' },",
    "  { serial: 2, code: 'A2', name: 'صنف 2', group: 'عام', systemQuantity: 5, actualQuantity: 5, difference: 0, status: 'متساوي', isJarded: true, counts: { 'منى': 5 }, countedBy: 'منى', note: '' },",
    "  { serial: 3, code: 'A3', name: 'صنف 3', group: 'عام', systemQuantity: 5, actualQuantity: 0, difference: -5, status: 'عجز', isJarded: false, counts: {}, countedBy: '', note: '' }",
    "];",
    "var usersList = [ { name: 'admin', role: 'admin' }, { name: 'أحمد' } ];",
    "var repUser = '';",
    "var setRepUser = function(u){ repUser = u; };"
  ].join('\n');
  const m4 = new Module();
  m4._compile(prelude4 + '\n' +
    extractFn('fmtQ') + '\n' + extractFn('pad2') + '\n' + extractFn('reportWhen') + '\n' +
    extractFn('getUserRole') + '\n' + extractFn('reportUsers') + '\n' + extractFn('buildReport') + '\n' +
    'module.exports = { buildReport, setRepUser };', 'br-extracted.js');
  const { buildReport, setRepUser } = m4.exports;

  const d1 = buildReport('detail');
  eq(JSON.stringify(d1.headers), JSON.stringify(['م','الكود','اسم الصنف','المجموعة','رصيد السيستم','admin','أحمد','منى','الإجمالي','الفرق','الحالة']),
    'تقرير التفاصيل: عمود لكل مستخدم (الأدمن الأول)');
  eq(d1.rows.length, 2, 'تقرير التفاصيل: الأصناف المجرودة بس (بدون اللي مجردش)');
  eq(d1.rows[0][6], 4, 'تفاصيل: حصة أحمد في الصنف الأول = 4');
  eq(d1.rows[0][7], 3, 'تفاصيل: حصة منى في الصنف الأول = 3');
  eq(d1.foot[7], 8, 'تفاصيل: إجمالي حصص منى (3+5) = 8');

  setRepUser('أحمد');
  const d2 = buildReport('detail');
  eq(d2.rows.length, 1, 'تفاصيل بمستخدم: الأصناف اللي هو جردها بس');
  eq(d2.title.indexOf('— أحمد') !== -1, true, 'تفاصيل بمستخدم: العنوان فيه اسمه');
  eq(JSON.stringify(d2.headers), JSON.stringify(['م','الكود','اسم الصنف','المجموعة','رصيد السيستم','أحمد','الإجمالي','الفرق','الحالة']),
    'تفاصيل بمستخدم: عموده هو بس');

  setRepUser('منى');
  const f1 = buildReport('full');
  eq(f1.headers[5], 'جرد منى', 'التقرير الكامل بمستخدم: عمود «جرد منى» مضاف');
  eq(f1.rows.map(r => r[1]).join(','), 'A1,A2', 'الكامل بمستخدم: الأصناف اللي منى جردها');
  eq(f1.rows[0][5], 3, 'الكامل بمستخدم: جرد منى للصنف الأول = 3');

  setRepUser('');
  const f0 = buildReport('full');
  eq(JSON.stringify(f0.headers), JSON.stringify(['م','الكود','اسم الصنف','المجموعة','رصيد السيستم','الادمن','اليوزر','الفرق','الحالة']),
    'التقرير الكامل: عمود للأدمن وعمود لليوزر والفرق');
  eq(f0.rows.length, 3, 'الكامل: كل الأصناف (حتى اللي مجردش)');
  eq(f0.rows[0][5] + ',' + f0.rows[0][6], '2,7', 'الكامل: الصنف الأول — الأدمن جرد 2 واليوزرين (4+3) = 7');
  eq(f0.rows[0][7], 4, 'الكامل: الفرق = (2+7) − رصيد السيستم 5 = 4');
  eq(f0.rows[1][5] + ',' + f0.rows[1][6] + ',' + f0.rows[1][7], '0,5,0', 'الكامل: الصنف المتساوي — يوزر 5 والفرق 0');
  eq(f0.rows[2][5] + ',' + f0.rows[2][6] + ',' + f0.rows[2][7], '0,0,-5', 'الكامل: صنف مجردش — أدمن 0 ويوزر 0 والفرق −5');
  eq(f0.foot[5] + ',' + f0.foot[6] + ',' + f0.foot[7], '2,12,-1', 'الكامل: إجماليات الأعمدة — أدمن 2، يوزر 12، فرق (14−15) = −1');
  setRepUser('');
}

console.log('== موضع الإشعارات وإخفاؤها عن المستخدم العادي ==');
{
  const css = fs.readFileSync(path.join(__dirname, 'style.css'), 'utf-8');
  const app = fs.readFileSync(path.join(__dirname, 'app.js'), 'utf-8');
  eq(/#toasts\s*\{[^}]*left:\s*1rem[^}]*right:\s*auto/s.test(css), true, 'التنبيهات تظهر أعلى يسار الشاشة');
  eq(extractFn('toast').includes('!isElevated()'), true, 'المستخدم العادي لا تظهر له رسائل Toast');
  eq(app.includes('fixIdBtn'), false, 'لا توجد أداة إصلاح Firebase مرتبطة بهذه الرسالة');
}

console.log('== عرض الكمية الإجمالية المشتركة لكل المستخدمين ==');
{
  const Module = require('module');
  const m = new Module();
  m._compile('let userFilter = "محمد"; function fmtQ(n){ return n; }\n' + extractFn('displayQty') + '\nmodule.exports = { displayQty };', 'display-qty.js');
  const displayQty = m.exports.displayQty;
  const item = { actualQuantity: 8, systemQuantity: 3, difference: 5, status: 'زيادة', counts: { admin: 5, محمد: 3 } };
  eq(displayQty(item).act, 8, 'فلتر المستخدم لا يخفي بقية العدّات من كمية الصنف');
  eq(displayQty(item).diff, 5, 'الفرق يعتمد على الإجمالي المشترك');
  const app = fs.readFileSync(path.join(__dirname, 'app.js'), 'utf-8');
  eq(app.includes('الكمية الإجمالية الآن'), true, 'تأكيد المسح يعرض الإجمالي بدل تفصيل حصص الأشخاص');
  eq(extractFn('prepareAndPrint').includes('const q = i => i.actualQuantity'), true, 'الطباعة تعرض إجمالي الصنف حتى مع فلتر المستخدم');
}

console.log('== صلاحيات Firebase المستقلة عن تسجيل الدخول داخل التطبيق ==');
{
  const app = fs.readFileSync(path.join(__dirname, 'app.js'), 'utf-8');
  const rules = fs.readFileSync(path.join(__dirname, 'firebase-rules.json'), 'utf-8');
  eq(app.includes('signInWithPassword'), false, 'التطبيق لا ينشئ جلسة Firebase بكلمة مرور منفصلة');
  eq(app.includes('fixIdBtn'), false, 'لا يظهر زر إصلاح جلسة Firebase');
  eq(rules.includes('auth.uid'), false, 'قواعد Firebase لا تربط الصلاحيات بمعرّف مستخدم محدد');
  eq(rules.includes('".write": "auth != null"'), true, 'جلسة Firebase المسجلة تملك الكتابة');
  eq(/return\s+db\.ref/.test(extractFn('pushMeta')), true, 'pushMeta بيرجع الـ Promise');
}

console.log('== إشعارات الأدمن (المشروع الصحيح + توكن القواعد المقفولة) ==');
{
  const sw = fs.readFileSync(path.join(__dirname, 'sw.js'), 'utf-8');
  eq(sw.indexOf('jard-86baf') === -1, true, 'SW مش مربوط بمشروع Firebase القديم');
  eq(sw.indexOf('function notifsUrl') !== -1, true, 'عنوان الإشعارات بيتركّب من إعدادات الصفحة مش ثابت');
  eq(sw.indexOf('swAuth') !== -1, true, 'SW بيبعت توكن الهوية مع طلب الإشعارات');
  eq(sw.indexOf('swSelfName') !== -1, true, 'SW ما بيظهرش إشعار لعدّة نفس الجهاز');
  eq(sw.indexOf('jard-22f1c-default-rtdb.firebaseio.com') !== -1, true, 'الاحتياطي لو الصفحة ما بعتتش عنوان = المشروع الحالي');
  eq(sw.indexOf('JARD_PING') !== -1 && sw.indexOf('d.auth') !== -1, true, 'الـ ping يجدّد التوكن وهو الصفحة متصغّرة');

  const wipe = fs.readFileSync(path.join(__dirname, 'wipe.html'), 'utf-8');
  eq(wipe.indexOf('jard-86baf') === -1, true, 'صفحة المسح مش على المشروع القديم');
  eq(wipe.indexOf('jard-22f1c') !== -1, true, 'صفحة المسح على نفس مشروع البرنامج');
  eq(wipe.indexOf('forceWipe') !== -1, true, 'المسح بيكتب forceWipe عشان الأجهزة التانية تتمسح');

  const rules = fs.readFileSync(path.join(__dirname, 'firebase-rules.json'), 'utf-8');
  eq(rules.indexOf('"lastWipe"') !== -1, true, 'القواعد بتسمح للأدمن يكتب ختم المسح');
  eq(rules.indexOf('"lastWipeBy"') !== -1, true, 'وتسجيل مين عمل المسح');

  const an = extractFn('attachNotifListener');
  eq(an.indexOf('pushNotifConfigToSW(true)') !== -1, true, 'تفعيل الإشعارات بيبعت إعدادات Firebase للـ SW');
  eq(extractFn('detachNotifListener').indexOf('pushNotifConfigToSW(false)') !== -1, true, 'إيقاف الإشعارات بيوقف الـ SW');

  const cfgSrc = extractFn('pushNotifConfigToSW');
  eq(cfgSrc.indexOf('databaseURL') !== -1, true, 'عنوان القاعدة بيتبعت من إعدادات المشروع الحالي');
  eq(cfgSrc.indexOf('getIdToken') !== -1, true, 'توكن هوية Firebase بيتبعت للـ SW عشان القواعد المقفولة');
  eq(cfgSrc.indexOf('selfName') !== -1, true, 'اسم المستخدم الحالي بيتبعت عشان ما يتشعش بإشعار نفسه');

  const prelude = [
    'var lastNotifTs = 111;',
    'var sessionUser = { name: "admin", role: "admin" };',
    'var sent = [];',
    'function tellSW(msg){ sent.push(JSON.parse(JSON.stringify(msg))); }',
    'function fbRoot(){ return "jard"; }',
    'function effectiveCfg(){ return { databaseURL: "https://jard-22f1c-default-rtdb.firebaseio.com" }; }',
    'var firebase = { auth: function(){ return { currentUser: { getIdToken: function(){ return { then: function(){ return { catch: function(){} }; } }; } } }; } };'
  ].join('\n');
  const Module = require('module');
  const m = new Module();
  m._compile(prelude + '\n' + extractFn('pushNotifConfigToSW') +
    '\nmodule.exports = { pushNotifConfigToSW: pushNotifConfigToSW, getSent: function(){ return sent; } };',
    'notif-extracted.js');
  const { pushNotifConfigToSW, getSent } = m.exports;
  pushNotifConfigToSW(true);
  const first = getSent()[0];
  eq(!!first, true, 'تفعيل الإشعارات بيبعت رسالة للـ SW فورًا');
  eq(first.type, 'JARD_NOTIF', 'نوع الرسالة JARD_NOTIF');
  eq(first.enabled, true, 'الرسالة enabled');
  eq(first.dbUrl, 'https://jard-22f1c-default-rtdb.firebaseio.com', 'عنوان القاعدة الصحيح (المشروع الحالي)');
  eq(first.path, 'jard', 'مسار الجرد بيتبعت');
  eq(first.selfName, 'admin', 'اسم الأدمن بيتبعت');
  eq(first.lastTs, 111, 'آخر وقت إشعار بيتبعت');
  const beforeOff = getSent().length;
  pushNotifConfigToSW(false);
  const off = getSent()[beforeOff];
  eq(off && off.enabled, false, 'إيقاف الإشعارات بيبعت enabled=false');
}

console.log('== تشفير كلمات المرور (salt) ==');
{
  /* الدوال دي async، فمش هنقدر نستخدم extractFn العادية (بتقص كلمة async) —
     بناخد البلوك كله من app.js زي ما هو ونشغّله */
  const a = src.indexOf("const PASS_PREFIX = 'bjrd::';");
  const b = src.indexOf('async function verifyPass(p, stored){');
  if (a === -1 || b === -1) { fail++; console.log('  ❌ مالقتش بلوك تشفير الباسوردات في app.js'); }
  else {
    let end = src.indexOf('\n}', b);
    end = src.indexOf('\n', end + 1);
    const code = src.slice(a, end) + '\nmodule.exports = { hashPass, verifyPass, legacyHash, randomSalt };';
    const Module = require('module');
    const m = new Module();
    m._compile(code, 'pass-extracted.js');
    const { hashPass, verifyPass, legacyHash } = m.exports;

    (async () => {
      const h1 = await hashPass('123456');
      const h2 = await hashPass('123456');
      eq(h1 !== h2, true, 'نفس الباسورد بيطلع hash مختلف كل مرة (فيه salt عشوائي)');
      eq(h1.startsWith('v2$'), true, 'الصيغة الجديدة v2$salt$hash');
      eq(h1.split('$').length, 3, 'الـhash مكوّن من 3 أجزاء');
      eq(await verifyPass('123456', h1), h1, 'التحقق صح بنفس الباسورد');
      eq(await verifyPass('654321', h1), null, 'باسورد غلط بيرجع null');
      eq(await verifyPass('123456', h2), h2, 'التحقق بيشتغل مع أي salt');
      eq(await verifyPass('123456', ''), null, 'مفيش hash مخزّن = مرفوض');
      eq(await verifyPass('123456', null), null, 'hash = null مرفوض');

      /* الترحيل من الصيغة القديمة: hash خام من غير salt لازم يتقبل مرة ويتحدّث */
      const old = await legacyHash('123456');
      eq(old.indexOf('$'), -1, 'الهاش القديم مفيهوش $ (صيغة قديمة)');
      const up = await verifyPass('123456', old);
      eq(!!up, true, 'الباسورد القديم بيتقبل وقت الدخول');
      eq(up !== old, true, 'وبيترجّع بنسخة محدّثة فيها salt');
      eq(up.startsWith('v2$'), true, 'النسخة المحدّثة بالصيغة الجديدة');
      eq(await verifyPass('123456', up), up, 'والتحقق بالنسخة المحدّثة شغال');
      eq(await verifyPass('999999', old), null, 'باسورد غلط على هاش قديم مرفوض');

      console.log('\n' + '='.repeat(50));
      console.log('النتيجة: ' + pass + ' نجح، ' + fail + ' فشل');
      if (fail > 0) process.exit(1);
    })();
  }
}
