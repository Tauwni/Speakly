// ===== Speakly : compte et synchronisation (pseudo + code secret à 6 chiffres) =====
const API = "https://speakly-api.agenda-dcg-pdf-worker.workers.dev/api";
const AUTH_KEY = "speakly-auth";
let AUTH = null;
try { AUTH = JSON.parse(localStorage.getItem(AUTH_KEY)); } catch (e) {}
const authSave = () => { try { AUTH ? localStorage.setItem(AUTH_KEY, JSON.stringify(AUTH)) : localStorage.removeItem(AUTH_KEY); } catch (e) {} };
const SYNC = { timer: null, busy: false, again: false, state: AUTH ? "ok" : "off", err: "" };

async function api(path, method = "GET", body) {
  const headers = { "Content-Type": "application/json" };
  if (AUTH && AUTH.token) headers.Authorization = "Bearer " + AUTH.token;
  let r;
  try { r = await fetch(API + path, { method, headers, body: body ? JSON.stringify(body) : undefined }); }
  catch (e) { const err = new Error("Pas de connexion internet. Réessaie quand tu seras en ligne."); err.offline = true; throw err; }
  const j = await r.json().catch(() => ({}));
  if (r.status === 409 && j.conflict) return j;
  if (!r.ok) { const err = new Error(j.error || "Erreur du serveur"); err.status = r.status; throw err; }
  return j;
}

// ----- fusion de deux progressions (rien n'est jamais perdu) -----
function mergeState(a, b) {
  if (!b) return a; if (!a) return b;
  const m = Object.assign({}, b, a);
  const max = (x, y) => Math.max(Number(x) || 0, Number(y) || 0);
  const byKey = (x = {}, y = {}, pickFn) => { const o = Object.assign({}, y); Object.entries(x).forEach(([k, v]) => { o[k] = k in y ? pickFn(v, y[k]) : v; }); return o; };
  ["xp", "best", "streak"].forEach(k => m[k] = max(a[k], b[k]));
  m.lastDay = [a.lastDay, b.lastDay].filter(Boolean).sort().pop() || null;
  m.dailyDone = [a.dailyDone, b.dailyDone].filter(Boolean).sort().pop() || null;
  m.answers = { ok: max(a.answers && a.answers.ok, b.answers && b.answers.ok), ko: max(a.answers && a.answers.ko, b.answers && b.answers.ko) };
  m.days = byKey(a.days, b.days, max);
  m.done = byKey(a.done, b.done, (x, y) => (x.skipped && !y.skipped) ? y : (y.skipped && !x.skipped) ? x : (y.stars || 0) > (x.stars || 0) ? y : x);
  m.srs = byKey(a.srs, b.srs, (x, y) => (y.seen || 0) > (x.seen || 0) ? y : x);
  m.errors = byKey(a.errors, b.errors, (x, y) => (y.last || "") > (x.last || "") || ((y.last || "") === (x.last || "") && (y.n || 0) > (x.n || 0)) ? y : x);
  m.certs = byKey(a.certs, b.certs, (x, y) => (y.pct || 0) > (x.pct || 0) ? y : x);
  m.prac = byKey(a.prac, b.prac, (x, y) => ({ n: max(x.n, y.n), best: max(x.best, y.best), last: [x.last, y.last].filter(Boolean).sort().pop() }));
  m.writing = byKey(a.writing, b.writing, (x, y) => { const keep = (y.done || "") > (x.done || "") || (!x.text && y.text) ? y : x; return Object.assign({}, keep, { score: Math.max(x.score || 0, y.score || 0) || undefined, done: [x.done, y.done].filter(Boolean).sort().pop() || null }); });
  m.dscgP = byKey(a.dscgP, b.dscgP, (x, y) => { const o = Object.assign({}, y, x); Object.keys(o).forEach(k => { const p = x[k], q = y[k]; o[k] = typeof p === "number" || typeof q === "number" ? max(p, q) : p || q; }); return o; });
  m.resume = byKey(a.resume, b.resume, (x, y) => (y.solved || 0) > (x.solved || 0) ? y : x);
  m.unlocked = [...new Set([...(a.unlocked || []), ...(b.unlocked || [])])];
  const li = id => ORDER.indexOf(id);
  m.level = li(b.level) > li(a.level) ? b.level : a.level || b.level;
  m.name = a.name || b.name;
  m.dcgP = byKey(a.dcgP, b.dcgP, (x, y) => ({ v: max(x.v, y.v) }));
  if (a.routine || b.routine) { const ra = a.routine || {}, rb = b.routine || {}; m.routine = { on: ra.on || rb.on, log: byKey(ra.log, rb.log, (x, y) => [...new Set([...(x || []), ...(y || [])])]), words: [...(rb.words || []), ...(ra.words || []).filter(w => !(rb.words || []).some(z => z.en === w.en))] }; }
  return m;
}
const applyState = st => { S = Object.assign(S, st); try { localStorage.setItem("speakly2", JSON.stringify(S)); } catch (e) {} };

// ----- envoi et récupération -----
function queueSync(delay = 2500) { if (!AUTH) return; clearTimeout(SYNC.timer); SYNC.timer = setTimeout(pushNow, delay); }
async function pushNow() {
  if (!AUTH) return;
  if (SYNC.busy) { SYNC.again = true; return; }
  SYNC.busy = true; SYNC.state = "busy"; syncBadge();
  try {
    let r = await api("/progress", "PUT", { data: JSON.stringify(S), base: AUTH.version || 0 });
    if (r.conflict) { applyState(mergeState(S, JSON.parse(r.data || "null"))); AUTH.version = r.version; r = await api("/progress", "PUT", { data: JSON.stringify(S), base: AUTH.version }); }
    if (r.version) { AUTH.version = r.version; AUTH.last = Date.now(); authSave(); }
    SYNC.state = "ok"; SYNC.err = "";
  } catch (e) { SYNC.state = "err"; SYNC.err = e.message; if (e.status === 401) expire(); }
  SYNC.busy = false; syncBadge();
  if (SYNC.again) { SYNC.again = false; queueSync(500); }
}
async function pullNow(rerender) {
  if (!AUTH) return;
  try {
    const r = await api("/progress");
    if (r.version !== AUTH.version) {
      applyState(mergeState(S, JSON.parse(r.data || "null")));
      AUTH.version = r.version; AUTH.last = Date.now(); authSave();
      if (rerender && app.querySelector(".appbar") && !document.querySelector("#quit")) go("home");
      queueSync(800);
    }
    SYNC.state = "ok"; SYNC.err = "";
  } catch (e) { SYNC.state = e.offline ? "offline" : "err"; SYNC.err = e.message; if (e.status === 401) expire(); }
  syncBadge();
}
function expire() { AUTH = null; authSave(); SYNC.state = "off"; go("account", "login"); toast("Ta session a expiré : reconnecte-toi."); }
window.onSaved = () => queueSync();
function syncBadge() { const b = document.querySelector(".chip.acc"); if (b) b.className = "chip acc " + SYNC.state; }

// ----- écran Compte -----
const pinInput = (id, ph) => `<input class="txt pin" id="${id}" type="password" inputmode="numeric" autocomplete="one-time-code" maxlength="6" pattern="[0-9]*" placeholder="${ph}">`;
SCREENS.account = function (tab) {
  const gate = needGate();
  setNav(S.level && !gate ? "stats" : null);
  const back = gate ? `<div class="gate-head">${logo(64)}<h1>Speakly</h1><p class="muted">De grand débutant à quasi bilingue.</p></div>` : S.level ? backBtn("stats", "Progrès") : `<button class="backlink" onclick="go('welcome')">${icon("back", 17)}Accueil</button>`;
  if (AUTH) {
    const last = AUTH.last ? new Date(AUTH.last).toLocaleString("fr-FR", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" }) : "jamais";
    app.innerHTML = (S.level ? appbar() : "") + back + `<h2>Mon compte</h2>
     <div class="card row" style="margin-top:14px"><div class="iconbtn big-av">${esc(AUTH.name.slice(0, 1).toUpperCase())}</div><div style="flex:1"><b style="font-size:18px">${esc(AUTH.name)}</b>
      <div class="muted small sync-${SYNC.state}">${SYNC.state === "err" || SYNC.state === "offline" ? esc(SYNC.err) : `Progression synchronisée · dernière synchro : ${last}`}</div></div></div>
     <div class="card"><p class="muted small" style="margin-top:0">Ta progression (leçons, erreurs, révisions, sessions en cours, certificats) est enregistrée sur ton compte. Pour la retrouver sur un autre appareil, connecte-toi avec ton pseudo et ton code secret.</p>
      <button class="btn sec" id="sy">${icon("review", 18)}Synchroniser maintenant</button></div>
     <div class="card"><h3>Changer mon code secret</h3>${pinInput("cur", "Code actuel")}<div style="height:10px"></div>${pinInput("np", "Nouveau code (6 chiffres)")}<div style="height:10px"></div>${pinInput("np2", "Confirme le nouveau code")}<p class="msg" id="pm"></p><button class="btn sec" id="cp">Changer le code</button></div>
     <button class="btn ghost" id="lo">${icon("close", 18)}Se déconnecter de cet appareil</button>
     <button class="btn ghost" id="del" style="color:var(--ko)">${icon("reset", 18)}Supprimer mon compte</button>`;
    $("#sy").onclick = async () => { $("#sy").disabled = true; await pullNow(false); await pushNow(); go("account"); toast(SYNC.state === "ok" ? "Progression synchronisée" : SYNC.err); };
    $("#cp").onclick = async () => {
      const cur = $("#cur").value, np = $("#np").value, msg = t => { $("#pm").textContent = t; };
      if (!/^\d{6}$/.test(np)) return msg("Le nouveau code doit faire 6 chiffres.");
      if (np !== $("#np2").value) return msg("Les deux nouveaux codes ne sont pas identiques.");
      try { await api("/pin", "PUT", { current: cur, pin: np }); go("account"); toast("Code secret modifié"); } catch (e) { msg(e.message); }
    };
    $("#lo").onclick = async () => {
      if (!confirm("Se déconnecter ? Ta progression reste sauvegardée sur ton compte et sera effacée de cet appareil.")) return;
      await pushNow(); try { await api("/logout", "POST"); } catch (e) {}
      AUTH = null; authSave(); try { localStorage.removeItem("speakly2"); } catch (e) {} location.reload();
    };
    $("#del").onclick = async () => {
      const pin = prompt("Pour supprimer définitivement ton compte et toute ta progression, tape ton code secret :");
      if (!pin) return;
      try { await api("/account", "DELETE", { pin }); AUTH = null; authSave(); try { localStorage.removeItem("speakly2"); } catch (e) {} location.reload(); } catch (e) { alert(e.message); }
    };
    return;
  }
  const mode = tab === "signup" ? "signup" : "login";
  app.innerHTML = (S.level && !gate ? appbar() : "") + back + `<h2>${mode === "signup" ? "Créer mon compte" : "Se connecter"}</h2>
   <p class="muted" style="margin-top:6px">${mode === "signup" ? (gate ? "Ton compte sauvegarde ta progression en ligne : tu la retrouves sur ton téléphone comme sur ton ordinateur." : "Un compte sauvegarde ta progression en ligne pour la retrouver sur tous tes appareils. Ta progression actuelle est conservée.") : "Connecte-toi avec ton pseudo et ton code secret pour retrouver ta progression."}${gate && S.level ? " La progression déjà faite sur cet appareil sera ajoutée à ton compte." : ""}</p>
   <div class="toggle" id="mt"><button data-m="login" class="${mode === "login" ? "on" : ""}">Se connecter</button><button data-m="signup" class="${mode === "signup" ? "on" : ""}">Créer un compte</button></div>
   <div class="card">
    <p class="small muted" style="margin:0 0 6px">Pseudo</p><input class="txt" id="nm" autocomplete="username" autocapitalize="off" maxlength="24" placeholder="ex. lea.martin" value="${esc(mode === "signup" && S.name && S.name !== "toi" ? S.name : "")}">
    <p class="small muted" style="margin:14px 0 6px">Code secret (6 chiffres)</p>${pinInput("pn", "••••••")}
    ${mode === "signup" ? `<div style="height:10px"></div>${pinInput("pn2", "Confirme ton code")}<p class="muted small" style="margin-bottom:0">Choisis un code que tu retiendras : il te sera demandé à chaque connexion. Il n'est pas récupérable.</p>` : ""}
    <p class="msg" id="msg"></p>
    <button class="btn" id="go">${mode === "signup" ? "Créer mon compte" : "Se connecter"}</button></div>
   ${gate ? `<p class="muted small center">${mode === "login" ? "Pas encore de compte ? Choisis « Créer un compte » : c'est gratuit et il suffit d'un pseudo et d'un code." : "Un compte est nécessaire pour utiliser Speakly : ta progression est ainsi sauvegardée et jamais perdue."}</p>` : ""}`;
  $$("#mt button").forEach(b => b.onclick = () => go("account", b.dataset.m));
  const msg = t => { $("#msg").textContent = t; };
  $("#go").onclick = async () => {
    const name = $("#nm").value.trim(), pin = $("#pn").value;
    if (name.replace(/[^a-z0-9]/gi, "").length < 2) return msg("Choisis un pseudo d'au moins 2 lettres ou chiffres.");
    if (!/^\d{6}$/.test(pin)) return msg("Le code secret doit faire exactement 6 chiffres.");
    if (mode === "signup" && pin !== $("#pn2").value) return msg("Les deux codes ne sont pas identiques.");
    $("#go").disabled = true; msg("");
    try {
      if (mode === "signup") {
        const r = await api("/signup", "POST", { name, pin, data: S.level ? JSON.stringify(S) : undefined });
        AUTH = { token: r.token, name: r.name, version: r.version, last: Date.now() }; authSave();
        if (!S.name) { S.name = r.name; save(); }
        if (!S.level) { go("welcome"); return toast(`Compte créé. Bienvenue ${r.name} !`); }
        go("home"); toast("Compte créé : ta progression est sauvegardée en ligne.");
      } else {
        const r = await api("/login", "POST", { name, pin });
        AUTH = { token: r.token, name: r.name, version: r.version, last: Date.now() }; authSave();
        const remote = JSON.parse(r.data || "null");
        applyState(S.level ? mergeState(S, remote) : Object.assign({}, remote || {}, { openLv: null }));
        if (S.level) queueSync(300);
        go(S.level ? "home" : "welcome"); toast(`Bon retour ${r.name} !`);
      }
    } catch (e) { msg(e.message); $("#go").disabled = false; }
  };
};

// ----- points d'entrée dans l'interface -----
// Connexion obligatoire : tant qu'on n'est pas connecté, tout écran renvoie vers la page de connexion
function needGate() { return !AUTH; }
const _go = go;
go = function (p, ...a) { if (needGate() && p !== "account") return _go("account", "login"); return _go(p, ...a); };
if (AUTH) { pullNow(true); addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") pullNow(true); else if (SYNC.timer) { clearTimeout(SYNC.timer); pushNow(); } }); addEventListener("online", () => queueSync(300)); }
