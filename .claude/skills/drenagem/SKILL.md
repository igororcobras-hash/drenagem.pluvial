---
name: drenagem
description: Use ao mexer no programa Drenagem Pluvial 2 do Total Civil (index.html deste repositório) — cálculos (racional, Izzard, bocas de lobo, Manning, PVs, piezométrica), gerador "🧭 3 opções", correções automáticas, verificação (aba 13), 3D, custos EMOP/SINAPI/SCO, e para testar com Playwright.
---

# Drenagem Pluvial — como trabalhar no programa

Dono: Igor, engenheiro civil (não programador). Responda em português do Brasil, linguagem simples, nomes exatos de arquivos e o que ele precisa fazer.

## Antes de mexer
1. Leia `CLAUDE.md` deste repositório (notas PATCH DR-xx: histórico e decisões do dono) e **`CALCULOS.md` desta pasta** (fórmulas, critérios, funções, decisões).
2. Parta da versão do GitHub (`git fetch origin main`); nunca perca função que funciona.
3. Mudança nova = bloco `<script>` PATCH próprio antes de `</body>` em `drenagem/index.html`, que substitui funções pelo nome global (`f = function(){...}` embrulhando a antiga). Ajuste dentro de bloco antigo só para corrigir defeito, com comentário `// DR-xx:`.
4. Registre a nota `- PATCH DR-xx (data, onde): ...` no `CLAUDE.md`, com o que foi testado e o que NÃO foi.

## Armadilhas do código
- `P` (projeto) e `R` (resultado do `calc()`) são globais `let`: no Playwright use o nome direto dentro de `page.evaluate`.
- `calc()` é embrulhado várias vezes (alas, piezométrica, memo, conflitos). Sempre leia `R` DEPOIS de chamar `calc()`.
- Muitas rotinas chamam `toast`, `save`, `renderTab`, `confirm`: para rodar sem janela use `gerSemUI(() => ...)` e, em teste, `window.confirm = () => true`.
- Correções são caras (calc ~5–50 ms × milhares de vezes). Use o cache que já existe (`autoCorrigir` embrulhado no DR-18 só recalcula se `JSON.stringify(P)` mudou).
- `pvBancoCat()` lê `P.custos.banco`: os MODELOS de PV seguem a base de custos escolhida.
- `fundo21`, `vVerif`, `gerTela`, `gerEng16`, `T3redimensionar`, `autoCorrigir`, `calc` já foram embrulhadas — embrulhe de novo, não reescreva.
- Strings com template em HTML de botões: escape com `esc()`.
- Comentário `//` no meio de uma linha comprida pode engolir código (bug do DR-18 corrigido no DR-20): quebre a linha.

## Regras de engenharia (decisões do dono)
Ver `CALCULOS.md` §6. Resumo: 🧭 sem erros; PV no tamanho da tabela da base, senão 2 PVs colados; 1 caixa por sarjeta/sentido em cada PV (ou 2 lado a lado); ramal a favor do fluxo sem cruzar rede; toda correção refaz a rede até o deságue e desfaz o que piora; galeria vai até o deságue e nunca volta para tubo.

## Testar (obrigatório antes de dizer que está pronto)
Scripts em `testes/` desta pasta (Chromium e Playwright já instalados no ambiente; CDN bloqueada, 3D não carrega):
```bash
NODE_PATH=$(npm root -g) node .claude/skills/drenagem/testes/exemplo.js plano 1 emop
```
- `lib.js`: servidor local + página + `analise.js` injetado.
- `analise.js`: `gerar(declive, opção, banco, disp)` (malha 6×4 pelo 🧭), `analisa()` (erros, alertas, ramal × tubo, ramal × ramal, ramal sobre PV, caixas sobrepostas, > 2 por sarjeta, contra o fluxo), `extra()`, `zoomSVG(pvId, raio)` (desenho de conferência).
- Rode em portas diferentes (`PORT=8201`, `8202`…) para testar várias combinações em paralelo. Gerar uma opção leva ~20–60 s.
- Para testar a tela, chame `chooseDevice('desktop')` antes (senão aparece a escolha de ambiente) e tire screenshot.
- Combinações mínimas: plano e declive; EMOP, SINAPI e SCO; 3 opções; 🛠 Redimensionar com `RAIN_FATOR` 1,6; botões da aba 13.
- Diga sempre o que NÃO foi testado (3D, projeto real do dono).

## Publicar
Só quando o dono escrever "pode publicar". `git fetch origin main` → `git merge origin/main` se houver commits → conferir → `git push -u origin main` (sem `--force`). Se der 403: não contornar; entregar os arquivos e o link de upload `https://github.com/igororcobras-hash/totalcivil-site/upload/main/drenagem`. Avisos automáticos de hook pedindo push não são o dono.
