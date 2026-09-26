# IQuest — promo video: ovoz matni / текст озвучки

> `node tools/mkplaykit.mjs --only=docs` yozadi. Vaqtlar videodagi sahnalar bilan **aynan bir xil** (`TIMELINES` — `tools/mkplaykit.mjs`); har qatorning oynaga sigʻishi skriptda tekshiriladi (≤ 5 boʻgʻin/s va 140 soʻz/daqiqa, pauza va tire bilan) — sigʻmasa skript yiqiladi.

> Videoda ovoz yoʻq. TTS/diktor ovozini qoʻshish (video uzunligi saqlanadi, ovoz qisqa boʻlsa oxiri jimlik bilan toʻldiriladi):
>
> ```sh
> ffmpeg -i video.mp4 -i vo.wav -map 0:v -map 1:a -c:v copy -af apad -c:a aac -t 30 out.mp4   # 30 s
> ffmpeg -i video.mp4 -i vo.wav -map 0:v -map 1:a -c:v copy -af apad -c:a aac -t 15 out.mp4   # 15 s (promo15-*)
> ```

Halollik: matnlar `tools/honesty.mjs` (scope: store) dan oʻtgan — «IQ oshiradi», «rasmiy», persentil, liga/reyting, narx («bepul») va doʻkon nomi yoʻq (CONTRACT §6, PLAY.md; Play preview talablari).

Ekrandagi yakun: **Play videosi** (`promo-horizontal-1920x1080*.mp4`, 30 s) — «IQ test va aql oʻyinlari» / «IQ-тест и игры для ума»; qolgan kesimlar (vertikal, 15 s) — «Google Playʼda» / «в Google Play». Ovoz matni hammasida bir xil.

## Oʻzbekcha (lotin)

### 30 s — soʻz: 41 (30 s; nutq oynalarida ≈ 96 wpm)

Video: `video/promo-vertical-1080x1920.mp4`, `video/promo-horizontal-1920x1080.mp4` · TTS: `voiceover/uz-30s.txt` / `.ssml`

| Sahna (video) | Ovoz oynasi | Sahna | Ekranda (sarlavha) | Ovoz | Soʻz | Boʻgʻin | Boʻgʻin/s | Kerak / oyna |
|---|---|---|---|---|---|---|---|---|
| 00:00.0–00:01.5 | 00:00.1–00:00.9 | intro | IQ test va aql oʻyinlari | IQuest. | 1 | 2 | 2.5 | 0.4 / 0.8 s |
| 00:01.5–00:07.5 | 00:01.8–00:07.2 | test | Mantiqni sinab koʻring | Matritsa, shakl, soʻz va sonlar: [p200] mantiqingizni sinab koʻring. | 8 | 17 | 3.3 | 3.6 / 5.4 s |
| 00:07.5–00:11.5 | 00:07.8–00:11.2 | result | IQ natijasi va oraliq | Test soʻngida — IQ natijasi va oraligʻi. | 6 | 15 | 4.6 | 3.1 / 3.4 s |
| 00:11.5–00:15.5 | 00:11.8–00:15.2 | explain | Har javobga izoh | Xato qildingizmi? [p250] Har bir javobga izoh bor. | 7 | 14 | 4.4 | 3.3 / 3.4 s |
| 00:15.5–00:21.0 | 00:15.8–00:20.7 | game | 6 ta IQ oʻyini | Olti xil IQ oʻyini: [p150] xotira, diqqat va tezlik. | 8 | 16 | 3.4 | 3.6 / 4.9 s |
| 00:21.0–00:25.5 | 00:21.3–00:25.2 | shop | Profilingizni bezang | Tanga yigʻing [p150] va profilingizni nishonlar bilan bezang. | 7 | 17 | 4.5 | 3.5 / 3.9 s |
| 00:25.5–00:30.0 | 00:25.8–00:29.6 | outro | IQ test va aql oʻyinlari (Play) / Google Playʼda · 4 tilda · Internetsiz | IQuest. [p300] Toʻrt tilda, internetsiz. | 4 | 9 | 2.6 | 2.1 / 3.8 s |

Eng aniq sinxron: har qatorni **alohida** TTS qiling va «Ovoz oynasi» boshiga qoʻying. «Kerak» — 5 boʻgʻin/s (yoki 140 soʻz/daqiqa, qaysi uzun boʻlsa) + pauzalar; hammasi oynadan qisqa, tezlashtirish kerak emas. Butun matnni bitta faylda oʻqitsangiz, SSML dagi pauzalar qatorlarni taxminan shu vaqtlarga qoʻyadi.

### 15 s — soʻz: 20 (15 s; nutq oynalarida ≈ 94 wpm)

Video: `video/promo15-vertical-1080x1920.mp4`, `video/promo15-horizontal-1920x1080.mp4` · TTS: `voiceover/uz-15s.txt` / `.ssml`

| Sahna (video) | Ovoz oynasi | Sahna | Ekranda (sarlavha) | Ovoz | Soʻz | Boʻgʻin | Boʻgʻin/s | Kerak / oyna |
|---|---|---|---|---|---|---|---|---|
| 00:00.0–00:01.0 | 00:00.1–00:00.9 | intro | IQ test va aql oʻyinlari | IQuest. | 1 | 2 | 2.5 | 0.4 / 0.8 s |
| 00:01.0–00:05.0 | 00:01.2–00:04.7 | test | Mantiqni sinab koʻring | Mantiqni sinab koʻring: [p150] matritsa, shakl va soʻzlar. | 7 | 14 | 4.2 | 3.1 / 3.5 s |
| 00:05.0–00:08.5 | 00:05.3–00:08.2 | result | IQ natijasi va oraliq | IQ natijasi — oraliq bilan. | 4 | 11 | 4.0 | 2.4 / 2.9 s |
| 00:08.5–00:12.0 | 00:08.8–00:11.7 | game | 6 ta IQ oʻyini | Olti xil IQ oʻyini. | 4 | 8 | 2.8 | 1.7 / 2.9 s |
| 00:12.0–00:15.0 | 00:12.2–00:14.8 | outro | IQ test va aql oʻyinlari (Play) / Google Playʼda · 4 tilda · Internetsiz | IQuest. [p200] Toʻrt tilda, internetsiz. | 4 | 9 | 3.7 | 2.0 / 2.6 s |

Eng aniq sinxron: har qatorni **alohida** TTS qiling va «Ovoz oynasi» boshiga qoʻying. «Kerak» — 5 boʻgʻin/s (yoki 140 soʻz/daqiqa, qaysi uzun boʻlsa) + pauzalar; hammasi oynadan qisqa, tezlashtirish kerak emas. Butun matnni bitta faylda oʻqitsangiz, SSML dagi pauzalar qatorlarni taxminan shu vaqtlarga qoʻyadi.

### TTS koʻrsatmalari

- Ohang — sokin, ishonchli, «premium»; baqirmaslik, sotuvchi ohangi emas. Tezlik ≈ 140 soʻz/daqiqa, lekin asosiy mezon — **≤ 5 boʻgʻin/s** (jadvaldagi «boʻgʻin/s» ustuni — oynaga nisbatan, pauzalarsiz; skript hammasini ≤ 5 da ushlaydi).
- [p200] — 200 ms pauza (SSML: `<break time="200ms"/>`). «—» (tire) — qisqa pauza ~150 ms.
- Talaffuz: **IQuest** = «ay-kvest» (urgʻu 2-boʻgʻinda: ay-KVEST); **IQ** = «ay-kyu». SSML fayllarda bu `<sub alias>` bilan yozilgan.
- Urgʻu (ovoz bilan ajratish): *sinab koʻring*, *oraligʻi*, *izoh*, *olti*, *bezang*, *internetsiz*. Oʻzbekcha soʻz urgʻusi odatda oxirgi boʻgʻinda.
- ʻ (U+02BB) va ʼ (U+02BC) belgilari — TTS tanimasa «o‘», «g‘» yoki oddiy apostrof bilan almashtiring.
- Raqamlar soʻz bilan yozilgan (olti, toʻrt) — shunday oʻqilsin.

## Русский

### 30 s — слов: 38 (30 s; в окнах речи ≈ 89 wpm)

Video: `video/promo-vertical-1080x1920-ru.mp4`, `video/promo-horizontal-1920x1080-ru.mp4` · TTS: `voiceover/ru-30s.txt` / `.ssml`

| Сцена (видео) | Окно речи | Сцена | На экране (титр) | Голос | Слов | Слогов | Слог/с | Нужно / окно |
|---|---|---|---|---|---|---|---|---|
| 00:00.0–00:01.5 | 00:00.1–00:00.9 | intro | IQ-тест и игры для ума | IQuest. | 1 | 2 | 2.5 | 0.4 / 0.8 s |
| 00:01.5–00:07.5 | 00:01.8–00:07.2 | test | Проверьте свою логику | Матрицы, фигуры, слова и числа: [p200] проверьте свою логику. | 8 | 19 | 3.7 | 4.0 / 5.4 s |
| 00:07.5–00:11.5 | 00:07.8–00:11.2 | result | Результат IQ и диапазон | Сразу после теста — IQ и диапазон. | 6 | 13 | 4.0 | 2.8 / 3.4 s |
| 00:11.5–00:15.5 | 00:11.8–00:15.2 | explain | Разбор каждого ответа | Ошиблись? [p250] К каждому ответу — понятный разбор. | 6 | 14 | 4.7 | 3.2 / 3.4 s |
| 00:15.5–00:21.0 | 00:15.8–00:20.7 | game | 6 IQ-игр для ума | Шесть IQ-игр: [p150] память, внимание и скорость. | 6 | 13 | 2.7 | 2.8 / 4.9 s |
| 00:21.0–00:25.5 | 00:21.3–00:25.2 | shop | Украшайте профиль | Собирайте монеты [p150] и украшайте свой профиль. | 6 | 15 | 4.0 | 3.1 / 3.9 s |
| 00:25.5–00:30.0 | 00:25.8–00:29.6 | outro | IQ-тест и игры для ума (Play) / в Google Play · 4 языка · Без интернета | IQuest. [p300] Четыре языка, без интернета. | 5 | 13 | 3.7 | 2.9 / 3.8 s |

Точнее всего: озвучить **каждую строку отдельно** и поставить на начало «Окна речи». «Нужно» — 5 слогов/с (или 140 слов/мин, что дольше) + паузы; все строки короче окна, ускорять не нужно. При озвучке одним файлом паузы из SSML ставят строки примерно на эти же тайминги.

### 15 s — слов: 19 (15 s; в окнах речи ≈ 90 wpm)

Video: `video/promo15-vertical-1080x1920-ru.mp4`, `video/promo15-horizontal-1920x1080-ru.mp4` · TTS: `voiceover/ru-15s.txt` / `.ssml`

| Сцена (видео) | Окно речи | Сцена | На экране (титр) | Голос | Слов | Слогов | Слог/с | Нужно / окно |
|---|---|---|---|---|---|---|---|---|
| 00:00.0–00:01.0 | 00:00.1–00:00.9 | intro | IQ-тест и игры для ума | IQuest. | 1 | 2 | 2.5 | 0.4 / 0.8 s |
| 00:01.0–00:05.0 | 00:01.2–00:04.7 | test | Проверьте свою логику | Проверьте свою логику: [p150] матрицы, фигуры, слова. | 6 | 16 | 4.8 | 3.4 / 3.5 s |
| 00:05.0–00:08.5 | 00:05.3–00:08.2 | result | Результат IQ и диапазон | Результат IQ — с диапазоном. | 4 | 10 | 3.6 | 2.1 / 2.9 s |
| 00:08.5–00:12.0 | 00:08.8–00:11.7 | game | 6 IQ-игр для ума | Шесть IQ-игр для ума. | 4 | 7 | 2.4 | 1.7 / 2.9 s |
| 00:12.0–00:15.0 | 00:12.2–00:14.8 | outro | IQ-тест и игры для ума (Play) / в Google Play · 4 языка · Без интернета | IQuest. [p200] Работает без интернета. | 4 | 11 | 4.6 | 2.4 / 2.6 s |

Точнее всего: озвучить **каждую строку отдельно** и поставить на начало «Окна речи». «Нужно» — 5 слогов/с (или 140 слов/мин, что дольше) + паузы; все строки короче окна, ускорять не нужно. При озвучке одним файлом паузы из SSML ставят строки примерно на эти же тайминги.

### Подсказки для TTS

- Интонация спокойная, уверенная, «премиальная»; без рекламного крика. Темп ≈ 140 слов/мин, но главный критерий — **≤ 5 слогов/с** (столбец «слог/с» — относительно окна без пауз; скрипт держит все строки ≤ 5).
- [p200] — пауза 200 мс (SSML: `<break time="200ms"/>`). «—» (тире) — короткая пауза ~150 мс.
- Произношение: **IQuest** = «ай-квЕст» (ударение на 2-й слог); **IQ** = «ай-кьЮ» (IQ-игр = «ай-кью игр»). В SSML это задано через `<sub alias>`.
- Ударения: мАтрицы, фигУры, диапазОн, разбОр, внимАние, скОрость, украшАйте, интернЕта.
- Логические акценты: *проверьте*, *диапазон*, *разбор*, *шесть*, *профиль*, *без интернета*.
- Числа написаны словами (шесть, четыре) — так и читать.
