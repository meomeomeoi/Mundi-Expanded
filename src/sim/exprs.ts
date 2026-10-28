// [expanded] Facial expressions by a model: everyone in the scene at once, one short call per reply. SillyTavern's
// Expressions classifier reads one line at a time and gives its label to whoever spoke it: the ones who only listen
// keep their old face (Masha being teased), what the line says about others counts for the speaker, and the local
// model mostly guesses on long prose. The model reads the last lines and gives each person here a label from their
// sprites' labels, speakers and listeners alike.
import { looseJson } from './jsonfix.js';

/** The labels of SillyTavern's classifier (go-emotions): every sprite set uses them. */
export const EXPR_LABELS = ['admiration', 'amusement', 'anger', 'annoyance', 'approval', 'caring', 'confusion', 'curiosity', 'desire',
    'disappointment', 'disapproval', 'disgust', 'embarrassment', 'excitement', 'fear', 'gratitude', 'grief', 'joy', 'love', 'nervousness',
    'neutral', 'optimism', 'pride', 'realization', 'relief', 'remorse', 'sadness', 'surprise'];

export type ExprSource = 'st' | 'mech' | 'main';
export interface ExprWho { avatar: string; name: string; labels: string[] }
export interface ExprPlace { id: string; name: string }

export const EXPR_SYSTEM = 'You read a moment of an interactive fiction (a role-play between consenting adults) and give the facial expression each character has right now, from a fixed list of labels. You answer with one JSON object only.';

/** The prompt: who is here, the last lines, the labels. */
export function exprPrompt(p: { people: ExprWho[]; you: string; lines: { name: string; text: string }[]; places?: ExprPlace[]; youToo?: boolean }): string {
    const all = [...new Set(p.people.flatMap(x => x.labels))];
    const own = p.people.filter(x => x.labels.length && x.labels.length < all.length);
    return [
        `[The people here: ${p.people.map(x => x.name).join(', ')}. ${p.youToo ? `${p.you} is the player: their face too, from what they last said and did and what was said to them.` : `${p.you} is the player: no label for them.`}]`,   // [expanded] 0.2.0.7: your portrait
        '[The last lines:]',
        ...p.lines.map(l => `${l.name}: ${l.text}`),
        `[For each of the people here: their face at the end of the last line, how they feel now. Those who did not speak too: how they react to what was said or done to them (teased, praised, ignored). What a line says about someone else is that person's, not the speaker's. Most of the time a face is neutral or mild; a strong one only when the moment shows it.]`,
        `[Labels: ${all.join(', ')}. Only these.${own.length ? ` ${own.map(x => `${x.name} has only: ${x.labels.join(', ')}.`).join(' ')}` : ''}]`,
        ...(p.places ? [
            `[Also, from the last lines only: who walks off from here right now, and where to ("moves"): one of ${p.places.map(x => `"${x.name}"`).join(', ')}, "own room" or "out of the house". Only someone who clearly goes now (not "I'll come later", not a step toward the door, not ${p.you}). And who goes along with ${p.you} ("follows"): ${p.you} asked them to come, or they offered and it was taken, and they now follow ${p.you} from room to room. Most of the time both are empty.]`,
            `[Answer: {"faces": {${p.people.map(x => `"${x.name}": "label"`).join(', ')}}, "moves": {}, "follows": []}]`,
        ] : [`[Answer: {${p.people.map(x => `"${x.name}": "label"`).join(', ')}}]`]),
    ].join('\n');
}

const norm = (s: string) => String(s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
/** The answer → a label for each person (by avatar); a label they have no sprite for becomes neutral (or is left out). */
export function parseExprs(text: string, people: ExprWho[]): Record<string, string> {
    const j0 = looseJson(text); const out: Record<string, string> = {};
    if (!j0 || typeof j0 !== 'object') return out;
    const j = j0.faces && typeof j0.faces === 'object' ? j0.faces : j0;   // [expanded] with places: {"faces": …, "moves": …}
    for (const [k, v] of Object.entries(j)) {
        const key = norm(k);
        const who = people.find(x => norm(x.name) === key) ?? people.find(x => norm(x.name).split(/\s+/)[0] === key.split(/\s+/)[0]);
        if (!who || typeof v !== 'string') continue;
        const label = norm(v).replace(/[^a-z]/g, '');
        const has = who.labels.length ? who.labels : EXPR_LABELS;
        if (has.includes(label)) out[who.avatar] = label;
        else if (has.includes('neutral')) out[who.avatar] = 'neutral';
    }
    return out;
}

const whoIs = (people: ExprWho[], k: string) => { const key = norm(k); return people.find(x => norm(x.name) === key) ?? people.find(x => norm(x.name).split(/\s+/)[0] === key.split(/\s+/)[0]); };
/** Where a place named by the model is: a room's id, 'own' (their own room) or 'out' (out of the house); null: unknown. */
export function placeIn(name: string, places: ExprPlace[]): string | null {
    const n = norm(name).replace(/^the\s+/, '');
    if (!n) return null;
    if (/^(own|their|her|his)( own)? (room|bedroom)$|^(own room|bedroom|her room|his room|their room)$/.test(n)) return 'own';
    if (/^(out|outside|away)( of the house| of the home)?$|^(left the house|leaves the house|out of house)$/.test(n)) return 'out';
    const exact = places.find(p => norm(p.name) === n || norm(p.id) === n); if (exact) return exact.id;
    const part = places.filter(p => norm(p.name).includes(n) || n.includes(norm(p.name)));
    return part.length === 1 ? part[0].id : null;
}
/** The answer's "moves" (person → place, see placeIn) and "follows" (those who go along with the player). */
export function parseMoves(text: string, people: ExprWho[], places: ExprPlace[]): { moves: Record<string, string>; follows: string[] } {
    const j = looseJson(text); const moves: Record<string, string> = {}; const follows: string[] = [];
    if (!j || typeof j !== 'object') return { moves, follows };
    if (j.moves && typeof j.moves === 'object' && !Array.isArray(j.moves)) for (const [k, v] of Object.entries(j.moves)) {
        const who = whoIs(people, k); const at = typeof v === 'string' ? placeIn(v, places) : null;
        if (who && at) moves[who.avatar] = at;
    }
    if (Array.isArray(j.follows)) for (const k of j.follows) { const who = typeof k === 'string' ? whoIs(people, k) : null; if (who && !moves[who.avatar] && !follows.includes(who.avatar)) follows.push(who.avatar); }
    return { moves, follows };
}
