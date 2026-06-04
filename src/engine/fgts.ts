/* eslint-disable */
import { 
  type AmortizationParams, 
  type AmortizationResult, 
  type ExtraPayment, 
  generateAmortizationTable,
  convertInterestRate 
} from './amortization';

export interface FGTSParams {
  saldoInicial: number;
  depositoMensal: number;
  taxaRendimentoAnual: number; // ex: 6.05 (para 6.05% ao ano, considerando a distribuição de lucros)
  cicloMeses: number; // ex: 24
  mesInicio?: number; // mês do contrato em que a simulação/aporte inicial acontece
}

export interface FGTSStrategyResult {
  resultadoAmortizacao: AmortizationResult;
  mesesTotal: number;
  jurosTotal: number;
  saldoFgtsSobrante: number;
  valorPresente: number;
  /** Custo nominal bruto: parcelas + capital FGTS contribuído − saldo sobrante */
  custoNominal: number;
  /** Juros do FGTS que foram usados para amortizar (dinheiro "de graça", não saiu do bolso) */
  jurosFGTSUsados: number;
  /** Custo real do bolso = custoNominal − jurosFGTSUsados */
  custoRealDoBolso: number;
  /** Total de capital FGTS contribuído (saldoInicial + depositoMensal × meses) */
  totalCapitalFGTS: number;
  /** Soma de todas as parcelas pagas do bolso */
  totalParcelas: number;
  /** Quantidade de parcelas pagas */
  qtdParcelas: number;
  /** Mês do primeiro saque de FGTS (null se nunca sacou) */
  primeiroSaque: number | null;
  /** Mês do último saque de FGTS (null se nunca sacou) */
  ultimoSaque: number | null;
  /** Total efetivamente sacado do FGTS e aplicado na dívida */
  totalSacadoFGTS: number;
  /** Quanto do totalSacadoFGTS veio de depósitos do empregador */
  totalSacadoDepositos: number;
  /** Quanto do totalSacadoFGTS veio de rendimento acumulado */
  totalSacadoRendimento: number;
  /** Capital FGTS remanescente após o último saque (para cálculo de custo de oportunidade) */
  capitalFGTSPosUltimoSaque: number;
  /** Rendimento FGTS remanescente após o último saque (para cálculo de custo de oportunidade) */
  interestFGTSPosUltimoSaque: number;
  /** Saldo projetado de FGTS ao final do período comparativo (maxMes) */
  saldoFgtsProjetadoFim: number;
}

export interface FGTSSimulationResult {
  estrategiaA: FGTSStrategyResult;
  estrategiaB: FGTSStrategyResult & { mesQuitacao: number | null };
}

export function simulateFGTS(
  amortizationParams: AmortizationParams,
  fgtsParams: FGTSParams
): FGTSSimulationResult {
  const taxaFgtsMensal = convertInterestRate(fgtsParams.taxaRendimentoAnual, 'AA', 'AM') / 100;
  const mesInicio = fgtsParams.mesInicio && fgtsParams.mesInicio >= 1 ? fgtsParams.mesInicio : 1;
  
  // ==========================================
  // ESTRATÉGIA A: Amortização Periódica
  // ==========================================
  const fgtsAportesA: ExtraPayment[] = [];
  
  // O saldo inicial do FGTS é amortizado imediatamente no mês de início (hoje)
  if (fgtsParams.saldoInicial > 0 && mesInicio <= amortizationParams.prazoMeses) {
    fgtsAportesA.push({
      mes: mesInicio,
      valor: fgtsParams.saldoInicial,
      tipoReducao: 'PRAZO'
    });
  }

  let saldoFgtsA = 0; // O saldo inicial foi usado imediatamente

  // Depósitos mensais acumulam a partir do mês de início + 1 e amortizam a cada cicloMeses
  for (let mes = mesInicio + 1; mes <= amortizationParams.prazoMeses; mes++) {
    saldoFgtsA = saldoFgtsA * (1 + taxaFgtsMensal) + fgtsParams.depositoMensal;

    // Amortiza periodicamente a cada 'cicloMeses' contados a partir de mesInicio
    if ((mes - mesInicio) % fgtsParams.cicloMeses === 0) {
      fgtsAportesA.push({
        mes: mes,
        valor: saldoFgtsA,
        tipoReducao: 'PRAZO'
      });
      saldoFgtsA = 0; // Zera o caixa para o próximo ciclo
    }
  }

  const paramsA = {
    ...amortizationParams,
    aportes: [...(amortizationParams.aportes || []), ...fgtsAportesA]
  };

  
  const resultadoA = generateAmortizationTable(paramsA);
  
  // Recalcular saldo sobrante real + split capital/juros da Estratégia A
  let saldoFgtsRealA = 0;
  const mesFimA = resultadoA.tabela.length > 0 ? resultadoA.tabela[resultadoA.tabela.length - 1].mes : 0;

  // Track capital and interest separately to compute jurosFGTSUsadosA
  let capitalA = 0;   // deposits only (no interest compounding)
  let interestA = 0;  // accumulated interest in the FGTS balance
  let jurosFGTSUsadosA = 0;

  // Novos trackings para custo de oportunidade
  let primeiroSaqueA: number | null = null;
  let ultimoSaqueA: number | null = null;
  let totalSacadoFgtsA = 0;
  let capitalPosUltimoSaqueA = 0;
  let interestPosUltimoSaqueA = 0;

  if (mesFimA >= mesInicio) {
    const rowInicio = resultadoA.tabela.find(r => r.mes === mesInicio);
    const appliedInicio = rowInicio ? Math.min(fgtsParams.saldoInicial, rowInicio.aporteExtra || 0) : 0;

    // At mesInicio: saldoInicial is pure capital (no interest yet)
    // What remains after the initial application stays in FGTS
    capitalA = fgtsParams.saldoInicial - appliedInicio;
    interestA = 0;
    saldoFgtsRealA = capitalA;

    if (appliedInicio > 0) {
      primeiroSaqueA = mesInicio;
      ultimoSaqueA = mesInicio;
      totalSacadoFgtsA += appliedInicio;
    }
    capitalPosUltimoSaqueA = capitalA;
    interestPosUltimoSaqueA = 0;

    for (let mes = mesInicio + 1; mes <= mesFimA; mes++) {
      // Interest earned this month on previous balance
      const earned = (capitalA + interestA) * taxaFgtsMensal;
      interestA += earned;
      capitalA += fgtsParams.depositoMensal;
      saldoFgtsRealA = capitalA + interestA;

      if ((mes - mesInicio) % fgtsParams.cicloMeses === 0) {
        const row = resultadoA.tabela.find(r => r.mes === mes);
        const rowAporte = row ? (row.aporteExtra || 0) : 0;
        const totalBalance = capitalA + interestA;
        const appliedFromFgts = Math.min(totalBalance, rowAporte);

        if (totalBalance > 0) {
          if (appliedFromFgts > 0) {
            if (primeiroSaqueA === null) primeiroSaqueA = mes;
            ultimoSaqueA = mes;
            totalSacadoFgtsA += appliedFromFgts;
          }
          const interestFraction = interestA / totalBalance;
          jurosFGTSUsadosA += interestFraction * appliedFromFgts;
          const capitalFraction = 1 - interestFraction;
          capitalA -= capitalFraction * appliedFromFgts;
          interestA -= interestFraction * appliedFromFgts;
          capitalPosUltimoSaqueA = capitalA;
          interestPosUltimoSaqueA = interestA;
        }
        saldoFgtsRealA = capitalA + interestA;
      }
    }
  } else {
    // Se o contrato acabou antes do mês de início
    saldoFgtsRealA = fgtsParams.saldoInicial;
    capitalA = fgtsParams.saldoInicial;
    interestA = 0;
    capitalPosUltimoSaqueA = capitalA;
    interestPosUltimoSaqueA = 0;
  }

  const jurosTotalA = resultadoA.tabela.reduce((acc, row) => acc + row.juros, 0);
  const parcelasTotalA = resultadoA.tabela.reduce((acc, row) => acc + row.parcelaTotal, 0);
  // Total sacado de depósitos = total sacado − rendimento usado
  const totalSacadoDepositosA = totalSacadoFgtsA - jurosFGTSUsadosA;

  // Total capital the user committed to FGTS (initial + monthly deposits up to mesFimA)
  const totalDepositsA = mesFimA >= mesInicio ? fgtsParams.depositoMensal * (mesFimA - mesInicio) : 0;
  const totalCapitalFGTSA = fgtsParams.saldoInicial + totalDepositsA;
  // Nominal cost: installments + FGTS capital committed − remaining FGTS balance (capital + interest)
  const custoNominalA = parcelasTotalA + totalCapitalFGTSA - saldoFgtsRealA;
  // Real cost: subtract the FGTS interest that did the "work" (never left user's pocket)
  const custoRealDoBolsoA = custoNominalA - jurosFGTSUsadosA;

  // ==========================================
  // ESTRATÉGIA B: Acúmulo e Quitação
  // ==========================================
  const tabelaBaseB = generateAmortizationTable(amortizationParams).tabela;
  
  const fgtsAportesB: ExtraPayment[] = [];
  let saldoFgtsB = 0;
  let mesQuitacaoB: number | null = null;
  let saldoFgtsRestanteB = 0;
  
  // Track capital/interest split for B
  let capitalB = 0;
  let interestB = 0;
  let jurosFGTSUsadosB = 0;

  // Novos trackings para custo de oportunidade
  let totalSacadoFgtsB = 0;

  for (const row of tabelaBaseB) {
    if (row.mes < mesInicio) {
      continue;
    }

    if (row.mes === mesInicio) {
      saldoFgtsB = fgtsParams.saldoInicial;
      capitalB = fgtsParams.saldoInicial;
      interestB = 0;
    } else {
      const earned = (capitalB + interestB) * taxaFgtsMensal;
      interestB += earned;
      capitalB += fgtsParams.depositoMensal;
      saldoFgtsB = capitalB + interestB;
    }

    if (saldoFgtsB >= row.saldoDevedorFinal) {
      mesQuitacaoB = row.mes;
      const applied = row.saldoDevedorFinal;
      fgtsAportesB.push({
        mes: mesQuitacaoB,
        valor: applied,
        tipoReducao: 'PRAZO'
      });
      totalSacadoFgtsB = applied;
      const totalBalance = capitalB + interestB;
      if (totalBalance > 0) {
        const interestFraction = interestB / totalBalance;
        jurosFGTSUsadosB = interestFraction * applied;
        capitalB -= (1 - interestFraction) * applied;
        interestB -= interestFraction * applied;
      }
      saldoFgtsRestanteB = capitalB + interestB;
      break;
    }
  }

  const primeiroSaqueB: number | null = mesQuitacaoB;
  const ultimoSaqueB: number | null = mesQuitacaoB;
  const totalSacadoDepositosB = totalSacadoFgtsB - jurosFGTSUsadosB;
  const capitalPosUltimoSaqueB = capitalB;
  const interestPosUltimoSaqueB = interestB;

  const paramsB = {
    ...amortizationParams,
    aportes: [...(amortizationParams.aportes || []), ...fgtsAportesB]
  };

  const resultadoB = generateAmortizationTable(paramsB);
  const jurosTotalB = resultadoB.tabela.reduce((acc, row) => acc + row.juros, 0);
  const parcelasTotalB = resultadoB.tabela.reduce((acc, row) => acc + row.parcelaTotal, 0);
  const mesFimB = resultadoB.tabela.length > 0 ? resultadoB.tabela[resultadoB.tabela.length - 1].mes : 0;

  if (mesQuitacaoB === null) {
    const lastRow = tabelaBaseB[tabelaBaseB.length - 1];
    if (lastRow && lastRow.mes >= mesInicio) {
      let finalCapital = fgtsParams.saldoInicial;
      let finalInterest = 0;
      for (let mes = mesInicio + 1; mes <= lastRow.mes; mes++) {
        const earned = (finalCapital + finalInterest) * taxaFgtsMensal;
        finalInterest += earned;
        finalCapital += fgtsParams.depositoMensal;
      }
      saldoFgtsRestanteB = finalCapital + finalInterest;
      capitalB = finalCapital;
      interestB = finalInterest;
    } else {
      saldoFgtsRestanteB = fgtsParams.saldoInicial;
      capitalB = fgtsParams.saldoInicial;
      interestB = 0;
    }
  }

  // Total capital committed to FGTS for B (up to the month FGTS was last relevant)
  const mesEffimB = mesQuitacaoB !== null ? mesQuitacaoB : mesFimB;
  const totalDepositsB = mesEffimB >= mesInicio ? fgtsParams.depositoMensal * (mesEffimB - mesInicio) : 0;
  const totalCapitalFGTSB = fgtsParams.saldoInicial + totalDepositsB;
  const custoNominalB = parcelasTotalB + totalCapitalFGTSB - saldoFgtsRestanteB;
  const custoRealDoBolsoB = custoNominalB - jurosFGTSUsadosB;

  // Desconto a valor presente usando o rendimento do FGTS como taxa de oportunidade
  const valorPresenteA = resultadoA.tabela.reduce(
    (acc, row) => acc + (row.parcelaTotal + (row.aporteExtra || 0)) / Math.pow(1 + taxaFgtsMensal, row.mes),
    0
  );

  const valorPresenteB = resultadoB.tabela.reduce(
    (acc, row) => acc + (row.parcelaTotal + (row.aporteExtra || 0)) / Math.pow(1 + taxaFgtsMensal, row.mes),
    0
  );

  const maxMes = Math.max(mesFimA, mesFimB);

  const projectFGTS = (startBal: number, from: number, to: number) => {
    let bal = startBal;
    for (let m = from; m <= to; m++) {
      bal = bal * (1 + taxaFgtsMensal) + fgtsParams.depositoMensal;
    }
    return bal;
  };

  const saldoFgtsProjetadoFimA = mesFimA < maxMes
    ? projectFGTS(saldoFgtsRealA, mesFimA + 1, maxMes)
    : saldoFgtsRealA;

  const saldoFgtsProjetadoFimB = mesFimB < maxMes
    ? projectFGTS(saldoFgtsRestanteB, mesFimB + 1, maxMes)
    : saldoFgtsRestanteB;

  return {
    estrategiaA: {
      resultadoAmortizacao: resultadoA,
      mesesTotal: mesFimA,
      jurosTotal: jurosTotalA,
      saldoFgtsSobrante: saldoFgtsRealA,
      valorPresente: valorPresenteA,
      custoNominal: custoNominalA,
      jurosFGTSUsados: jurosFGTSUsadosA,
      custoRealDoBolso: custoRealDoBolsoA,
      totalCapitalFGTS: totalCapitalFGTSA,
      totalParcelas: parcelasTotalA,
      qtdParcelas: resultadoA.tabela.length,
      primeiroSaque: primeiroSaqueA,
      ultimoSaque: ultimoSaqueA,
      totalSacadoFGTS: totalSacadoFgtsA,
      totalSacadoDepositos: totalSacadoDepositosA,
      totalSacadoRendimento: jurosFGTSUsadosA,
      capitalFGTSPosUltimoSaque: capitalPosUltimoSaqueA,
      interestFGTSPosUltimoSaque: interestPosUltimoSaqueA,
      saldoFgtsProjetadoFim: saldoFgtsProjetadoFimA,
    },
    estrategiaB: {
      resultadoAmortizacao: resultadoB,
      mesesTotal: mesFimB,
      jurosTotal: jurosTotalB,
      saldoFgtsSobrante: saldoFgtsRestanteB,
      mesQuitacao: mesQuitacaoB,
      valorPresente: valorPresenteB,
      custoNominal: custoNominalB,
      jurosFGTSUsados: jurosFGTSUsadosB,
      custoRealDoBolso: custoRealDoBolsoB,
      totalCapitalFGTS: totalCapitalFGTSB,
      totalParcelas: parcelasTotalB,
      qtdParcelas: resultadoB.tabela.length,
      primeiroSaque: primeiroSaqueB,
      ultimoSaque: ultimoSaqueB,
      totalSacadoFGTS: totalSacadoFgtsB,
      totalSacadoDepositos: totalSacadoDepositosB,
      totalSacadoRendimento: jurosFGTSUsadosB,
      capitalFGTSPosUltimoSaque: capitalPosUltimoSaqueB,
      interestFGTSPosUltimoSaque: interestPosUltimoSaqueB,
      saldoFgtsProjetadoFim: saldoFgtsProjetadoFimB,
    }
  };
}

// ==========================================
// CUSTO DE OPORTUNIDADE: Comparação entre Estratégia A e B
// ==========================================

export interface OpportunityCostResult {
  /** Quantos meses a mais o FGTS ficou rendendo no cenário B */
  mesesExtrasRendendo: number;
  /** Diferença de montante final: saldo B − saldo A simulado no mês do saque de B */
  bonusMontanteFinal: number;
  /** Rendimento (juros) gerado pelo FGTS durante os meses extras */
  bonusRendimentoPeriodo: number;
  /** Texto de conclusão automático */
  conclusao: string;
}

/** Simula o saldo do FGTS mês a mês, retornando capital, rendimento e total de juros gerados */
function simulateFGTSBalance(
  startCapital: number,
  startInterest: number,
  depositoMensal: number,
  taxaMensal: number,
  fromMonth: number,
  toMonth: number
): { capital: number; interest: number; totalInterestGenerated: number } {
  let capital = startCapital;
  let interest = startInterest;
  let totalInterest = 0;

  for (let m = fromMonth; m <= toMonth; m++) {
    const earned = (capital + interest) * taxaMensal;
    interest += earned;
    totalInterest += earned;
    capital += depositoMensal;
  }

  return { capital, interest, totalInterestGenerated: totalInterest };
}

function fmtEngine(value: number): string {
  return 'R$ ' + value.toFixed(2).replace('.', ',');
}

export function computeFGTSCostOfOpportunity(
  result: FGTSSimulationResult,
  fgtsParams: FGTSParams
): OpportunityCostResult | null {
  const A = result.estrategiaA;
  const B = result.estrategiaB;

  // Ambos os cenários precisam ter sacado FGTS para comparar
  if (A.ultimoSaque === null || B.ultimoSaque === null) {
    return null;
  }

  const mesesExtras = B.ultimoSaque - A.ultimoSaque;
  if (mesesExtras <= 0) {
    return null; // B não segurou o FGTS por mais tempo que A
  }

  const taxaMensal = convertInterestRate(fgtsParams.taxaRendimentoAnual, 'AA', 'AM') / 100;
  const mesInicio = fgtsParams.mesInicio && fgtsParams.mesInicio >= 1 ? fgtsParams.mesInicio : 1;

  // --- Bônus de Montante Final ---
  // Simula o FGTS da estratégia A de ultimoSaqueA+1 até ultimoSaqueB
  // (A começa do saldo residual pós-saque e acumula depósitos + rendimento)
  const simA = simulateFGTSBalance(
    A.capitalFGTSPosUltimoSaque,
    A.interestFGTSPosUltimoSaque,
    fgtsParams.depositoMensal,
    taxaMensal,
    A.ultimoSaque + 1,
    B.ultimoSaque
  );
  const fgtsA_noMesB = simA.capital + simA.interest;
  const fgtsB_residual = B.capitalFGTSPosUltimoSaque + B.interestFGTSPosUltimoSaque;
  const bonusMontanteFinal = fgtsB_residual - fgtsA_noMesB;

  // --- Bônus de Rendimento no Período Extra ---
  // Calcula o saldo do FGTS da estratégia B no mês do último saque de A
  let capitalB_atA: number;
  let interestB_atA: number;

  if (A.ultimoSaque < mesInicio) {
    capitalB_atA = 0;
    interestB_atA = 0;
  } else if (A.ultimoSaque === mesInicio) {
    capitalB_atA = fgtsParams.saldoInicial;
    interestB_atA = 0;
  } else {
    const simB_toA = simulateFGTSBalance(
      fgtsParams.saldoInicial,
      0,
      fgtsParams.depositoMensal,
      taxaMensal,
      mesInicio + 1,
      A.ultimoSaque
    );
    capitalB_atA = simB_toA.capital;
    interestB_atA = simB_toA.interest;
  }

  // Rendimento gerado pelo FGTS de B durante os meses extras
  const simB_extra = simulateFGTSBalance(
    capitalB_atA,
    interestB_atA,
    fgtsParams.depositoMensal,
    taxaMensal,
    A.ultimoSaque + 1,
    B.ultimoSaque
  );
  const bonusRendimentoPeriodo = simB_extra.totalInterestGenerated;

  // --- Texto de Conclusão ---
  const diffParcelas = B.totalParcelas - A.totalParcelas;
  const saldo = bonusRendimentoPeriodo - diffParcelas;

  let conclusao: string;
  if (diffParcelas > 0 && saldo > 0) {
    conclusao =
      `No cenário B você pagou ${fmtEngine(diffParcelas)} a mais em parcelas, ` +
      `mas o FGTS rendeu ${fmtEngine(bonusRendimentoPeriodo)} a mais por ficar investido ${mesesExtras} meses extras. ` +
      `Como ${fmtEngine(bonusRendimentoPeriodo)} > ${fmtEngine(diffParcelas)}, ` +
      `o saldo positivo de ${fmtEngine(saldo)} veio inteiramente de juros — não saiu do seu bolso.`;
  } else if (diffParcelas > 0 && saldo <= 0) {
    conclusao =
      `No cenário B você pagou ${fmtEngine(diffParcelas)} a mais em parcelas, ` +
      `enquanto o FGTS rendeu apenas ${fmtEngine(bonusRendimentoPeriodo)} a mais nos ${mesesExtras} meses extras. ` +
      `O custo extra de ${fmtEngine(Math.abs(saldo))} superou o ganho de rendimento — ` +
      `nesse caso, sacar antes (Estratégia A) teria sido melhor.`;
  } else if (diffParcelas <= 0) {
    conclusao =
      `No cenário B você pagou ${fmtEngine(Math.abs(diffParcelas))} a menos em parcelas ` +
      `E o FGTS ainda rendeu ${fmtEngine(bonusRendimentoPeriodo)} a mais por ficar investido ${mesesExtras} meses extras. ` +
      `A Estratégia B ganha dos dois lados — menos parcelas e mais rendimento.`;
  } else {
    conclusao =
      `No cenário B você pagou ${fmtEngine(diffParcelas)} a mais em parcelas, ` +
      `e o FGTS rendeu ${fmtEngine(bonusRendimentoPeriodo)} a mais nos ${mesesExtras} meses extras. ` +
      `Um empate técnico — a diferença é irrelevante.`;
  }

  return {
    mesesExtrasRendendo: mesesExtras,
    bonusMontanteFinal,
    bonusRendimentoPeriodo,
    conclusao,
  };
}
