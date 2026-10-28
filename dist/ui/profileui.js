// [expanded] Profiles on screen (rules in sim/profile.ts): the "Day and habits" part of a person's page in This
// world → People (the day as a strip, hours you can set by hand, the profile's fields), the question asked once at
// the start of a Home (make profiles now, later, or write them yourself), and the house's dinner rule.
import { esc, game, notify, saveGame, toast, state, nowAbs } from '../core/store.js';
import { getWorld, isScenario } from '../core/world.js';
import { thumb } from '../st/bridge.js';
import { icon } from './icons.js';
import { ACT, INPUT } from './reg.js';
import { isWeekend } from '../sim/time.js';
import * as P from '../sim/profile.js';
import { commonRooms, ctxFor, makeProfile, slotAt } from '../sim/lifeday.js';
const G = (g) => g;
export const LV = { busy: '', setup: false };
const KIND_NAME = { sleep: 'Asleep', room: 'In their room', common: 'Around the house', out: 'Out (work)', meal: 'Meal' };
const hh = (h) => `${String(h).padStart(2, '0')}:00`;
const nextDay = (g, weekend) => { let d = g.day; while (isWeekend(d) !== weekend)
    d++; return d; };
const refresh = async () => { saveGame(); const { refreshPrompt } = await import('../sim/prompt.js'); refreshPrompt(); const { syncScene } = await import('../sim/game.js'); await syncScene(); notify(); };
function strip(g, w, r, p, weekend) {
    const day = nextDay(g, weekend);
    const plan = P.dayPlan(p, ctxFor(g, w, r, day));
    const ov = (weekend ? p.ov?.we : p.ov?.wd) ?? {};
    const rooms = Object.fromEntries(commonRooms(g, w).map(x => [x.id, x.name]));
    return `<div class="mu-lp-strip"><small>${weekend ? 'Weekend' : 'Weekday'}</small><div class="mu-lp-cells">${plan.map((s, h) => {
        const where = s.kind === 'common' || s.kind === 'meal' ? rooms[s.loc] ?? '' : '';
        return `<button class="mu-lp-cell is-${s.kind} ${ov[String(h)] ? 'is-set' : ''}" data-act="lp-hour" data-who="${esc(r.avatar)}" data-h="${h}" data-we="${weekend ? 1 : ''}" title="${esc(`${hh(h)} · ${KIND_NAME[s.kind]}${where ? ` (${where})` : ''} · ${s.act}${ov[String(h)] ? ' · set by hand (click to change)' : ' · click to set by hand'}`)}"></button>`;
    }).join('')}</div></div>`;
}
const hourOpts = (sel) => Array.from({ length: 24 }, (_, h) => `<option value="${h}" ${h === sel ? 'selected' : ''}>${hh(h)}</option>`).join('');
/** In a person's page (Home). */
const keyHtml = (g, r) => `<label class="mu-check"><input type="checkbox" data-input="lp-key" data-who="${esc(r.avatar)}" ${(P.lifexOf(G(g)).keys ?? []).includes(r.avatar) ? 'checked' : ''}><span>Gave you a key to their room<small>You can go in when they are out (a partner always can).</small></span></label>`;
export function profileHtml(g, w, r) {
    if (!isScenario(w))
        return '';
    return `${profileBody(g, w, r)}${keyHtml(g, r)}`;
}
function profileBody(g, w, r) {
    const p = P.profileOf(G(g), r.avatar);
    const busy = LV.busy ? 'disabled' : '';
    if (!p)
        return `<section class="mu-wc-sec mu-lp"><h4>Day and habits</h4>
        <p class="mu-muted">No profile yet: they follow the house's ready routine. A profile gives them their own hours, time alone in their room, favourite rooms and things they do.</p>
        <div class="mu-row"><button class="mu-primary" data-act="lp-gen" data-who="${esc(r.avatar)}" ${busy}>${icon('sparkles')}<span>${LV.busy === r.avatar ? 'Writing…' : 'Make it from their card'}</span></button>
            <button data-act="lp-guess" data-who="${esc(r.avatar)}" ${busy}>${icon('bolt')}<span>Quick guess (no AI)</span></button>
            <button class="mu-ghost" data-act="lp-blank" data-who="${esc(r.avatar)}">${icon('edit')}<span>Write it myself</span></button></div></section>`;
    const rooms = commonRooms(g, w);
    const whereOpts = (sel) => [['room', 'Their room'], ['common', 'Anywhere in the house'], ...rooms.map(x => [x.id, x.name])].map(([v, l]) => `<option value="${esc(v)}" ${v === sel ? 'selected' : ''}>${esc(l)}</option>`).join('');
    const a = esc(r.avatar);
    return `<section class="mu-wc-sec mu-lp"><h4>Day and habits <small class="mu-muted">${p.src === 'gen' ? '· made from the card' : p.src === 'rules' ? '· a quick guess' : '· yours'}</small></h4>
        ${strip(g, w, r, p, false)}${strip(g, w, r, p, true)}
        <div class="mu-lp-strip mu-lp-ticks"><small></small><div class="mu-lp-cells">${Array.from({ length: 24 }, (_, h) => `<i>${h % 3 === 0 ? h : ''}</i>`).join('')}</div></div>
        <div class="mu-lp-legend">${['sleep', 'room', 'common', 'meal', 'out'].map(k => `<span><i class="mu-lp-cell is-${k}"></i>${KIND_NAME[k]}</span>`).join('')}</div>
        <small class="mu-muted">The day changes a little every day. Click an hour to set it by hand (asleep → their room → around the house → back to the profile).</small>
        <div class="mu-row2"><label class="mu-field"><span>Goes to bed</span><select data-input="lp-bed" data-who="${a}">${hourOpts(p.bed)}</select></label>
            <label class="mu-field"><span>Gets up</span><select data-input="lp-wake" data-who="${a}">${hourOpts(p.wake)}</select></label></div>
        <label class="mu-field"><span>At the weekend</span><select data-input="lp-weekend" data-who="${a}">${[0, 1, 2, 3].map(n => `<option value="${n}" ${n === p.weekend ? 'selected' : ''}>${n ? `${n} h later` : 'The same hours'}</option>`).join('')}</select></label>
        <label class="mu-field slider"><span>Free time with others · ${p.social}% <small class="mu-muted">(${p.social < 30 ? 'keeps to their room' : p.social > 70 ? 'always where people are' : 'a bit of both'})</small></span><input type="range" min="0" max="100" step="5" value="${p.social}" data-input="lp-social" data-who="${a}"></label>
        <div class="mu-field"><span>Rooms they like</span><div class="mu-chips">${rooms.map(x => `<button class="mu-chip ${p.rooms.includes(x.id) ? 'is-on' : ''}" data-act="lp-room" data-who="${a}" data-id="${esc(x.id)}">${esc(x.name)}</button>`).join('')}</div></div>
        <div class="mu-field"><span>What they do</span>
            ${p.acts.map((x, i) => `<div class="mu-lp-act"><input type="text" maxlength="60" value="${esc(x.text)}" data-input="lp-act" data-who="${a}" data-i="${i}" data-focus="lpact${i}"><select data-input="lp-actwhere" data-who="${a}" data-i="${i}">${whereOpts(x.where)}</select><button class="mu-ibtn mu-ghost" data-act="lp-actdel" data-who="${a}" data-i="${i}" aria-label="Remove">${icon('x')}</button></div>`).join('')}
            ${p.acts.length < 8 ? `<button class="mu-ghost" data-act="lp-actadd" data-who="${a}">${icon('plus')}<span>Add</span></button>` : ''}
            <small class="mu-muted">Their favourite things come up often, not always: the rest of the time it is something ordinary.</small></div>
        <label class="mu-field"><span>Notes for the AI about them (OOC)</span><textarea rows="3" maxlength="400" data-input="lp-ooc" data-who="${a}" data-focus="lpooc" placeholder="Never brings up her ex first. Embarrassed about her hobby in front of others.">${esc(p.ooc)}</textarea><small class="mu-muted">Sent only when they are in the scene.</small></label>
        <div class="mu-row"><button data-act="lp-gen" data-who="${a}" ${busy}>${icon('sparkles')}<span>${LV.busy === r.avatar ? 'Writing…' : 'Make it again from the card'}</span></button>
            <button class="mu-ghost mu-danger" data-act="lp-clear" data-who="${a}">${icon('trash')}<span>No profile</span></button></div></section>`;
}
/* ---------- the question at the start of a Home ---------- */
const needAsk = (g, w) => isScenario(w) && !P.lifexOf(G(g)).asked && Object.keys(g.cast).length > 0 && (state.view === 'scene' || state.view === 'map');
export function lifeSetupHtml() {
    const g = game();
    const w = g && getWorld(g.world);
    if (!g || !w || !needAsk(g, w))
        return '';
    const people = Object.values(g.cast);
    return `<div class="mu-dlg-veil"></div><div class="mu-panel mu-dlg mu-glassdlg mu-lp-setup" role="dialog"><h3>${icon('calendar')} Their days</h3>
        <p>Each person here can have a profile: when they sleep, how much they keep to their room, the rooms they like and what they do. Without one they follow the house's ready routine (and tend to end up all in the same room).</p>
        <div class="mu-lp-faces">${people.map(r => `<img src="${esc(thumb(r.avatar))}" alt="" title="${esc(r.name)}">`).join('')}</div>
        ${LV.busy ? `<p class="mu-muted">Writing: <b data-notr>${esc(LV.busy)}</b>…</p>` : `<small class="mu-muted">Making them reads each card: one short call per person (${people.length}), with the mechanics model if you set one (Settings → Game), else the main one. You can change everything later in This world → People.</small>`}
        <div class="mu-row mu-dlg-btns"><button data-act="lp-setup-later" ${LV.busy ? 'disabled' : ''}>Later</button><button data-act="lp-setup-self" ${LV.busy ? 'disabled' : ''}>I'll write them myself</button>
            <button class="mu-primary" data-act="lp-setup-gen" ${LV.busy ? 'disabled' : ''}>${icon('sparkles')}<span>Make them</span></button></div></div>`;
}
async function genAll(g, w, avatars) {
    let ok = 0, guessed = 0;
    for (const [i, a] of avatars.entries()) {
        const r = g.cast[a];
        if (!r)
            continue;
        LV.busy = `${r.name} (${i + 1}/${avatars.length})`;
        notify();
        const p = await makeProfile(g, w, a);
        P.lifexOf(G(g)).profiles[a] = p;
        if (p.src === 'gen')
            ok++;
        else
            guessed++;
    }
    LV.busy = '';
    toast(guessed ? `Profiles ready (${ok} from the cards, ${guessed} guessed: the AI did not answer for them).` : `Profiles ready for ${ok} ${ok === 1 ? 'person' : 'people'}.`, guessed ? 'warn' : 'success');
    await refresh();
}
/* ---------- the house's rules (phone Settings) ---------- */
export function houseRulesHtml(g) {
    const lx = P.lifexOf(G(g));
    return `<label class="mu-check"><input type="checkbox" data-input="lp-dinner" ${lx.dinner ? 'checked' : ''}><span>Dinner together</span></label>
        ${lx.dinner ? `<label class="mu-field"><span>At</span><select data-input="lp-dinnerat">${[17, 18, 19, 20, 21].map(h => `<option value="${h}" ${h === lx.dinnerAt ? 'selected' : ''}>${hh(h)}</option>`).join('')}</select></label>` : ''}
        <small class="mu-muted">${lx.dinner ? 'Whoever has a profile and is home and awake eats with the others.' : 'Off: everyone eats on their own, when they like.'}</small>`;
}
/* ---------- actions ---------- */
const gw = () => { const g = game(); const w = g && getWorld(g.world); return g && w ? { g, w } : null; };
const prof = (el) => { const c = gw(); const a = el.dataset.who ?? ''; const p = c && P.profileOf(G(c.g), a); return c && p ? { ...c, p, a } : null; };
const hand = (p) => { p.src = 'hand'; };
Object.assign(ACT, {
    'lp-gen': async (el) => {
        const c = gw();
        const a = el.dataset.who ?? '';
        if (!c || LV.busy || !c.g.cast[a])
            return;
        LV.busy = a;
        notify();
        try {
            const p = await makeProfile(c.g, c.w, a);
            const old = P.profileOf(G(c.g), a);
            if (old?.ooc && !p.ooc)
                p.ooc = old.ooc;
            P.lifexOf(G(c.g)).profiles[a] = p;
            toast(p.src === 'gen' ? 'Profile made from the card.' : 'The AI did not answer: a quick guess instead.', p.src === 'gen' ? 'success' : 'warn');
        }
        finally {
            LV.busy = '';
        }
        await refresh();
    },
    'lp-guess': async (el) => { const c = gw(); const a = el.dataset.who ?? ''; if (!c)
        return; P.lifexOf(G(c.g)).profiles[a] = await makeProfile(c.g, c.w, a, false); await refresh(); },
    'lp-blank': async (el) => { const c = gw(); const a = el.dataset.who ?? ''; if (!c)
        return; P.lifexOf(G(c.g)).profiles[a] = P.cleanProfile({ acts: [{ text: 'scrolling on the phone', where: 'room' }] }, [], 'hand'); await refresh(); },
    'lp-clear': async (el) => { const c = gw(); if (!c)
        return; delete P.lifexOf(G(c.g)).profiles[el.dataset.who ?? '']; await refresh(); },
    'lp-hour': async (el) => {
        const x = prof(el);
        if (!x)
            return;
        const we = !!el.dataset.we, h = Number(el.dataset.h);
        const cur = ((we ? x.p.ov?.we : x.p.ov?.wd) ?? {})[String(h)] ?? null;
        const next = P.CYCLE[(P.CYCLE.indexOf(cur) + 1) % P.CYCLE.length];
        P.setHour(x.p, we, h, next);
        await refresh();
    },
    'lp-room': async (el) => { const x = prof(el); if (!x)
        return; const id = el.dataset.id; x.p.rooms = x.p.rooms.includes(id) ? x.p.rooms.filter(r => r !== id) : [...x.p.rooms, id].slice(0, 4); hand(x.p); await refresh(); },
    'lp-actadd': (el) => { const x = prof(el); if (!x)
        return; x.p.acts.push({ text: '', where: 'room' }); hand(x.p); saveGame(); notify(); },
    'lp-actdel': async (el) => { const x = prof(el); if (!x)
        return; x.p.acts.splice(Number(el.dataset.i), 1); hand(x.p); await refresh(); },
    'lp-setup-later': () => { const g = game(); if (!g)
        return; P.lifexOf(G(g)).asked = true; saveGame(); toast('You can make profiles any time in This world → People.', 'info'); notify(); },
    'lp-setup-self': () => { const g = game(); if (!g)
        return; P.lifexOf(G(g)).asked = true; saveGame(); ACT['open-world']?.(document.body, new Event('click')); },
    'lp-setup-gen': async () => { const c = gw(); if (!c || LV.busy)
        return; await genAll(c.g, c.w, Object.keys(c.g.cast)); P.lifexOf(G(c.g)).asked = true; saveGame(); notify(); },
});
const num = (el) => Number(el.value);
Object.assign(INPUT, {
    'lp-bed': async (el) => { const x = prof(el); if (!x)
        return; x.p.bed = num(el); hand(x.p); await refresh(); },
    'lp-wake': async (el) => { const x = prof(el); if (!x)
        return; x.p.wake = num(el); hand(x.p); await refresh(); },
    'lp-weekend': async (el) => { const x = prof(el); if (!x)
        return; x.p.weekend = num(el); hand(x.p); await refresh(); },
    'lp-social': (el, e) => { const x = prof(el); if (!x)
        return; x.p.social = num(el); hand(x.p); saveGame(); if (e.type === 'change')
        refresh(); },
    'lp-act': (el) => { const x = prof(el); if (!x)
        return; const a = x.p.acts[Number(el.dataset.i)]; if (a) {
        a.text = el.value.slice(0, 60);
        hand(x.p);
        saveGame();
    } },
    'lp-actwhere': async (el) => { const x = prof(el); if (!x)
        return; const a = x.p.acts[Number(el.dataset.i)]; if (a) {
        a.where = el.value;
        hand(x.p);
        await refresh();
    } },
    'lp-ooc': (el) => { const x = prof(el); if (!x)
        return; x.p.ooc = el.value.slice(0, 400); saveGame(); },
    'lp-key': (el) => { const g = game(); if (!g)
        return; const lx = P.lifexOf(G(g)); const a = el.dataset.who ?? ''; lx.keys = el.checked ? [...new Set([...(lx.keys ?? []), a])] : (lx.keys ?? []).filter(x => x !== a); saveGame(); notify(); },
    'lp-dinner': async (el) => { const g = game(); if (!g)
        return; P.lifexOf(G(g)).dinner = el.checked; await refresh(); },
    'lp-dinnerat': async (el) => { const g = game(); if (!g)
        return; P.lifexOf(G(g)).dinnerAt = Number(el.value); await refresh(); },
});
// (where they are now, for the map's faces: upstream's whereNow reads the profile through the routine)
export const doingNow = (g, w, r) => slotAt(g, w, r, nowAbs(g));
