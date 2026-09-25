// ═══════════════════════════════════════════════════════════════════════
//  AVTOMATIK — supabase/mkengine.mjs yasaydi. QO'LDA TAHRIRLANMAYDI.
//  Ilovadagi dvigatelning aynan nusxasi (src/iq, src/games, content/verbal.json).
//  Import tartibi muhim: IQ_VERBAL → rng → index → score → session → gen → games.
// ═══════════════════════════════════════════════════════════════════════
import './verbal.mjs';
import './iq/rng.js';
import './iq/index.js';
import './iq/score.js';
import './iq/session.js';
import './iq/gen/matrix.js';
import './iq/gen/series.js';
import './iq/gen/spatial.js';
import './iq/gen/verbal.js';
import './games/index.js';
import './games/matrix-memory.js';
import './games/nback.js';
import './games/sequence.js';

export const IQ = globalThis.IQ;
export const SOURCE_HASH = '3333a84d9227cce8';
export const FILES = ["src/iq/rng.js","src/iq/index.js","src/iq/score.js","src/iq/session.js","src/iq/gen/matrix.js","src/iq/gen/series.js","src/iq/gen/spatial.js","src/iq/gen/verbal.js","src/games/index.js","src/games/matrix-memory.js","src/games/nback.js","src/games/sequence.js"];
