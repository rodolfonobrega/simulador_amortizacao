import { generateAmortizationTable, type AmortizationParams } from './engine/amortization';

function test(sistema: 'SAC' | 'PRICE') {
  const params: AmortizationParams = {
    valorFinanciado: 300000,
    prazoMeses: 360,
    taxaJuros: 11,
    taxaJurosTipo: 'AA',
    sistema: sistema,
    taxaTRMensalEstimada: 0.0,
    tarifaAdministracao: 0,
    aliquotaDFI: 0,
    valorImovel: 350000,
    idadeInicial: 0,
    aportes: [
      { mes: 1, valor: 10000, tipoReducao: 'PRAZO' }
    ]
  };

  const result = generateAmortizationTable(params);
  const baseline = generateAmortizationTable({ ...params, aportes: [] });
  console.log(`--- ${sistema} ---`);
  console.log(`Baseline length: ${baseline.tabela.length}`);
  console.log(`With Aporte length: ${result.tabela.length}`);
  console.log(`Months saved (baseline - result): ${baseline.tabela.length - result.tabela.length}`);
  console.log(`Number of eliminated rows in result: ${result.eliminadas.length}`);
}

test('SAC');
test('PRICE');
