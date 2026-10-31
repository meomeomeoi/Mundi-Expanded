// [expanded] Mundi Expanded 15.3: a plan proposed in your own words, decided by the engine (rules and parsing in askplan.ts).
//
// "Oh, listen, let's do some embroidery today at 2?" (in the scene, or by text on the phone): the line is read before anyone
// answers. For one person the same check as the "Make plans" form decides (they work then, it is too late, they have plans,
// they just say no, they do not know you well enough…); if only the time is the trouble, the nearest time that suits them is
// found and offered with two buttons. For several people (or "everyone") the house's call for everyone decides (free then?
// social? how they get along with you?): those who say yes are in, and a plan with a known activity (a movie, games,
// cooking…) becomes the house's own plan with you in it. The AI is told what was decided before it writes the answer, and
// the plan is already in the calendar and in their memory when they answer.
import { game, notify, saveGame, toast, nowAbs } from '../core/store.js';
import { getWorld, isScenario } from '../core/world.js';
import { personaName, setAsk, scenarioOpen, narratorLine } from '../st/bridge.js';
import { presentAt } from './people.js';
import { check, inviteFace, add as addPlan, when, HANGOUT_BOND, PLAN_LENGTH } from './plans.js';
import { commonRooms } from './lifeday.js';
import { cplansOf, freeAt, joinPlan, roomHas } from './cplanrun.js';
import { outingId, playerHomeId } from './places.js';
import { bondOf, social, textFrom } from './social.js';
import { profileOf } from './profile.js';
import { note as remember } from './facts.js';
import * as C from './chats.js';
import * as CP from './cplans.js';
import * as AP from './askplan.js';
const H = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
} h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b); h ^= h >>> 13; return (h >>> 0) / 4294967296; };
const names = (xs) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs.at(-1)}`);
const hm = (m) => `${String(Math.floor((m % 1440) / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
/** The setting (People → Settings): plans in your own words. On unless turned off. */
export const plansOn = (g) => (g.talkx?.cfg?.plans) !== false;
/** Someone's reason in their own name ("They work at that time." → "Mira works at that time."). */
export const whyOf = (name, why) => why.replace(/^They (are|do|work|already have|know) ?/, (_m, v) => `${name} ${{ are: 'is', do: 'does', work: 'works', 'already have': 'already has' }[v] ?? v} `).replace(/\s+/g, ' ').trim();
/** Where it happens: the room the act needs, outside for an outing, or the room you are in (a common room; else the living room). */
function placeFor(g, w, act) {
    const def = act === 'hang' ? null : CP.cactOf(act);
    if (def?.out)
        return { place: outingId(def.out), act };
    const rooms = commonRooms(g, w);
    if (def?.room && rooms.some(r => r.id === def.room)) {
        const has = roomHas(g, w);
        if (!def.needs || !has || has(def.room, def.needs))
            return { place: def.room, act };
        return { place: def.room, act: 'hang' }; // a movie night with no TV: just the company, under the same name
    }
    const here = rooms.some(r => r.id === g.player.loc) ? g.player.loc : (rooms.find(r => /living|lounge|гостин/i.test(r.name)) ?? rooms[0])?.id ?? playerHomeId;
    return { place: here, act: 'hang' };
}
/** Decides (changes nothing). `who`: the people asked. One: the form's check, with a nearer time; several: the call for everyone. */
export function decide(g, w, prop, who) {
    const { place, act } = placeFor(g, w, prop.act);
    const def = act === 'hang' ? null : CP.cactOf(act);
    const title = prop.title || (prop.act !== 'hang' ? CP.cactOf(prop.act)?.name ?? '' : '') || '';
    const from = prop.from;
    const len = def ? def.hours * 60 : PLAN_LENGTH;
    const earliest = nowAbs(g) + 30;
    const base = { prop, act, title, place, group: who.length >= 2, whenText: when(g, from) };
    if (who.length === 1) {
        const r = who[0];
        const ask = (at) => check(g, w, r.avatar, place, at, at + len, prop.kind, HANGOUT_BOND);
        const a = ask(from);
        let alt;
        if (!a.ok && AP.isTimeIssue(a.why)) {
            const f = AP.findAlt(from, (x) => ask(x).ok, earliest);
            if (f !== null)
                alt = f;
        }
        return { ...base, people: [{ avatar: r.avatar, name: r.name, ok: a.ok, why: a.ok ? '' : whyOf(r.name, a.why), ...(alt !== undefined ? { alt } : {}) }] };
    }
    const day = Math.floor(from / 1440), h0 = Math.floor((from % 1440) / 60);
    const hours = Math.max(1, Math.ceil(len / 60));
    const people = who.map((r, i) => {
        const free = Array.from({ length: hours }, (_, k) => h0 + k).every(h => h < 24 && freeAt(g, w, r, day, h)) && !CP.takenBy(cplansOf(g), r.avatar, from, from + len) && !social(g).appts.some(x => x.avatar === r.avatar && (x.state === 'set' || x.state === 'met') && x.from < from + len && from < x.to);
        const a = C.callAnswer({ avatar: r.avatar, free, social: profileOf(g, r.avatar)?.social ?? 50, withHost: bondOf(g, r.avatar) }, H(`${nowAbs(g)}|${r.avatar}|${from}|ask${i}`));
        return { avatar: r.avatar, name: r.name, ok: a.yes, why: a.yes ? '' : `${r.name} is ${a.why}` };
    });
    return { ...base, people };
}
/** Makes it so: the plan goes in the calendar (and in their memory); for several with a known activity, the house's own plan with you in it. */
export function apply(g, w, d) {
    const yes = d.people.filter(p => p.ok);
    if (!yes.length)
        return;
    const title = d.title || (d.act !== 'hang' ? CP.cactOf(d.act)?.name ?? '' : '');
    if (!d.group) {
        inviteFace(g, w, yes[0].avatar, d.place, d.prop.from, d.prop.kind, title);
        return;
    } // (the same check once more, then the plan)
    remember(g, '{u} suggested "{2}" for {1} and {0} said yes.', [names(yes.map(p => p.name)), d.whenText, title || 'meeting up'], yes.map(p => p.avatar), g.player.loc, 'plan');
    const def = d.act === 'hang' ? null : CP.cactOf(d.act);
    if (def && yes.length >= 2) {
        const p = { id: `o${nowAbs(g)}p`, who: yes.slice(0, 4).map(x => x.avatar), act: d.act, place: def.room ?? '', ...(def.out ? { out: def.out } : {}), from: d.prop.from, to: d.prop.from + def.hours * 60, state: 'set', invite: yes[0].avatar, asked: true };
        cplansOf(g).push(p);
        joinPlan(g, w, p.id);
    }
    else
        for (const y of yes)
            addPlan(g, y.avatar, d.place, d.prop.from, d.prop.kind, false, title);
}
/** What the AI is told before it writes the answers. */
export function askLine(d) {
    const t = d.title ? `"${d.title}"` : 'meeting up';
    if (!d.group) {
        const p = d.people[0];
        if (p.ok)
            return `[{{user}} just suggested ${t} ${d.whenText}, and ${p.name} said yes: it is settled and in the calendar. ${p.name} agrees in their own words, shortly, as fits them.]`;
        if (p.alt !== undefined)
            return `[{{user}} just suggested ${t} ${d.whenText}. ${p.name} cannot then (${p.why.replace(/\.$/, '')}) but could ${when0(d, p.alt)}: ${p.name} says so and suggests that time instead, in their own words. {{user}} has not answered yet.]`;
        return `[{{user}} just suggested ${t} ${d.whenText}. ${p.name} cannot: ${p.why.replace(/\.$/, '')}. ${p.name} turns it down in their own words, kindly or not as fits them, and does not offer another time.]`;
    }
    const yes = d.people.filter(p => p.ok), no = d.people.filter(p => !p.ok);
    return `[{{user}} just suggested ${t} ${d.whenText} to ${names(d.people.map(p => p.name))}. Their answers are decided: ${d.people.map(p => `${p.name} — ${p.ok ? 'yes' : `no (${p.why.replace(new RegExp(`^${p.name} (is )?`), '').replace(/\.$/, '')})`}`).join('; ')}. Each answers in their own words, as decided; ${yes.length ? `${names(yes.map(p => p.name))} ${yes.length > 1 ? 'are' : 'is'} part of the plan now` : 'nobody can, so there is no plan'}${no.length && yes.length ? ', the others are not' : ''}.]`;
}
const when0 = (d, at) => (Math.floor(at / 1440) === Math.floor(d.prop.from / 1440) ? `at ${hm(at % 1440)} the same day` : `tomorrow at ${hm(at % 1440)}`);
export const OFFER = { card: null, busy: false };
/** The card (any screen): "Mira cannot at 14:00. How about 15:00?" */
export function offerHtml(esc, thumb) {
    const g = game();
    const c = OFFER.card;
    if (!g || !c)
        return '';
    if (nowAbs(g) > c.from - 20) {
        OFFER.card = null;
        return '';
    } // the time has gone
    return `<div class="mu-talkcard mu-offer" role="dialog"><span class="mu-talk-faces"><img src="${esc(thumb(c.avatar))}" alt="" title="${esc(c.name)}"></span>
        <span class="mu-talk-text"><b data-notr>${esc(c.name)}</b> cannot ${esc(c.first)}, but ${esc(c.whenText)} would work${c.title ? ` for <q data-notr>${esc(c.title)}</q>` : ''}.</span>
        <span class="mu-talk-btns"><button class="mu-primary" data-act="ap-yes" ${OFFER.busy ? 'aria-busy="true"' : ''}>Yes, ${esc(c.whenText)}</button><button data-act="ap-no">No</button></span></div>`;
}
export async function acceptOffer() {
    const g = game();
    const w = g && getWorld(g.world);
    const c = OFFER.card;
    if (!g || !w || !c || OFFER.busy)
        return;
    OFFER.busy = true;
    notify();
    try {
        const res = inviteFace(g, w, c.avatar, c.place, c.from, c.kind, c.title);
        OFFER.card = null;
        if (!res.ok) {
            toast(`${c.name}: ${whyOf(c.name, res.why)}`, 'warn');
            return;
        }
        toast(`${c.name}: ${c.title ? `"${c.title}" ` : ''}${c.whenText}. In the calendar.`, 'success');
        if (c.where === 'phone')
            await textFrom(g, w, c.avatar, `${c.name} is glad ${personaName()} agreed to ${c.whenText}${c.title ? ` for "${c.title}"` : ''}: one short text.`, 'Great, see you then!', `Yes, ${c.whenText} works.`);
        else {
            setAsk(`[{{user}} said yes to ${c.name}'s other time: ${c.title ? `"${c.title}" ` : ''}${c.whenText}. It is settled and in the calendar.]`, 90000);
            await narratorLine(`${personaName()} and ${c.name} settle on ${c.title ? `"${c.title}" ` : ''}${c.whenText}.`);
        }
        saveGame();
    }
    finally {
        OFFER.busy = false;
        notify();
    }
}
export function declineOffer() { OFFER.card = null; notify(); }
/* ---------- the two doors: the scene, and a text on the phone ---------- */
const fresh = (g, d) => {
    const p = d.people[0];
    if (!d.group && !p.ok && p.alt !== undefined) {
        OFFER.card = { avatar: p.avatar, name: p.name, from: p.alt, place: d.place, title: d.title, kind: d.prop.kind, where: 'scene', whenText: when(g, p.alt), first: d.whenText };
    }
};
const feedback = (d) => {
    const yes = d.people.filter(p => p.ok);
    const t = d.title ? `"${d.title}" ` : '';
    if (yes.length)
        toast(`${names(yes.map(p => p.name))}: yes. ${t}${d.whenText}. In the calendar.`, 'success');
    const no = d.people.filter(p => !p.ok && p.alt === undefined);
    if (no.length)
        toast(`${no.map(p => p.why.replace(/\.$/, '')).join('; ')}.`, 'info');
};
/** Your line in the scene, before anyone answers: false = it is not a plan (nothing was done). */
export function fromScene(raw) {
    const g = game();
    const w = g && getWorld(g.world);
    if (!g || !w || !isScenario(w) || scenarioOpen() || g.tutorial || !plansOn(g))
        return false;
    const solo = String(social(g).solo ?? '');
    const here = presentAt(g, w, g.player.loc).filter(r => !solo || r.avatar === solo);
    if (!here.length)
        return false;
    const prop = AP.parseProposal(raw, { day: g.day, minutes: g.minutes }, here.map(r => ({ avatar: r.avatar, name: r.name, talk: 0.5 })));
    if (!prop)
        return false;
    const asked = prop.names.length ? here.filter(r => prop.names.includes(r.avatar)) : here;
    if (!asked.length)
        return false;
    const d = decide(g, w, prop, asked);
    apply(g, w, d);
    fresh(g, d);
    setAsk(askLine(d), 90000);
    feedback(d);
    saveGame();
    notify();
    return true;
}
/** Your text to one person on the phone: they decide and answer by text. Null: not a plan (the usual text goes). */
export async function fromPhone(g, w, avatar, raw) {
    const r = g.cast[avatar];
    if (!r || !isScenario(w) || !plansOn(g))
        return null;
    const prop = AP.parseProposal(raw, { day: g.day, minutes: g.minutes }, [{ avatar, name: r.name, talk: 0.5 }]);
    if (!prop)
        return null;
    const d = decide(g, w, prop, [r]);
    const p = d.people[0];
    apply(g, w, d);
    const t = d.title ? ` ("${d.title}")` : '';
    const note = p.ok ? `${r.name} happily accepts${t} ${d.whenText}, in one short text.`
        : p.alt !== undefined ? `${r.name} cannot ${d.whenText} (${p.why.replace(/\.$/, '')}) but suggests ${when(g, p.alt)} instead, in one short text.`
            : `${r.name} declines${t} in one short, kind text. Reason: ${p.why.replace(/\.$/, '')}.`;
    if (!p.ok && p.alt !== undefined)
        OFFER.card = { avatar, name: r.name, from: p.alt, place: d.place, title: d.title, kind: d.prop.kind, where: 'phone', whenText: when(g, p.alt), first: d.whenText };
    return textFrom(g, w, avatar, note, p.ok ? 'Sure! See you then.' : p.alt !== undefined ? `Can't then, but how about ${when(g, p.alt)}?` : "Sorry, I can't then.", raw);
}
