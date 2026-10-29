// [expanded] Ordering things home (Mundi Expanded 0.2.0.7; rules in furnish.ts): paid from your wallet (or the house
// fund, for what the house decided to buy) when money is on, free when it is off. Small things come the next day, big
// ones the day after, between 10:00 and 17:00; a courier leaves a box in the hallway, which you unpack (in the Storage
// app, Furniture) into the room it is for. A box nobody touches for two days is set up by someone in the house.
import { nowAbs, toast, saveGame, notify, type Save } from '../core/store.js';
import type { WorldDef } from '../core/world.js';
import { onHour, onDay } from './hooks.js';
import { difficultyOf } from './bills.js';
import { moneyOn, walletAdd, fundAdd, houseOf } from './money.js';
import { isOuting } from './places.js';
import { furnishOn, eraOf, roomName, hallOf } from './furnishrun.js';
import * as F from './furnish.js';

const G = (g: Save) => g as unknown as F.GLike;
const H = (s: string) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b); h ^= h >>> 13; return (h >>> 0) / 4294967296; };
export const priceOfCat = (g: Save, c: F.CatFixture) => Math.max(1, Math.round(c.price * difficultyOf(g).price));

/** Orders a catalog thing for a room (whose it will be: `owner`). '' when done, else why not. */
export function placeOrder(g: Save, w: WorldDef, o: { cat: string; room: string; owner: F.Owner; pay: 'wallet' | 'fund'; by?: F.Owner; via?: 'order' | 'shop'; prop?: string; now?: boolean; share?: number; due?: number }): string {
    const c = F.catOf(o.cat); if (!c || !furnishOn(w)) return 'That cannot be ordered here.';
    const era = eraOf(g); if (!F.forEra(c, era)) return 'Not in this era.';
    if (F.roomFull(G(g), o.room)) return 'That room is full (Settings: things a room).';   // [expanded] 0.2.0.8
    const name = F.catName(c, era); const money = moneyOn(g as any);
    const price = money ? Math.max(1, Math.round(priceOfCat(g, c) * (o.share ?? 1))) : 0;
    if (money && o.pay === 'wallet' && g.player.money < price) return 'Not enough money in your wallet.';
    if (money && o.pay === 'fund' && houseOf(g as any).fund < price) return 'Not enough in the house fund.';
    if (money) { if (o.pay === 'wallet') walletAdd(g as any, -price, `Ordered: ${name}`); else fundAdd(g as any, -price, `Bought for the house: ${name}`); }
    const now = nowAbs(g);
    F.newOrder(G(g), { cat: c.id, name, room: o.room, owner: o.owner, price, paid: money ? o.pay : 'free', by: o.by ?? 'player', day: g.day, via: o.via ?? 'order',
        due: o.due ?? (o.now ? now : F.deliveryAt(now, c.size, H(`${g.day}|${c.id}|${F.ordersOf(G(g)).length}`))), ...(o.prop ? { prop: o.prop } : {}) });
    return '';
}

/** Unpacks a box: the thing stands in its room. */
export function unpackOrder(g: Save, id: string): F.Fixture | null { return F.unpack(G(g), id, eraOf(g)); }

// each hour: what has come (a toast when you are home to hear the courier)
onHour.push((g, w) => {
    if (!furnishOn(w)) return [];
    const came = F.arrived(G(g), nowAbs(g)); if (!came.length) return [];
    const hall = roomName(g, w, hallOf(g, w)).toLowerCase();
    const home = !isOuting(g.player.loc) && g.player.loc !== 'out';
    if (home) setTimeout(() => toast(`📦 A delivery: ${came.map(o => o.name).join(', ')}. The box${came.length > 1 ? 'es are' : ' is'} in the ${hall}.`, 'info', { ms: 8000 }), 50);
    saveGame();
    return [];
});
// each day: a box left two days is set up by someone in the house
onDay.push((g, w) => {
    if (!furnishOn(w)) return [];
    const old = F.ordersOf(G(g)).filter(o => o.state === 'here' && nowAbs(g) - o.due >= 2 * 1440);
    const out: string[] = [];
    const people = Object.values(g.cast);
    for (const o of old) {
        const who = o.owner !== 'house' && o.owner !== 'player' ? g.cast[o.owner] : people[Math.floor(H(`${o.id}|unpack`) * people.length)];
        if (unpackOrder(g, o.id)) out.push(`${who ? `${who.name} set up` : 'Someone set up'} the ${o.name.toLowerCase()} (${roomName(g, w, o.room).toLowerCase()}).`);
    }
    if (out.length) { saveGame(); notify(); }
    return out;
});

/* ---------- buying in person (a shop in Go out) ---------- */

/** The shop you are looking around (set by its action; gone once you leave it). */
export const SHOPPING = { kind: '' as F.ShopKind | '', place: '', day: -1 };
export const shopRoll = (k: string) => H(k);
/** Buys a thing here: small things (or big ones carried with someone who came along) go home with you, and stand in
 *  their room; big ones come the next day. '' when done, else why not. */
export function buyHere(g: Save, w: WorldDef, o: { cat: string; room: string; owner: F.Owner; share: number; carried: boolean }): string {
    const c = F.catOf(o.cat); if (!c) return 'That is not here.';
    const now = nowAbs(g);
    const take = c.size === 'small' || o.carried;
    const why = placeOrder(g, w, { cat: o.cat, room: o.room, owner: o.owner, pay: 'wallet', via: 'shop', share: o.share, due: take ? now : F.deliveryAt(now, 'small', H(`${g.day}|${c.id}|shop`)) });
    if (why) return why;
    if (take) { const x = F.ordersOf(G(g)).at(-1)!; x.state = 'here'; unpackOrder(g, x.id); }
    return '';
}
