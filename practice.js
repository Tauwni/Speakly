// ===== Speakly : onglets Pratique et Ressources, examens, badges =====
const myLv = () => lvIndex(currentLevel());
const atLv = (arr, extra = 1) => { const f = arr.filter(x => lvIndex(x.lv) <= myLv() + extra); return f.length >= 6 ? f : arr; };
const pick = (arr, n) => shuffle(arr).slice(0, n);
const uniq = a => [...new Set(a)];
const optsOf = (a, wrongs) => shuffle([a, ...uniq(wrongs).filter(x => x && x !== a).slice(0, 3)]);
const backBtn = (screen, label) => `<button class="backlink" onclick="go('${screen}')">${icon("back", 17)}${label}</button>`;
const pracBack = () => backBtn("practice", "Pratique");
const libBack = () => backBtn("library", "Ressources");
const lvTag = id => `<span class="tag" style="background:${LV(id).color};color:#fff">${id}</span>`;
const pracInfo = mod => { const p = S.prac[mod]; return p ? `${p.n} séance${p.n > 1 ? "s" : ""} · record ${p.best} %` : "Pas encore essayé"; };
const tile = (go1, ic, title, desc, right = "") => `<button class="tile" onclick="${go1}"><span class="ib">${icon(ic, 22)}</span><span class="tx"><b>${title}</b><small>${desc}</small></span>${right ? `<span class="rt">${right}</span>` : `<span class="muted">${icon("arrow", 18)}</span>`}</button>`;

// ----- moteur de séance -----
function runSet(o, mode) {
  setNav(null);
  const rk = "set:" + (o.key || o.mod), saved = RES()[rk], back = () => go(...(o.back || ["practice"]));
  if (saved && !mode) return resumeAsk(saved, () => runSet(o, "resume"), () => runSet(o, "restart"), back);
  if (mode === "restart") resDrop(rk);
  const R = mode === "resume" && saved;
  let queue, total, first = 0, solved = 0, missed = new Set();
  if (R) { queue = R.q; total = R.total; first = R.first; solved = R.solved; missed = new Set(R.missed); }
  else { queue = o.list.filter(Boolean); queue.forEach((e, i) => e._k = i); total = queue.length; }
  if (!total) return back();
  const keep = cur => resSave(rk, { title: o.title, re: o.re || null, q: [cur, ...queue], total, first, solved, missed: [...missed] });
  const next = () => {
    if (!queue.length) { resDrop(rk); return finish(); }
    const e = queue.shift();
    if (e.track === undefined) e.track = !["match", "speak"].includes(e.type);
    if (!e.les && !e.src) e.src = o.src || o.title;
    keep(e);
    play(e, (good, given) => {
      const firstTime = !missed.has(e._k);
      if ((e.track || e.errId) && (!good || firstTime)) errSeen(e, good, given);
      if (firstTime) { if (e.srsK && S.srs[e.srsK]) srsGrade(e.srsK, good); if (e.srsNew && e.word) srsAdd(e.word, good); }
      if (good) { solved++; if (firstTime) first++; S.answers.ok++; }
      else { S.answers.ko++; missed.add(e._k); if (o.exam) solved++; else queue.splice(Math.min(queue.length, 3), 0, e); }
      save(); next();
    }, solved / total, () => { toast(`Progression sauvegardée : ${o.exam ? "l'examen" : "la série"} reprendra là où tu t'es arrêté.`); back(); });
  };
  const finish = () => {
    const pct = Math.round(first / total * 100), gain = Math.max(2, Math.round(first * (o.xp || 1.5)));
    const p = S.prac[o.mod] = S.prac[o.mod] || { n: 0, best: 0 }; p.n++; p.best = Math.max(p.best, pct); p.last = today();
    const extra = o.done ? o.done(pct, first, total) || "" : "";
    addXP(gain);
    app.innerHTML = `<div class="center"><div class="result-icon">${icon(o.icon || "trophy", 48)}</div><p class="kicker">${esc(o.title)}</p><h1>${first} / ${total}</h1>
      <p class="muted">réussis du premier coup · +${gain} XP</p></div>${extra}${o.after || ""}
      ${o.again ? `<button class="btn" id="again">${icon("review", 18)}Nouvelle série</button>` : ""}<button class="btn ${o.again ? "sec" : ""}" id="bk">Retour</button>`;
    if ($("#again")) $("#again").onclick = o.again;
    $("#bk").onclick = back;
    $$("[data-say]").forEach(b => b.onclick = () => speak(b.dataset.say));
  };
  next();
}

// ===== Onglet Pratique =====
SCREENS.practice = function () {
  setNav("practice");
  const due = dueCards().length, daily = S.dailyDone === today();
  const sec = t => `<div class="unit">${t}</div>`;
  app.innerHTML = appbar() + `<h2>Pratique</h2><p class="muted" style="margin-top:6px">Tous les entraînements, adaptés à ton niveau (${currentLevel()}).</p>
   <div class="hero"><div class="eyebrow">${daily ? "Séance du jour terminée" : "Séance du jour"}</div><h2>Entraînement mixte</h2>
    <div class="meta">Révisions, erreurs à corriger, grammaire, conjugaison et écoute en une douzaine de questions.${daily ? "" : " Bonus de 15 XP une fois par jour."}</div>
    <button class="btn light" onclick="startDaily()">${icon("play", 18)}${daily ? "Refaire une séance" : "Lancer la séance"}</button></div>
   ${S.dcg ? sec("Objectif DCG") + dcgTile() : ""}${S.dscg ? dscgTile() : ""}
   ${sec("Au quotidien")}
   ${tile("go('routine')", "check", "Ma routine anglaise", `Séries en VO, oral, écoute, carnet de mots · ${rtItems().filter(r => rtDone(r)).length} / ${rtItems().length} aujourd'hui`)}
   ${sec("Mémoire")}
   ${tile("go('review')", "brain", "Révisions espacées", due ? `${due} mot${due > 1 ? "s" : ""} à réviser aujourd'hui` : "Tout est à jour", due ? `<span class="tag ko">${due}</span>` : "")}
   ${sec("Verbes")}
   ${tile("startIrr()", "review", "Verbes irréguliers", `${IRR.length} verbes · ${pracInfo("irr")}`)}
   ${tile("startConj()", "memo", "Conjugaison", `${TENSES.filter(t => lvIndex(t.lv) <= myLv() + 1).length} temps à ton niveau · ${pracInfo("conj")}`)}
   ${sec("Écoute et oral")}
   ${tile("go('stories')", "headphones", "Histoires à écouter", `${STORIES.length} récits avec questions`)}
   ${tile("go('dialogues')", "chat", "Dialogues de situation", `${DIALOGUES.length} situations de la vie réelle`)}
   ${tile("startPron()", "mic", "Prononciation", `Distinguer les sons proches · ${pracInfo("pron")}`)}
   ${tile("startNum()", "hash", "Nombres, heures et prix", pracInfo("num"))}
   ${sec("Écrit")}
   ${tile("startFix()", "fix", "Corrige l'erreur", `Les fautes typiques des francophones · ${pracInfo("fix")}`)}
   ${tile("go('writing')", "doc", "Expression écrite", `${WRITINGS.length} sujets avec corrigé modèle`)}
   ${sec("Expressions")}
   ${tile("startDeck('phr')", "sparkle", "Verbes à particule", `${PHRASALS.length} phrasal verbs · ${pracInfo("phr")}`)}
   ${tile("startDeck('idi')", "globe", "Expressions idiomatiques", `${IDIOMS.length} expressions · ${pracInfo("idi")}`)}
   ${tile("startDeck('ff')", "target", "Faux amis", `${FALSE_FRIENDS.length} pièges · ${pracInfo("ff")}`)}
   ${sec("Évaluation")}
   ${tile("go('exams')", "award", "Examens de fin de niveau", `${Object.keys(S.certs).length} certificat${Object.keys(S.certs).length > 1 ? "s" : ""} obtenu${Object.keys(S.certs).length > 1 ? "s" : ""}`)}
   ${S.dcg || S.dscg ? "" : sec("Examens professionnels") + dcgTile()}${S.dscg ? "" : (S.dcg ? sec("Examens professionnels") : "") + tile("go('dscg')", "award", "Préparation DSCG · UE6", `Anglais des affaires : 7 thèmes, oraux blancs · ${dscgReady()} %`)}`;
};

// ----- verbes irréguliers -----
function irrEx(v, t) {
  const note = `${v.b} · ${v.past} · ${v.pp} (${v.fr})`, alts = x => x.replace("/", " / ");
  if (t === 0) return { type: "type", kicker: "Verbes irréguliers", q: `Prétérit de « to ${v.b} »`, sub: v.fr, a: alts(v.past), exact: true, ph: "Prétérit", cat: "conj", note };
  if (t === 1) return { type: "type", kicker: "Verbes irréguliers", q: `Participe passé de « to ${v.b} »`, sub: v.fr, a: alts(v.pp), exact: true, ph: "Participe passé", cat: "conj", note };
  if (t === 2) { const ok = v.pp.split("/"), a = ok[0];
    return { type: "mcq", kicker: "Verbes irréguliers", q: `Quel est le participe passé de « to ${v.b} » ?`, a, opts: optsOf(a, shuffle([v.past.split("/")[0], v.b + "ed", v.b + "en", v.b]).concat(pick(IRR, 3).map(x => x.pp.split("/")[0])).filter(x => !ok.includes(x))), cat: "conj", note }; }
  return { type: "type", kicker: "Verbes irréguliers", q: `Comment dit-on « ${v.fr} » au prétérit ?`, a: alts(v.past), exact: true, ph: "Prétérit", cat: "conj", note };
}
const irrPool = () => myLv() <= 2 ? IRR.filter(v => v.core) : IRR;
function startIrr() { runSet({ re: "startIrr()", title: "Verbes irréguliers", mod: "irr", icon: "review", list: pick(irrPool(), 12).map((v, i) => irrEx(v, i % 4)), again: startIrr }); }

// ----- conjugaison -----
const STATIVE = ["be", "know", "like", "want", "need", "understand", "mean", "cost", "hear", "see", "forget", "forgive", "have", "enjoy"];
const BE_P = { I: "am", you: "are", he: "is", she: "is", we: "are", they: "are" }, bePast = s => ["I", "he", "she"].includes(s) ? "was" : "were", third = s => s === "he" || s === "she";
function ingForm(v) { const b = v.b; if (b === "be") return "being"; if (/ie$/.test(b)) return b.slice(0, -2) + "ying"; if (/[^eoy]e$/.test(b)) return b.slice(0, -1) + "ing"; if (v.d || DOUBLING.includes(b)) return b + b.slice(-1) + "ing"; return b + "ing"; }
function s3Form(b) { if (b === "be") return "is"; if (b === "have") return "has"; if (/(s|sh|ch|x|z|o)$/.test(b)) return b + "es"; if (/[^aeiou]y$/.test(b)) return b.slice(0, -1) + "ies"; return b + "s"; }
function edForm(v) { const b = v.b; if (/e$/.test(b)) return b + "d"; if (/[^aeiou]y$/.test(b)) return b.slice(0, -1) + "ied"; if (v.d) return b + b.slice(-1) + "ed"; return b + "ed"; }
function conjugate(v, s, t, f) {
  const b = v.b, past = (v.past || edForm(v)).split("/")[0], pp = (v.pp || edForm(v)).split("/")[0], isBe = b === "be";
  let aux, rest = "";
  if (t === "ps") { if (isBe) aux = BE_P[s]; else if (f === "aff") return `${s} ${third(s) ? s3Form(b) : b}`; else { aux = third(s) ? "does" : "do"; rest = b; } }
  else if (t === "past") { if (isBe) aux = bePast(s); else if (f === "aff") return `${s} ${past}`; else { aux = "did"; rest = b; } }
  else if (t === "pc") { aux = BE_P[s]; rest = ingForm(v); }
  else if (t === "pastc") { aux = bePast(s); rest = ingForm(v); }
  else if (t === "fut") { aux = "will"; rest = b; }
  else if (t === "cond") { aux = "would"; rest = b; }
  else if (t === "pp") { aux = third(s) ? "has" : "have"; rest = pp; }
  else if (t === "ppc") { aux = third(s) ? "has" : "have"; rest = "been " + ingForm(v); }
  else if (t === "pastp") { aux = "had"; rest = pp; }
  else if (t === "futp") { aux = "will"; rest = "have " + pp; }
  else if (t === "condp") { aux = "would"; rest = "have " + pp; }
  const r = rest ? " " + rest : "";
  if (f === "q") return `${aux} ${s}${r}`;
  if (aux === "will" && rest.startsWith("have ") && f === "neg") return `${s} will not ${rest}`;
  if (aux === "would" && rest.startsWith("have ") && f === "neg") return `${s} would not ${rest}`;
  return f === "neg" ? `${s} ${aux} not${r}` : `${s} ${aux}${r}`;
}
function conjEx() {
  const tenses = TENSES.filter(t => lvIndex(t.lv) <= myLv() + 1), T = pick(tenses.length ? tenses : TENSES.slice(0, 2), 1)[0];
  const cont = ["pc", "pastc", "ppc"].includes(T.id);
  let pool = REG_VERBS.concat(irrPool()); if (cont) pool = pool.filter(v => !STATIVE.includes(v.b));
  const v = pick(pool, 1)[0], s = pick(["I", "you", "he", "she", "we", "they"], 1)[0], f = pick(["aff", "aff", "neg", "q"], 1)[0];
  const F = { aff: "affirmative", neg: "négative", q: "interrogative" }[f];
  return { type: "type", kicker: "Conjugaison", q: `Conjugue « to ${v.b} » avec « ${s} » : ${T.fr}, forme ${F}`, sub: `${v.fr} · ${T.en}`, a: conjugate(v, s, T.id, f), exact: true, ph: f === "q" ? "Auxiliaire + sujet + verbe" : "Sujet + verbe", cat: "conj", note: T.hint };
}
function startConj() { runSet({ re: "startConj()", title: "Conjugaison", mod: "conj", icon: "memo", list: [...Array(10)].map(conjEx), again: startConj }); }

// ----- prononciation : paires minimales -----
function pronEx(p) { const w = p[Math.random() < .5 ? 0 : 1]; return { type: "listen", kicker: "Prononciation", q: "Quel mot entends-tu ?", say: w, a: w, opts: shuffle([p[0], p[1]]), cat: "listen", note: `${p[0]} ≠ ${p[1]}` }; }
function startPron() { runSet({ re: "startPron()", title: "Prononciation", mod: "pron", icon: "mic", list: pick(MIN_PAIRS, 12).map(pronEx), again: startPron }); }

// ----- nombres, heures, prix -----
const ONES = "zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen".split(" ");
const TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];
function numWords(n) {
  if (n < 20) return ONES[n];
  if (n < 100) return TENS[Math.floor(n / 10)] + (n % 10 ? "-" + ONES[n % 10] : "");
  if (n < 1000) return ONES[Math.floor(n / 100)] + " hundred" + (n % 100 ? " and " + numWords(n % 100) : "");
  if (n < 1e6) return numWords(Math.floor(n / 1000)) + " thousand" + (n % 1000 ? (n % 1000 < 100 ? " and " : " ") + numWords(n % 1000) : "");
  return String(n);
}
function yearWords(y) {
  if (y >= 2000 && y < 2010) return "two thousand" + (y % 100 ? " and " + ONES[y % 100] : "");
  const r = y % 100; return numWords(Math.floor(y / 100)) + " " + (r === 0 ? "hundred" : r < 10 ? "oh " + ONES[r] : numWords(r));
}
function timeWords(h, m) {
  const nh = h % 12 + 1;
  if (m === 0) return `${ONES[h]} o'clock`; if (m === 15) return `quarter past ${ONES[h]}`; if (m === 30) return `half past ${ONES[h]}`; if (m === 45) return `quarter to ${ONES[nh]}`;
  return m < 30 ? `${numWords(m)} past ${ONES[h]}` : `${numWords(60 - m)} to ${ONES[nh]}`;
}
const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
function numEx(kind) {
  const max = myLv() <= 1 ? 100 : myLv() <= 2 ? 1000 : 100000;
  if (kind === 0) { const n = rnd(11, max); return { type: "dictation", kicker: "Nombres · écoute", q: "Écris en chiffres le nombre que tu entends", say: numWords(n), a: String(n), exact: true, ph: "En chiffres", cat: "listen", note: `${n} = ${numWords(n)}` }; }
  if (kind === 1) { const n = rnd(11, Math.min(max, 9999)), w = numWords(n); return { type: "type", kicker: "Nombres · écriture", q: `Écris en toutes lettres : ${n}`, a: uniq([w, w.replace(/ and /g, " ")]).join(" / "), ph: "En toutes lettres", cat: "vocab" }; }
  if (kind === 2) { const h = rnd(1, 12), m = rnd(0, 11) * 5, mm = String(m).padStart(2, "0"), w = timeWords(h, m); return { type: "dictation", kicker: "L'heure · écoute", q: "Écris l'heure que tu entends (format 3:30)", say: `It's ${w}`, a: `${h}:${mm} / ${h}h${mm}`, exact: true, ph: "ex. 3:30", cat: "listen", note: `${h}:${mm} = ${w}` }; }
  if (kind === 3) { const h = rnd(1, 12), m = pick([0, 15, 30, 45, 10, 20, 40, 50], 1)[0], a = timeWords(h, m), nh = h % 12 + 1;
    return { type: "mcq", kicker: "L'heure", q: `Comment dit-on ${h}:${String(m).padStart(2, "0")} ?`, a, say: a, opts: optsOf(a, shuffle([timeWords(nh, m), timeWords(h, (m + 30) % 60), timeWords(h, (60 - m) % 60), timeWords(nh, (m + 15) % 60), `${ONES[h]} ${numWords(m || 30)} o'clock`])), cat: "vocab" }; }
  if (kind === 4) { const y = pick([rnd(1066, 1999), rnd(2000, 2030)], 1)[0]; return { type: "dictation", kicker: "Les dates · écoute", q: "Écris en chiffres l'année que tu entends", say: yearWords(y), a: String(y), exact: true, ph: "ex. 1998", cat: "listen", note: `${y} = ${yearWords(y)}` }; }
  const p = rnd(1, 99), c = rnd(1, 19) * 5, cc = String(c).padStart(2, "0");
  return { type: "dictation", kicker: "Les prix · écoute", q: "Écris le prix que tu entends (format 4.50)", say: `${numWords(p)} pounds ${numWords(c)}`, a: `${p}.${cc}`, exact: true, ph: "ex. 4.50", cat: "listen", note: `£${p}.${cc} = ${numWords(p)} pounds ${numWords(c)}` };
}
function startNum() { runSet({ re: "startNum()", title: "Nombres, heures et prix", mod: "num", icon: "hash", list: shuffle([0, 0, 1, 1, 2, 2, 3, 3, 4, 5, 5, 0]).map(numEx), again: startNum }); }

// ----- corrige l'erreur -----
function fixEx(f, i) {
  return i % 2 ? { type: "type", kicker: "Corrige l'erreur", q: `Corrige cette phrase : « ${f.bad} »`, a: f.good, exact: true, ph: "La phrase correcte", cat: "gram", note: f.note, lv: f.lv }
    : { type: "mcq", kicker: "Corrige l'erreur", q: "Quelle phrase est correcte ?", a: f.good, opts: shuffle([f.good, f.bad]), cat: "gram", note: f.note, lv: f.lv };
}
function startFix() { runSet({ re: "startFix()", title: "Corrige l'erreur", mod: "fix", icon: "fix", list: pick(atLv(FIXES), 10).map(fixEx), again: startFix }); }

// ----- verbes à particule, expressions, faux amis -----
function deckList(kind) {
  if (kind === "phr") { const all = PHRASALS; return pick(atLv(all), 10).map((p, i) => { const t = i % 3, others = shuffle(all.filter(x => x !== p)), note = `${p.en} : ${p.fr}. Ex. : ${p.ex}`;
    if (t === 0) return { type: "mcq", kicker: "Verbes à particule", q: `Que signifie « ${p.en} » ?`, sub: p.ex, say: p.en, a: p.fr, opts: optsOf(p.fr, others.map(x => x.fr)), cat: "expr", note };
    if (t === 1) return { type: "mcq", kicker: "Verbes à particule", q: `Comment dit-on « ${p.fr} » ?`, a: p.en, opts: optsOf(p.en, others.map(x => x.en)), cat: "expr", note };
    return { type: "type", kicker: "Verbes à particule", q: `Écris le verbe à particule : « ${p.fr} »`, a: p.en, exact: true, ph: "ex. get up", cat: "expr", note }; }); }
  if (kind === "idi") { const all = IDIOMS; return pick(atLv(all), 10).map((p, i) => { const t = i % 3, others = shuffle(all.filter(x => x !== p));
    if (t === 0) return { type: "mcq", kicker: "Expressions idiomatiques", q: `Que signifie « ${p.en} » ?`, say: p.en, a: p.fr, opts: optsOf(p.fr, others.map(x => x.fr)), cat: "expr" };
    if (t === 1) return { type: "mcq", kicker: "Expressions idiomatiques", q: `Quelle expression signifie « ${p.fr} » ?`, a: p.en, opts: optsOf(p.en, others.map(x => x.en)), cat: "expr" };
    return { type: "order", kicker: "Expressions idiomatiques", q: `Reconstitue l'expression : « ${p.fr} »`, a: p.en, say: p.en, cat: "expr" }; }); }
  const all = FALSE_FRIENDS; return pick(all, 10).map((p, i) => { const others = shuffle(all.filter(x => x !== p)), note = `« ${p.en} » = ${p.fr}. « ${p.faux} » se dit « ${p.fauxEn} ».`;
    return i % 2 ? { type: "mcq", kicker: "Faux amis", q: `Comment dit-on « ${p.faux} » en anglais ?`, a: p.fauxEn, opts: optsOf(p.fauxEn, [p.en, ...others.map(x => x.fauxEn)]), cat: "expr", note }
      : { type: "mcq", kicker: "Faux amis", q: `« ${p.en} » signifie :`, say: p.en, a: p.fr, opts: optsOf(p.fr, [p.faux, ...others.map(x => x.fr)]), cat: "expr", note }; });
}
function startDeck(kind) { runSet({ re: `startDeck('${kind}')`, title: { phr: "Verbes à particule", idi: "Expressions idiomatiques", ff: "Faux amis" }[kind], mod: kind, icon: "sparkle", list: deckList(kind), again: () => startDeck(kind) }); }

// ----- dialogues -----
SCREENS.dialogues = function () {
  setNav("practice");
  app.innerHTML = appbar() + pracBack() + `<h2>Dialogues de situation</h2><p class="muted" style="margin-top:6px">Écoute, lis, puis entraîne-toi sur les répliques.</p>
   ${DIALOGUES.map((d, i) => tile(`go('dialogue',${i})`, "chat", esc(d.title), esc(d.ctx), `${S.prac["dlg" + i] ? `<span class="tag okk">${icon("check", 12)}${S.prac["dlg" + i].best} %</span>` : ""}${lvTag(d.lv)}`)).join("")}`;
};
function speakAll(lines) { try { speechSynthesis.cancel(); lines.forEach(t => { const u = new SpeechSynthesisUtterance(t); u.lang = "en-GB"; if (VOICE) u.voice = VOICE; u.rate = .92; speechSynthesis.speak(u); }); } catch (e) {} }
SCREENS.dialogue = function (i) {
  setNav(null); const d = DIALOGUES[i]; let tr = false;
  const draw = () => {
    app.innerHTML = `<div class="topbar"><button class="iconbtn plain" onclick="go('dialogues')">${icon("back")}</button><div style="flex:1"><div class="kicker" style="margin:0">Dialogue · ${d.lv}</div><h3>${esc(d.title)}</h3></div></div>
     <p class="muted">${esc(d.ctx)}</p>
     <div class="row"><button class="btn sec" id="all" style="margin-top:0">${icon("speaker", 18)}Tout écouter</button><button class="btn ghost" id="tr" style="margin-top:0">${tr ? "Masquer" : "Afficher"} la traduction</button></div>
     <div class="card dlg">${d.lines.map((l, k) => `<div class="line ${k % 2 ? "b" : ""}"><button class="iconbtn plain sm" data-k="${k}">${icon("speaker", 18)}</button><div><small>${esc(l[0])}</small><div class="en">${esc(l[1])}</div>${tr ? `<div class="fr">${esc(l[2])}</div>` : ""}</div></div>`).join("")}</div>
     <button class="btn" id="ex">S'entraîner sur ce dialogue ${icon("arrow", 20)}</button>`;
    $("#all").onclick = () => speakAll(d.lines.map(l => l[1]));
    $("#tr").onclick = () => { tr = !tr; draw(); };
    $$(".dlg [data-k]").forEach(b => b.onclick = () => speak(d.lines[b.dataset.k][1]));
    $("#ex").onclick = () => {
      const ls = shuffle(d.lines.map(l => ({ en: l[1], fr: l[2] })).filter(l => l.en.split(" ").length >= 3));
      const list = d.q.map(q => ({ type: "mcq", kicker: "Dialogue · compréhension", q: q[0], a: q[1], opts: shuffle(q.slice(1)), cat: "sent", lv: d.lv }))
        .concat(ls.slice(0, 2).map(l => ({ type: "order", kicker: "Dialogue · réplique", q: `Remets la réplique dans l'ordre : « ${l.fr} »`, a: l.en, say: l.en, cat: "sent", lv: d.lv })),
          ls.slice(2, 4).map(l => ({ type: "dictation", kicker: "Dialogue · dictée", q: "Écris la réplique que tu entends", say: l.en, a: l.en, cat: "listen", lv: d.lv })),
          ls.slice(4, 6).map(l => { const c = clozeEx(l); if (c) { c.kicker = "Dialogue · phrase à trous"; c.lv = d.lv; } return c; }));
      runSet({ re: `go('dialogue',${i})`, title: d.title, mod: "dlg" + i, icon: "chat", list, back: ["dialogues"] });
    };
  };
  draw();
};

// ----- histoires à écouter -----
SCREENS.stories = function () {
  setNav("practice");
  app.innerHTML = appbar() + pracBack() + `<h2>Histoires à écouter</h2><p class="muted" style="margin-top:6px">Écoute sans lire, puis réponds aux questions. Le texte s'affiche à la fin.</p>
   ${STORIES.map((d, i) => tile(`go('story',${i})`, "headphones", esc(d.title), `${d.q.length} questions · ${d.t.split(" ").length} mots`, `${S.prac["sto" + i] ? `<span class="tag okk">${icon("check", 12)}${S.prac["sto" + i].best} %</span>` : ""}${lvTag(d.lv)}`)).join("")}`;
};
SCREENS.story = function (i) {
  setNav(null); const d = STORIES[i];
  app.innerHTML = `<div class="topbar"><button class="iconbtn plain" onclick="go('stories')">${icon("back")}</button><div style="flex:1"><div class="kicker" style="margin:0">Compréhension orale · ${d.lv}</div><h3>${esc(d.title)}</h3></div></div>
   <div class="card center"><p class="muted" style="margin-top:0">Écoute l'histoire une ou deux fois, sans lire.</p><button class="iconbtn big" id="sp">${icon("speaker", 38)}</button>
    <div class="row" style="justify-content:center;margin-top:10px"><button class="btn ghost" id="slow" style="width:auto;margin:0;padding:8px 14px">Plus lentement</button><button class="btn ghost" id="stop" style="width:auto;margin:0;padding:8px 14px">Arrêter</button></div></div>
   <button class="btn" id="ex">Répondre aux questions ${icon("arrow", 20)}</button>`;
  $("#sp").onclick = () => speak(d.t, .9); $("#slow").onclick = () => speak(d.t, .65); $("#stop").onclick = () => { try { speechSynthesis.cancel(); } catch (e) {} };
  $("#ex").onclick = () => runSet({ re: `go('story',${i})`, title: d.title, mod: "sto" + i, icon: "headphones", back: ["stories"], xp: 3,
    list: d.q.map(q => ({ type: "mcq", kicker: "Compréhension orale", q: q[0], a: q[1], opts: shuffle(q.slice(1)), say: d.t, quiet: true, cat: "listen", lv: d.lv })),
    after: `<div class="card"><div class="row between"><h3>Le texte</h3><button class="iconbtn plain sm" data-say="${esc(d.t)}">${icon("speaker", 18)}</button></div><p style="margin-bottom:0">${esc(d.t)}</p></div>` });
};

// ----- expression écrite -----
SCREENS.writing = function () {
  setNav("practice");
  app.innerHTML = appbar() + pracBack() + `<h2>Expression écrite</h2><p class="muted" style="margin-top:6px">Rédige, vérifie les expressions attendues, puis compare avec le corrigé modèle.</p>
   ${WRITINGS.map(w => tile(`go('write','${w.id}')`, "doc", esc(w.title), esc(w.task), `${S.writing[w.id] && S.writing[w.id].done ? `<span class="tag okk">${icon("check", 12)}fait</span>` : ""}${lvTag(w.lv)}`)).join("")}`;
};
SCREENS.write = function (id) {
  setNav(null); const w = WRITINGS.find(x => x.id === id), st = S.writing[id] = S.writing[id] || { text: "", done: null };
  app.innerHTML = `<div class="topbar"><button class="iconbtn plain" onclick="go('writing')">${icon("back")}</button><div style="flex:1"><div class="kicker" style="margin:0">Expression écrite · ${w.lv}</div><h3>${esc(w.title)}</h3></div></div>
   <div class="card"><b>Sujet</b><p style="margin:6px 0 0">${esc(w.task)}</p><p class="muted small" style="margin-bottom:0">Objectif : au moins ${w.min} mots.</p></div>
   <textarea class="txt area" id="tx" placeholder="Écris ton texte en anglais ici…" spellcheck="false">${esc(st.text)}</textarea>
   <div class="row between small muted" style="margin-top:8px"><span id="wc"></span><span>Expressions attendues</span></div><div class="keys" id="keys"></div>
   <button class="btn" id="ok">${icon("check", 18)}Valider mon texte</button><button class="btn sec" id="show">Voir le corrigé modèle</button><div id="model"></div>`;
  const upd = () => {
    st.text = $("#tx").value; const n = st.text.trim() ? st.text.trim().split(/\s+/).length : 0, t = norm(st.text);
    $("#wc").textContent = `${n} / ${w.min} mots`; $("#ok").disabled = n < w.min;
    $("#keys").innerHTML = w.keys.map(k => `<span class="tag ${t.includes(norm(k)) ? "okk" : ""}">${t.includes(norm(k)) ? icon("check", 12) : ""}${esc(k)}</span>`).join("");
  };
  $("#tx").oninput = () => { upd(); save(); }; upd();
  const model = () => { $("#model").innerHTML = `<div class="card"><div class="row between"><h3>Corrigé modèle</h3><button class="iconbtn plain sm" id="msay">${icon("speaker", 18)}</button></div><p style="margin-bottom:0">${esc(w.model)}</p></div>
    <div class="card"><b>Relis ton texte</b><p class="muted small" style="margin-bottom:0">Vérifie les temps utilisés, l'accord sujet-verbe (he works), les articles, et compare tes tournures avec celles du corrigé.</p></div>`; $("#msay").onclick = () => speak(w.model); };
  $("#show").onclick = model;
  $("#ok").onclick = () => { const firstTime = !st.done; st.done = today(); save(); if (firstTime) addXP(15); model(); $("#ok").outerHTML = `<div class="card row"><div class="iconbtn" style="background:var(--ok-soft);color:var(--ok)">${icon("check")}</div><div><b>Texte enregistré</b><div class="muted small">${firstTime ? "+15 XP. " : ""}Compare-le maintenant avec le corrigé.</div></div></div>`; };
};

// ----- examens de fin de niveau -----
const EXAM_PASS = 80;
SCREENS.exams = function () {
  setNav("practice");
  app.innerHTML = appbar() + pracBack() + `<h2>Examens de fin de niveau</h2><p class="muted" style="margin-top:6px">20 questions sans seconde chance. Il faut ${EXAM_PASS} % pour obtenir le certificat du niveau.</p>
   ${LEVELS.map(lv => { const c = S.certs[lv.id], open = levelOpen(lv.id);
     return `<div class="card cert ${c ? "got" : ""}"><div class="row"><div class="level-badge" style="background:${open ? lv.color : "var(--muted)"}">${open ? lv.id : icon("lock", 20)}</div><div style="flex:1"><b>${lv.name}</b><div class="muted small">${c ? `Certificat obtenu le ${c.date.split("-").reverse().join("/")} · ${c.pct} %` : open ? "Certificat à décrocher" : "Niveau verrouillé"}</div></div>${c ? `<span style="color:var(--gold)">${icon("award", 30)}</span>` : ""}</div>
      ${open ? `<button class="btn ${c ? "sec" : ""}" onclick="startExam('${lv.id}')">${c ? "Repasser l'examen" : "Passer l'examen"}</button>` : ""}</div>`; }).join("")}`;
};
function startExam(id) {
  const ls = lessonsOf(id), quiz = ls.flatMap(l => l.quiz.map(q => ({ type: "mcq", kicker: `Examen ${id} · grammaire`, q: q[0], a: q[1], opts: shuffle(q.slice(1)) })))
    .concat(PLACEMENT[id].map(q => ({ type: "mcq", kicker: `Examen ${id} · grammaire`, q: q[0], a: q[1], opts: shuffle(q.slice(1)) })));
  const words = ls.flatMap(l => l.words), sents = ls.flatMap(l => l.sentences);
  const voc = pick(words, 4).map((w, i) => i % 2 ? { type: "listen", kicker: `Examen ${id} · écoute`, q: "Écoute et choisis la traduction", say: w.en, a: w.fr, opts: optsOf(w.fr, shuffle(words).map(x => x.fr)) }
    : { type: "mcq", kicker: `Examen ${id} · vocabulaire`, q: `Comment dit-on « ${w.fr} » ?`, a: w.en, opts: optsOf(w.en, shuffle(words).map(x => x.en)) });
  const cl = pick(sents, 3).map(clozeEx).filter(Boolean).map(c => (c.kicker = `Examen ${id} · phrase à trous`, c));
  const list = shuffle(pick(quiz, 20 - voc.length - cl.length).concat(voc, cl));
  list.forEach(e => { e.lv = id; });
  runSet({ re: `startExam('${id}')`, title: `Examen ${id}`, mod: "exam" + id, icon: "award", exam: true, list, back: ["exams"], xp: 2,
    done: pct => { const ok = pct >= EXAM_PASS; if (ok && (!S.certs[id] || S.certs[id].pct < pct)) { S.certs[id] = { date: today(), pct }; save(); }
      return `<div class="card center cert ${ok ? "got" : ""}">${ok ? `<span style="color:var(--gold)">${icon("award", 44)}</span><h3 style="margin-top:8px">Certificat ${id} obtenu</h3><p class="muted" style="margin-bottom:0">${esc(S.name)} a validé le niveau ${LV(id).name} avec ${pct} %.</p>` : `<h3>${pct} % : pas encore</h3><p class="muted" style="margin-bottom:0">Il faut ${EXAM_PASS} %. Revois les leçons du niveau et tes erreurs, puis retente.</p>`}</div>`; } });
}

// ----- séance du jour -----
function startDaily() {
  const list = [];
  shuffle(dueCards()).slice(0, 4).forEach(k => { const [en, fr] = k.split("|"), l = WORD_LES[k], others = shuffle(l ? lessonsOf(l.level).flatMap(x => x.words) : []);
    const e = S.srs[k].box >= 2 ? { type: "type", kicker: "Séance du jour · révision", q: `Écris en anglais : « ${fr} »`, a: en } : { type: "mcq", kicker: "Séance du jour · révision", q: `Que signifie « ${en} » ?`, say: en, a: fr, opts: optsOf(fr, others.map(x => x.fr)) };
    e.word = { en, fr }; if (l) { e.les = l.id; e.lv = l.level; } e.srsK = k; list.push(e); });
  errPick(errTodo()).slice(0, 3).forEach(id => list.push(errExercise(S.errors[id])));
  const doneLs = ALL.filter(l => S.done[l.id] && l.quiz.length), src = doneLs.length ? doneLs : lessonsOf(currentLevel()).slice(0, 3);
  pick(src.flatMap(l => l.quiz.map(q => [q, l])), 3).forEach(([q, l]) => list.push({ type: "mcq", kicker: "Séance du jour · grammaire", q: q[0], a: q[1], opts: shuffle(q.slice(1)), les: l.id, lv: l.level, cat: "gram" }));
  const sents = src.flatMap(l => l.sentences); if (sents.length) { const s = pick(sents, 1)[0]; list.push({ type: "dictation", kicker: "Séance du jour · dictée", q: "Écris la phrase que tu entends", say: s.en, a: s.en }); }
  list.push(conjEx(), irrEx(pick(irrPool(), 1)[0], 0), numEx(pick([0, 2, 3], 1)[0]), fixEx(pick(atLv(FIXES, 0), 1)[0], 0));
  if (S.dscg) list.push(...dscgDailyEx());
  if (S.dcg) list.push(...dcgDailyEx());
  while (list.filter(Boolean).length < 12) list.push(conjEx());
  runSet({ re: "startDaily()", key: "daily" + today(), title: "Séance du jour", mod: "daily", icon: "bolt", list: list.filter(Boolean), again: startDaily,
    done: () => { if (S.dailyDone === today()) return ""; S.dailyDone = today(); S.xp += 15; S.days[today()] = (S.days[today()] || 0) + 15; save(); return `<div class="card row"><div class="iconbtn">${icon("bolt")}</div><div><b>Bonus quotidien : +15 XP</b><div class="muted small">Reviens demain pour une nouvelle séance.</div></div></div>`; } });
}

// ===== Onglet Ressources =====
SCREENS.library = function () {
  setNav("library");
  const count = ALL.reduce((n, l) => n + l.words.length, 0);
  app.innerHTML = appbar() + `<h2>Ressources</h2><p class="muted" style="margin-top:6px">Tout ce qu'il faut pour consulter et réviser à tout moment.</p>
   ${tile("go('memo')", "memo", "Grammaire", `${ALL.length} règles classées par niveau`)}
   ${tile("go('words')", "book", "Lexique", `${count} mots et expressions avec audio`)}
   ${tile("go('irrTable')", "review", "Verbes irréguliers", `${IRR.length} verbes : base, prétérit, participe passé`)}
   ${tile("go('sounds')", "mic", "Guide de prononciation", `${SOUNDS.length} points clés pour les francophones`)}
   ${tile("go('refList','phr')", "sparkle", "Verbes à particule", `${PHRASALS.length} phrasal verbs avec exemples`)}
   ${tile("go('refList','idi')", "globe", "Expressions idiomatiques", `${IDIOMS.length} expressions courantes`)}
   ${tile("go('refList','ff')", "target", "Faux amis", `${FALSE_FRIENDS.length} mots trompeurs`)}
   <div class="unit">Référentiels</div>
   ${tile("go('cefr')", "chart", "Référentiel CECRL", "Ce que l'on sait faire à chaque niveau, de A1 à C2")}
   ${tile("go('dcgInfo')", "award", "Référentiel DCG · UE12", "Écrit de 3 heures : synthèse, commentaire, document professionnel")}
   ${tile("go('dscgInfo')", "award", "Référentiel DSCG · UE6", "Format de l'épreuve, compétences et 7 thèmes")}
   ${tile("go('reform')", "sparkle", "Réforme 2026 du DCG et du DSCG", "Ce qui change pour le DCG et le DSCG")}`;
};
function refScreen(title, desc, items, render, train) {
  setNav("library");
  app.innerHTML = appbar() + libBack() + `<h2>${title}</h2><p class="muted" style="margin-top:6px">${desc}</p>
   ${train ? `<button class="btn sec" id="train">${icon("play", 18)}S'entraîner</button>` : ""}
   <div class="searchbox">${icon("search", 20)}<input class="txt" id="q" placeholder="Rechercher"></div><div class="card" style="padding:4px 16px" id="res"></div>`;
  if (train) $("#train").onclick = train;
  const draw = () => { const q = norm($("#q").value), f = items.filter(x => !q || norm(Object.values(x).join(" ")).includes(q));
    $("#res").innerHTML = f.map(render).join("") || `<p class="muted center">Aucun résultat.</p>`;
    $$("#res [data-say]").forEach(b => b.onclick = () => speak(b.dataset.say)); };
  $("#q").oninput = draw; draw();
}
const sayBtn = t => `<button class="iconbtn plain sm" data-say="${esc(t)}">${icon("speaker", 18)}</button>`;
SCREENS.irrTable = () => refScreen("Verbes irréguliers", "Base verbale, prétérit, participe passé.", IRR,
  v => `<div class="vocab">${sayBtn(`${v.b}, ${v.past.replace("/", " or ")}, ${v.pp.replace("/", " or ")}`)}<div style="flex:1"><div class="en">${v.b} · ${v.past} · ${v.pp}</div><div class="fr">${esc(v.fr)}</div></div></div>`, startIrr);
SCREENS.sounds = function () {
  setNav("library");
  app.innerHTML = appbar() + libBack() + `<h2>Guide de prononciation</h2><p class="muted" style="margin-top:6px">Les sons et les règles qui posent le plus de difficultés aux francophones.</p>
   <button class="btn sec" onclick="startPron()">${icon("play", 18)}S'entraîner à distinguer les sons</button>
   ${SOUNDS.map(s => `<div class="card"><div class="row between"><div><b>${esc(s[0])}</b> <span class="tag">${esc(s[1])}</span></div><button class="iconbtn sm" data-say="${esc(s[2])}">${icon("speaker", 18)}</button></div><div class="en" style="font-weight:700;margin-top:8px">${esc(s[2])}</div><p class="muted small" style="margin-bottom:0">${esc(s[3])}</p></div>`).join("")}`;
  $$("[data-say]").forEach(b => b.onclick = () => speak(b.dataset.say, .8));
};
SCREENS.refList = function (kind) {
  if (kind === "phr") return refScreen("Verbes à particule", "Un verbe + une particule = un nouveau sens.", PHRASALS, p => `<div class="vocab">${sayBtn(p.ex)}<div style="flex:1"><div class="en">${esc(p.en)}</div><div class="fr">${esc(p.fr)}</div><div class="fr" style="font-style:italic">${esc(p.ex)}</div></div>${lvTag(p.lv)}</div>`, () => startDeck("phr"));
  if (kind === "idi") return refScreen("Expressions idiomatiques", "À ne jamais traduire mot à mot.", IDIOMS, p => `<div class="vocab">${sayBtn(p.en)}<div style="flex:1"><div class="en">${esc(p.en)}</div><div class="fr">${esc(p.fr)}</div></div>${lvTag(p.lv)}</div>`, () => startDeck("idi"));
  return refScreen("Faux amis", "Ils ressemblent au français mais veulent dire autre chose.", FALSE_FRIENDS, p => `<div class="vocab">${sayBtn(p.en)}<div style="flex:1"><div class="en">${esc(p.en)} = ${esc(p.fr)}</div><div class="fr">« ${esc(p.faux)} » se dit <b>${esc(p.fauxEn)}</b></div></div></div>`, () => startDeck("ff"));
};

// ===== Badges et certificats (onglet Progrès) =====
function badges() {
  const done = ALL.filter(l => S.done[l.id] && !S.done[l.id].skipped).length, mastered = Object.values(S.srs).filter(c => c.box >= 3).length;
  const fixed = Object.values(S.errors).filter(x => x.fixed).length, daily = (S.prac.daily || {}).n || 0, certs = Object.keys(S.certs).length;
  const wr = Object.values(S.writing).filter(x => x.done).length, sessions = Object.values(S.prac).reduce((n, p) => n + p.n, 0);
  const steps = (val, arr, label) => arr.map(([n, t]) => ({ t, d: label(n), ok: val >= n }));
  return [].concat(
    steps(done, [[1, "Premier pas"], [10, "Lancé"], [25, "Assidu"], [50, "Mi-parcours"], [ALL.length, "Parcours complet"]], n => `${n} leçon${n > 1 ? "s" : ""} terminée${n > 1 ? "s" : ""}`),
    steps(S.best, [[3, "Régulier"], [7, "Une semaine"], [30, "Un mois"]], n => `${n} jours d'affilée`),
    steps(mastered, [[50, "Mémoire vive"], [250, "Vocabulaire solide"], [1000, "Dictionnaire"]], n => `${n} mots maîtrisés`),
    steps(fixed, [[10, "Correcteur"], [50, "Zéro faute"]], n => `${n} erreurs corrigées`),
    steps(sessions, [[5, "Échauffement"], [30, "Entraîné"], [100, "Infatigable"]], n => `${n} séances de pratique`),
    steps(daily, [[7, "Rituel"]], n => `${n} séances du jour`),
    steps(wr, [[1, "Plume"], [5, "Rédacteur"]], n => `${n} texte${n > 1 ? "s" : ""} rédigé${n > 1 ? "s" : ""}`),
    steps(certs, [[1, "Diplômé"], [4, "Confirmé"], [7, "Bilingue"]], n => `${n} certificat${n > 1 ? "s" : ""}`),
    steps(S.xp, [[1000, "1 000 XP"], [10000, "10 000 XP"]], n => `${n} XP gagnés`));
}
function statsExtra() {
  const B = badges(), got = B.filter(b => b.ok).length, certs = Object.keys(S.certs);
  return `<div class="card"><div class="row between"><div class="row" style="color:var(--pri)">${icon("award", 20)}<h3>Badges</h3></div><span class="muted small">${got} / ${B.length}</span></div>
    <div class="badges">${B.map(b => `<div class="badge ${b.ok ? "ok" : ""}">${icon("award", 26)}<b>${b.t}</b><span>${b.d}</span></div>`).join("")}</div></div>
   <div class="card"><div class="row between"><div class="row" style="color:var(--pri)">${icon("trophy", 20)}<h3>Certificats</h3></div><span class="muted small">${certs.length} / ${LEVELS.length}</span></div>
    <div class="row" style="flex-wrap:wrap;gap:8px;margin-top:12px">${LEVELS.map(lv => `<span class="level-badge" style="background:${S.certs[lv.id] ? lv.color : "var(--surface2)"};color:${S.certs[lv.id] ? "#fff" : "var(--muted)"}">${lv.id}</span>`).join("")}</div>
    <button class="btn sec" onclick="go('exams')">Voir les examens</button></div>`;
}

