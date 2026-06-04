import { describe, it, expect } from 'vitest';
import { simulateInvestment, calcularAliquotaIR } from './investment';

describe('Investment Engine', () => {
  it('should compute the correct tax rate based on Brazilian Regressive IR table', () => {
    expect(calcularAliquotaIR(3)).toBe(0.225); // <= 6 months
    expect(calcularAliquotaIR(10)).toBe(0.20);  // <= 12 months
    expect(calcularAliquotaIR(18)).toBe(0.175); // <= 24 months
    expect(calcularAliquotaIR(36)).toBe(0.15);  // > 24 months
  });

  it('should calculate compound interest and deduce IR correctly', () => {
    const params = {
      valorInvestido: 10000,
      taxaJurosMensal: 1, // 1% a.m.
      meses: 12
    };

    const result = simulateInvestment(params);

    // M = 10000 * 1.01^12 = 11268.25
    expect(result.valorBruto).toBeCloseTo(11268.25, 2);
    
    // Profit = 1268.25
    // Tax = 20% of profit = 253.65
    expect(result.impostoRenda).toBeCloseTo(253.65, 2);
    
    // Net profit = 1268.25 - 253.65 = 1014.60
    expect(result.lucroLiquido).toBeCloseTo(1014.60, 2);
    
    // Net Value = 11014.60
    expect(result.valorLiquido).toBeCloseTo(11014.60, 2);
  });
});
