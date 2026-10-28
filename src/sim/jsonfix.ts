// [expanded] Reading JSON from a model's answer, even when it was cut off (a thinking model that spent most of the
// length on thinking stops mid-object: `{"acts": [{"text": "a"}, {"text": "b", "where": "kit`). What arrived whole
// is kept: the answer is cut back to the last complete value and the open brackets are closed.

/** The first JSON object in `text`, repaired when cut off; null when nothing usable. */
export function looseJson(text: string): any {
    const s = String(text ?? ''); const start = s.indexOf('{'); if (start < 0) return null;
    const body = s.slice(start);
    try { const end = body.lastIndexOf('}'); if (end > 0) return JSON.parse(body.slice(0, end + 1)); } catch { /* cut off: repair below */ }
    // walk it once: where each complete value ends at depth ≥ 1, and which brackets are open there
    const cuts: { at: number; open: string }[] = []; const stack: string[] = [];
    let inStr = false, esc = false;
    for (let i = 0; i < body.length; i++) {
        const c = body[i];
        if (inStr) { if (esc) esc = false; else if (c === '\\') esc = true; else if (c === '"') { inStr = false; if (stack.at(-1) === '[') cuts.push({ at: i + 1, open: stack.join('') }); } continue; }
        if (c === '"') { inStr = true; continue; }
        if (c === '{' || c === '[') { stack.push(c); continue; }
        if (c === '}' || c === ']') { stack.pop(); if (!stack.length) break; cuts.push({ at: i + 1, open: stack.join('') }); continue; }
        if (c === ',') cuts.push({ at: i, open: stack.join('') });   // a value before a comma is complete
    }
    for (let k = cuts.length - 1; k >= 0; k--) {
        const { at, open } = cuts[k];
        const close = [...open].reverse().map(b => (b === '{' ? '}' : ']')).join('');
        try { return JSON.parse(body.slice(0, at).replace(/,\s*$/, '') + close); } catch { /* an earlier cut */ }
    }
    return null;
}
