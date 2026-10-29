// [expanded] The house in 3D, drawn (Mundi Expanded, prototype). No SillyTavern here: give it three.js, a layout
// (sim/house3d.ts), the people and the time of day. Two ways to look: walking (first person: drag to look, click the
// floor to walk there, WASD) and the dollhouse (from above, the walls cut low, drag to turn, wheel to zoom).
import { canStep, pathTo, CELL } from '../sim/house3d.js';
const H_WALL = 2.7, T_WALL = 0.12, EYE = 1.6, LOW = 1.0;
const FLOOR_COL = { open: 0xc9a27a, hall: 0xc4a07c, bed: 0xb98d62, bath: 0xd7dde0, service: 0xa8a8a2, outdoor: 0x6f9d4c, pool: 0x9a7b5a };
const WALL_IN = 0xf1ece4, WALL_OUT = 0xe2dccf;
export function mountHouse(el, THREE, house, o = {}) {
    const W = () => el.clientWidth || 800, Hh = () => el.clientHeight || 500;
    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(Math.min(2, globalThis.devicePixelRatio || 1));
    renderer.setSize(W(), Hh());
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    el.appendChild(renderer.domElement);
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.touchAction = 'none';
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(68, W() / Hh(), 0.05, 200);
    let floorId = o.floor ?? house.floors[0].id, time = o.time ?? 'day', mode = o.mode ?? 'walk';
    let people = o.people ?? [];
    let closed = new Set(o.closed ?? []), inside = new Set(o.inside ?? []);
    const level = () => house.floors.find(f => f.id === floorId);
    const Y = (f) => f.level * (H_WALL + 0.3);
    /* ---------- materials, text ---------- */
    const mats = new Map();
    const mat = (c, extra = {}) => { const k = `${c}|${JSON.stringify(extra)}`; if (!mats.has(k))
        mats.set(k, new THREE.MeshLambertMaterial({ color: c, ...extra })); return mats.get(k); };
    const box = (w, h, d, c, x, y, z, g, extra = {}) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(c, extra)); m.position.set(x, y, z); g.add(m); return m; };
    const textTex = (text, size = 44, bg = 'rgba(20,22,30,.62)') => {
        const c = document.createElement('canvas');
        const ctx = c.getContext('2d');
        ctx.font = `600 ${size}px system-ui, sans-serif`;
        const w = Math.ceil(ctx.measureText(text).width) + size;
        c.width = w;
        c.height = Math.round(size * 1.6);
        ctx.font = `600 ${size}px system-ui, sans-serif`;
        ctx.fillStyle = bg;
        const r = c.height / 2;
        ctx.beginPath();
        ctx.roundRect?.(0, 0, w, c.height, r);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.textBaseline = 'middle';
        ctx.textAlign = 'center';
        ctx.fillText(text, w / 2, c.height / 2 + 2);
        const t = new THREE.CanvasTexture(c);
        t.colorSpace = THREE.SRGBColorSpace;
        return { t, aspect: w / c.height };
    };
    const label = (text, h = 0.42) => { const { t, aspect } = textTex(text); const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false, transparent: true })); s.scale.set(h * aspect, h, 1); s.renderOrder = 10; return s; };
    /* ---------- a floor ---------- */
    const groups = new Map();
    function quadsFor(f, id, y, down = false) {
        const pos = [], idx = [];
        let n = 0;
        for (let r = 0; r < f.rows; r++) {
            let s = -1;
            for (let c = 0; c <= f.cols; c++) {
                const on = c < f.cols && f.grid[r * f.cols + c] === id;
                if (on && s < 0)
                    s = c;
                if (!on && s >= 0) {
                    const x0 = s * CELL, x1 = c * CELL, z0 = r * CELL, z1 = (r + 1) * CELL;
                    pos.push(x0, y, z0, x1, y, z0, x1, y, z1, x0, y, z1);
                    if (down)
                        idx.push(n, n + 1, n + 2, n, n + 2, n + 3);
                    else
                        idx.push(n, n + 2, n + 1, n, n + 3, n + 2);
                    n += 4;
                    s = -1;
                }
            }
        }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
        geo.setIndex(idx);
        geo.computeVertexNormals();
        return geo;
    }
    function build(f) {
        const g = new THREE.Group();
        const y0 = Y(f);
        const walls = new THREE.Group();
        const ceil = new THREE.Group();
        const labels = new THREE.Group();
        const lights = new THREE.Group();
        const peopleG = new THREE.Group();
        const floors = [];
        const windows = [];
        for (const r of f.rooms) {
            const m = new THREE.Mesh(quadsFor(f, r.id, y0), mat(FLOOR_COL[r.kind] ?? 0xbbbbbb));
            m.userData.room = r.id;
            g.add(m);
            floors.push(m);
            if (r.kind !== 'outdoor' && r.kind !== 'pool') {
                const c = new THREE.Mesh(quadsFor(f, r.id, y0 + H_WALL, true), mat(0xfbf9f5, { emissive: 0x3a3833 }));
                ceil.add(c);
            }
            if (r.kind === 'pool') {
                const wtr = box(r.w * 0.62, 0.05, r.d * 0.7, 0x3fa7d6, r.x + r.w * 0.58, y0 + 0.03, r.z + r.d * 0.42, g, { emissive: 0x0b3a52 });
                wtr.userData.room = r.id;
                floors.push(wtr);
            }
            furnish(r, y0, g);
            const L = label(r.name);
            L.position.set(r.x + r.w / 2, y0 + (r.kind === 'outdoor' || r.kind === 'pool' ? 1.2 : 2.3), r.z + r.d / 2);
            L.userData.room = r.id;
            labels.add(L);
            if (r.kind !== 'outdoor' && r.kind !== 'pool' && r.kind !== 'hall' && r.cells > 30) {
                const pl = new THREE.PointLight(0xffd29a, 0, Math.max(r.w, r.d) * 1.6, 1.4);
                pl.position.set(r.x + r.w / 2, y0 + 2.4, r.z + r.d / 2);
                lights.add(pl);
            }
        }
        for (const w of f.walls) {
            const len = Math.hypot(w.x2 - w.x1, w.z2 - w.z1);
            const along = w.z1 === w.z2 ? 'x' : 'z';
            const m = box(along === 'x' ? len + T_WALL : T_WALL, H_WALL, along === 'x' ? T_WALL : len + T_WALL, w.outer ? WALL_OUT : WALL_IN, (w.x1 + w.x2) / 2, y0 + H_WALL / 2, (w.z1 + w.z2) / 2, walls);
            m.userData.wall = true;
            if (w.outer && len >= 2)
                for (let k = 1; k <= Math.floor(len / 3.2) || (k === 1 && len >= 2); k++) {
                    const t = Math.floor(len / 3.2) ? k / (Math.floor(len / 3.2) + 1) : 0.5;
                    const wl = Math.min(1.4, len * 0.5);
                    const px = along === 'x' ? w.x1 + (w.x2 - w.x1) * t : w.x1, pz = along === 'x' ? w.z1 : w.z1 + (w.z2 - w.z1) * t;
                    const win = box(along === 'x' ? wl : T_WALL + 0.02, 1.15, along === 'x' ? T_WALL + 0.02 : wl, 0xbfe3ff, px, y0 + 1.55, pz, walls, { emissive: 0x6aa9d8 });
                    windows.push(win);
                    if (!Math.floor(len / 3.2))
                        break;
                }
        }
        for (const d of f.doors) { // the lintel over a doorway, and the door frame
            box(d.along === 'x' ? d.w : T_WALL, H_WALL - 2.1, d.along === 'x' ? T_WALL : d.w, WALL_IN, d.x, y0 + 2.1 + (H_WALL - 2.1) / 2, d.z, walls);
            const fr = 0x8a6a4a;
            for (const s of [-1, 1])
                box(d.along === 'x' ? 0.06 : T_WALL + 0.04, 2.1, d.along === 'x' ? T_WALL + 0.04 : 0.06, fr, d.x + (d.along === 'x' ? s * d.w / 2 : 0), y0 + 1.05, d.z + (d.along === 'z' ? s * d.w / 2 : 0), walls);
        }
        if (f.stairs) { // a flight of steps: up from here (and the way down, from above)
            const s = f.stairs;
            const up = f.level < house.floors.length - 1, down = f.level > 0;
            if (up)
                for (let k = 0; k < 12; k++)
                    box(1.1, 0.22, 0.28, 0x9b7653, s.x, y0 + 0.11 + k * 0.22, s.z - 1.6 + k * 0.28, g).userData.stairs = 'up';
            if (down) {
                const hole = box(1.3, 0.02, 3.4, 0x3a2a1c, s.x + 1.4, y0 + 0.01, s.z, g);
                hole.userData.stairs = 'down';
            }
            if (up) {
                const lab = label('Upstairs ↑', 0.26);
                lab.position.set(s.x, y0 + 2.2, s.z + 1.2);
                lab.userData.stairs = 'up';
                labels.add(lab);
            }
            if (down) {
                const lab = label('Downstairs ↓', 0.26);
                lab.position.set(s.x + 1.4, y0 + 1.0, s.z);
                lab.userData.stairs = 'down';
                labels.add(lab);
            }
        }
        const doorsG = new THREE.Group();
        g.add(doorsG);
        g.userData.doorsG = doorsG;
        g.userData.floor = f;
        g.add(walls, ceil, labels, lights, peopleG);
        if (f.level === 0) {
            const gr = new THREE.Mesh(new THREE.PlaneGeometry(house.width * 3, house.depth * 3), mat(0x7aa457));
            gr.rotation.x = -Math.PI / 2;
            gr.position.set(house.width / 2, -0.02, house.depth / 2);
            g.add(gr);
        }
        scene.add(g);
        groups.set(f.id, { g, walls, ceil, floors, labels, lights, peopleG, windows });
    }
    // shut bedroom doors: a door in the doorway, "someone is inside" when someone is
    function placeDoors() {
        for (const [, G0] of groups) {
            const dg = G0.g.userData.doorsG;
            dg.clear();
            const f = G0.g.userData.floor;
            const y0 = Y(f);
            for (const d of f.doors) {
                const rid = [d.a, d.b].find(x => closed.has(x));
                if (!rid)
                    continue;
                const slab = box(d.along === 'x' ? d.w : 0.05, 2.08, d.along === 'x' ? 0.05 : d.w, 0x9a7350, d.x, y0 + 1.04, d.z, dg);
                slab.userData.closedRoom = rid;
                box(0.06, 0.06, 0.06, 0xd9c08a, d.x + (d.along === 'x' ? d.w * 0.38 : 0.05), y0 + 1.0, d.z + (d.along === 'z' ? d.w * 0.38 : 0.05), dg);
                if (inside.has(rid)) {
                    const L = label('someone is inside', 0.2);
                    L.position.set(d.x, y0 + 2.3, d.z);
                    L.userData.closedRoom = rid;
                    dg.add(L);
                }
            }
        }
    }
    /* ---------- furniture: simple shapes by the kind of room ---------- */
    function furnish(r, y, g) {
        const t = `${r.id} ${r.kind === 'outdoor' || r.kind === 'pool' ? '' : r.name}`.toLowerCase();
        const cx = r.x + r.w / 2, cz = r.z + r.d / 2;
        const m = 0.35;
        const wood = 0x8a5f3c, light = 0xe9e3d8, fab = 0x7d8fa8, dark = 0x2c2f36;
        if (r.kind === 'bed') {
            const bw = Math.min(1.6, r.w - 1), bd = 2.0;
            box(bw, 0.45, bd, 0xd8d2c8, r.x + m + bw / 2, y + 0.22, r.z + m + bd / 2, g);
            box(bw, 0.12, 0.6, 0xf4f1ea, r.x + m + bw / 2, y + 0.5, r.z + m + 0.35, g);
            box(bw + 0.05, 0.9, 0.08, wood, r.x + m + bw / 2, y + 0.45, r.z + m + 0.02, g);
            box(0.45, 0.5, 0.4, wood, r.x + m + bw + 0.35, y + 0.25, r.z + m + 0.2, g);
            if (r.w > 3)
                box(1.2, 2.0, 0.6, light, r.x + r.w - m - 0.6, y + 1.0, r.z + m + 0.3, g);
            if (r.d > 3.2) {
                box(1.1, 0.75, 0.55, wood, r.x + r.w - m - 0.55, y + 0.37, r.z + r.d - m - 0.3, g);
                box(0.45, 0.45, 0.45, dark, r.x + r.w - m - 0.55, y + 0.22, r.z + r.d - m - 0.9, g);
            }
        }
        else if (r.kind === 'bath') {
            if (r.w > 1.6 && r.d > 1.6)
                box(Math.min(1.7, r.w - 0.4), 0.55, 0.75, 0xffffff, r.x + 0.2 + Math.min(1.7, r.w - 0.4) / 2, y + 0.27, r.z + 0.2 + 0.37, g);
            box(0.4, 0.45, 0.6, 0xffffff, r.x + r.w - 0.4, y + 0.22, r.z + r.d - 0.45, g);
            box(0.6, 0.85, 0.45, 0xf2f2f2, r.x + 0.5, y + 0.42, r.z + r.d - 0.3, g);
        }
        else if (/kitchen|кухн/.test(t)) {
            box(Math.min(r.w - 0.6, 5), 0.9, 0.62, light, cx, y + 0.45, r.z + 0.35, g);
            box(Math.min(r.w - 0.6, 5), 0.04, 0.64, dark, cx, y + 0.92, r.z + 0.35, g);
            box(Math.min(r.w - 0.6, 5), 0.8, 0.35, light, cx, y + 1.85, r.z + 0.2, g);
            box(Math.min(2.2, r.w * 0.35), 0.92, 0.95, 0xf4f0e8, cx, y + 0.46, cz + 0.3, g);
            for (let k = -1; k <= 1; k++)
                box(0.35, 0.7, 0.35, dark, cx + k * 0.6, y + 0.35, cz + 1.05, g);
        }
        else if (/dining|столов/.test(t)) {
            box(1.0, 0.75, Math.min(2.0, r.d - 1.4), wood, cx, y + 0.375, cz, g);
            for (const s of [-1, 1])
                for (const k of [-0.5, 0, 0.5])
                    box(0.42, 0.85, 0.42, light, cx + s * 0.75, y + 0.42, cz + k * Math.min(1.6, r.d - 1.8), g);
        }
        else if (/living|гостин|lounge/.test(t)) {
            box(Math.min(2.6, r.w - 1), 0.42, 0.95, fab, r.x + m + Math.min(2.6, r.w - 1) / 2, y + 0.21, r.z + r.d - m - 0.5, g);
            box(Math.min(2.6, r.w - 1), 0.5, 0.22, fab, r.x + m + Math.min(2.6, r.w - 1) / 2, y + 0.65, r.z + r.d - m - 0.12, g);
            box(0.95, 0.42, Math.min(2.0, r.d - 1.6), fab, r.x + m + 0.48, y + 0.21, cz, g);
            box(1.1, 0.35, 0.65, wood, cx, y + 0.17, cz + 0.4, g);
            box(1.8, 0.5, 0.42, dark, cx, y + 0.25, r.z + m + 0.2, g);
            box(1.5, 0.85, 0.05, 0x111316, cx, y + 1.15, r.z + m + 0.1, g, { emissive: 0x1a2a3a });
            box(Math.min(r.w - 1, 3), 0.01, Math.min(r.d - 1.4, 2.4), 0x9aa3ad, cx, y + 0.01, cz + 0.2, g);
        }
        else if (r.kind === 'open' && /entrance|прихож|hall/.test(t)) {
            box(1.1, 0.8, 0.38, wood, r.x + r.w - m - 0.6, y + 0.4, r.z + r.d - m - 0.2, g);
            box(0.35, 0.9, 0.35, 0x4d7a3a, r.x + m + 0.2, y + 0.45, r.z + r.d - m - 0.2, g);
        }
        else if (/laundry|прачеч/.test(t)) {
            for (const k of [0, 1])
                box(0.6, 0.85, 0.6, 0xf5f5f5, r.x + 0.4 + k * 0.65, y + 0.42, r.z + 0.35, g);
        }
        else if (/gym|спортзал/.test(t)) {
            box(0.8, 0.25, 1.9, dark, r.x + r.w - m - 0.5, y + 0.12, cz, g);
            box(0.8, 1.2, 0.08, dark, r.x + r.w - m - 0.5, y + 0.8, cz - 0.95, g);
            box(1.3, 0.45, 0.35, 0x444851, cx - 0.6, y + 0.22, cz, g);
            box(1.8, 0.02, 0.7, 0x3fb39a, cx - 0.4, y + 0.01, r.z + r.d - m - 0.5, g);
        }
        else if (/garage|гараж/.test(t)) {
            box(1.9, 0.75, 4.4, 0x1d1f24, cx, y + 0.55, cz, g);
            box(1.6, 0.55, 2.2, 0x15171b, cx, y + 1.15, cz + 0.2, g);
            box(1.6, 1.8, 0.45, 0x5a5f66, r.x + m + 0.8, y + 0.9, r.z + m + 0.25, g);
        }
        else if (/storage|кладов|attic|чердак/.test(t)) {
            box(Math.min(2.4, r.w - 0.8), 1.9, 0.45, 0x6e5a44, cx, y + 0.95, r.z + m + 0.25, g);
            for (let k = 0; k < 5; k++)
                box(0.5, 0.4, 0.5, 0xb08a5a, r.x + 0.6 + (k % 3) * 0.6, y + 0.2 + Math.floor(k / 3) * 0.4, r.z + r.d - 0.6, g);
        }
        else if (r.kind === 'pool') {
            for (let k = 0; k < 3; k++)
                box(0.65, 0.3, 1.8, 0xf2f2f2, r.x + 0.8, y + 0.15, r.z + 1.2 + k * 1.2, g);
        }
    }
    /* ---------- people ---------- */
    const texCache = new Map();
    const loader = new THREE.TextureLoader();
    function placePeople() {
        for (const [fid, G0] of groups) {
            G0.peopleG.clear();
            const f = house.floors.find(x => x.id === fid);
            const byRoom = new Map();
            for (const p of people.filter(p => p.floor === fid && !p.hidden)) {
                const l = byRoom.get(p.room) ?? [];
                l.push(p);
                byRoom.set(p.room, l);
            }
            for (const [rid, list] of byRoom) {
                const r = f.rooms.find(x => x.id === rid);
                if (!r)
                    continue;
                list.forEach((p, i) => {
                    const ang = (i / Math.max(1, list.length)) * Math.PI * 2 + 0.6;
                    const rad = Math.min(r.w, r.d) * (list.length > 1 ? 0.28 : 0.12);
                    const x = r.x + r.w / 2 + Math.cos(ang) * rad, z = r.z + r.d / 2 + Math.sin(ang) * rad;
                    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ color: p.asleep ? 0x8890a8 : 0xffffff, transparent: true, alphaTest: 0.08 }));
                    const hgt = p.asleep ? 0.0 : 1.68;
                    sp.center.set(0.5, 0);
                    sp.position.set(x, Y(f) + 0.02, z);
                    sp.userData.person = p;
                    const apply = (t) => { const a = t.image ? t.image.width / t.image.height : 0.45; sp.material.map = t; sp.material.needsUpdate = true; sp.scale.set(hgt ? hgt * a : 0.01, hgt || 0.01, 1); };
                    if (p.img) {
                        let e = texCache.get(p.img);
                        if (!e) {
                            e = { t: null, ready: false, wait: [] };
                            texCache.set(p.img, e);
                            e.t = loader.load(p.img, () => { e.ready = true; e.wait.splice(0).forEach((f) => f(e.t)); });
                            e.t.colorSpace = THREE.SRGBColorSpace;
                        }
                        if (e.ready)
                            apply(e.t);
                        else
                            e.wait.push(apply);
                    }
                    else {
                        sp.material.color.set(0x6b7ad6);
                        sp.scale.set(0.5, hgt || 0.01, 1);
                    }
                    if (hgt)
                        G0.peopleG.add(sp);
                    const L = label(p.asleep ? `${p.name} 💤` : p.name, 0.22);
                    L.position.set(x, Y(f) + (hgt ? hgt + 0.18 : 0.9), z);
                    L.userData.person = p;
                    G0.peopleG.add(L);
                });
            }
        }
    }
    /* ---------- light and time ---------- */
    const hemi = new THREE.HemisphereLight(0xdfefff, 0x8a7a66, 1.0);
    const sun = new THREE.DirectionalLight(0xffffff, 1.4);
    sun.position.set(-20, 30, -10);
    const amb = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(hemi, sun, amb);
    function applyTime() {
        const night = time === 'night', eve = time === 'afternoon';
        scene.background = new THREE.Color(night ? 0x0b1020 : eve ? 0xf0b37a : 0xa8d4f2);
        scene.fog = new THREE.Fog(scene.background, 40, 90);
        hemi.color.set(night ? 0x34406a : eve ? 0xffd2a6 : 0xe6f2ff);
        hemi.groundColor.set(night ? 0x141218 : 0x7a6a58);
        hemi.intensity = night ? 0.35 : eve ? 1.0 : 1.25;
        amb.color.set(night ? 0x2a3050 : eve ? 0xffe2c8 : 0xffffff);
        amb.intensity = night ? 0.35 : eve ? 0.7 : 1.05;
        sun.color.set(night ? 0x8090c0 : eve ? 0xffa45c : 0xfff6e6);
        sun.intensity = night ? 0.15 : eve ? 1.1 : 1.5;
        sun.position.set(eve ? -30 : -12, eve ? 8 : 30, eve ? 4 : -10);
        for (const [, G0] of groups) {
            G0.lights.children.forEach((l) => { l.intensity = night ? 2.2 : eve ? 0.9 : 0.5; });
            G0.windows.forEach((w) => { w.material = mat(night ? 0x1d2b4a : eve ? 0xffc890 : 0xbfe3ff, { emissive: night ? 0x0a1224 : eve ? 0x8a4a1c : 0x6aa9d8 }); });
        }
    }
    /* ---------- the camera: walking, and the dollhouse ---------- */
    const me = { x: 0, z: 0, yaw: 0, pitch: -0.05, path: [] };
    let orbit = { yaw: -0.6, pitch: 0.95, dist: 17, tx: house.width / 2, tz: house.depth / 2 };
    const cellAt = (x, z) => [Math.floor(x / CELL), Math.floor(z / CELL)];
    // the stairs take up floor: you walk around them (they are clicked to go up or down)
    const onStairs = (f, x, z) => {
        const s0 = f.stairs;
        if (!s0)
            return false;
        const up = f.level < house.floors.length - 1, dn = f.level > 0;
        return (up && Math.abs(x - s0.x) < 0.75 && z > s0.z - 1.85 && z < s0.z + 1.85) || (dn && Math.abs(x - (s0.x + 1.4)) < 0.8 && Math.abs(z - s0.z) < 1.85);
    };
    const blockedCell = (f) => (c, r) => onStairs(f, (c + 0.5) * CELL, (r + 0.5) * CELL);
    const roomAt = (f, x, z) => { const [c, r] = cellAt(x, z); const id = f.grid[r * f.cols + c]; return f.rooms.find(q => q.id === id) ?? null; };
    function startAt(roomId) {
        const f = level();
        const r = (roomId && f.rooms.find(x => x.id === roomId)) || f.rooms.find(x => x.kind === 'open') || f.rooms.find(x => x.kind === 'hall') || f.rooms[0];
        const cx = r.x + r.w / 2, cz = r.z + r.d / 2;
        const here = people.filter(p => p.room === r.id && p.floor === f.id && !p.hidden);
        const spots = here.map((_, i) => { const ang = (i / Math.max(1, here.length)) * Math.PI * 2 + 0.6; const rad = Math.min(r.w, r.d) * (here.length > 1 ? 0.28 : 0.12); return [cx + Math.cos(ang) * rad, cz + Math.sin(ang) * rad]; });
        // the free spot (not by a wall, not on the stairs) farthest from the people and nearest the room's middle otherwise
        let best = null, score = -1e9;
        for (let rr = 0; rr < f.rows; rr += 2)
            for (let c = 0; c < f.cols; c += 2) {
                if (f.grid[rr * f.cols + c] !== r.id)
                    continue;
                const x = (c + 0.5) * CELL, z = (rr + 0.5) * CELL;
                if (onStairs(f, x, z) || x < r.x + 0.7 || x > r.x + r.w - 0.7 || z < r.z + 0.7 || z > r.z + r.d - 0.7)
                    continue;
                const near = spots.length ? Math.min(...spots.map(([px, pz]) => Math.hypot(px - x, pz - z))) : 2.5;
                const st = f.stairs ? Math.hypot(x - f.stairs.x, z - f.stairs.z) : 9;
                const sc = Math.min(near, 3.2) * 2 - Math.hypot(x - cx, z - cz) * 0.35 - (st < 2.6 ? 6 : 0);
                if (sc > score) {
                    score = sc;
                    best = [c, rr];
                }
            }
        if (!best)
            for (let rr = 0; rr < f.rows && !best; rr++)
                for (let c = 0; c < f.cols; c++)
                    if (f.grid[rr * f.cols + c] === r.id && !onStairs(f, (c + 0.5) * CELL, (rr + 0.5) * CELL)) {
                        best = [c, rr];
                        break;
                    }
        if (best) {
            me.x = (best[0] + 0.5) * CELL;
            me.z = (best[1] + 0.5) * CELL;
        }
        const [lx, lz] = spots.length ? [spots.reduce((s0, p) => s0 + p[0], 0) / spots.length, spots.reduce((s0, p) => s0 + p[1], 0) / spots.length] : [cx, cz];
        me.yaw = Math.atan2(lx - me.x, -(lz - me.z));
        me.pitch = -0.08;
        orbit.tx = cx;
        orbit.tz = cz;
        me.path = [];
        lastRoom = '';
    }
    function applyMode() {
        for (const [fid, G0] of groups) {
            const f = house.floors.find(x => x.id === fid);
            const on = fid === floorId;
            G0.g.visible = mode === 'overview' ? f.level <= level().level : on;
            G0.ceil.visible = mode === 'walk';
            G0.walls.scale.y = mode === 'overview' && on ? LOW / H_WALL : 1;
            G0.walls.position.y = mode === 'overview' && on ? -Y(f) * (LOW / H_WALL - 1) : 0;
            G0.labels.visible = mode === 'overview' ? on : true;
            if (mode === 'overview' && !on)
                G0.walls.visible = G0.labels.visible = G0.peopleG.visible = false;
            else {
                G0.walls.visible = true;
                G0.peopleG.visible = true;
            }
            if (mode === 'overview' && f.level < level().level)
                G0.g.visible = false;
            if (mode === 'walk')
                G0.labels.children.forEach((l) => { l.visible = !!l.userData.stairs; });
            else
                G0.labels.children.forEach((l) => { l.visible = true; });
        }
    }
    let lastRoom = '';
    function updateCamera() {
        const f = level();
        if (mode === 'walk') {
            camera.position.set(me.x, Y(f) + EYE, me.z);
            camera.lookAt(me.x + Math.sin(me.yaw) * Math.cos(me.pitch), Y(f) + EYE + Math.sin(me.pitch), me.z - Math.cos(me.yaw) * Math.cos(me.pitch));
            const r = roomAt(f, me.x, me.z);
            if ((r?.id ?? '') !== lastRoom) {
                lastRoom = r?.id ?? '';
                o.onRoom?.(r, f);
            }
        }
        else {
            const y = Y(f) + Math.sin(orbit.pitch) * orbit.dist, h = Math.cos(orbit.pitch) * orbit.dist;
            camera.position.set(orbit.tx + Math.sin(orbit.yaw) * h, y, orbit.tz + Math.cos(orbit.yaw) * h);
            camera.lookAt(orbit.tx, Y(f), orbit.tz);
        }
    }
    // walking: one step toward the next cell of the path, or by the keys, never through a wall
    const keys = new Set();
    const shutStep = (f, c0, r0, c1, r1) => { const b = f.grid[r1 * f.cols + c1], a = f.grid[r0 * f.cols + c0]; return a !== b && ((!!b && closed.has(b)) || (!!a && closed.has(a))); };
    function tryMove(dx, dz) {
        const f = level();
        const [c0, r0] = cellAt(me.x, me.z);
        const nx = me.x + dx, nz = me.z + dz;
        const [c1, r1] = cellAt(nx, nz);
        if (shutStep(f, c0, r0, c1, r1) || onStairs(f, nx, nz))
            return false;
        if (c1 === c0 && r1 === r0) {
            me.x = nx;
            me.z = nz;
            return true;
        }
        if (Math.abs(c1 - c0) + Math.abs(r1 - r0) === 1 ? canStep(f, c0, r0, c1, r1) : canStep(f, c0, r0, c1, r0) && canStep(f, c1, r0, c1, r1)) {
            me.x = nx;
            me.z = nz;
            return true;
        }
        return false;
    }
    let raf = 0, last = performance.now();
    function tick(t) {
        const dt = Math.min(0.05, (t - last) / 1000);
        last = t;
        if (mode === 'walk') {
            const sp = 2.6 * dt;
            let fx = 0, fz = 0;
            if (keys.has('w') || keys.has('arrowup')) {
                fx += Math.sin(me.yaw);
                fz -= Math.cos(me.yaw);
            }
            if (keys.has('s') || keys.has('arrowdown')) {
                fx -= Math.sin(me.yaw);
                fz += Math.cos(me.yaw);
            }
            if (keys.has('a')) {
                fx -= Math.cos(me.yaw);
                fz -= Math.sin(me.yaw);
            }
            if (keys.has('d')) {
                fx += Math.cos(me.yaw);
                fz += Math.sin(me.yaw);
            }
            if (keys.has('arrowleft'))
                me.yaw -= 1.8 * dt;
            if (keys.has('arrowright'))
                me.yaw += 1.8 * dt;
            if (fx || fz) {
                me.path = [];
                const l = Math.hypot(fx, fz);
                if (!tryMove(fx / l * sp, 0)) { /* slide */ }
                tryMove(0, fz / l * sp);
            }
            else if (me.path.length) {
                const [c, r] = me.path[0];
                const tx = (c + 0.5) * CELL, tz = (r + 0.5) * CELL;
                const dx = tx - me.x, dz = tz - me.z;
                const d = Math.hypot(dx, dz);
                const [c0, r0] = cellAt(me.x, me.z);
                if (shutStep(level(), c0, r0, c, r)) {
                    me.path = [];
                }
                else if (d < 0.06)
                    me.path.shift();
                else {
                    me.x += dx / d * Math.min(d, sp * 1.2);
                    me.z += dz / d * Math.min(d, sp * 1.2);
                    const want = Math.atan2(dx, -dz);
                    let dy = want - me.yaw;
                    while (dy > Math.PI)
                        dy -= 2 * Math.PI;
                    while (dy < -Math.PI)
                        dy += 2 * Math.PI;
                    me.yaw += dy * Math.min(1, dt * 6);
                }
            }
        }
        updateCamera();
        renderer.render(scene, camera);
        raf = requestAnimationFrame(tick);
    }
    /* ---------- input ---------- */
    const ray = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    let drag = null;
    const down = (e) => { drag = { x: e.clientX, y: e.clientY, moved: false }; renderer.domElement.setPointerCapture?.(e.pointerId); };
    const move = (e) => {
        if (!drag)
            return;
        const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
        if (Math.abs(dx) + Math.abs(dy) > 3)
            drag.moved = true;
        drag.x = e.clientX;
        drag.y = e.clientY;
        if (mode === 'walk') {
            me.yaw += dx * 0.005;
            me.pitch = Math.max(-1.1, Math.min(0.9, me.pitch - dy * 0.004));
        }
        else {
            orbit.yaw -= dx * 0.006;
            orbit.pitch = Math.max(0.35, Math.min(1.45, orbit.pitch + dy * 0.004));
        }
    };
    const up = (e) => { const d = drag; drag = null; if (!d || d.moved)
        return; click(e); };
    function click(e) {
        const rect = renderer.domElement.getBoundingClientRect();
        ndc.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
        ray.setFromCamera(ndc, camera);
        const G0 = groups.get(floorId);
        const hit = ray.intersectObjects([...G0.g.userData.doorsG.children, ...G0.peopleG.children, ...G0.labels.children.filter((l) => l.visible), ...G0.g.children.filter((c) => c.userData.stairs), ...G0.floors], false)[0];
        if (!hit)
            return;
        const u = hit.object.userData;
        if (u.person) {
            o.onPick?.(u.person);
            return;
        }
        if (u.closedRoom) {
            const r = level().rooms.find(x => x.id === u.closedRoom);
            if (r)
                o.onDoor?.(r);
            return;
        }
        if (u.stairs) {
            const f = level();
            const next = house.floors.find(x => x.level === f.level + (u.stairs === 'up' ? 1 : -1));
            if (next) {
                floorId = next.id;
                if (mode === 'walk' && f.stairs) {
                    me.x = f.stairs.x + (u.stairs === 'up' ? 1.4 : 0);
                    me.z = f.stairs.z;
                }
                applyMode();
                lastRoom = '';
            }
            return;
        }
        if (u.room && mode === 'overview') {
            const f = level();
            const r = f.rooms.find(x => x.id === u.room);
            if (r) {
                mode = 'walk';
                startAt(r.id);
                applyMode();
                o.onDoor?.(r);
            }
            return;
        }
        if (u.room && mode === 'walk') {
            const f = level();
            const p = pathTo(f, cellAt(me.x, me.z), cellAt(hit.point.x, hit.point.z), blockedCell(f));
            if (p) {
                const k = p.findIndex(([c, r], i) => i > 0 && shutStep(f, p[i - 1][0], p[i - 1][1], c, r));
                me.path = (k > 0 ? p.slice(0, k) : p).slice(1);
            }
        }
    }
    const kd = (e) => { const t = e.target; if (t && /input|textarea/i.test(t.tagName))
        return; keys.add(e.key.toLowerCase()); };
    const ku = (e) => keys.delete(e.key.toLowerCase());
    const wheel = (e) => { if (mode !== 'overview')
        return; e.preventDefault(); orbit.dist = Math.max(8, Math.min(60, orbit.dist * (1 + Math.sign(e.deltaY) * 0.1))); };
    const resize = () => { renderer.setSize(W(), Hh()); camera.aspect = W() / Hh(); camera.updateProjectionMatrix(); };
    renderer.domElement.addEventListener('pointerdown', down);
    renderer.domElement.addEventListener('pointermove', move);
    renderer.domElement.addEventListener('pointerup', up);
    renderer.domElement.addEventListener('wheel', wheel, { passive: false });
    window.addEventListener('keydown', kd);
    window.addEventListener('keyup', ku);
    const ro = new ResizeObserver(resize);
    ro.observe(el);
    for (const f of house.floors)
        build(f);
    placePeople();
    placeDoors();
    applyTime();
    startAt(o.start);
    applyMode();
    raf = requestAnimationFrame(tick);
    return {
        setFloor(id) { if (house.floors.some(f => f.id === id)) {
            floorId = id;
            startAt();
            applyMode();
        } },
        setTime(t) { time = t; applyTime(); },
        setMode(m) { mode = m; applyMode(); },
        setPeople(p) { people = p; placePeople(); },
        walkTo(room) { const f = level(); const r = f.rooms.find(x => x.id === room); if (!r)
            return false; const p = pathTo(f, cellAt(me.x, me.z), cellAt(r.x + r.w / 2, r.z + r.d / 2), blockedCell(f)); if (!p)
            return false; me.path = p.slice(1, Math.max(2, p.length - 6)); return true; },
        setClosed(ids, ins) { closed = new Set(ids); inside = new Set(ins); placeDoors(); },
        goTo(room) { const f = house.floors.find(x => x.rooms.some(r => r.id === room)); if (f) {
            floorId = f.id;
            startAt(room);
            applyMode();
        } },
        shot() { renderer.render(scene, camera); return renderer.domElement.toDataURL('image/png'); },
        state() { return { floor: floorId, room: roomAt(level(), me.x, me.z)?.id ?? null, mode }; },
        dispose() { cancelAnimationFrame(raf); ro.disconnect(); window.removeEventListener('keydown', kd); window.removeEventListener('keyup', ku); renderer.dispose(); renderer.domElement.remove(); },
    };
}
