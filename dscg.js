// ===== Mode « Préparation DSCG » (UE6 Anglais des affaires) + référentiels =====
ERR_CATS.dscg = ["Anglais des affaires (DSCG)", "award"];
if (!S.dscgP) S.dscgP = {};
const DT = id => DSCG_THEMES.find(t => t.id === id);
const dP = id => (S.dscgP[id] = S.dscgP[id] || {});
const DSCG_STEPS = [["v", "Vocabulaire"], ["n", "Notions clés"], ["a", "Article"], ["s", "Synthèse"], ["o", "Oral blanc"]];
const dscgDone = id => DSCG_STEPS.filter(([k]) => dP(id)[k]).length;
const dscgReady = () => Math.round(DSCG_THEMES.reduce((n, t) => n + dscgDone(t.id), 0) / (DSCG_THEMES.length * DSCG_STEPS.length) * 100);
function toggleDscg(on) { S.dscg = on === undefined ? !S.dscg : on; save(); }
const dscgBack = () => backBtn("dscg", "Préparation DSCG");

function dscgHomeCard() {
  if (!S.dscg) return "";
  return `<div class="card row" style="cursor:pointer" onclick="go('dscg')"><div class="iconbtn" style="background:var(--gold);color:#fff">${icon("award")}</div><div style="flex:1"><b>Préparation DSCG · UE6</b><div class="muted small">${dscgReady()} % du programme travaillé${dscgDays() != null ? ` · J-${dscgDays()}` : ""}</div><div class="bar" style="height:6px;margin-top:6px"><i style="width:${dscgReady()}%;background:var(--gold)"></i></div></div>${icon("arrow", 20)}</div>`;
}
function dscgTile() { return (S.dscg ? `<div class="unit">Objectif DSCG</div>` : `<div class="unit">Examen professionnel</div>`) + tile("go('dscg')", "award", "Préparation DSCG · UE6", `Anglais des affaires : 7 thèmes, oraux blancs · ${dscgReady()} %`); }
function dscgDays() { if (!S.dscgDate) return null; const d = Math.ceil((new Date(S.dscgDate) - new Date(today())) / 864e5); return d >= 0 ? d : null; }

SCREENS.dscg = function () {
  setNav("practice");
  const cur = myLv(), target = lvIndex("B2"), days = dscgDays();
  app.innerHTML = appbar() + pracBack() + `<h2>Préparation DSCG</h2><p class="muted" style="margin-top:6px">UE6 Anglais des affaires : un oral en anglais à partir d'un article de presse.</p>
   <div class="hero" style="margin-top:12px"><div class="eyebrow">${days != null ? `Épreuve dans ${days} jour${days > 1 ? "s" : ""}` : "Ton avancement"}</div><h2>${dscgReady()} % du programme travaillé</h2>
    <div class="bar" style="margin-top:10px"><i style="width:${dscgReady()}%"></i></div>
    <div class="row between small" style="margin-top:14px;opacity:.9"><span>Niveau d'anglais : ${currentLevel()}</span><span>Niveau visé : B2</span></div>
    <div class="bar" style="margin-top:6px"><i style="width:${Math.min(100, cur / target * 100)}%"></i></div>
    <button class="btn light" onclick="go('dscgOral','${pick(DSCG_THEMES, 1)[0].id}')">${icon("mic", 18)}Lancer un oral blanc</button></div>
   ${cur < target ? `<div class="card"><b>Tu pars de loin ? C'est prévu.</b><p class="muted small" style="margin-bottom:0">Avance d'abord dans le Parcours jusqu'au niveau B1, en faisant à chaque niveau l'unité d'anglais professionnel. Travaille en parallèle le vocabulaire des thèmes ci-dessous : il est accessible dès le niveau A2. Les synthèses et les oraux blancs deviennent utiles à partir de B1.</p></div>` : ""}
   <div class="unit">L'épreuve</div>
   ${tile("go('dscgInfo')", "doc", "Format et référentiel", "Déroulement, compétences évaluées, programme officiel")}
   ${tile("go('dscgMethod')", "target", "Méthode : réussir l'heure de préparation", "Plan minute par minute et structure de l'exposé")}
   ${tile("go('dscgPhrases')", "chat", "Phrases utiles pour l'oral", `${DSCG_PHRASES.reduce((n, g) => n + g.list.length, 0)} formules pour présenter, enchaîner, nuancer`)}
   <div class="unit">Les 7 thèmes du programme</div>
   ${DSCG_THEMES.map((t, i) => tile(`go('dscgTheme','${t.id}')`, "award", `${i + 1}. ${esc(t.fr)}`, esc(t.en), `<span class="tag ${dscgDone(t.id) === DSCG_STEPS.length ? "okk" : ""}">${dscgDone(t.id)} / ${DSCG_STEPS.length}</span>`)).join("")}
   <div class="card"><div class="row" style="color:var(--pri)">${icon("settings", 20)}<h3>Réglages DSCG</h3></div>
    <p class="muted small">Date de ton épreuve (facultatif)</p><input class="txt" type="date" id="dd" value="${S.dscgDate || ""}">
    <button class="btn ${S.dscg ? "ghost" : "sec"}" id="dm">${S.dscg ? "Retirer le DSCG de mon accueil" : "Faire du DSCG mon objectif principal"}</button></div>`;
  $("#dd").onchange = () => { S.dscgDate = $("#dd").value || null; save(); go("dscg"); };
  $("#dm").onclick = () => { toggleDscg(); go("dscg"); };
};

SCREENS.dscgInfo = function () {
  setNav("practice"); const I = DSCG_INFO;
  app.innerHTML = appbar() + dscgBack() + `<h2>Format et référentiel</h2><p class="muted" style="margin-top:6px">UE6 Anglais des affaires.</p>
   <div class="card"><h3>L'épreuve en bref</h3>${I.facts.map(f => `<div class="vocab"><div style="flex:1"><div class="fr">${f[0]}</div><div class="en">${f[1]}</div></div></div>`).join("")}</div>
   <div class="card"><h3>Déroulement</h3>${I.steps.map((s, i) => `<div class="issue"><span class="num">${i + 1}</span><div><b>${s[0]}</b><div class="muted small">${s[1]}</div></div></div>`).join("")}</div>
   <div class="card"><h3>Compétences évaluées</h3>${I.skills.map(s => `<p style="margin:8px 0 0" class="row">${icon("check", 16)}<span>${s}</span></p>`).join("")}</div>
   <div class="card"><h3>Programme : 7 thèmes</h3><p class="muted small">La durabilité est traitée de façon transversale dans tous les thèmes.</p>${DSCG_THEMES.map((t, i) => `<div class="vocab"><div style="flex:1"><div class="en">${i + 1}. ${esc(t.en)}</div><div class="fr">${esc(t.axes)}</div></div></div>`).join("")}</div>
   <div class="card"><b>Source</b><p class="muted small" style="margin-bottom:0">Format et programme présentés d'après l'arrêté du 4 août 2025 (Bulletin officiel n° 32 du 28 août 2025), tel que repris par des sites de préparation. Vérifie toujours les modalités de ta session sur le texte officiel ou auprès de ton centre d'examen.</p></div>`;
};
SCREENS.dscgMethod = function () {
  setNav("practice");
  app.innerHTML = appbar() + dscgBack() + `<h2>Méthode</h2><p class="muted" style="margin-top:6px">Une heure de préparation, quinze minutes d'exposé, quinze minutes d'échange.</p>
   <div class="card"><h3>L'heure de préparation</h3>${DSCG_INFO.prep.map(p => `<div class="vocab"><span class="tag" style="flex:none">${p[0]}</span><div class="fr" style="flex:1">${p[1]}</div></div>`).join("")}</div>
   <div class="card"><h3>Structure de l'exposé</h3>
    <div class="issue"><span class="num">1</span><div><b>Introduction (1 min)</b><div class="muted small">Source, date, sujet de l'article, annonce du plan.</div></div></div>
    <div class="issue"><span class="num">2</span><div><b>Synthèse (5 à 6 min)</b><div class="muted small">Deux ou trois parties, idées reformulées, aucune lecture du texte.</div></div></div>
    <div class="issue"><span class="num">3</span><div><b>Réponse à la question (6 à 7 min)</b><div class="muted small">Un plan nuancé : oui, mais, donc. Un exemple d'actualité par partie.</div></div></div>
    <div class="issue"><span class="num">4</span><div><b>Conclusion (1 min)</b><div class="muted small">Réponse nette à la question et ouverture.</div></div></div></div>
   <div class="card"><h3>Les erreurs qui coûtent cher</h3>${["Lire ses notes au lieu de parler au jury.", "Paraphraser l'article phrase par phrase.", "Oublier de répondre à la question posée.", "Répondre « yes » ou « no » sans développer pendant l'entretien.", "Rester bloqué sur un mot : reformule avec des mots simples."].map(x => `<p style="margin:8px 0 0" class="row">${icon("close", 16)}<span>${x}</span></p>`).join("")}</div>
   <button class="btn" onclick="go('dscgPhrases')">Voir les phrases utiles ${icon("arrow", 20)}</button>`;
};
SCREENS.dscgPhrases = function () {
  setNav("practice");
  app.innerHTML = appbar() + dscgBack() + `<h2>Phrases utiles pour l'oral</h2><p class="muted" style="margin-top:6px">À connaître par cœur : elles structurent ton exposé et te font gagner du temps.</p>
   <button class="btn sec" id="tr">${icon("play", 18)}S'entraîner sur ces phrases</button>
   ${DSCG_PHRASES.map(g => `<div class="unit">${g.t}</div><div class="card" style="padding:4px 16px">${g.list.map(p => `<div class="vocab">${sayBtn(p.en.replace(/…/g, ""))}<div style="flex:1"><div class="en">${esc(p.en)}</div><div class="fr">${esc(p.fr)}</div></div></div>`).join("")}</div>`).join("")}`;
  $$("[data-say]").forEach(b => b.onclick = () => speak(b.dataset.say));
  $("#tr").onclick = () => { const all = DSCG_PHRASES.flatMap(g => g.list).filter(p => !p.en.includes("…")), list = pick(all, 10).map((p, i) => i % 2
      ? { type: "order", kicker: "DSCG · phrases utiles", q: `Reconstitue : « ${p.fr} »`, a: p.en, say: p.en, cat: "dscg" }
      : { type: "mcq", kicker: "DSCG · phrases utiles", q: `Comment dit-on : « ${p.fr} » ?`, a: p.en, opts: optsOf(p.en, shuffle(all).map(x => x.en)), cat: "dscg" });
    runSet({ title: "Phrases utiles", src: "DSCG · phrases utiles", mod: "dscgPhr", icon: "chat", list, back: ["dscgPhrases"] }); };
};

SCREENS.dscgTheme = function (id) {
  setNav("practice"); const t = DT(id), p = dP(id);
  const st = k => p[k] ? `<span class="tag okk">${icon("check", 12)}${typeof p[k] === "number" ? (k === "s" ? String(p[k]).replace(".", ",") + " / 20" : p[k] + " %") : "fait"}</span>` : "";
  app.innerHTML = appbar() + dscgBack() + `<p class="kicker" style="margin:0">Thème ${DSCG_THEMES.indexOf(t) + 1} · ${esc(t.en)}</p><h2>${esc(t.fr)}</h2><p class="muted" style="margin-top:6px">${esc(t.axes)}</p>
   ${tile(`go('dscgVocab','${id}')`, "book", "1. Vocabulaire du thème", `${t.vocab.length} termes avec audio`, st("v"))}
   ${tile(`dscgNotions('${id}')`, "brain", "2. Notions clés", `${t.notions.length} concepts à savoir définir en anglais`, st("n"))}
   ${tile(`go('dscgArticle','${id}')`, "doc", "3. Article et compréhension", esc(t.article.title), st("a"))}
   ${tile(`dscgSynth('${id}')`, "fix", "4. Synthèse écrite corrigée", "Résume l'article avec tes mots", st("s"))}
   ${tile(`go('dscgOral','${id}')`, "mic", "5. Oral blanc", esc(t.article.question), st("o"))}
   <div class="card"><h3>Questions possibles du jury</h3>${t.article.jury.map((j, i) => `<details class="qa"><summary>${sayBtn(j[0])}<span>${esc(j[0])}</span></summary><p class="muted" style="margin:0 0 12px">${esc(j[1])}</p></details>`).join("")}</div>`;
  $$("[data-say]").forEach(b => b.onclick = ev => { ev.preventDefault(); speak(b.dataset.say); });
};
function dscgVocabSet(t, n = 10) {
  const ws = pick(t.vocab, n), list = ws.map((w, i) => { const k = i % 4, others = shuffle(t.vocab.filter(x => x !== w));
    const e = k === 0 ? { type: "mcq", q: `Que signifie « ${w.en} » ?`, say: w.en, a: w.fr, opts: optsOf(w.fr, others.map(x => x.fr)) }
      : k === 1 ? { type: "mcq", q: `Comment dit-on « ${w.fr} » ?`, a: w.en, opts: optsOf(w.en, others.map(x => x.en)) }
      : k === 2 ? { type: "type", q: `Écris en anglais : « ${w.fr} »`, a: w.en }
      : { type: "listen", q: "Écoute et choisis la traduction", say: w.en, a: w.fr, opts: optsOf(w.fr, others.map(x => x.fr)) };
    return Object.assign(e, { kicker: `DSCG · ${t.fr}`, word: w, cat: "dscg", srsNew: true }); });
  if (ws.length >= 5) list.splice(4, 0, matchEx(ws.slice(0, 5)));
  return list;
}
SCREENS.dscgVocab = function (id) {
  setNav("practice"); const t = DT(id);
  app.innerHTML = appbar() + backBtn(`dscgTheme','${id}`, esc(t.fr)) + `<h2>Vocabulaire</h2><p class="muted" style="margin-top:6px">${esc(t.en)}. Les mots travaillés rejoignent tes révisions espacées.</p>
   <button class="btn" id="tr">${icon("play", 18)}S'entraîner</button>
   <div class="card" style="padding:4px 16px">${t.vocab.map(w => { const c = S.srs[key(w)]; return `<div class="vocab">${sayBtn(w.en)}<div style="flex:1"><div class="en">${esc(w.en)}</div><div class="fr">${esc(w.fr)}</div></div>${c ? `<span class="tag" style="${c.box >= 3 ? "background:var(--ok-soft);color:var(--ok)" : ""}">${c.box >= 3 ? "maîtrisé" : "en cours"}</span>` : ""}</div>`; }).join("")}</div>`;
  $$("[data-say]").forEach(b => b.onclick = () => speak(b.dataset.say));
  $("#tr").onclick = () => runSet({ re: `go('dscgVocab','${id}')`, title: `Vocabulaire · ${t.fr}`, src: `DSCG · ${t.fr}`, mod: "dscgV" + id, icon: "book", list: dscgVocabSet(t), back: ["dscgVocab", id],
    done: pct => { dP(id).v = Math.max(dP(id).v || 0, pct) || 1; save(); return ""; } });
};
function dscgNotions(id) {
  const t = DT(id), list = shuffle(t.notions).map((n, i) => i % 2
    ? { type: "mcq", kicker: "DSCG · notions", q: `What is « ${n[0]} »?`, say: n[0], a: n[1], opts: optsOf(n[1], shuffle(t.notions).map(x => x[1])), cat: "dscg", quiet: true }
    : { type: "mcq", kicker: "DSCG · notions", q: `Which term matches this definition? « ${n[1]} »`, a: n[0], opts: optsOf(n[0], shuffle(t.notions).map(x => x[0])), cat: "dscg" });
  runSet({ re: `dscgNotions('${id}')`, title: `Notions · ${t.fr}`, src: `DSCG · ${t.fr}`, mod: "dscgN" + id, icon: "brain", list, back: ["dscgTheme", id],
    done: pct => { dP(id).n = Math.max(dP(id).n || 0, pct) || 1; save(); return ""; },
    after: `<div class="card"><h3>À retenir</h3>${t.notions.map(n => `<div class="vocab"><div><div class="en">${esc(n[0])}</div><div class="fr">${esc(n[1])}</div></div></div>`).join("")}</div>` });
}
const articleHtml = a => `<div class="card"><p class="kicker" style="margin:0">${esc(a.src)}</p><h3 style="margin:4px 0 10px">${esc(a.title)}</h3><p class="article">${esc(a.t)}</p></div>`;
SCREENS.dscgArticle = function (id) {
  setNav(null); const t = DT(id), a = t.article;
  app.innerHTML = `<div class="topbar"><button class="iconbtn plain" onclick="go('dscgTheme','${id}')">${icon("back")}</button><div style="flex:1"><div class="kicker" style="margin:0">DSCG · ${esc(t.fr)}</div><h3>Article</h3></div><button class="iconbtn" id="say">${icon("speaker")}</button></div>
   ${articleHtml(a)}
   <div class="card"><b>Question d'oral</b><p style="margin:6px 0 0">${esc(a.question)}</p></div>
   <button class="btn" id="ex">Questions de compréhension ${icon("arrow", 20)}</button>`;
  $("#say").onclick = () => speak(a.t, .9);
  $("#ex").onclick = () => runSet({ re: `go('dscgArticle','${id}')`, title: a.title, src: `DSCG · ${t.fr}`, mod: "dscgA" + id, icon: "doc", back: ["dscgTheme", id], xp: 3,
    list: a.q.map(q => ({ type: "read", kicker: "DSCG · compréhension", text: a.t, q: q[0], a: q[1], opts: shuffle(q.slice(1)), cat: "dscg" })),
    done: () => { dP(id).a = true; save(); return ""; },
    after: `<div class="card"><h3>Idées clés de l'article</h3>${a.points.map(x => `<p style="margin:8px 0 0" class="row">${icon("check", 16)}<span>${esc(x)}</span></p>`).join("")}</div>` });
};
function dscgSynth(id) {
  const t = DT(id), a = t.article;
  writeTask({ id: "dscg-" + id, kicker: `DSCG · ${t.fr}`, title: "Synthèse de l'article", task: "Résume l'article en anglais, avec tes propres mots, en trois ou quatre idées organisées. Ne recopie pas le texte.", min: 80,
    keys: ["the article deals with", "according to", "however", "to sum up"], model: a.points.join(" "), back: ["dscgTheme", id], intro: `<details class="memo"><summary><span>Relire l'article</span><span class="tag">texte</span></summary><p class="article" style="margin:12px 0">${esc(a.t)}</p></details>`,
    onDone: score => { dP(id).s = Math.max(typeof dP(id).s === "number" ? dP(id).s : 0, score) || 1; save(); } });
}

// ----- oral blanc -----
function fmt(s) { return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`; }
function startTimer(sec, el, onEnd) { clearInterval(window.__tm); let left = sec; const draw = () => { if (!document.body.contains(el)) return clearInterval(window.__tm); el.textContent = fmt(Math.max(0, left)); el.classList.toggle("late", left <= 60); };
  draw(); window.__tm = setInterval(() => { left--; draw(); if (left <= 0) { clearInterval(window.__tm); if (onEnd) onEnd(); } }, 1000); }
function recorder(box) {
  box.innerHTML = `<button class="btn sec" id="rec" style="margin-top:0">${icon("mic", 18)}S'enregistrer</button><div id="recout"></div>`;
  let mr = null, chunks = [];
  $("#rec").onclick = async () => {
    if (mr && mr.state === "recording") { mr.stop(); return; }
    try { const stream = await navigator.mediaDevices.getUserMedia({ audio: true }); chunks = []; mr = new MediaRecorder(stream);
      mr.ondataavailable = e => chunks.push(e.data);
      mr.onstop = () => { stream.getTracks().forEach(t => t.stop()); const url = URL.createObjectURL(new Blob(chunks, { type: mr.mimeType })); if ($("#recout")) $("#recout").innerHTML = `<audio controls src="${url}" style="width:100%;margin-top:10px"></audio><p class="muted small">Réécoute-toi : débit, hésitations, mots de liaison.</p>`; if ($("#rec")) $("#rec").innerHTML = `${icon("mic", 18)}Recommencer l'enregistrement`; };
      mr.start(); $("#rec").innerHTML = `${icon("close", 18)}Arrêter l'enregistrement`;
    } catch (e) { $("#recout").innerHTML = `<p class="muted small">Micro indisponible sur cet appareil ou accès refusé. Tu peux faire l'exercice sans t'enregistrer.</p>`; }
  };
}
SCREENS.dscgOral = function (id) {
  setNav(null); const t = DT(id), a = t.article; let notes = (S.writing["oral-" + id] || {}).text || "";
  const head = (step, title) => `<div class="topbar"><button class="iconbtn plain" onclick="go('dscgTheme','${id}')">${icon("close")}</button><div style="flex:1"><div class="kicker" style="margin:0">Oral blanc · ${step} / 4</div><h3>${title}</h3></div><span class="timer" id="tm"></span></div>`;
  const prep = min => {
    app.innerHTML = head(1, "Préparation") + articleHtml(a) + `<div class="card"><b>Question</b><p style="margin:6px 0 0">${esc(a.question)}</p></div>
     <textarea class="txt area" id="nt" placeholder="Tes notes : plan de la synthèse, plan de la réponse, exemples…">${esc(notes)}</textarea>
     <button class="btn" id="nx">Passer à l'exposé ${icon("arrow", 20)}</button>`;
    $("#nt").oninput = () => { notes = $("#nt").value; S.writing["oral-" + id] = { text: notes, done: null }; save(); };
    startTimer(min * 60, $("#tm")); $("#nx").onclick = talk;
  };
  const talk = () => {
    app.innerHTML = head(2, "Exposé") + `<p class="muted">Présente ta synthèse puis réponds à la question, à voix haute, en 15 minutes au plus.</p>
     <div class="card"><b>Question</b><p style="margin:6px 0 0">${esc(a.question)}</p></div>
     <div class="card"><b>Tes notes</b><p class="article" style="margin-bottom:0">${esc(notes || "Aucune note.").replace(/\n/g, "<br>")}</p></div>
     <details class="memo"><summary><span>Revoir l'article</span><span class="tag">texte</span></summary><p class="article" style="margin:12px 0">${esc(a.t)}</p></details>
     <div class="card" id="recbox"></div><button class="btn" id="nx">Passer à l'entretien ${icon("arrow", 20)}</button>`;
    recorder($("#recbox")); startTimer(15 * 60, $("#tm")); $("#nx").onclick = () => jury(0);
  };
  let juryEnd = 0;
  const jury = k => {
    if (k >= a.jury.length) return grade();
    const j = a.jury[k];
    app.innerHTML = head(3, "Entretien avec le jury") + `<p class="muted">Question ${k + 1} sur ${a.jury.length}. Réponds à voix haute en développant ta réponse.</p>
     <div class="card center"><button class="iconbtn big" id="sp">${icon("speaker", 38)}</button><p style="font-weight:700;font-size:18px;margin-bottom:0" id="qtx" hidden>${esc(j[0])}</p><button class="btn ghost" id="showq" style="width:auto;margin:10px auto 0">Afficher la question</button></div>
     <details class="memo"><summary><span>Éléments de réponse</span><span class="tag">aide</span></summary><p style="margin:12px 0">${esc(j[1])}</p></details>
     <button class="btn" id="nx">${k + 1 < a.jury.length ? "Question suivante" : "Terminer l'oral"} ${icon("arrow", 20)}</button>`;
    if (k === 0) juryEnd = Date.now() + 15 * 60 * 1000;
    startTimer(Math.max(0, Math.round((juryEnd - Date.now()) / 1000)), $("#tm"));
    $("#sp").onclick = () => speak(j[0], .88); setTimeout(() => speak(j[0], .88), 300);
    $("#showq").onclick = () => { $("#qtx").hidden = false; $("#showq").remove(); };
    $("#nx").onclick = () => jury(k + 1);
  };
  const grade = () => {
    clearInterval(window.__tm); const crit = ["Compréhension du texte", "Qualité de la synthèse", "Expression orale", "Mobilisation des connaissances", "Interaction avec le jury"], sc = crit.map(() => 2);
    const draw = () => {
      app.innerHTML = head(4, "Auto-évaluation") + `<p class="muted">Évalue-toi honnêtement sur chaque critère, de 0 à 4.</p>
       <div class="card">${crit.map((c, i) => `<div style="margin-bottom:14px"><b>${c}</b><div class="seg seg5">${[0, 1, 2, 3, 4].map(v => `<button data-c="${i}" data-v="${v}" class="${sc[i] === v ? "on" : ""}">${v}</button>`).join("")}</div></div>`).join("")}
        <div class="row between"><b>Note estimée</b><h2>${sc.reduce((x, y) => x + y, 0)} / 20</h2></div></div>
       <div class="card"><h3>Synthèse attendue</h3>${a.points.map(x => `<p style="margin:8px 0 0" class="row">${icon("check", 16)}<span>${esc(x)}</span></p>`).join("")}</div>
       <div class="card"><h3>Plan possible pour la question</h3>${a.plan.map((x, i) => `<div class="issue"><span class="num">${i + 1}</span><div>${esc(x)}</div></div>`).join("")}</div>
       <button class="btn" id="end">Enregistrer mon oral blanc</button>`;
      $("#tm").textContent = "";
      $$(".seg5 button").forEach(b => b.onclick = () => { sc[+b.dataset.c] = +b.dataset.v; draw(); });
      $("#end").onclick = () => { const total = sc.reduce((x, y) => x + y, 0), p = dP(id); p.o = true; p.oBest = Math.max(p.oBest || 0, total); p.oN = (p.oN || 0) + 1;
        const pr = S.prac.dscgOral = S.prac.dscgOral || { n: 0, best: 0 }; pr.n++; pr.best = Math.max(pr.best, total * 5); save(); addXP(20); go("dscgTheme", id); };
    };
    draw();
  };
  app.innerHTML = head(1, "Oral blanc") + `<div class="card"><p class="kicker" style="margin:0">${esc(t.en)}</p><h3 style="margin:4px 0 8px">${esc(a.title)}</h3><p class="muted" style="margin:0">Tu vas préparer l'article, faire ton exposé à voix haute, répondre à ${a.jury.length} questions du jury, puis t'évaluer.</p></div>
   <p class="muted small">Durée de la préparation</p><div class="seg seg3">${[[60, "Conditions réelles"], [20, "Entraînement"], [5, "Express"]].map(([m, l]) => `<button data-m="${m}">${m} min<small>${l}</small></button>`).join("")}</div>`;
  $("#tm").textContent = ""; $$(".seg3 button").forEach(b => b.onclick = () => prep(+b.dataset.m));
};
function dscgDailyEx() { const t = pick(DSCG_THEMES, 1)[0]; return dscgVocabSet(t, 2).filter(e => e.type !== "match").map(e => (e.kicker = "Séance du jour · DSCG", e.src = `DSCG · ${t.fr}`, e)); }

// ===== Référentiel CECRL (onglet Ressources) =====
const CEFR = [
  ["A0", "Découverte", "Tu reconnais quelques mots isolés : salutations, nombres, couleurs, objets du quotidien."],
  ["A1", "Introductif", "Tu comprends et utilises des expressions familières et des phrases très simples. Tu sais te présenter et poser des questions simples si ton interlocuteur parle lentement."],
  ["A2", "Intermédiaire ou de survie", "Tu comprends des phrases courantes sur des sujets proches : famille, achats, travail. Tu échanges des informations simples et tu racontes au passé."],
  ["B1", "Niveau seuil", "Tu comprends l'essentiel d'un propos clair sur des sujets familiers. Tu te débrouilles en voyage, tu racontes une expérience et tu donnes brièvement ton avis."],
  ["B2", "Avancé ou indépendant", "Tu comprends l'essentiel d'un texte complexe, y compris une discussion technique dans ta spécialité. Tu t'exprimes avec aisance et tu défends un point de vue en pesant le pour et le contre. C'est le niveau visé à l'oral du DSCG."],
  ["C1", "Autonome", "Tu comprends des textes longs et exigeants et leurs sous-entendus. Tu t'exprimes spontanément, de façon structurée, dans un cadre professionnel ou universitaire."],
  ["C2", "Maîtrise", "Tu comprends pratiquement tout sans effort. Tu résumes et reformules des sources variées et tu t'exprimes avec précision et nuance."]
];
SCREENS.cefr = function () {
  setNav("library"); const cur = currentLevel();
  app.innerHTML = appbar() + libBack() + `<h2>Référentiel CECRL</h2><p class="muted" style="margin-top:6px">Le Cadre européen commun de référence pour les langues décrit ce que l'on sait faire à chaque niveau.</p>
   ${CEFR.map(([id, name, d]) => { const ls = lessonsOf(id), done = ls.filter(l => S.done[l.id]).length;
     return `<div class="card ${id === cur ? "cert got" : ""}"><div class="row"><div class="level-badge" style="background:${LV(id).color}">${id}</div><div style="flex:1"><b>${name}</b><div class="muted small">${id === cur ? "Ton niveau actuel · " : ""}${done} / ${ls.length} leçons${S.certs[id] ? " · certificat obtenu" : ""}</div></div></div><p style="margin:10px 0 0">${d}</p></div>`; }).join("")}`;
};

// ----- migration : les nouvelles unités ne doivent pas reverrouiller un niveau déjà ouvert -----
if (!S.mig3) {
  LEVELS.forEach((lv, i) => { const old = lv.units.slice(0, -1).flatMap(u => u.lessons), nx = LEVELS[i + 1];
    if (nx && old.length && old.every(x => S.done[x.id]) && !S.unlocked.includes(nx.id)) S.unlocked.push(nx.id); });
  ALL.forEach(l => { if (S.done[l.id] && !S.unlocked.includes(l.level)) S.unlocked.push(l.level); });
  S.mig3 = 1; save();
}
// pas de zoom au double-clic / double appui
document.addEventListener("dblclick", e => e.preventDefault(), { passive: false });
document.addEventListener("gesturestart", e => e.preventDefault());

go(S.level ? "home" : "welcome");
