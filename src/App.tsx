/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemo } from 'react';
import { useSimulator, SimulatorProvider } from './context/SimulatorContext';
import { AppLayout } from './components/layout/AppLayout';
import { OverviewMetrics } from './components/dashboard/OverviewMetrics';
import { StrategySection } from './components/dashboard/StrategySection';
import { SummarySection } from './components/dashboard/SummarySection';
import { EvolutionTable } from './components/dashboard/EvolutionTable';
import { SimulationStrategiesTab } from './components/dashboard/SimulationStrategiesTab';
import { formatCurrency } from './utils/formatters';
import { type InterestRateType, type AmortizationSystem, convertInterestRate } from './engine/amortization';
import { 
  CheckCircle,
  AlertCircle,
  Info,
  Sliders,
  User,
  Save,
  Upload,
  RotateCcw
} from 'lucide-react';
import './App.css';

// Componente customizado para Input de Moeda com máscara BRL integrada
function CurrencyInput({ value, onChange, className, id }: { value: number; onChange: (val: number) => void; className?: string; id?: string }) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const cleanValue = e.target.value.replace(/\D/g, '');
    const cents = cleanValue ? parseInt(cleanValue, 10) : 0;
    onChange(cents / 100);
  };

  return (
    <input
      type="text"
      id={id}
      className={className}
      value={formatCurrency(value)}
      onChange={handleChange}
    />
  );
}

// Componente de Tooltip de Informações
function InfoTooltip({ content }: { content: string }) {
  return (
    <span className="tooltip-trigger" tabIndex={0}>
      <Info size={14} className="text-secondary" style={{ marginLeft: '6px', verticalAlign: 'middle', opacity: 0.8 }} />
      <span className="tooltip-content">{content}</span>
    </span>
  );
}

function AppContent() {
  const {
    activeMainTab,
    toast,
    rawParams, setRawParams,
    // Perfil
    profileName, setProfileName,
    profiles, selectedProfileId, setSelectedProfileId,
    handleSaveProfile, handleLoadProfile, handleResetState,
    
    // Inputs sincronizados de parâmetros
    inputPrazo, handlePrazoChange,
    inputJuros, handleJurosChange,
    inputTR, handleTRChange,
    inputIdade, handleIdadeChange,
    incluirSeguros, setIncluirSeguros,
  } = useSimulator();

  const convertedJurosText = useMemo(() => {
    const rate = rawParams.taxaJuros;
    const type = rawParams.taxaJurosTipo;
    if (isNaN(rate) || rate <= 0) return '';
    
    if (type === 'AA') {
      const converted = convertInterestRate(rate, 'AA', 'AM');
      return `Equivale a ${converted.toFixed(4).replace('.', ',')}% a.m.`;
    } else {
      const converted = convertInterestRate(rate, 'AM', 'AA');
      return `Equivale a ${converted.toFixed(2).replace('.', ',')}% a.a.`;
    }
  }, [rawParams.taxaJuros, rawParams.taxaJurosTipo]);

  return (
    <AppLayout>
      {/* 1. VISÃO GERAL */}
      {activeMainTab === 'visao_geral' && (
        <>
          <OverviewMetrics />
          <div className="dashboard-two-col-layout">
            <StrategySection />
            <SummarySection />
          </div>
          <EvolutionTable />
        </>
      )}

      {/* 2. SIMULAÇÃO E ESTRATÉGIAS */}
      {activeMainTab === 'simulacao' && (
        <SimulationStrategiesTab />
      )}

      {/* 1. PARÂMETROS */}
      {activeMainTab === 'parametros' && (
        <div className="dashboard-two-col-layout" style={{ alignItems: 'stretch' }}>
          {/* Parâmetros do Financiamento */}
          <div className="panel">
            <h2 className="flex-center gap-sm">
              <Sliders size={20} className="text-accent" />
              Parâmetros do Financiamento
            </h2>

            <div className="mt-xl" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="input-group">
                <label>
                  Valor Financiado
                  <InfoTooltip content="O valor total financiado junto à instituição financeira (excluindo a entrada)." />
                </label>
                <CurrencyInput
                  className="input-control"
                  value={rawParams.valorFinanciado}
                  onChange={val => setRawParams((p: any) => ({ ...p, valorFinanciado: val }))}
                />
              </div>

              <div className="grid-cols-2" style={{ gap: '12px' }}>
                <div className="input-group">
                  <label>
                    Prazo (meses)
                    <InfoTooltip content="Número total de prestações mensais contratadas." />
                  </label>
                  <input
                    type="text"
                    className="input-control"
                    value={inputPrazo}
                    onChange={e => handlePrazoChange(e.target.value)}
                  />
                </div>
                <div className="input-group">
                  <label>
                    Taxa de Juros
                    <InfoTooltip content="Taxa de juros nominal contratada (a.a. ou a.m.)." />
                  </label>
                  <div className="flex-center gap-xs">
                    <input
                      type="text"
                      className="input-control"
                      value={inputJuros}
                      onChange={e => handleJurosChange(e.target.value)}
                    />
                    <select 
                      aria-label="Tipo de taxa" 
                      className="input-control input-control--sm" 
                      value={rawParams.taxaJurosTipo} 
                      onChange={e => setRawParams((p: any) => ({ ...p, taxaJurosTipo: e.target.value as InterestRateType }))}
                    >
                      <option value="AA">a.a.</option>
                      <option value="AM">a.m.</option>
                    </select>
                  </div>
                  {convertedJurosText && (
                    <span className="input-hint">
                      {convertedJurosText}
                    </span>
                  )}
                </div>
              </div>

              <div className="input-group">
                <label>
                  Valor do Imóvel (Avaliação)
                  <InfoTooltip content="Valor de avaliação oficial do imóvel definido pela instituição financeira." />
                </label>
                <CurrencyInput
                  className="input-control"
                  value={rawParams.valorImovel}
                  onChange={val => setRawParams((p: any) => ({ ...p, valorImovel: val }))}
                />
              </div>

              <div className="input-group">
                <label>
                  Sistema de Amortização
                  <InfoTooltip content="SAC tem parcelas decrescentes e amortização constante. PRICE tem parcelas constantes e amortizações crescentes." />
                </label>
                <select 
                  className="input-control" 
                  value={rawParams.sistema} 
                  onChange={e => setRawParams((p: any) => ({ ...p, sistema: e.target.value as AmortizationSystem }))}
                >
                  <option value="SAC">SAC (Decrescente)</option>
                  <option value="PRICE">PRICE (Constante)</option>
                </select>
              </div>

              <div className="grid-cols-2" style={{ gap: '12px' }}>
                <div className="input-group">
                  <label>
                    TR Estimada (% a.m.)
                    <InfoTooltip content="Taxa Referencial média estimada para correção monetária mensal do saldo devedor." />
                  </label>
                  <input
                    type="text"
                    className="input-control"
                    value={inputTR}
                    onChange={e => handleTRChange(e.target.value)}
                  />
                </div>
                <div className="input-group">
                  <label>
                    Tarifa Admin. Mensal
                    <InfoTooltip content="Tarifa de administração mensal cobrada no boleto do financiamento." />
                  </label>
                  <CurrencyInput
                    className="input-control"
                    value={rawParams.tarifaAdministracao}
                    onChange={val => setRawParams((p: any) => ({ ...p, tarifaAdministracao: val }))}
                  />
                </div>
              </div>

              <div className="input-group">
                <div className="flex-center gap-sm">
                  <input
                    id="segurosToggle"
                    type="checkbox"
                    className="checkbox"
                    checked={incluirSeguros}
                    onChange={e => setIncluirSeguros(e.target.checked)}
                  />
                  <label htmlFor="segurosToggle" className="checkbox-label">
                    Incluir Seguros habitacionais obrigatórios (MIP/DFI)
                    <InfoTooltip content="Seguros de Morte e Invalidez Permanente (MIP) e Danos Físicos ao Imóvel (DFI) obrigatórios por lei." />
                  </label>
                </div>
              </div>

              {incluirSeguros && (
                <div className="input-group">
                  <label>
                    Sua Idade
                    <InfoTooltip content="A idade influi diretamente na alíquota do seguro MIP cobrado na parcela." />
                  </label>
                  <input
                    type="text"
                    className="input-control"
                    value={inputIdade}
                    onChange={e => handleIdadeChange(e.target.value)}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Coluna 2: Perfis */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Gerenciador de Perfis */}
            <div className="panel">
              <h2 className="flex-center gap-sm">
                <User size={20} className="text-accent" />
                Gerenciador de Perfis
              </h2>
              <p className="text-secondary text-base mb-sm">Salve ou carregue diferentes perfis de simulação.</p>
              
              <div className="mt-xl" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="input-group">
                  <label>Nome do perfil</label>
                  <input
                    type="text"
                    className="input-control"
                    value={profileName}
                    onChange={e => setProfileName(e.target.value)}
                    placeholder="Ex: Minha Caixa"
                  />
                </div>
                <div className="input-group">
                  <label>Carregar perfil salvo</label>
                  <select
                    className="input-control"
                    value={selectedProfileId}
                    onChange={e => setSelectedProfileId(e.target.value)}
                  >
                    <option value="">Selecione um perfil...</option>
                    {profiles.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginTop: '8px' }}>
                  <button className="btn btn-primary flex-center gap-xs" onClick={handleSaveProfile} style={{ padding: '10px 8px', justifyContent: 'center' }}>
                    <Save size={16} />
                    <span>Salvar</span>
                  </button>
                  <button className="btn btn-secondary flex-center gap-xs" onClick={handleLoadProfile} style={{ padding: '10px 8px', justifyContent: 'center' }}>
                    <Upload size={16} />
                    <span>Carregar</span>
                  </button>
                  <button className="btn btn-secondary flex-center gap-xs" onClick={handleResetState} style={{ padding: '10px 8px', justifyContent: 'center' }}>
                    <RotateCcw size={16} />
                    <span>Resetar</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}


      {/* Toast Notification */}
      {toast && (
        <div className={`toast toast-${toast.type}`}>
          {toast.type === 'success' && <CheckCircle size={16} />}
          {toast.type === 'error' && <AlertCircle size={16} />}
          {toast.type === 'info' && <Info size={16} />}
          <span>{toast.message}</span>
        </div>
      )}
    </AppLayout>
  );
}

export default function App() {
  return (
    <SimulatorProvider>
      <AppContent />
    </SimulatorProvider>
  );
}
