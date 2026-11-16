// ===== Routine quotidienne : séries en VO, oral, écoute, carnet de mots =====
const lessonToday = () => S.dailyDone === today() || Object.values(S.done).some(d => d && d.date === today() && !d.skipped);
const journalId = () => "journal-" + today();
const ROUTINE = [
  { id: "daily", icon: "bolt", t: "Faire une leçon ou la séance du jour", d: "Coché automatiquement", auto: lessonToday, go: "startDaily()" },
  { id: "review", icon: "brain", t: "Réviser mes mots", d: "Coché quand les révisions du jour sont faites", auto: () => Object.keys(S.srs).length > 0 && dueCards().length === 0, go: "go('review')" },
  { id: "serie", icon: "play", t: "Regarder un épisode ou un film en VO", d: "Sous-titres en anglais, jamais en français" },
  { id: "speak", icon: "mic", t: "Parler 10 minutes à voix haute", d: "Répéter des répliques, lire un dialogue, raconter ta journée" },
  { id: "write", icon: "fix", t: "Écrire quelques phrases en anglais", d: "3 à 5 phrases sur ta journée, corrigées automatiquement", auto: () => !!(S.writing[journalId()] && S.writing[journalId()].done === today()), go: "openJournal()" },
  { id: "listen", icon: "headphones", t: "Écouter un podcast", d: "Dans les transports ou en marchant" },
  { id: "read", icon: "doc", t: "Lire en anglais", d: "Un article, quelques pages d'un livre, un sujet qui te plaît" }
];
const STUDIES = [
  ["Beaucoup d'anglais que tu comprends presque entièrement", "On progresse surtout en écoutant et en lisant un anglais un peu au-dessus de son niveau, en grande quantité. D'où l'épisode quotidien en VO.", "Krashen, The Input Hypothesis, 1985"],
  ["Sous-titres en anglais, pas en français", "Les sous-titres dans la langue étudiée aident à reconnaître les mots à l'oral ; les sous-titres en français, eux, gênent cet apprentissage.", "Mitterer et McQueen, PLoS ONE, 2009"],
  ["Se tester plutôt que relire", "Chercher la réponse de mémoire fixe bien mieux que relire. C'est le principe des exercices et des révisions de l'appli.", "Roediger et Karpicke, Psychological Science, 2006"],
  ["Espacer les révisions", "Revoir un mot après 1 jour, puis 3, puis 7… retient beaucoup mieux que tout réviser d'un coup.", "Cepeda et al., Psychological Bulletin, 2006"],
  ["Parler et écrire, pas seulement comprendre", "Produire oblige à remarquer ce qui manque : c'est ce qui transforme le vocabulaire passif en vocabulaire utilisable.", "Swain, hypothèse de l'output, 1985"],
  ["Échanger avec de vrais interlocuteurs", "La conversation, avec ses incompréhensions et ses reformulations, accélère l'acquisition. Une fois par semaine suffit pour commencer.", "Long, hypothèse de l'interaction, 1996"],
  ["Un peu chaque jour plutôt que beaucoup une fois", "Plusieurs séances courtes réparties dans la semaine donnent de meilleurs résultats qu'une seule longue séance.", "Effet d'espacement, Cepeda et al., 2006"]
];
const SHOWS = [
  { lv: "A0–A1", list: [["Extra English", "Série conçue pour les apprenants, très lente et claire"], ["Peppa Pig", "Phrases courtes, accent britannique, idéal pour démarrer"]] },
  { lv: "A2", list: [["Friends", "Anglais du quotidien, épisodes courts, beaucoup de répétitions"], ["How I Met Your Mother", "Dialogues simples entre amis"]] },
  { lv: "B1", list: [["Modern Family", "Vie de famille, humour, débit naturel"], ["The Office (US)", "Le monde du bureau, très utile pour le vocabulaire du travail"], ["Brooklyn Nine-Nine", "Rythme rapide mais phrases simples"]] },
  { lv: "B2", list: [["Suits", "Cabinet d'avocats d'affaires : négociation, fusions, contrats", 1], ["Ted Lasso", "Management et leadership, accent britannique", 1], ["The Crown", "Anglais britannique soutenu"]] },
  { lv: "C1–C2", list: [["Succession", "Gouvernance, conseil d'administration, rachats", 1], ["Billions", "Marchés financiers et fonds d'investissement", 1], ["Industry", "Banque d'investissement à Londres", 1], ["The Big Short (film)", "Crise financière de 2008", 1]] }
];
const PODCASTS = [["6 Minute English (BBC)", "Six minutes sur un sujet du quotidien, avec le vocabulaire expliqué", "A2–B1"], ["Business English Pod", "Situations professionnelles : réunions, négociations, e-mails", "B1–B2"], ["Planet Money (NPR)", "L'économie racontée simplement", "B2–C1"], ["The Economist Podcasts", "Actualité économique, idéal pour le DCG et le DSCG", "C1"]];
const RT = () => { S.routine = S.routine || { on: ["daily", "review", "serie", "speak", "write"], log: {}, words: [], v: 2 };
  if (S.routine.v !== 2) { if (!S.routine.on.includes("write")) S.routine.on.push("write"); S.routine.v = 2; }
  return S.routine; };
function openJournal() {
  writeTask({ id: journalId(), kicker: "Journal du jour", title: "Ma journée en anglais", task: "Écris 3 à 5 phrases sur ta journée : ce que tu as fait, ce que tu as ressenti, ce que tu prévois demain. Réutilise les mots appris récemment.", min: 30, keys: ["today", "because", "tomorrow"], model: "Today I had a busy day. In the morning I went to class and we studied the balance sheet. I found it difficult because there were many new words. In the evening I watched an episode of a series in English with English subtitles. Tomorrow I am going to revise my vocabulary and practise speaking for ten minutes.", back: [app.querySelector(".routine-page") ? "routine" : "home"] });
}
const rtItems = () => ROUTINE.filter(r => RT().on.includes(r.id));
const rtDone = (r, d = today()) => r.auto && d === today() ? r.auto() : (RT().log[d] || []).includes(r.id);
function rtDayFull(d) { const it = rtItems(); return it.length && it.every(r => (RT().log[d] || []).includes(r.id) || (d === today() && r.auto && r.auto())); }
function rtToggle(id) {
  const r = ROUTINE.find(x => x.id === id); if (r.auto) { if (!r.auto()) new Function(r.go)(); return; }
  const L = RT().log[today()] = RT().log[today()] || [];
  if (L.includes(id)) L.splice(L.indexOf(id), 1); else { L.push(id); addXP(5); if (rtDayFull(today())) toast("Routine du jour complète, bravo !"); }
  save();
}
function rtStreak() { let n = 0; for (let i = 0; i < 400; i++) { const d = new Date(Date.now() - i * 864e5).toISOString().slice(0, 10); if (rtDayFull(d)) n++; else if (i > 0) break; } return n; }
function routineCard() {
  if (!S.level) return "";
  const it = rtItems(), done = it.filter(r => rtDone(r)).length;
  return `<div class="card routine"><div class="row between"><div class="row" style="color:var(--pri)">${icon("check", 20)}<h3>Ma routine du jour</h3></div><a class="small" style="color:var(--pri);font-weight:700;cursor:pointer" onclick="go('routine')">Conseils</a></div>
    <div class="bar" style="height:6px;margin:12px 0 4px"><i style="width:${it.length ? done / it.length * 100 : 0}%;background:var(--ok)"></i></div>
    ${it.map(r => `<button class="rt ${rtDone(r) ? "on" : ""}" data-rt="${r.id}"><span class="cb">${icon("check", 15)}</span><span class="tx"><b>${r.t}</b><small>${r.d}</small></span></button>`).join("")}</div>`;
}
function bindRoutine() { $$("[data-rt]").forEach(b => b.onclick = () => { rtToggle(b.dataset.rt); const y = window.scrollY; SCREENS[app.querySelector(".routine-page") ? "routine" : "home"](); window.scrollTo && document.scrollingElement && (document.scrollingElement.scrollTop = y); }); }

SCREENS.routine = function () {
  setNav("practice");
  const week = [...Array(7)].map((_, i) => { const d = new Date(Date.now() - (6 - i) * 864e5); const k = d.toISOString().slice(0, 10); return { l: ["L", "M", "M", "J", "V", "S", "D"][(d.getDay() + 6) % 7], ok: rtDayFull(k), part: (RT().log[k] || []).length > 0 }; });
  app.innerHTML = appbar() + pracBack() + `<div class="routine-page"><h2>Ma routine anglaise</h2><p class="muted" style="margin-top:6px">L'appli te donne la structure. Les séries, l'oral et l'écoute te donnent l'habitude d'entendre et de parler : les deux ensemble, c'est ce qui fait vraiment progresser.</p>
   <div class="grid2"><div class="stat">${icon("flame", 20)}<b>${rtStreak()}</b><span>jours de routine complète d'affilée</span></div><div class="stat"><div class="week7">${week.map(w => `<span class="${w.ok ? "ok" : w.part ? "part" : ""}">${w.l}</span>`).join("")}</div><span>les 7 derniers jours</span></div></div>
   ${routineCard()}
   <div class="card"><h3>Ce que disent les études</h3>
    <p class="muted small" style="margin-top:4px">Ta routine est construite sur ce qui fait le plus progresser d'après la recherche sur l'apprentissage des langues.</p>
    ${STUDIES.map(([t, d, src]) => `<div class="issue"><span class="num">${icon("check", 14)}</span><div><b>${t}</b><div class="muted small">${d}</div><div class="src">${src}</div></div></div>`).join("")}</div>
   <div class="card"><h3>Ta journée idéale : 45 à 60 minutes</h3>
    ${[["10 à 15 min", "Une leçon ou la séance du jour, puis tes révisions"], ["20 à 45 min", "Un épisode de série en VO, ou un film un autre jour"], ["10 min", "Parler : répéter des répliques de l'épisode, lire un dialogue"], ["5 min", "Écrire quelques phrases dans ton journal"], ["1 fois par semaine", "Une vraie conversation : un échange linguistique, un cours, un collègue anglophone"]].map(([t, d]) => `<div class="vocab"><span class="tag" style="flex:none">${t}</span><div class="fr" style="flex:1">${d}</div></div>`).join("")}
    <p class="muted small" style="margin-bottom:0">Pas le temps ? Garde au moins la leçon et les révisions : la régularité compte plus que la durée.</p>
    <div class="row" style="gap:10px;margin-top:12px"><button class="btn sec" style="margin:0" onclick="go('dialogues')">${icon("chat", 18)}Lire un dialogue</button><button class="btn sec" style="margin:0" onclick="openJournal()">${icon("fix", 18)}Mon journal</button></div></div>
   <div class="card" id="carnet"><h3>Mon carnet de mots</h3><p class="muted small" style="margin-top:4px">Un mot entendu dans une série ? Ajoute-le : il reviendra dans tes révisions.</p>
    <input class="txt" id="cw-en" placeholder="Mot ou expression en anglais" autocapitalize="off"><div style="height:8px"></div><input class="txt" id="cw-fr" placeholder="Traduction en français"><p class="msg" id="cw-m"></p>
    <button class="btn sec" id="cw-add">${icon("check", 18)}Ajouter à mes révisions</button>
    ${RT().words.length ? RT().words.slice().reverse().slice(0, 30).map(w => `<div class="vocab">${sayBtn(w.en)}<div style="flex:1"><div class="en">${esc(w.en)}</div><div class="fr">${esc(w.fr)}</div></div><span class="muted small">${w.date.split("-").reverse().slice(0, 2).join("/")}</span></div>`).join("") : ""}</div>
   <div class="unit">Séries conseillées selon ton niveau</div>
   ${SHOWS.map(g => `<div class="card"><div class="row between"><b>Niveau ${g.lv}</b></div>${g.list.map(s => `<div class="vocab"><div style="flex:1"><div class="en">${esc(s[0])}${s[2] ? ` <span class="tag">DCG · DSCG</span>` : ""}</div><div class="fr">${esc(s[1])}</div></div></div>`).join("")}</div>`).join("")}
   <div class="unit">Podcasts</div>
   <div class="card">${PODCASTS.map(p => `<div class="vocab"><div style="flex:1"><div class="en">${esc(p[0])}</div><div class="fr">${esc(p[1])}</div></div><span class="tag">${p[2]}</span></div>`).join("")}</div>
   <div class="card"><h3>Ma routine</h3><p class="muted small" style="margin-top:4px">Choisis les habitudes à suivre chaque jour.</p>${ROUTINE.map(r => `<label class="check"><input type="checkbox" data-on="${r.id}" ${RT().on.includes(r.id) ? "checked" : ""}><span><b>${r.t}</b><br>${r.d}</span></label>`).join("")}</div></div>`;
  bindRoutine();
  $$("[data-say]").forEach(b => b.onclick = () => speak(b.dataset.say));
  $$("[data-on]").forEach(c => c.onchange = () => { const on = RT().on, id = c.dataset.on; if (c.checked && !on.includes(id)) on.push(id); if (!c.checked) on.splice(on.indexOf(id), 1); save(); go("routine"); });
  $("#cw-add").onclick = () => {
    const en = $("#cw-en").value.trim(), fr = $("#cw-fr").value.trim();
    if (!en || !fr) { $("#cw-m").textContent = "Écris le mot en anglais et sa traduction."; return; }
    const w = { en, fr }, k = key(w);
    if (!S.srs[k]) S.srs[k] = { box: 0, due: today(), seen: 0, ok: 0, mine: 1 };
    RT().words.push({ en, fr, date: today() }); save(); addXP(2);
    go("routine"); toast("Mot ajouté à tes révisions"); document.getElementById("carnet").scrollIntoView();
  };
};
