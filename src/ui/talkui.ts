// [expanded] Their move on screen (rules in sim/talkrun.ts, 0.2.0.11): the card when you walk into a conversation or
// someone comes up to you, an invitation for tonight, what everyone is doing under their name, the settings (and the
// list of everyday topics), and the map's fog.
import { esc, game, notify, saveGame, toast, state, settings, saveSettings, nowAbs, type Save, type Resident } from '../core/store.js';
import { getWorld, isScenario, type WorldDef } from '../core/world.js';
import { thumb } from '../st/bridge.js';
import { icon } from './icons.js';
import { ACT, INPUT } from './reg.js';
import * as R from '../sim/talkrun.js';
import * as T from '../sim/talk.js';
import { slotAt } from '../sim/lifeday.js';
import { whereNow } from '../sim/people.js';
import { hm } from '../sim/time.js';

const ctxW = () => { const g = game(); const w = g && getWorld(g.world); return g && w && isScenario(w) ? { g, w } : null; };
const nm = (g: Save, a: string) => g.cast[a]?.name ?? a;
const list = (xs: string[]) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs.at(-1)}`);
const TONE_WORD: Record<T.Tone, string> = { lazy: 'chatting lazily', joking: 'laughing about something', argue: 'arguing', heart: 'talking quietly', lecture: 'deep in some explanation', gossip: 'whispering', complain: 'complaining about something', flirt: 'flirting a little' };

/** The card: a conversation going on (listen, join, walk past), or someone coming up to you (listen, not now). */
export function talkCardHtml(): string {
    const c = R.TK.card; const x = ctxW(); if (!c || !x || state.view !== 'scene') return '';
    const { g } = x; const faces = c.who.map(a => `<img src="${esc(thumb(a))}" alt="" title="${esc(nm(g, a))}">`).join('');
    if (c.kind === 'come') {
        const a = c.who[0];
        return `<div class="mu-talkcard" role="dialog"><span class="mu-talk-faces">${faces}</span><span class="mu-talk-text"><b data-notr>${esc(nm(g, a))}</b> comes up to you: there is something on their mind.</span>
            <span class="mu-talk-btns"><button class="mu-primary" data-act="tk-listen">${icon('chat')}<span>Listen</span></button><button data-act="tk-pass">Not now</button></span></div>`;
    }
    const ready = !!c.lines; const heard = !!c.heard;
    return `<div class="mu-talkcard" role="dialog"><span class="mu-talk-faces">${faces}</span>
        <span class="mu-talk-text"><span data-notr>${esc(list(c.who.map(a => nm(g, a))))}</span> ${heard ? 'go on talking.' : `are ${TONE_WORD[c.cur.tone]}.`}${c.cur.stage === 'end' && !heard ? ' <small>It sounds like they are wrapping up.</small>' : ''}</span>
        <span class="mu-talk-btns">${heard ? '' : `<button data-act="tk-listen" ${ready ? '' : 'aria-busy="true"'}>${icon('speaker')}<span>${ready ? 'Listen' : 'Listen…'}</span></button>`}
            <button class="mu-primary" data-act="tk-join">${icon('users')}<span>Join in</span></button><button data-act="tk-pass">${heard ? 'Leave them to it' : 'Walk past'}</button></span></div>`;
}
/** Invitations for tonight (from texts): yes or no. */
export function inviteHtml(): string {
    const x = ctxW(); if (!x) return '';
    const l = R.openInvites(x.g); if (!l.length) return '';
    const i = l[0]; const r = x.g.cast[i.avatar];
    return `<div class="mu-invite" role="dialog"><img src="${esc(thumb(i.avatar))}" alt=""><span><small>${icon('calendar')} Invitation · ${hm(i.from % 1440)}</small><b data-notr>${esc(r.name)}</b><q data-notr>${esc(i.text)}</q></span>
        <span class="mu-talk-btns"><button class="mu-primary" data-act="tk-inv" data-id="${esc(i.id)}" data-v="1">Yes</button><button data-act="tk-inv" data-id="${esc(i.id)}" data-v="0">Not tonight</button></span></div>`;
}
/** Under someone's name in the scene: what they are doing (when it is set to show). */
export function doingOf(r: Resident): string {
    const x = ctxW(); if (!x || !R.tcfg(x.g).doing) return '';
    const { g, w } = x; const s = slotAt(g, w, r, nowAbs(g)); if (!s || whereNow(g, w, r) !== s.loc) return '';
    const t = s.asleep ? 'asleep' : s.act; if (!t) return '';
    return `<small class="mu-doing" title="${esc(t)}" data-notr>${esc(t)}</small>`;
}
/** With "Show the truth": how their battery and wish to see you stand, in words. */
export function truthRow(g: Save, a: string): string {
    const x = R.talkOf(g); const b = R.batteryOf(g, a); const i = x.init[a] ?? 0;
    const bat = !R.tcfg(g).battery ? '' : b > 70 ? 'full of energy for company' : b > 40 ? 'fine with company' : b > 15 ? 'getting tired of company' : 'has had enough company for now';
    const want = i >= T.SEEK ? 'wants to see you and may come looking' : i >= 30 ? 'would not mind seeing you' : 'not looking for you right now';
    return `<small class="mu-muted">${icon('eye')} Right now: ${esc([bat, want].filter(Boolean).join('; '))}.</small>`;
}

/* ---------- the map's fog ---------- */

/** The faces a room shows on the map: who is there, or (with the fog) whom you last saw there, faded. */
export function fogFaces(g: Save, w: WorldDef, loc: string, max: number, pic: (r: Resident) => string): { html: string; any: boolean; ghost: boolean } {
    const m = R.mapPeople(g, w, loc);
    if (m.here.length) return { html: '', any: true, ghost: false };
    if (!m.ghosts.length) return { html: '', any: false, ghost: false };
    const ago = (n: number) => (n < 60 ? `${Math.max(1, Math.round(n / 5) * 5)} min ago` : `${Math.round(n / 60)} h ago`);
    return { html: `<span class="faces is-ghost">${m.ghosts.slice(0, max).map(({ r, ago: n }) => `<img src="${esc(pic(r))}" alt="" title="${esc(r.name)}: last seen here ${ago(n)}">`).join('')}</span>`, any: true, ghost: true };
}
export const fogOn = (g: Save) => R.tcfg(g).fog;

/* ---------- settings ---------- */

const SEG = (id: string, cur: string, opts: [string, string][]) => `<div class="mu-bd-seg">${opts.map(([v, l]) => `<button class="${cur === v ? 'is-on' : ''}" data-act="tk-set" data-k="${id}" data-v="${v}">${l}</button>`).join('')}</div>`;
const TOG = (id: string, on: boolean, label: string, small: string) => `<label class="mu-check"><input type="checkbox" data-input="tk-tog" data-k="${id}" ${on ? 'checked' : ''}><span>${label}<small>${small}</small></span></label>`;
const FQ: [string, string][] = [['off', 'Off'], ['rare', 'Rare'], ['normal', 'Sometimes'], ['often', 'Often']];
export const TV = { topics: false, add: '' };
export function talkSettingsHtml(g: Save): string {
    const c = R.tcfg(g); const tc = R.topicsCfg();
    return `<section class="mu-bd-set"><h4>Their move</h4>
        <b>A conversation going on when you walk in</b>${SEG('talk', c.talk, FQ)}
        ${TOG('ask1', c.ask1, 'Ask first', c.ask1 ? 'A card: listen, join in or walk past.' : 'Off: you hear the first lines right away.')}
        <b>Someone comes up to you, comes looking for you</b>${SEG('come', c.come, FQ)}
        ${TOG('ask2', c.ask2, 'Ask first', c.ask2 ? 'A card: listen, or not now (sent away too often, they come less).' : 'Off: they just start talking.')}
        <b>What they talk about</b>${SEG('drama', c.drama, [['calm', 'Calm'], ['normal', 'Usual'], ['spicy', 'Spicy']])}
        <small class="mu-muted">Mostly everyday things (interests, the list below, what was left open); the house's own news (who did what, secrets they all know) more often when spicy.</small>
        <b>Invitations for the evening</b>${SEG('invites', c.invites, [['off', 'Off'], ['rare', 'Every few days'], ['normal', 'Daily at most']])}
        ${TOG('battery', c.battery, 'Social battery', c.battery ? 'Company tires them (introverts sooner, close people later); when they have had enough, they go to their room. Hidden; Show the truth says where it stands.' : 'Off: they never tire of company.')}
        ${TOG('doing', c.doing, 'What they are doing, under their names', 'Reading, headphones on, making tea…')}
        ${TOG('move', c.move, 'Walking to another room takes a minute', 'Two to another floor.')}
        ${TOG('bump', c.bump, 'Running into someone (Mundi\'s)', c.bump ? 'After something you do outside your bedroom, now and then a card: someone free in the house "runs into you" there (they come only if you stop to talk).' : 'Off in a Home: people who come in are the real ones (above). On: Mundi\'s chance encounters, as in its open worlds.')}
        ${TOG('fog', c.fog, 'Fog on the map', c.fog ? 'The map shows only the room you are in; elsewhere, faded, where you last saw everyone (for three hours).' : 'Off: the map shows where everyone is.')}
        <button class="mu-ghost" data-act="tk-topics">${icon('list')}<span>Everyday topics (${T.HOOKS.length - tc.off.length + tc.mine.length})</span></button>
        ${TV.topics ? topicsHtml() : ''}</section>`;
}
function topicsHtml(): string {
    const tc = R.topicsCfg();
    return `<div class="mu-tk-topics"><small class="mu-muted">What the house may talk about when nothing else comes up (in every game). Untick to drop one; add your own (#argue, #joking, #heart… marks a tone it suits).</small>
        <div class="mu-tk-add"><input type="text" maxlength="120" placeholder="the worst present you ever got #joking" value="${esc(TV.add)}" data-input="tk-add"><button data-act="tk-addtopic">${icon('plus')}</button></div>
        ${tc.mine.map((t, i) => `<div class="mu-tk-row is-mine"><span data-notr>${esc(t)}</span><button class="mu-ibtn mu-ghost" data-act="tk-deltopic" data-i="${i}" aria-label="Remove">${icon('x')}</button></div>`).join('')}
        ${T.HOOKS.map((h, i) => `<label class="mu-tk-row"><input type="checkbox" data-input="tk-topic" data-i="${i}" ${tc.off.includes(i) ? '' : 'checked'}><span>${esc(h.t)}${h.eras ? ` <small>(${h.eras.join(', ')})</small>` : ''}</span></label>`).join('')}
        ${tc.off.length || tc.mine.length ? `<button class="mu-ghost" data-act="tk-reset">${icon('undo')}<span>Back to the built-in list</span></button>` : ''}</div>`;
}

/* ---------- actions ---------- */

Object.assign(ACT, {
    'tk-listen': (el) => { if (el.getAttribute('aria-busy')) return; void R.listen(); },
    'tk-join': () => { void R.join(); },
    'tk-pass': () => R.pass(),
    'tk-inv': async (el) => { const x = ctxW(); if (!x) return; const t = await R.answerInvite(x.g, x.w, el.dataset.id!, el.dataset.v === '1'); if (t) toast(t, el.dataset.v === '1' ? 'success' : 'info'); notify(); },
    'tk-set': (el) => { const g = game(); if (!g) return; (R.talkOf(g).cfg as any)[el.dataset.k!] = el.dataset.v; saveGame(); notify(); },
    'tk-topics': () => { TV.topics = !TV.topics; notify(); },
    'tk-addtopic': () => { const t = TV.add.trim(); if (!t) return; R.topicsCfg().mine.push(t.slice(0, 120)); TV.add = ''; saveSettings(); notify(); },
    'tk-deltopic': (el) => { R.topicsCfg().mine.splice(Number(el.dataset.i), 1); saveSettings(); notify(); },
    'tk-reset': () => { const s = settings() as any; s.talkTopics = { off: [], mine: [] }; saveSettings(); notify(); },
});
Object.assign(INPUT, {
    'tk-tog': (el) => { const g = game(); if (!g) return; (R.talkOf(g).cfg as any)[el.dataset.k!] = !!(el as HTMLInputElement).checked; saveGame(); notify(); },
    'tk-add': (el) => { TV.add = String(el.value); },
    'tk-topic': (el) => { const tc = R.topicsCfg(); const i = Number(el.dataset.i); tc.off = (el as HTMLInputElement).checked ? tc.off.filter(x => x !== i) : [...new Set([...tc.off, i])]; saveSettings(); },
});
