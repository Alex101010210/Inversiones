import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { portfolioApi, exportApi } from '../../api';
import { Spinner, PageHeader, PnLBadge, Badge } from '../../components/ui/components';
import { Link } from 'react-router-dom';
import { ArrowLeft, Download, ChevronUp, ChevronDown, BarChart2, PlusCircle } from 'lucide-react';
import clsx from 'clsx';

function SortIcon({ field, sortBy, sortDir }) {
  if (sortBy !== field) return <ChevronUp className="w-3 h-3 text-gray-300 inline ml-1" />;
  return sortDir === 'asc'
    ? <ChevronUp className="w-3 h-3 text-brand-600 inline ml-1" />
    : <ChevronDown className="w-3 h-3 text-brand-600 inline ml-1" />;
}

export default function PortfolioDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [sortBy,  setSortBy]  = useState('symbol');
  const [sortDir, setSortDir] = useState('asc');

  const { data: holdings = [], isLoading } = useQuery({
    queryKey: ['holdings', id],
    queryFn: () => portfolioApi.holdings(id),
  });

  const { data: portfolio } = useQuery({
    queryKey: ['portfolio', id],
    queryFn: () => portfolioApi.get(id),
  });

  if (isLoading) return <Spinner />;

  const totalValue    = holdings.reduce((s, h) => s + h.currentValue, 0);
  const totalPnL      = holdings.reduce((s, h) => s + h.pnl, 0);
  const totalFeesPaid = holdings.reduce((s, h) => s + (h.totalFees ?? 0), 0);
  const totalCost     = holdings.reduce((s, h) => s + h.costBasis, 0);

  // ── Sortable columns ──────────────────────────────────────────────────────
  const toggleSort = (field) => {
    if (sortBy === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortBy(field); setSortDir('asc'); }
  };

  const sorted = [...holdings].sort((a, b) => {
    let va, vb;
    if (sortBy === 'symbol')       { va = a.asset.symbol;   vb = b.asset.symbol; }
    else if (sortBy === 'qty')     { va = a.quantity;        vb = b.quantity; }
    else if (sortBy === 'avgCost') { va = a.avgCostBasis;    vb = b.avgCostBasis; }
    else if (sortBy === 'price')   { va = a.currentPrice;    vb = b.currentPrice; }
    else if (sortBy === 'value')   { va = a.currentValue;    vb = b.currentValue; }
    else if (sortBy === 'pnlPct')  { va = a.pnlPct;          vb = b.pnlPct; }
    else if (sortBy === 'fees')    { va = a.totalFees ?? 0;  vb = b.totalFees ?? 0; }
    else                           { va = 0; vb = 0; }
    if (va < vb) return sortDir === 'asc' ? -1 : 1;
    if (va > vb) return sortDir === 'asc' ?  1 : -1;
    return 0;
  });

  const th = (label, field) => (
    <th
      className="text-right py-3 px-4 font-medium text-gray-500 cursor-pointer select-none hover:text-brand-600 whitespace-nowrap"
      onClick={() => toggleSort(field)}
    >
      {label}<SortIcon field={field} sortBy={sortBy} sortDir={sortDir} />
    </th>
  );

  return (
    <div className="p-8">
      <Link to="/portfolio" className="flex items-center gap-1 text-sm text-gray-500 hover:text-brand-600 mb-4">
        <ArrowLeft className="w-4 h-4" /> Volver a portafolios
      </Link>

      <PageHeader
        title={portfolio?.name ?? 'Portfolio'}
        subtitle={`${holdings.length} holdings · Total: $${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
        action={
          <button
            className="btn-secondary flex items-center gap-1.5"
            onClick={() => exportApi.holdings(id)}
          >
            <Download className="w-4 h-4" /> Exportar CSV
          </button>
        }
      />

      {/* Summary bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Valor Total',   value: `$${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}` },
          { label: 'Costo Total',   value: `$${totalCost.toLocaleString('en-US', { minimumFractionDigits: 2 })}` },
          { label: 'P&L Total',     value: `${totalPnL >= 0 ? '+' : ''}$${totalPnL.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, pnl: totalPnL },
          { label: 'Fees Pagados',  value: `$${totalFeesPaid.toFixed(2)}` },
        ].map(({ label, value, pnl }) => (
          <div key={label} className="card py-3">
            <p className="text-xs text-gray-500 mb-1">{label}</p>
            <p className={clsx('font-bold text-lg',
              pnl !== undefined ? (pnl >= 0 ? 'text-success' : 'text-danger') : 'text-gray-900'
            )}>{value}</p>
          </div>
        ))}
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
         <thead>
           <tr className="border-b border-gray-100">
             <th className="text-left py-3 px-4 font-medium text-gray-500 cursor-pointer hover:text-brand-600 select-none"
               onClick={() => toggleSort('symbol')}>
               Activo <SortIcon field="symbol" sortBy={sortBy} sortDir={sortDir} />
             </th>
             <th className="text-left py-3 px-4 font-medium text-gray-500">Tipo</th>
             {th('Cant.', 'qty')}
             {th('Costo Prom.', 'avgCost')}
             {th('Precio', 'price')}
             {th('Valor', 'value')}
             {th('P&L %', 'pnlPct')}
             {th('Fees', 'fees')}
             <th className="py-3 px-4 font-medium text-gray-500 text-right">Acciones</th>
           </tr>
         </thead>
         <tbody>
           {sorted.map((h) => (
             <tr key={h.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
               <td className="py-3 px-4">
                 <div className="font-semibold">{h.asset.symbol}</div>
                 <div className="text-xs text-gray-500">{h.asset.name}</div>
               </td>
               <td className="py-3 px-4"><Badge type={h.asset.type} /></td>
               <td className="py-3 px-4 text-right font-mono">{h.quantity}</td>
               <td className="py-3 px-4 text-right font-mono">${h.avgCostBasis.toFixed(2)}</td>
               <td className="py-3 px-4 text-right font-mono">${h.currentPrice.toFixed(2)}</td>
               <td className="py-3 px-4 text-right font-semibold">${h.currentValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
               <td className="py-3 px-4 text-right"><PnLBadge value={h.pnlPct} /></td>
               <td className="py-3 px-4 text-right text-gray-500">${(h.totalFees ?? 0).toFixed(2)}</td>
               <td className="py-3 px-4 text-right">
                 <div className="flex items-center justify-end gap-2">
                   <button
                     onClick={() => navigate(`/analysis?symbol=${h.asset.symbol}`)}
                     className="text-gray-400 hover:text-brand-600 transition-colors"
                     title="Ver análisis técnico"
                   >
                     <BarChart2 className="w-4 h-4" />
                   </button>
                   <button
                     onClick={() => navigate('/operations', { state: { prefill: { assetSymbol: h.asset.symbol, portfolioId: id } } })}
                     className="text-gray-400 hover:text-green-600 transition-colors"
                     title="Registrar operación"
                   >
                     <PlusCircle className="w-4 h-4" />
                   </button>
                 </div>
               </td>
             </tr>
           ))}
         </tbody>
         <tfoot className="bg-gray-50">
           <tr>
             <td colSpan={5} className="py-3 px-4 font-semibold text-gray-700">Total</td>
             <td className="py-3 px-4 text-right font-bold">${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
             <td className="py-3 px-4 text-right">
               <PnLBadge value={totalCost > 0 ? (totalPnL / totalCost) * 100 : 0} />
             </td>
             <td className="py-3 px-4 text-right text-gray-500">${totalFeesPaid.toFixed(2)}</td>
             <td />
           </tr>
         </tfoot>
       </table>
      </div>
    </div>
  );
}
