import { social } from './social.js';
import { romOf } from './romance.js';
import { loveOf, lk } from './love.js';
import { YOU } from './bonds.js';
export const FEEL_CHOICES = [
    { id: 'none', name: 'No feelings for you', v: 0, said: false },
    { id: 'interest', name: 'Interested in you', v: 25, said: false },
    { id: 'like-secret', name: 'Secretly likes you (a crush, unspoken)', v: 45, said: false },
    { id: 'like-told', name: 'Likes you, and has told you', v: 45, said: true },
    { id: 'love-secret', name: 'Secretly in love with you (unspoken)', v: 75, said: false },
    { id: 'love-told', name: 'In love with you, and has told you', v: 75, said: true },
];
/** Which choice describes this value (and whether they said it). Said only counts from a crush up. */
export function feelChoice(v, said) {
    const lvl = v >= 70 ? 'love' : v >= 40 ? 'like' : v >= 15 ? 'interest' : 'none';
    if (lvl === 'none' || lvl === 'interest')
        return lvl;
    return `${lvl}-${said ? 'told' : 'secret'}`;
}
export const feelOf = (g, avatar) => feelChoice(romOf(g, avatar).value, !!loveOf(g).said?.[lk(avatar, YOU)]);
/** Sets their feelings for you. '' when done, else why not. A couple's status stays as it is (change it with the status). */
export function setFeel(g, avatar, id, day) {
    const c = FEEL_CHOICES.find(x => x.id === id);
    if (!c || !g.cast[avatar])
        return 'That is not a way to feel.';
    romOf(g, avatar).value = c.v;
    const x = loveOf(g);
    const k = lk(avatar, YOU);
    if (c.said)
        (x.said ??= {})[k] = day;
    else {
        delete x.said?.[k];
        delete x.fed?.[k];
    }
    if (!c.said && x.know)
        delete x.know[k]; // nobody has been told it any more
    return '';
}
/** Sets how close you are (0–100, upstream's bond). */
export function setCloseness(g, avatar, v) {
    if (!g.cast[avatar] || !Number.isFinite(v))
        return;
    social(g).bond[avatar] = Math.max(0, Math.min(100, Math.round(v)));
}
