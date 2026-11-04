// A driven transmon, five levels: |0>..|3> hold a ququart (d = 4), |4> is the
// first level outside it. Pure functions, no DOM: the qudit page's ladder uses these.
//
// Frame rotating at the 0-1 frequency w, rotating-wave approximation (w >> |a|).
// Level k sits at a k(k-1)/2, with anharmonicity a < 0, so each transition is
// a lower than the one below: w_{j,j+1} = w + a j. A charge drive couples
// neighbouring levels with matrix elements ~ sqrt(k+1). A square pulse at the
// j <-> j+1 frequency (detuning d = a j from w) with amplitude W is
//
//   H(t) = sum_k a k(k-1)/2 |k><k|  +  (W/2) sum_k sqrt(k+1) (e^{-i d t} |k+1><k| + h.c.)
//
// On resonance it rotates j <-> j+1 by theta = W sqrt(j+1) T. Every other
// transition is driven too, detuned by multiples of a: that off-resonant drive
// is the leakage and level-crosstalk a short pulse cannot avoid. Units: |a| = 1.

export const LEVELS = 5;
export type Pulse = { j: number; theta: number }; // rotate j <-> j+1 by theta
export type Amp = { re: number; im: number }[];

const A = -1; // anharmonicity in units of |a|
const energy = (k: number) => (A * k * (k - 1)) / 2;

/** Evolve `psi` through one square pulse of length T (in 1/|a|), returning
 *  populations sampled `samples` times along the way and the final state. */
export function pulse(psi: Amp, p: Pulse, T: number, samples = 24) {
  const W = p.theta / (Math.sqrt(p.j + 1) * T), d = A * p.j;
  const steps = Math.max(200, Math.ceil(T / 0.004));
  const dt = T / steps;
  let re = psi.map((c) => c.re), im = psi.map((c) => c.im);
  const trace: number[][] = [];
  // dpsi/dt = -i H(t) psi, with H applied matrix-free.
  const deriv = (t: number, r: number[], m: number[]) => {
    const dr = new Array(LEVELS).fill(0), dm = new Array(LEVELS).fill(0);
    const c = Math.cos(d * t), s = Math.sin(d * t);
    for (let k = 0; k < LEVELS; k++) {
      // diagonal: -i E (r + i m) = E m - i E r
      dr[k] += energy(k) * m[k]; dm[k] -= energy(k) * r[k];
      if (k + 1 < LEVELS) {
        const g = (W / 2) * Math.sqrt(k + 1);
        // H[k+1][k] = g e^{-i d t}, H[k][k+1] = g e^{+i d t}
        // (H psi)[k+1] += g (c - i s)(r_k + i m_k);  (H psi)[k] += g (c + i s)(r_{k+1} + i m_{k+1})
        const hr1 = g * (c * r[k] + s * m[k]), hm1 = g * (c * m[k] - s * r[k]);
        const hr0 = g * (c * r[k + 1] - s * m[k + 1]), hm0 = g * (c * m[k + 1] + s * r[k + 1]);
        // -i (hr + i hm) = hm - i hr
        dr[k + 1] += hm1; dm[k + 1] -= hr1;
        dr[k] += hm0; dm[k] -= hr0;
      }
    }
    return [dr, dm];
  };
  const every = Math.max(1, Math.floor(steps / samples));
  for (let n = 0; n < steps; n++) {
    const t = n * dt;
    const [k1r, k1m] = deriv(t, re, im);
    const [k2r, k2m] = deriv(t + dt / 2, re.map((x, i) => x + (dt / 2) * k1r[i]), im.map((x, i) => x + (dt / 2) * k1m[i]));
    const [k3r, k3m] = deriv(t + dt / 2, re.map((x, i) => x + (dt / 2) * k2r[i]), im.map((x, i) => x + (dt / 2) * k2m[i]));
    const [k4r, k4m] = deriv(t + dt, re.map((x, i) => x + dt * k3r[i]), im.map((x, i) => x + dt * k3m[i]));
    re = re.map((x, i) => x + (dt / 6) * (k1r[i] + 2 * k2r[i] + 2 * k3r[i] + k4r[i]));
    im = im.map((x, i) => x + (dt / 6) * (k1m[i] + 2 * k2m[i] + 2 * k3m[i] + k4m[i]));
    if (n % every === 0) trace.push(re.map((x, i) => x * x + im[i] * im[i]));
  }
  const out = re.map((x, i) => ({ re: x, im: im[i] }));
  trace.push(out.map((c) => c.re * c.re + c.im * c.im));
  return { psi: out, trace };
}

export const ground = (): Amp => Array.from({ length: LEVELS }, (_, k) => ({ re: k === 0 ? 1 : 0, im: 0 }));

/** The same sequence with ideal two-level rotations: what the pulses are aiming for. */
export function ideal(seq: Pulse[]): number[] {
  let re = [1, 0, 0, 0, 0], im = [0, 0, 0, 0, 0];
  for (const { j, theta } of seq) {
    // exp(-i theta/2 X) on (j, j+1)
    const c = Math.cos(theta / 2), s = Math.sin(theta / 2);
    const [ar, ai, br, bi] = [re[j], im[j], re[j + 1], im[j + 1]];
    re[j] = c * ar + s * bi; im[j] = c * ai - s * br;
    re[j + 1] = c * br + s * ai; im[j + 1] = c * bi - s * ar;
  }
  return re.map((x, i) => x * x + im[i] * im[i]);
}

/** Two targets built from neighbouring-level rotations, starting in |0>. */
export const targets = {
  climb: { label: 'climb to |3⟩', seq: [{ j: 0, theta: Math.PI }, { j: 1, theta: Math.PI }, { j: 2, theta: Math.PI }] as Pulse[] },
  spread: {
    label: 'equal superposition',
    // 0<->1 sends 3/4 up, 1<->2 sends 2/3 of that up, 2<->3 sends half: 1/4 on each level.
    seq: [{ j: 0, theta: 2 * Math.asin(Math.sqrt(3 / 4)) }, { j: 1, theta: 2 * Math.asin(Math.sqrt(2 / 3)) }, { j: 2, theta: Math.PI / 2 }] as Pulse[],
  },
};

/** Pulse length in ns for a duration in 1/|a|, for a typical |a|/2pi = 200 MHz. */
export const toNs = (T: number) => T / (2 * Math.PI * 0.2);
export const fromNs = (ns: number) => ns * 2 * Math.PI * 0.2;
