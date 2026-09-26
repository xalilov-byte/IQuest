/* ─────────────────────────────────────────────────────────────────────────
   IQuest TOʻLOV BOTI — bitta Cloudflare Worker, bazasiz (bot/README.md)

   Oqim:
     1. Ilova «Chekni yuborish» → t.me/<bot>?start=pay_IQ-4F7K
     2. /start pay_<KOD> → bot force_reply bilan soʻraydi: «… Test kodi: <KOD>»
        (kod shu xabar matnida yuradi — serverda hech narsa saqlanmaydi).
     3. Foydalanuvchi chek rasmini shu xabarga JAVOB qilib yuboradi →
        rasm ADMIN_CHAT_ID ga [✅ Tasdiq] [❌ Yolgʻon] tugmalari bilan.
     4. ✅ → ochish kodi (ilova bilan AYNAN bir xil algoritm, src/paywall.js)
        hisoblanadi va foydalanuvchiga «Natijani ochish» web_app tugmasi:
        WEBAPP_URL?unlock=<KOD>-<OCHISH>. ❌ → rad xabari.
   Tugmalarni faqat ADMIN_CHAT_ID dagi bosishlar qabul qilinadi.

   env: BOT_TOKEN, ADMIN_CHAT_ID, UNLOCK_SECRET, WEBAPP_URL,
        WEBHOOK_SECRET (ixtiyoriy — setWebhook secret_token bilan bir xil).
   ───────────────────────────────────────────────────────────────────── */

/* ── Ochish kodi — src/paywall.js dagi bilan bir xil (tests/paywall.test.mjs
   ikkalasini solishtiradi). ─────────────────────────────────────────── */
const ALPHA = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
function fnv(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}
function b32(n, len) {
  let out = '';
  for (let i = 0; i < len; i++) out += ALPHA[(n >>> (27 - 5 * i)) & 31];
  return out;
}
export function unlockCode(code, secret) { return b32(fnv(code + ':' + String(secret || '')), 6); }

const CODE_RE = /IQ-[0-9A-HJKMNP-TV-Z]{4}/;

export const TEXT = {
  ask: code => `Toʻlov chekini rasm qilib yuboring. Test kodi: ${code}`,
  hello: 'Salom! Toʻlov uchun ilovadagi «Chekni yuborish» tugmasini bosing.',
  noCode: 'Chekni «Test kodi» yozilgan xabarga javob qilib yuboring (ilovadagi «Chekni yuborish» tugmasi).',
  got: 'Chek qabul qilindi. Tekshirilgach xabar beramiz.',
  ok: 'Toʻlov tasdiqlandi! Natijangiz va sertifikatingiz tayyor.',
  no: 'Chek tasdiqlanmadi. Savollar boʻlsa, adminga yozing.',
  open: 'Natijani ochish',
};

/* Telegram Bot API chaqiruvi (oddiy fetch). */
export function api(env, method, body) {
  return fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/${method}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export function unlockUrl(env, code) {
  const base = String(env.WEBAPP_URL || '');
  return base + (base.indexOf('?') === -1 ? '?' : '&') + 'unlock=' + code + '-' + unlockCode(code, env.UNLOCK_SECRET);
}

function who(u) {
  if (!u) return '?';
  const name = u.username ? '@' + u.username : [u.first_name, u.last_name].filter(Boolean).join(' ') || '—';
  return `${name} (${u.id})`;
}

/* Admin chati: guruh (manfiy id) — undagi har kim; shaxsiy chat — faqat oʻsha odam. */
function fromAdmin(env, cq) {
  const admin = String(env.ADMIN_CHAT_ID || '');
  const chat = cq.message && cq.message.chat ? String(cq.message.chat.id) : '';
  if (!admin || chat !== admin) return false;
  return admin.startsWith('-') || String(cq.from && cq.from.id) === admin;
}

export async function handleUpdate(update, env) {
  const msg = update.message;
  if (msg && msg.chat && msg.chat.type === 'private') {
    const chat = msg.chat.id;
    const text = msg.text || '';
    if (text.startsWith('/start')) {
      const m = /^\/start\s+pay_(IQ-[0-9A-Za-z]{4})\s*$/.exec(text);
      const code = m ? m[1].toUpperCase() : '';
      if (code && CODE_RE.test(code)) {
        await api(env, 'sendMessage', { chat_id: chat, text: TEXT.ask(code),
          reply_markup: { force_reply: true, input_field_placeholder: 'Chek rasmi' } });
      } else {
        await api(env, 'sendMessage', { chat_id: chat, text: TEXT.hello });
      }
      return;
    }
    const photo = msg.photo && msg.photo.length ? msg.photo[msg.photo.length - 1].file_id : '';
    const doc = !photo && msg.document && /^image\//.test(msg.document.mime_type || '') ? msg.document.file_id : '';
    if (!photo && !doc) {
      await api(env, 'sendMessage', { chat_id: chat, text: TEXT.hello });
      return;
    }
    const ref = msg.reply_to_message;
    const src = (ref && ref.from && ref.from.is_bot ? ref.text || '' : '') + ' ' + (msg.caption || '');
    const cm = CODE_RE.exec(src.toUpperCase());
    if (!cm) {
      await api(env, 'sendMessage', { chat_id: chat, text: TEXT.noCode });
      return;
    }
    const code = cm[0], uid = msg.from ? msg.from.id : chat;
    const caption = `Test kodi: ${code} · Foydalanuvchi: ${who(msg.from)}`;
    const reply_markup = { inline_keyboard: [[
      { text: '✅ Tasdiq', callback_data: `ok:${code}:${uid}` },
      { text: '❌ Yolgʻon', callback_data: `no:${code}:${uid}` },
    ]] };
    await api(env, photo ? 'sendPhoto' : 'sendDocument',
      Object.assign({ chat_id: env.ADMIN_CHAT_ID, caption, reply_markup }, photo ? { photo } : { document: doc }));
    await api(env, 'sendMessage', { chat_id: chat, text: TEXT.got });
    return;
  }

  const cq = update.callback_query;
  if (cq) {
    const m = /^(ok|no):(IQ-[0-9A-Z]{4}):(\d+)$/.exec(cq.data || '');
    if (!m || !fromAdmin(env, cq)) {
      await api(env, 'answerCallbackQuery', { callback_query_id: cq.id, text: 'Ruxsat yoʻq', show_alert: true });
      return;
    }
    const [, act, code, uid] = m;
    const admin = cq.from && (cq.from.username ? '@' + cq.from.username : cq.from.first_name) || 'admin';
    if (act === 'ok') {
      await api(env, 'sendMessage', { chat_id: Number(uid), text: TEXT.ok,
        reply_markup: { inline_keyboard: [[{ text: TEXT.open, web_app: { url: unlockUrl(env, code) } }]] } });
    } else {
      await api(env, 'sendMessage', { chat_id: Number(uid), text: TEXT.no });
    }
    const base = (cq.message && cq.message.caption) || `Test kodi: ${code}`;
    await api(env, 'editMessageCaption', {
      chat_id: cq.message.chat.id, message_id: cq.message.message_id,
      caption: base + '\n' + (act === 'ok' ? `✅ Tasdiqlandi (${admin})` : `❌ Rad etildi (${admin})`),
      reply_markup: { inline_keyboard: [] },
    });
    await api(env, 'answerCallbackQuery', { callback_query_id: cq.id, text: act === 'ok' ? 'Tasdiqlandi' : 'Rad etildi' });
  }
}

export default {
  async fetch(request, env) {
    if (request.method !== 'POST') return new Response('IQuest pay bot');
    if (env.WEBHOOK_SECRET && request.headers.get('x-telegram-bot-api-secret-token') !== env.WEBHOOK_SECRET) {
      return new Response('forbidden', { status: 403 });
    }
    let update = null;
    try { update = await request.json(); } catch (e) { return new Response('bad json', { status: 400 }); }
    try { await handleUpdate(update, env); } catch (e) { console.log('update error', e && e.message); }
    return new Response('ok');   // Telegram qayta yubormasin
  },
};
