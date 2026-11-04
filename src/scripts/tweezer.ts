// Tweezer array, drawn in monospace characters: atoms load into an 8 x 6 grid
// of optical traps at random, are moved into a defect-free 4 x 4 block, and
// are entangled by a Rydberg pulse that sweeps across it. Plays once, then the
// entangled block breathes gently. Canvas 2D: a soft violet glow layer under a
// grid of glyphs, one glyph per character cell.

type Atom = { c: number; r: number; t0: number; from?: [number, number]; to?: [number, number]; m0?: number; gone?: number };
type Tone = 'faint' | 'mute' | 'atom' | 'accent';

const COLS = 8, ROWS = 6, B = { c0: 2, c1: 5, r0: 1, r1: 4 };
const T = { load: 300, loadEnd: 1500, sort: 1800, move: 520, stagger: 170, ent: 0, entDur: 1500 };
const inBlock = (c: number, r: number) => c >= B.c0 && c <= B.c1 && r >= B.r0 && r <= B.r1;
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const clamp = (v: number) => Math.max(0, Math.min(1, v));
// An atom types itself in, and dissolves the same way out.
const LOAD = ['·', '∘', '•', '●'];

export function mountTweezer(root: HTMLElement) {
  const canvas = root.querySelector('canvas')!;
  const ctx = canvas.getContext('2d')!;
  const phases = [...root.querySelectorAll<HTMLElement>('[data-phase]')];
  const replay = root.querySelector<HTMLButtonElement>('[data-replay]');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');

  let W = 0, H = 0, dpr = 1, fs = 14, cw = 8, ch = 16, font = 'monospace';
  let col: Record<Tone, string> = { faint: '#444', mute: '#999', atom: '#fff', accent: '#a898ff' };
  let atoms: Atom[] = [], start = 0, raf = 0, visible = true, sortEnd = 0, glowK = 1;

  const readColors = () => {
    const s = getComputedStyle(root);
    const v = (n: string) => s.getPropertyValue(n).trim();
    col = { faint: v('--faint'), mute: v('--mute'), atom: v('--atom'), accent: v('--accent') };
    glowK = parseFloat(v('--glow')) || 1; // full in dark, softer in light
    sprite = null;
    font = getComputedStyle(phases[0] ?? root).fontFamily;
  };
  // Trap sites sit on character cells with a whole number of cells between
  // them, so every row and column of the lattice is evenly spaced.
  let sx = 7, sy = 4, ox = 0, oy = 0;
  const layout = () => {
    const cols = Math.floor(W / cw), rows = Math.floor(H / ch);
    sx = Math.max(3, Math.floor((cols * 0.84) / (COLS - 1)));
    sy = Math.max(2, Math.floor((rows * 0.8) / (ROWS - 1)));
    ox = Math.floor((cols - sx * (COLS - 1)) / 2); oy = Math.floor((rows - sy * (ROWS - 1)) / 2);
  };
  const site = (c: number, r: number): [number, number] => [ox + c * sx, oy + r * sy];

  function plan() {
    let filled: [number, number][] = [];
    do {
      filled = [];
      for (let c = 0; c < COLS; c++) for (let r = 0; r < ROWS; r++) if (Math.random() < 0.52) filled.push([c, r]);
    } while (filled.length < 19);
    atoms = filled.map(([c, r]) => ({ c, r, t0: T.load + Math.random() * (T.loadEnd - T.load) }));
    const holes: [number, number][] = [];
    for (let r = B.r0; r <= B.r1; r++) for (let c = B.c0; c <= B.c1; c++) if (!atoms.some((a) => a.c === c && a.r === r)) holes.push([c, r]);
    const spare = atoms.filter((a) => !inBlock(a.c, a.r));
    let k = 0;
    for (const h of holes) {
      spare.sort((a, b) => Math.hypot(a.c - h[0], a.r - h[1]) - Math.hypot(b.c - h[0], b.r - h[1]));
      const a = spare.shift()!;
      a.from = [a.c, a.r]; a.to = h; a.m0 = T.sort + k++ * T.stagger;
    }
    sortEnd = T.sort + Math.max(0, k - 1) * T.stagger + T.move;
    for (const a of spare) a.gone = sortEnd;
    T.ent = sortEnd + 350;
  }

  function resize() {
    const r = canvas.getBoundingClientRect();
    dpr = Math.min(devicePixelRatio || 1, 2);
    W = r.width; H = r.height;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    fs = W < 420 ? 12 : 14; cw = fs * 0.6; ch = fs * 1.25;
    layout();
  }

  // One pre-rendered radial glow, stamped with drawImage (a gradient per atom
  // per frame is what made the first version slow on phones).
  let sprite: HTMLCanvasElement | null = null;
  const glowAt = (x: number, y: number, rad: number, a: number) => {
    if (!sprite) {
      sprite = document.createElement('canvas'); sprite.width = sprite.height = 128;
      const s = sprite.getContext('2d')!, g = s.createRadialGradient(64, 64, 0, 64, 64, 64);
      // Fade to the accent at zero alpha, not to 'transparent' (black), or the edge goes grey.
      const clear = col.accent.replace(/\)\s*$/, ' / 0)').replace(/\s*\/\s*[\d.]+%?\s*\/ 0\)$/, ' / 0)');
      g.addColorStop(0, col.accent); g.addColorStop(1, clear);
      s.fillStyle = g; s.fillRect(0, 0, 128, 128);
    }
    ctx.globalAlpha = a * glowK;
    ctx.drawImage(sprite, x - rad, y - rad, 2 * rad, 2 * rad);
  };
  const px = (x: number, y: number): [number, number] => [x * cw + cw / 2, y * ch + ch / 2];

  function frame(t: number) {
    // Glows go on first, under the glyphs. One glyph per cell; later writes win.
    const glows: [number, number, number, number][] = [];
    const cells = new Map<string, [string, Tone, number]>();
    const put = (x: number, y: number, g: string, tone: Tone, a = 1) => { if (a > 0.02) cells.set(`${x},${y}`, [g, tone, a]); };

    const ent = clamp((t - T.ent) / T.entDur);
    const [bx0, by0] = site(B.c0, B.r0), [bx1, by1] = site(B.c1, B.r1);
    const front = bx0 - 2 + ent * (bx1 - bx0 + 4); // pulse position, in cells
    const idle = t > T.ent + T.entDur ? (Math.sin((t - T.ent - T.entDur) / 1400 - Math.PI / 2) + 1) / 2 : 0;
    const [hx0, hy0] = px(bx0, by0), [hx1, hy1] = px(bx1, by1);
    // Halo over the entangled block.
    if (ent > 0) glows.push([(hx0 + hx1) / 2, (hy0 + hy1) / 2, (hx1 - hx0) * 0.95, 0.16 * ent + 0.06 * idle]);

    // Empty traps.
    const traps = clamp(t / T.load);
    for (let c = 0; c < COLS; c++) for (let r = 0; r < ROWS; r++) { const [x, y] = site(c, r); put(x, y, '·', 'faint', traps); }

    // Corner brackets around the target block.
    const br = clamp((t - 1500) / 500);
    put(bx0 - 2, by0 - 1, '┌', 'faint', br); put(bx1 + 2, by0 - 1, '┐', 'faint', br);
    put(bx0 - 2, by1 + 1, '└', 'faint', br); put(bx1 + 2, by1 + 1, '┘', 'faint', br);

    // The Rydberg pulse: a column sweeping across the block, leaving bonds behind it.
    if (ent > 0) {
      for (let r = B.r0; r <= B.r1; r++) for (let c = B.c0; c <= B.c1; c++) {
        const [x, y] = site(c, r);
        const bond = 0.5 + 0.2 * idle;
        if (c < B.c1) { const [x2] = site(c + 1, r); for (let i = x + 1; i < x2; i++) if (i < front) put(i, y, '┄', 'accent', bond); }
        if (r < B.r1 && x < front) { const [, y2] = site(c, r + 1); for (let j = y + 1; j < y2; j++) put(x, j, '┆', 'accent', bond); }
      }
      if (ent < 1) {
        for (let j = by0 - 1; j <= by1 + 1; j++) put(Math.round(front), j, '┊', 'accent', 0.7 * Math.sin(Math.PI * ent));
        const [fx] = px(front, 0);
        for (let j = by0; j <= by1; j += 1) glows.push([fx, px(0, j)[1], ch * 1.6, 0.12 * Math.sin(Math.PI * ent)]);
      }
    }

    // Atoms.
    for (const a of atoms) {
      if (t < a.t0) continue;
      let g = LOAD[Math.min(LOAD.length - 1, Math.floor((t - a.t0) / 70))];
      let c = a.c, r = a.r;
      if (a.to && a.m0 !== undefined && t >= a.m0) {
        const p = ease(clamp((t - a.m0) / T.move));
        if (p < 1) {
          // Carried in a tweezer: brackets around the atom, a short fading trail behind it.
          const [fx, fy] = site(a.from![0], a.from![1]), [tx, ty] = site(a.to[0], a.to[1]);
          for (let k = 6; k >= 1; k--) {
            const q = ease(clamp((t - a.m0 - k * 28) / T.move));
            put(Math.round(fx + (tx - fx) * q), Math.round(fy + (ty - fy) * q), '·', 'accent', 0.5 * (1 - k / 7));
          }
          const x = Math.round(fx + (tx - fx) * p), y = Math.round(fy + (ty - fy) * p);
          put(x - 1, y, '(', 'accent'); put(x + 1, y, ')', 'accent'); put(x, y, '●', 'atom');
          glows.push([...px(x, y), cw * 2.4, 0.35]);
          continue;
        }
        [c, r] = a.to;
      }
      if (a.gone !== undefined && t > a.gone) {
        const out = Math.floor((t - a.gone) / 90);
        if (out >= LOAD.length) continue;
        g = LOAD[LOAD.length - 1 - out];
      }
      const [x, y] = site(c, r);
      const bonded = ent > 0 && inBlock(c, r) && x < front;
      put(x, y, g, bonded ? 'accent' : 'atom');
      const grown = LOAD.indexOf(g) / (LOAD.length - 1);
      glows.push([...px(x, y), cw * (bonded ? 2.6 : 2.1), grown * (bonded ? 0.3 + 0.1 * idle : 0.22)]);
    }

    ctx.clearRect(0, 0, W, H);
    for (const [x, y, rad, a] of glows) if (a > 0.01) glowAt(x, y, rad, a);
    // Filled atoms are set a size up from the grid so they carry the figure.
    const small = `${fs}px ${font}`, big = `${Math.round(fs * 1.35)}px ${font}`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (const [key, [g, tone, a]] of cells) {
      const [x, y] = key.split(',').map(Number);
      ctx.font = g === '●' ? big : small;
      ctx.globalAlpha = a; ctx.fillStyle = col[tone];
      ctx.fillText(g, x * cw + cw / 2, y * ch + ch / 2);
    }
    ctx.globalAlpha = 1;

    const phase = t < T.loadEnd + 200 ? 0 : t < T.ent ? 1 : 2;
    phases.forEach((el, i) => el.classList.toggle('on', i === phase));
  }

  const END = () => T.ent + T.entDur;
  function loop(now: number) {
    if (!start) start = now;
    const t = now - start;
    frame(t);
    // After the sequence the block keeps breathing, only while it is on screen.
    raf = visible && !document.hidden ? requestAnimationFrame(loop) : 0;
  }
  const done = () => start > 0 && performance.now() - start >= END();
  const run = () => { if (!raf && visible && !document.hidden && !reduce.matches) raf = requestAnimationFrame(loop); };
  const still = () => { cancelAnimationFrame(raf); raf = 0; frame(END()); };

  function play() {
    plan(); start = 0;
    if (reduce.matches) still(); else { cancelAnimationFrame(raf); raf = 0; run(); }
  }

  readColors(); resize();
  const idle = (window as any).requestIdleCallback ?? ((f: () => void) => setTimeout(f, 200));
  if (reduce.matches) play(); else { frame(0); idle(play, { timeout: 900 }); }
  const settled = () => (reduce.matches || done() ? END() : start ? performance.now() - start : 0);
  new ResizeObserver(() => { resize(); if (!raf) frame(settled()); }).observe(canvas);
  new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    if (visible) run();
  }).observe(root);
  document.addEventListener('visibilitychange', run);
  document.addEventListener('themechange', () => { readColors(); if (!raf) frame(settled()); });
  reduce.addEventListener('change', play);
  replay?.addEventListener('click', play);
}
