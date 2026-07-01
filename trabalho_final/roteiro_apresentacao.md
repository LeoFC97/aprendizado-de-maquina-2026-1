# Roteiro da Apresentação Final — 02/07/2026

**Trabalho:** Previsão de adesão a depósito a prazo (Bank Marketing UCI, versão individualizada)
**Aluno:** Leonardo Fernandes Costa
**Modelo:** Árvore de Decisão (`max_depth=5`, `class_weight='balanced'`, `random_state=42`)

---

## Dicas gerais (ler antes de começar)

- **Tempo total: 10 minutos.** Ensaiar pelo menos uma vez com cronômetro. Se estourar, cortar detalhes da EDA (seção 2), nunca a interpretação nem a sensibilidade — são o coração da história.
- **Três mensagens-chave** que precisam ficar claras, aconteça o que acontecer:
  1. A adesão depende do **momento macroeconômico** (a árvore é dominada por `nr.employed`).
  2. A árvore é **robusta a outliers** (3 cenários, métricas praticamente idênticas).
  3. **Acurácia é enganosa** em dados desbalanceados (sem peso: acurácia sobe para **0,898**, mas o recall despenca para **0,216**).
- Ao falar da matriz de confusão, **apontar para as células na tela** enquanto cita os números — não falar de costas para o slide nem de cabeça baixa.
- Falar os números em português: "zero vírgula oitocentos e quarenta e cinco", ou "84,5%".
- Rolar o notebook com calma; deixar cada figura visível por alguns segundos antes de falar sobre ela.
- Se o tempo apertar no final, pular direto para a matriz de confusão da sensibilidade ao desbalanceamento e a conclusão de negócio.

---

## 1. Introdução — problema de negócio [1 min]

**Mostrar:** Célula de abertura da Seção 1 (título + descrição do problema) e o `df.head()` / shape do dataset.

**Falar:**
"Bom dia. Meu trabalho usa o dataset Bank Marketing da UCI, na versão individualizada que o professor gerou para mim: **41.188 linhas e 19 colunas**, separadas por ponto e vírgula, **sem as colunas `contact` e `campaign`**. O problema de negócio é de um banco português que faz campanhas de telemarketing oferecendo depósito a prazo, e quer prever quais clientes vão aderir. O desafio central é que o alvo é muito desbalanceado: só **11,3%** dos clientes dizem 'yes' — são **4.640** adesões contra **36.548** recusas. Escolhi uma Árvore de Decisão porque, além de classificar, ela me dá regras interpretáveis que o banco pode usar na prática."

---

## 2. Exploração de Dados (EDA) [2 min]

**Mostrar:** Em sequência rápida: (a) gráfico de distribuição do alvo; (b) tabela de `unknowns` por coluna; (c) boxplots/tabela de outliers via IQR; (d) gráficos de taxa de adesão por `poutcome`, mês e profissão + prints da adesão com/sem contato prévio; (e) tabela de indicadores macro por classe.

**Falar:**
"Na exploração, quatro achados importantes. Primeiro, os valores 'unknown': a coluna `default` tem **8.597** unknowns, seguida de `education` com **1.731** — e vou mostrar depois que decidi mantê-los como categoria. Também encontrei **22 linhas duplicadas**, que removi. Segundo, outliers via IQR: em `age`, **469 clientes acima de 69,5 anos** (1,14% da base, com máximo de 98 anos); e `previous` tem um IQR degenerado — Q1 e Q3 são ambos zero — então tecnicamente 13,66% seriam 'outliers', o que mostra o limite da regra do IQR. Além disso, `pdays` igual a 999 não é outlier: é um valor sentinela que significa 'nunca foi contatado antes' e cobre **96,3%** da base — por isso criei a flag `contato_previo`. Terceiro, as taxas de adesão variam muito: quem teve sucesso em campanha anterior adere **65,1%** das vezes contra **8,8%** de quem nunca foi contatado; quem teve contato prévio adere **63,8%** contra **9,3%** sem contato; março tem **50,5%** de adesão contra **6,4%** em maio; estudantes aderem **31,4%** e aposentados **25,2%**. E quarto, o que antecipou a história do trabalho: os indicadores macroeconômicos são bem diferentes entre as classes — a euribor média é **2,123** para quem adere contra **3,811** para quem não adere."

---

## 3. Pré-processamento [1,5 min]

**Mostrar:** Células da Seção 3: remoção de `duration`, tratamento de unknown, criação da flag `contato_previo`, one-hot e split.

**Falar:**
"No pré-processamento, a decisão mais importante foi **remover a coluna `duration`** — a duração da ligação. Ela só é conhecida depois que a ligação acontece, então usá-la para decidir quem ligar seria **data leakage**: o modelo pareceria ótimo no papel e seria inútil na prática. Removi também as **22 duplicatas**, ficando com **41.166 linhas**. Os 'unknowns' eu mantive como categoria própria, porque eles carregam informação: por exemplo, clientes com `default` unknown aderem só **5,2%** das vezes, contra **12,9%** dos com `default` 'no' — o próprio desconhecimento é um sinal. Criei a flag binária `contato_previo` a partir do sentinela `pdays != 999`, apliquei one-hot encoding nas 9 categóricas, chegando a **51 features**, e fiz o split **75/25 estratificado**: **30.874** linhas de treino e **10.292** de teste, preservando os 11,3% de 'yes' nos dois conjuntos."

---

## 4. Modelo e métricas [2,5 min]

**Mostrar:** (a) saída impressa da validação cruzada por `max_depth` (Seção 4.1); (b) métricas no teste; (c) **matriz de confusão** (parar nela e apontar as células); (d) curvas ROC e Precision-Recall.

**Falar:**
"Para escolher a profundidade, usei validação cruzada otimizando o F1: profundidade 3 deu **0,4551**, profundidade 4 deu **0,4569** e profundidade 5 deu **0,4580** — escolhi **5**, mas notem que a diferença é pequena, o que já sugere que o sinal principal é capturado logo nos primeiros splits. Usei `class_weight='balanced'` para compensar o desbalanceamento. No teste, o modelo alcançou acurácia de **0,845**, precisão de **0,385**, recall de **0,626**, F1 de **0,477** e ROC-AUC de **0,789**.

[Apontando para a matriz de confusão:] Aqui está o que importa: dos **1.160** clientes que de fato aderiram no teste, o modelo acertou **726** — esse é o recall de 62,6% — e deixou escapar **434**. Do outro lado, ele apontou **1.159** falsos positivos: clientes que receberiam ligação sem aderir. Para telemarketing esse é um erro barato — o custo é uma ligação — enquanto perder um cliente que aderiria é caro. Por isso aceitei sacrificar precisão para ganhar recall.

Um ponto crucial: a acurácia de 0,845 é **menor** que a baseline de sempre prever 'não', que acerta **0,887**. Isso não é um defeito — é a prova de que acurácia sozinha não serve para avaliar este problema; volto nisso na análise de sensibilidade."

---

## 5. Interpretação da árvore [1,5 min]

**Mostrar:** Visualização da árvore (zoom na raiz e nos dois primeiros níveis) e o gráfico de importâncias das features.

**Falar:**
"Aqui está o resultado mais interessante do trabalho. A raiz da árvore é **`nr.employed <= 5087,65`** — o número de pessoas empregadas na economia portuguesa, um indicador trimestral. A árvore tem **61 nós e 31 folhas**, mas quem manda é a macroeconomia: `nr.employed` sozinha concentra **0,7072** da importância total, seguida de `cons.conf.idx` com **0,1433**, `cons.price.idx` e `euribor3m` — ou seja, as **quatro primeiras features são todas macroeconômicas**, somando ~92% da importância. A leitura de negócio é direta: a adesão a depósito a prazo depende menos do perfil individual do cliente e mais do **momento da economia**. Os dados cobrem a crise financeira de 2008 a 2010 em Portugal: quando o emprego caía e a euribor despencava, os bancos precisavam captar depósitos, intensificavam campanhas, e clientes buscavam segurança — e a árvore capturou exatamente esse regime. Só depois da macroeconomia aparecem atributos do cliente, como `contato_previo` com **0,0184** e `default_unknown` com **0,0124**."

---

## 6. Sensibilidade + 7. Conclusões [1,5 min]

**Mostrar:** (a) tabela comparativa dos 3 cenários de outliers; (b) tabela comparativa do desbalanceamento (destacar a linha 'sem peso'); (c) célula final de conclusões/aplicação de negócio.

**Falar:**
"Na análise de sensibilidade testei duas coisas. Primeiro, **outliers de idade**: comparei o modelo original com winsorização e com remoção das 344 linhas acima de 69,5 anos no treino — as métricas ficaram praticamente idênticas: F1 de **0,477** nos três cenários. A árvore particiona por limiares ordenados, não por distância, então é naturalmente **robusta a outliers**. Segundo, **desbalanceamento**: sem `class_weight`, a acurácia sobe para **0,898** — acima até da baseline de 0,887 — mas o recall despenca de **0,626** para **0,216**: o modelo encontraria só 250 dos 1.160 aderentes. É a demonstração perfeita de que acurácia é enganosa em dados desbalanceados. O undersampling deu resultado similar ao `balanced` (recall **0,626**, F1 **0,465**), mas jogando fora dados de treino.

Fechando com a aplicação de negócio: com este modelo, o banco ligaria para cerca de **18% da base** e capturaria cerca de **63% dos aderentes**; a precisão de **38,5%** contra a taxa base de **11,3%** significa um **lift de aproximadamente 3,4x** por ligação. Como próximos passos, testaria ensembles como Random Forest e Gradient Boosting, ajuste do limiar de decisão por custo e validação temporal, já que as variáveis dominantes são macroeconômicas e mudam de regime. Obrigado."

**Lembrete final obrigatório:** citar a nota de **artificialidades pedagógicas** — algumas escolhas do trabalho (modelo único de árvore rasa, dataset individualizado pelo professor, remoções guiadas pelo enunciado) foram feitas por exigência didática da disciplina, e num projeto real seriam comparadas com alternativas.

---

## Perguntas prováveis do professor (com respostas curtas)

**1. Por que você removeu a coluna `duration`?**
Porque é data leakage: a duração da ligação só é conhecida *depois* que a ligação acontece. O objetivo é decidir *quem ligar antes* da ligação. Mantê-la inflaria as métricas artificialmente e tornaria o modelo inútil em produção.

**2. Por que usar `class_weight='balanced'`?**
Porque só 11,3% da base é 'yes'. Sem o peso, a árvore otimiza acurácia global e praticamente ignora a classe minoritária: o recall cai de **0,626** para **0,216**. O `balanced` repondera os erros na proporção inversa das classes, priorizando encontrar os aderentes — que é o objetivo de negócio.

**3. Por que `max_depth=5` e não uma árvore mais funda?**
A validação cruzada mostrou ganho marginal: F1 de **0,4551** (d=3), **0,4569** (d=4) e **0,4580** (d=5). Profundidades maiores aumentam o risco de overfitting e destroem a interpretabilidade, que é justamente a vantagem da árvore. Com d=5 a árvore tem 61 nós e ainda cabe num slide.

**4. Sua acurácia (0,845) é menor que a baseline (0,887). O modelo é ruim?**
Não — isso prova que acurácia não é a métrica certa aqui. A baseline de sempre prever 'não' acerta **0,887** mas tem recall **zero**: não encontra nenhum aderente. Meu modelo troca 4 pontos de acurácia por recall de **0,626** e lift de ~3,4x nas ligações. Em problemas desbalanceados, olho F1, recall e ROC-AUC (**0,789**).

**5. Por que a árvore é robusta a outliers?**
Porque os splits são limiares sobre a *ordenação* dos valores, não sobre distâncias ou médias. Um cliente com 98 anos cai do mesmo lado do split que um de 75. Verifiquei empiricamente: original, winsorização e remoção deram F1 idêntico de **0,477**.

**6. O que é `nr.employed` e por que ela domina a árvore?**
É o número de pessoas empregadas na economia portuguesa (indicador trimestral, em milhares). Ela domina (**0,7072** de importância) porque os dados cobrem a crise financeira de 2008–2010 em Portugal: com a euribor caindo (média de **2,123** entre aderentes vs **3,811** entre não aderentes) e o emprego baixo, bancos intensificavam captação e clientes buscavam segurança em depósitos. `nr.employed` funciona como um marcador do regime econômico do período.

**7. Por que manter 'unknown' como categoria em vez de imputar ou remover?**
Porque o 'unknown' é informativo: clientes com `default` unknown aderem **5,2%** contra **12,9%** dos 'no' — provavelmente reflete quem evita informar a situação de crédito. Tanto que `default_unknown` aparece na própria árvore, com importância **0,0124**. Imputar pela moda apagaria esse sinal; remover descartaria 8.597 linhas.

**8. Houve overfitting?**
Não. Treino e teste ficaram praticamente iguais: F1 de **0,464** no treino contra **0,477** no teste, ROC-AUC de **0,783** contra **0,789**. A profundidade limitada a 5 age como regularização — a árvore generaliza bem.

**9. Por que seus números diferem das saídas de referência do template?**
Porque meu dataset foi individualizado pelo professor: são 41.188 linhas e 19 colunas, **sem `contact` e `campaign`**. Com features e amostras diferentes, splits, importâncias e métricas mudam. Todos os meus números vêm da execução do meu notebook sobre o meu arquivo.

**10. Por que não usou undersampling em vez de `class_weight`?**
Testei: o undersampling deu recall igual (**0,626**) e F1 levemente pior (**0,465** vs **0,477**), mas reduzindo o treino de 30.874 para **6.956** linhas — joga fora 77% dos dados. O `class_weight` alcança o mesmo efeito sem descartar informação.

---

## Fechamento

Encerrar agradecendo e **lembrando explicitamente da nota de artificialidades pedagógicas**: este trabalho segue restrições didáticas da disciplina (um único modelo de árvore rasa, dataset individualizado, decisões guiadas pelo enunciado). Em um projeto real, o passo seguinte seria comparar com modelos de ensemble, calibrar o limiar de decisão pelo custo real de cada ligação e validar temporalmente, dado que as variáveis dominantes são macroeconômicas.
