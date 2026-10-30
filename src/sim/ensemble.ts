// [expanded] Mundi Expanded 15: one reply for the whole room (pure logic; the glue with SillyTavern is sim/turnrun.ts).
//
// SillyTavern's group turn is one call per speaker, each answering once: nobody answers anybody in the same turn.
// Here one call writes a whole beat of the scene as several people ("[Mira] ... [Finn] ... [Mira] ..."), and the
// answer is cut into ordinary lines, each with its own author, so everything that reads the chat (sprites, journal,
// diary, memory, voices) sees people speaking, not a director.
//
// The answer's format is "[Name]" alone on a line, then what that person says and does (actions in asterisks), with an
// optional "[Narration]" part. Not "Name:": SillyTavern's own clean-up cuts a group reply at a line that starts with a
// member's name and a colon.

/** The director card: a muted member of every Mundi game's group, never picked by SillyTavern itself. */
export const SCENE_FILE = 'mundi_scene';
export const SCENE_AVATAR = `${SCENE_FILE}.png`;
export const SCENE_NAME = 'Mundi Scene';
export const NARRATION = 'narration';
/** The director's avatar (SillyTavern may number the file) and its lines, before they are cut into people's lines. */
export const isSceneAvatar = (a?: unknown) => /^mundi_scene(_?\d+)?\.png$/i.test(String(a ?? ''));
export const isSceneMessage = (m: any) => !!m && !m.is_user && !m.is_system && (isSceneAvatar(m.original_avatar) || m.name === SCENE_NAME);

export interface Who { avatar: string; name: string }
export interface Block { who: string; text: string }   // who: an avatar, or NARRATION
export interface Parsed { blocks: Block[]; dropped: string[] }

const NARR = /^(narration|narrator|scene|mundi scene|the narrator)$/i;
const USER = (user: string) => (s: string) => { const q = s.trim().toLowerCase(); return q === user.trim().toLowerCase() || q === '{{user}}' || q === 'user'; };
const first = (s: string) => s.trim().split(/\s+/)[0]?.toLowerCase() ?? '';

/** A "[Name]" header's owner among the cast: the whole name, then the first name either way. */
export function whoIs(head: string, cast: Who[]): Who | null {
    const q = head.trim().toLowerCase(); if (!q) return null;
    return cast.find(c => c.name.toLowerCase() === q) ?? cast.find(c => first(c.name) === q || first(c.name) === first(head) && first(head).length >= 2) ?? null;
}

// "[Mira]", "**[Mira]**", "[Mira]:" alone on a line, or with the first words after it on the same line.
const HEAD = /^\s*\**\s*\[([^\]\n]{1,40})\]\s*\**\s*:?[ \t]*(.*)$/;

/**
 * The beat, cut into parts. Never loses the turn: whatever cannot be read as parts comes back as one narration part.
 * - text before the first header is narration; a header with the player's name is dropped (the model wrote for the
 *   player: reported in `dropped`); an unknown name is not a header (its text stays with the part before);
 * - the same person twice in a row is one part; more than `max` people's parts are cut; one narration part at most
 *   (the first); with no person's part at all, the whole text is one narration part.
 * `partial`: the text is still streaming: a header cut off in the middle ("[Mi") is not shown yet.
 */
export function parseEnsemble(raw: string, cast: Who[], user: string, max = 3, partial = false): Parsed {
    let text = String(raw ?? '').replace(/\r/g, '');
    if (partial) text = text.replace(/(^|\n)[ \t]*\**[ \t]*\[[^\]\n]*$/, '$1');
    const isUser = USER(user); const dropped: string[] = [];
    const parts: { who: string; lines: string[] }[] = [];
    const open = (who: string, rest: string) => { parts.push({ who, lines: rest ? [rest] : [] }); };
    for (const line of text.split('\n')) {
        const m = HEAD.exec(line);
        if (m) {
            const head = m[1].trim(), rest = m[2].trim();
            if (NARR.test(head)) { open(NARRATION, rest); continue; }
            if (isUser(head)) { dropped.push(head); open('', rest); continue; }   // '' = dropped part: its text is not kept
            const who = whoIs(head, cast);
            if (who) { open(who.avatar, rest); continue; }
            // not a header we know: a line of text (or a stray tag), kept with the part before it unless it is only the tag
            if (rest) { if (!parts.length) open(NARRATION, ''); parts.at(-1)!.lines.push(line.trim()); }
            continue;
        }
        if (!parts.length) { if (!line.trim()) continue; open(NARRATION, ''); }
        parts.at(-1)!.lines.push(line);
    }
    let blocks: Block[] = parts.filter(p => p.who).map(p => ({ who: p.who, text: p.lines.join('\n').trim() })).filter(b => b.text);
    // the same person in a row: one part
    blocks = blocks.reduce<Block[]>((o, b) => { const l = o.at(-1); if (l && l.who === b.who) l.text += `\n\n${b.text}`; else o.push({ ...b }); return o; }, []);
    if (!blocks.some(b => b.who !== NARRATION)) {
        // nothing a person said: one narration part with all that is there (minus what was written for the player)
        const all = blocks.map(b => b.text).join('\n\n').trim();
        return { blocks: all ? [{ who: NARRATION, text: all }] : [], dropped };
    }
    // at most `max` people's parts and one narration part
    let people = 0, narr = 0;
    blocks = blocks.filter(b => { if (b.who === NARRATION) return narr++ < 1; return people++ < Math.max(1, max); });
    return { blocks, dropped };
}

/* ---------- what the model is told ---------- */

export interface BeatAsk {
    names: string[];         // everyone in the scene
    speakers?: string[];     // who is expected to speak (order matters); the others may only react
    to: 'room' | 'some' | 'none' | 'story';
    toNames?: string[];      // to: 'some'
    max: number;
    cast?: { name: string; about: string; doing?: string; voice?: string }[];   // the people's own cards (and how they talk), when their cards are not in the prompt
}
const list = (xs: string[]) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs.at(-1)}`);

/** The line about who the player spoke to. */
export function toLine(a: Pick<BeatAsk, 'to' | 'toNames'>): string {
    if (a.to === 'none') return '{{user}} says nothing and lets them go on.';
    if (a.to === 'story') return '{{user}} gave a direction for the story: let it happen, in the voices of the people here.';
    if (a.to === 'some' && a.toNames?.length) return `{{user}} spoke to ${list(a.toNames)}.`;
    return '{{user}} spoke to everyone here.';
}

/** The instruction for one beat (an extension prompt for a single call). */
export function beatPrompt(a: BeatAsk): string {
    const cast = a.cast?.length ? `\nWho is here:\n${a.cast.map(p => `- ${p.name}: ${p.about}${p.doing ? ` (right now: ${p.doing})` : ''}${p.voice ? `\n  How ${p.name} talks, for example: ${p.voice}` : ''}`).join('\n')}` : '';
    const who = a.speakers?.length ? `\nLikely to speak: ${list(a.speakers)}. The others may react with a short action, and speak only if staying silent would be odd.` : '';
    return `[Scene beat. Write what happens next, as the people in this scene: ${list(a.names)}.
${toLine(a)}${who}${cast}
Format: begin each person's part with a line holding only their name in square brackets, for example [${a.names[0] ?? 'Name'}], then what they say and do (their actions in *asterisks*). You may add one [Narration] part of a single short sentence, only if the moment needs it.
Write at most ${a.max} parts. Fewer is better: someone with nothing to add stays out of it. People may answer each other, interrupt or talk over each other; each one speaks only in their own voice and knows only what they would know.
Stop at the first natural pause where {{user}} could respond: a question put to {{user}}, a look, a silence. If they are talking among themselves, stop after an exchange or two.
Never write {{user}}'s words, actions or thoughts.]`;
}
/** A person's card in a few lines (the director's prompt carries them when the cards themselves are not in it). */
/** Only a safety cap (a card of 30 000 characters): a normal card goes in whole, as in SillyTavern's own prompt. */
export const CARD_CAP = 4000, VOICE_CAP = 1200;
export const aboutText = (s: string, max = CARD_CAP) => String(s ?? '').replace(/\s+/g, ' ').trim().slice(0, max);

/* ---------- a beat on the chat: what each of its lines remembers ---------- */

/** Kept on each line of a beat (extra.mundi_beat): k of n; the first line also keeps every version's raw text. */
export interface BeatMark { id: string; k: number; n: number }
export interface BeatPlan { speakers: string[]; to: 'room' | 'some' | 'none' | 'story'; toNames?: string[] }
export const beatId = () => `b${Date.now().toString(36)}${Math.floor(Math.random() * 1296).toString(36)}`;
