// [expanded] The house in 3D, its layout (Mundi Expanded, prototype): built from the floor plan's room rectangles
// (World creator → Maps → Floor plan). Pure: tested on its own, drawn by ui/house3dview.ts.
//
//  - A grid of 25 cm cells per floor. A room owns the cells inside its rectangle; the gaps between rooms (a corridor,
//    a landing) are the floor's hall when rooms close them in from at least three sides.
//  - Common rooms (living, kitchen, dining, the entrance hall) and the hall are one open space; walls stand between
//    everything else and around the house. Each room gets a door to the open space (or, failing that, to the
//    neighbour it shares the most wall with); outdoor places (a yard, a pool) open onto the room next to them.
//  - Stairs where every floor has open space, near the entrance hall.
export const CELL = 0.25, WIDTH = 30;
const OPEN_K = new Set(['open', 'hall']);
/** Room kinds from what the world says about a place. */
export function kindOf(id, name, tags = []) {
    const t = `${id} ${name}`.toLowerCase();
    if (/pool|бассейн/.test(t))
        return 'pool';
    if (tags.includes('outdoor') || /yard|garden|patio|terrace|двор|сад/.test(t))
        return 'outdoor';
    if (id.startsWith('spot:') || id.startsWith('home:') || /bedroom|спальн/.test(t))
        return 'bed';
    if (/bath|wash|shower|toilet|ванн|душ|туалет/.test(t))
        return 'bath';
    if (tags.includes('leisure') || tags.includes('food') || /living|kitchen|dining|entrance|hall|lounge|гостин|кухн|столов|прихож/.test(t))
        return 'open';
    return 'service';
}
export function buildHouse(rooms, floors, info) {
    const ratio = floors[0]?.ratio ?? 1.8;
    const width = WIDTH, depth = WIDTH / ratio;
    const cols = Math.round(width / CELL), rows = Math.round(depth / CELL);
    const out = [];
    floors.forEach((f, level) => {
        const list = rooms.filter(r => r.floor === f.id);
        const grid = new Array(cols * rows).fill(null);
        const kinds = {};
        const names = {};
        const at = (c, r) => (c < 0 || r < 0 || c >= cols || r >= rows ? null : grid[r * cols + c]);
        // an outdoor place a step away from the house (a yard below the entrance) reaches its wall
        const outK = (id) => ['outdoor', 'pool'].includes(info(id).kind);
        const snapped = list.map(pr => {
            if (!outK(pr.id))
                return pr;
            const r = { ...pr };
            const near = 1.2 / width * 100, nearY = 1.2 / depth * 100;
            for (const o of list.filter(x => !outK(x.id))) {
                const overX = r.x < o.x + o.w && r.x + r.w > o.x, overY = r.y < o.y + o.h && r.y + r.h > o.y;
                if (overX && r.y >= o.y + o.h && r.y - (o.y + o.h) <= nearY) {
                    r.h += r.y - (o.y + o.h);
                    r.y = o.y + o.h;
                }
                if (overX && r.y + r.h <= o.y && o.y - (r.y + r.h) <= nearY)
                    r.h = o.y - r.y;
                if (overY && r.x >= o.x + o.w && r.x - (o.x + o.w) <= near) {
                    r.w += r.x - (o.x + o.w);
                    r.x = o.x + o.w;
                }
                if (overY && r.x + r.w <= o.x && o.x - (r.x + r.w) <= near)
                    r.w = o.x - r.x;
            }
            return r;
        });
        for (const pr of snapped) {
            const inf = info(pr.id);
            kinds[pr.id] = inf.kind;
            names[pr.id] = inf.name;
            const c0 = Math.round(pr.x / 100 * cols), c1 = Math.round((pr.x + pr.w) / 100 * cols), r0 = Math.round(pr.y / 100 * rows), r1 = Math.round((pr.y + pr.h) / 100 * rows);
            for (let r = r0; r < r1; r++)
                for (let c = c0; c < c1; c++)
                    if (c >= 0 && r >= 0 && c < cols && r < rows)
                        grid[r * cols + c] = pr.id;
        }
        // the hall: unowned cells closed in by indoor rooms from three sides or more
        const indoor = (id) => !!id && kinds[id] !== 'outdoor' && kinds[id] !== 'pool';
        const hall = `hall:${f.id}`;
        kinds[hall] = 'hall';
        names[hall] = 'Hallway';
        const mark = [];
        for (let r = 0; r < rows; r++)
            for (let c = 0; c < cols; c++) {
                if (grid[r * cols + c])
                    continue;
                let n = 0;
                for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
                    let cc = c + dc, rr = r + dr;
                    while (cc >= 0 && rr >= 0 && cc < cols && rr < rows) {
                        const id = grid[rr * cols + cc];
                        if (id) {
                            if (indoor(id))
                                n++;
                            break;
                        }
                        cc += dc;
                        rr += dr;
                    }
                }
                if (n >= 3)
                    mark.push(r * cols + c);
            }
        for (const i of mark)
            grid[i] = hall;
        // walls: along cell edges between regions that are not the same open space
        const same = (a, b) => a === b || (!!a && !!b && OPEN_K.has(kinds[a]) && OPEN_K.has(kinds[b]));
        const wallBetween = (a, b) => {
            if (same(a, b))
                return false;
            const ia = indoor(a), ib = indoor(b);
            return ia || ib; // between two outdoor places (or nothing): no wall
        };
        const vE = [], hE = [];
        for (let c = 0; c <= cols; c++) {
            vE[c] = [];
            for (let r = 0; r < rows; r++) {
                const a = at(c - 1, r), b = at(c, r);
                vE[c][r] = wallBetween(a, b) ? { pair: [a ?? '', b ?? ''].sort().join('|'), a, b } : null;
            }
        }
        for (let r = 0; r <= rows; r++) {
            hE[r] = [];
            for (let c = 0; c < cols; c++) {
                const a = at(c, r - 1), b = at(c, r);
                hE[r][c] = wallBetween(a, b) ? { pair: [a ?? '', b ?? ''].sort().join('|'), a, b } : null;
            }
        }
        const runs = [];
        for (let c = 0; c <= cols; c++) {
            let s = -1;
            for (let r = 0; r <= rows; r++) {
                const e = r < rows ? vE[c][r] : null;
                const p = s >= 0 ? vE[c][s].pair : '';
                if (s >= 0 && (!e || e.pair !== p)) {
                    const e0 = vE[c][s];
                    if (e0.a && e0.b)
                        runs.push({ pair: p, a: e0.a, b: e0.b, along: 'z', fixed: c, from: s, to: r });
                    s = -1;
                }
                if (e && s < 0)
                    s = r;
            }
        }
        for (let r = 0; r <= rows; r++) {
            let s = -1;
            for (let c = 0; c <= cols; c++) {
                const e = c < cols ? hE[r][c] : null;
                const p = s >= 0 ? hE[r][s].pair : '';
                if (s >= 0 && (!e || e.pair !== p)) {
                    const e0 = hE[r][s];
                    if (e0.a && e0.b)
                        runs.push({ pair: p, a: e0.a, b: e0.b, along: 'x', fixed: r, from: s, to: c });
                    s = -1;
                }
                if (e && s < 0)
                    s = c;
            }
        }
        // doors: each room to the open space; else to its longest neighbour; outdoor to the room next to it
        const doors = [];
        const DOOR = Math.round(0.9 / CELL);
        const best = (pred) => runs.filter(r => pred(r) && r.to - r.from >= DOOR + 1).sort((x, y) => (y.to - y.from) - (x.to - x.from))[0];
        const roomsHere = [...new Set(grid.filter(Boolean))];
        const has = (id) => doors.some(d => d.a === id || d.b === id);
        const addDoor = (r) => {
            const mid = Math.floor((r.from + r.to) / 2) - Math.floor(DOOR / 2);
            const pos = r.along === 'z' ? { x: r.fixed * CELL, z: (mid + DOOR / 2) * CELL } : { x: (mid + DOOR / 2) * CELL, z: r.fixed * CELL };
            doors.push({ a: r.a, b: r.b, ...pos, along: r.along, w: DOOR * CELL });
            for (let k = mid; k < mid + DOOR; k++) {
                if (r.along === 'z')
                    vE[r.fixed][k] = null;
                else
                    hE[r.fixed][k] = null;
            }
        };
        for (const id of roomsHere) {
            if (OPEN_K.has(kinds[id]) || has(id))
                continue;
            const isOut = !indoor(id);
            const r = best(x => (x.a === id || x.b === id) && (isOut ? indoor(x.a === id ? x.b : x.a) : OPEN_K.has(kinds[x.a === id ? x.b : x.a])))
                ?? best(x => (x.a === id || x.b === id) && kinds[x.a === id ? x.b : x.a] !== 'bed' && !(kinds[id] === 'bath' && kinds[x.a === id ? x.b : x.a] === 'bath'))
                ?? best(x => x.a === id || x.b === id);
            if (r)
                addDoor(r);
        }
        // the remaining edges, merged into wall segments
        const walls = [];
        for (let c = 0; c <= cols; c++) {
            let s = -1;
            for (let r = 0; r <= rows; r++) {
                const e = r < rows ? vE[c][r] : null;
                if (e && s < 0)
                    s = r;
                if (!e && s >= 0) {
                    walls.push({ x1: c * CELL, z1: s * CELL, x2: c * CELL, z2: r * CELL, outer: !vE[c][s].a || !vE[c][s].b || !indoor(vE[c][s].a) || !indoor(vE[c][s].b) });
                    s = -1;
                }
            }
        }
        for (let r = 0; r <= rows; r++) {
            let s = -1;
            for (let c = 0; c <= cols; c++) {
                const e = c < cols ? hE[r][c] : null;
                if (e && s < 0)
                    s = c;
                if (!e && s >= 0) {
                    walls.push({ x1: s * CELL, z1: r * CELL, x2: c * CELL, z2: r * CELL, outer: !hE[r][s].a || !hE[r][s].b || !indoor(hE[r][s].a) || !indoor(hE[r][s].b) });
                    s = -1;
                }
            }
        }
        // rooms: their bounding boxes (for labels, furniture, where people stand)
        const rooms3 = roomsHere.map(id => {
            let c0 = cols, c1 = 0, r0 = rows, r1 = 0, n = 0;
            for (let r = 0; r < rows; r++)
                for (let c = 0; c < cols; c++)
                    if (grid[r * cols + c] === id) {
                        n++;
                        c0 = Math.min(c0, c);
                        c1 = Math.max(c1, c + 1);
                        r0 = Math.min(r0, r);
                        r1 = Math.max(r1, r + 1);
                    }
            return { id, name: names[id] ?? id, kind: kinds[id], x: c0 * CELL, z: r0 * CELL, w: (c1 - c0) * CELL, d: (r1 - r0) * CELL, cells: n };
        });
        out.push({ id: f.id, name: f.name, level, rooms: rooms3, walls, doors, cols, rows, grid, stairs: null });
    });
    // stairs: the open cell nearest the entrance hall's centre that is open on every floor
    const ent = out[0]?.rooms.find(r => /entrance|hall/i.test(`${r.id} ${r.name}`) && r.kind === 'open') ?? out[0]?.rooms.find(r => r.kind === 'open');
    if (ent && out.length > 1) {
        const cx = Math.floor((ent.x + ent.w * 0.62) / CELL), cz = Math.floor((ent.z + ent.d * 0.32) / CELL); // stairs usually rise along a wall
        const openAll = (c, r) => out.every(f => { const id = f.grid[r * f.cols + c]; const k = id ? f.rooms.find(x => x.id === id)?.kind : null; return k === 'open' || k === 'hall'; });
        let found = null;
        for (let rad = 0; rad < 40 && !found; rad++)
            for (let dr = -rad; dr <= rad && !found; dr++)
                for (let dc = -rad; dc <= rad && !found; dc++) {
                    const c = cx + dc, r = cz + dr;
                    if (Math.max(Math.abs(dc), Math.abs(dr)) !== rad)
                        continue;
                    let ok = true;
                    for (let y = -4; y <= 4 && ok; y++)
                        for (let x = -2; x <= 2 && ok; x++)
                            ok = openAll(c + x, r + y);
                    if (ok)
                        found = { x: c * CELL, z: r * CELL };
                }
        for (const f of out)
            f.stairs = found;
    }
    return { width, depth, cell: CELL, floors: out };
}
/** Can you step from one cell to the next (the same room, the open space, or through a door)? */
export function canStep(f, c0, r0, c1, r1) {
    if (c1 < 0 || r1 < 0 || c1 >= f.cols || r1 >= f.rows)
        return false;
    const a = f.grid[r0 * f.cols + c0], b = f.grid[r1 * f.cols + c1];
    if (!b)
        return false;
    const ka = f.rooms.find(x => x.id === a)?.kind, kb = f.rooms.find(x => x.id === b)?.kind;
    if (a === b || (OPEN_K.has(ka) && OPEN_K.has(kb)))
        return true;
    // a door on the edge between them
    const ex = Math.max(c0, c1) * CELL, ez = Math.max(r0, r1) * CELL;
    return f.doors.some(d => ((d.a === a && d.b === b) || (d.a === b && d.b === a)) && (c0 !== c1 ? d.along === 'z' && Math.abs(d.x - ex) < 0.01 && Math.abs(d.z - (r0 + 0.5) * CELL) <= d.w / 2 : d.along === 'x' && Math.abs(d.z - ez) < 0.01 && Math.abs(d.x - (c0 + 0.5) * CELL) <= d.w / 2));
}
/** A path of cells from one point to another (null: no way). */
export function pathTo(f, from, to, blocked) {
    const key = (c, r) => r * f.cols + c;
    const prev = new Map();
    const q = [from];
    prev.set(key(...from), -1);
    while (q.length) {
        const [c, r] = q.shift();
        if (c === to[0] && r === to[1])
            break;
        for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const n = [c + dc, r + dr];
            if (prev.has(key(...n)) || !canStep(f, c, r, n[0], n[1]) || blocked?.(n[0], n[1]))
                continue;
            prev.set(key(...n), key(c, r));
            q.push(n);
        }
    }
    if (!prev.has(key(...to)))
        return null;
    const path = [];
    let k = key(...to);
    while (k !== -1) {
        path.unshift([k % f.cols, Math.floor(k / f.cols)]);
        k = prev.get(k);
    }
    return path;
}
