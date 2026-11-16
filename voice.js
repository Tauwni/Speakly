// ===== Voix naturelles (synthèse neuronale côté serveur) avec repli sur la voix de l'appareil =====
const VOICES = [["pandora", "Pandora", "Britannique · femme"], ["draco", "Draco", "Britannique · homme"], ["thalia", "Thalia", "Américaine · femme"], ["apollo", "Apollo", "Américain · homme"], ["device", "Appareil", "Voix intégrée, hors ligne"]];
const voiceId = () => S.voice || "pandora";
const AUDIO_CACHE = new Map();
let CUR_AUDIO = null, SPEAK_TOKEN = 0;
const deviceSpeak = speak; // voix intégrée du navigateur

// meilleure voix intégrée possible (voix « améliorées », « premium », « naturelles » ou Google)
pickVoice = function () {
  try {
    const v = speechSynthesis.getVoices().filter(x => /^en/i.test(x.lang)), score = x => (/natural|neural|premium|enhanced|améliorée|siri/i.test(x.name) ? 8 : 0) + (/google/i.test(x.name) ? 4 : 0) + (/en-GB/i.test(x.lang) ? 2 : 0) + (/Daniel|Serena|Kate|Libby|Sonia|Ryan/i.test(x.name) ? 1 : 0);
    VOICE = v.sort((a, b) => score(b) - score(a))[0] || null;
  } catch (e) {}
};
try { pickVoice(); speechSynthesis.onvoiceschanged = pickVoice; } catch (e) {}

function ttsUrl(t, v = voiceId()) {
  const k = v + "|" + t;
  if (!AUDIO_CACHE.has(k)) {
    const p = fetch(`${API}/tts?v=${v}&t=${encodeURIComponent(t)}`, { headers: { Authorization: "Bearer " + (AUTH && AUTH.token) } })
      .then(r => { if (!r.ok) throw new Error(r.status); return r.blob(); }).then(b => URL.createObjectURL(b));
    p.catch(() => AUDIO_CACHE.delete(k));
    AUDIO_CACHE.set(k, p);
  }
  return AUDIO_CACHE.get(k);
}
const natural = () => voiceId() !== "device" && AUTH && navigator.onLine !== false;
function stopAudio() { SPEAK_TOKEN++; if (CUR_AUDIO) { try { CUR_AUDIO.pause(); } catch (e) {} CUR_AUDIO = null; } try { speechSynthesis.cancel(); } catch (e) {} }
function playUrl(url, rate, tok) {
  return new Promise(res => {
    if (tok !== SPEAK_TOKEN) return res(false);
    const a = new Audio(url); a.playbackRate = Math.max(.5, Math.min(1.2, rate / .92)); CUR_AUDIO = a;
    a.onended = () => res(true); a.onerror = () => res(false);
    a.play().catch(() => res(false));
  });
}
speak = function (t, rate = .92) {
  if (!t) return;
  if (!natural()) return deviceSpeak(t, rate);
  stopAudio(); const tok = SPEAK_TOKEN;
  let done = false;
  const slow = setTimeout(() => { if (!done && tok === SPEAK_TOKEN) { done = true; deviceSpeak(t, rate); } }, 5000);
  ttsUrl(String(t)).then(url => { if (done || tok !== SPEAK_TOKEN) return; done = true; clearTimeout(slow); return playUrl(url, rate, tok).then(ok => { if (!ok && tok === SPEAK_TOKEN) deviceSpeak(t, rate); }); })
    .catch(() => { if (!done && tok === SPEAK_TOKEN) { done = true; clearTimeout(slow); deviceSpeak(t, rate); } });
};
speakAll = async function (lines) {
  if (!natural()) { try { speechSynthesis.cancel(); lines.forEach(t => { const u = new SpeechSynthesisUtterance(t); u.lang = "en-GB"; if (VOICE) u.voice = VOICE; u.rate = .92; speechSynthesis.speak(u); }); } catch (e) {} return; }
  stopAudio(); const tok = SPEAK_TOKEN;
  lines.forEach(t => ttsUrl(t).catch(() => {}));
  for (const t of lines) { if (tok !== SPEAK_TOKEN) return; let url; try { url = await ttsUrl(t); } catch (e) { return deviceSpeak(t); } if (!(await playUrl(url, .92, tok))) return; }
};
// préchargement discret (3 requêtes à la fois) pour que le son parte tout de suite
function prefetchVoices(texts) {
  if (!natural()) return;
  const q = [...new Set(texts.filter(Boolean).map(String))].filter(t => !AUDIO_CACHE.has(voiceId() + "|" + t)).slice(0, 40);
  let i = 0; const next = () => { if (i >= q.length) return; ttsUrl(q[i++]).catch(() => {}).finally(next); };
  next(); next(); next();
}
// l'arrêt du son au changement d'écran
const _goVoice = go;
go = function (...a) { stopAudio(); return _goVoice(...a); };
// préchargement : leçon (mots + phrases) et exercice en cours
const _lesson = SCREENS.lesson;
SCREENS.lesson = function (id) { _lesson(id); const l = ALL.find(x => x.id === id); if (l) prefetchVoices([...l.words.map(w => w.en), ...l.sentences.map(s => s.en)]); };
const _play = play;
play = function (e, ...rest) { if (e && natural()) prefetchVoices([e.say || (e.type === "listen" || e.type === "dictation" ? e.a : null)]); return _play(e, ...rest); };

// réglage dans l'onglet Progrès
function voiceCard() {
  return `<div class="card"><div class="row">${icon("speaker", 20)}<h3>Voix</h3></div><p class="muted small" style="margin-top:6px">Les voix naturelles sont générées en ligne et gardées en mémoire. Hors connexion, la voix de l'appareil prend le relais.</p>
    ${VOICES.map(([id, n, d]) => `<button class="vchoice ${voiceId() === id ? "on" : ""}" data-voice="${id}"><span class="tx"><b>${n}</b><small>${d}</small></span><span class="iconbtn plain sm" data-try="${id}">${icon("play", 16)}</span></button>`).join("")}</div>`;
}
function bindVoiceCard() {
  $$("[data-voice]").forEach(b => b.onclick = ev => { S.voice = b.dataset.voice; save(); $$("[data-voice]").forEach(x => x.classList.toggle("on", x === b)); if (!ev.target.closest("[data-try]")) speak("Hello! This is how I sound. Let's practise English together."); });
  $$("[data-try]").forEach(b => b.onclick = ev => { ev.stopPropagation(); const prev = S.voice; S.voice = b.dataset.try; speak("Hello! This is how I sound. Let's practise English together."); S.voice = prev; });
}
const _stats = SCREENS.stats;
SCREENS.stats = function () { _stats(); const anchor = [...app.querySelectorAll(".card")].find(c => c.querySelector("#goal")); if (anchor) { anchor.insertAdjacentHTML("beforebegin", voiceCard()); bindVoiceCard(); } };

go(S.level ? "home" : "welcome");
