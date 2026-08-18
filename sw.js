/* Service worker — Stock Inspiración Artesana
   - index.html y config.js: primero red, si no hay señal usa la copia guardada.
   - resto (librerías, íconos): primero la copia guardada, y se actualiza de fondo.
   Al cambiar VER se renueva toda la caché. */
const VER   = 'v51';
const CACHE = 'inspiracion-stock-' + VER;
const FILES = ['./', './index.html', './config.js', './supabase.js', './manifest.webmanifest',
               './icon-192.png', './icon-512.png', './icon-maskable.png', './apple-icon.png'];
const FRESH = ['index.html', 'config.js'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('message', e => {
  if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting();
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;          // Supabase y demás: directo a la red

  const esFresco = req.mode === 'navigate' || FRESH.some(f => url.pathname.endsWith(f));
  if (esFresco){
    e.respondWith(
      fetch(req).then(res => {
        const copia = res.clone();
        caches.open(CACHE).then(c => c.put(req, copia)).catch(()=>{});
        return res;
      }).catch(() => caches.match(req).then(r => r || caches.match('./index.html')))
    );
    return;
  }
  e.respondWith(
    caches.match(req).then(hit => {
      const red = fetch(req).then(res => {
        const copia = res.clone();
        caches.open(CACHE).then(c => c.put(req, copia)).catch(()=>{});
        return res;
      }).catch(() => hit);
      return hit || red;
    })
  );
});
