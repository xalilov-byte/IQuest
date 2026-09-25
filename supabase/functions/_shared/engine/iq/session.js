/* ─────────────────────────────────────────────────────────────────────────
   IQ.session — test va mashq oqimi (CONTRACT.md §3)

   Oqim ilovada emas, shu yerda: bu yerda testlanadi, ilova esa faqat
   ko'rsatadi. Sessiya uch narsani hal qiladi:

   1. QAYSI TUR. Test rejimida turlar aralashmasi oldindan rejalanadi
      (content balancing): matritsa 35%, qator 25%, fazoviy 20%, og'zaki
      20% — IQ.types() da bor turlar ichida qayta normallashtiriladi.
      Sabab: adaptiv tanlov faqat qiyinlikka qaraydi; turga qaramasa bir
      odamga 20 ta matritsa tushishi mumkin va "IQ" aslida "matritsa
      balli" bo'lib qoladi. Ulushlar Raven/WAIS uslubidagi testlarda
      noverbal matritsa asosiy, qolganlari yordamchi bo'lishidan olingan;
      bu ME'YORLANMAGAN tanlov, kalibrlashdan keyin qayta ko'riladi.
      Ketma-ket bir xil tur 2 martadan ko'p emas (charchoq va "naqshga
      o'rganib qolish" bahoni buzmasin).

   2. QAYSI QIYINLIK. Har javobdan keyin θ EAP bilan yangilanadi va
      keyingi daraja IQ.score.nextLevel dan (3PL ma'lumot cho'qqisi +
      kichik tasodif). Mashqda ham adaptiv, lekin startLevel dan
      boshlanadi (tanlov priori shu darajaga siljitiladi).

   3. QAYTA TIKLASH VA SERVER TEKSHIRUVI. Hamma tasodif bitta urug'li
      oqimdan (IQ.rng(seed)) va javoblar jurnalidan kelib chiqadi.
      JURNAL = { v, engine, seed, mode, types, length, startLevel,
                 items: [{ id, answer, ms }] } — ham snapshot (ilova
      yopilsa davom ettirish), ham serverga yuboriladigan natija
      (CONTRACT.md §10). restore() jurnalni QAYTA O'YNAYDI va aynan o'sha
      savollarni beradi; verify() — xuddi shu, lekin qat'iy: har
      shubhali maydon rad etiladi va ball server tomonda QAYTA
      hisoblanadi. Har qadamda savol id'si solishtiriladi: generator
      yangilanib boshqa savol chiqsa, jimgina boshqa savolga baho
      qo'yilmaydi; mijoz o'zi oson savolni "tanlab" ham ololmaydi.
   ───────────────────────────────────────────────────────────────────── */
(function (root) {
  const IQ = root.IQ = root.IQ || {};

  /* Test rejimidagi turlar ulushi. Bu ro'yxatda yo'q tur (yangi
     generator) o'rtacha ulush — 0.20 — oladi, keyin hammasi qayta
     normallashtiriladi. Mashqda foydalanuvchi tanlagan turlar teng. */
  const MIX = { matrix: 0.35, series: 0.25, spatial: 0.20, verbal: 0.20 };
  const MIX_OTHER = 0.20;
  const MAX_RUN = 2;                 // ketma-ket bir xil tur — ko'pi bilan
  /* Bir tur uchun urinishlar. Ikki xil chegara, chunki sabablar har xil:
     · makeItem OTDI (generator xatosi) — 12 marta: 50% buzuq generator
       ham 12 urinishda 0.5¹² ≈ 0.0002 ehtimol bilan yutqazadi; undan
       ko'pini kutish ma'nosiz, boshqa turga o'tamiz.
     · TAKROR savol (cheklangan to'plam) — jami 40 urinish: 40 talik
       to'plamdan 30 ta savol olinganda ham oxirgisi uchun
       (29/40)⁴⁰ ≈ 3·10⁻⁶. Takror aniqlash arzon, generator chaqiriq ham. */
  const TRIES = 12;
  const ATTEMPTS = 40;
  const DEFAULT_LEN = { test: 30, practice: 10 };
  const MAX_LEN = 200;
  /* Jurnal formati versiyasi (1 — vaqtinchalik qolipniki edi, uni qayta
     o'ynab bo'lmaydi). */
  const LOG_V = 2;
  /* Dvigatel versiyasi: generatorlar yoki shu fayldagi tanlov mantig'i
     (reja, daraja, urug' iste'moli) o'zgarsa, o'sha urug' BOSHQA
     savollar beradi — eski jurnal endi qayta o'ynalmaydi. Shunda versiya
     oshiriladi va server eski versiyani qo'llab-quvvatlaydi yoki rad
     etadi (CONTRACT.md §10). */
  const ENGINE = '1';
  /* Bitta javobga eng kam vaqt (ms) — verify() bundan tezini rad etadi.
     Asos: oddiy reaksiya vaqti (bitta signalga bitta tugma) odamda
     ~200–250 ms; 4–6 variantdan TANLASH Hick–Hyman qonuni bo'yicha
     ~200 + 150·log2(k) ≈ 500–600 ms, bunga stimulni ko'rish va barmoqni
     yetkazish qo'shiladi. 300 ms — hatto o'qimasdan tasodifiy bosish
     uchun ham pastki chegara; undan tezi — skript. Chegara ataylab
     past: tez taxmin qilgan odam jazolanmasin (u baribir past ball
     oladi). Ilova savol ko'rsatilgandan keyin 300 ms tugmalarni bloklashi
     kerak (ikki marta bosish keyingi savolga tushmasin). */
  const MIN_MS = 300;
  const U32 = 4294967296;
  const Z90 = 1.645;

  /* reliable = n ≥ 20 VA se ≤ 0.5.

     se chegarasi ishonchlilikdan: θ populyatsiyada N(0,1), demak
     ρ = 1 − se². se ≤ 0.5 ⇔ ρ ≥ 0.75 — past xavfli, o'zini kuzatish
     uchun ishlatiladigan o'lchovning odatiy quyi chegarasi (Nunnally
     1978: 0.7–0.8). IQ shkalasida bu 90% oraliq yarim kengligi ≤ 12.3
     ball.

     Nega 0.45 (ρ ≥ 0.80) emas — simulyatsiyada o'lchandi (3PL, a = 1,
     c = 1/k, θ ~ N(0,1); usuli tests/iq-score.test.mjs dagidek): 30
     savollik adaptiv testda se ning medianasi 0.44, 90-persentili 0.46.
     0.45 chegarasi aynan odatiy qiymat ustida turadi: bir odam ikki
     marta test topshirsa, raqam goh ko'rinadi, goh yo'q (faqat 78% i
     ko'radi); θ = +2 dagi odamlarning 77% i, θ = +3 dagilarning 97% i
     raqamni umuman ko'rmasdi (savollar shkalasi tepada tugaydi). 0.5
     chegarasida 30 savolda 99.7% ko'radi, 25 savolda 92%, 20 savolda
     atigi 6% — ya'ni chegara "qisqa yoki g'ayritabiiy test"ni
     ajratadi, oddiy odamni emas. */
  const RELIABLE = Object.freeze({ minN: 20, maxSE: 0.5 });

  const isNum = x => typeof x === 'number' && x - x === 0;
  const own = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
  const clampLevel = l => Math.max(IQ.LEVEL_MIN || 1, Math.min(IQ.LEVEL_MAX || 10, Math.round(l)));

  /* So'ralgan turlardan faqat generatori borlari, takrorsiz. */
  function resolveTypes(list) {
    const src = Array.isArray(list) && list.length ? list : IQ.types();
    const out = [];
    src.forEach(t => {
      if (typeof t === 'string' && IQ.generator(t) && out.indexOf(t) < 0) out.push(t);
    });
    return out;
  }

  function weightsFor(types, mode) {
    const w = types.map(t => (mode === 'test' ? (own(MIX, t) ? MIX[t] : MIX_OTHER) : 1));
    const sum = w.reduce((a, x) => a + x, 0);
    return w.map(x => x / sum);
  }

  /* Kvota: har tur necha marta chiqadi. Eng katta qoldiq usuli
     (Hamilton): avval butun qismlar, qolgan o'rinlar eng katta kasr
     qoldiqqa. Teng qoldiqda (30 × 0.35 = 10.5, 30 × 0.25 = 7.5) kim
     olishini urug' hal qiladi — aks holda doim ro'yxatdagi birinchisi
     olardi va o'rtacha ulush siljirdi. */
  function quotas(w, length, rng) {
    const q = w.map(x => Math.floor(x * length + 1e-9));
    const rest = rng.shuffle(w.map((x, t) => ({ t, r: Math.round((x * length - q[t]) * 1e6) })))
      .sort((a, b) => b.r - a.r);          // barqaror saralash: teng qoldiqlar tasodifiy tartibda qoladi
    let used = q.reduce((a, x) => a + x, 0);
    for (let i = 0; used < length; i++, used++) q[rest[i % rest.length].t]++;
    return q;
  }

  /* Qolgan kvotani "ketma-ket ≤ MAX_RUN" qoidasi bilan joylab bo'ladimi?
     Ochko'z sinov: har qadamda qoidani buzmaydigan eng ko'p qolgan tur.
     Bu masalada ochko'z usul yetarli (eng ko'p qolgan turni kechiktirish
     keyinroq uni ketma-ket qo'yishga majbur qiladi). */
  function feasible(left, last, run) {
    const l = left.slice();
    let total = l.reduce((a, x) => a + x, 0), lt = last, lr = run;
    while (total > 0) {
      let best = -1;
      for (let t = 0; t < l.length; t++) {
        if (l[t] > 0 && !(t === lt && lr >= MAX_RUN) && (best < 0 || l[t] > l[best])) best = t;
      }
      if (best < 0) return false;
      l[best]--; total--;
      lr = best === lt ? lr + 1 : 1; lt = best;
    }
    return true;
  }

  /* Turlar ketma-ketligi — sessiya boshida, urug'dan. Har qadamda
     qoidani buzmaydigan va qolganini joylashga imkon beradigan turlar
     ichidan qolgan kvotaga mutanosib tasodifiy tanlov: tartib oldindan
     bilinmaydi, lekin yakuniy ulush kvotaga aynan teng. Qoidani bajarib
     bo'lmasa (masalan, bitta tur) — iloji boricha kam buzadi. */
  function plan(types, w, length, rng) {
    const n = types.length, left = quotas(w, length, rng), out = [];
    let last = -1, run = 0;
    for (let i = 0; i < length; i++) {
      const okRun = t => left[t] > 0 && !(t === last && run >= MAX_RUN);
      let cands = [];
      for (let t = 0; t < n; t++) {
        if (!okRun(t)) continue;
        left[t]--;
        if (feasible(left, t, t === last ? run + 1 : 1)) cands.push(t);
        left[t]++;
      }
      if (!cands.length) for (let t = 0; t < n; t++) if (okRun(t)) cands.push(t);
      if (!cands.length) for (let t = 0; t < n; t++) if (left[t] > 0) cands.push(t);
      let tot = 0;
      cands.forEach(t => { tot += left[t]; });
      let x = rng.next() * tot, pick = cands[cands.length - 1];
      for (let j = 0; j < cands.length; j++) {
        x -= left[cands[j]];
        if (x < 0) { pick = cands[j]; break; }
      }
      out.push(types[pick]);
      left[pick]--;
      run = pick === last ? run + 1 : 1;
      last = pick;
    }
    return out;
  }

  /* Savol mazmunining kaliti: bir sessiyada bir xil savol ikki marta
     chiqmasin. Og'zaki savollar qo'lda yozilgan cheklangan to'plam —
     boshqa urug' o'sha savolni boshqa variant tartibi bilan berishi
     mumkin. Savol = ko'rsatma + stimul + to'g'ri javob (variantlar
     tartibi va distraktorlar hisobga olinmaydi). */
  function contentKey(it) {
    return IQ.hash(it.type + '\u0000' + JSON.stringify(it.prompt) + '\u0000' +
      JSON.stringify(it.stimulus) + '\u0000' + JSON.stringify(it.options[it.correct]));
  }

  /* Mashq: boshlang'ich daraja nzProgress.levelFor dan (bir necha tur
     bo'lsa — o'rtachasi). progress.js bo'lmasa yoki xato bersa — 5. */
  function levelFromProgress(types) {
    try {
      const p = root.nzProgress;
      if (!p || typeof p.levelFor !== 'function') return null;
      let s = 0, n = 0;
      types.forEach(t => { const l = p.levelFor(t); if (isNum(l)) { s += l; n++; } });
      return n ? s / n : null;
    } catch (e) { return null; }
  }

  let made = 0;   // bir millisekundda ikki sessiya ochilsa ham urug'i har xil bo'lsin

  function create(opts) {
    opts = opts || {};
    const mode = opts.mode === 'test' ? 'test' : 'practice';
    const types = resolveTypes(opts.types);
    if (!types.length) throw new Error('[IQ] sessiya uchun savol turi yo\'q (generator ro\'yxatdan o\'tmagan)');
    const length = isNum(opts.length) && opts.length >= 1
      ? Math.min(MAX_LEN, Math.floor(opts.length)) : DEFAULT_LEN[mode];
    const seed = isNum(opts.seed) ? opts.seed >>> 0 : (Date.now() + 7919 * made++) >>> 0;

    /* Test HAMMA uchun bir xil nuqtadan (θ = 0) boshlanadi — natijalar
       solishtiriladigan bo'lsin; startLevel faqat mashqda. */
    let startLevel = null;
    if (mode === 'practice') {
      const sl = isNum(opts.startLevel) ? opts.startLevel : levelFromProgress(types);
      startLevel = clampLevel(isNum(sl) ? sl : 5);
    }

    const rng = IQ.rng(seed);
    const order = plan(types, weightsFor(types, mode), length, rng);

    /* Tanlov priori. Testda N(0,1) — natija bilan bir xil. Mashqda
       o'rtacha shunday siljitiladiki, nextLevel(o'rtacha) = startLevel:
       startLevel dan boshlab, javoblarga qarab yuradi. Natija (Result)
       esa har doim N(0,1) bilan hisoblanadi — IQ shkalasi shunga bog'liq. */
    const prior = mode === 'practice'
      ? { mean: IQ.levelToB(startLevel) - IQ.score.bestB(0), sd: 1 } : null;

    const log = [];            // { id, type, level, b, k, answer, correct, ms }
    const seen = new Set();
    let cur = null, shownAt = 0;

    const session = {
      mode, length, seed, startLevel,
      types: types.slice(),
      /* Sessiya o'rtada savol yarata olmay qolsa (hamma generator
         buzuq) — xato matni; sessiya shu joyda tugaydi (done = true). */
      error: null,
      get index() { return log.length; },
      get done() { return cur === null; },
      current: () => cur,
      answer,
      result,
      snapshot,
      /* QO'SHIMCHA: serverga yuboriladigan jurnal (§10). snapshot bilan
         bir xil shakl — nomi chaqiruvchi niyatini aytsin. */
      submission: snapshot,
    };

    function nextLevel() {
      if (mode === 'practice' && !log.length) return startLevel;
      return IQ.score.nextLevel(IQ.score.estimate(log, prior).theta, rng);
    }

    /* Keyingi savol. makeItem buzuq savolni OTADI — boshqa urug' bilan
       qayta urinamiz (TRIES / ATTEMPTS). Rejadagi tur baribir bermasa —
       boshqa turlar (ulush biroz siljiydi, lekin test to'xtamaydi).
       Takror savol faqat boshqa iloji qolmaganda olinadi. */
    function makeNext() {
      cur = null;
      if (log.length >= length) return;
      const level = nextLevel();
      const want = order[log.length];
      const queue = [want].concat(types.filter(t => t !== want));
      let dup = null, lastErr = null;
      for (let q = 0; q < queue.length; q++) {
        let errors = 0;
        for (let k = 0; k < ATTEMPTS && errors < TRIES; k++) {
          let it;
          try { it = IQ.makeItem(queue[q], rng.int(U32), level); }
          catch (e) { lastErr = e; errors++; continue; }
          const key = contentKey(it);
          if (seen.has(key)) { if (!dup) dup = { it, key }; continue; }
          seen.add(key); cur = it; shownAt = Date.now();
          return;
        }
      }
      if (dup) { seen.add(dup.key); cur = dup.it; shownAt = Date.now(); return; }
      throw new Error('[IQ] savol yaratib bo\'lmadi (' + want + ', daraja ' + level + '): ' +
        (lastErr ? lastErr.message : 'noma\'lum'));
    }

    /* i — tanlangan variant indeksi. Butun son bo'lmasa yoki diapazondan
       tashqarida (vaqt tugadi, o'tkazib yuborildi) — javob −1, xato
       hisoblanadi. ms — javobga ketgan vaqt; berilmasa savol
       ko'rsatilgandan beri o'tgan vaqt. */
    function answer(i, ms) {
      if (!cur) throw new Error('[IQ] sessiya tugagan');
      const it = cur;
      const chosen = Number.isInteger(i) && i >= 0 && i < it.options.length ? i : -1;
      const ok = chosen === it.correct;
      const spent = isNum(ms) && ms >= 0 ? Math.round(ms) : Math.max(0, Date.now() - shownAt);
      log.push({ id: it.id, type: it.type, level: it.level, b: it.b,
                 k: it.options.length, answer: chosen, correct: ok, ms: spent });
      try { makeNext(); }
      catch (e) { cur = null; session.error = e.message; }
      return { correct: ok, correctIndex: it.correct, item: it };
    }

    function result() {
      const est = IQ.score.estimate(log);
      const iv = IQ.score.interval(est.theta, est.se, Z90);
      const byType = {};
      let correct = 0, dur = 0;
      log.forEach(r => {
        const b = byType[r.type] || (byType[r.type] = { n: 0, correct: 0 });
        b.n++;
        if (r.correct) { b.correct++; correct++; }
        dur += r.ms;
      });
      return {
        mode, n: log.length, correct,
        /* Javoblarga ketgan vaqt yig'indisi — devor soati emas: ilova
           yopilib ertasi kuni davom ettirilsa ham to'g'ri. */
        durationMs: dur,
        theta: est.theta, se: est.se,
        iq: IQ.score.toIQ(est.theta), lo: iv.lo, hi: iv.hi,
        /* Oraliq ko'rsatiladigan shkaladan (55..145) chiqib ketdimi.
           true bo'lsa lo/hi chegarada kesilgan: ilova "145+" / "55 dan
           past" deb yozishi kerak, "145–145" kabi yolg'on aniq oraliq emas. */
        floor: 100 + 15 * (est.theta - Z90 * est.se) < 54.5,
        ceiling: 100 + 15 * (est.theta + Z90 * est.se) > 145.5,
        reliable: log.length >= RELIABLE.minN && est.se <= RELIABLE.maxSE,
        byType,
        /* answer (tanlangan variant, −1 = javobsiz) va k — SHART (§3):
           server natijani shu jurnaldan qayta hisoblaydi. */
        items: log.map(r => ({ id: r.id, type: r.type, level: r.level, b: r.b, k: r.k,
                               answer: r.answer, correct: r.correct, ms: r.ms })),
      };
    }

    /* Jurnal: urug' + javoblar. Savollarning o'zi (SVG) saqlanmaydi —
       ular urug'dan qayta tug'iladi; id — tekshiruv uchun. */
    function snapshot() {
      return {
        v: LOG_V, engine: ENGINE, seed, mode, types: types.slice(), length, startLevel,
        items: log.map(r => ({ id: r.id, answer: r.answer, ms: r.ms })),
      };
    }

    makeNext();
    return session;
  }

  /* Xato: sabab kodi bilan (server jurnalga yozadi, ilova tarjima qiladi). */
  function fail(code, why) {
    const e = new Error('[IQ] jurnal yaroqsiz (' + code + '): ' + why);
    e.code = code;
    return e;
  }

  /* Jurnalning umumiy shakli — restore va verify uchun bir xil. */
  function checkShape(j) {
    if (!j || typeof j !== 'object' || Array.isArray(j)) throw fail('shape', 'obyekt emas');
    if (j.v !== LOG_V) throw fail('version', 'format versiyasi ' + j.v + ' (kutilgan ' + LOG_V + ')');
    if (j.engine !== ENGINE) throw fail('engine', 'dvigatel ' + j.engine + ' (joriy ' + ENGINE + ')');
    if (j.mode !== 'test' && j.mode !== 'practice') throw fail('mode', String(j.mode));
    if (!Number.isInteger(j.seed) || j.seed < 0 || j.seed >= U32) throw fail('seed', String(j.seed));
    if (!Number.isInteger(j.length) || j.length < 1 || j.length > MAX_LEN) throw fail('length', String(j.length));
    if (!Array.isArray(j.types) || !j.types.length || j.types.some(t => typeof t !== 'string') ||
        new Set(j.types).size !== j.types.length) throw fail('types', 'ro\'yxat noto\'g\'ri');
    j.types.forEach(t => { if (!IQ.generator(t)) throw fail('types', 'noma\'lum tur ' + t); });
    /* Mashqning boshlanishi jurnalda bo'lishi SHART: aks holda qayta
       o'ynash nzProgress ga (qurilma holatiga) bog'liq bo'lib qolardi. */
    if (j.mode === 'practice' && !(Number.isInteger(j.startLevel) &&
        j.startLevel >= (IQ.LEVEL_MIN || 1) && j.startLevel <= (IQ.LEVEL_MAX || 10))) {
      throw fail('startLevel', String(j.startLevel));
    }
    if (!Array.isArray(j.items)) throw fail('items', 'massiv emas');
    if (j.items.length > j.length) throw fail('count', j.items.length + ' ta javob, length ' + j.length);
    j.items.forEach((e, n) => {
      if (!e || typeof e !== 'object' || typeof e.id !== 'string') throw fail('shape', n + '-yozuv');
    });
  }

  /* Qayta o'ynash: har qadamda qayta tug'ilgan savol id'si jurnaldagiga
     teng bo'lishi SHART. strict — verify uchun: javob indeksi va vaqt
     ham tekshiriladi. */
  function replay(j, strict) {
    checkShape(j);
    const s = create({ mode: j.mode, types: j.types, length: j.length, seed: j.seed,
                       startLevel: j.startLevel });
    j.items.forEach((e, n) => {
      const cur = s.current();
      if (!cur || cur.id !== e.id) {
        throw fail('order', n + '-savol mos emas (kutilgan ' + (cur && cur.id) + ', jurnalda ' + e.id + ')');
      }
      if (strict) {
        /* −1 — javobsiz (vaqt tugadi): xato hisoblanadi, mijozga foyda
           bermaydi, shuning uchun ruxsat. Qolgani 0..k−1 butun son. */
        if (!(e.answer === -1 || (Number.isInteger(e.answer) && e.answer >= 0 && e.answer < cur.options.length))) {
          throw fail('answer', n + '-javob ' + e.answer + ' (variantlar ' + cur.options.length + ')');
        }
        if (!(isNum(e.ms) && e.ms >= MIN_MS)) {
          throw fail('ms', n + '-javob ' + e.ms + ' ms — ' + MIN_MS + ' ms dan tez bo\'lishi mumkin emas');
        }
      }
      s.answer(Number.isInteger(e.answer) ? e.answer : -1, isNum(e.ms) && e.ms >= 0 ? e.ms : 0);
    });
    return s;
  }

  /* Ilova yopilgandan keyin davom ettirish. Jurnal buzuq yoki boshqa
     dvigatel versiyasidan bo'lsa — xato (ilova yangi sessiya boshlaydi,
     yoki tryRestore dan null oladi). */
  function restore(snap) {
    return replay(snap, false);
  }

  /* QO'SHIMCHA: xato otmaydigan restore — ilova ochilishida qulay. */
  function tryRestore(snap) {
    try { return restore(snap); } catch (e) { return null; }
  }

  /* Server tekshiruvi (CONTRACT.md §10). Sof funksiya: faqat IQ.* va
     standart JS — Supabase Edge Function (Deno) da ham ishlaydi.
     Tekshiradi:
       · format, dvigatel versiyasi, rejim, urug', turlar, uzunlik;
       · javoblar soni ≤ length;
       · jurnal qayta o'ynalganda AYNAN shu id'lar shu tartibda chiqadi
         (mijoz oson savolni o'zi tanlay olmaydi, tartibni almashtira
         olmaydi, begona savol qo'sha olmaydi);
       · har javob 0..k−1 (yoki −1 — javobsiz);
       · har javob ≥ MIN_MS.
     Keyin ball IQ.score bilan QAYTA hisoblanadi — mijoz yuborgan iq,
     correct, theta e'tiborga olinmaydi. Qaytaradi: Result. Rad etsa —
     Error, e.code: shape | version | engine | mode | seed | length |
     types | startLevel | items | count | order | answer | ms.

     Bu tekshiruv NIMANI KAFOLATLAMAYDI: mijozda generator kodi bor, ya'ni
     to'g'ri javobni ham hisoblay oladi. verify faqat "natija jurnalga
     mos" ekanini isbotlaydi. Urug'ni server berishi (va qayta
     ishlatilmasligi) kerak — aks holda bir urug'ni qayta-qayta yechib,
     keyin "toza" jurnal yuborish mumkin. */
  function verify(submission) {
    return replay(submission, true).result();
  }

  IQ.session = {
    create, restore, tryRestore, verify,
    ENGINE, MIN_MS, RELIABLE,
    MIX: Object.freeze(Object.assign({}, MIX)),
  };
})(typeof window !== 'undefined' ? window : globalThis);
