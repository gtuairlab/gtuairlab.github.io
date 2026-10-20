// Amfi 1 iç ortam (ikinci PurpleAir, Kimya ve Çevre Müh. binası) — Araştırma görünümü.
//   Sensör paneli (sol sütun): son değer, aynı saatteki iç/dış oranı.
//   Analiz paneli: iç/dış oranı (I/O), ders saatleri ile gece karşılaştırması, saatlik seyir, günün saatine göre desen,
//   aynı binadaki Atmotube ölçümleriyle eşleştirme (±3 dk).
// Düzeltme: GÖSTERİMDE iç sensöre de dış sensörle aynı US EPA düzeltmesi (api.js; iç ortamda doğrulanmadı, notla).
// ANALİZDE (I/O, Atmotube) birincil girdi iki sensörün A/B denetimli HAM cf_1 değeri: EPA denklemindeki +5,75 ve nem terimi
// oranda sadeleşmez, temiz saatlerde I/O'yu yapay olarak büyütür (Ajan 1, 20 Ekim 2026; hesaplama_ve_kaynaklar.md §1b).
// EPA'lı oran duyarlılık için ikincil gösterilir. Kurulumun ilk saati (ısınma, kurulum tozu) analizden çıkarılır.
// Renkler: iç = DEVICE_COLOR.indoor, dış = DEVICE_COLOR.purpleair (kesikli çizgi), Atmotube = DEVICE_COLOR.atmotube.
// Bağımlılıklar: api.js, colorscale.js, who.js (WHO.history), campus.js (buildingAt), icons.js, Chart.js, app.js (map, timeAgo, trTime)

const Ic = (() => {
    const C_IN = DEVICE_COLOR.indoor, C_OUT = DEVICE_COLOR.purpleair, C_ATP = DEVICE_COLOR.atmotube;
    const $ = id => document.getElementById(id);
    const f1 = v => v == null || isNaN(v) ? "–" : v.toLocaleString("tr-TR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
    const f2 = v => v == null || isNaN(v) ? "–" : v.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const mean = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : null;
    const median = a => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
    const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
    const hk = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hourCycle: "h23" });
    const wdFmt = new Intl.DateTimeFormat("en-US", { timeZone: "Europe/Istanbul", weekday: "short" });
    const hourKey = t => hk.format(t);                    // "2026-10-20, 14"
    const hourOf = k => +k.slice(-2);
    // Ham cf_1: A/B ortalaması; kanallar uyuşmuyorsa null (dış sensörle aynı kural, colorscale.js → paChannelsAgree)
    const cf1 = r => {
        const a = r && r.pm2_5_cf1_a != null && r.pm2_5_cf1_a !== "" ? +r.pm2_5_cf1_a : null, b = r && r.pm2_5_cf1_b != null && r.pm2_5_cf1_b !== "" ? +r.pm2_5_cf1_b : null;
        if (a == null || b == null || isNaN(a) || isNaN(b) || paChannelsAgree(a, b) === false) return null;
        return (a + b) / 2;
    };
    const WARMUP = 60 * 60e3;                             // kurulumdan sonraki ilk saat analize girmez
    const ATP_WIN = 3 * 60e3;                             // Atmotube–PurpleAir eşleme penceresi (dış sensörle aynı kural)
    const MIN_PAIRS = 3;

    let latest = null, name = "Amfi 1", status = null, marker = null;
    let period = 7, inHourly = null, busy = false, charts = [];

    // ── Sensör paneli ──────────────────────────────────────────────
    async function loadPanel() {
        const el = $("ic-panel");
        if (!el) return;
        try {
            const r = await API.indoorLatest();
            latest = r.data; name = r.name || name; status = r.status;
            renderPanel();
            placeMarker();
        } catch (e) {
            el.innerHTML = `<div class="wh-empty">İç sensör verisine ulaşılamadı.</div>`;
        }
    }

    // Dış sensörün aynı andaki ham cf_1 değeri: son ölçüm iç ölçüme ±15 dk yakınsa o, değilse aynı saatin saatlik ortalaması
    async function sameTimeOut(t) {
        try {
            const r = await API.purpleairLatest();
            if (r.data && cf1(r.data) != null && Math.abs(new Date(r.data.recorded_at) - t) <= 15 * 60e3) return cf1(r.data);
        } catch (_) {}
        return WHO.history().then(rows => {
            const k = hourKey(t);
            const r = rows.find(x => cf1(x) != null && hourKey(new Date(x.recorded_at)) === k);
            return r ? cf1(r) : null;
        }).catch(() => null);
    }

    async function renderPanel() {
        const el = $("ic-panel"), badge = $("ic-badge");
        if (!latest) {
            el.innerHTML = `<div class="wh-empty">${status && status.sensor_index ? "İç sensör tanımlı; ilk ölçüm bekleniyor." :
                "İç sensör henüz sunucuya tanımlanmadı (PurpleAir sensör numarası gerekli)."}</div>`;
            if (badge) badge.hidden = true;
            return;
        }
        const t = new Date(latest.recorded_at), ageMin = (Date.now() - t) / 60000, fresh = ageMin <= 30;
        const v = latest.pm2_5, col = v == null ? "#8a93a6" : pm25Color(v);
        if (badge) { badge.hidden = false; badge.classList.toggle("off", !fresh); badge.innerHTML = fresh ? `<span class="live-dot"></span>CANLI` : "Çevrimdışı"; }
        el.innerHTML = `<div class="pa-hero"><span class="val" style="color:${col}">${v == null ? "--" : f1(v)}</span><span class="unit">PM₂.₅ µg/m³ · iç ortam</span></div>
            <div class="pa-raw">US EPA düzeltmeli (iç ortamda doğrulanmadı)${cf1(latest) != null ? ` · ham cf_1 ${f1(cf1(latest))} µg/m³` : ""}${latest.qa_ab === false ? " · A/B kanalları uyuşmuyor" : ""}</div>
            <div class="pa-grid">
              <div class="pa-cell" title="Ham cf_1 değerlerinin oranı (iç ÷ dış)"><div class="k">İç / dış</div><div class="v" id="ic-io">…</div></div>
              <div class="pa-cell"><div class="k">Sıcaklık*</div><div class="v">${latest.temperature_c != null ? f1(+latest.temperature_c) + "°" : "--"}</div></div>
              <div class="pa-cell"><div class="k">Nem*</div><div class="v">${latest.humidity_pct != null ? Math.round(latest.humidity_pct) + "%" : "--"}</div></div>
            </div>
            <div class="pa-foot"><span>${typeof trClock === "function" ? trClock(latest.recorded_at) : t.toLocaleString("tr-TR")}</span><span>${esc(name)}</span></div>
            <button type="button" class="ic-btn oz-more" id="ic-open">${ico("chart-column")} Ayrıntılı analiz</button>`;
        $("ic-open").addEventListener("click", () => Shell.openPanel("ic"));
        const out = await sameTimeOut(t);
        const io = $("ic-io");
        const vin = cf1(latest);
        if (io) io.textContent = out && vin != null ? f2(vin / out) : "--";
        if (io) io.title = out ? `Ham cf_1: iç ${f1(vin)} ÷ dış (SUMER çatısı) ${f1(out)} µg/m³` : "Aynı an için dış ölçüm yok";
    }

    function placeMarker() {
        if (!latest || latest.lat == null || typeof map === "undefined" || !map) return;
        const html = `<div class="ic-marker" style="--marker-color:${latest.pm2_5 == null ? "#8a93a6" : pm25Color(latest.pm2_5)}">${ico("building-2")}</div>`;
        const icon = L.divIcon({ className: "ic-marker-wrap", html, iconSize: [26, 26], iconAnchor: [13, 13] });
        const tip = `${esc(name)} (iç) <b>${latest.pm2_5 == null ? "--" : f1(latest.pm2_5)}</b> µg/m³`;
        if (!marker) {
            marker = L.marker([latest.lat, latest.lon], { icon, zIndexOffset: 450 }).addTo(map)
                .bindTooltip(tip, { direction: "top", offset: [0, -14], className: "pa-label" });
            marker.on("click", () => Shell.openPanel("ic"));
        } else { marker.setIcon(icon); marker.setTooltipContent(tip); }
    }

    // ── Analiz paneli ──────────────────────────────────────────────
    function since() { return period ? Date.now() - period * 864e5 : 0; }

    function pairs(outRows) {
        const out = new Map();
        for (const r of outRows) out.set(hourKey(new Date(r.recorded_at)), { e: r.pm2_5 == null ? null : +r.pm2_5, c: cf1(r) });
        const first = inHourly && inHourly.length ? +new Date(inHourly[0].recorded_at) : 0;
        const from = Math.max(since(), first + WARMUP), res = [];
        for (const r of inHourly || []) {
            const t = new Date(r.recorded_at);
            if (+t < from) continue;
            const k = hourKey(t), o = out.get(k) || {}, ci = cf1(r);
            if (r.pm2_5 == null && ci == null) continue;
            res.push({ t, k, h: hourOf(k), wd: wdFmt.format(t), i: r.pm2_5 == null ? null : +r.pm2_5, o: o.e ?? null, ci, co: o.c ?? null });
        }
        return res;
    }

    const isClass = p => !["Sat", "Sun"].includes(p.wd) && p.h >= 8 && p.h < 18;   // hafta içi 08:00–18:00
    const isNight = p => p.h >= 23 || p.h < 5;                                       // 23:00–05:00, bina boş (Bi vd. 2021)

    // I/O birincil: ham cf_1 (ΣC_iç / ΣC_dış = ortalamaların oranı, saatlik oranların medyanı ikincil); EPA'lı oran duyarlılık
    function ioStats(ps) {
        const raw = ps.filter(p => p.ci != null && p.co != null && p.co > 0);
        const epa = ps.filter(p => p.i != null && p.o != null && p.o > 0);
        const ratioOfMeans = g => g.length ? mean(g.map(p => p.ci)) / mean(g.map(p => p.co)) : null;
        const grp = f => { const g = raw.filter(f), ge = epa.filter(f);
            return { n: g.length, io: ratioOfMeans(g), med: median(g.map(p => p.ci / p.co)), ioE: median(ge.map(p => p.i / p.o)),
                     i: mean(ps.filter(f).filter(p => p.i != null).map(p => p.i)) }; };
        return { n: raw.length, all: ps.length, i: mean(ps.filter(p => p.i != null).map(p => p.i)),
                 o: mean(epa.map(p => p.o)), ci: mean(raw.map(p => p.ci)), co: mean(raw.map(p => p.co)),
                 io: ratioOfMeans(raw), med: median(raw.map(p => p.ci / p.co)), ioE: median(epa.map(p => p.i / p.o)),
                 cls: grp(isClass), night: grp(isNight) };
    }

    function tilesHtml(s) {
        const tile = (k, v, sub) => `<div class="wt"><span>${k}</span><b>${v}</b><small>${sub}</small></div>`;
        return `<div class="wt-grid ic-tiles">
            ${tile(`${esc(name)} (iç) ortalama`, f1(s.i), `µg/m³ (EPA) · ham cf_1 ${f1(s.ci)} · ${s.all} saat`)}
            ${tile("Dış, aynı saatler", f1(s.o), `µg/m³ (EPA) · ham cf_1 ${f1(s.co)} · ${s.n} ortak saat`)}
            ${tile("İç / dış", f2(s.io), `ham cf_1 · saatlik medyan ${f2(s.med)} · EPA ile ${f2(s.ioE)}`)}
            ${tile("Ders saatleri I/O", f2(s.cls.io), `hafta içi 08–18 · ${s.cls.n} saat · EPA ile ${f2(s.cls.ioE)}`)}
            ${tile("Gece I/O (boş bina)", f2(s.night.io), `23–05 · ${s.night.n} saat · sızmaya yaklaşık`)}
            ${tile("Ders − gece (iç)", s.cls.i != null && s.night.i != null ? f1(s.cls.i - s.night.i) : "–", "µg/m³ (EPA) · iç ortalamalar farkı")}
          </div>
          <div class="who-cap">I/O = iç ham cf_1 ortalaması ÷ aynı saatlerin dış ham cf_1 ortalaması (A/B denetimli). EPA'lı oran yalnızca
            karşılaştırma içindir: denklemin sabit terimi ve nem terimi oranı temiz saatlerde büyütür. Gece I/O'su sızma faktörüne yaklaşır;
            maruziyet modelindeki F değerleri için en az 2 hafta veri (≥10 gece, 2 hafta sonu) birikmesi önerilir.</div>`;
    }

    function chartBase(yTitle) {
        return {
            responsive: true, maintainAspectRatio: false, animation: false, interaction: { mode: "index", intersect: false },
            plugins: { legend: { display: false }, tooltip: { callbacks: { label: it => ` ${it.dataset.label}: ${it.raw == null ? "–" : (yTitle === "oran" ? f2(it.raw) : f1(it.raw) + " µg/m³")}` } } },
            scales: {
                x: { grid: { display: false }, ticks: { color: "#9aa4b8", font: { size: 9.5 }, maxRotation: 0, autoSkip: true, maxTicksLimit: 7 } },
                y: { min: 0, grid: { color: "rgba(255,255,255,0.06)" }, border: { display: false },
                     title: { display: true, text: yTitle === "oran" ? "iç / dış" : "µg/m³", color: "#9aa4b8", font: { size: 10 } },
                     ticks: { color: "#9aa4b8", font: { size: 10 }, maxTicksLimit: 5 } },
            },
        };
    }
    const ds = (label, data, color, dashed) => ({ label, data, borderColor: color, backgroundColor: color, borderWidth: 2,
        borderDash: dashed ? [5, 4] : [], pointRadius: 0, pointHoverRadius: 4, tension: 0.25, spanGaps: false });

    function drawCharts(ps) {
        charts.forEach(c => c.destroy()); charts = [];
        if (typeof Chart === "undefined") return;
        const lab = p => p.t.toLocaleString("tr-TR", { timeZone: "Europe/Istanbul", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
        // Eksen: yalnızca gün ("14 Eki"); ayrıntılı saat ipucunda
        const tsOpts = chartBase();
        tsOpts.scales.x.ticks.callback = function (v) { return String(this.getLabelForValue(v)).split(" ").slice(0, 2).join(" "); };
        const c1 = $("ic-ts");
        if (c1) charts.push(new Chart(c1, { type: "line", data: { labels: ps.map(lab), datasets: [
            ds(`${name} (iç)`, ps.map(p => +p.i.toFixed(1)), C_IN, false),
            ds("Dış · SUMER çatısı", ps.map(p => p.o == null ? null : +p.o.toFixed(1)), C_OUT, true)] }, options: tsOpts }));
        const byH = Array.from({ length: 24 }, (_, h) => ps.filter(p => p.h === h));
        const c2 = $("ic-hod");
        if (c2) charts.push(new Chart(c2, { type: "line", data: { labels: byH.map((_, h) => String(h).padStart(2, "0")), datasets: [
            ds(`${name} (iç)`, byH.map(g => g.length ? +mean(g.map(p => p.i)).toFixed(1) : null), C_IN, false),
            ds("Dış · SUMER çatısı", byH.map(g => { const o = g.filter(p => p.o != null); return o.length ? +mean(o.map(p => p.o)).toFixed(1) : null; }), C_OUT, true)] },
            options: chartBase() }));
    }

    // Atmotube: aynı binadaki saha ölçümleri (cihaz oturumları ATP-n_YYYYAAGG) ± 3 dk içindeki iç PurpleAir ölçümüyle
    async function atmotubeHtml() {
        const box = $("ic-atp");
        if (!box || !latest || latest.lat == null) return;
        const bld = typeof Campus !== "undefined" ? Campus.buildingAt(latest.lat, latest.lon) : null;
        if (!bld) { box.innerHTML = `<div class="wh-empty">İç sensörün konumu bir binaya eşlenemedi.</div>`; return; }
        try {
            const tr = await API.mapTracks();
            const first = inHourly && inHourly.length ? +new Date(inHourly[0].recorded_at) : Date.now();
            const from = Math.max(since(), first + WARMUP);
            const pts = [];
            for (const t of tr.tracks || []) {
                const dev = String(t.session_name || "").split("_")[0];
                if (!/^ATP-\d$/.test(dev)) continue;
                for (const p of t.points || []) {
                    const ts = +new Date(p.recorded_at);
                    if (p.pm2_5 == null || ts < from) continue;
                    const b = Campus.buildingAt(p.lat, p.lon);
                    if (b && b.gk === bld.gk) pts.push({ dev, ts, a: +p.pm2_5 });
                }
            }
            if (!pts.length) {
                box.innerHTML = `<div class="wh-empty">Seçilen dönemde ${esc(bld.name)} içinde Atmotube ölçümü yok. Atmotube'u ${esc(name)}'de
                    PurpleAir'in yanına koyup telefonla eşitlediğinizde karşılaştırma burada kendiliğinden oluşur.</div>`;
                return;
            }
            const t0 = Math.min(...pts.map(p => p.ts)) - ATP_WIN, t1 = Math.max(...pts.map(p => p.ts)) + ATP_WIN;
            const raw = ((await API.indoorHistory(new Date(t0).toISOString(), new Date(t1).toISOString(), "raw")).data || [])
                .filter(r => +new Date(r.recorded_at) >= first + WARMUP)
                .map(r => ({ ts: +new Date(r.recorded_at), v: r.pm2_5 == null ? null : +r.pm2_5, c: cf1(r) })).filter(r => r.c != null)
                .sort((x, y) => x.ts - y.ts);
            const near = ts => { let best = null; for (const r of raw) { const d = Math.abs(r.ts - ts); if (d <= ATP_WIN && (!best || d < best.d)) best = { ...r, d }; } return best; };
            const by = new Map();
            for (const p of pts) { const m = near(p.ts); if (!m || m.c <= 0) continue; (by.get(p.dev) || by.set(p.dev, []).get(p.dev)).push({ a: p.a, c: m.c, v: m.v }); }
            // Ortalamaların oranı (oranların ortalaması değil); EPA'lı oran duyarlılık
            const rows = [...by.entries()].sort().map(([dev, xs]) => { const ve = xs.filter(x => x.v != null && x.v > 0);
                return { dev, n: xs.length, a: mean(xs.map(x => x.a)), c: mean(xs.map(x => x.c)), r: mean(xs.map(x => x.a)) / mean(xs.map(x => x.c)),
                         re: ve.length ? mean(ve.map(x => x.a)) / mean(ve.map(x => x.v)) : null }; });
            box.innerHTML = rows.length ? `<table class="ic-table"><thead><tr><th>Cihaz</th><th class="sayi">Eşleşme</th><th class="sayi">Atmotube</th>
                <th class="sayi">PurpleAir ham cf_1</th><th class="sayi">Oran</th><th class="sayi">EPA'lı ile</th></tr></thead>
                <tbody>${rows.map(r => `<tr${r.n < MIN_PAIRS ? ' class="few"' : ""}><td><i class="ic-dot" style="background:${C_ATP}"></i>${r.dev}</td><td class="sayi">${r.n}</td>
                  <td class="sayi">${f1(r.a)}</td><td class="sayi">${f1(r.c)}</td><td class="sayi">${r.n < MIN_PAIRS ? "–" : f2(r.r)}</td><td class="sayi">${r.n < MIN_PAIRS ? "az" : f2(r.re)}</td></tr>`).join("")}</tbody></table>
                <div class="who-cap">Ortalamalar µg/m³. Oran = Atmotube ortalaması ÷ eşleşen iç PurpleAir ham cf_1 ortalaması; "EPA'lı ile" aynı oran düzeltilmiş
                  PurpleAir'e göre (duyarlılık). Literatür beklentisi: ham cf_1'e göre ≈0,55–0,75, EPA'lıya göre ≈1 (Shittu vd. 2025; Tryner vd. 2021).
                  Eşleme: Atmotube ölçümü ${esc(bld.name)} içinde (ya da sınırına ≤15 m) ve ±3 dk içinde bir iç PurpleAir ölçümü varsa; en az ${MIN_PAIRS} eşleşme.
                  Atmotube'un tam olarak ${esc(name)}'de olduğu GPS'ten doğrulanamaz. Bu iç ortam karşılaştırması "fark var mı" sorusunu yanıtlar, cihaz çarpanı
                  üretmez (çarpanın dayanağı SUMER çatısındaki yan yana ölçüm, §5). Kesin sonuç için cihazları sensörün yanında ≥24–48 saat (en az 2 ders bloğu ve 1 gece) ölçün.</div>`
                : `<div class="wh-empty">${esc(bld.name)} içinde Atmotube ölçümü var, ancak ±3 dk içinde iç PurpleAir ölçümüyle eşleşen yok.</div>`;
        } catch (e) {
            box.innerHTML = `<div class="wh-empty">Atmotube ölçümleri yüklenemedi.</div>`;
        }
    }

    function render() {
        const body = $("ic-body");
        if (!latest || !inHourly || !inHourly.length) {
            body.innerHTML = `<div class="news-empty">${esc(name)} iç sensöründen henüz kayıt yok. İlk ölçümler geldikten birkaç saat sonra analiz burada oluşur.</div>`;
            return;
        }
        WHO.history().then(outRows => {
            const ps = pairs(outRows), s = ioStats(ps);
            const chips = [[1, "Son 24 saat"], [7, "Son 7 gün"], [30, "Son 30 gün"], [0, "Tümü"]]
                .map(([d, t]) => `<button type="button" class="pd-chip${period === d ? " on" : ""}" data-p="${d}">${t}</button>`).join("");
            const firstDay = new Date(inHourly[0].recorded_at).toLocaleDateString("tr-TR", { day: "numeric", month: "long", timeZone: "Europe/Istanbul" });
            body.innerHTML = `<div class="pd-chips tr-period">${chips}</div>
              <p class="tr-sub">${esc(name)} (Kimya ve Çevre Müh. binası) iç ortam PurpleAir'i ile SUMER çatısındaki dış sensör, aynı saatlerin saatlik
                ortalamalarıyla karşılaştırılır. Değerler US EPA düzeltmeli gösterilir; iç/dış oranları ham cf_1 ile hesaplanır. Ölçüm başlangıcı: ${firstDay}.</p>
              ${ps.length ? tilesHtml(s) : `<div class="wh-empty">Seçilen dönemde iç ölçüm yok.</div>`}
              <section class="tr-sec"><h3>${ico("activity")} Saatlik seyir</h3>
                <div class="tr-chart"><canvas id="ic-ts" aria-label="İç ve dış saatlik PM₂.₅"></canvas></div>
                <div class="who-legend"><span><i style="background:${C_IN}"></i>${esc(name)} (iç)</span><span><i class="dash" style="border-color:${C_OUT}"></i>Dış · SUMER çatısı</span></div></section>
              <section class="tr-sec"><h3>${ico("clock")} Günün saatine göre</h3>
                <p class="tr-sub">Her saatin dönem ortalaması (Türkiye saati). Ders saatlerinde içerideki artış, insan hareketi ve kapı/pencere açılmasıyla ilişkili olabilir.</p>
                <div class="tr-chart"><canvas id="ic-hod" aria-label="Günün saatine göre iç ve dış ortalama PM₂.₅"></canvas></div>
                <div class="who-legend"><span><i style="background:${C_IN}"></i>${esc(name)} (iç)</span><span><i class="dash" style="border-color:${C_OUT}"></i>Dış · SUMER çatısı</span></div></section>
              <section class="tr-sec"><h3>${ico("scale")} Atmotube ile karşılaştırma</h3>
                <div id="ic-atp"><div class="news-empty">Atmotube ölçümleri eşleştiriliyor…</div></div></section>
              <div class="who-cap" style="margin-top:12px">Sınırlılıklar: Grafiklerdeki değerler US EPA düzeltmelidir; denklem dış ortam verisiyle geliştirildi,
                iç ortamda doğrulanmadı (insan kaynaklı iri parçacık, toz ve yemek kaynaklı çok ince parçacıklarda optik sensör sapabilir). Bu yüzden oranlar ham
                cf_1 ile hesaplanır. Dış sensör çatıda (141 m uzakta), iç sensör derslikte; yükseklik ve gecikme farkı tek tek saatlerde I/O'yu oynatabilir.
                Sensörün sıcaklık/nem değerleri cihaz gövdesinin içinden ölçülür. Kurulumun ilk saati analize girmez. Ayrıntı: docs/hesaplama_ve_kaynaklar.md §1b.</div>`;
            body.querySelectorAll("[data-p]").forEach(b => b.addEventListener("click", () => { period = +b.dataset.p; render(); }));
            drawCharts(ps);
            atmotubeHtml();
        });
    }

    async function load() {
        if (busy) return;
        busy = true;
        $("ic-body").innerHTML = `<div class="news-empty">${esc(name)} ölçümleri yükleniyor…</div>`;
        try {
            if (!latest) { const r = await API.indoorLatest(); latest = r.data; name = r.name || name; status = r.status; }
            const start = new Date(Date.now() - 400 * 864e5).toISOString();
            inHourly = (await API.indoorHistory(start, new Date().toISOString(), "hourly")).data || [];
            render();
        } catch (e) {
            console.warn("[ic]", e);
            $("ic-body").innerHTML = `<div class="news-empty">Veriler yüklenemedi; bağlantınızı kontrol edip yeniden deneyin.</div>`;
        } finally { busy = false; }
    }

    return { load, loadPanel };
})();
