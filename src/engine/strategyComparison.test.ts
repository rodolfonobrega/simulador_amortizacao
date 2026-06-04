import { describe, expect, it } from 'vitest';
import { compareAmortizationStrategies } from './strategyComparison';

describe('strategy comparison', () => {
  it('should compute real strategic comparison and return correct recommendations', () => {
    const result = compareAmortizationStrategies({
      amortizationParams: {
        valorFinanciado: 100000,
        prazoMeses: 120,
        taxaJuros: 10,
        taxaJurosTipo: 'AA',
        sistema: 'SAC',
        taxaTRMensalEstimada: 0,
        tarifaAdministracao: 25,
        aliquotaDFI: 0.005,
        valorImovel: 150000,
        idadeInicial: 30,
        aportes: []
      },
      baseline: {
        prazoOriginal: 120,
        jurosSemAportes: 50000
      },
      investment: {
        valor: 10000,
        taxa: 0.6,
        taxaTipo: 'AM',
        meses: 60
      }
    });

    // Custo Total de Hoje (Cenário A) deve ser:
    // soma das parcelas + 10000 (pois os 10k foram totalmente amortizados no mês 1)
    const sumHojeInstallments = result.hoje.resultadoAmortizacao.tabela.reduce((acc, r) => acc + r.parcelaTotal, 0);
    expect(result.hoje.custoTotal).toBeCloseTo(sumHojeInstallments + 10000, 1);

    // Custo Total de Depois (Cenário B) deve ser:
    // soma das parcelas + (10000 - leftover)
    const tabB = result.depois.resultadoAmortizacao.tabela;
    const rowAporte = tabB.find(r => r.mes === 60);
    const applied = rowAporte ? (rowAporte.aporteExtra || 0) : 0;
    
    // O valor futuro esperado dos 10k após 60 meses rendendo 0.6% a.m., líquido de IR (15%)
    const grossFV = 10000 * Math.pow(1 + 0.006, 60);
    const profit = grossFV - 10000;
    const netFV = 10000 + profit * (1 - 0.15); // 15% de IR para mais de 24 meses
    const leftover = netFV - applied;

    const sumDepoisInstallments = tabB.reduce((acc, r) => acc + r.parcelaTotal, 0);
    expect(result.depois.custoTotal).toBeCloseTo(sumDepoisInstallments + (10000 - leftover), 1);
  });
});
