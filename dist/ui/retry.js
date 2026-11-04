// [expanded] When a mechanics call fails (no answer, a refusal, an answer that could not be read): a notice that stays
// until you close it or press "Try again" (Mundi Expanded 0.2.0.9). One notice per kind of call at a time.
import { game, toast } from '../core/store.js';
import { ctx } from '../st/bridge.js';
const OPEN = new Map();
const chatKey = () => { try {
    return String(ctx().chatId ?? '');
}
catch {
    return '';
} };
/** A refusal or a non-answer ("I can't help with that", empty). */
export const refused = (raw) => !String(raw ?? '').trim() || /^\s*(i('| a)m sorry|sorry,|i can(no|')t|i won'?t|i'm not able|as an ai|i must decline|извините|я не могу)/i.test(String(raw).replace(/<(think|thinking|reasoning)>[\s\S]*?<\/\1>/gi, ''));
// [expanded] 0.2.1-15.4: the retry gets the game as it is when you press the button (it used to keep the one from when the
// notice appeared: after leaving Mundi, or the chat being opened again, "Try again" changed a copy that was no longer the
// game). A notice from another chat is closed instead of being applied to the wrong game.
export function failNotice(kind, msg, retry) {
    const chat0 = chatKey();
    const host = document.getElementById('mundi-toasts');
    if (!host) {
        console.warn('[Mundi Expanded]', msg);
        return;
    }
    OPEN.get(kind)?.remove();
    const el = document.createElement('div');
    el.className = 'mu-toast is-warn mu-retry';
    const t = document.createElement('span');
    t.textContent = msg;
    el.appendChild(t);
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'mu-retry-btn';
    b.textContent = 'Try again';
    b.addEventListener('click', async (e) => {
        e.stopPropagation();
        b.disabled = true;
        b.textContent = 'Trying…';
        const cur = game();
        if (!cur || (chat0 && chatKey() !== chat0)) {
            el.remove();
            if (OPEN.get(kind) === el)
                OPEN.delete(kind);
            toast('That was in another chat. Use Settings → Redo the night to read a day again.', 'info', { ms: 6000 });
            return;
        }
        try {
            const ok = await retry(cur);
            if (ok === false) {
                b.disabled = false;
                b.textContent = 'Try again';
                return;
            }
            el.remove();
            if (OPEN.get(kind) === el)
                OPEN.delete(kind);
        }
        catch (err) {
            b.disabled = false;
            b.textContent = 'Try again';
            t.textContent = `${msg} (${String(err?.message ?? err).slice(0, 80)})`;
        }
    });
    const x = document.createElement('button');
    x.type = 'button';
    x.className = 'mu-toast-x';
    x.textContent = '✕';
    x.setAttribute('aria-label', 'Close');
    x.addEventListener('click', (e) => { e.stopPropagation(); el.remove(); if (OPEN.get(kind) === el)
        OPEN.delete(kind); });
    el.append(b, x);
    host.appendChild(el);
    OPEN.set(kind, el);
}
