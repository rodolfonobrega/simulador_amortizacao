import { describe, expect, it } from 'vitest';
import { simulateFGTS } from './fgts';
import { type AmortizationParams } from './amortization';

describe('FGTS simulation starting month', () => {
  const baseParams: AmortizationParams = {
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
  };

  it('should apply initial balance at month 1 by default', () => {
    const result = simulateFGTS(baseParams, {
      saldoInicial: 10000,
      depositoMensal: 500,
      taxaRendimentoAnual: 6.05,
      cicloMeses: 24
    });

    // Estratégia A should have applied the 10000 at month 1
    const rowM1 = result.estrategiaA.resultadoAmortizacao.tabela.find(r => r.mes === 1);
    expect(rowM1).toBeDefined();
    expect(rowM1!.aporteExtra).toBe(10000);

    // And deposits start building up for the next cycle at month 25 (1 + 24)
    const rowM25 = result.estrategiaA.resultadoAmortizacao.tabela.find(r => r.mes === 25);
    expect(rowM25!.aporteExtra).toBeGreaterThan(0);
  });

  it('should apply initial balance at month 12 when mesInicio is 12', () => {
    const result = simulateFGTS(baseParams, {
      saldoInicial: 15000,
      depositoMensal: 300,
      taxaRendimentoAnual: 6.05,
      cicloMeses: 24,
      mesInicio: 12
    });

    // Should not have any FGTS payment at month 1
    const rowM1 = result.estrategiaA.resultadoAmortizacao.tabela.find(r => r.mes === 1);
    expect(rowM1?.aporteExtra).toBeUndefined();

    // Should apply 15000 at month 12
    const rowM12 = result.estrategiaA.resultadoAmortizacao.tabela.find(r => r.mes === 12);
    expect(rowM12).toBeDefined();
    expect(rowM12!.aporteExtra).toBe(15000);

    // Next cycle is at month 36 (12 + 24)
    const rowM36 = result.estrategiaA.resultadoAmortizacao.tabela.find(r => r.mes === 36);
    expect(rowM36).toBeDefined();
    expect(rowM36!.aporteExtra).toBeGreaterThan(0);
  });

  it('should behave correctly for Strategy B when starting at month 12', () => {
    const result = simulateFGTS(baseParams, {
      saldoInicial: 30000,
      depositoMensal: 500,
      taxaRendimentoAnual: 6.05,
      cicloMeses: 24,
      mesInicio: 12
    });

    // Strategy B should not quit before month 12
    if (result.estrategiaB.mesQuitacao) {
      expect(result.estrategiaB.mesQuitacao).toBeGreaterThanOrEqual(12);
    }
  });
});
