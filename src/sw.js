/* Not Today, Babe — offline support.
   The version below is stamped in by scripts/build.py (a fingerprint of index.html), so every change to the app
   produces a new cache, and the old one is cleared out as soon as the new one takes over. */
const VERSION='{{VERSION}}';
const SHELL='ntb-shell-'+VERSION;
const FONTS='ntb-fonts-v1';
const FILES=['./','./index.html','./manifest.webmanifest','./icons/icon-192.png','./icons/icon-512.png','./icons/apple-touch-icon.png','./icons/favicon-64.png'];

self.addEventListener('install',e=>{
  e.waitUntil(caches.open(SHELL).then(c=>c.addAll(FILES)).then(()=>self.skipWaiting()));
});

self.addEventListener('activate',e=>{
  e.waitUntil(
    caches.keys()
      .then(keys=>Promise.all(keys.filter(k=>k.startsWith('ntb-shell-')&&k!==SHELL).map(k=>caches.delete(k))))
      .then(()=>self.clients.claim())
  );
});

self.addEventListener('fetch',e=>{
  const req=e.request;
  if(req.method!=='GET')return;
  const url=new URL(req.url);

  /* the app's own files: answer from the cache straight away, refresh them quietly in the background */
  if(url.origin===location.origin){
    e.respondWith(
      caches.match(req,{ignoreSearch:true}).then(hit=>{
        const net=fetch(req).then(res=>{
          if(res&&res.ok){const copy=res.clone();caches.open(SHELL).then(c=>c.put(req,copy))}
          return res;
        }).catch(()=>hit);
        return hit||net;
      }).then(res=>res||caches.match('./index.html'))
    );
    return;
  }

  /* the font: keep a copy so the look stays the same offline */
  if(/(^|\.)fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)){
    e.respondWith(
      caches.open(FONTS).then(c=>c.match(req).then(hit=>{
        const net=fetch(req).then(res=>{
          if(res&&(res.ok||res.type==='opaque'))c.put(req,res.clone());
          return res;
        }).catch(()=>hit);
        return hit||net;
      }))
    );
  }
});
