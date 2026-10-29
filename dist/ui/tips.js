"use strict";
// [expanded] A small window that follows the cursor over anything with data-tip (Mundi Expanded 0.2.1-12): what a
// trait does, and whatever else gets one. Lines are split on "\n". Not on touch screens (no hover there).
let tip = null;
let over = null;
const box = () => { if (tip?.isConnected)
    return tip; tip = document.createElement('div'); tip.className = 'mu-tip'; (document.getElementById('mundi-root') ?? document.body).appendChild(tip); return tip; };
function show(el, x, y) {
    const t = box();
    if (over !== el) {
        over = el;
        t.replaceChildren(...String(el.dataset.tip ?? '').split('\n').filter(Boolean).map(l => { const d = document.createElement('div'); d.textContent = l; return d; }));
    }
    t.style.display = 'block';
    const w = t.offsetWidth, h = t.offsetHeight;
    const left = x + 16 + w > window.innerWidth ? x - w - 12 : x + 16, top = y + 18 + h > window.innerHeight ? y - h - 10 : y + 18;
    t.style.left = `${Math.max(4, left)}px`;
    t.style.top = `${Math.max(4, top)}px`;
}
const hide = () => { over = null; if (tip)
    tip.style.display = 'none'; };
if (typeof document !== 'undefined' && !globalThis.__muTips) {
    globalThis.__muTips = true;
    document.addEventListener('pointermove', (e) => {
        if (e.pointerType === 'touch')
            return;
        const el = e.target?.closest?.('#mundi-root [data-tip]');
        if (el)
            show(el, e.clientX, e.clientY);
        else if (over)
            hide();
    });
    document.addEventListener('pointerdown', hide);
}
