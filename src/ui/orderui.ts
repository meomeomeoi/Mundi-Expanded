// [expanded] The online shop (Home, a modern house; Mundi Expanded 0.2.0.7): the era's catalog by kind, a room for each
// thing (yours, or a room of the house), paid from your wallet when money is on; what is on its way, and the boxes in
// the hallway to unpack. The house's own purchases are proposed to the house (the house chat votes; houseprops.ts).
import { saveGame, notify, esc, game, toast, type Save } from '../core/store.js';
import { getWorld, type WorldDef } from '../core/world.js';
import { icon } from './icons.js';
import { ACT, INPUT } from './reg.js';
import { refreshPrompt } from '../sim/prompt.js';
import { moneyOn, houseOf } from '../sim/money.js';
import { weekday, hm } from '../sim/time.js';
import * as F from '../sim/furnish.js';
import { furnishOn, eraOf, houseRooms, roomName, hallOf } from '../sim/furnishrun.js';
import { placeOrder, unpackOrder, priceOfCat, SHOPPING, shopRoll, buyHere } from '../sim/orders.js';
import { isOuting } from '../sim/places.js';
import { outingOf } from '../sim/outing.js';
import { proposeByYou } from '../sim/houseprops.js';

export const OV = { open: '', room: '', busy: false };
const G = (g: Save) => g as unknown as F.GLike;
const GROUPS: [string, string[]][] = [
    ['Screens and games', ['tv', 'projector', 'dvd', 'console', 'handheld', 'vr', 'pc', 'laptop', 'pooltable', 'darts', 'boardgames']],
    ['Music', ['stereo', 'turntable', 'guitar', 'keyboard', 'piano', 'karaoke']],
    ['Furniture', ['couch', 'armchair', 'bookshelf', 'desk', 'doublebed', 'vanity', 'aquarium']],
    ['Making things', ['easel', 'sewing', 'workbench']],
    ['Working out', ['treadmill', 'weights', 'yogamat', 'bike']],
    ['Kitchen and dining', ['stove', 'microwave', 'coffee', 'table']],
    ['Bath, laundry, outside', ['bathtub', 'washer', 'grill', 'loungers', 'hottub']],
];
export const shopTitle = (g: Save) => ({ '2000s': 'Web shop', '2010s': 'Online store', now: 'Marketplace' } as Record<F.Era, string>)[eraOf(g)];
const money = (g: Save) => moneyOn(g as any);
const when = (g: Save, at: number) => { const d = Math.floor(at / 1440); return `${d === g.day ? 'today' : d === g.day + 1 ? 'tomorrow' : weekday(d)}, ${hm(at % 1440)}`; };

/** The rooms a thing can be ordered for: yours, and the house's rooms of a kind it belongs in. */
function roomsForCat(g: Save, w: WorldDef, c: F.CatFixture) {
    return houseRooms(g, w).filter(r => r.owner === 'player' || (!r.owner && (!r.kind || c.rooms.includes(r.kind))));
}

function itemHtml(g: Save, w: WorldDef, c: F.CatFixture): string {
    const era = eraOf(g); const open = OV.open === c.id;
    const price = money(g) ? `${priceOfCat(g, c)}` : '';
    const head = `<button class="mu-ph-row mu-or-row ${open ? 'is-on' : ''}" data-act="or-open" data-v="${esc(c.id)}"><span><b data-notr>${esc(F.catName(c, era))}</b>
        <small>${esc(c.affords.map(a => F.AFFORDS[a]).join(', '))} · ${c.size === 'small' ? 'comes tomorrow' : 'big: comes in two days'}</small></span>${price ? `<em class="mu-or-price">${esc(price)}</em>` : ''}</button>`;
    if (!open) return head;
    const rooms = roomsForCat(g, w, c);
    if (!rooms.some(r => r.id === OV.room)) OV.room = rooms[0]?.id ?? '';
    const forHouse = !!rooms.find(r => r.id === OV.room && !r.owner);
    const wallet = money(g) ? g.player.money : Infinity;
    return `${head}<div class="mu-or-form">
        <label class="mu-field"><span>For</span><select data-input="or-room">${rooms.map(r => `<option value="${esc(r.id)}" ${r.id === OV.room ? 'selected' : ''}>${esc(r.owner === 'player' ? 'Your room' : r.name)}</option>`).join('')}</select></label>
        <small class="mu-muted">${forHouse ? 'It will be the house\'s: anyone can use it.' : 'It will be yours, in your room.'}${money(g) ? ` From your wallet (${Math.floor(wallet)}).` : ''}</small>
        <div class="mu-row"><button class="mu-primary" data-act="or-buy" data-v="${esc(c.id)}" ${OV.busy || (money(g) && wallet < priceOfCat(g, c)) ? 'disabled' : ''}>${icon('download')}<span>Order${price ? ` · ${esc(price)}` : ''}</span></button>
            ${forHouse ? `<button class="mu-ghost" data-act="or-propose" data-v="${esc(c.id)}" title="The house votes in the house chat; paid from the fund">${icon('users')}<span>Propose to the house</span></button>` : ''}</div></div>`;
}

// [expanded] In a shop (Go out, after looking around): what it has today, bought on the spot.
const atShop = (g: Save) => SHOPPING.kind && SHOPPING.day === g.day && isOuting(g.player.loc) && outingOf(g)?.place === SHOPPING.place ? SHOPPING.kind as F.ShopKind : null;
function shopHtml(g: Save, w: WorldDef, kind: F.ShopKind): string {
    const era = eraOf(g); const list = F.assortment(kind, era, g.day, SHOPPING.place, shopRoll);
    const along = (outingOf(g)?.with ?? []).map(a => g.cast[a]?.name).filter(Boolean) as string[];
    const row = ({ cat: c, share }: { cat: F.CatFixture; share: number }) => {
        const key = `shop:${c.id}`; const open = OV.open === key;
        const price = money(g) ? Math.max(1, Math.round(priceOfCat(g, c) * share)) : 0;
        const head = `<button class="mu-ph-row mu-or-row ${open ? 'is-on' : ''}" data-act="or-open" data-v="${esc(key)}"><span><b data-notr>${esc(F.catName(c, era))}</b>
            <small>${esc(c.affords.map(a => F.AFFORDS[a]).join(', '))}${share < 1 ? ` · ${Math.round((1 - share) * 100)}% off` : ''} · ${c.size === 'small' ? 'you can carry it' : along.length ? `big: carried with ${along[0]}` : 'big: delivered tomorrow'}</small></span>${price ? `<em class="mu-or-price">${price}</em>` : ''}</button>`;
        if (!open) return head;
        const rooms = roomsForCat(g, w, c); if (!rooms.some(r => r.id === OV.room)) OV.room = rooms[0]?.id ?? '';
        const take = c.size === 'small' || along.length > 0;
        return `${head}<div class="mu-or-form"><label class="mu-field"><span>For</span><select data-input="or-room">${rooms.map(r => `<option value="${esc(r.id)}" ${r.id === OV.room ? 'selected' : ''}>${esc(r.owner === 'player' ? 'Your room' : r.name)}</option>`).join('')}</select></label>
            <div class="mu-row"><button class="mu-primary" data-act="or-here" data-v="${esc(c.id)}" data-share="${share}" ${money(g) && g.player.money < price ? 'disabled' : ''}>${icon('wallet')}<span>${take ? (c.size === 'small' ? 'Buy it' : `Buy it, carry it home with ${esc(along[0])}`) : 'Buy it, delivered tomorrow'}${price ? ` · ${price}` : ''}</span></button></div></div>`;
    };
    return `<section class="mu-bd-panel mu-or-shop"><b>${icon('map')} ${esc(SHOPPING.place.charAt(0).toUpperCase() + SHOPPING.place.slice(1))}</b>
        ${list.length ? `<div class="mu-ph-list">${list.map(row).join('')}</div>` : '<p class="mu-muted">Nothing for the house here today.</p>'}</section>`;
}
export function orderApp(g: Save, w: WorldDef, header: string): string {
    if (!furnishOn(w)) return `${header}<div class="mu-ph-body"><p class="mu-muted">Nothing to order for this house.</p></div>`;
    const era = eraOf(g);
    const orders = F.ordersOf(G(g));
    const coming = orders.filter(o => o.state === 'coming'), here = orders.filter(o => o.state === 'here');
    const hall = roomName(g, w, hallOf(g, w));
    const mine = (o: F.Order) => `${o.owner === 'player' ? 'yours' : o.owner === 'house' ? 'the house\'s' : `${g.cast[o.owner]?.name ?? '?'}'s`}, for ${o.owner === 'player' ? 'your room' : roomName(g, w, o.room).toLowerCase()}`;
    const shop = atShop(g);
    return `${header}<div class="mu-ph-body mu-or">
        ${shop ? shopHtml(g, w, shop) : ''}
        ${money(g) ? `<p class="mu-muted mu-or-wallet">${icon('wallet')} Wallet: <b>${Math.floor(g.player.money)}</b> · House fund: <b>${Math.floor(houseOf(g as any).fund)}</b></p>` : ''}
        ${here.length ? `<section class="mu-bd-panel"><b>${icon('download')} In the ${esc(hall.toLowerCase())}</b>${here.map(o => `<div class="mu-st-item"><span data-notr>📦 ${esc(o.name)} <small class="mu-muted">(${esc(mine(o))})</small></span><button data-act="or-unpack" data-id="${esc(o.id)}">Unpack</button></div>`).join('')}</section>` : ''}
        ${coming.length ? `<section class="mu-bd-panel"><b>On its way</b>${coming.map(o => `<div class="mu-st-item"><span data-notr>${esc(o.name)} <small class="mu-muted">(${esc(mine(o))})</small></span><small class="mu-muted">${esc(when(g, o.due))}</small></div>`).join('')}</section>` : ''}
        ${GROUPS.map(([name, ids]) => { const list = ids.map(F.catOf).filter((c): c is F.CatFixture => !!c && F.forEra(c, era));
            return list.length ? `<section class="mu-bd-panel"><b>${esc(name)}</b><div class="mu-ph-list">${list.map(c => itemHtml(g, w, c)).join('')}</div></section>` : ''; }).join('')}
        <p class="mu-muted mu-bd-hint">${money(g) ? 'Small things come the next day, big ones the day after (between 10:00 and 17:00).' : 'Money is off in this house: things cost nothing. Small things come the next day, big ones the day after.'}</p></div>`;
}

Object.assign(ACT, {
    'or-open': (el) => { OV.open = OV.open === el.dataset.v ? '' : el.dataset.v ?? ''; OV.room = ''; notify(); },
    'or-buy': (el) => {
        const g = game(); const w = g && getWorld(g.world); if (!g || !w) return;
        const room = houseRooms(g, w).find(r => r.id === OV.room); if (!room) return;
        const why = placeOrder(g, w, { cat: el.dataset.v!, room: room.id, owner: room.owner === 'player' ? 'player' : 'house', pay: 'wallet' });
        if (why) { toast(why, 'warn'); return; }
        const o = F.ordersOf(G(g)).at(-1)!;
        toast(`Ordered: ${o.name}. It comes ${when(g, o.due)}.`, 'success');
        OV.open = ''; saveGame(); notify();
    },
    'or-here': (el) => {
        const g = game(); const w = g && getWorld(g.world); if (!g || !w) return;
        const room = houseRooms(g, w).find(r => r.id === OV.room); if (!room) return;
        const along = (outingOf(g)?.with ?? []).length > 0;
        const why = buyHere(g, w, { cat: el.dataset.v!, room: room.id, owner: room.owner === 'player' ? 'player' : 'house', share: Number(el.dataset.share) || 1, carried: along });
        if (why) { toast(why, 'warn'); return; }
        const c = F.catOf(el.dataset.v!)!;
        toast(c.size === 'small' || along ? `Bought: ${F.catName(c, eraOf(g))}. It goes home with you.` : `Bought: ${F.catName(c, eraOf(g))}. Delivered tomorrow.`, 'success');
        OV.open = ''; saveGame(); refreshPrompt(); notify();
    },
    // the house votes (in the house chat); bought from the fund when most say yes
    'or-propose': async (el) => {
        const g = game(); const w = g && getWorld(g.world); if (!g || !w || OV.busy) return;
        const room = houseRooms(g, w).find(r => r.id === OV.room && !r.owner); if (!room) return;
        OV.busy = true; notify();
        try { const line = await proposeByYou(g, w, el.dataset.v!, room.id); if (line) toast(line, /ordered/.test(line) ? 'success' : 'info', { ms: 7000 }); OV.open = ''; }
        catch (e: any) { toast(String(e?.message ?? e), 'error'); }
        OV.busy = false; saveGame(); refreshPrompt(); notify();
    },
    'or-unpack': (el) => {
        const g = game(); const w = g && getWorld(g.world); if (!g || !w) return;
        const x = unpackOrder(g, el.dataset.id!); if (!x) return;
        toast(`${x.name}: set up (${roomName(g, w, x.room).toLowerCase()}).`, 'success');
        saveGame(); refreshPrompt(); notify();
    },
});
Object.assign(INPUT, { 'or-room': (el) => { OV.room = String(el.value); notify(); } });
