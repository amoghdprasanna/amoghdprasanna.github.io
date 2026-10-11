// Tweezer array: atoms load at random, are sorted into a defect-free block,
// and are entangled by a Rydberg pulse. Plays once, then idles. Canvas 2D.

type Atom = { c: number; r: number; x: number; y: number; t0: number; from?: [number, number]; to?: [number, number]; m0?: number; gone?: number };

const COLS = 8, ROWS = 6, B = { c0: 2, c1: 5, r0: 1, r1: 4 };
const T = { load: 300, loadEnd: 1500, sort: 1800, move: 420, stagger: 150, ent: 0, entDur: 1500 };
const inBlock = (c: number, r: number) => c >= B.c0 && c <= B.c1 && r >= B.r0 && r <= B.r1;
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const clamp = (v: number) => Math.max(0, Math.min(1, v));

export function mountTweezer(root: HTMLElement) {
  const canvas = root.querySelector('canvas')!;
  const ctx = canvas.getContext('2d')!;
  const phases = [...root.querySelectorAll<HTMLElement>('[data-phase]')];
  const replay = root.querySelector<HTMLButtonElement>('[data-replay]');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');

  let W = 0, H = 0, dpr = 1, glowK = 1, col = { atom: '#fff', accent: '#a898ff', faint: '#444' };
  let atoms: Atom[] = [], start = 0, raf = 0, visible = true, sortEnd = 0;

  const readColors = () => {
    const s = getComputedStyle(root);
    col = { atom: s.getPropertyValue('--atom').trim(), accent: s.getPropertyValue('--accent').trim(), faint: s.getPropertyValue('--faint').trim() };
    glowK = parseFloat(s.getPropertyValue('--glow')) || 1;
    sprite = null;
  };
  const site = (c: number, r: number): [number, number] => {
    const px = W * 0.09, py = H * 0.1;
    return [px + (c * (W - 2 * px)) / (COLS - 1), py + (r * (H - 2 * py)) / (ROWS - 1)];
  };

  function plan() {
    let filled: [number, number][] = [];
    do {
      filled = [];
      for (let c = 0; c < COLS; c++) for (let r = 0; r < ROWS; r++) if (Math.random() < 0.52) filled.push([c, r]);
    } while (filled.length < 19);
    atoms = filled.map(([c, r]) => ({ c, r, x: c, y: r, t0: T.load + Math.random() * (T.loadEnd - T.load) }));
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
  }

  // One pre-rendered radial glow, stamped with drawImage: gradients per atom per
  // frame are what made the first version expensive on slow phones.
  let sprite: HTMLCanvasElement | null = null;
  function makeSprite() {
    sprite = document.createElement('canvas');
    sprite.width = sprite.height = 128;
    const s = sprite.getContext('2d')!;
    const g = s.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, col.accent); g.addColorStop(1, 'transparent');
    s.fillStyle = g; s.fillRect(0, 0, 128, 128);
  }
  function glow(x: number, y: number, rad: number, _color: string, a: number) {
    if (!sprite) makeSprite();
    ctx.globalAlpha = a * glowK;
    ctx.drawImage(sprite!, x - rad, y - rad, 2 * rad, 2 * rad);
    ctx.globalAlpha = 1;
  }

  function frame(t: number) {
    ctx.clearRect(0, 0, W, H);
    const unit = Math.min(W / COLS, H / ROWS);
    const ent = clamp((t - T.ent) / T.entDur);
    const idle = t > T.ent + T.entDur ? (Math.sin((t - T.ent) / 1400) + 1) / 2 : 0;

    // Rydberg halo over the block
    if (ent > 0) {
      const [x0, y0] = site(B.c0, B.r0), [x1, y1] = site(B.c1, B.r1);
      glow((x0 + x1) / 2, (y0 + y1) / 2, (x1 - x0) * 0.95, col.accent, 0.18 * ent + 0.05 * idle);
    }
    // empty tweezer sites
    ctx.fillStyle = col.faint;
    for (let c = 0; c < COLS; c++) for (let r = 0; r < ROWS; r++) {
      const [x, y] = site(c, r);
      ctx.globalAlpha = clamp(t / T.load);
      ctx.beginPath(); ctx.arc(x, y, Math.max(1, unit * 0.022), 0, 7); ctx.fill();
    }
    ctx.globalAlpha = 1;

    // blockade bonds, drawn in by the pulse front
    if (ent > 0) {
      const front = B.c0 - 0.5 + ent * (B.c1 - B.c0 + 1.5);
      ctx.strokeStyle = col.accent; ctx.lineWidth = 1;
      for (let r = B.r0; r <= B.r1; r++) for (let c = B.c0; c <= B.c1; c++) {
        const [x, y] = site(c, r);
        const a = clamp(front - c) * (0.38 + 0.12 * idle);
        if (a <= 0) continue;
        ctx.globalAlpha = a;
        ctx.beginPath();
        if (c < B.c1) { const [x2] = site(c + 1, r); ctx.moveTo(x, y); ctx.lineTo(x2, y); }
        if (r < B.r1) { const [, y2] = site(c, r + 1); ctx.moveTo(x, y); ctx.lineTo(x, y2); }
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      // the pulse itself, a soft vertical band sweeping across
      if (ent < 1) {
        const [xa] = site(B.c0 - 1, 0), [xb] = site(B.c1 + 1, 0);
        const xp = xa + (xb - xa) * ent;
        const g = ctx.createLinearGradient(xp - unit, 0, xp + unit, 0);
        g.addColorStop(0, 'transparent'); g.addColorStop(0.5, col.accent); g.addColorStop(1, 'transparent');
        const [, ya] = site(0, B.r0), [, yb] = site(0, B.r1);
        ctx.globalAlpha = 0.22 * Math.sin(Math.PI * ent);
        ctx.fillStyle = g; ctx.fillRect(xp - unit, ya - unit, 2 * unit, yb - ya + 2 * unit);
        ctx.globalAlpha = 1;
      }
    }

    // atoms
    for (const a of atoms) {
      if (t < a.t0) continue;
      let c = a.c, r = a.r, alpha = clamp((t - a.t0) / 160);
      if (a.to && a.m0 !== undefined) {
        const p = ease(clamp((t - a.m0) / T.move));
        c = a.from![0] + (a.to[0] - a.from![0]) * p;
        r = a.from![1] + (a.to[1] - a.from![1]) * p;
        if (p > 0 && p < 1) {
          const [x, y] = site(c, r);
          ctx.strokeStyle = col.accent; ctx.globalAlpha = 0.6; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.arc(x, y, unit * 0.16, 0, 7); ctx.stroke(); ctx.globalAlpha = 1;
        }
      }
      if (a.gone !== undefined) alpha *= 1 - clamp((t - a.gone) / 400);
      if (alpha <= 0) continue;
      const [x, y] = site(c, r);
      const bonded = ent > 0 && inBlock(Math.round(c), Math.round(r));
      glow(x, y, unit * (bonded ? 0.3 : 0.22), col.accent, alpha * (bonded ? 0.55 + 0.15 * idle : 0.35));
      ctx.globalAlpha = alpha; ctx.fillStyle = col.atom;
      ctx.beginPath(); ctx.arc(x, y, Math.max(2, unit * 0.05), 0, 7); ctx.fill();
      ctx.globalAlpha = 1;
    }

    // block brackets
    const [bx0, by0] = site(B.c0, B.r0), [bx1, by1] = site(B.c1, B.r1);
    const m = unit * 0.38, l = unit * 0.24;
    ctx.strokeStyle = col.faint; ctx.lineWidth = 1.2; ctx.globalAlpha = clamp((t - 1500) / 500);
    ctx.beginPath();
    for (const [x, y, sx, sy] of [[bx0 - m, by0 - m, 1, 1], [bx1 + m, by0 - m, -1, 1], [bx1 + m, by1 + m, -1, -1], [bx0 - m, by1 + m, 1, -1]]) {
      ctx.moveTo(x, y + sy * l); ctx.lineTo(x, y); ctx.lineTo(x + sx * l, y);
    }
    ctx.stroke(); ctx.globalAlpha = 1;

    const phase = t < T.loadEnd + 200 ? 0 : t < T.ent ? 1 : 2;
    phases.forEach((el, i) => el.classList.toggle('on', i === phase));
  }

  const END = () => T.ent + T.entDur;
  function loop(now: number) {
    if (!start) start = now;
    frame(now - start);
    raf = visible && !document.hidden ? requestAnimationFrame(loop) : 0;
  }
  const run = () => { if (!raf && visible && !reduce.matches) raf = requestAnimationFrame(loop); };
  const still = () => { cancelAnimationFrame(raf); raf = 0; frame(END() + 2200); };

  function play() {
    plan(); start = 0;
    if (reduce.matches) still(); else { cancelAnimationFrame(raf); raf = 0; run(); }
  }

  readColors(); resize();
  const idle = (window as any).requestIdleCallback ?? ((f: () => void) => setTimeout(f, 200));
  if (reduce.matches) play(); else { frame(0); idle(play, { timeout: 900 }); }
  new ResizeObserver(() => { resize(); if (!raf) frame(reduce.matches ? END() + 2200 : performance.now() - start); }).observe(canvas);
  new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    if (visible) run();
  }).observe(root);
  document.addEventListener('visibilitychange', run);
  document.addEventListener('themechange', () => { readColors(); if (!raf) still(); });
  reduce.addEventListener('change', play);
  replay?.addEventListener('click', play);
}
