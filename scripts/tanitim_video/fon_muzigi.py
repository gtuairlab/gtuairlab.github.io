"""Telifsiz fon müziği üretici (tamamen koddan sentezlenir, yalnızca numpy):
    python fon_muzigi.py <süre_sn> <çıktı.wav> [tempo] [kapanış_sn]

Sakin ve iyimser, akademik bir tanıtıma uygun: Fa – Sol – La minör – Do (IV–V–vi–I) döngüsü.
Katmanlar sırayla girer: pad + piyano → arpej ve bas → hafif ritim → zil ezgisi. kapanış_sn verilirse
(video_kaydet.js'in yazdığı sahneler.json → "kapanis") tempo o an bir ölçü başına denk gelecek şekilde
hafifçe ayarlanır; ritim orada durur, döngü Do majöre çözülür ve son akor yankıyla söner.
Çıkış: 48 kHz, stereo, 16 bit WAV (tepe −1 dBFS). Ses düzeyi birleştirmede loudnorm ile ayarlanır (README.md)."""
import sys, wave
import numpy as np

D = float(sys.argv[1]); OUT = sys.argv[2]
BPM0 = float(sys.argv[3]) if len(sys.argv) > 3 else 100
END = float(sys.argv[4]) if len(sys.argv) > 4 else None
SR = 48000; N = int(D * SR)
rng = np.random.default_rng(7)

# Tempo: kapanış bir ölçü başına denk gelsin
if END:
    kb = max(8, round(END / (240 / BPM0)))
    BPM = 240 * kb / END
else:
    BPM = BPM0; kb = None
beat = 60 / BPM; bar = 4 * beat
nbars = int(np.ceil(D / bar))
if kb is None: kb = nbars          # kapanış yoksa çözülme yok, döngü sonuna kadar sürer

f = lambda m: 440.0 * 2 ** ((m - 69) / 12)
# Akorlar (MIDI): Fmaj7, G6, Am7, Cmaj7 — kök + yakın sesli dizilim
CH = [[53, 57, 60, 64], [55, 59, 62, 64], [57, 60, 64, 67], [48, 55, 59, 64]]
ROOT = [41, 43, 45, 36]
FINAL = [48, 55, 60, 62, 64, 67]   # Cadd9 (çözülme)
off = (1 - (kb - 1)) % 4           # kapanıştan önceki ölçü Sol (V) olsun
chord_of = lambda b: (b + off) % 4

dry = np.zeros((2, N)); send = np.zeros((2, N))   # send: yankıya giden kanal
side = np.zeros((2, N))                            # kick'e göre bastırılacak katmanlar (pad, arpej, bas)

def put(buf, sig, start, gl=1.0, gr=1.0):
    i = int(round(start * SR))
    if i >= N or i + len(sig) <= 0: return
    a, b = max(0, i), min(N, i + len(sig))
    buf[0, a:b] += sig[a - i:b - i] * gl; buf[1, a:b] += sig[a - i:b - i] * gr

def env_adsr(n, a, r, total):
    t = np.arange(n) / SR
    return np.minimum(1, t / max(a, 1e-4)) * np.clip((total - t) / r, 0, 1)

def saw(freq, n, kmax=None, tilt=7.0, phase=0.0):
    t = np.arange(n) / SR; s = np.zeros(n)
    K = int(min(kmax or 40, 5200 / freq))
    for k in range(1, K + 1):
        s += np.sin(2 * np.pi * k * freq * t + phase * k) / k * np.exp(-k / tilt)
    return s

def piano(freq, dur, vel=1.0):
    n = int(dur * SR); t = np.arange(n) / SR; s = np.zeros(n)
    for k in range(1, 11):
        fk = k * freq * np.sqrt(1 + 0.0004 * k * k)
        if fk > 9000: break
        s += np.sin(2 * np.pi * fk * t) * (1 / k ** 1.25) * np.exp(-t * (0.9 + 0.75 * k))
    s += 0.25 * np.sin(2 * np.pi * freq * t) * np.exp(-t * 0.5)          # uzun gövde
    s *= np.minimum(1, t / 0.004)
    thump = rng.standard_normal(n) * np.exp(-t * 90) * 0.04
    return (s + thump) * vel

def pluck(freq, dur, vel=1.0):
    n = int(dur * SR); t = np.arange(n) / SR; s = np.zeros(n)
    for k, a in enumerate([1, 0.45, 0.22, 0.12, 0.06], 1):
        s += a * np.sin(2 * np.pi * k * freq * t) * np.exp(-t * (5 + 3 * k))
    return s * np.minimum(1, t / 0.002) * vel

def bell(freq, dur, vel=1.0):
    n = int(dur * SR); t = np.arange(n) / SR
    mod = 1.6 * np.exp(-t / 0.35) * np.sin(2 * np.pi * 2.0 * freq * t)
    return np.sin(2 * np.pi * freq * t + mod) * np.exp(-t * 1.6) * np.minimum(1, t / 0.003) * vel

def filt_noise(n, lo, hi):
    x = rng.standard_normal(n); X = np.fft.rfft(x); fr = np.fft.rfftfreq(n, 1 / SR)
    X *= ((fr >= lo) & (fr <= hi)); return np.fft.irfft(X, n)

kicks = []
for b in range(nbars):
    st = b * bar
    if st >= D or b > kb: break
    final = END is not None and b == kb
    notes = FINAL if final else CH[chord_of(b)]
    # Pad: iki hafif ayrık testere dalga, yavaş giriş, ölçüler arasında örtüşür
    plen = (D - st) if final else bar + 1.4
    n = int(plen * SR)
    if n > 0:
        e = env_adsr(n, 0.9 if b == 0 or final else 0.35, 1.3, plen)
        lfo = 1 + 0.12 * np.sin(2 * np.pi * 0.17 * np.arange(n) / SR + b)
        for j, m in enumerate(notes):
            v = 0.032 if not final else 0.04
            l = saw(f(m) * 2 ** (-6 / 1200), n, tilt=6.5, phase=0.3 * j) * e * lfo * v
            r = saw(f(m) * 2 ** (6 / 1200), n, tilt=6.5, phase=0.7 * j) * e * lfo * v
            tgt = dry if final else side
            tgt[0, int(st * SR):int(st * SR) + n] += l[:max(0, min(n, N - int(st * SR)))]
            tgt[1, int(st * SR):int(st * SR) + n] += r[:max(0, min(n, N - int(st * SR)))]
            put(send, (l + r) * 0.5, st, 0.6, 0.6)
    # Piyano: ölçü başında akor (hafif arpejli), ilk 4 ölçü ve sonrasında her ölçü
    if True:
        vel = 0.5 if b < 4 else 0.38
        if final: vel = 0.6
        for j, m in enumerate(sorted(notes)):
            sig = piano(f(m + (12 if final and j > 3 else 0)), 6.0 if final else bar * 1.6, vel * (0.9 if j else 1))
            pan = 0.5 + (j - 1.5) * 0.12
            put(dry, sig * 0.11, st + j * 0.018, 1 - pan + 0.5, pan + 0.5)
            put(send, sig * 0.08, st + j * 0.018)
        if not final and b >= 4:   # 3. vuruşta tekrar (yumuşak)
            for j, m in enumerate(sorted(notes)[1:]):
                put(dry, piano(f(m), bar, 0.22) * 0.11, st + 2 * beat + j * 0.015, 0.9, 1.0)
    if final: continue
    # Arpej (5. ölçüden): sekizlik, yukarı-aşağı
    if b >= 4:
        tones = sorted(notes) + [sorted(notes)[0] + 12]
        pat = [0, 2, 1, 3, 4, 3, 2, 1]
        for k in range(8):
            m = tones[pat[k]] + 12
            acc = 1.0 if k % 2 == 0 else 0.7
            sig = pluck(f(m), 0.9, acc)
            pan = 0.3 + 0.4 * (k % 2)
            put(side, sig * 0.05, st + k * beat / 2, 1 - pan + 0.3, pan + 0.3)
            put(send, sig * 0.035, st + k * beat / 2)
    # Bas (5. ölçüden)
    if b >= 4:
        rf = f(ROOT[chord_of(b)])
        for k, (pos, dur) in enumerate([(0, 1.4), (1.5, 0.45), (2, 1.4), (3.5, 0.45)]):
            nb = int(dur * beat * SR); tb = np.arange(nb) / SR
            s = (np.sin(2 * np.pi * rf * tb) + 0.28 * np.sin(4 * np.pi * rf * tb) + 0.08 * np.sin(6 * np.pi * rf * tb))
            s *= np.minimum(1, tb / 0.006) * np.clip((dur * beat - tb) / 0.05, 0, 1) * np.exp(-tb * 1.2)
            put(side, s * (0.10 if k % 2 == 0 else 0.065), st + pos * beat)
    # Ritim (9. ölçüden kapanışa kadar)
    if b >= 8:
        for k in range(4):
            t0 = st + k * beat
            nk = int(0.42 * SR); tk = np.arange(nk) / SR
            ph = 2 * np.pi * np.cumsum(48 + 70 * np.exp(-tk * 28)) / SR
            kick = np.sin(ph) * np.exp(-tk * 7.5) + 0.25 * rng.standard_normal(nk) * np.exp(-tk * 400)
            put(dry, kick * 0.20, t0); kicks.append(t0)
            if k in (1, 3):   # el çırpma: üç kısa patlama
                nc = int(0.25 * SR); tc = np.arange(nc) / SR; c = filt_noise(nc, 900, 5200)
                envc = sum(np.exp(-np.maximum(0, tc - d) * 60) * (tc >= d) for d in (0, 0.011, 0.022)) * np.exp(-tc * 9)
                put(dry, c * envc * 0.06, t0, 0.95, 1.0); put(send, c * envc * 0.07, t0)
            for h in (0, 0.5):  # hi-hat sekizlik, ofbit vurgulu
                nh = int(0.07 * SR); th = np.arange(nh) / SR
                hat = filt_noise(nh, 7000, 15000) * np.exp(-th * (55 if h else 80))
                put(dry, hat * (0.032 if h else 0.016), t0 + h * beat, 0.8, 1.0)
    # Zil ezgisi (17. ölçüden): seyrek, akor tonlarından
    if b >= 16 and b < kb:
        mel = sorted(notes)
        for pos, idx in [(0, 3), (1.5, 2), (2.5, 1), (3, 2)] if b % 2 == 0 else [(0.5, 2), (2, 3)]:
            put(dry, bell(f(mel[idx] + 24), 1.6) * 0.022, st + pos * beat, 0.9, 1.0)
            put(send, bell(f(mel[idx] + 24), 1.6) * 0.03, st + pos * beat)

# Kapanışa giriş: 2 ölçülük yükselen gürültü (süpürme)
if END and kb < nbars + 1:
    t_end = kb * bar; L = 2 * bar; n = int(L * SR); tt = np.arange(n) / SR
    x = rng.standard_normal(n); out = np.zeros(n); seg = int(0.05 * SR)
    for i in range(0, n, seg):
        lo = 400 + 7000 * (i / n) ** 2
        X = np.fft.rfft(x[i:i + seg]); fr = np.fft.rfftfreq(len(x[i:i + seg]), 1 / SR)
        X *= (fr > lo) & (fr < lo * 3.5); out[i:i + seg] = np.fft.irfft(X, len(x[i:i + seg]))
    sw = out * (tt / L) ** 2.2 * 0.05
    put(dry, sw, t_end - L, 0.9, 1.0); put(send, sw, t_end - L)

# Kick'e göre hafif bastırma (sidechain)
g = np.ones(N)
for t0 in kicks:
    i = int(t0 * SR); n = min(N - i, int(0.45 * SR))
    if n > 0: g[i:i + n] = np.minimum(g[i:i + n], 1 - 0.38 * np.exp(-np.arange(n) / SR / 0.13))
dry += side * g

# Yankı (Schroeder): paralel tarak + seri tüm-geçiren, kanal başına farklı gecikmeler
def comb(x, d, g):
    y = x.copy()
    for i in range(d, len(y), d):
        j = min(len(y), i + d); y[i:j] += g * y[i - d:j - d]
    return y
def allpass(x, d, g):
    y = np.zeros_like(x); buf = np.concatenate([np.zeros(d), x])
    for i in range(0, len(x), d):
        j = min(len(x), i + d)
        prev = y[i - d:j - d] if i >= d else np.zeros(j - i)
        y[i:j] = -g * x[i:j] + buf[i:j] + g * prev
    return y
wet = np.zeros_like(send)
for ch, sh in ((0, 0), (1, 23)):
    s = sum(comb(send[ch], int((d + sh) * SR / 44100), 0.83) for d in (1557, 1617, 1491, 1422, 1277, 1356)) / 6
    for d in (556 + sh, 441 + sh, 341, 225):
        s = allpass(s, int(d * SR / 44100), 0.5)
    wet[ch] = s
def highpass(x, fc):   # sıfır fazlı, FFT ile (çevrimdışı)
    X = np.fft.rfft(x, axis=-1); fr = np.fft.rfftfreq(x.shape[-1], 1 / SR)
    return np.fft.irfft(X / np.sqrt(1 + (fc / np.maximum(fr, 1e-3)) ** 8), x.shape[-1], axis=-1)
mix = highpass(dry, 32) + highpass(wet, 190) * 0.55   # yankıda bas birikmesin

# Ana çıkış: giriş/çıkış geçişleri, yumuşak doyum, tepe −1 dBFS
t = np.arange(N) / SR
mix *= np.minimum(1, t / 1.2) * np.clip((D - t) / 2.5, 0, 1)
mix = np.tanh(mix / np.abs(mix).max() * 1.15) / np.tanh(1.15)
mix *= 10 ** (-1 / 20) / np.abs(mix).max()
data = (mix.T * 32767).astype(np.int16)
with wave.open(OUT, "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(data.tobytes())
print(f"müzik: {OUT} · {D:.1f} sn · {BPM:.1f} BPM · kapanış ölçüsü {kb} ({kb * bar:.2f} sn)")
