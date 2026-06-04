import { useSimulator } from '../../context/SimulatorContext';
import { 
  PieChart as RechartsPieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer 
} from 'recharts';
import { Calendar as CalendarIcon, PiggyBank, Clock as ClockIcon } from 'lucide-react';
import { formatCurrency, formatMonthsToYearsAndMonths } from '../../utils/formatters';
import './dashboard.css';

export function OverviewMetrics() {
  const { 
    result, 
    tabelaSemAportes,
    mesesReduzidos, 
    economiaJuros, 
    totalJurosOrig,
    chartDataBreakdown
  } = useSimulator();

  const currentPrazo = result.tabela.length;
  const originalPrazo = tabelaSemAportes.tabela.length;
  
  // Porcentagem de redução de prazo
  const prazoReducaoPercent = originalPrazo > 0 
    ? ((mesesReduzidos / originalPrazo) * 100).toFixed(1).replace('.', ',') 
    : '0';

  // Porcentagem de economia de juros
  const jurosEconomiaPercent = totalJurosOrig > 0 
    ? ((economiaJuros / totalJurosOrig) * 100).toFixed(2).replace('.', ',') 
    : '0';



  // Calcular data de quitação futura
  const getQuitationDate = (totalMonths: number) => {
    const today = new Date();
    today.setMonth(today.getMonth() + totalMonths);
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    return `${months[today.getMonth()]}/${today.getFullYear()}`;
  };

  // Dados para o Donut Chart (vem do hook, usando valorFinanciado como principal)
  const totalContrato = chartDataBreakdown.reduce((acc, item) => acc + item.value, 0);
  const chartData = chartDataBreakdown;

  const getPercent = (value: number) => {
    return totalContrato > 0 ? ((value / totalContrato) * 100).toFixed(1).replace('.', ',') : '0';
  };

  return (
    <div className="overview-metrics-grid">
      {/* Card 1: Novo prazo */}
      <div className="metric-card">
        <div className="metric-card-header">
          <span className="metric-card-title">Novo prazo do contrato</span>
          <div className="metric-card-icon-wrapper blue">
            <CalendarIcon size={18} />
          </div>
        </div>
        <div className="metric-card-body">
          <div className="metric-card-value text-blue">{currentPrazo} meses</div>
          <div className="metric-card-footer">
            <span className="footer-detail">Redução de {mesesReduzidos} meses</span>
            {mesesReduzidos > 0 && (
              <span className="footer-badge green">-{prazoReducaoPercent}%</span>
            )}
          </div>
        </div>
      </div>

      {/* Card 2: Economia total de juros */}
      <div className="metric-card">
        <div className="metric-card-header">
          <span className="metric-card-title">Economia total de juros</span>
          <div className="metric-card-icon-wrapper green">
            <PiggyBank size={18} />
          </div>
        </div>
        <div className="metric-card-body">
          <div className="metric-card-value text-success">{formatCurrency(economiaJuros)}</div>
          <div className="metric-card-footer">
            <span className="footer-detail">{jurosEconomiaPercent}% do total de juros</span>
          </div>
        </div>
      </div>

      {/* Card 3: Antecipação da quitação */}
      <div className="metric-card">
        <div className="metric-card-header">
          <span className="metric-card-title">Antecipação da quitação</span>
          <div className="metric-card-icon-wrapper purple">
            <ClockIcon size={18} />
          </div>
        </div>
        <div className="metric-card-body">
          <div className="metric-card-value text-purple">
            {mesesReduzidos > 0 ? formatMonthsToYearsAndMonths(mesesReduzidos) : '0 meses'}
          </div>
          <div className="metric-card-footer">
            <span className="footer-detail">Nova quitação: {getQuitationDate(currentPrazo)}</span>
          </div>
        </div>
      </div>

      {/* Card 4: Distribuição atual do contrato */}
      <div className="metric-card distribution-card">
        <div className="metric-card-header">
          <span className="metric-card-title">Distribuição atual do contrato</span>
        </div>
        <div className="distribution-card-content">
          <div className="distribution-chart-wrapper">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsPieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={30}
                  outerRadius={45}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
              </RechartsPieChart>
            </ResponsiveContainer>
          </div>
          <div className="distribution-legend">
            {chartData.map((item, index) => (
              <div key={index} className="legend-item">
                <span className="legend-dot" style={{ backgroundColor: item.color }}></span>
                <span className="legend-label">{item.name}</span>
                <span className="legend-value">{formatCurrency(item.value)} ({getPercent(item.value)}%)</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
