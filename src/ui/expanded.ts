// [expanded] Mundi Expanded's windows over the game screen (one hook in upstream's hud.ts).
import { callHtml } from './callui.js';
import { lifeSetupHtml } from './profileui.js';
import { doorHtml } from './doors.js';
import { knockHtml } from './knockui.js';
import { talkCardHtml, inviteHtml } from './talkui.js';
import { ownHtml } from './minigames.js';
import { offerHtml } from '../sim/askplanrun.js';   // 0.2.1-15.3
import { esc } from '../core/store.js';
import { thumb } from '../st/bridge.js';
export const expandedOverlays = () => `${lifeSetupHtml()}${doorHtml()}${knockHtml()}${callHtml() /* 0.2.0.10 */}${talkCardHtml()}${offerHtml(esc, thumb) /* 0.2.1-15.3 */}${inviteHtml() /* 0.2.0.11 */}${ownHtml() /* 0.2.1-12 */}`;
