// Exemplo: gera a opção Recomendada da malha 6×4 e confere erros, alertas e conflitos de geometria.
// Uso (da raiz do repositório):  NODE_PATH=$(npm root -g) node .claude/skills/drenagem/testes/exemplo.js plano 1 emop
//   argumentos: plano|declive · opção 0|1|2 · banco emop|sinapi|sco
const run = require('./lib.js');
run(+(process.env.PORT || 8130), async pg => {
  const [d, k, banco] = [process.argv[2] === 'declive', +(process.argv[3] || 1), process.argv[4] || 'emop'];
  const s = await pg.evaluate(([d, k, b]) => gerar(d, k, b), [d, k, banco]);
  const a = await pg.evaluate(() => analisa()); a.seg = s;
  console.log(JSON.stringify(a, null, 1));
});
