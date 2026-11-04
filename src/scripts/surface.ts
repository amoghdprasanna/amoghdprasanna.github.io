// A distance-d rotated surface code, X errors only, perfect measurements.
// Pure functions, no DOM: the toy on the decoding page draws from these.
//
// Data qubit (i, j), 0 <= i, j < d. Plaquette (u, v), 0 <= u, v <= d, covers
// data qubits (u-1..u, v-1..v). Z-type plaquettes (u + v even) detect X errors:
// the weight-4 ones in the bulk plus weight-2 ones on the top and bottom edges.
// The left and right edges have no Z checks, so X-error chains can end there;
// a chain from left to right is the logical X.

export type Q = readonly [number, number];
export const key = ([i, j]: Q) => `${i},${j}`;

export function surfaceCode(d = 5) {
  const checks: [number, number][] = [];
  for (let u = 0; u <= d; u++) for (let v = 0; v <= d; v++) {
    const bulk = u >= 1 && u <= d - 1 && v >= 1 && v <= d - 1;
    const edge = (v === 0 || v === d) && u >= 1 && u <= d - 1;
    if ((bulk || edge) && (u + v) % 2 === 0) checks.push([u, v]);
  }
  const B = checks.length; // the boundary, as one extra node
  const touching = (i: number, j: number) =>
    checks.flatMap(([u, v], k) => (i >= u - 1 && i <= u && j >= v - 1 && j <= v ? [k] : []));

  // Check graph: an edge per data qubit, between its two checks or to the boundary.
  const adj: { to: number; q: Q }[][] = Array.from({ length: B + 1 }, () => []);
  for (let i = 0; i < d; i++) for (let j = 0; j < d; j++) {
    const ks = touching(i, j);
    const [a, b] = ks.length === 2 ? ks : [ks[0], B];
    adj[a].push({ to: b, q: [i, j] }); adj[b].push({ to: a, q: [i, j] });
  }
  // Shortest paths from every check, remembering the data qubit on each step.
  const trees = checks.map((_, s) => {
    const dist = new Array(B + 1).fill(Infinity), prev = new Array(B + 1).fill(-1);
    const via: (Q | null)[] = new Array(B + 1).fill(null);
    dist[s] = 0;
    const queue = [s];
    while (queue.length) {
      const x = queue.shift()!;
      for (const { to, q } of adj[x]) if (dist[to] === Infinity) { dist[to] = dist[x] + 1; prev[to] = x; via[to] = q; queue.push(to); }
    }
    return { dist, prev, via };
  });
  const path = (s: number, t: number): Q[] => {
    const out: Q[] = [];
    for (let x = t; x !== s; x = trees[s].prev[x]) out.push(trees[s].via[x]!);
    return out;
  };

  /** Indices of the checks an X-error set flips. */
  function syndrome(errors: Iterable<Q>): number[] {
    const flip = new Array(B).fill(0);
    for (const [i, j] of errors) for (const k of touching(i, j)) flip[k] ^= 1;
    return flip.flatMap((f, k) => (f ? [k] : []));
  }

  /** Exact minimum-weight perfect matching of the defects, each to another
   *  defect or to the boundary, and the X correction it implies. */
  function decode(defects: number[]) {
    const n = defects.length;
    const memo = new Map<number, [number, [number, number][]]>();
    const solve = (mask: number): [number, [number, number][]] => {
      if (mask === (1 << n) - 1) return [0, []];
      const hit = memo.get(mask); if (hit) return hit;
      let i = 0; while (mask >> i & 1) i++;
      const [c0, p0] = solve(mask | 1 << i);
      let best: [number, [number, number][]] = [trees[defects[i]].dist[B] + c0, [[i, -1], ...p0]];
      for (let j = i + 1; j < n; j++) if (!(mask >> j & 1)) {
        const [c, p] = solve(mask | 1 << i | 1 << j);
        const w = trees[defects[i]].dist[defects[j]] + c;
        if (w < best[0]) best = [w, [[i, j], ...p]];
      }
      memo.set(mask, best);
      return best;
    };
    const [weight, pairs] = solve(0);
    const correction = new Set<string>();
    for (const [a, b] of pairs) for (const q of path(defects[a], b < 0 ? B : defects[b])) {
      const k = key(q); if (correction.has(k)) correction.delete(k); else correction.add(k);
    }
    return { weight, pairs: pairs.map(([a, b]) => [defects[a], b < 0 ? -1 : defects[b]] as const), correction };
  }

  /** For a syndrome-free X pattern: does it flip the logical qubit? Logical Z
   *  is Z on a column of data qubits, so count the pattern's X's in column 0. */
  const flipsLogical = (xs: Iterable<string>) => [...xs].filter((k) => k.startsWith('0,')).length % 2 === 1;

  return { d, checks, syndrome, decode, flipsLogical };
}
