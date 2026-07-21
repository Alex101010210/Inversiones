import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { analysisApi, assetApi } from '../../api';
import { PageHeader, Spinner, Badge } from '../../components/ui/components';
import {
  ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ReferenceLine
} from 'recharts';
import { Link } from 'react-router-dom';

const POPULAR = ['AAPL', 'MSFT', 'TSLA', 'NVDA', 'SPY', 'QQQ', 'BTC', 'ETH'];

export default function Analysis() {
  const [symbol, setSymbol]     = useState('AAPL');
  const [input,  setInput]      = useState('AAPL');
  const [activeTab, setActiveTab] = useState('macd');

  const { data: full, isLoading: fLoading, refetch } = useQuery({
    queryKey: ['analysis-full', symbol],
    queryFn:  () => analysisApi.full(symbol),
  });

  const { data: rsiData } = useQuery({
    queryKey: ['rsi', symbol],
    queryFn:  () => analysisApi.rsi(symbol, { days: 100 }),
  });

  const { data: macdData } = useQuery({
    queryKey: ['macd', symbol],
    queryFn:  () => analysisApi.macd(symbol),
  });

  const { data: sma20 } = useQuery({
    queryKey: ['sma20', symbol],
    queryFn:  () => analysisApi.sma(symbol, { period: 20, days: 120 }),
  });

  const { data: sma50 } = useQuery({
    queryKey: ['sma50', symbol],
    queryFn:  () => analysisApi.sma(symbol, { period: 50, days: 120 }),
  });

  const { data: ema20 } = useQuery({
    queryKey: ['ema20', symbol],
    queryFn:  () => analysisApi.ema(symbol, { period: 20, days: 120 }),
  });

  const { data: prices } = useQuery({
    queryKey: ['priceHistory', symbol],
    queryFn:  () => assetApi.history(symbol, 120),
  });

  const handleSearch = (e) => {
    e.preventDefault();
    setSymbol(input.trim().toUpperCase());
  };

  const getSignalClass = (sig) => ({
    BUY:  'badge-green',
    SELL: 'badge-red',
    HOLD: 'badge-yellow',
  })[sig] ?? 'badge bg-gray-100 text-gray-700';

  // Merge prices + sma20 + sma50 + ema20 for chart
  const priceChartData = (prices ?? []).map((p, i) => ({
    date:    p.date,
    price:   p.close,
    sma20:   sma20?.data?.[i]?.sma,
    sma50:   sma50?.data?.[i]?.sma,
    ema20:   ema20?.data?.[i]?.ema,
  }));

  return (
    <div className="p-8 space-y-6">
      <PageHeader
        title="Technical Analysis"
        subtitle="RSI · MACD · Moving Averages"
        action={
          <Link to="/calculator" className="btn-secondary text-sm flex items-center gap-1.5">
            🧮 Calculadora de posición
          </Link>
        }
      />

      {/* Search bar */}
      <form onSubmit={handleSearch} className="flex gap-2 items-center">
        <input className="input max-w-xs" placeholder="Symbol (AAPL, BTC…)" value={input} onChange={(e) => setInput(e.target.value)} />
        <button className="btn-primary" type="submit">Analyze</button>
        <div className="flex gap-1 flex-wrap">
          {POPULAR.map(s => (
            <button key={s} type="button" onClick={() => { setSymbol(s); setInput(s); }}
              className={`px-2 py-1 text-xs rounded-full border transition-colors ${symbol === s ? 'bg-brand-600 text-white border-brand-600' : 'border-gray-300 text-gray-600 hover:border-brand-400'}`}>
              {s}
            </button>
          ))}
        </div>
      </form>

      {fLoading ? <Spinner /> : full && (
        <>
          {/* Signal summary */}
          <div className="card flex flex-wrap gap-6 items-center">
            <div>
              <p className="text-xs text-gray-500 mb-1">Symbol</p>
              <p className="font-bold text-xl">{full.symbol}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Signal</p>
              <span className={`badge text-sm px-3 py-1 font-semibold ${getSignalClass(full.signal)}`}>{full.signal}</span>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">RSI (14)</p>
              <p className={`font-bold ${full.currentRSI > 70 ? 'text-danger' : full.currentRSI < 30 ? 'text-success' : 'text-gray-800'}`}>{full.currentRSI}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">MACD</p>
              <p className={`font-bold ${full.macd?.value > 0 ? 'text-success' : 'text-danger'}`}>{full.macd?.value}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">SMA 20</p>
              <p className="font-bold">{full.sma20}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">SMA 50</p>
              <p className="font-bold">{full.sma50 ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Price vs SMA20</p>
              <span className={`text-sm font-medium ${full.priceAboveSMA20 ? 'text-success' : 'text-danger'}`}>
                {full.priceAboveSMA20 ? '▲ Above' : '▼ Below'}
              </span>
            </div>
          </div>

          {/* Chart tabs */}
          <div>
            <div className="flex gap-2 mb-4">
              {['price', 'macd', 'rsi'].map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${activeTab === tab ? 'bg-brand-600 text-white' : 'bg-white border border-gray-300 text-gray-600 hover:border-brand-400'}`}>
                  {tab.toUpperCase()}
                </button>
              ))}
            </div>

            <div className="card">
              {activeTab === 'price' && (
                <>
                  <h3 className="font-semibold text-gray-700 mb-4">Price + Moving Averages</h3>
                  <ResponsiveContainer width="100%" height={320}>
                    <ComposedChart data={priceChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="price" stroke="#1f2328" strokeWidth={1.5} dot={false} name="Close" />
                      <Line type="monotone" dataKey="sma20" stroke="#3b82f6" strokeWidth={1.5} dot={false} name="SMA 20" strokeDasharray="4 2" />
                      <Line type="monotone" dataKey="sma50" stroke="#8b5cf6" strokeWidth={1.5} dot={false} name="SMA 50" strokeDasharray="4 2" />
                      <Line type="monotone" dataKey="ema20" stroke="#f59e0b" strokeWidth={1.5} dot={false} name="EMA 20" strokeDasharray="2 2" />
                    </ComposedChart>
                  </ResponsiveContainer>
                </>
              )}

              {activeTab === 'macd' && (
                <>
                  <h3 className="font-semibold text-gray-700 mb-4">MACD (12, 26, 9)</h3>
                  <ResponsiveContainer width="100%" height={320}>
                    <ComposedChart data={macdData?.data ?? []}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip />
                      <Legend />
                      <ReferenceLine y={0} stroke="#e5e7eb" />
                      <Bar dataKey="histogram" fill="#93c5fd" name="Histogram" />
                      <Line type="monotone" dataKey="macd"   stroke="#3b82f6" strokeWidth={2} dot={false} name="MACD" />
                      <Line type="monotone" dataKey="signal" stroke="#ef4444" strokeWidth={2} dot={false} name="Signal" />
                    </ComposedChart>
                  </ResponsiveContainer>
                </>
              )}

              {activeTab === 'rsi' && (
                <>
                  <h3 className="font-semibold text-gray-700 mb-4">RSI (14)</h3>
                  <ResponsiveContainer width="100%" height={320}>
                    <ComposedChart data={rsiData?.data?.filter(d => d.rsi !== null) ?? []}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                      <Tooltip />
                      <ReferenceLine y={70} stroke="#ef4444" strokeDasharray="4 2" label={{ value: 'Overbought', position: 'insideRight', fontSize: 10, fill: '#ef4444' }} />
                      <ReferenceLine y={30} stroke="#10b981" strokeDasharray="4 2" label={{ value: 'Oversold', position: 'insideRight', fontSize: 10, fill: '#10b981' }} />
                      <Line type="monotone" dataKey="rsi" stroke="#8b5cf6" strokeWidth={2} dot={false} name="RSI" />
                    </ComposedChart>
                  </ResponsiveContainer>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
