// [expanded] The 🎁 in the scene's composer (Home): attach a thing of yours or some money to your next line, for
// someone here (or money for the house fund). It changes hands when the line is sent, and the line carries a
// bracketed note ("[🎁 Gleb gives Kathie: a pudding]") so the scene can react; how they took it is read afterwards.
import { notify, esc, game, toast, saveGame } from '../core/store.js';
import { getWorld, isScenario } from '../core/world.js';
import { personaName } from '../st/bridge.js';
import { presentAt } from '../sim/people.js';
import { money } from '../sim/needs.js';
import { refreshPrompt } from '../sim/prompt.js';
import { ACT, INPUT } from './reg.js';
import { icon } from './icons.js';
import * as S from '../sim/stock.js';
import * as M from '../sim/money.js';
const GV = { open: false, to: '', kind: 'item', item: '', amount: '', att: null };
const ctxW = () => { const g = game(); const w = g && getWorld(g.world); return g && w && isScenario(w) ? { g, w } : null; };
const FUND = 'fund';
const mine = (g) => S.stockOf(g).items.filter(i => i.qty > 0 && (i.owner === S.PLAYER || (i.store === S.roomOf(S.PLAYER) && !i.owner)));
const nm = (g, a) => (a === FUND ? 'the house fund' : g.cast[a]?.name ?? a);
export function giftButton(nobody) {
    const c = ctxW();
    if (!c || nobody)
        return '';
    const a = GV.att;
    const label = a ? `🎁 ${esc(nm(c.g, a.to))}: ${a.kind === 'money' ? esc(money(c.w, a.amount ?? 0)) : esc(S.stockOf(c.g).items.find(i => i.id === a.item)?.name ?? '?')}` : '🎁';
    return `<button data-act="gift-open" class="${a || GV.open ? 'is-on' : ''} mu-gift-btn" title="Give something with your next line">${label}</button>`;
}
export function giftHtml() {
    const c = ctxW();
    if (!c || !GV.open)
        return '';
    const { g, w } = c;
    const people = presentAt(g, w, g.player.loc).map(r => r.avatar);
    const on = M.moneyOn(g);
    const targets = [...people, ...(on ? [FUND] : [])];
    if (!targets.includes(GV.to))
        GV.to = targets[0] ?? '';
    if (GV.to === FUND || !on && GV.kind === 'money')
        GV.kind = GV.to === FUND ? 'money' : 'item';
    const items = mine(g);
    return `<div class="mu-gift-veil" data-act="gift-close"><section class="mu-gift mh-glass" role="dialog" aria-label="Give something">
        <b>Give with your next line</b>
        <div class="mu-chips">${targets.map(a => `<button class="mu-chip ${GV.to === a ? 'is-on' : ''}" data-act="gift-to" data-v="${esc(a)}" data-notr>${esc(nm(g, a))}</button>`).join('') || '<small class="mu-muted">Nobody is here.</small>'}</div>
        ${GV.to !== FUND && on ? `<div class="mu-bd-seg mu-gift-kind"><button class="${GV.kind === 'item' ? 'is-on' : ''}" data-act="gift-kind" data-v="item">A thing</button><button class="${GV.kind === 'money' ? 'is-on' : ''}" data-act="gift-kind" data-v="money">Money</button></div>` : ''}
        ${GV.kind === 'item'
        ? (items.length ? `<label class="mu-field"><span>What</span><select data-input="gift-item">${items.map(i => `<option value="${esc(i.id)}" ${GV.item === i.id ? 'selected' : ''}>${esc(i.name)}${i.qty > 1 ? ` (×${i.qty})` : ''} · ${esc(S.storeName(g, i.store, 'your'))}</option>`).join('')}</select></label>`
            : '<small class="mu-muted">You have nothing of your own to give: things in your room, or labelled as yours, show up here.</small>')
        : `<label class="mu-field"><span>How much (you have ${esc(money(w, g.player.money))})</span><input type="number" min="1" data-input="gift-amount" value="${esc(GV.amount)}"></label>`}
        <div class="mu-bd-row">${GV.att ? `<button class="mu-ghost" data-act="gift-clear">${icon('x')}<span>Remove</span></button>` : ''}<button class="mu-primary" data-act="gift-attach">${icon('check')}<span>Attach</span></button></div>
        <small class="mu-muted">It changes hands when you send the line; write what you say with it.</small></section></div>`;
}
// On send: hands the attachment over and returns the line with its note (or null: something is wrong, do not send).
export function withGift(text) {
    const a = GV.att;
    if (!a)
        return text;
    const c = ctxW();
    if (!c) {
        GV.att = null;
        return text;
    }
    const { g, w } = c;
    const G = g;
    const you = personaName();
    let note = '';
    if (a.to === FUND) {
        const why = M.contribute(G, a.amount ?? 0);
        if (why) {
            toast(why, 'warn');
            return null;
        }
        note = `[💰 ${you} puts ${money(w, a.amount ?? 0)} into the house fund]`;
    }
    else if (!g.cast[a.to] || !presentAt(g, w, g.player.loc).some(r => r.avatar === a.to)) {
        toast(`${nm(g, a.to)} is not here any more.`, 'warn');
        GV.att = null;
        notify();
        return null;
    }
    else if (a.kind === 'money') {
        const n = a.amount ?? 0;
        if (!(n > 0) || g.player.money < n) {
            toast('You do not have that much.', 'warn');
            return null;
        }
        M.walletAdd(G, -n, `To ${nm(g, a.to)}`);
        const back = M.repay(G, M.PLAYER, a.to, n);
        if (n - back > 0)
            M.recordGift(G, M.PLAYER, a.to, money(w, n - back));
        note = `[🎁 ${you} gives ${nm(g, a.to)} ${money(w, n)}${back ? ` (paying back ${money(w, back)} owed)` : ''}]`;
    }
    else {
        const it = S.stockOf(G).items.find(i => i.id === a.item && i.qty > 0);
        if (!it) {
            toast('That thing is gone.', 'warn');
            GV.att = null;
            notify();
            return null;
        }
        const dest = S.catalogOf(it.name)?.store ?? S.roomOf(a.to);
        const name = it.name;
        S.moveItem(G, it, dest, 1, a.to);
        M.recordGift(G, M.PLAYER, a.to, name);
        note = `[🎁 ${you} gives ${nm(g, a.to)}: ${name}]`;
    }
    GV.att = null;
    saveGame();
    refreshPrompt();
    return `${text}\n${note}`;
}
Object.assign(ACT, {
    'gift-open': () => { GV.open = !GV.open; if (GV.att) {
        GV.to = GV.att.to;
        GV.kind = GV.att.kind;
        GV.item = GV.att.item ?? '';
        GV.amount = String(GV.att.amount ?? '');
    } notify(); },
    'gift-close': (el, e) => { if (e && e.target !== el)
        return; GV.open = false; notify(); },
    'gift-to': (el) => { GV.to = el.dataset.v ?? ''; notify(); },
    'gift-kind': (el) => { GV.kind = el.dataset.v === 'money' ? 'money' : 'item'; notify(); },
    'gift-clear': () => { GV.att = null; GV.open = false; notify(); },
    'gift-attach': () => {
        const c = ctxW();
        if (!c)
            return;
        if (!GV.to) {
            toast('Choose who it is for.', 'info');
            return;
        }
        if (GV.kind === 'money' || GV.to === FUND) {
            const n = Number(GV.amount);
            if (!(n > 0)) {
                toast('Write an amount.', 'info');
                return;
            }
            if (c.g.player.money < n) {
                toast('You do not have that much.', 'info');
                return;
            }
            GV.att = { to: GV.to, kind: 'money', amount: Math.round(n * 100) / 100 };
        }
        else {
            const items = mine(c.g);
            const id = items.some(i => i.id === GV.item) ? GV.item : items[0]?.id;
            if (!id) {
                toast('You have nothing of your own to give.', 'info');
                return;
            }
            GV.att = { to: GV.to, kind: 'item', item: id };
        }
        GV.open = false;
        notify();
    },
});
Object.assign(INPUT, {
    'gift-item': (el) => { GV.item = String(el.value); },
    'gift-amount': (el) => { GV.amount = el.value; },
});
