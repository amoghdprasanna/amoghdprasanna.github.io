// A qubit to play with. The state is a Bloch vector r (|r| <= 1, so mixed
// states are allowed). Gates are exact rotations, measurement samples the Born
// rule, and noise applies T1 relaxation toward |0> plus T2 dephasing. Each point
// on the shell is lit by the Husimi function of the state, Q(n) = (1 + r·n) / 2,
// and drifts off the shell as the state loses purity.

type V = [number, number, number];
const dot = (a: V, b: V) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const len = (a: V) => Math.hypot(a[0], a[1], a[2]);
const clamp = (v: number, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, v));

// Rotate v about unit axis k by angle a (Rodrigues).
function rot(v: V, k: V, a: number): V {
  const c = Math.cos(a), s = Math.sin(a), d = dot(k, v) * (1 - c);
  return [
    v[0] * c + (k[1] * v[2] - k[2] * v[1]) * s + k[0] * d,
    v[1] * c + (k[2] * v[0] - k[0] * v[2]) * s + k[1] * d,
    v[2] * c + (k[0] * v[1] - k[1] * v[0]) * s + k[2] * d,
  ];
}

const R2 = Math.SQRT1_2;
const GATES: Record<string, [V, number]> = {
  X: [[1, 0, 0], Math.PI], Y: [[0, 1, 0], Math.PI], Z: [[0, 0, 1], Math.PI],
  H: [[R2, 0, R2], Math.PI], S: [[0, 0, 1], Math.PI / 2], T: [[0, 0, 1], Math.PI / 4],
};
const NAMED: [string, V][] = [
  ['|0⟩', [0, 0, 1]], ['|1⟩', [0, 0, -1]], ['|+⟩', [1, 0, 0]], ['|−⟩', [-1, 0, 0]], ['|+i⟩', [0, 1, 0]], ['|−i⟩', [0, -1, 0]],
];

export function mountBloch(root: HTMLElement) {
  const canvas = root.querySelector('canvas')!;
  const ctx = canvas.getContext('2d')!;
  const out = {
    state: root.querySelector('[data-out=state]')!, p0: root.querySelector('[data-out=p0]')!,
    purity: root.querySelector('[data-out=purity]')!, coh: root.querySelector('[data-out=coh]')!,
    live: root.querySelector('[data-out=live]')!, last: root.querySelector('[data-out=last]')!,
  };
  const noise = root.querySelector<HTMLInputElement>('[data-noise]')!;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');

  let r: V = [0, 0, 1];
  let anim: { from: V; k: V; a: number; t0: number; dur: number } | null = null;
  let yaw = -0.6, pitch = 0.32, drag: { x: number; y: number; yaw: number; pitch: number } | null = null;
  let W = 0, dpr = 1, raf = 0, visible = false, last = 0, clock = 0, idleSince = 0;
  let col = { accent: '#a898ff', fg: '#eee', faint: '#444', mute: '#999' }, glowK = 1;

  // Points on the shell (Fibonacci sphere), each with its own drift direction.
  const N = matchMedia('(max-width: 40rem)').matches ? 520 : 900;
  const pts: { n: V; d: V; ph: number }[] = [];
  const ga = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < N; i++) {
    const z = 1 - (2 * (i + 0.5)) / N, rr = Math.sqrt(1 - z * z), th = ga * i;
    const u = Math.random() * 2 - 1, phi = Math.random() * Math.PI * 2, s = Math.sqrt(1 - u * u);
    pts.push({ n: [rr * Math.cos(th), rr * Math.sin(th), z], d: [s * Math.cos(phi), s * Math.sin(phi), u], ph: Math.random() * 6.28 });
  }

  const readColors = () => {
    const s = getComputedStyle(root);
    col = { accent: s.getPropertyValue('--accent').trim(), fg: s.getPropertyValue('--fg').trim(), faint: s.getPropertyValue('--faint').trim(), mute: s.getPropertyValue('--mute').trim() };
    glowK = parseFloat(s.getPropertyValue('--glow')) || 1;
  };
  const resize = () => {
    const b = canvas.getBoundingClientRect();
    dpr = Math.min(devicePixelRatio || 1, 2); W = b.width;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(W * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  // World: z up. Rotate about z by yaw, then tilt by pitch. Returns screen x, y, depth.
  function proj(v: V): [number, number, number] {
    const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
    const x1 = v[0] * cy - v[1] * sy, y1 = v[0] * sy + v[1] * cy;
    const depth = y1 * cp - v[2] * sp, up = y1 * sp + v[2] * cp;
    const R = W * 0.34;
    return [W / 2 + x1 * R, W / 2 - up * R, depth];
  }

  function line(a: V, b: V, steps = 1) {
    ctx.beginPath();
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const [x, y] = proj([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]);
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.stroke();
  }
  function ring(f: (t: number) => V) {
    ctx.beginPath();
    for (let i = 0; i <= 96; i++) { const [x, y] = proj(f((i / 96) * Math.PI * 2)); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
    ctx.stroke();
  }
  function label(v: V, s: string) {
    const [x, y, d] = proj(v);
    ctx.globalAlpha = d > 0.2 ? 0.45 : 0.9;
    ctx.fillText(s, x, y);
    ctx.globalAlpha = 1;
  }

  function draw() {
    ctx.clearRect(0, 0, W, W);
    const m = Math.min(1, len(r)), mixed = 1 - m;
    // axes and guides
    ctx.strokeStyle = col.faint; ctx.lineWidth = 1;
    line([0, 0, -1.18], [0, 0, 1.18]); line([-1.18, 0, 0], [1.18, 0, 0]); line([0, -1.18, 0], [0, 1.18, 0]);
    ctx.globalAlpha = 0.8 * (1 - mixed * 0.6);
    ring((t) => [Math.cos(t), Math.sin(t), 0]);
    ring((t) => [Math.cos(t), 0, Math.sin(t)]);
    ctx.globalAlpha = 1;
    ctx.font = `500 ${Math.max(11, W * 0.03)}px ${getComputedStyle(root).getPropertyValue('--mono') || 'monospace'}`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = col.mute;
    label([0, 0, 1.3], '|0⟩'); label([0, 0, -1.3], '|1⟩'); label([1.32, 0, 0], '|+⟩'); label([0, 1.32, 0], '|+i⟩');

    // the shell
    const rr: V = m > 1e-6 ? r : [0, 0, 0];
    const spread = Math.pow(mixed, 0.8) * 0.55;
    const sorted = pts.map((p) => {
      const wob = reduce.matches ? 1 : Math.sin(clock * 0.0011 + p.ph) * 0.5 + 0.5;
      const k = spread * (0.6 + 0.4 * wob);
      const v: V = [p.n[0] + p.d[0] * k, p.n[1] + p.d[1] * k, p.n[2] + p.d[2] * k];
      const q = (1 + dot(rr, p.n)) / 2; // Husimi Q, in [0, 1]
      const [x, y, d] = proj(v);
      return { x, y, d, q };
    }).sort((a, b) => b.d - a.d);
    const size = Math.max(1.2, W * 0.0042);
    for (const p of sorted) {
      const front = clamp(0.55 - p.d * 0.45, 0.15, 1);
      ctx.globalAlpha = front * (0.18 + 0.82 * Math.pow(p.q, 2.2));
      ctx.fillStyle = p.q > 0.55 ? col.accent : col.fg;
      ctx.fillRect(p.x - size / 2, p.y - size / 2, size, size);
    }
    ctx.globalAlpha = 1;

    // the Bloch vector
    const [cx, cy] = proj([0, 0, 0]), [tx, ty] = proj(r);
    ctx.strokeStyle = col.accent; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(tx, ty); ctx.stroke();
    const g = ctx.createRadialGradient(tx, ty, 0, tx, ty, W * 0.05);
    g.addColorStop(0, col.accent); g.addColorStop(1, 'transparent');
    ctx.fillStyle = g; ctx.globalAlpha = (0.5 + 0.5 * m) * glowK;
    ctx.beginPath(); ctx.arc(tx, ty, W * 0.05, 0, 7); ctx.fill();
    ctx.globalAlpha = 1; ctx.fillStyle = col.fg;
    ctx.beginPath(); ctx.arc(tx, ty, Math.max(2.5, W * 0.008), 0, 7); ctx.fill();
  }

  function readout() {
    const m = len(r), p0 = (1 + r[2]) / 2, purity = (1 + m * m) / 2, coh = Math.hypot(r[0], r[1]);
    let name = m < 0.02 ? 'maximally mixed' : m < 0.97 ? 'mixed' : 'superposition';
    if (m >= 0.97) for (const [s, v] of NAMED) if (dot(r, v) / m > 0.995) name = s;
    out.state.textContent = name;
    out.p0.textContent = p0.toFixed(2);
    out.purity.textContent = purity.toFixed(2);
    out.coh.textContent = coh.toFixed(2);
    return name;
  }

  function step(now: number) {
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 0;
    last = now; clock = now;
    if (anim) {
      const p = clamp((now - anim.t0) / anim.dur);
      const e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
      r = rot(anim.from, anim.k, anim.a * e);
      const n = len(r); if (n > 1) r = [r[0] / n, r[1] / n, r[2] / n];
      if (p >= 1) anim = null;
    }
    const g = +noise.value / 100;
    if (g > 0 && !anim) {
      const g1 = g * 0.35, g2 = g * 1.1; // T1 and pure-dephasing rates, per second
      const a = Math.exp(-(g1 / 2 + g2) * dt);
      r = [r[0] * a, r[1] * a, 1 - (1 - r[2]) * Math.exp(-g1 * dt)];
    }
    if (!drag && !reduce.matches && now - idleSince > 2500) yaw += dt * 0.12;
    readout(); draw();
    raf = visible && !document.hidden ? requestAnimationFrame(step) : 0;
  }
  const kick = () => { if (!raf && visible) { last = 0; raf = requestAnimationFrame(step); } };

  function apply(gate: string) {
    if (gate === 'M') {
      const p0 = (1 + r[2]) / 2, one = Math.random() >= p0;
      anim = null; r = [0, 0, one ? -1 : 1];
      out.last.textContent = `measured ${one ? 1 : 0}`;
      out.live.textContent = `Measured ${one ? 1 : 0}, with probability ${(one ? 1 - p0 : p0).toFixed(2)}. The state is now |${one ? 1 : 0}⟩.`;
    } else if (gate === 'R') {
      anim = null; r = [0, 0, 1]; noise.value = '0';
      out.last.textContent = 'reset to |0⟩';
      out.live.textContent = 'Reset to |0⟩.';
    } else {
      const [k, a] = GATES[gate];
      const from = anim ? rot(anim.from, anim.k, anim.a) : r; // finish any rotation in flight
      if (reduce.matches) { r = rot(from, k, a); const n = len(r); if (n > 1) r = [r[0] / n, r[1] / n, r[2] / n]; anim = null; }
      else anim = { from, k, a, t0: performance.now(), dur: 520 };
      out.last.textContent = `applied ${gate}`;
      const end = rot(from, k, a);
      const m = len(end);
      out.live.textContent = `Applied ${gate}. P(0) is now ${((1 + end[2]) / 2).toFixed(2)}${m < 0.97 ? ', state is mixed' : ''}.`;
    }
    idleSince = performance.now();
    kick(); if (!visible) { readout(); draw(); }
  }

  root.querySelectorAll<HTMLButtonElement>('[data-gate]').forEach((b) => b.addEventListener('click', () => apply(b.dataset.gate!)));
  noise.addEventListener('input', () => {
    const g = +noise.value;
    noise.setAttribute('aria-valuetext', g === 0 ? 'off' : `${g} percent`);
    kick();
  });

  canvas.addEventListener('pointerdown', (e) => {
    drag = { x: e.clientX, y: e.clientY, yaw, pitch };
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!drag) return;
    yaw = drag.yaw + (e.clientX - drag.x) * 0.01;
    pitch = clamp(drag.pitch + (e.clientY - drag.y) * 0.01, -1.3, 1.3);
    idleSince = performance.now();
    if (!raf) { readout(); draw(); }
  });
  const end = () => { drag = null; idleSince = performance.now(); };
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', end);
  canvas.addEventListener('keydown', (e) => {
    const k = { ArrowLeft: [-0.15, 0], ArrowRight: [0.15, 0], ArrowUp: [0, -0.12], ArrowDown: [0, 0.12] }[e.key];
    if (!k) return;
    e.preventDefault();
    yaw += k[0]; pitch = clamp(pitch + k[1], -1.3, 1.3); idleSince = performance.now();
    if (!raf) { readout(); draw(); }
  });

  readColors(); resize(); readout(); draw();
  new ResizeObserver(() => { resize(); draw(); }).observe(canvas);
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) kick(); }, { rootMargin: '100px' }).observe(canvas);
  document.addEventListener('visibilitychange', kick);
  document.addEventListener('themechange', () => { readColors(); draw(); });
}
