self.addEventListener('install',e=>{
  e.waitUntil(caches.open('skycast-pro-v1').then(c=>c.addAll([
    './','./index.html','./styles.css','./app.js','./manifest.json',
    './assets/icon-192.png','./assets/icon-512.png','./assets/bg.png'
  ])));
});
self.addEventListener('fetch',e=>{
  e.respondWith(caches.match(e.request).then(r=> r || fetch(e.request)));
});