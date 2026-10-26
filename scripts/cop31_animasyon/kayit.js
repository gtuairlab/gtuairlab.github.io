// COP31 · gerçek kampüs videoları: motoru (varsayılan harita_dogal.html; MOTOR=harita3b.html eski 3B sürüm) kare kare (sabit adım)
// çizer, ffmpeg ile H.264 MP4 yapar (High, yuv420p, her 1 sn anahtar kare, 2 B-kare, faststart: tarayıcıda akıcı oynatma için).
// Önce: python3 harita_hazirla.py <ekran_goruntusu.png> <harita_klasoru>   (doku.png + georef.json üretir)
// Kullanım: NODE_PATH=/opt/node-tools/node_modules node kayit.js <harita_klasoru> <cikti_klasoru> [A|B|AB] [--kareler]
//   --kareler: her saniyeden bir PNG (kontakt sayfası için) <cikti>/kareler_X/ altına.
// Çıktılar (video, durağan kare) repoya YAZILMAZ: lisanslı uydu görüntüsü içerir.
const { chromium } = require('playwright'); const fs = require('fs'), path = require('path'), { spawn } = require('child_process');
const [HK, OUT, WHICH = 'AB'] = process.argv.slice(2), KARE = process.argv.includes('--kareler'), FPS = +(process.env.FPS || 30), MOTOR = process.env.MOTOR || 'harita_dogal.html';
if (!HK || !OUT) { console.error('kullanım: node kayit.js <harita_klasoru> <cikti_klasoru> [A|B|AB] [--kareler]'); process.exit(1); }
fs.mkdirSync(OUT, { recursive: true });
const J = p => JSON.parse(fs.readFileSync(p, 'utf8'));
const data = { doku: 'data:image/png;base64,' + fs.readFileSync(path.join(HK, 'doku.png')).toString('base64'), georef: J(path.join(HK, 'georef.json')),
  geo: J(path.join(__dirname, '..', '..', 'frontend_v2', 'data', 'campus.geojson')), sahneler: J(path.join(__dirname, 'sahneler.json')),
  rotalar: J(path.join(__dirname, 'harita_rotalar.json')),
  ikon: 'data:image/png;base64,' + fs.readFileSync(path.join(__dirname, '..', '..', 'frontend_v2', 'icons', 'icon-192.png')).toString('base64') };
(async () => {
  const b = await chromium.launch(); const errs = [];
  for (const key of WHICH.split('')) {
    const p = await b.newPage({ viewport: { width: 1664, height: 700 } }); p.on('pageerror', e => errs.push(key + ': ' + e.message));
    await p.goto('file://' + path.join(__dirname, MOTOR));
    const info = await p.evaluate(d => init(d), { ...data, key }); const N = Math.round(info.total * FPS);
    console.log(`${key}: ${info.total.toFixed(2)} sn, ${N} kare (${FPS} fps, ${MOTOR})`);
    const mp4 = path.join(OUT, `visitor${key}.mp4`);
    const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-', '-c:v', 'libx264', '-preset', 'slow',
      '-profile:v', 'high', '-crf', process.env.CRF || '22', '-g', String(FPS), '-keyint_min', String(FPS), '-sc_threshold', '0', '-bf', '2',
      '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-r', String(FPS), mp4], { stdio: ['pipe', 'inherit', 'inherit'] });
    const kd = path.join(OUT, 'kareler_' + key); if (KARE) fs.mkdirSync(kd, { recursive: true });
    const stillF = N - 1;   // durağan kare = son kare (sonuç kartı)
    for (let i = 0; i < N; i++) {
      await p.evaluate(t => render(t), i / FPS);
      const buf = await p.screenshot({ type: 'png' });
      if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
      if (i === stillF) fs.writeFileSync(path.join(OUT, `visitor${key}.png`), buf);
      if (KARE && i % FPS === 0) fs.writeFileSync(path.join(kd, `k${String(i / FPS).padStart(2, '0')}.png`), buf);
    }
    ff.stdin.end(); await new Promise(r => ff.on('close', r));
    console.log(`  ${mp4}: ${(fs.statSync(mp4).size / 1e6).toFixed(2)} MB`); await p.close();
  }
  console.log('JS hataları:', errs.length ? errs : 'yok'); await b.close();
})();
