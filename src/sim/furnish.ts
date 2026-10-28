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
export interface FurnishX { items: Fixture[]; seq: number; started?: boolean }
export type GLike = { day: number; furnishx?: FurnishX };
export function furnishOf(g: GLike): FurnishX {
    const f = (g.furnishx ??= { items: [], seq: 0 }); f.items ??= []; f.seq ??= 0; return f;
}
export const PLAYER_ROOM = 'home:player';
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
