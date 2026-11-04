// Renders public/og.png (1200x630) from the running site's hero, so the share
// image uses the real fonts and the real tweezer array.
// Usage: npm run build && npx astro preview, then in another shell:
//   npx -y -p puppeteer-core@23.11.1 node tools/og/og.mjs [chrome path]
import puppeteer from 'puppeteer-core';
const chrome = process.argv[2] ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const b = await puppeteer.launch({ executablePath: chrome, headless: true });
const p = await b.newPage();
await p.setViewport({ width: 1200, height: 630, deviceScaleFactor: 1 });
await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'dark' }, { name: 'prefers-reduced-motion', value: 'reduce' }]);
await p.goto('http://localhost:4321/', { waitUntil: 'networkidle0' });
await p.evaluate(async () => {
  await document.fonts.ready;
  const src = document.querySelector('[data-tweezer] canvas');
  const img = src.toDataURL('image/png');
  const eq = document.querySelector('.working .ink').innerHTML;
  document.body.innerHTML = `
  <div id="og" style="width:1200px;height:630px;display:grid;grid-template-columns:1.2fr 1fr;align-items:center;gap:40px;padding:0 72px;box-sizing:border-box;background:var(--bg);background-image:radial-gradient(var(--dot) 1px,transparent 1px);background-size:24px 24px;position:relative">
    <div>
      <p style="font:500 28px var(--serif);color:var(--fg);margin:0 0 18px">Amogh D. Prasanna</p>
      <p style="font:340 64px/1.04 var(--serif);letter-spacing:-0.025em;color:var(--fg);margin:0">Teaching noisy quantum hardware to compute <em style="color:var(--accent)">correctly.</em></p>
      <p style="font:450 15px var(--mono);letter-spacing:.06em;text-transform:uppercase;color:var(--mute);margin:30px 0 0">Graduate researcher · University of Maryland</p>
    </div>
    <div><img src="${img}" style="width:100%;display:block"><div class="ink" style="color:var(--ink);width:300px;margin-top:8px">${eq}</div></div>
  </div>`;
  document.body.style.margin = '0';
});
await new Promise((r) => setTimeout(r, 300));
await (await p.$('#og')).screenshot({ path: new URL('../../public/og.png', import.meta.url).pathname });
await b.close();
console.log('wrote public/og.png');
