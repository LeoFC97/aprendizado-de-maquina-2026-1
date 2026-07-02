# Roteiro da Apresentação — 02/07/2026

**Trabalho:** Previsão de adesão a depósito a prazo (Bank Marketing UCI, versão individualizada)
**Aluno:** Leonardo Fernandes Costa
**Modelo:** Árvore de Decisão (`max_depth=5`, `class_weight='balanced'`, `random_state=42`)

## Antes de começar

O tempo total é de 10 minutos — vale ensaiar uma vez com cronômetro. Se estourar, corte detalhes da EDA, nunca a interpretação nem a sensibilidade, que são o coração da história. As três mensagens que precisam ficar claras, aconteça o que acontecer: a adesão depende do **momento macroeconômico** (a árvore é dominada por `nr.employed`); a árvore é **robusta a outliers** (três cenários, métricas praticamente idênticas); e **acurácia engana** em dados desbalanceados (sem peso ela sobe para **0,898**, mas o recall despenca para **0,216**).

Na hora da matriz de confusão, aponte para as células na tela enquanto cita os números. Role o notebook com calma e deixe cada figura visível alguns segundos antes de comentar. Se o tempo apertar no final, pule direto para a comparação do desbalanceamento e a conclusão de negócio.

## 1. O problema (1 min)

**Mostrar:** célula de abertura da Seção 1, a tabela do dicionário de dados (Seção 1.1) e o `df.head()`.

**Falar:** "Bom dia. Meu trabalho usa o dataset Bank Marketing da UCI, na versão que o professor individualizou para mim: **41.188 linhas e 19 colunas**, sem as colunas `contact` e `campaign`. A situação é a de um banco português que faz telemarketing oferecendo depósito a prazo e quer saber, antes de ligar, quem tem chance de aderir. Aqui na tabela dá para ver os três blocos de variáveis: perfil do cliente, histórico de contato e indicadores macroeconômicos. O desafio central é que só **11,3%** da base aderiu — são **4.640** adesões contra **36.548** recusas. Escolhi árvore de decisão porque, além de classificar, ela devolve regras que o banco consegue ler e usar."

## 2. Explorando os dados (2 min)

**Mostrar:** em sequência rápida: gráfico da distribuição do alvo, tabela de unknowns, boxplots com a tabela de IQR, gráficos de taxa de adesão por `poutcome`, mês e profissão, e os prints da adesão com/sem contato prévio e dos indicadores macro por classe.

**Falar:** "Na exploração, quatro achados. O primeiro são os 'unknowns': `default` tem **8.597**, uns 20% da base, e `education` mais **1.731** — já adianto que mantive como categoria, e daqui a pouco explico por quê. Também achei **22 linhas duplicadas**, que removi. O segundo são os outliers: em `age`, **469 clientes acima de 69,5 anos**, com máximo de 98 — estatisticamente são outliers, mas são clientes reais. E `previous` mostra uma limitação interessante da regra do IQR: como três quartos da base têm valor zero, o intervalo interquartílico degenera e qualquer valor positivo viraria 'outlier'. Além disso, `pdays` igual a 999 não é outlier: é um valor sentinela que significa 'nunca foi contatado', cobre **96,3%** da base, e virou a flag `contato_previo`. O terceiro achado é o quanto a adesão varia por grupo: quem teve sucesso em campanha anterior adere **65,1%**; quem tem contato prévio, **63,8%** contra **9,3%**; março converte **50,5%** contra **6,4%** de maio; estudantes fazem **31,4%** e aposentados **25,2%**. E o quarto achado antecipa a história toda: a euribor média de quem adere é **2,12**, contra **3,81** de quem não adere — as classes vivem em momentos econômicos diferentes."

## 3. Pré-processamento (1,5 min)

**Mostrar:** células da Seção 3 — remoção de `duration`, tratamento de unknown, flag `contato_previo`, one-hot e split.

**Falar:** "No pré-processamento, a decisão mais importante foi **tirar a coluna `duration`**, a duração da ligação. Ela só existe depois que a ligação acontece, então usá-la seria **data leakage**: o modelo ficaria ótimo no papel e inútil na prática, porque na hora de decidir quem ligar essa informação ainda não existe. Removi as **22 duplicatas**, ficando com **41.166 linhas**. Os unknowns eu mantive como categoria própria porque eles carregam sinal: cliente com `default` desconhecido adere só **5,2%**, contra **12,9%** de quem declarou não ter dívida — o próprio 'não saber' informa. Criei a flag `contato_previo` a partir do sentinela, apliquei one-hot nas 9 categóricas, o que dá **51 features**, e fiz o split **75/25 estratificado**: **30.874** linhas de treino, **10.292** de teste, os dois com os mesmos 11,3% de 'yes'."

## 4. Modelo e métricas (2,5 min)

**Mostrar:** saída da validação cruzada (Seção 4.1), tabela de métricas treino×teste, **matriz de confusão** (parar aqui e apontar), curvas ROC e Precision-Recall.

**Falar:** "Para a profundidade, em vez de chutar, rodei validação cruzada de 5 folds otimizando F1: deu **0,4551** com profundidade 3, **0,4569** com 4 e **0,4580** com 5. Fiquei com **5**, mas reparem que a diferença é mínima — o sinal importante está nos primeiros cortes. Usei `class_weight='balanced'` por causa do desbalanceamento. No teste: acurácia **0,845**, precisão **0,385**, recall **0,626**, F1 **0,477** e ROC-AUC **0,789**.

Agora a matriz de confusão, que é onde o resultado vira negócio. Dos **1.160** clientes do teste que realmente aderiram, o modelo encontrou **726** — é o recall de 62,6% — e perdeu **434**. Em troca, gerou **1.159** falsos positivos, ligações que não converteriam. Para telemarketing esse é um erro barato, custa uma ligação; perder um cliente que aderiria custa bem mais. Por isso aceitei trocar precisão por recall.

E um detalhe que parece estranho mas é proposital: minha acurácia de 0,845 é **menor** que a de um modelo bobo que sempre diz 'não', que acertaria **0,887**. Isso não é defeito — é a prova de que acurácia sozinha não serve aqui. Volto nesse ponto na análise de sensibilidade."

## 5. O que a árvore aprendeu (1,5 min)

**Mostrar:** visualização da árvore (zoom na raiz e nos dois primeiros níveis) e o gráfico de importâncias.

**Falar:** "Esse é, para mim, o resultado mais interessante. A raiz da árvore é **`nr.employed ≤ 5.087,65`** — o número de empregados na economia portuguesa. Ou seja, a primeira pergunta que a árvore faz não é sobre o cliente, é sobre **o momento da economia**. Ela tem **61 nós e 31 folhas**, mas `nr.employed` sozinha concentra **0,7072** da importância, seguida do índice de confiança do consumidor com **0,1433**, do índice de preços e da euribor — as **quatro primeiras são todas macroeconômicas** e somam uns 92%. A leitura de negócio: a adesão depende menos de quem é o cliente e mais de **quando** a ligação acontece. Os dados cobrem a crise de 2008 a 2010 em Portugal: emprego caindo, euribor despencando, banco precisando captar e cliente buscando segurança — a árvore capturou esse regime sozinha. Só depois da macroeconomia aparecem atributos do cliente, como `contato_previo` e `default_unknown`."

## 6. Sensibilidade e conclusão (1,5 min)

**Mostrar:** tabela dos três cenários de outliers, tabela e gráfico do desbalanceamento (destacar a linha sem peso) e a célula final de conclusões.

**Falar:** "Testei a sensibilidade a duas coisas. Outliers primeiro: comparei o modelo original com uma versão winsorizada e outra removendo as 344 linhas de treino com idade acima de 69,5 — e o F1 ficou em **0,477** nos três cenários. A árvore corta por limiares ordenados, não por distância, então outlier não a incomoda. Depois, o desbalanceamento, que é o resultado mais didático: sem `class_weight`, a acurácia sobe para **0,898**, acima até da baseline — só que o recall desaba de **0,626** para **0,216**, o modelo acharia só 250 dos 1.160 aderentes. É a demonstração perfeita de por que acurácia engana. O undersampling chega perto do balanced, recall igual e F1 **0,465**, mas jogando fora 77% do treino — a reponderação consegue o mesmo sem descartar dados.

Fechando com o negócio: com esse modelo, o banco ligaria para uns **18% da base** e capturaria uns **63% dos aderentes** — a precisão de **38,5%** contra a taxa base de **11,3%** dá um lift de **3,4 vezes** por ligação. Como próximos passos: ensembles, ajuste do limiar pelo custo real da ligação e validação temporal, já que as variáveis dominantes são macroeconômicas e mudam de regime. Uma última observação: o professor introduziu artificialidades pedagógicas no dataset, então esses números valem para a disciplina, não para publicação. Obrigado."

## Perguntas prováveis do professor

**1. Por que você removeu a coluna `duration`?**
Porque é data leakage: a duração da ligação só é conhecida depois que a ligação acontece, e o objetivo é decidir quem ligar antes. Mantê-la inflaria as métricas artificialmente e tornaria o modelo inútil em produção.

**2. Por que usar `class_weight='balanced'`?**
Porque só 11,3% da base é 'yes'. Sem o peso, a árvore otimiza acurácia global e ignora a classe minoritária: o recall cai de **0,626** para **0,216**. O `balanced` repondera os erros na proporção inversa das classes, priorizando encontrar os aderentes — que é o objetivo de negócio.

**3. Por que `max_depth=5` e não uma árvore mais funda?**
A validação cruzada mostrou ganho marginal: F1 de **0,4551** (d=3), **0,4569** (d=4) e **0,4580** (d=5). Profundidades maiores aumentam o risco de overfitting e destroem a interpretabilidade, que é a vantagem da árvore. Com d=5 são 61 nós e ainda cabe num slide.

**4. Sua acurácia (0,845) é menor que a baseline (0,887). O modelo é ruim?**
Não — isso mostra que acurácia não é a métrica certa aqui. A baseline acerta 0,887 com recall zero: não encontra nenhum aderente. Meu modelo troca 4 pontos de acurácia por recall de **0,626** e lift de ~3,4x nas ligações. Em problema desbalanceado, olho F1, recall e ROC-AUC (**0,789**).

**5. Por que a árvore é robusta a outliers?**
Porque os splits são limiares sobre a ordenação dos valores, não sobre distâncias ou médias. Um cliente de 98 anos cai do mesmo lado do corte que um de 75. Verifiquei empiricamente: original, winsorização e remoção deram F1 idêntico de **0,477**.

**6. O que é `nr.employed` e por que domina a árvore?**
É o número de pessoas empregadas na economia portuguesa (indicador trimestral, em milhares). Domina (**0,7072** de importância) porque os dados cobrem a crise de 2008–2010: com a euribor caindo (média de **2,12** entre aderentes contra **3,81**) e o emprego baixo, bancos intensificavam a captação e clientes buscavam segurança. Ela funciona como marcador do regime econômico.

**7. Por que manter 'unknown' como categoria em vez de imputar ou remover?**
Porque o 'unknown' é informativo: cliente com `default` unknown adere **5,2%** contra **12,9%** dos 'no' — provavelmente quem evita informar a situação de crédito. Tanto que `default_unknown` aparece na árvore, com importância **0,0124**. Imputar pela moda apagaria esse sinal; remover descartaria 8.597 linhas.

**8. Houve overfitting?**
Não. Treino e teste ficaram praticamente iguais: F1 de **0,464** contra **0,477**, ROC-AUC de **0,783** contra **0,789**. A profundidade limitada a 5 funciona como regularização.

**9. Por que seus números diferem das saídas de referência do template?**
Porque meu dataset foi individualizado: 41.188 linhas e 19 colunas, sem `contact` e `campaign`. Com features e amostras diferentes, splits, importâncias e métricas mudam. Todos os meus números vêm da execução do meu notebook sobre o meu arquivo.

**10. Por que não usou undersampling em vez de `class_weight`?**
Testei: o undersampling deu recall igual (**0,626**) e F1 levemente pior (**0,465** contra **0,477**), mas reduzindo o treino de 30.874 para **6.956** linhas — descarta 77% dos dados. O `class_weight` alcança o mesmo efeito sem jogar informação fora.

## Fechamento

Agradecer e lembrar explicitamente da nota de **artificialidades pedagógicas**: o trabalho segue as restrições didáticas da disciplina (um único modelo de árvore rasa, dataset individualizado, decisões guiadas pelo enunciado). Num projeto real, o passo seguinte seria comparar com ensembles, calibrar o limiar pelo custo de cada ligação e validar temporalmente.
