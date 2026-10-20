// Tanıtım videosu kaydı: node video_kaydet.js short|long
//   short → 1080×1920 (LinkedIn, Instagram Reels), long → 1920×1080 (YouTube)
// Uygulama bir "sahne" sayfasındaki iframe'de açılır; Playwright etkileşimleri yürütür,
// CDP ekran yayını kareleri 30 fps'ye oturtulup ffmpeg ile H.264 MP4'e yazılır (sessiz).
// Müzik: python fon_muzigi.py <süre> muzik.wav [tempo] [kapanış_sn]; birleştirme için README.md.
// Gerekenler: Node + playwright (Chromium), ffmpeg; uygulama http://localhost:8765'te açık olmalı:
//   python -m http.server 8765 --directory frontend_v2
// Veri: varsayılan ÖRNEK veri + "TASLAK · ÖRNEK VERİ" etiketi. GERCEK=1 → canlı sunucu verisi.
//   TAKLIT=<modül.js> → sunucu yanıtları bir modülden (handle(url) → {status, contentType, body}; NOW = anlık görüntü zamanı, ms).
//   Gerçek bir veri anlık görüntüsü verildiğinde tarayıcı saati NOW'a ayarlanır; kapanışta kayıt tarihi yazılır.
// Karekod: bu klasöre qr.png (ör. python -c "import qrcode; qrcode.make('https://gtuairlab.github.io/frontend_v2/').save('qr.png')").
// Sahne zamanları cikti/airlab-<mod>.sahneler.json'a yazılır (müziğin kapanış akoru buna göre yerleşir).
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const MODE = process.argv[2] || 'short';
const LONG = MODE === 'long';
const REAL = process.env.GERCEK === '1';
const TAKLIT = process.env.TAKLIT ? require(path.resolve(process.env.TAKLIT)) : null;
const SAMPLE = !REAL && !TAKLIT;
const OUT = path.join(process.env.CIKTI || path.join(__dirname, 'cikti'), `airlab-${MODE}.mp4`);
fs.mkdirSync(path.dirname(OUT), { recursive: true });
const ROOT = path.resolve(__dirname, '../../frontend_v2');
const QR_FILE = path.join(__dirname, 'qr.png');
const QR = fs.existsSync(QR_FILE) ? 'data:image/png;base64,' + fs.readFileSync(QR_FILE).toString('base64') : null;
const ADRES = process.env.ADRES || 'gtuairlab.github.io';
const LOGO = 'data:image/png;base64,' + fs.readFileSync(path.join(ROOT, 'icons', 'icon-192.png')).toString('base64');
// Sensör görselleri: foto/purpleair.(jpg|png) ve foto/atmotube.(jpg|png) varsa uzun sürümün kartlarında gösterilir.
// Fotoğraflarda kişi/yüz bulunmamalı (KVKK); ekibin kendi çektiği ya da kullanım izni olan görseller kullanılmalı.
const photo = name => { for (const ext of ['jpg', 'jpeg', 'png']) { const f = path.join(__dirname, 'foto', `${name}.${ext}`);
  if (fs.existsSync(f)) return `data:image/${ext === 'png' ? 'png' : 'jpeg'};base64,` + fs.readFileSync(f).toString('base64'); } return null; };

// ── Örnek veri (taslak; yayın sürümü gerçek veriyle kaydedilir) ─────────────
const NOW = TAKLIT && TAKLIT.NOW ? TAKLIT.NOW : Date.now();
const TARIH = new Date(NOW).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Istanbul' });
let seed = 11; const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
const hist = [];
for (let d = 75; d >= 0; d--) {
  const base = 5 + rnd() * 17;
  for (let h = 0; h < 24; h++) {
    const t = new Date(NOW - d * 864e5); t.setUTCHours(h, 0, 0, 0);
    if (t.getTime() > NOW) break;
    const trH = (h + 3) % 24;
    const peak = 1 + 0.45 * Math.exp(-((trH - 8.5) ** 2) / 4) + 0.55 * Math.exp(-((trH - 20) ** 2) / 6) - 0.25 * Math.exp(-((trH - 4) ** 2) / 5);
    const v = Math.max(1, base * peak + rnd() * 3 - 1.5);
    hist.push({ recorded_at: t.toISOString(), pm2_5: +v.toFixed(1), pm2_5_cf1_a: +v.toFixed(1), pm2_5_cf1_b: +v.toFixed(1),
      pm10_0: +(v * 1.35 + rnd() * 4).toFixed(1), temperature_c: 17 + rnd() * 6, humidity_pct: 55 + rnd() * 15 });
  }
}
// İç ortam (örnek): son 8 saatte 2 dakikalık ölçümler
const inRaw = [];
for (let t = NOW - 8 * 3600e3; t <= NOW - 60e3; t += 120e3) {
  const c = 16 + 5 * Math.sin(t / 2.4e6) + 2 * Math.sin(t / 3e5);
  inRaw.push({ recorded_at: new Date(t).toISOString(), pm2_5: c * 0.62, pm2_5_cf1_a: c, pm2_5_cf1_b: c * 1.02, humidity_pct: 40 + 3 * Math.sin(t / 5e6),
    temperature_c: 24 + Math.sin(t / 7e6), lat: 40.80597, lon: 29.362827, sensor_index: 1 });
}
const outRaw = [];
for (let t = NOW - 8 * 3600e3 + 20e3; t <= NOW - 60e3; t += 120e3) {
  const c = 22 + 8 * Math.sin(t / 3e6);
  outRaw.push({ recorded_at: new Date(t).toISOString(), pm2_5: c * 0.65, pm2_5_cf1_a: c, pm2_5_cf1_b: c, humidity_pct: 55 + 10 * Math.sin(t / 8e6), temperature_c: 18 + 4 * Math.sin(t / 9e6) });
}
const hourlyOf = rows => { const by = new Map(); for (const r of rows) { const k = r.recorded_at.slice(0, 13); (by.get(k) || by.set(k, []).get(k)).push(r); }
  return [...by].map(([k, rs]) => { const o = { recorded_at: k + ':00:00.000Z' };
    for (const f of ['pm2_5', 'pm2_5_cf1_a', 'pm2_5_cf1_b', 'temperature_c', 'humidity_pct']) o[f] = rs.reduce((a, r) => a + r[f], 0) / rs.length; return o; }); };
const fc = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'campus.geojson')));
const FIELD = []; let s2 = 3; const r2 = () => (s2 = (s2 * 9301 + 49297) % 233280) / 233280;
fc.features.filter(f => f.properties.cat === 'bina' && f.properties.name && !/^(bina \d|küçük binalar)/i.test(f.properties.name.trim())).forEach((f, i) => {
  if (i % 3) return;
  const c = f.geometry.type === 'Polygon' ? f.geometry.coordinates[0] : f.geometry.coordinates[0][0];
  const lon = c.reduce((a, p) => a + p[0], 0) / c.length, lat = c.reduce((a, p) => a + p[1], 0) / c.length;
  const base = 6 + r2() * 20, n = i % 2 ? 12 : 45, days = [18, 11, 4].map(d => new Date(NOW - d * 864e5).toISOString());
  for (let k = 0; k < n; k++) {
    const t = new Date(new Date(days[k % 3]).getTime() + Math.floor(k / 3) * 10000);
    FIELD.push({ lat, lon, pm2_5: base + (k % 3 === 2 ? 5 : 0) + r2() * 4 - 2, recorded_at: t.toISOString(), session_id: 1 + (k % 3) });
  }
});
const sessions = [1, 2, 3].map(i => ({ id: i, session_name: `ATP-${i}_` + new Date(NOW - [18, 11, 4][i - 1] * 864e5).toISOString().slice(0, 10).replace(/-/g, ''),
  reading_count: 120, started_at: new Date(NOW - [18, 11, 4][i - 1] * 864e5).toISOString() }));
const ago = m => new Date(NOW - m * 60000).toISOString();
const latest = { pm2_5: 14.6, pm2_5_cf1_a: 14.6, pm2_5_cf1_b: 14.6, pm10_0: 21.3, pm1_0: 9.2, temperature_c: 19.4, humidity_pct: 62, recorded_at: ago(3) };
const ATP = [{ device: 'ATP-1', mac: 'a', reading: { pm2_5: 11.2, lat: 40.8098, lon: 29.3581, recorded_at: ago(4) } },
             { device: 'ATP-2', mac: 'b', reading: { pm2_5: 16.9, lat: 40.8131, lon: 29.3549, recorded_at: ago(6) } }];
const between = (rows, u) => { const s = u.searchParams.get('start'), e = u.searchParams.get('end');
  return rows.filter(r => (!s || r.recorded_at >= new Date(s).toISOString()) && (!e || r.recorded_at <= new Date(e).toISOString())); };
function sample(url) {
  const u = new URL(url), p = u.pathname, iv = u.searchParams.get('interval'); let body = { data: [] };
  if (p === '/api/purpleair/history') body = { data: iv === 'raw' ? between(outRaw, u) : hist };
  else if (p === '/api/purpleair/latest') body = { data: latest };
  else if (p === '/api/purpleair/status') body = { success: true, error: null };
  else if (p === '/api/indoor/latest') body = { data: inRaw[inRaw.length - 1], name: 'Amfi 1', status: { success: true } };
  else if (p === '/api/indoor/history') body = { data: iv === 'raw' ? between(inRaw, u) : hourlyOf(inRaw) };
  else if (p === '/api/map/tracks') body = { tracks: sessions.map(s => ({ session_id: s.id, session_name: s.session_name, points: FIELD.filter(x => x.session_id === s.id) })) };
  else if (/\/readings$/.test(p)) { const id = +p.match(/sessions\/(\d+)/)[1]; body = { data: FIELD.filter(x => x.session_id === id) }; }
  else if (p === '/api/sessions') body = { data: sessions };
  else if (p === '/api/atmotube/live') body = { data: ATP };
  else if (p === '/api/csb/latest' || p === '/api/ibb/latest') body = { data: { station_name: 'Tuzla (canlı)', pm2_5: 18.2, lat: 40.82, lon: 29.29, distance_km: 6.4, recorded_at: ago(40), source: 'live' } };
  return { status: 200, contentType: 'application/json', body: JSON.stringify(body) };
}

// ── Sahne sayfası ─────────────────────────────────────────────────────────
const W = LONG ? 1280 : 540, H = LONG ? 720 : 960;
// Çıkış: 1080×1920 / 1920×1080. HD=1 → ekran 1,5 kat yüksek çözünürlükte yakalanıp küçültülür (daha keskin), daha yüksek kalite kodlama
const OUT_K = LONG ? 1.5 : 2, HD = process.env.HD === '1', DPR = HD ? OUT_K * 1.5 : OUT_K;
// Kısa sürüm: başlık ve açıklama 4:5 orta kırpmada da görünür kalır (y 142–818); uygulama 468 CSS px genişlikte çizilip
// 1,154 kat büyütülür (telefonda yazılar daha okunaklı)
const FRAME = LONG ? { x: 0, y: 92, w: 1280, h: 628 } : { x: 0, y: 292, w: 540, h: 668 };
const APPW = LONG ? FRAME.w : 468, SC = FRAME.w / APPW, APPH = Math.round(FRAME.h / SC);
const STAGE = `<!doctype html><html lang="tr"><head><meta charset="utf-8">
<link rel="stylesheet" href="/vendor/fonts/fonts.css">
<style>
*{box-sizing:border-box;margin:0}
html,body{width:${W}px;height:${H}px;overflow:hidden;background:#0a101d;color:#e8ecf4;font-family:Inter,system-ui,sans-serif}
svg.i{width:1em;height:1em;flex-shrink:0}
#cap{position:absolute;pointer-events:none;${LONG ? 'left:36px;right:300px;top:0;height:92px;display:flex;flex-direction:column;justify-content:center' : 'left:22px;right:22px;top:150px;height:136px;display:block'};transition:opacity .45s}
#cap h2{font-family:"Source Serif 4",serif;font-weight:600;font-size:${LONG ? 27 : 23}px;line-height:1.2;letter-spacing:-.005em}
#cap h2 .tag{display:inline-block;vertical-align:3px;margin-right:8px;font:700 10.5px/1 Inter,sans-serif;letter-spacing:.08em;text-transform:uppercase;color:#101521;background:#f5b840;padding:4px 7px;border-radius:5px}
#cap p{margin-top:${LONG ? 4 : 5}px;font-size:${LONG ? 14.5 : 13.5}px;line-height:1.45;color:#aeb8cc}
#cap h2 b{color:#7ea2ff;font-weight:600}
#cap p:empty{display:none}
#cap .ex{margin-top:11px;font-size:18.5px;line-height:1.45;font-weight:650;color:#fff;transition:opacity .3s}
#cap .ex mark{background:#f5b840;color:#101521;padding:0 .22em;border-radius:5px;box-decoration-break:clone;-webkit-box-decoration-break:clone}
#appwrap{position:absolute;left:${FRAME.x}px;top:${FRAME.y}px;width:${FRAME.w}px;height:${FRAME.h}px;overflow:hidden;border-top:1px solid rgba(160,180,220,.14)}
#appscale{position:absolute;left:0;top:0;width:${APPW}px;height:${APPH}px;transform:scale(${SC});transform-origin:0 0}
#app{position:absolute;inset:0;width:100%;height:100%;border:0;background:#0a101d;transition:transform .85s cubic-bezier(.4,0,.2,1)}
#brand{position:absolute;${LONG ? 'right:30px;top:0;height:92px' : 'left:22px;top:38px;height:44px'};display:flex;align-items:center;gap:${LONG ? 10 : 12}px;font-size:12px;line-height:1.35;color:#8b96ab}
#brand img{width:${LONG ? 34 : 40}px;height:${LONG ? 34 : 40}px;border-radius:${LONG ? 8 : 10}px}
#brand b{font-family:"Source Serif 4",serif;font-size:${LONG ? 18 : 18}px;color:#e8ecf4;font-weight:600}
#brand b i{font-style:normal;color:#f5a623}
#brand small{font-size:11px;color:#8b96ab;margin-left:2px}
#draft{position:absolute;${LONG ? 'left:36px;bottom:10px' : 'right:16px;top:19px;font-size:9.5px'};z-index:20;font-size:10.5px;font-weight:600;letter-spacing:.04em;color:#f5b840;
  padding:3px 8px;border:1px solid rgba(245,184,64,.45);border-radius:99px;background:rgba(10,16,29,.85)}
#sub{position:absolute;pointer-events:none;left:${LONG ? '445px' : '50%'};${LONG ? 'bottom:40px;max-width:820px;font-size:26px' : 'bottom:206px;max-width:470px;font-size:23px'};z-index:8;transform:translate(-50%,8px) scale(.97);
  width:max-content;text-align:center;font-weight:700;line-height:1.38;color:#fff;padding:${LONG ? '10px 22px' : '10px 16px'};border-radius:12px;
  background:rgba(8,12,22,.86);box-shadow:0 8px 28px rgba(0,0,0,.45);opacity:0;transition:opacity .28s,transform .28s}
#sub.on{opacity:1;transform:translate(-50%,0) scale(1)}
#sub mark{background:#f5b840;color:#101521;padding:0 .22em;border-radius:5px;box-decoration-break:clone;-webkit-box-decoration-break:clone}
#card{position:absolute;inset:0;z-index:10;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;
  padding:0 ${LONG ? 160 : 40}px;background:#0a101d;opacity:0;pointer-events:none;transition:opacity .6s}
#card.on{opacity:1}
#cursor{position:absolute;left:0;top:0;z-index:9;pointer-events:none;opacity:0;transition:left 1.15s cubic-bezier(.45,0,.2,1),top 1.15s cubic-bezier(.45,0,.2,1),opacity .3s,transform .15s;transform-origin:3px 2px;filter:drop-shadow(0 3px 6px rgba(0,0,0,.5))}
#card .ci{display:flex;flex-direction:column;align-items:center;width:100%;transition:opacity .35s}
#card .ci > *{animation:up .7s cubic-bezier(.2,.7,.2,1) both}
#card .ci > *:nth-child(2){animation-delay:.08s}#card .ci > *:nth-child(3){animation-delay:.16s}#card .ci > *:nth-child(4){animation-delay:.24s}
#card .ci > *:nth-child(5){animation-delay:.32s}#card .ci > *:nth-child(6){animation-delay:.4s}#card .ci > *:nth-child(7){animation-delay:.48s}
@keyframes up{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
#card .logo{width:${LONG ? 96 : 104}px;height:${LONG ? 96 : 104}px;border-radius:24px;margin-bottom:22px}
#card h1{font-family:"Source Serif 4",serif;font-weight:600;font-size:${LONG ? 54 : 46}px;line-height:1.12}
#card h1 i{font-style:normal;color:#f5a623}
#card h3{font-family:"Source Serif 4",serif;font-weight:600;font-size:${LONG ? 38 : 34}px;line-height:1.2;margin-bottom:22px}
#card .sub{margin-top:14px;font-size:${LONG ? 19 : 18}px;line-height:1.5;color:#aeb8cc}
#card .rule{width:56px;height:3px;background:#5b8def;border-radius:2px;margin:22px auto}
#card .tagline{font-size:${LONG ? 21 : 19.5}px;line-height:1.5;color:#e8ecf4;max-width:${LONG ? 760 : 440}px}
#card ul{list-style:none;padding:0;text-align:left;max-width:${LONG ? 860 : 440}px}
#card li{display:flex;gap:16px;align-items:flex-start;padding:${LONG ? 11 : 12}px 0;border-bottom:1px solid rgba(160,180,220,.11);font-size:${LONG ? 19 : 17.5}px;line-height:1.45;color:#d7dce6}
#card li:last-child{border-bottom:0}
#card li b{color:#fff;font-weight:650}
#card li span.n{flex-shrink:0;width:30px;height:30px;border-radius:50%;display:grid;place-items:center;font-size:14px;font-weight:700;color:#a9c0ff;background:rgba(91,141,239,.16);border:1px solid rgba(91,141,239,.45)}
#card .net{display:flex;flex-direction:column;gap:14px;width:100%;max-width:480px;text-align:left}
#card .net section{display:flex;gap:16px;align-items:flex-start;padding:16px 18px;border:1px solid rgba(160,180,220,.16);border-radius:16px;background:#0f1726}
#card .net .ic{flex-shrink:0;width:52px;height:52px;border-radius:12px;display:grid;place-items:center;font-size:24px;color:#a9c0ff;background:rgba(91,141,239,.14);border:1px solid rgba(91,141,239,.4)}
#card .net .ic svg{width:27px;height:27px}
#card .net h4{font-size:21px;font-weight:700;color:#fff;line-height:1.3}
#card .net h4 small{font-weight:500;color:#9fb0cf;font-size:16px}
#card .net p{margin-top:5px;font-size:17px;line-height:1.45;color:#c3cbda}
#card .net em{font-style:normal;font:700 10px/1 Inter,sans-serif;letter-spacing:.08em;color:#101521;background:#f5b840;padding:3px 6px;border-radius:4px;margin-left:6px;vertical-align:2px}
#card .kick{font-size:14px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#8fa7d8;margin-bottom:6px}
#card .cmp{display:grid;gap:14px;width:100%;max-width:${LONG ? 980 : 470}px;grid-template-columns:${LONG ? '1fr 1fr' : '1fr'};text-align:left}
#card .cmp section{padding:16px 18px;border:1px solid rgba(160,180,220,.16);border-radius:14px;background:#0f1726}
#card .cmp h4{font-family:"Source Serif 4",serif;font-size:${LONG ? 23 : 21}px;font-weight:600;margin-bottom:2px}
#card .cmp .dev{font-size:13.5px;color:#8fa7d8;margin-bottom:10px}
#card .cmp dl{display:grid;grid-template-columns:82px 1fr;gap:6px 10px;font-size:${LONG ? 16 : 15}px;line-height:1.42;color:#d7dce6}
#card .cmp dt{color:#8b96ab;font-weight:600}
#card .note{margin-top:16px;max-width:${LONG ? 980 : 470}px;font-size:13.5px;line-height:1.5;color:#8b96ab;text-align:left}
#card .qr{width:${LONG ? 190 : 200}px;height:${LONG ? 190 : 200}px;border-radius:14px;background:#fff;padding:10px;margin-top:26px}
#card .url{margin-top:14px;font:600 ${LONG ? 22 : 21}px/1.2 Inter,sans-serif;color:#fff;letter-spacing:.01em}
#card .small{margin-top:12px;font-size:14px;line-height:1.5;color:#8b96ab;max-width:440px}
#card .tiny{margin-top:18px;font-size:12px;line-height:1.5;color:#6f7a90;max-width:440px}
#veil{position:absolute;inset:0;z-index:30;background:#05080f;opacity:${LONG ? 1 : 0};pointer-events:none;transition:opacity .9s}
</style></head><body>
<script src="/js/icons.js"></script>
<div id="cap"><h2></h2><p></p>${LONG ? '' : '<div class="ex"></div>'}</div>
<div id="brand"><img src="${LOGO}" alt=""><span><b>GTÜ <i>Air</i>Lab</b><br>Kampüs Hava Kalitesi Laboratuvarı${LONG ? '' : ' · Gebze Teknik Üniversitesi'}</span></div>
${SAMPLE ? '<div id="draft">TASLAK · ÖRNEK VERİ</div>' : ''}
<div id="appwrap"><div id="appscale"><iframe id="app" name="app"></iframe></div></div>
<div id="sub"></div>
<div id="cursor"><svg viewBox="0 0 24 24" width="34" height="34"><path d="M3 2l7.5 19 2.6-7.6L21 10.8z" fill="#fff" stroke="#0a101d" stroke-width="1.6" stroke-linejoin="round"/></svg></div>
<div id="card"></div>
<div id="veil"></div>
<script>
window.cap = (h, p) => { const c = document.getElementById('cap'); c.style.opacity = 0;
  setTimeout(() => { c.querySelector('h2').innerHTML = h; c.querySelector('p').innerHTML = p || ''; c.style.opacity = 1; }, 380); };
window.sub = ${LONG ? `html => { const e = document.getElementById('sub'); e.classList.remove('on');
  if (html) setTimeout(() => { e.innerHTML = html; e.classList.add('on'); }, 230); }` : `html => { const e = document.querySelector('#cap .ex'); e.style.opacity = 0;
  setTimeout(() => { e.innerHTML = html || ''; e.style.opacity = 1; }, 300); }`};
window.cursorAt = (x, y, show, instant) => { const c = document.getElementById('cursor');
  if (instant) { c.style.transition = 'none'; c.style.left = (x - 3) + 'px'; c.style.top = (y - 2) + 'px'; c.offsetWidth; c.style.transition = ''; }
  else { c.style.left = (x - 3) + 'px'; c.style.top = (y - 2) + 'px'; }
  c.style.opacity = show ? 1 : 0; };
window.cursorClick = () => { const c = document.getElementById('cursor'); c.style.transform = 'scale(.82)'; setTimeout(() => c.style.transform = '', 170); };
// "Kamera": uygulama görüntüsünde bir noktaya yakınlaş / geri çekil
window.zoomTo = (x, y, k) => { const a = document.getElementById('app');
  if (k) { a.style.transformOrigin = x + 'px ' + y + 'px'; a.style.transform = 'scale(' + k + ')'; } else a.style.transform = ''; };
window.card = html => { const c = document.getElementById('card');
  if (!html) { c.classList.remove('on'); return; }
  const put = () => { c.innerHTML = '<div class="ci">' + html + '</div>'; c.classList.add('on'); };
  const ci = c.querySelector('.ci');
  if (c.classList.contains('on') && ci) { ci.style.opacity = 0; setTimeout(put, 380); } else put(); };
window.veil = on => { document.getElementById('veil').style.opacity = on ? 1 : 0; };
</script></body></html>`;

// ── Kayıt ─────────────────────────────────────────────────────────────────
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: DPR, serviceWorkers: 'block', locale: 'tr-TR', timezoneId: 'Europe/Istanbul' });
  await ctx.addInitScript(([NOW_, SHIFT]) => {
    // Gerçek veri anlık görüntüsü: tarayıcı saati görüntünün alındığı ana ayarlanır (ölçüm zamanları değiştirilmez)
    if (SHIFT) { const D = Date, OFF = NOW_ - D.now();
      window.Date = new Proxy(D, { construct: (t, a, nt) => a.length ? Reflect.construct(t, a, nt) : new t(t.now() + OFF),
        apply: t => new t(t.now() + OFF).toString(), get: (t, k) => k === 'now' ? () => D.now() + OFF : Reflect.get(t, k) }); }
    try { localStorage.setItem('gtu.install.dismissed', 'true'); localStorage.removeItem('gtu.view.research'); } catch (_) {}
    if (window.top === window) return;
    // Dokunma izi: tıklanan yerde kısa bir halka
    window.__tap = (x, y) => {
      const d = document.createElement('div');
      d.style.cssText = `position:fixed;left:${x - 22}px;top:${y - 22}px;width:44px;height:44px;border-radius:50%;z-index:99999;pointer-events:none;
        border:3px solid rgba(255,255,255,.9);background:rgba(126,162,255,.28);transform:scale(.4);opacity:1;transition:transform .45s ease-out,opacity .55s ease-out`;
      document.body.appendChild(d); requestAnimationFrame(() => { d.style.transform = 'scale(1.25)'; d.style.opacity = '0'; });
      setTimeout(() => d.remove(), 700);
    };
    addEventListener('pointerdown', e => { if (e.isTrusted) window.__tap(e.clientX, e.clientY); }, true);
  }, [NOW, !!(TAKLIT && TAKLIT.NOW)]);
  if (!REAL) await ctx.route(/arcgisonline|cartocdn|ibb\.gov\.tr|openstreetmap/, r => r.abort());
  await ctx.route('http://localhost:8765/__stage.html', r => r.fulfill({ contentType: 'text/html; charset=utf-8', body: STAGE }));
  if (!REAL) await ctx.route('https://gtu-air-quality.onrender.com/**', r => r.fulfill((TAKLIT ? TAKLIT.handle : sample)(r.request().url())));
  const page = await ctx.newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto('http://localhost:8765/__stage.html');
  await page.evaluate(() => { document.getElementById('app').src = '/index.html'; });
  await page.waitForTimeout(800);
  await page.waitForTimeout(6500);   // açılış ekranı ve veriler
  const F = () => page.frame({ name: 'app' });
  if (!LONG) {
    // Kayıt öncesi hazırlık (görüntüye girmez): duyurular okundu sayılır (rozet), saha ölçümleri bina ortalamaları görünümünde hazırlanır,
    // tanıtımın odağı dışındaki öğeler gizlenir (harita yakınlaştırma düğmeleri, telefonla eşitlenmeyi bekleyen Atmotube kartı)
    const ev = fn => F().evaluate(fn);
    await ev(() => document.querySelector('#tabbar [data-tab=news]').click()); await page.waitForTimeout(700);
    await ev(() => document.querySelector('#research-switch [data-sub=field]').click()); await page.waitForTimeout(900);
    await ev(() => document.getElementById('sel-all').click()); await page.waitForTimeout(6000);
    await ev(() => document.querySelector('.vs-btn[data-view=avg]').click()); await page.waitForTimeout(1500);
    await ev(() => { const st = document.createElement('style');
      st.textContent = '.leaflet-control-zoom{display:none!important} section.panel[data-key=atp]{display:none!important}'; document.head.appendChild(st); });
    await ev(() => document.querySelector('#tabbar [data-tab=ozet]').click()); await page.waitForTimeout(1800);
  }

  // ffmpeg: kareler sabit 30 fps'ye oturtulur
  const OW = Math.round(W * OUT_K), OH = Math.round(H * OUT_K), CW = Math.round(W * DPR), CH = Math.round(H * DPR);
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-c:v', 'mjpeg', '-framerate', '30', '-i', '-',
    '-vf', `scale=${OW}:${OH}:flags=lanczos,format=yuv420p`, '-c:v', 'libx264', '-preset', HD ? 'slow' : 'medium', '-crf', HD ? '14' : '19', '-profile:v', 'high',
    '-tune', 'animation', '-r', '30', '-movflags', '+faststart', OUT], { stdio: ['pipe', 'inherit', 'inherit'] });
  const cdp = await ctx.newCDPSession(page);
  let last = null, lastT = null, written = 0, frames = 0;
  const write = buf => new Promise(res => ff.stdin.write(buf) ? res() : ff.stdin.once('drain', res));
  let chain = Promise.resolve();
  const push = (buf, t) => {
    chain = chain.then(async () => {
      if (last) { const n = Math.max(0, Math.round((t - lastT) * 30)); for (let i = 0; i < n; i++) { await write(last); written++; } if (n) lastT += n / 30; }
      else lastT = t;
      last = buf;
    });
  };
  cdp.on('Page.screencastFrame', f => { frames++; push(Buffer.from(f.data, 'base64'), f.metadata.timestamp); cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {}); });
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: HD ? 96 : 92, maxWidth: CW, maxHeight: CH, everyNthFrame: 1 });
  const T0 = Date.now(), marks = {};
  const mark = name => { marks[name] = +((Date.now() - T0) / 1000).toFixed(2); };
  // Yayın yalnızca ekran değişince kare yollar; sabit sahnelerde de zaman ilerlesin diye görünmez bir nokta yanıp söner
  await page.evaluate(() => { const d = document.createElement('div'); d.style.cssText = 'position:absolute;left:0;top:0;width:1px;height:1px;z-index:99;background:#0a101d';
    document.body.appendChild(d); let k = 0; setInterval(() => { d.style.background = (k++ % 2) ? '#0a101d' : '#0b111e'; }, 33); });

  const wait = ms => page.waitForTimeout(ms);
  // Yeni sahne başlığı gelince önceki altyazı da kalkar
  const cap = (h, p) => page.evaluate(([h, p]) => { window.sub(null); window.cap(h, p); }, [h, p]);
  const card = html => page.evaluate(h => window.card(h), html);
  const sub = html => page.evaluate(h => window.sub(h), html);
  const click = async (sel, pause = 900) => { await F().click(sel); await wait(pause); };
  const center = sel => F().evaluate(sel => { const r = document.querySelector(sel).getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }, sel);
  // Dokunma: öğenin üzerinde halka belirir, öğe açılır (telefon kullanımı gibi)
  const tap = async (sel, pause = 900) => {
    const c = await center(sel);
    await F().evaluate(([sel, x, y]) => { window.__tap(x, y); document.querySelector(sel).click(); }, [sel, c.x, c.y]); await wait(pause);
  };
  // Araştırma alt sekmesine doğrudan geçiş (önceki alt sekme bir an görünmesin)
  const subTab = async (name, pause) => { await F().evaluate(n => document.querySelector(`#research-switch [data-sub=${n}]`).click(), name); await wait(pause); };
  // Kamera: öğeye yakınlaş / geri çekil
  const zoomOn = async (sel, k, dy = 0) => { const c = await center(sel); await page.evaluate(([x, y, k]) => window.zoomTo(x, y, k), [c.x, c.y + dy, k]); };
  const unzoom = () => page.evaluate(() => window.zoomTo());
  // Öğenin çevresinde yanıp sönen vurgu halkası (nereye dokunulacağını gösterir)
  const highlight = async (sel, ms, rad = 99) => {
    await F().evaluate(([sel, ms, rad]) => { const r = document.querySelector(sel).getBoundingClientRect(), d = document.createElement('div'), p = 7;
      d.style.cssText = `position:fixed;left:${r.left - p}px;top:${r.top - p}px;width:${r.width + 2 * p}px;height:${r.height + 2 * p}px;border-radius:${rad}px;
        border:3px solid #f5b840;box-shadow:0 0 0 0 rgba(245,184,64,.55);z-index:99998;pointer-events:none`;
      d.animate([{ boxShadow: '0 0 0 0 rgba(245,184,64,.55)' }, { boxShadow: '0 0 0 16px rgba(245,184,64,0)' }], { duration: 900, iterations: Infinity });
      document.body.appendChild(d); setTimeout(() => d.remove(), ms + 150); }, [sel, ms, rad]);
    await wait(ms);
  };
  const scroll = async (sel, px, ms) => {
    const steps = Math.max(1, Math.round(ms / 40));
    for (let i = 0; i < steps; i++) { await F().evaluate(([s, d]) => { const e = document.querySelector(s); if (e) e.scrollTop += d; }, [sel, px / steps]); await wait(40); }
  };
  // Kaydırılabilir kabı, öğe kabın üstünden `off` piksel aşağıda kalacak şekilde yumuşak kaydırır
  const scrollTo = (sel, off = 12) => F().evaluate(([sel, off]) => { const e = document.querySelector(sel); let p = e.parentElement;
    while (p && p.scrollHeight <= p.clientHeight + 2) p = p.parentElement;
    if (p) p.scrollTo({ top: p.scrollTop + e.getBoundingClientRect().top - p.getBoundingClientRect().top - off, behavior: 'smooth' }); }, [sel, off]);
  // Maruziyet asistanı: bir günlük örnek program (iki bina + açık hava)
  const chat = async (pause) => {
    const a = async s => { await tap(`.cb-ask ${s}`, pause); };
    const bld = async label => { await F().selectOption('#cb-bld', { label }); await wait(pause * 0.7); await a('[data-a=yer]'); };
    await a('[data-a=saat][data-v="540"]');
    await a('[data-a=etkinlik][data-v=ders]'); await bld('Kütüphane');
    await a('[data-a=hava][data-v=closed]'); await a('[data-a=sure][data-v="180"]');
    await a('[data-a=devam][data-v=ekle]');
    await a('[data-a=etkinlik][data-v=yemek]'); await bld('Güzide Kafe');
    await a('[data-a=hava][data-v=vent]'); await a('[data-a=sure][data-v="60"]');
    await a('[data-a=devam][data-v=ekle]');
    await a('[data-a=etkinlik][data-v=yurume]'); await bld('Kongre ve Kültür Merkezi');
    await a('[data-a=sure][data-v="30"]');
    await F().evaluate(() => document.querySelector('.cb-ask [data-a=devam][data-v=bitti]').click()); await wait(pause);   // sonuç yeniden çizilir; dokunma izi bırakılmaz
  };
  const LOGO_IMG = `<img class="logo" src="${LOGO}" alt="">`;
  const KAYIT = TAKLIT ? `Görüntüler ${TARIH} itibarıyla gerçek ölçümlerle kaydedilmiştir.` : REAL ? `Görüntüler ${TARIH} tarihinde canlı ölçümlerle kaydedilmiştir.` : '';
  const OUTRO = `${LOGO_IMG}<h1>GTÜ <i>Air</i>Lab</h1><div class="sub">Kampüs Hava Kalitesi Laboratuvarı${LONG ? ' · ' : '<br>'}Gebze Teknik Üniversitesi</div>
    ${QR ? `<img class="qr" src="${QR}" alt="">` : ''}<div class="url">${ADRES}</div>
    <div class="small">Açık erişim · yöntem, eşik değerler ve kaynaklar uygulamanın “Hakkında” bölümünde</div>
    ${KAYIT ? `<div class="tiny">${KAYIT}</div>` : ''}`;
  const ic = name => `<svg class="i"><use href="#i-${name}"></use></svg>`;

  if (!LONG) {
    // ── Kısa sürüm (≈90 sn, 9:16): açılışta kanca (anlık durum), sonra marka ve ölçüm ağı; üst bantta başlık ve tek cümle ──
    mark('giris');
    await cap('Kampüste hava şu an nasıl?');
    await sub('Kampüsün havası <mark>sürekli ölçülüyor</mark>; sonuç tek ekranda.'); await wait(3300);
    await sub('Son ölçüm, ulusal <mark>Hava Kalitesi İndeksi (HKİ)</mark> ölçeğinde gösterge olarak sınıflandırılır.'); await wait(3900);
    await highlight('.oz-24', 1400, 12);
    await sub('Son 24 saatin seyri ve <mark>hassas gruplar</mark> için öneriler.'); await wait(2900);
    mark('marka');
    await card(`${LOGO_IMG}<h1>GTÜ <i>Air</i>Lab</h1><div class="sub">Kampüs Hava Kalitesi Laboratuvarı<br>Gebze Teknik Üniversitesi</div>
      <div class="rule"></div><div class="tagline">Kampüsün havasını sürekli ölçüyor, sonuçları yöntemiyle birlikte açık paylaşıyoruz.</div>`);
    await wait(3600);
    mark('ag');
    await card(`<div class="kick">Ölçüm ağı</div><h3>Üç katmanda ölçüm</h3><div class="net">
      <section><span class="ic">${ic('radio-tower')}</span><div><h4>Dış ortam <small>· PurpleAir</small></h4>
        <p>Sürekli, 2 dakikada bir · PM₂.₅ US EPA düzeltmeli</p></div></section>
      <section><span class="ic">${ic('building-2')}</span><div><h4>İç ortam <small>· Amfi 1</small><em>YENİ</em></h4>
        <p>Derslik havası, dış ortamla eşzamanlı</p></div></section>
      <section><span class="ic">${ic('footprints')}</span><div><h4>Taşınabilir <small>· Atmotube Pro</small></h4>
        <p>Kısa süreli, konumlu saha ölçümleri</p></div></section></div>`);
    await click('#tabbar [data-tab=map]', 300);
    await F().evaluate(() => { map.setView([40.8088, 29.3600], 15.3, { animate: false }); });
    await wait(6500);
    // Harita
    mark('harita');
    await cap('Kampüs haritası');
    await card(null); await wait(400);
    await F().evaluate(() => { map.flyTo([40.8092, 29.3592], 15.75, { duration: 2.6 }); });
    await sub('Binalar ve ölçüm noktaları <mark>tek haritada</mark>.'); await wait(4200);
    // Amfi 1 · iç ortam
    mark('ic');
    await cap('<span class="tag">Yeni</span>İç ortam ölçümü · Amfi 1');
    await subTab('live', 600);
    await scrollTo('#ic-panel', 8); await wait(700);
    await tap("#ic-panel .ic-ts-chips [data-h='6']", 500);
    await sub('Derslik havası <mark>2 dakikada bir</mark> ölçülür.'); await wait(3000);
    await scrollTo('#ic-panel .ic-ts', 120); await wait(400);
    await tap('#ic-panel .ic-ts-chips [data-m=io]', 500);
    await sub('<mark>İç/dış oranı</mark>, derslik havasını dış ortamla karşılaştırır (ilk gün ≈ 1).'); await wait(4000);
    await tap('#ic-open', 800);
    await sub('Ders programına göre <mark>ders, boş derslik ve gece</mark> saatleri ayrı değerlendirilir.'); await wait(4200);
    // Trendler
    mark('trend');
    await cap('Trendler');
    await click('#tabbar [data-tab=trend]', 700);
    await sub('Son 30 günde, haftanın gününe ve saatine göre <mark>ortalama PM₂.₅</mark>.'); await wait(4000);
    await scrollTo('#tr-region', 70); await wait(500);
    await sub('Kampüs ile <mark>Tuzla istasyonu</mark> aynı saatlerde karşılaştırılır; yöntemler farklıdır.'); await wait(4800);
    // Saha ölçümleri (bina ortalamaları görünümü kayıttan önce hazırlandı)
    mark('saha');
    await cap('Bina bazlı saha ölçümleri');
    await subTab('field', 300);
    await sub('Kısa süreli <mark>konumlu ölçümler</mark>; bina ortalamaları göreli bir karşılaştırmadır.'); await wait(4200);
    await tap('#map-cta', 400);
    await F().evaluate(() => { map.flyTo([40.8098, 29.3585], 16.0, { duration: 1.6 }); });
    await sub('Bina ortalamaları <mark>harita üzerinde</mark>.'); await wait(4300);
    // Kişisel maruziyet
    mark('maruziyet');
    await cap('Kişisel maruziyet tahmini');
    await sub('Gün içindeki program girilir; <mark>bilgiler cihazdan çıkmaz</mark>.');
    await highlight('#exp-fab', 900);
    await tap('#exp-fab', 1000);
    await chat(330);
    await wait(300);
    await scrollTo('#exp-body .cb-chart', 60); await wait(500);
    await sub('Solunan miktar ≈ tahmini derişim × <mark>solunum hızı (US EPA, 2011)</mark> × süre.'); await wait(4000);
    await scrollTo('#mx-jmap', 70); await wait(600);
    await F().evaluate(() => document.getElementById('mx-jplay').click());
    await sub('Gün boyu <mark>nerede, ne kadar</mark> solunduğu haritada.'); await wait(6300);
    // Kapanış
    mark('kapanis');
    await card(OUTRO);
    await wait(7000);
    await page.evaluate(() => window.veil(true)); await wait(900);
    mark('son');
  } else {
    // ── Tanıtım (≈2,5 dk, 16:9) ──
    const CMP = `<h3>Sabit ve taşınabilir sensörler</h3><div class="cmp">
      <section><h4>Sabit sensörler</h4><div class="dev">PurpleAir PA-II · dış ortam ve Amfi 1 (iç ortam)</div>
        <dl><dt>Ölçüm</dt><dd>Sürekli; 2 dakikalık zaman çözünürlüğü</dd><dt>Amaç</dt><dd>Kampüsün genel hava kalitesi, iç/dış karşılaştırması ve WHO kılavuz değeriyle karşılaştırma</dd></dl></section>
      <section><h4>Taşınabilir sensörler</h4><div class="dev">Atmotube Pro (5 cihaz) · GPS konumlu</div>
        <dl><dt>Ölçüm</dt><dd>Planlı saha yürüyüşleri; kısa süreli, konumlu</dd><dt>Amaç</dt><dd>Bina bazlı karakterizasyon; binalar arası farkların kampüs saha ortalamasına göre belirlenmesi</dd></dl></section></div>
      <div class="note">Düşük maliyetli optik sensörler. PurpleAir PM₂.₅ değerlerine US EPA düzeltmesi uygulanır; Atmotube değerleri ham ve görelidir.</div>`;
    await page.evaluate(() => window.veil(false));
    await card(`${LOGO_IMG}<h1>GTÜ <i>Air</i>Lab</h1><div class="sub">Kampüs Hava Kalitesi Laboratuvarı · Gebze Teknik Üniversitesi</div>
      <div class="rule"></div><div class="sub" style="margin-top:0">Kampüs ölçekli ince partikül madde (PM₂.₅) izleme ve açık veri paylaşımı</div>`);
    await wait(6500);
    await card(`<h3>Neden ölçüyoruz?</h3><ul>
      <li><span class="n">1</span><span><b>PM₂.₅</b>, çapı 2,5 mikrometreden küçük parçacıklardır; solunum yollarının derinlerine ulaşabilir.</span></li>
      <li><span class="n">2</span><span>Dünya Sağlık Örgütü (WHO, 2021) kılavuzu: <b>24 saatlik ortalama 15 µg/m³</b>, yıllık ortalama 5 µg/m³.</span></li>
      <li><span class="n">3</span><span>Amaç: kampüs içindeki <b>zamansal ve mekânsal değişkenliği</b> ölçmek ve sonuçları yöntemiyle birlikte paylaşmak.</span></li></ul>`);
    await wait(10500);
    await card(CMP);
    await wait(10000);
    await cap('Anlık durum', 'Ulusal Hava Kalitesi İndeksi (HKİ) ile sınıflandırma · veri kaynağı ve ölçüm zamanı belirtilir');
    await card(null); await wait(600);
    await sub('Sabit hava kalitesi sensörünün son ölçümü, <mark>Ulusal Hava Kalitesi İndeksi</mark> ile'); await wait(3300);
    await sub('Altı sınıf: <mark>İyi, Orta, Hassas, Sağlıksız, Kötü, Tehlikeli</mark>'); await wait(3200);
    await sub('Genel nüfus ve hassas gruplar için <mark>öneriler</mark>');
    await scroll('#ozet-body', 520, 3500); await wait(2500);
    await sub('Aylık özet: <mark>kılavuz değeri aşan gün sayısı</mark>');
    await scroll('#ozet-body', 520, 3500); await wait(3000);
    await cap('Ölçüm ağı', 'Sabit sensörler ve taşınabilir cihazların konumları; bina adına göre arama');
    await sub('Kuzey ve Güney kampüs, <mark>bina ölçeğinde</mark>');
    await click('#ozet-close', 900);
    await F().evaluate(() => { map.flyTo([40.8105, 29.3575], 16.6, { duration: 2.5 }); }); await wait(4200);
    await sub('Sabit sensör ve <mark>taşınabilir cihazlar</mark> aynı haritada');
    await F().evaluate(() => { map.flyTo([40.8114, 29.3563], 15.6, { duration: 2 }); }); await wait(3200);
    await cap('WHO (2021) kılavuz değeriyle karşılaştırma', 'Sabit sensörün günlük ortalamaları · kısa süreli saha ölçümleri 24 saatlik değerle karşılaştırılmaz');
    await sub('WHO 24 saatlik kılavuz değeri <mark>15 µg/m³</mark>, yıllık <mark>5 µg/m³</mark>');
    await click('#who-btn', 4500);
    await sub('Kılavuz değeri aşan günler <mark>ayrı renkte</mark> gösterilir');
    await scroll('#who-body', 600, 4000); await wait(3500);
    await cap('Kişisel maruziyet tahmini', 'Zaman, konum ve etkinlik bilgisinden solunan PM₂.₅ miktarı (µg) · girilen bilgiler cihazdan çıkmaz');
    await click('#who-close', 900);
    await sub('Haritadaki <mark>yuvarlak düğme</mark> maruziyet asistanını açar');
    await click('#exp-fab', 1800);
    await sub('Girdiler: saat, etkinlik, bina, <mark>havalandırma</mark> ve süre');
    await chat(1150);
    await sub('Solunan miktar = derişim × <mark>solunum hızı (US EPA, 2011)</mark> × süre');
    await wait(600); await scrollTo('#exp-body .cb-chart', 70); await wait(4200);
    await sub('Gün boyu <mark>nerede, ne kadar</mark> solunduğu haritada'); await scrollTo('#mx-jmap', 70); await wait(700);
    await click('#mx-jplay', 6500);
    await cap('Yöntem ve sınır değerler', 'HKİ kesim noktaları; WHO (2021), Türkiye ve AB (2030) değerleri; sınırlılıklar ve kaynaklar');
    await click('#exp-close', 700);
    await click('#info-btn', 1500);
    await sub('Her eşik ve hesap <mark>kaynağıyla birlikte</mark> belirtilir');
    await F().evaluate(() => document.getElementById('inf-sinir').scrollIntoView({ behavior: 'smooth', block: 'start' })); await wait(4500);
    await scroll('#info-body', 380, 3000); await wait(2500);
    await cap('Araştırma görünümü', 'Sensör panelleri, Amfi 1 iç ortam analizi, saha ölçüm oturumları ve bina ortalamaları');
    await click('#info-close', 700);
    await sub('Teknik ayrıntılar <mark>Araştırma görünümünde</mark>');
    await click('#research-btn', 4500);
    await sub('Canlı sensörler, <mark>iç ortam</mark> ve saha ölçüm oturumları'); await wait(5000);
    await cap('Duyurular', 'Sensör kesintisi ve HKİ “Hassas” üzeri durumlarda otomatik bilgilendirme');
    await click('#research-btn', 800);
    await sub('Sensör kesintisi ve yüksek derişimde <mark>otomatik duyuru</mark>');
    await click('#news-btn', 6500);
    await sub(null);
    await card(`<h3>Gizlilik</h3><ul>
      <li><span class="n">1</span><span>Üyelik, çerez, reklam ya da izleme aracı <b>yoktur</b>.</span></li>
      <li><span class="n">2</span><span>Asistana girilen bilgiler <b>cihazınızdan çıkmaz</b>.</span></li>
      <li><span class="n">3</span><span>Saha ekibinin kimliği gösterilmez; kampüs dışındaki konumlar yayımlanmaz.</span></li></ul>`);
    await wait(8500);
    mark('kapanis');
    await card(OUTRO); await wait(7500);
    await page.evaluate(() => window.veil(true)); await wait(900);
    mark('son');
  }

  await cdp.send('Page.stopScreencast');
  await chain;
  if (last) for (let i = 0; i < 15; i++) { await write(last); written++; }
  ff.stdin.end();
  await new Promise(r => ff.on('close', r));
  fs.writeFileSync(OUT.replace(/\.mp4$/, '.sahneler.json'), JSON.stringify(marks, null, 1));
  const dur = written / 30;
  console.log(MODE, 'kare:', written, 'süre:', dur.toFixed(1), 'sn', '· yakalanan kare/sn:', (frames / dur).toFixed(1), '→', OUT);
  console.log('sahneler:', JSON.stringify(marks));
  console.log(errs.join('\n') || 'JS hatası yok');
  await b.close();
})();
