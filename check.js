// ===== Correction automatique de l'expression écrite =====
// 1) règles intégrées (hors ligne, messages en français, fautes typiques des francophones)
// 2) correction approfondie en ligne via LanguageTool quand la connexion le permet
const SHORT_ADJ = "big|small|tall|old|young|fast|cheap|easy|good|bad|high|low|long|short|large|strong|hard|great|nice|rich|poor|new|slow|safe|simple";
const NUM_W = "\\d+|two|three|four|five|six|seven|eight|nine|ten|many|several|a few|some";
const W_RULES = [
  [/\bI am agree\b/gi, "agree est un verbe, on ne met pas be devant.", "I agree"],
  [/\bI am not agree\b/gi, "agree est un verbe : négation avec do not.", "I do not agree"],
  [/\b(he|she|it) (don't|do not)\b/gi, "À la 3e personne du singulier, on emploie does not.", m => `${m[1]} does not`],
  [/\b(he|she|it) have\b/gi, "À la 3e personne du singulier, have devient has.", m => `${m[1]} has`],
  [/\b(I|you|we|they) (has|does)\b/g, "has et does ne s'emploient qu'avec he, she, it.", m => `${m[1]} ${m[2] === "has" ? "have" : "do"}`],
  [/\b(you|we|they) (is|was)\b/gi, "Accord sujet-verbe : are ou were avec you, we, they.", m => `${m[1]} ${m[2].toLowerCase() === "is" ? "are" : "were"}`],
  [/\bpeople (is|was|has)\b/gi, "people est un pluriel.", m => `people ${{ is: "are", was: "were", has: "have" }[m[1].toLowerCase()]}`],
  [/\b(everyone|everybody|nobody|someone|somebody) (are|were|have)\b/gi, "Ce pronom est suivi du singulier.", m => `${m[1]} ${{ are: "is", were: "was", have: "has" }[m[2].toLowerCase()]}`],
  [/\b(informations|advices|furnitures|luggages|equipments|softwares|datas|knowledges|evidences|feedbacks|homeworks|researches)\b/gi, "Ce nom est indénombrable : il ne prend pas de s.", m => m[0].replace(/e?s$/i, "").replace(/^datas?$/i, "data")],
  [/\b(childrens|mens|womens)\b/gi, "Ce pluriel est irrégulier et ne prend pas de s.", m => m[0].slice(0, -1)],
  [new RegExp(`\\bsince (${NUM_W}) (years?|months?|weeks?|days?|hours?|minutes?)\\b`, "gi"), "Pour une durée, on emploie for. since s'emploie avec un point de départ.", m => `for ${m[1]} ${m[2]}`],
  [/\bdepend(s|ed)? (of|from)\b/gi, "depend se construit avec on.", m => `depend${m[1] || ""} on`],
  [/\binterested (by|for|to)\b/gi, "On dit interested in.", "interested in"],
  [/\bmarried with\b/gi, "On dit married to.", "married to"],
  [/\bresponsible of\b/gi, "On dit responsible for.", "responsible for"],
  [/\b(can|could|must|should|will|would|may|might) to (?=[a-z])/gi, "Après un modal, base verbale sans to.", m => `${m[1]} `],
  [/\bwill can\b/gi, "Deux modaux ne se suivent pas.", "will be able to"],
  [/\b(didn't|did not|doesn't|does not|don't|do not) (?!need\b|feed\b|speed\b|proceed\b|succeed\b|exceed\b)(\w+ed|went|saw|took|made|came|had|got|bought|said|told|knew|gave|found|thought)\b/gi, "Après do, does ou did, on emploie la base verbale.", null],
  [new RegExp(`\\bmore (${SHORT_ADJ})\\b`, "gi"), "Adjectif court : le comparatif se forme avec -er (better, worse pour good, bad).", null],
  [new RegExp(`\\bthe most (${SHORT_ADJ})\\b`, "gi"), "Adjectif court : le superlatif se forme avec -est (the best, the worst).", null],
  [/\bmore (better|worse)\b/gi, "better et worse sont déjà des comparatifs.", m => m[1]],
  [/\ba (?!uni|use|usu|eu|one\b|once\b|user)([aeio]\w+)/g, "Devant un son voyelle, on emploie an.", m => `an ${m[1]}`],
  [/\ban ([bcdfgjklmnpqrstvwxyz]\w+)/g, "Devant un son consonne, on emploie a.", m => `a ${m[1]}`],
  [/(^|[\s(«"])i(?=[\s,.!?'])/g, "Le pronom I s'écrit toujours en majuscule.", m => `${m[1]}I`],
  [/\bexplain(ed|s)? (me|us|him|her|them)\b/gi, "explain something to someone.", null],
  [/\bsaid (me|us|him|her|them)\b/gi, "say something, mais tell someone.", m => `told ${m[1]}`],
  [/\bdiscuss(ed|es)? about\b/gi, "discuss se construit sans préposition.", m => `discuss${m[1] || ""}`],
  [/\blook(ing)? forward to (see|hear|meet|work|receive|read)\b/gi, "Après look forward to, verbe en -ing.", m => `look${m[1] || ""} forward to ${m[2]}ing`],
  [/\bI have \d+ years\b/gi, "L'âge s'exprime avec be : I am … years old.", null],
  [/\b(do|did|does|doing) (a|the|some|many) mistakes?\b/gi, "On dit make a mistake.", null],
  [/\baccording to me\b/gi, "according to ne s'emploie pas avec me.", "in my opinion"],
  [/\bwant(s|ed)? that\b/gi, "want someone to do something.", null],
  [/\bI am born\b/gi, "On dit I was born.", "I was born"],
  [/\bit depend\b/gi, "À la 3e personne : it depends.", "it depends"],
  [/\bmuch (people|friends|books|things|problems|companies|employees|customers|countries|years)\b/gi, "Avec un nom dénombrable au pluriel, on emploie many.", m => `many ${m[1]}`],
  [/\bmany (money|time|information|work|water|progress|advice)\b/gi, "Avec un nom indénombrable, on emploie much.", m => `much ${m[1]}`],
  [/\bfor to\b/gi, "Le but s'exprime avec to ou in order to.", "to"],
  [/\bthe society\b/gi, "Une entreprise se dit company. society désigne la société en général, sans article.", null],
  [/\bbenefits? of the (company|firm|year)\b/gi, "Le bénéfice comptable se dit profit.", null],
  [/\b(english|french|france|england|europe|european|british|american|german|spanish|monday|tuesday|wednesday|thursday|friday|saturday|sunday|january|february|april|june|july|august|september|october|november|december)\b/g, "Les langues, nationalités, jours et mois prennent une majuscule.", m => m[0][0].toUpperCase() + m[0].slice(1)],
  [/\b(?!had\b|that\b)(\w{2,}) \1\b/gi, "Mot répété.", m => m[1]],
  [/ +[?!:;]/g, "En anglais, pas d'espace avant la ponctuation.", m => m[0].trim()],
  [/[,;:!?](?=[A-Za-z])/g, "Il manque une espace après la ponctuation.", m => `${m[0]} `],
  [/(^|[.!?]\s+)([a-z])/g, "Une phrase commence par une majuscule.", m => `${m[1]}${m[2].toUpperCase()}`]
];
function localCheck(text) {
  const out = [];
  W_RULES.forEach(([re, msg, fix]) => { re.lastIndex = 0; let m; while ((m = re.exec(text))) { if (!m[0].length) { re.lastIndex++; continue; }
    if (msg.startsWith("Une phrase commence") && /(a\.m|p\.m|e\.g|i\.e|etc|Mr|Mrs|Ms|Dr)\.$/.test(text.slice(0, m.index + 1))) continue;
    out.push({ off: m.index, len: m[0].length, msg, fix: typeof fix === "function" ? fix(m) : fix, label: "Grammaire", w: 1, src: "local" }); } });
  return out;
}
const LT_LABEL = { misspelling: "Orthographe", grammar: "Grammaire", typographical: "Typographie", style: "Style", duplication: "Répétition", whitespace: "Typographie", "locale-violation": "Variante", uncategorized: "Langue" };
async function onlineCheck(text) {
  if (!navigator.onLine || typeof fetch !== "function") return null;
  const ctl = new AbortController(), tm = setTimeout(() => ctl.abort(), 9000);
  try {
    const r = await fetch("https://api.languagetool.org/v2/check", { method: "POST", signal: ctl.signal, headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ text, language: "en-GB", motherTongue: "fr" }) });
    if (!r.ok) return null;
    const j = await r.json();
    return (j.matches || []).map(m => { const t = (m.rule && m.rule.issueType) || "uncategorized";
      return { off: m.offset, len: m.length, msg: m.message, fix: m.replacements && m.replacements[0] ? m.replacements[0].value : null, label: LT_LABEL[t] || "Langue", w: t === "style" || t === "typographical" || t === "whitespace" ? .3 : 1, src: "lt" }; });
  } catch (e) { return null; } finally { clearTimeout(tm); }
}
function mergeIssues(a, b) {
  const out = [...a].sort((x, y) => y.len - x.len || x.off - y.off).filter((x, i, arr) => !arr.slice(0, i).some(p => x.off < p.off + p.len && p.off < x.off + x.len));
  (b || []).forEach(x => { if (!out.some(p => x.off < p.off + p.len && p.off < x.off + x.len)) out.push(x); });
  return out.sort((x, y) => x.off - y.off);
}
const CONNECTORS = ["however", "moreover", "furthermore", "therefore", "although", "because", "but", "so", "then", "first", "firstly", "secondly", "finally", "in addition", "on the one hand", "on the other hand", "nevertheless", "whereas", "while", "as a result", "for example", "for instance", "in my opinion", "to conclude", "to sum up", "according to", "despite", "unless", "since", "thus", "indeed", "admittedly", "on balance", "in order to"];
function gradeWriting(text, cfg, issues) {
  const words = text.trim() ? text.trim().split(/\s+/) : [], n = words.length, t = " " + norm(text) + " ";
  const sents = text.split(/[.!?]+/).map(s => s.trim()).filter(s => s.split(/\s+/).length >= 2);
  const found = cfg.keys.filter(k => t.includes(norm(k))), conn = uniq(CONNECTORS.filter(c => t.includes(" " + c + " ")));
  const uniqN = uniq(norm(text).split(" ").filter(Boolean)).length, guiraud = n ? uniqN / Math.sqrt(n) : 0;
  const errW = issues.reduce((s, x) => s + x.w, 0), rate = n ? errW / n * 100 : 0, avg = sents.length ? n / sents.length : 0;
  const C = [
    ["Longueur", 4, Math.min(1, n / cfg.min) * 4, `${n} mots sur ${cfg.min} attendus`],
    ["Expressions attendues", 4, cfg.keys.length ? found.length / cfg.keys.length * 4 : 4, `${found.length} sur ${cfg.keys.length} utilisées`],
    ["Correction de la langue", 6, Math.max(0, 6 - rate * 1.1), issues.length ? `${issues.length} point${issues.length > 1 ? "s" : ""} à revoir` : "Aucune faute repérée"],
    ["Richesse du vocabulaire", 3, Math.max(0, Math.min(3, (guiraud - 3.5) / 3.5 * 3)), `${uniqN} mots différents`],
    ["Structure et liaisons", 3, (sents.length >= 3 ? 1 : 0) + (avg >= 7 && avg <= 28 ? 1 : 0) + Math.min(1, conn.length / 3), `${sents.length} phrases, ${conn.length} mot${conn.length > 1 ? "s" : ""} de liaison`]
  ];
  const total = Math.round(C.reduce((s, c) => s + c[2], 0) * 2) / 2;
  const tips = [];
  if (n < cfg.min) tips.push(`Développe davantage : il manque ${cfg.min - n} mots.`);
  if (found.length < cfg.keys.length) tips.push(`Essaie d'intégrer : ${cfg.keys.filter(k => !found.includes(k)).join(", ")}.`);
  if (conn.length < 3) tips.push("Ajoute des mots de liaison (however, moreover, therefore, for instance…) pour structurer ton texte.");
  if (avg > 28) tips.push("Tes phrases sont très longues : coupe-les pour gagner en clarté.");
  if (avg && avg < 7) tips.push("Tes phrases sont très courtes : relie-les avec because, although, which…");
  if (guiraud < 5 && n >= 30) tips.push("Varie ton vocabulaire : évite de répéter les mêmes mots.");
  return { total, C, tips, n, found, conn };
}
function reportHtml(text, cfg, issues, online) {
  const g = gradeWriting(text, cfg, issues); let pos = 0, marked = "";
  issues.forEach((x, i) => { if (x.off < pos) return; marked += esc(text.slice(pos, x.off)) + `<mark title="${esc(x.msg)}">${esc(text.slice(x.off, x.off + x.len))}<sup>${i + 1}</sup></mark>`; pos = x.off + x.len; });
  marked += esc(text.slice(pos));
  const col = g.total >= 14 ? "var(--ok)" : g.total >= 10 ? "var(--gold)" : "var(--ko)";
  return { score: g.total, html: `<div class="card"><div class="row between"><div><p class="kicker" style="margin:0">Correction automatique</p><h2 style="color:${col}">${String(g.total).replace(".", ",")} / 20</h2></div><div class="iconbtn" style="background:${col};color:#fff">${icon("fix")}</div></div>
     ${g.C.map(c => `<div style="margin-top:12px"><div class="row between small"><b>${c[0]}</b><span class="muted">${(Math.round(c[2] * 10) / 10).toString().replace(".", ",")} / ${c[1]} · ${c[3]}</span></div><div class="bar" style="margin-top:5px;height:7px"><i style="width:${c[2] / c[1] * 100}%"></i></div></div>`).join("")}
     <p class="muted small" style="margin-bottom:0">${online ? "Correction intégrée complétée par l'analyse en ligne LanguageTool." : "Correction intégrée uniquement (analyse en ligne indisponible ou désactivée)."} Une note automatique reste indicative.</p></div>
    ${g.tips.length ? `<div class="card"><h3>Conseils</h3>${g.tips.map(t => `<p style="margin:8px 0 0">${esc(t)}</p>`).join("")}</div>` : ""}
    <div class="card"><h3>Ton texte annoté</h3><p class="annot">${marked.replace(/\n/g, "<br>")}</p></div>
    ${issues.length ? `<div class="card"><h3>${issues.length} point${issues.length > 1 ? "s" : ""} à revoir</h3>${issues.map((x, i) => `<div class="issue"><span class="num">${i + 1}</span><div><span class="tag ko">${x.label}</span> <s>${esc(text.slice(x.off, x.off + x.len).trim() || "espace")}</s>${x.fix != null && x.fix !== "" ? ` <b class="fixv">${esc(x.fix.trim() || x.fix)}</b>` : ""}<div class="muted small">${esc(x.msg)}</div></div></div>`).join("")}</div>` : `<div class="card row"><div class="iconbtn" style="background:var(--ok-soft);color:var(--ok)">${icon("check")}</div><div><b>Aucune faute repérée</b><div class="muted small">Compare tout de même tes tournures avec le corrigé.</div></div></div>`}` };
}

// Écran de rédaction générique (expression écrite et synthèses DSCG)
function writeTask(cfg) {
  setNav(null); const st = S.writing[cfg.id] = S.writing[cfg.id] || { text: "", done: null };
  if (S.ltOn === undefined) S.ltOn = true;
  app.innerHTML = `<div class="topbar"><button class="iconbtn plain" id="wback">${icon("back")}</button><div style="flex:1"><div class="kicker" style="margin:0">${esc(cfg.kicker)}</div><h3>${esc(cfg.title)}</h3></div></div>
   <div class="card"><b>Sujet</b><p style="margin:6px 0 0">${esc(cfg.task)}</p><p class="muted small" style="margin-bottom:0">Objectif : au moins ${cfg.min} mots.${st.score != null ? ` Dernière note : ${String(st.score).replace(".", ",")} / 20.` : ""}</p></div>
   ${cfg.intro || ""}
   <textarea class="txt area" id="tx" placeholder="Écris ton texte en anglais ici…" spellcheck="false">${esc(st.text)}</textarea>
   <div class="row between small muted" style="margin-top:8px"><span id="wc"></span><span>Expressions attendues</span></div><div class="keys" id="keys"></div>
   <button class="btn" id="ok">${icon("fix", 18)}Corriger mon texte</button>
   <label class="check"><input type="checkbox" id="lt" ${S.ltOn ? "checked" : ""}><span>Correction approfondie en ligne. Ton texte est alors envoyé au service LanguageTool.</span></label>
   <div id="report"></div><button class="btn sec" id="show">Voir le corrigé modèle</button><div id="model"></div>`;
  $("#wback").onclick = () => go(...cfg.back);
  const upd = () => { st.text = $("#tx").value; const n = st.text.trim() ? st.text.trim().split(/\s+/).length : 0, t = norm(st.text);
    $("#wc").textContent = `${n} / ${cfg.min} mots`; $("#ok").disabled = n < 5;
    $("#keys").innerHTML = cfg.keys.map(k => `<span class="tag ${t.includes(norm(k)) ? "okk" : ""}">${t.includes(norm(k)) ? icon("check", 12) : ""}${esc(k)}</span>`).join(""); };
  $("#tx").oninput = () => { upd(); save(); }; upd();
  $("#lt").onchange = () => { S.ltOn = $("#lt").checked; save(); };
  const model = () => { $("#model").innerHTML = `<div class="card"><div class="row between"><h3>Corrigé modèle</h3><button class="iconbtn plain sm" id="msay">${icon("speaker", 18)}</button></div><p style="margin-bottom:0">${esc(cfg.model)}</p></div>`; $("#msay").onclick = () => speak(cfg.model); };
  $("#show").onclick = model;
  $("#ok").onclick = async () => {
    const text = st.text; $("#ok").disabled = true; $("#report").innerHTML = `<p class="muted center">Analyse en cours…</p>`;
    const remote = S.ltOn ? await onlineCheck(text) : null, issues = mergeIssues(localCheck(text), remote), rep = reportHtml(text, cfg, issues, !!remote);
    if (!$("#report")) return;
    const firstTime = !st.done; st.done = today(); st.score = Math.max(st.score || 0, rep.score); save(); if (firstTime) addXP(15);
    $("#report").innerHTML = rep.html; $("#ok").disabled = false; if (cfg.onDone) cfg.onDone(rep.score);
    $("#report").scrollIntoView({ behavior: "smooth", block: "start" });
  };
}
SCREENS.write = id => { const w = WRITINGS.find(x => x.id === id); writeTask({ id, kicker: `Expression écrite · ${w.lv}`, title: w.title, task: w.task, min: w.min, keys: w.keys, model: w.model, back: ["writing"] }); };
