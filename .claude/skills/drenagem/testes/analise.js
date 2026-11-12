window.gerar=function(decl,k,banco,disp){P=exampleBairro(decl);GER.disp=disp||'gr';GER.banco=banco;GER.pv='quad';GER.lote=30;GER.C=0.7;GER.saidas=[];GER.saida='';GER.ops=null;P.custos=P.custos||{};P.custos.banco=banco;
 terraPropor(true);const t0=Date.now();const x=gerProjeto(GER_OP[k]);P=migrate(JSON.parse(JSON.stringify(x.p)));P.custos=P.custos||{};P.custos.banco=banco;calc();return (Date.now()-t0)/1000;};
function segX(a,b,c,d){const o=(p,q,r)=>(q.x-p.x)*(r.y-p.y)-(q.y-p.y)*(r.x-p.x);const e=1e-9;return o(a,b,c)*o(a,b,d)<-e&&o(c,d,a)*o(c,d,b)<-e;}
function dSeg(p,a,b){const dx=b.x-a.x,dy=b.y-a.y,L=dx*dx+dy*dy;let t=L?((p.x-a.x)*dx+(p.y-a.y)*dy)/L:0;t=Math.max(0,Math.min(1,t));return Math.hypot(p.x-a.x-t*dx,p.y-a.y-t*dy);}
window.analisa=function(){calc();const G=geoRuas();const o={pvs:P.pvs.length,bls:P.bls.length,err:R.checks.filter(c=>c.st==='err').length,warn:R.checks.filter(c=>c.st==='warn').length};
 const pq={};P.pvs.forEach(p=>pq[p.id]=posPV(G,p));
 const ram=P.bls.map(b=>({b,a:posBL(G,b),p:pq[b.pv]})).filter(x=>x.a&&x.p);
 const tr=P.trechos.map(t=>({t,a:pq[t.m],b:pq[t.j]})).filter(x=>x.a&&x.b);
 let rr=[],rt=[],rp=[],cc=[],pp=[];
 for(let i=0;i<ram.length;i++){for(let j=i+1;j<ram.length;j++)if(segX(ram[i].a,ram[i].p,ram[j].a,ram[j].p))rr.push(ram[i].b.id+'x'+ram[j].b.id);
  tr.forEach(x=>{if(x.t.m===ram[i].b.pv||x.t.j===ram[i].b.pv)return;if(segX(ram[i].a,ram[i].p,x.a,x.b))rt.push(ram[i].b.id+'x'+x.t.id)});
  P.pvs.forEach(p=>{if(p.id===ram[i].b.pv)return;const q=pq[p.id];if(q&&dSeg(q,ram[i].a,ram[i].p)<1.3)rp.push(ram[i].b.id+'~'+p.id)});
  P.pvs.forEach(p=>{const q=pq[p.id];if(q&&Math.hypot(q.x-ram[i].a.x,q.y-ram[i].a.y)<1.5)cc.push(ram[i].b.id+'@'+p.id)});}
 for(let i=0;i<P.pvs.length;i++)for(let j=i+1;j<P.pvs.length;j++){const a=pq[P.pvs[i].id],c=pq[P.pvs[j].id];if(a&&c&&Math.hypot(a.x-c.x,a.y-c.y)<12)pp.push(P.pvs[i].id+'-'+P.pvs[j].id+':'+Math.hypot(a.x-c.x,a.y-c.y).toFixed(1))}
 // caixas sobrepostas (mesma sarjeta) e grupos >2 no mesmo PV/sarjeta/sentido
 let sob=[],grp={},contra=[];P.bls.forEach(b=>{if(num(b.ang)>90.5)contra.push(b.id);const k=b.pv+'|'+b.rua+'|'+b.lado+'|'+sentido18(b);(grp[k]=grp[k]||[]).push(b.id)});
 for(let i=0;i<P.bls.length;i++)for(let j=i+1;j<P.bls.length;j++){const a=P.bls[i],c=P.bls[j];const pa=posBL(G,a),pc=posBL(G,c);if(pa&&pc&&Math.hypot(pa.x-pc.x,pa.y-pc.y)<Math.max(comp18(a),comp18(c))-0.01)sob.push(a.id+'/'+c.id)}
 // ramal com caixa de ralo apontando contra o escoamento da rede? (ramal no PV a montante do trecho = ok)
 Object.assign(o,{ramXram:rr.length,ramXtubo:rt.length,ramPassaPV:rp.length,caixaNoPV:cc.length,pvPerto:pp.length,sobrep:sob.length,mais2:Object.values(grp).filter(l=>l.length>2).length,contra:contra.length,
  ex:{rr:rr.slice(0,4),rt:rt.slice(0,4),rp:rp.slice(0,4),cc:cc.slice(0,4),pp:pp.slice(0,4),sob:sob.slice(0,4)},errs:R.checks.filter(c=>c.st==='err').slice(0,6).map(c=>c.par+' | '+c.el+' | '+c.val)});
 return o;};
window.zoomSVG=function(cid,R0){const G=geoRuas(),c=posPV(G,pvById(cid));R0=R0||25;const S=600/(2*R0),X=q=>((q.x-c.x+R0)*S).toFixed(1),Y=q=>((c.y-q.y+R0)*S).toFixed(1);let s='<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" style="background:#fff">';
 P.ruas.forEach(r=>{const g=G[r.id];if(!g||!g.pts)return;});
 P.trechos.forEach(t=>{const a=posPV(G,pvById(t.m)),b=posPV(G,pvById(t.j));if(a&&b)s+=`<line x1="${X(a)}" y1="${Y(a)}" x2="${X(b)}" y2="${Y(b)}" stroke="#036" stroke-width="4"/><text x="${(+X(a)+ +X(b))/2}" y="${(+Y(a)+ +Y(b))/2-4}" font-size="10" fill="#036">${t.id} Ø${t.D}</text>`});
 P.bls.forEach(b=>{const a=posBL(G,b),p=posPV(G,pvById(b.pv));if(a&&p)s+=`<line x1="${X(a)}" y1="${Y(a)}" x2="${X(p)}" y2="${Y(p)}" stroke="#0a8" stroke-dasharray="4 3" stroke-width="2"/>`;if(a)s+=`<rect x="${X(a)-6}" y="${Y(a)-4}" width="12" height="8" fill="#c40"/><text x="${+X(a)+7}" y="${+Y(a)+10}" font-size="9">${b.id} ${b.rua}${b.lado} ${(+b.ang||0).toFixed(0)}°</text>`});
 P.pvs.forEach(p=>{const q=posPV(G,p);if(q)s+=`<rect x="${X(q)-1.2*S}" y="${Y(q)-1.2*S}" width="${2.4*S}" height="${2.4*S}" fill="none" stroke="#000"/><text x="${X(q)}" y="${Y(q)}" font-size="11" font-weight="bold">${p.id}</text>`});
 return s+'</svg>';};
window.extra=function(){calc();const G=geoRuas();const o={};const rp={};P.bls.forEach(b=>rp[b.pv]=(rp[b.pv]||0)+1);o.ramaisPorPV={};Object.values(rp).forEach(n=>o.ramaisPorPV[n]=(o.ramaisPorPV[n]||0)+1);
 o.top=Object.entries(rp).sort((a,b)=>b[1]-a[1]).slice(0,3);
 const ce=[];let trios=[];P.ruas.forEach(r=>['E','D'].forEach(l=>{const L=P.bls.filter(b=>b.rua===r.id&&b.lado===l).sort((a,b)=>num(a.dist)-num(b.dist));for(let i=1;i<L.length;i++){ce.push(num(L[i].dist)-num(L[i-1].dist));if(i>1&&num(L[i].dist)-num(L[i-2].dist)<12)trios.push(L[i-2].id+','+L[i-1].id+','+L[i].id)}}));
 o.cxEsp={};ce.forEach(e=>{const k=e<1?'<1':e<2?'1-2':e<5?'2-5':e<10?'5-10':'>10';o.cxEsp[k]=(o.cxEsp[k]||0)+1});o.trios=trios.length;o.triosEx=trios.slice(0,4);
 // ramal contra o fluxo da sarjeta: caixa a jusante do PV na sarjeta (o ramal "volta")
 return o;};
