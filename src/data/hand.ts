// Notes I've written out by hand (tools/ink/notebook.json). A margin note or
// ink caption whose text matches one of these is drawn in my handwriting;
// anything else falls back to the Caveat font.
const hand: Record<string, string> = {
  "what i'm working on a qudit unitary compiled into native gates": 'note-working-on',
  'gates not depth are the budget': 'note-budget',
  'the objective leakage included': 'note-objective',
  'the number i report': 'note-report',
  'most likely error not just the smallest': 'note-likely-error',
  'a qubit inside an oscillator': 'note-oscillator',
  'where the line sits': 'note-line',
  'start here': 'note-start-here',
  'where it all started': 'note-all-started',
  "schrödinger's cat gloves on": 'note-cat',
  'pure until the noise arrives': 'note-pure',
};

const entities: Record<string, string> = { '&#39;': "'", '&apos;': "'", '&quot;': '"', '&amp;': '&', '&lt;': '<', '&gt;': '>' };
export const plain = (html: string) =>
  html.replace(/<[^>]+>/g, '').replace(/&#39;|&apos;|&quot;|&amp;|&lt;|&gt;/g, (m) => entities[m]).trim();
const key = (s: string) =>
  plain(s).toLowerCase().replace(/’/g, "'").replace(/[^a-zà-ÿ' ]+/g, ' ').replace(/\s+/g, ' ').trim();

export const handFor = (text: string): string | undefined => hand[key(text)];
