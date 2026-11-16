// Moteur de contenu : chaque fichier de niveau appelle level(...)
// Leçon : L(titre, règle HTML, "en|fr; en|fr", "phrase|traduction; ...", [[question, bonne, faux1, faux2, faux3]], lecture?)
// Lecture (optionnelle) : {t:"texte anglais", q:[[question, bonne, faux...]]}
const LEVELS = [];
const PLACEMENT = {};
const pairs = s => (s || "").split(";").map(x => x.trim()).filter(Boolean).map(x => { const [en, fr] = x.split("|").map(y => y.trim()); return { en, fr }; });
function L(title, tip, words, sentences, quiz, read) { return { title, tip, words: pairs(words), sentences: pairs(sentences), quiz: quiz || [], read: read || null }; }
function U(title, ...lessons) { return { title, lessons }; }
function level(id, name, desc, color, units, placement) {
  units.forEach((u, ui) => u.lessons.forEach((l, li) => { l.id = `${id.toLowerCase()}-${ui + 1}-${li + 1}`; l.level = id; l.unit = u.title; }));
  LEVELS.push({ id, name, desc, color, units });
  PLACEMENT[id] = placement;
}
