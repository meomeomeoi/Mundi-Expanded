// [expanded] The bridge between the live scene and the phone (Mundi Expanded).
//
//  - Each message you send notes where you are and who is with you (merged while nothing changes), so the chat's
//    lines can later be told apart by place and by who heard them.
//  - Live → phone: when someone texts (privately, or in a group chat), the prompt gets the last lines said in person,
//    with where and who was there, only from scenes they were in: Kathie remembers what she said to you in the
//    kitchen ten minutes ago; Masha, who was not there, does not.
//  - Phone → live: the scene is told what the people here texted with you lately (group chats come later).
import { nowAbs } from '../core/store.js';
import { chat, personaName } from '../st/bridge.js';
import { social } from './social.js';
export const logOf = (g) => (g.livelog ??= []);
/** You sent message `i`: where you are and who is with you. */
export function noteScene(g, i, loc, who) {
    const log = logOf(g);
    const last = log.at(-1);
    const same = last && last.loc === loc && last.who.join() === [...who].sort().join();
    if (last && last.i > i)
        log.length = 0; // the chat was cut (a new chat, deleted messages): start over
    if (!same)
        log.push({ i, loc, who: [...who].sort(), at: nowAbs(g) });
    else
        last.at = nowAbs(g);
    if (log.length > 60)
        log.splice(0, log.length - 60);
}
const clean = (s) => String(s ?? '').replace(/<[^>]+>/g, ' ').replace(/\[[^\]]*\]/g, ' ').replace(/\s+/g, ' ').trim();
const ago = (m) => (m < 2 ? 'just now' : m < 60 ? `${m} min ago` : `${Math.round(m / 60)} h ago`);
/**
 * What was said in person lately, for a prompt about `audience` (the people writing): only scenes at least one of
 * them was in, each with where and who was there. '' when there is nothing recent.
 */
export function liveDigest(g, w, audience, o = {}) {
    const minutes = o.minutes ?? 120, maxLines = o.lines ?? 10, maxChars = o.chars ?? 1600;
    const log = logOf(g);
    const list = chat();
    const now = nowAbs(g);
    if (!log.length || !list.length)
        return '';
    const name = (a) => g.cast[a]?.name ?? a;
    const place = (id) => (id === 'home:player' ? `${personaName()}'s room` : id.startsWith('home:') ? `${name(id.slice(5))}'s room` : id.startsWith('out:') ? id.slice(4) : (w.places.find(p => p.id === id)?.name ?? id).toLowerCase());
    const blocks = [];
    let budget = maxChars, linesLeft = maxLines;
    for (let k = log.length - 1; k >= 0 && linesLeft > 0 && budget > 0; k--) {
        const s = log[k];
        if (now - s.at > minutes)
            break;
        if (!s.who.some(a => audience.includes(a)))
            continue;
        const end = k + 1 < log.length ? log[k + 1].i : list.length;
        const lines = list.slice(s.i, end).filter((m) => clean(m?.mes) && !m.is_system && !m.extra?.mundi_diary).map((m) => `${m.is_user ? personaName() : m.name}: ${clean(m.mes).slice(0, 220)}`);
        const take = lines.slice(-linesLeft);
        if (!take.length)
            continue;
        const head = `(${ago(now - s.at)}, in person in the ${place(s.loc)}; there: ${[...s.who.map(name), personaName()].join(', ')})`;
        const text = [head, ...take].join('\n');
        if (text.length > budget)
            break;
        blocks.unshift(text);
        budget -= text.length;
        linesLeft -= take.length;
    }
    return blocks.length ? `[What was said in person shortly before, face to face, not on the phone. Only the people listed as there heard it, and they remember it:]\n${blocks.join('\n')}` : '';
}
/** For the scene: what the people here texted with you in the last hours (a few lines each). */
export function textedLines(g, present, hours = 6) {
    const now = nowAbs(g);
    const out = [];
    for (const r of present) {
        const t = (social(g).threads[r.avatar] ?? []).filter(m => now - m.at <= hours * 60).slice(-4);
        if (!t.length)
            continue;
        out.push(`Earlier today ${r.name} and {{user}} texted (on the phone, not face to face): ${t.map(m => `${m.me ? '{{user}}' : r.name}: "${m.text.replace(/\s+/g, ' ').slice(0, 160)}"`).join(' / ')}`);
    }
    return out;
}
