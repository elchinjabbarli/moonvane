export const GEN_VERSION = 1;
export const VERSION = "1.0.0";
export function mulberry32(seed) { let a = seed >>> 0; return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function hash3(a, b, c) { let h = (a * 374761393 + b * 668265263 + c * 2147483647) >>> 0; h = (h ^ (h >>> 13)) >>> 0; h = Math.imul(h, 1274126177) >>> 0; return (h ^ (h >>> 16)) >>> 0; }
function gcd(a, b) { a = Math.abs(a); b = Math.abs(b); while (b) {
    const t = a % b;
    a = b;
    b = t;
} return a || 1; }
export const idx = (x, y, n) => y * n + x;
export function bearing(mx, my, c, objs) {
    let bestD = Infinity;
    let tied = [];
    for (const o of objs) {
        if (o.c !== c)
            continue;
        const d = (o.x - mx) * (o.x - mx) + (o.y - my) * (o.y - my);
        if (d < bestD) {
            bestD = d;
            tied = [o];
        }
        else if (d === bestD)
            tied.push(o);
    }
    if (!tied.length)
        return null;
    let dx = 0, dy = 0;
    for (let i = 0; i < tied.length; i++) {
        const o = tied[i];
        let vx = o.k === 0 ? o.x - mx : mx - o.x;
        let vy = o.k === 0 ? o.y - my : my - o.y;
        const g = gcd(vx, vy);
        vx /= g;
        vy /= g;
        if (i === 0) {
            dx = vx;
            dy = vy;
        }
        else if (vx !== dx || vy !== dy)
            return "tie";
    }
    return { dx, dy };
}
export function mothSatisfied(m, objs) { const b = bearing(m.x, m.y, m.c, objs); return !!b && b !== "tie" && b.dx === m.dx && b.dy === m.dy; }
export function allSatisfied(level, placed) { const objs = level.fixed.concat(placed); for (const m of level.moths)
    if (!mothSatisfied(m, objs))
        return false; return true; }
export function curve(L) {
    const size = L < 60 ? 5 : L < 180 ? 6 : L < 360 ? 7 : L < 620 ? 8 : 9;
    const moths = Math.min(22, 3 + Math.floor(L / 45));
    const colors = L < 140 ? 1 : L < 420 ? 2 : 3;
    const moons = L < 25 ? 1 : L < 120 ? 2 : L < 300 ? 3 : L < 550 ? 4 : L < 800 ? 5 : 6;
    const bats = L < 260 ? 0 : L < 600 ? 1 : 2;
    const blocked = L < 80 ? 0 : Math.min(9, Math.floor((L - 80) / 90));
    const fixed = L >= 350 && L % 7 === 0 ? 1 : 0;
    const minPar = L < 25 ? 1 : L < 120 ? 2 : L < 300 ? 3 : L < 550 ? 4 : L < 800 ? 5 : 6;
    return { size, moths, colors, moons, bats, blocked, fixed, minPar };
}
function candidates(m, size, blockedSet, mothSet, fixedObjs) {
    const out = [];
    for (const dir of [1, -1]) {
        const kind = dir === 1 ? 0 : 1;
        for (let t = 1; t < size * 2; t++) {
            const x = m.x + dir * t * m.dx, y = m.y + dir * t * m.dy;
            if (x < 0 || y < 0 || x >= size || y >= size)
                break;
            const id = idx(x, y, size);
            if (blockedSet.has(id) || mothSet.has(id))
                continue;
            if (fixedObjs.some(o => o.x === x && o.y === y))
                continue;
            out.push({ x, y, c: m.c, k: kind });
        }
    }
    return out;
}
export function solve(level, budget, caps, nodeCap = 200000, countSolutions = false) {
    const size = level.size;
    const blockedSet = new Set(level.blocked);
    const mothSet = new Set(level.moths.map(m => idx(m.x, m.y, size)));
    const cands = level.moths.map(m => candidates(m, size, blockedSet, mothSet, level.fixed));
    const placed = [];
    const occ = new Set(level.fixed.map(o => idx(o.x, o.y, size)));
    const used = new Map();
    let nodes = 0, solutions = 0;
    let best = null;
    const key = (c, k) => c + ":" + k;
    function objsNow() { return level.fixed.concat(placed); }
    function unsat() { const objs = objsNow(); const u = []; for (let i = 0; i < level.moths.length; i++)
        if (!mothSatisfied(level.moths[i], objs))
            u.push(i); return u; }
    function viable(cand) { const id = idx(cand.x, cand.y, size); if (occ.has(id))
        return false; const kk = key(cand.c, cand.k); return (used.get(kk) ?? 0) < (caps.get(kk) ?? 0); }
    function dfs(depth) {
        nodes++;
        if (nodes > nodeCap)
            return false;
        const u = unsat();
        if (u.length === 0) {
            solutions++;
            if (!best)
                best = placed.slice();
            return !countSolutions || solutions >= 2;
        }
        if (depth >= budget)
            return false;
        let bi = -1, bc = [], bn = 1e9;
        for (const i of u) {
            const vc = cands[i].filter(viable);
            if (vc.length === 0)
                return false;
            if (vc.length < bn) {
                bn = vc.length;
                bi = i;
                bc = vc;
            }
        }
        if (bi < 0)
            return false;
        for (const cand of bc) {
            const id = idx(cand.x, cand.y, size);
            const kk = key(cand.c, cand.k);
            placed.push({ x: cand.x, y: cand.y, c: cand.c, k: cand.k });
            occ.add(id);
            used.set(kk, (used.get(kk) ?? 0) + 1);
            const done = dfs(depth + 1);
            placed.pop();
            occ.delete(id);
            used.set(kk, (used.get(kk) ?? 0) - 1);
            if (done)
                return true;
            if (nodes > nodeCap)
                return false;
        }
        return false;
    }
    dfs(0);
    return { sol: best, nodes, solutions };
}
export function generateLevel(id) {
    const cu = curve(id);
    for (let attempt = 0; attempt < 60; attempt++) {
        const seed = hash3(id, attempt, GEN_VERSION);
        const rnd = mulberry32(seed);
        const n = cu.size;
        const ri = (m) => Math.floor(rnd() * m);
        const cells = [];
        for (let i = 0; i < n * n; i++)
            cells.push(i);
        const shuffle = (arr) => { for (let i = arr.length - 1; i > 0; i--) {
            const j = ri(i + 1);
            const t = arr[i];
            arr[i] = arr[j];
            arr[j] = t;
        } return arr; };
        const blocked = shuffle(cells.slice()).slice(0, cu.blocked);
        const blockedSet = new Set(blocked);
        const free = cells.filter(i => !blockedSet.has(i));
        if (free.length < cu.moths + cu.moons + cu.bats + cu.fixed + 2)
            continue;
        const colorsUsed = Math.max(1, Math.min(cu.colors, cu.moons + cu.bats));
        const objs = [];
        const objCells = shuffle(free.slice());
        const totalObj = cu.moons + cu.bats;
        if (objCells.length < totalObj + cu.fixed)
            continue;
        let ptr = 0;
        let ci = 0;
        for (let f = 0; f < cu.fixed; f++) {
            const cell = objCells[ptr++];
            objs.push({ x: cell % n, y: Math.floor(cell / n), c: (f % colorsUsed), k: 0, fixed: true });
        }
        const placedObj = [];
        for (let m = 0; m < cu.moons; m++) {
            const cell = objCells[ptr++];
            placedObj.push({ x: cell % n, y: Math.floor(cell / n), c: (ci++ % colorsUsed), k: 0 });
        }
        for (let b = 0; b < cu.bats; b++) {
            const cell = objCells[ptr++];
            placedObj.push({ x: cell % n, y: Math.floor(cell / n), c: ri(colorsUsed), k: 1 });
        }
        const allObjs = objs.concat(placedObj);
        const objSet = new Set(allObjs.map(o => idx(o.x, o.y, n)));
        const mothCells = shuffle(free.filter(i => !objSet.has(i))).slice(0, cu.moths);
        if (mothCells.length < cu.moths)
            continue;
        const moths = [];
        let ok = true;
        const colorList = [];
        for (let i = 0; i < cu.moths; i++)
            colorList.push((i % colorsUsed));
        shuffle(colorList);
        for (let i = 0; i < cu.moths; i++) {
            const cell = mothCells[i];
            const mx = cell % n, my = Math.floor(cell / n);
            const c = colorList[i];
            const b = bearing(mx, my, c, allObjs);
            if (!b || b === "tie") {
                ok = false;
                break;
            }
            moths.push({ x: mx, y: my, c, dx: b.dx, dy: b.dy });
        }
        if (!ok)
            continue;
        const objColors = new Set(allObjs.map(o => o.c));
        const mothColors = new Set(moths.map(m => m.c));
        let refOk = true;
        objColors.forEach(c => { if (!mothColors.has(c))
            refOk = false; });
        if (!refOk)
            continue;
        if (id > 20 && cu.moons + cu.bats === 1) {
            const dirs = new Set(moths.map(m => m.dx + "," + m.dy));
            if (dirs.size < 2)
                continue;
        }
        const fixed = objs;
        const caps = new Map();
        for (const o of placedObj) {
            const k = o.c + ":" + o.k;
            caps.set(k, (caps.get(k) ?? 0) + 1);
        }
        const budget = placedObj.length;
        const level = { id, size: n, chapter: Math.floor((id - 1) / 100), blocked, moths, fixed, inv: [], par: budget, solution: placedObj.slice(), seed };
        if (!allSatisfied(level, placedObj))
            continue;
        let found = null;
        for (let k = 1; k <= budget; k++) {
            const r = solve(level, k, caps, 120000, false);
            if (r.sol) {
                found = r;
                break;
            }
            if (r.nodes > 120000) {
                found = null;
                break;
            }
        }
        let par = budget, solution = placedObj.slice();
        if (found && found.sol) {
            par = found.sol.length;
            solution = found.sol;
        }
        const invMap = new Map();
        for (const o of solution) {
            const k = o.c + ":" + o.k;
            if (!invMap.has(k))
                invMap.set(k, { c: o.c, k: o.k, n: 0 });
            invMap.get(k).n++;
        }
        level.inv = Array.from(invMap.values()).sort((a, b) => a.c - b.c || a.k - b.k);
        level.par = par;
        level.solution = solution;
        if (par < cu.minPar)
            continue;
        if (id >= 200) {
            const cc = new Map();
            for (const o of solution)
                cc.set(o.c, (cc.get(o.c) ?? 0) + 1);
            let mx = 0;
            cc.forEach(v => { if (v > mx)
                mx = v; });
            if (mx < 2)
                continue;
        }
        if (id <= 120) {
            const caps2 = new Map();
            for (const e of level.inv)
                caps2.set(e.c + ":" + e.k, e.n);
            const cnt = solve(level, par, caps2, 120000, true);
            if (cnt.solutions >= 2)
                continue;
            if (!cnt.sol)
                continue;
        }
        return level;
    }
    const n = 5;
    const sol = [{ x: 2, y: 2, c: 0, k: 0 }];
    const moths = [{ x: 0, y: 2, c: 0, dx: 1, dy: 0 }, { x: 2, y: 0, c: 0, dx: 0, dy: 1 }, { x: 4, y: 4, c: 0, dx: -1, dy: -1 }];
    return { id, size: n, chapter: Math.floor((id - 1) / 100), blocked: [], moths, fixed: [], inv: [{ c: 0, k: 0, n: 1 }], par: 1, solution: sol, seed: hash3(id, 999, GEN_VERSION) };
}
export const CHAPTERS = ["Duskfall Meadow", "Silver Thicket", "Amber Hollow", "Rosewater Fen", "Violet Reach", "Frostpine Vale", "Emberlight Marsh", "Stormglass Moor", "Moonveil Summit", "Aurora's Edge"];
