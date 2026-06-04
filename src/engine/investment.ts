// Lógica para comparar o custo de oportunidade: Amortizar hoje vs Investir e amortizar no futuro

export interface InvestmentParams {
  valorInvestido: number;
  taxaJurosMensal: number;
  meses: number;
}

export interface InvestmentResult {
  valorBruto: number;
  valorLiquido: number;
  impostoRenda: number;
  lucroLiquido: number;
}

// Tabela Regressiva do IR para Renda Fixa no Brasil
// Até 180 dias (6 meses): 22.5%
// 181 a 360 dias (12 meses): 20%
// 361 a 720 dias (24 meses): 17.5%
// Acima de 720 dias: 15%
export function calcularAliquotaIR(meses: number): number {
  if (meses <= 6) return 0.225;
  if (meses <= 12) return 0.20;
  if (meses <= 24) return 0.175;
  return 0.15;
}

export function simulateInvestment(params: InvestmentParams): InvestmentResult {
  const { valorInvestido, taxaJurosMensal, meses } = params;
  
  // M = C * (1 + i)^t
  const valorBruto = valorInvestido * Math.pow(1 + (taxaJurosMensal / 100), meses);
  const lucroBruto = valorBruto - valorInvestido;
  
  const aliquotaIR = calcularAliquotaIR(meses);
  const impostoRenda = lucroBruto * aliquotaIR;
  
  const lucroLiquido = lucroBruto - impostoRenda;
  const valorLiquido = valorInvestido + lucroLiquido;
  
  return {
    valorBruto,
    valorLiquido,
    impostoRenda,
    lucroLiquido
  };
}
