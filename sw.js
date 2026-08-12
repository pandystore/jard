/* بيمبو جرد — Service Worker (jard-v5)
   السياسة الجديدة (بناءً على طلب صاحب النظام):
   - الصفحة تفتح حتى لو النت مقطوع (ريلود أوفلاين = البرنامج شغال من آخر نسخة متزامنة)
   - الشغل أوفلاين بيترفع لوحده أول ما النت يرجع
   - تنظيف الكاش القديم عشان الأجهزة المعلقة على نسخ أقدم */
const CACHE = 'jard-v5';
const CORE = ['./', './index.html'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(CORE))
      .catch(() => {})
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  /* بيانات فايربيس — دايمًا من الشبكة، من غير ما نلمسها */
  if (url.hostname.includes('firebaseio.com') ||
      url.hostname.includes('firebasedatabase.app') ||
      url.hostname.includes('googleapis.com')) {
    return;
  }

  /* صفحات التنقل: الشبكة أولًا (نسخة طازة دايمًا)، ولو النت مقطوع → آخر نسخة متخزنة */
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).then(res => {
        try { caches.open(CACHE).then(c => c.put('./index.html', res.clone())); } catch (err) {}
        return res;
      }).catch(() => caches.match('./index.html').then(h => h || caches.match('./')))
    );
    return;
  }

  /* مكتبات الـ CDN (الكاميرا/الإكسيل/فايربيس): كاش أولًا للسرعة والعمل أوفلاين + تحديث في الخلفية */
  e.respondWith(
    caches.match(req).then(hit => {
      const net = fetch(req).then(res => {
        if (res && (res.status === 200 || res.type === 'opaque')) {
          try { const cp = res.clone(); caches.open(CACHE).then(c => c.put(req, cp)); } catch (err) {}
        }
        return res;
      }).catch(() => hit);
      return hit || net;
    })
  );
});
