// A note for whoever opens the browser console: the hero's tweezer lattice in
// ASCII and a few commands. Nothing here runs unless someone types it.
import { site } from '../site';

const art = String.raw`
   ┌                     ┐
     ●┄┄┄●┄┄┄●┄┄┄●
     ┆   ┆   ┆   ┆        Amogh D. Prasanna
     ●┄┄┄●┄┄┄●┄┄┄●        quantum error correction,
     ┆   ┆   ┆   ┆        simulation and complexity
     ●┄┄┄●┄┄┄●┄┄┄●
     ┆   ┆   ┆   ┆        type amogh.help()
     ●┄┄┄●┄┄┄●┄┄┄●
   └                     ┘`;

const commands = {
  help() {
    console.log([
      'amogh.email()    my email address',
      'amogh.cv()       open the CV (PDF)',
      'amogh.source()   this site\'s source on GitHub',
      'amogh.theme(t)   switch theme: "light" or "dark"',
      'amogh.decode()   try the surface-code decoder',
    ].join('\n'));
  },
  email() { return site.email; },
  cv() { open(site.links.cv, '_blank'); },
  source() { open(`${site.links.github}/amoghdprasanna.github.io`, '_blank'); },
  theme(t: 'light' | 'dark') {
    if (t !== 'light' && t !== 'dark') return 'use "light" or "dark"';
    const btn = document.querySelector<HTMLButtonElement>('[data-theme-toggle]');
    if (btn && document.documentElement.dataset.theme !== t) btn.click();
    return t;
  },
  decode() { location.href = '/research/topological-decoding/#decoder'; },
};

if (!(window as any).amogh) {
  (window as any).amogh = commands;
  const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#8b7cf6';
  console.log(`%c${art}`, `color: ${accent}; font-family: ui-monospace, monospace; line-height: 1.25`);
}
