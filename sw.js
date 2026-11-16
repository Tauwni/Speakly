const V = "speakly-v8";
const FILES = ["./", "index.html", "style.css", "app.js", "icons.js", "manifest.json", "icon.svg", "icon-512.png",
  "data/core.js", "data/a0.js", "data/a1.js", "data/a2.js", "data/b1.js", "data/b2.js", "data/c1.js", "data/c2.js", "data/extra.js", "data/more.js", "data/dscg.js", "practice.js", "check.js", "dscg.js", "sync.js"];
self.addEventListener("install", e => { e.waitUntil(caches.open(V).then(c => c.addAll(FILES.map(f => new Request(f, { cache: "reload" })))).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
// Réseau d'abord, en revalidant toujours auprès du serveur (évite de mélanger d'anciens et de nouveaux fichiers
// quand l'hébergeur garde les fichiers en cache quelques minutes), puis copie locale si l'on est hors ligne.
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const u = new URL(req.url), same = u.origin === self.location.origin;
  if (!same && !/fonts\.(googleapis|gstatic)\.com$/.test(u.hostname)) return; // API de comptes et autres services : jamais en cache
  const net = same ? fetch(req.url, { cache: "no-cache", credentials: "same-origin" }) : fetch(req);
  e.respondWith(net.then(r => { if (r.ok) { const copy = r.clone(); caches.open(V).then(c => c.put(req, copy)); } return r; })
    .catch(() => caches.match(req, { ignoreSearch: true }).then(r => r || caches.match("./"))));
});
