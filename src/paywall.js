/* ─────────────────────────────────────────────────────────────────────────
   PAYWALL — qoʻlda toʻlov bilan IQ natijasini ochish (window.nzPaywall)

   Faqat WEB build (Telegram Mini App) uchun, build.mjs uni va
   nzSite.paywall ni faqat --target=web da qoʻyadi. Server YOʻQ:
     · test kodi   = "IQ-" + 4 belgi (Crockford base32) FNV-1a(seed) dan;
     · ochish kodi = 6 belgi (Crockford base32) FNV-1a(`${testKod}:${secret}`).
   Egasi kodni `node tools/unlock.mjs IQ-XXXX` bilan oladi (PAYWALL.md).
   «Chekni yuborish» havolasi: t.me/<bot>?start=pay_IQ-XXXX_<iqTag> — IQ
   belgisi bot admin paneli uchun (bot/lib.php).
   Sir web bundle ichida koʻrinadi — sinov bosqichi uchun egasi rozi.

   Saqlash (kalit nz-paywall): { v:1, name, items: { [kod]: { code, at,
   unlocked, r } } } — r — natijaning qisqa nusxasi (iq, lo, hi, …), shunda
   odam keyin qaytib kelsa ham ekran ochiladi.
   ───────────────────────────────────────────────────────────────────── */
(function (root) {
  const ALPHA = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
  const KEY = 'nz-paywall';

  function fnv(str) {
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 0x01000193) >>> 0;
    }
    return h >>> 0;
  }
  /* 32 bitli sonning yuqori bitlaridan len ta belgi (len ≤ 6). */
  function b32(n, len) {
    let out = '';
    for (let i = 0; i < len; i++) out += ALPHA[(n >>> (27 - 5 * i)) & 31];
    return out;
  }
  /* Crockford: katta harf, boʻshliq/chiziqcha tashlanadi, O→0, I/L→1. */
  function clean(s) {
    return String(s == null ? '' : s).toUpperCase().replace(/[\s\-_]/g, '')
      .replace(/O/g, '0').replace(/[IL]/g, '1');
  }
  /* "iq-4f7k", "4F7K", "IQ 4F7K" → "IQ-4F7K". */
  function normCode(s) {
    let c = String(s == null ? '' : s).toUpperCase().replace(/[\s_]/g, '');
    c = c.replace(/^IQ-?/, '');
    return 'IQ-' + clean(c);
  }

  function testCode(seed) { return 'IQ-' + b32(fnv('iquest:test:' + (seed >>> 0)), 4); }
  function unlockCode(code, secret) { return b32(fnv(normCode(code) + ':' + String(secret || '')), 6); }
  function check(code, secret, input) { return clean(input) === unlockCode(code, secret); }
  /* IQ belgisi — botdagi admin panelida IQ koʻrinsin (bot/lib.php
     iq_tag_decode). 2 belgi: 10 bit, sir bilan XOR (oddiy yashirish —
     foydalanuvchi /start havolasida raqamni koʻrmasin; kriptografik emas). */
  function iqTag(code, iq, secret) {
    const t = ((iq | 0) & 0x3FF) ^ (fnv(normCode(code) + ':iq:' + String(secret || '')) & 0x3FF);
    return b32((t << 22) >>> 0, 2);
  }

  function ls() { try { return root.localStorage || null; } catch (e) { return null; } }
  function load() {
    try {
      const s = ls(), raw = s ? s.getItem(KEY) : null, v = raw ? JSON.parse(raw) : null;
      if (v && v.v === 1 && v.items && typeof v.items === 'object') return v;
    } catch (e) {}
    return { v: 1, name: '', items: {} };
  }
  function save(st) { try { const s = ls(); if (s) s.setItem(KEY, JSON.stringify(st)); } catch (e) {} }

  root.nzPaywall = Object.freeze({
    ALPHA: ALPHA,
    testCode: testCode,
    unlockCode: unlockCode,
    check: check,
    normCode: normCode,
    iqTag: iqTag,
    /* Yangi toʻliq natija — kutilmoqda holatida (bor boʻlsa oʻzgarmaydi). */
    add(code, at, r) {
      const st = load();
      if (!st.items[code]) st.items[code] = { code: code, at: at, unlocked: false, r: r };
      save(st);
      return Object.assign({}, st.items[code]);
    },
    get(code) { const it = load().items[code]; return it ? Object.assign({}, it) : null; },
    byAt(at) {
      const items = load().items;
      for (const k in items) if (items[k].at === at) return Object.assign({}, items[k]);
      return null;
    },
    unlock(code) {
      const st = load();
      if (st.items[code]) { st.items[code].unlocked = true; save(st); }
    },
    name() { return load().name || ''; },
    setName(n) { const st = load(); st.name = String(n || '').trim().slice(0, 60); save(st); },
  });
})(typeof window !== 'undefined' ? window : globalThis);
