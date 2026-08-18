/* بيمبو جرد — Service Worker (jard-v7) - إشعارات ديسكتوب زي الواتساب حتى مع minimize
   - يفتح البرنامج حتى لو النت مقطوع
   - يدعم إشعارات سطح المكتب حتى لو المتصفح متصغر أو في تاب تاني
   - polling في الخلفية لـ Firebase عشان لو التاب نام
*/
const CACHE = 'jard-v7';
const CORE = ['./', './index.html'];
const DB_URL = 'https://jard-86baf-default-rtdb.firebaseio.com/jard/notifs.json';

let swNotifEnabled = false;
let swLastTs = Date.now();
let pollTimer = null;

function startPolling(){
  if (pollTimer) clearInterval(pollTimer);
  // كل 12 ثانية نشيك - حتى لو التاب نايم، الـ SW هيصحى مع كل رسالة من الصفحة
  pollTimer = setInterval(pollNotifs, 8000);
  pollNotifs();
}
function stopPolling(){
  if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
}

async function pollNotifs(){
  if (!swNotifEnabled) return;
  try {
    // نجيب آخر 10 إشعارات مرتبة بـ ts
    const res = await fetch(DB_URL + '?orderBy="ts"&limitToLast=10', { cache: 'no-store' });
    if (!res.ok) return;
    const data = await res.json();
    if (!data) return;
    const items = Object.values(data).filter(Boolean);
    // رتب حسب الوقت
    items.sort((a,b)=> (a.ts||0)-(b.ts||0));
    for (const ev of items) {
      const ts = Number(ev.ts)||0;
      if (!ts || ts <= swLastTs) continue;
      if (ev.role === 'admin') continue; // بس جرد فقط
      swLastTs = Math.max(swLastTs, ts);
      // أظهر إشعار ديسكتوب
      try {
        await self.registration.showNotification(
          '📦 جرد جديد — ' + (ev.by||'مستخدم'),
          {
            body: (ev.name||'صنف') + '\nالكود: ' + (ev.code||'') + ' | الكمية: ' + (ev.qty||'') + '\nبواسطة: ' + (ev.by||''),
            // icon صغير - نستخدم بدون icon لو فشل، عشان بعض المتصفحات بترفض data URL الكبير
            // icon: './',
            tag: 'jard-' + ts,
            renotify: true,
            requireInteraction: false,
            vibrate: [200,100,200],
            data: { url: './' }
          }
        );
      } catch(e){}
    }
  } catch(e){}
}

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c=>c.addAll(CORE)).catch(()=>{}).then(()=>self.skipWaiting())
  );
});
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()).then(()=>{
      // لو كان مفعل قبل كده، شغل البولنج
      if (swNotifEnabled) startPolling();
    })
  );
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.hostname.includes('firebaseio.com') || url.hostname.includes('firebasedatabase.app') || url.hostname.includes('googleapis.com')) return;
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).then(res=>{ try{ caches.open(CACHE).then(c=>c.put('./index.html', res.clone())); }catch(err){} return res; }).catch(()=>caches.match('./index.html').then(h=>h||caches.match('./')))
    );
    return;
  }
  e.respondWith(
    caches.match(req).then(hit=>{
      const net = fetch(req).then(res=>{ if(res && (res.status===200 || res.type==='opaque')){ try{ const cp=res.clone(); caches.open(CACHE).then(c=>c.put(req, cp)); }catch(err){} } return res; }).catch(()=>hit);
      return hit||net;
    })
  );
});

self.addEventListener('message', e => {
  const d = e.data||{};
  if (d.type === 'JARD_NOTIF') {
    swNotifEnabled = !!d.enabled;
    if (typeof d.lastTs === 'number' && d.lastTs > swLastTs) swLastTs = d.lastTs;
    if (swNotifEnabled) startPolling();
    else stopPolling();
  } else if (d.type === 'JARD_PING') {
    if (swNotifEnabled) pollNotifs();
  } else if (d.type === 'JARD_TEST') {
    self.registration.showNotification('🔔 بيمبو - اختبار', { body: 'لو شفت الإشعار ده على الديسكتوب حتى وهو minimize يبقى كله تمام ✅', tag: 'jard-test-'+Date.now(), renotify: true });
  }
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list=>{
      for (let i=0;i<list.length;i++){ const c=list[i]; if(c.url.includes('/jard') && 'focus' in c) return c.focus(); }
      if (clients.openWindow) return clients.openWindow('./');
    })
  );
});
