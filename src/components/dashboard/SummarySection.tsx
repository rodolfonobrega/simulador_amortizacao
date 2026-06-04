import { useSimulator } from '../../context/SimulatorContext';
import { Clock, DollarSign } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';

export function SummarySection() {
  const { 
    result, 
    economiaJuros 
  } = useSimulator();

  // Total pago acumulado (soma de todas as parcelas mensais pagas)
  const totalPagoAcumulado = result.tabela.reduce((sum, r) => sum + r.parcelaTotal, 0);

  // Total de juros pagos
  const totalJurosPagos = result.tabela.reduce((sum, r) => sum + r.juros, 0);

  // Amortizações extras
  const amortizacoesExtras = result.tabela.reduce((sum, r) => sum + (r.aporteExtra || 0), 0);

  // Total pago com extras
  const totalPagoComExtras = totalPagoAcumulado + amortizacoesExtras;



  return (
    <div className="summary-card-container" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* 1. Card "Resumo do saldo" */}
      <div className="panel summary-card">
        <h2 className="summary-title">Resumo do saldo</h2>
        
        <div className="summary-list">
          <div className="summary-row">
            <span className="summary-row-label">Total pago acumulado</span>
            <span className="summary-row-val text-success">{formatCurrency(totalPagoAcumulado)}</span>
          </div>
          <div className="summary-row">
            <span className="summary-row-label">Total de juros pagos</span>
            <span className="summary-row-val">{formatCurrency(totalJurosPagos)}</span>
          </div>
          <div className="summary-row">
            <span className="summary-row-label">Amortizações extras</span>
            <span className="summary-row-val text-success">{formatCurrency(amortizacoesExtras)}</span>
          </div>
          <div className="summary-row">
            <span className="summary-row-label">Total pago com extras</span>
            <span className="summary-row-val text-success">{formatCurrency(totalPagoComExtras)}</span>
          </div>
        </div>

        <div className="summary-green-box">
          <span>Economia total estimada</span>
          <span>{formatCurrency(economiaJuros)}</span>
        </div>
      </div>

      {/* 2. Card "Entenda os tipos de redução" */}
      <div className="panel info-types-card">
        <h2 className="summary-title">Entenda os tipos de redução</h2>
        
        <div className="info-type-item">
          <div className="info-type-icon-wrapper">
            <Clock size={16} className="text-secondary" />
          </div>
          <div className="info-type-text">
            <span className="info-type-title">Redução de prazo</span>
            <span className="info-type-desc">
              Você antecipa a quitação do contrato, reduzindo o número total de meses e economizando mais juros.
            </span>
          </div>
        </div>

        <div className="info-type-item">
          <div className="info-type-icon-wrapper">
            <DollarSign size={16} className="text-secondary" />
          </div>
          <div className="info-type-text">
            <span className="info-type-title">Redução de parcela</span>
            <span className="info-type-desc">
              Você diminui o valor das prestações mensais seguintes, mantendo o mesmo prazo final do contrato.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
