// [expanded] Mundi Expanded's windows over the game screen (one hook in upstream's hud.ts).
import { callHtml } from './callui.js';
import { lifeSetupHtml } from './profileui.js';
import { doorHtml } from './doors.js';
import { knockHtml } from './knockui.js';
import { talkCardHtml, inviteHtml } from './talkui.js';
import { ownHtml } from './minigames.js';
export const expandedOverlays = () => `${lifeSetupHtml()}${doorHtml()}${knockHtml()}${callHtml() /* 0.2.0.10 */}${talkCardHtml()}${inviteHtml() /* 0.2.0.11 */}${ownHtml() /* 0.2.1-12 */}`;
