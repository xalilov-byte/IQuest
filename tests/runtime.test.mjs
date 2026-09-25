/* ─────────────────────────────────────────────────────────────────────────
   src/runtime.js — kichik render runtime tekshiruvi

   NIMA UCHUN: v1.1 da ilovaga birinchi marta matn kiritish (profil nomi,
   bio) va fayl tanlash (rasm) keladi. Runtime esa DOM'ni har setState'da
   pozitsion MORPH qiladi. Agar morph input qiymatiga tegsa, har harfdan
   keyin kursor oxiriga sakraydi va IME (kirill/oʻzbek klaviatura)
   yozayotgan soʻz uziladi — bu faqat qurilmada koʻrinadigan, jim xato.
   Shuning uchun qoidalar shu yerda isbotlanadi (ARXITEKTURA §9.6, §13.2 U1):
     · onInput / onChange delegatsiya orqali ishlaydi;
     · `value` atributi faqat yaratishda qoʻyiladi, `.value`ga runtime
       hech qachon yozmaydi;
     · textarea matni qayta chizishda tegilmaydi;
     · element (va fokus) qayta yaratilmaydi.

   Brauzer yoʻq (CI da ham) — shuning uchun runtime node:vm ichida juda
   kichik soxta DOM bilan yuritiladi. Soxta DOM faqat runtime ishlatadigan
   narsalarni biladi; runtime yangi DOM API'ga tayansa, test aniq xato
   bilan yiqiladi (jim oʻtmaydi).
   ───────────────────────────────────────────────────────────────────── */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';

const SRC = fs.readFileSync(new URL('../src/runtime.js', import.meta.url), 'utf8');

/* ── Soxta DOM ────────────────────────────────────────────────────────── */
class Node {
  constructor() { this.childNodes = []; this.parentNode = null; this.listeners = {}; }
  get firstChild() { return this.childNodes[0] || null; }
  appendChild(c) {
    if (c.nodeType === 11) { c.childNodes.slice().forEach(x => this.appendChild(x)); return c; }
    if (c.parentNode) c.parentNode._drop(c);
    c.parentNode = this;
    this.childNodes.push(c);
    return c;
  }
  _drop(c) { const i = this.childNodes.indexOf(c); if (i !== -1) this.childNodes.splice(i, 1); c.parentNode = null; }
  remove() { if (this.parentNode) this.parentNode._drop(this); }
  replaceWith(n) {
    const p = this.parentNode;
    if (!p) return;
    if (n.parentNode) n.parentNode._drop(n);
    const i = p.childNodes.indexOf(this);
    p.childNodes[i] = n; n.parentNode = p; this.parentNode = null;
  }
  addEventListener(type, fn) { (this.listeners[type] = this.listeners[type] || []).push(fn); }
  get textContent() { return this.childNodes.map(c => c.textContent).join(''); }
}

class Text extends Node {
  constructor(v) { super(); this.nodeType = 3; this.nodeName = '#text'; this.nodeValue = v; }
  get textContent() { return this.nodeValue; }
  cloneNode() { return new Text(this.nodeValue); }
}

class Fragment extends Node {
  constructor() { super(); this.nodeType = 11; this.nodeName = '#document-fragment'; }
}

class Element extends Node {
  constructor(tag) {
    super();
    this.nodeType = 1;
    this.tagName = tag.toUpperCase();
    this.nodeName = this.tagName;
    this.attributes = [];
    this._value = '';
    this.valueWrites = 0;          // runtime .value ga yozdimi — shu sanaydi
    const self = this;
    this._style = {};
    this.style = new Proxy(this._style, {
      set(t, k, v) { t[k] = v; self._attrSet('style', Object.keys(t).map(x => x + ':' + t[x]).join(';')); return true; }
    });
  }
  _attrSet(name, value) {
    const a = this.attributes.find(x => x.name === name);
    if (a) a.value = String(value); else this.attributes.push({ name, value: String(value) });
  }
  getAttribute(n) { const a = this.attributes.find(x => x.name === n); return a ? a.value : null; }
  setAttribute(n, v) {
    this._attrSet(n, v);
    // Brauzerdagidek: value atributi faqat "iflos" bo'lmagan inputning qiymatini o'zgartiradi.
    if (n === 'value' && !this.dirty) this._value = String(v);
  }
  removeAttribute(n) { this.attributes = this.attributes.filter(x => x.name !== n); }
  hasAttribute(n) { return this.attributes.some(x => x.name === n); }
  cloneNode() {
    const e = new Element(this.tagName.toLowerCase());
    this.attributes.forEach(a => e.attributes.push({ name: a.name, value: a.value }));
    if (this.hasAttribute('value')) e._value = this.getAttribute('value');
    return e;
  }
  get value() { return this._value; }
  set value(v) { this.valueWrites++; this._value = String(v); }
  /* Foydalanuvchi yozishi — .value ni to'g'ridan-to'g'ri (hisoblamasdan). */
  type(v) { this._value = v; this.dirty = true; }
}

function parse(html) {
  const VOID = new Set(['input', 'img', 'br']);
  const root = new Fragment();
  const stack = [root];
  const re = /<\/([\w-]+)\s*>|<([\w-]+)((?:\s+[\w:-]+(?:="[^"]*")?)*)\s*\/?>|([^<]+)/g;
  let m;
  while ((m = re.exec(html))) {
    const top = stack[stack.length - 1];
    if (m[1]) { stack.pop(); continue; }
    if (m[2]) {
      const el = new Element(m[2]);
      const ar = /([\w:-]+)(?:="([^"]*)")?/g;
      let a;
      while ((a = ar.exec(m[3] || ''))) el.attributes.push({ name: a[1].toLowerCase(), value: a[2] || '' });
      top.appendChild(el);
      if (!VOID.has(m[2].toLowerCase()) && !/\/>$/.test(m[0])) stack.push(el);
      continue;
    }
    if (m[4] && m[4].trim()) top.appendChild(new Text(m[4]));
  }
  return root;
}

function dispatch(type, target, extra) {
  const e = Object.assign({ type, target }, extra || {});
  for (let n = target; n; n = n.parentNode) (n.listeners[type] || []).forEach(fn => fn(e));
  return e;
}

function find(node, pred) {
  if (node.nodeType === 1 && pred(node)) return node;
  for (const c of node.childNodes) { const r = find(c, pred); if (r) return r; }
  return null;
}
const byId = (root, id) => find(root, n => n.getAttribute('id') === id);

/* Runtime'ni yangi kontekstda yuklaydi. requestAnimationFrame navbatga
   yig'iladi va flush() bilan qo'lda bajariladi. */
function load() {
  const frames = [];
  const document = {
    createElement: t => new Element(t),
    createTextNode: v => new Text(v),
    createDocumentFragment: () => new Fragment(),
  };
  const ctx = vm.createContext({ document, window: {}, requestAnimationFrame: f => frames.push(f), console });
  vm.runInContext(SRC + '\n;globalThis.__rt = { mount, DCLogic };', ctx);
  const flush = () => { while (frames.length) frames.shift()(); };
  return { rt: ctx.__rt, flush };
}

function app(html, Cls) {
  const { rt, flush } = load();
  const root = new Element('div');
  const tpl = { content: parse(html) };
  const inst = rt.mount(Cls(rt.DCLogic), {}, root, tpl);
  return { inst, root, flush };
}

/* ── Testlar ──────────────────────────────────────────────────────────── */

test('onInput: hodisa delegatsiya orqali keladi va holat yangilanadi', () => {
  const { inst, root, flush } = app(
    '<div><input id="u" value="{{ name }}" onInput="{{ onName }}"><span id="s">{{ name }}</span></div>',
    D => class extends D {
      constructor(p) { super(p); this.state = { name: 'ali' }; }
      renderVals() { return { name: this.state.name, onName: e => this.setState({ name: e.target.value }) }; }
    });
  const input = byId(root, 'u');
  assert.equal(input.value, 'ali', 'boshlangʻich qiymat value atributidan');
  input.type('alisher');
  dispatch('input', input);
  flush();
  assert.equal(inst.state.name, 'alisher');
  assert.equal(byId(root, 's').textContent, 'alisher', 'boshqa joy qayta chizildi');
  assert.equal(byId(root, 'u'), input, 'input qayta yaratilmadi (fokus saqlanadi)');
});

test('morph input qiymatiga tegmaydi: value atributi faqat yaratishda', () => {
  const { inst, root, flush } = app(
    '<div><input id="u" value="{{ name }}" onInput="{{ onName }}"><textarea id="t" onInput="{{ onBio }}">{{ bio }}</textarea></div>',
    D => class extends D {
      constructor(p) { super(p); this.state = { name: 'a', bio: 'b' }; }
      renderVals() {
        return { name: this.state.name.toUpperCase(), bio: this.state.bio + '!',
                 onName: e => this.setState({ name: e.target.value }),
                 onBio: e => this.setState({ bio: e.target.value }) };
      }
    });
  const input = byId(root, 'u'), ta = byId(root, 't');
  input.type('ab');
  dispatch('input', input);
  ta.type('bc');
  dispatch('input', ta);
  flush();
  assert.equal(inst.state.name, 'ab');
  assert.equal(input.getAttribute('value'), 'A', 'value atributi yaratishdagidek qoldi');
  assert.equal(input.value, 'ab', 'foydalanuvchi yozgani saqlandi');
  assert.equal(input.valueWrites, 0, 'runtime .value ga hech qachon yozmaydi');
  assert.equal(ta.textContent, 'b!', 'textarea matni qayta chizilmadi');
  assert.equal(ta.value, 'bc');
  assert.equal(ta.valueWrites, 0);
});

test('ishlovchi har chizishda yangilanadi (eski yopilma qolib ketmaydi)', () => {
  const seen = [];
  const { inst, root, flush } = app(
    '<div><input id="u" onInput="{{ onName }}"><b>{{ n }}</b></div>',
    D => class extends D {
      constructor(p) { super(p); this.state = { n: 0 }; }
      renderVals() { const n = this.state.n; return { n: String(n), onName: () => { seen.push(n); this.setState({ n: n + 1 }); } }; }
    });
  const input = byId(root, 'u');
  dispatch('input', input); flush();
  dispatch('input', input); flush();
  dispatch('input', input); flush();
  assert.deepEqual(seen, [0, 1, 2]);
  assert.equal(inst.state.n, 3);
});

test('onChange: yashirin fayl inputi hodisani oladi', () => {
  let got = null;
  const { root } = app(
    '<div><input id="f" type="file" accept="image/jpeg,image/png,image/webp" onChange="{{ onFile }}" style="display:none"></div>',
    D => class extends D {
      constructor(p) { super(p); this.state = {}; }
      renderVals() { return { onFile: e => { got = e.target.files; } }; }
    });
  const f = byId(root, 'f');
  f.files = ['rasm.jpg'];
  dispatch('change', f);
  assert.deepEqual(got, ['rasm.jpg']);
  assert.equal(f.getAttribute('accept'), 'image/jpeg,image/png,image/webp');
  assert.equal(f.hasAttribute('capture'), false, 'capture yoʻq — faqat tizim tanlagichi (Play foto siyosati)');
});

test('onClick delegatsiyasi ichki elementdan ham ishlaydi', () => {
  let n = 0;
  const { root } = app(
    '<div><button id="b" onClick="{{ go }}"><span id="in">x</span></button></div>',
    D => class extends D {
      constructor(p) { super(p); this.state = {}; }
      renderVals() { return { go: () => { n++; } }; }
    });
  dispatch('click', byId(root, 'in'));
  assert.equal(n, 1);
});

test('visibility bilan yashirilgan yordam qatori inputni qayta yaratmaydi', () => {
  const { inst, root, flush } = app(
    '<div><span style="{{ errStyle }}">xato</span><input id="u" onInput="{{ onName }}"></div>',
    D => class extends D {
      constructor(p) { super(p); this.state = { bad: false }; }
      renderVals() {
        return { errStyle: { visibility: this.state.bad ? 'visible' : 'hidden' },
                 onName: () => this.setState({ bad: !this.state.bad }) };
      }
    });
  const input = byId(root, 'u');
  dispatch('input', input); flush();
  assert.equal(inst.state.bad, true);
  assert.equal(byId(root, 'u'), input, 'yordam qatori koʻrinsa ham input oʻsha element');
});

test('hint- atributlari olib tashlanadi, uslub obyekti qoʻllanadi', () => {
  const { root } = app(
    '<div id="d" hint-placeholder-val="1" style="{{ st }}"></div>',
    D => class extends D {
      constructor(p) { super(p); this.state = {}; }
      renderVals() { return { st: { height: '18px' } }; }
    });
  const d = byId(root, 'd');
  assert.equal(d.hasAttribute('hint-placeholder-val'), false);
  assert.equal(d._style.height, '18px');
});

test('componentDidUpdate har chizishdan keyin chaqiriladi', () => {
  let calls = 0;
  const { inst, flush } = app('<div>{{ n }}</div>', D => class extends D {
    constructor(p) { super(p); this.state = { n: 1 }; }
    renderVals() { return { n: String(this.state.n) }; }
    componentDidUpdate() { calls++; }
  });
  const before = calls;
  inst.setState({ n: 2 }); flush();
  assert.equal(calls, before + 1);
});
