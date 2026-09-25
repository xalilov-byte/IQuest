/* ─────────────────────────────────────────────────────────────────────────
   Edge Function'lar mantig'i — SOF funksiyalar (Deno ham, Node ham)

   Bu faylda tarmoq ham, baza ham yo'q: kirish — dvigatel (IQ) va so'rov
   tanasi, chiqish — tekshirilgan natija. Shuning uchun u Node testida
   (supabase/tests/functions.test.mjs) aynan serverdagidek sinaladi,
   Deno qobig'i (serve.mjs) esa yupqa.

   ASOSIY QOIDA: mijozdan kelgan hech bir raqamga ishonilmaydi. Ball,
   to'g'ri javoblar soni, IQ — hammasi dvigatelda qayta hisoblanadi.
   ───────────────────────────────────────────────────────────────────── */

export const CERT_LENGTH = 30;          // sertifikatli test uzunligi (CONTRACT §10: ≥ 30)
const U32 = 4294967296;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const GAME_RE = /^[a-z][a-z0-9-]{1,31}$/;

/* Kodli xato: handler uni HTTP holatiga aylantiradi. */
export function fail(code, message, status) {
  const e = new Error(message);
  e.code = code;
  e.status = status || 400;
  return e;
}

export const isUuid = s => typeof s === 'string' && UUID_RE.test(s);
const isInt = (x, a, b) => Number.isInteger(x) && x >= a && x <= b;


/* ── Savolni mijozga berish ──────────────────────────────────────────────
   FAQAT ko'rsatish uchun kerakli maydonlar. Yo'qlari — ataylab:
     · correct, explain — javobning o'zi;
     · id — `tur:daraja:URUG'`: urug' bilan ilovadagi generator savolni
       qayta yaratadi va correct ni o'zi hisoblaydi. id berilsa, javobni
       berish bilan barobar;
     · b — kerak emas (qiyinlik darajasi level da bor).
   Chuqur nusxa: dvigatel obyektiga havola tashqariga chiqmasin. */
export function publicItem(it) {
  const out = {
    type: it.type,
    level: it.level,
    prompt: it.prompt,
    stimulus: it.stimulus,
    options: it.options,
  };
  if (it.timeLimit !== undefined) out.timeLimit = it.timeLimit;
  return JSON.parse(JSON.stringify(out));
}

/* Yakundan keyin ko'rib chiqish: endi javob va izoh berilishi mumkin. */
export function reviewItem(it, entry) {
  return JSON.parse(JSON.stringify({
    type: it.type, level: it.level, prompt: it.prompt, stimulus: it.stimulus, options: it.options,
    correct: it.correct, explain: it.explain,
    answer: entry ? entry.answer : -1,
    ms: entry ? entry.ms : 0,
  }));
}

/* Natijaning mijozga ko'rsatiladigan qismi (savollar ro'yxatisiz). */
export function publicResult(r) {
  return {
    mode: r.mode, n: r.n, correct: r.correct, durationMs: r.durationMs,
    theta: r.theta, se: r.se, iq: r.iq, lo: r.lo, hi: r.hi,
    floor: !!r.floor, ceiling: !!r.ceiling, reliable: r.reliable,
    byType: r.byType,
  };
}

/* Bazaga yoziladigan qism (0006: record_result p_result). */
export function dbResult(r) {
  return {
    n: r.n, correct: r.correct, iq: r.iq, lo: r.lo, hi: r.hi, theta: r.theta, se: r.se,
    reliable: r.reliable, byType: r.byType, durationMs: r.durationMs,
  };
}

/* Anonim kalibrlash javoblari (faqat rozilik bilan). */
export function toResponses(items) {
  return items.map(i => ({
    item_id: i.id, type: i.type, level: i.level, b: i.b, k: i.k,
    correct: !!i.correct, ms: Math.min(Math.max(Math.round(i.ms || 0), 0), 600000),
  }));
}

/* Liga ballari. Serverda o'tgan test ko'proq beradi — uni soxtalab
   bo'lmaydi; qurilmadagi test/mashq kamroq — u past garovli, qabul
   qilingan xavf (CONTRACT §10). Hammasi ≤ 1000 (bazadagi CHECK). */
export function points(result, kind) {
  const c = result.correct || 0;
  if (kind === 'server-test') return Math.min(5 * c + (result.reliable ? 50 : 0), 1000);
  if (result.mode === 'test') return Math.min(3 * c + (result.reliable ? 20 : 0), 1000);
  return Math.min(2 * c, 1000);
}


/* ── Serverdagi sessiyani qayta o'ynash ─────────────────────────────────
   Bazada faqat urug' va jurnal ({id, answer, ms}) saqlanadi; savollar har
   so'rovda dvigateldan qayta tug'iladi. Har qadamda id solishtiriladi:
   server kodi yangilanib boshqa savol chiqsa — jimgina boshqa savolga
   baho qo'yilmaydi, sessiya "engine" xatosi bilan bekor qilinadi. */
export function replaySession(IQ, row) {
  const seed = Number(row.seed);
  if (!Number.isInteger(seed) || seed < 0 || seed >= U32) throw fail('engine', 'urug\' buzuq', 500);
  const s = IQ.session.create({ mode: 'test', types: row.types, length: row.length, seed });
  if (s.types.join('\u0000') !== row.types.join('\u0000')) {
    throw fail('engine', 'server dvigatelida sessiya turlari yo\'q', 410);
  }
  const items = [];
  (row.log || []).forEach((e, n) => {
    const cur = s.current();
    if (!cur || cur.id !== e.id) throw fail('engine', n + '-savol dvigatelga mos emas', 410);
    items.push(cur);
    s.answer(Number.isInteger(e.answer) ? e.answer : -1, Number(e.ms) || 0);
  });
  return { s, items };
}

/* Muddat tugagan: qolgan savollar javobsiz (xato) hisoblanadi. */
export function finishRemaining(s, items) {
  while (!s.done) {
    items.push(s.current());
    s.answer(-1, 0);
  }
  return s.result();
}

const sameSet = (a, b) => a.length === b.length && a.slice().sort().join('\u0000') === b.slice().sort().join('\u0000');

/* Sertifikat shartlari (CONTRACT §10): rasmiy test, ≥ 30 savol, turlar —
   to'liq IQ.types(), ishonchli. Qolganini baza ham tekshiradi. */
export function certEligible(IQ, row, result) {
  return row.length >= CERT_LENGTH && result.n >= CERT_LENGTH &&
    sameSet(row.types, IQ.types()) && result.reliable === true;
}


/* ── Qurilmadagi test jurnali (submit-test) ──────────────────────────────
   IQ.session.verify jurnalni QAYTA O'YNAYDI: id'lar tartibi, javob
   chegarasi, har javob ≥ MIN_MS; ball qayta hisoblanadi. Faqat TO'LIQ
   test yoziladi (yarmida tashlangan test tarixga ham, ligaga ham kirmaydi).
   Bu yo'l SERTIFIKAT BERMAYDI — qurilmada to'g'ri javob xotirada turadi. */
export function verifyClientTest(IQ, body) {
  const j = body && body.journal;
  if (!j || typeof j !== 'object') throw fail('invalid', 'journal kerak');
  if (!Array.isArray(j.items) || j.items.length !== j.length) {
    throw fail('incomplete', 'faqat to\'liq yakunlangan test yuboriladi', 422);
  }
  let result;
  try {
    result = IQ.session.verify(j);
  } catch (e) {
    throw fail(e.code === 'engine' || e.code === 'version' ? 'engine' : 'rejected',
               'jurnal tekshiruvdan o\'tmadi: ' + e.message, e.code === 'engine' ? 409 : 422);
  }
  /* Shubhali: javoblarning yarmidan ko'pi 1 soniyadan tez. verify har
     javobni ≥ 300 ms talab qiladi; bu esa "hammasi chegaraga yopishgan"
     skriptni ushlaydi. Natija tarixda qoladi, ball bermaydi. */
  const fast = result.items.filter(i => i.ms < 1000).length;
  const suspicious = fast * 2 > result.items.length;
  return {
    engine: String(j.engine), seed: j.seed, mode: result.mode,
    result, suspicious,
    points: suspicious ? 0 : points(result, 'client'),
    responses: body.calibrate === true ? toResponses(result.items) : null,
  };
}


/* ── O'yin (submit-game) ─────────────────────────────────────────────────
   IQ.games.replay jurnalni qayta o'ynaydi va result() ni beradi — mijoz
   yuborgan ball e'tiborga olinmaydi. */
export function verifyGame(IQ, body) {
  const b = body || {};
  if (typeof b.game !== 'string' || !GAME_RE.test(b.game) || b.game === 'demo' || !IQ.games.get(b.game)) {
    throw fail('invalid', 'noma\'lum o\'yin');
  }
  if (!isInt(b.seed, 0, U32 - 1)) throw fail('invalid', 'seed');
  if (!isInt(b.level, 1, 10)) throw fail('invalid', 'level');
  const log = b.log;
  if (!Array.isArray(log) || log.length < 1 || log.length > 20000) throw fail('invalid', 'log');
  let prev = -Infinity, fastTaps = 0, lastTap = null;
  for (const ev of log) {
    if (!ev || typeof ev !== 'object' || typeof ev.t !== 'number' || !isFinite(ev.t) ||
        ['tap', 'press', 'tick'].indexOf(ev.k) === -1) {
      throw fail('invalid', 'log hodisasi');
    }
    if (ev.t < prev) throw fail('invalid', 'log vaqti orqaga ketdi');
    prev = ev.t;
    if (ev.k !== 'tick') {
      if (lastTap !== null && ev.t - lastTap < 80) fastTaps++;
      lastTap = ev.t;
    }
  }
  if (log[log.length - 1].t - log[0].t > 3600000) throw fail('invalid', 'o\'yin 1 soatdan uzun');

  let game;
  try {
    game = IQ.games.replay(b.game, b.seed, b.level, log);
  } catch (e) {
    throw fail('rejected', 'o\'yin jurnali qayta o\'ynalmadi: ' + e.message, 422);
  }
  if (!game.done) throw fail('incomplete', 'o\'yin tugamagan', 422);
  const r = game.result();
  const ok = r && Number.isInteger(r.score) && Math.abs(r.score) <= 1000000 &&
    isInt(r.points, 0, 1000) && isInt(r.total, 0, 10000) && isInt(r.correct, 0, r.total) &&
    typeof r.durationMs === 'number' && r.durationMs >= 0;
  if (!ok) throw fail('rejected', 'o\'yin natijasi shakli noto\'g\'ri', 422);
  /* Avtokliker: 80 ms dan tez ketma-ket bosishlar ko'p bo'lsa. O'yinning
     o'zi ham imkonsiz tezlikka ball bermaydi (CONTRACT §9) — bu ikkinchi
     qatlam. */
  const suspicious = fastTaps > 10;
  return {
    game: b.game, seed: b.seed, level: b.level, suspicious,
    result: { score: r.score, points: suspicious ? 0 : r.points, correct: r.correct,
              total: r.total, durationMs: Math.round(r.durationMs) },
  };
}
