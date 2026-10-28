// [expanded] Activities and group plans at runtime (rules in activities.ts): when a plan with an activity happens,
// and what the scene is told about it.
import type { Save, Resident } from '../core/store.js';
import { nowAbs } from '../core/store.js';
import type { WorldDef } from '../core/world.js';
import { social, bump, livePlan, type Appointment } from './social.js';
import { addStatus } from './needs.js';
import { difficultyOf } from './bills.js';
import { personaName } from '../st/bridge.js';
import * as A from './activities.js';

const G = (g: Save) => g as unknown as A.GLike;
const keyOf = (a: Appointment, m: A.PlanMeta) => m.group ?? a.id;
const nameList = (xs: string[]) => xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs.at(-1)}`;
/** The plans of one group (or just this one). */
export const groupOf = (g: Save, a: Appointment): Appointment[] => {
    const m = A.metaOf(G(g), a.id); if (!m?.group) return [a];
    return social(g).appts.filter(x => A.metaOf(G(g), x.id)?.group === m.group);
};

/** After upstream's plan clock: plans with an activity that just happened. */
export function runActs(g: Save, w: WorldDef): { text: string; kind: 'info' | 'success' | 'warn' }[] {
    const out: { text: string; kind: 'info' | 'success' | 'warn' }[] = [];
    const px = A.plansxOf(G(g));
    const appts = social(g).appts;
    for (const a of appts) {
        const m = A.metaOf(G(g), a.id);
        if (!m || a.state !== 'met' || px.done[`a:${a.id}`] !== undefined) continue;
        px.done[`a:${a.id}`] = g.day;
        const act = A.actOf(m.act);
        if (!act) continue;
        const met = groupOf(g, a).filter(x => x.state === 'met');
        const names = met.map(x => g.cast[x.avatar]?.name).filter(Boolean) as string[];
        const o = A.happen(G(g), act, keyOf(a, m), met.length, !!m.treat, difficultyOf(g).price, nameList(names));
        if (o.bond) bump(g, a.avatar, o.bond);
        if (!o.first) continue;
        for (const [id, d] of Object.entries(o.stats)) addStatus(g, w, id, d);
        for (const l of o.lines) out.push({ text: l.replace(/\{\{user\}\}/g, personaName() || 'You'), kind: o.failed ? 'warn' : 'success' });
    }
    A.tidy(G(g), appts.map(x => x.id), g.day);
    return out;
}

/** For the scene (with upstream's plan lines): what this plan is, and who else is part of it. */
export function activityLines(g: Save, present: Resident[]): string[] {
    const now = nowAbs(g); const s = social(g); const px = A.plansxOf(G(g));
    const out: string[] = []; const seen = new Set<string>();
    for (const r of present) {
        const a = s.appts.find(x => x.avatar === r.avatar && livePlan(x) && x.from <= now && now < x.to);
        const m = a && A.metaOf(G(g), a.id); if (!a || !m) continue;
        const key = keyOf(a, m); if (seen.has(key)) continue; seen.add(key);
        const act = A.actOf(m.act);
        const group = groupOf(g, a).map(x => g.cast[x.avatar]?.name).filter(Boolean) as string[];
        const parts: string[] = [];
        if (act) parts.push(`What they are doing: ${act.story}.${m.treat && act.cost ? ' {{user}} is paying for everyone.' : ''}`);
        if (group.length > 1) parts.push(`It is a group plan: {{user}} with ${nameList(group)}.`);
        if (px.notes?.[key]) parts.push(px.notes[key]);
        if (parts.length) out.push(parts.join(' '));
    }
    return out;
}
