// Statistiques du panel admin (calculées à la demande à partir de la base)
const DAY = 864e5;
const dayKey = t => new Date(t).toISOString().slice(0, 10);
const LEVELS = ["A0", "A1", "A2", "B1", "B2", "C1", "C2"];

function lastDays(n) { const out = []; for (let i = n - 1; i >= 0; i--) out.push(dayKey(Date.now() - i * DAY)); return out; }
const inc = (o, k, n = 1) => { o[k] = (o[k] || 0) + n; };
const top = (o, n = 10) => Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, n);

export async function adminStats(env) {
  const now = Date.now();
  const users = (await env.DB.prepare("SELECT id, name, created, updated, data, version FROM users").all()).results || [];
  const sessions = (await env.DB.prepare("SELECT user_id, created, last_seen FROM sessions").all()).results || [];
  const tts = (await env.DB.prepare("SELECT day, n FROM tts_usage ORDER BY day").all()).results || [];
  const act = (await env.DB.prepare("SELECT day, COUNT(*) AS n FROM activity WHERE day >= ? GROUP BY day").bind(dayKey(now - 30 * DAY)).all()).results || [];

  const lastSeen = {}; sessions.forEach(s => { lastSeen[s.user_id] = Math.max(lastSeen[s.user_id] || 0, s.last_seen); });
  const days30 = lastDays(30);
  const signups = Object.fromEntries(days30.map(d => [d, 0])), logins = Object.fromEntries(days30.map(d => [d, 0]));
  users.forEach(u => { const d = dayKey(u.created); if (d in signups) signups[d]++; });
  sessions.forEach(s => { const d = dayKey(s.created); if (d in logins) logins[d]++; });
  const dau = Object.fromEntries(days30.map(d => [d, 0])); act.forEach(a => { if (a.day in dau) dau[a.day] = a.n; });
  const activeIn = ms => users.filter(u => Math.max(lastSeen[u.id] || 0, u.updated) > now - ms).length;

  const A = {
    levels: Object.fromEntries(LEVELS.map(l => [l, 0])), goals: { "Anglais général": 0, "DCG": 0, "DSCG": 0 }, voices: {},
    xp: 0, lessons: 0, answersOk: 0, answersKo: 0, lessonCount: {}, errCats: {}, errTodo: 0, errFixed: 0,
    srs: 0, mastered: 0, certs: Object.fromEntries(LEVELS.map(l => [l, 0])), prac: {}, writings: 0, wScores: [],
    streaks: { "0": 0, "1-2": 0, "3-6": 0, "7-29": 0, "30+": 0 }, routineUsers: 0, routineItems: {}, routineFullDays: 0, myWords: 0,
    dcgUsers: 0, dscgUsers: 0, dscgOrals: 0, placement: 0, resumes: 0, stars: { 1: 0, 2: 0, 3: 0 }
  };
  const table = [];
  for (const u of users) {
    let S = {}; try { S = JSON.parse(u.data || "{}") || {}; } catch (e) {}
    const done = Object.entries(S.done || {}).filter(([, d]) => d && !d.skipped);
    if (S.level) inc(A.levels, S.level);
    inc(A.goals, S.dcg ? "DCG" : S.dscg ? "DSCG" : "Anglais général");
    inc(A.voices, S.voice || "pandora");
    A.xp += S.xp || 0; A.lessons += done.length;
    done.forEach(([id, d]) => { inc(A.lessonCount, id); if (d.stars) inc(A.stars, d.stars); });
    A.answersOk += (S.answers && S.answers.ok) || 0; A.answersKo += (S.answers && S.answers.ko) || 0;
    Object.values(S.errors || {}).forEach(e => { inc(A.errCats, e.cat || "autre"); e.fixed ? A.errFixed++ : A.errTodo++; });
    const cards = Object.values(S.srs || {}); A.srs += cards.length; A.mastered += cards.filter(c => c.box >= 3).length;
    Object.keys(S.certs || {}).forEach(l => inc(A.certs, l));
    Object.entries(S.prac || {}).forEach(([m, p]) => inc(A.prac, m.replace(/\d+$/, "").replace(/^(dscgV|dscgN|dscgA|dcgV)\w*/, "$1"), p.n || 0));
    Object.values(S.writing || {}).forEach(w => { if (w && w.done) { A.writings++; if (typeof w.score === "number") A.wScores.push(w.score); } });
    const st = S.best || 0; inc(A.streaks, st === 0 ? "0" : st < 3 ? "1-2" : st < 7 ? "3-6" : st < 30 ? "7-29" : "30+");
    if (S.routine && Object.keys(S.routine.log || {}).length) { A.routineUsers++; Object.values(S.routine.log).forEach(l => (l || []).forEach(i => inc(A.routineItems, i))); A.myWords += (S.routine.words || []).length; }
    if (S.dcg || Object.keys(S.dcgP || {}).some(k => S.dcgP[k] && S.dcgP[k].v)) A.dcgUsers++;
    if (S.dscg || Object.keys(S.dscgP || {}).length) A.dscgUsers++;
    Object.values(S.dscgP || {}).forEach(p => { A.dscgOrals += p.oN || 0; });
    if (S.level && S.level !== "A0") A.placement++;
    A.resumes += Object.keys(S.resume || {}).length;
    table.push({ name: u.name, created: u.created, last: Math.max(lastSeen[u.id] || 0, u.updated), level: S.level || "-", xp: S.xp || 0, lessons: done.length, streak: S.streak || 0, best: S.best || 0, goal: S.dcg ? "DCG" : S.dscg ? "DSCG" : "Anglais", errors: Object.values(S.errors || {}).filter(e => !e.fixed).length, syncs: u.version });
  }
  table.sort((a, b) => b.last - a.last);
  const n = users.length || 1;
  return {
    generated: now,
    kpi: { users: users.length, active1: activeIn(DAY), active7: activeIn(7 * DAY), active30: activeIn(30 * DAY), new7: users.filter(u => u.created > now - 7 * DAY).length, logins7: sessions.filter(s => s.created > now - 7 * DAY).length, sessions: sessions.length },
    series: { days: days30, signups: days30.map(d => signups[d]), logins: days30.map(d => logins[d]), dau: days30.map(d => dau[d]), tts: days30.map(d => (tts.find(t => t.day === d) || {}).n || 0) },
    learning: { xpTotal: A.xp, xpAvg: Math.round(A.xp / n), lessonsTotal: A.lessons, lessonsAvg: +(A.lessons / n).toFixed(1), accuracy: A.answersOk + A.answersKo ? Math.round(A.answersOk / (A.answersOk + A.answersKo) * 100) : 0, answers: A.answersOk + A.answersKo, stars: A.stars, topLessons: top(A.lessonCount, 10), srs: A.srs, mastered: A.mastered, placement: A.placement },
    errors: { todo: A.errTodo, fixed: A.errFixed, cats: top(A.errCats, 10) },
    levels: A.levels, goals: A.goals, voices: A.voices, certs: A.certs, streaks: A.streaks,
    practice: { modules: top(A.prac, 12), writings: A.writings, writingAvg: A.wScores.length ? +(A.wScores.reduce((a, b) => a + b, 0) / A.wScores.length).toFixed(1) : null, resumes: A.resumes },
    routine: { users: A.routineUsers, items: top(A.routineItems, 10), myWords: A.myWords },
    exams: { dcgUsers: A.dcgUsers, dscgUsers: A.dscgUsers, dscgOrals: A.dscgOrals },
    tts: { total: tts.reduce((a, t) => a + t.n, 0), today: (tts.find(t => t.day === dayKey(now)) || {}).n || 0 },
    users: table.slice(0, 300)
  };
}
