// The scene: the place, the people in it (Expressions sprites), the conversation and the composer.
// The conversation IS the group chat: generation, streaming, swipes, regenerate, continue, impersonate,
// editing and deleting all use SillyTavern's own functions.
import { isRpg } from '../sim/rpg.js';
import { setHtml } from '../core/safe.js';
import { shape, type Mode as ShapeMode } from '../sim/shape.js';   // [expanded] 0.2.1-15.2
import { isSceneMessage, parseEnsemble, NARRATION, type Block } from '../sim/ensemble.js';   // [expanded] 0.2.1-15: one reply for the room
import { liveCast, lastIsBeat, beatSwipeState, beatSwipe, regenBeat, goOn, sendTurn, cancelPlanning } from '../sim/turnrun.js';
import { lex } from '../core/lexicon.js';
import { setPrompt } from '../st/bridge.js';
import { socialCheck } from '../sim/judge.js';
import { pictureAt } from '../sim/daynight.js';
import { nativeHost } from './native.js';
import { lockScene } from '../sim/life.js';
import { soloOf } from './lifeui.js';
import { judgeLine, judgeReaction, settleLine } from '../sim/mood.js';
import { state, notify, esc, game, toast, ROOT_ID, saveGame, settings } from '../core/store.js';
import { getWorld, worldFile, systemOn, isScenario, type WorldDef } from '../core/world.js';
import type { Save } from '../core/store.js';
import {
    chat, speakerOf, thumb, sendText, replyAs, regenerate, continueLast, impersonate, stop, swipeLeft, swipeRight,
    editMessage, deleteMessageAt, expressionOf, fetchSprites, saveChat, me, currentCharacter, charOf, characters, ctx,
    addUserLine, narratorLine, personaName, quiet, lorebooks, chatLores, setChatLores,
    currentChatId, groupTurnOn, isFiller,
    scenarioOpen, scenarioCast, scenarioTitle, addToScenario, removeFromScenario, setChatBackground, newScenarioChat,
    persona, personas, personaThumb, usePersona,
} from '../st/bridge.js';
import { placeOf, isOuting } from '../sim/places.js';
import { outingOf } from '../sim/outing.js';
import { bgStyle } from './outing.js';
import { bgHead, bgGrid } from './bgpick.js';
import { presentAt } from '../sim/people.js';
import { toolsHtml } from './tools.js';
import { addBond } from '../sim/social.js';
import { mentionIn, closeMention } from './mention.js';
import { visitStart } from '../sim/visits.js';
import { icon } from './icons.js';
import { ACT, INPUT } from './reg.js';
import { sceneCard } from './plans.js';
import { micButton, sdButton, ttsButton } from './addons.js';
import { isWith } from '../sim/social.js';
import { sceneText } from '../sim/prompt.js';
import { aiLangNote } from '../core/i18n.js';
import './bgfade.js';   // the background fades softly when the time of day changes
import { tr } from '../core/tr.js';
import { stFormat, avatarHtml, cardPicHtml, portraitHtml, lightboxHtml, lookPanelHtml, lookConfirmHtml } from './chatlook.js';
import { avatarUrl } from '../st/bridge.js';
import { charPicker } from './charpick.js';
import { RAD, radialHtml } from './radial.js';

const LOG_SIZE = 40;

/* ---------- text ---------- */

export function cleanText(t: string) {
    return String(t ?? '')
        .replace(/<(think|thinking|reasoning)>[\s\S]*?<\/\1>/gi, '')
        .replace(/<(think|thinking|reasoning)>[\s\S]*$/i, '')
        .trim();
}
// Pictures in a line: Markdown ![…](url) and <img src="…"> written by the character (anything else stays text).
const linkUrl = (u: string) => (/^(?:https?:\/\/|data:image\/|\/|[\w%.~-]+\/)/i.test(u) && !/^\s*javascript:/i.test(u) ? u : '');
function pictures(html: string) {
    return html
        .replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+&quot;[^)]*&quot;)?\)/g, (all, alt, url) => (linkUrl(url) ? `<img class="mu-line-img" src="${url}" alt="${alt}" loading="lazy">` : all))
        .replace(/&lt;img\b[\s\S]*?\bsrc=(?:&quot;|&#39;)([^&]+?)(?:&quot;|&#39;)[\s\S]*?\/?&gt;/gi, (all, url) => (linkUrl(url) ? `<img class="mu-line-img" src="${url}" alt="" loading="lazy">` : all));
}
// Pictures and videos attached to a line (SillyTavern keeps them in the message's "extra").
// A system line that carries a picture made by SillyTavern (not a hidden line of the story).
function isGeneratedPicture(m: any) {
    const x = m?.extra ?? {};
    const has = (Object.prototype.propertyIsEnumerable.call(x, 'image') && typeof x.image === 'string' && x.image) || (Array.isArray(x.media) && x.media.some((d: any) => d?.url));
    // any hidden (system) line that carries a picture is shown: SillyTavern posts generated pictures as lines the AI does
    // not read (the ghost / crossed eye), sometimes under the character's name; hidden lines of earlier visits are not
    // in the log anyway (it starts at this visit)
    return !!has;
}
function attachments(m: any) {
    const x = m?.extra ?? {};
    const list: { url: string; video?: boolean }[] = [];
    // SillyTavern now keeps them in "media"; the old "image"/"video" fields are read only when they really exist
    // (reading its compatibility getter logs a warning every time)
    const own = (k: string) => Object.prototype.propertyIsEnumerable.call(x, k) && typeof x[k] === 'string' && x[k];
    if (own('image')) list.push({ url: x.image });
    for (const md of Array.isArray(x.media) ? x.media : []) if (md?.url) list.push({ url: String(md.url), video: md.type === 'video' });
    if (own('video')) list.push({ url: x.video, video: true });
    const seen = new Set<string>();
    return list.filter(a => linkUrl(a.url) && !seen.has(a.url) && seen.add(a.url)).map(a => (a.video
        ? `<video class="mu-line-img" src="${esc(a.url)}" controls preload="metadata"></video>`
        : `<img class="mu-line-img" data-act="lightbox" src="${esc(a.url)}" alt="" loading="lazy">`)).join('');
}
// The text shown for a line: SillyTavern's translation of it when there is one (Chat Translation extension).
export const shownText = (m: any) => {
    const t = String(m?.extra?.display_text || m?.mes || '');
    if (!m?.is_user) return t;
    // the instructions that go with Story and See are for the AI, not for the screen
    return t.replace(/\s*\[Describe what [^\]]{0,80}? sees\.?\]/gi, '').replace(/^\s*\[Story direction:\s*([\s\S]*?)\]\s*$/i, (_m, x) => `*✦ ${String(x).trim()}*`);
};
export function formatText(t: string) {
    return pictures(esc(cleanText(t)))
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        .replace(/\*([^*]+)\*/g, '<em>$1</em>')
        .replace(/\*([^*]*)$/, '<em>$1</em>')
        .replace(/&quot;([^&]+?)&quot;|“([^”]+)”/g, (_m, a, b) => `<q>${a ?? b}</q>`)
        .replace(/\n{2,}/g, '</p><p>').replace(/\n/g, '<br>');
}

/* ---------- sprites ---------- */

// [expanded] A new face is shown once its picture is loaded; until then, the one before (a sprite whose new picture
// was still loading had no width for a moment, and the others slid sideways)
const LOADED = new Set<string>(); const LOADING = new Set<string>(); const SHOWN = new Map<string, string>();
// [expanded] 0.2.1-12.3: a picture whose figure is off to one side (more empty space on the left than on the right)
// is trimmed on the wider side, so the figure stands in the middle of its place (Chrome; elsewhere nothing changes)
const CROP = new Map<string, string>();
function measure(src: string, im: HTMLImageElement) {
    try {
        const W = 96, H = Math.max(1, Math.round(W * im.naturalHeight / Math.max(1, im.naturalWidth)));
        const c = document.createElement('canvas'); c.width = W; c.height = H;
        const x = c.getContext('2d', { willReadFrequently: true }); if (!x) return;
        x.drawImage(im, 0, 0, W, H); const d = x.getImageData(0, 0, W, H).data;
        let lo = W, hi = -1;
        for (let col = 0; col < W; col++) for (let row = 0; row < H; row += 2) if (d[(row * W + col) * 4 + 3] > 24) { lo = Math.min(lo, col); hi = Math.max(hi, col); break; }
        if (hi < lo) return;
        const L = lo / W, R = (W - 1 - hi) / W, cut = Math.abs(L - R);
        if (cut < 0.04) return;   // near enough the middle
        CROP.set(src, `object-view-box:inset(0 ${R > L ? (cut * 100).toFixed(1) : 0}% 0 ${L > R ? (cut * 100).toFixed(1) : 0}%)`);
    } catch { /* a picture from elsewhere: left as it is */ }
}
const cropOf = (src: string) => CROP.get(src) ?? '';
function steady(who: string, src: string): string {
    if (!src || src.startsWith('data:')) return src;
    if (LOADED.has(src)) { SHOWN.set(who, src); return src; }
    if (!LOADING.has(src)) { LOADING.add(src); const im = new Image(); const done = () => { LOADED.add(src); LOADING.delete(src); notify(); }; im.onload = () => { measure(src, im); done(); }; im.onerror = done; im.src = src; }
    return SHOWN.get(who) ?? src;
}
function spriteFor(avatar: string, label: string | null): string {
    const list = state.sprites[avatar];
    if (list === undefined) {
        state.sprites[avatar] = null;
        fetchSprites(avatar).then(l => { state.sprites[avatar] = l; notify(); });
        return '';
    }
    if (!list?.length) return '';
    const want = (label ?? 'neutral').toLowerCase();
    const hit = list.find(s => String(s.label).toLowerCase() === want) ?? list.find(s => String(s.label).toLowerCase() === 'neutral') ?? list[0];
    return String(hit?.path ?? '');
}

// The latest expression of each person in the scene (from her last line).
function expressions(): Record<string, string | null> {
    const out: Record<string, string | null> = {};
    const list = chat();
    for (let i = list.length - 1; i >= 0 && i > list.length - 60; i--) {
        // [expanded] everyone's faces given by a model with that line (listeners too); a line still waiting for its
        // expression keeps the face from before (no flash of neutral)
        // [expanded] only what was read from the text the line has now (a swipe keeps the line and changes its text)
        const x = list[i].extra;
        const all = x?.mundi_exprs; if (all && keyOk(list[i], 'mundi_exprsk')) for (const [a, l] of Object.entries(all)) if (!(a in out)) out[a] = String(l);
        const a = speakerOf(list[i]);
        if (a && !(a in out) && x?.mundi_expr && keyOk(list[i], 'mundi_exprk')) out[a] = x.mundi_expr;
        if (list[i].is_user && !('__you' in out) && x?.mundi_expr && keyOk(list[i], 'mundi_exprk')) out.__you = x.mundi_expr;   // [expanded] your face (your own line read)
    }
    return out;
}

/* ---------- RPG: roll for the next line ---------- */

// The dice button: your next line is a check (the judge picks the skill and difficulty; the dice decide).
const CHECK = { on: false };
function diceButton(nobody: boolean) {
    const g = game(); const w = g && getWorld(g.world);
    if (!g || !w || !isRpg(w) || nobody) return '';
    return `<button data-act="roll-next" class="${CHECK.on ? 'is-on' : ''}" title="${esc(lex(w, 'rollAsk'))}: your next line is a d20 check">🎲</button>`;
}

/* ---------- drawing ---------- */

function background(g: Save, w: WorldDef) {
    if (isOuting(g.player.loc)) return bgStyle(outingOf(g)?.bg ?? '');   // Home, out of the house: the background you chose
    const p = placeOf(g, w, g.player.loc);
    if (!p) return '';
    if (p.home) {
        const kind = w.homes.kinds[p.id === 'home:player' ? g.player.home.kind : (w.homes.zones.find(z => z.id === (g.cast[p.id.slice(5)]?.home.zone ?? (g as any).vacated?.home?.zone))?.kind ?? 'apartment')];   // (a room a guest just left: its own picture)
        const img = kind && pictureAt(w, g.minutes, kind.image, kind.images);   // the picture of this part of the day, if it has one
        if (img) return `background-image:url('${worldFile(w, img)}');background-size:cover;background-position:center`;
    }
    const pub = w.places.find(x => x.id === p.id);
    const bg = pictureAt(w, g.minutes, p.bg, pub?.bgs);
    if (bg) return `background-image:url('${worldFile(w, bg)}');background-size:cover;background-position:center`;
    const map = w.maps.find(m => m.id === p.map) ?? w.maps[0];
    return `background-image:url('${worldFile(w, pictureAt(w, g.minutes, map.image, map.images)!)}');background-size:420% auto;background-position:${p.x}% ${p.y}%`;
}

import { giftButton, giftHtml, withGift } from './giftui.js';   // [expanded]
import { togetherButton, togetherHtml, reactionOf } from './together.js';   // [expanded] 0.2.0.10
import { doingOf } from './talkui.js';   // [expanded] 0.2.0.11
import { joinTyping } from '../sim/talkrun.js';   // [expanded] 0.2.1-15
import { exprPrompt, parseExprs, parseMoves, EXPR_SYSTEM, type ExprWho } from '../sim/exprs.js';   // [expanded]
import { applyMoves, movePlaces } from '../sim/goes.js';   // [expanded]
import { fullPicOf as fullPic } from './chatlook.js';
import { youPicHtml, youAuto, youLabels } from './youpic.js';
import { beatsHtml, beatWanted, showBeat, personaText, clearBeat } from './beats.js';   // [expanded] 0.2.0.10
import { parseBeat } from '../sim/exprs.js';
import { onCall } from '../sim/calls.js';   // [expanded] 0.2.0.7: your portrait
import { foldedLog, prevButton, prevHtml } from './scenelog.js';   // [expanded] 0.2.1-13
// [expanded] a line of an earlier day, for Previously (SillyTavern's hide made it a system line: shown plainly)
const pastLine = (i: number) => { const m: any = chat()[i]; if (!m) return ''; const who = m.extra?.mundi_narrator ? tr('Narrator') : m.is_user ? (m.name || me()) : m.name; return `<div class="mu-line is-past ${m.is_user ? 'is-user' : ''}"><div class="mu-line-body"><div class="mu-line-head"><b>${esc(who)}</b></div><div class="mu-line-text mes_text">${lineText(m, i)}</div></div></div>`; };
// SillyTavern's own formatting (Markdown, code blocks, regex scripts of your presets), with Mundi's as a fallback.
const lineText = (m: any, i: number) => stFormat(cleanText(shownText(m)), m, i, (t) => `<p>${formatText(t)}</p>`);
// [expanded] 0.2.1-15: a reply for the room while it is still whole (streaming): drawn as the people's lines it will be cut into
function ghostLine(b: Block, i: number, live: boolean) {
    const pseudo: any = b.who === NARRATION ? { name: 'Narrator', is_user: false, is_system: false, mes: b.text, extra: { mundi_narrator: true } }
        : { name: charOf(b.who)?.name ?? '?', is_user: false, is_system: false, original_avatar: b.who, force_avatar: '', mes: b.text, extra: {} };
    return lineHtml(pseudo, i, live, -2, true);
}
function liveBeatInner(m: any, i: number) {
    const blocks = parseEnsemble(String(m.mes ?? ''), liveCast(), me(), 9, true).blocks;
    if (!blocks.length) return `<div class="mu-line is-live"><div class="mu-line-body"><div class="mu-line-text mes_text"><p class="mu-muted">…</p></div></div></div>`;
    return blocks.map((b, k) => ghostLine(b, i, k === blocks.length - 1)).join('');
}
function lineHtml(m: any, i: number, last: boolean, lastChar: number, ghost = false): string {
    if (!ghost && isSceneMessage(m)) return `<div class="mu-roombeat" data-beat="${esc(i)}">${liveBeatInner(m, i)}</div>`;
    const narr = !!m.extra?.mundi_narrator;
    // a picture SillyTavern made (Image Generation posts it as a system line) is shown; other system lines are not
    const pic = m.is_system && !narr && isGeneratedPicture(m);
    if (m.is_system && !narr && !pic) return '';
    const who = narr ? tr('Narrator') : pic && (!m.name || /system/i.test(String(m.name))) ? tr('Picture') : m.is_user ? (m.name || me()) : m.name;
    const editing = state.modal?.type === 'edit' && state.modal.i === i;
    const bs = !ghost && !m.is_user && i === lastChar ? beatSwipeState(m) : null;   // [expanded] 0.2.1-15: the versions of a whole beat
    const swipes = ghost ? '' : bs
        ? `<span class="mu-swipes"><button data-act="swipe" data-d="-1" title="Previous version of what they said" ${bs.sw <= 0 ? 'disabled' : ''}>‹</button><small>${bs.sw + 1}/${bs.total}</small><button data-act="swipe" data-d="1" title="Next version (generates a new one at the end)">›</button></span>`
        : !m.is_user && i === lastChar && Array.isArray(m.swipes) && m.swipes.length > 0
        ? `<span class="mu-swipes"><button data-act="swipe" data-d="-1" title="Previous answer" ${(m.swipe_id ?? 0) <= 0 ? 'disabled' : ''}>‹</button><small>${(m.swipe_id ?? 0) + 1}/${m.swipes.length}</small><button data-act="swipe" data-d="1" title="Next answer (generates a new one at the end)">›</button></span>` : '';
    const body = `<div class="mu-line ${m.is_user ? 'is-user' : ''} ${narr ? 'is-narrator' : ''} ${last && state.generating && !m.is_user ? 'is-live' : ''}" ${ghost ? '' : `data-i="${esc(i)}"`}>${narr ? '' : cardPicHtml(m)}<div class="mu-line-body">
        <div class="mu-line-head">${narr ? '' : avatarHtml(m)}<b ${narr ? '' : `data-act="portrait" data-src="${esc(fullPic(m))}" data-name="${esc(who)}"`}>${esc(who)}</b>${swipes}
            ${state.modal?.type === 'delete' && state.modal.i === i
                ? `<span class="mu-line-ask">Delete this line? <button class="mu-danger" data-act="delete-yes" data-i="${esc(i)}">Delete</button><button data-act="edit-cancel">Cancel</button></span>`
                : ghost ? '' : `<span class="mu-line-tools">${m.is_user ? '' : ttsButton(i)}${game() && systemOn(getWorld(game()!.world), 'pins') ? `<button data-act="remember-line" data-i="${esc(i)}" title="Remember this (Journal)">${icon('book')}</button>` : ''}<button data-act="edit" data-i="${esc(i)}" title="Edit">${icon('edit')}</button><button data-act="delete" data-i="${esc(i)}" title="Delete">${icon('trash')}</button></span>`}</div>
        ${editing
            ? `<textarea class="mu-msgedit" data-focus="edit" rows="4">${esc(m.mes)}</textarea><div class="mu-row"><button class="mu-primary" data-act="edit-save" data-i="${esc(i)}">Save</button><button data-act="edit-cancel">Cancel</button></div>`
            : `<div class="mu-line-text mes_text">${lineText(m, i)}${ghost ? '' : attachments(m)}</div>`}
    </div></div>`;
    // [expanded] 0.2.1-15: the parts of a beat still to come (they are added a moment after the first)
    const more: Block[] = !ghost && Array.isArray(m.extra?.mundi_beat_pending) ? m.extra.mundi_beat_pending : [];
    return more.length ? body + more.map((b, k) => ghostLine(b, i, last && k === more.length - 1)).join('') : body;
}

function logHtml() {
    const list = chat();
    const g = game();
    const from = Math.max(g && state.view === 'scene' ? visitStart(g) : 0, list.length - LOG_SIZE);   // only this visit's lines
    let lastChar = -1;
    for (let i = list.length - 1; i >= 0; i--) if (!list[i].is_user && !list[i].is_system) { lastChar = i; break; }
    // [expanded] 0.2.1-13: a Home's day in scenes (the earlier ones folded)
    if (g && state.view === 'scene') { const f = foldedLog(visitStart(g), i => isFiller(list[i]) ? '' : lineHtml(list[i], i, i === list.length - 1, lastChar), LOG_SIZE); if (f) return f; }
    let out = '';
    for (let i = from; i < list.length; i++) if (!isFiller(list[i])) out += lineHtml(list[i], i, i === list.length - 1, lastChar);   // [expanded] not SillyTavern's "Send if empty" lines
    return out || '<p class="mu-muted mu-pad">Say something, or just do something: write it in the box below.</p>';
}


// Sprites keep their size; with more people they stand closer and overlap. Who spoke last stands in front.
function stageVars(list: string[], hasSprite: (a: string) => boolean): Map<string, string> {
    const last = new Map<string, number>(); const msgs = chat();
    for (let i = Math.max(0, msgs.length - 200); i < msgs.length; i++) { const a = speakerOf(msgs[i]); if (a) last.set(a, i); }
    const order = [...list].sort((a, b) => (last.get(a) ?? -1) - (last.get(b) ?? -1));
    const shown = list.filter(hasSprite);
    const out = new Map<string, string>();
    // Classic and Cards: the sprites stand beside the conversation; with two or more they split between the left
    // side (the 1st, 3rd…) and the right side (the 2nd, 4th…). --side 0/1, --pk: place on that side, --nk: how many there.
    const ns = shown.length, nl = Math.ceil(ns / 2), nr = Math.floor(ns / 2);
    list.forEach((a, k) => {
        const ps = Math.max(0, shown.indexOf(a)); const side = ns >= 2 ? ps % 2 : 0;
        out.set(a, `--p:${k};--n:${list.length};--ps:${ps};--ns:${Math.max(1, ns)};--side:${side};--pk:${Math.floor(ps / 2)};--nk:${Math.max(1, side ? nr : nl)};--z:${order.indexOf(a) + 1}`);
    });
    return out;
}

export function sceneHtml() {
    const g = game()!; const w = getWorld(g.world)!;
    // talking alone with someone: only their picture stays in the scene
    const solo = soloOf(g);
    const here = presentAt(g, w, g.player.loc).filter(r => !solo || r.avatar === solo);
    const ex = expressions();
    const nobody = !here.length;
    // how many have a real sprite (the classic layout shows only those, so they share the room among themselves)
    const withSprite = here.filter(r => !!spriteFor(r.avatar, ex[r.avatar] ?? null)).length;
    const sv = stageVars(here.map(r => r.avatar), a => !!spriteFor(a, ex[a] ?? null)); void withSprite;
    // [expanded] 0.2.0.10: who spoke last steps forward a little (the others ease back)
    const speaking = here.length > 1 ? (() => { const l = chat(); for (let i = l.length - 1; i >= 0 && i > l.length - 6; i--) { const a = speakerOf(l[i]); if (a) return a; if (l[i].is_user) return ''; } return ''; })() : '';
    const sprites = here.map((r, k) => {
        const src = steady(r.avatar, spriteFor(r.avatar, ex[r.avatar] ?? null));
        return `<figure class="mu-sprite ${isWith(g, r.avatar) ? 'is-with' : ''} ${RAD.who === r.avatar ? 'is-menu' : ''} ${speaking === r.avatar ? 'is-speaking' : ''} ${onCall(g, r.avatar) ? 'is-call' : ''}" style="--i:${k};${sv.get(r.avatar)}" title="${esc(r.met ? r.name : 'Someone')}" data-act="spr-menu" data-who="${esc(r.avatar)}">${src ? `<img src="${esc(src)}" alt="" style="${cropOf(src)}">` : `<span class="is-avatar mu-zoomable"><img src="${esc(avatarUrl(r.avatar))}" alt="" draggable="false"></span>`}<figcaption>${esc(r.met ? r.name : 'Someone')}${doingOf(r) /* [expanded] 0.2.0.11 */}</figcaption>${reactionOf(r.avatar) /* [expanded] */}${radialHtml(r.avatar, r)}</figure>`;
    }).join('');
    return `<div class="mu-scene">${prevHtml(pastLine) /* [expanded] */}
        <div class="mu-scene-bg" data-morph-skip data-keep="scene-bg" data-place="${esc(g.player.loc)}" style="${background(g, w)}"></div>
        <div class="mu-sprites ${speaking ? 'has-speaker' : ''}">${sprites}</div>
        ${dlgShowBtn()}
        <section class="mu-dialog">${dlgHideBtn()}${prevButton() /* [expanded] */}
            <div class="mu-log" data-keep="log" data-bottom>${logHtml()}</div>
            <div class="mu-composer">
                ${beatsHtml() /* [expanded] */}${modesHtml()}
                <textarea data-focus="composer" rows="2" placeholder="${nobody ? 'You are alone here. Write what you do or think; the narrator describes the moment.' : 'Write what you say or do…'}">${esc(state.composer)}</textarea>
                <div class="mu-composer-tools">
                    ${state.generating
            ? '<button class="mu-danger" data-act="stop">■ Stop</button>'
            : `<button class="mu-primary" data-act="send">Send</button>
                       <button data-act="continue" title="${lastIsBeat() ? 'Let them go on (nothing from you)' : 'The character continues their last line'}" ${nobody ? 'disabled' : ''}>${icon('forward')}</button>
                       <button data-act="regenerate" title="Regenerate the last answer" ${nobody ? 'disabled' : ''}>${icon('redo')}</button>
                       <button data-act="impersonate" title="The AI writes your line" ${nobody ? 'disabled' : ''}>${icon('pen')}</button>${diceButton(nobody)}${giftButton(nobody) /* [expanded] */}${togetherButton(nobody) /* [expanded] */}${sdButton()}${micButton()}<button data-act="ext-menu" class="${EXT.open ? 'is-on' : ''}" title="SillyTavern extensions">${icon('grid')}</button>`}
                </div>
            </div>
        </section>
        ${sceneCard(g, w)}
        ${portraitHtml()}${youPicHtml(ex.__you ?? null) /* [expanded] */}${lightboxHtml()}${lookConfirmHtml()}
        ${extMenuHtml()}
        ${toolsHtml()}
        ${giftHtml() /* [expanded] */}${togetherHtml() /* [expanded] */}
    </div>`;
}

// Scenario: a plain chat (one character, or a group made from it), in the scene's look: their sprites, the
// conversation, SillyTavern's own background. No map, no clock. It is saved as a normal SillyTavern chat.
const SC = { pick: '' as '' | 'bg' | 'add' | 'lore' | 'persona' | 'persona-rename', q: '', bgs: null as string[] | null, to: '' };
// The persona picker, for a Home game too (from the game menu).
export const personaPickHtml = () => (SC.pick === 'persona' || SC.pick === 'persona-rename' ? scenarioPicker() : '');
function scenarioPicker(): string {
    if (!SC.pick) return '';
    const q = SC.q.toLowerCase();
    if (SC.pick === 'bg') {
        void q;
        return `<div class="mu-dlg-veil" data-act="sc-pick-close"></div><div class="mu-panel mu-scpick mu-glassdlg" role="dialog"><header><h3>Background</h3><button class="mu-ibtn mu-ghost" data-act="sc-pick-close" aria-label="Close">${icon('x')}</button></header>
            ${bgHead('sc-q', 'scq', SC.q)}${bgGrid({ act: 'sc-bg', q: SC.q, keep: 'scpick' })}</div>`;
    }
    // your persona: switch in the middle of the chat (like SillyTavern), and choose whether your earlier lines follow
    if (SC.pick === 'persona') {
        const cur = persona();
        const list = personas().filter(p => !q || p.name.toLowerCase().includes(q)).sort((a, b) => a.name.localeCompare(b.name));
        return `<div class="mu-dlg-veil" data-act="sc-pick-close"></div><div class="mu-panel mu-scpick mu-glassdlg" role="dialog"><header><h3>Your persona</h3><button class="mu-ibtn mu-ghost" data-act="sc-pick-close" aria-label="Close">${icon('x')}</button></header>
            <p class="mu-muted">Who you are in this ${game() ? 'game' : 'chat'}. It stays with it (SillyTavern's chat lock).</p>
            <input class="mu-search" type="search" data-input="sc-q" data-focus="scq" placeholder="Search your personas" value="${esc(SC.q)}">
            <div class="mu-scpick-grid" data-keep="scpick">${list.map(p => `<button class="${p.file === cur ? 'is-on' : ''}" data-act="sc-persona" data-file="${esc(p.file)}" title="${esc(p.name)}"><img src="${esc(personaThumb(p.file))}" alt="" loading="lazy"><span data-notr>${esc(p.name)}</span></button>`).join('') || '<p class="mu-muted">No personas found.</p>'}</div></div>`;
    }
    if (SC.pick === 'persona-rename') {
        const to = personas().find(p => p.file === SC.to); const old = [...new Set(chat().filter(m => m.is_user && !m.is_system).map(m => String(m.name ?? '')))].filter(n => n && n !== to?.name);
        return `<div class="mu-dlg-veil" data-act="sc-pick-close"></div><div class="mu-panel mu-scpick mu-glassdlg mu-screname" role="dialog"><header><h3>Your earlier lines</h3><button class="mu-ibtn mu-ghost" data-act="sc-pick-close" aria-label="Close">${icon('x')}</button></header>
            <p>Your earlier lines in this chat are written as <b data-notr>${esc(old.join(', ') || personaName())}</b>. Change them to <b data-notr>${esc(to?.name ?? '')}</b>, with the new picture?</p>
            <div class="mu-row mu-dlg-btns"><button data-act="sc-persona-yes" data-v="0">No, only from now on</button><button class="mu-primary" data-act="sc-persona-yes" data-v="1">Yes, change them</button></div></div>`;
    }
    if (SC.pick === 'lore') {
        const cur = chatLores();
        const list = lorebooks().filter(n => !q || n.toLowerCase().includes(q)).sort((a, b) => Number(cur.includes(b)) - Number(cur.includes(a)) || a.localeCompare(b));
        return `<div class="mu-dlg-veil" data-act="sc-pick-close"></div><div class="mu-panel mu-scpick is-lore" role="dialog"><header><h3>Chat lorebooks</h3><button class="mu-ibtn mu-ghost" data-act="sc-pick-close" aria-label="Close">${icon('x')}</button></header>
            <p class="mu-muted">Lorebooks only for this chat; pick as many as you want. The first is SillyTavern's "chat lore"; the others are switched on while this chat is open. The character's own lorebooks keep working as usual.</p>
            <input class="mu-search" type="search" data-input="sc-q" data-focus="scq" placeholder="Search your lorebooks" value="${esc(SC.q)}">
            <div class="mu-lorepick" data-keep="scpick"><button class="${!cur.length ? 'is-on' : ''}" data-act="sc-lore" data-name="">${icon('x')}<span>None</span></button>
                ${list.map(n => `<button class="${cur.includes(n) ? 'is-on' : ''}" data-act="sc-lore" data-name="${esc(n)}" title="${esc(n)}">${icon('book')}<span data-notr>${esc(n)}</span>${cur.includes(n) ? icon('check') : ''}</button>`).join('') || '<p class="mu-muted">No lorebooks found.</p>'}</div>
            <div class="mu-row mu-dlg-btns"><button class="mu-primary" data-act="sc-pick-close">Done</button></div></div>`;
    }
    const cast = scenarioCast();
    return `<div class="mu-dlg-veil" data-act="sc-pick-close"></div><div class="mu-panel mu-scpick is-chars" role="dialog"><header><h3>Add a character</h3><button class="mu-ibtn mu-ghost" data-act="sc-pick-close" aria-label="Close">${icon('x')}</button></header>
        <p class="mu-muted">${currentCharacter() ? 'The chat becomes a group chat in SillyTavern (it asks you to confirm). The one-on-one chat stays as it is.' : 'They join this group.'}</p>
        ${charPicker({ key: 'scadd', list: characters().filter(c => !cast.includes(c.avatar)), selected: [], act: 'sc-add', placeholder: 'Search your characters' })}</div>`;
}

export function chatHtml() {
    if (!scenarioOpen()) return '';
    const cast = scenarioCast();
    const ex = expressions();
    const sv = stageVars(cast, a => !!spriteFor(a, ex[a] ?? null));
    const sprites = cast.map((a, k) => {
        const src = steady(a, spriteFor(a, ex[a] ?? null));
        return `<figure class="mu-sprite ${RAD.who === a ? 'is-menu' : ''}" style="--i:${k};${sv.get(a)}" ${src ? `data-act="spr-menu" data-who="${esc(a)}"` : ''}>${radialHtml(a, null)}${src ? `<img src="${esc(src)}" alt="" style="${cropOf(src)}">` : `<span class="is-avatar mu-zoomable" data-act="portrait" data-src="${esc(avatarUrl(a))}" data-name="${esc(charOf(a)?.name ?? '')}"><img src="${esc(avatarUrl(a))}" alt="" draggable="false"></span>`}</figure>`;
    }).join('');
    // the chat's own background (just chosen, or locked to this chat), else what SillyTavern shows now
    const bgEl = document.getElementById('bg1');
    const locked = String(ctx().chatMetadata?.custom_background ?? '');
    const bg = locked || (bgEl ? (bgEl.style.backgroundImage || getComputedStyle(bgEl).backgroundImage) : 'none');
    const group = !currentCharacter();
    return `<div class="mu-scene is-chat">${prevHtml(pastLine) /* [expanded] */}
        <div class="mu-scene-bg" data-morph-skip data-keep="scene-bg" data-place="chat" style="${bg && bg !== 'none' ? `background-image:${esc(bg)};background-size:cover;background-position:center` : ''}"></div>
        <div class="mu-sprites">${sprites}</div>
        ${dlgShowBtn()}
        ${group ? `<nav class="mu-people" aria-label="People here">${cast.map(a => `<span class="mu-person"><img src="${esc(thumb(a))}" alt=""><b data-notr>${esc(charOf(a)?.name ?? '')}</b>${cast.length > 1 ? `<button class="mu-ghost" data-act="sc-remove" data-avatar="${esc(a)}" title="Remove from the scene">${icon('x')}</button>` : ''}</span>`).join('')}</nav>` : ''}
        <section class="mu-dialog">${dlgHideBtn()}${prevButton() /* [expanded] */}
            <div class="mu-log" data-keep="log" data-bottom>${logHtml()}</div>
            <div class="mu-composer">
                ${modesHtml()}
                <textarea data-focus="composer" rows="2" placeholder="Write what you say or do…">${esc(state.composer)}</textarea>
                <div class="mu-composer-tools">
                    ${state.generating
            ? '<button class="mu-danger" data-act="stop">■ Stop</button>'
            : `<button class="mu-primary" data-act="send">Send</button>
                       <button data-act="continue" title="The character continues their last line">${icon('forward')}</button>
                       <button data-act="regenerate" title="Regenerate the last answer">${icon('redo')}</button>
                       <button data-act="impersonate" title="The AI writes your line">${icon('pen')}</button>${sdButton()}${micButton()}<button data-act="ext-menu" class="${EXT.open ? 'is-on' : ''}" title="SillyTavern extensions">${icon('grid')}</button>`}
                </div>
            </div>
        </section>
        <div class="mh-drawer ${DRAWER.open ? 'is-open' : ''}">
            <button class="mh-drawer-tab mh-glass" data-act="drawer" title="${DRAWER.open ? 'Close' : 'Chat tools'}">${icon(DRAWER.open ? 'x' : 'menu')}</button>
            <nav class="mh-drawer-panel mh-glass"><header><b data-notr>${esc(scenarioTitle())}</b><small>Chat</small></header>
                <button data-act="sc-open" data-v="bg">${icon('image')}<span>Background</span></button>
                <button data-act="sc-open" data-v="add">${icon('users')}<span>Add a character</span></button>
                <button data-act="sc-open" data-v="persona"><span class="mh-drawer-mew"><img class="mh-drawer-me" src="${esc(personaThumb())}" alt=""></span><span>Your persona<small data-notr>${esc(personaName())}</small></span></button>
                <button data-act="sc-open" data-v="lore" class="mh-drawer-lore" title="${esc(chatLores().join(', '))}">${icon('book')}<span>Chat lorebooks${chatLores().length ? `<small data-notr>${chatLores().length > 1 ? `${chatLores().length} lorebooks · ` : ''}${esc(chatLores()[0])}</small>` : '<small>None</small>'}</span></button>
                <button data-act="chat-new">${icon('plus')}<span>New chat</span></button>
                <button data-act="drawer-look" class="${DRAWER.look ? 'is-on' : ''}">${icon('palette')}<span>Look</span></button>
                <button data-act="open-settings">${icon('gear')}<span>Settings</span></button>
                <button data-act="to-menu" data-sfx="back">${icon('back')}<span>Main menu</span></button>
                ${DRAWER.look ? `<div class="mh-drawer-look" data-keep="look">${lookPanelHtml()}</div>` : ''}</nav></div>
        ${portraitHtml()}${lightboxHtml()}${lookConfirmHtml()}
        ${scenarioPicker()}
        ${extMenuHtml()}
    </div>`;
}

// Live update while a reply streams in: only the last line is redrawn.
export function patchLastLine() {
    const log = document.getElementById(ROOT_ID)?.querySelector('.mu-log');
    if (!log) return;
    const list = chat();
    const i = list.length - 1;
    if (isSceneMessage(list[i])) {   // [expanded] 0.2.1-15: a reply for the room streams in as the people's lines
        const beat = log.querySelector<HTMLElement>(`.mu-roombeat[data-beat="${esc(i)}"]`);
        if (!beat) { notify(); return; }
        setHtml(beat, liveBeatInner(list[i], i));
        if (STICK.get(log) !== false) log.scrollTop = log.scrollHeight;
        return;
    }
    const el = log.querySelector<HTMLElement>(`.mu-line[data-i="${esc(i)}"] .mu-line-text`);
    if (!el) { notify(); return; }
    setHtml(el, lineText(list[i], i));
    if (STICK.get(log) !== false) log.scrollTop = log.scrollHeight;   // you scrolled up to read: the reply streams in without pulling you down
}

// After drawing: the newest character line gets its expression (once, using the Expressions extension).
// [expanded] every recent character line gets one, not only the newest: in a group, several speak in one turn, and
// stopping at the first line already done left the others (Kathie before Finn) neutral for good. One at a time,
// newest first; each one done draws again, which takes the next.
// [expanded] An empty answer is a failure, not an expression: SillyTavern answers its fallback ('' with none set) when
// the classifier is not ready (the local model still loading or downloading), and that was kept as "no expression"
// for good (null). Now such a line is tried again a little later, twice at most per session; lines left null by that
// are tried again too.
// [expanded] An expression belongs to the text it was read from: a swipe keeps the message and only changes its text,
// so a label kept on the message stayed from the old swipe (and nothing was read again). Each label carries the key of
// its text; a line whose text changed is read again. The bond reacts once per message (not again for each swipe).
const textKey = (m: any) => { const t = String(m?.mes ?? ''); let h = 2166136261; for (let i = 0; i < t.length; i++) { h ^= t.charCodeAt(i); h = Math.imul(h, 16777619); } return `${t.length}.${(h >>> 0).toString(36)}`; };
/** For showing: the label's key matches the text now (a label from before keys existed is still shown). */
const keyOk = (m: any, k: string) => m?.extra?.[k] === undefined || m.extra[k] === textKey(m);
/** For reading again: a label read from this very text. */
const labeled = (m: any) => !!m?.extra?.mundi_expr && m.extra.mundi_exprk === textKey(m);
function setExpr(m: any, label: string, judge: boolean) {
    const once = !m.extra?.mundi_judged && !m.extra?.mundi_expr;   // a line labeled before (even without a key) was judged then
    m.extra = { ...(m.extra ?? {}), mundi_expr: label, mundi_exprk: textKey(m), mundi_judged: true };
    const g = game(); const who = speakerOf(m);
    if (judge && once && g && who && g.cast[who]?.met) { settleLine(g, who, label, cleanText(m.mes)).forEach(t => toast(t, 'warn')); judgeReaction(g, who, label); saveGame(); }   // in a world, how they react moves the bond
}
// [expanded] The labels are kept in the chat file, but never by writing it while SillyTavern is adding a line (a new
// message sent meanwhile, the next member of a group turn): it saves the chat itself then, labels included (they are
// on the lines in memory). Nor into another chat, if you switched while the answer was coming.
function saveIfQuiet(chatId: string) {
    if (currentChatId() !== chatId) return;
    if (state.generating || groupTurnOn()) return;
    saveChat();
}
let classifying = -1;
const TRIED = new Map<string, number>();
/** [expanded] When a generation last started or ended (index.ts). */
export const GENACT = { at: 0 };
const QUIET_MS = 2500;
let quietTimer: ReturnType<typeof setTimeout> | null = null;
// [expanded] 0.2.0.10: a new face makes a little hop (the moment the picture changes is hidden in it)
const FACES = new Map<string, string>();
function hops(main: HTMLElement) {
    main.querySelectorAll<HTMLElement>('.mu-sprite[data-who]').forEach(f => {
        const who = f.dataset.who!; const src = f.querySelector('img')?.getAttribute('src') ?? '';
        const was = FACES.get(who); FACES.set(who, src);
        if (was && src && was !== src) { f.classList.remove('is-hop'); void f.offsetWidth; f.classList.add('is-hop'); setTimeout(() => f.classList.remove('is-hop'), 500); }
    });
}
export function afterScene(_main: HTMLElement) {
    hops(_main);
    // [expanded] not between two members of one group turn: once the whole turn is over (one call for it, and nothing
    // written to the chat while SillyTavern is still adding lines to it). Two signs: SillyTavern's group flag, and a
    // quiet moment (the next member starts right after the one before, so 2.5 s without a generation is the turn's end)
    if (state.generating || classifying !== -1 || groupTurnOn()) return;
    const since = Date.now() - GENACT.at;
    if (since < QUIET_MS) { if (!quietTimer) quietTimer = setTimeout(() => { quietTimer = null; notify(); }, QUIET_MS - since + 50); return; }
    const list = chat();
    if (byModel(list)) return;   // [expanded] a model gives everyone here a face at once (Settings → Game)
    for (let i = list.length - 1; i >= 0 && i > list.length - 8; i--) {
        const m = list[i];
        if (m.is_system || (m.is_user && !youAuto())) continue;   // [expanded] your line too, for your portrait's face
        if (labeled(m)) continue;
        const k = `${i}|${textKey(m)}`; const tries = TRIED.get(k) ?? 0; if (tries >= 2) continue;
        TRIED.set(k, tries + 1); classifying = i; const chatId = currentChatId();
        let ok = false;
        expressionOf(cleanText(m.mes)).then(label => {
            console.info(`[Mundi Expanded] expressions: SillyTavern's classifier for ${m.name}: ${label || '(nothing: tried again later)'}`);
            if (!label) return;
            ok = true;
            setExpr(m, label, true);
            saveIfQuiet(chatId);
        }).catch(() => { /* tried again later */ }).finally(() => { classifying = -1; if (ok) notify(); else setTimeout(notify, 3000); });
        break;
    }
}

// [expanded] Expressions by a model (sim/exprs.ts): the recent character lines without one, and everyone in the scene,
// in one call. Each line gets its speaker's label; the newest keeps everyone's (mundi_exprs), so a listener's face shows
// too. Fails (no answer, nothing usable): those lines go to SillyTavern's classifier as before.
const MODEL_FAILED = new Set<string>();   // [expanded] by line and text: a swipe is asked again
function byModel(list: any[]): boolean {
    const g = game(); const w = g && getWorld(g.world);
    if (!g || !w || state.view !== 'scene') return false;
    let src: string = 'st'; try { src = (settings() as any).regulator?.expr ?? 'st'; } catch { /* default */ }
    if (src !== 'mech' && src !== 'main') return false;
    const pending: any[] = [];
    for (let i = list.length - 1; i >= 0 && i > list.length - 8; i--) { const m = list[i]; if (!m.is_user && !m.is_system && !labeled(m) && !MODEL_FAILED.has(`${i}|${textKey(m)}`) && speakerOf(m)) pending.push(m); }
    if (!pending.length) return false;
    const avatars = [...new Set([...presentAt(g, w, g.player.loc).map(r => r.avatar), ...pending.map(m => speakerOf(m)!)])].filter(a => g.cast[a] || charOf(a));
    const people: ExprWho[] = avatars.map(a => ({ avatar: a, name: g.cast[a]?.name ?? charOf(a)?.name ?? a, labels: (state.sprites[a] ?? []).map((x: any) => String(x.label).toLowerCase()).filter(Boolean) }));
    const youToo = youAuto(); if (youToo) people.push({ avatar: '__you', name: personaName(), labels: youLabels() });   // [expanded] your portrait's face
    const lines = list.filter((m: any) => !m.is_system && !isFiller(m) && String(m.mes ?? '').trim()).slice(-6).map((m: any) => ({ name: m.is_user ? personaName() : String(m.name ?? ''), text: cleanText(m.mes).replace(/\s+/g, ' ').slice(0, 900) }));
    classifying = list.length - 1; const chatId = currentChatId();
    // [expanded] in the house, the same call says who walked off and who goes along with you (sim/goes.ts), for the
    // newest turn only (a line read again after a swipe undoes what its old text did)
    const newestLine = list.indexOf(pending[0]);
    const places = isScenario(w) && newestLine === list.length - 1 ? movePlaces(g, w) : undefined;
    const wantBeat = newestLine === list.length - 1 && beatWanted();   // [expanded] 0.2.0.10: quick reactions, now and then
    const prompt = exprPrompt({ people, you: personaName(), lines, places, youToo, ...(wantBeat ? { beat: { persona: personaText() } } : {}) });
    console.info(`[Mundi Expanded] expressions: asking the ${src === 'mech' ? 'mechanics' : 'main'} model for ${people.map(p => `${p.name} (${p.labels.length || 'all'} labels)`).join(', ')}; ${pending.length} line(s) waiting`);
    (async () => {
        const R = await import('../sim/regulator.js');
        const ans = src === 'mech' ? await R.bgAsk(prompt, 1500, EXPR_SYSTEM) : await quiet(prompt, 1500, EXPR_SYSTEM);
        const got = parseExprs(ans, people);
        if (wantBeat) { const b = parseBeat(ans); if (b && currentChatId() === chatId) { console.info('[Mundi Expanded] quick reactions:', b); showBeat(b); } }
        console.info('[Mundi Expanded] expressions: answer', JSON.stringify(ans).slice(0, 400), '→', got);
        if (places) {
            const mv = parseMoves(ans, people.filter(p => p.avatar !== '__you' && presentAt(g, w, g.player.loc).some(r => r.avatar === p.avatar)), places);
            const { told, changed } = applyMoves(g, w, newestLine, mv.moves, mv.follows);
            if (Object.keys(mv.moves).length || mv.follows.length) console.info('[Mundi Expanded] moves:', mv);
            if (told.length) toast(told.join(' '), 'info');
            if (changed) { saveGame(); void import('../sim/game.js').then(m => m.syncScene()).catch(() => { /* next move */ }); }   // who is in the scene now (a swipe may have undone a move)
        }
        return got;
    })().catch((e) => { console.warn('[Mundi Expanded] expressions: the call failed', e); return {} as Record<string, string>; }).then(got => {
        const newest = pending[0];
        if (!Object.keys(got).length) { console.warn('[Mundi Expanded] expressions: nothing usable, SillyTavern\'s classifier takes these lines'); for (const m of pending) MODEL_FAILED.add(`${list.indexOf(m)}|${textKey(m)}`); return; }
        newest.extra = { ...(newest.extra ?? {}), mundi_exprs: got, mundi_exprsk: textKey(newest) };
        const judged = new Set<string>();
        for (const m of pending) {
            const who = speakerOf(m)!; const label = got[who]; if (!label) { MODEL_FAILED.add(`${list.indexOf(m)}|${textKey(m)}`); continue; }
            setExpr(m, label, !judged.has(who)); judged.add(who);   // the bond: once per person (their newest line)
        }
        saveIfQuiet(chatId);
    }).finally(() => { classifying = -1; notify(); });
    return true;
}

Object.assign(ACT, {
    'sc-open': (el) => { SC.pick = el.dataset.v as any; SC.q = ''; if (SC.pick === 'bg') SC.bgs = null; notify(); },
    'sc-pick-close': () => { SC.pick = ''; notify(); },
    'sc-persona': (el) => {
        const file = el.dataset.file!; const to = personas().find(p => p.file === file);
        if (!to || file === persona()) { SC.pick = ''; notify(); return; }
        const earlier = chat().some(m => m.is_user && !m.is_system && String(m.name ?? '') !== to.name);
        SC.to = file;
        if (earlier) { SC.pick = 'persona-rename'; notify(); return; }
        void switchPersona(file, false);
    },
    'sc-persona-yes': (el) => { void switchPersona(SC.to, el.dataset.v === '1'); },
    'sc-bg': (el) => { setChatBackground(el.dataset.file!); SC.pick = ''; notify(); },
    'sc-add': async (el) => {
        SC.pick = ''; notify();
        try { if (await addToScenario(el.dataset.avatar!)) toast(`${charOf(el.dataset.avatar!)?.name ?? ''} joined the scene.`, 'success'); }
        catch (e: any) { toast(String(e?.message ?? e), 'error'); }
        notify();
    },
    'sc-lore': async (el) => {
        const n = el.dataset.name ?? '';
        const cur = chatLores();
        const next = !n ? [] : cur.includes(n) ? cur.filter(x => x !== n) : [...cur, n];
        await setChatLores(next);
        const { applyGameLore } = await import('../sim/lore.js'); await applyGameLore();
        // SillyTavern's own chat lorebook button shows it too
        document.querySelectorAll('.chat_lorebook_button').forEach(b => b.classList.toggle('world_set', next.length > 0));
        toast(!n ? 'This chat has no lorebooks now.' : cur.includes(n) ? `"${n}" is off for this chat.` : `"${n}" is on for this chat.`, 'success'); notify();
    },
    'sc-remove': async (el) => { await removeFromScenario(el.dataset.avatar!); notify(); },
    'chat-new': async () => {
        if (!scenarioOpen()) return;
        // SillyTavern's own "Start new chat?" question (with "Delete the current chat" to tick), exactly as in SillyTavern
        const opt = document.getElementById('option_start_new_chat');
        if (opt) { DRAWER.open = false; notify(); opt.click(); return; }
        await newScenarioChat();
        toast('New chat started. The previous one stays saved in SillyTavern.', 'success'); notify();
    },
    send: async () => {
        clearBeat(false);   // [expanded] said: the quick reactions go
        const raw = state.composer.trim();
        if (!raw) return;
        const gifted = withGift(shapeLine(raw)); if (gifted === null) return;   // [expanded] the 🎁 changes hands with the line
        const text = gifted;
        const g0 = game(); const w0 = g0 && getWorld(g0.world);
        // alone: nobody is called into the scene; the hidden narrator describes the place, the time and the feelings
        if (g0 && w0 && !presentAt(g0, w0, g0.player.loc).length && !scenarioOpen()) { state.composer = ''; await soloNarrate(g0, w0, text); return; }
        await joinTyping();   // [expanded] 0.2.1-15: writing while you stand by a conversation you overheard: you have joined it
        // RPG: an attempt to persuade, lie, threaten… is judged by the AI and decided by the dice before anyone answers
        if (g0 && w0 && isRpg(w0) && !scenarioOpen()) {
            const force = CHECK.on; CHECK.on = false;
            try {
                const res = await socialCheck(g0, w0, text, presentAt(g0, w0, g0.player.loc), force);
                if (res) { setPrompt('mundi_roll', res.prompt, 0); toast(res.toast, res.check.grade.includes('success') ? 'success' : 'warn'); res.msgs.forEach(m => toast(m, 'success')); saveGame(); }
            } catch { /* the judge is offline: the line goes as it is */ }
        }
        // "@Name" in the line: that person answers
        const men = scenarioOpen() ? { who: null, text } : mentionIn(text);
        if (men.who) { closeMention(); state.composer = ''; notify(); await addUserLine(men.text); void replyAs(men.who.avatar); }
        else if (await sendTurn(text, INPUT_MODE.v === 'story')) { /* [expanded] 0.2.1-15: sent by who answers (sim/turnrun.ts) */ }
        else if (!sendText(text)) { toast('SillyTavern\'s message box was not found.', 'error'); return; }
        // talking to people brings you closer (a little each line, capped per day)
        const g = game(); const w = g && getWorld(g.world);
        if (g && w) {
            const hearers = presentAt(g, w, g.player.loc).filter(r => !soloOf(g) || r.avatar === soloOf(g));
            const { hurt, harsh } = judgeLine(g, w, raw, hearers);   // a harsh line counts only if they take it badly
            hurt.forEach(m => toast(m, 'warn'));
            if (!harsh) for (const r of hearers) if (r.met) addBond(g, r.avatar, 3);
            lockScene(g, w); saveGame();
        }
        state.composer = '';
        notify();
    },
    'input-mode': (el) => { INPUT_MODE.v = el.dataset.v as InputMode; notify(); },
    'roll-next': () => { CHECK.on = !CHECK.on; notify(); },
    'ext-menu': () => { EXT.open = !EXT.open; notify(); },
    drawer: () => { DRAWER.open = !DRAWER.open; notify(); },
    'drawer-look': () => { DRAWER.look = !DRAWER.look; notify(); },
    stop: () => { cancelPlanning(); stop(); },
    continue: () => { if (lastIsBeat()) void goOn(); else continueLast(); },   // [expanded] 0.2.1-15: after a beat: "let them go on"
    regenerate: () => { if (lastIsBeat()) void regenBeat(); else regenerate(); },
    impersonate: () => { state.impersonating = true; impersonate(); },
    swipe: (el) => { if (lastIsBeat()) void beatSwipe(Number(el.dataset.d)); else if (Number(el.dataset.d) < 0) swipeLeft(); else swipeRight(); },   // [expanded] 0.2.1-15: a beat swipes as a whole
    edit: (el) => { state.modal = { type: 'edit', i: Number(el.dataset.i) }; notify(); },
    'edit-cancel': () => { state.modal = null; notify(); },
    'edit-save': (el) => {
        const ta = document.getElementById(ROOT_ID)?.querySelector<HTMLTextAreaElement>('.mu-msgedit');
        if (ta) editMessage(Number(el.dataset.i), ta.value);
        state.modal = null; notify();
    },
    delete: (el) => { state.modal = { type: 'delete', i: Number(el.dataset.i) }; notify(); },
    'delete-yes': async (el) => { state.modal = null; await deleteMessageAt(Number(el.dataset.i)); notify(); },
});
Object.assign(INPUT, { 'sc-q': (el) => { SC.q = el.value; notify(); } });

// The invisible narrator for scenes with nobody else: your line goes into the chat, and the narrator answers with the
// surroundings, the passing moment and how you feel. No character is made to appear.
async function soloNarrate(g: Save, w: WorldDef, text: string) {
    state.generating = true; notify();
    try {
        await addUserLine(text);
        const me = personaName();
        const recent = chat().slice(-8).filter((m: any) => !m.is_system).map((m: any) => `${m.is_user ? me : m.name}: ${String(m.mes ?? '').replace(/\s+/g, ' ').slice(0, 300)}`).join('\n');
        const out = await quiet(`${sceneText().replace(/\{\{user\}\}/g, me)}\n\n${recent}\n\nNarrate what happens next in 2 to 4 sentences, in the second person ("you"), following ${me}'s last line. ${me} is alone: describe only the place, small details, the passing moment and ${me}'s feelings and thoughts. No other character appears, speaks or arrives. Do not write ${me}'s words or decisions.${aiLangNote() ? ` ${aiLangNote()}` : ''}`, 260,
            'You are the quiet narrator of a life simulation. You never bring other characters into the scene.');
        if (out.trim()) await narratorLine(out.trim());
        else toast('No answer (is the AI connected?).', 'warn');
    } catch (e: any) { toast(String(e?.message ?? e), 'error'); }
    state.generating = false; notify();
}

/* ---------- the message box: Say / Do / Story / See (26) ---------- */

export type InputMode = ShapeMode;   // [expanded] 0.2.1-15.2: and Free
const MODES: [InputMode, string, string][] = [['say', 'Say', 'chat'], ['do', 'Do', 'forward'], ['story', 'Story', 'book'], ['see', 'See', 'search'], ['free', 'Free', 'pen']];
export const INPUT_MODE = { v: 'say' as InputMode };
function modesHtml() {
    return `<div class="mh-modes">${MODES.map(([id, label, ic]) => `<button class="${INPUT_MODE.v === id ? 'is-on' : ''}" data-act="input-mode" data-v="${esc(id)}" title="${({ say: 'What you say out loud', do: 'What you do', story: 'Steer the story (a direction for the narrator)', see: 'Look at something: the AI describes what you see', free: 'Write as in a story: "quotes" are what you say, the rest is what you do' } as any)[id]}">${icon(ic)}<span>${label}</span></button>`).join('')}</div>`;
}
// How a line is sent in each mode (rules in sim/shape.ts).
export function shapeLine(text: string): string { return shape(INPUT_MODE.v, text); }

/* ---------- other SillyTavern extensions' buttons (23) ---------- */

// SillyTavern's own extensions menu (the magic wand), with every button other extensions add to it.
// Switches your persona in this chat; `rename`: your earlier lines take the new name and picture too.
async function switchPersona(file: string, rename: boolean) {
    SC.pick = ''; notify();
    const to = personas().find(p => p.file === file); if (!to) return;
    try { await usePersona(file); } catch (e: any) { toast(String(e?.message ?? e), 'error'); return; }
    // a Home game keeps the persona you switched to (it opens with it next time)
    if (game()) { const { gameEntry } = await import('../sim/game.js'); const { settings, saveSettings } = await import('../core/store.js'); const e = gameEntry(settings().lastGame ?? null); if (e) { e.persona = file; saveSettings(); } void import('../sim/prompt.js').then(m => m.refreshPrompt()); }
    if (rename) {
        const pic = `/thumbnail?type=persona&file=${encodeURIComponent(file)}`;
        let n = 0;
        for (const m of chat()) if (m.is_user && !m.is_system) { m.name = to.name; m.force_avatar = pic; n++; }
        saveChat();
        try { await ctx().reloadCurrentChat?.(); } catch { /* SillyTavern redraws it later */ }
        toast(`You are ${to.name} now. ${n === 1 ? '1 earlier line was' : `${n} earlier lines were`} changed.`, 'success');
    } else toast(`You are ${to.name} now.`, 'success');
    notify();
}
export const EXT = { open: false };
export function extMenuHtml() {
    return EXT.open ? `<div class="mh-extmenu mh-glass"><header><b>SillyTavern extensions</b><button class="mu-ibtn mu-ghost" data-act="ext-menu">${icon('x')}</button></header>${nativeHost('st-extmenu')}</div>` : '';
}

/* ---------- the scenario drawer (13) ---------- */
export const DRAWER = { open: false, look: false };

// The conversation jumps to its newest line (after choosing Say / Do / Story / See, for example).
export function toLastLine() {
    requestAnimationFrame(() => {
        const log = document.getElementById(ROOT_ID)?.querySelector<HTMLElement>('.mu-log');
        if (log) log.scrollTop = log.scrollHeight;
        document.getElementById(ROOT_ID)?.querySelector<HTMLTextAreaElement>('[data-focus="composer"]')?.focus();
    });
}

// The conversation stays at its newest line while pictures in it finish loading (they make it taller),
// unless you scrolled up to read.
const STICK = new WeakMap<Element, boolean>();
document.addEventListener('scroll', (e) => {
    const el = e.target as HTMLElement;
    if (el?.classList?.contains('mu-log')) STICK.set(el, el.scrollHeight - el.scrollTop - el.clientHeight < 40);
}, true);
document.addEventListener('load', (e) => {
    const log = (e.target as HTMLElement)?.closest?.('#mundi-root .mu-log') as HTMLElement | null;
    if (log && STICK.get(log) !== false) log.scrollTop = log.scrollHeight;
}, true);


// [expanded] Hiding the dialogue box for a full look at the scene (the eye on the box, H; the eye at the bottom, H or Esc
// bring it back). Only on screen: nothing in the game changes.
export const DLG = { hidden: false };
const dlgHideBtn = () => `<button class="mu-ibtn mu-ghost mu-dlg-hide" data-act="dlg-hide" title="Hide the box for a full look (H)" aria-label="Hide the dialogue box">${icon('eye')}</button>`;
const dlgShowBtn = () => (DLG.hidden ? `<button class="mu-dlg-show" data-act="dlg-show" title="Show the box (H, Esc)" aria-label="Show the dialogue box">${icon('eyeoff')}<span>Show the box</span></button>` : '');
export function toggleDlg(v = !DLG.hidden) { DLG.hidden = v; notify(); }
Object.assign(ACT, {
    'dlg-hide': () => toggleDlg(true),
    'dlg-show': () => toggleDlg(false),
});
