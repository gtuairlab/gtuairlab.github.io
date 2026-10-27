// COP31 Stant 11 döngü filmi · deterministik çizim: FILM.render(t) (t saniye, 0 ≤ t < T). Saat yok, rastgelelik tohumlu.
// Sayılar ve kaynakları: storyboard.md. Sayıları burada değiştirme; değişirse storyboard.md ile birlikte güncelle.
(() => {
'use strict';
const W = 1920, H = 1080;
const $ = id => document.getElementById(id);
const cl = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, u) => a + (b - a) * u;
const pr = (t, a, d) => cl((t - a) / d);
const E = {
  io: u => u < .5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2,
  o: u => 1 - Math.pow(1 - u, 3),
  i: u => u * u * u,
  s: u => -(Math.cos(Math.PI * u) - 1) / 2,
};
const C = { navy: '#0B2E33', cream: '#F4F1EA', ink: '#0B2E33', mutD: '#B5CACB', mutL: '#4A5468', acc: '#F5A623', accInk: '#8F5600',
  good: '#00cc00', mod: '#ffcc00', pa: '#6380f0', ind: '#d4566b', atm: '#2fa79a' };
const NS = 'http://www.w3.org/2000/svg';
function sv(tag, at, parent) { const e = document.createElementNS(NS, tag); for (const k in at) e.setAttribute(k, at[k]); if (parent) parent.appendChild(e); return e; }
function vis(el, op) { el.style.opacity = op; el.style.visibility = op < .002 ? 'hidden' : 'visible'; }
// giriş/çıkış: a = giriş başlangıcı, b = çıkış başlangıcı (yerel saniye)
function fx(el, lt, a, b, o = {}) {
  const d = o.d ?? .8, dy = o.dy ?? 28, dx = o.dx ?? 0, sc = o.s ?? 0;
  const ui = E.o(pr(lt, a, d)), uo = b == null ? 0 : E.i(pr(lt, b, o.od ?? .55));
  vis(el, ui * (1 - uo));
  el.style.transform = `translate(${(1 - ui) * dx}px,${(1 - ui) * dy - uo * (o.ody ?? 14)}px) scale(${1 - (1 - ui) * sc})`;
  return ui * (1 - uo);
}
function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const ico = n => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${window.ICONS[n]}</svg>`;
const hex2rgb = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];

// ── sahne zaman çizelgesi (saniye) ──
const SCN = [['open', 11], ['gap', 18], ['built', 22], ['evid', 25], ['timing', 20], ['visit', 24], ['app', 20], ['next', 15], ['join', 15]];
const SC = {}; let T = 0;
SCN.forEach(([id, d], i) => { SC[id] = { id, t0: T, d, i, el: $('s_' + id) }; SC[id].el.style.zIndex = i + 1; T += d; });
const WIPE = .9;

// ═══════════ VERİ (kaynaklar storyboard.md) ═══════════
// Kampüs saatlik profili, 1 Mayıs – 12 Ekim 2026, Türkiye saati (rapor 2026-10-13, b_zaman.py → dall; sunum "campus" slaytı)
const PROF = [13.06, 13.63, 14.27, 14.81, 15.39, 15.92, 16.47, 16.08, 14.83, 13.84, 12.96, 12.42, 12.38, 12.29, 11.5, 10.66, 9.77, 9.54, 9.39, 9.86, 10.29, 11.22, 12.14, 12.77];

// ═══════════ PARÇACIKLAR (açılış ve kapanış; T ile periyodik → kesintisiz döngü) ═══════════
const PCOL = ['#00cc00', '#00cc00', '#ffcc00', '#ffcc00', '#ff8800', '#6380f0', '#2fa79a', '#F4F1EA', '#ff8800', '#bb44bb'];
let PART = [];
function makeParticles(targets) {
  const r = rng(20261112); PART = [];
  const mk = (tg) => {
    const c = PCOL[(r() * PCOL.length) | 0];
    return { x0: r(), y0: r(), k: 1 + ((r() * 3) | 0), m: 2 + ((r() * 4) | 0), A: 10 + r() * 34, ph: r() * 6.283, r: 1.6 + r() * 3.2,
      rgb: hex2rgb(c), a: .5 + r() * .4, tg, dl: tg ? .9 * tg[0] / W + r() * .25 : 0 };
  };
  for (const tg of targets) PART.push(mk(tg));
  for (let i = 0; i < 380; i++) PART.push(mk(null));
}
function drift(p, t) {
  const x = p.x0 * W + p.A * Math.sin(2 * Math.PI * p.m * t / T + p.ph);
  const y = ((((p.y0 - p.k * t / T) % 1) + 1) % 1) * (H + 60) - 30;
  return [x, y];
}
const CR = hex2rgb(C.cream);
function drawParticles(ctx, t, gAlpha, lt1) {   // lt1: açılış sahnesinin yerel zamanı (başlığa toplanma) ya da null
  ctx.clearRect(0, 0, W, H);
  if (gAlpha <= 0) return;
  for (const p of PART) {
    let [x, y] = drift(p, t), u = 0, a = p.a * gAlpha, rad = p.r, rgb = p.rgb;
    if (p.tg && lt1 != null) {
      u = E.io(pr(lt1, 1.0 + p.dl, 2.6)) * (1 - E.io(pr(lt1, 9.85 + p.dl * .5, 1.5)));
      x = lerp(x, p.tg[0], u); y = lerp(y, p.tg[1], u); rad = lerp(p.r, 2.7, u);
      rgb = [lerp(rgb[0], CR[0], u), lerp(rgb[1], CR[1], u), lerp(rgb[2], CR[2], u)];
      a = lerp(a, 1, u) * cl(1 - pr(lt1, 4.45, .8) + pr(lt1, 9.55, .45));
    } else if (!p.tg && lt1 != null) {
      a *= 1 - .45 * E.s(pr(lt1, 4, 1.2)) * (1 - pr(lt1, 9.6, .8));
    }
    if (a <= .01) continue;
    ctx.globalAlpha = a; ctx.fillStyle = `rgb(${rgb[0] | 0},${rgb[1] | 0},${rgb[2] | 0})`;
    ctx.beginPath(); ctx.arc(x, y, rad, 0, 6.2832); ctx.fill();
  }
  ctx.globalAlpha = 1;
}
// ═══════════ SAHNE KURULUMLARI ═══════════
const D = {};   // sahne çizim işlevleri

// ── 1 · Açılış ──
let pc1, pc9;
function setupOpen() {
  pc1 = $('pc1').getContext('2d'); pc9 = $('pc9').getContext('2d');
  // başlık hedef noktaları: DOM metniyle aynı konumdaki tuval çizimi örneklenir
  const el = $('o_title'), sc = SC.open.el; sc.style.visibility = 'visible'; vis(el, 1); el.style.transform = 'none';
  const cs = getComputedStyle(el), fs = parseFloat(cs.fontSize);
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const x = cv.getContext('2d');
  x.font = `600 ${fs}px "Source Serif 4"`; x.letterSpacing = cs.letterSpacing; x.textAlign = 'center'; x.textBaseline = 'alphabetic'; x.fillStyle = '#fff';
  const lines = ['Breathing smarter', 'on campus'];
  [...el.querySelectorAll('.bl')].forEach((m, i) => {
    // .bl: satır başındaki sıfır genişlikli satır içi blok, alt kenarı taban çizgisinde
    const r = m.getBoundingClientRect(); x.fillText(lines[i], W / 2, r.bottom);
  });
  const img = x.getImageData(0, 0, W, H).data, tg = [], st = 6;
  for (let yy = 0; yy < H; yy += st) for (let xx = (yy / st) % 2 ? 3 : 0; xx < W; xx += st) if (img[(yy * W + xx) * 4 + 3] > 140) tg.push([xx, yy]);
  makeParticles(tg);
  D.titleN = tg.length;
}
D.open = lt => {
  const t = lt;   // açılış t0 = 0
  drawParticles(pc1, t, 1, lt);
  vis($('o_title'), E.o(pr(lt, 4.3, 1.0)) * (1 - E.i(pr(lt, 9.55, .5))));
  fx($('o_brand'), lt, 4.9, 9.5); fx($('o_sub'), lt, 5.4, 9.6); fx($('o_sub2'), lt, 5.9, 9.65); fx($('o_sub3'), lt, 6.4, 9.7);
};

// ── 2 · Boşluk ──
let gDots = [], gWords = [], gUnder = [];
function splitWords(el) {
  const out = [];
  [...el.childNodes].forEach(n => {
    if (n.nodeType === 3) {
      const parts = n.textContent.split(/(\s+)/), frag = document.createDocumentFragment();
      for (const p of parts) { if (!p) continue; if (/^\s+$/.test(p)) { frag.appendChild(document.createTextNode(p)); continue; }
        const s = document.createElement('span'); s.textContent = p; s.style.display = 'inline-block'; frag.appendChild(s); out.push(s); }
      el.replaceChild(frag, n);
    } else { n.style.display = 'inline-block'; out.push(n); }
  });
  return out;
}
function setupGap() {
  const s = $('g_dots'); s.setAttribute('height', 120);
  for (let i = 0; i < 100; i++) { const c = (i / 5) | 0, r = i % 5;
    gDots.push(sv('circle', { cx: 12 + c * 24, cy: 12 + r * 24, r: 8, fill: 'none', stroke: i === 99 ? C.accInk : C.ink, 'stroke-width': 2.5 }, s)); }
  gWords = splitWords($('g_st'));
  gUnder = [...$('g_st').querySelectorAll('.u')].map(u => { const i = document.createElement('i'); u.appendChild(i); return i; });
}
D.gap = lt => {
  const O = SC.gap.d - .85;
  fx($('g_k'), lt, .6, O); fx($('g_h'), lt, .85, O + .05, { dy: 34 });
  fx($('g_c1'), lt, 1.6, O + .1); fx($('g_c2'), lt, 3.1, O + .15); fx($('g_c3'), lt, 4.6, O + .2);
  const k = Math.round(99 * E.io(pr(lt, 2.0, 1.7)));
  gDots.forEach((c, i) => c.setAttribute('fill', i < k ? C.ink : 'none'));
  $('g_n1').textContent = Math.round(99 * E.o(pr(lt, 2.0, 1.7)));
  $('g_n2').textContent = (4.2 * E.o(pr(lt, 3.3, 1.5))).toFixed(1);
  $('g_n3').textContent = Math.round(90 * E.o(pr(lt, 4.8, 1.5)));
  $('g_meter').style.width = (480 * .9 * E.io(pr(lt, 4.8, 1.5))) + 'px';
  const ru = E.io(pr(lt, 6.3, 1.0)); vis($('g_rule'), ru * (1 - pr(lt, O, .5))); $('g_rule').style.transform = `scaleX(${ru})`; $('g_rule').style.transformOrigin = '0 0';
  vis($('g_st'), 1 - E.i(pr(lt, O + .2, .55)));
  gWords.forEach((w, i) => fx(w, lt, 6.9 + i * .075, null, { dy: 20, d: .6 }));
  gUnder.forEach((u, i) => { u.style.width = (100 * E.io(pr(lt, 8.9 + i * .45, .6))) + '%'; });
  fx($('g_src'), lt, 7.6, O + .2, { dy: 10 });
};

// ── 3 · Ne kurduk (uydu haritası) ──
const TEX = { SUMER: [1652, 1113], CHEM: [1815, 1169], LIB: [1438, 1067] };
// giyilebilir Atmotube'lar: kampüsün farklı bölgelerinde aynı anda dolaşan 5 temsilî cihaz (kapalı döngü, doku koordinatı)
const LOOPS = [[[1380, 1000], [1470, 990], [1500, 1060], [1440, 1120], [1370, 1090]],
  [[1560, 950], [1700, 960], [1740, 1020], [1640, 1040], [1560, 1010]],
  [[1790, 1080], [1890, 1100], [1910, 1220], [1810, 1250], [1770, 1160]],
  [[1380, 1250], [1500, 1230], [1540, 1330], [1430, 1400], [1360, 1330]],
  [[1600, 1330], [1720, 1310], [1760, 1420], [1640, 1460], [1570, 1400]]];
const CAMPUS = [[1340, 960], [1900, 960], [2000, 1060], [2000, 1300], [1800, 1480], [1400, 1470], [1330, 1300]];   // geçmiş saha noktaları bu çokgen içinde
function loopFn(L) { const P = L.concat([L[0]]), seg = []; let T0 = 0;
  for (let i = 1; i < P.length; i++) { const l = Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]); seg.push(l); T0 += l; }
  return u => { u = ((u % 1) + 1) % 1; let d = u * T0; for (let i = 0; i < seg.length; i++) { if (d <= seg[i] || i === seg.length - 1) { const f = cl(d / seg[i]); return [lerp(P[i][0], P[i + 1][0], f), lerp(P[i][1], P[i + 1][1], f)]; } d -= seg[i]; } }; }
function inPoly(x, y, P) { let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) if ((P[i][1] > y) !== (P[j][1] > y) && x < (P[j][0] - P[i][0]) * (y - P[i][1]) / (P[j][1] - P[i][1]) + P[i][0]) c = !c; return c; }
const FOC = [1120, 560];
let bS = {};
function mapS(lt) { return lerp(1.02, 1.10, E.s(cl(lt / SC.built.d))); }
const P = (p, s) => [(p[0] - TEX.SUMER[0]) * s + FOC[0], (p[1] - TEX.SUMER[1]) * s + FOC[1]];
function bez(a, b, c, d, u) { const v = 1 - u; return [v * v * v * a[0] + 3 * v * v * u * b[0] + 3 * v * u * u * c[0] + u * u * u * d[0], v * v * v * a[1] + 3 * v * v * u * b[1] + 3 * v * u * u * c[1] + u * u * u * d[1]]; }
function setupBuilt() {
  const s = $('b_svg');
  bS.streams = [0, 1, 2].map(i => sv('path', { fill: 'none', stroke: [C.pa, C.ind, C.atm][i], 'stroke-width': 3, 'stroke-opacity': .55, 'stroke-linecap': 'round' }, s));
  bS.packets = [0, 1, 2].map(i => [0, 1, 2, 3].map(() => sv('circle', { r: 8, fill: [C.pa, C.ind, C.atm][i], stroke: C.navy, 'stroke-width': 3 }, s)));
  const rr = rng(7); bS.past = [];
  while (bS.past.length < 240) { const x = 1330 + rr() * 680, y = 950 + rr() * 530; if (inPoly(x, y, CAMPUS)) bS.past.push({ p: [x, y], d: rr(), el: sv('circle', { r: 3.5, fill: C.atm }, s) }); }
  bS.dev = LOOPS.map((L, i) => ({ f: loopFn(L), sp: 1 / (8 + i * 1.3), off: i * .21,
    trail: [...Array(12).keys()].map(() => sv('circle', { r: 5, fill: C.atm }, s)) }));
  bS.dev.forEach((d, i) => { d.el = sv('circle', { r: 11, fill: C.atm, stroke: C.cream, 'stroke-width': 4 }, s);
    d.lab = sv('text', { fill: C.cream, 'font-family': 'Inter', 'font-size': 28, 'font-weight': 600, stroke: C.navy, 'stroke-width': 5, 'paint-order': 'stroke' }, s); d.lab.textContent = 'ATP-' + (i + 1); });
  bS.pulses = [0, 1, 2].map(() => sv('circle', { fill: 'none', stroke: C.pa, 'stroke-width': 3 }, s));
  bS.pa = sv('circle', { r: 15, fill: C.pa, stroke: C.navy, 'stroke-width': 4 }, s);
  bS.ind = sv('rect', { width: 30, height: 30, rx: 6, fill: C.ind, stroke: C.navy, 'stroke-width': 4 }, s);
  bS.indRing = sv('rect', { width: 30, height: 30, rx: 8, fill: 'none', stroke: C.ind, 'stroke-width': 3 }, s);
}
D.built = lt => {
  const d = SC.built.d, O = d - .85, s = mapS(lt);
  const el = SC.built.el;
  if (lt < 1.4) { const R = 2300 * E.io(pr(lt, 0, 1.4)); el.style.clipPath = `circle(${R}px at ${FOC[0]}px ${FOC[1]}px)`; } else el.style.clipPath = 'none';
  $('b_map').style.transform = `translate(${FOC[0] - TEX.SUMER[0] * s}px,${FOC[1] - TEX.SUMER[1] * s}px) scale(${s})`;
  vis($('b_mapwrap'), 1);
  fx($('b_panel'), lt, .7, O + .2, { dx: -80, dy: 0, d: .9 });
  fx($('b_k'), lt, 1.0, O); fx($('b_h'), lt, 1.2, O + .05, { dy: 34 });
  fx($('b_l1'), lt, 3.2, O + .1); fx($('b_l2'), lt, 6.2, O + .15); fx($('b_l3'), lt, 10.2, O + .2); fx($('b_l4'), lt, 13.6, O + .25);
  fx($('b_src'), lt, 3.0, O + .3, { dy: 10 });
  const pa = P(TEX.SUMER, s), ch = P(TEX.CHEM, s);
  // 1 · çatı PurpleAir: yayılan halkalar (simgesel; ölçüm 2 dakikada bir)
  const u1 = E.o(pr(lt, 3.0, .6)) * (1 - pr(lt, O + .3, .5));
  bS.pa.setAttribute('cx', pa[0]); bS.pa.setAttribute('cy', pa[1]); bS.pa.setAttribute('r', 15 * u1); bS.pa.style.opacity = u1;
  bS.pulses.forEach((c, j) => { const ph = (((lt - 3.0) / 2.0 + j / 3) % 1 + 1) % 1; c.setAttribute('cx', pa[0]); c.setAttribute('cy', pa[1]);
    c.setAttribute('r', 18 + 74 * ph); c.style.opacity = lt > 3.0 ? (1 - ph) * .75 * u1 : 0; });
  // 2 · iç ortam PurpleAir (derslik)
  const u2 = E.o(pr(lt, 6.0, .6)) * (1 - pr(lt, O + .3, .5));
  bS.ind.setAttribute('x', ch[0] - 15); bS.ind.setAttribute('y', ch[1] - 15); bS.ind.style.opacity = u2;
  bS.ind.style.transform = `scale(${.3 + .7 * u2})`; bS.ind.style.transformOrigin = `${ch[0]}px ${ch[1]}px`;
  const ph2 = (((lt - 6) / 2.4) % 1 + 1) % 1, g = 6 + 30 * ph2;
  bS.indRing.setAttribute('x', ch[0] - 15 - g); bS.indRing.setAttribute('y', ch[1] - 15 - g); bS.indRing.setAttribute('width', 30 + 2 * g); bS.indRing.setAttribute('height', 30 + 2 * g);
  bS.indRing.style.opacity = lt > 6 ? (1 - ph2) * .6 * u2 : 0;
  // 3 · giyilebilir Atmotube'lar: 5 cihaz aynı anda + soluk geçmiş saha noktaları (temsilî konumlar, kampüs içi)
  const fade3 = 1 - pr(lt, O + .3, .5), u3 = E.o(pr(lt, 10.0, .8)) * fade3;
  bS.past.forEach(o => { const q = P(o.p, s); o.el.setAttribute('cx', q[0]); o.el.setAttribute('cy', q[1]); o.el.style.opacity = .3 * E.o(pr(lt, 10.0 + o.d * 2.5, .6)) * fade3; });
  const heads = bS.dev.map((d, i) => { const u = (lt - 10) * d.sp + d.off, q = P(d.f(u), s);
    d.el.setAttribute('cx', q[0]); d.el.setAttribute('cy', q[1]); d.el.style.opacity = u3;
    d.lab.setAttribute('x', q[0] + 18); d.lab.setAttribute('y', q[1] - 14); d.lab.style.opacity = u3;
    d.trail.forEach((c, k) => { const t = P(d.f(u - (k + 1) * .012), s); c.setAttribute('cx', t[0]); c.setAttribute('cy', t[1]); c.style.opacity = u3 * .8 * (1 - k / 12); });
    return q; });
  const head = heads[2];
  // kartlar (geçici çağrı etiketleri; kimlik sol paneldeki lejantta kalır)
  const c1 = $('b_c1'), c2 = $('b_c2'), c3 = $('b_c3');
  c1.style.left = (pa[0] - 40) + 'px'; c1.style.top = (pa[1] - 132) + 'px';
  c2.style.left = (ch[0] + 34) + 'px'; c2.style.top = (ch[1] - 30) + 'px';
  c3.style.left = '830px'; c3.style.top = '900px';
  fx(c1, lt, 3.3, 9.0, { dy: 16 }); fx(c2, lt, 6.3, 10.2, { dy: 16 }); fx(c3, lt, 10.4, O, { dy: 16 });
  // telefon ve veri akışı
  fx($('b_phone'), lt, 11.4, O + .2, { dx: 120, dy: 0, d: 1.0 });
  const ends = [[1546, 470], [1546, 590], [1546, 710]], srcs = [pa, ch, head];
  const su = E.io(pr(lt, 12.4, 1.2)) * (1 - pr(lt, O, .5));
  bS.streams.forEach((p, i) => {
    const a = srcs[i], b = ends[i], c1p = [lerp(a[0], b[0], .45), a[1] - 40], c2p = [lerp(a[0], b[0], .7), b[1]];
    p.setAttribute('d', `M${a[0]},${a[1]} C${c1p[0]},${c1p[1]} ${c2p[0]},${c2p[1]} ${b[0]},${b[1]}`);
    const len = p.getTotalLength(); p.setAttribute('stroke-dasharray', `${len} ${len}`); p.setAttribute('stroke-dashoffset', len * (1 - su));
    p.style.opacity = su;
    bS.packets[i].forEach((k, j) => { const ph = (((lt - 13.4) / 2.2 + j / 4 + i * .13) % 1 + 1) % 1; const q = bez(a, c1p, c2p, b, ph);
      k.setAttribute('cx', q[0]); k.setAttribute('cy', q[1]); k.style.opacity = lt > 13.4 ? su * Math.min(1, ph * 6, (1 - ph) * 6) : 0; });
  });
};

// ── 4 · Kanıt: günlük döngü ──
const EV = { x0: 170, x1: 1120, y0: 600, ppu: 25 };   // e_svg içi: değer 0 → y 600, 20 → y 100
const xh = h => EV.x0 + h * (EV.x1 - EV.x0) / 23, yv = v => EV.y0 - v * EV.ppu;
let eS = {};
function setupEvid() {
  const s = $('e_svg');
  eS.bands = sv('g', {}, s);
  sv('rect', { x: EV.x0, y: yv(20), width: EV.x1 - EV.x0, height: yv(12) - yv(20), fill: C.mod, 'fill-opacity': .075 }, eS.bands);
  sv('rect', { x: EV.x0, y: yv(12), width: EV.x1 - EV.x0, height: yv(0) - yv(12), fill: C.good, 'fill-opacity': .07 }, eS.bands);
  const tx = (x, y, t, at = {}) => { const e = sv('text', Object.assign({ x, y, fill: C.mutD, 'font-family': 'Inter', 'font-size': 28 }, at), s); e.textContent = t; return e; };
  eS.bandLab = [tx(EV.x0 + 14, yv(20) + 36, 'national AQI: Moderate'), tx(EV.x0 + 14, yv(0) - 16, 'national AQI: Good')];
  eS.grid = sv('g', {}, s);
  for (const v of [0, 5, 10, 15, 20]) { sv('line', { x1: EV.x0, x2: EV.x1, y1: yv(v), y2: yv(v), stroke: 'rgba(244,241,234,.16)', 'stroke-width': 1.5 }, eS.grid);
    const t = sv('text', { x: EV.x0 - 18, y: yv(v) + 10, fill: C.mutD, 'font-family': 'Inter', 'font-size': 28, 'text-anchor': 'end' }, eS.grid); t.textContent = v; }
  for (let h = 0; h <= 21; h += 3) { const t = sv('text', { x: xh(h), y: yv(0) + 44, fill: C.mutD, 'font-family': 'Inter', 'font-size': 28, 'text-anchor': 'middle' }, eS.grid); t.textContent = String(h).padStart(2, '0') + ':00'; }
  const ut = sv('text', { x: EV.x0 - 18, y: yv(20) - 34, fill: C.mutD, 'font-family': 'Inter', 'font-size': 28, 'text-anchor': 'start' }, eS.grid);
  ut.innerHTML = 'PM<tspan font-size="18" dy="7">2.5</tspan><tspan dy="-7"> (µg/m³)</tspan>';
  const xt = sv('text', { x: (EV.x0 + EV.x1) / 2, y: yv(0) + 92, fill: C.mutD, 'font-family': 'Inter', 'font-size': 28, 'text-anchor': 'middle' }, eS.grid); xt.textContent = 'Hour of day (Türkiye time)';
  eS.win = [6, 16].map(h => { const g = sv('g', {}, s);
    sv('rect', { x: xh(h), y: yv(20), width: xh(h + 3) - xh(h), height: yv(0) - yv(20), fill: C.cream, 'fill-opacity': .09 }, g);
    const t = sv('text', { x: (xh(h) + xh(h + 3)) / 2, y: yv(0) - 16, fill: C.cream, 'font-family': 'Inter', 'font-size': 28, 'font-weight': 600, 'text-anchor': 'middle' }, g);
    t.textContent = h === 6 ? '06:00–09:00' : '16:00–19:00'; return g; });
  eS.area = sv('path', { fill: C.pa, 'fill-opacity': .14 }, s);
  eS.line = sv('path', { fill: 'none', stroke: C.pa, 'stroke-width': 6, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }, s);
  eS.peak = sv('circle', { r: 11, fill: C.pa, stroke: C.navy, 'stroke-width': 4, cx: xh(6), cy: yv(PROF[6]) }, s);
  eS.low = sv('circle', { r: 11, fill: C.pa, stroke: C.navy, 'stroke-width': 4, cx: xh(18), cy: yv(PROF[18]) }, s);
  eS.head = sv('circle', { r: 12, fill: C.cream, stroke: C.navy, 'stroke-width': 4 }, s);
  eS.headT = sv('text', { fill: C.cream, 'font-family': 'Inter', 'font-size': 30, 'font-weight': 600, 'text-anchor': 'middle' }, s);
  eS.peakT = sv('text', { x: xh(6) + 26, y: yv(PROF[6]) - 22, fill: C.cream, 'font-family': 'Inter', 'font-size': 30, 'font-weight': 600 }, s);
  eS.peakT.textContent = 'Peak · 06:00 · 16.5 µg/m³';
  eS.lowT = sv('text', { x: xh(18), y: yv(PROF[18]) + 52, fill: C.cream, 'font-family': 'Inter', 'font-size': 30, 'font-weight': 600, 'text-anchor': 'middle' }, s);
  eS.lowT.textContent = 'Lowest · 18:00 · 9.4 µg/m³';
  // ölçer: 12,7 dönem ortalaması, 0–15 ölçeği, WHO yıllık 5 işareti
  const m = $('e_meter'), sx = v => v / 15 * 520;
  sv('rect', { x: 0, y: 6, width: 520, height: 30, rx: 6, fill: 'rgba(244,241,234,.12)' }, m);
  eS.mbar = sv('rect', { x: 0, y: 6, width: 0, height: 30, rx: 6, fill: C.pa }, m);
  sv('line', { x1: sx(5), x2: sx(5), y1: 0, y2: 50, stroke: C.acc, 'stroke-width': 4 }, m);
  const mt = sv('text', { x: 0, y: 82, fill: C.mutD, 'font-family': 'Inter', 'font-size': 28 }, m); mt.innerHTML = '<tspan fill="#F5A623">▲</tspan> WHO annual guideline: 5 µg/m³';
  // 154 tam gün, 42'si > 15 µg/m³ (birim grafik; kareler tarih sırası değildir)
  const wf = $('e_waf'); wf.setAttribute('height', 140); eS.waf = [];
  for (let i = 0; i < 154; i++) { const c = (i / 7) | 0, r = i % 7;
    eS.waf.push(sv('rect', { x: c * 20 + 1, y: r * 20 + 1, width: 16, height: 16, rx: 3, fill: 'none', stroke: 'rgba(244,241,234,.38)', 'stroke-width': 1.5 }, wf)); }
}
D.evid = lt => {
  const d = SC.evid.d, O = d - .85;
  fx($('e_k'), lt, .7, O); fx($('e_h'), lt, .95, O + .05, { dy: 34 });
  vis($('e_svg'), E.o(pr(lt, 1.3, .8)) * (1 - E.i(pr(lt, O + .1, .55))));
  const hp = 23 * E.s(pr(lt, 2.2, 5.4));
  let dl = '', da = '';
  for (let h = 0; h <= Math.floor(hp); h++) dl += (h ? 'L' : 'M') + xh(h) + ',' + yv(PROF[h]);
  const hf = Math.floor(hp), fr = hp - hf, vEnd = hf < 23 ? lerp(PROF[hf], PROF[hf + 1], fr) : PROF[23];
  if (hf < 23) dl += 'L' + xh(hp) + ',' + yv(vEnd);
  da = dl + `L${xh(hp)},${yv(0)}L${xh(0)},${yv(0)}Z`;
  eS.line.setAttribute('d', lt > 2.2 ? dl : ''); eS.area.setAttribute('d', lt > 2.2 ? da : '');
  const drawing = lt > 2.2 && lt < 7.8;
  eS.head.setAttribute('cx', xh(hp)); eS.head.setAttribute('cy', yv(vEnd)); eS.head.style.opacity = drawing ? 1 - pr(lt, 7.4, .4) : 0;
  eS.headT.setAttribute('x', xh(hp)); eS.headT.setAttribute('y', yv(vEnd) - 30); eS.headT.textContent = String(Math.round(hp) % 24).padStart(2, '0') + ':00';
  eS.headT.style.opacity = drawing && Math.abs(hp - 6) > 1.2 && Math.abs(hp - 18) > 1.2 ? 1 - pr(lt, 7.4, .4) : 0;
  const pk = E.o(pr(hp, 6, .8)), lw = E.o(pr(hp, 18, .8));
  eS.peak.style.opacity = pk; eS.peakT.style.opacity = pk; eS.low.style.opacity = lw; eS.lowT.style.opacity = lw;
  eS.bandLab.forEach(e => e.style.opacity = E.o(pr(lt, 1.8, .8)));
  eS.win.forEach((g, i) => g.style.opacity = E.o(pr(lt, 17.0 + i * .6, .7)));
  fx($('e_t1'), lt, 8.4, O + .1); fx($('e_t2'), lt, 11.0, O + .15);
  $('e_n1').textContent = (12.7 * E.o(pr(lt, 8.6, 1.5))).toFixed(1);
  eS.mbar.setAttribute('width', 12.7 / 15 * 520 * E.io(pr(lt, 8.8, 1.4)));
  $('e_n2').textContent = Math.round(42 * E.o(pr(lt, 11.2, 1.6)));
  const k = Math.round(42 * E.io(pr(lt, 11.2, 1.6)));
  eS.waf.forEach((r, i) => { r.setAttribute('fill', i < k ? C.acc : 'none'); r.setAttribute('stroke', i < k ? C.acc : 'rgba(244,241,234,.38)'); });
  fx($('e_src'), lt, 9.0, O + .2, { dy: 10 });
};

// ── 5 · Aynı yürüyüş, farklı saat ──
const TL = [{ y: 398, n: 147, col: C.mod, dose: 22.9 }, { y: 618, n: 90, col: C.good, dose: 14.1 }];   // n ∝ 14,7 ve 9,0 µg/m³
const TX0 = 520, TX1 = 1240, TBX = 1290, TPX = 490 / 30;   // çubuk ölçeği: 0–30 µg → 490 px
let tS = {};
function walker(g) {
  const o = {};
  o.head = sv('circle', { r: 15, fill: 'none', stroke: C.cream, 'stroke-width': 5 }, g);
  o.body = sv('line', { stroke: C.cream, 'stroke-width': 6, 'stroke-linecap': 'round' }, g);
  o.l1 = sv('polyline', { fill: 'none', stroke: C.cream, 'stroke-width': 6, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, g);
  o.l2 = sv('polyline', { fill: 'none', stroke: C.cream, 'stroke-width': 6, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, g);
  o.a1 = sv('polyline', { fill: 'none', stroke: C.cream, 'stroke-width': 5, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, g);
  o.a2 = sv('polyline', { fill: 'none', stroke: C.cream, 'stroke-width': 5, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, g);
  return o;
}
function poseWalker(o, x, yFoot, ph, op) {
  // basit yürüyüş döngüsü: bacak ve kol salınımı (ph radyan)
  const hip = [x, yFoot - 58], sh = [x + 5, yFoot - 102], hd = [x + 8, yFoot - 126];
  const leg = (s) => { const a = .5 * Math.sin(ph + s), knee = [hip[0] + Math.sin(a) * 30, hip[1] + Math.cos(a) * 30];
    const b = a - .35 * Math.max(0, Math.sin(ph + s + 1.2)); return [hip, knee, [knee[0] + Math.sin(b) * 29, knee[1] + Math.cos(b) * 29]]; };
  const arm = (s) => { const a = -.45 * Math.sin(ph + s), el = [sh[0] + Math.sin(a) * 25, sh[1] + Math.cos(a) * 25]; return [sh, el, [el[0] + Math.sin(a + .5) * 23, el[1] + Math.cos(a + .5) * 23]]; };
  const pts = a => a.map(p => p.join(',')).join(' ');
  o.head.setAttribute('cx', hd[0]); o.head.setAttribute('cy', hd[1]);
  o.body.setAttribute('x1', hip[0]); o.body.setAttribute('y1', hip[1]); o.body.setAttribute('x2', sh[0]); o.body.setAttribute('y2', sh[1]);
  o.l1.setAttribute('points', pts(leg(0))); o.l2.setAttribute('points', pts(leg(Math.PI)));
  o.a1.setAttribute('points', pts(arm(0))); o.a2.setAttribute('points', pts(arm(Math.PI)));
  for (const k in o) o[k].style.opacity = op;
  return hd;
}
function setupTiming() {
  const s = $('t_svg'), r = rng(38);
  tS.lanes = TL.map((L, li) => {
    sv('rect', { x: TX0, y: L.y, width: TX1 - TX0, height: 156, rx: 22, fill: 'rgba(244,241,234,.05)', stroke: 'rgba(244,241,234,.12)', 'stroke-width': 1.5 }, s);
    const g = sv('g', {}, s), parts = [];
    for (let i = 0; i < L.n; i++) parts.push({ x: TX0 + 22 + r() * (TX1 - TX0 - 44), y: L.y + 16 + r() * 124, r: 3.5 + r() * 2.5, ph: r() * 6.28,
      el: sv('circle', { fill: L.col }, g) });
    const wg = sv('g', {}, s), w = walker(wg);
    sv('rect', { x: TBX, y: L.y + 52, width: 490, height: 52, rx: 8, fill: 'rgba(244,241,234,.07)' }, s);
    const bar = sv('rect', { x: TBX, y: L.y + 52, width: 0, height: 52, rx: 8, fill: L.col }, s);
    return { L, parts, w, bar, wg };
  });
}
D.timing = lt => {
  const d = SC.timing.d, O = d - .85;
  fx($('t_k'), lt, .6, O); fx($('t_h'), lt, .85, O + .05, { dy: 34 });
  fx($('t_h2'), lt, 10.4, O + .1, { dy: 30, d: 1.0 });
  fx($('t_lab1'), lt, 1.5, O + .1); fx($('t_lab2'), lt, 1.9, O + .15);
  const lanesOp = E.o(pr(lt, 1.5, .8)) * (1 - E.i(pr(lt, O + .1, .55)));
  vis($('t_svg'), lanesOp);
  fx($('t_bh'), lt, 2.2, O + .2);
  const wu = pr(lt, 3.0, 6.4);
  tS.lanes.forEach((ln, li) => {
    const wx = lerp(TX0 + 34, TX1 - 40, wu), foot = ln.L.y + 146;
    const hd = poseWalker(ln.w, wx, foot, (lt - 3.0) * 7.5, cl((lt - 2.4) / .5) * (lt < 3 ? 1 : 1));
    for (const p of ln.parts) {
      const jx = p.x + 4 * Math.sin(lt * .9 + p.ph), jy = p.y + 4 * Math.cos(lt * .7 + p.ph);
      const inZone = Math.abs(p.y - (hd[1])) < 58;
      const tc = 3.0 + ((p.x - 12 - (TX0 + 34)) / ((TX1 - 40) - (TX0 + 34))) * 6.4;   // yürüyücünün parçacığa vardığı an
      let x = jx, y = jy, rr = p.r, op = .9;
      if (inZone && lt >= tc) { const u = E.i(pr(lt, tc, .45)); x = lerp(jx, hd[0] + 6, u); y = lerp(jy, hd[1] + 6, u); rr = p.r * (1 - u); op = .9 * (1 - u); }
      p.el.setAttribute('cx', x); p.el.setAttribute('cy', y); p.el.setAttribute('r', Math.max(0, rr)); p.el.style.opacity = op;
    }
    const dose = ln.L.dose * wu, wpx = dose * TPX;
    ln.bar.setAttribute('width', wpx);
    const v = $(li ? 't_v2' : 't_v1'); v.textContent = dose.toFixed(1) + ' µg';
    v.style.left = (TBX + wpx + 18) + 'px'; v.style.top = (ln.L.y + 55) + 'px';
    vis(v, E.o(pr(lt, 3.0, .4)) * (1 - E.i(pr(lt, O + .2, .55))));
  });
  fx($('t_pct'), lt, 9.7, O + .2, { dy: 0, s: .3, d: .6 });
  fx($('t_leg'), lt, 4.0, O + .2, { dy: 10 }); fx($('t_src'), lt, 4.4, O + .25, { dy: 10 });
};

// ── 6 · İki ziyaretçi (modellenmiş senaryo; ajanlar/animasyon/HAFIZA.md, scripts/cop31_animasyon/sahneler.json) ──
const VIS = {
  A: { x: 128, w: 790, hrs: '2 hours', t0: 7, t1: 9, at: 2.2, dur: 6.0, total: 36.5,
    segs: [{ h0: 7, h1: 7.5, c: 16.0, dose: 12.46, ic: 'footprints', lab: 'Walking in along the road' },
           { h0: 7.5, h1: 8.5, c: 30.9, dose: 7.73, ic: 'coffee', lab: 'Busy café terrace' },
           { h0: 8.5, h1: 9, c: 20.9, dose: 16.31, ic: 'footprints', lab: 'Brisk walk to the Congress Center' }] },
  B: { x: 1010, w: 782, hrs: '8 hours', t0: 10, t1: 18, at: 8.8, dur: 7.0, total: 16.2,
    segs: [{ h0: 10, h1: 12, c: 3.9, dose: 1.97, ic: 'book-open', lab: 'Library, windows closed' },
           { h0: 12, h1: 16.5, c: 5.3, dose: 5.94, ic: 'presentation', lab: 'Lecture hall, windows closed' },
           { h0: 16.5, h1: 17, c: 9.7, dose: 7.53, ic: 'footprints', lab: 'Late-afternoon walk, green core' },
           { h0: 17, h1: 18, c: 2.9, dose: .73, ic: 'book-open', lab: 'Library, windows closed' }] },
};
const hhmm = h => { const m = Math.round(h * 60); return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0'); };
const hkiCol = c => c <= 12.0 ? C.good : c <= 35.4 ? C.mod : '#ff8800';
const VR = { y: 400, h0: 6, h1: 19, w: 720 }, VDOSE = 14;   // şerit: 06–19; doz ölçeği 14 px/µg (her iki sütunda aynı)
let vS = {};
function setupVisit() {
  const s = $('v_svg');
  for (const k of ['A', 'B']) {
    const V = VIS[k], col = $('v_col' + k), o = vS[k] = { rows: [] };
    col.innerHTML = `<div class="a" style="left:${V.x}px;top:322px;width:${V.w}px;display:flex;align-items:center;gap:18px">
        <span style="display:inline-flex;width:56px;height:56px;border-radius:50%;border:3px solid ${C.cream};align-items:center;justify-content:center;font:700 32px/1 Inter">${k}</span>
        <span style="font:600 40px/1.1 Inter">Visitor ${k} · ${V.hrs}</span>
        <span class="num" style="margin-left:auto;font:600 40px/1 Inter;color:${C.acc}"></span></div>` +
      V.segs.map((g, i) => `<div class="a" style="left:${V.x}px;top:${484 + i * 72}px;width:${V.w}px;height:68px;display:flex;align-items:center;gap:18px;border-radius:12px;padding:0 12px">
        <span class="ic" style="width:40px;height:40px">${ico(g.ic)}</span>
        <div><div style="font:600 30px/1.12 Inter">${g.lab}</div>
        <div style="font:400 28px/1.2 Inter;color:${C.mutD};display:flex;align-items:center;gap:10px">${hhmm(g.h0)}–${hhmm(g.h1)} · <span class="dot" style="width:18px;height:18px;background:${hkiCol(g.c)}"></span>${g.c.toFixed(1)} µg/m³</div></div></div>`).join('') +
      `<div class="a" style="left:0;top:0"><span class="num" style="position:absolute;white-space:nowrap;font:600 44px/1 Inter"></span></div>`;
    const kids = [...col.children];
    o.head = kids[0]; o.clock = kids[0].lastElementChild; o.rows = kids.slice(1, 1 + V.segs.length); o.totWrap = kids[kids.length - 1]; o.tot = o.totWrap.firstElementChild;
    // gün şeridi
    const xr = h => V.x + (h - VR.h0) / (VR.h1 - VR.h0) * VR.w;
    o.rib = sv('g', {}, s);
    sv('rect', { x: xr(6), y: VR.y, width: VR.w, height: 12, rx: 6, fill: 'rgba(244,241,234,.14)' }, o.rib);
    o.span = sv('rect', { x: xr(V.t0), y: VR.y - 3, width: 0, height: 18, rx: 9, fill: C.cream }, o.rib);
    o.ph = sv('circle', { r: 11, cy: VR.y + 6, fill: C.acc, stroke: C.navy, 'stroke-width': 4 }, o.rib);
    for (const h of [6, 12, 18]) { const t = sv('text', { x: xr(h), y: VR.y + 50, fill: C.mutD, 'font-family': 'Inter', 'font-size': 28, 'text-anchor': h === 6 ? 'start' : 'middle' }, o.rib); t.textContent = hhmm(h); }
    o.xr = xr;
    // doz çubuğu (yığılmış, HKİ rengi; 2 px boşluk)
    o.bar = sv('g', {}, s);
    o.segEl = V.segs.map(g => sv('rect', { y: 790, height: 40, rx: 4, fill: hkiCol(g.c) }, o.bar));
    o.track = sv('rect', { x: V.x, y: 790, width: 40 * VDOSE, height: 40, rx: 6, fill: 'rgba(244,241,234,.06)' }, o.bar);
    o.bar.insertBefore(o.track, o.bar.firstChild);
  }
}
function visitState(V, lt) {   // ziyaretçinin o anki saati ve birikmiş dozu
  const u = pr(lt, V.at, V.dur), h = lerp(V.t0, V.t1, u);
  const per = V.segs.map(g => g.dose * cl((h - g.h0) / (g.h1 - g.h0)));
  return { u, h, per, tot: per.reduce((a, b) => a + b, 0) };
}
D.visit = lt => {
  const d = SC.visit.d, O = d - .85;
  fx($('v_k'), lt, .6, O); fx($('v_h'), lt, .85, O + .05, { dy: 34 }); fx($('v_chip'), lt, 1.2, O + .1, { dy: 14 });
  vis($('v_svg'), E.o(pr(lt, 1.5, .7)) * (1 - E.i(pr(lt, O + .2, .55))));
  for (const k of ['A', 'B']) {
    const V = VIS[k], o = vS[k], st = visitState(V, lt), ent = k === 'A' ? 1.4 : 1.8;
    fx(o.head, lt, ent, O + .1);
    o.clock.textContent = hhmm(st.h);
    o.rows.forEach((r, i) => {
      const g = V.segs[i], active = st.h >= g.h0 && st.h < g.h1 && st.u > 0 && st.u < 1, done = st.h >= g.h1;
      const op = fx(r, lt, ent + .3 + i * .12, O + .15, { dy: 16 });
      r.style.opacity = op * (active || done ? 1 : .42);
      r.style.background = active ? 'rgba(244,241,234,.09)' : 'transparent';
      r.firstElementChild.style.color = active ? C.acc : C.cream;
    });
    o.span.setAttribute('width', Math.max(0, o.xr(st.h) - o.xr(V.t0)));
    o.ph.setAttribute('cx', o.xr(st.h)); o.ph.style.opacity = st.u > 0 ? 1 : 0;
    let x = V.x;
    o.segEl.forEach((r, i) => { const w = st.per[i] * VDOSE; r.setAttribute('x', x); r.setAttribute('width', Math.max(0, w - (w > 3 ? 2 : 0))); x += w; });
    o.tot.style.left = (x + 18) + 'px'; o.tot.style.top = '788px';
    o.tot.innerHTML = `${st.tot.toFixed(1)} µg <span style="font:400 28px/1 Inter;color:${C.mutD}">inhaled</span>`;
    vis(o.totWrap, E.o(pr(lt, V.at, .4)) * (1 - E.i(pr(lt, O + .2, .55))));
  }
  fx($('v_punch'), lt, 16.4, O + .2, { dy: 30, d: 1.0 });
  fx($('v_src'), lt, 3.0, O + .25, { dy: 10 });
};

// ── 7 · Uygulama ──
const FEATS = [
  ['gauge', 'Live national AQI', 'from corrected PM<sub>2.5</sub>; source and time always shown'],
  ['bell-ring', 'Phone alerts', 'when campus AQI exceeds 100, plus an 08:00 daily summary'],
  ['school', 'Lecture-hall indoor/outdoor ratio', 'matched to the class timetable'],
  ['message-circle', 'Personal exposure assistant', 'your day in, your dose out'],
];
let pF = [];
function setupApp() {
  $('p_feats').innerHTML = FEATS.map((f, i) => `<div class="a" style="left:1000px;top:${300 + i * 128}px;width:800px;display:flex;gap:24px">
      <span class="ic" style="width:56px;height:56px;color:${C.acc};margin-top:2px">${ico(f[0])}</span>
      <div><div style="font:600 34px/1.22 Inter">${f[1]}</div><div style="font:400 28px/1.3 Inter;color:${C.mutD}">${f[2]}</div></div></div>`).join('');
  pF = [...$('p_feats').children];
  const tag = $('p_ntag'); tag.style.top = '660px'; tag.style.background = 'rgba(11,46,51,.92)'; tag.style.padding = '6px 16px'; tag.style.borderRadius = '10px';
}
D.app = lt => {
  const d = SC.app.d, O = d - .85;
  fx($('p_k'), lt, .6, O); fx($('p_h'), lt, .85, O + .05, { dy: 34 });
  fx($('p_phone'), lt, .9, O + .1, { dy: 140, d: 1.1 });
  fx($('p_note'), lt, 2.2, 8.4, { dy: -50, d: .7, od: .5, ody: 40 }); fx($('p_ntag'), lt, 2.8, 8.4, { dy: 10 });
  vis($('p_lock'), 1 - E.io(pr(lt, 8.7, .6)));
  const sh = 360 * 1688 / 780 - 746;   // kaydırma payı
  const sw = E.io(pr(lt, 13.2, .8));
  $('p_img1').style.transform = `translate(${-360 * sw}px,${-sh * E.s(pr(lt, 9.4, 3.2))}px)`;
  $('p_img2').style.transform = `translate(${360 * (1 - sw)}px,${-sh * E.s(pr(lt, 14.2, 3.0))}px)`;
  pF.forEach((f, i) => fx(f, lt, 3.6 + i * 1.4, O + .1 + i * .05, { dx: 40, dy: 0 }));
  fx($('p_free'), lt, 9.6, O + .3); fx($('p_src'), lt, 10.2, O + .3, { dy: 10 });
};

// ── 8 · Sonraki 12 ay ──
const NEXT = [
  ['Multi-site indoor monitoring', 'Classrooms, labs, library and sports hall with wearable Atmotube PRO 2: PM<sub>2.5</sub>, CO<sub>2</sub> and VOCs'],
  ['Dynamic source characterization', 'Indoor/outdoor ratios and clustering of pollutant patterns with occupancy and activity logs'],
  ['Machine-learning forecasts', 'Explainable models trained on our field data and cross-validated before use'],
  ['Early warning and planning', 'Forecast-based alerts and scenarios for timing, routes and ventilation'],
];
let nS = {};
function setupNext() {
  $('n_cards').innerHTML = NEXT.map((n, i) => `<div class="a" style="left:${128 + i * 424}px;top:338px;width:392px;height:392px;background:${'#FBFAF6'};border:1.5px solid #DAD5C8;border-radius:22px;padding:58px 28px 24px;color:${C.ink}">
      <div style="font:600 32px/1.2 Inter">${n[0]}</div><div style="font:400 28px/1.32 Inter;color:${C.mutL};margin-top:12px">${n[1]}</div></div>`).join('');
  nS.cards = [...$('n_cards').children];
  const s = $('n_svg');
  nS.line = sv('line', { x1: 184, x2: 184 + 3 * 424, y1: 338, y2: 338, stroke: C.accInk, 'stroke-width': 4, 'stroke-linecap': 'round' }, s);
  nS.nums = NEXT.map((n, i) => { const g = sv('g', {}, s);
    sv('circle', { cx: 184 + i * 424, cy: 338, r: 30, fill: C.ink }, g);
    const t = sv('text', { x: 184 + i * 424, y: 348, fill: C.cream, 'font-family': 'Inter', 'font-size': 30, 'font-weight': 700, 'text-anchor': 'middle' }, g); t.textContent = i + 1; return g; });
  // kampüsten kente: çizgi çizim (sağa doğru çizilir)
  const gY = 872, P2 = [];
  const add = (d, c = C.ink, w = 3.5) => P2.push(sv('path', { d, fill: 'none', stroke: c, 'stroke-width': w, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, s));
  add(`M128,${gY} L1792,${gY}`, C.mutL, 2.5);
  add(`M170,${gY} V${gY - 46} H300 V${gY}`); add(`M196,${gY - 30} H220 M246,${gY - 30} H272`, C.mutL, 3);
  add(`M330,${gY} V${gY - 66} H430 V${gY}`); add(`M356,${gY - 44} H380 M356,${gY - 22} H380 M398,${gY - 44} H410 M398,${gY - 22} H410`, C.mutL, 3);
  add(`M500,${gY} V${gY - 92}`); add(`M488,${gY - 92} H512`); add(`M478,${gY - 108} A30,30 0 0 1 522,${gY - 108}`, C.accInk, 3); add(`M466,${gY - 120} A48,48 0 0 1 534,${gY - 120}`, C.accInk, 3);
  add(`M600,${gY} V${gY - 30}`); add(`M600,${gY - 54} m-24,0 a24,24 0 1,0 48,0 a24,24 0 1,0 -48,0`, C.mutL, 3);
  add(`M680,${gY} V${gY - 54} H820 V${gY}`); add(`M706,${gY - 34} H740 M760,${gY - 34} H794`, C.mutL, 3);
  add(`M880,${gY - 40} C960,${gY - 70} 1000,${gY - 70} 1070,${gY - 40}`, C.accInk, 3); add(`M1052,${gY - 52} L1072,${gY - 40} L1052,${gY - 28}`, C.accInk, 3);
  const towers = [[1120, 70], [1190, 104], [1270, 84], [1340, 112], [1420, 76], [1490, 100], [1570, 64], [1640, 92], [1710, 72]];
  towers.forEach(([x, h], i) => { add(`M${x},${gY} V${gY - h} H${x + 54} V${gY}`);
    add(`M${x + 14},${gY - h + 20} V${gY - 14} M${x + 40},${gY - h + 20} V${gY - 14}`, C.mutL, 2.5); });
  nS.sky = P2.map(p => { const L = p.getTotalLength(); p.setAttribute('stroke-dasharray', `${L} ${L}`); const bb = p.getBBox(); return { p, L, x: bb.x }; });
}
D.next = lt => {
  const d = SC.next.d, O = d - .85;
  fx($('n_k'), lt, .7, O); fx($('n_h'), lt, .95, O + .05, { dy: 34 });
  vis($('n_svg'), 1 - E.i(pr(lt, O + .15, .55)));
  const lu = E.io(pr(lt, 1.6, 4.0));
  nS.line.setAttribute('x2', 184 + 3 * 424 * lu); nS.line.style.opacity = lt > 1.6 ? 1 : 0;
  nS.nums.forEach((g, i) => { const a = 1.6 + 4.0 * (i / 3) * .92; const u = E.o(pr(lt, a, .5)); g.style.opacity = u; g.style.transform = `scale(${.4 + .6 * u})`; g.style.transformOrigin = `${184 + i * 424}px 338px`; });
  nS.cards.forEach((c, i) => fx(c, lt, 1.7 + 4.0 * (i / 3) * .92, O + .1 + i * .05, { dy: 30 }));
  nS.sky.forEach(o => { const a = 6.8 + (o.x - 128) / 1664 * 2.6; o.p.setAttribute('stroke-dashoffset', o.L * (1 - E.io(pr(lt, a, .9)))); });
  fx($('n_st'), lt, 8.6, O + .2, { dy: 24, d: 1.0 });
};

// ── 9 · Bize katılın ──
D.join = lt => {
  const d = SC.join.d, X = d - 1.75;   // içerik çıkışı; ardından parçacıklar (açılışın ilk karesiyle aynı durum)
  fx($('j_k'), lt, .7, X); fx($('j_h'), lt, .95, X + .05, { dy: 34 });
  fx($('j_o'), lt, 1.7, X + .1); fx($('j_s'), lt, 2.5, X + .15); fx($('j_qr'), lt, 1.2, X + .1, { dy: 0, s: .08, d: 1.0 });
  fx($('j_tag'), lt, 3.4, X + .2); fx($('j_c'), lt, 4.2, X + .25);
  drawParticles(pc9, SC.join.t0 + lt, E.io(pr(lt, d - 1.6, 1.6)), null);
};

// ═══════════ ARKA PLAN GEÇİŞLERİ ═══════════
function wipe(id, lt) {
  const el = SC[id].el, u = E.io(pr(lt, 0, WIPE));
  if (id === 'gap' || id === 'join') el.style.clipPath = u < 1 ? `inset(${(1 - u) * 100}% 0 0 0)` : 'none';
  else if (id === 'next') el.style.clipPath = u < 1 ? `inset(0 0 0 ${(1 - u) * 100}%)` : 'none';
  else if (id === 'evid' || id === 'timing' || id === 'visit' || id === 'app') el.querySelector('.bg').style.opacity = u;
}

// ═══════════ ANA ÇİZİM ═══════════
function render(t) {
  t = ((t % T) + T) % T;
  for (const id in SC) {
    const s = SC[id], lt = t - s.t0, on = lt >= 0 && lt < s.d + WIPE;
    s.el.style.visibility = on ? 'visible' : 'hidden';
    if (!on) continue;
    if (id !== 'built') wipe(id, lt);
    D[id](lt);
  }
  // köşe karekod rozeti: 2.–8. sahneler
  const qa = E.o(pr(t, SC.gap.t0 + 1.0, .7)) * (1 - E.io(pr(t, SC.join.t0 + .2, .6)));
  vis($('qrb'), qa); $('qrb').style.transform = `translateY(${(1 - qa) * -12}px)`;
}

async function init() {
  document.querySelectorAll('[data-i]').forEach(e => { e.innerHTML = ico(e.dataset.i); });
  await Promise.all(['600 132px "Source Serif 4"', '500 54px "Source Serif 4"', '400 28px Inter', '600 28px Inter', '700 28px Inter', '300 110px Inter'].map(f => document.fonts.load(f)));
  await document.fonts.ready;
  await Promise.all([...document.images].map(i => i.decode().catch(() => {})));
  setupOpen(); setupGap(); setupBuilt(); setupEvid(); setupTiming(); setupVisit(); setupApp(); setupNext();
  render(0);
  window.FILM.ready = true;
}
window.FILM = { T, FPS: 30, render, ready: false, scenes: SCN.map(([id, d]) => ({ id, t0: SC[id].t0, d })) };
init().catch(e => { window.FILM.error = String(e && e.stack || e); });
})();
