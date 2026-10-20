// Amfi 1 iç ortam (ikinci PurpleAir, Kimya ve Çevre Müh. binası) — Araştırma görünümü.
//   Sensör paneli (sol sütun): son değer, aynı saatteki iç/dış oranı.
//   Analiz paneli: iç/dış oranı (I/O), ders saatleri ile gece karşılaştırması, saatlik seyir, günün saatine göre desen,
//   aynı binadaki Atmotube ölçümleriyle eşleştirme (±3 dk).
// Düzeltme: iç sensöre de dış sensörle aynı US EPA düzeltmesi uygulanır (api.js → indoorLatest/indoorHistory).
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

    // Dış sensörün aynı andaki değeri: son ölçüm iç ölçüme ±15 dk yakınsa o, değilse aynı saatin saatlik ortalaması
    async function sameTimeOut(t) {
        try {
            const r = await API.purpleairLatest();
            if (r.data && r.data.pm2_5 != null && Math.abs(new Date(r.data.recorded_at) - t) <= 15 * 60e3) return +r.data.pm2_5;
        } catch (_) {}
        return WHO.history().then(rows => {
            const k = hourKey(t);
            const r = rows.find(x => x.pm2_5 != null && hourKey(new Date(x.recorded_at)) === k);
            return r ? +r.pm2_5 : null;
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
            <div class="pa-raw">US EPA düzeltmeli${latest.pm2_5_raw != null ? ` · ham sensör değeri ${f1(latest.pm2_5_raw)} µg/m³` : ""}${latest.qa_ab === false ? " · A/B kanalları uyuşmuyor" : ""}</div>
            <div class="pa-grid">
              <div class="pa-cell"><div class="k">İç / dış</div><div class="v" id="ic-io">…</div></div>
              <div class="pa-cell"><div class="k">Sıcaklık*</div><div class="v">${latest.temperature_c != null ? f1(+latest.temperature_c) + "°" : "--"}</div></div>
              <div class="pa-cell"><div class="k">Nem*</div><div class="v">${latest.humidity_pct != null ? Math.round(latest.humidity_pct) + "%" : "--"}</div></div>
            </div>
            <div class="pa-foot"><span>${typeof trClock === "function" ? trClock(latest.recorded_at) : t.toLocaleString("tr-TR")}</span><span>${esc(name)}</span></div>
            <button type="button" class="ic-btn oz-more" id="ic-open">${ico("chart-column")} Ayrıntılı analiz</button>`;
        $("ic-open").addEventListener("click", () => Shell.openPanel("ic"));
        const out = await sameTimeOut(t);
        const io = $("ic-io");
        if (io) io.textContent = out && v != null ? f2(v / out) : "--";
        if (io) io.title = out ? `Aynı anda dış (SUMER çatısı) ${f1(out)} µg/m³` : "Aynı an için dış ölçüm yok";
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
        for (const r of outRows) if (r.pm2_5 != null) out.set(hourKey(new Date(r.recorded_at)), +r.pm2_5);
        const from = since(), res = [];
        for (const r of inHourly || []) {
            if (r.pm2_5 == null) continue;
            const t = new Date(r.recorded_at);
            if (+t < from) continue;
            const k = hourKey(t), o = out.get(k);
            res.push({ t, k, h: hourOf(k), wd: wdFmt.format(t), i: +r.pm2_5, o: o ?? null });
        }
        return res;
    }

    const isClass = p => !["Sat", "Sun"].includes(p.wd) && p.h >= 8 && p.h < 18;   // hafta içi 08:00–18:00
    const isNight = p => p.h >= 0 && p.h < 6;                                        // 00:00–06:00 (bina boş)

    function ioStats(ps) {
        const both = ps.filter(p => p.o != null && p.o > 0);
        const r = both.map(p => p.i / p.o);
        const grp = f => { const g = both.filter(f); return { n: g.length, io: median(g.map(p => p.i / p.o)), i: mean(g.map(p => p.i)), o: mean(g.map(p => p.o)) }; };
        return { n: both.length, all: ps.length, i: mean(ps.map(p => p.i)), o: mean(both.map(p => p.o)), io: median(r),
                 cls: grp(isClass), night: grp(isNight) };
    }

    function tilesHtml(s) {
        const tile = (k, v, sub) => `<div class="wt"><span>${k}</span><b>${v}</b><small>${sub}</small></div>`;
        return `<div class="wt-grid ic-tiles">
            ${tile(`${esc(name)} (iç) ortalama`, f1(s.i), `µg/m³ · ${s.all} saat`)}
            ${tile("Dış, aynı saatler", f1(s.o), `µg/m³ · ${s.n} ortak saat`)}
            ${tile("İç / dış (medyan)", f2(s.io), s.io == null ? "–" : s.io < 1 ? "içerisi dışarıdan temiz" : "içerisi dışarıdan kirli")}
            ${tile("Ders saatleri I/O", f2(s.cls.io), `hafta içi 08–18 · ${s.cls.n} saat`)}
            ${tile("Gece I/O", f2(s.night.io), `00–06 · ${s.night.n} saat`)}
            ${tile("Ders − gece (iç)", s.cls.i != null && s.night.i != null ? f1(s.cls.i - s.night.i) : "–", "µg/m³ · iç ortalamalar farkı")}
          </div>`;
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
            const from = Math.max(since(), first - 3600e3);
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
                .filter(r => r.pm2_5 != null).map(r => ({ ts: +new Date(r.recorded_at), v: +r.pm2_5, raw: r.pm2_5_raw }))
                .sort((x, y) => x.ts - y.ts);
            const near = ts => { let best = null; for (const r of raw) { const d = Math.abs(r.ts - ts); if (d <= ATP_WIN && (!best || d < best.d)) best = { ...r, d }; } return best; };
            const by = new Map();
            for (const p of pts) { const m = near(p.ts); if (!m || m.v <= 0) continue; (by.get(p.dev) || by.set(p.dev, []).get(p.dev)).push({ a: p.a, v: m.v, raw: m.raw }); }
            const rows = [...by.entries()].sort().map(([dev, xs]) => ({ dev, n: xs.length, a: median(xs.map(x => x.a)), v: median(xs.map(x => x.v)),
                r: median(xs.map(x => x.a / x.v)), rr: median(xs.filter(x => x.raw > 0).map(x => x.a / x.raw)) }));
            const ok = rows.filter(r => r.n >= MIN_PAIRS);
            const verdict = r => r.r == null ? "" : Math.abs(r.r - 1) <= 0.1 ? "benzer (±%10)" : r.r > 1 ? `Atmotube %${Math.round((r.r - 1) * 100)} yüksek` : `Atmotube %${Math.round((1 - r.r) * 100)} düşük`;
            box.innerHTML = rows.length ? `<table class="ic-table"><thead><tr><th>Cihaz</th><th class="sayi">Eşleşme</th><th class="sayi">Atmotube</th><th class="sayi">PurpleAir (iç)</th><th class="sayi">Oran</th><th>Sonuç</th></tr></thead>
                <tbody>${rows.map(r => `<tr${r.n < MIN_PAIRS ? ' class="few"' : ""}><td><i class="ic-dot" style="background:${C_ATP}"></i>${r.dev}</td><td class="sayi">${r.n}</td>
                  <td class="sayi">${f1(r.a)}</td><td class="sayi">${f1(r.v)}</td><td class="sayi">${f2(r.r)}</td><td>${r.n < MIN_PAIRS ? "az eşleşme" : verdict(r)}</td></tr>`).join("")}</tbody></table>
                <div class="who-cap">Değerler medyan (µg/m³). Oran = Atmotube / iç PurpleAir (US EPA düzeltmeli); ham PurpleAir değerine göre oran:
                  ${ok.map(r => `${r.dev} ${f2(r.rr)}`).join(" · ") || "–"}. Eşleme: Atmotube ölçümü ${esc(bld.name)} içinde (ya da sınırına ≤15 m) ve
                  ±3 dk içinde bir iç PurpleAir ölçümü varsa. Atmotube'un tam olarak ${esc(name)}'de olduğu GPS'ten doğrulanamaz; kesin karşılaştırma için
                  cihazları PurpleAir'in yanına koyup en az 24 saat ölçüm önerilir. Karar kuralı (oran 1 ± %10): hesaplama_ve_kaynaklar.md §5.</div>`
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
                ortalamalarıyla karşılaştırılır. İkisine de US EPA düzeltmesi uygulanır. Ölçüm başlangıcı: ${firstDay}.</p>
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
              <div class="who-cap" style="margin-top:12px">Sınırlılıklar: US EPA düzeltmesi dış ortam verisiyle geliştirildi; iç ortam kaynaklarında (insan, toz) sapma
                olabilir. Sensörün sıcaklık/nem değerleri cihaz içinden ölçülür. I/O oranı medyan; tek tek saatlerde dış hava ile içerinin gecikmeli ilişkisi
                hesaba katılmaz. Ayrıntı: docs/hesaplama_ve_kaynaklar.md §1b.</div>`;
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
