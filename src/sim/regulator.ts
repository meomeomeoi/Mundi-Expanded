// [expanded] The regulator: a second, cheap model for the game's mechanics (relationships, and next the house's
// things), chosen among SillyTavern's Connection Profiles. The story keeps the main model; the mechanics get short
// prompts of their own, without the chat preset or the chat history.
//
//  - With a profile chosen: background calls go to it, and (mode "message") each exchange is read once you send the
//    next message (so swiping or regenerating the last reply never counts it twice).
//  - Without one: background calls use the main model, and only at night.
//  - Every call is counted (today's calls and an estimate of the tokens), so the cost can be checked in Settings.
import { settings, saveSettings, game, type Save } from '../core/store.js';
import { getWorld, isScenario, type WorldDef } from '../core/world.js';
import { ctx, quiet, chat, answerText } from '../st/bridge.js';

export type RegMode = 'message' | 'night';
interface Stats { day: string; calls: number; tin: number; tout: number; fails: number }
interface RegCfg { profile: string; mode: RegMode; stats: Stats; /** facial expressions: SillyTavern's classifier, or a model for everyone in the scene */ expr: 'st' | 'mech' | 'main'; /** group turns: everyone here's cards joined (cacheable) instead of the speaker's */ joinCards: boolean }
const today = () => new Date().toISOString().slice(0, 10);
export const regCfg = (): RegCfg => {
    const s = settings() as any; s.regulator ??= {};
    const r = s.regulator; r.profile ??= ''; r.mode ??= 'message'; r.expr ??= 'st'; r.joinCards ??= false;
    if (!r.stats || r.stats.day !== today()) r.stats = { day: today(), calls: 0, tin: 0, tout: 0, fails: 0 };
    return r as RegCfg;
};
export const estTok = (t: string) => Math.ceil(String(t ?? '').length / 3.6);

export interface Profile { id: string; name: string; model: string }
export const profiles = (): Profile[] => ((ctx().extensionSettings?.connectionManager?.profiles ?? []) as any[])
    .filter(p => p?.id)
    .map(p => ({ id: String(p.id), name: String(p.name ?? p.id), model: String(p.model ?? '') }));
const service = () => ctx().ConnectionManagerRequestService as any;
/** A profile is chosen, still exists, and SillyTavern can send through it. */
export const regOn = () => { const id = regCfg().profile; return !!id && !!service() && profiles().some(p => p.id === id); };
/** Exchanges are read message by message (otherwise only at night). */
export const perMessage = () => regOn() && regCfg().mode === 'message';

const clean = (t: unknown) => String(t ?? '').replace(/<(think|thinking|reasoning)>[\s\S]*?<\/\1>/gi, '').trim();

// One background call. `fallback`: when the regulator is not set (or fails), use the main model instead (night
// calls); without it, a failed call just returns '' (per-message calls must never land on the main model).
export async function bgAsk(prompt: string, maxTokens: number, system = '', fallback = true): Promise<string> {
    const st = regCfg().stats;
    if (regOn()) {
        try {
            const messages = [...(system ? [{ role: 'system', content: system }] : []), { role: 'user', content: prompt }];
            const res = await service().sendRequest(regCfg().profile, messages, maxTokens, { stream: false, extractData: true, includePreset: false, includeInstruct: false });
            const out = answerText(typeof res === 'string' ? res : res?.content ?? res);   // [expanded] content may come as parts
            st.calls++; st.tin += estTok(system) + estTok(prompt); st.tout += estTok(out); saveSettings();
            return out;
        } catch (e) {
            st.fails++; saveSettings();
            console.warn('[Mundi Expanded] regulator call failed', e);
            if (!fallback) return '';
        }
    }
    if (!fallback) return '';
    return clean(await quiet(prompt, maxTokens, system));
}

/* ---------- reading the chat, exchange by exchange ---------- */

export interface Line { name: string; user: boolean; text: string }
// Things that read each exchange (the house's things, next). Each gets the lines since the last read.
export const onExchange: ((g: Save, w: WorldDef, lines: Line[]) => Promise<void>)[] = [];

const lineOf = (m: any): Line => ({ name: String(m.name ?? ''), user: !!m.is_user, text: String(m.mes ?? '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() });
const regState = (g: Save) => (((g as any).regulator ??= {}) as { read?: number });
let busy = false;

// The player sent a message (index `id`): what came before it, since the last read, is settled; read it.
export async function onUserMessage(id: number) {
    const g = game(); const w = g && getWorld(g.world);
    // the bridge: where you were and who was with you for this message (Home only)
    if (g && w && isScenario(w)) { try { const { noteScene } = await import('./livelog.js'); const { presentAt } = await import('./people.js'); noteScene(g, id, g.player.loc, presentAt(g, w, g.player.loc).map(r => r.avatar)); } catch { /* not in a scene */ } }
    if (!g || !w || !isScenario(w) || !perMessage() || !onExchange.length || busy) return;
    const list = chat(); const m = list[id];
    if (!m?.is_user) return;
    const st = regState(g);
    const from = Math.min(st.read ?? Math.max(0, id - 2), id);
    st.read = id;
    const lines = list.slice(from, id).filter((x: any) => String(x?.mes ?? '').trim() && !x.extra?.mundi_diary && !x.extra?.mundi_filler).map(lineOf);   // [expanded] not "Send if empty" lines
    if (!lines.length || !lines.some(l => !l.user)) return;
    busy = true;
    try { for (const f of onExchange) await f(g, w, lines); }
    catch (e) { console.warn('[Mundi Expanded] reading the exchange failed', e); }
    finally { busy = false; }
}
// The night read the whole day: the next exchange starts after it.
export const markRead = (g: Save, index: number) => { regState(g).read = index; };
