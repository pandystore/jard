/* بيمبو جرد — Service Worker (jard-v4)
   البرنامج أونلاين 100%: مفيش تشغيل أوفلاين نهائيًا.
   دور الملف ده بس: (1) تسريع تحميل مكتبات الـ CDN، (2) تنظيف الكاش القديم
   عشان أي جهاز عليه نسخة أقدم يجبِر المتصفح يجيب النسخة الجديدة من GitHub. */
const CACHE = 'jard-v4';

self.addEventListener('install', e => {
  /* مفيش precache — صفحات البرنامج دايمًا من الشبكة */
  e.waitUntil(Promise.resolve().then(() => self.skipWaiting()));
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

  /* صفحات التنقل (index.html نفسه): شبكة فقط — بدون كاش نهائيًا.
     النت مقطوع = الصفحة مش هتفتح = البرنامج مش بيشتغل أوفلاين (دي السياسة المطلوبة). */
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req));
    return;
  }

  /* مكتبات الـ CDN بس (gstatic/cdnjs/unpkg): كاش للسرعة، والشبكة هي المرجع */
  if (/gstatic\.com$|cdnjs\.cloudflare\.com$|unpkg\.com$|jsdelivr\.net$/.test(url.hostname)) {
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
    return;
  }
  /* أي حاجة تانية: شبكة مباشرة */
});
