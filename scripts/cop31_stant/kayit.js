// COP31 Stant 11 döngü filmi · kayıt (Playwright, sabit saat, kare kare).
//   Durağan kareler:  node kayit.js <klasor> kare <t1,t2,...> [cikti_klasoru]
//   Tam film:         node kayit.js <klasor> film [isci_sayisi]   → <klasor>/parca_*.mkv (ara, yüksek kalite)
// <klasor>: film.html + film.js + assets/ (hazirla.sh). Chromium: PLAYWRIGHT_BROWSERS_PATH (/opt/pw-browsers).
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const fs = require('fs'), path = require('path');
const [dir, mode, arg, out2] = process.argv.slice(2);
const DIR = path.resolve(dir), URL = 'file://' + path.join(DIR, 'film.html');

async function openPage(browser) {
  const p = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  const errs = []; p.on('pageerror', e => errs.push(String(e))); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto(URL);
  await p.waitForFunction(() => window.FILM && (window.FILM.ready || window.FILM.error), null, { timeout: 60000 });
  const e = await p.evaluate(() => window.FILM.error);
  if (e) throw new Error(e);
  return { p, errs };
}

(async () => {
  if (mode === 'kare') {
    const b = await chromium.launch(); const { p, errs } = await openPage(b);
    const od = path.resolve(out2 || path.join(DIR, 'kareler')); fs.mkdirSync(od, { recursive: true });
    for (const t of arg.split(',').map(Number)) {
      await p.evaluate(t => window.FILM.render(t), t);
      await p.screenshot({ path: path.join(od, `t${t.toFixed(2).padStart(7, '0')}.png`) });
    }
    console.log('kareler:', od, errs.length ? 'JS hataları: ' + errs.join(' | ') : 'JS hatası yok');
    await b.close(); return;
  }
  if (mode === 'film') {
    const N = +arg || 3;
    const b0 = await chromium.launch(); const { p: p0 } = await openPage(b0);
    const { T, FPS } = await p0.evaluate(() => ({ T: window.FILM.T, FPS: window.FILM.FPS })); await b0.close();
    const total = Math.round(T * FPS), per = Math.ceil(total / N); const allErr = [];
    const t0 = Date.now();
    await Promise.all([...Array(N).keys()].map(async w => {
      const a = w * per, z = Math.min(total, a + per); if (a >= z) return;
      const b = await chromium.launch(); const { p, errs } = await openPage(b);
      const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'png', '-i', '-',
        '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '8', '-pix_fmt', 'yuv444p', path.join(DIR, `parca_${w}.mkv`)], { stdio: ['pipe', 'inherit', 'inherit'] });
      for (let k = a; k < z; k++) {
        await p.evaluate(t => window.FILM.render(t), k / FPS);
        const buf = await p.screenshot({ type: 'png' });
        if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
        if (w === 0 && (k - a) % 150 === 0) console.log(`işçi 0: ${k - a}/${z - a} kare, ${((Date.now() - t0) / 1000).toFixed(0)} sn`);
      }
      ff.stdin.end(); await new Promise(r => ff.on('close', r));
      allErr.push(...errs); await b.close();
    }));
    fs.writeFileSync(path.join(DIR, 'parcalar.txt'), [...Array(N).keys()].filter(w => w * per < total).map(w => `file 'parca_${w}.mkv'`).join('\n') + '\n');
    console.log(`film: ${total} kare (${T} sn), ${((Date.now() - t0) / 1000).toFixed(0)} sn sürdü;`, allErr.length ? 'JS hataları: ' + allErr.join(' | ') : 'JS hatası yok');
    return;
  }
  console.log('kullanım: node kayit.js <klasor> kare <t,...> | film [isci]');
})().catch(e => { console.error(e); process.exit(1); });
