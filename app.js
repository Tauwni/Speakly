// ===== Speakly =====
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const app = $("#app"), nav = $("#nav");
const ORDER = LEVELS.map(l => l.id);
const ALL = LEVELS.flatMap(l => l.units.flatMap(u => u.lessons));
const LV = id => LEVELS.find(l => l.id === id);
const lessonsOf = id => LV(id).units.flatMap(u => u.lessons);
const SRS_DAYS = [0, 1, 3, 7, 16, 35, 90, 180];
const today = () => new Date().toISOString().slice(0, 10);
const shuffle = a => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const CONTR = { "i'm": "i am", "you're": "you are", "he's": "he is", "she's": "she is", "it's": "it is", "we're": "we are", "they're": "they are", "don't": "do not", "doesn't": "does not", "didn't": "did not", "isn't": "is not", "aren't": "are not", "wasn't": "was not", "weren't": "were not", "can't": "cannot", "won't": "will not", "i'll": "i will", "you'll": "you will", "i'd": "i would", "haven't": "have not", "hasn't": "has not", "hadn't": "had not", "i've": "i have", "let's": "let us", "couldn't": "could not", "shouldn't": "should not", "wouldn't": "would not", "mustn't": "must not", "you've": "you have", "we've": "we have", "they've": "they have", "he'll": "he will", "she'll": "she will", "we'll": "we will", "they'll": "they will", "it'll": "it will", "you'd": "you would", "he'd": "he would", "she'd": "she would", "we'd": "we would", "they'd": "they would", "that's": "that is", "there's": "there is", "what's": "what is" };
const norm = s => String(s).toLowerCase().replace(/[’‘]/g, "'").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9' ]/g, " ").replace(/\s+/g, " ").trim()
  .split(" ").map(w => CONTR[w] || w).join(" ").replace(/can not/g, "cannot");

// ----- état -----
let S;
try { S = JSON.parse(localStorage.getItem("speakly2")); } catch (e) {}
S = Object.assign({ name: "", level: null, done: {}, srs: {}, xp: 0, days: {}, streak: 0, best: 0, lastDay: null, answers: { ok: 0, ko: 0 }, goal: 30, unlocked: [], openLv: null, errors: {}, errView: { f: "todo", g: "cat" }, prac: {}, certs: {}, writing: {}, dailyDone: null }, S || {});
const save = () => { try { localStorage.setItem("speakly2", JSON.stringify(S)); } catch (e) {} };

function addXP(n) {
  S.xp += n; const d = today();
  S.days[d] = (S.days[d] || 0) + n;
  if (S.lastDay !== d) {
    const y = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
    S.streak = S.lastDay === y ? S.streak + 1 : 1; S.lastDay = d; S.best = Math.max(S.best, S.streak);
  }
  save();
}
let VOICE = null;
function pickVoice() { try { const v = speechSynthesis.getVoices(); VOICE = v.find(x => /en-GB/.test(x.lang) && /Google|Daniel|Serena|Kate/.test(x.name)) || v.find(x => /en-GB/.test(x.lang)) || v.find(x => /^en/.test(x.lang)) || null; } catch (e) {} }
try { pickVoice(); speechSynthesis.onvoiceschanged = pickVoice; } catch (e) {}
function speak(t, rate = .92) {
  try { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(t); u.lang = "en-GB"; if (VOICE) u.voice = VOICE; u.rate = rate; speechSynthesis.speak(u); } catch (e) {}
}
const stars = n => `<span class="stars">${[1, 2, 3].map(i => icon("star", 15, i <= n ? "" : "off")).join("")}</span>`;

// ----- progression -----
const lvIndex = id => ORDER.indexOf(id);
function levelOpen(id) {
  const i = lvIndex(id);
  if (i <= lvIndex(S.level) || S.unlocked.includes(id)) return true;
  return lessonsOf(ORDER[i - 1]).every(x => S.done[x.id]);
}
function lessonOpen(les) {
  if (!levelOpen(les.level)) return false;
  if (lvIndex(les.level) < lvIndex(S.level)) return true;
  const list = lessonsOf(les.level), i = list.indexOf(les);
  return i === 0 || !!S.done[list[i - 1].id];
}
const nextLesson = () => ALL.find(l => !S.done[l.id] && lessonOpen(l) && lvIndex(l.level) >= lvIndex(S.level)) || ALL.find(l => !S.done[l.id] && lessonOpen(l));
const dueCards = () => Object.keys(S.srs).filter(k => S.srs[k].due <= today());
function currentLevel() {
  let i = lvIndex(S.level);
  while (i < ORDER.length - 1 && lessonsOf(ORDER[i]).every(x => S.done[x.id])) i++;
  return ORDER[i];
}

// ----- navigation -----
const TABS = [["home", "path", "Parcours"], ["practice", "bolt", "Pratique"], ["errors", "fix", "Erreurs"], ["library", "book", "Ressources"], ["stats", "chart", "Progrès"]];
function setNav(tab) {
  if (!tab) { nav.style.display = "none"; return; }
  nav.style.display = "flex";
  const due = dueCards().length;
  const errN = errTodo().length;
  nav.innerHTML = TABS.map(([k, i, t]) => `<button class="${k === tab ? "on" : ""}" data-go="${k}">${icon(i, 22)}${t}${k === "practice" && due ? `<span class="pill">${due > 99 ? "99+" : due}</span>` : ""}${k === "errors" && errN ? `<span class="pill soft">${errN > 99 ? "99+" : errN}</span>` : ""}</button>`).join("");
  $$("nav button").forEach(b => b.onclick = () => go(b.dataset.go));
}
const SCREENS = {};
function go(p, ...a) { clearInterval(window.__tm); try { speechSynthesis.cancel(); } catch (e) {} $$(".feedback").forEach(f => f.remove()); window.scrollTo(0, 0); SCREENS[p](...a); }
const appbar = () => `<div class="appbar"><div class="brand">${logo(34)}Speakly</div><div class="chips"><span class="chip fire">${icon("flame", 17)}${S.streak}</span><span class="chip xp">${icon("bolt", 17)}${S.xp}</span></div></div>`;

// ===== Accueil =====
SCREENS.welcome = function () {
  setNav(null);
  app.innerHTML = `<div class="welcome"><div class="mark">${logo(84)}</div><h1>Speakly</h1>
   <p class="muted">De grand débutant à quasi bilingue.<br>Un parcours complet, à ton niveau.</p></div>
   <div class="card">
    <div class="feature"><div class="ib">${icon("target")}</div><div><b>Test de niveau adaptatif</b><span>Tu commences exactement là où tu en es.</span></div></div>
    <div class="feature"><div class="ib">${icon("path")}</div><div><b>${ALL.length} leçons, du niveau A0 au C2</b><span>Grammaire, vocabulaire, écoute, lecture et prononciation.</span></div></div>
    <div class="feature"><div class="ib">${icon("brain")}</div><div><b>Mémorisation à long terme</b><span>Chaque mot revient au bon moment pour ne plus l'oublier.</span></div></div>
   </div>
   <div class="card"><h3>Comment tu t'appelles ?</h3><input class="txt" id="nm" placeholder="Ton prénom" style="margin-top:12px" value="${esc(S.name)}">
    <h3 style="margin-top:18px">Ton objectif quotidien</h3>
    <div class="seg" id="goal">${[[10, "Tranquille"], [30, "Régulier"], [50, "Sérieux"], [100, "Intensif"]].map(([g, t]) => `<button data-g="${g}" class="${g === S.goal ? "on" : ""}">${g} XP<small>${t}</small></button>`).join("")}</div>
    <h3 style="margin-top:18px">Ton objectif</h3>
    <div class="seg seg2" id="obj"><button data-o="0" class="${S.dscg ? "" : "on"}">Anglais général<small>Parcours complet</small></button><button data-o="1" class="${S.dscg ? "on" : ""}">Préparer le DSCG<small>UE6 Anglais des affaires</small></button></div>
    <button class="btn" id="test">${icon("target", 20)}Passer le test de niveau</button>
    <button class="btn ghost" id="zero">Je pars de zéro</button></div>`;
  $$("#goal button").forEach(b => b.onclick = () => { S.goal = +b.dataset.g; $$("#goal button").forEach(x => x.classList.toggle("on", x === b)); });
  $$("#obj button").forEach(b => b.onclick = () => { S.dscg = b.dataset.o === "1"; $$("#obj button").forEach(x => x.classList.toggle("on", x === b)); });
  const name = () => { S.name = $("#nm").value.trim() || "toi"; save(); };
  $("#test").onclick = () => { name(); go("placement"); };
  $("#zero").onclick = () => { name(); S.level = "A0"; save(); go("home"); };
};

// ----- test de niveau adaptatif -----
SCREENS.placement = function () {
  setNav(null);
  const T = { lv: 2, n: 0, max: 18, hist: [], used: new Set() };
  const ask = () => {
    if (T.n >= T.max) return finish();
    let lvId = ORDER[T.lv], pool = PLACEMENT[lvId].map((q, i) => [q, lvId + i]).filter(([, k]) => !T.used.has(k));
    if (!pool.length) { const alt = ORDER.map((id, i) => [id, i]).filter(([id]) => PLACEMENT[id].some((q, j) => !T.used.has(id + j))).sort((a, b) => Math.abs(a[1] - T.lv) - Math.abs(b[1] - T.lv))[0]; if (!alt) return finish(); T.lv = alt[1]; return ask(); }
    const [q, key] = pool[Math.floor(Math.random() * pool.length)]; T.used.add(key);
    mcqScreen({ kicker: `Test de niveau · question ${T.n + 1}/${T.max}`, prompt: q[0], opts: shuffle(q.slice(1)), progress: T.n / T.max, idk: true,
      onQuit: () => go("welcome"),
      onPick: v => { const ok = v === q[1]; T.hist.push({ lv: T.lv, ok }); T.n++; T.lv = ok ? Math.min(ORDER.length - 1, T.lv + 1) : Math.max(0, T.lv - 1); ask(); } });
  };
  const finish = () => {
    let res = 0;
    ORDER.forEach((id, i) => { const h = T.hist.filter(x => x.lv === i); if (h.length && h.filter(x => x.ok).length / h.length >= .6) res = i; });
    if (!T.hist.some(x => x.ok)) res = 0;
    S.level = ORDER[res]; save();
    const lv = LEVELS[res], score = T.hist.filter(x => x.ok).length;
    app.innerHTML = `<div class="center"><div class="result-icon" style="background:${lv.color}">${icon("target", 48)}</div>
     <p class="kicker">Résultat du test</p><h1 style="margin:6px 0">Niveau ${lv.id}</h1><h3 class="muted">${lv.name}</h3>
     <p class="muted">${score} bonnes réponses sur ${T.max}</p></div>
     <div class="card"><p style="margin:0">${lv.desc}</p><p class="muted small" style="margin-bottom:0">Ton parcours démarre ici. Les niveaux précédents restent accessibles pour revoir les bases.</p></div>
     <button class="btn" onclick="go('home')">Commencer mon parcours ${icon("arrow", 20)}</button>`;
  };
  ask();
};

// ===== Parcours =====
SCREENS.home = function () {
  if (!S.level) return go("welcome");
  setNav("home");
  const nx = nextLesson(), due = dueCards().length, cur = currentLevel(), tx = S.days[today()] || 0;
  if (!S.openLv) S.openLv = cur;
  const total = ALL.filter(l => S.done[l.id]).length;
  app.innerHTML = appbar() + `
   ${nx ? `<div class="hero"><div class="eyebrow">${nx.level} · ${esc(nx.unit)}</div><h2>${esc(nx.title)}</h2>
     <div class="meta">${nx.words.length} mots · ${nx.quiz.length + nx.sentences.length} exercices de grammaire${nx.read ? " · lecture" : ""}</div>
     <div class="row between small" style="margin-top:16px;opacity:.9"><span>Objectif du jour</span><span>${Math.min(tx, S.goal)} / ${S.goal} XP</span></div>
     <div class="bar" style="margin-top:6px"><i style="width:${Math.min(100, tx / S.goal * 100)}%"></i></div>
     <button class="btn light" onclick="go('lesson','${nx.id}')">${icon("play", 18)}${S.done[ALL[0].id] || total ? "Continuer" : "Commencer"}</button></div>`
     : `<div class="hero"><div class="eyebrow">Parcours terminé</div><h2>Bravo ${esc(S.name)} !</h2><div class="meta">Tu as terminé les ${ALL.length} leçons. Continue les révisions pour garder ton niveau.</div></div>`}
   ${dscgHomeCard()}
   ${due ? `<div class="card row" style="cursor:pointer" onclick="go('review')"><div class="iconbtn">${icon("brain")}</div><div style="flex:1"><b>${due} mot${due > 1 ? "s" : ""} à réviser</b><div class="muted small">Révise maintenant pour les fixer dans ta mémoire</div></div>${icon("arrow", 20)}</div>` : ""}
   ${errTodo().length ? `<div class="card row" style="cursor:pointer" onclick="go('errors')"><div class="iconbtn" style="background:var(--ko-soft);color:var(--ko)">${icon("fix")}</div><div style="flex:1"><b>${errTodo().length} erreur${errTodo().length > 1 ? "s" : ""} à retravailler</b><div class="muted small">Corrige tes points faibles en quelques minutes</div></div>${icon("arrow", 20)}</div>` : ""}
   ${LEVELS.map(lv => {
     const ls = lessonsOf(lv.id), done = ls.filter(x => S.done[x.id]).length, open = levelOpen(lv.id), expanded = S.openLv === lv.id;
     return `<div class="level"><div class="level-head" data-lv="${lv.id}"><div class="level-badge" style="background:${open ? lv.color : "var(--muted)"}">${open ? lv.id : icon("lock", 20)}</div>
      <div class="info"><h3>${lv.name}</h3><div class="muted">${done}/${ls.length} leçons</div><div class="bar" style="height:6px;margin-top:6px"><i style="width:${done / ls.length * 100}%;background:${lv.color}"></i></div></div>
      <span class="muted" style="transform:rotate(${expanded ? 90 : 0}deg);transition:.2s">${icon("arrow", 18)}</span></div>
      ${expanded ? `${!open ? `<div class="card"><p style="margin-top:0">${lv.desc}</p><p class="muted small">Termine le niveau précédent, ou prouve ton niveau avec un test de passage (4 bonnes réponses sur 5).</p><button class="btn sec" onclick="go('levelTest','${lv.id}')">${icon("rocket", 18)}Test de passage ${lv.id}</button></div>` : ""}
       ${lv.units.map(u => `<div class="unit">${esc(u.title)}</div>${u.lessons.map(les => {
         const ok = lessonOpen(les), d = S.done[les.id], isCur = nx && nx.id === les.id;
         return `<div class="lesson ${d ? "done" : ""} ${ok ? "" : "locked"} ${isCur ? "current" : ""}" ${ok ? `data-les="${les.id}"` : ""}>
          <div class="dot" style="${d ? `background:${lv.color}` : ""}">${d ? icon("check", 18) : ok ? (isCur ? icon("play", 16) : icon("cards", 18)) : icon("lock", 16)}</div>
          <div class="t">${esc(les.title)}<small>${les.words.length} mots${les.read ? " · lecture" : ""}</small></div>${d && !d.skipped ? stars(d.stars) : ""}</div>`; }).join("")}`).join("")}` : ""}</div>`;
   }).join("")}`;
  $$(".level-head").forEach(h => h.onclick = () => { S.openLv = S.openLv === h.dataset.lv ? "-" : h.dataset.lv; save(); go("home"); });
  $$("[data-les]").forEach(e => e.onclick = () => go("lesson", e.dataset.les));
};

// ----- test de passage -----
SCREENS.levelTest = function (id) {
  setNav(null);
  const qs = shuffle(PLACEMENT[id]).slice(0, 5); let i = 0, ok = 0;
  const ask = () => {
    if (i >= qs.length) {
      const pass = ok >= 4;
      if (pass) { S.unlocked.push(id); ORDER.slice(0, lvIndex(id)).forEach(x => lessonsOf(x).forEach(les => { if (!S.done[les.id] && lvIndex(x) >= lvIndex(S.level)) S.done[les.id] = { stars: 0, skipped: true }; })); if (lvIndex(S.level) < lvIndex(id)) S.level = id; S.openLv = id; save(); addXP(20); }
      app.innerHTML = `<div class="center"><div class="result-icon" style="${pass ? "" : "background:var(--muted)"}">${icon(pass ? "rocket" : "target", 48)}</div><h1>${ok} / ${qs.length}</h1>
       <p class="muted">${pass ? `Niveau ${id} débloqué. Bienvenue au niveau ${LV(id).name} !` : "Il faut 4 bonnes réponses sur 5. Continue les leçons et retente quand tu veux."}</p></div><button class="btn" onclick="go('home')">Continuer</button>`;
      return;
    }
    const q = qs[i];
    mcqScreen({ kicker: `Test de passage ${id}`, prompt: q[0], opts: shuffle(q.slice(1)), progress: i / qs.length, onQuit: () => go("home"), onPick: v => { if (v === q[1]) ok++; errSeen({ type: "mcq", kicker: "Grammaire", q: q[0], a: q[1], opts: q.slice(1), lv: id }, v === q[1], v); i++; ask(); } });
  };
  ask();
};

// écran QCM simple (tests)
function mcqScreen({ kicker, prompt, opts, progress, onPick, onQuit, idk }) {
  app.innerHTML = `<div class="topbar"><button class="iconbtn plain" id="quit">${icon("close")}</button><div class="bar"><i style="width:${progress * 100}%"></i></div></div>
   <div class="kicker">${kicker}</div><div class="prompt">${esc(prompt)}</div>
   ${opts.map((o, i) => `<button class="opt" data-v="${esc(o)}"><span class="k">${i + 1}</span>${esc(o)}</button>`).join("")}
   ${idk ? `<button class="btn ghost" id="idk">Je ne sais pas</button>` : ""}`;
  $("#quit").onclick = onQuit;
  $$(".opt").forEach(b => b.onclick = () => onPick(b.dataset.v));
  if (idk) $("#idk").onclick = () => onPick(null);
}

// ===== Leçon : introduction =====
SCREENS.lesson = function (id) {
  const les = ALL.find(l => l.id === id); setNav(null);
  const W = les.words; let k = 0, flip = false;
  app.innerHTML = `<div class="topbar"><button class="iconbtn plain" onclick="go('home')">${icon("back")}</button><div style="flex:1"><div class="kicker" style="margin:0">${les.level} · ${esc(les.unit)}</div><h3>${esc(les.title)}</h3></div></div>
   <div class="card tip"><div class="row" style="color:var(--pri)">${icon("memo", 20)}<h3>La règle</h3></div>${les.tip}</div>
   <div class="card"><div class="row between"><div class="row" style="color:var(--pri)">${icon("cards", 20)}<h3>Cartes mémoire</h3></div><span class="muted small" id="cnt"></span></div>
    <div class="flash" id="fc" style="margin-top:14px"></div>
    <div class="row" style="margin-top:12px"><button class="iconbtn" id="prev">${icon("back")}</button><button class="iconbtn" id="sp" style="flex:1;width:auto">${icon("speaker")}</button><button class="iconbtn" id="nxt">${icon("arrow")}</button></div></div>
   <div class="card"><div class="row" style="color:var(--pri)">${icon("book", 20)}<h3>Vocabulaire (${W.length})</h3></div>
    ${W.map((w, i) => `<div class="vocab"><button class="iconbtn plain" data-say="${i}">${icon("speaker", 19)}</button><div><div class="en">${esc(w.en)}</div><div class="fr">${esc(w.fr)}</div></div></div>`).join("")}</div>
   ${les.sentences.length ? `<div class="card"><div class="row" style="color:var(--pri)">${icon("doc", 20)}<h3>Exemples</h3></div>${les.sentences.map((s, i) => `<div class="vocab"><button class="iconbtn plain" data-ss="${i}">${icon("speaker", 19)}</button><div><div class="en">${esc(s.en)}</div><div class="fr">${esc(s.fr)}</div></div></div>`).join("")}</div>` : ""}
   <button class="btn" onclick="go('exercises','${id}')">Commencer les exercices ${icon("arrow", 20)}</button>`;
  const draw = () => { $("#fc").innerHTML = `<div class="w">${esc(flip ? W[k].fr : W[k].en)}</div><div class="h">${flip ? "français" : "touche pour traduire"}</div>`; $("#cnt").textContent = `${k + 1} / ${W.length}`; };
  $("#fc").onclick = () => { flip = !flip; draw(); };
  $("#prev").onclick = () => { k = (k + W.length - 1) % W.length; flip = false; draw(); speak(W[k].en); };
  $("#nxt").onclick = () => { k = (k + 1) % W.length; flip = false; draw(); speak(W[k].en); };
  $("#sp").onclick = () => speak(W[k].en);
  $$("[data-say]").forEach(b => b.onclick = () => speak(W[b.dataset.say].en));
  $$("[data-ss]").forEach(b => b.onclick = () => speak(les.sentences[b.dataset.ss].en));
  draw();
};

// ===== Exercices =====
function buildExercises(les) {
  const W = les.words, near = lessonsOf(les.level).flatMap(l => l.words);
  const distract = (w, key) => { const seen = new Set([norm(w[key])]); const out = []; for (const x of shuffle(W).concat(shuffle(near))) { const v = norm(x[key]); if (!seen.has(v)) { seen.add(v); out.push(x[key]); } if (out.length === 3) break; } return out; };
  const vocab = shuffle(W).map((w, i) => {
    const t = i % 5;
    if (t === 0) return { type: "mcq", kicker: "Vocabulaire", q: `Que signifie « ${w.en} » ?`, say: w.en, a: w.fr, opts: shuffle([w.fr, ...distract(w, "fr")]), word: w };
    if (t === 1) return { type: "mcq", kicker: "Vocabulaire", q: `Comment dit-on « ${w.fr} » ?`, a: w.en, opts: shuffle([w.en, ...distract(w, "en")]), word: w };
    if (t === 2) return { type: "listen", kicker: "Compréhension orale", q: "Écoute et choisis la traduction", say: w.en, a: w.fr, opts: shuffle([w.fr, ...distract(w, "fr")]), word: w };
    if (t === 3) return { type: "type", kicker: "Écriture", q: `Écris en anglais : « ${w.fr} »`, a: w.en, word: w };
    return { type: "dictation", kicker: "Dictée", q: "Écris ce que tu entends", say: w.en, a: w.en, word: w };
  });
  const allSent = lessonsOf(les.level).flatMap(l => l.sentences);
  const sent = les.sentences.flatMap((s, i) => {
    const base = i % 2 ? { type: "type", kicker: "Traduction", q: `Traduis : « ${s.fr} »`, a: s.en, say: s.en } : { type: "order", kicker: "Construction de phrase", q: `Traduis : « ${s.fr} »`, a: s.en, say: s.en };
    let extra;
    if (i % 3 === 0) extra = clozeEx(s);
    else if (i % 3 === 1) extra = { type: "dictation", kicker: "Dictée de phrase", q: "Écris la phrase que tu entends", say: s.en, a: s.en };
    else { const o = []; for (const x of shuffle(allSent)) { if (x.fr !== s.fr && !o.includes(x.fr)) o.push(x.fr); if (o.length === 3) break; }
      extra = o.length >= 2 ? { type: "mcq", kicker: "Compréhension", q: `Que veut dire : « ${s.en} » ?`, say: s.en, a: s.fr, opts: shuffle([s.fr, ...o]), cat: "sent" } : null; }
    return extra ? [base, extra] : [base];
  });
  const match = W.length >= 4 ? [matchEx(shuffle(W).slice(0, 5))].concat(W.length >= 10 ? [matchEx(shuffle(W).slice(0, 5))] : []) : [];
  const gram = les.quiz.map(q => ({ type: "mcq", kicker: "Grammaire", q: q[0], a: q[1], opts: shuffle(q.slice(1)) }));
  const read = les.read ? les.read.q.map(q => ({ type: "read", kicker: "Lecture", text: les.read.t, q: q[0], a: q[1], opts: shuffle(q.slice(1)) })) : [];
  const speakEx = (window.SpeechRecognition || window.webkitSpeechRecognition) && les.sentences[0] ? [{ type: "speak", kicker: "Prononciation", q: "Lis cette phrase à voix haute", a: les.sentences[0].en, say: les.sentences[0].en }] : [];
  return vocab.concat(match, shuffle(sent.concat(gram)), read, speakEx);
}
const matchEx = ws => ({ type: "match", kicker: "Association", q: "Associe chaque mot à sa traduction", pairs: ws, a: ws.map(w => `${w.en} = ${w.fr}`).join(" · "), track: false });
function clozeEx(s) {
  const ws = s.en.split(" "), clean = w => w.replace(/^[^A-Za-z']+|[^A-Za-z']+$/g, "");
  const idx = shuffle(ws.map((w, i) => i).filter(i => clean(ws[i]).length >= 2 && ws.length > 1));
  if (!idx.length) return null;
  const k = idx[0], word = clean(ws[k]);
  return { type: "type", kicker: "Phrase à trous", q: `Complète : « ${ws.map((w, i) => i === k ? w.replace(word, "___") : w).join(" ")} »`, sub: s.fr, a: word, say: s.en, exact: true, ph: "Le mot manquant", cat: "sent" };
}

SCREENS.exercises = function (id) {
  const les = ALL.find(l => l.id === id); setNav(null);
  const queue = buildExercises(les), total = queue.length; let firstTry = 0, solved = 0; const missed = new Set();
  const next = () => {
    if (!queue.length) return result();
    const e = queue.shift();
    e.track = !["speak", "match"].includes(e.type); e.les = les.id; e.lv = les.level;
    play(e, (good, given) => {
      if (e.track && (!good || !missed.has(e))) errSeen(e, good, given);
      if (good) { solved++; if (!missed.has(e)) firstTry++; S.answers.ok++; if (e.word) srsAdd(e.word, true); }
      else { S.answers.ko++; missed.add(e); queue.splice(Math.min(queue.length, 3), 0, e); if (e.word) srsAdd(e.word, false); }
      save(); next();
    }, solved / total, () => go("lesson", id));
  };
  const result = () => {
    const pct = Math.round(firstTry / total * 100), st = pct >= 90 ? 3 : pct >= 70 ? 2 : 1, gain = 10 + st * 5;
    const prev = S.done[id];
    S.done[id] = { stars: Math.max(st, prev && !prev.skipped ? prev.stars : 0), pct, date: today() };
    les.words.forEach(w => srsAdd(w, null));
    addXP(gain);
    const msg = pct < 60 ? "Score un peu juste : refais la leçon pour bien fixer les bases. Les mots ratés reviendront dans tes révisions." : pct >= 90 ? "Excellent travail, tu maîtrises cette leçon." : "Bien joué. Les mots ratés reviendront dans tes révisions.";
    app.innerHTML = `<div class="center"><div class="result-icon">${icon("trophy", 48)}</div><p class="kicker">Leçon terminée</p><h1>${esc(les.title)}</h1>
     <div style="margin:12px 0;transform:scale(1.8)">${stars(st)}</div></div>
     <div class="grid3"><div class="stat">${icon("target", 20)}<b>${pct}%</b><span>du premier coup</span></div><div class="stat">${icon("bolt", 20)}<b>+${gain}</b><span>XP gagnés</span></div><div class="stat">${icon("review", 20)}<b>${missed.size}</b><span>à revoir</span></div></div>
     <div class="card"><p style="margin:0">${msg}</p></div>
     ${missed.size ? `<button class="btn ghost" onclick="go('errors')">${icon("fix", 18)}Voir mes erreurs de la leçon</button>` : ""}<button class="btn" onclick="go('home')">Continuer ${icon("arrow", 20)}</button>${pct < 60 ? `<button class="btn sec" onclick="go('exercises','${id}')">Refaire la leçon</button>` : ""}`;
  };
  next();
};

// ----- moteur d'exercices -----
function play(e, cb, progress, quit) {
  let body = "";
  const listenBtn = `<div class="center" style="margin:26px 0"><button class="iconbtn big" id="sp">${icon("speaker", 38)}</button><div><button class="btn ghost" id="slow" style="width:auto;margin:6px auto 0;padding:8px 14px">Plus lentement</button></div></div>`;
  if (e.type === "mcq" || e.type === "listen" || e.type === "read") {
    body = e.type === "listen" ? `<div class="prompt">${e.q}</div>${listenBtn}`
      : e.type === "read" ? `<div class="passage">${esc(e.text)}</div><div class="prompt" style="font-size:19px">${esc(e.q)}</div>`
      : `<div class="prompt">${esc(e.q)}</div>${e.say ? `<button class="iconbtn" id="sp" style="margin-bottom:6px">${icon("speaker")}</button>` : ""}`;
    body += e.opts.map((o, i) => `<button class="opt" data-v="${esc(o)}"><span class="k">${i + 1}</span>${esc(o)}</button>`).join("");
  } else if (e.type === "type" || e.type === "dictation") {
    body = `<div class="prompt">${esc(e.q)}</div>${e.sub ? `<p class="muted" style="margin-top:-6px">${esc(e.sub)}</p>` : ""}${e.type === "dictation" ? listenBtn : ""}<input class="txt" id="in" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="${esc(e.ph || "Ta réponse en anglais")}"><button class="btn" id="val">Valider</button>`;
  } else if (e.type === "order") {
    body = `<div class="prompt">${esc(e.q)}</div><div class="wordbank answerline" id="ans"></div><div class="wordbank" id="bank">${shuffle(e.a.split(" ")).map(w => `<button class="word">${esc(w)}</button>`).join("")}</div><button class="btn" id="val">Valider</button>`;
  } else if (e.type === "match") {
    const col = (side) => shuffle(e.pairs.map((w, i) => [w, i])).map(([w, i]) => `<button class="mt" data-s="${side}" data-k="${i}">${esc(w[side])}</button>`).join("");
    body = `<div class="prompt">${esc(e.q)}</div><div class="match"><div>${col("en")}</div><div>${col("fr")}</div></div>`;
  } else if (e.type === "speak") {
    body = `<div class="prompt">${esc(e.q)}</div><div class="card center" style="font-size:21px;font-weight:700">${esc(e.a)}<div style="margin-top:10px"><button class="iconbtn" id="sp">${icon("speaker")}</button></div></div>
     <div class="center"><button class="iconbtn big" id="mic" style="background:var(--pri);color:#fff">${icon("mic", 36)}</button><p id="heard" class="muted">Appuie et parle</p></div><button class="btn ghost" id="skip">Je ne peux pas parler maintenant</button>`;
  }
  app.innerHTML = `<div class="topbar"><button class="iconbtn plain" id="quit">${icon("close")}</button><div class="bar"><i style="width:${progress * 100}%"></i></div></div><div class="kicker">${e.kicker || ""}</div>${body}`;
  $("#quit").onclick = quit;
  if ($("#sp")) $("#sp").onclick = () => speak(e.say || e.a);
  if ($("#slow")) $("#slow").onclick = () => speak(e.say, .6);
  if (e.type === "listen" || e.type === "dictation") setTimeout(() => speak(e.say), 250);

  let answered = false;
  const feedback = (good, extra = "", given) => {
    if (answered) return; answered = true;
    if (good && e.say && !e.quiet) speak(e.say);
    const f = document.createElement("div"); f.className = "feedback " + (good ? "good" : "bad");
    f.innerHTML = `<div class="in"><div class="title">${icon(good ? "check" : "close", 22)}${good ? ["Parfait !", "Excellent !", "Bien joué !", "Exact !"][Math.floor(Math.random() * 4)] : "Pas tout à fait"}</div>
      ${good ? "" : `${given != null && given !== "" ? `<p style="margin:8px 0 0">Ta réponse : <s>${esc(given)}</s></p>` : ""}<p style="margin:8px 0 0">Bonne réponse : <b>${esc(e.a)}</b></p>${e.track ? `<p class="small" style="margin:8px 0 0;opacity:.8">Ajoutée à ton onglet Erreurs pour la retravailler.</p>` : ""}`}${extra}${e.note ? `<p class="small" style="margin:8px 0 0">${esc(e.note)}</p>` : ""}<button class="btn ${good ? "ok" : "ko"}" id="cont">Continuer</button></div>`;
    document.body.appendChild(f);
    const go2 = () => { document.removeEventListener("keydown", kd); f.remove(); cb(good, given); };
    const kd = ev => { if (ev.key === "Enter") { ev.preventDefault(); go2(); } };
    setTimeout(() => document.addEventListener("keydown", kd), 50);
    $("#cont").onclick = go2;
  };
  if (e.opts) {
    const pick = b => { const good = b.dataset.v === e.a; $$(".opt").forEach(x => { x.disabled = true; if (x.dataset.v === e.a) x.classList.add("ok"); }); if (!good) b.classList.add("ko"); feedback(good, "", b.dataset.v); };
    $$(".opt").forEach(b => b.onclick = () => pick(b));
    const kd = ev => { const n = +ev.key; if (n >= 1 && n <= e.opts.length && !answered) { document.removeEventListener("keydown", kd); pick($$(".opt")[n - 1]); } };
    document.addEventListener("keydown", kd);
  }
  if (e.type === "type" || e.type === "dictation") {
    const check = () => {
      const v = $("#in").value; if (!v.trim()) return; $("#val").disabled = true;
      const g = norm(v), alts = e.a.split(/\s*\/\s*/).map(norm);
      const good = alts.includes(g);
      const close = !good && !e.exact && alts.some(t => t.length > 4 && lev(g, t) <= Math.max(1, Math.floor(t.length / 9)));
      feedback(good || close, close ? `<p style="margin:8px 0 0">Presque ! Attention à l'orthographe : <b>${esc(e.a)}</b></p>` : "", v.trim());
    };
    $("#val").onclick = check; $("#in").onkeydown = ev => { if (ev.key === "Enter") { ev.preventDefault(); check(); } }; $("#in").focus();
  }
  if (e.type === "order") {
    const ans = $("#ans"), bank = $("#bank");
    const move = ev => { const w = ev.target.closest(".word"); if (!w) return; (ev.currentTarget === bank ? ans : bank).appendChild(w); speak(w.textContent); };
    ans.onclick = move; bank.onclick = move;
    $("#val").onclick = () => { $("#val").disabled = true; const g = [...ans.children].map(c => c.textContent).join(" "); feedback(norm(g) === norm(e.a), "", g); };
  }
  if (e.type === "match") {
    let sel = null, miss = 0, left = e.pairs.length;
    $$(".mt").forEach(b => b.onclick = () => {
      if (b.dataset.s === "en") speak(b.textContent);
      if (!sel || sel.dataset.s === b.dataset.s) { if (sel) sel.classList.remove("on"); sel = b; b.classList.add("on"); return; }
      const a = sel; sel = null; a.classList.remove("on");
      if (a.dataset.k === b.dataset.k) { [a, b].forEach(x => { x.classList.add("ok"); x.disabled = true; }); if (--left === 0) feedback(miss <= 1); }
      else { miss++; [a, b].forEach(x => { x.classList.add("ko"); setTimeout(() => x.classList.remove("ko"), 450); }); }
    });
  }
  if (e.type === "speak") {
    $("#skip").onclick = () => cb(true);
    $("#mic").onclick = () => {
      try {
        const R = new (window.SpeechRecognition || window.webkitSpeechRecognition)(); R.lang = "en-GB";
        $("#heard").textContent = "J'écoute…";
        R.onresult = ev => { const h = ev.results[0][0].transcript; $("#heard").textContent = `Entendu : « ${h} »`;
          const a = norm(e.a).split(" "), b = norm(h).split(" "), hit = a.filter(w => b.includes(w)).length / a.length;
          feedback(hit >= .7, `<p style="margin:8px 0 0">Mots reconnus : ${Math.round(hit * 100)} %</p>`); };
        R.onerror = () => { $("#heard").textContent = "Micro indisponible. Tu peux passer cet exercice."; };
        R.start();
      } catch (err) { $("#heard").textContent = "Micro indisponible."; }
    };
  }
}
function lev(a, b) { const d = Array.from({ length: a.length + 1 }, (_, i) => [i]); for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); return d[a.length][b.length]; }

// ===== Répétition espacée =====
const key = w => w.en + "|" + w.fr;
const addDays = n => { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
function srsAdd(w, good) {
  const k = key(w); const isNew = !S.srs[k];
  const c = S.srs[k] || { box: 0, due: addDays(1), seen: 0, ok: 0 };
  if (good === true) { c.ok++; c.seen++; } else if (good === false) { c.seen++; c.box = 0; c.due = addDays(1); }
  S.srs[k] = c; if (isNew) c.due = addDays(1);
}
function srsGrade(k, good) {
  const c = S.srs[k]; c.seen++; if (good) c.ok++;
  c.box = good ? Math.min(SRS_DAYS.length - 1, c.box + 1) : 0;
  c.due = addDays(good ? SRS_DAYS[c.box] : 1); save();
}
SCREENS.review = function () {
  const due = shuffle(dueCards()).slice(0, 20);
  const total = Object.keys(S.srs).length, mastered = Object.values(S.srs).filter(c => c.box >= 3).length;
  if (!due.length) {
    setNav("practice");
    app.innerHTML = appbar() + pracBack() + `<h2>Révisions</h2><div class="card center"><div class="result-icon" style="margin-top:6px">${icon("brain", 44)}</div><h3>Tout est à jour</h3>
     <p class="muted">Chaque mot appris revient automatiquement au bon moment : après 1 jour, 3 jours, 7 jours, 16 jours… C'est la méthode la plus efficace pour retenir sur le long terme.</p></div>
     <div class="grid2"><div class="stat">${icon("cards", 20)}<b>${total}</b><span>mots rencontrés</span></div><div class="stat">${icon("brain", 20)}<b>${mastered}</b><span>mots maîtrisés</span></div></div>
     ${total ? `<button class="btn sec" id="free">${icon("review", 18)}Révision libre (20 mots au hasard)</button>` : ""}`;
    if ($("#free")) $("#free").onclick = () => runReview(shuffle(Object.keys(S.srs)).slice(0, 20), false);
    return;
  }
  runReview(due, true);
};
function runReview(list, graded) {
  setNav(null); let i = 0, ok = 0;
  const all = Object.keys(S.srs).map(k => { const [en, fr] = k.split("|"); return { en, fr }; });
  const ask = () => {
    if (i >= list.length) {
      addXP(ok * 2);
      app.innerHTML = `<div class="center"><div class="result-icon">${icon("brain", 48)}</div><p class="kicker">Révision terminée</p><h1>${ok} / ${list.length}</h1><p class="muted">mots retenus · +${ok * 2} XP</p></div><button class="btn" onclick="go('home')">Continuer</button>`;
      return;
    }
    const k = list[i], [en, fr] = k.split("|"), box = S.srs[k].box, mode = box >= 3 ? 3 : box >= 2 ? 2 : Math.random() < .5 ? 0 : 1;
    const others = shuffle(all.filter(x => x.en !== en));
    let e;
    if (mode === 3) e = { type: "type", kicker: "Révision · rappel actif", q: `Écris en anglais : « ${fr} »`, a: en };
    else if (mode === 2) e = { type: "dictation", kicker: "Révision · dictée", q: "Écris ce que tu entends", say: en, a: en };
    else if (mode === 0) e = { type: "mcq", kicker: "Révision", q: `Que signifie « ${en} » ?`, say: en, a: fr, opts: shuffle([fr, ...others.slice(0, 3).map(x => x.fr)]) };
    else e = { type: "mcq", kicker: "Révision", q: `Comment dit-on « ${fr} » ?`, a: en, opts: shuffle([en, ...others.slice(0, 3).map(x => x.en)]) };
    if (e.opts && e.opts.length < 2) e = { type: "type", kicker: "Révision", q: `Écris en anglais : « ${fr} »`, a: en };
    e.word = { en, fr }; e.track = true; const wl = WORD_LES[k]; if (wl) { e.les = wl.id; e.lv = wl.level; }
    play(e, (good, given) => { errSeen(e, good, given); if (graded) srsGrade(k, good); else save(); if (good) ok++; i++; ask(); }, i / list.length, () => go("home"));
  };
  ask();
}

// ===== Suivi des erreurs =====
const WORD_LES = {}; ALL.forEach(l => l.words.forEach(w => { if (!WORD_LES[key(w)]) WORD_LES[key(w)] = l; }));
const ERR_CATS = { gram: ["Grammaire", "memo"], conj: ["Verbes et conjugaison", "review"], vocab: ["Vocabulaire", "book"], expr: ["Expressions et faux amis", "sparkle"], listen: ["Écoute et dictée", "headphones"], sent: ["Phrases et traduction", "doc"], read: ["Lecture", "search"] };
const ERR_FIX = 2; // réussites d'affilée pour considérer l'erreur corrigée
const errTodo = () => Object.values(S.errors || {}).filter(x => !x.fixed);
function errCat(e) {
  if (e.cat) return e.cat;
  const k = e.kicker || "";
  if (/Grammaire/.test(k)) return "gram";
  if (/orale|ictée/.test(k)) return "listen";
  if (/Traduction|Construction/.test(k)) return "sent";
  if (/Lecture/.test(k)) return "read";
  return "vocab";
}
const errId = e => e.errId || (e.word ? `w|${errCat(e)}|${key(e.word)}` : `${e.les || e.lv || ""}|${e.q}|${e.a}`);
function errSeen(e, good, given) {
  const id = errId(e), x = S.errors[id];
  if (good) {
    if (x && !x.fixed && ++x.streak >= ERR_FIX) x.fixed = today();
  } else if (x) {
    Object.assign(x, { n: x.n + 1, streak: 0, fixed: null, last: today(), given: given ?? x.given });
  } else {
    S.errors[id] = { id, cat: errCat(e), type: e.type, kicker: e.kicker, q: e.q, a: e.a, say: e.say || null, opts: e.opts ? [...e.opts] : null, note: e.note || null, sub: e.sub || null, exact: !!e.exact, ph: e.ph || null,
      word: e.word ? { en: e.word.en, fr: e.word.fr } : null, les: e.les || null, lv: e.lv || null, src: e.src || null, given: given ?? null, n: 1, streak: 0, fixed: null, first: today(), last: today() };
  }
  save();
}
function errExercise(x) {
  const les = x.les && ALL.find(l => l.id === x.les);
  if (!ERR_CATS[x.cat]) x.cat = "vocab";
  const e = { type: x.type, kicker: `Retravail · ${ERR_CATS[x.cat][0]}`, q: x.q, a: x.a, say: x.say || undefined, errId: x.id, track: false, note: x.note || undefined, sub: x.sub || undefined, exact: x.exact, ph: x.ph || undefined };
  if (x.opts) e.opts = shuffle(x.opts);
  if (x.type === "read") { if (!les || !les.read) return null; e.text = les.read.t; }
  return e;
}
function runErrors(ids) {
  setNav(null);
  const queue = ids.map(id => S.errors[id]).filter(Boolean).map(x => [x, errExercise(x)]).filter(([, e]) => e);
  const total = queue.length, retried = new Set(); let done = 0, fixedNow = 0;
  const next = () => {
    if (!queue.length) {
      const still = ids.filter(id => S.errors[id] && !S.errors[id].fixed).length;
      addXP(fixedNow * 3 + 2);
      app.innerHTML = `<div class="center"><div class="result-icon">${icon("fix", 48)}</div><p class="kicker">Session terminée</p><h1>${fixedNow} corrigée${fixedNow > 1 ? "s" : ""}</h1>
       <p class="muted">${still ? `${still} erreur${still > 1 ? "s" : ""} de cette session reste${still > 1 ? "nt" : ""} à retravailler. Une erreur est considérée comme corrigée après ${ERR_FIX} réussites d'affilée.` : "Toutes les erreurs de cette session sont corrigées. Beau travail."} · +${fixedNow * 3 + 2} XP</p></div>
       <button class="btn" onclick="go('errors')">Retour à mes erreurs</button>`;
      return;
    }
    const [x, e] = queue.shift();
    play(e, (good, given) => {
      const was = x.fixed;
      errSeen(e, good, given);
      if (good) { done++; S.answers.ok++; if (!was && x.fixed) fixedNow++; else if (!x.fixed && !retried.has(x.id)) { retried.add(x.id); queue.splice(Math.min(queue.length, 4), 0, [x, errExercise(x)]); } }
      else { S.answers.ko++; if (!retried.has(x.id)) { retried.add(x.id); queue.splice(Math.min(queue.length, 3), 0, [x, errExercise(x)]); } }
      save(); next();
    }, done / Math.max(total, done + queue.length + 1), () => go("errors"));
  };
  next();
}
const errSrc = x => x.src || (x.lv ? `Test de passage ${x.lv}` : "Pratique");
const errPick = list => [...list].sort((a, b) => b.n - a.n || a.last.localeCompare(b.last)).slice(0, 15).map(x => x.id);
SCREENS.errors = function () {
  setNav("errors");
  const E = Object.values(S.errors), todo = E.filter(x => !x.fixed), fixed = E.filter(x => x.fixed), V = S.errView;
  const head = appbar() + `<h2>Erreurs</h2><p class="muted" style="margin-top:6px">Chaque erreur est enregistrée ici. Elle est corrigée quand tu la réussis ${ERR_FIX} fois de suite.</p>`;
  if (!E.length) {
    app.innerHTML = head + `<div class="card center"><div class="result-icon" style="margin-top:6px;background:var(--ok)">${icon("check", 44)}</div><h3>Aucune erreur pour l'instant</h3>
     <p class="muted">Dès que tu te trompes dans une leçon, une révision ou un test, la question apparaît ici avec ta réponse et la bonne réponse, classée par thème et par leçon.</p></div>
     <button class="btn" onclick="go('home')">${icon("play", 18)}Continuer le parcours</button>`;
    return;
  }
  const lesOf = id => ALL.find(l => l.id === id);
  const weak = Object.entries(todo.reduce((m, x) => { if (x.les) m[x.les] = (m[x.les] || 0) + 1; return m; }, {})).sort((a, b) => b[1] - a[1]).slice(0, 3);
  const shown = V.f === "todo" ? todo : V.f === "fixed" ? fixed : E;
  const groups = {};
  shown.forEach(x => { const g = V.g === "cat" ? x.cat : (x.les || "test:" + errSrc(x)); (groups[g] = groups[g] || []).push(x); });
  const gKeys = Object.keys(groups).sort((a, b) => V.g === "cat" ? Object.keys(ERR_CATS).indexOf(a) - Object.keys(ERR_CATS).indexOf(b)
    : (a.startsWith("test:") ? 1e4 : ALL.indexOf(lesOf(a))) - (b.startsWith("test:") ? 1e4 : ALL.indexOf(lesOf(b))));
  const gTitle = g => V.g === "cat" ? [ERR_CATS[g][0], icon(ERR_CATS[g][1], 18), ""]
    : g.startsWith("test:") ? [g.slice(5), icon("rocket", 18), ""]
    : [lesOf(g).title, `<span class="tag" style="background:${LV(lesOf(g).level).color};color:#fff">${lesOf(g).level}</span>`, lesOf(g).unit];
  const item = x => {
    const l = x.les && lesOf(x.les), audio = x.say || (x.word && x.word.en);
    const prompt = x.type === "dictation" || x.type === "listen" ? `${x.kicker} · mot entendu : <b>${esc(x.say || x.a)}</b>` : esc(x.q);
    return `<div class="err ${x.fixed ? "is-fixed" : ""}">
      <div class="row between" style="align-items:flex-start;gap:10px"><div class="q">${prompt}</div>${audio ? `<button class="iconbtn plain sm" data-say="${esc(audio)}">${icon("speaker", 18)}</button>` : ""}</div>
      ${x.given ? `<div class="ans bad">${icon("close", 15)}<span>${esc(x.given)}</span></div>` : `<div class="ans bad">${icon("close", 15)}<span class="muted">Sans réponse</span></div>`}
      <div class="ans good">${icon("check", 15)}<span>${esc(x.a)}</span></div>
      <div class="meta"><span>${V.g === "cat" ? (l ? `${l.level} · ${esc(l.title)}` : esc(errSrc(x))) : ERR_CATS[x.cat][0]}</span>
       <span class="row" style="gap:8px">${x.n > 1 ? `<span class="tag ko">${x.n} fois</span>` : ""}${x.fixed ? `<span class="tag okk">${icon("check", 12)}corrigée</span>` : `<span class="dots" title="Réussites d'affilée">${[...Array(ERR_FIX)].map((_, i) => `<i class="${i < x.streak ? "on" : ""}"></i>`).join("")}</span>`}</span></div></div>`;
  };
  app.innerHTML = head + `
   <div class="grid3" style="margin-top:12px"><div class="stat">${icon("fix", 20)}<b>${todo.length}</b><span>à retravailler</span></div><div class="stat">${icon("check", 20)}<b>${fixed.length}</b><span>corrigées</span></div><div class="stat">${icon("target", 20)}<b>${Math.round(fixed.length / E.length * 100)}%</b><span>taux de correction</span></div></div>
   ${todo.length ? `<button class="btn" id="runAll">${icon("play", 18)}Retravailler mes erreurs (${Math.min(15, todo.length)})</button>` : `<div class="card row"><div class="iconbtn" style="background:var(--ok-soft);color:var(--ok)">${icon("trophy")}</div><div><b>Toutes tes erreurs sont corrigées</b><div class="muted small">Les prochaines apparaîtront ici automatiquement.</div></div></div>`}
   ${weak.length ? `<div class="card"><div class="row" style="color:var(--pri)">${icon("target", 20)}<h3>Tes points faibles</h3></div>${weak.map(([id, n]) => { const l = lesOf(id); return `<div class="vocab"><div style="flex:1"><div class="en">${esc(l.title)}</div><div class="fr">${l.level} · ${esc(l.unit)} · ${n} erreur${n > 1 ? "s" : ""}</div></div><button class="btn sec mini" data-les="${id}">Revoir</button></div>`; }).join("")}</div>` : ""}
   <div class="seg seg3" id="ef">${[["todo", "À retravailler", todo.length], ["fixed", "Corrigées", fixed.length], ["all", "Toutes", E.length]].map(([k, t, n]) => `<button data-f="${k}" class="${V.f === k ? "on" : ""}">${n}<small>${t}</small></button>`).join("")}</div>
   <div class="toggle" id="eg"><button data-g="cat" class="${V.g === "cat" ? "on" : ""}">Par thème</button><button data-g="les" class="${V.g === "les" ? "on" : ""}">Par leçon</button></div>
   ${gKeys.length ? gKeys.map((g, i) => { const [t, ic, sub] = gTitle(g), list = groups[g].sort((a, b) => b.last.localeCompare(a.last) || b.n - a.n), open = list.filter(x => !x.fixed);
     return `<details class="memo errgroup" ${i < 3 ? "open" : ""}><summary><span class="row" style="gap:10px;min-width:0">${ic}<span style="min-width:0"><span class="gt">${esc(t)}</span>${sub ? `<small class="muted" style="display:block;font-weight:500">${esc(sub)}</small>` : ""}</span></span><span class="tag">${list.length}</span></summary>
      ${open.length ? `<button class="btn sec mini" style="margin:12px 0 2px" data-run="${esc(g)}">${icon("play", 16)}Retravailler ce groupe (${Math.min(15, open.length)})</button>` : ""}
      ${list.map(item).join("")}</details>`; }).join("") : `<p class="muted center" style="margin:24px 0">${V.f === "fixed" ? "Aucune erreur corrigée pour l'instant." : "Rien à retravailler ici."}</p>`}
   ${fixed.length ? `<button class="btn ghost" id="clear">${icon("reset", 18)}Effacer les erreurs corrigées</button>` : ""}`;
  if ($("#runAll")) $("#runAll").onclick = () => runErrors(errPick(todo));
  $$("#ef button").forEach(b => b.onclick = () => { V.f = b.dataset.f; save(); go("errors"); });
  $$("#eg button").forEach(b => b.onclick = () => { V.g = b.dataset.g; save(); go("errors"); });
  $$("[data-run]").forEach(b => b.onclick = () => runErrors(errPick(groups[b.dataset.run].filter(x => !x.fixed))));
  $$("[data-les]").forEach(b => b.onclick = () => go("lesson", b.dataset.les));
  $$("[data-say]").forEach(b => b.onclick = ev => { ev.preventDefault(); speak(b.dataset.say); });
  if ($("#clear")) $("#clear").onclick = () => { if (confirm(`Effacer les ${fixed.length} erreurs corrigées de l'historique ?`)) { fixed.forEach(x => delete S.errors[x.id]); save(); go("errors"); } };
};

// ===== Mémo de grammaire =====
SCREENS.memo = function () {
  setNav("library");
  app.innerHTML = appbar() + libBack() + `<h2>Grammaire</h2><p class="muted">Toutes les règles du parcours, classées par niveau.</p>
   <div class="searchbox">${icon("search", 20)}<input class="txt" id="q" placeholder="Rechercher une règle (ex. present perfect)"></div><div id="res"></div>`;
  const draw = () => {
    const q = norm($("#q").value);
    $("#res").innerHTML = LEVELS.map(lv => {
      const ls = lessonsOf(lv.id).filter(l => !q || norm(l.title + " " + l.tip.replace(/<[^>]+>/g, " ")).includes(q));
      return ls.length ? `<div class="unit" style="color:${lv.color}">${lv.id} · ${lv.name}</div>${ls.map(l => `<details class="memo"><summary><span>${esc(l.title)}</span><span class="tag">${lv.id}</span></summary><div class="tip">${l.tip}</div><button class="btn sec" style="margin-bottom:14px" data-les="${l.id}" ${lessonOpen(l) ? "" : "disabled"}>${lessonOpen(l) ? "Ouvrir la leçon" : "Leçon verrouillée"}</button></details>`).join("")}` : "";
    }).join("") || `<p class="muted center">Aucun résultat.</p>`;
    $$("#res [data-les]").forEach(b => b.onclick = () => go("lesson", b.dataset.les));
  };
  $("#q").oninput = draw; draw();
};

// ===== Lexique =====
SCREENS.words = function () {
  setNav("library");
  const count = ALL.reduce((n, l) => n + l.words.length, 0);
  app.innerHTML = appbar() + libBack() + `<h2>Lexique</h2><p class="muted">${count} mots et expressions du parcours.</p>
   <div class="searchbox">${icon("search", 20)}<input class="txt" id="q" placeholder="Chercher en anglais ou en français"></div><div id="res"></div>`;
  const draw = () => {
    const q = norm($("#q").value);
    $("#res").innerHTML = LEVELS.map(lv => {
      const ws = lessonsOf(lv.id).flatMap(l => l.words).filter(w => !q || norm(w.en).includes(q) || norm(w.fr).includes(q));
      if (!ws.length) return "";
      const shown = q ? ws : ws.slice(0, 40);
      return `<div class="unit" style="color:${lv.color}">${lv.id} · ${lv.name} · ${ws.length} mots</div><div class="card" style="padding:4px 16px">${shown.map(w => { const c = S.srs[key(w)];
        return `<div class="vocab"><button class="iconbtn plain" data-en="${esc(w.en)}">${icon("speaker", 19)}</button><div style="flex:1"><div class="en">${esc(w.en)}</div><div class="fr">${esc(w.fr)}</div></div>${c ? `<span class="tag" style="${c.box >= 3 ? "background:var(--ok-soft);color:var(--ok)" : ""}">${c.box >= 3 ? "maîtrisé" : "en cours"}</span>` : ""}</div>`; }).join("")}
        ${shown.length < ws.length ? `<p class="muted small center">+ ${ws.length - shown.length} autres, utilise la recherche</p>` : ""}</div>`;
    }).join("");
    $$("#res [data-en]").forEach(b => b.onclick = () => speak(b.dataset.en));
  };
  $("#q").oninput = draw; draw();
};

// ===== Progrès =====
SCREENS.stats = function () {
  setNav("stats");
  const mastered = Object.values(S.srs).filter(c => c.box >= 3).length, seen = Object.keys(S.srs).length;
  const acc = S.answers.ok + S.answers.ko ? Math.round(S.answers.ok / (S.answers.ok + S.answers.ko) * 100) : 0;
  const doneN = ALL.filter(l => S.done[l.id] && !S.done[l.id].skipped).length;
  const week = [...Array(7)].map((_, i) => { const d = new Date(Date.now() - (6 - i) * 864e5); return { l: ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"][(d.getDay() + 6) % 7], v: S.days[d.toISOString().slice(0, 10)] || 0 }; });
  const mx = Math.max(S.goal, ...week.map(x => x.v)), cur = currentLevel();
  app.innerHTML = appbar() + `<h2>Progrès</h2>
   <div class="hero" style="margin-top:12px"><div class="eyebrow">Niveau actuel</div><h2>${cur} · ${LV(cur).name}</h2><div class="meta">${LV(cur).desc}</div>
    <div class="row between small" style="margin-top:14px;opacity:.9"><span>Vers le bilinguisme (C2)</span><span>${Math.round(ALL.filter(l => S.done[l.id]).length / ALL.length * 100)} %</span></div>
    <div class="bar" style="margin-top:6px"><i style="width:${ALL.filter(l => S.done[l.id]).length / ALL.length * 100}%"></i></div></div>
   <div class="grid3"><div class="stat">${icon("flame", 20)}<b>${S.streak}</b><span>jours d'affilée</span></div><div class="stat">${icon("trophy", 20)}<b>${S.best}</b><span>meilleure série</span></div><div class="stat">${icon("target", 20)}<b>${acc}%</b><span>précision</span></div>
    <div class="stat">${icon("bolt", 20)}<b>${S.xp}</b><span>XP au total</span></div><div class="stat">${icon("path", 20)}<b>${doneN}</b><span>leçons faites</span></div><div class="stat">${icon("brain", 20)}<b>${mastered}</b><span>mots maîtrisés</span></div></div>
   <div class="card"><div class="row between"><h3>Cette semaine</h3><span class="muted small">objectif ${S.goal} XP/jour</span></div>
    <div class="week">${week.map(x => `<div><i style="height:${Math.max(4, x.v / mx * 100)}px;${x.v >= S.goal ? "" : "opacity:.45"}"></i>${x.l}</div>`).join("")}</div></div>
   <div class="card"><h3>Maîtrise par niveau</h3>${LEVELS.map(lv => { const ls = lessonsOf(lv.id), p = Math.round(ls.filter(x => S.done[x.id]).length / ls.length * 100);
     return `<div style="margin:14px 0 0"><div class="row between small"><b>${lv.id} · ${lv.name}</b><span class="muted">${p} %</span></div><div class="bar" style="margin-top:6px;height:8px"><i style="width:${p}%;background:${lv.color}"></i></div></div>`; }).join("")}</div>
   <div class="card"><h3>Vocabulaire</h3><p class="muted" style="margin-bottom:0">${seen} mots rencontrés, dont ${mastered} maîtrisés sur le long terme.</p></div>
   ${statsExtra()}<div class="card"><div class="row">${icon("settings", 20)}<h3>Réglages</h3></div>
    <p class="muted small">Objectif quotidien</p><div class="seg" id="goal">${[10, 30, 50, 100].map(g => `<button data-g="${g}" class="${g === S.goal ? "on" : ""}">${g}<small>XP</small></button>`).join("")}</div>
    <p class="muted small">Objectif</p><div class="seg seg2" id="obj"><button data-o="0" class="${S.dscg ? "" : "on"}">Anglais général</button><button data-o="1" class="${S.dscg ? "on" : ""}">Préparer le DSCG</button></div>
    <button class="btn sec" onclick="go('placement')">${icon("target", 18)}Repasser le test de niveau</button>
    <button class="btn ghost" id="reset" style="color:var(--ko)">${icon("reset", 18)}Réinitialiser ma progression</button></div>`;
  $$("#goal button").forEach(b => b.onclick = () => { S.goal = +b.dataset.g; save(); go("stats"); });
  $$("#obj button").forEach(b => b.onclick = () => { toggleDscg(b.dataset.o === "1"); go("stats"); window.scrollTo(0, document.body.scrollHeight); });
  $("#reset").onclick = () => { if (confirm("Effacer toute ta progression ? Cette action est définitive.")) { localStorage.removeItem("speakly2"); location.reload(); } };
};

if ("serviceWorker" in navigator && location.protocol.startsWith("http")) navigator.serviceWorker.register("sw.js").catch(() => {});
