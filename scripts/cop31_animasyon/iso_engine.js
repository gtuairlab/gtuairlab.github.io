const c=document.getElementById('c'),x=c.getContext('2d'),W=1664,H=700,S=52,OX=560,OY=112,C30=0.866,S30=0.5;
const P=[13.36,13.76,14.36,14.83,15.32,15.81,16.3,15.98,14.94,13.98,13.09,12.39,12.31,12.35,11.51,10.64,9.66,9.41,9.42,10,10.59,11.57,12.41,13.03];
const iso=(a,b,z)=>[OX+(a-b)*C30*S,OY+(a+b)*S30*S-(z||0)*S];
const B={lib:{x:0.6,y:1.2,w:2.6,d:2,h:2.2,c:'#D2CBBB',n:'Library'},sumer:{x:4.4,y:0.2,w:1.8,d:1.5,h:1.4,c:'#C8C1B1',n:'SUMER'},
chem:{x:7,y:0.6,w:3,d:2.4,h:2.8,c:'#BEB8AD',n:'Chem. & Env. Eng.'},kafe:{x:2.4,y:6.2,w:1.8,d:1.3,h:0.8,c:'#DDB989',n:'Café'},cong:{x:7.6,y:6.4,w:2.4,d:1.8,h:1.6,c:'#C3CAD3',n:'Congress Centre'}};
const T=[[5.6,3.6],[4.4,4.6],[6.6,4.8],[1,5.2],[0.4,7],[10.8,6.4],[6.4,8.2],[10.6,4],[3.6,3.9],[11.4,2.6]];
const ROAD=9.6,AX=0,AY=-1,BX=12,BY=ROAD-.5;
let cars=Array.from({length:6},(_,i)=>({a:i*2.6-2,v:.9+Math.random()*.6,d:i%2,col:['#E9E5DC','#3B5BA9','#B23B3B','#2C2F36','#DCC48A'][i%5]}));
let smoke=[],puffs=[];const haze=Array.from({length:150},()=>({a:-1+Math.random()*13.5,b:-1+Math.random()*11.5,z:.2+Math.random()*1.6,p:Math.random()*6.28}));
function field(a,b){const dr=Math.abs(b-ROAD),dk=Math.hypot(a-3.3,b-7);return .55+1.9*Math.exp(-dr/1.7)+1.0*Math.exp(-dk/1.3)}
function poly(pts,f,s,w){x.beginPath();pts.forEach((p,i)=>i?x.lineTo(p[0],p[1]):x.moveTo(p[0],p[1]));x.closePath();if(f){x.fillStyle=f;x.fill()}if(s){x.strokeStyle=s;x.lineWidth=w||1.5;x.stroke()}}
function shade(h,k){const n=parseInt(h.slice(1),16),r=Math.min(255,(n>>16)*k),g=Math.min(255,(n>>8&255)*k),b=Math.min(255,(n&255)*k);return`rgb(${r|0},${g|0},${b|0})`}
function heat(v){const s=[[0,[63,185,80]],[.5,[227,179,65]],[1,[240,136,62]],[1.4,[248,81,73]]];v=Math.max(0,Math.min(1.4,v));for(let i=1;i<s.length;i++)if(v<=s[i][0]){const f=(v-s[i-1][0])/(s[i][0]-s[i-1][0]),A=s[i-1][1],Bc=s[i][1];return A.map((u,k)=>u+(Bc[k]-u)*f|0)}return s[3][1]}
function pill(px,py,t,bg,fg){x.font='bold 24px Helvetica,Arial';const tw=x.measureText(t).width;x.fillStyle=bg;x.beginPath();x.roundRect(px-tw/2-12,py-30,tw+24,38,10);x.fill();x.fillStyle=fg;x.fillText(t,px-tw/2,py-3)}
function box(o,glow,light){const{x:a,y:b,w,d,h}=o;
poly([iso(a+w,b,0),iso(a+w+h*.55,b+h*.3,0),iso(a+w+h*.55,b+d+h*.3,0),iso(a+w,b+d,0)],'rgba(8,12,18,.35)');
const top=[iso(a,b,h),iso(a+w,b,h),iso(a+w,b+d,h),iso(a,b+d,h)],L=[iso(a,b+d,0),iso(a+w,b+d,0),iso(a+w,b+d,h),iso(a,b+d,h)],R=[iso(a+w,b,0),iso(a+w,b+d,0),iso(a+w,b+d,h),iso(a+w,b,h)];
const e='rgba(20,26,36,.55)';poly(L,shade(o.c,.86*light),e);poly(R,shade(o.c,.6*light),e);poly(top,shade(o.c,1.1*light),e);
x.fillStyle=glow?'rgba(255,214,120,.95)':'rgba(46,66,100,.8)';
for(let fz=.32;fz<h-.18;fz+=.55)for(let fx=.22;fx<w-.12;fx+=.42){const p=iso(a+fx,b+d,fz);x.fillRect(p[0],p[1]-13,11,11)}
for(let fz=.32;fz<h-.18;fz+=.55)for(let fy=.22;fy<d-.12;fy+=.42){const p=iso(a+w,b+fy,fz);x.fillRect(p[0]+1,p[1]-13,9,11)}}
function tree(a,b,light){const g=iso(a,b,0),t=iso(a,b,1.1);x.fillStyle='rgba(8,12,18,.3)';x.beginPath();x.ellipse(g[0]+20,g[1]+4,24,9,0,0,6.29);x.fill();
x.strokeStyle='#5A4632';x.lineWidth=6;x.beginPath();x.moveTo(g[0],g[1]);x.lineTo(t[0],t[1]+16);x.stroke();
const gr=x.createRadialGradient(t[0]-9,t[1]-11,4,t[0],t[1],30);gr.addColorStop(0,shade('#7DB566',light));gr.addColorStop(1,shade('#2F5A2E',light));x.fillStyle=gr;x.beginPath();x.arc(t[0],t[1],28,0,6.29);x.fill()}
function aqi(v){return v<=12?'#3FB950':v<=35.4?'#E3B341':v<=55.4?'#F0883E':'#F85149'}
function ring(px,py,t,col){const k=(t/1400)%1;x.strokeStyle=col;x.globalAlpha=1-k;x.lineWidth=3;x.beginPath();x.arc(px,py,8+k*30,0,6.29);x.stroke();x.globalAlpha=1}
function person(a,b,col,walk,t){const g=iso(a,b,0);x.fillStyle='rgba(8,12,18,.4)';x.beginPath();x.ellipse(g[0],g[1],16,6,0,0,6.29);x.fill();
const sw=walk?Math.sin(t/110)*8:0;x.strokeStyle='#1A2233';x.lineWidth=8;x.lineCap='round';x.beginPath();x.moveTo(g[0],g[1]-30);x.lineTo(g[0]-sw,g[1]-2);x.moveTo(g[0],g[1]-30);x.lineTo(g[0]+sw,g[1]-2);x.stroke();
x.fillStyle=col;x.beginPath();x.moveTo(g[0]-13,g[1]-28);x.lineTo(g[0]+13,g[1]-28);x.lineTo(g[0]+10,g[1]-62);x.lineTo(g[0]-10,g[1]-62);x.fill();
x.fillStyle='#E8C9A8';x.beginPath();x.arc(g[0],g[1]-74,11,0,6.29);x.fill();
x.fillStyle='#14181F';x.beginPath();x.roundRect(g[0]+2,g[1]-56,12,16,3);x.fill();x.fillStyle='#3FB950';x.fillRect(g[0]+5,g[1]-52,6,3);ring(g[0]+8,g[1]-48,t,'#F4F1EA');
return[g[0],g[1]]}
const segs=SC.segs;let tot=0;segs.forEach(s=>{s.t0=tot;tot+=s.dur});
const tm=m=>String(Math.floor(m/60)).padStart(2,'0')+':'+String(Math.floor(m%60)).padStart(2,'0');
let t0=null,last=0;
function frame(t){if(!t0)t0=t;const el=((t-t0)/1000)%(tot+SC.hold),dt=Math.min(.05,(t-last)/1000||0);last=t;
let si=segs.findIndex(s=>el<s.t0+s.dur);const done=si<0;if(done)si=segs.length-1;const s=segs[si],q=done?1:(el-s.t0)/s.dur;
const clock=s.m0+(s.m1-s.m0)*q,hr=Math.floor(clock/60)%24,base=P[hr]/16;
const dose=segs.slice(0,si).reduce((u,v)=>u+v.dose,0)+s.dose*q;
const pos=s.path?(()=>{const n=s.path.length-1,k=Math.min(n-1e-6,q*n),i=Math.floor(k),f=k-i,A=s.path[i],Bp=s.path[i+1];return[A[0]+(Bp[0]-A[0])*f,A[1]+(Bp[1]-A[1])*f]})():s.at;
const light=hr<8?.85:hr>=17?.88:1.02;
const sky=x.createLinearGradient(0,0,0,H);sky.addColorStop(0,hr<8?'#41507A':hr>=17?'#735E78':'#557BA8');sky.addColorStop(1,'#0E1626');x.fillStyle=sky;x.fillRect(0,0,W,H);
poly([iso(AX,AY),iso(BX,AY),iso(BX,BY),iso(AX,BY)],shade('#5A7A4E',light));
for(let a=AX;a<BX;a+=.5)for(let b=AY;b<BY;b+=.5){const v=field(a+.25,b+.25)*base;const [r,g,bb]=heat((v-.55)/2.2);
poly([iso(a,b),iso(a+.5,b),iso(a+.5,b+.5),iso(a,b+.5)],`rgba(${r},${g},${bb},${.3+.4*Math.min(1,Math.max(0,(v-.5)/1.6))})`)}
poly([iso(AX,BY),iso(BX,BY),iso(BX,ROAD+1.3),iso(AX,ROAD+1.3)],shade('#383B42',light));
x.strokeStyle='rgba(240,230,200,.7)';x.setLineDash([18,16]);x.lineWidth=3;x.beginPath();const r1=iso(AX,ROAD+.4),r2=iso(BX,ROAD+.4);x.moveTo(r1[0],r1[1]);x.lineTo(r2[0],r2[1]);x.stroke();x.setLineDash([]);
x.strokeStyle=shade('#D6CCB2',light);x.lineWidth=16;x.lineCap='round';[[[2.1,BY],[3.2,8.1],[5.6,5.6],[8.6,5.6],[8.8,8.6]],[[2.6,3.6],[5.6,5.6],[8.4,3.4]]].forEach(pp=>{x.beginPath();pp.forEach((p,i)=>{const z=iso(p[0],p[1]);i?x.lineTo(z[0],z[1]):x.moveTo(z[0],z[1])});x.stroke()});
for(const cr of cars){cr.a+=(cr.d?-1:1)*cr.v*dt*1.6;if(cr.a>13)cr.a=-2;if(cr.a<-2)cr.a=13;const yb=ROAD+(cr.d?.8:.1);
box({x:cr.a,y:yb,w:.9,d:.4,h:.35,c:cr.col},false,light);if(Math.random()<.6*base)smoke.push({a:cr.a+(cr.d?.9:0),b:yb+.2,z:.25,l:1})}
let me=null;const items=[...Object.entries(B).map(([k,o])=>({k:o.x+o.w+o.y+o.d,f:()=>box(o,k===s.in,light)})),...T.map(p=>({k:p[0]+p[1]+.5,f:()=>tree(p[0],p[1],light)}))];
if(!s.inside)items.push({k:pos[0]+pos[1]+.6,f:()=>{me=person(pos[0],pos[1],SC.col,!!s.path,t)}});
if(SC.umb)items.push({k:3.9+7.9,f:()=>{const p=iso(3.8,7.9,1.05),g=iso(3.8,7.9,0);x.strokeStyle='#8A7A60';x.lineWidth=4;x.beginPath();x.moveTo(g[0],g[1]);x.lineTo(p[0],p[1]);x.stroke();x.fillStyle='#EFE8D8';x.beginPath();x.ellipse(p[0],p[1],40,14,0,0,6.29);x.fill()}});
items.sort((u,v)=>u.k-v.k).forEach(i=>i.f());
smoke=smoke.filter(p=>(p.l-=dt*.33)>0);for(const p of smoke){p.z+=dt*.45;p.b-=dt*.3;const g=iso(p.a,p.b,p.z);x.fillStyle=`rgba(92,90,86,${.34*p.l})`;x.beginPath();x.arc(g[0],g[1],10+(1-p.l)*26,0,6.29);x.fill()}
for(const h of haze){h.p+=dt*.4;const f=field(h.a,h.b)*base,g=iso(h.a+Math.sin(h.p)*.2,h.b,h.z+Math.cos(h.p)*.1);x.fillStyle=`rgba(205,196,182,${Math.min(.55,.08*f*f)})`;x.beginPath();x.arc(g[0],g[1],4+3*f,0,6.29);x.fill()}
const sr=B.sumer,pa=iso(sr.x+sr.w*.5,sr.y+sr.d*.5,sr.h);x.fillStyle='#F4F1EA';x.fillRect(pa[0]-9,pa[1]-26,18,24);x.fillStyle='#6A3FB5';x.fillRect(pa[0]-9,pa[1]-30,18,6);ring(pa[0],pa[1]-14,t,'#B79BFF');pill(pa[0],pa[1]-44,'PurpleAir · rooftop','#6A3FB5','#F4F1EA');
const ch=B.chem,pi=iso(ch.x+ch.w*.5,ch.y+ch.d,.7);x.fillStyle='#F4F1EA';x.fillRect(pi[0]-8,pi[1]-22,16,20);ring(pi[0],pi[1]-12,t+700,'#B79BFF');pill(pi[0]+20,pi[1]+34,'PurpleAir · indoor (lecture hall)','#6A3FB5','#F4F1EA');
for(const k of['lib','kafe','cong']){const o=B[k],g=iso(o.x+o.w/2,o.y+o.d/2,o.h+.25);pill(g[0],g[1],o.n,'rgba(14,22,38,.82)','#F4F1EA')}
{const g=iso(2.2,ROAD+1.2,0);pill(g[0],g[1]+30,'Road traffic','rgba(14,22,38,.82)','#F4F1EA')}
if(me){if(Math.random()<s.c/40)puffs.push({x:me[0]+(Math.random()-.5)*120,y:me[1]-74+(Math.random()-.5)*90,l:1});pill(me[0]-40,me[1]-112,'Atmotube · wearable','#0E1626','#F4F1EA')}
else{const o=B[s.in],g=iso(o.x+o.w*.5,o.y+o.d*.5,o.h+.95);pill(g[0]+(s.in==='chem'?150:0),g[1]+(s.in==='chem'?40:0),'Inside · Atmotube keeps measuring','#0E1626','#F4F1EA')}
puffs=puffs.filter(p=>(p.l-=dt*1.4)>0);if(me)for(const p of puffs){p.x+=(me[0]-p.x)*dt*3;p.y+=(me[1]-74-p.y)*dt*3;x.fillStyle=`rgba(120,110,100,${p.l})`;x.beginPath();x.arc(p.x,p.y,4,0,6.29);x.fill()}
const cnow=s.c,col=aqi(cnow);
x.fillStyle='rgba(14,22,38,.9)';x.beginPath();x.roundRect(W-500,24,476,H-48,22);x.fill();x.font='bold 32px Helvetica,Arial';x.fillStyle=SC.col;x.fillText(SC.tag,W-470,72);x.font='26px Helvetica,Arial';x.fillStyle='#AEB9CF';x.fillText('Time on campus: '+((clock-segs[0].m0)/60).toFixed(1)+' h',W-470,110);
x.translate(0,110);x.fillStyle='#F4F1EA';x.font='bold 56px Helvetica,Arial';x.fillText(tm(clock),W-470,92);x.font='26px Helvetica,Arial';x.fillStyle='#AEB9CF';x.fillText(s.label,W-470,134);
x.fillStyle=col;x.beginPath();x.arc(W-458,176,12,0,6.29);x.fill();x.fillStyle='#F4F1EA';x.font='bold 30px Helvetica,Arial';x.fillText(cnow.toFixed(1)+' µg/m³ here',W-436,186);
x.font='26px Helvetica,Arial';x.fillStyle='#AEB9CF';x.fillText('Inhaled PM₂.₅ so far',W-470,232);x.fillStyle='#22304B';x.beginPath();x.roundRect(W-470,248,416,42,10);x.fill();
x.fillStyle=SC.col;x.beginPath();x.roundRect(W-470,248,Math.max(4,416*dose/40),42,10);x.fill();x.fillStyle='#F4F1EA';x.font='bold 30px Helvetica,Arial';x.fillText(dose.toFixed(1)+' µg',W-460,280);
x.font='bold 24px Helvetica,Arial';x.fillStyle='#F4F1EA';x.fillText('Sensors in this scene',W-470,346);x.font='24px Helvetica,Arial';x.fillStyle='#B79BFF';x.fillText('■ PurpleAir: rooftop + lecture hall',W-470,384);x.fillStyle='#F4F1EA';x.fillText('● Atmotube: worn by the visitor',W-470,418);x.setTransform(1,0,0,1,0,0);x.fillStyle='rgba(255,255,255,.12)';x.fillRect(W-470,H-128,416,2);x.font='24px Helvetica,Arial';x.fillStyle='#F4F1EA';x.fillText('Ground colour = PM₂.₅',W-480,H-72);
const lg=x.createLinearGradient(W-200,0,W-44,0);lg.addColorStop(0,'#3FB950');lg.addColorStop(.5,'#E3B341');lg.addColorStop(1,'#F85149');x.fillStyle=lg;x.fillRect(W-200,H-92,156,22);x.fillStyle='#AEB9CF';x.fillText('low',W-200,H-40);x.fillText('high',W-96,H-40);
if(done&&SC.end){x.fillStyle='rgba(14,22,38,.92)';x.beginPath();x.roundRect(24,H-130,W-560,106,22);x.fill();x.fillStyle='#F5A623';x.font='bold 38px Helvetica,Arial';x.fillText(SC.end,52,H-62)}
requestAnimationFrame(frame)}requestAnimationFrame(frame);
