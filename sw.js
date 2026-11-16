const V = "speakly-v6";
const FILES = ["./", "index.html", "style.css", "app.js", "icons.js", "manifest.json", "icon.svg", "icon-512.png",
  "data/core.js", "data/a0.js", "data/a1.js", "data/a2.js", "data/b1.js", "data/b2.js", "data/c1.js", "data/c2.js", "data/extra.js", "data/more.js", "data/dscg.js", "practice.js", "check.js", "dscg.js"];
self.addEventListener("install", e => { e.waitUntil(caches.open(V).then(c => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  e.respondWith(fetch(e.request).then(r => { const copy = r.clone(); caches.open(V).then(c => c.put(e.request, copy)); return r; }).catch(() => caches.match(e.request)));
});
