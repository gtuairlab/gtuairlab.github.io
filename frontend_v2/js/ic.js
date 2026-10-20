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
    const SKIP = 60 * 60e3 + WARMUP;                      // saatlik veride kurulum anı bilinmez: ilk (kısmi) saat dilimi + ısınma saati
    const ATP_WIN = 3 * 60e3;                             // Atmotube–PurpleAir eşleme penceresi (dış sensörle aynı kural)
    const MIN_PAIRS = 3;

    let latest = null, name = "Amfi 1", status = null, marker = null;
    const tsCharts = {};
    let panelHours = 24, panelMetric = "pm";   // zaman grafiği örnekleri (kanvas kimliğine göre): açılır kutu ve sensör paneli
    let period = 7, inHourly = null, busy = false, charts = [];
    let program = null;   // Amfi 1 ders programı (yoksa null → hafta içi 08–18 varsayımı)
    const programReady = fetch("data/amfi1_program.json", { cache: "no-cache" })
        .then(r => r.ok ? r.json() : null).then(p => { if (p && Array.isArray(p.dersler) && p.dersler.length) program = p; }).catch(() => {});

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
            <div class="pa-raw">US EPA düzeltmeli (iç ortamda doğrulanmadı)${cf1(latest) != null ? ` · ham sensör değeri ${f1(cf1(latest))} µg/m³ (CF=1)` : ""}${latest.qa_ab === false ? " · A/B kanalları uyuşmuyor" : ""}</div>
            <div class="pa-grid">
              <div class="pa-cell" title="Ham değerlerin (CF=1) oranı: iç ÷ dış"><div class="k">İç / dış</div><div class="v" id="ic-io">…</div></div>
              <div class="pa-cell"><div class="k">Sıcaklık*</div><div class="v">${latest.temperature_c != null ? f1(+latest.temperature_c) + "°" : "--"}</div></div>
              <div class="pa-cell"><div class="k">Nem*</div><div class="v">${latest.humidity_pct != null ? Math.round(latest.humidity_pct) + "%" : "--"}</div></div>
            </div>
            <div class="pa-foot"><span>${typeof trClock === "function" ? trClock(latest.recorded_at) : t.toLocaleString("tr-TR")}</span><span>${esc(name)}</span></div>
            ${tsBox("ic-panel-ts", panelHours, panelMetric)}
            <button type="button" class="ic-btn oz-more" id="ic-open">${ico("chart-column")} Ayrıntılı analiz</button>`;
        bindTs(el, "ic-panel-ts");
        el.querySelectorAll(".ic-ts-chips [data-h]").forEach(b => b.addEventListener("click", () => { panelHours = +b.dataset.h; }));
        el.querySelectorAll(".ic-ts-chips [data-m]").forEach(b => b.addEventListener("click", () => { panelMetric = b.dataset.m; }));
        drawTs("ic-panel-ts");
        $("ic-open").addEventListener("click", () => Shell.openPanel("ic"));
        const out = await sameTimeOut(t);
        const io = $("ic-io");
        const vin = cf1(latest);
        if (io) io.textContent = out && vin != null ? f2(vin / out) : "--";
        if (io) io.title = out ? `Ham değerler (CF=1): iç ${f1(vin)} ÷ dış (SUMER çatısı) ${f1(out)} µg/m³` : "Aynı an için dış ölçüm yok";
    }

    // ── Zaman grafiği: PM₂.₅ (iç), iç/dış oranı (ham cf_1), sıcaklık ve nem (iç ve dış) ──
    // Son 6 sa / 24 sa → 2 dk'lık ölçümler (dış sensörle ±2 dk eşleme), 7 gün → saatlik ortalamalar (aynı saat)
    const RANGES = { 6: "6 saat", 24: "24 saat", 168: "7 gün" };
    const METRICS = { pm: "PM₂.₅", io: "İç/dış", t: "Sıcaklık", rh: "Nem" };
    const tsState = {};   // kanvas kimliğine göre seçili süre ve ölçü
    function tsBox(id, hours, metric = "pm") {
        tsState[id] = { hours, metric };
        const chips = (obj, key, cur) => Object.entries(obj).map(([v, t]) =>
            `<button type="button" class="pd-chip${String(v) === String(cur) ? " on" : ""}" data-${key}="${v}">${t}</button>`).join("");
        return `<div class="ic-ts"><div class="pd-chips ic-ts-chips">${chips(METRICS, "m", metric)}</div>
            <div class="pd-chips ic-ts-chips">${chips(RANGES, "h", hours)}</div>
            <div class="ic-ts-chart"><canvas id="${id}" aria-label="${esc(name)} iç ortam ölçümleri, zamana karşı"></canvas></div>
            <div class="who-legend ic-ts-leg" id="${id}-leg"></div>
            <div class="ic-ts-cap" id="${id}-cap">Yükleniyor…</div></div>`;
    }
    // İç kayıtları dış kayıtlarla eşle: saatlikte aynı saat, 2 dk'lıkta en yakın (≤2,5 dk)
    function matchOut(inRows, outRows, hourly) {
        if (hourly) {
            const m = new Map(outRows.map(r => [hourKey(new Date(r.recorded_at)), r]));
            return inRows.map(r => m.get(hourKey(new Date(r.recorded_at))) || null);
        }
        const o = outRows.map(r => ({ ts: +new Date(r.recorded_at), r })).sort((a, b) => a.ts - b.ts);
        let j = 0;
        return inRows.map(r => {
            const ts = +new Date(r.recorded_at);
            while (j + 1 < o.length && Math.abs(o[j + 1].ts - ts) <= Math.abs(o[j].ts - ts)) j++;
            return o.length && Math.abs(o[j].ts - ts) <= 150e3 ? o[j].r : null;
        });
    }
    const num = v => v == null || v === "" || isNaN(v) ? null : +v;
    // Ders saatleri: grafiğin arkasında soluk dikey bantlar (ders programına göre; yeni renk değil, nötr saydam beyaz)
    const BAND = "rgba(255,255,255,0.07)";
    const BAND_LEG = `<span><i style="background:rgba(255,255,255,0.22)"></i>Ders (programa göre)</span>`;
    const bandPlugin = flags => ({ id: "dersBand", beforeDatasetsDraw(c) {
        if (!flags || !flags.some(Boolean)) return;
        const { ctx, chartArea: a, scales: { x } } = c, n = flags.length;
        const half = n > 1 ? Math.abs(x.getPixelForValue(1) - x.getPixelForValue(0)) / 2 : 0;
        ctx.save(); ctx.fillStyle = BAND;
        for (let i = 0; i < n; i++) {
            if (!flags[i]) continue;
            let j = i; while (j + 1 < n && flags[j + 1]) j++;
            const l = Math.max(a.left, x.getPixelForValue(i) - half), r = Math.min(a.right, x.getPixelForValue(j) + half);
            ctx.fillRect(l, a.top, r - l, a.bottom - a.top); i = j;
        }
        ctx.restore(); } });
    async function drawTs(id, hours, metric) {
        const st = tsState[id] || (tsState[id] = { hours: 24, metric: "pm" });
        if (hours != null) st.hours = hours;
        if (metric != null) st.metric = metric;
        const H = st.hours, M = st.metric;
        const cv = $(id), cap = $(id + "-cap"), leg = $(id + "-leg");
        if (!cv || typeof Chart === "undefined") return;
        const end = new Date(), start = new Date(end - H * 3600e3), iv = H > 24 ? "hourly" : "raw";
        let rows = [], outs = [];
        try {
            const [a, b] = await Promise.all([API.indoorHistory(start.toISOString(), end.toISOString(), iv),
                M === "pm" ? Promise.resolve({ data: [] }) : API.purpleairHistory(new Date(start - 5 * 60e3).toISOString(), end.toISOString(), iv)]);
            rows = a.data || []; outs = b.data || [];
        } catch (_) { if (cap) cap.textContent = "Veri yüklenemedi."; return; }
        if (!$(id) || tsState[id].hours !== H || tsState[id].metric !== M) return;   // bu arada kapandı ya da seçim değişti
        if (tsCharts[id]) { tsCharts[id].destroy(); delete tsCharts[id]; }
        if (!rows.length) { if (cap) cap.textContent = "Bu aralıkta kayıt yok."; if (leg) leg.innerHTML = ""; return; }
        const om = M === "pm" ? [] : matchOut(rows, outs, H > 24);
        const fmt = H > 24 ? { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" } : { hour: "2-digit", minute: "2-digit" };
        const labels = rows.map(r => new Date(r.recorded_at).toLocaleString("tr-TR", { timeZone: "Europe/Istanbul", ...fmt }));
        const flags = program ? rows.map(r => { const t = new Date(r.recorded_at); return H > 24 ? isClass(hourPoint(t)) : inClassAt(t); }) : null;
        const bandLeg = flags && flags.some(Boolean) ? BAND_LEG : "";
        const r1 = v => v == null ? null : +v.toFixed(1), r2 = v => v == null ? null : +v.toFixed(2);
        const line = (label, data, color, dashed) => ({ label, data, borderColor: color, backgroundColor: color, borderWidth: dashed ? 1.6 : 2,
            borderDash: dashed ? [5, 4] : [], pointRadius: 0, pointHoverRadius: 4, tension: 0.25, spanGaps: H > 24 ? false : 6 * 60e3 });
        let sets, unit, yMin = 0, capTxt;
        const stats = v => { v = v.filter(x => x != null); return v.length ? { lo: Math.min(...v), m: mean(v), hi: Math.max(...v) } : null; };
        if (M === "pm") {
            const v = rows.map(r => r1(num(r.pm2_5)));
            sets = [line(`${name} (iç)`, v, C_IN)]; unit = "µg/m³";
            const s = stats(v);
            capTxt = s ? `PM₂.₅ µg/m³ (US EPA, iç ortamda doğrulanmadı) · en düşük <b>${f1(s.lo)}</b> · ortalama <b>${f1(s.m)}</b> · en yüksek <b>${f1(s.hi)}</b>` : null;
        } else if (M === "io") {
            const ci = rows.map(cf1), co = om.map(o => o ? cf1(o) : null);
            const v = ci.map((x, i) => x != null && co[i] != null && co[i] > 0 ? r2(x / co[i]) : null);
            sets = [line("İç / dış (ham)", v, C_IN), { ...line("Eşit (1)", v.map(() => 1), "#8a93a6", true), borderWidth: 1, pointHoverRadius: 0 }]; unit = "oran";
            const ok = ci.map((x, i) => x != null && co[i] != null && co[i] > 0 ? i : -1).filter(i => i >= 0);
            const rom = ok.length ? mean(ok.map(i => ci[i])) / mean(ok.map(i => co[i])) : null, s = stats(v);
            capTxt = s ? `İç ÷ dış, ham değerler (CF=1, A/B denetimli; ${H > 24 ? "aynı saat" : "±2 dk"} eşleme) · aralık <b>${f2(s.lo)}</b>–<b>${f2(s.hi)}</b> ·
                dönem oranı (ortalamaların oranı) <b>${f2(rom)}</b> · 1'in altı: içerideki derişim dışarıdakinden düşük` : "Bu aralıkta eşleşen dış ölçüm yok.";
        } else {
            const key = M === "t" ? "temperature_c" : "humidity_pct";
            const vi = rows.map(r => r1(num(r[key]))), vo = om.map(o => o ? r1(num(o[key])) : null);
            sets = [line(`${name} (iç)`, vi, C_IN), line("Dış · SUMER çatısı", vo, C_OUT, true)];
            unit = M === "t" ? "°C" : "%"; if (M === "t") yMin = undefined;
            const si = stats(vi), so = stats(vo), u = M === "t" ? " °C" : " %";
            capTxt = si ? `${M === "t" ? "Sıcaklık" : "Bağıl nem"}: iç ortalama <b>${f1(si.m)}${u}</b> (${f1(si.lo)}–${f1(si.hi)})${so ? ` · dış <b>${f1(so.m)}${u}</b>` : ""}.
                PurpleAir bunu cihaz gövdesinin içinden ölçer: sıcaklık ortamdan yüksek, nem düşük okunur (iki sensörde benzer sapma).` : null;
        }
        if (leg) leg.innerHTML = (M === "pm" ? "" : M === "io"
            ? `<span><i style="background:${C_IN}"></i>İç / dış</span><span><i class="dash" style="border-color:#8a93a6"></i>Eşit (1)</span>`
            : `<span><i style="background:${C_IN}"></i>${esc(name)} (iç)</span><span><i class="dash" style="border-color:${C_OUT}"></i>Dış · SUMER çatısı</span>`) + bandLeg;
        const fmtV = v => v == null ? "–" : unit === "oran" ? f2(v) : `${f1(v)} ${unit}`;
        tsCharts[id] = new Chart(cv, {
            type: "line", data: { labels, datasets: sets }, plugins: [bandPlugin(flags)],
            options: {
                responsive: true, maintainAspectRatio: false, animation: false, interaction: { mode: "index", intersect: false },
                plugins: { legend: { display: false }, tooltip: {
                    filter: it => it.dataset.label !== "Eşit (1)",
                    callbacks: { label: it => M === "pm" ? ` ${f1(it.raw)} µg/m³ (EPA) · ham ${f1(cf1(rows[it.dataIndex]))} µg/m³` : ` ${it.dataset.label}: ${fmtV(it.raw)}` } } },
                scales: {
                    x: { grid: { display: false }, ticks: { color: "#9aa4b8", font: { size: 9.5 }, maxRotation: 0, autoSkip: true, maxTicksLimit: 5,
                         callback: function (v) { const l = String(this.getLabelForValue(v)); return H > 24 ? l.split(" ").slice(0, 2).join(" ") : l; } } },
                    y: { min: yMin, grid: { color: "rgba(255,255,255,0.06)" }, border: { display: false },
                         title: { display: true, text: unit === "oran" ? "iç / dış" : unit, color: "#9aa4b8", font: { size: 10 } },
                         ticks: { color: "#9aa4b8", font: { size: 10 }, maxTicksLimit: 4 } },
                },
            },
        });
        if (cap) cap.innerHTML = capTxt ? `${capTxt} · ${H > 24 ? "saatlik ortalama" : "2 dakikalık ölçüm"}` : "Bu aralıkta geçerli ölçüm yok.";
    }
    function bindTs(root, id) {
        const wire = (sel, key) => root.querySelectorAll(sel).forEach(b => b.addEventListener("click", () => {
            root.querySelectorAll(sel).forEach(x => x.classList.toggle("on", x === b));
            if (key === "h") drawTs(id, +b.dataset.h, null); else drawTs(id, null, b.dataset.m);
        }));
        wire(".ic-ts-chips [data-h]", "h");
        wire(".ic-ts-chips [data-m]", "m");
    }

    function placeMarker() {
        if (!latest || latest.lat == null || typeof map === "undefined" || !map) return;
        const html = `<div class="ic-marker" style="--marker-color:${latest.pm2_5 == null ? "#8a93a6" : pm25Color(latest.pm2_5)}">${ico("building-2")}</div>`;
        const icon = L.divIcon({ className: "ic-marker-wrap", html, iconSize: [26, 26], iconAnchor: [13, 13] });
        const tip = `${esc(name)} (iç) <b>${latest.pm2_5 == null ? "--" : f1(latest.pm2_5)}</b> µg/m³`;
        if (!marker) {
            marker = L.marker([latest.lat, latest.lon], { icon, zIndexOffset: 450 }).addTo(map)
                .bindTooltip(tip, { direction: "top", offset: [0, -14], className: "pa-label" })
                .bindPopup(() => `<div class="ic-pop"><b>${esc(name)} · iç ortam PurpleAir</b>
                      <small>Kimya ve Çevre Müh. binası · son ölçüm ${latest.pm2_5 == null ? "--" : f1(latest.pm2_5)} µg/m³</small>
                      ${tsBox("ic-pop-ts", 24, "pm")}
                      <button type="button" class="ic-btn oz-more" id="ic-pop-open">${ico("chart-column")} Ayrıntılı analiz</button></div>`,
                    { minWidth: 300, maxWidth: 340, className: "ic-popup" });
            marker.on("popupopen", e => {
                const root = e.popup.getElement();
                bindTs(root, "ic-pop-ts");
                drawTs("ic-pop-ts");
                root.querySelector("#ic-pop-open")?.addEventListener("click", () => { marker.closePopup(); Shell.openPanel("ic"); });
            });
            marker.on("popupclose", () => { if (tsCharts["ic-pop-ts"]) { tsCharts["ic-pop-ts"].destroy(); delete tsCharts["ic-pop-ts"]; } });
        } else { marker.setIcon(icon); marker.setTooltipContent(tip); }
    }

    // ── Analiz paneli ──────────────────────────────────────────────
    function since() { return period ? Date.now() - period * 864e5 : 0; }

    function pairs(outRows) {
        const out = new Map();
        for (const r of outRows) out.set(hourKey(new Date(r.recorded_at)), { e: r.pm2_5 == null ? null : +r.pm2_5, c: cf1(r),
                                                                         t: num(r.temperature_c), rh: num(r.humidity_pct) });
        const first = inHourly && inHourly.length ? +new Date(inHourly[0].recorded_at) : 0;
        const from = Math.max(since(), first + SKIP), res = [];
        for (const r of inHourly || []) {
            const t = new Date(r.recorded_at);
            if (+t < from) continue;
            const k = hourKey(t), o = out.get(k) || {}, ci = cf1(r);
            if (r.pm2_5 == null && ci == null) continue;
            res.push({ t, k, h: hourOf(k), wd: wdFmt.format(t), i: r.pm2_5 == null ? null : +r.pm2_5, o: o.e ?? null, ci, co: o.c ?? null,
                       ti: num(r.temperature_c), to: o.t ?? null, hi: num(r.humidity_pct), ho: o.rh ?? null });
        }
        return res;
    }

    // Ders saati: Amfi 1 ders programı (data/amfi1_program.json, bölümün dönem ders programından; yalnızca gün, saat, ders kodu) varsa
    // programdaki saatler — saatin en az 30 dakikası derse denk gelen saatler (09:30–12:30 bloğundan 9, 10, 11, 12; kullanıcının kararı,
    // 20 Ekim 2026). Dönem dışı ve tatil günleri ders sayılmaz. Program yoksa hafta içi 08–18.
    // Boş derslik: hafta içi 08–18'de programda hiç ders olmayan saatler (yalnızca program varsa).
    const WD_NUM = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };
    const toMin = s => { const [h, m] = String(s).split(":").map(Number); return h * 60 + (m || 0); };
    const offDay = d => { const dn = program.donem || {};
        return (dn.baslangic && d < dn.baslangic) || (dn.bitis && d > dn.bitis) || (program.tatiller || []).includes(d); };
    function classMin(p) {   // saatlik dilimin kaç dakikası programdaki derse denk geliyor
        if (!program || offDay(p.k.slice(0, 10))) return 0;
        const a = p.h * 60, b = a + 60;
        return program.dersler.filter(x => x.gun === WD_NUM[p.wd])
            .reduce((m, x) => m + Math.max(0, Math.min(b, toMin(x.bit)) - Math.max(a, toMin(x.bas))), 0);
    }
    function inClassAt(t) {   // o an programdaki bir dersin içinde mi (dakika düzeyinde; 2 dakikalık grafiklerin bantları için)
        if (!program) return false;
        const k = hourKey(t);
        if (offDay(k.slice(0, 10))) return false;
        const m = hourOf(k) * 60 + t.getUTCMinutes(), g = WD_NUM[wdFmt.format(t)];   // Türkiye UTC+3, dakika UTC ile aynı
        return program.dersler.some(x => x.gun === g && m >= toMin(x.bas) && m < toMin(x.bit));
    }
    const hourPoint = t => { const k = hourKey(t); return { k, h: hourOf(k), wd: wdFmt.format(t) }; };
    const weekdayDay = p => !["Sat", "Sun"].includes(p.wd) && p.h >= 8 && p.h < 18;
    const isClass = p => program ? classMin(p) >= 30 : weekdayDay(p);
    const isIdle = p => !!program && weekdayDay(p) && classMin(p) === 0;
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
                 cls: grp(isClass), idle: grp(isIdle), night: grp(isNight) };
    }

    function tilesHtml(s) {
        const tile = (k, v, sub) => `<div class="wt"><span>${k}</span><b>${v}</b><small>${sub}</small></div>`;
        return `<div class="wt-grid ic-tiles">
            ${tile(`${esc(name)} (iç) ortalama`, f1(s.i), `µg/m³ (EPA) · ham değer ${f1(s.ci)} · ${s.all} saat`)}
            ${tile("Dış, aynı saatler", f1(s.o), `µg/m³ (EPA) · ham değer ${f1(s.co)} · ${s.n} ortak saat`)}
            ${tile("İç / dış", f2(s.io), `ham değerlerle · saatlik medyan ${f2(s.med)} · EPA ile ${f2(s.ioE)}`)}
            ${tile("Ders saatleri I/O", f2(s.cls.io), `${program ? "ders programındaki saatler" : "hafta içi 08–18"} · ${s.cls.n} saat · EPA ile ${f2(s.cls.ioE)}`)}
            ${program ? tile("Boş derslik I/O", f2(s.idle.io), `hafta içi 08–18, programda ders yok · ${s.idle.n} saat · EPA ile ${f2(s.idle.ioE)}`) : ""}
            ${tile("Gece I/O (boş bina)", f2(s.night.io), `23–05 · ${s.night.n} saat · sızmaya yaklaşık`)}
            ${tile("Ders − gece (iç)", s.cls.i != null && s.night.i != null ? f1(s.cls.i - s.night.i) : "–", "µg/m³ (EPA) · iç ortalamalar farkı")}
          </div>
          <div class="who-cap">${program ? `Ders saatleri: ${esc(program.kaynak || "ders programı")} içindeki ${esc(name)} dersleri; en az 30 dakikası derse
            denk gelen saatler (sınav haftaları ve iptaller programda yok). ` : ""}I/O = iç ham değer (CF=1) ortalaması ÷ aynı saatlerin dış ham değer ortalaması (A/B denetimli). EPA'lı oran yalnızca
            karşılaştırma içindir: düzeltme iki değere aynı sabiti (+5,75) ekler ve nem terimi iç/dış nem farkıyla değişir; oran 1'e doğru
            kayar, en çok temiz saatlerde (ör. nem %50'de ham oran 0,50 iken ham 10/20 → EPA'lı 0,56; ham 4/8 → 0,63). Gece I/O'su sızma faktörüne yaklaşır;
            maruziyet modelindeki F değerleri için en az 2 hafta veri (≥10 gece, 2 hafta sonu) birikmesi önerilir.</div>`;
    }

    function chartBase(unit = "µg/m³") {
        const fmtV = v => v == null ? "–" : unit === "oran" ? f2(v) : `${f1(v)} ${unit}`;
        return {
            responsive: true, maintainAspectRatio: false, animation: false, interaction: { mode: "index", intersect: false },
            plugins: { legend: { display: false }, tooltip: { filter: it => it.dataset.label !== "Eşit (1)",
                callbacks: { label: it => ` ${it.dataset.label}: ${fmtV(it.raw)}` } } },
            scales: {
                x: { grid: { display: false }, ticks: { color: "#9aa4b8", font: { size: 9.5 }, maxRotation: 0, autoSkip: true, maxTicksLimit: 7 } },
                y: { min: unit === "°C" ? undefined : 0, grid: { color: "rgba(255,255,255,0.06)" }, border: { display: false },
                     title: { display: true, text: unit === "oran" ? "iç / dış" : unit, color: "#9aa4b8", font: { size: 10 } },
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
        // Zaman eksenli grafikler: eksende gün ("14 Eki"); dönem 36 saatten kısaysa saat ("16:00"); ayrıntı ipucunda
        const short = ps.length > 1 && ps[ps.length - 1].t - ps[0].t <= 36 * 3600e3;
        const tsOpts = unit => { const o = chartBase(unit); o.scales.x.ticks.callback = function (v) {
            const p = String(this.getLabelForValue(v)).split(" "); return short ? p.slice(2).join(" ") : p.slice(0, 2).join(" "); }; return o; };
        const r1 = v => v == null ? null : +v.toFixed(1);
        const flags = program ? ps.map(isClass) : null;
        const mk = (cid, sets, opts) => { const c = $(cid); if (c) charts.push(new Chart(c, { type: "line", data: { labels: ps.map(lab), datasets: sets }, options: opts, plugins: [bandPlugin(flags)] })); };
        mk("ic-ts", [ds(`${name} (iç)`, ps.map(p => r1(p.i)), C_IN, false), ds("Dış · SUMER çatısı", ps.map(p => r1(p.o)), C_OUT, true)], tsOpts("µg/m³"));
        const io = ps.map(p => p.ci != null && p.co != null && p.co > 0 ? +(p.ci / p.co).toFixed(2) : null);
        mk("ic-iots", [ds("İç / dış (ham)", io, C_IN, false), { ...ds("Eşit (1)", io.map(() => 1), "#8a93a6", true), borderWidth: 1, pointHoverRadius: 0 }], tsOpts("oran"));
        mk("ic-temp", [ds(`${name} (iç)`, ps.map(p => r1(p.ti)), C_IN, false), ds("Dış · SUMER çatısı", ps.map(p => r1(p.to)), C_OUT, true)], tsOpts("°C"));
        mk("ic-rh", [ds(`${name} (iç)`, ps.map(p => r1(p.hi)), C_IN, false), ds("Dış · SUMER çatısı", ps.map(p => r1(p.ho)), C_OUT, true)], tsOpts("%"));
        const byH = Array.from({ length: 24 }, (_, h) => ps.filter(p => p.h === h));
        const c2 = $("ic-hod");
        const hm = (g, k) => { const v = g.map(p => p[k]).filter(x => x != null); return v.length ? +mean(v).toFixed(1) : null; };
        if (c2) charts.push(new Chart(c2, { type: "line", data: { labels: byH.map((_, h) => String(h).padStart(2, "0")), datasets: [
            ds(`${name} (iç)`, byH.map(g => hm(g, "i")), C_IN, false),
            ds("Dış · SUMER çatısı", byH.map(g => hm(g, "o")), C_OUT, true)] },
            options: chartBase("µg/m³") }));
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
            const from = Math.max(since(), first + SKIP);
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
                .filter(r => +new Date(r.recorded_at) >= first + SKIP)
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
                <th class="sayi">PurpleAir (ham)</th><th class="sayi">Oran</th><th class="sayi">EPA'lı ile</th></tr></thead>
                <tbody>${rows.map(r => `<tr${r.n < MIN_PAIRS ? ' class="few"' : ""}><td><i class="ic-dot" style="background:${C_ATP}"></i>${r.dev}</td><td class="sayi">${r.n}</td>
                  <td class="sayi">${f1(r.a)}</td><td class="sayi">${f1(r.c)}</td><td class="sayi">${r.n < MIN_PAIRS ? "–" : f2(r.r)}</td><td class="sayi">${r.n < MIN_PAIRS ? "az" : f2(r.re)}</td></tr>`).join("")}</tbody></table>
                <div class="who-cap">Ortalamalar µg/m³. Oran = Atmotube ortalaması ÷ eşleşen iç PurpleAir ham değer (CF=1) ortalaması; "EPA'lı ile" aynı oran düzeltilmiş
                  PurpleAir'e göre (duyarlılık). Literatür beklentisi: ham değere göre ≈0,55–0,75, EPA'lıya göre ≈1 (Shittu vd. 2025; Tryner vd. 2021).
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
            const bandLeg = program && ps.some(isClass) ? BAND_LEG : "";
            body.innerHTML = `<div class="pd-chips tr-period">${chips}</div>
              <p class="tr-sub">${esc(name)} (Kimya ve Çevre Müh. binası) iç ortam PurpleAir'i ile SUMER çatısındaki dış sensör, aynı saatlerin saatlik
                ortalamalarıyla karşılaştırılır. Değerler US EPA düzeltmeli gösterilir; iç/dış oranları ham (CF=1) değerlerle hesaplanır. Ölçüm başlangıcı: ${firstDay}.</p>
              ${ps.length ? tilesHtml(s) : `<div class="wh-empty">Seçilen dönemde iç ölçüm yok.</div>`}
              <section class="tr-sec"><h3>${ico("activity")} Saatlik seyir</h3>
                <div class="tr-chart"><canvas id="ic-ts" aria-label="İç ve dış saatlik PM₂.₅"></canvas></div>
                <div class="who-legend"><span><i style="background:${C_IN}"></i>${esc(name)} (iç)</span><span><i class="dash" style="border-color:${C_OUT}"></i>Dış · SUMER çatısı</span>${bandLeg}</div></section>
              <section class="tr-sec"><h3>${ico("scale")} İç / dış oranı (I/O) zamana karşı</h3>
                <p class="tr-sub">Her saat için iç ham değer ÷ dış ham değer (CF=1). Kesikli çizgi 1: altında içerideki derişim dışarıdakinden düşük,
                  üstünde yüksek (iç kaynak: insan, toz). Gece değerleri dış havanın içeri sızma oranına yaklaşır.</p>
                <div class="tr-chart"><canvas id="ic-iots" aria-label="Saatlik iç/dış PM₂.₅ oranı"></canvas></div>
                <div class="who-legend"><span><i style="background:${C_IN}"></i>İç / dış</span><span><i class="dash" style="border-color:#8a93a6"></i>Eşit (1)</span>${bandLeg}</div></section>
              <section class="tr-sec"><h3>${ico("activity")} Sıcaklık ve nem</h3>
                <p class="tr-sub">Saatlik ortalamalar. PurpleAir sıcaklık ve nemi cihaz gövdesinin içinden ölçer: sıcaklık ortamdan yüksek, nem düşük
                  okunur (iki sensörde benzer sapma); karşılaştırma için uygundur, mutlak değer için değil.</p>
                <div class="tr-chart ic-small"><canvas id="ic-temp" aria-label="İç ve dış sıcaklık"></canvas></div>
                <div class="tr-chart ic-small"><canvas id="ic-rh" aria-label="İç ve dış bağıl nem"></canvas></div>
                <div class="who-legend"><span><i style="background:${C_IN}"></i>${esc(name)} (iç)</span><span><i class="dash" style="border-color:${C_OUT}"></i>Dış · SUMER çatısı</span>${bandLeg}</div></section>
              <section class="tr-sec"><h3>${ico("clock")} Günün saatine göre</h3>
                <p class="tr-sub">Her saatin dönem ortalaması (Türkiye saati). Ders saatlerinde içerideki artış, insan hareketi ve kapı/pencere açılmasıyla ilişkili olabilir.</p>
                <div class="tr-chart"><canvas id="ic-hod" aria-label="Günün saatine göre iç ve dış ortalama PM₂.₅"></canvas></div>
                <div class="who-legend"><span><i style="background:${C_IN}"></i>${esc(name)} (iç)</span><span><i class="dash" style="border-color:${C_OUT}"></i>Dış · SUMER çatısı</span></div></section>
              <section class="tr-sec"><h3>${ico("scale")} Atmotube ile karşılaştırma</h3>
                <div id="ic-atp"><div class="news-empty">Atmotube ölçümleri eşleştiriliyor…</div></div></section>
              <div class="who-cap" style="margin-top:12px">Sınırlılıklar: Grafiklerdeki değerler US EPA düzeltmelidir; denklem dış ortam verisiyle geliştirildi,
                iç ortamda doğrulanmadı (insan kaynaklı iri parçacık, toz ve yemek kaynaklı çok ince parçacıklarda optik sensör sapabilir). Bu yüzden oranlar ham (CF=1)
                değerlerle hesaplanır. Dış sensör çatıda (141 m uzakta), iç sensör derslikte; yükseklik ve gecikme farkı tek tek saatlerde I/O'yu oynatabilir.
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
            await programReady;
            render();
        } catch (e) {
            console.warn("[ic]", e);
            $("ic-body").innerHTML = `<div class="news-empty">Veriler yüklenemedi; bağlantınızı kontrol edip yeniden deneyin.</div>`;
        } finally { busy = false; }
    }

    return { load, loadPanel };
})();
