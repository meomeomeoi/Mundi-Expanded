// [expanded] The era of a Home (Mundi Expanded): now, the early 2010s or the 2000s. It is a line in the game's
// lorebook (one entry of its own, written and removed by this; nothing else in the lorebook is touched), how
// people text (length, emoji, slang), and the phone it suggests (a skin: smartphone, keypad phone or PDA). Kept
// apart from the skin: a retro phone in today's world is fine, and later the era will also choose computers.


export type Era = 'now' | '2010s' | '2000s';
export type Skin = 'phone' | 'keypad' | 'pda';
export interface EraDef { id: Era; name: string; skin: Skin; lore: string; texts: string }
export const ERAS: EraDef[] = [
    { id: 'now', name: 'Today', skin: 'phone', lore: '', texts: '' },
    { id: '2010s', name: 'Early 2010s', skin: 'phone',
        lore: 'The story is set in the early 2010s. Smartphones are new and not everyone has one (some still use keypad phones); messengers and social networks are recent, video calls are on a laptop, music is on MP3 players and the first streaming sites. There are no modern apps or trends from after the early 2010s.',
        texts: 'It is the early 2010s: texts are casual but plain, with few emoji (mostly :) and :D), no modern slang or memes from after that time.' },
    { id: '2000s', name: 'The 2000s', skin: 'keypad',
        lore: 'The story is set in the mid-2000s. There are no smartphones or modern social media: people carry keypad or flip phones, call each other and send short text messages (SMS cost money, so they are brief and often abbreviated), and chat on ICQ or forums from a computer or a PDA. Music is on CDs and MP3 players, films on DVD and TV. Nothing from after the 2000s exists.',
        texts: 'It is the mid-2000s: these are SMS on a keypad phone, short (one or two sentences), often abbreviated (u, gr8, 2nite), no emoji (at most :) or ;)), nothing from after the 2000s.' },
];
export const SKINS: [Skin, string][] = [['phone', 'Smartphone'], ['keypad', 'Keypad phone'], ['pda', 'PDA']];
export interface EraX { era: Era; skin: Skin }
export type GLike = { erax?: EraX };
export const eraxOf = (g: GLike): EraX => { const e = (g.erax ??= { era: 'now', skin: 'phone' }); e.era ??= 'now'; e.skin ??= 'phone'; return e; };
export const eraDef = (g: GLike) => ERAS.find(e => e.id === eraxOf(g).era) ?? ERAS[0];
export const skinOf = (g: GLike | null | undefined): Skin => (g ? eraxOf(g).skin : 'phone');
/** For the texting prompts (private messages, group chats): '' today. */
export const eraTextLine = (g: GLike) => eraDef(g).texts;

/* ---------- the lorebook entry ---------- */

export const LORE_COMMENT = 'Mundi Expanded: era';
/** Writes (or, for today, removes) the era's entry in `lore` (a lorebook's data as SillyTavern keeps it). */
export function eraEntry(data: any, def: EraDef, make: () => any): boolean {
    const entries = (data.entries ??= {});
    const mine = Object.entries(entries).find(([, e]: any) => e?.comment === LORE_COMMENT);
    if (!def.lore) { if (mine) { delete entries[mine[0]]; return true; } return false; }
    const e: any = mine ? mine[1] : make(); if (!e) return false;
    e.comment = LORE_COMMENT; e.key = ['era', 'year', 'time period']; e.content = def.lore; e.constant = true; e.disable = false;
    return true;
}
/** For the scene, only when there is no lorebook to hold it. */
export const eraPromptLine = (g: GLike, inLore: boolean) => (inLore ? '' : eraDef(g).lore);

