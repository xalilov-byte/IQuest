/* ─────────────────────────────────────────────────────────────────────────
   ADMIN PANEL — BAZA BILAN ALOQA

   Faqat admin build'iga kiradi (build.mjs). Foydalanuvchi ilovasi va
   sayt bu faylni umuman ko'rmaydi.

   NIMA UCHUN SDK EMAS: loyihada tashqi kutubxona yo'q va bo'lmasligi
   ham kerak — butun ilova o'z runtime'i bilan ishlaydi. Supabase REST
   va Auth oddiy HTTP; ularga SDK shart emas.

   AUTENTIFIKATSIYA NIMA UCHUN SHART: baza RLS bilan himoyalangan.
   Publishable kalit bilan faqat NASHR ETILGAN savollar ko'rinadi —
   qoralama, ko'rib chiqishdagi savollar va audit jurnali ko'rinmaydi.
   Admin panel ularsiz ish qurolining o'zi emas. Shuning uchun avval
   kirish, keyin ish.
   ───────────────────────────────────────────────────────────────────── */

(function () {
  const cfg = window.nzSupabase || {};
  const SESSION_KEY = 'nz-admin-session';

  let session = null;     // { access_token, refresh_token, expires_at }
  let profile = null;     // { id, name, role }

  /* ── Sessiyani saqlash ─────────────────────────────────────────────── */
  function loadSession() {
    try {
      const s = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
      if (s && s.access_token) session = s;
    } catch (e) {}
  }
  function saveSession(s) {
    session = s;
    try {
      if (s) localStorage.setItem(SESSION_KEY, JSON.stringify(s));
      else localStorage.removeItem(SESSION_KEY);
    } catch (e) {}
  }

  /* ── Quyi darajadagi so'rov ────────────────────────────────────────── */
  async function call(path, opts) {
    opts = opts || {};
    const headers = Object.assign({
      apikey: cfg.publishableKey,
      'Content-Type': 'application/json',
    }, opts.headers || {});
    if (session && session.access_token && !opts.anon) {
      headers.Authorization = 'Bearer ' + session.access_token;
    }
    const res = await fetch(cfg.url + path, {
      method: opts.method || 'GET',
      headers: headers,
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    });
    const text = await res.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch (e) { data = text; }
    if (!res.ok) {
      const msg = (data && (data.message || data.error_description || data.error)) || ('HTTP ' + res.status);
      const err = new Error(msg);
      err.status = res.status;
      err.data = data;
      throw err;
    }
    return data;
  }

  /* Token muddati tugagan bo'lsa yangilaymiz. Supabase access token
     odatda bir soat yashaydi; admin panel esa uzoq ochiq turadi. */
  async function ensureFresh() {
    if (!session) return false;
    const soon = Date.now() + 60000;          // bir daqiqa zaxira
    if (session.expires_at && session.expires_at > soon) return true;
    if (!session.refresh_token) return false;
    try {
      const r = await call('/auth/v1/token?grant_type=refresh_token', {
        method: 'POST', anon: true, body: { refresh_token: session.refresh_token },
      });
      saveSession({
        access_token: r.access_token,
        refresh_token: r.refresh_token,
        expires_at: Date.now() + (r.expires_in || 3600) * 1000,
      });
      return true;
    } catch (e) {
      saveSession(null);
      return false;
    }
  }

  async function rest(path, opts) {
    await ensureFresh();
    return call('/rest/v1/' + path, opts);
  }

  /* ── Maʼlumotni admin panel kutgan shaklga keltirish ───────────────── */
  /* Dizayn ADMIN_QUESTIONS bilan ishlaydi: { id, topic, state, text,
     options, correct, author, updated, flag }. Bazadagi ustunlar boshqa
     nomda, shuning uchun shu yerda moslanadi — dizayn mantiqiga
     tegilmaydi. */
  const MONTHS = ['yanvar','fevral','mart','aprel','may','iyun',
                  'iyul','avgust','sentabr','oktabr','noyabr','dekabr'];
  function shortDate(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    return d.getDate() + '-' + MONTHS[d.getMonth()];
  }

  /* Og'zaki savol turlari (verbal_items.kind) — admin panelda "Tur"
     ustunida shu nomlar ko'rinadi. */
  const KIND_LABEL = { analogy: 'Analogiya', odd: 'Ortiqchasi', category: 'Kategoriya', relation: 'Munosabat' };

  /* Bazadagi og'zaki savol (supabase/migrations/0002_verbal.sql,
     verbal_items: uz va ru bitta qatorda) → admin panel shakli. Panel
     o'zbekcha matnni ko'rsatadi; ruschasi bazada, tahrir — seed orqali. */
  function mapQuestion(q) {
    const author = (q.author && q.author.name) || (q.updater && q.updater.name) || '—';
    return {
      uuid: q.id,                                   // haqiqiy kalit (yozuv uchun)
      id: q.key || ('#' + String(q.id).slice(0, 6)), // ko'rinadigan raqam (v001…)
      topic: KIND_LABEL[q.kind] || q.kind || '—',
      kind: q.kind,
      level: q.level,
      state: q.state,
      text: q.uz_stimulus ? q.uz_prompt + ' — ' + q.uz_stimulus : q.uz_prompt,
      options: q.uz_options || [],
      correct: q.correct,
      explain: q.explain_uz || '',
      keySource: 'human',
      author: author,
      updated: shortDate(q.updated_at),
      // Sifat bayrog'i statistikadan keladi (DIF/DIS) — u hali
      // hisoblanmaydi, shuning uchun hozircha bo'sh. Yolg'on bayroq
      // ko'rsatishdan ko'ra ko'rsatmagan yaxshi.
      flag: '',
    };
  }

  function mapAudit(a) {
    return {
      t: a.created_at,
      who: (a.actor && a.actor.name) || '—',
      role: a.actor_role || 'user',
      act: a.action,
      res: a.resource || '—',
      before: shortBefore(a.before),
      after: shortBefore(a.after),
      why: a.reason_code || '—',
      ip: '—',        // IP saqlanmaydi (kerak bo'lsa keyin qo'shiladi)
    };
  }

  /* Jurnalda butun qator emas, faqat o'zgargan muhim qiymat ko'rsatiladi:
     to'liq JSON jadvalni o'qib bo'lmaydigan qiladi. */
  function shortBefore(v) {
    if (!v) return '—';
    if (typeof v === 'string') return v;
    if (v.state) return String(v.state);
    return '—';
  }

  window.nzAdmin = {
    configured: function () { return !!(cfg.url && cfg.publishableKey); },
    signedIn: function () { return !!(session && session.access_token); },
    profile: function () { return profile; },

    restore: async function () {
      loadSession();
      if (!session) return null;
      const ok = await ensureFresh();
      if (!ok) return null;
      try {
        return await window.nzAdmin.loadMe();
      } catch (e) {
        saveSession(null);
        return null;
      }
    },

    signIn: async function (email, password) {
      const r = await call('/auth/v1/token?grant_type=password', {
        method: 'POST', anon: true, body: { email: email, password: password },
      });
      saveSession({
        access_token: r.access_token,
        refresh_token: r.refresh_token,
        expires_at: Date.now() + (r.expires_in || 3600) * 1000,
      });
      return await window.nzAdmin.loadMe();
    },

    signOut: function () {
      saveSession(null);
      profile = null;
    },

    loadMe: async function () {
      const rows = await rest('profiles?select=id,name,username,role');
      // RLS tufayli oddiy foydalanuvchi faqat o'z qatorini ko'radi;
      // xodim esa hammasini — shuning uchun o'zimizni id bo'yicha emas,
      // sessiyadagi id bo'yicha topamiz.
      const uid = window.nzAdmin.userId();
      profile = (rows || []).filter(r => r.id === uid)[0] || null;
      return profile;
    },

    /* JWT ichidagi "sub" — foydalanuvchi id. Imzoni tekshirmaymiz:
       bu faqat o'z qatorimizni topish uchun, ishonch esa serverda. */
    userId: function () {
      if (!session || !session.access_token) return null;
      try {
        const part = session.access_token.split('.')[1];
        const json = atob(part.replace(/-/g, '+').replace(/_/g, '/'));
        return JSON.parse(json).sub || null;
      } catch (e) { return null; }
    },

    /* ── Yozish ──────────────────────────────────────────────────────── */
    /* Savol holati va javob kaliti FAQAT shu yerdan o'zgaradi. Mahalliy
       o'zgartirish (state ichida) qilinmaydi: baza amalni rad etishi
       mumkin — RLS huquq bermasa yoki to'rt ko'z qoidasi ishlasa. Bunday
       holda interfeys "o'zgardi" deb ko'rsatib, aslida hech narsa
       o'zgarmagan bo'lardi. Shuning uchun: server → keyin qayta o'qish. */
    updateQuestion: async function (uuid, patch) {
      const rows = await rest('verbal_items?id=eq.' + encodeURIComponent(uuid), {
        method: 'PATCH',
        headers: { Prefer: 'return=representation' },
        body: patch,
      });
      return (rows && rows[0]) || null;
    },

    /* Ommaviy qo'shish. Savollar QORALAMA sifatida qo'shiladi — yangi
       savol darhol foydalanuvchiga chiqmasligi kerak, u avval ko'rib
       chiqishdan o'tadi. */
    insertQuestions: async function (items) {
      /* Bazadagi og'zaki savol ikki tilda bitta qator (uz + ru, izoh
         ham ikkala tilda — hammasi NOT NULL). Admin CSV'si hozircha
         faqat o'zbekcha matnni o'qiydi, ya'ni undan to'liq qator yasab
         bo'lmaydi. Yarim savolni bazaga yozishdan ko'ra ochiq aytamiz:
         og'zaki savollar content/verbal.json orqali qo'shiladi
         (supabase/mkseed.mjs). */
      const e = new Error('Ommaviy import hozircha yopiq: ogʻzaki savol ' +
        'uz va ru matnini talab qiladi. Savollar content/verbal.json orqali ' +
        'qoʻshiladi (' + items.length + ' ta qator yuborilmadi).');
      e.soft = true;
      throw e;
    },

    /* ── O'qish ──────────────────────────────────────────────────────── */
    loadAll: async function () {
      const topics = Object.keys(KIND_LABEL).map(k => ({ slug: k, name: KIND_LABEL[k] }));
      const [questions, audit] = await Promise.all([
        rest('verbal_items?select=id,key,kind,level,uz_prompt,uz_stimulus,uz_options,correct,explain_uz,state,updated_at,' +
             'author:profiles!verbal_items_author_id_fkey(name),' +
             'updater:profiles!verbal_items_updated_by_fkey(name)' +
             '&order=updated_at.desc&limit=500'),
        rest('audit_log?select=created_at,actor_role,action,resource,before,after,reason_code,' +
             'actor:profiles!audit_log_actor_id_fkey(name)' +
             '&order=created_at.desc&limit=200').catch(() => []),
      ]);
      return {
        topics: topics,
        questions: (questions || []).map(mapQuestion),
        audit: (audit || []).map(mapAudit),
      };
    },
  };
})();
