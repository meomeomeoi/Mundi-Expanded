// [expanded] Rooms and their things (Mundi Expanded 0.2.0.7): fixtures, a layer of their own next to the house's
// consumables (stock.ts). A fixture stands in one room (a common room's id, or someone's bedroom: "home:<avatar>",
// "home:player"), belongs to the house, to a character or to the player, and affords things to do (a TV: watch; a
// console: play, and play together…). Decor is free text (posters, plants, photos): it only describes the room.
//
//  - The catalog: ~40 things a modern house has, each with the rooms it belongs in, what it affords, its size (small:
//    carried home; big: delivered) and its name per era (a CRT TV in the 2000s, a smart TV today). No brands.
//  - Who may use what: the house's things are everyone's; someone's own things are theirs (others use them only
//    when the owner is not there to mind, and that is a door/intrusion matter, not this file's).
//  - Where a thing can be done: the rooms with a thing that affords it, for that person.
//
// Pure logic (no SillyTavern, no DOM), tested on its own; the runtime is furnishrun.ts, the screens furnishui.ts.

export type Era = 'now' | '2010s' | '2000s';
export type Afford = 'watch' | 'game' | 'game2' | 'work' | 'music' | 'read' | 'exercise' | 'cook' | 'coffee' | 'bath' | 'party' | 'chill' | 'craft' | 'laundry' | 'dine' | 'dress' | 'sleep2';
export type RoomKind = 'living' | 'kitchen' | 'dining' | 'bedroom' | 'bath' | 'gym' | 'pool' | 'laundry' | 'garage' | 'storage' | 'outdoor' | 'hall';
export interface CatFixture { id: string; name: string | Partial<Record<Era, string>>; rooms: RoomKind[]; affords: Afford[]; size: 'small' | 'big'; price: number; eras?: Era[] }

export const CATALOG: CatFixture[] = [
    // screens and games
    { id: 'tv', name: { '2000s': 'CRT TV', '2010s': 'Flat-screen TV', now: 'Smart TV' }, rooms: ['living', 'bedroom'], affords: ['watch'], size: 'big', price: 400 },
    { id: 'projector', name: 'Projector and screen', rooms: ['living'], affords: ['watch', 'party'], size: 'small', price: 450, eras: ['2010s', 'now'] },
    { id: 'dvd', name: { '2000s': 'DVD player', '2010s': 'Blu-ray player' }, rooms: ['living', 'bedroom'], affords: ['watch'], size: 'small', price: 80, eras: ['2000s', '2010s'] },
    { id: 'console', name: 'Game console', rooms: ['living', 'bedroom'], affords: ['game', 'game2'], size: 'small', price: 350 },
    { id: 'handheld', name: 'Handheld game console', rooms: ['bedroom', 'living'], affords: ['game'], size: 'small', price: 180 },
    { id: 'vr', name: 'VR headset', rooms: ['bedroom', 'living'], affords: ['game'], size: 'small', price: 450, eras: ['now'] },
    { id: 'pc', name: { '2000s': 'Desktop computer', '2010s': 'Desktop PC', now: 'Gaming PC' }, rooms: ['bedroom'], affords: ['work', 'game'], size: 'big', price: 1000 },
    { id: 'laptop', name: 'Laptop', rooms: ['bedroom', 'living'], affords: ['work'], size: 'small', price: 800 },
    { id: 'pooltable', name: 'Pool table', rooms: ['living', 'garage'], affords: ['game2', 'party'], size: 'big', price: 1200 },
    { id: 'darts', name: 'Dartboard', rooms: ['garage', 'living'], affords: ['game2'], size: 'small', price: 40 },
    { id: 'boardgames', name: 'Board games', rooms: ['living', 'bedroom'], affords: ['game2'], size: 'small', price: 50 },
    // music
    { id: 'stereo', name: { '2000s': 'Stereo system', '2010s': 'Speakers', now: 'Smart speaker' }, rooms: ['living', 'bedroom'], affords: ['music', 'party'], size: 'small', price: 150 },
    { id: 'turntable', name: 'Record player', rooms: ['living', 'bedroom'], affords: ['music'], size: 'small', price: 200 },
    { id: 'guitar', name: 'Guitar', rooms: ['bedroom', 'living'], affords: ['music'], size: 'small', price: 250 },
    { id: 'piano', name: { '2000s': 'Upright piano', '2010s': 'Upright piano', now: 'Digital piano' }, rooms: ['living'], affords: ['music'], size: 'big', price: 1500 },
    { id: 'keyboard', name: 'Synth keyboard', rooms: ['bedroom'], affords: ['music'], size: 'small', price: 300 },
    { id: 'karaoke', name: 'Karaoke machine', rooms: ['living'], affords: ['music', 'party'], size: 'small', price: 150 },
    // to sit, read, sleep
    { id: 'couch', name: 'Couch', rooms: ['living'], affords: ['chill'], size: 'big', price: 600 },
    { id: 'armchair', name: 'Armchair', rooms: ['living', 'bedroom'], affords: ['read', 'chill'], size: 'big', price: 250 },
    { id: 'bookshelf', name: 'Bookshelf', rooms: ['living', 'bedroom'], affords: ['read'], size: 'big', price: 150 },
    { id: 'desk', name: 'Desk', rooms: ['bedroom'], affords: ['work', 'craft'], size: 'big', price: 180 },
    { id: 'doublebed', name: 'Double bed', rooms: ['bedroom'], affords: ['sleep2'], size: 'big', price: 700 },
    { id: 'vanity', name: 'Vanity table', rooms: ['bedroom'], affords: ['dress'], size: 'big', price: 250 },
    { id: 'aquarium', name: 'Aquarium', rooms: ['living', 'bedroom'], affords: ['chill'], size: 'big', price: 300 },
    // making things
    { id: 'easel', name: 'Easel and paints', rooms: ['bedroom', 'living'], affords: ['craft'], size: 'small', price: 120 },
    { id: 'sewing', name: 'Sewing machine', rooms: ['bedroom'], affords: ['craft'], size: 'small', price: 200 },
    { id: 'workbench', name: 'Workbench and tools', rooms: ['garage'], affords: ['craft'], size: 'big', price: 350 },
    // exercise
    { id: 'treadmill', name: 'Treadmill', rooms: ['gym'], affords: ['exercise'], size: 'big', price: 900 },
    { id: 'weights', name: 'Weight bench', rooms: ['gym', 'garage'], affords: ['exercise'], size: 'big', price: 300 },
    { id: 'yogamat', name: 'Yoga mat', rooms: ['gym', 'bedroom'], affords: ['exercise'], size: 'small', price: 30 },
    { id: 'bike', name: 'Exercise bike', rooms: ['gym'], affords: ['exercise', 'watch'], size: 'big', price: 500 },
    // kitchen and dining
    { id: 'stove', name: 'Stove and oven', rooms: ['kitchen'], affords: ['cook'], size: 'big', price: 700 },
    { id: 'microwave', name: 'Microwave', rooms: ['kitchen'], affords: ['cook'], size: 'small', price: 100 },
    { id: 'coffee', name: { '2000s': 'Drip coffee maker', '2010s': 'Coffee machine', now: 'Espresso machine' }, rooms: ['kitchen'], affords: ['coffee'], size: 'small', price: 180 },
    { id: 'table', name: 'Dining table', rooms: ['dining', 'kitchen'], affords: ['dine', 'game2'], size: 'big', price: 450 },
    // bath, laundry, outside
    { id: 'bathtub', name: 'Bathtub', rooms: ['bath'], affords: ['bath'], size: 'big', price: 900 },
    { id: 'washer', name: 'Washing machine', rooms: ['laundry'], affords: ['laundry'], size: 'big', price: 500 },
    { id: 'grill', name: 'Grill', rooms: ['outdoor', 'pool'], affords: ['cook', 'party'], size: 'big', price: 300 },
    { id: 'loungers', name: 'Sun loungers', rooms: ['pool', 'outdoor'], affords: ['chill'], size: 'big', price: 250 },
    { id: 'hottub', name: 'Hot tub', rooms: ['pool', 'outdoor'], affords: ['bath', 'chill', 'party'], size: 'big', price: 3500 },
];
export const AFFORDS: Record<Afford, string> = {
    watch: 'watch something', game: 'play games', game2: 'play together', work: 'work or study', music: 'play music', read: 'read', exercise: 'work out',
    cook: 'cook', coffee: 'make coffee', bath: 'take a bath', party: 'have a party', chill: 'relax', craft: 'make things', laundry: 'do the laundry', dine: 'eat together', dress: 'get ready', sleep2: 'sleep two',
};

export const catOf = (id: string | undefined) => (id ? CATALOG.find(c => c.id === id) ?? null : null);
export const forEra = (c: CatFixture, era: Era) => !c.eras || c.eras.includes(era);
/** A catalog thing's name in an era (its own name in the closest era it has). */
export function catName(c: CatFixture, era: Era): string {
    if (typeof c.name === 'string') return c.name;
    return c.name[era] ?? c.name['2010s'] ?? c.name.now ?? c.name['2000s'] ?? c.id;
}
/** The catalog things of an era, for a kind of room (all of them without one). */
export const catalogFor = (era: Era, kind?: RoomKind) => CATALOG.filter(c => forEra(c, era) && (!kind || c.rooms.includes(kind)));

/* ---------- the house's fixtures ---------- */

export type Owner = 'house' | string;   // 'house', 'player', or a character's avatar
export type Via = 'start' | 'bought' | 'order' | 'shop' | 'found' | 'gift' | 'story' | 'hand';
export interface Fixture { id: string; cat?: string; name: string; room: string; owner: Owner; via: Via; day: number; decor?: boolean }
export interface FurnishX { items: Fixture[]; seq: number; started?: boolean; bedrooms?: boolean; orders?: Order[]; curb?: { cat: string; day: number }; rummaged?: number; props?: Proposal[]; propFreq?: 'off' | 'rare' | 'sometimes'; /** [expanded] 0.2.0.8: things a room takes */ limit?: number }
export type GLike = { day: number; furnishx?: FurnishX };
export function furnishOf(g: GLike): FurnishX {
    const f = (g.furnishx ??= { items: [], seq: 0 }); f.items ??= []; f.seq ??= 0; return f;
}
export const PLAYER_ROOM = 'home:player';
/** [expanded] 0.2.0.8: a room with as many things as it takes (the setting; boxes on their way count). */
export const roomFull = (g: GLike, room: string) => { const f = furnishOf(g); return f.items.filter(x => x.room === room).length + (f.orders ?? []).filter(o => o.room === room && o.state !== 'here').length >= (f.limit ?? 15); };
export const fixturesIn = (g: GLike, room: string) => furnishOf(g).items.filter(x => x.room === room);
export const fixtureById = (g: GLike, id: string) => furnishOf(g).items.find(x => x.id === id) ?? null;
export const affordsOf = (x: Fixture): Afford[] => (x.decor ? [] : catOf(x.cat)?.affords ?? []);

/** Adds a catalog thing (by id) or decor (free text, `cat` null). */
export function addFixture(g: GLike, o: { cat?: string | null; name?: string; room: string; owner?: Owner; via?: Via; era?: Era }): Fixture | null {
    const c = o.cat ? catOf(o.cat) : null;
    if (o.cat && !c) return null;
    const name = (c ? catName(c, o.era ?? 'now') : String(o.name ?? '')).replace(/\s+/g, ' ').trim().slice(0, 60);
    if (!name || !o.room) return null;
    const f = furnishOf(g);
    if (roomFull(g, o.room)) return null;   // [expanded] 0.2.0.8: a full room takes nothing more
    const x: Fixture = { id: `f${++f.seq}`, ...(c ? { cat: c.id } : { decor: true }), name, room: o.room, owner: o.owner ?? 'house', via: o.via ?? 'hand', day: g.day };
    f.items.push(x);
    return x;
}
export function removeFixture(g: GLike, id: string) { const f = furnishOf(g); f.items = f.items.filter(x => x.id !== id); }
export function moveFixture(g: GLike, id: string, room: string, owner?: Owner) {
    const x = fixtureById(g, id); if (!x) return null;
    x.room = room; if (owner) x.owner = owner;
    return x;
}
/** Can `who` (an avatar, or 'player') use this thing: the house's, or their own. */
export const usableBy = (x: Fixture, who: string) => x.owner === 'house' || x.owner === who;
/** Does this room have something affording `a` that `who` can use (anyone when `who` is not given). */
export const roomAffords = (g: GLike, room: string, a: Afford, who?: string) => fixturesIn(g, room).some(x => affordsOf(x).includes(a) && (!who || usableBy(x, who)));
/** The rooms where `who` can do `a` (their own room first, then the rest in the house's order). */
export function roomsFor(g: GLike, a: Afford, who: string, own?: string): string[] {
    const rooms = [...new Set(furnishOf(g).items.filter(x => affordsOf(x).includes(a) && usableBy(x, who)).map(x => x.room))];
    return own && rooms.includes(own) ? [own, ...rooms.filter(r => r !== own)] : rooms;
}

/* ---------- kinds of room ---------- */

/** What kind of room a place is, from its id, name and tags ("home:…" is a bedroom). */
export function roomKind(id: string, name = '', tags: string[] = []): RoomKind | null {
    if (id.startsWith('home:')) return 'bedroom';
    const t = `${id} ${name}`.toLowerCase();
    if (/kitchen|кухн/.test(t)) return 'kitchen';
    if (/dining|столов/.test(t)) return 'dining';
    if (/pool|бассейн/.test(t)) return 'pool';
    if (/gym|training|fitness|спортзал|трениров/.test(t)) return 'gym';
    if (/laundry|wash ?house|прачеч/.test(t)) return 'laundry';
    if (/bath|wash|shower|toilet|ванн|душ|туалет/.test(t)) return 'bath';
    if (/garage|stable|workshop|гараж|мастерск/.test(t)) return 'garage';
    if (/storage|store ?room|attic|basement|cellar|кладов|чердак|подвал/.test(t)) return 'storage';
    if (/living|lounge|great hall|family room|гостин/.test(t)) return 'living';
    if (/entrance hall|hallway|foyer|прихож|холл/.test(t)) return 'hall';
    if (tags.includes('outdoor') || /yard|garden|patio|terrace|porch|двор|сад|террас/.test(t)) return 'outdoor';
    if (tags.includes('leisure')) return 'living';
    return null;
}
/** What a kind of room has from the start (the house's), in an era. One bathroom gets a tub, the others nothing. */
export function template(kind: RoomKind | null, era: Era, firstBath = true): string[] {
    const t: Partial<Record<RoomKind, string[]>> = {
        living: ['couch', 'tv', 'stereo', 'bookshelf', 'boardgames'], kitchen: ['stove', 'microwave', 'coffee'], dining: ['table'],
        gym: ['treadmill', 'weights', 'yogamat'], pool: ['loungers', 'grill'], laundry: ['washer'], garage: ['workbench', 'darts'],
        bath: firstBath ? ['bathtub'] : [], outdoor: [], storage: [], hall: [], bedroom: [],
    };
    return (kind ? t[kind] ?? [] : []).filter(id => { const c = catOf(id); return !!c && forEra(c, era); });
}

/* ---------- for the scene ---------- */

/** "In this room: Gaming PC (Masha's), guitar (Masha's), posters of old games." ('' when nothing). */
export function roomLine(g: GLike, room: string, roomName: string, ownerName: (o: Owner) => string): string {
    const list = fixturesIn(g, room); if (!list.length) return '';
    const things = list.map(x => `${x.name}${x.owner !== 'house' && !room.startsWith('home:') ? ` (${ownerName(x.owner)}'s)` : ''}`);
    return `In ${roomName} there is: ${things.join(', ')}. Use these when it fits; nothing else of note is here unless the story brings it.`;
}

/* ---------- the starting furnishing by the mechanics model ---------- */

export const FURNISH_SYSTEM = 'You furnish the bedrooms of the people in a shared house for an interactive fiction (a role-play between consenting adults), from their descriptions. You answer with one JSON object only.';
export interface FurnishWho { key: string; name: string; about: string }
/** The prompt: who lives here, the era, what can be in a bedroom (catalog ids), and decor in a few words. */
export function furnishPrompt(p: { people: FurnishWho[]; era: Era; eraLine: string }): string {
    const cat = catalogFor(p.era, 'bedroom').map(c => `${c.id} (${catName(c, p.era)})`).join(', ');
    return [
        `[The house's bedrooms. ${p.eraLine || 'It is today.'}]`,
        ...p.people.map(x => `[${x.name}: ${x.about.replace(/\s+/g, ' ').slice(0, 500)}]`),
        `[For each person: the things in their own room, chosen only from this list by id: ${cat}. Two to five things that fit who they are (a gamer: pc or console; a reader: bookshelf; a musician: guitar). And decor: two to four short phrases of what makes the room theirs (posters of…, plants, photos of…, a messy pile of…), no furniture.]`,
        `[Answer: {${p.people.map(x => `"${x.name}": {"things": ["id"], "decor": ["…"]}`).join(', ')}}]`,
    ].join('\n');
}
/** The answer → per person (by key): catalog ids that exist in the era and fit a bedroom, and decor. */
export function parseFurnish(j: any, people: FurnishWho[], era: Era): Record<string, { things: string[]; decor: string[] }> {
    const out: Record<string, { things: string[]; decor: string[] }> = {};
    if (!j || typeof j !== 'object') return out;
    const norm = (s: string) => String(s ?? '').toLowerCase().trim();
    for (const [k, v] of Object.entries(j)) {
        const who = people.find(x => norm(x.name) === norm(k)) ?? people.find(x => norm(x.name).split(/\s+/)[0] === norm(k).split(/\s+/)[0]);
        if (!who || !v || typeof v !== 'object') continue;
        const things = (Array.isArray((v as any).things) ? (v as any).things : []).map((t: any) => norm(t)).filter((t: string, i: number, a: string[]) => {
            const c = catOf(t); return !!c && forEra(c, era) && c.rooms.includes('bedroom') && a.indexOf(t) === i;
        }).slice(0, 6);
        const decor = (Array.isArray((v as any).decor) ? (v as any).decor : []).map((d: any) => String(d ?? '').replace(/\s+/g, ' ').trim().slice(0, 60)).filter(Boolean).slice(0, 4);
        out[who.key] = { things, decor };
    }
    return out;
}

/** Without the model: things for a bedroom guessed from what is known of the person (card, profile). */
export function guessBedroom(text: string, era: Era): string[] {
    const t = String(text ?? '').toLowerCase(); const out: string[] = [];
    const add = (id: string) => { const c = catOf(id); if (c && forEra(c, era) && !out.includes(id)) out.push(id); };
    if (/gam(e|er|ing)|stream|esport|ranked|игр/.test(t)) { add('pc'); add('console'); }
    if (/read|book|novel|librar|poet|чита|книг/.test(t)) add('bookshelf');
    if (/guitar|band|music|sing|song|гитар|музык/.test(t)) add('guitar');
    if (/piano|synth|keyboard|compos/.test(t)) add('keyboard');
    if (/vinyl|record/.test(t)) add('turntable');
    if (/paint|draw|art|sketch|рису|художн/.test(t)) add('easel');
    if (/sew|fashion|cloth|knit|шить|мод/.test(t)) add('sewing');
    if (/yoga|fitness|gym|workout|run|athlet|sport|йог|спорт/.test(t)) add('yogamat');
    if (/study|student|work|email|laptop|code|program|write|учеб|работ/.test(t)) { add('desk'); add('laptop'); }
    if (/makeup|beauty|vanity|cosmetic|макияж/.test(t)) add('vanity');
    if (/movie|film|series|anime|tv|кино|сериал/.test(t)) add('tv');
    return out.slice(0, 5);
}

/** What a thing someone does needs, from its words ("gaming on the PC": game; "reading": read); null: nothing.
 *  Careful on purpose: "watching videos" (on the phone) or "listening to music" (headphones) need nothing. */
const NEEDS: [RegExp, Afford][] = [
    [/board ?games?|card games?|chess|pool table|billiards|darts|co-?op|playing .* together/i, 'game2'],
    [/video ?games?|gaming|\bgames?\b|console|ranked|\bmmo|playing on the (pc|computer)/i, 'game'],
    [/\btv\b|television|movies?|films?|series|\bshows?\b|anime|cartoons?|sitcom/i, 'watch'],
    [/e-?mails?|laptop|computer|\bpc\b|homework|studying|\bstudy\b|coding|programming|spreadsheets?|work(ing)? (on|from)|essay|report/i, 'work'],
    [/guitar|piano|keyboard|synth|singing|practi[cs](e|ing) (music|songs|scales)|record player|vinyl|karaoke|playing music|composing/i, 'music'],
    [/\bread(ing)?\b|\bbooks?\b|novel|manga|comics?/i, 'read'],
    [/work(ing)? ?out|exercis|yoga|stretch|treadmill|lifting|weights|cardio|mobility|push-?ups|\bgym\b/i, 'exercise'],
    [/coffee|espresso|latte|cappuccino/i, 'coffee'],
    [/\bcook(ing)?\b|\bbak(e|ing)\b|grill(ing)?/i, 'cook'],
    [/\bbath\b|bubble bath|hot tub|soak(ing)?/i, 'bath'],
    [/paint(ing)?|drawing|sketch|sew(ing)?|knit(ting)?|crafts?|woodwork|tinker/i, 'craft'],
    [/laundry|washing (the )?clothes/i, 'laundry'],
    [/make-?up|getting ready|doing (her|his|their) hair/i, 'dress'],
];
export function guessAfford(text: string): Afford | null {
    const t = String(text ?? ''); for (const [re, a] of NEEDS) if (re.test(t)) return a; return null;
}
export const isAfford = (s: unknown): s is Afford => typeof s === 'string' && s in AFFORDS;

/* ---------- orders and deliveries ---------- */

/** A thing on its way (ordered online, or big from a shop): it arrives at `due` (the house's minutes), waits as a box
 *  in the hallway ('here'), and stands in `room` once unpacked. `prop`: the house's proposal it came from. */
export interface Order { id: string; cat: string; name: string; room: string; owner: Owner; price: number; paid: 'wallet' | 'fund' | 'free'; by: Owner; day: number; due: number; state: 'coming' | 'here'; via: 'order' | 'shop'; prop?: string }
export const ordersOf = (g: GLike) => (furnishOf(g).orders ??= []);
/** When it comes: small things the next day, big ones the day after, sometime between 10:00 and 17:00. */
export function deliveryAt(now: number, size: 'small' | 'big', roll: number): number {
    const day = Math.floor(now / 1440) + (size === 'small' ? 1 : 2);
    return day * 1440 + (10 + Math.floor(Math.max(0, Math.min(0.999, roll)) * 8)) * 60;
}
export function newOrder(g: GLike, o: Omit<Order, 'id' | 'state'>): Order {
    const f = furnishOf(g); const x: Order = { ...o, id: `o${++f.seq}`, state: 'coming' };
    ordersOf(g).push(x); return x;
}
/** The orders that have come by `now` (they become boxes in the hallway). */
export function arrived(g: GLike, now: number): Order[] {
    const out = ordersOf(g).filter(o => o.state === 'coming' && o.due <= now);
    for (const o of out) o.state = 'here';
    return out;
}
/** A box unpacked: the thing stands in its room. */
export function unpack(g: GLike, id: string, era: Era): Fixture | null {
    const o = ordersOf(g).find(x => x.id === id && x.state === 'here'); if (!o) return null;
    furnishOf(g).orders = ordersOf(g).filter(x => x !== o);
    return addFixture(g, { cat: o.cat, room: o.room, owner: o.owner, via: o.via, era });
}

/* ---------- shops in person, and finds ---------- */

export type ShopKind = 'electronics' | 'furniture' | 'mall' | 'music' | 'sports' | 'hardware' | 'super' | 'flea';
const SHOP_KINDS: [RegExp, ShopKind][] = [
    [/flea|thrift|second-?hand|antique|garage sale|yard sale|junk|барахолк|комисс/i, 'flea'],
    [/electronic|tech store|gadget|computer (store|shop)|электрон/i, 'electronics'],
    [/furniture|home store|interior|мебел/i, 'furniture'],
    [/music (store|shop)|instrument|музыкальн/i, 'music'],
    [/sport(s|ing)? (store|shop|goods)|спорттовар/i, 'sports'],
    [/hardware|diy|home improvement|tool|хозтовар|строител/i, 'hardware'],
    [/mall|department store|shopping|торгов/i, 'mall'],
    [/supermarket|grocer|convenience|супермаркет|продукт/i, 'super'],
];
export const SHOP_NAMES: Record<ShopKind, string> = { electronics: 'electronics store', furniture: 'furniture store', mall: 'shops', music: 'music store', sports: 'sports store', hardware: 'hardware store', super: 'aisles', flea: 'stalls' };
/** What kind of shop a place out is, from its name (null: not a shop). */
export const shopKindOf = (place: string): ShopKind | null => { for (const [re, k] of SHOP_KINDS) if (re.test(String(place ?? ''))) return k; return null; };
const STOCK: Record<Exclude<ShopKind, 'flea'>, string[]> = {
    electronics: ['tv', 'projector', 'dvd', 'console', 'handheld', 'vr', 'pc', 'laptop', 'stereo', 'turntable', 'karaoke', 'microwave', 'coffee'],
    furniture: ['couch', 'armchair', 'bookshelf', 'desk', 'doublebed', 'vanity', 'table', 'loungers', 'aquarium'],
    mall: ['tv', 'console', 'handheld', 'laptop', 'stereo', 'boardgames', 'guitar', 'yogamat', 'coffee', 'microwave', 'armchair', 'vanity', 'easel', 'sewing'],
    music: ['guitar', 'keyboard', 'piano', 'turntable', 'karaoke', 'stereo'],
    sports: ['treadmill', 'weights', 'yogamat', 'bike', 'darts', 'pooltable'],
    hardware: ['workbench', 'grill', 'washer', 'stove', 'bathtub', 'hottub', 'loungers', 'microwave'],
    super: ['microwave', 'coffee', 'boardgames', 'darts', 'yogamat'],
};
/** What a shop has today, with the share of the price it asks (a flea market: a few things a day, 40–70%). */
export function assortment(kind: ShopKind, era: Era, day: number, place: string, roll: (k: string) => number): { cat: CatFixture; share: number }[] {
    if (kind !== 'flea') return STOCK[kind].map(id => catOf(id)).filter((c): c is CatFixture => !!c && forEra(c, era)).map(cat => ({ cat, share: 1 }));
    const all = CATALOG.filter(c => forEra(c, era) && c.price < 2000);
    const picked: CatFixture[] = [];
    for (let i = 0; picked.length < 6 && i < 40; i++) { const c = all[Math.floor(roll(`${place}|${day}|f${i}`) * all.length)]; if (c && !picked.includes(c)) picked.push(c); }
    return picked.map(cat => ({ cat, share: Math.round((0.4 + 0.3 * roll(`${place}|${day}|${cat.id}|p`)) * 100) / 100 }));
}
/** Left on the curb now and then: big things someone did not want. */
export const CURB = ['armchair', 'bookshelf', 'desk', 'couch', 'table', 'aquarium'];
/** In the storage room: an old thing, or decor. */
export const RUMMAGE_THINGS = ['boardgames', 'guitar', 'turntable', 'easel', 'darts', 'yogamat', 'handheld', 'dvd'];
export const RUMMAGE_DECOR = ['a box of old photos', 'a dusty lava lamp', 'a framed movie poster', 'string lights', 'a stack of old magazines', 'a vintage globe'];

/* ---------- the house's purchases: proposals and votes ---------- */

/** "Let's get a TV for the living room" (or "…a guitar for my room, from the fund?"): the house votes in its chat. */
export interface Proposal { id: string; by: Owner; cat: string; name: string; room: string; owner: Owner; price: number; day: number; until: number;
    answers: Record<string, 'yes' | 'no'>; why: Record<string, string>; you?: 'yes' | 'no'; state: 'open' | 'bought' | 'rejected' | 'short' }
export const propsOf = (g: GLike) => (furnishOf(g).props ??= []);
export interface VoteIn { forSelf: boolean; price: number; fund: number; withProposer: number; wants: boolean; social: number }
/** One person's vote: how they get along with who asks, whether they would use it, what it costs against the fund, and
 *  whether it is for the house or for the asker's own room (much harder). `fund` Infinity: money is off. */
export function voteOn(v: VoteIn, roll: number): { yes: boolean; why: string } {
    if (v.price > v.fund) return { yes: false, why: 'not enough in the fund' };
    if (v.withProposer <= -15) return { yes: false, why: 'not keen on whoever asks' };
    let p = 0.35 + Math.max(0, v.withProposer) / 200 + (v.wants ? 0.25 : 0) - (v.forSelf ? 0.3 : 0) + (v.social - 50) / 500;
    if (Number.isFinite(v.fund)) p += v.price > v.fund * 0.5 ? -0.25 : v.price < v.fund * 0.15 ? 0.1 : 0;
    p = Math.max(0.05, Math.min(0.95, p));
    return roll < p ? { yes: true, why: '' } : { yes: false, why: v.forSelf ? 'the fund is for the house, not one room' : Number.isFinite(v.fund) && v.price > v.fund * 0.5 ? 'too expensive right now' : 'does not see the point' };
}
/** The house's answer: more yes than no among those who voted (who asked counts as yes, and you when you voted). */
export function verdict(p: Proposal): 'yes' | 'no' {
    const votes = [...Object.values(p.answers), 'yes', ...(p.by !== 'player' && p.you ? [p.you] : [])];
    const yes = votes.filter(v => v === 'yes').length;
    return yes * 2 > votes.length ? 'yes' : 'no';
}
/** What someone would ask the house for. Things the house lacks for everyone (a TV, a console or board games, a
 *  coffee machine, speakers) are asked for the common rooms; what someone likes doing and cannot do anywhere is asked
 *  for their own room. Null: nothing to ask. */
export interface WantIn { who: string; social: number; needs: Afford[]; canDo: (a: Afford) => boolean }
const FOR_HOUSE: [Afford, string][] = [['watch', 'tv'], ['game2', 'boardgames'], ['coffee', 'coffee'], ['music', 'stereo']];
const FOR_SELF: Partial<Record<Afford, string>> = { game: 'console', music: 'guitar', read: 'bookshelf', craft: 'easel', exercise: 'yogamat', work: 'laptop', watch: 'tv' };
export function pickWant(people: WantIn[], houseHas: (a: Afford) => boolean, era: Era, roll: (k: string) => number): { by: string; cat: string; forSelf: boolean } | null {
    const out: { by: string; cat: string; forSelf: boolean; w: number }[] = [];
    const social = [...people].sort((a, b) => b.social - a.social);
    for (const [a, cat] of FOR_HOUSE) {
        const c = catOf(cat); if (!c || !forEra(c, era) || houseHas(a) || !social.length) continue;
        const by = social.find(x => x.needs.includes(a)) ?? social[0];
        out.push({ by: by.who, cat, forSelf: false, w: 2 });
    }
    for (const x of people) for (const a of x.needs) {
        const cat = FOR_SELF[a]; const c = cat && catOf(cat);
        if (!c || !forEra(c, era) || x.canDo(a)) continue;
        if (!out.some(o => o.by === x.who && o.cat === cat)) out.push({ by: x.who, cat: cat!, forSelf: true, w: 1 });
    }
    if (!out.length) return null;
    let r = roll('want') * out.reduce((s, o) => s + o.w, 0);
    for (const o of out) { r -= o.w; if (r < 0) return { by: o.by, cat: o.cat, forSelf: o.forSelf }; }
    const o = out[out.length - 1]; return { by: o.by, cat: o.cat, forSelf: o.forSelf };
}

/* ---------- the story: things brought in, moved, thrown out; gifts ---------- */

// What a thing named in the story is, in the catalog (the first that fits: the more specific ones go first).
const BY_NAME: [RegExp, string][] = [
    [/handheld|game ?boy|\bswitch\b|\bpsp\b|nintendo ds|steam deck/, 'handheld'], [/\bvr\b|virtual reality/, 'vr'], [/projector|проектор/, 'projector'],
    [/\bdvd|blu-?ray/, 'dvd'], [/\b(tv|television|telly)\b|телевизор/, 'tv'], [/console|playstation|\bps[2-5]\b|xbox|\bwii\b|приставк/, 'console'],
    [/laptop|ноутбук/, 'laptop'], [/computer|\bpc\b|компьютер/, 'pc'], [/pool table|billiard|бильярд/, 'pooltable'], [/dart/, 'darts'],
    [/board ?games?|настольн/, 'boardgames'], [/record player|turntable|vinyl player|проигрывател/, 'turntable'], [/karaoke|караоке/, 'karaoke'],
    [/stereo|speakers?\b|boombox|колонк/, 'stereo'], [/guitar|гитар/, 'guitar'], [/piano|пианино|рояль/, 'piano'], [/synth|keyboard|синтезатор/, 'keyboard'],
    [/couch|sofa|диван/, 'couch'], [/armchair|кресл/, 'armchair'], [/bookshel|bookcase|книжн/, 'bookshelf'], [/\bdesk\b|письменный стол/, 'desk'],
    [/double bed|двуспальн/, 'doublebed'], [/vanity|dressing table|туалетный столик/, 'vanity'], [/aquarium|fish tank|аквариум/, 'aquarium'],
    [/easel|мольберт/, 'easel'], [/sewing|швейн/, 'sewing'], [/workbench|верстак/, 'workbench'], [/treadmill|беговая дорожка/, 'treadmill'],
    [/weight bench|dumbbell|barbell|гантел|штанг/, 'weights'], [/yoga mat|коврик для йоги/, 'yogamat'], [/exercise bike|stationary bike|велотренаж/, 'bike'],
    [/microwave|микроволнов/, 'microwave'], [/stove|oven|плит[аау]|духовк/, 'stove'], [/coffee (maker|machine)|espresso machine|кофемашин|кофеварк/, 'coffee'],
    [/dining table|обеденный стол/, 'table'], [/bathtub|ванн[аау]\b/, 'bathtub'], [/washing machine|\bwasher\b|стиральн/, 'washer'],
    [/hot tub|jacuzzi|джакузи/, 'hottub'], [/grill|barbecue|\bbbq\b|мангал|гриль/, 'grill'], [/lounger|шезлонг/, 'loungers'],
];
export function catByName(text: string): string | null {
    const t = String(text ?? '').toLowerCase(); for (const [re, id] of BY_NAME) if (re.test(t)) return id; return null;
}
/** The lines the story reader may write about the house's things (with the rooms and what is in them now). */
export const PLACE_READ = [
    'PLACE | room | thing | whose (optional)   (a piece of furniture, an appliance, an instrument or another big thing was brought into the house and set up in a room: bought, received, made, carried in)',
    'RELOCATE | from room | to room | thing   (such a thing was carried to another room)',
    'DISCARD | room | thing   (such a thing was thrown out, sold or broken beyond use)',
    'For PLACE, RELOCATE and DISCARD the room is one of the rooms listed above; small things (food, clothes, a mug) are not for these lines, and a big thing gets no ADD or MOVE line. A gift gets its GIFT line; a big gift also its PLACE line.',
];
export interface PlaceOp { op: 'place' | 'relocate' | 'discard'; room: string; from?: string; thing: string; who?: Owner }
/** Reads PLACE, RELOCATE and DISCARD lines (rooms and people resolved by the callbacks; anything unknown dropped). */
export function parsePlace(raw: string, room: (s: string) => string | null, person: (s: string) => Owner | null): PlaceOp[] {
    const text = String(raw ?? '').replace(/<(think|thinking|reasoning)>[\s\S]*?<\/\1>/gi, '');
    const out: PlaceOp[] = [];
    for (const line of text.split('\n')) {
        const p = line.trim().replace(/^[-*•]\s*/, '').split('|').map(x => x.trim()); const op = (p[0] ?? '').toUpperCase();
        if (op === 'PLACE' && p.length >= 3) { const r = room(p[1]); const who = p[3] ? person(p[3]) : null; if (r && p[2]) out.push({ op: 'place', room: r, thing: p[2].slice(0, 60), ...(who ? { who } : {}) }); }
        else if (op === 'RELOCATE' && p.length >= 4) { const a = room(p[1]), b = room(p[2]); if (a && b && a !== b && p[3]) out.push({ op: 'relocate', from: a, room: b, thing: p[3].slice(0, 60) }); }
        else if (op === 'DISCARD' && p.length >= 3) { const r = room(p[1]); if (r && p[2]) out.push({ op: 'discard', room: r, thing: p[2].slice(0, 60) }); }
    }
    return out.slice(0, 6);
}
const sameThing = (x: Fixture, thing: string) => { const c = catByName(thing); const n = (s: string) => s.toLowerCase().replace(/[^a-zа-яё0-9 ]/gi, '').trim(); return (c && x.cat === c) || n(x.name) === n(thing) || (n(thing).length >= 4 && n(x.name).includes(n(thing))); };
/** Applies what was read: things set up (a catalog thing when it is one, else a thing with a name only), carried,
 *  thrown out. `ownerOf`: whose a thing set up in a room is when the line does not say (a bedroom's owner, the house).
 *  Returns short notes. A thing already there (the same kind, in that room) is not set up twice. */
export function applyPlace(g: GLike, ops: PlaceOp[], era: Era, ownerOf: (room: string) => Owner, nameOf: (room: string) => string): string[] {
    const out: string[] = [];
    for (const o of ops) {
        if (o.op === 'place') {
            if (fixturesIn(g, o.room).some(x => sameThing(x, o.thing))) continue;
            const cat = catByName(o.thing); const c = cat ? catOf(cat) : null;
            const x = addFixture(g, { ...(c && forEra(c, era) ? { cat: c.id } : { name: o.thing.charAt(0).toUpperCase() + o.thing.slice(1) }), room: o.room, owner: o.who ?? ownerOf(o.room), via: 'story', era });
            if (x) out.push(`${x.name} → ${nameOf(o.room)}`);
        } else {
            const x = fixturesIn(g, o.op === 'relocate' ? o.from! : o.room).find(y => sameThing(y, o.thing)); if (!x) continue;
            if (o.op === 'discard') { removeFixture(g, x.id); out.push(`${x.name}: gone`); }
            else { moveFixture(g, x.id, o.room); out.push(`${x.name} → ${nameOf(o.room)}`); }
        }
    }
    return out;
}
