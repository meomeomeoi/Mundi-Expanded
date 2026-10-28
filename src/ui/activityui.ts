// [expanded] The plan form's extras in a Home (rules in sim/activities.ts): what the plan is for, who else comes,
// and who pays. Upstream's invite buttons are wrapped: they work as before, and then the activity is stored and the
// others are asked along (in person or by phone, they answer the same way: the engine decides).
import { esc, game, toast, saveGame, notify } from '../core/store.js';
import { getWorld, isScenario, type WorldDef } from '../core/world.js';
import type { Save } from '../core/store.js';
import { thumb } from '../st/bridge.js';
import { icon } from './icons.js';
import { ACT } from './reg.js';
import { outingId, pins } from '../sim/places.js';
import { social, bondOf, type PlanKind } from '../sim/social.js';
import { check, add, HANGOUT_BOND } from '../sim/plans.js';
import { note as remember } from '../sim/facts.js';
import { moneyOn } from '../sim/money.js';
import { difficultyOf } from '../sim/bills.js';
import * as A from '../sim/activities.js';
import { PL } from './plans.js';

export const AX = { act: '' as '' | A.ActId, with: [] as string[], treat: false, title: '' };
const OUT_PICK = '__out';   // upstream's "somewhere out" in the place list
const G = (g: Save) => g as unknown as A.GLike;

/** In upstream's plan form (Home only): the activity chips, who else comes, and who pays. */
export function planExtrasHtml(g: Save, w: WorldDef, avatar: string): string {
    if (!isScenario(w)) return '';
    const act = A.actOf(AX.act);
    const others = Object.values(g.cast).filter(r => r.met && r.avatar !== avatar && bondOf(g, r.avatar) >= HANGOUT_BOND);
    AX.with = AX.with.filter(a => others.some(r => r.avatar === a));
    const blocked = act ? A.actBlocked(G(g), act) : '';
    return `<div class="mu-field mu-ax"><span>What for</span><div class="mu-chips mu-ax-acts">
            <button class="mu-chip ${!act ? 'is-on' : ''}" data-act="ax-act" data-v="">Just hang out</button>
            ${A.ACTIVITIES.map(a => `<button class="mu-chip ${AX.act === a.id ? 'is-on' : ''}" data-act="ax-act" data-v="${a.id}">${icon(a.icon)}<span>${esc(a.name)}</span></button>`).join('')}</div>
            ${blocked ? `<small class="mu-ax-warn">${esc(blocked)}</small>` : act ? `<small class="mu-muted">${esc(act.out ? `Out of the house: ${act.out}.` : 'At home.')}${act.cost && moneyOn(G(g)) ? ` About ${Math.round(act.cost * difficultyOf(g).price)} each.` : ''}</small>` : ''}
        </div>
        ${others.length ? `<div class="mu-field mu-ax"><span>Who else comes</span><div class="mu-out-people">${others.map(r => `<button class="mu-chip ${AX.with.includes(r.avatar) ? 'is-on' : ''}" data-act="ax-with" data-who="${esc(r.avatar)}"><img src="${esc(thumb(r.avatar))}" alt=""><span data-notr>${esc(r.name)}</span></button>`).join('')}</div>
            ${AX.with.length ? '<small class="mu-muted">They are asked too, and answer on their own.</small>' : ''}</div>` : ''}
        ${act?.cost && moneyOn(G(g)) ? `<label class="mu-check mu-ax"><input type="checkbox" data-act="ax-treat" ${AX.treat ? 'checked' : ''}><span>I'll pay for everyone</span></label>` : ''}`;
}

// Picking an activity fills in the place and the name (unless you wrote your own).
function pickAct(g: Save, w: WorldDef, id: string) {
    const prev = A.actOf(AX.act); const a = A.actOf(id);
    AX.act = (a?.id ?? '') as typeof AX.act;
    if (!PL.title.trim() || (prev && PL.title === prev.name)) PL.title = a?.name ?? '';
    if (!a) return;
    if (a.home && pins(g, w).some(p => p.id === a.home)) PL.place = a.home;
    else if (a.out) { PL.place = OUT_PICK; PL.out = a.out; }
    if (!a.cost) AX.treat = false;
}
Object.assign(ACT, {
    'ax-act': (el) => { const g = game(); const w = g && getWorld(g.world); if (!g || !w) return; pickAct(g, w, el.dataset.v ?? ''); notify(); },
    'ax-with': (el) => { const a = el.dataset.who!; AX.with = AX.with.includes(a) ? AX.with.filter(x => x !== a) : [...AX.with, a]; notify(); },
    'ax-treat': (el) => { AX.treat = (el as HTMLInputElement).checked; },
});

/** After an invitation was made: the activity on the new plan, and the others asked along. */
export function afterInvite(g: Save, w: WorldDef, who: string, before: Set<string>, snap: typeof AX & { place: string; from: number; kind: PlanKind; title: string }): string[] {
    const made = social(g).appts.find(a => a.avatar === who && !before.has(a.id) && a.from === snap.from);
    if (!made) return [];
    const group = snap.with.length ? `g${made.id}` : undefined;
    A.setMeta(G(g), made.id, { act: snap.act || undefined, group, treat: snap.treat });
    const out: string[] = []; const joined: string[] = [];
    for (const x of snap.with) {
        const r = g.cast[x]; if (!r) continue;
        const kind: PlanKind = 'hangout';   // a date stays between two: the others come as friends
        const ans = check(g, w, x, snap.place, snap.from, snap.from + 120, kind, HANGOUT_BOND);
        if (!ans.ok) { out.push(`${r.name} can't come: ${ans.why.replace(/^They /, '').replace(/^are /, 'is ').replace(/^do /, 'does ').replace(/^work /, 'works ')}`); continue; }
        const b = add(g, x, snap.place, snap.from, kind, false, snap.title);
        A.setMeta(G(g), b.id, { act: snap.act || undefined, group, treat: snap.treat });
        joined.push(r.name);
        remember(g, '{u} invited {0} along to a plan with {1}, and {0} said yes.', [r.name, g.cast[who]?.name ?? ''], [x], g.player.loc, 'plan');
    }
    if (joined.length) out.unshift(`${joined.join(', ')} ${joined.length === 1 ? 'is' : 'are'} coming too.`);
    return out;
}

// Upstream's two invite buttons, wrapped once every module has loaded (plans.ts registers them after this file).
function wrap(id: string) {
    const orig = ACT[id]; if (!orig || (orig as any).__ax) return;
    const fn = async (el: HTMLElement, e: Event) => {
        const g = game(); const w = g && getWorld(g.world);
        if (!g || !w || !isScenario(w) || (!AX.act && !AX.with.length)) return orig(el, e);
        const who = el.dataset.who!;
        const snap = { ...AX, with: [...AX.with], place: PL.place === OUT_PICK ? (PL.out.trim() ? outingId(PL.out) : '') : PL.place, from: (g.day + PL.day) * 1440 + PL.time, kind: PL.kind, title: PL.title.trim() };
        const before = new Set(social(g).appts.map(a => a.id));
        await orig(el, e);
        const notes = afterInvite(g, w, who, before, snap);
        if (social(g).appts.some(a => !before.has(a.id))) Object.assign(AX, { act: '', with: [], treat: false });
        notes.forEach((n, i) => toast(n, i === 0 && !/can't/.test(n) ? 'success' : 'info'));
        saveGame(); notify();
    };
    (fn as any).__ax = true; ACT[id] = fn as any;
}
setTimeout(() => { wrap('pl-invite'); wrap('pl-invite-face'); }, 0);
