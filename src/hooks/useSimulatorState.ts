/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useMemo, useEffect } from 'react';
import { 
  generateAmortizationTable,
  convertInterestRate,
  type AmortizationSystem, 
  type ExtraPayment, 
  type AmortizationParams,
  type ReductionType,
  type InterestRateType
} from '../engine/amortization';
import { simulateInvestment } from '../engine/investment';
import { compareAmortizationStrategies } from '../engine/strategyComparison';
import { type FGTSParams } from '../engine/fgts';

export interface UpfrontParams {
  itbiPercent: number;
  registroPercent: number;
  taxaAvaliacao: number;
}

export interface InvestmentParams {
  valor: number;
  taxa: number;
  taxaTipo: InterestRateType;
  meses: number;
}

export interface RecurringPaymentRule {
  valor: number;
  inicio: number;
  fim: number;
  intervalo: number;
  tipoReducao: ReductionType;
}

export interface QuickSimulationParams {
  aporte: number;
  inicio: number;
  intervalo: number;
}

export interface StrategyRule {
  id: string;
  type: 'recorrente' | 'pontual';
  value?: number;
  mesInicio?: number;
  mesFim?: number;
  intervalo?: number;
  tipoReducao?: ReductionType;
  configText: string;
  mesesPagasText?: string;
  parcelasPagas?: number[];
}

export interface SimulatorState {
  rawParams: typeof defaultRawParams;
  strategies: StrategyRule[];
  aporteRecorrente: RecurringPaymentRule;
  quickSimulation: QuickSimulationParams;
  investimento: InvestmentParams;
  upfrontParams: UpfrontParams;
  incluirSeguros: boolean;
  fgtsParams: FGTSParams;
}

export interface SavedProfile {
  id: string;
  name: string;
  savedAt: string;
  state: SimulatorState;
}

const STORAGE_KEY = 'simulador-amortizacao-state-v2';
const PROFILES_KEY = 'simulador-amortizacao-profiles-v2';

export const defaultRawParams = {
  valorFinanciado: 300000,
  prazoMeses: 420,
  taxaJuros: 10,
  taxaJurosTipo: 'AA' as InterestRateType,
  sistema: 'SAC' as AmortizationSystem,
  taxaTRMensalEstimada: 0.0,
  tarifaAdministracao: 25,
  aliquotaDFI: 0.000066,
  valorImovel: 380000,
  idadeInicial: 31,
};

export const defaultInvestimento: InvestmentParams = { valor: 10000, taxa: 0.8, taxaTipo: 'AM', meses: 12 };
export const defaultUpfrontParams: UpfrontParams = { itbiPercent: 2.0, registroPercent: 1.0, taxaAvaliacao: 3100 };
export const defaultAporteRecorrente: RecurringPaymentRule = {
  valor: 0,
  inicio: 1,
  fim: 420,
  intervalo: 1,
  tipoReducao: 'PRAZO'
};
export const defaultQuickSimulation: QuickSimulationParams = { aporte: 0, inicio: 1, intervalo: 24 };

export const defaultFgtsParams: FGTSParams = {
  saldoInicial: 0,
  depositoMensal: 500,
  taxaRendimentoAnual: 6.05,
  cicloMeses: 24,
  mesInicio: 1,
};

export const defaultSimulatorState: SimulatorState = {
  rawParams: defaultRawParams,
  strategies: [],
  aporteRecorrente: defaultAporteRecorrente,
  quickSimulation: defaultQuickSimulation,
  investimento: defaultInvestimento,
  upfrontParams: defaultUpfrontParams,
  incluirSeguros: true,
  fgtsParams: defaultFgtsParams
};

function loadJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return Array.isArray(fallback) ? parsed : { ...fallback, ...parsed };
  } catch {
    return fallback;
  }
}

function getInitialState(): SimulatorState {
  const loaded = loadJson<any>(STORAGE_KEY, null);
  if (!loaded) return defaultSimulatorState;

  const rawParams = loaded.rawParams || {
    valorFinanciado: loaded.params?.valorFinanciado ?? defaultRawParams.valorFinanciado,
    prazoMeses: loaded.params?.prazoMeses ?? defaultRawParams.prazoMeses,
    taxaJuros: loaded.params?.taxaJuros ?? defaultRawParams.taxaJuros,
    taxaJurosTipo: loaded.params?.taxaJurosTipo ?? defaultRawParams.taxaJurosTipo,
    sistema: loaded.params?.sistema ?? defaultRawParams.sistema,
    taxaTRMensalEstimada: loaded.params?.taxaTRMensalEstimada ?? defaultRawParams.taxaTRMensalEstimada,
    tarifaAdministracao: loaded.params?.tarifaAdministracao ?? defaultRawParams.tarifaAdministracao,
    aliquotaDFI: loaded.params?.aliquotaDFI ?? defaultRawParams.aliquotaDFI,
    valorImovel: loaded.params?.valorImovel ?? defaultRawParams.valorImovel,
    idadeInicial: loaded.params?.idadeInicial ?? defaultRawParams.idadeInicial,
  };

  let strategies: StrategyRule[] = loaded.strategies || [];
  
  if (strategies.length === 0 && loaded.params?.aportes) {
    loaded.params.aportes.forEach((ap: any, idx: number) => {
      strategies.push({
        id: `pontual-${idx}-init`,
        type: 'pontual',
        value: ap.valor,
        mesInicio: ap.mes,
        tipoReducao: ap.tipoReducao,
        configText: `Mês ${ap.mes}`
      });
    });
  }

  if (strategies.length === 0) {
    strategies = [
      {
        id: 'mock-recorrente-1',
        type: 'recorrente',
        value: 10000,
        mesInicio: 12,
        mesFim: 420,
        intervalo: 6,
        tipoReducao: 'PRAZO',
        configText: 'Do mês 12 ao 420 a cada 6 meses'
      },
      {
        id: 'mock-recorrente-2',
        type: 'recorrente',
        value: 5000,
        mesInicio: 24,
        mesFim: 420,
        intervalo: 12,
        tipoReducao: 'PARCELA',
        configText: 'Do mês 24 ao 420 a cada 12 meses'
      },
      {
        id: 'mock-pontual-3',
        type: 'pontual',
        value: 20000,
        mesInicio: 36,
        tipoReducao: 'PRAZO',
        configText: 'Mês 36'
      },
      {
        id: 'mock-pontual-4',
        type: 'pontual',
        value: 15000,
        mesInicio: 60,
        tipoReducao: 'PARCELA',
        configText: 'Mês 60'
      }
    ];
  }

  return {
    rawParams,
    strategies,
    aporteRecorrente: {
      ...defaultAporteRecorrente,
      ...(loaded.aporteRecorrente ?? {}),
    },
    quickSimulation: { ...defaultQuickSimulation, ...loaded.quickSimulation },
    investimento: { ...defaultInvestimento, ...loaded.investimento },
    upfrontParams: { ...defaultUpfrontParams, ...loaded.upfrontParams },
    incluirSeguros: loaded.incluirSeguros ?? true,
    fgtsParams: { ...defaultFgtsParams, ...(loaded.fgtsParams ?? {}) }
  };
}

export function useSimulatorState() {
  const [initialState] = useState(() => getInitialState());

  const [rawParams, setRawParams] = useState<typeof defaultRawParams>(initialState.rawParams);
  const [strategies, setStrategies] = useState<StrategyRule[]>(initialState.strategies);
  const [aporteRecorrente, setAporteRecorrente] = useState<RecurringPaymentRule>(initialState.aporteRecorrente);
  const [quickSimulation, setQuickSimulation] = useState<QuickSimulationParams>(initialState.quickSimulation);
  const [novoAporte, setNovoAporte] = useState<ExtraPayment>({ mes: 1, valor: 10000, tipoReducao: 'PRAZO' });
  const [investimento, setInvestimento] = useState<InvestmentParams>(initialState.investimento);
  const [upfrontParams, setUpfrontParams] = useState<UpfrontParams>(initialState.upfrontParams);
  const [incluirSeguros, setIncluirSeguros] = useState(initialState.incluirSeguros);
  const [fgtsParams, setFgtsParams] = useState<FGTSParams>(initialState.fgtsParams);
  const [profiles, setProfiles] = useState<SavedProfile[]>(() => loadJson<SavedProfile[]>(PROFILES_KEY, []));
  const [profileName, setProfileName] = useState('');
  const [selectedProfileId, setSelectedProfileId] = useState('');
  
  const [activeMainTab, setActiveMainTab] = useState<'visao_geral' | 'simulacao' | 'parametros'>('parametros');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const [aporteError, setAporteError] = useState('');
  const [aporteRecorrenteError, setAporteRecorrenteError] = useState('');

  // Sincronização de Inputs
  const [inputPrazo, setInputPrazo] = useState(initialState.rawParams.prazoMeses.toString());
  const [inputJuros, setInputJuros] = useState(initialState.rawParams.taxaJuros.toString().replace('.', ','));
  const [inputTR, setInputTR] = useState(initialState.rawParams.taxaTRMensalEstimada.toString().replace('.', ','));
  const [inputIdade, setInputIdade] = useState(initialState.rawParams.idadeInicial.toString());
  const [inputAporteMes, setInputAporteMes] = useState('1');
  const [inputAporteRecorrenteInicio, setInputAporteRecorrenteInicio] = useState(initialState.aporteRecorrente.inicio.toString());
  const [inputAporteRecorrenteFim, setInputAporteRecorrenteFim] = useState(initialState.aporteRecorrente.fim.toString());
  const [inputAporteRecorrenteIntervalo, setInputAporteRecorrenteIntervalo] = useState(initialState.aporteRecorrente.intervalo.toString());
  const [inputQuickInicio, setInputQuickInicio] = useState(initialState.quickSimulation.inicio.toString());
  const [inputQuickIntervalo, setInputQuickIntervalo] = useState(initialState.quickSimulation.intervalo.toString());
  const [inputInvestimentoTaxa, setInputInvestimentoTaxa] = useState(initialState.investimento.taxa.toString().replace('.', ','));
  const [inputInvestimentoMeses, setInputInvestimentoMeses] = useState(initialState.investimento.meses.toString());
  const [inputItbiPercent, setInputItbiPercent] = useState(initialState.upfrontParams.itbiPercent.toString().replace('.', ','));
  const [inputRegistroPercent, setInputRegistroPercent] = useState(initialState.upfrontParams.registroPercent.toString().replace('.', ','));
  const [inputFgtsTaxa, setInputFgtsTaxa] = useState(initialState.fgtsParams.taxaRendimentoAnual.toString().replace('.', ','));

  const [chartLinesVisibility, setChartLinesVisibility] = useState({
    baseDebt: true,
    hojeDebt: true,
    depoisDebt: true,
    basePaid: true,
    hojePaid: true,
    depoisPaid: true,
  });

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
  };

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const params = useMemo<AmortizationParams>(() => {
    const aportes: ExtraPayment[] = [];

    strategies.forEach((s) => {
      if (s.type === 'recorrente') {
        const inicio = s.mesInicio || 1;
        const fim = s.mesFim || rawParams.prazoMeses;
        const intervalo = s.intervalo || 1;
        for (let m = inicio; m <= fim; m += intervalo) {
          aportes.push({ mes: m, valor: s.value || 0, tipoReducao: s.tipoReducao || 'PRAZO' });
        }
      } else if (s.type === 'pontual') {
        aportes.push({ mes: s.mesInicio || 12, valor: s.value || 0, tipoReducao: s.tipoReducao || 'PRAZO' });
      }
    });

    return {
      ...rawParams,
      aportes: aportes.sort((a, b) => a.mes - b.mes),
      parcelasPagas: [],
    };
  }, [rawParams, strategies]);

  const currentState = useMemo<SimulatorState>(() => ({
    rawParams,
    strategies,
    aporteRecorrente,
    quickSimulation,
    investimento,
    upfrontParams,
    incluirSeguros,
    fgtsParams
  }), [rawParams, strategies, aporteRecorrente, quickSimulation, investimento, upfrontParams, incluirSeguros, fgtsParams]);

  const syncTextInputs = (state: SimulatorState) => {
    setInputPrazo(state.rawParams.prazoMeses.toString());
    setInputJuros(state.rawParams.taxaJuros.toString().replace('.', ','));
    setInputTR(state.rawParams.taxaTRMensalEstimada.toString().replace('.', ','));
    setInputIdade(state.rawParams.idadeInicial.toString());
    setInputAporteRecorrenteInicio(state.aporteRecorrente.inicio.toString());
    setInputAporteRecorrenteFim(state.aporteRecorrente.fim.toString());
    setInputAporteRecorrenteIntervalo(state.aporteRecorrente.intervalo.toString());
    setInputQuickInicio(state.quickSimulation.inicio.toString());
    setInputQuickIntervalo(state.quickSimulation.intervalo.toString());
    setInputInvestimentoTaxa(state.investimento.taxa.toString().replace('.', ','));
    setInputInvestimentoMeses(state.investimento.meses.toString());
    setInputItbiPercent(state.upfrontParams.itbiPercent.toString().replace('.', ','));
    setInputRegistroPercent(state.upfrontParams.registroPercent.toString().replace('.', ','));
    setInputFgtsTaxa((state.fgtsParams?.taxaRendimentoAnual ?? defaultFgtsParams.taxaRendimentoAnual).toString().replace('.', ','));
  };

  const applySimulatorState = (state: SimulatorState) => {
    setRawParams({ ...defaultRawParams, ...state.rawParams });
    setStrategies(state.strategies || []);
    setAporteRecorrente({ ...defaultAporteRecorrente, ...state.aporteRecorrente });
    setQuickSimulation({ ...defaultQuickSimulation, ...state.quickSimulation });
    setInvestimento({ ...defaultInvestimento, ...state.investimento });
    setUpfrontParams({ ...defaultUpfrontParams, ...state.upfrontParams });
    setIncluirSeguros(state.incluirSeguros);
    setFgtsParams({ ...defaultFgtsParams, ...(state.fgtsParams || {}) });
    syncTextInputs(state);
  };

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(currentState));
  }, [currentState]);

  useEffect(() => {
    localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
  }, [profiles]);

  const result = useMemo(() => {
    return generateAmortizationTable({
      ...params,
      aliquotaDFI: incluirSeguros ? params.aliquotaDFI : 0,
      idadeInicial: incluirSeguros ? params.idadeInicial : 0,
    });
  }, [params, incluirSeguros]);

  const tabelaSemAportes = useMemo(() => {
    return generateAmortizationTable({
      ...params,
      aliquotaDFI: incluirSeguros ? params.aliquotaDFI : 0,
      idadeInicial: incluirSeguros ? params.idadeInicial : 0,
      aportes: [],
      parcelasPagas: [],
    });
  }, [params, incluirSeguros]);

  const totalJurosOrig = useMemo(() => {
    return tabelaSemAportes.tabela.reduce((acc, row) => acc + row.juros, 0);
  }, [tabelaSemAportes]);

  const totalPagoOrig = useMemo(() => {
    return tabelaSemAportes.tabela.reduce((acc, row) => acc + row.parcelaTotal, 0);
  }, [tabelaSemAportes]);

  const quickSimulationResult = useMemo(() => {
    const aportes: ExtraPayment[] = [];
    const inicio = Math.max(1, quickSimulation.inicio);
    const intervalo = Math.max(1, quickSimulation.intervalo);

    if (quickSimulation.aporte > 0) {
      for (let mes = inicio; mes <= rawParams.prazoMeses; mes += intervalo) {
        aportes.push({ mes, valor: quickSimulation.aporte, tipoReducao: 'PRAZO' });
      }
    }

    const sim = generateAmortizationTable({
      ...params,
      aliquotaDFI: incluirSeguros ? params.aliquotaDFI : 0,
      idadeInicial: incluirSeguros ? params.idadeInicial : 0,
      aportes,
    });

    const totalParcelas = sim.tabela.reduce((acc, row) => acc + row.parcelaTotal, 0);
    const totalAportes = sim.tabela.reduce((acc, row) => acc + (row.aporteExtra || 0), 0);
    const totalJurosSim = sim.tabela.reduce((acc, row) => acc + row.juros, 0);

    const contribuicoes = aportes
      .filter(ap => ap.mes <= sim.tabela.length)
      .map(ap => {
        const qty = sim.eliminadas.filter(e => e.motivo === 'APORTE' && e.eliminadaNoMes === ap.mes).length;
        const valorAplicado = sim.tabela.find(r => r.mes === ap.mes)?.aporteExtra ?? 0;
        return { mes: ap.mes, valor: ap.valor, valorApplied: valorAplicado, parcelasQuitadas: qty };
      });

    const prazoOriginal = tabelaSemAportes.tabela.length;
    const prazoFinal = sim.tabela.length;
    const reducaoTotal = prazoOriginal - prazoFinal;

    return {
      meses: sim.tabela.length,
      prazoOriginal,
      reducaoTotal,
      totalParcelas,
      totalAportes,
      totalPago: totalParcelas + totalAportes,
      totalJuros: totalJurosSim,
      contribuicoes,
      jurosSemNada: totalJurosOrig,
      jurosEconomizados: totalJurosOrig - totalJurosSim,
      tabela: sim.tabela,
      eliminadas: sim.eliminadas
    };
  }, [params, incluirSeguros, quickSimulation, rawParams.prazoMeses, tabelaSemAportes, totalJurosOrig]);

  const totalPago = useMemo(() => {
    return result.tabela.reduce((acc, row) => acc + row.parcelaTotal + (row.aporteExtra || 0), 0);
  }, [result]);

  const totalJuros = useMemo(() => {
    return result.tabela.reduce((acc, row) => acc + row.juros, 0);
  }, [result]);

  const economiaJuros = useMemo(() => totalJurosOrig - totalJuros, [totalJurosOrig, totalJuros]);
  const mesesReduzidos = useMemo(() => tabelaSemAportes.tabela.length - result.tabela.length, [tabelaSemAportes, result]);

  const totalMIP = useMemo(() => result.tabela.reduce((acc, row) => acc + row.seguroMIP, 0), [result]);
  const totalDFI = useMemo(() => result.tabela.reduce((acc, row) => acc + row.seguroDFI, 0), [result]);
  const totalTarifas = useMemo(() => result.tabela.reduce((acc, row) => acc + (row.tarifaAdmin || 0), 0), [result]);
  const totalAmortizado = useMemo(() => result.tabela.reduce((acc, row) => acc + row.amortizacao, 0), [result]);
  const totalSegurosETarifas = totalMIP + totalDFI + totalTarifas;

  const chartDataBreakdown = useMemo(() => [
    { name: 'Principal', value: rawParams.valorFinanciado, color: '#38bdf8' },
    { name: 'Juros', value: totalJuros, color: '#ef4444' },
    { name: 'Taxas e seguros', value: totalSegurosETarifas, color: '#10b981' }
  ], [rawParams.valorFinanciado, totalJuros, totalSegurosETarifas]);

  const custoITBI = useMemo(() => rawParams.valorImovel * (upfrontParams.itbiPercent / 100), [rawParams.valorImovel, upfrontParams.itbiPercent]);
  const custoRegistro = useMemo(() => rawParams.valorImovel * (upfrontParams.registroPercent / 100), [rawParams.valorImovel, upfrontParams.registroPercent]);
  const totalCustosIniciais = useMemo(() => custoITBI + custoRegistro + upfrontParams.taxaAvaliacao, [custoITBI, custoRegistro, upfrontParams.taxaAvaliacao]);
  const valorEntrada = useMemo(() => Math.max(0, rawParams.valorImovel - rawParams.valorFinanciado), [rawParams.valorImovel, rawParams.valorFinanciado]);
  const totalDesembolsoVista = useMemo(() => valorEntrada + totalCustosIniciais, [valorEntrada, totalCustosIniciais]);

  const simInvestimento = useMemo(() => {
    const taxaRendimentoMensal = convertInterestRate(investimento.taxa, investimento.taxaTipo, 'AM');
    return simulateInvestment({
      valorInvestido: investimento.valor,
      meses: investimento.meses,
      taxaJurosMensal: taxaRendimentoMensal
    });
  }, [investimento]);

  const comparacao = useMemo(() => {
    return compareAmortizationStrategies({
      amortizationParams: {
        ...params,
        aliquotaDFI: incluirSeguros ? params.aliquotaDFI : 0,
        idadeInicial: incluirSeguros ? params.idadeInicial : 0
      },
      baseline: {
        prazoOriginal: tabelaSemAportes.tabela.length,
        jurosSemAportes: totalJurosOrig
      },
      investment: investimento
    });
  }, [params, investimento, tabelaSemAportes.tabela.length, totalJurosOrig, incluirSeguros]);

  const lineChartData = useMemo(() => {
    const tabActive = result.tabela;
    const tabBase = tabelaSemAportes.tabela;
    const tabHoje = comparacao.hoje.resultadoAmortizacao.tabela;
    const tabDepois = comparacao.depois.resultadoAmortizacao.tabela;

    const maxLength = Math.max(
      tabActive.length,
      tabBase.length,
      tabHoje.length,
      tabDepois.length
    );

    let cumBase = 0;
    const mapBase = new Map<number, number>();
    for (const r of tabBase) {
      cumBase += r.parcelaTotal + (r.aporteExtra || 0);
      mapBase.set(r.mes, cumBase);
    }
    const lastBaseMes = tabBase.length > 0 ? tabBase[tabBase.length - 1].mes : 0;
    const totalBasePaid = lastBaseMes > 0 ? (mapBase.get(lastBaseMes) || 0) : 0;

    let cumHoje = 0;
    const mapHoje = new Map<number, number>();
    for (const r of tabHoje) {
      cumHoje += r.parcelaTotal + (r.aporteExtra || 0);
      mapHoje.set(r.mes, cumHoje);
    }
    const lastHojeMes = tabHoje.length > 0 ? tabHoje[tabHoje.length - 1].mes : 0;
    const totalHojePaid = lastHojeMes > 0 ? (mapHoje.get(lastHojeMes) || 0) : 0;

    let cumDepois = 0;
    const mapDepois = new Map<number, number>();
    for (const r of tabDepois) {
      cumDepois += r.parcelaTotal + (r.aporteExtra || 0);
      mapDepois.set(r.mes, cumDepois);
    }
    const lastDepoisMes = tabDepois.length > 0 ? tabDepois[tabDepois.length - 1].mes : 0;
    const totalDepoisPaid = lastDepoisMes > 0 ? (mapDepois.get(lastDepoisMes) || 0) : 0;

    const data: any[] = [];
    const step = 12;
    const months = new Set<number>();
    for (let m = 1; m <= maxLength; m += step) {
      months.add(m);
    }
    if (maxLength > 0) {
      months.add(maxLength);
    }

    Array.from(months).sort((a, b) => a - b).forEach(m => {
      const rowBase = tabBase.find(r => r.mes === m);
      const rowHoje = tabHoje.find(r => r.mes === m);
      const rowDepois = tabDepois.find(r => r.mes === m);

      const paidBase = m <= lastBaseMes ? (mapBase.get(m) || 0) : totalBasePaid;
      const paidHoje = m <= lastHojeMes ? (mapHoje.get(m) || 0) : totalHojePaid;
      const paidDepois = m <= lastDepoisMes ? (mapDepois.get(m) || 0) : totalDepoisPaid;

      data.push({
        mes: m,
        'Sem Amortização (Dívida)': rowBase ? rowBase.saldoDevedorFinal : 0,
        'Cenário A (Amortizar Hoje) (Dívida)': rowHoje ? rowHoje.saldoDevedorFinal : 0,
        'Cenário B (Investir e Amortizar Depois) (Dívida)': rowDepois ? rowDepois.saldoDevedorFinal : 0,
        'Sem Amortização (Pago)': paidBase,
        'Cenário A (Amortizar Hoje) (Pago)': paidHoje,
        'Cenário B (Investir e Amortizar Depois) (Pago)': paidDepois,
      });
    });

    return data;
  }, [result.tabela, tabelaSemAportes.tabela, comparacao]);

  const strategiesWithImpact = useMemo(() => {
    return strategies.map((s) => {
      const filteredStrategies = strategies.filter(x => x.id !== s.id);
      
      const altAportes: ExtraPayment[] = [];

      filteredStrategies.forEach((fs) => {
        if (fs.type === 'recorrente') {
          const inicio = fs.mesInicio || 1;
          const fim = fs.mesFim || rawParams.prazoMeses;
          const intervalo = fs.intervalo || 1;
          for (let m = inicio; m <= fim; m += intervalo) {
            altAportes.push({ mes: m, valor: fs.value || 0, tipoReducao: fs.tipoReducao || 'PRAZO' });
          }
        } else if (fs.type === 'pontual') {
          altAportes.push({ mes: fs.mesInicio || 12, valor: fs.value || 0, tipoReducao: fs.tipoReducao || 'PRAZO' });
        }
      });

      const simSemS = generateAmortizationTable({
        ...rawParams,
        aportes: altAportes.sort((a, b) => a.mes - b.mes),
        parcelasPagas: [],
        aliquotaDFI: incluirSeguros ? rawParams.aliquotaDFI : 0,
        idadeInicial: incluirSeguros ? rawParams.idadeInicial : 0,
      });

      const diffJuros = simSemS.tabela.reduce((sum, r) => sum + r.juros, 0) - totalJuros;
      const diffPrazo = simSemS.tabela.length - result.tabela.length;

      const parcelasEliminadas = diffPrazo;

      return {
        ...s,
        parcelasEliminadas,
        prazoReduzido: diffPrazo,
        economiaJuros: Math.max(0, diffJuros),
      };
    });
  }, [strategies, rawParams, incluirSeguros, result, totalJuros]);

  const handleResetState = () => {
    applySimulatorState(defaultSimulatorState);
    setNovoAporte({ mes: 1, valor: 10000, tipoReducao: 'PRAZO' });
    setInputAporteMes('1');
    setInputAporteRecorrenteInicio(defaultAporteRecorrente.inicio.toString());
    setInputAporteRecorrenteFim(defaultAporteRecorrente.fim.toString());
    setInputAporteRecorrenteIntervalo(defaultAporteRecorrente.intervalo.toString());
    setInputQuickInicio(defaultQuickSimulation.inicio.toString());
    setInputQuickIntervalo(defaultQuickSimulation.intervalo.toString());
    setInputFgtsTaxa(defaultFgtsParams.taxaRendimentoAnual.toString().replace('.', ','));
    showToast('Simulação resetada para os valores padrão.', 'success');
  };

  const handleSaveProfile = () => {
    const name = profileName.trim();
    if (!name) {
      showToast('Informe um nome para salvar o perfil.', 'error');
      return;
    }

    const savedProfile: SavedProfile = {
      id: crypto.randomUUID(),
      name,
      savedAt: new Date().toISOString(),
      state: currentState
    };

    setProfiles(prev => [savedProfile, ...prev.filter(profile => profile.name !== name)]);
    setSelectedProfileId(savedProfile.id);
    setProfileName('');
    showToast(`Perfil "${name}" salvo com sucesso.`, 'success');
  };

  const handleLoadProfile = () => {
    const profile = profiles.find(item => item.id === selectedProfileId);
    if (!profile) {
      showToast('Selecione um perfil salvo para carregar.', 'error');
      return;
    }

    applySimulatorState(profile.state);
    showToast(`Perfil "${profile.name}" carregado.`, 'success');
  };

  const addStrategy = (rule: Omit<StrategyRule, 'id'>) => {
    const newRule: StrategyRule = {
      ...rule,
      id: `${rule.type}-${Date.now()}`
    };
    setStrategies(prev => [...prev, newRule]);
    showToast('Estratégia adicionada com sucesso.', 'success');
  };

  const removeStrategy = (id: string) => {
    setStrategies(prev => prev.filter(s => s.id !== id));
    showToast('Estratégia removida.', 'info');
  };

  const handleClearAllAportes = () => {
    setStrategies([]);
    showToast('Todas as amortizações ativas foram limpas.', 'info');
  };

  const handleClearAllStrategies = () => {
    setStrategies([]);
    showToast('Todas as estratégias foram removidas.', 'info');
  };

  const handlePrazoChange = (val: string) => {
    setInputPrazo(val);
    const num = parseInt(val, 10);
    if (!isNaN(num) && num > 0) {
      setRawParams((p: typeof defaultRawParams) => ({ ...p, prazoMeses: num }));
    }
  };

  const handleJurosChange = (val: string) => {
    setInputJuros(val);
    const num = parseFloat(val.replace(',', '.'));
    if (!isNaN(num) && num >= 0) {
      setRawParams((p: typeof defaultRawParams) => ({ ...p, taxaJuros: num }));
    }
  };

  const handleTRChange = (val: string) => {
    setInputTR(val);
    const num = parseFloat(val.replace(',', '.'));
    if (!isNaN(num) && num >= 0) {
      setRawParams((p: typeof defaultRawParams) => ({ ...p, taxaTRMensalEstimada: num }));
    }
  };

  const handleIdadeChange = (val: string) => {
    setInputIdade(val);
    const num = parseInt(val, 10);
    if (!isNaN(num) && num > 0) {
      setRawParams((p: typeof defaultRawParams) => ({ ...p, idadeInicial: num }));
    }
  };

  const handleAporteMesChange = (val: string) => {
    setInputAporteMes(val);
    const num = parseInt(val, 10);
    if (!isNaN(num) && num > 0) {
      setNovoAporte(prev => ({ ...prev, mes: num }));
    }
  };

  const handleAporteRecorrenteNumeroChange = (field: 'inicio' | 'fim' | 'intervalo', val: string) => {
    const setters = {
      inicio: setInputAporteRecorrenteInicio,
      fim: setInputAporteRecorrenteFim,
      intervalo: setInputAporteRecorrenteIntervalo
    };
    setters[field](val);
    const num = parseInt(val, 10);
    if (!isNaN(num) && num > 0) {
      setAporteRecorrente(prev => ({ ...prev, [field]: num }));
    }
  };

  const handleQuickNumeroChange = (field: 'inicio' | 'intervalo', val: string) => {
    const setter = field === 'inicio' ? setInputQuickInicio : setInputQuickIntervalo;
    setter(val);
    const num = parseInt(val, 10);
    if (!isNaN(num) && num > 0) {
      setQuickSimulation(prev => ({ ...prev, [field]: num }));
    }
  };

  const handleInvestimentoTaxaChange = (val: string) => {
    setInputInvestimentoTaxa(val);
    const num = parseFloat(val.replace(',', '.'));
    if (!isNaN(num) && num >= 0) {
      setInvestimento(prev => ({ ...prev, taxa: num }));
    }
  };

  const handleInvestimentoMesesChange = (val: string) => {
    setInputInvestimentoMeses(val);
    const num = parseInt(val, 10);
    if (!isNaN(num) && num > 0) {
      setInvestimento(prev => ({ ...prev, meses: num }));
    }
  };

  const handleItbiPercentChange = (val: string) => {
    setInputItbiPercent(val);
    const num = parseFloat(val.replace(',', '.'));
    if (!isNaN(num) && num >= 0) {
      setUpfrontParams(prev => ({ ...prev, itbiPercent: num }));
    }
  };

  const handleRegistroPercentChange = (val: string) => {
    setInputRegistroPercent(val);
    const num = parseFloat(val.replace(',', '.'));
    if (!isNaN(num) && num >= 0) {
      setUpfrontParams(prev => ({ ...prev, registroPercent: num }));
    }
  };



  const exportToCSV = () => {
    const sep = ';';
    const fmt = (v: number) => v.toFixed(2).replace('.', ',');

    const headers = [
      'Mês', 'Status', 'Parcela Total', 'Amortização', 'Juros',
      'Seguro MIP', 'Seguro DFI', 'Tarifa Admin', 'Amort. Extra',
      'Desembolso Acumulado', 'Saldo Devedor Final', 'Você Pagou (VP)'
    ].join(sep);

    let cumPaid = 0;
    const activeRows = result.tabela.map(row => {
      cumPaid += row.parcelaTotal + (row.aporteExtra || 0);
      return [
        row.mes,
        'Ativa',
        fmt(row.parcelaTotal),
        fmt(row.amortizacao),
        fmt(row.juros),
        fmt(row.seguroMIP),
        fmt(row.seguroDFI),
        fmt(row.tarifaAdmin || 0),
        fmt(row.aporteExtra || 0),
        fmt(cumPaid),
        fmt(row.saldoDevedorFinal),
        '',
      ].join(sep);
    });

    const elimRows = result.eliminadas
      .filter(e => e.motivo !== 'PAGAMENTO')
      .sort((a, b) => a.mesOriginal - b.mesOriginal)
      .map(elim => {
        const orig = tabelaSemAportes.tabela.find(r => r.mes === elim.mesOriginal);
        const vp = elim.valorAporte;
        return [
          elim.mesOriginal,
          `Eliminada (aporte mês ${elim.eliminadaNoMes})`,
          orig ? fmt(orig.parcelaTotal) : '',
          orig ? fmt(orig.amortizacao) : '',
          orig ? fmt(orig.juros) : '',
          orig ? fmt(orig.seguroMIP) : '',
          orig ? fmt(orig.seguroDFI) : '',
          '',
          '',
          '',
          fmt(vp),
        ].join(sep);
      });

    const csv = [headers, ...activeRows, ...elimRows].join('\n');
    const bom = '\uFEFF';
    const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `simulacao_amortizacao_${rawParams.sistema}_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportFGTS = () => {
    const ft = quickSimulationResult.tabela;
    if (!ft || ft.length === 0) return;

    const sep = ';';
    const fmt = (v: number) => v.toFixed(2).replace('.', ',');

    const headers = [
      'Mês', 'Saldo Inicial Corrigido', 'Amortização', 'Juros',
      'Seguro MIP', 'Seguro DFI', 'Tarifa Admin', 'Parcela Total',
      'Amort. Extra', 'Desembolso Acumulado', 'Saldo Devedor Final', 'Status'
    ].join(sep);

    let cumPaid = 0;
    const rows = ft.map(row => {
      cumPaid += row.parcelaTotal + (row.aporteExtra || 0);
      const status = row.pagaManualmente
        ? 'Parcela Paga Manualmente'
        : (row.aporteExtra ? 'Com Amortizacao' : 'Normal');
      return [
        row.mes,
        fmt(row.saldoInicialCorrigido || 0),
        fmt(row.amortizacao),
        fmt(row.juros),
        fmt(row.seguroMIP),
        fmt(row.seguroDFI),
        fmt(row.tarifaAdmin),
        fmt(row.parcelaTotal),
        fmt(row.aporteExtra || 0),
        fmt(cumPaid),
        fmt(row.saldoDevedorFinal),
        status,
      ].join(sep);
    });

    const csv = [headers, ...rows, ...elimRows].join('\n');
    const bom = '\uFEFF';
    const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `simulacao_fgts_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const elimRows = (quickSimulationResult.eliminadas ?? [])
    .filter(e => e.motivo !== 'PAGAMENTO')
    .sort((a, b) => a.mesOriginal - b.mesOriginal)
    .map(elim => {
      return [
        elim.mesOriginal,
        '', '', '', '', '', '', '',
        '',
        '',
        `Eliminada (amort. mês ${elim.eliminadaNoMes})`,
      ].join(';');
    });

  return {
    rawParams, setRawParams,
    params,
    strategies: strategiesWithImpact,
    addStrategy,
    removeStrategy,
    handleClearAllStrategies,
    aporteRecorrente, setAporteRecorrente,
    quickSimulation, setQuickSimulation,
    novoAporte, setNovoAporte,
    investimento, setInvestimento,
    upfrontParams, setUpfrontParams,
    incluirSeguros, setIncluirSeguros,
    fgtsParams, setFgtsParams,
    profiles, setProfiles,
    profileName, setProfileName,
    selectedProfileId, setSelectedProfileId,
    activeMainTab, setActiveMainTab,
    toast, showToast,
    
    // Erros
    aporteError, setAporteError,
    aporteRecorrenteError, setAporteRecorrenteError,

    // Inputs
    inputPrazo, handlePrazoChange,
    inputJuros, handleJurosChange,
    inputTR, handleTRChange,
    inputIdade, handleIdadeChange,
    inputAporteMes, handleAporteMesChange,
    inputAporteRecorrenteInicio,
    inputAporteRecorrenteFim,
    inputAporteRecorrenteIntervalo,
    handleAporteRecorrenteNumeroChange,
    inputQuickInicio,
    inputQuickIntervalo,
    handleQuickNumeroChange,
    inputInvestimentoTaxa, handleInvestimentoTaxaChange,
    inputInvestimentoMeses, handleInvestimentoMesesChange,
    inputItbiPercent, handleItbiPercentChange,
    inputRegistroPercent, handleRegistroPercentChange,
    inputFgtsTaxa, setInputFgtsTaxa,

    // Visibilidade
    chartLinesVisibility, setChartLinesVisibility,

    // Computados
    result,
    tabelaSemAportes,
    quickSimulationResult,
    totalPago,
    totalJuros,
    totalPagoOrig,
    totalJurosOrig,
    economiaJuros,
    mesesReduzidos,
    totalMIP,
    totalDFI,
    totalTarifas,
    totalAmortizado,
    totalSegurosETarifas,
    chartDataBreakdown,
    custoITBI,
    custoRegistro,
    totalCustosIniciais,
    valorEntrada,
    totalDesembolsoVista,
    comparacao,
    lineChartData,
    simInvestimento,

    // Ações
    handleResetState,
    handleSaveProfile,
    handleLoadProfile,
    handleClearAllAportes,
    exportToCSV,
    exportFGTS
  };
}
