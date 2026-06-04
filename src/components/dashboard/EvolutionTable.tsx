import { useSimulator } from '../../context/SimulatorContext';
import { Download } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';

export function EvolutionTable() {
  const { 
    result, 
    tabelaSemAportes, 
    exportToCSV 
  } = useSimulator();

  return (
    <div className="panel" style={{ marginTop: '8px' }}>
      <div className="table-header-row">
        <div>
          <h2 className="section-title" style={{ margin: 0 }}>Tabela de evolução mensal</h2>
          <p className="strategy-form-description" style={{ marginTop: '4px' }}>
            Valores projetados considerando todas as estratégias ativas.
          </p>
        </div>
        <button className="btn-export-relatorio" onClick={exportToCSV}>
          <Download size={14} />
          <span>Baixar tabela</span>
        </button>
      </div>

      <div className="table-wrapper" style={{ maxHeight: '600px', overflowY: 'auto' }}>
        <table>
          <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
            <tr>
              <th className="text-center">Mês</th>
              <th className="text-left">Parcela total</th>
              <th>Amortização</th>
              <th>Juros</th>
              <th>Seguros (MIP+DFI)</th>
              <th>Tarifa admin</th>
              <th>Amort. extra</th>
              <th>Total pago acum.</th>
              <th>Saldo devedor</th>
            </tr>
          </thead>
          <tbody>
            {(() => {
              const rowsWithCum = [];
              let currentCum = 0;
              for (const row of result.tabela) {
                currentCum += row.parcelaTotal + (row.aporteExtra || 0);
                rowsWithCum.push({ ...row, cumPaid: currentCum });
              }

              return rowsWithCum.map((row) => {
                const rowClass = row.pagaManualmente 
                  ? 'paid-row' 
                  : (row.aporteExtra ? 'highlight-row' : '');
                
                return (
                  <tr key={row.mes} className={rowClass}>
                    <td className="text-center font-semibold">{row.mes}</td>
                    <td className="text-left font-medium">
                      {row.pagaManualmente && <span className="text-info font-semibold" style={{ fontSize: '0.75rem' }}>✓ </span>}
                      {formatCurrency(row.parcelaTotal)}
                    </td>
                    <td>{formatCurrency(row.amortizacao)}</td>
                    <td>{formatCurrency(row.juros)}</td>
                    <td>{formatCurrency(row.seguroMIP + row.seguroDFI)}</td>
                    <td>{formatCurrency(row.tarifaAdmin)}</td>
                    <td className="text-success font-bold">
                      {row.aporteExtra ? formatCurrency(row.aporteExtra) : '—'}
                    </td>
                    <td className="text-info font-semibold">{formatCurrency(row.cumPaid)}</td>
                    <td className="font-semibold">{formatCurrency(row.saldoDevedorFinal)}</td>
                  </tr>
                );
              });
            })()}

            {/* Mostra as parcelas eliminadas */}
            {result.eliminadas
              .filter(e => e.motivo !== 'PAGAMENTO')
              .sort((a, b) => a.mesOriginal - b.mesOriginal)
              .map((elim) => {
                const orig = tabelaSemAportes.tabela.find(r => r.mes === elim.mesOriginal);
                const valorAporte = elim.valorAporte;
                const parcelaOriginal = elim.parcelaOriginal ?? orig?.parcelaTotal ?? 0;
                return (
                  <tr key={`elim-${elim.mesOriginal}`} className="eliminated-row">
                    <td className="text-center text-success font-semibold">{elim.mesOriginal}</td>
                    <td className="text-left text-secondary">
                      <span style={{ textDecoration: 'line-through', marginRight: '8px', fontSize: '0.8rem' }}>
                        {formatCurrency(parcelaOriginal)}
                      </span>
                      <strong className="text-success" style={{ textDecoration: 'none', display: 'block', fontSize: '0.85rem' }}>
                        Você pagou: {formatCurrency(valorAporte)}
                      </strong>
                    </td>
                    <td>
                      <span style={{ textDecoration: 'line-through', color: 'var(--text-secondary)' }}>
                        {orig ? formatCurrency(orig.amortizacao) : '—'}
                      </span>
                    </td>
                    <td>
                      <span style={{ textDecoration: 'line-through', color: 'var(--text-secondary)' }}>
                        {orig ? formatCurrency(orig.juros) : '—'}
                      </span>
                    </td>
                    <td>—</td>
                    <td>—</td>
                    <td className="text-success font-bold">Pago</td>
                    <td>—</td>
                    <td className="text-secondary font-medium">Quitada (Aporte)</td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
