// [expanded] Bedroom doors on screen (rules in sim/doors.ts): going to someone's room in a Home asks first when
// they are in (knock), asleep (knock, wake them, let them sleep) or out (only a partner or a key lets you in).
import { esc, game, notify, saveGame, toast, nowAbs } from '../core/store.js';
import { getWorld, isScenario } from '../core/world.js';
import { thumb } from '../st/bridge.js';
import { icon } from './icons.js';
import { ACT } from './reg.js';
import { bondOf, isPartner, bump, social } from '../sim/social.js';
import { activeFeelings, feel } from '../sim/life.js';
import { whereNow } from '../sim/people.js';
import { ownRoom, slotAt } from '../sim/lifeday.js';
import * as P from '../sim/profile.js';
import * as D from '../sim/doors.js';
import { startIntrusion } from '../sim/intrude.js';
const G = (g) => g;
export const DR = { loc: '', mode: '', note: '' };
const H = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
} h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b); h ^= h >>> 13; return (h >>> 0) / 4294967296; };
/** Whose room this is (one or more people who sleep there), in a Home; [] for anything else. */
export function ownersOf(g, w, loc) {
    if (!isScenario(w) || !loc.startsWith('home:') || loc === 'home:player')
        return [];
    return Object.values(g.cast).filter(r => ownRoom(r) === loc);
}
export function whoOf(g, r) {
    const p = P.profileOf(G(g), r.avatar);
    return { bond: bondOf(g, r.avatar), partner: isPartner(g, r.avatar), key: (P.lifexOf(G(g)).keys ?? []).includes(r.avatar), social: p?.social ?? 50, grudge: activeFeelings(g, r.avatar).some(f => D.GRUDGE.test(f.tag)) };
}
const asleep = (g, w, r) => !!slotAt(g, w, r, nowAbs(g))?.asleep;
/** On the map: a sleeping face is dimmed and marked (💤 in its tooltip). */
// (the first title attribute wins in HTML: this one comes before upstream's)
export const sleepAttr = (g, w, r) => (asleep(g, w, r) ? `class="is-asleep" title="${esc(r.met ? r.name : 'Someone')} · 💤 asleep"` : '');
/** Before going to `loc` (upstream's goTo): true when the door is being dealt with here (a dialog, or a refusal). */
export async function doorFlow(loc) {
    const g = game();
    const w = g && getWorld(g.world);
    if (!g || !w || loc === g.player.loc || D.passPending(loc))
        return false;
    const owners = ownersOf(g, w, loc);
    if (!owners.length)
        return false;
    const inside = owners.filter(r => whereNow(g, w, r) === loc);
    if (!inside.length) {
        if (owners.some(r => D.letsSelfIn(whoOf(g, r)))) {
            D.passDoor(loc);
            toast('You let yourself in.', 'info');
            return false;
        }
        Object.assign(DR, { loc, mode: 'empty', note: '' });
        notify();
        return true;
    }
    const awake = inside.filter(r => !asleep(g, w, r));
    if (awake.some(r => whoOf(g, r).partner && !whoOf(g, r).grudge)) {
        D.passDoor(loc);
        return false;
    }
    Object.assign(DR, { loc, mode: awake.length ? 'awake' : 'asleep', note: '' });
    notify();
    return true;
}
export function doorHtml() {
    const g = game();
    const w = g && getWorld(g.world);
    if (!g || !w || !DR.mode)
        return '';
    const owners = ownersOf(g, w, DR.loc);
    if (!owners.length) {
        DR.mode = '';
        return '';
    }
    const inside = owners.filter(r => whereNow(g, w, r) === DR.loc);
    const names = (inside.length ? inside : owners).map(r => r.name).join(' and ');
    const faces = (inside.length ? inside : owners).map(r => `<img src="${esc(thumb(r.avatar))}" alt="">`).join('');
    const wakeable = inside.some(r => D.canWake(whoOf(g, r)));
    const body = DR.mode === 'empty' ? `<p>${esc(names)} ${owners.length > 1 ? 'are' : 'is'} not in. The door is closed.</p><small class="mu-muted">You can go in anyway. If ${owners.length > 1 ? 'one of them comes' : 'they come'} back while you are inside, you are found; after you leave, ${owners.length > 1 ? 'they' : 'they'} may notice. How they take it depends on how close you are, who they are and what you did in there.</small>`
        : DR.mode === 'asleep' ? `<p>It is quiet behind the door: ${esc(names)} ${inside.length > 1 ? 'are' : 'is'} asleep.</p>`
            : `<p>${esc(names)} ${inside.length > 1 ? 'are' : 'is'} in. The door is closed.</p>`;
    const btns = DR.mode === 'empty' ? `<button class="mu-danger" data-act="door-sneak" title="If they come back while you are inside, they find you; they may also notice later">${icon('lock')}<span>Go in anyway</span></button><button class="mu-primary" data-act="door-leave">Leave it</button>`
        : DR.mode === 'asleep' ? `<button data-act="door-leave">Let them sleep</button><button data-act="door-knock">${icon('chat')}<span>Knock</span></button>
            <button class="mu-primary" data-act="door-wake" ${wakeable ? '' : 'aria-disabled="true" title="Only for someone you are very close to (friendship 60+) or together with"'}>${icon('bolt')}<span>Wake them</span></button>`
            : `<button data-act="door-leave">Leave</button><button class="mu-primary" data-act="door-knock">${icon('chat')}<span>Knock</span></button>`;
    return `<div class="mu-dlg-veil" data-act="door-leave"></div><div class="mu-panel mu-dlg mu-glassdlg mu-door" role="dialog"><div class="mu-door-faces">${faces}</div>
        <h3>${icon('home')} ${esc(owners.length > 1 ? `${owners.map(r => r.name).join(' and ')}'s room` : `${owners[0].name}'s room`)}</h3>
        ${body}${DR.note ? `<p class="mu-door-note">${esc(DR.note)}</p>` : ''}<div class="mu-row mu-dlg-btns">${btns}</div></div>`;
}
const close = () => { DR.mode = ''; DR.loc = ''; DR.note = ''; };
async function goIn(loc) { close(); D.passDoor(loc); const b = document.createElement('button'); b.dataset.loc = loc; await ACT['go']?.(b, new Event('click')); }
async function sync() { saveGame(); const { syncScene } = await import('../sim/game.js'); await syncScene(); const { refreshPrompt } = await import('../sim/prompt.js'); refreshPrompt(); notify(); }
function answer(g, w, r, a, loc) {
    const n = r.name;
    if (a === 'in') {
        toast(`${n}: "Come in."`, 'success');
        goIn(loc);
        return;
    }
    if (a === 'door') {
        // they come out to talk: they stand with you in the hallway (where you are) for a while
        const now = nowAbs(g);
        const s = social(g);
        if (!s.with.some(c => c.avatar === r.avatar))
            s.with.push({ avatar: r.avatar, until: now + 30 });
        P.lifexOf(G(g)).atDoor = { avatar: r.avatar, until: now + 30 };
        close();
        toast(`${n} opens the door a little and steps out to talk.`, 'info');
        sync();
        return;
    }
    if (a === 'no') {
        DR.note = `${n}, through the door: "Not now."`;
        notify();
        return;
    }
    DR.note = 'No answer.';
    notify();
}
Object.assign(ACT, {
    'door-leave': (el, e) => { if (el.classList.contains('mu-dlg-veil') && e?.target !== el)
        return; close(); notify(); },
    'door-knock': () => {
        const g = game();
        const w = g && getWorld(g.world);
        if (!g || !w || !DR.loc)
            return;
        const inside = ownersOf(g, w, DR.loc).filter(r => whereNow(g, w, r) === DR.loc);
        const r = inside[0];
        if (!r) {
            close();
            notify();
            return;
        }
        const hour = Math.floor(g.minutes / 60), roll = H(`${r.avatar}|${nowAbs(g)}|knock`), roll2 = H(`${r.avatar}|${nowAbs(g)}|wake`);
        if (DR.mode === 'asleep') {
            const a = D.knockAsleep(whoOf(g, r), hour, roll2, roll);
            if (a !== 'asleep') {
                (P.lifexOf(G(g)).woke ??= {})[r.avatar] = nowAbs(g) + D.WOKEN_MIN;
                DR.mode = 'awake';
            }
            answer(g, w, r, a, DR.loc);
            return;
        }
        answer(g, w, r, D.knock(whoOf(g, r), hour, roll), DR.loc);
    },
    'door-sneak': async () => {
        const g = game();
        const w = g && getWorld(g.world);
        if (!g || !w || !DR.loc)
            return;
        const loc = DR.loc;
        const owners = ownersOf(g, w, loc).map(r => r.avatar);
        await goIn(loc);
        if (g.player.loc === loc) {
            startIntrusion(g, loc, owners);
            saveGame();
        }
    },
    'door-wake': (el) => {
        if (el.getAttribute('aria-disabled'))
            return;
        const g = game();
        const w = g && getWorld(g.world);
        if (!g || !w || !DR.loc)
            return;
        const inside = ownersOf(g, w, DR.loc).filter(r => whereNow(g, w, r) === DR.loc);
        for (const r of inside) {
            (P.lifexOf(G(g)).woke ??= {})[r.avatar] = nowAbs(g) + D.WOKEN_MIN;
            if (!whoOf(g, r).partner) {
                bump(g, r.avatar, -2);
                feel(g, r.avatar, 'Grumpy: you woke them up', 1);
            }
        }
        toast(`You wake ${inside.map(r => r.name).join(' and ')} up.`, 'info');
        goIn(DR.loc);
    },
});
