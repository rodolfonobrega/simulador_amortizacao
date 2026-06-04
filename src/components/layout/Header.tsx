import { useSimulator } from '../../context/SimulatorContext';
import { Download, ChevronDown } from 'lucide-react';

export function Header() {
  const { activeMainTab, exportToCSV } = useSimulator();

  const getHeaderContent = () => {
    switch (activeMainTab) {
      case 'visao_geral':
        return {
          title: 'Visão geral',
          description: 'Acompanhe o resumo do seu contrato e simule amortizações.',
          showExport: true,
        };
      case 'simulacao':
        return {
          title: 'Simulação & Estratégias',
          description: 'Planeje e simule diferentes cenários de amortizações extras.',
          showExport: true,
        };
      case 'parametros':
        return {
          title: 'Parâmetros do Financiamento',
          description: 'Ajuste os valores contratuais, TR e seguros obrigatórios.',
          showExport: false,
        };
      default:
        return {
          title: 'Simulador de Amortização Antecipada',
          description: 'Simulação realista de financiamentos imobiliários',
          showExport: false,
        };
    }
  };

  const content = getHeaderContent();

  return (
    <header className="main-header">
      <div className="header-title-area">
        <h1>{content.title}</h1>
        <p>{content.description}</p>
      </div>

      {content.showExport && (
        <button className="btn-export-relatorio" onClick={exportToCSV}>
          <Download size={16} />
          <span>Exportar relatório</span>
          <ChevronDown size={14} />
        </button>
      )}
    </header>
  );
}
