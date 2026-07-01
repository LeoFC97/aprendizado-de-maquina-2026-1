# -*- coding: utf-8 -*-
"""
Gera o dashboard estático (dashboard.html) do trabalho final:
"Adesão a Depósito a Prazo — Árvore de Decisão".

- Lê o CSV individualizado (banco_aluno04_leonardo_costa.csv) apenas para os boxplots do EDA.
- TODAS as métricas, importâncias e matrizes vêm de resultados_resumo.json (nenhum modelo é treinado aqui).
- Saída: dashboard.html AUTOCONTIDO (plotly.js embutido inline uma única vez — abre offline).

Uso:  python3 gerar_dashboard.py
"""

import json
from pathlib import Path

import pandas as pd
import plotly.graph_objects as go
from plotly.offline import get_plotlyjs

# ---------------------------------------------------------------------------
# Caminhos relativos à pasta do script
# ---------------------------------------------------------------------------
BASE = Path(__file__).resolve().parent
CSV_PATH = BASE / "banco_aluno04_leonardo_costa.csv"
JSON_PATH = BASE / "resultados_resumo.json"
OUT_PATH = BASE / "dashboard.html"

with open(JSON_PATH, encoding="utf-8") as f:
    R = json.load(f)

df = pd.read_csv(CSV_PATH, sep=";")

# ---------------------------------------------------------------------------
# Helpers de formatação (padrão brasileiro)
# ---------------------------------------------------------------------------
def num_br(n: int) -> str:
    """41188 -> '41.188'"""
    return f"{n:,}".replace(",", ".")

def pct_br(v) -> str:
    """11.3 -> '11,3%'"""
    return f"{v}".replace(".", ",") + "%"

def dec_br(v) -> str:
    """9.5 -> '9,5' (número decimal com vírgula)"""
    return f"{v}".replace(".", ",")

def met(v) -> str:
    """Métrica com 3 casas decimais (0.37 -> '0.370'), como no notebook."""
    return f"{v:.3f}"

# Paleta sóbria
AZUL = "#1f3a5f"       # principal
AZUL_CLARO = "#7d9bc1"
CINZA = "#b9c2cd"
LARANJA = "#c05621"    # destaque / alerta
VERDE = "#2f6f4f"
FUNDO = "#ffffff"

LAYOUT_BASE = dict(
    font=dict(family="system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
              size=13, color="#22303f"),
    paper_bgcolor=FUNDO,
    plot_bgcolor=FUNDO,
    margin=dict(l=60, r=30, t=60, b=50),
)

def to_div(fig) -> str:
    return fig.to_html(full_html=False, include_plotlyjs=False,
                       config={"displayModeBar": False, "responsive": True})

# ---------------------------------------------------------------------------
# (c) Distribuição do alvo
# ---------------------------------------------------------------------------
n_no = R["target"]["no"]
n_yes = R["target"]["yes"]
pct_yes = R["target"]["pct_yes"]           # 11.3
pct_no = round(100 - pct_yes, 1)           # 88.7

fig_alvo = go.Figure(go.Bar(
    x=["não aderiu (no)", "aderiu (yes)"],
    y=[n_no, n_yes],
    marker_color=[CINZA, AZUL],
    text=[f"{num_br(n_no)}  ({pct_br(pct_no)})", f"{num_br(n_yes)}  ({pct_br(pct_yes)})"],
    textposition="outside",
))
fig_alvo.update_layout(
    **LAYOUT_BASE,
    title="Distribuição do alvo y (dataset completo, n = " + num_br(R["shape_raw"][0]) + ")",
    yaxis_title="Nº de clientes",
    xaxis_title="Classe",
    height=380,
)
fig_alvo.update_yaxes(range=[0, n_no * 1.18], gridcolor="#eef1f4")

# ---------------------------------------------------------------------------
# (d) Taxa de adesão por variável — grid 2x2
# ---------------------------------------------------------------------------
MEDIA_GERAL = pct_yes  # 11.3

def fig_taxa(labels, valores, titulo, cor=AZUL, altura=380, xtitle=""):
    fig = go.Figure(go.Bar(
        x=labels, y=valores, marker_color=cor,
        text=[pct_br(v) for v in valores], textposition="outside",
    ))
    fig.add_hline(y=MEDIA_GERAL, line_dash="dash", line_color=LARANJA, line_width=2,
                  annotation_text=f"média geral: {pct_br(MEDIA_GERAL)}",
                  annotation_position="top right",
                  annotation_font_color=LARANJA)
    fig.update_layout(
        **LAYOUT_BASE, title=titulo,
        yaxis_title="Taxa de adesão (%)", xaxis_title=xtitle,
        height=altura,
    )
    fig.update_yaxes(range=[0, max(valores) * 1.28], gridcolor="#eef1f4")
    return fig

# poutcome
POUT_PT = {"success": "sucesso", "failure": "fracasso", "nonexistent": "inexistente"}
pout = R["adesao_por"]["poutcome"]
pout_items = sorted(pout.items(), key=lambda kv: -kv[1])
fig_pout = fig_taxa([POUT_PT[k] for k, _ in pout_items], [v for _, v in pout_items],
                    "Por resultado da campanha anterior (poutcome)",
                    xtitle="poutcome")

# mês (ordenado por taxa, decrescente)
MES_PT = {"jan": "jan", "feb": "fev", "mar": "mar", "apr": "abr", "may": "mai",
          "jun": "jun", "jul": "jul", "aug": "ago", "sep": "set", "oct": "out",
          "nov": "nov", "dec": "dez"}
meses = sorted(R["adesao_por"]["month"].items(), key=lambda kv: -kv[1])
fig_mes = fig_taxa([MES_PT[k] for k, _ in meses], [v for _, v in meses],
                   "Por mês do contato (ordenado por taxa)",
                   xtitle="mês")

# profissão (ordenado por taxa, decrescente)
jobs = sorted(R["adesao_por"]["job"].items(), key=lambda kv: -kv[1])
fig_job = fig_taxa([k for k, _ in jobs], [v for _, v in jobs],
                   "Por profissão (job, ordenado por taxa)",
                   xtitle="profissão")
fig_job.update_xaxes(tickangle=-35)

# contato prévio
cp = R["adesao_contato_previo"]
fig_cp = fig_taxa(["com contato prévio", "sem contato prévio"],
                  [cp["com_contato_previo"], cp["sem_contato_previo"]],
                  "Por contato prévio (pdays ≠ 999)",
                  xtitle="contato_previo")

# ---------------------------------------------------------------------------
# (e) Outliers — boxplots de age e duration (calculados do CSV)
# ---------------------------------------------------------------------------
o_age = R["outliers_eda"]["age"]
o_dur = R["outliers_eda"]["duration"]

fig_box_age = go.Figure(go.Box(
    y=df["age"], name="age", marker_color=AZUL, boxpoints="outliers",
    marker=dict(color=AZUL, size=3, opacity=0.4), line_color=AZUL,
))
fig_box_age.add_hline(y=o_age["upper"], line_dash="dot", line_color=LARANJA,
                      annotation_text=f"limite superior IQR: {dec_br(o_age['upper'])}",
                      annotation_font_color=LARANJA)
fig_box_age.add_hline(y=o_age["lower"], line_dash="dot", line_color=LARANJA,
                      annotation_text=f"limite inferior IQR: {dec_br(o_age['lower'])}",
                      annotation_position="bottom right",
                      annotation_font_color=LARANJA)
fig_box_age.update_layout(
    **LAYOUT_BASE,
    title=(f"age — limites IQR {dec_br(o_age['lower'])}–{dec_br(o_age['upper'])} · "
           f"{o_age['n_out']} outliers ({pct_br(o_age['pct_out'])})"),
    yaxis_title="idade (anos)", height=440, showlegend=False,
)
fig_box_age.update_yaxes(gridcolor="#eef1f4")

fig_box_dur = go.Figure(go.Box(
    y=df["duration"], name="duration", boxpoints="outliers",
    marker=dict(color=VERDE, size=3, opacity=0.4), line_color=VERDE,
))
fig_box_dur.add_hline(y=o_dur["upper"], line_dash="dot", line_color=LARANJA,
                      annotation_text=f"limite superior IQR: {dec_br(o_dur['upper'])}",
                      annotation_font_color=LARANJA)
fig_box_dur.update_layout(
    **LAYOUT_BASE,
    title=(f"duration — limite superior IQR {dec_br(o_dur['upper'])} · "
           f"{num_br(o_dur['n_out'])} outliers ({pct_br(o_dur['pct_out'])})"),
    yaxis_title="duração da ligação (s)", height=440, showlegend=False,
)
fig_box_dur.update_yaxes(gridcolor="#eef1f4")

# ---------------------------------------------------------------------------
# (f) Importância das variáveis — top 15 (do JSON)
# ---------------------------------------------------------------------------
imp = R["importancias_top15"]
imp_nomes = [k for k, _ in imp]
imp_vals = [v for _, v in imp]
cores_imp = [LARANJA if i < 4 else CINZA for i in range(len(imp))]
soma_top4 = round(sum(imp_vals[:4]), 4)

fig_imp = go.Figure(go.Bar(
    x=list(reversed(imp_vals)), y=list(reversed(imp_nomes)), orientation="h",
    marker_color=list(reversed(cores_imp)),
    text=[f"{v}" for v in reversed(imp_vals)], textposition="outside",
))
fig_imp.update_layout(
    **LAYOUT_BASE,
    title="Importância das variáveis (Gini) — top 15 · em laranja: variáveis macroeconômicas/de contexto",
    xaxis_title="importância", height=520,
)
fig_imp.update_xaxes(range=[0, max(imp_vals) * 1.15], gridcolor="#eef1f4")

# ---------------------------------------------------------------------------
# (g) Matriz de confusão do modelo final (teste)
# ---------------------------------------------------------------------------
cm = R["final_teste"]["cm"]  # [[VN, FP], [FN, VP]]
rot = ["não aderiu", "aderiu"]
z = cm
anot = [[f"<b>{num_br(z[i][j])}</b>" for j in range(2)] for i in range(2)]

fig_cm = go.Figure(go.Heatmap(
    z=z, x=[f"previsto: {r}" for r in rot], y=[f"real: {r}" for r in rot],
    colorscale="Blues", showscale=False,
    text=anot, texttemplate="%{text}", textfont=dict(size=20),
))
fig_cm.update_layout(
    **LAYOUT_BASE,
    title="Matriz de confusão — conjunto de teste (n = " + num_br(sum(sum(l) for l in z)) + ")",
    height=420,
)
fig_cm.update_yaxes(autorange="reversed")

# ---------------------------------------------------------------------------
# (h) Sensibilidade — tabela + barras agrupadas
# ---------------------------------------------------------------------------
CENARIOS = [
    ("Original (class_weight='balanced')", R["final_teste"]),
    ("Winsorização de age", R["sens_outliers_winsor"]),
    ("Remoção de outliers de age", R["sens_outliers_remocao"]),
    ("Sem class_weight", R["sens_desbal_sem_peso"]),
    ("Undersampling", R["sens_desbal_undersampling"]),
]

linhas_tabela = []
for nome, m in CENARIOS:
    destaque = ' class="alerta"' if nome == "Sem class_weight" else ""
    linhas_tabela.append(
        f"<tr{destaque}><td>{nome}</td>"
        f"<td>{met(m['acuracia'])}</td><td>{met(m['precisao'])}</td>"
        f"<td>{met(m['recall'])}</td><td>{met(m['f1'])}</td>"
        f"<td>{met(m['roc_auc'])}</td></tr>"
    )
tabela_sens = (
    "<table class='tab'><thead><tr><th>Cenário</th><th>Acurácia</th>"
    "<th>Precisão</th><th>Recall</th><th>F1</th><th>ROC-AUC</th></tr></thead>"
    "<tbody>" + "".join(linhas_tabela) + "</tbody></table>"
)

cen_barras = [
    ("Original", R["final_teste"]),
    ("Sem class_weight", R["sens_desbal_sem_peso"]),
    ("Undersampling", R["sens_desbal_undersampling"]),
]
nomes_cen = [n for n, _ in cen_barras]
fig_sens = go.Figure()
for metrica, chave, cor in [("Acurácia", "acuracia", CINZA),
                            ("Recall", "recall", AZUL),
                            ("F1", "f1", VERDE)]:
    vals = [m[chave] for _, m in cen_barras]
    fig_sens.add_bar(name=metrica, x=nomes_cen, y=vals, marker_color=cor,
                     text=[met(v) for v in vals], textposition="outside")
fig_sens.add_hline(y=R["baseline_majoritaria_acc"], line_dash="dash",
                   line_color=LARANJA, line_width=2,
                   annotation_text=f"baseline majoritária: acurácia {met(R['baseline_majoritaria_acc'])}",
                   annotation_position="top right",
                   annotation_font_color=LARANJA)
fig_sens.update_layout(
    **LAYOUT_BASE, barmode="group",
    title="Acurácia × Recall × F1 por estratégia de balanceamento (teste)",
    yaxis_title="valor da métrica", height=440,
    legend=dict(orientation="h", y=1.08, x=0),
)
fig_sens.update_yaxes(range=[0, 1.05], gridcolor="#eef1f4")

# ---------------------------------------------------------------------------
# Montagem do HTML
# ---------------------------------------------------------------------------
ft = R["final_teste"]
arv = R["arvore"]
n_teste_pos = R["split"]["y_test"]["1"]          # 1160
vp = cm[1][1]                                    # 726
fn = cm[1][0]                                    # 434
fp = cm[0][1]                                    # 1159
n_teste_neg = R["split"]["y_test"]["0"]          # 9132

kpis = [
    (num_br(R["shape_raw"][0]), "registros no dataset"),
    (f"{R['shape_raw'][1]}", f"colunas ({R['preproc']['n_features']} features após encoding)"),
    (pct_br(pct_yes), "de adesão (classe positiva)"),
    (met(ft["f1"]), "F1-score (teste)"),
    (met(ft["recall"]), "Recall (teste)"),
    (met(ft["roc_auc"]), "ROC-AUC (teste)"),
]
kpi_html = "".join(
    f"<div class='kpi'><div class='kpi-valor'>{v}</div><div class='kpi-rotulo'>{r}</div></div>"
    for v, r in kpis
)

sp = R["sens_desbal_sem_peso"]

html = f"""<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Adesão a Depósito a Prazo — Árvore de Decisão</title>
<script type="text/javascript">{get_plotlyjs()}</script>
<style>
  :root {{
    --azul: {AZUL};
    --laranja: {LARANJA};
    --texto: #22303f;
    --texto-suave: #5a6b7d;
    --borda: #e3e8ee;
    --fundo: #f5f7fa;
  }}
  * {{ box-sizing: border-box; }}
  body {{
    margin: 0; background: var(--fundo); color: var(--texto);
    font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
    line-height: 1.55;
  }}
  .container {{ max-width: 1200px; margin: 0 auto; padding: 0 24px 48px; }}
  header.topo {{
    background: var(--azul); color: #fff; padding: 36px 24px 30px; margin-bottom: 28px;
  }}
  header.topo .container {{ padding-bottom: 0; }}
  header.topo h1 {{ margin: 0 0 8px; font-size: 1.75rem; font-weight: 700; }}
  header.topo p {{ margin: 2px 0; color: #cdd9e8; font-size: 0.95rem; }}
  h2 {{
    font-size: 1.2rem; margin: 40px 0 6px; padding-bottom: 6px;
    border-bottom: 2px solid var(--borda); color: var(--azul);
  }}
  p.nota {{ color: var(--texto-suave); font-size: 0.93rem; margin: 6px 0 16px; }}
  p.leitura {{
    background: #fdf6ef; border-left: 4px solid var(--laranja);
    padding: 10px 14px; font-size: 0.95rem; border-radius: 0 6px 6px 0;
  }}
  .grid-kpi {{
    display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
    gap: 14px; margin: 18px 0 8px;
  }}
  .kpi {{
    background: #fff; border: 1px solid var(--borda); border-radius: 10px;
    padding: 16px 14px; text-align: center;
    box-shadow: 0 1px 2px rgba(20,35,55,0.05);
  }}
  .kpi-valor {{ font-size: 1.65rem; font-weight: 700; color: var(--azul); }}
  .kpi-rotulo {{ font-size: 0.82rem; color: var(--texto-suave); margin-top: 4px; }}
  .card {{
    background: #fff; border: 1px solid var(--borda); border-radius: 10px;
    padding: 14px; margin: 14px 0; box-shadow: 0 1px 2px rgba(20,35,55,0.05);
  }}
  .grid-2 {{
    display: grid; grid-template-columns: 1fr 1fr; gap: 14px;
  }}
  @media (max-width: 900px) {{ .grid-2 {{ grid-template-columns: 1fr; }} }}
  table.tab {{
    width: 100%; border-collapse: collapse; font-size: 0.93rem; margin: 8px 0;
  }}
  table.tab th, table.tab td {{
    border-bottom: 1px solid var(--borda); padding: 9px 10px; text-align: left;
  }}
  table.tab th {{ background: #eef2f7; color: var(--azul); }}
  table.tab td:not(:first-child), table.tab th:not(:first-child) {{ text-align: right; }}
  table.tab tr.alerta td {{ background: #fdf1ea; }}
  table.tab tr.alerta td:nth-child(4) {{ color: var(--laranja); font-weight: 700; }}
  footer {{
    margin-top: 48px; padding: 18px 24px; background: #e9edf2;
    color: var(--texto-suave); font-size: 0.88rem; text-align: center;
    border-top: 1px solid var(--borda);
  }}
</style>
</head>
<body>

<header class="topo">
  <div class="container">
    <h1>Adesão a Depósito a Prazo — Árvore de Decisão</h1>
    <p><strong>Aluno:</strong> Leonardo Fernandes Costa &nbsp;·&nbsp; <strong>Disciplina:</strong> Introdução ao Aprendizado de Máquina</p>
    <p><strong>Dataset:</strong> Bank Marketing (UCI), versão individualizada pelo docente &nbsp;·&nbsp; <strong>Data:</strong> 02/07/2026</p>
    <p>Modelo: DecisionTreeClassifier (max_depth=5, class_weight='balanced', random_state=42) · split 75/25 estratificado ·
       'duration' removida do modelo (data leakage) · {R["n_duplicatas"]} duplicatas removidas</p>
  </div>
</header>

<div class="container">

  <!-- (b) KPIs -->
  <section>
    <div class="grid-kpi">{kpi_html}</div>
  </section>

  <!-- (c) Alvo -->
  <section>
    <h2>1. Distribuição do alvo</h2>
    <p class="nota">Apenas {pct_br(pct_yes)} dos clientes aderiram ao depósito a prazo — problema fortemente desbalanceado,
       o que motivou o uso de class_weight='balanced' e a avaliação por F1/Recall/ROC-AUC em vez de acurácia.</p>
    <div class="card">{to_div(fig_alvo)}</div>
  </section>

  <!-- (d) Taxa de adesão -->
  <section>
    <h2>2. Taxa de adesão por segmento</h2>
    <p class="nota">A linha tracejada marca a média geral de {pct_br(MEDIA_GERAL)}. Destaques: clientes com contato prévio
       (pdays ≠ 999) aderem a {pct_br(cp["com_contato_previo"])}, contra {pct_br(cp["sem_contato_previo"])} sem contato prévio —
       e {pct_br(R["pdays_999"]["pct"])} da base ({num_br(R["pdays_999"]["n"])} clientes) nunca havia sido contatada.</p>
    <div class="grid-2">
      <div class="card">{to_div(fig_pout)}</div>
      <div class="card">{to_div(fig_mes)}</div>
      <div class="card">{to_div(fig_job)}</div>
      <div class="card">{to_div(fig_cp)}</div>
    </div>
  </section>

  <!-- (e) Outliers -->
  <section>
    <h2>3. Outliers (critério IQR, 1,5×)</h2>
    <p class="nota">Em <b>age</b>, os limites IQR são {dec_br(o_age["lower"])}–{dec_br(o_age["upper"])} anos:
       {o_age["n_out"]} outliers ({pct_br(o_age["pct_out"])} da base), todos idosos legítimos (máx. {dec_br(o_age["max"])} anos).
       <b>duration</b> concentra {num_br(o_dur["n_out"])} outliers ({pct_br(o_dur["pct_out"])}), mas foi
       <b>removida do modelo por caracterizar data leakage</b> — só é conhecida após a ligação; aparece aqui apenas como EDA.</p>
    <div class="grid-2">
      <div class="card">{to_div(fig_box_age)}</div>
      <div class="card">{to_div(fig_box_dur)}</div>
    </div>
  </section>

  <!-- (f) Importâncias -->
  <section>
    <h2>4. Importância das variáveis</h2>
    <p class="nota">As 4 variáveis mais importantes são macroeconômicas ou de contexto — juntas somam {met(soma_top4)}
       ({dec_br(round(soma_top4 * 100, 1))}% da importância total): <b>nr.employed</b> ({met(imp_vals[0])}) domina a árvore,
       seguida de <b>cons.conf.idx</b> ({met(imp_vals[1])}), <b>cons.price.idx</b> e <b>euribor3m</b>.
       A raiz da árvore é <b>nr.employed ≤ {dec_br(arv["root_threshold"])}</b>
       (árvore com {arv["n_nos"]} nós e {arv["n_folhas"]} folhas).</p>
    <p class="leitura">Leitura de negócio: a adesão depende mais do <b>momento da economia</b> (menos empregados na economia,
       juros euribor baixos, confiança do consumidor) do que do perfil individual do cliente.</p>
    <div class="card">{to_div(fig_imp)}</div>
  </section>

  <!-- (g) Matriz de confusão -->
  <section>
    <h2>5. Matriz de confusão — modelo final (teste)</h2>
    <div class="card">{to_div(fig_cm)}</div>
    <p class="leitura">De <b>{num_br(n_teste_pos)} aderentes</b> no conjunto de teste, o modelo capturou
       <b>{num_br(vp)} ({pct_br(round(100 * vp / (vp + fn), 1))} — recall {met(ft["recall"])})</b>, deixando escapar {num_br(fn)}.
       O custo foi apontar {num_br(fp)} não aderentes como prováveis aderentes (precisão {met(ft["precisao"])}),
       entre os {num_br(n_teste_neg)} negativos. Acurácia: {met(ft["acuracia"])} · ROC-AUC: {met(ft["roc_auc"])}.</p>
  </section>

  <!-- (h) Sensibilidade -->
  <section>
    <h2>6. Análise de sensibilidade</h2>
    <p class="nota"><b>Outliers:</b> winsorizar ou remover os outliers de age praticamente não altera as métricas —
       a árvore é robusta a valores extremos (os splits dependem só da ordem dos valores).
       <b>Desbalanceamento:</b> é onde as decisões importam de verdade.</p>
    <div class="card">{tabela_sens}</div>
    <div class="card">{to_div(fig_sens)}</div>
    <p class="leitura">Acurácia sozinha engana: sem class_weight ela sobe para <b>{met(sp["acuracia"])}</b>
       (acima do baseline majoritário de {met(R["baseline_majoritaria_acc"])}), mas o recall despenca de
       {met(ft["recall"])} para <b>{met(sp["recall"])}</b> — o modelo passa a ignorar quase 4 em cada 5 aderentes,
       exatamente a classe de interesse do negócio.</p>
  </section>

</div>

<footer>
  Dataset com artificialidades pedagógicas introduzidas pelo docente — resultados não devem ser usados em publicações.
</footer>

</body>
</html>
"""

OUT_PATH.write_text(html, encoding="utf-8")
print(f"OK: {OUT_PATH} gerado ({OUT_PATH.stat().st_size / 1e6:.2f} MB)")
