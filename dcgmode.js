// ===== Mode « Préparation DCG » (UE12 Anglais des affaires) + écran Réforme 2026 =====
ERR_CATS.dcg = ["Anglais des affaires (DCG)", "award"];
const dcgP = id => ((S.dcgP = S.dcgP || {})[id] = S.dcgP[id] || {});
const DCG_TASKS = () => [...DCG_SYNTH.map(x => "dcg-" + x.id), ...DCG_COMMENT.map(x => "dcg-" + x.id), ...DCG_PRO.map(x => "dcg-" + x.id)];
const dcgReady = () => { const a = DCG_AXES.filter(t => dcgP(t.id).v).length, w = DCG_TASKS().filter(id => S.writing[id] && S.writing[id].done).length; return Math.round((a + w) / (DCG_AXES.length + DCG_TASKS().length) * 100); };
const dcgBack = () => backBtn("dcg", "Préparation DCG");
function setExam(x) { S.dcg = x === "dcg"; S.dscg = x === "dscg"; save(); }
function dcgHomeCard() {
  if (!S.dcg) return "";
  return `<div class="card row" style="cursor:pointer" onclick="go('dcg')"><div class="iconbtn" style="background:var(--gold);color:#fff">${icon("award")}</div><div style="flex:1"><b>Préparation DCG · UE12</b><div class="muted small">${dcgReady()} % du programme travaillé</div><div class="bar" style="height:6px;margin-top:6px"><i style="width:${dcgReady()}%;background:var(--gold)"></i></div></div>${icon("arrow", 20)}</div>`;
}
const dcgTile = () => tile("go('dcg')", "award", "Préparation DCG · UE12", `Anglais des affaires : écrit de 3 heures · ${dcgReady()} %`);

SCREENS.dcg = function () {
  setNav("practice");
  app.innerHTML = appbar() + pracBack() + `<h2>Préparation DCG</h2><p class="muted" style="margin-top:6px">UE12 Anglais des affaires : une épreuve écrite de 3 heures à partir de documents en anglais.</p>
   <div class="hero" style="margin-top:12px"><div class="eyebrow">Ton avancement</div><h2>${dcgReady()} % du programme travaillé</h2><div class="bar" style="margin-top:10px"><i style="width:${dcgReady()}%"></i></div>
    <div class="row between small" style="margin-top:14px;opacity:.9"><span>Niveau d'anglais : ${currentLevel()}</span><span>Niveau visé : B2</span></div>
    <button class="btn light" onclick="go('dcgMock')">${icon("doc", 18)}Épreuve blanche de 3 heures</button></div>
   ${myLv() < lvIndex("B1") ? `<div class="card"><b>Tu pars de zéro ? C'est prévu.</b><p class="muted small" style="margin-bottom:0">Avance dans le Parcours jusqu'au niveau B1 en faisant l'unité d'anglais professionnel de chaque niveau, et travaille dès maintenant le vocabulaire des six thèmes. Les synthèses et commentaires deviennent utiles à partir de B1.</p></div>` : ""}
   <div class="unit">L'épreuve</div>
   ${tile("go('dcgInfo')", "doc", "Format et référentiel", "Les trois exercices, compétences, programme")}
   ${tile("go('reform')", "sparkle", "Réforme 2026 du DCG et du DSCG", "Ce qui change et à partir de quand")}
   <div class="unit">Les thèmes du programme</div>
   ${DCG_AXES.map(t => tile(`dcgVocab('${t.id}')`, "book", esc(t.fr), `Axe ${t.axis} · ${t.vocab.length} mots · ${esc(t.notes)}`, dcgP(t.id).v ? `<span class="tag okk">${icon("check", 12)}${dcgP(t.id).v} %</span>` : "")).join("")}
   <div class="unit">Exercice 1 · Synthèse en français</div>
   ${DCG_SYNTH.map(x => tile(`dcgWrite('s','${x.id}')`, "fix", esc(x.title), `${x.docs.length} documents en anglais`, wTag("dcg-" + x.id))).join("")}
   <div class="unit">Exercice 2 · Commentaire en anglais</div>
   ${DCG_COMMENT.map(x => tile(`dcgWrite('c','${x.id}')`, "chat", esc(x.title), esc(x.task), wTag("dcg-" + x.id))).join("")}
   <div class="unit">Exercice 3 · Document professionnel</div>
   ${DCG_PRO.map(x => tile(`dcgWrite('p','${x.id}')`, "doc", esc(x.title), esc(x.task), wTag("dcg-" + x.id))).join("")}
   ${tile("go('writing')", "doc", "Plus de sujets d'écriture", `${WRITINGS.length} sujets corrigés automatiquement`)}
   <div class="card"><button class="btn ${S.dcg ? "ghost" : "sec"}" style="margin-top:0" onclick="setExam(S.dcg ? null : 'dcg'); go('dcg')">${S.dcg ? "Retirer le DCG de mon accueil" : "Faire du DCG mon objectif principal"}</button></div>`;
};
const wTag = id => S.writing[id] && S.writing[id].score != null ? `<span class="tag okk">${String(S.writing[id].score).replace(".", ",")} / 20</span>` : "";
SCREENS.dcgInfo = function () {
  setNav("practice"); const I = DCG_INFO;
  app.innerHTML = appbar() + dcgBack() + `<h2>Format et référentiel</h2><p class="muted" style="margin-top:6px">DCG · UE12 Anglais des affaires.</p>
   <div class="card"><h3>L'épreuve en bref</h3>${I.facts.map(f => `<div class="vocab"><div style="flex:1"><div class="fr">${f[0]}</div><div class="en">${f[1]}</div></div></div>`).join("")}</div>
   <div class="card"><h3>Les trois exercices</h3>${I.parts.map((s, i) => `<div class="issue"><span class="num">${i + 1}</span><div><b>${s[0]}</b><div class="muted small">${s[1]}</div></div></div>`).join("")}</div>
   <div class="card"><h3>Compétences évaluées</h3>${I.skills.map(s => `<p style="margin:8px 0 0" class="row">${icon("check", 16)}<span>${s}</span></p>`).join("")}</div>
   <div class="card"><h3>Programme</h3>${[1, 2].map(a => `<p class="kicker" style="margin:12px 0 4px">Axe ${a} · ${a === 1 ? "Le monde de l'entreprise" : "Les questions économiques et sociétales"}</p>${DCG_AXES.filter(t => t.axis === a).map(t => `<div class="vocab"><div style="flex:1"><div class="en">${esc(t.fr)}</div><div class="fr">${esc(t.notes)}</div></div></div>`).join("")}`).join("")}</div>
   <div class="card"><b>Source</b><p class="muted small" style="margin-bottom:0">Présenté d'après l'arrêté du 4 août 2025 (Bulletin officiel n° 32 du 28 août 2025), tel que repris par des sites de préparation. Vérifie les modalités de ta session sur le texte officiel ou auprès de ton centre.</p></div>`;
};
SCREENS.reform = function () {
  setNav("library"); const R = REFORM;
  app.innerHTML = appbar() + libBack() + `<h2>Réforme 2026</h2><p class="muted" style="margin-top:6px">Nouveaux programmes du DCG et du DSCG.</p>
   <div class="card"><h3>Calendrier</h3>${R.dates.map(d => `<div class="vocab"><span class="tag" style="flex:none">${d[0]}</span><div class="fr" style="flex:1">${d[1]}</div></div>`).join("")}</div>
   <div class="card"><h3>DCG</h3>${R.dcg.map(x => `<p style="margin:8px 0 0" class="row">${icon("check", 16)}<span>${x}</span></p>`).join("")}<button class="btn sec" onclick="go('dcg')">Préparation DCG · UE12</button></div>
   <div class="card"><h3>DSCG</h3>${R.dscg.map(x => `<p style="margin:8px 0 0" class="row">${icon("check", 16)}<span>${x}</span></p>`).join("")}<button class="btn sec" onclick="go('dscg')">Préparation DSCG · UE6</button></div>
   <div class="card"><b>À vérifier</b><p class="muted small" style="margin-bottom:0">Synthèse établie d'après des sites de préparation qui citent l'arrêté du 4 août 2025. Les points « envisagés » (comme la dispense d'anglais du BTS CG) ne sont pas encore actés. Consulte le Bulletin officiel ou ton centre de formation pour ta session.</p></div>`;
};
function dcgVocab(id) {
  const t = DCG_AXES.find(x => x.id === id), list = dscgVocabSet({ fr: t.fr, vocab: t.vocab }).map(e => (e.kicker = `DCG · ${t.fr}`, e.cat = e.cat === "dscg" ? "dcg" : e.cat, e));
  runSet({ re: `dcgVocab('${id}')`, title: `Vocabulaire · ${t.fr}`, src: `DCG · ${t.fr}`, mod: "dcgV" + id, icon: "book", list, back: ["dcg"],
    done: pct => { dcgP(id).v = Math.max(dcgP(id).v || 0, pct) || 1; save(); return ""; },
    after: `<div class="card" style="padding:4px 16px">${t.vocab.map(w => `<div class="vocab">${sayBtn(w.en)}<div style="flex:1"><div class="en">${esc(w.en)}</div><div class="fr">${esc(w.fr)}</div></div></div>`).join("")}</div>` });
}
function dcgWrite(kind, id, back = "dcg") {
  if (kind === "s") { const x = DCG_SYNTH.find(y => y.id === id);
    return writeTask({ id: "dcg-" + id, lang: "fr", kicker: "DCG · synthèse en français", title: x.title, task: "Rédige en français une synthèse organisée des documents : idées essentielles et liens entre eux, sans donner ton avis.", min: x.min, keys: x.keys, model: x.model, back: [back],
      intro: x.docs.map(d => `<div class="card"><p class="kicker" style="margin:0">${esc(d[0])}</p><p class="article" style="margin-top:6px">${esc(d[1])}</p></div>`).join("") }); }
  const x = (kind === "c" ? DCG_COMMENT : DCG_PRO).find(y => y.id === id);
  writeTask({ id: "dcg-" + id, kicker: kind === "c" ? "DCG · commentaire en anglais" : "DCG · document professionnel", title: x.title, task: x.task, min: x.min, keys: x.keys, model: x.model, back: [back] });
}
SCREENS.dcgMock = function () {
  setNav(null); const s = pick(DCG_SYNTH, 1)[0], c = pick(DCG_COMMENT, 1)[0], p = pick(DCG_PRO, 1)[0];
  S.dcgMock = S.dcgMock && S.dcgMock.end > Date.now() ? S.dcgMock : { end: Date.now() + 3 * 3600e3, s: s.id, c: c.id, p: p.id }; save();
  const M = S.dcgMock, X = [["s", DCG_SYNTH.find(y => y.id === M.s), "Synthèse en français", "1 h 15"], ["c", DCG_COMMENT.find(y => y.id === M.c), "Commentaire en anglais", "1 h"], ["p", DCG_PRO.find(y => y.id === M.p), "Document professionnel", "45 min"]];
  app.innerHTML = `<div class="topbar"><button class="iconbtn plain" onclick="go('dcg')">${icon("close")}</button><div style="flex:1"><div class="kicker" style="margin:0">DCG · UE12</div><h3>Épreuve blanche</h3></div><span class="timer" id="tm"></span></div>
   <p class="muted">3 heures pour les trois exercices, comme le jour de l'examen. Le chronomètre continue même si tu quittes cet écran. Chaque copie est corrigée automatiquement.</p>
   ${X.map(([k, x, t, d], i) => `<div class="card"><div class="row between"><p class="kicker" style="margin:0">Exercice ${i + 1} · ${t}</p><span class="tag">conseillé : ${d}</span></div><h3 style="margin:6px 0">${esc(x.title)}</h3><p class="muted small" style="margin:0">${esc(x.task || "Synthèse de documents en anglais")}</p>
    <button class="btn ${S.writing["dcg-" + x.id] && S.writing["dcg-" + x.id].done ? "sec" : ""}" onclick="dcgWrite('${k}','${x.id}','dcgMock')">${S.writing["dcg-" + x.id] && S.writing["dcg-" + x.id].score != null ? `Revoir ma copie · ${String(S.writing["dcg-" + x.id].score).replace(".", ",")} / 20` : "Commencer"}</button></div>`).join("")}
   <button class="btn ghost" id="nw">${icon("reset", 18)}Tirer un nouveau sujet</button>`;
  startTimer(Math.max(0, Math.round((M.end - Date.now()) / 1000)), $("#tm"));
  $("#nw").onclick = () => { S.dcgMock = null; save(); go("dcgMock"); };
};
function dcgDailyEx() { const t = pick(DCG_AXES, 1)[0]; return dscgVocabSet({ fr: t.fr, vocab: t.vocab }, 2).filter(e => e.type !== "match").map(e => (e.kicker = "Séance du jour · DCG", e.cat = "dcg", e.src = `DCG · ${t.fr}`, e)); }
