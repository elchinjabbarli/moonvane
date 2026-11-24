const CACHE="moonvane-v1.1.0";
const ASSETS=[".","index.html","css/style.css","js/main.js","js/game.js","js/render.js","js/engine.js","js/i18n.js","js/audio.js","js/save.js","js/native.js","manifest.webmanifest","assets/icon.svg","assets/icon-192.png","assets/icon-512.png"];
self.addEventListener("install",e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting()));});
self.addEventListener("activate",e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==CACHE).map(x=>caches.delete(x)))).then(()=>self.clients.claim()));});
self.addEventListener("fetch",e=>{e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request).catch(()=>caches.match("index.html"))));});