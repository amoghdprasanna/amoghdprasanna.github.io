// Space-time view of a surface-code memory, drawn in monospace characters.
//
// A distance-5 rotated surface code, Z-type checks only (they see X errors).
// The checks are measured for four rounds; stacking the rounds gives a 3D
// block with time going up. One hand-placed example error history:
//   - a two-qubit X chain before round 1      -> two detection events, same round
//   - a measurement error in round 2          -> two events, same check, rounds 2 and 3
//   - one X error on the right edge, round 3  -> one event, matched to the boundary
// Detection events are computed from the stabilizers, and the pairing is an
// exact minimum-weight perfect matching. It is an illustration, not data.
//
// The view starts as one round seen from above, tilts once to show every
// round at once, then draws the matching and stops. Drag or arrow keys turn it.

type P3 = [number, number, number];
type Cell = { ch: string; tone: 0 | 1 | 2 | 3 };

const D = 5, ROUNDS = 4;
const DATA_ERR: [number, number, number][] = [[1, 1, 1], [2, 1, 1], [4, 3, 3]]; // [i, j, before round]
const MEAS_ERR: [number, number, number][] = [[3, 3, 2]]; // [u, v, round]
const FOCUS = 1; // the round shown on its own first

// ---- code, events and matching (computed once) ----------------------------

const checks: [number, number][] = [];
for (let u = 0; u <= D; u++) for (let v = 0; v <= D; v++) {
  const bulk = u >= 1 && u <= D - 1 && v >= 1 && v <= D - 1;
  const edge = (v === 0 || v === D) && u >= 1 && u <= D - 1;
  if ((bulk || edge) && (u + v) % 2 === 0) checks.push([u, v]);
}
const B = checks.length; // the boundary, as one extra node
const touching = (i: number, j: number) =>
  checks.flatMap(([u, v], k) => (i >= u - 1 && i <= u && j >= v - 1 && j <= v ? [k] : []));

// Check graph: two checks share a data qubit, or one check meets the boundary.
const adj: { to: number; q: [number, number] }[][] = Array.from({ length: B + 1 }, () => []);
for (let i = 0; i < D; i++) for (let j = 0; j < D; j++) {
  const ks = touching(i, j);
  const [a, b] = ks.length === 2 ? ks : [ks[0], B];
  adj[a].push({ to: b, q: [i, j] }); adj[b].push({ to: a, q: [i, j] });
}
function bfs(s: number) {
  const dist = new Array(B + 1).fill(Infinity), via: ([number, number] | null)[] = new Array(B + 1).fill(null);
  dist[s] = 0;
  const queue = [s];
  while (queue.length) {
    const x = queue.shift()!;
    for (const { to, q } of adj[x]) if (dist[to] === Infinity) { dist[to] = dist[x] + 1; via[to] = q; queue.push(to); }
  }
  return { dist, via };
}
const paths = checks.map((_, k) => bfs(k));

// Measure every round; an event is a change from the previous round. The last
// round is read out perfectly, as in a memory experiment.
const events: { k: number; r: number }[] = [];
{
  const state = new Array(B).fill(0); let last = new Array(B).fill(0);
  for (let r = 0; r < ROUNDS; r++) {
    for (const [i, j, rr] of DATA_ERR) if (rr === r) for (const k of touching(i, j)) state[k] ^= 1;
    const m = state.slice();
    if (r < ROUNDS - 1) for (const [u, v, rr] of MEAS_ERR) if (rr === r) m[checks.findIndex(([a, b]) => a === u && b === v)] ^= 1;
    for (let k = 0; k < B; k++) if (m[k] !== last[k]) events.push({ k, r });
    last = m;
  }
}

// Exact minimum-weight perfect matching with a boundary, by memoised search
// over subsets (there are only a handful of events).
const n = events.length;
const w = (a: number, b: number) => paths[events[a].k].dist[events[b].k] + Math.abs(events[a].r - events[b].r);
const wB = (a: number) => paths[events[a].k].dist[B];
const memo = new Map<number, [number, [number, number][]]>();
function solve(mask: number): [number, [number, number][]] {
  if (mask === (1 << n) - 1) return [0, []];
  const hit = memo.get(mask); if (hit) return hit;
  let i = 0; while (mask >> i & 1) i++;
  const [c0, p0] = solve(mask | 1 << i);
  let best: [number, [number, number][]] = [wB(i) + c0, [[i, -1], ...p0]];
  for (let j = i + 1; j < n; j++) if (!(mask >> j & 1)) {
    const [c, p] = solve(mask | 1 << i | 1 << j);
    if (w(i, j) + c < best[0]) best = [w(i, j) + c, [[i, j], ...p]];
  }
  memo.set(mask, best);
  return best;
}
const [matchWeight, pairs] = solve(0);

// Positions in the code plane: data qubit (i, j) at (i, j); check (u, v) at its centre.
const at = (k: number): [number, number] => [checks[k][0] - 0.5, checks[k][1] - 0.5];
const P = (x: number, y: number, r: number): P3 => [x - (D - 1) / 2, y - (D - 1) / 2, r];

// Each matched pair as straight runs: across the code in the first event's
// round, then up through time. An event matched to the boundary runs to the
// edge of the code beside the boundary qubit its shortest path ends on.
const strands: P3[][] = pairs.map(([a, b]) => {
  const ea = events[a], from = P(...at(ea.k), ea.r);
  if (b < 0) {
    const [qi, qj] = paths[ea.k].via[B]!;
    return [from, P(qi + (qi === 0 ? -0.5 : 0.5), qj, ea.r)];
  }
  const eb = events[b], pts = [from];
  if (eb.k !== ea.k) pts.push(P(...at(eb.k), ea.r));
  if (eb.r !== ea.r) pts.push(P(...at(eb.k), eb.r));
  return pts;
});

// ---- drawing ----------------------------------------------------------------

const clamp = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const TILT0 = Math.PI / 2, TILT1 = 0.42, YAW0 = 0, YAW1 = -0.22, GAP = 1.3;

export function mountSpacetime(root: HTMLElement) {
  const canvas = root.querySelector('canvas')!;
  const ctx = canvas.getContext('2d')!;
  const stages = [...root.querySelectorAll<HTMLButtonElement>('[data-stage]')];
  const replay = root.querySelector<HTMLButtonElement>('[data-replay]');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  root.dataset.events = String(n);
  root.dataset.matchWeight = String(matchWeight);

  let W = 0, H = 0, dpr = 1, fs = 12, cw = 7, chh = 14, font = 'monospace';
  let col = { fg: '#eee', mute: '#999', faint: '#444', accent: '#a898ff' };
  // p runs 0 -> 1 (tilt, rounds appear) -> 2 (matching drawn); target is where it heads.
  let p = 0, target = 0, from = 0, t0 = 0, raf = 0;
  let dYaw = 0, dTilt = 0, drag: { x: number; y: number; yaw: number; tilt: number } | null = null;

  const readColors = () => {
    const s = getComputedStyle(root);
    col = { fg: s.getPropertyValue('--fg').trim(), mute: s.getPropertyValue('--mute').trim(), faint: s.getPropertyValue('--faint').trim(), accent: s.getPropertyValue('--accent').trim() };
    font = getComputedStyle(stages[0] ?? root).fontFamily;
  };
  const resize = () => {
    const r = canvas.getBoundingClientRect();
    dpr = Math.min(devicePixelRatio || 1, 2); W = r.width; H = r.height;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    fs = W < 420 ? 11 : 13; cw = fs * 0.62; chh = fs * 1.15;
    fit();
  };

  // Orthographic camera: yaw about the time axis, then tilt toward the viewer.
  const camera = (tilt: number, yaw: number) => {
    const cy = Math.cos(yaw), sy = Math.sin(yaw), ct = Math.cos(tilt), st = Math.sin(tilt);
    return ([x, y, r]: P3): [number, number, number] => {
      const X = x * cy - y * sy, Z = x * sy + y * cy, Y = (r - (ROUNDS - 1) / 2) * GAP;
      return [X, -Y * ct + Z * st, Y * st + Z * ct];
    };
  };
  const E = (D - 1) / 2 + 0.5; // half-width of a plate
  const corners = (r: number): P3[] => [[-E, -E, r], [E, -E, r], [E, E, r], [-E, E, r]];
  // One scale for every pose, so nothing zooms while the view turns.
  let scale = 1, ox = 0, oy = 0;
  const fit = () => {
    let mx = 0, my = 0;
    for (const [t, y] of [[TILT0, YAW0], [TILT1, YAW1]]) {
      const cam = camera(t, y);
      for (const r of [0, ROUNDS - 1]) for (const c of corners(r)) { const [X, Y] = cam(c); mx = Math.max(mx, Math.abs(X)); my = Math.max(my, Math.abs(Y)); }
    }
    const label = 8 * cw; // room for "round 4" on the left
    scale = Math.min((W - label - cw * 2) / (2 * mx), (H - chh * 2) / (2 * my));
    ox = label + (W - label) / 2; oy = H / 2;
  };

  function draw() {
    const tilt = clamp(lerp(TILT0, TILT1, ease(clamp(p))) + dTilt, 0.12, Math.PI / 2);
    const yaw = lerp(YAW0, YAW1, ease(clamp(p))) + dYaw;
    const cam = camera(tilt, yaw);
    const proj = (q: P3): [number, number, number] => { const [X, Y, z] = cam(q); return [ox + X * scale, oy + Y * scale, z]; };

    const grid = new Map<number, Cell>();
    const cols = Math.ceil(W / cw), rows = Math.ceil(H / chh);
    const put = (sx: number, sy: number, c: Cell) => {
      const cx = Math.round(sx / cw), ry = Math.round(sy / chh);
      if (cx < 0 || ry < 0 || cx >= cols || ry >= rows) return;
      const key = ry * cols + cx, old = grid.get(key);
      if (!old || c.tone >= old.tone) grid.set(key, c);
    };
    // A straight run of characters between two projected points.
    const line = (a: P3, b: P3, tone: Cell['tone'], f = 1, glyph?: string) => {
      const [x0, y0] = proj(a), [xb, yb] = proj(b);
      const x1 = lerp(x0, xb, f), y1 = lerp(y0, yb, f);
      const ax = (x1 - x0) / cw, ay = (y1 - y0) / chh;
      const ch = glyph ?? (Math.abs(ay) < 0.45 * Math.abs(ax) ? '─' : Math.abs(ax) < 0.45 * Math.abs(ay) ? '│' : ax * ay > 0 ? '╲' : '╱');
      const steps = Math.ceil(Math.max(Math.abs(ax), Math.abs(ay)));
      for (let q = 0; q <= steps; q++) {
        const x = lerp(x0, x1, q / steps), y = lerp(y0, y1, q / steps);
        // Shallow runs sit high or low in their cell, so a step down a row reads as a slope, not a gap.
        const fy = y / chh - Math.round(y / chh);
        put(x, y, { ch: ch === '─' ? (fy < -0.22 ? '▔' : fy > 0.22 ? '▁' : '─') : ch, tone });
      }
    };

    // Rounds other than the focus one fade in as the block tilts.
    const shown = (r: number) => r === FOCUS || p - 0.3 - 0.1 * Math.abs(r - FOCUS) > 0;
    const vis = [...Array(ROUNDS).keys()].filter(shown);

    // The code lattice once, on the floor; the time block as a dotted box above it.
    const floor = corners(0), lid = corners(ROUNDS - 1);
    for (let i = 0; i < 4; i++) line(floor[i], floor[(i + 1) % 4], 0, 1, '·');
    for (let k = 0; k < B; k++) { const [sx, sy] = proj(P(...at(k), 0)); put(sx, sy, { ch: '+', tone: 1 }); }
    // Time runs up one post at the leftmost corner: the block's time axis.
    const axis = [0, 1, 2, 3].reduce((m, i) => (proj(floor[i])[0] < proj(floor[m])[0] ? i : m), 0);
    if (vis.length > 1) line(floor[axis], lid[axis], 0, 1, ':');

    // Matching strands, drawn in along their length.
    const grow = clamp(p - 1);
    if (grow > 0) for (const s of strands) {
      const total = s.length - 1;
      for (let i = 0; i < total; i++) { const f = clamp(grow * total - i); if (f > 0) line(s[i], s[i + 1], 2, f); }
    }

    // Detection events sit on top, larger than the grid, with their cells cleared.
    const dots: [number, number][] = [];
    for (const e of events) if (shown(e.r)) {
      const [sx, sy] = proj(P(...at(e.k), e.r));
      grid.delete(Math.round(sy / chh) * cols + Math.round(sx / cw));
      dots.push([Math.round(sx / cw) * cw, Math.round(sy / chh) * chh]);
    }

    ctx.clearRect(0, 0, W, H);
    ctx.font = `${fs}px ${font}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const tones = [[col.faint, 1], [col.mute, 0.75], [col.accent, 0.9], [col.accent, 1]] as const;
    for (const [key, c] of grid) {
      const [color, a] = tones[c.tone];
      ctx.fillStyle = color; ctx.globalAlpha = a;
      ctx.fillText(c.ch, (key % cols) * cw, Math.floor(key / cols) * chh);
    }

    ctx.fillStyle = col.accent; ctx.globalAlpha = 1; ctx.font = `${Math.round(fs * 1.35)}px ${font}`;
    for (const [x, y] of dots) ctx.fillText('●', x, y);

    // Round labels beside the leftmost corner of each labelled plate.
    ctx.fillStyle = col.mute; ctx.textAlign = 'right'; ctx.font = `${fs - 1}px ${font}`;
    const labelled = p < 0.5 ? [FOCUS] : [0, ROUNDS - 1].filter(shown);
    for (const r of labelled) {
      const [x, y] = proj(corners(r)[axis]);
      ctx.globalAlpha = 0.9;
      ctx.fillText(`round ${r}`, x - cw * 1.5, y);
    }
    ctx.globalAlpha = 1;

    const stage = p < 0.5 ? 0 : p < 1.5 ? 1 : 2;
    stages.forEach((b, i) => { b.classList.toggle('on', i === stage); b.setAttribute('aria-pressed', String(i === stage)); });
  }

  // ---- motion -------------------------------------------------------------
  const DUR = 1300; // per stage
  function loop(now: number) {
    const span = Math.abs(target - from) * DUR;
    const f = span ? clamp((now - t0) / span) : 1;
    p = lerp(from, target, f);
    draw();
    raf = f < 1 ? requestAnimationFrame(loop) : 0;
  }
  function go(to: number) {
    target = to;
    if (reduce.matches) { p = to; cancelAnimationFrame(raf); raf = 0; draw(); return; }
    from = p; t0 = performance.now();
    if (!raf) raf = requestAnimationFrame(loop);
  }
  const redraw = () => { if (!raf) draw(); };

  stages.forEach((b, i) => b.addEventListener('click', () => go(i)));
  replay?.addEventListener('click', () => { dYaw = 0; dTilt = 0; p = 0; draw(); go(2); });

  canvas.addEventListener('pointerdown', (e) => {
    drag = { x: e.clientX, y: e.clientY, yaw: dYaw, tilt: dTilt };
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!drag) return;
    dYaw = drag.yaw + (e.clientX - drag.x) * 0.008;
    dTilt = drag.tilt + (e.clientY - drag.y) * 0.006;
    redraw();
  });
  const end = () => { drag = null; };
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', end);
  canvas.addEventListener('keydown', (e) => {
    const k = ({ ArrowLeft: [-0.12, 0], ArrowRight: [0.12, 0], ArrowUp: [0, -0.1], ArrowDown: [0, 0.1] } as Record<string, number[]>)[e.key];
    if (!k) return;
    e.preventDefault(); dYaw += k[0]; dTilt += k[1]; redraw();
  });

  readColors(); resize();
  if (reduce.matches) { p = 2; target = 2; draw(); }
  else {
    draw();
    // Start the tilt once the hero is on screen and the page has settled.
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect(); setTimeout(() => go(2), 700);
    });
    io.observe(root);
  }
  new ResizeObserver(() => { resize(); redraw(); }).observe(canvas);
  document.addEventListener('themechange', () => { readColors(); redraw(); });
  reduce.addEventListener('change', () => { if (reduce.matches) go(2); });
}
