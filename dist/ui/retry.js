// [expanded] When a mechanics call fails (no answer, a refusal, an answer that could not be read): a notice that stays
// until you close it or press "Try again" (Mundi Expanded 0.2.0.9). One notice per kind of call at a time.
const OPEN = new Map();
/** A refusal or a non-answer ("I can't help with that", empty). */
export const refused = (raw) => !String(raw ?? '').trim() || /^\s*(i('| a)m sorry|sorry,|i can(no|')t|i won'?t|i'm not able|as an ai|i must decline|извините|я не могу)/i.test(String(raw).replace(/<(think|thinking|reasoning)>[\s\S]*?<\/\1>/gi, ''));
export function failNotice(kind, msg, retry) {
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
        try {
            const ok = await retry();
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
