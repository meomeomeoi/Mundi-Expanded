// [expanded] Mundi Expanded 15.2: a reply that came with its own wrapping. Some presets (or the model copying the way the
// history is written) start a group reply with a header like "**[Group Chat: A, B, C]**" and the speaker's own name
// ("**Leah:** …"). SillyTavern's clean-up takes off "Leah:" but not the bold one, so it stayed in the story. Taken off the
// start of the reply only, and only the speaker's own name (a name inside the text is the story's).
const HEADER = /^[ \t]*[*_]{0,3}[ \t]*\[[ \t]*(?:group chat|group)\b[^\]\n]*\][ \t]*[*_]{0,3}[ \t]*(?:\r?\n|$)/i;
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** The reply without a leaked header and speaker label at its start; the same text when there is none. */
export function cleanReply(text: string, speaker: string): string {
    let t = String(text ?? '');
    let n = 0;
    while (n++ < 3) { const m = HEADER.exec(t.replace(/^\s*\n/, '')); if (!m) break; t = t.replace(/^\s*\n/, '').slice(m[0].length); }
    t = t.replace(/^\s*\n/, '');
    const names = [...new Set([speaker.trim(), speaker.trim().split(/\s+/)[0]].filter(x => x.length >= 2))].sort((a, b) => b.length - a.length).map(esc);
    if (names.length) {
        // **Leah:** text   **Leah**: text   *Leah:* text   __Leah:__ text   Leah: text   [Leah] text
        const label = new RegExp(`^[ \\t]*(?:([*_]{1,3})[ \\t]*(?:${names.join('|')})[ \\t]*:?[ \\t]*\\1[ \\t]*:?|(?:${names.join('|')})[ \\t]*:|\\[[ \\t]*(?:${names.join('|')})[ \\t]*\\])[ \\t]*`, 'i');
        const m = label.exec(t);
        if (m && t.slice(m[0].length).trim()) t = t.slice(m[0].length);
    }
    return t;
}
