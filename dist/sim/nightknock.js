// [expanded] Night visits at runtime (rules in knocks.ts): each hour of the night, while you are awake in your
// room, maybe someone knocks; a partner slips in (unless your door is locked).
import { nowAbs } from '../core/store.js';
import { isScenario } from '../core/world.js';
import { onHour } from './hooks.js';
import { whereNow, OUT } from './people.js';
import { bondOf, isPartner, social } from './social.js';
import { activeFeelings } from './life.js';
import { isSleeping } from './plans.js';
import { bondsOf } from './bonds.js';
import { isOuting } from './places.js';
import * as P from './profile.js';
import * as K from './knocks.js';
import { GRUDGE } from './doors.js';
const G = (g) => g;
const H = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
} h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b); h ^= h >>> 13; return (h >>> 0) / 4294967296; };
export const visitsOf = (g) => P.lifexOf(G(g)).visits ?? 'rare';
const romance = (g, a) => Number(g.romance?.[a]?.value ?? 0);
// Someone they fell out with today (a scene or the night's episode): they may come to vent about them.
function ventAbout(g, a) {
    const f = bondsOf(g).facts.filter(x => x.kind === 'episode' && x.day >= g.day - 1 && (x.delta ?? 0) < 0 && x.who.includes(a) && !x.who.includes('__you')).at(-1);
    const other = f?.who.find(x => x !== a);
    return other ? g.cast[other]?.name : undefined;
}
export function candidates(g, w) {
    const now = nowAbs(g);
    const lx = P.lifexOf(G(g));
    return Object.values(g.cast).filter(r => {
        if (!r.met || social(g).with.some(c => c.avatar === r.avatar))
            return false;
        const at = whereNow(g, w, r);
        return at !== OUT && !isOuting(at) && at !== 'home:player' && !isSleeping(r, now);
    }).map(r => ({
        r, avatar: r.avatar, bond: bondOf(g, r.avatar), romance: romance(g, r.avatar), partner: isPartner(g, r.avatar),
        grudge: activeFeelings(g, r.avatar).some(f => GRUDGE.test(f.tag)), owl: (P.profileOf(G(g), r.avatar)?.bed ?? 23) <= 5,
        vent: ventAbout(g, r.avatar), lastVisit: lx.nights?.[r.avatar],
    }));
}
onHour.push((g, w) => {
    if (!isScenario(w) || g.asleep)
        return [];
    const lx = P.lifexOf(G(g));
    const often = visitsOf(g);
    const now = nowAbs(g), hour = Math.floor(g.minutes / 60), night = K.nightOf(g.day, hour);
    if (lx.knock && now - lx.knock.at > 45) {
        const n = g.cast[lx.knock.avatar]?.name;
        lx.knock = null;
        return n ? [`${n} knocked at your door a while ago, but you did not answer.`] : [];
    }
    if (often === 'off' || g.player.loc !== 'home:player' || !K.NIGHT_HOURS.includes(hour) || lx.knock || lx.night === night)
        return [];
    const v = K.pickVisitor(candidates(g, w), often, night, H(`${night}|${hour}|knock`), H(`${night}|${hour}|who`), H(`${night}|${hour}|why`));
    if (!v)
        return [];
    lx.night = night;
    (lx.nights ??= {})[v.avatar] = night;
    const r = g.cast[v.avatar];
    if (isPartner(g, v.avatar) && !lx.locked) { // a partner just comes in
        social(g).with.push({ avatar: v.avatar, until: now + 180 });
        lx.visit = { avatar: v.avatar, reason: v.reason, until: now + 180 };
        return [`${r.name} slips into your room.`];
    }
    lx.knock = { avatar: v.avatar, reason: v.reason, at: now };
    return ['Someone knocks at your door.'];
});
