import { describe, it, expect } from 'vitest';
import { 
  convertInterestRate, 
  convertFinancingInterestRate,
  generateAmortizationTable, 
  getAlitquotaMIP,
  type AmortizationParams
} from './amortization';

describe('Amortization Engine', () => {
  it('should correctly convert interest rates', () => {
    // 12% a.a. should be around 0.948879% a.m. (compound interest conversion)
    const am = convertInterestRate(12, 'AA', 'AM');
    expect(am).toBeCloseTo(0.948879, 4);

    // 1% a.m. should be around 12.6825% a.a.
    const aa = convertInterestRate(1, 'AM', 'AA');
    expect(aa).toBeCloseTo(12.6825, 4);

    expect(convertFinancingInterestRate(8.1858, 'AA', 'AM')).toBeCloseTo(0.65782, 5);
  });

  it('should get correct MIP rates by age', () => {
    expect(getAlitquotaMIP(25)).toBe(0.0000929);
    expect(getAlitquotaMIP(45)).toBe(0.0002519);
    expect(getAlitquotaMIP(70)).toBe(0.0027511);
  });

  it('should generate a standard SAC table without extra payments', () => {
    const params: AmortizationParams = {
      valorFinanciado: 100000,
      prazoMeses: 100,
      taxaJuros: 12,
      taxaJurosTipo: 'AA',
      sistema: 'SAC',
      taxaTRMensalEstimada: 0,
      tarifaAdministracao: 25,
      aliquotaDFI: 0.0001,
      valorImovel: 150000,
      idadeInicial: 30,
      aportes: []
    };

    const { tabela, eliminadas } = generateAmortizationTable(params);

    expect(tabela.length).toBe(100);
    expect(eliminadas.length).toBe(0);
    // SAC has constant amortization: 100000 / 100 = 1000
    expect(tabela[0].amortizacao).toBeCloseTo(1000, 2);
    expect(tabela[99].amortizacao).toBeCloseTo(1000, 2);
    // Balance should end at 0
    expect(tabela[99].saldoDevedorFinal).toBeCloseTo(0, 2);
  });

  it('should eliminate installments from the end when making extra payments (de trás para frente)', () => {
    const params: AmortizationParams = {
      valorFinanciado: 100000,
      prazoMeses: 100,
      taxaJuros: 12,
      taxaJurosTipo: 'AA',
      sistema: 'SAC',
      taxaTRMensalEstimada: 0,
      tarifaAdministracao: 25,
      aliquotaDFI: 0.0001,
      valorImovel: 150000,
      idadeInicial: 30,
      aportes: [
        { mes: 10, valor: 20000, tipoReducao: 'PRAZO' }
      ]
    };

    const { tabela, eliminadas } = generateAmortizationTable(params);

    // With a R$ 20,000 extra payment on month 10, the loan should end significantly earlier
    expect(tabela.length).toBeLessThan(100);
    expect(eliminadas.length).toBeGreaterThan(0);

    // The first eliminated month should be month 100 (from the back)
    const hasLastMonthEliminated = eliminadas.some(e => e.mesOriginal === 100);
    expect(hasLastMonthEliminated).toBe(true);

    // Verify all eliminated months were mapped correctly to month 10
    const allEliminatedOnMonth10 = eliminadas.every(e => e.eliminadaNoMes === 10 || e.eliminadaNoMes === tabela.length);
    expect(allEliminatedOnMonth10).toBe(true);
  });

  it('should liquidate future installments using present value', () => {
    // With 0% rate, VP = face value, so this behaves like principal abatement

    const params: AmortizationParams = {
      valorFinanciado: 300000,
      prazoMeses: 420,
      taxaJuros: 0,
      taxaJurosTipo: 'AA',
      sistema: 'SAC',
      taxaTRMensalEstimada: 0,
      tarifaAdministracao: 0,
      aliquotaDFI: 0,
      valorImovel: 400000,
      idadeInicial: 0,
      aportes: [
        { mes: 1, valor: 299285, tipoReducao: 'PRAZO' }
      ]
    };

    const { tabela, eliminadas } = generateAmortizationTable(params);

    // With 0% rate, each installment VP = amortizacao. 299285 / amortBase ≈ 418 installments
    // Loan ends in ~2 months (month 1 normal + tiny residual)
    expect(tabela.length).toBeGreaterThanOrEqual(1);
    expect(tabela.length).toBeLessThanOrEqual(3);

    // Total paid should be approximately the financed amount
    const totalPaid = tabela.reduce((acc, r) => acc + r.parcelaTotal + (r.aporteExtra || 0), 0);
    expect(totalPaid).toBeCloseTo(300000, 0);

    // All eliminated installments should have motivo APORTE
    expect(eliminadas.every(e => e.motivo === 'APORTE')).toBe(true);

    // With the new SAC+PRAZO algorithm, valorAporte is evenly divided.
    // At 0% rate, it closely approximates the face value (VP = face value).
    eliminadas.forEach(e => {
      expect(e.valorAporte).toBeCloseTo(e.parcelaOriginal ?? 0, -1);
    });
  });

  it('should liquidate installments with VP discount at 9.5% a.a.', () => {
    // With interest > 0, future installments are cheaper in VP
    // R$ 299285 in month 1 buys MORE installments than with 0% rate
    const params: AmortizationParams = {
      valorFinanciado: 300000,
      prazoMeses: 420,
      taxaJuros: 9.5,
      taxaJurosTipo: 'AA',
      sistema: 'SAC',
      taxaTRMensalEstimada: 0,
      tarifaAdministracao: 0,
      aliquotaDFI: 0,
      valorImovel: 400000,
      idadeInicial: 0,
      aportes: [
        { mes: 1, valor: 299285, tipoReducao: 'PRAZO' }
      ]
    };

    const { tabela, eliminadas } = generateAmortizationTable(params);

    const interestMonth1 = tabela[0].saldoInicialCorrigido * (convertFinancingInterestRate(9.5, 'AA', 'AM') / 100);
    const totalPaid = tabela.reduce((acc, r) => acc + r.parcelaTotal + (r.aporteExtra || 0), 0);

    // O total pago deve ser a soma do principal quitado (300k) e os juros do mês 1
    expect(totalPaid).toBeGreaterThan(300000);
    expect(tabela[0].juros).toBeCloseTo(interestMonth1, 1);

    // VP cost of each eliminated installment should be less than its nominal value
    eliminadas.forEach(e => {
      if (e.parcelaOriginal) {
        expect(e.valorAporte).toBeLessThan(e.parcelaOriginal);
      }
    });
  });

  it('should match Caixa prazo simulation with daily interest equal to zero', () => {
    const params: AmortizationParams = {
      valorFinanciado: 197948.53,
      prazoMeses: 362,
      taxaJuros: 8.1858,
      taxaJurosTipo: 'AA',
      sistema: 'SAC',
      taxaTRMensalEstimada: 0,
      tarifaAdministracao: 0,
      aliquotaDFI: 0,
      valorImovel: 218344.06,
      idadeInicial: 0,
      aportes: [
        { mes: 1, valor: 6000, tipoReducao: 'PRAZO' }
      ]
    };

    const { tabela, eliminadas } = generateAmortizationTable(params);

    expect(tabela[0].saldoInicialCorrigido).toBeCloseTo(197948.53, 2);
    expect(tabela.length).toBe(327);
    expect(eliminadas.filter(e => e.motivo === 'APORTE')).toHaveLength(35);
  });

  it('should match Caixa prestacao simulation balance with daily interest equal to zero', () => {
    const params: AmortizationParams = {
      valorFinanciado: 197948.53,
      prazoMeses: 362,
      taxaJuros: 8.1858,
      taxaJurosTipo: 'AA',
      sistema: 'SAC',
      taxaTRMensalEstimada: 0,
      tarifaAdministracao: 0,
      aliquotaDFI: 0,
      valorImovel: 218344.06,
      idadeInicial: 0,
      aportes: [
        { mes: 1, valor: 6000, tipoReducao: 'PARCELA' }
      ]
    };

    const { tabela, eliminadas } = generateAmortizationTable(params);
    const prestacaoSemAporte = 197948.53 / 362 + 197948.53 * (convertFinancingInterestRate(8.1858, 'AA', 'AM') / 100);

    // Mês 1 permanece com saldo e parcela inalterados
    expect(tabela[0].saldoInicialCorrigido).toBeCloseTo(197948.53, 2);
    expect(tabela.length).toBe(362);
    expect(tabela[0].parcelaTotal).toBeCloseTo(prestacaoSemAporte, 0); // ignoring admin fee/insurance diffs for simplicity, just checking it's the normal one

    // Mês 2 reflete a redução de parcela
    expect(tabela[1].saldoInicialCorrigido).toBeCloseTo(191948.53 - tabela[0].amortizacao, 2);
    expect(tabela[1].parcelaTotal).toBeLessThan(tabela[0].parcelaTotal);
    expect(eliminadas.filter(e => e.motivo === 'APORTE')).toHaveLength(0);
  });

  it('should match the contract insurance value using the Too Seguros preset', () => {
    const params: AmortizationParams = {
      valorFinanciado: 275040,
      prazoMeses: 420,
      taxaJuros: 9.99,
      taxaJurosTipo: 'AA',
      sistema: 'SAC',
      taxaTRMensalEstimada: 0,
      tarifaAdministracao: 25,
      aliquotaDFI: 0.000066,
      valorImovel: 350000,
      idadeInicial: 31,
      aportes: []
    };

    const { tabela } = generateAmortizationTable(params);

    expect(tabela[0].seguroMIP + tabela[0].seguroDFI).toBeCloseTo(54.98, 2);
  });

  it('should apply multiple extra payments in the same month', () => {
    const params: AmortizationParams = {
      valorFinanciado: 100000,
      prazoMeses: 100,
      taxaJuros: 12,
      taxaJurosTipo: 'AA',
      sistema: 'SAC',
      taxaTRMensalEstimada: 0,
      tarifaAdministracao: 0,
      aliquotaDFI: 0,
      valorImovel: 100000,
      idadeInicial: 0,
      aportes: [
        { mes: 1, valor: 6000, tipoReducao: 'PRAZO' },
        { mes: 1, valor: 4000, tipoReducao: 'PRAZO' }
      ]
    };

    const { tabela } = generateAmortizationTable(params);

    // aporteExtra agora é o total gasto em VP (soma dos custos de liquidação)
    // Deve ser próximo de 10000 — pequena diferença é o "troco" que não
    // compra uma parcela inteira
    expect(tabela[0].aporteExtra).toBeGreaterThan(0);
    expect(tabela[0].aporteExtra).toBeLessThanOrEqual(10000);
    expect(tabela[0].aporteExtra).toBeGreaterThan(8000);

    // O saldo devedor diminui da soma das amortizações liquidadas
    // (cada parcela liquidada remove ~1000 do principal)
    // Com VP, ~10k compra mais de 20 parcelas → saldo cai >20k
    expect(tabela[0].saldoDevedorFinal).toBeLessThan(99000);
    expect(tabela[0].saldoDevedorFinal).toBeGreaterThan(70000);
  });

  it('should mark installments as manually paid', () => {
    const params: AmortizationParams = {
      valorFinanciado: 100000,
      prazoMeses: 100,
      taxaJuros: 12,
      taxaJurosTipo: 'AA',
      sistema: 'SAC',
      taxaTRMensalEstimada: 0,
      tarifaAdministracao: 25,
      aliquotaDFI: 0.0001,
      valorImovel: 150000,
      idadeInicial: 30,
      aportes: [],
      parcelasPagas: [1, 5, 10]
    };

    const { tabela, eliminadas } = generateAmortizationTable(params);

    // Parcelas marcadas como pagas manualmente
    expect(tabela[0].pagaManualmente).toBe(true);
    expect(tabela[4].pagaManualmente).toBe(true);
    expect(tabela[9].pagaManualmente).toBe(true);

    // Parcelas não marcadas
    expect(tabela[1].pagaManualmente).toBeUndefined();

    // Devem estar nas eliminadas com motivo PAGAMENTO
    const pagasEliminadas = eliminadas.filter(e => e.motivo === 'PAGAMENTO');
    expect(pagasEliminadas.length).toBe(3);
    expect(pagasEliminadas.map(e => e.mesOriginal)).toEqual([1, 5, 10]);
  });

  it('should handle manual payments and extra payments together', () => {
    const params: AmortizationParams = {
      valorFinanciado: 100000,
      prazoMeses: 100,
      taxaJuros: 12,
      taxaJurosTipo: 'AA',
      sistema: 'SAC',
      taxaTRMensalEstimada: 0,
      tarifaAdministracao: 0,
      aliquotaDFI: 0,
      valorImovel: 100000,
      idadeInicial: 0,
      aportes: [
        { mes: 3, valor: 20000, tipoReducao: 'PRAZO' }
      ],
      parcelasPagas: [1, 2] // meses 1 e 2 pagos manualmente, mês 3 tem amortização
    };

    const { tabela, eliminadas } = generateAmortizationTable(params);

    // Meses 1 e 2: pagos manualmente
    expect(tabela[0].pagaManualmente).toBe(true);
    expect(tabela[1].pagaManualmente).toBe(true);

    // Mês 3: tem aporte extra, não é pago manualmente
    expect(tabela[2].pagaManualmente).toBeUndefined();
    expect(tabela[2].aporteExtra).toBeGreaterThan(0);
    expect(tabela[2].aporteExtra).toBeLessThanOrEqual(20000);

    // Verificar eliminadas por motivo
    const porPagamento = eliminadas.filter(e => e.motivo === 'PAGAMENTO');
    const porAporte = eliminadas.filter(e => e.motivo === 'APORTE');
    expect(porPagamento.length).toBe(2);
    expect(porAporte.length).toBeGreaterThan(0);

    // As eliminações por aporte devem ter parcelaOriginal setada
    porAporte.forEach(e => {
      expect(e.parcelaOriginal).toBeDefined();
      expect(e.parcelaOriginal).toBeGreaterThan(0);
      // VP cost deve ser menor que a parcela original (desconto)
      expect(e.valorAporte).toBeLessThan(e.parcelaOriginal!);
    });
  });

  it('should apply both manual payment AND amortization on the same month', () => {
    const params: AmortizationParams = {
      valorFinanciado: 100000,
      prazoMeses: 100,
      taxaJuros: 12,
      taxaJurosTipo: 'AA',
      sistema: 'SAC',
      taxaTRMensalEstimada: 0,
      tarifaAdministracao: 0,
      aliquotaDFI: 0,
      valorImovel: 100000,
      idadeInicial: 0,
      aportes: [
        { mes: 5, valor: 10000, tipoReducao: 'PRAZO' }
      ],
      parcelasPagas: [5] // mes 5: pago manualmente E amortizado no mesmo mes
    };

    const { tabela, eliminadas } = generateAmortizationTable(params);

    // Mes 5 deve estar pago manualmente E ter aporte extra
    const row5 = tabela.find(r => r.mes === 5);
    expect(row5).toBeDefined();
    expect(row5!.pagaManualmente).toBe(true);
    expect(row5!.aporteExtra).toBeGreaterThan(0);
    expect(row5!.aporteExtra).toBeLessThanOrEqual(10000);

    // Deve ter eliminacao PAGAMENTO para o mes 5
    const pagamento5 = eliminadas.filter(e => e.mesOriginal === 5 && e.motivo === 'PAGAMENTO');
    expect(pagamento5.length).toBe(1);

    // Deve ter eliminacoes APORTE causadas pelos R$10000 no mes 5
    const aportesDoMes5 = eliminadas.filter(e => e.eliminadaNoMes === 5 && e.motivo === 'APORTE');
    expect(aportesDoMes5.length).toBeGreaterThan(0);

    // O prazo total deve ser menor que 100 devido a amortizacao
    expect(tabela.length).toBeLessThan(100);
  });

  it('should match the user\'s real Caixa simulation screenshot', () => {
    const params: AmortizationParams = {
      valorFinanciado: 131176.30,
      prazoMeses: 224,
      taxaJuros: 7.5343,
      taxaJurosTipo: 'AA',
      sistema: 'SAC',
      taxaTRMensalEstimada: 0,
      tarifaAdministracao: 25,
      aliquotaDFI: 0.000066,
      valorImovel: 350000,
      idadeInicial: 31,
      aportes: [
        { mes: 1, valor: 229, tipoReducao: 'PRAZO' }
      ]
    };

    const { tabela, eliminadas } = generateAmortizationTable(params);

    // After month 1 monthly payment and extra payment, the remaining term is 222
    // The table length is 1 (current month) + 222 (remaining) = 223
    expect(tabela.length).toBe(223);
    expect(eliminadas.filter(e => e.motivo === 'APORTE')).toHaveLength(1);

    // Balance after regular amort (R$ 585.61) and extra payment (R$ 229).
    // Novo_SD = (131176.30 - 585.61) - 229 = 130361.69
    // (Small difference vs historical contract base amort of R$ 575.87)
    expect(tabela[0].saldoDevedorFinal).toBeCloseTo(130361.69, 1);
  });

  it('should match the user\'s real Caixa Price simulation screenshot for installment reduction', () => {
    const params: AmortizationParams = {
      valorFinanciado: 98197.73,
      prazoMeses: 306,
      taxaJuros: 4.5,
      taxaJurosTipo: 'AA',
      sistema: 'PRICE',
      taxaTRMensalEstimada: 0,
      tarifaAdministracao: 25,
      aliquotaDFI: 0.000066,
      valorImovel: 105181.89,
      idadeInicial: 31,
      aliquotaMIPManual: 0.0000358, // custom MIP rate to match the contract
      aportes: [
        { mes: 1, valor: 2499.07, tipoReducao: 'PARCELA' }
      ]
    };

    const { tabela } = generateAmortizationTable(params);

    // Mês 1 permanece com saldo e parcela inalterados
    expect(tabela[0].saldoInicialCorrigido).toBeCloseTo(98197.73, 1);
    
    // Mês 2 reflete a redução de parcela
    // After the first month's extra payment of R$ 2.499,07 and regular amort of R$ 152,78
    // The balance becomes R$ 95.545,88.
    expect(tabela[1].saldoInicialCorrigido).toBeCloseTo(98197.73 - tabela[0].amortizacao - 2499.07, 1);
    
    // With effective monthly rate, recalculated installment matches ~R$ 531.71 (finance) + insurance
    const installmentWithoutAdmin = tabela[1].parcelaTotal - tabela[1].tarifaAdmin;
    expect(installmentWithoutAdmin).toBeCloseTo(531.71, 1);
  });

  it('should not produce NaN or Infinity when the loan is fully paid off early via extra payment', () => {
    const params: AmortizationParams = {
      valorFinanciado: 10000,
      prazoMeses: 10,
      taxaJuros: 10,
      taxaJurosTipo: 'AA',
      sistema: 'PRICE',
      taxaTRMensalEstimada: 0,
      tarifaAdministracao: 25,
      aliquotaDFI: 0,
      valorImovel: 15000,
      idadeInicial: 30,
      aportes: [
        { mes: 1, valor: 10000, tipoReducao: 'PRAZO' }
      ]
    };

    const { tabela } = generateAmortizationTable(params);
    expect(tabela.length).toBe(1);
    expect(tabela[0].saldoDevedorFinal).toBe(0);
    expect(tabela[0].parcelaTotal).not.toBeNaN();
    expect(tabela[0].parcelaTotal).not.toBe(Infinity);
  });

  it('should match the user\'s simulation for PRICE + PRAZO reduction', () => {
    const params: AmortizationParams = {
      valorFinanciado: 300000,
      prazoMeses: 360,
      taxaJuros: 11,
      taxaJurosTipo: 'AA',
      sistema: 'PRICE',
      taxaTRMensalEstimada: 0,
      tarifaAdministracao: 0,
      aliquotaDFI: 0,
      valorImovel: 300000,
      idadeInicial: 0,
      aportes: [
        { mes: 1, valor: 10000, tipoReducao: 'PRAZO' }
      ]
    };

    const { tabela, eliminadas } = generateAmortizationTable(params);

    // Month 1 (index 0)
    expect(tabela[0].saldoInicialCorrigido).toBeCloseTo(300000, 2);
    expect(tabela[0].juros).toBeCloseTo(2620.38, 2);
    expect(tabela[0].amortizacao).toBeCloseTo(119.69, 2);
    expect(tabela[0].parcelaTotal).toBeCloseTo(2740.07, 2);
    expect(tabela[0].saldoDevedorFinal).toBeCloseTo(289880.31, 2);
    expect(tabela[0].aporteExtra).toBeCloseTo(10000, 2);

    // Month 2 (index 1)
    expect(tabela[1].saldoInicialCorrigido).toBeCloseTo(289880.31, 2);
    expect(tabela[1].juros).toBeCloseTo(2531.99, 2);
    expect(tabela[1].amortizacao).toBeCloseTo(208.89, 2);
    expect(tabela[1].parcelaTotal).toBeCloseTo(2740.88, 2);
    expect(tabela[1].saldoDevedorFinal).toBeCloseTo(289671.41, 2);

    // Number of eliminated installments should be 63 (359 remaining - 296 new term)
    expect(eliminadas.filter(e => e.motivo === 'APORTE')).toHaveLength(63);
  });
});
