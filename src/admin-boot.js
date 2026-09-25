/* ─────────────────────────────────────────────────────────────────────────
   ADMIN PANEL — KIRISH VA MA'LUMOTNI YUKLASH

   Faqat admin build'iga kiradi.

   IKKI QAT'IY QOIDA:

   1. NAMUNAVIY MA'LUMOT KO'RSATILMAYDI. Dizaynda 8 ta o'ylab topilgan
      savol va 8 ta soxta foydalanuvchi bor — ular maket uchun edi.
      Admin panel ularni ko'rsatsa, xodim soxta savolni haqiqiy deb
      o'ylab, mavjud bo'lmagan narsani "tahrirlashga" urinadi. Shuning
      uchun panel ochilishi bilan ular TOZALANADI va faqat bazadan
      kelgani ko'rsatiladi.

   2. HOLAT HAR DOIM KO'RINIB TURADI. Yuqoridagi tasma ulanish holatini
      aytadi: kim kirgan, nechta savol yuklandi, xato bo'lsa nima. Admin
      panelda "nima ko'rsatilyapti va u haqiqiymi" degan savol hech
      qachon javobsiz qolmasligi kerak.

   Kirish oynasi dizayn faylida yo'q (u maketda chizilmagan), shuning
   uchun shu yerda oddiy DOM bilan yasaladi — dizayn faylini o'ylab
   topilgan ekran bilan to'ldirmaymiz.
   ───────────────────────────────────────────────────────────────────── */

(function () {
  const api = window.nzAdmin;
  if (!api) return;

  const STAFF = ['owner', 'moderator', 'auditor', 'support'];

  function el(tag, style, text) {
    const n = document.createElement(tag);
    if (style) n.setAttribute('style', style);
    if (text != null) n.textContent = text;
    return n;
  }

  /* ── Yuqoridagi holat tasmasi ──────────────────────────────────────── */
  const bar = el('div',
    'position:fixed;left:0;right:0;top:0;z-index:9998;display:flex;align-items:center;' +
    'gap:12px;padding:8px 16px;font:600 13px Manrope,system-ui,sans-serif;' +
    'background:var(--surface);border-bottom:1px solid var(--hairline);color:var(--foreground)');
  const barText = el('span', 'flex:1');
  const barBtn = el('button',
    'padding:6px 12px;border-radius:999px;background:var(--surface-alt);' +
    'color:var(--foreground);font:700 12px Manrope,system-ui,sans-serif;cursor:pointer');
  bar.appendChild(barText);
  bar.appendChild(barBtn);

  function status(text, action, onAction) {
    barText.textContent = text;
    if (action) {
      barBtn.textContent = action;
      barBtn.style.display = '';
      barBtn.onclick = onAction;
    } else {
      barBtn.style.display = 'none';
    }
    if (!bar.parentNode) document.body.appendChild(bar);
    document.body.style.paddingTop = '40px';
  }

  /* ── Kirish oynasi ─────────────────────────────────────────────────── */
  let overlay = null;

  function showLogin(message) {
    if (overlay) { if (message) overlay.err.textContent = message; return; }

    const back = el('div',
      'position:fixed;inset:0;z-index:9999;display:grid;place-items:center;' +
      'background:var(--background);padding:20px');
    const card = el('div',
      'width:100%;max-width:360px;background:var(--surface);border-radius:20px;' +
      'padding:28px;box-shadow:var(--shadow);font:500 14px Manrope,system-ui,sans-serif;' +
      'color:var(--foreground)');

    card.appendChild(el('div',
      'font:800 22px Manrope,system-ui,sans-serif;letter-spacing:-.02em',
      ((window.nzSite && window.nzSite.appName) || 'IQuest') + ' — admin'));
    card.appendChild(el('div',
      'margin-top:6px;color:var(--muted-foreground);font-size:13px',
      'Ogʻzaki savollar bazasini boshqarish uchun kiring'));

    const mkInput = (label, type, name) => {
      card.appendChild(el('div', 'margin-top:16px;font-weight:700;font-size:13px', label));
      const i = el('input',
        'margin-top:6px;width:100%;box-sizing:border-box;padding:12px 14px;border-radius:12px;' +
        'border:1px solid var(--hairline);background:var(--surface-alt);color:var(--foreground);' +
        'font:500 15px Manrope,system-ui,sans-serif');
      i.type = type;
      i.name = name;
      i.autocomplete = type === 'password' ? 'current-password' : 'username';
      card.appendChild(i);
      return i;
    };
    const email = mkInput('Email', 'email', 'email');
    const pass = mkInput('Parol', 'password', 'password');

    const err = el('div',
      'margin-top:12px;font-size:13px;font-weight:600;color:var(--destructive);min-height:18px');
    const btn = el('button',
      'margin-top:16px;width:100%;padding:14px;border-radius:14px;background:var(--primary);' +
      'color:#fff;font:800 15px Manrope,system-ui,sans-serif;cursor:pointer', 'Kirish');
    card.appendChild(err);
    card.appendChild(btn);
    card.appendChild(el('div',
      'margin-top:14px;font-size:12px;color:var(--muted-foreground);line-height:1.5',
      'Hisob Supabase Authentication bo‘limida yaratiladi. Kirgandan keyin ' +
      'unga SQL Editor orqali rol beriladi (supabase/README.md §1).'));

    back.appendChild(card);
    document.body.appendChild(back);

    /* Orqadagi ekranni BUTUNLAY berkitamiz, faqat ustiga qo'ymaymiz.

       Muammo (390px da o'lchangan): kirish oynasi ochiq bo'lsa ham
       orqada admin paneli chizilib turardi va uning `repeat(4,1fr)`
       gridi sahifani 488px ga cho'zardi — ya'ni telefonda gorizontal
       scroll paydo bo'lardi va kirish kartasini ekrandan surib
       yuborish mumkin edi.

       Berkitish `visibility` bilan emas, `display:none` bilan:
       ko'rinmaydigan element ham gridni va scrollWidth'ni saqlab
       qoladi. */
    const root = document.getElementById('nz-root');
    const prevRoot = root ? root.style.display : null;
    const prevOverflow = document.documentElement.style.overflow;
    if (root) root.style.display = 'none';
    document.documentElement.style.overflow = 'hidden';

    overlay = { back: back, err: err, root: root, prevRoot: prevRoot, prevOverflow: prevOverflow };
    if (message) err.textContent = message;

    const submit = async () => {
      err.textContent = '';
      btn.disabled = true;
      btn.textContent = 'Kirilmoqda…';
      try {
        const me = await api.signIn(email.value.trim(), pass.value);
        if (!me) throw new Error('Profil topilmadi');
        if (STAFF.indexOf(me.role) === -1) {
          api.signOut();
          throw new Error('Bu hisobda admin huquqi yo‘q (rol: ' + me.role + ')');
        }
        hideLogin();
        await loadInto(me);
      } catch (e) {
        err.textContent = friendly(e);
      } finally {
        btn.disabled = false;
        btn.textContent = 'Kirish';
      }
    };
    btn.onclick = submit;
    pass.onkeydown = e => { if (e.key === 'Enter') submit(); };
    email.focus();
  }

  function hideLogin() {
    if (!overlay) return;
    if (overlay.back.parentNode) overlay.back.parentNode.removeChild(overlay.back);
    // Orqadagi ekranni tiklaymiz (yuqoridagi izohga qarang).
    if (overlay.root) overlay.root.style.display = overlay.prevRoot || '';
    document.documentElement.style.overflow = overlay.prevOverflow || '';
    overlay = null;
  }

  /* Xato matnini odam o'qiy oladigan qilib beramiz — "HTTP 400" hech
     kimga yordam bermaydi. */
  function friendly(e) {
    const m = (e && e.message) || '';
    if (/Invalid login credentials/i.test(m)) return 'Email yoki parol notoʻgʻri';
    if (/Email not confirmed/i.test(m)) return 'Email tasdiqlanmagan';
    if (/Failed to fetch|NetworkError|load failed/i.test(m)) return 'Bazaga ulanib boʻlmadi';
    if (/relation .* does not exist|schema cache/i.test(m)) {
      return 'Baza sxemasi hali qoʻllanmagan (supabase/README.md §1)';
    }
    if (/row-level security|permission denied/i.test(m)) {
      return 'Bu amal uchun huquq yoʻq (rol tekshiring)';
    }
    // Baza o'zi bergan tushunarli xabar (masalan to'rt ko'z qoidasi)
    // o'zgartirilmaydi — u aynan foydalanuvchi uchun yozilgan.
    return m || 'Nomaʼlum xato';
  }

  /* ── Ma'lumotni ilovaga yuklash ────────────────────────────────────── */
  async function loadInto(me) {
    const app = window.nzApp;
    if (!app) return;
    status('Yuklanmoqda…');
    try {
      const d = await api.loadAll();
      app.setState({
        questions: d.questions,
        audit: d.audit,
        // Foydalanuvchilar bo'limi hali bazaga ulanmagan (obuna va ball
        // jadvallari yo'q) — soxta ro'yxat ko'rsatmaymiz.
        users: [],
        adminRole: me.role,
      });
      status(
        (me.name || me.role) + ' · ' + d.questions.length + ' savol · ' +
        d.topics.length + ' tur · jurnalda ' + d.audit.length + ' yozuv',
        'Chiqish', () => { api.signOut(); location.reload(); });
    } catch (e) {
      status('Maʼlumot yuklanmadi: ' + friendly(e), 'Qayta urinish', () => loadInto(me));
    }
  }

  /* ── Yozuv amallari ────────────────────────────────────────────────
     Dizayndagi tasdiq oynasi shu funksiyalarni chaqiradi. Har biri:
     serverga yozadi → ro'yxatni qayta o'qiydi → holatni aytadi.

     Xato bo'lsa u YASHIRILMAYDI. Ayniqsa to'rt ko'z qoidasi: baza
     "o'zingiz kiritgan o'zgarishni o'zingiz nashr eta olmaysiz" deb
     javob beradi va shu matn tasmada ko'rinadi — bu qoidaning butun
     ma'nosi shunda. */
  const STATE_BY_ACT = {
    qReview: 'review', qPublish: 'published',
    qDraft: 'draft', qArchive: 'archived', qRestore: 'draft',
  };

  window.nzAdminActions = {
    connected: function () { return api.signedIn(); },

    question: async function (act, q, opt) {
      const me = api.profile();
      status('Saqlanmoqda…');
      try {
        if (act === 'qKey') {
          // Faqat kalit yuboriladi: holatni ko'rib chiqishga qaytarishni
          // baza o'zi qiladi (trigger), klient uni takrorlamaydi.
          await api.updateQuestion(q.uuid, { correct: opt });
        } else if (STATE_BY_ACT[act]) {
          await api.updateQuestion(q.uuid, { state: STATE_BY_ACT[act] });
        } else {
          throw new Error('Nomaʼlum amal: ' + act);
        }
        await loadInto(me);
      } catch (e) {
        status('Bajarilmadi: ' + friendly(e), 'Yopish', () => loadInto(me));
      }
    },

    bulkInsert: async function (items) {
      const me = api.profile();
      status('Qoʻshilmoqda…');
      try {
        const r = await api.insertQuestions(items);
        await loadInto(me);
        if (r.skipped.length) {
          status(r.added + ' ta savol qoʻshildi · ' + r.skipped.length +
                 ' tasi oʻtkazib yuborildi (tur topilmadi)', 'Yopish', () => loadInto(me));
        }
      } catch (e) {
        status('Qoʻshilmadi: ' + friendly(e), 'Yopish', () => loadInto(me));
      }
    },
  };

  /* ── CSV qo'yish oynasi ────────────────────────────────────────────
     Nima uchun dizaynda emas: ilova runtime'i faqat onclick'ni qo'llaydi
     va DOM'ni MORPH qiladi — ya'ni har qayta chizishda textarea ichidagi
     matn xotiradagi holat bilan almashtirilardi va odam yozayotganini
     yo'qotardi. Shuning uchun maydon ilova daraxtidan tashqarida
     turadi, xuddi kirish oynasi kabi, va natijani holatga yozadi.

     Bu funksiya og'zaki savollarni kiritishning asosiy yo'li: savollar
     jadvalda (Excel/Sheets) tayyorlanadi, CSV sifatida saqlanadi va
     shu yerga qo'yiladi. */
  window.nzAdminPaste = function () {
    const app = window.nzApp;
    if (!app) return;

    const back = el('div',
      'position:fixed;inset:0;z-index:9999;display:grid;place-items:center;' +
      'background:rgba(10,8,22,.55);padding:20px');
    const card = el('div',
      'width:100%;max-width:780px;background:var(--surface);border-radius:20px;' +
      'padding:24px;box-shadow:var(--shadow);font:500 14px Manrope,system-ui,sans-serif;' +
      'color:var(--foreground);display:flex;flex-direction:column;gap:12px');

    card.appendChild(el('div',
      'font:800 20px Manrope,system-ui,sans-serif;letter-spacing:-.02em',
      'CSV matnini qoʻying'));
    card.appendChild(el('div',
      'color:var(--muted-foreground);font-size:13px;line-height:1.55',
      'Birinchi qator — sarlavha. Kerakli ustunlar: tur, savol, A, B, C, D, ' +
      'togri. Ixtiyoriy: id, E, F, izoh, holat. Variantlar 4–6 ta. Ustunlar ' +
      'nomi boʻyicha oʻqiladi, tartibi muhim emas. Ajratgich — nuqtali vergul (;).'));

    const ta = el('textarea',
      'width:100%;min-height:260px;box-sizing:border-box;padding:12px 14px;' +
      'border-radius:12px;border:1px solid var(--hairline);background:var(--surface-alt);' +
      'color:var(--foreground);resize:vertical;' +
      'font:500 12px/1.6 ui-monospace,SFMono-Regular,Menlo,monospace');
    ta.placeholder = 'tur;savol;A;B;C;D;togri;izoh';
    // Allaqachon qo'yilgan matn bo'lsa tahrirlash uchun qaytariladi.
    const cur = app.state.bulk && app.state.bulk.text;
    if (cur) ta.value = cur;
    card.appendChild(ta);

    const note = el('div', 'font-size:13px;font-weight:600;min-height:18px');
    card.appendChild(note);

    const row = el('div', 'display:flex;gap:10px;justify-content:flex-end');
    const cancel = el('button',
      'padding:12px 18px;border-radius:12px;background:var(--surface-alt);' +
      'color:var(--foreground);font:700 14px Manrope,system-ui,sans-serif;cursor:pointer',
      'Bekor qilish');
    const ok = el('button',
      'padding:12px 18px;border-radius:12px;background:var(--primary);color:#fff;' +
      'font:800 14px Manrope,system-ui,sans-serif;cursor:pointer', 'Tekshirish');
    row.appendChild(cancel);
    row.appendChild(ok);
    card.appendChild(row);

    back.appendChild(card);
    document.body.appendChild(back);
    ta.focus();

    const close = () => { if (back.parentNode) back.parentNode.removeChild(back); };
    cancel.onclick = close;
    back.onclick = e => { if (e.target === back) close(); };
    document.addEventListener('keydown', function esc(e) {
      if (e.key === 'Escape') { close(); document.removeEventListener('keydown', esc); }
    });

    ok.onclick = () => {
      const text = ta.value.trim();
      if (!text) { note.style.color = 'var(--destructive)'; note.textContent = 'Matn boʻsh'; return; }
      if (text.split('\n').filter(l => l.trim()).length < 2) {
        note.style.color = 'var(--destructive)';
        note.textContent = 'Sarlavhadan keyin bitta ham qator yoʻq';
        return;
      }
      // Tekshiruv va jadval dizaynda — biz faqat matnni holatga yozamiz.
      app.setState({ bulk: Object.assign({}, app.state.bulk || { mode: 'import' }, { text: text }) });
      close();
    };
  };

  /* ── Ishga tushirish ───────────────────────────────────────────────── */
  async function start() {
    const app = window.nzApp;
    if (!app) return;

    // Namunaviy ma'lumotni DARHOL tozalaymiz (yuqoridagi 1-qoida).
    app.setState({ questions: [], users: [], audit: [] });

    if (!api.configured()) {
      status('Baza sozlanmagan — supabase/config.json toʻldirilmagan');
      return;
    }
    status('Tekshirilmoqda…');
    try {
      const me = await api.restore();
      if (me && STAFF.indexOf(me.role) !== -1) {
        await loadInto(me);
      } else {
        if (me) api.signOut();
        status('Kirilmagan');
        showLogin(me ? 'Bu hisobda admin huquqi yoʻq (rol: ' + me.role + ')' : '');
      }
    } catch (e) {
      status('Ulanmadi: ' + friendly(e), 'Qayta urinish', start);
      showLogin();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(start, 0), { once: true });
  } else {
    setTimeout(start, 0);
  }
})();
