// Servidor + navegador para testar o Drenagem Pluvial 2.
// PROG_FILE = index.html do programa (padrão: o da raiz deste repositório)
// SITE_DIR  = pasta do site totalcivil-site (bancos de preços orcamento/dados, assistente-abas.js, estado-pagina.js)
// THREE_DIR = pasta "package" do three@0.128.0 (npm pack three@0.128.0) para testar o 3D
const {chromium}=require('playwright');const http=require('http'),fs=require('fs'),path=require('path');
module.exports=async function(port,fn){
const PROG=process.env.PROG_FILE||path.resolve(__dirname,'../../../../index.html');
const SITE=process.env.SITE_DIR||path.resolve(__dirname,'../../../../../totalcivil-site');
const srv=http.createServer((q,s)=>{const u=decodeURIComponent(q.url.split('?')[0]);let f;
 if(/^\/drenagem2?\/(index\.html)?$/.test(u))f=PROG;else{f=path.join(SITE,u);if(fs.existsSync(f)&&fs.statSync(f).isDirectory())f+='/index.html';}
 if(!fs.existsSync(f)){s.statusCode=404;return s.end()}s.end(fs.readFileSync(f))}).listen(port);
const b=await chromium.launch();const pg=await b.newPage({viewport:{width:1600,height:1100}});
pg.on('pageerror',e=>console.log('PAGEERR',e.message));pg.on('console',m=>{if(m.type()==='error'&&!/Failed to load resource/.test(m.text()))console.log('CONSOLE',m.text().slice(0,200))});
await pg.route(/^https?:\/\/(?!localhost)/,r=>r.abort());
const TD=process.env.THREE_DIR;
if(TD)await pg.route(/three@0\.128\.0\/(build|examples)\//,r=>{const u=r.request().url(),m=u.match(/three@0\.128\.0\/(.*)$/);const f=path.join(TD,m[1]);if(fs.existsSync(f))r.fulfill({body:fs.readFileSync(f),contentType:'application/javascript'});else r.abort();});
await pg.goto('http://localhost:'+port+'/drenagem2/index.html');await pg.waitForTimeout(2500);
await pg.addScriptTag({path:__dirname+'/analise.js'});
try{await fn(pg)}finally{await b.close();srv.close();}}
