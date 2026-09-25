/* ─────────────────────────────────────────────────────────────────────────
   IQ.session — test va mashq oqimi (adaptiv)

   Shartnoma: src/iq/CONTRACT.md §3 (sessiya), §10 (server tekshiruvi).

   ASOSIY TALAB — QAYTA O'YNASH (replay). Sessiyadagi har narsa faqat
   (seed, mode, types, length, startLevels) va javoblar jurnalidan
   chiqadi:
     · savol turi i-o'rinda  — seed dan aralashtirilgan tartib;
     · savol darajasi       — oldingi javoblardan (test: θ bahosi,
                               mashq: zinapoya);
     · savol urug'i         — IQ.hash('item:' + seed + ':' + i + ':' + urinish).
   Date.now() va Math.random() natijaga ta'sir qilmaydi (Date.now faqat
   seed berilmaganda standart urug' uchun). Shuning uchun
   IQ.session.restore(snapshot) jurnalni qayta o'ynab AYNAN shu savollarni
   chiqaradi — server (§10) shu bilan mijoz oson savollarni tanlab
   olmaganini tekshiradi: id'lar mos kelmasa — xato.

   TURLAR TARTIBI. Bloklarga bo'lingan: har blokda har tur bir marta,
   blok ichidagi tartib seed'dan aralashtiriladi (IQ.rng.shuffle). Blok
   chegarasida bir tur ketma-ket ikki marta tushmasligi uchun kerak
   bo'lsa birinchi ikkitasi almashtiriladi. Natija: 30 savolda 4 tur →
   har biriga 7 yoki 8 ta, hech qachon bitta turga og'ib ketmaydi.

   DARAJA.
     · test: i-savol darajasi = IQ.score.nextLevel(θ̂ᵢ, rngᵢ), θ̂ᵢ —
       oldingi i ta javobdan EAP. Birinchi savol θ = 0 dan (prior).
       θ̂ 4 xonagacha yaxlitlanadi: ikki xil JS dvigatelidagi oxirgi
       bitdagi farq darajani o'zgartirib, halol natijani "mos kelmadi"
       deb rad etmasligi uchun. rngᵢ — har o'rin uchun alohida urug'
       (IQ.hash('level:' + seed + ':' + i)), qayta urinishlar sonidan
       mustaqil.
     · mashq: har tur uchun alohida ZINAPOYA (2-pastga-1-yuqoriga):
       shu turda ketma-ket 2 ta to'g'ri → daraja +1, xato → daraja −1,
       1..10 oralig'ida. Bu ~71% to'g'ri javobga yaqinlashadi — mashqda
       odam ko'proq muvaffaqiyat ko'rishi kerak, lekin zerikmasligi ham.
       Boshlanish: opts.startLevel (son yoki { tur: daraja }), bo'lmasa
       nzProgress.levelFor(tur), u ham bo'lmasa 3. Tanlangan daraja
       snapshot'ga yoziladi — tiklashda qayta so'ralmaydi.

   BUZUQ SAVOL. IQ.makeItem otsa, keyingi urinish urug'i bilan
   (urinish + 1) qayta — ham deterministik, server ham aynan shu
   urinishlarni takrorlaydi. MAX_TRIES tadan keyin xato otiladi.
   ───────────────────────────────────────────────────────────────────── */
(function (root) {
  const IQ = root.IQ = root.IQ || {};

  /* Sessiya algoritmi versiyasi. Tartib, urug' yoki daraja qoidasi
     o'zgarsa oshiriladi — eski jurnallar boshqa savol beradi (§10). */
  const ENGINE = 1;
  const MAX_TRIES = 20;
  const LENGTH_MAX = 200;
  const LEVEL_DEFAULT = 3;

  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const clampLevel = (v, d) => (typeof v === 'number' && isFinite(v)
    ? clamp(Math.round(v), IQ.LEVEL_MIN || 1, IQ.LEVEL_MAX || 10) : d);
  const q4 = x => Math.round(x * 1e4) / 1e4;

  const itemSeed = (seed, i, a) => IQ.hash('item:' + seed + ':' + i + ':' + a);
  const levelRng = (seed, i) => IQ.rng(IQ.hash('level:' + seed + ':' + i));

  function fail(msg, extra) {
    const e = new Error('[IQ] ' + msg);
    if (extra) Object.keys(extra).forEach(k => { e[k] = extra[k]; });
    return e;
  }

  /* Turlarning bloklangan, aralashtirilgan tartibi (yuqoridagi izoh). */
  function typeOrder(seed, types, length) {
    const out = [];
    for (let blk = 0; out.length < length; blk++) {
      const p = IQ.rng(IQ.hash('types:' + seed + ':' + blk)).shuffle(types);
      if (out.length && p.length > 1 && p[0] === out[out.length - 1]) {
        const t = p[0]; p[0] = p[1]; p[1] = t;
      }
      for (let j = 0; j < p.length; j++) out.push(p[j]);
    }
    return out.slice(0, length);
  }

  /* Kirish parametrlarini tekshiradi va kanonik shaklga keltiradi.
     replay = true — snapshot/serverdan: hech narsa taxmin qilinmaydi
     (Date.now, nzProgress so'ralmaydi). */
  function normalize(o, replay) {
    o = o || {};
    const mode = o.mode === 'test' ? 'test' : 'practice';
    if (replay && o.mode !== 'test' && o.mode !== 'practice') throw fail('mode noto\'g\'ri: ' + o.mode);

    let types = Array.isArray(o.types) && o.types.length ? o.types.slice() : IQ.types();
    types = types.filter((t, i) => types.indexOf(t) === i);     // takrorlarsiz, tartib saqlanadi
    if (!types.length) throw fail('savol turi yo\'q');
    types.forEach(t => {
      if (typeof t !== 'string' || !IQ.generator(t)) throw fail('generator yo\'q: ' + t);
    });

    let length = o.length == null ? (mode === 'test' ? 30 : 10) : o.length;
    if (!Number.isInteger(length) || length < 1 || length > LENGTH_MAX) {
      throw fail('length 1..' + LENGTH_MAX + ' butun son emas: ' + length);
    }

    let seed;
    if (typeof o.seed === 'number' && isFinite(o.seed)) {
      if (replay && !(Number.isInteger(o.seed) && o.seed >= 0 && o.seed <= 0xffffffff)) {
        throw fail('seed uint32 emas: ' + o.seed);
      }
      seed = o.seed >>> 0;
    } else {
      if (replay) throw fail('seed yo\'q');
      seed = Date.now() >>> 0;
    }

    /* Mashq zinapoyasining boshlang'ich darajalari (testda kerak emas). */
    let startLevels = null;
    if (mode === 'practice') {
      startLevels = {};
      const sl = replay ? o.startLevels : o.startLevel;
      types.forEach(t => {
        let v = typeof sl === 'number' ? sl
              : (sl && typeof sl === 'object' && Object.prototype.hasOwnProperty.call(sl, t) ? sl[t] : undefined);
        if (v == null && !replay && root.nzProgress && typeof root.nzProgress.levelFor === 'function') {
          try { v = root.nzProgress.levelFor(t); } catch (e) { v = undefined; }
        }
        startLevels[t] = clampLevel(v, LEVEL_DEFAULT);
      });
    }
    return { mode, types, length, seed, startLevels };
  }

  /* Javob indeksi: butun 0..k−1, yoki −1 / null / undefined — "javob
     berilmadi" (vaqt tugadi), xato deb hisoblanadi. Boshqa har narsa
     (7 ta variantli savolga 9, "2", 1.5) — xato otiladi: jurnalga
     ma'nosiz qiymat tushmasligi kerak. */
  function normAnswer(i, k) {
    if (i === null || i === undefined || i === -1) return -1;
    if (Number.isInteger(i) && i >= 0 && i < k) return i;
    throw fail('javob indeksi noto\'g\'ri: ' + i);
  }
  const normMs = ms => (typeof ms === 'number' && isFinite(ms) && ms > 0 ? Math.round(ms) : 0);

  /* Sessiya yadrosi. log — qayta o'ynaladigan jurnal ([{id, answer, ms}]). */
  function build(cfg, replayLog) {
    const { mode, types, length, seed, startLevels } = cfg;
    const order = typeOrder(seed, types, length);
    const log = [];                       // to'liq yozuvlar: {id,type,level,b,k,answer,correct,ms}
    const stair = {};                     // mashq: { tur: { level, streak } }
    if (startLevels) types.forEach(t => { stair[t] = { level: startLevels[t], streak: 0 }; });
    let cur = null;

    function levelAt(i) {
      if (mode === 'practice') return stair[order[i]].level;
      const theta = log.length ? IQ.score.estimate(log).theta : 0;
      return IQ.score.nextLevel(q4(theta), levelRng(seed, i));
    }

    function gen(i) {
      const type = order[i], level = levelAt(i);
      let last = null;
      for (let a = 0; a < MAX_TRIES; a++) {
        try { return IQ.makeItem(type, itemSeed(seed, i, a), level); }
        catch (e) { last = e; }
      }
      throw fail(type + ': ' + MAX_TRIES + ' urinishda ham to\'g\'ri savol chiqmadi — '
        + (last && last.message), { code: 'IQ_GEN_FAILED', index: i });
    }

    function advance() { cur = log.length < length ? gen(log.length) : null; }

    function apply(i, ms) {
      const it = cur, k = it.options.length;
      const answer = normAnswer(i, k);
      const ok = answer === it.correct;
      log.push({ id: it.id, type: it.type, level: it.level, b: it.b, k,
                 answer, correct: ok, ms: normMs(ms) });
      if (mode === 'practice') {
        const s = stair[it.type];
        if (ok) { if (++s.streak >= 2) { s.level = Math.min(s.level + 1, IQ.LEVEL_MAX || 10); s.streak = 0; } }
        else { s.level = Math.max(s.level - 1, IQ.LEVEL_MIN || 1); s.streak = 0; }
      }
      advance();
      return { correct: ok, correctIndex: it.correct, item: it };
    }

    advance();

    /* Qayta o'ynash: har qadamda qayta yaratilgan savol id'si jurnaldagi
       bilan aynan bir xil bo'lishi SHART. */
    if (replayLog) {
      if (!Array.isArray(replayLog)) throw fail('jurnal massiv emas');
      if (replayLog.length > length) throw fail('jurnal sessiyadan uzun: ' + replayLog.length + ' > ' + length);
      replayLog.forEach((r, i) => {
        if (!r || typeof r !== 'object') throw fail('jurnal yozuvi buzuq: ' + i);
        if (r.id !== cur.id) {
          throw fail('qayta o\'ynashda savol mos kelmadi (' + i + '): kutilgan ' + cur.id + ', jurnalda ' + r.id,
            { code: 'IQ_REPLAY_MISMATCH', index: i, expected: cur.id, got: r.id });
        }
        apply(r.answer, r.ms);
      });
    }

    function result() {
      const est = IQ.score.estimate(log);
      const iv = IQ.score.interval(est.theta, est.se);
      const byType = {};
      let correct = 0, durationMs = 0;
      log.forEach(r => {
        const b = byType[r.type] || (byType[r.type] = { n: 0, correct: 0 });
        b.n++;
        if (r.correct) { b.correct++; correct++; }
        durationMs += r.ms;
      });
      return {
        mode, n: log.length, correct, durationMs,
        theta: est.theta, se: est.se,
        iq: IQ.score.toIQ(est.theta), lo: iv.lo, hi: iv.hi,
        reliable: mode === 'test' && log.length >= 20,
        byType,
        items: log.map(r => Object.assign({}, r)),
        /* Shartnomadan tashqari (qo'shimcha): */
        complete: log.length >= length,
        seed, types: types.slice(), length, engine: ENGINE,
      };
    }

    /* Serverga yuboriladigan shakl (§10). */
    function payload() {
      const p = { engine: ENGINE, seed, mode, types: types.slice(), length,
                  items: log.map(r => ({ id: r.id, answer: r.answer, ms: r.ms })) };
      if (startLevels) p.startLevels = Object.assign({}, startLevels);
      return p;
    }

    return {
      mode, length, seed,
      types: types.slice(),
      get index() { return log.length; },
      get done() { return cur === null; },
      current: () => cur,
      answer(i, ms) {
        if (!cur) throw fail('sessiya tugagan');
        return apply(i, ms);
      },
      result,
      payload,
      snapshot() {
        const p = payload();
        return { v: 1, engine: p.engine, mode, types: p.types, length, seed,
                 startLevels: p.startLevels || null, log: p.items };
      },
    };
  }

  function create(opts) {
    return build(normalize(opts, false), null);
  }

  /* Snapshot'dan (yoki server payload'idan) tiklash. Jurnal qayta
     o'ynaladi; id'lar mos kelmasa xato (e.code = 'IQ_REPLAY_MISMATCH'). */
  function restore(snap) {
    if (!snap || typeof snap !== 'object') throw fail('snapshot yo\'q');
    if (snap.engine != null && snap.engine !== ENGINE) {
      throw fail('boshqa engine versiyasi: ' + snap.engine + ' (joriy ' + ENGINE + ')',
        { code: 'IQ_ENGINE_MISMATCH' });
    }
    const cfg = normalize(snap, true);
    return build(cfg, snap.log || snap.items || []);
  }

  /* §10: server (Edge Function) chaqiradigan tekshiruv — mijozda ham
     aynan shu kod. payload = { seed, mode, types, length, items:
     [{ id, answer, ms }], startLevels? }. Qayta yaratilgan Result
     qaytadi yoki xato otiladi.

     To'liq bo'lmagan sessiya standart holatda RAD ETILADI: aks holda
     mijoz omadli boshlanishdan keyin testni to'xtatib (erta to'xtatish),
     yuqoriroq ball yuborishi mumkin edi. opts.allowPartial — faqat
     tahlil uchun. */
  function verify(payload, opts) {
    if (!payload || typeof payload !== 'object') throw fail('payload yo\'q');
    if (!Array.isArray(payload.items)) throw fail('payload.items massiv emas');
    const s = restore({
      engine: payload.engine, seed: payload.seed, mode: payload.mode, types: payload.types,
      length: payload.length, startLevels: payload.startLevels, log: payload.items,
    });
    if (!s.done && !(opts && opts.allowPartial)) {
      throw fail('sessiya tugallanmagan: ' + s.index + ' / ' + s.length, { code: 'IQ_INCOMPLETE' });
    }
    return s.result();
  }

  IQ.session = { create, restore, verify, ENGINE };
})(typeof window !== 'undefined' ? window : globalThis);
