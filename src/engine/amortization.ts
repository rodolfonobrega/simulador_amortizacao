/* eslint-disable */
export type AmortizationSystem = 'SAC' | 'PRICE';
export type ReductionType = 'PRAZO' | 'PARCELA';
export type InterestRateType = 'AM' | 'AA';

export interface ExtraPayment {
  mes: number;
  valor: number;
  tipoReducao: ReductionType;
}

export interface EliminatedInstallment {
  mesOriginal: number;
  eliminadaNoMes: number;
  valorAporte: number;
  tipoReducao: ReductionType;
  motivo: 'APORTE' | 'PAGAMENTO';
  parcelaOriginal?: number;
}

export interface AmortizationRow {
  mes: number;
  saldoInicialCorrigido: number;
  amortizacao: number;
  juros: number;
  seguroMIP: number;
  seguroDFI: number;
  tarifaAdmin: number;
  parcelaTotal: number;
  saldoDevedorFinal: number;
  aporteExtra?: number;
  tipoReducao?: ReductionType;
  pagaManualmente?: boolean;
}

export interface AmortizationParams {
  valorFinanciado: number;
  prazoMeses: number;
  taxaJuros: number;
  taxaJurosTipo: InterestRateType;
  sistema: AmortizationSystem;
  taxaTRMensalEstimada: number;
  tarifaAdministracao: number;
  aliquotaDFI: number;
  aliquotaMIPManual?: number;
  valorImovel: number;
  idadeInicial: number;
  aportes: ExtraPayment[];
  parcelasPagas?: number[];
}

export interface AmortizationResult {
  tabela: AmortizationRow[];
  eliminadas: EliminatedInstallment[];
}

export function getAlitquotaMIP(idade: number): number {
  if (idade <= 0) return 0;
  if (idade <= 25) return 0.0000929;
  if (idade <= 30) return 0.0000929;
  if (idade <= 35) return 0.0001159;
  if (idade <= 40) return 0.0001536;
  if (idade <= 45) return 0.0002519;
  if (idade <= 50) return 0.0003860;
  if (idade <= 55) return 0.0006760;
  if (idade <= 60) return 0.0012638;
  if (idade <= 65) return 0.0025065;
  if (idade <= 70) return 0.0027511;
  if (idade <= 75) return 0.0039351;
  if (idade <= 77) return 0.0045716;
  return 0.0046892;
}

export function convertInterestRate(taxa: number, de: InterestRateType, para: InterestRateType): number {
  if (de === para) return taxa;
  if (de === 'AA' && para === 'AM') {
    return (Math.pow(1 + (taxa / 100), 1 / 12) - 1) * 100;
  }
  return (Math.pow(1 + (taxa / 100), 12) - 1) * 100;
}

export function convertFinancingInterestRate(taxa: number, de: InterestRateType, para: InterestRateType): number {
  if (de === para) return taxa;
  if (de === 'AA' && para === 'AM') {
    return (Math.pow(1 + (taxa / 100), 1 / 12) - 1) * 100;
  }
  return (Math.pow(1 + (taxa / 100), 12) - 1) * 100;
}

function calculateFinancialInstallment(
  saldo: number,
  prazo: number,
  taxaMensal: number,
  sistema: AmortizationSystem
) {
  if (saldo <= 0.001 || prazo <= 0) {
    return {
      amortizacao: 0,
      juros: 0,
      prestacaoFinanceira: 0
    };
  }

  const juros = saldo * taxaMensal;
  const amortizacao = sistema === 'SAC'
    ? saldo / prazo
    : saldo * (taxaMensal / (1 - Math.pow(1 + taxaMensal, -prazo))) - juros;

  return {
    amortizacao: Math.min(amortizacao, saldo),
    juros,
    prestacaoFinanceira: amortizacao + juros
  };
}

export function generateAmortizationTable(params: AmortizationParams): AmortizationResult {
  const taxaJurosMensal = convertFinancingInterestRate(params.taxaJuros, params.taxaJurosTipo, 'AM') / 100;
  const tabelaReferencia = params.aportes.length > 0
    ? generateAmortizationTable({ ...params, aportes: [] }).tabela
    : [];

  let prazoRestante = params.prazoMeses;
  let saldoDevedor = params.valorFinanciado;
  let valorImovelAtual = params.valorImovel;
  let mes = 1;

  const tabela: AmortizationRow[] = [];
  const eliminadas: EliminatedInstallment[] = [];

  while (saldoDevedor > 0.01 && prazoRestante > 0) {
    const saldoCorrigido = saldoDevedor * (1 + (params.taxaTRMensalEstimada / 100));
    valorImovelAtual *= 1 + (params.taxaTRMensalEstimada / 100);

    const anosPassados = Math.floor(mes / 12);
    const aliquotaMIP = params.idadeInicial > 0
      ? (params.aliquotaMIPManual ?? getAlitquotaMIP(params.idadeInicial + anosPassados))
      : 0;

    const mip = saldoCorrigido * aliquotaMIP;
    const dfi = valorImovelAtual * params.aliquotaDFI;

    // Group extra payments for this month
    let valorAporteAplicado = 0;
    let tipoReducao: ReductionType | undefined;
    const aportesDoMes = params.aportes.filter(a => a.mes === mes && a.valor > 0);
    if (aportesDoMes.length > 0) {
      const aportePrazo = aportesDoMes
        .filter(a => a.tipoReducao === 'PRAZO')
        .reduce((acc, a) => acc + a.valor, 0);
      const aporteParcela = aportesDoMes
        .filter(a => a.tipoReducao === 'PARCELA')
        .reduce((acc, a) => acc + a.valor, 0);
      const valorSolicitado = aportePrazo + aporteParcela;
      tipoReducao = aportePrazo > 0 ? 'PRAZO' : 'PARCELA';
      valorAporteAplicado = Math.min(valorSolicitado, saldoCorrigido);
    }

    // Compute REGULAR installment (before any reduction)
    const parcelaRegular = calculateFinancialInstallment(
      saldoCorrigido,
      prazoRestante,
      taxaJurosMensal,
      params.sistema
    );

    // Initialize row values with regular installment (defaults)
    let saldoInicialCorrigido = saldoCorrigido;
    let amortizacaoEfetiva = parcelaRegular.amortizacao;
    let jurosEfetivos = parcelaRegular.juros;
    let saldoDevedorFinal = Math.max(0, saldoCorrigido - parcelaRegular.amortizacao);
    let parcelasMatadas = 0;
    const remainingAfterCurrent = prazoRestante - 1;

    // Apply reduction based on type and system
    if (tipoReducao === 'PRAZO' && params.sistema === 'SAC') {
      // === NEW 6-STEP ALGORITHM for SAC + PRAZO ===
      // Extra payment is applied AFTER regular amortization.
      // Maintains the target installment (amort + juros) constant.
      const SD_Atual = saldoCorrigido - parcelaRegular.amortizacao;
      const Novo_SD = SD_Atual - valorAporteAplicado;

      if (Novo_SD <= 0.01) {
        // Loan fully paid off this month
        parcelasMatadas = remainingAfterCurrent;
        saldoDevedorFinal = 0;
        prazoRestante = 1; // loop-end decrement will zero it
      } else {
        const Economia_Juros = valorAporteAplicado * taxaJurosMensal;
        const A_Teorica = parcelaRegular.amortizacao + Economia_Juros;
        const Prazo_Teorico = Novo_SD / A_Teorica;
        const Novo_Prazo = Math.max(1, Math.round(Prazo_Teorico));
        parcelasMatadas = remainingAfterCurrent - Novo_Prazo;
        saldoDevedorFinal = Novo_SD;
        if (parcelasMatadas > 0) {
          prazoRestante = Novo_Prazo + 1; // +1 compensates loop-end decrement
        }
      }

      // Record eliminated installments (from the end)
      if (parcelasMatadas > 0) {
        for (let k = 0; k < parcelasMatadas; k++) {
          const originalMonth = mes + remainingAfterCurrent - k;
          const refRow = tabelaReferencia[originalMonth - 1];
          eliminadas.push({
            mesOriginal: originalMonth,
            eliminadaNoMes: mes,
            valorAporte: valorAporteAplicado / parcelasMatadas,
            tipoReducao: 'PRAZO',
            motivo: 'APORTE',
            parcelaOriginal: refRow?.parcelaTotal,
          });
        }
      }
    } else if (tipoReducao === 'PRAZO' && params.sistema === 'PRICE') {
      // === NEW ALGORITHM for PRICE + PRAZO ===
      // Extra payment is applied AFTER regular amortization.
      // Maintains the target installment (amort + juros) constant.
      const SD_Atual = saldoCorrigido - parcelaRegular.amortizacao;
      const Novo_SD = SD_Atual - valorAporteAplicado;

      if (Novo_SD <= 0.01) {
        // Loan fully paid off this month
        parcelasMatadas = remainingAfterCurrent;
        saldoDevedorFinal = 0;
        prazoRestante = 1; // loop-end decrement will zero it
      } else {
        const PMT_Atual = parcelaRegular.prestacaoFinanceira;
        let Prazo_Teorico = 1;
        const num = 1 - (Novo_SD * taxaJurosMensal) / PMT_Atual;
        if (num > 0.0001) {
          Prazo_Teorico = -Math.log(num) / Math.log(1 + taxaJurosMensal);
        } else {
          // If interest alone is greater than PMT, fallback
          Prazo_Teorico = remainingAfterCurrent;
        }
        const Novo_Prazo = Math.max(1, Math.round(Prazo_Teorico));
        parcelasMatadas = remainingAfterCurrent - Novo_Prazo;
        saldoDevedorFinal = Novo_SD;
        if (parcelasMatadas > 0) {
          prazoRestante = Novo_Prazo + 1; // +1 compensates loop-end decrement
        }
      }

      // Record eliminated installments (from the end)
      if (parcelasMatadas > 0) {
        for (let k = 0; k < parcelasMatadas; k++) {
          const originalMonth = mes + remainingAfterCurrent - k;
          const refRow = tabelaReferencia[originalMonth - 1];
          eliminadas.push({
            mesOriginal: originalMonth,
            eliminadaNoMes: mes,
            valorAporte: valorAporteAplicado / parcelasMatadas,
            tipoReducao: 'PRAZO',
            motivo: 'APORTE',
            parcelaOriginal: refRow?.parcelaTotal,
          });
        }
      }
    } else if (tipoReducao === 'PARCELA') {
      // Extra payment is applied AFTER regular amortization.
      // The current month's installment remains unchanged.
      // The future installments will be automatically reduced by the engine 
      // since the balance is lower but the remaining term is decremented normally.
      const SD_Atual = saldoCorrigido - parcelaRegular.amortizacao;
      const Novo_SD = SD_Atual - valorAporteAplicado;
      saldoDevedorFinal = Math.max(0, Novo_SD);
    }

    const parcelaTotal = amortizacaoEfetiva + jurosEfetivos + mip + dfi + params.tarifaAdministracao;
    const parcelaPagaManualmente = new Set(params.parcelasPagas ?? []).has(mes);

    tabela.push({
      mes,
      saldoInicialCorrigido,
      amortizacao: amortizacaoEfetiva,
      juros: jurosEfetivos,
      seguroMIP: mip,
      seguroDFI: dfi,
      tarifaAdmin: params.tarifaAdministracao,
      parcelaTotal,
      saldoDevedorFinal,
      aporteExtra: valorAporteAplicado > 0 ? valorAporteAplicado : undefined,
      tipoReducao,
      pagaManualmente: parcelaPagaManualmente || undefined,
    });

    if (parcelaPagaManualmente) {
      eliminadas.push({
        mesOriginal: mes,
        eliminadaNoMes: mes,
        valorAporte: 0,
        tipoReducao: 'PRAZO',
        motivo: 'PAGAMENTO',
      });
    }

    saldoDevedor = saldoDevedorFinal;
    mes++;
    prazoRestante--;

    if (saldoDevedor <= 0.01) {
      break;
    }
  }

  return { tabela, eliminadas };
}
