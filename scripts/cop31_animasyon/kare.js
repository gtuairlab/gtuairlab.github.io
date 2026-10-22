// Animasyonlardan test kareleri: NODE_PATH=/opt/node-tools/node_modules node scripts/cop31_animasyon/kare.js <çıktı klasörü>
// Kareler repoya yazılmaz; çıktı klasörü olarak geçici bir yer verin.
const { chromium } = require('playwright'); const path = require('path');
(async () => { const out = process.argv[2] || '/tmp'; const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1664, height: 700 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
  for (const n of ['A', 'B']) { await p.goto('file://' + path.join(__dirname, 'cikti', `embed_${n}.html`));
    let t = 0; for (const at of [1500, 4500, 8000, 12500, 16000]) { await p.waitForTimeout(at - t); t = at; await p.screenshot({ path: path.join(out, `kare_${n}_${at}.png`) }); } }
  console.log('JS hataları:', errs.length ? errs : 'yok'); await b.close(); })();
