# 🏦 Simulador de Amortização Antecipada (CAIXA / SFH)

Este é um simulador que desenvolvi para analisar e decidir qual é a melhor estratégia financeira para o meu financiamento imobiliário da Caixa Econômica Federal. O objetivo principal é simular amortizações extras e comparar cenários para descobrir o que vale mais a pena financeiramente: se é amortizar imediatamente (reduzindo prazo/parcela), investir o dinheiro para amortizar um montante maior depois, ou utilizar o saldo do FGTS de forma periódica ou para quitação total.

Ele oferece uma simulação realista de financiamentos no padrão **CAIXA / SFH**, com suporte a PRICE e SAC, seguros obrigatórios (MIP/DFI), TR, aportes extraordinários e exportação de tabela de evolução.

---

## 🚀 Como rodar

### Localmente (NPM)

```bash
npm install
npm run dev
```

Acesse `http://localhost:5173` (ou a porta gerada no terminal).

### Com Docker

Certifique-se de ter o Docker instalado na sua máquina e execute o comando:

```bash
docker compose up -d --build
```

Acesse `http://localhost:8080` no seu navegador.

---

## 📋 Campos de Entrada

### Parâmetros do Financiamento

| Campo | O que é | Exemplo |
|---|---|---|
| **Valor Financiado** | O saldo devedor inicial — o quanto você está tomando emprestado do banco. Não é o preço do imóvel. | R$ 300.000 |
| **Prazo (meses)** | Duração total do contrato em meses. Máximo SFH: 420 meses (35 anos). | 420 |
| **Taxa de Juros** | Taxa nominal do contrato, pode ser anual (a.a.) ou mensal (a.m.). O simulador converte automaticamente. | 9,5% a.a. |
| **Sistema** | Sistema de amortização (veja seção abaixo). | PRICE ou SAC |
| **TR Estimada (% a.m.)** | Taxa Referencial mensal estimada. Corrija o saldo devedor mensalmente. Historicamente próxima de 0%. | 0 |
| **Valor do Imóvel (Avaliação)** | Valor de avaliação do imóvel pelo banco. Usado para calcular ITBI, cartório e o seguro DFI. | R$ 400.000 |
| **Tarifa Admin. Mensal** | Taxa administrativa cobrada pela CAIXA sobre cada parcela. Valor fixo em reais. | R$ 25,00 |
| **Incluir Seguros (MIP/DFI)** | Ativa o cálculo dos seguros obrigatórios SFH. | ✓ |
| **Idade do Comprador** | Idade do comprador principal. Afeta diretamente a alíquota do seguro de vida (MIP). Quanto mais velho, mais caro. | 35 anos |

---

## 📐 Sistemas de Amortização

### PRICE (Tabela Price / Sistema Francês)
- Parcela **constante** durante todo o contrato (antes de correções pela TR).
- No início, a parcela é composta majoritariamente de **juros**. Com o tempo, a amortização aumenta.
- Por isso, **aportes extras têm impacto muito maior no final do contrato** — cada real amortizado antecipadamente elimina parcelas que ainda carregariam muito juros.
- Fórmula da parcela:

$$PMT = SD \cdot \frac{i \cdot (1+i)^n}{(1+i)^n - 1}$$

Onde `SD` = saldo devedor, `i` = taxa mensal, `n` = prazo restante.

### SAC (Sistema de Amortização Constante)
- A **amortização** (abatimento do principal) é constante todos os meses.
- Os juros diminuem a cada parcela conforme o saldo cai, então a parcela começa mais cara e vai ficando mais barata.
- Parcelas extras eliminam menos meses que na PRICE (matematicamente), mas o custo total de juros é menor do início.

### Quando usar cada um?
| | PRICE | SAC |
|---|---|---|
| Parcela inicial | Menor | Maior |
| Parcela no final | Igual à inicial | Bem menor |
| Custo total de juros | Maior | Menor |
| Impacto de aportes extras | **Muito maior** | Menor |
| Recomendado para | Quem vai fazer aportes extras | Quem não vai amortizar antecipadamente |

---

## 🔐 Seguros Obrigatórios (SFH)

### MIP — Morte e Invalidez Permanente (Seguro de Vida)
- Cobre o saldo devedor em caso de morte ou invalidez do comprador.
- Alíquota varia com a **idade** e é aplicada sobre o **saldo devedor** mensal.
- A alíquota cresce conforme o comprador envelhece ao longo do contrato.
- Referência de alíquota inicial (CAIXA): ~0,0150% a.m. para 35 anos.

### DFI — Danos Físicos do Imóvel (Seguro do Imóvel)
- Cobre danos estruturais ao imóvel (incêndio, desabamento etc.).
- Alíquota fixa: **0,0050% a.m.** sobre o valor de avaliação do imóvel.

---

## 💰 Custos Iniciais de Aquisição (À Vista)

Esses custos são pagos no ato da compra e **não entram no financiamento**.

| Custo | O que é | Referência |
|---|---|---|
| **ITBI** | Imposto de Transmissão de Bens Imóveis. Municipal, pago ao prefeitura. | ~2% do valor do imóvel |
| **Registro/Cartório** | Escritura + registro do imóvel em cartório. | ~1% do valor do imóvel |
| **Vistoria e Engenharia Caixa** | Taxa cobrada pela CAIXA para avaliar o imóvel antes de liberar o crédito. | R$ 3.100 (estimativa) |

> **Nota:** A CAIXA permite em alguns casos embutir o ITBI e o cartório no financiamento, mas isso aumenta o saldo devedor e gera juros sobre esses valores.

---

## ➕ Aportes Extraordinários

Pagamentos extras além da parcela mensal, aplicados diretamente no saldo devedor.

### Aporte Recorrente Mensal
Valor fixo adicional pago todo mês junto com a parcela. Reduz o prazo (ou o valor, conforme configurado) de forma consistente.

### Aporte Pontual
Aporte único em um mês específico. Configure:
- **Mês**: em qual parcela o pagamento será feito (ex: mês 12 = 1 ano após o início).
- **Valor**: quanto você vai pagar a mais.
- **Tipo**: `Reduzir Prazo` ou `Reduzir Valor`.

### Reduzir Prazo vs Reduzir Valor

| | Reduzir Prazo | Reduzir Valor |
|---|---|---|
| O que acontece | Elimina parcelas do **final** do contrato | Mantém o prazo, reduz o valor de **todas** as parcelas futuras |
| Economia de juros | **Maior** | Menor |
| Benefício imediato | Não (parcelas ativas ficam iguais) | Sim (parcelas ficam menores imediatamente) |
| Recomendado | ✓ Quase sempre | Quem precisa de folga no orçamento mensal |

---

## 📊 Como Interpretar os Resultados

### Resumo Econômico
- **Prazo Restante Real**: quantos meses ainda restarão com os aportes configurados.
- **Total de Juros Pagos**: soma de todos os juros pagos durante o contrato.
- **Economia de R$**: diferença de juros entre o cenário sem aportes e com aportes.
- **Custo Total do Contrato (CET)**: tudo somado — parcelas, seguros, tarifas e aportes extras.

### Tabela de Evolução Mensal
Mostra mês a mês a composição de cada parcela:

| Coluna | O que mostra |
|---|---|
| Parcela Total | Valor total pago naquele mês (amortização + juros + seguros + tarifa) |
| Amortização | Quanto do principal foi abatido |
| Juros | Quanto foi pago de juros (= saldo devedor × taxa mensal) |
| Seguros (MIP+DFI) | Custo dos seguros obrigatórios |
| Aporte Extra | Valor de aporte pontual ou recorrente naquele mês |
| Saldo Devedor | Quanto ainda resta a pagar depois daquela parcela |

### Parcelas Eliminadas (ao final da tabela)
Aparecem **riscadas** no final da tabela — são parcelas que **não existirão mais** no contrato porque foram antecipadas pelo seu aporte.

- **Valor riscado**: o que você *teria* pago se não tivesse amortizado.
- **Você pagou (VP)**: o **valor presente** dessa parcela na data do aporte. É o quanto do seu aporte foi "gasto" para quitar aquela parcela antecipada.

> **Por que o VP é menor que o valor nominal?**
> Porque antecipar uma parcela futura tem um desconto — você paga menos hoje do que pagaria lá na frente, pelo efeito dos juros compostos. A fórmula é:
> 
> `VP = Parcela Nominal / (1 + taxa_mensal) ^ meses_de_antecipação`

---

## ⚖️ Comparação: Amortizar Hoje vs Investir e Amortizar Depois

Essa seção responde: **vale mais a pena usar o dinheiro para amortizar agora, ou investir por alguns meses e amortizar depois?**

Configure:
- **Valor Disponível**: quanto você tem para usar.
- **Taxa de Rendimento**: rendimento esperado do investimento (ex: CDI, Tesouro Direto).
- **Período de Espera**: quantos meses vai investir antes de amortizar.

O simulador calcula para os dois cenários quantas parcelas serão eliminadas e qual gera mais economia de juros, já descontando o IR sobre o investimento.

**Regra geral**: como a taxa de juros do financiamento imobiliário (9,5% a.a.) é alta, amortizar imediatamente costuma ser melhor que investir — a menos que você tenha acesso a investimentos muito rentáveis ou isentos de IR.

---

## 📤 Exportar CSV

Clique no botão **↓ Exportar CSV** no canto direito do painel da tabela.

O arquivo gerado:
- Usa **ponto-e-vírgula** como separador (padrão Excel Brasil).
- Inclui BOM UTF-8 para que acentos apareçam corretamente.
- Contém todas as parcelas ativas + parcelas eliminadas com o VP calculado.
- Nome automático: `simulacao_amortizacao_PRICE_2026-05-31.csv`.

---

## 🧮 Referências Matemáticas

### Conversão de Taxa Anual → Mensal
$$i_{mensal} = (1 + i_{anual})^{1/12} - 1$$

### Fórmula PRICE (PMT)
$$PMT = SD \cdot \frac{i \cdot (1+i)^n}{(1+i)^n - 1}$$

### Juros do Mês
$$J = SD_{anterior} \cdot i_{mensal}$$

### Amortização do Mês (PRICE)
$$A = PMT - J$$

### Amortização do Mês (SAC)
$$A = \frac{SD_{inicial}}{n_{total}}$$

### Valor Presente de uma Parcela Futura
$$VP = \frac{PMT_{futuro}}{(1 + i)^{k}}$$

Onde `k` = número de meses entre o aporte e o vencimento original da parcela.

---

## 🏗️ Estrutura do Projeto

```
src/
├── App.tsx                    # Interface principal e toda a lógica de UI
├── engine/
│   ├── amortization.ts        # Motor de simulação (PRICE/SAC + TR + seguros)
│   └── amortization.test.ts   # Testes unitários do motor
└── utils/
    └── formatters.ts          # Formatação de moeda e percentuais

regras_calculo_amortizacao.md  # Documentação técnica das regras de negócio
```

---

## ⚠️ Aviso

Este simulador é uma ferramenta educacional e de planejamento. Os valores reais podem variar conforme:
- Alterações na TR (usamos estimativa fixa).
- Reajuste de alíquotas de seguro ao longo do contrato.
- Condições específicas do contrato com a CAIXA.

Sempre consulte um gerente ou correspondente bancário para valores oficiais.
