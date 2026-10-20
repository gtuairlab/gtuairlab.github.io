// Trendler sekmesi: (1) haftanın günü × saat ısı haritası (kampüs PM₂.₅, US EPA düzeltmeli saatlik ortalamalar),
// (2) kampüs–bölge (Tuzla) eğilimi: yalnızca iki tarafın da ölçtüğü saatlerden günlük ortalamalar.
// Renk: PM₂.₅ her yerde HKİ sınıf rengi (pm25Color); hücre saydamlığı aynı sınıf içinde değeri ayırt ettirir.
// Bağımlılıklar: who.js (WHO.history), kiyas.js (Kiyas), colorscale.js, icons.js, Chart.js

const Trend = (() => {
    const $ = id => document.getElementById(id);
    const f1 = v => v == null ? "–" : v.toLocaleString("tr-TR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
    const mean = a => a.reduce((x, y) => x + y, 0) / a.length;
    const DAYS = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"];
    const DSHORT = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];
    const WD = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };
    const partsFmt = new Intl.DateTimeFormat("en-US", { timeZone: "Europe/Istanbul", weekday: "short", hour: "2-digit", hourCycle: "h23" });
    const dayLabel = k => new Date(k + "T12:00:00").toLocaleDateString("tr-TR", { day: "numeric", month: "short" });
    const MIN_N = 2;   // hücrede en az bu kadar saatlik ölçüm yoksa boş bırakılır

    let period = 30, busy = false, hist = null, kiyas = null, chart = null;

    function since(days) { return days ? Date.now() - days * 864e5 : -Infinity; }

    // ── Isı haritası ───────────────────────────────────────────────
    function grid(rows) {
        const cell = Array.from({ length: 7 }, () => Array.from({ length: 24 }, () => []));
        const from = since(period);
        for (const r of rows) {
            if (r.pm2_5 == null) continue;
            const t = new Date(r.recorded_at);
            if (isNaN(t) || +t < from) continue;
            const o = {};
            for (const x of partsFmt.formatToParts(t)) o[x.type] = x.value;
            cell[WD[o.weekday]][+o.hour].push(+r.pm2_5);
        }
        return cell.map(row => row.map(a => a.length >= MIN_N ? { v: mean(a), n: a.length } : (a.length ? { v: null, n: a.length } : null)));
    }

    // Hücrelerde görülen HKİ sınıfları (lejant için), düşükten yükseğe
    function classes(vals) {
        const seen = new Map();
        for (const v of [...vals].sort((a, b) => a - b)) { const ad = pm25Label(v); if (!seen.has(ad)) seen.set(ad, pm25Color(v)); }
        return [...seen].map(([ad, col]) => ({ ad, col }));
    }

    function heatHtml(g) {
        const vals = g.flat().filter(c => c && c.v != null).map(c => c.v);
        if (!vals.length) return `<div class="wh-empty">Seçilen dönemde yeterli saatlik ölçüm yok.</div>`;
        const lo = Math.min(...vals), hi = Math.max(...vals);
        const alpha = v => hi > lo ? 0.3 + 0.7 * (v - lo) / (hi - lo) : 0.8;
        let max = null, min = null;
        g.forEach((row, d) => row.forEach((c, h) => {
            if (!c || c.v == null) return;
            if (!max || c.v > max.v) max = { v: c.v, d, h };
            if (!min || c.v < min.v) min = { v: c.v, d, h };
        }));
        const wk = mean(g.slice(0, 5).flat().filter(c => c && c.v != null).map(c => c.v));
        const we = g.slice(5).flat().filter(c => c && c.v != null).map(c => c.v);
        const hh = h => `${String(h).padStart(2, "0")}:00`;
        const head = `<span></span>` + Array.from({ length: 24 }, (_, h) => `<span class="th-h">${h % 3 ? "" : String(h).padStart(2, "0")}</span>`).join("");
        const body = g.map((row, d) => `<span class="th-d">${DSHORT[d]}</span>` + row.map((c, h) => {
            if (!c || c.v == null) return `<i class="th-c empty" title="${DAYS[d]} ${hh(h)} · yeterli ölçüm yok"></i>`;
            return `<i class="th-c" style="--c:${pm25Color(c.v)};--a:${alpha(c.v).toFixed(2)}"
                       title="${DAYS[d]} ${hh(h)} · ${f1(c.v)} µg/m³ · ${c.n} saatlik ölçüm"></i>`;
        }).join("")).join("");
        return `<div class="th-grid" role="img" aria-label="Haftanın günü ve saate göre ortalama PM₂.₅ ısı haritası">${head}${body}</div>
            <div class="th-legend">${classes(vals).map(c => `<span class="th-k"><i style="--c:${c.col};--a:0.85"></i>${c.ad}</span>`).join("")}
              <small>Renk HKİ sınıfı; aynı renkte koyu hücre daha yüksek değer (${f1(lo)}–${f1(hi)} µg/m³).</small></div>
            <div class="oz-line">${ico("trending-up")} En yüksek: <b>${DAYS[max.d]} ${hh(max.h)}</b> (${f1(max.v)} µg/m³) ·
              en düşük: <b>${DAYS[min.d]} ${hh(min.h)}</b> (${f1(min.v)} µg/m³)</div>
            ${we.length ? `<div class="oz-line">${ico("clock")} Hafta içi ortalama <b>${f1(wk)}</b>, hafta sonu <b>${f1(mean(we))}</b> µg/m³</div>` : ""}`;
    }

    // ── Kampüs–bölge eğilimi ───────────────────────────────────────
    function regionData() {
        const from = since(period);
        const pairs = (kiyas && kiyas.pairs || []).filter(x => +new Date(x.k + ":00+03:00") >= from);
        return { pairs, days: Kiyas.daily(pairs), s: Kiyas.summary(pairs) };
    }

    function regionHtml(r) {
        if (!r.days.length) return `<div class="wh-empty">Seçilen dönemde kampüs ve Tuzla'nın aynı saatte ölçtüğü veri yok.</div>`;
        const v = Kiyas.verdict(r.s);
        const half = Math.floor(r.days.length / 2);
        const dd = a => mean(a.map(x => x.c - x.r));
        const trend = r.days.length >= 6 ? dd(r.days.slice(half)) - dd(r.days.slice(0, half)) : null;
        const trTxt = trend == null ? "" : Math.abs(trend) < 0.5 ? "Fark dönem boyunca yaklaşık aynı kaldı."
            : trend > 0 ? `Dönemin ikinci yarısında kampüs Tuzla'ya göre ${f1(trend)} µg/m³ daha yüksek seyretti.`
            : `Dönemin ikinci yarısında kampüs Tuzla'ya göre ${f1(-trend)} µg/m³ daha düşük seyretti.`;
        return `<div class="tr-chart"><canvas id="tr-region" aria-label="Kampüs ve Tuzla günlük ortalama PM₂.₅"></canvas></div>
            <div class="who-legend"><span><i style="background:${Kiyas.C_CAMPUS}"></i>Kampüs (PurpleAir)</span>
              <span><i style="background:${Kiyas.C_REGION}"></i>Tuzla istasyonu</span></div>
            ${v ? `<div class="oz-line ${v.cls}">${v.icon} ${v.txt} (${f1(r.s.c)} / ${f1(r.s.r)} µg/m³)</div>` : ""}
            ${trTxt ? `<div class="oz-line">${ico("info")} ${trTxt}</div>` : ""}
            <div class="who-cap">${r.s.n} ortak saat · ${dayLabel(r.s.first)} – ${dayLabel(r.s.last)}. Yalnızca iki tarafın da ölçtüğü saatler
              karşılaştırılır. Tuzla istasyonu kampüse yaklaşık 6,4 km uzaktadır; PM₂.₅ ölçüm yöntemleri farklıdır (kampüs düşük maliyetli
              sensör + US EPA düzeltmesi, Tuzla referans istasyon).</div>`;
    }

    function drawRegion(r) {
        if (chart) { chart.destroy(); chart = null; }
        const cv = $("tr-region");
        if (!cv || typeof Chart === "undefined") return;
        const line = (label, key, color) => ({ label, data: r.days.map(x => +x[key].toFixed(1)), borderColor: color, backgroundColor: color,
            borderWidth: 2, pointRadius: r.days.length > 40 ? 0 : 2.5, pointHoverRadius: 5, tension: 0.25, spanGaps: true });
        chart = new Chart(cv, {
            type: "line",
            data: { labels: r.days.map(x => dayLabel(x.day)), datasets: [line("Kampüs", "c", Kiyas.C_CAMPUS), line("Tuzla", "r", Kiyas.C_REGION)] },
            options: {
                responsive: true, maintainAspectRatio: false, animation: false, interaction: { mode: "index", intersect: false },
                plugins: { legend: { display: false }, tooltip: { callbacks: {
                    label: it => ` ${it.dataset.label}: ${f1(it.raw)} µg/m³`,
                    afterBody: it => `${r.days[it[0].dataIndex].n} ortak saat` } } },
                scales: {
                    x: { grid: { display: false }, ticks: { color: "#9aa4b8", font: { size: 9.5 }, maxRotation: 0, autoSkip: true, maxTicksLimit: 6 } },
                    y: { min: 0, grid: { color: "rgba(255,255,255,0.06)" }, border: { display: false },
                         title: { display: true, text: "µg/m³", color: "#9aa4b8", font: { size: 10 } },
                         ticks: { color: "#9aa4b8", font: { size: 10 }, maxTicksLimit: 5 } },
                },
            },
        });
    }

    // ── Görünüm ────────────────────────────────────────────────────
    function render() {
        const chips = [[30, "Son 30 gün"], [90, "Son 90 gün"], [0, "Tüm dönem"]]
            .map(([d, t]) => `<button type="button" class="pd-chip${period === d ? " on" : ""}" data-p="${d}">${t}</button>`).join("");
        const r = regionData();
        $("trend-body").innerHTML = `<div class="pd-chips tr-period">${chips}</div>
            <section class="tr-sec">
              <h3>${ico("clock")} Hangi gün, hangi saat?</h3>
              <p class="tr-sub">Kampüs PM₂.₅'inin haftanın günü ve saate göre ortalaması (Türkiye saati, US EPA düzeltmeli saatlik değerler).</p>
              ${heatHtml(grid(hist || []))}
            </section>
            <section class="tr-sec">
              <h3>${ico("trending-up")} Kampüs ve bölge</h3>
              <p class="tr-sub">Kampüs ile Tuzla istasyonunun aynı saatlerdeki günlük ortalamaları.</p>
              ${regionHtml(r)}
            </section>`;
        $("trend-body").querySelectorAll("[data-p]").forEach(b => b.addEventListener("click", () => { period = +b.dataset.p; render(); }));
        if (r.days.length) drawRegion(r);
    }

    async function load() {
        if (busy) return;
        if (hist) { render(); return; }
        busy = true;
        $("trend-body").innerHTML = `<div class="news-empty">Ölçümler yükleniyor…</div>`;
        try {
            [hist, kiyas] = await Promise.all([WHO.history(), Kiyas.data().catch(() => null)]);
            render();
        } catch (e) {
            console.warn("[trend]", e);
            hist = null;
            $("trend-body").innerHTML = `<div class="news-empty">Veriler yüklenemedi; bağlantınızı kontrol edip yeniden deneyin.</div>`;
        } finally { busy = false; }
    }

    return { load };
})();
