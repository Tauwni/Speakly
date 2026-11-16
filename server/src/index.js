// Speakly : serveur de comptes (Cloudflare Worker + base D1)
// Pseudo + code secret à 6 chiffres. Le code n'est jamais stocké : seulement une empreinte PBKDF2 salée,
// combinée à un secret serveur (PEPPER). Session par jeton aléatoire envoyé dans l'en-tête Authorization.

const ORIGINS = ["https://speaklyyy.netlify.app", "https://tauwni.github.io", "http://localhost:8455", "http://localhost:8431", "http://127.0.0.1:8455"];
const TTS_VOICES = ["thalia", "apollo", "pandora", "draco", "luna", "orion"], TTS_DAILY = 4000;
const MAX_FAILS = 5, LOCK_MS = 15 * 60 * 1000, MAX_DATA = 900_000, ITER = 20000;
const enc = new TextEncoder();
const hex = buf => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, "0")).join("");
const randHex = n => hex(crypto.getRandomValues(new Uint8Array(n)));

async function hashPin(pin, salt, pepper) {
  const key = await crypto.subtle.importKey("raw", enc.encode(`${pin}:${pepper}`), "PBKDF2", false, ["deriveBits"]);
  return hex(await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: enc.encode(salt), iterations: ITER }, key, 256));
}
const sha = async s => hex(await crypto.subtle.digest("SHA-256", enc.encode(s)));
function same(a, b) { if (a.length !== b.length) return false; let d = 0; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i); return d === 0; }

const cleanName = n => String(n || "").normalize("NFC").replace(/\s+/g, " ").trim().slice(0, 24);
const userId = n => cleanName(n).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "");

function cors(req) {
  const o = req.headers.get("Origin") || "";
  const allow = ORIGINS.includes(o) || /^https:\/\/[a-z0-9-]+--speaklyyy\.netlify\.app$/.test(o) ? o : ORIGINS[0];
  return { "Access-Control-Allow-Origin": allow, "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS", "Access-Control-Allow-Headers": "Content-Type,Authorization", "Access-Control-Max-Age": "86400", Vary: "Origin" };
}
const json = (req, body, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...cors(req) } });

async function auth(req, env) {
  const t = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  if (!/^[0-9a-f]{64}$/.test(t)) return null;
  const s = await env.DB.prepare("SELECT s.user_id AS id, u.name, u.version FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token = ?").bind(await sha(t)).first();
  if (s) await env.DB.prepare("UPDATE sessions SET last_seen = ? WHERE token = ?").bind(Date.now(), await sha(t)).run();
  return s ? { ...s, token: t } : null;
}
async function newSession(env, id) {
  const t = randHex(32);
  await env.DB.prepare("INSERT INTO sessions (token, user_id, created, last_seen) VALUES (?, ?, ?, ?)").bind(await sha(t), id, Date.now(), Date.now()).run();
  return t;
}
async function checkPin(env, u, pin) {
  if (u.locked_until > Date.now()) return { error: `Trop d'essais : réessaie dans ${Math.ceil((u.locked_until - Date.now()) / 60000)} min`, status: 429 };
  if (same(await hashPin(pin, u.salt, env.PEPPER), u.hash)) {
    if (u.failed) await env.DB.prepare("UPDATE users SET failed = 0 WHERE id = ?").bind(u.id).run();
    return null;
  }
  const failed = (u.failed || 0) + 1, lock = failed >= MAX_FAILS;
  await env.DB.prepare("UPDATE users SET failed = ?, locked_until = ? WHERE id = ?").bind(lock ? 0 : failed, lock ? Date.now() + LOCK_MS : 0, u.id).run();
  const left = MAX_FAILS - failed;
  return { error: lock ? "Trop d'essais : compte bloqué 15 min" : `Code incorrect (encore ${left} essai${left > 1 ? "s" : ""})`, status: 401 };
}
const pinOk = p => /^\d{6}$/.test(String(p || ""));

export default {
  async fetch(req, env) {
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(req) });
    const path = new URL(req.url).pathname.replace(/\/+$/, "");
    const body = ["POST", "PUT", "DELETE"].includes(req.method) ? await req.json().catch(() => ({})) : {};
    try {
      if (path === "" || path === "/api") return json(req, { ok: true, service: "speakly-api" });

      if (path === "/api/check" && req.method === "POST") {
        const id = userId(body.name);
        if (id.length < 2) return json(req, { error: "Pseudo trop court" }, 400);
        return json(req, { exists: !!(await env.DB.prepare("SELECT 1 FROM users WHERE id = ?").bind(id).first()) });
      }

      if (path === "/api/signup" && req.method === "POST") {
        const name = cleanName(body.name), id = userId(name);
        if (id.length < 2) return json(req, { error: "Choisis un pseudo d'au moins 2 lettres ou chiffres" }, 400);
        if (!pinOk(body.pin)) return json(req, { error: "Le code secret fait 6 chiffres" }, 400);
        if (/^(\d)\1{5}$/.test(body.pin) || ["123456", "654321", "012345", "123123"].includes(body.pin)) return json(req, { error: "Code trop facile à deviner : choisis-en un autre" }, 400);
        if (await env.DB.prepare("SELECT 1 FROM users WHERE id = ?").bind(id).first()) return json(req, { error: "Ce pseudo est déjà pris" }, 409);
        const data = typeof body.data === "string" && body.data.length <= MAX_DATA ? body.data : null;
        const salt = randHex(16), now = Date.now();
        await env.DB.prepare("INSERT INTO users (id, name, salt, hash, failed, locked_until, created, updated, data, version) VALUES (?, ?, ?, ?, 0, 0, ?, ?, ?, 1)")
          .bind(id, name, salt, await hashPin(body.pin, salt, env.PEPPER), now, now, data).run();
        return json(req, { token: await newSession(env, id), name, version: 1 }, 201);
      }

      if (path === "/api/login" && req.method === "POST") {
        const id = userId(body.name);
        if (!pinOk(body.pin)) return json(req, { error: "Le code secret fait 6 chiffres" }, 400);
        const u = await env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(id).first();
        if (!u) return json(req, { error: "Aucun compte à ce pseudo" }, 404);
        const bad = await checkPin(env, u, body.pin);
        if (bad) return json(req, { error: bad.error }, bad.status);
        return json(req, { token: await newSession(env, id), name: u.name, data: u.data, version: u.version });
      }

      const me = await auth(req, env);
      if (!me) return json(req, { error: "Session expirée : reconnecte-toi" }, 401);

      if (path === "/api/tts" && req.method === "GET") {
        const q = new URL(req.url).searchParams, text = String(q.get("t") || "").replace(/\s+/g, " ").trim().slice(0, 600);
        const voice = TTS_VOICES.includes(q.get("v")) ? q.get("v") : TTS_VOICES[0];
        if (!text) return json(req, { error: "Texte vide" }, 400);
        const k = `tts/${voice}/${await sha(text)}.mp3`, head = { "Content-Type": "audio/mpeg", "Cache-Control": "private, max-age=31536000, immutable", ...cors(req) };
        const hit = await env.AUDIO.get(k);
        if (hit) return new Response(hit.body, { headers: head });
        const day = new Date().toISOString().slice(0, 10);
        const u = await env.DB.prepare("SELECT n FROM tts_usage WHERE day = ?").bind(day).first();
        if (u && u.n >= TTS_DAILY) return json(req, { error: "Limite quotidienne de voix atteinte" }, 429);
        const out = await env.AI.run("@cf/deepgram/aura-2-en", { text, speaker: voice, encoding: "mp3" });
        const buf = out instanceof ReadableStream ? await new Response(out).arrayBuffer() : out && out.audio ? Uint8Array.from(atob(out.audio), c => c.charCodeAt(0)).buffer : out instanceof ArrayBuffer ? out : await new Response(out).arrayBuffer();
        if (!buf || buf.byteLength < 200) return json(req, { error: "Synthèse indisponible" }, 502);
        await env.AUDIO.put(k, buf, { httpMetadata: { contentType: "audio/mpeg" } });
        await env.DB.prepare("INSERT INTO tts_usage (day, n) VALUES (?, 1) ON CONFLICT(day) DO UPDATE SET n = n + 1").bind(day).run();
        return new Response(buf, { headers: head });
      }

      if (path === "/api/progress" && req.method === "GET") {
        const u = await env.DB.prepare("SELECT data, version, updated FROM users WHERE id = ?").bind(me.id).first();
        return json(req, { name: me.name, data: u.data, version: u.version, updated: u.updated });
      }
      if (path === "/api/progress" && req.method === "PUT") {
        if (typeof body.data !== "string" || body.data.length > MAX_DATA) return json(req, { error: "Données invalides ou trop volumineuses" }, 413);
        const base = Number(body.base) || 0;
        const r = await env.DB.prepare("UPDATE users SET data = ?, version = version + 1, updated = ? WHERE id = ? AND version = ?").bind(body.data, Date.now(), me.id, base).run();
        if (!r.meta.changes) { const u = await env.DB.prepare("SELECT data, version FROM users WHERE id = ?").bind(me.id).first(); return json(req, { conflict: true, data: u.data, version: u.version }, 409); }
        return json(req, { version: base + 1 });
      }
      if (path === "/api/logout" && req.method === "POST") {
        await env.DB.prepare("DELETE FROM sessions WHERE token = ?").bind(await sha(me.token)).run();
        return json(req, { ok: true });
      }
      if (path === "/api/pin" && req.method === "PUT") {
        if (!pinOk(body.pin)) return json(req, { error: "Le nouveau code fait 6 chiffres" }, 400);
        const u = await env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(me.id).first();
        const bad = await checkPin(env, u, String(body.current || ""));
        if (bad) return json(req, { error: bad.error }, bad.status);
        const salt = randHex(16);
        await env.DB.batch([
          env.DB.prepare("UPDATE users SET salt = ?, hash = ? WHERE id = ?").bind(salt, await hashPin(body.pin, salt, env.PEPPER), me.id),
          env.DB.prepare("DELETE FROM sessions WHERE user_id = ? AND token != ?").bind(me.id, await sha(me.token))
        ]);
        return json(req, { ok: true });
      }
      if (path === "/api/account" && req.method === "DELETE") {
        const u = await env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(me.id).first();
        const bad = await checkPin(env, u, String(body.pin || ""));
        if (bad) return json(req, { error: bad.error }, bad.status);
        await env.DB.batch([env.DB.prepare("DELETE FROM sessions WHERE user_id = ?").bind(me.id), env.DB.prepare("DELETE FROM users WHERE id = ?").bind(me.id)]);
        return json(req, { ok: true });
      }
      return json(req, { error: "Introuvable" }, 404);
    } catch (e) {
      return json(req, { error: "Erreur du serveur, réessaie dans un instant", detail: String(e && e.message || e).slice(0, 200) }, 500);
    }
  },
  // ménage quotidien : sessions inactives depuis plus de 180 jours
  async scheduled(_, env) { await env.DB.prepare("DELETE FROM sessions WHERE last_seen < ?").bind(Date.now() - 180 * 864e5).run(); }
};
