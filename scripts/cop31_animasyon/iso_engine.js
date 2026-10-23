const c=document.getElementById('c'),x=c.getContext('2d'),W=1664,H=700,S=52,OX=560,OY=112,C30=0.866,S30=0.5,PW=W-520;
const P=[13.36,13.76,14.36,14.83,15.32,15.81,16.3,15.98,14.94,13.98,13.09,12.39,12.31,12.35,11.51,10.64,9.66,9.41,9.42,10,10.59,11.57,12.41,13.03];
const iso=(a,b,z)=>[OX+(a-b)*C30*S,OY+(a+b)*S30*S-(z||0)*S];
let cs=1,F=null,R=[],PR=[0,0,0,0],BI=0;const Z=p=>[F[0]+(p[0]-F[0])*cs,F[1]+(p[1]-F[1])*cs],Q=(a,b,z)=>Z(iso(a,b,z));
const B={lib:{x:0.6,y:1.2,w:2.6,d:2,h:2.2,c:'#D2CBBB',n:'Library'},sumer:{x:4.4,y:0.2,w:1.8,d:1.5,h:1.4,c:'#C8C1B1',n:'SUMER'},
chem:{x:7,y:0.6,w:3,d:2.4,h:2.8,c:'#BEB8AD',n:'Chem. & Env. Eng.'},kafe:{x:2.4,y:6.2,w:1.8,d:1.3,h:0.8,c:'#DDB989',n:'Café'},cong:{x:7.6,y:6.4,w:2.4,d:1.8,h:1.6,c:'#C3CAD3',n:'Congress Centre'}};
const T=[[5.6,3.6],[4.4,4.6],[6.6,4.8],[1,5.2],[0.4,7],[10.8,6.4],[6.4,8.2],[11.2,5.2],[3.6,3.9]];
const ROAD=9.6,AX=0,AY=-1,BX=12,BY=ROAD-.5;
let cars=Array.from({length:6},(_,i)=>({a:i*2.6-2,v:.9+Math.random()*.6,d:i%2,col:['#E9E5DC','#3B5BA9','#B23B3B','#2C2F36','#DCC48A'][i%5]}));
let smoke=[],puffs=[];const haze=Array.from({length:150},()=>({a:-1+Math.random()*13.5,b:-1+Math.random()*11.5,z:.2+Math.random()*1.6,p:Math.random()*6.28}));
function field(a,b){const dr=Math.abs(b-ROAD),dk=Math.hypot(a-3.3,b-7);return .55+1.9*Math.exp(-dr/1.7)+1.0*Math.exp(-dk/1.3)}
function poly(pts,f,s,w){x.beginPath();pts.forEach((p,i)=>i?x.lineTo(p[0],p[1]):x.moveTo(p[0],p[1]));x.closePath();if(f){x.fillStyle=f;x.fill()}if(s){x.strokeStyle=s;x.lineWidth=w||1.5;x.stroke()}}
const quad=(a,b,w,d,z)=>[iso(a,b,z),iso(a+w,b,z),iso(a+w,b+d,z),iso(a,b+d,z)];
function shade(h,k){const n=parseInt(h.slice(1),16),r=Math.min(255,(n>>16)*k),g=Math.min(255,(n>>8&255)*k),b=Math.min(255,(n&255)*k);return`rgb(${r|0},${g|0},${b|0})`}
function heat(v){const s=[[0,[63,185,80]],[.5,[227,179,65]],[1,[240,136,62]],[1.4,[248,81,73]]];v=Math.max(0,Math.min(1.4,v));for(let i=1;i<s.length;i++)if(v<=s[i][0]){const f=(v-s[i-1][0])/(s[i][0]-s[i-1][0]),A=s[i-1][1],Bc=s[i][1];return A.map((u,k)=>u+(Bc[k]-u)*f|0)}return s[3][1]}
const fnt=(n,b)=>x.font=(b?'bold ':'')+n+'px Helvetica,Arial',rr=(l,t,w,h,r,f)=>{x.fillStyle=f;x.beginPath();x.roundRect(l,t,w,h,r);x.fill()};
const hit=a=>a[0]<16||a[2]>PW||a[1]<12||a[3]>H-12||R.some(r=>a[0]<r[2]&&a[2]>r[0]&&a[1]<r[3]&&a[3]>r[1]);
function pill(px,py,t,bg,fg){fnt(24,1);const L=t.split('\n'),n=L.length-1,tw=Math.max(...L.map(l=>x.measureText(l).width));px=Math.max(tw/2+28,Math.min(PW-tw/2-12,px));
const r=[px-tw/2-12,py-30-n*30,px+tw/2+12,py+8];R.push(r);x.globalAlpha=r[0]<PR[2]&&r[2]>PR[0]&&r[1]<PR[3]&&r[3]>PR[1]?.35:1;rr(r[0],r[1],tw+24,38+n*30,10,bg);x.fillStyle=fg;L.forEach((l,i)=>x.fillText(l,px-tw/2,py-3-(n-i)*30));x.globalAlpha=1}
function box(o,glow,light,al){const{x:a,y:b,w,d,h}=o;x.globalAlpha=al||1;
poly([iso(a+w,b,0),iso(a+w+h*.55,b+h*.3,0),iso(a+w+h*.55,b+d+h*.3,0),iso(a+w,b+d,0)],'rgba(8,12,18,.35)');
const L=[iso(a,b+d,0),iso(a+w,b+d,0),iso(a+w,b+d,h),iso(a,b+d,h)],Rf=[iso(a+w,b,0),iso(a+w,b+d,0),iso(a+w,b+d,h),iso(a+w,b,h)];
const e='rgba(20,26,36,.55)';poly(L,shade(o.c,.86*light),e);poly(Rf,shade(o.c,.6*light),e);poly(quad(a,b,w,d,h),shade(o.c,1.1*light),e);
poly([iso(a,b+d),iso(a+w,b+d),iso(a+w,b),iso(a+w,b,.22),iso(a+w,b+d,.22),iso(a,b+d,.22)],'rgba(8,12,18,.22)');
x.fillStyle=glow?'rgba(255,214,120,.95)':'rgba(46,66,100,.8)';
for(let fz=.32;fz<h-.18;fz+=.55)for(let fx=.22;fx<w-.12;fx+=.42){const p=iso(a+fx,b+d,fz);x.fillRect(p[0],p[1]-13,11,11)}
for(let fz=.32;fz<h-.18;fz+=.55)for(let fy=.22;fy<d-.12;fy+=.42){const p=iso(a+w,b+fy,fz);x.fillRect(p[0]+1,p[1]-13,9,11)}x.globalAlpha=1}
function tree(a,b,light){const g=iso(a,b,0),t=iso(a,b,1.1);x.fillStyle='rgba(8,12,18,.3)';x.beginPath();x.ellipse(g[0]+20,g[1]+4,24,9,0,0,6.29);x.fill();
x.strokeStyle='#5A4632';x.lineWidth=6;x.beginPath();x.moveTo(g[0],g[1]);x.lineTo(t[0],t[1]+16);x.stroke();
const gr=x.createRadialGradient(t[0]-9,t[1]-11,4,t[0],t[1],30);gr.addColorStop(0,shade('#7DB566',light));gr.addColorStop(1,shade('#2F5A2E',light));x.fillStyle=gr;x.beginPath();x.arc(t[0],t[1],28,0,6.29);x.fill()}
function aqi(v){return v<=12?'#3FB950':v<=35.4?'#E3B341':v<=55.4?'#F0883E':'#F85149'}
function ring(px,py,t,col){const k=(t/1400)%1;x.strokeStyle=col;x.globalAlpha=1-k;x.lineWidth=3;x.beginPath();x.arc(px,py,8+k*30,0,6.29);x.stroke();x.globalAlpha=1}
function dev(px,py,k,led){rr(px-k,py-k*1.4,k*2,k*2.8,k*.5,'#1C2028');x.strokeStyle=led;x.lineWidth=k*.35;x.beginPath();x.arc(px,py-k*.5,k*.5,0,6.29);x.stroke()}
function person(a,b,col,walk,t,led){const g=iso(a,b,0);x.fillStyle='rgba(8,12,18,.4)';x.beginPath();x.ellipse(g[0],g[1],16,6,0,0,6.29);x.fill();
const sw=walk?Math.sin(t/110)*8:0;x.strokeStyle='#1A2233';x.lineWidth=8;x.lineCap='round';x.beginPath();x.moveTo(g[0],g[1]-30);x.lineTo(g[0]-sw,g[1]-2);x.moveTo(g[0],g[1]-30);x.lineTo(g[0]+sw,g[1]-2);x.stroke();
poly([[g[0]-13,g[1]-28],[g[0]+13,g[1]-28],[g[0]+10,g[1]-62],[g[0]-10,g[1]-62]],col);x.fillStyle='#E8C9A8';x.beginPath();x.arc(g[0],g[1]-74,11,0,6.29);x.fill();
x.strokeStyle='#1A2233';x.lineWidth=3;x.beginPath();x.moveTo(g[0]-9,g[1]-62);x.lineTo(g[0]+11,g[1]-32);x.stroke();return[g[0]+5,g[1]-48]}
function pa(p,t,k){x.fillStyle='#F4F1EA';x.beginPath();x.roundRect(p[0]-11,p[1]-32,22,30,5);x.fill();rr(p[0]-14,p[1]-40,28,11,5,'#6A3FB5');x.fillStyle='#8C93A0';x.fillRect(p[0]-7,p[1]-22,14,2);x.fillRect(p[0]-7,p[1]-15,14,2);ring(p[0],p[1]-20,t+k,'#B79BFF')}
function card(t,al){x.globalAlpha=al;R.push([24,H-118,W-536,H-24]);rr(24,H-118,W-560,94,22,'rgba(14,22,38,.94)');x.fillStyle='#F5A623';fnt(36,1);x.fillText(t,52,H-58);x.globalAlpha=1}
const segs=SC.segs;let tot=0;segs.forEach(s=>{s.t0=tot;tot+=s.dur});
const tm=m=>String(Math.floor(m/60)).padStart(2,'0')+':'+String(Math.floor(m%60)).padStart(2,'0');
const along=(p,q)=>{const n=p.length-1,k=Math.min(n-1e-6,q*n),i=Math.floor(k),f=k-i,A=p[i],Bp=p[i+1];return[i,[A[0]+(Bp[0]-A[0])*f,A[1]+(Bp[1]-A[1])*f]]};
let t0=null,last=0;
function frame(t){if(!t0)t0=t;const el=((t-t0)/1000)%(tot+SC.hold),dt=Math.min(.05,(t-last)/1000||0);last=t;R=[];
let si=segs.findIndex(s=>el<s.t0+s.dur);const done=si<0;if(done)si=segs.length-1;const s=segs[si],q=done?1:(el-s.t0)/s.dur;
const clock=s.m0+(s.m1-s.m0)*q,hr=Math.floor(clock/60)%24,base=P[hr]/16;
const dose=segs.slice(0,si).reduce((u,v)=>u+v.dose,0)+s.dose*q,col=aqi(s.c);
const pos=s.path?along(s.path,q)[1]:s.at;
const light=hr<8?.85:hr>=17?.88:1.02;
let e=Math.max(0,Math.min(1,el/2.5,(tot+SC.hold-el)/1.5));e=e*e*(3-2*e);cs=1+.12*e;const fp=iso(pos[0],pos[1],.8);if(!F||el<.05)F=fp;F=F.map((u,i)=>u+(fp[i]-u)*Math.min(1,dt*1.5));
const sky=x.createLinearGradient(0,0,0,H);sky.addColorStop(0,hr<8?'#41507A':hr>=17?'#735E78':'#557BA8');sky.addColorStop(1,'#0E1626');x.fillStyle=sky;x.fillRect(0,0,W,H);
x.save();x.beginPath();x.rect(0,0,W-490,H);x.clip();x.setTransform(cs,0,0,cs,F[0]*(1-cs),F[1]*(1-cs));
poly(quad(AX,AY,BX,BY-AY),shade('#5A7A4E',light));
for(let a=AX;a<BX;a+=.5)for(let b=AY;b<BY;b+=.5){const v=field(a+.25,b+.25)*base;const [r,g,bb]=heat((v-.55)/2.2);
poly(quad(a,b,.5,.5),`rgba(${r},${g},${bb},${.38+.45*Math.min(1,Math.max(0,(v-.5)/1.6))})`)}
for(const o of Object.values(B))for(const[k,al]of[[.4,.1],[.16,.2]])poly(quad(o.x-k,o.y-k,o.w+2*k,o.d+2*k),`rgba(8,12,18,${al})`);
poly(quad(AX,BY,BX,ROAD+1.3-BY),shade('#383B42',light));poly(quad(AX,BY,BX,.45),shade('#A8A398',light),'rgba(30,30,30,.5)',2);
x.strokeStyle='rgba(240,230,200,.7)';x.setLineDash([18,16]);x.lineWidth=3;x.beginPath();const r1=iso(AX,ROAD+.4),r2=iso(BX,ROAD+.4);x.moveTo(r1[0],r1[1]);x.lineTo(r2[0],r2[1]);x.stroke();x.setLineDash([]);
const ln=(pp,w,c)=>{x.strokeStyle=c;x.lineWidth=w;x.lineCap=x.lineJoin='round';x.beginPath();pp.forEach((p,i)=>{const z=iso(p[0],p[1]);i?x.lineTo(z[0],z[1]):x.moveTo(z[0],z[1])});x.stroke()};
[[[2.1,BY],[3.2,8.1],[5.6,5.6],[8.6,5.6],[8.8,8.6]],[[2.6,3.6],[5.6,5.6],[8.4,3.4]]].forEach(pp=>ln(pp,16,shade('#D6CCB2',light)));
segs.forEach((g,i)=>{if(g.path&&i<=si){const[k,p]=along(g.path,i<si?1:q),pp=[...g.path.slice(0,k+1),p];ln(pp,13,'rgba(8,12,18,.5)');ln(pp,7,aqi(g.c))}});
let me=null;const items=[...Object.entries(B).map(([k,o])=>({k:o.x+o.y+(o.w+o.d)/2,f:()=>box(o,s.inside&&k===s.in,light,s.inside&&k===s.in?.4:1)})),...T.map(p=>({k:p[0]+p[1]+.5,f:()=>tree(p[0],p[1],light)}))];
for(const cr of cars){cr.a+=(cr.d?-1:1)*cr.v*dt*1.6;if(cr.a>13)cr.a=-2;if(cr.a<-2)cr.a=13;const yb=ROAD+(cr.d?.8:.1);
items.push({k:cr.a+yb+.6,f:()=>box({x:cr.a,y:yb,w:.9,d:.4,h:.35,c:cr.col},0,light)});if(Math.random()<.3*base)smoke.push({a:cr.a+(cr.d?.9:0),b:yb+.2,z:.25,l:1})}
items.push({k:s.inside?0:pos[0]+pos[1]+.6,f:()=>{me=person(pos[0],pos[1],SC.col,!!s.path,t,col)}});
if(SC.umb)items.push({k:3.9+7.9,f:()=>{const p=iso(3.8,7.9,1.05),g=iso(3.8,7.9,0);x.strokeStyle='#8A7A60';x.lineWidth=4;x.beginPath();x.moveTo(g[0],g[1]);x.lineTo(p[0],p[1]);x.stroke();x.fillStyle='#EFE8D8';x.beginPath();x.ellipse(p[0],p[1],40,14,0,0,6.29);x.fill()}});
items.sort((u,v)=>u.k-v.k).forEach(i=>i.f());
smoke=smoke.filter(p=>(p.l-=dt*.4)>0);for(const p of smoke){p.z+=dt*.4;p.b-=dt*.25;const g=iso(p.a,p.b,p.z);x.fillStyle=`rgba(92,90,86,${.26*p.l})`;x.beginPath();x.arc(g[0],g[1],6+(1-p.l)*14,0,6.29);x.fill()}
for(const h of haze){h.p+=dt*.4;const f=field(h.a,h.b)*base,g=iso(h.a+Math.sin(h.p)*.2,h.b,h.z+Math.cos(h.p)*.1);x.fillStyle=`rgba(205,196,182,${Math.min(.5,.07*f*f)})`;x.beginPath();x.arc(g[0],g[1],3+3*f,0,6.29);x.fill()}
const sr=B.sumer,pr=iso(sr.x+sr.w*.5,sr.y+sr.d*.5,sr.h);x.fillStyle='#8C93A0';x.fillRect(pr[0]-2,pr[1]-8,4,10);pa([pr[0],pr[1]-6],t,0);
const ch=B.chem,pi=iso(ch.x+ch.w,ch.y+ch.d*.5,.62);rr(pi[0]-19,pi[1]-50,38,52,4,'#FFE6A8');pa(pi,t,700);
if(Math.random()<s.dose/s.dur*dt*5)puffs.push({x:me[0]+(Math.random()-.5)*130,y:me[1]-26+(Math.random()-.5)*100,l:1});
puffs=puffs.filter(p=>(p.l-=dt*1.3)>0);for(const p of puffs){p.x+=(me[0]-p.x)*dt*3;p.y+=(me[1]-26-p.y)*dt*3;x.fillStyle=`rgba(110,100,92,${p.l})`;x.beginPath();x.arc(p.x,p.y,4.5,0,6.29);x.fill()}
x.restore();const d=Z(me);PR=[d[0]-26,d[1]-44,d[0]+22,d[1]+52];
if(el<3)card('Follow the visitor  ·  orange ground = more PM₂.₅',Math.min(1,(3-el)*2));if(done&&SC.end)card(SC.end,1);
for(const k of['lib','kafe','cong']){const o=B[k],g=Q(o.x+o.w/2,o.y+o.d/2,o.h+.25);pill(g[0],g[1],o.n+(s.inside&&k===s.in?' · visitor inside':''),s.inside&&k===s.in?SC.col:'rgba(14,22,38,.85)','#F4F1EA')}
if(s.in==='chem'&&s.inside){const g=Q(8.5,1.8,3.05);pill(g[0],g[1],ch.n+' · visitor inside',SC.col,'#F4F1EA')}
{const g=Z(pr);pill(g[0]+152,g[1]-34,'PurpleAir · rooftop\nmeasures every 2 min','#6A3FB5','#F4F1EA');const h=Z(pi);pill(h[0]+100,h[1]+72,'PurpleAir · indoor\n(lecture hall)','#6A3FB5','#F4F1EA')}
{const g=Q(2.2,ROAD+1.2,0);pill(g[0],g[1]+30,'Road traffic','rgba(14,22,38,.85)','#F4F1EA')}
{const bw=262,bh=80;const C=[[46,-150],[-46-bw,-150],[46,30],[-46-bw,30],[60,-60],[-60-bw,-60]].map(v=>[d[0]+v[0],d[1]+v[1]]),ok=v=>!hit([v[0],v[1],v[0]+bw,v[1]+bh]);if(!ok(C[BI]))BI=Math.max(0,C.findIndex(ok));const o=C[BI];
const cx=o[0]+40,cy=o[1]+40;rr(o[0],o[1],bw,bh,40,'rgba(14,22,38,.94)');
x.save();x.beginPath();x.arc(cx,cy,32,0,6.29);x.fillStyle='#C9D6E6';x.fill();x.clip();dev(cx,cy+8,13,col);x.restore();
x.strokeStyle='#F4F1EA';x.lineWidth=3;x.beginPath();x.arc(cx,cy,32,0,6.29);x.stroke();fnt(24,1);x.fillStyle='#F4F1EA';x.fillText('Atmotube',o[0]+84,o[1]+35);fnt(24);x.fillStyle='#AEB9CF';x.fillText('wearable',o[0]+84,o[1]+64)}
rr(W-500,24,476,H-48,22,'rgba(14,22,38,.95)');fnt(32,1);x.fillStyle=SC.col;x.fillText(SC.tag,W-470,72);fnt(26);x.fillStyle='#AEB9CF';x.fillText('Time on campus: '+((clock-segs[0].m0)/60).toFixed(1)+' h',W-470,110);
x.translate(0,110);x.fillStyle='#F4F1EA';fnt(56,1);x.fillText(tm(clock),W-470,92);fnt(26);x.fillStyle='#AEB9CF';x.fillText(s.label,W-470,134);
x.fillStyle=col;x.beginPath();x.arc(W-458,176,12,0,6.29);x.fill();x.fillStyle='#F4F1EA';fnt(30,1);x.fillText(s.c.toFixed(1)+' µg/m³ here',W-436,186);
fnt(26);x.fillStyle='#AEB9CF';x.fillText('Inhaled PM₂.₅ so far',W-470,232);rr(W-470,248,416,42,10,'#22304B');
rr(W-470,248,Math.max(4,416*dose/40),42,10,SC.col);x.fillStyle='#F4F1EA';fnt(30,1);x.fillText(dose.toFixed(1)+' µg',W-460,280);
fnt(24,1);x.fillStyle='#F4F1EA';x.fillText('Sensors in this scene',W-470,346);fnt(24);x.fillStyle='#B79BFF';x.fillText('■ PurpleAir: rooftop + lecture hall',W-470,384);x.fillStyle='#F4F1EA';x.fillText('● Atmotube: wearable (field sessions)',W-470,418);x.setTransform(1,0,0,1,0,0);x.fillStyle='rgba(255,255,255,.12)';x.fillRect(W-470,H-128,416,2);fnt(24);x.fillStyle='#F4F1EA';x.fillText('Ground & path color = PM₂.₅',W-470,H-82);
const lg=x.createLinearGradient(W-412,0,W-172,0);lg.addColorStop(0,'#3FB950');lg.addColorStop(.5,'#E3B341');lg.addColorStop(1,'#F85149');x.fillStyle=lg;x.fillRect(W-412,H-62,240,22);x.fillStyle='#AEB9CF';x.fillText('low',W-470,H-42);x.fillText('high',W-160,H-42);
requestAnimationFrame(frame)}requestAnimationFrame(frame);
