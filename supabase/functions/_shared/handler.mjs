/* ─────────────────────────────────────────────────────────────────────────
   Edge Function'lar: HTTP qatlami va yo'llar

     test-start   {}               → sertifikatli testni boshlaydi yoki davom
                  { resume: true } → faqat davom (yangisini ochmaydi)
     test-answer  { session, answer, calibrate? }
     submit-test  { client_id, journal, calibrate? }   (qurilmadagi test)
     submit-game  { client_id, game, seed, level, log } (o'yin)

   Javob: { ok: true, ... } yoki { ok: false, error, message } va HTTP
   holati (400 invalid, 401 auth, 403 anonymous, 404 not_found/none,
   409 conflict/duplicate/engine, 410 closed, 422 too_fast/rejected/
   incomplete, 429 limit, 500 server/config).

   deps: { IQ, env(name), fetch, now(), db? } — Deno'da serve.mjs beradi,
   Node testida esa taqlid (supabase/tests/functions.test.mjs).
   ───────────────────────────────────────────────────────────────────── */

import { authenticate } from './auth.mjs';
import { restDb } from './db.mjs';
import {
  CERT_LENGTH, certEligible, dbResult, fail, finishRemaining, isUuid, points,
  publicItem, publicResult, replaySession, reviewItem, toResponses, verifyClientTest, verifyGame,
} from './core.mjs';

const MAX_BODY = 512 * 1024;    // o'yin jurnali uchun yetarli, hajm hujumi uchun kam

/* CORS — bu xavfsizlik emas (tekshiruv serverda), faqat brauzer ruxsati.
   Standart: ilova (Capacitor) va sayt. ALLOWED_ORIGINS — vergul bilan. */
const DEFAULT_ORIGINS = ['https://localhost', 'capacitor://localhost', 'http://localhost',
                         'https://iquest.uz', 'https://www.iquest.uz'];

function corsHeaders(req, deps) {
  const allowed = (deps.env('ALLOWED_ORIGINS') || '').split(',').map(s => s.trim()).filter(Boolean);
  const list = allowed.length ? allowed : DEFAULT_ORIGINS;
  const origin = req.headers.get('origin');
  const h = {
    'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
  if (origin && list.indexOf(origin) !== -1) h['Access-Control-Allow-Origin'] = origin;
  return h;
}

function json(status, body, extra) {
  return new Response(JSON.stringify(body), {
    status,
    headers: Object.assign({ 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
                           extra || {}),
  });
}

async function readJson(req) {
  const text = await req.text();
  if (text.length > MAX_BODY) throw fail('invalid', 'so\'rov juda katta', 413);
  if (!text) return {};
  try {
    const v = JSON.parse(text);
    if (!v || typeof v !== 'object' || Array.isArray(v)) throw new Error('obyekt emas');
    return v;
  } catch (e) {
    throw fail('invalid', 'JSON noto\'g\'ri');
  }
}


/* ── Sertifikatli test ─────────────────────────────────────────────────── */

async function finalize(ctx, row, rp, state, calibrate) {
  const { IQ, db, user } = ctx;
  const result = state === 'expired' ? finishRemaining(rp.s, rp.items) : rp.s.result();
  const eligible = state === 'done' && certEligible(IQ, row, result);
  const fin = await db.rpc('test_session_finish', {
    p_session: row.id, p_user: user.id, p_state: state,
    p_result: dbResult(result), p_eligible: eligible,
    p_points: points(result, 'server-test'),
    p_responses: calibrate === true ? toResponses(result.items) : null,
  });
  const log = result.items;
  return {
    finished: true,
    state,
    result: publicResult(result),
    points: fin ? fin.points : 0,
    certificate: (fin && fin.certificate) || null,
    // Endi (yakundan keyin) javob va izoh berilishi mumkin.
    review: rp.items.map((it, i) => reviewItem(it, log[i] && { answer: log[i].answer, ms: log[i].ms })),
  };
}

/* Ochiq sessiyani yuklab, dvigatelda qayta o'ynaydi. Server dvigateli
   yangilanib sessiya endi qayta o'ynalmasa — bekor (void) qilinadi. */
async function loadOpen(ctx, create) {
  const { IQ, db, user } = ctx;
  const open = () => db.rpc('test_session_open', {
    p_user: user.id, p_engine: String(IQ.session.ENGINE), p_types: IQ.types(),
    p_length: CERT_LENGTH, p_create: create,
  });
  let row = await open();
  if (!row) return null;
  try {
    return { row, rp: replaySession(IQ, row) };
  } catch (e) {
    if (e.code !== 'engine') throw e;
    await db.rpc('test_session_void', { p_session: row.id, p_user: user.id });
    if (!create) return null;
    row = await open();
    return row ? { row, rp: replaySession(IQ, row) } : null;
  }
}

const expired = row => Date.parse(row.deadline) <= Date.parse(row.now);

function question(row, rp) {
  return {
    session: row.id,
    index: rp.items.length,
    length: row.length,
    deadline: row.deadline,
    item: publicItem(rp.s.current()),
  };
}

async function testStart(ctx, body) {
  const resume = body.resume === true;
  const got = await loadOpen(ctx, !resume);
  if (!got) throw fail('none', 'ochiq sertifikatli test yo\'q', 404);
  const { row, rp } = got;
  if (expired(row)) return finalize(ctx, row, rp, 'expired', false);
  if (rp.s.done) return finalize(ctx, row, rp, 'done', false);   // javoblar bor, yakun yozilmay qolgan
  return Object.assign({ resumed: !row.created }, question(row, rp));
}

async function testAnswer(ctx, body) {
  const { IQ, db, user } = ctx;
  if (!isUuid(body.session)) throw fail('invalid', 'session');
  if (!Number.isInteger(body.answer)) throw fail('invalid', 'answer');
  const got = await loadOpen(ctx, false);
  // Boshqaning yoki yopilgan sessiyasi — farqi oshkor qilinmaydi.
  if (!got || got.row.id !== body.session.toLowerCase()) throw fail('closed', 'sessiya ochiq emas', 410);
  const { row, rp } = got;
  if (expired(row)) return finalize(ctx, row, rp, 'expired', body.calibrate);
  if (rp.s.done) return finalize(ctx, row, rp, 'done', body.calibrate);

  const cur = rp.s.current();
  if (body.answer < -1 || body.answer >= cur.options.length) throw fail('invalid', 'answer chegarasi');
  const index = rp.items.length;
  let ans;
  try {
    ans = await db.rpc('test_session_answer', {
      p_session: row.id, p_user: user.id, p_index: index, p_item_id: cur.id,
      p_answer: body.answer, p_min_ms: IQ.session.MIN_MS,
    });
  } catch (e) {
    // So'rov yo'lda turganda muddat tugadi — yakunlaymiz.
    if (e.code === 'closed') {
      const again = await loadOpen(ctx, false);
      if (again && again.row.id === row.id) return finalize(ctx, again.row, again.rp, 'expired', body.calibrate);
    }
    throw e;
  }
  rp.items.push(cur);
  rp.s.answer(body.answer, ans.ms);
  if (rp.s.done) return finalize(ctx, row, rp, 'done', body.calibrate);
  return question(row, rp);
}


/* ── Qurilmadagi test va o'yin ─────────────────────────────────────────── */

async function submitTest(ctx, body) {
  if (!isUuid(body.client_id)) throw fail('invalid', 'client_id');
  const v = verifyClientTest(ctx.IQ, body);
  const rec = await ctx.db.rpc('record_test_result', {
    p_user: ctx.user.id, p_client_id: body.client_id.toLowerCase(), p_engine: v.engine,
    p_seed: v.seed, p_mode: v.mode, p_result: dbResult(v.result), p_suspicious: v.suspicious,
    p_points: v.points, p_responses: v.responses,
  });
  return { id: rec.id, points: rec.points, duplicate: !!rec.duplicate, suspicious: v.suspicious,
           result: publicResult(v.result) };
}

async function submitGame(ctx, body) {
  if (!isUuid(body.client_id)) throw fail('invalid', 'client_id');
  const v = verifyGame(ctx.IQ, body);
  const rec = await ctx.db.rpc('record_game_result', {
    p_user: ctx.user.id, p_client_id: body.client_id.toLowerCase(), p_engine: String(ctx.IQ.session.ENGINE),
    p_game: v.game, p_level: v.level, p_seed: v.seed, p_result: v.result, p_suspicious: v.suspicious,
  });
  return { id: rec.id, points: rec.points, duplicate: !!rec.duplicate, suspicious: v.suspicious,
           result: v.result };
}

const ROUTES = {
  'test-start': testStart,
  'test-answer': testAnswer,
  'submit-test': submitTest,
  'submit-game': submitGame,
};


export async function handle(route, req, deps) {
  const cors = corsHeaders(req, deps);
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (req.method !== 'POST') return json(405, { ok: false, error: 'method' }, cors);
  const fn = ROUTES[route];
  if (!fn) return json(404, { ok: false, error: 'route' }, cors);
  try {
    const user = await authenticate(req, deps);
    if (!user) return json(401, { ok: false, error: 'auth', message: 'tizimga kirish kerak' }, cors);
    if (user.anonymous) {
      return json(403, { ok: false, error: 'anonymous', message: 'anonim hisob bilan bo\'lmaydi' }, cors);
    }
    const body = await readJson(req);
    const db = deps.db || restDb(deps);
    const out = await fn({ IQ: deps.IQ, db, user, now: deps.now }, body);
    return json(200, Object.assign({ ok: true }, out), cors);
  } catch (e) {
    const status = e.status || 500;
    const payload = { ok: false, error: e.code || 'server' };
    // 5xx da ichki xabar tashqariga chiqmaydi (sxema, ulanish tafsiloti).
    if (status < 500) payload.message = e.message;
    else try { console.error('[' + route + ']', e && e.message); } catch (e2) {}
    return json(status, payload, cors);
  }
}
