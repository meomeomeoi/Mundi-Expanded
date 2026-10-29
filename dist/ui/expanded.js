// [expanded] Mundi Expanded's windows over the game screen (one hook in upstream's hud.ts).
import { callHtml } from './callui.js';
import { lifeSetupHtml } from './profileui.js';
import { doorHtml } from './doors.js';
import { knockHtml } from './knockui.js';
export const expandedOverlays = () => `${lifeSetupHtml()}${doorHtml()}${knockHtml()}${callHtml() /* 0.2.0.10 */}`;
