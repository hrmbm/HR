/* ReHolz GitHub Pages service worker — shell only; never cache private API/file data. */
'use strict';
const RH_SW_RELEASE = 'rehholz-pages-shell-v14-1';
const RH_CACHE = 'rehholz-shell-' + RH_SW_RELEASE;
const RH_SCOPE = new URL(self.registration.scope);
function inScope(url) { try { const u = new URL(url); return u.origin === RH_SCOPE.origin && u.pathname.startsWith(RH_SCOPE.pathname); } catch (_) { return false; } }
function cleanUrl(url) { const u = new URL(url); u.search = ''; u.hash = ''; return u.href; }
self.addEventListener('install', event => { event.waitUntil((async () => { await self.skipWaiting(); })()); });
self.addEventListener('activate', event => { event.waitUntil((async () => { const keys = await caches.keys(); await Promise.all(keys.filter(k => ((k.startsWith('rehholz-shell-') || k.startsWith('rehholz-app-shell-')) && k !== RH_CACHE)).map(k => caches.delete(k))); await self.clients.claim(); })()); });
self.addEventListener('message', event => { const d = event.data || {}; if (d.type === 'SKIP_WAITING') self.skipWaiting(); });
self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const u = new URL(req.url);
  if (u.origin !== RH_SCOPE.origin || !inScope(req.url)) return;
  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      const cache = await caches.open(RH_CACHE); const key = cleanUrl(req.url);
      try {
        const fresh = await fetch(new Request(req, {cache:'no-store'}));
        if (fresh && fresh.ok && fresh.type === 'basic' && (fresh.headers.get('content-type') || '').includes('text/html')) {
          try { await cache.put(key, fresh.clone()); await cache.put(RH_SCOPE.href, fresh.clone()); } catch (_) {}
          return fresh;
        }
      } catch (_) {}
      return (await cache.match(key)) || (await cache.match(RH_SCOPE.href)) || new Response('<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>ReHolz offline</title><body style="font-family:system-ui;padding:24px"><h2>ReHolz HRIS</h2><p>Halaman aplikasi belum pernah dicache pada perangkat ini. Sambungkan internet lalu buka kembali.</p><p>Data dan transaksi tetap memerlukan koneksi backend.</p></body>', {headers:{'Content-Type':'text/html; charset=utf-8'}, status:503});
    })());
    return;
  }
  // Cache only same-origin static resources. Never cache cross-origin scripts, auth, Drive files, or backend RPCs.
  if (['script','style','image','font'].indexOf(req.destination) >= 0) {
    event.respondWith((async () => {
      const cache = await caches.open(RH_CACHE); const hit = await cache.match(req);
      const refresh = fetch(req).then(resp => { if (resp && resp.ok && resp.type === 'basic') cache.put(req, resp.clone()).catch(() => {}); return resp; });
      return hit || refresh;
    })());
  }
});
