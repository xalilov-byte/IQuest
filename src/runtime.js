/* ─────────────────────────────────────────────────────────────────────────
   IQuest — mini render runtime (~140 qator, tashqi kutubxonasiz)

   Dizayn manbasi (Main.dc.html) Claude Design Canvas formatida yozilgan:
   sc-if / sc-for teglari va {{ binding }} qiymatlari. Ilova offline
   ishlashi va APK ichida og'irlik qilmasligi kerak, shuning uchun kanvas
   runtime'i o'rniga aynan shu ikki teg va binding uchun kichik render
   yozildi. Xulq bir xil: har bir setState'dan keyin qiymatlar qayta
   hisoblanadi va DOM yangilanadi.

   Muhim: DOM qayta yaratilmaydi, MORPH qilinadi (eski daraxt yangisiga
   moslanadi). Sabab — to'liq qayta yaratishda ro'yxatning scroll holati
   yo'qoladi va har bir setState'da CSS animatsiyalari qaytadan ijro
   etiladi (ekran "sakraydi"). Morph bunga yo'l qo'ymaydi.
   ───────────────────────────────────────────────────────────────────── */

const BIND_ONLY = /^\s*\{\{\s*([\w.$]+)\s*\}\}\s*$/;

function getPath(scope, path) {
  let v = scope;
  for (const p of path.split('.')) {
    if (v == null) return undefined;
    v = v[p];
  }
  return v;
}

function interp(str, scope) {
  return str.replace(/\{\{\s*([\w.$]+)\s*\}\}/g, (_, p) => {
    const v = getPath(scope, p);
    return v == null ? '' : String(v);
  });
}

function bindValue(raw, scope) {
  const m = raw.match(BIND_ONLY);
  if (m) return getPath(scope, m[1]);          // to'liq binding → asl qiymat
  if (raw.indexOf('{{') !== -1) return interp(raw, scope); // aralash → matn
  return raw;
}

/* Matnni joriy tilga oʻgiradi (i18n.js). Bogʻlanish qiymatlari allaqachon
   oʻgirilgan holda keladi (renderVals natijasi nzI18n.deep orqali oʻtadi),
   shuning uchun bu yerda faqat MARKUP'dagi statik matn oʻgiriladi.

   Nima uchun runtime ichida: dizayn faylida yuzlab matn bor va ularning
   har birini kalitga almashtirish dizaynni oʻqilmas qilardi. Manba matn
   joyida qoladi, tarjima esa chizish paytida qoʻllanadi. */
function tr(text) {
  return (window.nzI18n && text) ? window.nzI18n.t(text) : text;
}

/* Matn tuguni uchun: bogʻlanish qiymatlari qanday boʻlsa qoʻyiladi,
   ULAR ORASIDAGI matn esa oʻgiriladi.

   Nima uchun alohida funksiya: "{{ streak }} kun" kabi tugunlarda matn
   va qiymat aralash. Butun satrni oʻgirish mumkin emas (qiymat ikki
   marta oʻgirilardi), oʻgirmaslik ham mumkin emas (" kun" tarjimasiz
   qolardi). Shuning uchun faqat statik boʻlaklar oʻgiriladi.

   interp() esa oʻzgarmaydi: u uslub va boshqa atributlar uchun ham
   ishlatiladi, ularni oʻgirish CSS'ni buzadi. */
function interpText(str, scope) {
  return str.replace(/([^{]*)(\{\{\s*[\w.$]+\s*\}\})?/g, (m, lit, bind) => {
    let out = lit ? tr(lit) : '';
    if (bind) {
      const path = bind.replace(/[{}\s]/g, '');
      const v = getPath(scope, path);
      out += v == null ? '' : String(v);
    }
    return out;
  });
}

/* Template daraxtini (inert) qiymatlar bilan haqiqiy DOM'ga aylantiradi. */
function build(tplNodes, scope, out) {
  for (const n of tplNodes) {
    if (n.nodeType === 3) {
      const t = n.nodeValue;
      const filled = t.indexOf('{{') !== -1 ? interpText(t, scope) : tr(t);
      out.appendChild(document.createTextNode(filled));
      continue;
    }
    if (n.nodeType !== 1) continue;

    const tag = n.tagName.toLowerCase();

    if (tag === 'sc-if') {
      if (bindValue(n.getAttribute('value') || '', scope)) build(n.childNodes, scope, out);
      continue;
    }

    if (tag === 'sc-for') {
      const list = bindValue(n.getAttribute('list') || '', scope);
      const as = n.getAttribute('as') || 'item';
      if (Array.isArray(list)) {
        for (let i = 0; i < list.length; i++) {
          const child = Object.create(scope);
          child[as] = list[i];
          child[as + 'Index'] = i;
          build(n.childNodes, child, out);
        }
      }
      continue;
    }

    // cloneNode(false) — teg va namespace saqlanadi (SVG uchun muhim)
    const el = n.cloneNode(false);

    for (const attr of Array.from(el.attributes)) {
      const name = attr.name;
      const raw = attr.value;

      if (name.indexOf('hint-') === 0) { el.removeAttribute(name); continue; }
      if (raw.indexOf('{{') === -1) continue;

      const val = bindValue(raw, scope);

      if (name === 'onclick') {
        el.removeAttribute('onclick');
        if (typeof val === 'function') el.__click = val;   // delegatsiya orqali chaqiriladi
        continue;
      }
      if (name === 'style' && val && typeof val === 'object') {
        el.removeAttribute('style');
        Object.assign(el.style, val);
        continue;
      }
      if (val == null || val === false) el.removeAttribute(name);
      else el.setAttribute(name, String(val));
    }

    /* Matnli atributlar (ekran oʻqiruvchi uchun) ham oʻgiriladi. Bunda
       bogʻlanishsiz, toʻgʻridan-toʻgʻri yozilgan qiymatlar qamraladi. */
    for (const name of ['aria-label', 'placeholder', 'title']) {
      const raw = el.getAttribute(name);
      if (raw && raw.indexOf('{{') === -1) el.setAttribute(name, tr(raw));
    }

    build(n.childNodes, scope, el);
    out.appendChild(el);
  }
}

/* Eski DOM'ni yangisiga moslash. Ro'yxatlar tartibi barqaror bo'lgani uchun
   pozitsion solishtirish yetarli. */
function morph(oldN, newN) {
  if (oldN.nodeType !== newN.nodeType || oldN.nodeName !== newN.nodeName) {
    oldN.replaceWith(newN);
    return;
  }
  if (oldN.nodeType === 3) {
    if (oldN.nodeValue !== newN.nodeValue) oldN.nodeValue = newN.nodeValue;
    return;
  }
  if (oldN.nodeType !== 1) return;

  oldN.__click = newN.__click;

  if (oldN.getAttribute('style') !== newN.getAttribute('style')) {
    if (newN.hasAttribute('style')) oldN.setAttribute('style', newN.getAttribute('style'));
    else oldN.removeAttribute('style');
  }
  for (const a of Array.from(newN.attributes)) {
    if (a.name === 'style') continue;
    if (oldN.getAttribute(a.name) !== a.value) oldN.setAttribute(a.name, a.value);
  }
  for (const a of Array.from(oldN.attributes)) {
    if (!newN.hasAttribute(a.name)) oldN.removeAttribute(a.name);
  }

  const oc = Array.from(oldN.childNodes);
  const nc = Array.from(newN.childNodes);
  for (let i = 0; i < Math.max(oc.length, nc.length); i++) {
    if (i >= nc.length) { oc[i].remove(); continue; }
    if (i >= oc.length) { oldN.appendChild(nc[i]); continue; }
    morph(oc[i], nc[i]);
  }
}

/* ── Komponent asosi ── */
class DCLogic {
  constructor(props) { this.props = props || {}; }
  setState(patch) {
    const next = typeof patch === 'function' ? patch(this.state) : patch;
    this.state = Object.assign({}, this.state, next);
    schedule();
  }
}

let APP = null, ROOT = null, TPL = null, queued = false;

function schedule() {
  if (queued) return;
  queued = true;
  requestAnimationFrame(() => { queued = false; draw(); });
}

function draw() {
  const frag = document.createDocumentFragment();
  build(TPL.content.childNodes, APP.renderVals(), frag);
  if (!ROOT.firstChild) { ROOT.appendChild(frag); return; }
  const oc = Array.from(ROOT.childNodes);
  const nc = Array.from(frag.childNodes);
  for (let i = 0; i < Math.max(oc.length, nc.length); i++) {
    if (i >= nc.length) { oc[i].remove(); continue; }
    if (i >= oc.length) { ROOT.appendChild(nc[i]); continue; }
    morph(oc[i], nc[i]);
  }
}

function mount(ComponentClass, props, rootEl, templateEl) {
  ROOT = rootEl;
  TPL = templateEl;
  APP = new ComponentClass(props);

  rootEl.addEventListener('click', e => {
    let n = e.target;
    while (n && n !== rootEl) {
      if (n.__click) { n.__click(e); return; }
      n = n.parentNode;
    }
  });

  draw();
  if (APP.componentDidMount) APP.componentDidMount();
  return APP;
}
