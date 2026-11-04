// [expanded] Mundi Expanded 0.2.1-15.4: setting by hand how a character feels about YOU, with the game's own pieces:
// closeness (upstream's bond, 0–100), the romance value (0–100: interest from 15, a crush from 40, in love from 70) and
// whether they ever said it out loud (love.ts `said`, which is what makes a crush "secret"). Nothing new is stored: the
// same numbers the game already moves, so the scene, the night and the gossip read them as they always do.
// Shown in Relationships (you & a person) only when editing is unlocked in the phone's Settings.
import type { Save } from '../core/store.js';
import { social } from './social.js';
import { romOf } from './romance.js';
import { loveOf, lk } from './love.js';
import { YOU } from './bonds.js';

export interface FeelChoice { id: string; name: string; /** the romance value it sets */ v: number; /** told them already */ said: boolean }
export const FEEL_CHOICES: FeelChoice[] = [
    { id: 'none', name: 'No feelings for you', v: 0, said: false },
    { id: 'interest', name: 'Interested in you', v: 25, said: false },
    { id: 'like-secret', name: 'Secretly likes you (a crush, unspoken)', v: 45, said: false },
    { id: 'like-told', name: 'Likes you, and has told you', v: 45, said: true },
    { id: 'love-secret', name: 'Secretly in love with you (unspoken)', v: 75, said: false },
    { id: 'love-told', name: 'In love with you, and has told you', v: 75, said: true },
];
/** Which choice describes this value (and whether they said it). Said only counts from a crush up. */
export function feelChoice(v: number, said: boolean): string {
    const lvl = v >= 70 ? 'love' : v >= 40 ? 'like' : v >= 15 ? 'interest' : 'none';
    if (lvl === 'none' || lvl === 'interest') return lvl;
    return `${lvl}-${said ? 'told' : 'secret'}`;
}
export const feelOf = (g: Save, avatar: string): string => feelChoice(romOf(g, avatar).value, !!loveOf(g as any).said?.[lk(avatar, YOU)]);
/** Sets their feelings for you. '' when done, else why not. A couple's status stays as it is (change it with the status). */
export function setFeel(g: Save, avatar: string, id: string, day: number): string {
    const c = FEEL_CHOICES.find(x => x.id === id); if (!c || !g.cast[avatar]) return 'That is not a way to feel.';
    romOf(g, avatar).value = c.v;
    const x = loveOf(g as any); const k = lk(avatar, YOU);
    if (c.said) (x.said ??= {})[k] = day; else { delete x.said?.[k]; delete x.fed?.[k]; }
    if (!c.said && x.know) delete x.know[k];   // nobody has been told it any more
    return '';
}
/** Sets how close you are (0–100, upstream's bond). */
export function setCloseness(g: Save, avatar: string, v: number): void {
    if (!g.cast[avatar] || !Number.isFinite(v)) return;
    social(g).bond[avatar] = Math.max(0, Math.min(100, Math.round(v)));
}
