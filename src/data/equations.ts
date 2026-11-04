// What each handwritten equation says, in a sentence or two. Shown when a
// visitor taps or focuses the equation (src/components/EqCard.astro).
// Keep these precise: they are the plain-language version of the maths.

export const meanings: Record<string, { title: string; text: string }> = {
  'eq-qudit': {
    title: 'compiling a qudit gate',
    text: 'A target operation U on a d-level qudit, written as a sequence of N operations the hardware can actually do, with U₁ applied first. Compiling means choosing those factors so the product comes close to U.',
  },
  'eq-gkp': {
    title: 'the GKP code',
    text: 'The two stabilizers of the square Gottesman-Kitaev-Preskill code: shifts of an oscillator by 2√π in position and in momentum. The states both leave unchanged form a grid that encodes one qubit, and any shift smaller than √π/2 in either direction can be detected and undone.',
  },
  'eq-trotter': {
    title: 'a Trotter step',
    text: 'To simulate evolution under H = Σₖ Hₖ, apply each term on its own for a short time t/n and repeat n times. The error falls like t²/n and is set by how far the terms fail to commute.',
  },
  'eq-bpp': {
    title: 'where quantum computers sit',
    text: 'Problems a randomized classical computer solves efficiently (BPP) are also solved efficiently by a quantum computer (BQP), and those all lie inside PP. Both inclusions are proven; whether either is strict is still open.',
  },
  'eq-kl': {
    title: 'the Kullback-Leibler divergence',
    text: 'How far the model qθ is from the data distribution p: the expected log-ratio of the two under p. It is zero only when they match, and it is not symmetric in p and q.',
  },
  'eq-loss': {
    title: 'the training objective',
    text: 'One minus the overlap between the target U and the compiled sequence V(θ), counted only on the qudit levels (P projects onto them), plus a penalty λ on the population that leaks out of those levels.',
  },
};
