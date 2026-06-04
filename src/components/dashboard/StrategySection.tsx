import { useState } from 'react';
import { useSimulator } from '../../context/SimulatorContext';
import { 
  Repeat, 
  ArrowUpRight, 
  Trash2, 
  Pencil,
  Plus
} from 'lucide-react';
import { formatCurrency, formatMonthsToYearsAndMonths } from '../../utils/formatters';
import type { StrategyRule } from '../../hooks/useSimulatorState';

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

export function StrategySection() {
  const { 
    strategies, 
    addStrategy, 
    removeStrategy, 
    handleClearAllStrategies,
    rawParams
  } = useSimulator();

  const [activeTab, setActiveTab] = useState<'recorrente' | 'pontual'>('recorrente');

  // Estados locais para formulário
  const [recValor, setRecValor] = useState(0);
  const [recInicio, setRecInicio] = useState<number | ''>(1);
  const [recFim, setRecFim] = useState<number | ''>(rawParams.prazoMeses);
  const [recIntervalo, setRecIntervalo] = useState<number | ''>(1);
  const [recIntervaloTipo, setRecIntervaloTipo] = useState<'meses' | 'anos'>('meses');
  const [recReducao, setRecReducao] = useState<'PRAZO' | 'PARCELA'>('PRAZO');

  const [pontValor, setPontValor] = useState(0);
  const [pontMes, setPontMes] = useState<number | ''>(1);
  const [pontReducao, setPontReducao] = useState<'PRAZO' | 'PARCELA'>('PRAZO');

  const handleAddRecorrente = () => {
    if (recValor <= 0) return;
    const start = typeof recInicio === 'number' ? recInicio : 1;
    const end = typeof recFim === 'number' ? recFim : rawParams.prazoMeses;
    const interval = typeof recIntervalo === 'number' ? recIntervalo : 1;
    const intervalInMonths = recIntervaloTipo === 'anos' ? interval * 12 : interval;
    
    addStrategy({
      type: 'recorrente',
      value: recValor,
      mesInicio: start,
      mesFim: end,
      intervalo: intervalInMonths,
      tipoReducao: recReducao,
      configText: `Do mês ${start} ao ${end} a cada ${interval} ${recIntervaloTipo === 'meses' ? 'meses' : 'anos'}`
    });

    // Reset
    setRecValor(0);
  };

  // Adicionar pontual
  const handleAddPontual = () => {
    if (pontValor <= 0) return;
    const mes = typeof pontMes === 'number' ? pontMes : 1;
    addStrategy({
      type: 'pontual',
      value: pontValor,
      mesInicio: mes,
      tipoReducao: pontReducao,
      configText: `Mês ${mes}`
    });

    // Reset
    setPontValor(0);
  };

  // Editar estratégia
  const handleEdit = (strategy: StrategyRule) => {
    removeStrategy(strategy.id);
    setActiveTab(strategy.type);
    if (strategy.type === 'recorrente') {
      setRecValor(strategy.value || 0);
      setRecInicio(strategy.mesInicio || 1);
      setRecFim(strategy.mesFim || rawParams.prazoMeses);
      setRecIntervalo(strategy.intervalo || 1);
      setRecReducao(strategy.tipoReducao || 'PRAZO');
    } else if (strategy.type === 'pontual') {
      setPontValor(strategy.value || 0);
      setPontMes(strategy.mesInicio || 1);
      setPontReducao(strategy.tipoReducao || 'PRAZO');
    }
  };

  return (
    <div className="strategy-tabs-container">
      {/* 1. Card "Adicionar estratégia" */}
      <div className="panel">
        <div className="strategy-tabs-nav">
          <button 
            className={`strategy-tab-btn ${activeTab === 'recorrente' ? 'active' : ''}`}
            onClick={() => setActiveTab('recorrente')}
          >
            <Repeat size={16} />
            <span>Amortização recorrente</span>
          </button>
          <button 
            className={`strategy-tab-btn ${activeTab === 'pontual' ? 'active' : ''}`}
            onClick={() => setActiveTab('pontual')}
          >
            <ArrowUpRight size={16} />
            <span>Amortização pontual</span>
          </button>
        </div>

        <div style={{ marginTop: '20px' }}>
          {activeTab === 'recorrente' && (
            <div>
              <div className="strategy-form-grid" style={{ '--desktop-cols': '5' } as React.CSSProperties}>
                <div className="input-group" style={{ marginBottom: 0 }}>
                  <label>Valor</label>
                  <CurrencyInput 
                    value={recValor} 
                    onChange={setRecValor} 
                    className="input-control" 
                  />
                </div>
                <div className="input-group" style={{ marginBottom: 0 }}>
                  <label>Mês início</label>
                  <input 
                    type="number" 
                    min="1" 
                    value={recInicio} 
                    onChange={(e) => {
                      const v = e.target.value;
                      setRecInicio(v === '' ? '' : (parseInt(v, 10) || 1));
                    }} 
                    className="input-control" 
                  />
                </div>
                <div className="input-group" style={{ marginBottom: 0 }}>
                  <label>Mês fim</label>
                  <input 
                    type="number" 
                    min="1" 
                    value={recFim} 
                    onChange={(e) => {
                      const v = e.target.value;
                      setRecFim(v === '' ? '' : (parseInt(v, 10) || rawParams.prazoMeses));
                    }} 
                    className="input-control" 
                  />
                </div>
                <div className="input-group" style={{ marginBottom: 0 }}>
                  <label>Intervalo</label>
                  <div className="flex-center gap-xs">
                    <input 
                      type="number" 
                      min="1" 
                      value={recIntervalo} 
                      onChange={(e) => {
                        const v = e.target.value;
                        setRecIntervalo(v === '' ? '' : (parseInt(v, 10) || 1));
                      }} 
                      className="input-control" 
                    />
                    <select 
                      className="input-control input-control--sm" 
                      value={recIntervaloTipo}
                      onChange={(e) => setRecIntervaloTipo(e.target.value as 'meses' | 'anos')}
                    >
                      <option value="meses">Mês(es)</option>
                      <option value="anos">Ano(s)</option>
                    </select>
                  </div>
                </div>
                <div className="input-group" style={{ marginBottom: 0 }}>
                  <label>Redução</label>
                  <select 
                    className="input-control" 
                    value={recReducao} 
                    onChange={(e) => setRecReducao(e.target.value as 'PRAZO' | 'PARCELA')}
                  >
                    <option value="PRAZO">Prazo</option>
                    <option value="PARCELA">Parcela</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
                <button className="btn btn-primary" onClick={handleAddRecorrente}>
                  <Plus size={16} />
                  <span>Adicionar estratégia</span>
                </button>
              </div>
            </div>
          )}
 
          {activeTab === 'pontual' && (
            <div>
              <div className="strategy-form-grid" style={{ '--desktop-cols': '3' } as React.CSSProperties}>
                <div className="input-group" style={{ marginBottom: 0 }}>
                  <label>Valor</label>
                  <CurrencyInput 
                    value={pontValor} 
                    onChange={setPontValor} 
                    className="input-control" 
                  />
                </div>
                <div className="input-group" style={{ marginBottom: 0 }}>
                  <label>Mês</label>
                  <input 
                    type="number" 
                    min="1" 
                    value={pontMes} 
                    onChange={(e) => {
                      const v = e.target.value;
                      setPontMes(v === '' ? '' : (parseInt(v, 10) || 1));
                    }} 
                    className="input-control" 
                  />
                </div>
                <div className="input-group" style={{ marginBottom: 0 }}>
                  <label>Redução</label>
                  <select 
                    className="input-control" 
                    value={pontReducao} 
                    onChange={(e) => setPontReducao(e.target.value as 'PRAZO' | 'PARCELA')}
                  >
                    <option value="PRAZO">Prazo</option>
                    <option value="PARCELA">Parcela</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
                <button className="btn btn-primary" onClick={handleAddPontual}>
                  <Plus size={16} />
                  <span>Adicionar estratégia</span>
                </button>
              </div>
            </div>
          )}
 
          <p className="strategy-form-description">
            {activeTab === 'recorrente' && 'Ex.: R$ 10.000,00 do mês 1 ao 420, a cada 6 meses para reduzir o prazo.'}
            {activeTab === 'pontual' && 'Ex.: R$ 10.000,00 no mês 12 para reduzir o prazo.'}
          </p>
        </div>
      </div>

      {/* 2. Card "Estratégias ativas" */}
      <div className="panel">
        <div className="active-strategies-header">
          <div className="flex-center gap-sm">
            <h2 className="section-title" style={{ margin: 0 }}>Estratégias ativas</h2>
            <span className="strategies-badge">{strategies.length} {strategies.length === 1 ? 'estratégia' : 'estratégias'}</span>
          </div>
          {strategies.length > 0 && (
            <button className="btn-clear-all" onClick={handleClearAllStrategies}>
              Limpar todas
            </button>
          )}
        </div>

        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th className="text-center" style={{ width: '40px' }}>#</th>
                <th className="text-left">Tipo</th>
                <th className="text-left">Configuração</th>
                <th>Valor</th>
                <th>Redução</th>
                <th className="text-center" style={{ borderLeft: '1px solid var(--panel-border)' }}>Parcelas elim.</th>
                <th className="text-center">Prazo reduzido</th>
                <th>Economia de juros</th>
                <th className="text-center">Ações</th>
              </tr>
            </thead>
            <tbody>
              {strategies.map((s, idx) => {
                const isRec = s.type === 'recorrente';
                const isPont = s.type === 'pontual';
                
                return (
                  <tr key={s.id}>
                    <td className="text-center text-secondary">{idx + 1}</td>
                    <td className="text-left font-semibold">
                      <div className="flex-center gap-sm">
                        {isRec && <Repeat size={14} className="text-accent" />}
                        {isPont && <ArrowUpRight size={14} className="text-purple" />}
                        <span>
                          {isRec && 'Amortização recorrente'}
                          {isPont && 'Amortização pontual'}
                        </span>
                      </div>
                    </td>
                    <td className="text-left text-secondary font-medium">{s.configText}</td>
                    <td>{s.value ? formatCurrency(s.value) : '—'}</td>
                    <td>
                      {s.tipoReducao ? (
                        <span className={s.tipoReducao === 'PRAZO' ? 'badge badge--prazo' : 'badge badge--parcela'}>
                          {s.tipoReducao === 'PRAZO' ? 'Prazo' : 'Parcela'}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="text-center font-bold text-success" style={{ borderLeft: '1px solid var(--panel-border)' }}>
                      {s.parcelasEliminadas > 0 ? s.parcelasEliminadas : '—'}
                    </td>
                    <td className="text-center font-semibold text-success">
                      {s.prazoReduzido > 0 ? formatMonthsToYearsAndMonths(s.prazoReduzido) : '—'}
                    </td>
                    <td className="font-bold text-success">
                      {s.economiaJuros > 0 ? formatCurrency(s.economiaJuros) : '—'}
                    </td>
                    <td className="text-center">
                      <div className="table-actions-cell">
                        <button className="action-btn" onClick={() => handleEdit(s)} title="Editar estratégia">
                          <Pencil size={14} />
                        </button>
                        <button className="action-btn delete" onClick={() => removeStrategy(s.id)} title="Excluir estratégia">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {strategies.length === 0 && (
                <tr>
                  <td colSpan={9} className="text-center text-secondary" style={{ padding: '24px' }}>
                    Nenhuma estratégia ativa no momento. Adicione uma estratégia acima para simular.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
