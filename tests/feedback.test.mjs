/* ─────────────────────────────────────────────────────────────────────────
   src/feedback.js — 12 ta ovoz va tebranish (ARXITEKTURA §9.5, §14)

   AudioContext taqlidi har gain qiymatini va har oscillator start/stop
   vaqtini yozib oladi. Tekshiriladi: har nom chalinadi, choʻqqi gain
   ≤0,16 (fanfaralar ≤0,12), davomiylik jadvalga mos, ovoz oʻchiq →
   jim, tebranish alohida, 60 ms qoidasi, fonda jim, eski taxalluslar.

   Ishga tushirish:  npm test
   ───────────────────────────────────────────────────────────────────── */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';

const SRC = fs.readFileSync(new URL('../src/feedback.js', import.meta.url), 'utf8');

const TABLE = {
  select: [0.03, 6], correct: [0.25, 18], wrong: [0.32, [26, 45, 26]],
  finish: [0.5, [18, 60, 18, 60, 30]], gameStart: [0.08, 12], levelUp: [0.45, [15, 30, 15]],
  coin: [0.16, 12], purchase: [0.3, 25], badge: [0.9, [20, 40, 20, 40, 40]],
  leagueUp: [1.1, [30, 50, 30]], streak: [0.28, 15], denied: [0.15, 20],
};
const FANFARES = ['finish', 'levelUp', 'badge', 'leagueUp'];

function env(opts) {
  const o = opts || {};
  const log = { gains: [], starts: [], stops: [], contexts: 0, vib: [], resumed: 0, suspended: 0 };
  let now = 1000;
  function param(owner) {
    const p = {
      value: 0,
      setValueAtTime(v) { p.value = v; if (owner) owner.vals.push(v); },
      linearRampToValueAtTime(v) { if (owner) owner.vals.push(v); },
      exponentialRampToValueAtTime(v) { if (owner) owner.vals.push(v); },
      cancelScheduledValues() {},
    };
    return p;
  }
  class Node { connect() {} disconnect() {} }
  class AC {
    constructor() { log.contexts++; this.currentTime = 5; this.state = o.suspended ? 'suspended' : 'running'; this.sampleRate = 8000; this.destination = new Node(); }
    createGain() { const g = new Node(); g.vals = []; g.gain = param(g); log.gains.push(g); return g; }
    createOscillator() {
      const n = new Node(); n.frequency = param(null); n.type = 'sine';
      n.start = t => log.starts.push({ t, n }); n.stop = t => log.stops.push(t); return n;
    }
    createBiquadFilter() { const n = new Node(); n.frequency = param(null); n.Q = param(null); return n; }
    createBuffer(ch, len) { const d = new Float32Array(len); return { getChannelData: () => d }; }
    createBufferSource() { const n = new Node(); n.start = t => log.starts.push({ t, n }); n.stop = t => log.stops.push(t); return n; }
    resume() { log.resumed++; this.state = 'running'; return Promise.resolve(); }
    suspend() { log.suspended++; this.state = 'suspended'; return Promise.resolve(); }
  }
  const listeners = {};
  const doc = {
    visibilityState: 'visible',
    addEventListener(ev, fn) { (listeners[ev] = listeners[ev] || []).push(fn); },
    removeEventListener(ev, fn) { listeners[ev] = (listeners[ev] || []).filter(f => f !== fn); },
  };
  class FakeDate extends Date { static now() { return now; } }
  const ctx = {
    window: o.noAudio ? {} : { AudioContext: AC },
    document: doc,
    navigator: o.noVibrate ? {} : { vibrate: p => { log.vib.push(p); return true; } },
    Date: FakeDate,
    Promise,
  };
  vm.createContext(ctx);
  vm.runInContext(SRC, ctx);
  return {
    f: ctx.window.nzFeedback, log, doc,
    tick: ms => { now += ms; },
    fire: ev => (listeners[ev] || []).slice().forEach(fn => fn()),
    reset: () => { log.gains.length = 0; log.starts.length = 0; log.stops.length = 0; log.vib.length = 0; },
  };
}

const peak = gains => Math.max(0, ...gains.flatMap(g => g.vals));

test('12 ta nom, har biri chalinadi va jadvaldagi tebranishni beradi', () => {
  const e = env();
  assert.deepEqual([...e.f.names()].sort(), Object.keys(TABLE).sort());
  for (const name of Object.keys(TABLE)) {
    e.reset();
    e.tick(1000);
    assert.equal(e.f.play(name), true, name);
    assert.ok(e.log.starts.length >= 1, `${name}: ovoz manbasi boshlandi`);
    assert.deepEqual(JSON.parse(JSON.stringify(e.log.vib)), [TABLE[name][1]], `${name}: tebranish`);
  }
});

test('choʻqqi gain ≤ 0,16, fanfaralar ≤ 0,12; davomiylik jadvalga mos', () => {
  const e = env();
  const limits = e.f.limits;
  assert.equal(limits.peak, 0.16);
  assert.equal(limits.fanfare, 0.12);
  for (const name of Object.keys(TABLE)) {
    e.reset();
    e.tick(1000);
    e.f.play(name);
    const voiceGains = e.log.gains.filter(g => g.vals.length);    // master gain emas
    const max = FANFARES.includes(name) ? 0.12 : 0.16;
    assert.ok(peak(voiceGains) <= max + 1e-9, `${name}: choʻqqi ${peak(voiceGains)} > ${max}`);
    assert.ok(peak(voiceGains) > 0.01, `${name}: eshitiladi`);
    const t0 = Math.min(...e.log.starts.map(s => s.t));
    const end = Math.max(...e.log.stops) - t0;
    const dur = TABLE[name][0];
    assert.ok(end >= dur * 0.9 && end <= dur + 0.05, `${name}: davomiylik ${end.toFixed(3)} ≈ ${dur}`);
  }
});

test('ovoz oʻchiq → jim, lekin tebranish ishlaydi; tebranish oʻchiq → faqat ovoz', () => {
  const e = env();
  e.f.configure({ sound: false });
  e.f.play('correct');
  assert.equal(e.log.starts.length, 0);
  assert.equal(e.log.contexts, 0, 'ovoz oʻchiq — kontekst umuman yaratilmaydi');
  assert.deepEqual(JSON.parse(JSON.stringify(e.log.vib)), [18]);

  e.reset(); e.tick(1000);
  e.f.configure({ sound: true, haptics: false });
  e.f.play('correct');
  assert.ok(e.log.starts.length > 0);
  assert.equal(e.log.vib.length, 0);

  e.reset(); e.tick(1000);
  assert.deepEqual(JSON.parse(JSON.stringify(e.f.configure({ sound: false, haptics: false }))), { sound: false, haptics: false });
  assert.equal(e.f.play('badge'), false);
  assert.equal(e.log.starts.length + e.log.vib.length, 0);
});

test('configure faqat berilgan maydonni oʻzgartiradi', () => {
  const e = env();
  e.f.configure({ haptics: false });
  assert.deepEqual(JSON.parse(JSON.stringify(e.f.config())), { sound: true, haptics: false });
  e.f.configure({ sound: 'x' });
  assert.equal(e.f.config().sound, true);
});

test('60 ms ichida bittadan ortiq ovoz yoʻq; muhimrogʻi oldingisini almashtiradi', () => {
  const e = env();
  assert.equal(e.f.play('select'), true);
  e.tick(20);
  assert.equal(e.f.play('select'), false, 'ikki marta bosish');
  e.tick(20);
  assert.equal(e.f.play('levelUp'), true, 'muhimroq');
  e.tick(10);
  assert.equal(e.f.play('finish'), false, 'kamroq muhim');
  e.tick(61);
  assert.equal(e.f.play('select'), true, '60 ms oʻtdi');
});

test('fonda ovoz ham, tebranish ham yoʻq; fonga oʻtganda kontekst uxlaydi', () => {
  const e = env();
  e.f.play('select');
  e.reset(); e.tick(100);
  e.doc.visibilityState = 'hidden';
  e.fire('visibilitychange');
  assert.equal(e.f.play('correct'), false);
  assert.equal(e.log.starts.length + e.log.vib.length, 0);
  assert.ok(e.log.suspended >= 1);
  e.doc.visibilityState = 'visible';
  assert.equal(e.f.play('correct'), true);
  e.tick(100);
  e.f.background(true);
  assert.equal(e.f.play('wrong'), false, 'Android appStateChange orqali');
  e.f.background(false);
  assert.equal(e.f.play('wrong'), true);
});

test('birinchi bosishda kontekst tiklanadi', () => {
  const e = env({ suspended: true });
  e.fire('pointerdown');
  assert.equal(e.log.contexts, 1);
  assert.ok(e.log.resumed >= 1);
});

test('notoʻgʻri nom, AudioContext yoʻq, vibrate yoʻq — yiqilmaydi', () => {
  const e = env({ noAudio: true, noVibrate: true });
  assert.equal(e.f.play('nope'), false);
  assert.equal(e.f.play('toString'), false);
  assert.equal(e.f.canVibrate(), false);
  assert.doesNotThrow(() => e.f.play('badge'));
  assert.equal(env().f.canVibrate(), true);
});

test('eski taxalluslar: correct/wrong/finish/setEnabled/isEnabled', () => {
  const e = env();
  e.f.correct();
  assert.ok(e.log.starts.length > 0);
  e.tick(100);
  e.f.setEnabled(false);
  assert.equal(e.f.isEnabled(), false);
  e.reset();
  e.f.wrong(); e.tick(100); e.f.finish();
  assert.equal(e.log.starts.length + e.log.vib.length, 0, '1.0 dagi «Ovoz: Oʻchiq» tebranishni ham oʻchirardi');
  e.f.setEnabled(true);
  e.tick(100);
  e.f.finish();
  assert.ok(e.log.starts.length > 0);
});
