/* ─────────────────────────────────────────────────────────────────────────
   IQ.session — test va mashq oqimi (adaptiv)

   Shartnoma: src/iq/CONTRACT.md §3 (sessiya), §6.5 (reliable), §10
   (server tekshiruvi).

   ASOSIY TALAB — QAYTA O'YNASH (replay). Sessiyadagi har narsa faqat
   (seed, mode, types, length, startLevels) va javoblar jurnalidan
   chiqadi:
     · savol turi i-o'rinda  — seed dan aralashtirilgan tartib;
     · savol darajasi       — oldingi javoblardan (test: θ bahosi,
                               mashq: zinapoya);
     · savol urug'i         — IQ.hash('item:' + seed + ':' + i + ':' + urinish);
     · qaysi urinish olinadi — shu sessiyada OLDIN chiqqan savollardan
                               (takrorlanmaslik, pastda).
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
       1..10 oralig'ida. Nazariy muvozanat ~71%; amalda (daraja qadami
       katta, turlar aralash, har turga sessiyada 2–3 savol) simulyatsiya
       65–69% to'g'ri javob ko'rsatadi — mashqda odam ko'proq
       muvaffaqiyat ko'rishi kerak, lekin zerikmasligi ham.
       Boshlanish: opts.startLevel (son yoki { tur: daraja }), bo'lmasa
       nzProgress.levelFor(tur), u ham bo'lmasa 3. Tanlangan daraja
       snapshot'ga yoziladi — tiklashda qayta so'ralmaydi.

   BUZUQ SAVOL. IQ.makeItem otsa, keyingi urinish urug'i bilan
   (urinish + 1) qayta — ham deterministik, server ham aynan shu
   urinishlarni takrorlaydi. MAX_TRIES ta xatodan keyin (va olinadigan
   hech bir savol bo'lmasa) xato otiladi (IQ_GEN_FAILED).

   TAKRORLANMASLIK (ENGINE 2). Bir sessiyada bir savol ikki marta
   chiqmasligi kerak: odam uchun bu xato ko'rinadi, EAP uchun esa bir
   dalilni ikki marta sanash (ikkinchi javob — xotira, qobiliyat emas).
   ENGINE 1 da og'zaki savollar hovuzi kichik (darajada 13–15 ta) bo'lgani
   uchun 30 savollik testlarning ~58% ida takror bor edi.
     · Savol kaliti (contentKey): generator `key` bersa (qo'lda yozilgan
       bank — og'zaki) — tur + key. Aks holda tur + IQ.hash(prompt +
       stimulus). Og'zakida stimulga emas, key ga qaraladi: "ortiqchasini
       top" savolining stimuli aralashtirilgan variantlardan yig'iladi,
       ya'ni bir savol turli satr bo'lib chiqadi.
     · Sessiya kalitlar to'plamini (seen) yuritadi. gen(i) urinishlarni
       tartib bilan ko'radi va birinchi YANGI savolni oladi. Ikki alohida
       byudjet: generator xatosi — MAX_TRIES, takror/boshqa qism —
       UNIQUE_TRIES. Byudjet tugasa savol baribir beriladi (sessiya
       hech qachon hovuz tugagani uchun yiqilmaydi va cheksiz aylanmaydi):
       avval ko'rilmagan "boshqa qism" savoli, u ham bo'lmasa birinchi
       takror.
     · seen faqat gen() da to'ldiriladi, restore/verify esa savollarni
       aynan gen() orqali qayta yaratadi — ya'ni to'plam ham, id'lar ham
       aynan bir xil tiklanadi.

   BANK QISMLARI (ENGINE 2). Qo'lda yozilgan bank (key bor savollar)
   ikki teng qismga bo'linadi: IQ.hash('side:' + key) juft — 'test',
   toq — 'practice'. Test o'z qismidan, mashq o'zinikidan oladi. Sabab:
   mashq to'g'ri javob va izohni ko'rsatadi; umumiy hovuzda 30 kunlik
   mashqdan keyin testdagi og'zaki savollarning ~2/3 qismi oldindan
   yodlangan bo'lib, o'rtacha IQ ~5 ballga ko'tarilardi (qobiliyat emas,
   xotira). Qism tugasa — yuqoridagi tartib: boshqa qismdagi yangi savol
   takrordan afzal. Generator savollari (key yo'q) bo'linmaydi.

   ISHONCHLILIK (result().reliable, result().flag). IQ raqami faqat
   quyidagilarning HAMMASI bajarilganda ko'rsatiladi (§6.5), aks holda
   flag sababni aytadi (ilova faqat to'g'ri/jami ko'rsatadi):
     · 'practice' — mashq rejimi (IQ hech qachon chiqarilmaydi);
     · 'short'    — javoblar RELIABLE_MIN (20) tadan kam;
     · 'chance'   — to'g'ri javoblar soni tasodifdan yetarlicha yuqori
                    emas: correct ≤ μ + CHANCE_Z·σ, bu yerda
                    μ = Σ 1/kᵢ, σ² = Σ (1/kᵢ)(1 − 1/kᵢ) (IQ.score.chance),
                    CHANCE_Z = 1.645 (bir tomonlama 95%). 30 ta 4 variantli
                    savolda bu ≤ 11 to'g'ri. Tasodifiy bosuvchining ~95%
                    ini ushlaydi; halol θ = −2 (IQ 70) odamning <1% ini;
     · 'fast'     — javob vaqtining medianasi FAST_MEDIAN_MS (1500 ms) dan
                    kam: savolni o'qimasdan bosish. Faqat vaqti
                    ma'lum (ms > 0) javoblar kamida yarmi bo'lsa tekshiriladi.
   Tartib: practice → short → chance → fast (birinchisi yoziladi).
   reliable === (flag === null) — doim. Qoida result() ichida, ya'ni
   verify() (server, sertifikat §6.7) ham aynan shu qoidani qo'llaydi.

   ORALIQ. lo/hi — 55..145 ga qisilgan butun sonlar; loOpen/hiOpen —
   qisilmagan uchi shkaladan tashqariga chiqdimi (IQ.score.interval).
   Ilova ochiq uchni "≤55" / "145+" ma'nosida ko'rsatadi, "55–55"
   kabi soxta aniqlik yo'q.
   ───────────────────────────────────────────────────────────────────── */
(function (root) {
  const IQ = root.IQ = root.IQ || {};

  /* Sessiya algoritmi versiyasi. Tartib, urug', daraja yoki savol
     tanlash qoidasi o'zgarsa oshiriladi — eski jurnallar boshqa savol
     beradi (§10). 2 — takrorlanmaslik va bank qismlari. */
  const ENGINE = 2;
  const MAX_TRIES = 20;          // generator xatosi byudjeti (bir o'rin uchun)
  const UNIQUE_TRIES = 40;       // takror / boshqa qism byudjeti (bir o'rin uchun)
  const LENGTH_MAX = 200;
  const LEVEL_DEFAULT = 3;

  /* Ishonchlilik qoidasi (yuqoridagi izoh). */
  const RELIABLE_MIN = 20;
  const CHANCE_Z = 1.645;
  const FAST_MEDIAN_MS = 1500;

  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const clampLevel = (v, d) => (typeof v === 'number' && isFinite(v)
    ? clamp(Math.round(v), IQ.LEVEL_MIN || 1, IQ.LEVEL_MAX || 10) : d);
  const q4 = x => Math.round(x * 1e4) / 1e4;

  const itemSeed = (seed, i, a) => IQ.hash('item:' + seed + ':' + i + ':' + a);
  const levelRng = (seed, i) => IQ.rng(IQ.hash('level:' + seed + ':' + i));

  /* Savolning mazmun kaliti: bir xil kalit — foydalanuvchi uchun bir
     xil savol (yuqoridagi TAKRORLANMASLIK). */
  function contentKey(it) {
    if (typeof it.key === 'string' && it.key) return it.type + '#' + it.key;
    return it.type + ':' + IQ.hash(JSON.stringify(it.prompt) + '\n' + JSON.stringify(it.stimulus));
  }

  /* Bank qismi: 'test' | 'practice' | null (generator savoli — bo'linmaydi). */
  function bankSide(it) {
    if (typeof it.key !== 'string' || !it.key) return null;
    return IQ.hash('side:' + it.key) % 2 === 0 ? 'test' : 'practice';
  }

  /* Ishonchlilik sababi (yuqoridagi ISHONCHLILIK). null — ishonchli. */
  function assess(mode, log) {
    if (mode !== 'test') return 'practice';
    if (log.length < RELIABLE_MIN) return 'short';
    const ch = IQ.score.chance(log);
    let correct = 0;
    const ms = [];
    log.forEach(r => { if (r.correct) correct++; if (r.ms > 0) ms.push(r.ms); });
    if (correct <= ch.mean + CHANCE_Z * ch.sd) return 'chance';
    if (ms.length * 2 >= log.length) {
      ms.sort((a, b) => a - b);
      const h = ms.length >> 1;
      const med = ms.length % 2 ? ms[h] : (ms[h - 1] + ms[h]) / 2;
      if (med < FAST_MEDIAN_MS) return 'fast';
    }
    return null;
  }

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
    const seen = new Set();               // chiqqan savollarning contentKey'lari
    let cur = null;

    function levelAt(i) {
      if (mode === 'practice') return stair[order[i]].level;
      const theta = log.length ? IQ.score.estimate(log).theta : 0;
      return IQ.score.nextLevel(q4(theta), levelRng(seed, i));
    }

    /* i-o'rindagi savol. Urinishlar a = 0, 1, 2 … tartibida: birinchi
       yaroqli, YANGI va o'z qismidagi savol olinadi. Byudjet tugasa —
       ko'rilmagan boshqa qism savoli (other), u ham bo'lmasa birinchi
       takror (again). Hammasi faqat oldingi savollarga bog'liq —
       deterministik. */
    function gen(i) {
      const type = order[i], level = levelAt(i);
      let last = null, errors = 0, rejects = 0, other = null, again = null;
      for (let a = 0; errors < MAX_TRIES && rejects < UNIQUE_TRIES; a++) {
        let it;
        try { it = IQ.makeItem(type, itemSeed(seed, i, a), level); }
        catch (e) { last = e; errors++; continue; }
        const key = contentKey(it);
        if (seen.has(key)) { if (!again) again = { it, key }; rejects++; continue; }
        const side = bankSide(it);
        if (side && side !== mode) { if (!other) other = { it, key }; rejects++; continue; }
        seen.add(key);
        return it;
      }
      const pick = other || again;
      if (pick) { seen.add(pick.key); return pick.it; }
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
      const flag = assess(mode, log);
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
        loOpen: iv.loOpen, hiOpen: iv.hiOpen,
        reliable: flag === null,
        flag,
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

  IQ.session = {
    create, restore, verify, ENGINE,
    contentKey, bankSide,
    RULES: { minItems: RELIABLE_MIN, chanceZ: CHANCE_Z, fastMedianMs: FAST_MEDIAN_MS },
  };
})(typeof window !== 'undefined' ? window : globalThis);
