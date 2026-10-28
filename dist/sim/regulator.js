// [expanded] The regulator: a second, cheap model for the game's mechanics (relationships, and next the house's
// things), chosen among SillyTavern's Connection Profiles. The story keeps the main model; the mechanics get short
// prompts of their own, without the chat preset or the chat history.
//
//  - With a profile chosen: background calls go to it, and (mode "message") each exchange is read once you send the
//    next message (so swiping or regenerating the last reply never counts it twice).
//  - Without one: background calls use the main model, and only at night.
//  - Every call is counted (today's calls and an estimate of the tokens), so the cost can be checked in Settings.
import { settings, saveSettings, game } from '../core/store.js';
import { getWorld, isScenario } from '../core/world.js';
import { ctx, quiet, chat, answerText } from '../st/bridge.js';
const today = () => new Date().toISOString().slice(0, 10);
export const regCfg = () => {
    const s = settings();
    s.regulator ??= {};
    const r = s.regulator;
    r.profile ??= '';
    r.mode ??= 'message';
    r.expr ??= 'st';
    r.joinCards ??= false;
    r.think ??= 'min';
    if (!r.stats || r.stats.day !== today())
        r.stats = { day: today(), calls: 0, tin: 0, tout: 0, fails: 0 };
    return r;
};
export const estTok = (t) => Math.ceil(String(t ?? '').length / 3.6);
export const profiles = () => (ctx().extensionSettings?.connectionManager?.profiles ?? [])
    .filter(p => p?.id)
    .map(p => ({ id: String(p.id), name: String(p.name ?? p.id), model: String(p.model ?? '') }));
const service = () => ctx().ConnectionManagerRequestService;
/** A profile is chosen, still exists, and SillyTavern can send through it. */
export const regOn = () => { const id = regCfg().profile; return !!id && !!service() && profiles().some(p => p.id === id); };
/** Exchanges are read message by message (otherwise only at night). */
export const perMessage = () => regOn() && regCfg().mode === 'message';
const clean = (t) => String(t ?? '').replace(/<(think|thinking|reasoning)>[\s\S]*?<\/\1>/gi, '').trim();
// [expanded] How much the mechanics model may think. Background calls go without the chat preset (so its reasoning
// setting never reached them) and a thinking model then thinks at its own default: 600 tokens of hidden thinking for a
// 40-token answer. Sent only where SillyTavern passes it on as it is: OpenRouter (reasoning.effort) and Google (AI
// Studio, Vertex: SillyTavern turns it into the model's thinking level); other APIs keep their default.
function thinkPayload() {
    const lvl = regCfg().think;
    if (lvl === 'auto')
        return {};
    const p = (ctx().extensionSettings?.connectionManager?.profiles ?? []).find(x => x?.id === regCfg().profile);
    const api = String(p?.api ?? '');
    if (api === 'openrouter')
        return { reasoning_effort: lvl === 'min' ? 'minimal' : 'low' };
    if (api === 'makersuite' || api === 'vertexai')
        return { reasoning_effort: lvl };
    return {};
}
// One background call. `fallback`: when the regulator is not set (or fails), use the main model instead (night
// calls); without it, a failed call just returns '' (per-message calls must never land on the main model).
export async function bgAsk(prompt, maxTokens, system = '', fallback = true) {
    const st = regCfg().stats;
    if (regOn()) {
        try {
            const messages = [...(system ? [{ role: 'system', content: system }] : []), { role: 'user', content: prompt }];
            const opts = { stream: false, extractData: true, includePreset: false, includeInstruct: false };
            const think = thinkPayload();
            let res;
            try {
                res = await service().sendRequest(regCfg().profile, messages, maxTokens, opts, think);
            }
            catch (e) {
                if (!Object.keys(think).length)
                    throw e;
                console.warn('[Mundi Expanded] the thinking level was refused; asking again without it', e);
                res = await service().sendRequest(regCfg().profile, messages, maxTokens, opts);
            }
            const out = answerText(typeof res === 'string' ? res : res?.content ?? res); // [expanded] content may come as parts
            st.calls++;
            st.tin += estTok(system) + estTok(prompt);
            st.tout += estTok(out);
            saveSettings();
            return out;
        }
        catch (e) {
            st.fails++;
            saveSettings();
            console.warn('[Mundi Expanded] regulator call failed', e);
            if (!fallback)
                return '';
        }
    }
    if (!fallback)
        return '';
    return clean(await quiet(prompt, maxTokens, system));
}
// Things that read each exchange (the house's things, next). Each gets the lines since the last read.
export const onExchange = [];
const lineOf = (m) => ({ name: String(m.name ?? ''), user: !!m.is_user, text: String(m.mes ?? '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() });
const regState = (g) => (g.regulator ??= {});
let busy = false;
// The player sent a message (index `id`): what came before it, since the last read, is settled; read it.
export async function onUserMessage(id) {
    const g = game();
    const w = g && getWorld(g.world);
    // the bridge: where you were and who was with you for this message (Home only)
    if (g && w && isScenario(w)) {
        try {
            const { noteScene } = await import('./livelog.js');
            const { presentAt } = await import('./people.js');
            noteScene(g, id, g.player.loc, presentAt(g, w, g.player.loc).map(r => r.avatar));
        }
        catch { /* not in a scene */ }
    }
    if (!g || !w || !isScenario(w) || !perMessage() || !onExchange.length || busy)
        return;
    const list = chat();
    const m = list[id];
    if (!m?.is_user)
        return;
    const st = regState(g);
    const from = Math.min(st.read ?? Math.max(0, id - 2), id);
    st.read = id;
    const lines = list.slice(from, id).filter((x) => String(x?.mes ?? '').trim() && !x.extra?.mundi_diary && !x.extra?.mundi_filler).map(lineOf); // [expanded] not "Send if empty" lines
    if (!lines.length || !lines.some(l => !l.user))
        return;
    busy = true;
    try {
        for (const f of onExchange)
            await f(g, w, lines);
    }
    catch (e) {
        console.warn('[Mundi Expanded] reading the exchange failed', e);
    }
    finally {
        busy = false;
    }
}
// The night read the whole day: the next exchange starts after it.
export const markRead = (g, index) => { regState(g).read = index; };
