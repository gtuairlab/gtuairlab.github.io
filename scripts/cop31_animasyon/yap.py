"""COP31 sunumu 3B ziyaretçi animasyonları: iso_engine.js + sahneler.json → cikti/embed_A.html, embed_B.html.
Kullanım: python3 scripts/cop31_animasyon/yap.py   (çıktılar git dışında, cikti/ klasöründe)
Her embed ≤ 16 KB olmalı (sunum aracının x-embed sınırı); script boyutları yazdırır."""
import json, os, sys
D = os.path.dirname(os.path.abspath(__file__))
eng = open(os.path.join(D, 'iso_engine.js'), encoding='utf-8').read()
sc = json.load(open(os.path.join(D, 'sahneler.json'), encoding='utf-8'))
os.makedirs(os.path.join(D, 'cikti'), exist_ok=True)
ok = True
for k, v in sc.items():
    html = ('<!doctype html><html><body style="margin:0;background:#0E1626;overflow:hidden">'
            '<canvas id="c" width="1664" height="700" style="width:100%;height:100%;display:block"></canvas><script>const SC='
            + json.dumps(v, ensure_ascii=False, separators=(',', ':')) + ';\n' + eng + '</script></body></html>')
    p = os.path.join(D, 'cikti', f'embed_{k}.html')
    open(p, 'w', encoding='utf-8').write(html)
    n = len(html.encode('utf-8')); ok &= n <= 16000
    print(f'{k}: {n} bayt {"OK" if n <= 16000 else "SINIR AŞILDI"}')
sys.exit(0 if ok else 1)
