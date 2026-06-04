import { useState, useCallback } from 'react';
import { useSimulator } from '../../context/SimulatorContext';
import { formatCurrency } from '../../utils/formatters';
import { FGTSSimulator, type FGTSWinnerInfo } from '../FGTSSimulator';
import { type InterestRateType } from '../../engine/amortization';
import { TrendingUp, AlertCircle, Edit2, Check, Wallet, Info, Download, Trophy, PiggyBank } from 'lucide-react';
import { 
  ResponsiveContainer, CartesianGrid, XAxis, YAxis, Tooltip, LineChart, Line
} from 'recharts';

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

function InfoTooltip({ content }: { content: string }) {
  return (
    <span className="tooltip-trigger" tabIndex={0}>
      <Info size={14} className="text-secondary" style={{ marginLeft: '6px', verticalAlign: 'middle', opacity: 0.8 }} />
      <span className="tooltip-content">{content}</span>
    </span>
  );
}

export function SimulationStrategiesTab() {
  const {
    params,
    investimento, setInvestimento,
    inputInvestimentoTaxa, handleInvestimentoTaxaChange,
    inputInvestimentoMeses, handleInvestimentoMesesChange,
    lineChartData,
    comparacao,
    totalJurosOrig,
    inputJuros,
    simInvestimento,
  } = useSimulator();

  const [activeSubTab, setActiveSubTab] = useState<'investimento' | 'fgts'>('investimento');
  const [isEditingParams, setIsEditingParams] = useState(false);
  const [fgtsWinner, setFgtsWinner] = useState<FGTSWinnerInfo | null>(null);
  const handleFgtsWinnerChange = useCallback((info: FGTSWinnerInfo) => setFgtsWinner(info), []);

  const isHoje = comparacao.recommendation === 'HOJE';

  const formatMonths = (m: number): string => {
    const abs = Math.abs(m);
    const sign = m < 0 ? '-' : '';
    const y = Math.floor(abs / 12);
    const mo = abs % 12;
    if (y === 0) return `${sign}${mo} meses`;
    if (mo === 0) return `${sign}${y} ${y === 1 ? 'ano' : 'anos'}`;
    return `${sign}${y} ${y === 1 ? 'ano' : 'anos'} e ${mo} meses`;
  };
  const winner = isHoje ? comparacao.hoje : comparacao.depois;
  const loser = isHoje ? comparacao.depois : comparacao.hoje;
  const nominalDelta = loser.custoTotal - winner.custoTotal;
  
  const winnerName = isHoje ? 'Amortizar hoje' : 'Investir e amortizar depois';
  const winnerPrazo = winner.resultadoAmortizacao.tabela.length;
  // Diferença de parcelas eliminadas entre as duas estratégias (quanto o vencedor elimina a mais que o perdedor)
  const parcelasDelta = winner.parcelasMortas - loser.parcelasMortas;
  // Diferença de prazo entre os dois cenários
  const prazoDelta = loser.resultadoAmortizacao.tabela.length - winner.resultadoAmortizacao.tabela.length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* 1. Cabeçalho */}
      <div className="flex-between" style={{ alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 700, marginBottom: '8px' }}>Simulação & Estratégias</h1>
          <p className="text-secondary text-base">
            Compare diferentes estratégias e descubra a melhor forma de amortizar seu financiamento.
          </p>
        </div>
        <button className="btn btn-secondary flex-center gap-xs">
          <Download size={16} />
          <span>Exportar relatório</span>
        </button>
      </div>

      {/* 2. Card Destaque Superior */}
      {activeSubTab === 'investimento' && (
        <div className="panel" style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '32px', borderLeft: '4px solid #10b981' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1 }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Trophy size={32} color="#10b981" />
            </div>
            <div>
              <div style={{ color: '#10b981', fontWeight: 600, fontSize: '0.9rem', marginBottom: '4px' }}>Melhor estratégia</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 700 }}>{winnerName}</div>
              <div className="text-secondary" style={{ fontSize: '0.9rem', marginTop: '4px' }}>Essa estratégia gera o melhor resultado financeiro no seu cenário.</div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '48px' }}>
            <div>
              <div className="text-secondary" style={{ fontSize: '0.9rem', marginBottom: '4px' }}>Economia adicional</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#10b981' }}>{formatCurrency(nominalDelta)}</div>
              <div className="text-secondary" style={{ fontSize: '0.8rem' }}>vs {isHoje ? 'investir depois' : 'amortizar hoje'}</div>
            </div>
            <div>
              <div className="text-secondary" style={{ fontSize: '0.9rem', marginBottom: '4px' }}>Parcelas a mais</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 700 }}>+{parcelasDelta} parcelas</div>
              <div className="text-secondary" style={{ fontSize: '0.8rem' }}>eliminadas vs {isHoje ? 'investir depois' : 'amortizar hoje'}</div>
            </div>
            <div>
              <div className="text-secondary" style={{ fontSize: '0.9rem', marginBottom: '4px' }}>Prazo final</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 700 }}>{formatMonths(winnerPrazo)}</div>
              <div className="text-secondary" style={{ fontSize: '0.8rem' }}>{formatMonths(prazoDelta)} a menos</div>
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'fgts' && fgtsWinner && (
        <div className="panel" style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '32px', borderLeft: `4px solid ${fgtsWinner.accent}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1 }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: fgtsWinner.winnerIsA ? 'rgba(56,189,248,0.1)' : 'rgba(251,191,36,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Trophy size={32} color={fgtsWinner.accent} />
            </div>
            <div>
              <div style={{ color: fgtsWinner.accent, fontWeight: 600, fontSize: '0.9rem', marginBottom: '4px' }}>Melhor estratégia</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 700 }}>{fgtsWinner.name}</div>
              <div className="text-secondary" style={{ fontSize: '0.9rem', marginTop: '4px' }}>Essa estratégia gera o menor custo real do bolso no seu cenário.</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '48px' }}>
            <div>
              <div className="text-secondary" style={{ fontSize: '0.9rem', marginBottom: '4px' }}>Economia no bolso</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--success-color)' }}>{formatCurrency(fgtsWinner.deltaCusto)}</div>
              <div className="text-secondary" style={{ fontSize: '0.8rem' }}>vs {fgtsWinner.winnerIsA ? 'acumular e quitar' : 'amortizar periodicamente'}</div>
            </div>
            <div>
              <div className="text-secondary" style={{ fontSize: '0.9rem', marginBottom: '4px' }}>Meses a menos</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 700 }}>{Math.abs(fgtsWinner.deltaPrazo)} meses</div>
              <div className="text-secondary" style={{ fontSize: '0.8rem' }}>de prazo comparado à outra</div>
            </div>
            <div>
              <div className="text-secondary" style={{ fontSize: '0.9rem', marginBottom: '4px' }}>Quita em</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 700 }}>{fgtsWinner.mesesVencedor} meses</div>
            </div>
          </div>
        </div>
      )}

      {/* 3. Sub-tabs */}
      <div style={{ display: 'flex', gap: '32px', marginBottom: '24px', borderBottom: '1px solid var(--panel-border)' }}>
        <button 
          onClick={() => setActiveSubTab('investimento')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 4px',
            background: 'transparent',
            color: activeSubTab === 'investimento' ? '#2563eb' : 'var(--text-secondary)',
            border: 'none',
            borderBottom: activeSubTab === 'investimento' ? '2px solid #2563eb' : '2px solid transparent',
            fontWeight: activeSubTab === 'investimento' ? 600 : 500,
            cursor: 'pointer',
            fontSize: '0.9rem',
            marginBottom: '-1px'
          }}
        >
          <TrendingUp size={16} color={activeSubTab === 'investimento' ? '#2563eb' : 'currentColor'} />
          <span>Comparação: Investimento</span>
        </button>
        <button 
          onClick={() => setActiveSubTab('fgts')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 4px',
            background: 'transparent',
            color: activeSubTab === 'fgts' ? '#10b981' : 'var(--text-secondary)',
            border: 'none',
            borderBottom: activeSubTab === 'fgts' ? '2px solid #10b981' : '2px solid transparent',
            fontWeight: activeSubTab === 'fgts' ? 600 : 500,
            cursor: 'pointer',
            fontSize: '0.9rem',
            marginBottom: '-1px'
          }}
        >
          <PiggyBank size={16} color={activeSubTab === 'fgts' ? '#10b981' : 'currentColor'} />
          <span>Simulador de Estratégias do FGTS</span>
        </button>
      </div>

      {/* Conteúdo das Sub-tabs */}
      {activeSubTab === 'fgts' && (
        <FGTSSimulator amortizationParams={params} jurosSemAportes={totalJurosOrig} onWinnerChange={handleFgtsWinnerChange} />
      )}

      {activeSubTab === 'investimento' && (
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
          
          {/* COLUNA ESQUERDA: Comparação de Estratégias */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            <div className="panel">
              <div className="flex-between" style={{ marginBottom: '16px' }}>
                <div>
                  <h2 style={{ fontSize: '1.2rem', marginBottom: '4px' }}>Comparação de Estratégias</h2>
                  <p className="text-secondary text-sm">Resultados projetados considerando o valor disponível e a taxa de rendimento informados.</p>
                </div>
              </div>

              <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.95rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--panel-border)' }}>
                        <th style={{ borderRight: '1px solid var(--panel-border)', borderLeft: 'none', textAlign: 'left', padding: '12px 16px', color: 'var(--text-secondary)', fontWeight: 500 }}>Métrica</th>
                        <th style={{ borderRight: '1px solid var(--panel-border)', borderLeft: 'none', textAlign: 'left', padding: '12px 16px', color: 'var(--text-secondary)', fontWeight: 500 }}>
                          Amortizar hoje<br/>
                          <span style={{ fontSize: '0.8rem', color: '#38bdf8' }}>Cenário A {isHoje ? <span style={{ background: '#10b981', color: '#fff', padding: '2px 6px', borderRadius: '4px', fontSize: '0.7rem', marginLeft: '4px' }}>Melhor</span> : ''}</span>
                        </th>
                        <th style={{ borderRight: '1px solid var(--panel-border)', borderLeft: 'none', textAlign: 'left', padding: '12px 16px', color: 'var(--text-secondary)', fontWeight: 500 }}>
                          Investir e amortizar depois<br/>
                          <span style={{ fontSize: '0.8rem', color: '#10b981' }}>Cenário B {!isHoje ? <span style={{ background: '#10b981', color: '#fff', padding: '2px 6px', borderRadius: '4px', fontSize: '0.7rem', marginLeft: '4px' }}>Melhor</span> : ''}</span>
                        </th>
                        <th style={{ borderRight: 'none', borderLeft: 'none', textAlign: 'left', padding: '12px 16px', color: 'var(--text-secondary)', fontWeight: 500 }}>
                          Diferença<br/>
                          <span style={{ fontSize: '0.8rem' }}>B - A</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr style={{ borderBottom: '1px solid var(--panel-border)' }}>
                        <td style={{ borderRight: '1px solid var(--panel-border)', borderLeft: 'none', padding: '12px 16px' }}>Saldo final devedor</td>
                        <td style={{ borderRight: '1px solid var(--panel-border)', borderLeft: 'none', padding: '12px 16px' }}>{formatCurrency(comparacao.hoje.resultadoAmortizacao.tabela[comparacao.hoje.resultadoAmortizacao.tabela.length - 1]?.saldoDevedorFinal || 0)}</td>
                        <td style={{ borderRight: '1px solid var(--panel-border)', borderLeft: 'none', padding: '12px 16px', color: !isHoje ? '#10b981' : 'inherit' }}>{formatCurrency(comparacao.depois.resultadoAmortizacao.tabela[comparacao.depois.resultadoAmortizacao.tabela.length - 1]?.saldoDevedorFinal || 0)}</td>
                        <td style={{ borderRight: 'none', borderLeft: 'none', padding: '12px 16px', color: comparacao.depois.resultadoAmortizacao.tabela[comparacao.depois.resultadoAmortizacao.tabela.length - 1]?.saldoDevedorFinal - comparacao.hoje.resultadoAmortizacao.tabela[comparacao.hoje.resultadoAmortizacao.tabela.length - 1]?.saldoDevedorFinal < 0 ? '#10b981' : 'inherit' }}>
                          {formatCurrency(comparacao.depois.resultadoAmortizacao.tabela[comparacao.depois.resultadoAmortizacao.tabela.length - 1]?.saldoDevedorFinal - comparacao.hoje.resultadoAmortizacao.tabela[comparacao.hoje.resultadoAmortizacao.tabela.length - 1]?.saldoDevedorFinal || 0)}
                        </td>
                      </tr>
                      <tr style={{ borderBottom: '1px solid var(--panel-border)' }}>
                        <td style={{ borderRight: '1px solid var(--panel-border)', borderLeft: 'none', padding: '12px 16px' }}>Prazo final</td>
                        <td style={{ borderRight: '1px solid var(--panel-border)', borderLeft: 'none', padding: '12px 16px' }}>{formatMonths(comparacao.hoje.resultadoAmortizacao.tabela.length)}</td>
                        <td style={{ borderRight: '1px solid var(--panel-border)', borderLeft: 'none', padding: '12px 16px', color: !isHoje ? '#10b981' : 'inherit' }}>{formatMonths(comparacao.depois.resultadoAmortizacao.tabela.length)}</td>
                        <td style={{ borderRight: 'none', borderLeft: 'none', padding: '12px 16px', color: comparacao.depois.resultadoAmortizacao.tabela.length - comparacao.hoje.resultadoAmortizacao.tabela.length < 0 ? '#10b981' : 'inherit' }}>
                          {formatMonths(comparacao.depois.resultadoAmortizacao.tabela.length - comparacao.hoje.resultadoAmortizacao.tabela.length)}
                        </td>
                      </tr>
                      <tr style={{ borderBottom: '1px solid var(--panel-border)' }}>
                        <td style={{ borderRight: '1px solid var(--panel-border)', borderLeft: 'none', padding: '12px 16px' }}>Parcelas eliminadas</td>
                        <td style={{ borderRight: '1px solid var(--panel-border)', borderLeft: 'none', padding: '12px 16px' }}>{comparacao.hoje.parcelasMortas}</td>
                        <td style={{ borderRight: '1px solid var(--panel-border)', borderLeft: 'none', padding: '12px 16px', color: !isHoje ? '#10b981' : 'inherit' }}>{comparacao.depois.parcelasMortas}</td>
                        <td style={{ borderRight: 'none', borderLeft: 'none', padding: '12px 16px', color: comparacao.depois.parcelasMortas - comparacao.hoje.parcelasMortas > 0 ? '#10b981' : 'inherit' }}>
                          +{comparacao.depois.parcelasMortas - comparacao.hoje.parcelasMortas}
                        </td>
                      </tr>
                      <tr style={{ borderBottom: '1px solid var(--panel-border)' }}>
                        <td style={{ borderRight: '1px solid var(--panel-border)', borderLeft: 'none', padding: '12px 16px' }}>Total de juros pagos</td>
                        <td style={{ borderRight: '1px solid var(--panel-border)', borderLeft: 'none', padding: '12px 16px' }}>{formatCurrency(comparacao.hoje.resultadoAmortizacao.tabela.reduce((sum, row) => sum + row.juros, 0))}</td>
                        <td style={{ borderRight: '1px solid var(--panel-border)', borderLeft: 'none', padding: '12px 16px', color: !isHoje ? '#10b981' : 'inherit' }}>{formatCurrency(comparacao.depois.resultadoAmortizacao.tabela.reduce((sum, row) => sum + row.juros, 0))}</td>
                        <td style={{ borderRight: 'none', borderLeft: 'none', padding: '12px 16px', color: comparacao.depois.resultadoAmortizacao.tabela.reduce((sum, row) => sum + row.juros, 0) - comparacao.hoje.resultadoAmortizacao.tabela.reduce((sum, row) => sum + row.juros, 0) < 0 ? '#10b981' : 'inherit' }}>
                          {formatCurrency(comparacao.depois.resultadoAmortizacao.tabela.reduce((sum, row) => sum + row.juros, 0) - comparacao.hoje.resultadoAmortizacao.tabela.reduce((sum, row) => sum + row.juros, 0))}
                        </td>
                      </tr>
                      <tr>
                        <td style={{ borderRight: '1px solid var(--panel-border)', borderLeft: 'none', padding: '12px 16px', fontWeight: 600 }}>Custo total (juros + saldo)</td>
                        <td style={{ borderRight: '1px solid var(--panel-border)', borderLeft: 'none', padding: '12px 16px', fontWeight: 600 }}>{formatCurrency(comparacao.hoje.custoTotal)}</td>
                        <td style={{ borderRight: '1px solid var(--panel-border)', borderLeft: 'none', padding: '12px 16px', fontWeight: 600, color: !isHoje ? '#10b981' : 'inherit' }}>{formatCurrency(comparacao.depois.custoTotal)}</td>
                        <td style={{ borderRight: 'none', borderLeft: 'none', padding: '12px 16px', fontWeight: 600, color: comparacao.depois.custoTotal - comparacao.hoje.custoTotal < 0 ? '#10b981' : 'inherit' }}>
                          {formatCurrency(comparacao.depois.custoTotal - comparacao.hoje.custoTotal)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
            </div>

            <div className="panel">
              <div className="flex-between" style={{ marginBottom: '16px' }}>
                <h3 style={{ fontSize: '1.1rem' }}>Evolução do Saldo Devedor <InfoTooltip content="Como a dívida diminui ao longo do tempo" /></h3>
                <div style={{ display: 'flex', gap: '16px', fontSize: '0.85rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#38bdf8' }}></span>
                    Amortizar hoje
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }}></span>
                    Investir e amortizar depois
                  </div>
                </div>
              </div>

              <div style={{ height: '280px', width: '100%', marginTop: '24px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={lineChartData} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis dataKey="mes" stroke="var(--text-secondary)" tickFormatter={v => `${v}`} style={{ fontSize: '12px' }} />
                    <YAxis stroke="var(--text-secondary)" tickFormatter={v => `R$ ${(v / 1000).toFixed(0)}k`} style={{ fontSize: '12px' }} />
                    <Tooltip
                      formatter={(value: any) => [formatCurrency(Number(value)), '']}
                      contentStyle={{ backgroundColor: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--text-primary)', fontSize: '12px', borderRadius: '8px' }}
                    />
                    <Line type="monotone" dataKey="Cenário A (Amortizar Hoje) (Dívida)" stroke="#38bdf8" strokeWidth={2} dot={false} name="Amortizar Hoje" />
                    <Line type="monotone" dataKey="Cenário B (Investir e Amortizar Depois) (Dívida)" stroke="#10b981" strokeWidth={2} dot={false} name="Investir e amortizar depois" />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div style={{ background: 'rgba(56, 189, 248, 0.1)', padding: '12px 16px', borderRadius: '8px', display: 'flex', alignItems: 'flex-start', gap: '12px', marginTop: '24px' }}>
                <Info size={20} color="#38bdf8" style={{ marginTop: '2px', flexShrink: 0 }} />
                <span style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                  O cenário "Investir e amortizar depois" mantém o saldo um pouco maior no início, mas compensa com o rendimento do investimento ao longo do tempo.
                </span>
              </div>
            </div>

          </div>

          {/* COLUNA DIREITA: Sidebar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            <div className="panel">
              <div className="flex-between" style={{ marginBottom: '20px', borderBottom: '1px solid var(--panel-border)', paddingBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <TrendingUp size={18} className="text-accent" />
                  <h3 style={{ fontSize: '1.05rem', margin: 0 }}>Parâmetros da Simulação</h3>
                </div>
                {!isEditingParams ? (
                  <button className="btn btn-sm" onClick={() => setIsEditingParams(true)}>
                    <Edit2 size={14} /> Editar
                  </button>
                ) : (
                  <button className="btn btn-sm" style={{ background: '#10b981', color: '#fff', borderColor: '#10b981' }} onClick={() => setIsEditingParams(false)}>
                    <Check size={14} /> Salvar
                  </button>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="flex-between">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ background: 'var(--bg-color)', padding: '6px', borderRadius: '6px' }}><Wallet size={16} color="var(--text-secondary)" /></div>
                    <span className="text-secondary" style={{ fontSize: '0.9rem' }}>Valor disponível</span>
                  </div>
                  {isEditingParams ? (
                    <CurrencyInput
                      value={investimento.valor}
                      onChange={(v) => setInvestimento((p: any) => ({ ...p, valor: v }))}
                      className="input"
                    />
                  ) : (
                    <span style={{ fontWeight: 600 }}>{formatCurrency(investimento.valor)}</span>
                  )}
                </div>
                <div className="flex-between">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ background: 'var(--bg-color)', padding: '6px', borderRadius: '6px' }}><TrendingUp size={16} color="var(--text-secondary)" /></div>
                    <span className="text-secondary" style={{ fontSize: '0.9rem' }}>Taxa de rendimento</span>
                  </div>
                  {isEditingParams ? (
                    <div style={{ display: 'flex', gap: '4px', width: '140px' }}>
                      <input 
                        type="text" 
                        value={inputInvestimentoTaxa} 
                        onChange={e => handleInvestimentoTaxaChange(e.target.value)} 
                        className="input" 
                        style={{ width: '60%' }}
                      />
                      <select 
                        value={investimento.taxaTipo} 
                        onChange={e => setInvestimento((p: any) => ({ ...p, taxaTipo: e.target.value as InterestRateType }))} 
                        className="input" 
                        style={{ width: '40%', padding: '8px 4px' }}
                      >
                        <option value="AM">a.m.</option>
                        <option value="AA">a.a.</option>
                      </select>
                    </div>
                  ) : (
                    <span style={{ fontWeight: 600 }}>{investimento.taxa}% {investimento.taxaTipo === 'AM' ? 'a.m.' : 'a.a.'}</span>
                  )}
                </div>
                <div className="flex-between">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ background: 'var(--bg-color)', padding: '6px', borderRadius: '6px' }}><AlertCircle size={16} color="var(--text-secondary)" /></div>
                    <span className="text-secondary" style={{ fontSize: '0.9rem' }}>Período de espera</span>
                  </div>
                  {isEditingParams ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '140px' }}>
                      <input 
                        type="text" 
                        value={inputInvestimentoMeses} 
                        onChange={e => handleInvestimentoMesesChange(e.target.value)} 
                        className="input" 
                        style={{ width: '70%' }}
                      />
                      <span className="text-secondary">meses</span>
                    </div>
                  ) : (
                    <span style={{ fontWeight: 600 }}>{investimento.meses} meses</span>
                  )}
                </div>
                <div className="flex-between">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ background: 'var(--bg-color)', padding: '6px', borderRadius: '6px' }}><Info size={16} color="var(--text-secondary)" /></div>
                    <span className="text-secondary" style={{ fontSize: '0.9rem' }}>Taxa juros financ.</span>
                  </div>
                  <span style={{ fontWeight: 600 }}>{inputJuros}% a.a.</span>
                </div>
              </div>
            </div>


            {/* Breakdown do Investimento (Cenário B) */}
            <div className="panel">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', borderBottom: '1px solid var(--panel-border)', paddingBottom: '12px' }}>
                <TrendingUp size={18} className="text-accent" />
                <h3 style={{ fontSize: '1.05rem', margin: 0 }}>Resultado do Investimento</h3>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.9rem' }}>
                <div className="flex-between">
                  <span className="text-secondary">Principal investido</span>
                  <span style={{ fontWeight: 600 }}>{formatCurrency(investimento.valor)}</span>
                </div>
                <div className="flex-between">
                  <span className="text-secondary">Rendimento bruto</span>
                  <span style={{ fontWeight: 600, color: 'var(--success-color)' }}>+{formatCurrency(simInvestimento.valorBruto - investimento.valor)}</span>
                </div>
                <div className="flex-between">
                  <span className="text-secondary">Imposto de Renda</span>
                  <span style={{ fontWeight: 600, color: 'var(--warning-color)' }}>-{formatCurrency(simInvestimento.impostoRenda)}</span>
                </div>
                <div className="flex-between" style={{ borderTop: '1px solid var(--panel-border)', paddingTop: '10px', marginTop: '4px' }}>
                  <span style={{ fontWeight: 600 }}>Valor líquido para amortizar</span>
                  <span style={{ fontWeight: 700, color: '#10b981', fontSize: '1rem' }}>{formatCurrency(simInvestimento.valorLiquido)}</span>
                </div>
                <div style={{ background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '6px', padding: '8px 12px', fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  Amortização aplicada no mês {investimento.meses} — após {formatMonths(investimento.meses)} de rendimento.
                </div>
              </div>
            </div>

            <div className="panel">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', borderBottom: '1px solid var(--panel-border)', paddingBottom: '12px' }}>
                <TrendingUp size={18} className="text-accent" />
                <h3 style={{ fontSize: '1.05rem', margin: 0 }}>Sobre as Estratégias</h3>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ background: 'rgba(56, 189, 248, 0.05)', border: '1px solid rgba(56, 189, 248, 0.2)', padding: '16px', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                    <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#38bdf8', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 'bold' }}>A</div>
                    <h4 style={{ color: '#38bdf8', margin: 0 }}>Amortizar hoje</h4>
                  </div>
                  <p className="text-secondary" style={{ fontSize: '0.85rem', lineHeight: 1.5, margin: 0 }}>
                    Utiliza o valor disponível imediatamente para amortizar o financiamento.
                  </p>
                </div>

                <div style={{ background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.2)', padding: '16px', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                    <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#10b981', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 'bold' }}>B</div>
                    <h4 style={{ color: '#10b981', margin: 0 }}>Investir e amortizar depois</h4>
                  </div>
                  <p className="text-secondary" style={{ fontSize: '0.85rem', lineHeight: 1.5, margin: 0 }}>
                    Investe o valor por {investimento.meses} meses e depois utiliza todo o montante acumulado para amortizar.
                  </p>
                </div>
              </div>

            </div>

            <div style={{ border: '1px solid var(--panel-border)', padding: '12px 16px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Info size={16} className="text-secondary" />
              <span className="text-secondary" style={{ fontSize: '0.85rem' }}>As simulações são projeções e não garantem resultados futuros.</span>
            </div>

          </div>

        </div>
      )}

    </div>
  );
}
