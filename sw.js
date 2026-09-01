const CACHE_NAME='lottery-random-v2';
const SCOPE='/lottery/';
const ASSETS=[SCOPE,SCOPE+'index.html',SCOPE+'css/style.css',SCOPE+'js/i18n.js',SCOPE+'js/app.js',SCOPE+'manifest.json',SCOPE+'icon-192.svg',SCOPE+'icon-512.svg'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE_NAME).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{const request=event.request,url=new URL(request.url);if(request.method!=='GET'||url.origin!==self.location.origin||!url.pathname.startsWith(SCOPE))return;if(request.mode==='navigate'){event.respondWith(fetch(request).then(response=>{if(response.ok)caches.open(CACHE_NAME).then(cache=>cache.put(SCOPE,response.clone()));return response}).catch(()=>caches.match(SCOPE)));return}event.respondWith(caches.match(request).then(hit=>hit||fetch(request).then(response=>{if(response.ok)caches.open(CACHE_NAME).then(cache=>cache.put(request,response.clone()));return response})))});
