const QUOTE = /("[^"\n]+"|“[^”\n]+”|«[^»\n]+»)/;
const HAS_QUOTES = /"[^"\n]+"|“[^”\n]+”|«[^»\n]+»/;
const HAS_STARS = /\*[^*\n]+\*/;
/** Has speech in quotes or an action in asterisks somewhere in it. */
export const marked = (t) => HAS_QUOTES.test(t) || HAS_STARS.test(t);
/** Free: quotes are speech, the rest is action (each stretch of it in asterisks, unless it has its own). */
export function freeLine(t) {
    const parts = t.split(QUOTE).map(p => p.trim()).filter(Boolean);
    return parts.map(p => (QUOTE.test(p) && /^["“«]/.test(p) ? p : /\*/.test(p) ? p : `*${p}*`)).join(' ');
}
export function shape(mode, text) {
    const t = String(text ?? '').trim();
    switch (mode) {
        case 'free': return t ? freeLine(t) : t;
        case 'do': return marked(t) || /^\*.*\*$/s.test(t) ? t : `*${t.replace(/^\*|\*$/g, '')}*`;
        case 'story': return `[Story direction: ${t}]`;
        case 'see': return `*looks at ${t.replace(/^(at|the)\s+/i, (m) => m.toLowerCase() === 'at ' ? '' : m)}* [Describe what {{user}} sees.]`;
        default: return marked(t) || /^["“*]/.test(t) ? t : `"${t}"`;
    }
}
