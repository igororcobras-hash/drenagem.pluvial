// Teste de regressão da Drenagem: fotografa os resultados (cálculo, gerador, correções, telas, memorial, DXF)
// e compara com uma fotografia anterior. Uso:
//   NODE_PATH=$(npm root -g) node .claude/skills/drenagem/testes/regressao.js grava  <pasta>      (fotografa)
//   NODE_PATH=$(npm root -g) node .claude/skills/drenagem/testes/regressao.js compara <pastaA> <pastaB>
// Variáveis: PROG_FILE (programa a testar; padrão: index.html deste repositório), SITE_DIR, THREE_DIR, PORT, CENARIOS (ex.: "cruz,plano,3d,declive").
const fs = require('fs'), path = require('path');
const modo = process.argv[2];
if (modo === 'compara') {
  const A = process.argv[3], B = process.argv[4]; let dif = 0, tot = 0;
  const fa = fs.readdirSync(A).filter(f => f.endsWith('.json'));
  for (const f of fa) {
    const a = JSON.parse(fs.readFileSync(path.join(A, f))), bp = path.join(B, f);
    if (!fs.existsSync(bp)) { console.log('FALTA', f); dif++; continue; }
    const b = JSON.parse(fs.readFileSync(bp));
    for (const k of Object.keys(a)) { tot++; if (a[k] !== b[k]) { dif++;
      const sa = String(a[k]), sb = String(b[k]); let i = 0; while (i < sa.length && sa[i] === sb[i]) i++;
      console.log('DIFERENTE', f, k, '| A:', sa.slice(Math.max(0, i - 60), i + 80).replace(/\s+/g, ' '), '| B:', sb.slice(Math.max(0, i - 60), i + 80).replace(/\s+/g, ' ')); } }
    for (const k of Object.keys(b)) if (!(k in a)) { console.log('NOVO', f, k); }
  }
  console.log(dif ? '✘ ' + dif + ' diferença(s) em ' + tot + ' itens' : '✔ idêntico (' + tot + ' itens)'); process.exit(dif ? 1 : 0);
}
const run = require('./lib.js'), out = process.argv[3] || 'snap';
fs.mkdirSync(out, {recursive: true});
const CEN = (process.env.CENARIOS || 'cruz,plano,3d,declive').split(',');
run(+(process.env.PORT || 8700), async pg => {
  // data fixa e aleatório fixo: as duas versões têm de dar o mesmo texto
  await pg.addInitScript(() => { const T = Date.UTC(2026, 10, 12, 12, 0, 0), D = Date;
    class FD extends D { constructor(...a) { super(...(a.length ? a : [T])); } static now() { return T; } }
    window.Date = FD; const B0 = window.Blob; window.Blob = class extends B0 { constructor(p, o) { super(p, o); try { (window.__baix = window.__baix || []).push((o && o.type || '') + '\n' + (p || []).map(x => typeof x === 'string' ? x : '[bin]').join('')); } catch (e) {} } }; HTMLAnchorElement.prototype.click = function () {}; let s = 12345; Math.random = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; });
  await pg.reload(); await pg.waitForTimeout(2500); await pg.addScriptTag({path: path.join(__dirname, 'analise.js')});
  await pg.evaluate(() => { chooseDevice('desktop'); window.confirm = () => true; window.alert = () => {};
    window.__baix = []; baixar = (n, c) => { window.__baix.push(n + '\n' + c); }; baixarBlob = (n, b) => { window.__baix.push(n + ' (blob ' + (b && b.size) + ')'); };
    window.snap = function (rot) {   // fotografa o estado atual
      calc(); const o = {}, r6 = (k, v) => typeof v === 'number' ? Math.round(v * 1e6) / 1e6 : v;
      o.P = JSON.stringify(P, r6);
      o.checks = JSON.stringify(R.checks.map(c => [c.st, c.tab, c.el, c.par, c.val, c.lim, c.nota]));
      o.tr = JSON.stringify(R.ordem.map(t => { const x = R.tr[t.id]; return [t.id, x.Q, x.S, x.tc, x.h && x.h.yD, x.h && x.h.V, x.recM, x.recJ, x.piez && x.piez.Hm]; }), r6);
      o.pv = JSON.stringify(Object.keys(R.pv).map(k => { const x = R.pv[k]; return [k, x.prof, x.hf, x.H, x.folga, x.emop && x.emop.L]; }), r6);
      o.bl = JSON.stringify(Object.keys(R.bl).map(k => { const x = R.bl[k]; return [k, x.Qafl, x.T, x.y, x.Qeng, x.Qbyp]; }), r6);
      o.quant = JSON.stringify(R.quant, r6);
      try { o.custo = JSON.stringify(custoRede(), r6); } catch (e) { o.custo = 'ERRO ' + e.message; }
      ['emop', 'sinapi', 'sco'].forEach(b => { try { const L = orcLic(SOLUCOES[1] || SOLUCOES[0], b); o['orc_' + b] = JSON.stringify(L, r6).slice(0, 400000); } catch (e) { o['orc_' + b] = 'ERRO ' + e.message; } });
      try { o.memorial = memorialHTML(); } catch (e) { o.memorial = 'ERRO ' + e.message; }
      const V = {projeto: vProjeto, chuva: vChuva, ruas: vRuas, bacias: vBacias, bls: vBLs, pvs: vPVs, rede: vRede, planta: vPlanta, custos: vCustos, perfil: vPerfil, secao: vSecao, verif: vVerif, memorial: vMemorial};
      Object.keys(V).forEach(k => { try { o['tela_' + k] = V[k](); } catch (e) { o['tela_' + k] = 'ERRO ' + e.message; } });
      window.__baix = []; ['exportDXFPlanta', 'exportDXFPerfil', 'exportDXFSecao'].forEach(f => { try { if (window[f]) window[f](); } catch (e) { window.__baix.push(f + ' ERRO ' + e.message); } });
      o.dxf = window.__baix.join('\n=====\n');
      return o; };
  });
  const grava = async (nome, fn) => { const t0 = Date.now(); const o = await pg.evaluate(fn); fs.writeFileSync(path.join(out, nome + '.json'), JSON.stringify(o)); console.log('✔', nome, ((Date.now() - t0) / 1000).toFixed(1) + ' s', Object.keys(o).length + ' itens'); };
  if (CEN.includes('cruz')) {
    await grava('cruz_calc', () => { P = migrate(exampleProject()); calc(); autoCotas(true); calc(); return snap(); });
    await grava('cruz_corrigir', () => { gerSemUI(() => autoCorrigir()); return snap(); });
  }
  if (CEN.includes('plano')) {
    await grava('plano_ger_sinapi', () => { gerar(false, 1, 'sinapi'); return snap(); });
    await grava('plano_45', () => { const t = toast; toast = () => {}; try { plTodas45(); } finally { toast = t; } return snap(); });
    await grava('plano_redim16', () => { const b0 = T3build, d0 = T3dimUI; T3build = () => {}; T3dimUI = () => {}; try { RAIN_FATOR = 1.6; T3redimensionar(); } finally { RAIN_FATOR = 1; T3build = b0; T3dimUI = d0; } return snap(); });
    await grava('plano_ger_emop', () => { gerar(false, 1, 'emop'); return snap(); });
  }
  if (CEN.includes('3d') && process.env.THREE_DIR) await grava('plano_3d', async () => {
    showTab('tresd'); for (let k = 0; k < 90 && !(T3 && T3.scene && T3.scene.children.length > 5); k++) await new Promise(r => setTimeout(r, 500)); await new Promise(r => setTimeout(r, 3000));
    const o = {}; try { const S = T3 && T3.scene; let nm = 0, nv = 0; const tipos = {};
      if (S) S.traverse(x => { if (x.isMesh || x.isLine || x.isPoints) { nm++; const g = x.geometry; const n = g && g.attributes && g.attributes.position ? g.attributes.position.count : 0; nv += n; const k = (x.name || x.type); tipos[k] = (tipos[k] || 0) + 1; } });
      o.malhas = String(nm); o.vertices = String(nv); const L = []; if (S) S.traverse(x => { if ((x.isMesh || x.isLine || x.isPoints) && x.geometry) { const g = x.geometry; if (!g.boundingBox) g.computeBoundingBox(); const b = g.boundingBox, r = v => Math.round(v * 1000) / 1000; L.push([x.name || x.type, g.attributes.position ? g.attributes.position.count : 0, x.isLineSegments || x.isPoints ? 'animado' : b ? [b.min.x, b.min.y, b.min.z, b.max.x, b.max.y, b.max.z].map(r).join(',') : '']); } }); o.objetos = JSON.stringify(L); o.alertas = String(typeof T3nAlertas === 'function' ? T3nAlertas() : '-'); o.erro = String(window.__t3err || ''); } catch (e) { o.erro = 'ERRO ' + e.message; }
    showTab('verif'); return o; });
  if (CEN.includes('declive')) await grava('declive_ger_sco', () => { gerar(true, 0, 'sco'); return snap(); });
});
