import {
  generateAmortizationTable,
  convertInterestRate,
  type AmortizationParams,
  type InterestRateType,
  type AmortizationResult,
} from './amortization';
import { simulateInvestment } from './investment';

export interface StrategyComparisonInvestment {
  valor: number;
  taxa: number;
  taxaTipo: InterestRateType;
  meses: number;
}

export interface StrategyComparisonBaseline {
  prazoOriginal: number;
  jurosSemAportes: number;
}

export interface StrategyComparisonInput {
  amortizationParams: AmortizationParams;
  baseline: StrategyComparisonBaseline;
  investment: StrategyComparisonInvestment;
}

export interface StrategyComparisonSummary {
  parcelasMortas: number;
  jurosSalvos: number;
  custoTotal: number;
  valorPresente: number;
  resultadoAmortizacao: AmortizationResult;
  /** Juros do investimento que abateram a dívida — dinheiro "de graça" que não saiu do bolso */
  jurosGanhos: number;
  /** Principal comprometido pelo usuário (valor inicial investido) */
  principal: number;
}

export interface StrategyComparisonResult {
  hoje: StrategyComparisonSummary;
  depois: StrategyComparisonSummary;
  recommendation: 'HOJE' | 'DEPOIS';
}

function summarize(
  baseline: StrategyComparisonBaseline,
  result: AmortizationResult,
  taxaRendimentoMensal: number,
  principal: number,
  futureValue: number,
  mesAporte: number
): StrategyComparisonSummary {
  // Encontra o aporte efetivamente aplicado no mês do aporte estratégico
  const rowAporte = result.tabela.find(r => r.mes === mesAporte);
  const applied = rowAporte ? (rowAporte.aporteExtra || 0) : 0;
  
  // O que sobrou do investimento (caso o saldo devedor fosse menor que o valor acumulado)
  const leftover = futureValue - applied;
  
  // Juros ganhos = rendimento do investimento que foi aplicado na dívida (não saiu do bolso)
  // Para o caso "hoje": não há espera, portanto não há juros ganhos (futureValue === principal)
  // Para o caso "depois": jurosGanhos = ganho do investimento aplicado à dívida
  const investmentGain = Math.max(0, futureValue - principal); // total gain
  const gainAppliedToDebt = applied > 0 ? Math.min(investmentGain, applied) : 0;
  const jurosGanhos = gainAppliedToDebt;
  
  // O custo out-of-pocket nominal real é a soma das parcelas mais a diferença (principal - leftover)
  const custoTotal = result.tabela.reduce((acc, r) => acc + r.parcelaTotal, 0) + (principal - leftover);
  
  // O valor presente também desconta o leftover acumulado
  const valorPresente = result.tabela.reduce(
    (acc, r) => acc + r.parcelaTotal / Math.pow(1 + taxaRendimentoMensal / 100, r.mes),
    0
  ) + (principal - leftover / Math.pow(1 + taxaRendimentoMensal / 100, mesAporte));

  return {
    parcelasMortas: baseline.prazoOriginal - result.tabela.length,
    jurosSalvos: baseline.jurosSemAportes - result.tabela.reduce((acc, r) => acc + r.juros, 0),
    custoTotal,
    valorPresente,
    resultadoAmortizacao: result,
    jurosGanhos,
    principal,
  };
}

export function compareAmortizationStrategies({
  amortizationParams,
  baseline,
  investment,
}: StrategyComparisonInput): StrategyComparisonResult {
  const taxaRendimentoMensal = convertInterestRate(investment.taxa, investment.taxaTipo, 'AM');
  const simInvestimento = simulateInvestment({
    valorInvestido: investment.valor,
    meses: investment.meses,
    taxaJurosMensal: taxaRendimentoMensal
  });

  const resultadoHoje = generateAmortizationTable({
    ...amortizationParams,
    aportes: [{ mes: 1, valor: investment.valor, tipoReducao: 'PRAZO' }]
  });

  const resultadoDepois = generateAmortizationTable({
    ...amortizationParams,
    aportes: [{ mes: investment.meses, valor: simInvestimento.valorLiquido, tipoReducao: 'PRAZO' }]
  });

  const hoje = summarize(baseline, resultadoHoje, taxaRendimentoMensal, investment.valor, investment.valor, 1);
  const depois = summarize(baseline, resultadoDepois, taxaRendimentoMensal, investment.valor, simInvestimento.valorLiquido, investment.meses);

  return {
    hoje,
    depois,
    recommendation: hoje.custoTotal <= depois.custoTotal ? 'HOJE' : 'DEPOIS'
  };
}
