// [expanded] Mundi Expanded 15.2: how a line is shaped before it goes into the chat (the message box's Say / Do / Story /
// See / Free). Pure text, so it can be tested on its own.
//
//  - A line that already has markup in it, a pair of quotes or an asterisk pair anywhere ("*smiles* "Hey" *sits*"), is
//    sent as you wrote it, in Say and in Do: it used to be wrapped whole, which broke mixed lines.
//  - Free: write as you would in a story: "quotes" are what you say, and what is outside them is what you do (it gets its
//    asterisks). No quotes and no asterisks: all of it is what you do.
export type Mode = 'say' | 'do' | 'story' | 'see' | 'free';

const QUOTE = /("[^"\n]+"|“[^”\n]+”|«[^»\n]+»)/;
const HAS_QUOTES = /"[^"\n]+"|“[^”\n]+”|«[^»\n]+»/;
const HAS_STARS = /\*[^*\n]+\*/;
/** Has speech in quotes or an action in asterisks somewhere in it. */
export const marked = (t: string) => HAS_QUOTES.test(t) || HAS_STARS.test(t);

/** Free: quotes are speech, the rest is action (each stretch of it in asterisks, unless it has its own). */
export function freeLine(t: string): string {
    const parts = t.split(QUOTE).map(p => p.trim()).filter(Boolean);
    return parts.map(p => (QUOTE.test(p) && /^["“«]/.test(p) ? p : /\*/.test(p) ? p : `*${p}*`)).join(' ');
}

export function shape(mode: Mode, text: string): string {
    const t = String(text ?? '').trim();
    switch (mode) {
        case 'free': return t ? freeLine(t) : t;
        case 'do': return marked(t) || /^\*.*\*$/s.test(t) ? t : `*${t.replace(/^\*|\*$/g, '')}*`;
        case 'story': return `[Story direction: ${t}]`;
        case 'see': return `*looks at ${t.replace(/^(at|the)\s+/i, (m) => m.toLowerCase() === 'at ' ? '' : m)}* [Describe what {{user}} sees.]`;
        default: return marked(t) || /^["“*]/.test(t) ? t : `"${t}"`;
    }
}
