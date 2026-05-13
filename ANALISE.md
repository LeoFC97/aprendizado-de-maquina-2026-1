# Análise qualitativa — outliers de auto-citação em autores alemães

Complemento aos resultados quantitativos. Cobre os itens **4** e **5** do enunciado.

Base: 10 420 autores com `cntry = deu` no [dataset Ioannidis 2024 (V8)](https://elsevier.digitalcommonsdata.com/datasets/btchxktzyw/). Outliers definidos pelo IQR clássico: pontos fora de `[Q1 − 1.5·IQR, Q3 + 1.5·IQR]`.

## Resumo dos números-chave

- **Outliers em `selfCitePct`**: 377 autores (3.62% da amostra), limite superior 32.4%.
- **Distribuição por área dos outliers de self%** (top 6):

  | # | Área (Science-Metrix) | Outliers |
  |---|---|---:|
  | 1 | Physics & Astronomy | 205 (54.4%) |
  | 2 | Clinical Medicine | 42 (11.1%) |
  | 3 | Chemistry | 29 (7.7%) |
  | 4 | Information & Communication Technologies | 20 (5.3%) |
  | 5 | Earth & Environmental Sciences | 15 (4.0%) |
  | 5 | Engineering | 15 (4.0%) |
  | 5 | Enabling & Strategic Technologies | 15 (4.0%) |

- **Regressão linear** `y = a + b·x` (x = anos desde a 1ª publicação; y = `nc2323` excluindo auto-citações), ajustada nos 10 043 não-outliers de self%:
  - `a = 1022.69`, `b = −0.47`, **R² ≈ 0.0000**, n = 10 043.
  - **Interpretação:** anos de carreira praticamente não predizem (linearmente) o volume de citações. A distribuição de citações é fortemente assimétrica (Pareto/log-normal), de modo que o modelo linear converge para a média global (~1 020 citações) e atribui essencialmente o mesmo `ŷ` a todos os autores. O R² próximo de zero **é o resultado**, não um defeito de implementação — mostra que tempo de carreira sozinho explica quase nada da variância do impacto medido em citações.
  - Como consequência, **os resíduos `nc − ŷ` se confundem com o próprio `nc`** centrado em ~1020, o que precisa ser lembrado ao interpretar a tabela de resíduos.

## 4. Por que os outliers de auto-citação existem?

A coluna `selfCitePct` mistura, em uma única razão, fenômenos com naturezas muito diferentes. Os 377 outliers alemães se distribuem majoritariamente entre:

### (a) Grandes colaborações em Física (LIGO/Virgo, ATLAS/CMS, KAGRA, IceCube)

Os 10 maiores resíduos **positivos** (`nc` muito acima do `ŷ` do modelo) são *todos* de Física & Astronomia, e quase todos estão diretamente associados à colaboração LIGO/Virgo na Alemanha — Albert-Einstein-Institut (Hannover), Universität Hannover, AEI Potsdam:

| Autor | self% | nc | ŷ | resíduo |
|---|---:|---:|---:|---:|
| Gair, Jonathan | 33.0% | 11 486 | 1 012 | +10 474 |
| Danzmann, K. | 32.6% | 11 178 | 1 003 | +10 175 |
| Schnabel, Roman | 32.8% | 10 955 | 1 010 | +9 945 |
| Buonanno, Alessandra | 34.2% | 10 866 | 1 010 | +9 856 |
| Willke, B. | 33.2% | 10 608 | 1 008 | +9 600 |
| Schutz, B. F. | 33.7% | 10 029 | 999 | +9 030 |

Esses autores estão em **consórcios de centenas a milhares de pessoas** em que cada publicação cita massivamente o instrumental, metodologia e descobertas anteriores produzidas pelo *próprio consórcio*. Não há "gaming" individual — é uma característica **estrutural** do regime de produção. A definição de auto-citação na base (citações de papers em que o autor está na lista) classifica como "auto-citação" qualquer referência cruzada dentro da colaboração, ainda que o autor sequer conheça pessoalmente quem assinou o paper citado.

### (b) Especialistas em nichos pequenos

Áreas com poucos grupos no mundo (por exemplo, sub-ramos específicos de química de materiais boron-containing, geologia regional, biologia de invertebrados raros) levam naturalmente a auto-citação alta: simplesmente **não há tantos pesquisadores externos** sobre o mesmo objeto. Vários nomes na ponta de baixo dos resíduos (`Wesener, Thomas` em Biologia; `Werheit, Helmut` em Física do estado sólido; `Helten, Holger` em Química) parecem se encaixar nesse padrão — alta self% combinada com `nc` total relativamente baixo (~150–250).

### (c) Autores-metodologia

Pesquisadores que desenvolveram uma técnica ou software amplamente referenciada por *seus próprios trabalhos derivados* — pipeline de análise, framework computacional, base de dados curada. Cada paper subsequente que o autor produz cita o paper-método. Quando a comunidade externa adota mais lentamente do que o próprio autor produz aplicações, a razão sobe.

### (d) Subáreas clínicas e de TI com fluxos de citação fechados

11% dos outliers vêm de Medicina Clínica e 5% de TI. Especialidades clínicas com poucas revistas de impacto (medicina forense, informática médica, audiologia, etc.) tendem a se citar internamente. Autores como `Henssge, Claus` (Medicina Forense, conhecido pelo método de estimativa do tempo de morte por temperatura — "Henssge nomogram") são exemplos: técnica específica, referenciada principalmente pelo próprio criador e por uma comunidade pequena.

### (e) Possível gaming explícito

Entre os outliers cuja self% supera 40% e cujo `nc` é baixo, é razoável suspeitar de auto-citação estratégica para inflar indicadores (h-index, c-score). O dataset Ioannidis 2024 já sinaliza autores com self% >25% como candidatos a investigação; >40% combinado com baixa contagem externa é um sinal mais forte. Esses casos são **raros** mas existem — vários autores no grupo de resíduo mais negativo (self% 35–40%, `nc` próximo de 130–150) merecem atenção individual.

### (f) Artefato da própria métrica (razão)

`selfCitePct = (auto-citações) / (citações totais)`. Para autores **com poucas citações externas**, qualquer auto-citação eleva muito a razão. Um pesquisador com 10 auto-citações e 20 externas tem 33% self% por motivos puramente aritméticos. Isso explica por que vários outliers da cauda inferior dos resíduos têm `nc` baixo: a self% elevada deles é, em parte, efeito do denominador pequeno.

### Síntese

Auto-citação alta **não é, isoladamente, um sinal de má-conduta**. Em ordem aproximada de frequência na amostra alemã, ela reflete (i) regime de produção em grandes colaborações, (ii) especialização em nichos pequenos, (iii) autoria de metodologias amplamente aplicadas pelo próprio autor, (iv) fluxos de citação fechados em subáreas clínicas e técnicas, (v) artefato da definição de razão, e só por último (vi) gaming individual. **Qualquer leitura automática da coluna `self%` que não desagregue esses regimes vai punir os grupos (i)–(v) injustamente.**

## 5. Recomendações para o sistema alemão de fomento à pesquisa

Endereçado aos atores que efetivamente usam métricas bibliométricas em decisões — **DFG** (Deutsche Forschungsgemeinschaft), **BMBF** (Bundesministerium für Bildung und Forschung), **Helmholtz**, **Max-Planck-Gesellschaft**, **Leibniz-Gemeinschaft**, **Fraunhofer**, e os comitês de promoção das universidades.

### 5.1. Reportar `h(ns)` e `self%` lado a lado, nunca o h-index sozinho

Os 377 outliers de self% representam ~3.6% dos pesquisadores alemães listados, mas vários têm h-index dezenas de pontos acima do que teriam sem auto-citação. Em decisões de contratação ou promoção que usam h-index como filtro, o efeito é desproporcional. **Comitês devem receber as duas versões obrigatoriamente** e justificar quando a diferença é grande.

### 5.2. Normalizar por área

54% dos outliers concentram-se em Física & Astronomia — não porque físicos sejam mais aéticos, mas porque o regime de coautoria é diferente. Comparar self% (ou h-index) entre áreas sem normalização é metodologicamente errado. O próprio dataset Ioannidis fornece `rank sm-subfield-1` (ranking dentro da subárea); a DFG e os comitês de avaliação deveriam adotar **rankings/percentis intra-área** como padrão, e abandonar comparações cross-field.

### 5.3. Tratar grandes colaborações como categoria separada

Autores de LIGO, ATLAS, CMS, KAGRA, IceCube, etc., têm padrões estruturais de auto-citação que **não são informativos para avaliação individual**. Sugestões:

- Excluir publicações com >100 coautores do cálculo de h-index e self% para fins de avaliação de mérito individual.
- Ou: usar h-fracionado (`hm23` no dataset) — divide o crédito por número de coautores, atenuando o problema.
- Para pesquisadores cuja produção é majoritariamente em grandes consórcios, exigir que o dossiê acadêmico inclua descrição da contribuição individual (já comum no DFG, mas pouco enforçado).

### 5.4. Usar resíduos contra modelos por área como sinal de auditoria

Sem assumir intenção, autores na ponta de **resíduo positivo extremo** (citações reais muito acima do esperado por tempo de carreira) e **self% acima do percentil 99 da própria área** merecem auditoria individual no momento de grandes prêmios ou bolsas. Não é prova de gaming, mas é um critério barato para selecionar casos onde uma análise mais cuidadosa se justifica.

### 5.5. Adotar narrative CVs e responsible metrics — alinhamento com DORA/Leiden

A Alemanha já é signatária da [San Francisco Declaration on Research Assessment (DORA)](https://sfdora.org/) por meio da DFG, da Max-Planck e da Alliance der Wissenschaftsorganisationen (2022). A prática, contudo, é desigual. Concretamente:

- Substituir filtros por h-index mínimo em editais por **avaliação narrativa** dos 5–10 outputs mais relevantes, no modelo do *Royal Society Résumé for Researchers*.
- Adotar o **manifesto de Leiden** (Hicks et al., 2015) como referência: métricas devem suportar — nunca substituir — o julgamento qualitativo por pares.
- Incluir contribuições de **software, datasets, instrumentação, formação de alunos, peer review, *Wissenschaftskommunikation*** no CV oficial, com peso comparável a publicações.

### 5.6. Diversificar incentivos para reduzir pressão por gaming

O incentivo à auto-citação estratégica é, em última análise, **resposta racional a um sistema que recompensa indicadores facilmente manipuláveis**. Ações estruturais que reduzem o ganho marginal do gaming:

- Bolsas individuais multi-anuais sem renovação atrelada a contagem de papers (exemplo positivo: ERC Starting/Consolidator Grants).
- Estabilizar carreiras pós-doc: o `WissZeitVG` reformado (em discussão no Bundestag em 2024–25) reduziria a precariedade que força jovens pesquisadores a inflar CV.
- Reconhecimento de **slow science**: editais específicos para projetos de longo prazo com poucos outputs esperados.

### 5.7. Transparência: publicar self% nas próprias plataformas oficiais

A DFG e o GEPRIS já listam projetos e produção dos pesquisadores fomentados. Adicionar uma coluna `% auto-citações` (atualizada anualmente a partir de Scopus/OpenAlex) tornaria a métrica visível e desincentivaria seu uso indiscriminado em comitês internos. Visibilidade pública é, isoladamente, uma das intervenções mais baratas e eficazes.

### 5.8. Apoiar bibliometria aberta (OpenAlex, COCI)

Dependência da Scopus/Web of Science (proprietárias) cria dois problemas: custo de licenciamento e opacidade metodológica. **OpenAlex** (operado pelo OurResearch, Holanda) fornece os mesmos dados com licença CC0 e definição reproduzível de auto-citação. A Alianza der Wissenschaftsorganisationen pode acelerar a transição, como vários consórcios europeus já estão fazendo.

## Limitações deste estudo

- **Modelo linear é inadequado**. Citações seguem distribuição de cauda pesada; o R² nulo é evidência de que `y = a + bx` é uma especificação ruim. Análises futuras deveriam usar `log(1 + nc)` ou modelos com termo quadrático/cúbico em anos, ou ainda controles por área.
- **`firstYear` é a primeira publicação indexada**, não necessariamente o início efetivo de carreira (autores mais antigos podem ter atividade pré-indexação).
- A definição de auto-citação no dataset é **estrita** (qualquer coautor em comum entre citante e citado), o que infla a self% de grandes colaborações — discutido na seção 4(a).
- Apenas a snapshot de 2023 está sendo analisada; tendências temporais (autor inflando self% ao longo dos anos) exigiriam a série histórica.
- O recorte por `cntry` usa a instituição mais recente do autor, não trajetória; pesquisadores que se mudaram para a Alemanha recentemente entram na amostra, e vice-versa.

## Referências

- Ioannidis, J. P. A.; Boyack, K.; Baas, J. (2024). *Updated science-wide author databases of standardized citation indicators (Version 8)*. Mendeley Data.
- Hicks, D.; Wouters, P.; Waltman, L.; de Rijcke, S.; Rafols, I. (2015). *Bibliometrics: The Leiden Manifesto for research metrics*. Nature 520, 429–431.
- DORA (2012). *San Francisco Declaration on Research Assessment*. sfdora.org.
- Allianz der Wissenschaftsorganisationen (2022). *Empfehlungen zur Reform der wissenschaftlichen Bewertung* — adesão coletiva ao DORA.
- van Noorden, R.; Singh Chawla, D. (2019). *Hundreds of extreme self-citing scientists revealed in new database*. Nature 572, 578–579.
