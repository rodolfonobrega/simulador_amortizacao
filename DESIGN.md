---
name: Simulador de Amortização
description: Simulador financeiro imobiliário para profissionais — dark mode, dados densos, precisão visível
colors:
  deep-navy: "#0b0f19"
  night-surface: "#141928"
  subtle-divide: "rgba(255, 255, 255, 0.08)"
  arctic-white: "#f8fafc"
  steel-mist: "#94a3b8"
  signal-blue: "#38bdf8"
  deep-signal: "#0284c7"
  go-green: "#34d399"
  alert-red: "#f87171"
  caution-amber: "#fbbf24"
typography:
  body:
    fontFamily: "Inter, system-ui, -apple-system, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Inter, system-ui, -apple-system, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 500
  title:
    fontFamily: "Inter, system-ui, -apple-system, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Inter, system-ui, -apple-system, sans-serif"
    fontSize: "1.75rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.02em"
rounded:
  sm: "8px"
  md: "12px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "20px"
  2xl: "24px"
components:
  button-primary:
    backgroundColor: "{colors.signal-blue}"
    textColor: "{colors.deep-navy}"
    rounded: "{rounded.sm}"
    padding: "10px 20px"
  button-primary-hover:
    backgroundColor: "{colors.deep-signal}"
  button-secondary:
    backgroundColor: "rgba(255, 255, 255, 0.1)"
    textColor: "{colors.arctic-white}"
    rounded: "{rounded.sm}"
    padding: "10px 20px"
  panel:
    backgroundColor: "{colors.night-surface}"
    rounded: "{rounded.md}"
    padding: "{spacing.xl}"
  input:
    backgroundColor: "rgba(0, 0, 0, 0.2)"
    textColor: "{colors.arctic-white}"
    rounded: "{rounded.sm}"
    padding: "10px 14px"
---

# Design System: Simulador de Amortização

## 1. Overview

**Creative North Star: "O Centro de Controle"**

Um painel de missão para decisões financeiras. O fundo é o vácuo escuro do foco; os dados são instrumentos iluminados por pontos precisos de azul. Cada número é um indicador, cada tabela um monitor. A interface não decora — ela informa, como os consoles que controlam sistemas complexos onde clareza é segurança.

A paleta é deliberadamente contida: um azul sinalizador (`signal-blue`) carrega ações primárias e indicadores de estado, verde e âmbar marcam resultados e alertas. O resto é território neutro — camadas de navy profundo separadas por bordas sutis, não por sombras. A densidade de dados é inevitável em simulação financeira; o design cria ritmo com espaçamento generoso entre seções e tipografia que respira mesmo em tabelas compactas.

Este sistema rejeita explicitamente o tom marketizado de SaaS, a frieza burocrática de internet banking legado, e qualquer sugestão de gamificação. É uma ferramenta de trabalho para profissionais que precisam de confiança nos números.

**Key Characteristics:**
- Dark mode funcional — o fundo desaparece, os dados emergem
- Uma cor de sinal (sky blue) usada com disciplina — ações, seleções, indicadores
- Tipografia única (Inter) em hierarquia de peso, não de família
- Superfícies planas separadas por bordas e diferença tonal, não por sombras
- Interações refinadas: hover sutil, foco com glow azul preciso, transições de 200ms

## 2. Colors

A paleta de um centro de controle: fundo profundo, texto nítido, uma cor de sinalização e um conjunto semântico enxuto para estados.

### Primary
- **Signal Blue** (#38bdf8 / oklch(74% 0.16 230)): A voz ativa do sistema. Usado em ações primárias (botão "Calcular", "Adicionar"), seleção atual, links, indicadores de estado ativo, e o glow de foco em inputs. Sua raridade é o ponto — ≤10% da superfície visível em qualquer tela.
- **Deep Signal** (#0284c7 / oklch(57% 0.17 240)): Hover e pressed do primário. Mais profundo, mais firme. Nunca usado como cor de repouso.

### Neutral
- **Deep Navy** (#0b0f19 / oklch(10% 0.02 260)): O fundo da tela — o vácuo onde os dados flutuam. Um quase-preto com croma azul mínimo (0.02) para evitar o preto puro (#000) que cansa em uso prolongado.
- **Night Surface** (#141928 / oklch(14% 0.015 260)): Superfície de painéis e containers. Distingue-se do fundo por diferença tonal, não por sombra. Croma levemente azulado (0.015) consistente com o fundo.
- **Subtle Divide** (rgba(255,255,255,0.08)): Bordas e divisores. Visível o suficiente para separar superfícies, discreto o suficiente para não competir com dados.
- **Arctic White** (#f8fafc / oklch(98% 0.002 240)): Texto primário. Quase branco, com croma azul mínimo (0.002) para evitar o contraste agressivo do branco puro sobre fundo escuro.
- **Steel Mist** (#94a3b8 / oklch(68% 0.02 250)): Texto secundário, labels, placeholders. Contraste suficiente (≥4.5:1 sobre Deep Navy) sem roubar atenção do texto primário.

### Semantic
- **Go Green** (#34d399 / oklch(78% 0.15 160)): Sucesso, economia, parcelas quitadas. Usado em métricas positivas, badges de conclusão.
- **Alert Red** (#f87171 / oklch(65% 0.18 25)): Erros, remoção, ações destrutivas. Sempre acompanhado de texto explicativo.
- **Caution Amber** (#fbbf24 / oklch(85% 0.15 85)): Avisos, cenário alternativo (Cenário B). Nunca para erros bloqueantes.

### Named Rules
**The One Signal Rule.** Signal Blue é a única cor de ação no sistema. Aparece em ≤10% de qualquer tela. Se duas coisas azuis competem na mesma superfície, uma delas está no lugar errado.

**The Semantic Restraint Rule.** Verde, vermelho e âmbar só existem como resposta a dados. Nunca como decoração. Uma linha de tabela sem significado financeiro não tem cor.

**The Tonal Separation Rule.** Superfícies se distinguem por luminosidade, não por sombra. Cada camada acima do fundo adiciona ~4% de luminosidade em OKLCH, com croma constante.

## 3. Typography

**Font:** Inter (system-ui, -apple-system fallback)

Uma única família sem serifa cobre todas as necessidades. Inter foi projetada para telas — suas formas são nítidas em corpo pequeno (tabelas, labels) e mantêm caráter em corpo grande (headlines). Pesos 400, 500 e 600 são suficientes; pesos acima de 600 não são necessários e adicionariam ruído.

**Character:** Funcional com personalidade contida. A Inter não é anônima como system-ui nem expressiva como uma display. É a voz certa para dados: presente, não protagonista.

### Hierarchy
- **Headline** (600, 1.75rem, 1.2): Título da página. Só existe um — "Simulador de Amortização Avançado".
- **Title** (600, 1.25rem, 1.3, -0.02em): Títulos de seção dentro de painéis. "Parâmetros do Financiamento", "Resumo Econômico".
- **Body** (400, 1rem, 1.5): Texto de parágrafo, células de tabela, valores financeiros. `font-variant-numeric: tabular-nums` em tabelas para alinhamento preciso de dígitos.
- **Label** (500, 0.875rem): Labels de formulário, cabeçalhos de coluna, texto auxiliar. Headers de tabela em uppercase com 0.05em tracking.

### Named Rules
**The Single Family Rule.** Inter para tudo. Não há display font, não há mono para dados. A hierarquia vem do peso e tamanho, não da troca de família.

**The Tabular Data Rule.** Todo número em tabela usa `font-variant-numeric: tabular-nums`. Alinhamento de dígitos é legibilidade, e legibilidade é confiança.

## 4. Elevation

Este sistema é plano por princípio. A profundidade é transmitida por camadas tonais: Deep Navy (fundo) → Night Surface (painéis) → inputs sobre painéis (rgba(0,0,0,0.2)). Nenhuma sombra estrutural.

O box-shadow atual dos painéis e o backdrop-filter blur são vestígios de uma fase anterior e estão sendo removidos. A direção é separação puramente tonal com bordas sutis (`subtle-divide`).

O único efeito de profundidade permitido é o glow de foco em inputs (0 0 0 2px signal-blue a 20%), que é funcional — indica onde o teclado está — e não decorativo.

### Named Rules
**The Flat-By-Default Rule.** Superfícies são planas em repouso. A separação entre camadas é exclusivamente tonal e por bordas. Sem box-shadow, sem backdrop-filter.

**The Focus Glow Exception.** O anel de foco azul é o único efeito que quebra a planaridade, e apenas por razões de acessibilidade. Ele existe para o teclado, não para o olho.

## 5. Components

### Buttons
- **Shape:** Bordas arredondadas sutis (8px). Nada de cantos vivos ou pílulas.
- **Primary:** Fundo Signal Blue, texto Deep Navy, peso 600. Padding 10px 20px. Hover: Deep Signal com translateY(-1px). Focus: anel azul 2px. Transição de 200ms ease-out para background e transform.
- **Secondary:** Fundo rgba(255,255,255,0.1), texto Arctic White. Hover: fundo rgba(255,255,255,0.15). Nunca compete com o primário.
- **Ghost (ícone):** Sem fundo, sem borda. Cor de texto é steel-mist ou a cor semântica do contexto (ex: Alert Red para remover). 24px touch target mínimo.
- **Disabled:** Opacidade 50%, cursor not-allowed. Nunca escondido — o botão existe, só não está disponível.

### Cards / Containers (Painéis)
- **Corner Style:** 12px radius.
- **Background:** Night Surface (#141928).
- **Border:** Subtle Divide (rgba(255,255,255,0.08)).
- **Padding:** 20px interno.
- **Shadow Strategy:** Nenhuma. Separação puramente tonal.

### Inputs / Fields
- **Style:** Fundo rgba(0,0,0,0.2), borda Subtle Divide, radius 8px, padding 10px 14px.
- **Focus:** Borda Signal Blue + box-shadow 0 0 0 2px rgba(56,189,248,0.2). Transição 200ms ease.
- **Placeholder:** Steel Mist (não um cinza mais claro — ≥4.5:1 sobre o fundo do input).
- **Disabled:** Opacidade 50%, cursor not-allowed.
- **Select:** Mesmo estilo visual do input. Dropdown nativo estilizado para consistência.
- **Checkbox:** 18px × 18px, borda Subtle Divide, fundo escuro. Checked: fundo Signal Blue.

### Table
- **Style:** Largura total, `border-collapse: collapse`, `font-variant-numeric: tabular-nums`.
- **Headers:** Fundo Deep Navy, texto Steel Mist, uppercase, 0.85rem, tracking 0.05em. Sticky no topo (z-index 10).
- **Rows:** Altura confortável (padding 12px 16px). Hover: fundo rgba(255,255,255,0.03).
- **Row variants:** `.highlight-row` (fundo Go Green a 8%) para parcelas com aporte extra. `.paid-row` (fundo cyan a 6%) para parcelas pagas manualmente.
- **Last row:** Sem borda inferior.
- **Scroll:** Container com max-height e overflow-y auto. Scrollbar fina (8px) estilizada com cores do tema.

### Currency Input
- **Style:** Máscara BRL integrada. Idêntico ao input padrão, com largura mínima de 140px.
- **Formato:** `R$ 1.234,56` — separador de milhar como ponto, decimal como vírgula (pt-BR).

### Chart (Recharts)
- **Pie:** Inner radius 35px, outer 55px. Cores fixas por categoria (Signal Blue para amortizado, Alert Red para juros, Go Green para seguros/tarifas). Labels com percentual.
- **Line:** Grid sutil (rgba(255,255,255,0.05), dash 3 3). Linhas com stroke 2px. Tooltip com fundo Night Surface.

## 6. Do's and Don'ts

### Do:
- **Do** usar Signal Blue exclusivamente para ações primárias, seleção e indicadores de estado — nunca como decoração.
- **Do** manter contraste ≥4.5:1 para todo texto de corpo, inclusive placeholders.
- **Do** usar `tabular-nums` em toda tabela e valor financeiro.
- **Do** separar superfícies por diferença tonal e bordas sutis, nunca por sombras.
- **Do** manter transições em 150–250ms com ease-out. O usuário está em fluxo.
- **Do** usar os pesos 400, 500 e 600 da Inter. Nada acima de 600.
- **Do** prefixar classes de componente com namespaces claros (`.btn-`, `.input-`, `.glass-panel` → `.panel-`).

### Don't:
- **Don't** usar glassmorphism ou backdrop-filter como padrão visual. Superfícies são planas.
- **Don't** usar box-shadow para separar painéis ou containers. Borda tonal é suficiente.
- **Don't** usar gradientes de marketing, hero sections, ou scroll-driven storytelling. Isso é ferramenta de trabalho.
- **Don't** usar ilustrações, animações decorativas ou tom brincalhão. Finanças sérias não são gamificadas.
- **Don't** cair na aparência de internet banking legado (tabelas cinzas infinitas, campos quadrados, fontes genéricas de sistema).
- **Don't** usar mais de uma família tipográfica. Inter cobre tudo.
- **Don't** usar `border-left` ou `border-right` > 1px como acento colorido em cards ou listas.
- **Don't** usar caixa alta em corpo de texto. Reservado para labels ≤4 palavras e cabeçalhos de tabela.
- **Don't** inventar affordances não-padrão para interações padrão. Input é input, select é select.
- **Don't** omitir estados de componente. Todo interativo precisa de default, hover, focus, active e disabled.
