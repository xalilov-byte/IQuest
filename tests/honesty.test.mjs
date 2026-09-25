/* Halollik linti (CONTRACT §6, ARXITEKTURA §8.5, §14.3) — tools/honesty.mjs. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { check, lintAll } from '../tools/honesty.mjs';

const rules = (text, scope) => check(text, { scope }).map(f => f.rule);

test('taqiqlangan daʼvolar uch tilda topiladi', () => {
  const bad = [
    ['Rasmiy IQ test', 'official'],
    ['Официальный IQ-тест', 'official'],
    ['The official IQ test', 'official'],
    ['Sertifikatlangan test', 'certified'],
    ['Certified by experts', 'certified'],
    ['Mensa uslubidagi savollar', 'mensa'],
    ['Как в Менса', 'mensa'],
    ['Klinik aniqlikdagi test', 'clinical'],
    ['Clinically proven', 'clinical'],
    ['Siz aholining 90% idan aqlliroqsiz', 'percentile'],
    ['Вы умнее 90% людей', 'percentile'],
    ['You are smarter than 90% of people', 'percentile'],
    ['Your percentile: 95', 'percentile'],
    ['IQʼingizni 20 ballga oshiring', 'raise-iq'],
    ['Aqlli boʻling!', 'raise-iq'],
    ['Повысьте свой IQ за месяц', 'raise-iq'],
    ['Boost your IQ in 10 minutes a day', 'raise-iq'],
    ['Increase your IQ', 'raise-iq'],
    ['DTMga tayyorlaydi', 'dtm'],
    ['Помогает при деменции', 'health'],
    ['Helps with ADHD', 'health'],
  ];
  for (const [text, rule] of bad) {
    for (const scope of ['app', 'site', 'store']) {
      assert.ok(rules(text, scope).includes(rule), `${scope}: «${text}» → ${rule}`);
    }
  }
});

test('ilova ichida rad qilish soʻzlari taqiqlangan, saytda emas (qaror №2)', () => {
  for (const text of ['Taxminiy IQ: 104', 'Bu klinik emas', 'Norasmiy natija', 'Приблизительный результат',
                      'Unofficial estimate', 'Approximate IQ']) {
    assert.ok(rules(text, 'app').includes('disclaimer'), text);
    assert.ok(!rules(text, 'store').includes('disclaimer'), 'store: ' + text);
  }
});

test('inkor gap sayt va doʻkonda daʼvo emas; ilovada — rad qilish matni', () => {
  const neg = [
    'IQuest — klinik yoki rasmiy IQ testi emas va hech qanday tashkilot tomonidan tasdiqlanmagan.',
    'IQuest — не клинический и не официальный IQ-тест.',
    'IQuest is not an official or clinical IQ test.',
    'IQuest bu imtihonlar yoki DTM bilan bogʻliq emas.',
  ];
  for (const s of neg) {
    assert.deepEqual(rules(s, 'site'), [], 'site: ' + s);
    assert.deepEqual(rules(s, 'store'), [], 'store: ' + s);
    assert.notDeepEqual(rules(s, 'app'), [], 'app: ' + s);
  }
});

test('ruxsat etilgan matnlar oʻtadi', () => {
  const ok = [
    'Mantiqiy fikrlashni mashq qiling, natijangiz oʻsishini kuzating.',
    'Train your logical thinking and track your progress.',
    'IQuest.uz tomonidan berilgan sertifikat',
    'Oraliq 97–119',
    'Range 97–119',
    'Сертификат IQuest',
    'Haftalik ballar — Bronzadan Olmosgacha.',
    'Weekly points — from Bronze to Diamond.',
  ];
  for (const s of ok) assert.deepEqual(rules(s, 'app'), [], s);
});

test('nishon nomlarida IQ, «daho», «top %» yoʻq; kontentda faqat IQ daʼvolari', () => {
  assert.ok(rules('IQ ustasi', 'badge').includes('badge-name'));
  assert.ok(rules('Daho', 'badge').includes('badge-name'));
  assert.ok(rules('Top 5%', 'badge').includes('badge-name'));
  assert.ok(rules('Genius', 'badge').includes('badge-name'));
  assert.deepEqual(rules('Olov III', 'badge'), []);
  // Ogʻzaki savolda «rasmiy : norasmiy» — lugʻat soʻzi, daʼvo emas.
  assert.deepEqual(rules('rasmiy — norasmiy', 'content'), []);
  assert.ok(rules('Bu mashq IQ ni oshiradi', 'content').includes('raise-iq'));
});

test('butun loyiha: ilova, lugʻatlar, modullar, sayt va PLAY.md toza', async () => {
  const res = await lintAll();
  assert.deepEqual(res.map(r => `[${r.scope}] ${r.where}: ${r.rule} «${r.match}» — ${(r.sentence || r.text).slice(0, 120)}`), []);
});
