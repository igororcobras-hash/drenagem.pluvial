# Drenagem Pluvial — guia dos cálculos do programa

Programa: `index.html` deste repositório (Drenagem Pluvial 2; publicado em `totalcivil-site/drenagem2/index.html`) (arquivo único, ~12 mil linhas, sem build).
Este guia descreve **o que o programa calcula, com quais fórmulas, critérios e funções**.
Os números de linha mudam, então procure pelo nome da função (`grep -n "^function calc()"`).

---

## 1. Dados do projeto (`P`)

| Campo | O que é |
|---|---|
| `P.crit` | critérios de projeto (`defaultCrit()`), ver §2 |
| `P.idf` | equação de chuva `a, b, c, d` (padrão Rio de Janeiro – Jardim Botânico: 1239 · TR^0,15 / (tc + 20)^0,74) |
| `P.ruas` | ruas: largura `larg`, passeio, caimento transversal `it` (%), caimento `cai` (dois lados / E / D), meio-fio `mfH`, sarjeta `sjW`/`sjI`, referência `ref` |
| `P.estacas` | estacas por rua: `dist` (m), `cota` (greide), `tn` (terreno), muros `muE/muD` |
| `P.bacias` | área `A` (ha), `C`, `tc` ou Kirpich (`kL`, `kH`), destino `dest` (BL ou PV) |
| `P.bls` | caixas de ralo / bocas de lobo: rua, `dist`, `lado`, `tipo` (gs, gd, gr, cb), `L`, `gL`, `gB`, `a` (rebaixo), `prox` (BL a jusante do excedente), ramal `pv`, `rD`, `rI`, `rL`, `ang` |
| `P.pvs` | poços de visita: rua, `dist`, `tampa` (vazio = greide), `defl` (ini, reta, d45, d90, T, X), `na` (NA do receptor no deságue) |
| `P.trechos` | rede tronco: `m` (PV montante), `j` (PV jusante), `L`, `D` (mm) ou galeria (`sec:'gal'`, `galN`, `galB`, `galH`), cotas de fundo `cm`/`cj`, `iFix`, `recDes`, `prot` |
| `P.custos.banco` | `emop` / `sinapi` / `sco` — define preços E os **modelos de PV** (`PV_CAT`) |

Estaca: `n+xx,xx` = n × 20 m + xx (`parseEst`, `estLabel`).

## 2. Critérios (padrões de `defaultCrit()`)

| Critério | Padrão | Uso |
|---|---|---|
| `tr` | 10 anos | período de retorno |
| `nTubo` / `nSarj` | 0,013 / 0,016 | Manning do tubo / sarjeta |
| `vmin` / `vmax` | 0,60 / 5,00 m/s | velocidade na rede e ramais |
| `yD` | 0,75 | lâmina máxima y/D (DNIT); DR-15d reduz para ventilação (Vc, Froude 0,86–1,13, colchão `folgaAr` 0,10 m) |
| `tauMin` | 1,0 Pa | tensão trativa mínima (autolimpeza) |
| `imin` | 0,50 % | declividade mínima da rede e da sarjeta |
| `recob` | 1,00 m | recobrimento mínimo; abaixo dele: PA-2 (0,80), laje (0,50), envelopado (0,30) — `protTrecho` |
| `dmin` | 400 mm | Ø mínimo da rede |
| `profMaxPV` | 4,00 m | PV mais fundo gera alerta |
| `folgaPV` | 0,30 m | folga mínima piezométrica × tampa |
| `tcMin` | 5 min | tempo de concentração mínimo |
| `ymax` / `Tmax` | 0,13 m / 2,50 m | lâmina junto à guia / largura alagada |
| `Cw` / `Co` | 1,66 / 2,91 | vertedor / orifício (engolimento) |
| `ramalDmin` / `ramalLmax` / `ramalImin` | 400 mm / 15 m / 1,0 % | ramal caixa → PV |
| `K` | reta 0,15 · 45° 0,40 · 90° 0,70 · T 0,75 · X 1,25 · início 0,50 | perda no PV hf = K·V²/2g |
| `dz` | reta 0,05 · 45° 0,10 · 90° 0,15 · T 0,15 · X 0,15 | degrau mínimo no PV (m) |
| `pvGrande` (DR-22) | `colado` | PV maior que a tabela da base: 2 PVs colados ou `especial` |

Diâmetros comerciais (`DIAMS`): 300, 400, 500, 600, 700, 800, 900, 1000, 1200, 1500, 2000.
Galerias (`GAL_PAD`, B × H em m): 1,00×1,00 até 3,00×3,00, de 1 a 4 células; parede `galEspPad`.

## 3. Motor de cálculo — `calc()` (resultado em `R`)

Ordem fixa, de montante para jusante. `calc()` é embrulhada por vários PATCHs (alas, piezométrica DR-16, memo DR-18, conflitos DR-20) — o resultado final sempre fica em `R`.

### 3.1 Chuva e bacias
- Intensidade: `i = RAIN_FATOR · a · TR^b / (tc + c)^d` (mm/h) — `idf(tc, tr)`. `RAIN_FATOR` é a chuva aumentada do 3D (1 = chuva de projeto).
- Kirpich: `tc = 57 · (L³/H)^0,385` (L em km, H em m) — `kirpich`; `tc ≥ tcMin` — `baciaTc`.
- **Método racional**: `Q = C · A · i / 360` (m³/s; A em ha, i em mm/h) — `R.bac[id]`.
- Verifica: 0 < C ≤ 1, A > 0, destino existente.

### 3.2 Sarjeta e caixas (bocas de lobo) — `R.bl[id]`
- Ordem: `ordemBLs()` (montantes primeiro, pelo encadeamento `prox`; ciclo = erro).
- Vazão afluente: bacias da caixa + excedente (`CAbyp`) das caixas a montante; `tc` = maior; `Qafl = CA · i / 360`.
- Declividade da sarjeta do próprio lado: `sarjDeclLado` (topografia) ou `bl.S` digitado.
- Geometria (`geomSarjeta`): triangular (pista `it`) ou composta (sarjeta `sjW` a `sjI` + pista); `ymax = min(crit.ymax, mfH − 0,02)`.
- **Izzard**: `Q = 0,375 · (1/n) · Sx^(5/3) · S^½ · T^(8/3)`; composta pelo método do Eo (`sarjQT`); T por bisseção (`sarjT`); lâmina `y` (`sarjY`).
- Capacidade admissível: `Qadm = F · Qsarj(ymax)` com F do DAEE/CETESB pela declividade (`FSARJ`: 0,50 a 0,4 %, 0,80 de 1 a 3 %, cai até 0,20 a 10 %).
- **Engolimento** (`blCapacidade`): guia = vertedor `Cw · L · (y + a)^1,5`; grelha = vertedor no perímetro `Cw · (L + 2B) · h^1,5` até h = 0,12 m, orifício `Co · Aútil · h^½` a partir de 0,42 m, interpolado entre eles; combinada = soma. Multiplicado pelo fator de eficiência `fr` do tipo (`BLTIPOS`: guia 0,80; grelha 0,50; combinada 0,65).
- `Qeng = min(Qafl, Qcap)`; o resto (`Qbyp`) segue para `prox` (sem `prox` = erro).
- Ramal: Manning em seção parcial (`partFlow`) com `rD`, `rI`.
- Verificações: declividade ≥ imin (alerta), lâmina ≤ ymax (erro), T ≤ Tmax (alerta), Qafl ≤ Qadm (erro), excedente, PV de destino, ramal Ø/compr./decl./V/y/D.

### 3.3 Rede tronco — `R.tr[id]`
- Ordem topológica `ordemTrechos()` (ciclo = erro).
- CA acumulado: contribuição local do PV de montante (caixas `CAeng` + bacias ligadas ao PV) + contribuição lateral do trecho (`aL · cL`) + trechos que chegam.
- `tc` = maior entre os afluentes de `tc + tempo de percurso` (`tt = L / V / 60`).
- `Q = CA · i(tc) / 360`; declividade `S = (cm − cj) / L`.
- Hidráulica: tubo circular parcialmente cheio (`partFlow`: bisseção do ângulo central, Manning `Q = A · Rh^(2/3) · S^½ / n`; vazão máxima em y/D ≈ 0,938; acima disso = em carga) ou galeria (`rectFlow`: A = N·B·y, P = N·(B + 2y)). Froude `Fr = V / √(g · A/B)`.
- Tensão trativa `τ = γ · Rh · S`.
- Recobrimento = tampa − (fundo + D + parede); proteção por `protTrecho`.
- Verificações: extensão, PVs, cotas, declividade, Ø ≥ dmin, y/D ≤ 0,75 (erro), V (baixa = alerta, alta = erro), τ ≥ τmín (alerta), Froude na galeria, recobrimento, **Ø nunca diminui para jusante** (área para galerias).

### 3.4 Poços de visita — `R.pv[id]`
- Fundo = menor cota de tubo ligado; profundidade = tampa − fundo.
- Perda: `hf = K · Vsaída² / 2g`.
- Degrau necessário = max(`dz` da deflexão, `hf + y_saída − y_entrada`); alinhamento da geratriz superior (coroa da saída ≤ coroa da entrada).
- PV sem saída e com entrada = **deságue** (`R.outlets`); mais de 1 saída = erro; ≥ 2 entradas exige T ou X.
- Câmara: `emopMedidas` (PV quadrado, tabela da base `PV_CAT[pvBancoCat()]`: EMOP até 2,00 m, SCO até 2,50 m, SINAPI até 4,00 m) ou `pvCircMedidas` (redondo); pescoço `pvEmopChamMin` 0,50 m; câmara mínima `pvEmopHmin` 1,40 m.
- Profundidade > `profMaxPV` = alerta.

### 3.5 Linha piezométrica (de jusante para montante)
- Começa no deságue com max(fundo + lâmina, NA do receptor).
- Em cada trecho: se o nível passa da coroa ou o tubo está em carga, soma a perda `Sf · L` (Sf a seção plena) e a perda no PV.
- DR-16 (`piez16`) substitui: no remanso a perda no PV usa a velocidade REAL `Q/A` da lâmina.
- Folga = tampa − nível; < 0 = EXTRAVASAMENTO (erro); < folgaPV = alerta.
- Saída abaixo do NA: erro, ou alerta “Saída afogada no deságue” se a piezométrica a partir do NA não chega às tampas e às grelhas (DR-16).

### 3.6 Quantitativos e custo
- Tubos por Ø, galerias, escavação (vala `De + 2·valaFolga`, do terreno natural ao fundo + parede + berço), berço, reaterro, ramais, caixas, PVs.
- `custoRede()` = preços da aba 12 (SINAPI/SCO/EMOP); `pontuacao()` = {erros, alertas, custo} usado por todas as correções.
- Orçamento de licitação: `itensLic(sol, banco)` / `orcLic` (3 soluções).

## 4. Rotinas automáticas (quem chama quem)

| Rotina | O que faz |
|---|---|
| `autoCotas(true)` | cotas de fundo de montante para jusante: recobrimento mínimo, degrau ≥ perda, i entre i mín./τ mín. e o da V máx.; modo rede rasa `crit.cotasRaso`; PV com câmara mínima `crit.pvProfAuto` |
| `autoDimensionar()` | `redimTrecho`/`escolheD`: menor Ø com y/D ≤ 0,75 (sem carga); se nenhum tubo atende → galeria (`escolheGal`) |
| `autoCorrigir()` | correção completa da aba 7 (deflexões, caixas, ramais, sarjetas, declividade × troca de tubo: aprofunda até 1/3 do Ø, depois troca); embrulhada por DR-18 (`dedup18`) e DR-20 (`revisa20`) |
| `T3diamPrimeiro()` | aumenta Ø/aduela antes de aprofundar (🛠 Redimensionar do 3D) |
| `T3diamReduz()` | reduz Ø com folga demais |
| `T3sarjCorrige()` | rua alagando → caixa a montante (`addBLMontante`) |
| `gerProjeto(op)` | 🧭 gera a rede pela topografia (3 opções `GER_OP`: mínima, recomendada, folgada) → `gerEng16` (testa greide × rasa × saída levantada) → `pvPadrao18` (PV colado/especial) → `revisa20` |
| `corr21('err'/'warn')` | botões da aba 13: correção da rede inteira até o deságue, passo a passo, desfaz o que piora |
| `prof23()` (DR-23, em andamento) | compara Ø maior × galeria para PVs acima de 3 m |

Regra de ouro das correções: **toda mudança refaz a rede inteira até o deságue** (`propaga21`: `autoCotas` 2×, Ø não diminui a jusante, remanso `gerRemanso16`, saída afogada `gerLevanta16`) e **é desfeita se aumentar os erros**.

## 5. Geometria (planta, 3D, DXF)
- `geoRuas()`: eixo de cada rua (`g.at(s, off)`, `g.loc(ponto)` → {s, off}); ruas posicionadas por referência (`ref`, estaca e ângulo).
- `posPV`, `posBL` (caixa na sarjeta, `blOff`), `angRamal` (ângulo do ramal com o fluxo; > 90° = contra o fluxo), `ramalLGeo`.
- `cruzamentos(G)`: raios de meio-fio e muros nas esquinas.
- Conflitos DR-20 (`conflitos20`): ramal cruzando tubo/ramal, ramal sobre PV (< 1,3 m), caixas sobrepostas, > 2 caixas da mesma sarjeta no PV.

## 6. Decisões do dono que valem como regra
- Toda opção do 🧭 tem de sair **sem erros**.
- PV no **tamanho padrão da base** escolhida (EMOP/SINAPI/SCO); se não couber, **2 PVs colados** (preferência, porque têm custo na base); PV especial só se o usuário escolher.
- Cada PV recebe no máximo 1 caixa por sarjeta e sentido, ou 2 **lado a lado** (30 cm entre os corpos).
- Ramal sempre a favor do fluxo, ideal 45°, sem cruzar rede.
- PVs ao longo da rua a 30–50 m (mais perto só com muita inclinação ou para atender ramais).
- Não corrigir sozinho ao mexer na chuva do 3D: só alerta; corrige no 🛠 Redimensionar.
- O programa não aprofunda sozinho em casos de decisão (PV raso de cabeceira, PV > 4 m, ramal > 15 m), salvo nos botões de correção.
- **Galeria vai até o deságue e nunca volta para tubo**; em confluência de ruas grandes que pede tubo muito maior e mais fundo, considerar galeria automaticamente (pedido de 12/11/2026, ainda não implementado — ver DR-23).

## 7. Pendências conhecidas
- “Velocidade no lançamento” ~4,96 m/s no exemplo com declive: falta bacia de dissipação dimensionada e orçada.
- PVs com tubo Ø2000 não têm modelo EMOP (Ø máx. 1,50).
- Tabelas EMOP de PV só até 2,00 × 2,00 m (EMOP completa só no navegador do dono).
- Com chuva muito aumentada no 3D (2× ou mais) o 🛠 ainda deixa erros (capacidade/profundidade).

---

## 8. Conhecimento do engenheiro especialista (pesquisa de 12/11/2026)

Legenda: **[F]** confirmado em fonte encontrada na pesquisa · **[P]** prática corrente brasileira (DAEE/CETESB 1980, Azevedo Netto, Tucci) — conferir na norma do órgão antes de mudar o programa.
A sessão não abriu os PDFs (rede bloqueada para `fundacaorioaguas.prefeitura.rio` e `antigo.mdr.gov.br`); os valores [F] vêm dos trechos dos documentos.

### 8.1 Normas e manuais de referência
| Documento | Para quê |
|---|---|
| Rio-Águas — *Instruções Técnicas para Estudos Hidrológicos e Dimensionamento Hidráulico de Sistemas de Drenagem Urbana*, 2ª versão (jul/2019), Portaria O/SUB-Rio-Águas “N” 004/2010 [F] | referência do estado do RJ: rugosidade, velocidades admissíveis, profundidade e dimensões mínimas, galerias (§3.1–3.2), tempo de concentração inicial (Tabela 2) |
| Rio-Águas — *Recomendações técnicas para execução de obras de drenagem urbana* (2023) [F] | execução |
| Decreto Rio 52.962/2023; Portarias Rio-Águas 001/2022, 003/2023 [F] | podem ter atualizado a IT de 2019 — conferir |
| Ministério do Desenvolvimento Regional — *Manual de Drenagem Urbana* (2020) [F] | referência nacional |
| DNIT — *Manual de Drenagem de Rodovias* (IPR 724/2006) e *Álbum de Projetos-Tipo* (2018) [F] | dispositivos, sarjetas, bocas de lobo |
| DNIT 022/2023-ES — dissipadores de energia [F] | saída de bueiros, galerias e descidas d’água |
| DNIT ES 025/04 — bueiros celulares; ABNT NBR 15396 — aduelas pré-moldadas [F] | galerias de aduelas |
| ABNT NBR 8890 (2020) — tubos de concreto; NBR 15645 — execução com tubos e aduelas [F] | classes de tubo (PA-1 a PA-4) × altura de aterro; instalação |
| FHWA HEC-22, 3ª ed. (FHWA-NHI-10-009) [F] | método americano de sarjeta, bocas de lobo, espaçamento e perdas em PV (Cap. 4, 6 e 7) |
| DAEE/CETESB — *Drenagem Urbana — Manual de Projeto* (1980); PMSP DP-H (série) [F, só o índice] | fatores de redução, espaçamentos |

### 8.2 Critérios encontrados × o programa
| Critério | Fonte | Programa hoje |
|---|---|---|
| tc adotado ≥ 5 min | Rio-Águas IT [F] | `tcMin` = 5 ✔ |
| Microdrenagem: TR 10 anos, chuva de projeto com duração = tc | Campinas [F] | `tr` = 10 ✔ |
| Método racional só até 2 km²; acima, hidrograma (SCS) | Campinas [F] | ✘ não avisa — **sugestão:** alerta quando a área acumulada > 200 ha |
| C da bacia = média ponderada das áreas | Rio-Águas IT [F] | C por bacia (usuário) ✔ |
| Lâmina máxima na sarjeta 13 cm (Izzard) | Jundiaí [F] | `ymax` = 0,13 ✔ |
| Velocidade na sarjeta ≤ 3,0 m/s (pavimento) | Jundiaí [F] | ✘ não verifica — **sugestão:** verificação “Velocidade na sarjeta” |
| BL de guia: fator 0,80 (redução de 20 %) | CETESB/1980 via Azevedo Netto [F] | `BLTIPOS.gs.fr` = 0,80 ✔ |
| Guia simples recomendada até 5 % de declividade | DAEE 1980 [F] | ✘ — **sugestão:** acima de 5 % preferir grelha/combinada |
| Boca de lobo com grelha + guia + depressão = maior eficiência; guia simples = menor | estudo greide contínuo [F] | rebaixo `a` existe ✔ |
| A fórmula de abertura na guia do HEC-22 SUBESTIMA o comprimento para captação total (mais excedente) | FHWA TechNote HRT-22-061 [F] | usa vertedor DAEE (não HEC-22) — manter fator de eficiência |
| PV em mudança de direção, confluência importante e trechos longos; poço de queda para controlar a declividade | DER-PR [F] | ✔ (deflexões, X/T); queda: parcial |
| Distância máxima entre PVs ~80 m (até 90 m em Ø maior) | São José dos Campos [F] | gerador 60–100 m por opção; dono: 30–50 m |
| Velocidade 0,75 a 5,0 m/s (galerias) | UFV [F] (Rio-Águas não confirmado) | 0,60 a 5,00 — **conferir** na IT Rio-Águas §3.1.2 |
| Bueiros: 0,75 a 4,50 m/s, recobrimento ≥ 1,0 m | Infra S.A. [F] | recob. 1,00 ✔ |
| Canal revestido em concreto: V ≤ 4,0 m/s | DAEE IT DPO 11/17 [F] | (canais fora do escopo) |
| K do PV não tem valor consagrado; muda o resultado do remanso | ABRH SBRH 2025 [F] | `K` editável ✔ (deixar claro no memorial) |
| Classe do tubo compatível com a altura de aterro (NBR 8890 / álbum DNIT) | [F] | proteção por recobrimento ✔; ✘ não escolhe classe pelo aterro alto — **sugestão** |
| Saída de galeria: dissipador para reduzir a velocidade e a erosão; saída no nível do terreno, sem escavação excessiva | DNIT 022/2023 [F] | ✘ só alerta “Velocidade no lançamento” — **sugestão:** dimensionar bacia de dissipação (ressalto) e orçar |
| Bacia de dissipação mal dimensionada (ressalto fora da bacia) deixa V residual ~12 m/s | UERJ [F] | — |
| Aterro alto: berço em enrocamento em solo fraco; declividade > 5 % = berço com dentes | DNIT / DER [F] | ✘ — nota no memorial |

### 8.3 Boas práticas de projeto [P] (aplicadas ou a aplicar)
- Diâmetro (ou área) nunca diminui para jusante; coroa alinhada (geratriz superior) nas mudanças de Ø ✔.
- Degrau no PV ≥ perda de carga; queda grande (> ~0,6 a 1,0 m) pede **PV de queda** (tubo de queda) — conferir limite no manual adotado.
- Captações a montante das faixas de pedestre e fora da curva da esquina ✔ (PMSP DP-H07).
- **Galeria em vez de tubo** quando: o Ø pedido passa de ~1,2–1,5 m, o recobrimento não permite tubo maior, ou a confluência de duas redes grandes afundaria muito o trecho tronco. A galeria é mais larga e mais baixa: rede mais rasa, mas mais cara por metro e com PV/caixa especial. **Regra do dono:** depois que começa, a galeria segue até o deságue e não volta para tubo.
- Rede rasa no início (cabeceiras) e profundidade crescendo para jusante; PV > 3–4 m pede escoramento, escada e PV especial.
- Lançamento: verificar NA do receptor (remanso), velocidade de saída e proteção contra erosão (dissipador, enrocamento); válvula flap se a saída ficar afogada ✔ (alerta).
- Folga entre a linha piezométrica e a tampa ≥ 0,30 m ✔; y/D ≤ 0,75–0,85 para ventilação ✔ (DR-15d).
- Memorial: citar TR, IDF (fonte), C, tc, n de Manning, K e os critérios adotados ✔ (aba 14).

### 8.4 Melhorias sugeridas para o programa (por prioridade)
1. Galeria automática na confluência e **até o deságue** (pedido do dono; DR-23 em andamento).
2. Bacia de dissipação no lançamento (DNIT 022/2023): dimensionar pelo ressalto hidráulico e orçar.
3. Verificação “Velocidade na sarjeta ≤ 3 m/s”.
4. Aviso de método racional com área acumulada > 2 km².
5. Classe do tubo (PA-1 a PA-4) pela altura de aterro (NBR 8890), não só pelo recobrimento mínimo.
6. PV de queda quando o degrau passar do limite adotado.
7. Conferir na IT Rio-Águas (§3.1.2–3.1.4, Tabela 2) e ajustar os padrões `vmin`, `recob`, `dmin` e o tc inicial.
