/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useMemo, useEffect } from 'react';
import { type AmortizationParams } from '../engine/amortization';
import { useSimulator } from '../context/SimulatorContext';
import { simulateFGTS, computeFGTSCostOfOpportunity } from '../engine/fgts';
import { formatCurrency } from '../utils/formatters';
import { PiggyBank, CheckCircle, Download } from 'lucide-react';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend
} from 'recharts';

export interface FGTSWinnerInfo {
  name: string;
  deltaCusto: number;
  deltaPrazo: number;
  mesesVencedor: number;
  accent: string;
  winnerIsA: boolean;
}

interface FGTSSimulatorProps {
  amortizationParams: AmortizationParams;
  jurosSemAportes: number;
  onWinnerChange?: (info: FGTSWinnerInfo) => void;
}

function formatMonthsToYears(months: number): string {
  const years = Math.floor(months / 12);
  const remaining = Math.round(months % 12);
  if (years === 0) return `${remaining} meses`;
  if (remaining === 0) return `${years} anos`;
  return `${years} anos e ${remaining} meses`;
}

export function FGTSSimulator({ amortizationParams, onWinnerChange }: FGTSSimulatorProps) {
  const {
    fgtsParams,
    setFgtsParams,
    inputFgtsTaxa: inputTaxa,
    setInputFgtsTaxa: setInputTaxa,
  } = useSimulator();

  // Controle de visibilidade das linhas do gráfico
  const [chartLinesVisibility, setChartLinesVisibility] = useState({
    debtA: true,
    debtB: true,
    paidA: true,
    paidB: true,
  });

  const result = useMemo(() => {
    return simulateFGTS(amortizationParams, fgtsParams);
  }, [amortizationParams, fgtsParams]);


  const oportunidade = useMemo(() => {
    return computeFGTSCostOfOpportunity(result, fgtsParams);
  }, [result, fgtsParams]);

  const maxMes = useMemo(() => {
    return Math.max(result.estrategiaA.mesesTotal, result.estrategiaB.mesesTotal);
  }, [result]);

  const lineChartData = useMemo(() => {
    const tabA = result.estrategiaA.resultadoAmortizacao.tabela;
    const tabB = result.estrategiaB.resultadoAmortizacao.tabela;
    const maxMes = Math.max(
      tabA.length > 0 ? tabA[tabA.length - 1].mes : 0,
      tabB.length > 0 ? tabB[tabB.length - 1].mes : 0
    );

    // Maps de saldo devedor
    const debtMapA = new Map<number, number>(tabA.map(r => [r.mes, r.saldoDevedorFinal]));
    const debtMapB = new Map<number, number>(tabB.map(r => [r.mes, r.saldoDevedorFinal]));
    const lastMesA = tabA.length > 0 ? tabA[tabA.length - 1].mes : 0;
    const lastMesB = tabB.length > 0 ? tabB[tabB.length - 1].mes : 0;

    // Desembolso acumulado: parcelas + FGTS (para ambos A e B)
    const buildPaidMap = (tab: typeof tabA) => {
      let cum = 0;
      const map = new Map<number, number>();
      for (const r of tab) {
        cum += r.parcelaTotal + (r.aporteExtra || 0);
        map.set(r.mes, cum);
      }
      return { map, total: cum };
    };
    const paidA = buildPaidMap(tabA);
    const paidB = buildPaidMap(tabB);

    const lookupPaid = (paid: { map: Map<number, number>; total: number }, lastMes: number, m: number) => {
      if (m > lastMes) return paid.total;
      if (paid.map.has(m)) return paid.map.get(m)!;
      for (let k = m - 1; k >= 1; k--) {
        if (paid.map.has(k)) return paid.map.get(k)!;
      }
      return 0;
    };

    const data: Record<string, number | null>[] = [];
    // Incluir TODOS os meses para que os degraus mensais (saltos do FGTS) sejam perfeitamente visíveis
    for (let m = 1; m <= maxMes; m++) {
      const debtA = m <= lastMesA ? (debtMapA.get(m) ?? null) : (m === lastMesA + 1 ? 0 : null);
      const debtB = m <= lastMesB ? (debtMapB.get(m) ?? null) : (m === lastMesB + 1 ? 0 : null);

      data.push({
        mes: m,
        'Estratégia A (Dívida)': debtA,
        'Estratégia B (Dívida)': debtB,
        'Estratégia A (Pago)': lookupPaid(paidA, lastMesA, m),
        'Estratégia B (Pago)': lookupPaid(paidB, lastMesB, m),
      });
    }

    return data;
  }, [result]);

  const handleSaldoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '');
    const cents = val ? parseInt(val, 10) / 100 : 0;
    setFgtsParams(prev => ({ ...prev, saldoInicial: cents }));
  };

  const handleDepositoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '');
    const cents = val ? parseInt(val, 10) / 100 : 0;
    setFgtsParams(prev => ({ ...prev, depositoMensal: cents }));
  };

  const handleTaxaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputTaxa(e.target.value);
    const num = parseFloat(e.target.value.replace(',', '.'));
    if (!isNaN(num) && num >= 0) {
      setFgtsParams(prev => ({ ...prev, taxaRendimentoAnual: num }));
    }
  };

  const handleMesInicioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    const capped = isNaN(val) || val < 1 ? 1 : Math.min(val, amortizationParams.prazoMeses);
    setFgtsParams(prev => ({ ...prev, mesInicio: capped }));
  };

  const exportEstrategia = (tipo: 'A' | 'B') => {
    const res = tipo === 'A' ? result.estrategiaA.resultadoAmortizacao : result.estrategiaB.resultadoAmortizacao;
    if (!res.tabela || res.tabela.length === 0) return;

    const sep = ';';
    const fmt = (v: number) => v.toFixed(2).replace('.', ',');

    const headers = [
      'Mês', 'Amortização', 'Juros', 'Parcela Total',
      'Amort. Extra', 'Desembolso Acumulado', 'Saldo Devedor Final'
    ].join(sep);

    let cum = 0;
    const rows = res.tabela.map(row => {
      cum += row.parcelaTotal + (row.aporteExtra || 0);
      return [
        row.mes,
        fmt(row.amortizacao),
        fmt(row.juros),
        fmt(row.parcelaTotal),
        fmt(row.aporteExtra || 0),
        fmt(cum),
        fmt(row.saldoDevedorFinal),
      ].join(sep);
    });

    const csv = [headers, ...rows].join('\n');
    const bom = '﻿';
    const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `simulacao_fgts_${tipo}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Lógica do vencedor — usada no bloco de conclusão e exposta via callback
  const fgtsWinnerIsA = result.estrategiaA.custoRealDoBolso <= result.estrategiaB.custoRealDoBolso;
  const fgtsWinner = fgtsWinnerIsA ? result.estrategiaA : result.estrategiaB;
  const fgtsLoser = fgtsWinnerIsA ? result.estrategiaB : result.estrategiaA;
  const fgtsWinnerName = fgtsWinnerIsA
    ? `Amortizar a cada ${fgtsParams.cicloMeses} meses (A)`
    : 'Acumular e quitar no final (B)';
  const fgtsDeltaCusto = fgtsLoser.custoRealDoBolso - fgtsWinner.custoRealDoBolso;
  const fgtsDeltaPrazo = fgtsLoser.mesesTotal - fgtsWinner.mesesTotal;
  const fgtsAccent = fgtsWinnerIsA ? '#38bdf8' : '#fbbf24';

  // Notifica o pai sempre que o vencedor mudar
  useEffect(() => {
    onWinnerChange?.({
      name: fgtsWinnerName,
      deltaCusto: fgtsDeltaCusto,
      deltaPrazo: fgtsDeltaPrazo,
      mesesVencedor: fgtsWinner.mesesTotal,
      accent: fgtsAccent,
      winnerIsA: fgtsWinnerIsA,
    });
  }, [fgtsWinnerName, fgtsDeltaCusto, fgtsDeltaPrazo, fgtsWinner.mesesTotal, fgtsAccent, fgtsWinnerIsA, onWinnerChange]);

  return (
    <div className="panel" style={{ marginTop: '20px' }}>
      <h2><PiggyBank size={20} style={{ display: 'inline', marginRight: '8px', verticalAlign: 'middle', color: 'var(--success-color)' }} /> Simulador de Estratégias do FGTS</h2>
      <p className="text-secondary text-base mb-lg">
        Compare se vale mais a pena amortizar a cada 2 anos (Estratégia A) ou deixar acumular até quitar o contrato (Estratégia B).
      </p>


      <div className="grid-cols-2" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', marginBottom: '24px' }}>
        <div className="input-group" style={{ marginBottom: 0 }}>
          <label>Saldo Inicial do FGTS</label>
          <input
            type="text"
            className="input-control"
            value={formatCurrency(fgtsParams.saldoInicial)}
            onChange={handleSaldoChange}
          />
        </div>
        <div className="input-group" style={{ marginBottom: 0 }}>
          <label>Aporte Mensal (Média)</label>
          <input
            type="text"
            className="input-control"
            value={formatCurrency(fgtsParams.depositoMensal)}
            onChange={handleDepositoChange}
          />
        </div>
        <div className="input-group" style={{ marginBottom: 0 }}>
          <label>Rendimento Anual (%)</label>
          <input
            type="text"
            className="input-control"
            value={inputTaxa}
            onChange={handleTaxaChange}
          />
          <span className="help-text input-hint">
            Rendimento líquido (Padrão: 3% + TR + dist. de lucros, aprox. 6,05% a.a.)
          </span>
        </div>
        <div className="input-group" style={{ marginBottom: 0 }}>
          <label>Mês de Início (Hoje)</label>
          <input
            type="number"
            min="1"
            max={amortizationParams.prazoMeses}
            className="input-control"
            value={fgtsParams.mesInicio || 1}
            onChange={handleMesInicioChange}
          />
          <span className="help-text input-hint">
            Mês do contrato em que você está aplicando o saldo inicial (Padrão: 1)
          </span>
        </div>
      </div>

      {/* ========== GRÁFICO ========== */}
      <div className="chart-box" style={{ marginTop: '24px', marginBottom: '24px' }}>
        <h3 className="chart-box__title">Evolução de Saldo Devedor e Desembolsos: Estratégia A vs Estratégia B</h3>

        <div className="chart-toggles">
          <div className="chart-toggles__label">Visualizar no Gráfico:</div>
          <label className="chart-toggle" style={{ color: '#3b82f6' }}>
            <input type="checkbox" checked={chartLinesVisibility.debtA} onChange={e => setChartLinesVisibility(prev => ({ ...prev, debtA: e.target.checked }))} />
            Estratégia A (Dívida)
          </label>
          <label className="chart-toggle" style={{ color: '#f59e0b' }}>
            <input type="checkbox" checked={chartLinesVisibility.debtB} onChange={e => setChartLinesVisibility(prev => ({ ...prev, debtB: e.target.checked }))} />
            Estratégia B (Dívida)
          </label>
          <div className="chart-toggles__divider" />
          <label className="chart-toggle" style={{ color: 'var(--success-color)' }}>
            <input type="checkbox" checked={chartLinesVisibility.paidA} onChange={e => setChartLinesVisibility(prev => ({ ...prev, paidA: e.target.checked }))} />
            Estratégia A (Desembolso Acumulado)
          </label>
          <label className="chart-toggle" style={{ color: '#a855f7' }}>
            <input type="checkbox" checked={chartLinesVisibility.paidB} onChange={e => setChartLinesVisibility(prev => ({ ...prev, paidB: e.target.checked }))} />
            Estratégia B (Desembolso Acumulado)
          </label>
        </div>

        <div style={{ height: '260px', width: '100%' }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={lineChartData} margin={{ top: 10, right: 60, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="mes" stroke="var(--text-secondary)" tickFormatter={v => `${v}`} style={{ fontSize: '12px' }} />
              <YAxis
                yAxisId="debt"
                orientation="left"
                stroke="var(--text-secondary)"
                tickFormatter={v => `R$ ${(v / 1000).toFixed(0)}k`}
                style={{ fontSize: '12px' }}
                width={62}
              />
              {(chartLinesVisibility.paidA || chartLinesVisibility.paidB) && (
                <YAxis
                  yAxisId="paid"
                  orientation="right"
                  stroke="var(--text-secondary)"
                  tickFormatter={v => `R$ ${(v / 1000).toFixed(0)}k`}
                  style={{ fontSize: '12px' }}
                  width={62}
                />
              )}
              <Tooltip
                labelFormatter={(label: any) => `Mês ${label}`}
                formatter={(value: any, name: any) => {
                  const nameStr = String(name || '');
                  const abv = nameStr
                    .replace('Estratégia ', '')
                    .replace(' (Dívida)', ' Dív')
                    .replace(' (Desembolso Acumulado)', ' Des');
                  return [formatCurrency(Number(value || 0)), abv];
                }}
                contentStyle={{ backgroundColor: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--text-primary)', fontSize: '12px' }}
              />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              {chartLinesVisibility.debtA && (
                <Line yAxisId="debt" type="linear" dataKey="Estratégia A (Dívida)" stroke="#3b82f6" strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} connectNulls={false} name="Estratégia A (Dívida)" />
              )}
              {chartLinesVisibility.debtB && (
                <Line yAxisId="debt" type="linear" dataKey="Estratégia B (Dívida)" stroke="#f59e0b" strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} connectNulls={false} name="Estratégia B (Dívida)" />
              )}
              {chartLinesVisibility.paidA && (
                <Line yAxisId="paid" type="stepAfter" dataKey="Estratégia A (Pago)" stroke="var(--success-color)" strokeWidth={2} dot={false} connectNulls={false} name="Estratégia A (Desembolso Acumulado)" />
              )}
              {chartLinesVisibility.paidB && (
                <Line yAxisId="paid" type="stepAfter" dataKey="Estratégia B (Pago)" stroke="#a855f7" strokeWidth={2} dot={false} connectNulls={false} name="Estratégia B (Desembolso Acumulado)" />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ========== CARDS: Estratégia A vs B ========== */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
        {/* Estratégia A */}
        <div className="strategy-card bg-subtle">
          <h3 className="strategy-card__title text-accent" style={{ marginBottom: '12px' }}>
            A) Amortizar a cada {fgtsParams.cicloMeses} meses
            <button onClick={() => exportEstrategia('A')} className="btn-icon" title="Exportar tabela da Estratégia A" aria-label="Exportar tabela da Estratégia A" style={{ color: 'var(--accent-color)' }}>
              <Download size={16} />
            </button>
          </h3>
          <div className="strategy-card__stats">
            <p className="flex-between">
              <span>Quita em:</span>
              <strong className="text-success">{result.estrategiaA.mesesTotal} meses</strong>
            </p>
            <p className="flex-between">
              <span>Juros totais:</span>
              <strong>{formatCurrency(result.estrategiaA.jurosTotal)}</strong>
            </p>
            <p className="flex-between">
              <span>Total Pago ao Banco:</span>
              <strong title="Total pago em parcelas + FGTS utilizado. Corresponde ao final da linha do gráfico.">{formatCurrency(result.estrategiaA.totalParcelas + result.estrategiaA.totalSacadoFGTS)}</strong>
            </p>
            <p className="flex-between">
              <span>Parcelas pagas (Bolso):</span>
              <strong title="Soma de todas as parcelas mensais pagas do seu bolso (amortização + juros + taxas + seguros).">{formatCurrency(result.estrategiaA.totalParcelas)}</strong>
            </p>
            <div style={{ borderTop: '1px solid var(--panel-border)', paddingTop: '8px', marginTop: '4px' }}>
              <p className="flex-between">
                <span>{result.estrategiaA.primeiroSaque === result.estrategiaA.ultimoSaque ? 'FGTS sacado em' : 'FGTS sacado de'}</span>
                <strong>
                  {result.estrategiaA.primeiroSaque !== null
                    ? (result.estrategiaA.primeiroSaque === result.estrategiaA.ultimoSaque
                      ? result.estrategiaA.primeiroSaque
                      : `${result.estrategiaA.primeiroSaque} → ${result.estrategiaA.ultimoSaque}`)
                    : '—'}
                </strong>
              </p>
              <p className="flex-between">
                <span style={{ paddingLeft: '12px', color: 'var(--text-secondary)' }}>Total sacado:</span>
                <span>{formatCurrency(result.estrategiaA.totalSacadoFGTS)}</span>
              </p>
              <p className="flex-between">
                <span style={{ paddingLeft: '12px', color: 'var(--text-secondary)' }}>Depósitos:</span>
                <span>{formatCurrency(result.estrategiaA.totalSacadoDepositos)}</span>
              </p>
              <p className="flex-between">
                <span style={{ paddingLeft: '12px', color: 'var(--success-color)' }}>🎁 Rendimento:</span>
                <span className="text-success">{formatCurrency(result.estrategiaA.totalSacadoRendimento)}</span>
              </p>
            </div>
            <p className="flex-between" style={{ borderTop: '1px solid var(--panel-border)', paddingTop: '8px', marginTop: '4px' }}>
              <span>Custo Real do Bolso:</span>
              <strong className="text-accent text-lg">{formatCurrency(result.estrategiaA.custoRealDoBolso)}</strong>
            </p>
            <p className="flex-between">
              <span style={{ color: 'var(--text-secondary)' }}>Valor Presente:</span>
              <strong className="text-info">{formatCurrency(result.estrategiaA.valorPresente)}</strong>
            </p>
            <p className="flex-between">
              <span style={{ color: 'var(--text-secondary)' }}>FGTS Final (Mês {maxMes}):</span>
              <strong className="text-success">{formatCurrency(result.estrategiaA.saldoFgtsProjetadoFim)}</strong>
            </p>
          </div>
        </div>

        {/* Estratégia B */}
        <div className="strategy-card bg-subtle">
          <h3 className="strategy-card__title text-warning" style={{ marginBottom: '12px' }}>
            B) Acumular e Quitar no Final
            <button onClick={() => exportEstrategia('B')} className="btn-icon" title="Exportar tabela da Estratégia B" aria-label="Exportar tabela da Estratégia B" style={{ color: 'var(--warning-color)' }}>
              <Download size={16} />
            </button>
          </h3>
          <div className="strategy-card__stats">
            <p className="flex-between">
              <span>Quita em:</span>
              <strong className="text-warning">{result.estrategiaB.mesesTotal} meses</strong>
            </p>
            <p className="flex-between">
              <span>Juros totais:</span>
              <strong>{formatCurrency(result.estrategiaB.jurosTotal)}</strong>
            </p>
            <p className="flex-between">
              <span>Total Pago ao Banco:</span>
              <strong title="Total pago em parcelas + FGTS utilizado. Corresponde ao final da linha do gráfico.">{formatCurrency(result.estrategiaB.totalParcelas + result.estrategiaB.totalSacadoFGTS)}</strong>
            </p>
            <p className="flex-between">
              <span>Parcelas pagas (Bolso):</span>
              <strong title="Soma de todas as parcelas mensais pagas do seu bolso (amortização + juros + taxas + seguros).">{formatCurrency(result.estrategiaB.totalParcelas)}</strong>
            </p>
            <div style={{ borderTop: '1px solid var(--panel-border)', paddingTop: '8px', marginTop: '4px' }}>
              <p className="flex-between">
                <span>{result.estrategiaB.primeiroSaque === result.estrategiaB.ultimoSaque ? 'FGTS sacado em' : 'FGTS sacado de'}</span>
                <strong>
                  {result.estrategiaB.primeiroSaque !== null
                    ? (result.estrategiaB.primeiroSaque === result.estrategiaB.ultimoSaque
                      ? result.estrategiaB.primeiroSaque
                      : `${result.estrategiaB.primeiroSaque} → ${result.estrategiaB.ultimoSaque}`)
                    : '—'}
                </strong>
              </p>
              <p className="flex-between">
                <span style={{ paddingLeft: '12px', color: 'var(--text-secondary)' }}>Total sacado:</span>
                <span>{formatCurrency(result.estrategiaB.totalSacadoFGTS)}</span>
              </p>
              <p className="flex-between">
                <span style={{ paddingLeft: '12px', color: 'var(--text-secondary)' }}>Depósitos:</span>
                <span>{formatCurrency(result.estrategiaB.totalSacadoDepositos)}</span>
              </p>
              <p className="flex-between">
                <span style={{ paddingLeft: '12px', color: 'var(--success-color)' }}>🎁 Rendimento:</span>
                <span className="text-success">{formatCurrency(result.estrategiaB.totalSacadoRendimento)}</span>
              </p>
            </div>
            <p className="flex-between" style={{ borderTop: '1px solid var(--panel-border)', paddingTop: '8px', marginTop: '4px' }}>
              <span>Custo Real do Bolso:</span>
              <strong className="text-warning text-lg">{formatCurrency(result.estrategiaB.custoRealDoBolso)}</strong>
            </p>
            <p className="flex-between">
              <span style={{ color: 'var(--text-secondary)' }}>Valor Presente:</span>
              <strong className="text-info">{formatCurrency(result.estrategiaB.valorPresente)}</strong>
            </p>
            <p className="flex-between">
              <span style={{ color: 'var(--text-secondary)' }}>FGTS Final (Mês {maxMes}):</span>
              <strong className="text-success">{formatCurrency(result.estrategiaB.saldoFgtsProjetadoFim)}</strong>
            </p>
          </div>
        </div>
      </div>

      {/* ========== VEREDITO / CONCLUSÃO ========== */}
      {(() => {
        const winnerIsA = fgtsWinnerIsA;
        const winnerName = fgtsWinnerIsA ? 'Estratégia A' : 'Estratégia B';
        
        const deltaCusto = fgtsDeltaCusto;
        const deltaPrazo = fgtsDeltaPrazo;
        const pvDelta = Math.abs(result.estrategiaA.valorPresente - result.estrategiaB.valorPresente);
        const pvWinner = result.estrategiaA.valorPresente <= result.estrategiaB.valorPresente ? 'Estratégia A' : 'Estratégia B';

        const accent = fgtsAccent;

        return (
          <div
            className="verdict"
            style={{
              marginTop: '24px',
              border: `1px solid ${winnerIsA ? 'rgba(56,189,248,0.25)' : 'rgba(251,191,36,0.25)'}`,
            }}
          >
            <div
              className="verdict__header"
              style={{
                background: winnerIsA ? 'rgba(56,189,248,0.08)' : 'rgba(251,191,36,0.08)',
                borderBottom: `1px solid ${winnerIsA ? 'rgba(56,189,248,0.15)' : 'rgba(251,191,36,0.15)'}`,
              }}
            >
              <div
                className="verdict__icon"
                style={{
                  background: winnerIsA ? 'rgba(56,189,248,0.2)' : 'rgba(251,191,36,0.2)',
                }}
              >
                {winnerIsA ? '🔄' : '💰'}
              </div>
              <div>
                <div className="verdict__eyebrow">Conclusão do Simulador FGTS</div>
                <div className="verdict__title" style={{ color: accent }}>
                  {winnerIsA ? 'Amortizar a cada 24 meses (Estratégia A)' : 'Acumular e Quitar no Final (Estratégia B)'}
                </div>
                <div className="verdict__subtitle">
                  {deltaCusto > 0
                    ? `Economiza ${formatCurrency(deltaCusto)} no custo real do bolso e reduz o prazo em ${Math.abs(deltaPrazo)} meses (${(Math.abs(deltaPrazo) / 12).toFixed(1).replace('.', ',')} anos) comparado à outra estratégia.`
                    : `Empate nominal de custo, variando prazo e rendimentos.`}
                </div>
              </div>
            </div>

            <div className="verdict__body">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                {/* Prazo */}
                <div className="metric-tile" style={{ background: 'rgba(255, 255, 255, 0.02)' }}>
                  <div className="metric-tile__label">Prazo de Quitação</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                    <div>
                      <div style={{ fontSize: '0.72rem', color: '#38bdf8', marginBottom: '2px' }}>Estratégia A</div>
                      <div style={{ fontSize: '1.2rem', fontWeight: 700, color: winnerIsA ? 'var(--success-color)' : 'var(--text-primary)' }}>{result.estrategiaA.mesesTotal} meses</div>
                      <div className="text-3xs text-secondary">{formatMonthsToYears(result.estrategiaA.mesesTotal)}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.72rem', color: '#fbbf24', marginBottom: '2px' }}>Estratégia B</div>
                      <div style={{ fontSize: '1.2rem', fontWeight: 700, color: !winnerIsA ? 'var(--success-color)' : 'var(--text-primary)' }}>{result.estrategiaB.mesesTotal} meses</div>
                      <div className="text-3xs text-secondary">{formatMonthsToYears(result.estrategiaB.mesesTotal)}</div>
                    </div>
                  </div>
                  <div className="metric-tile__footer text-secondary">
                    {deltaPrazo > 0
                      ? `🏆 Estratégia B é ${formatMonthsToYears(deltaPrazo)} mais rápida`
                      : deltaPrazo < 0
                      ? `🏆 Estratégia A é ${formatMonthsToYears(Math.abs(deltaPrazo))} mais rápida`
                      : 'Ambas possuem o mesmo prazo'}
                  </div>
                </div>

                {/* Custo Real do Bolso */}
                <div className="metric-tile" style={{ background: 'rgba(34, 197, 94, 0.04)', borderColor: 'rgba(34, 197, 94, 0.15)' }}>
                  <div className="metric-tile__label">Custo Real do Bolso</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                    <div>
                      <div style={{ fontSize: '0.72rem', color: '#38bdf8', marginBottom: '2px' }}>Estratégia A</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 700, color: winnerIsA ? 'var(--success-color)' : 'var(--text-primary)' }}>{formatCurrency(result.estrategiaA.custoRealDoBolso)}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.72rem', color: '#fbbf24', marginBottom: '2px' }}>Estratégia B</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 700, color: !winnerIsA ? 'var(--success-color)' : 'var(--text-primary)' }}>{formatCurrency(result.estrategiaB.custoRealDoBolso)}</div>
                    </div>
                  </div>
                  <div className="metric-tile__footer text-success">
                    🏆 {winnerName} economiza {formatCurrency(deltaCusto)} em dinheiro real
                  </div>
                </div>

                {/* Juros do FGTS Aproveitados */}
                <div className="metric-tile bg-green-soft" style={{ borderColor: 'rgba(134, 239, 172, 0.15)' }}>
                  <div className="metric-tile__label">🎁 Juros Ganhos do FGTS</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                    <div>
                      <div style={{ fontSize: '0.72rem', color: '#38bdf8', marginBottom: '2px' }}>Estratégia A</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>{formatCurrency(result.estrategiaA.totalSacadoRendimento)}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.72rem', color: '#fbbf24', marginBottom: '2px' }}>Estratégia B</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--success-color)' }}>{formatCurrency(result.estrategiaB.totalSacadoRendimento)}</div>
                    </div>
                  </div>
                  <div className="metric-tile__footer text-secondary">
                    Estratégia B aproveita {formatCurrency(result.estrategiaB.totalSacadoRendimento - result.estrategiaA.totalSacadoRendimento)} a mais de rendimentos
                  </div>
                </div>

                {/* Valor Presente */}
                <div className="metric-tile bg-indigo-soft" style={{ borderColor: 'rgba(99, 102, 241, 0.15)' }}>
                  <div className="metric-tile__label">Custo (Valor Presente)</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                    <div>
                      <div style={{ fontSize: '0.72rem', color: '#38bdf8', marginBottom: '2px' }}>Estratégia A</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 700, color: pvWinner === 'Estratégia A' ? '#818cf8' : 'var(--text-primary)' }}>{formatCurrency(result.estrategiaA.valorPresente)}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.72rem', color: '#fbbf24', marginBottom: '2px' }}>Estratégia B</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 700, color: pvWinner === 'Estratégia B' ? '#818cf8' : 'var(--text-primary)' }}>{formatCurrency(result.estrategiaB.valorPresente)}</div>
                    </div>
                  </div>
                  <div className="metric-tile__footer text-secondary">
                    🏆 {pvWinner === 'Estratégia A' ? 'A' : 'B'} é melhor em VP por {formatCurrency(pvDelta)}
                  </div>
                </div>
              </div>

              {/* Nota Estratégica */}
              <div className="meta-note" style={{ marginTop: '16px' }}>
                <strong>Análise Estratégica:</strong> {winnerIsA ? (
                  <span>
                    A <strong>Estratégia A (Amortização Periódica)</strong> é recomendada. Amortizar o FGTS a cada 24 meses reduz o saldo devedor mais cedo, mitigando a cobrança dos juros do financiamento desde o início, o que nesta configuração resultou em menor custo real do bolso. Além disso, no Mês {maxMes} (fim do período comparativo), você terminará com <strong>{formatCurrency(result.estrategiaA.saldoFgtsProjetadoFim)}</strong> acumulados na sua conta do FGTS, comparado a <strong>{formatCurrency(result.estrategiaB.saldoFgtsProjetadoFim)}</strong> na Estratégia B (uma diferença de <strong>{formatCurrency(Math.abs(result.estrategiaA.saldoFgtsProjetadoFim - result.estrategiaB.saldoFgtsProjetadoFim))}</strong> a favor da estratégia {result.estrategiaA.saldoFgtsProjetadoFim >= result.estrategiaB.saldoFgtsProjetadoFim ? 'A' : 'B'}).
                  </span>
                ) : (
                  <span>
                    A <strong>Estratégia B (Acumular e Quitar)</strong> é a vencedora neste cenário. Ao deixar o saldo rendendo na Caixa a {fgtsParams.taxaRendimentoAnual.toString().replace('.', ',')}% a.a., os juros gerados pelo FGTS (dinheiro extra/rendimento) criam um montante acumulado muito maior. Esse saldo crescido é usado para quitar a dívida integralmente de uma vez só, fazendo com que você economize <strong>{(deltaPrazo / 12).toFixed(1).replace('.', ',')} anos</strong> de parcelas e poupe <strong>{formatCurrency(deltaCusto)}</strong> do seu bolso. Além disso, no Mês {maxMes} (fim do período comparativo), você terminará com <strong>{formatCurrency(result.estrategiaB.saldoFgtsProjetadoFim)}</strong> acumulados na sua conta do FGTS, comparado a apenas <strong>{formatCurrency(result.estrategiaA.saldoFgtsProjetadoFim)}</strong> na Estratégia A (uma vantagem de <strong>{formatCurrency(result.estrategiaB.saldoFgtsProjetadoFim - result.estrategiaA.saldoFgtsProjetadoFim)}</strong> extras guardados a seu favor).
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* ========== CUSTO DE OPORTUNIDADE ========== */}
      {oportunidade && (
        <div className="bg-accent-subtle" style={{ marginTop: '20px', padding: '16px 20px', borderRadius: '8px', border: '1px solid rgba(167,139,250,0.2)', lineHeight: 1.7, fontSize: '0.85rem', color: '#c4b5fd' }}>
          <p style={{ fontWeight: 700, color: '#a78bfa', marginBottom: '8px', fontSize: '0.88rem' }}>
            📊 Custo de Oportunidade — {oportunidade.mesesExtrasRendendo} meses extras de FGTS rendendo no Cenário B
          </p>
          <p style={{ marginBottom: '6px' }}>
            Bônus de montante final: <strong>{formatCurrency(oportunidade.bonusMontanteFinal)}</strong> &nbsp;|&nbsp; Bônus de rendimento: <strong className="text-success">{formatCurrency(oportunidade.bonusRendimentoPeriodo)}</strong>
          </p>
          <p style={{ marginTop: '10px' }}>
            <CheckCircle size={14} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle', color: '#a78bfa' }} />
            {oportunidade.conclusao}
          </p>
        </div>
      )}
    </div>
  );
}
