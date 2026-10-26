#!/bin/bash
# COP31 Stant 11 döngü filmi · varlıkları hazırlar (görseller repoya girmez; yalnızca bu betik ve film kodu).
# Kullanım: bash hazirla.sh <cikti_klasoru> <cop31_gecici_klasoru>
#   <cop31_gecici_klasoru>: flyer/fonts, render/assets (logo, karekod, uygulama ekranları), harita/doku.png (uydu, © Esri, Maxar)
set -e
OUT=$(mkdir -p "$1" && cd "$1" && pwd); SRC=$(cd "$2" && pwd); HERE=$(cd "$(dirname "$0")" && pwd)
NM=${NM:-$SRC/../node_modules}
mkdir -p "$OUT/assets/fonts"
cp "$SRC"/flyer/fonts/* "$OUT/assets/fonts/"
A="$SRC/render/assets"
cp "$A/9bb40cd979d7bfcef84a09a1babf5262" "$OUT/assets/logo.png"          # GTU AirLab logosu
cp "$A/938dab365d4b05b8f683d0be39ec522f" "$OUT/assets/qr.png"            # https://gtuairlab.github.io/frontend_v2/
cp "$A/5b7b79d811384fa389c57cba053b03c5" "$OUT/assets/app_summary.jpg"   # uygulama Özet ekranı (20 Ekim 2026)
cp "$A/503f3095fcf850e668a2531d0bcf48a2" "$OUT/assets/app_exposure.jpg"  # maruziyet asistanı ekranı
# Uydu dokusu: harita_hazirla.py çıktısı (doku.png, 3× büyütülmüş, uygulama katmanları temizlenmiş); kampüsün güneyi kırpılır
python3 - "$SRC/harita/doku.png" "$OUT/assets/campus_sat.jpg" <<'EOF'
import sys
from PIL import Image
im = Image.open(sys.argv[1]).convert('RGB')
im.crop((700, 830, 3600, 2460)).save(sys.argv[2], quality=90)   # 2900×1630; SUMER (1652,1113)
EOF
# Lucide çizgi ikonları (ISC) → assets/icons.js
node - "$NM/lucide-static/icons" "$OUT/assets/icons.js" <<'EOF'
const fs = require('fs'), [dir, out] = process.argv.slice(2);
const names = ['footprints','coffee','book-open','presentation','gauge','bell-ring','message-circle','globe','heart-pulse','house',
  'building-2','check','smartphone','laugh','smile','map-pin','users','radio','brain-circuit','chart-line','school','network','route','flask-conical'];
const o = {};
for (const n of names) o[n] = fs.readFileSync(`${dir}/${n}.svg`, 'utf8').replace(/<!--[\s\S]*?-->/g, '').replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '').trim();
fs.writeFileSync(out, '// Lucide (ISC) çizgi ikonları\nwindow.ICONS = ' + JSON.stringify(o) + ';\n');
EOF
if [ "$HERE" != "$OUT" ]; then cp "$HERE/film.html" "$HERE/film.js" "$OUT/"; fi
echo "hazır: $OUT/assets"
