import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { aiApi, portfolioApi } from '../../api';
import { PageHeader, Spinner, Badge } from '../../components/ui/components';
import {
  Sparkles, TrendingUp, TrendingDown, Minus,
  Newspaper, Lightbulb, ShieldAlert, BarChart2, Cpu, PlusCircle, BarChart
} from 'lucide-react';
import clsx from 'clsx';

const POPULAR = [
  'AAPL', 'MSFT', 'TSLA', 'NVDA', 'AMZN', 'META', 'GOOGL',
  'BTC', 'ETH', 'SOL', 'XRP',
  'SPY', 'QQQ', 'GLD',
  'JPM', 'V', 'WMT',
];

function TrendBadge({ trend }) {
  const map = {
    BULLISH:  { label: 'Alcista',  cls: 'badge-green',  icon: TrendingUp  },
    BEARISH:  { label: 'Bajista',  cls: 'badge-red',    icon: TrendingDown },
    SIDEWAYS: { label: 'Lateral',  cls: 'badge-yellow', icon: Minus       },
  };
  const { label, cls, icon: Icon } = map[trend] ?? { label: trend, cls: 'badge bg-gray-100 text-gray-700', icon: Minus };
  return (
    <span className={clsx('badge flex items-center gap-1 font-semibold px-3 py-1', cls)}>
      <Icon className="w-3 h-3" /> {label}
    </span>
  );
}

function ActionBadge({ action }) {
  const map = {
    BUY:       'badge-green',
    SELL:      'badge-red',
    HOLD:      'badge-yellow',
    REBALANCE: 'badge-blue',
  };
  return <span className={clsx('badge font-bold', map[action] ?? 'badge bg-gray-100 text-gray-700')}>{action}</span>;
}

function ConfidenceBar({ confidence }) {
  const pct = Math.round((confidence ?? 0) * 100);
  const color = pct >= 70 ? 'bg-green-500' : pct >= 50 ? 'bg-yellow-400' : 'bg-red-400';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={clsx('h-full rounded-full', color)} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-gray-500 w-8 text-right">{pct}%</span>
    </div>
  );
}

function SentimentBar({ score }) {
  const pct   = ((score + 1) / 2) * 100;
  const color = score > 0.2 ? 'bg-green-500' : score < -0.2 ? 'bg-red-500' : 'bg-yellow-400';
  return (
    <div>
      <div className="flex justify-between text-xs text-gray-400 mb-1">
        <span>Negativo</span><span>Neutral</span><span>Positivo</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className={clsx('h-full rounded-full', color)} style={{ width: `${Math.max(2, pct)}%` }} />
      </div>
      <p className="text-xs text-gray-400 mt-1">Score: {(score ?? 0).toFixed(2)}</p>
    </div>
  );
}

function EngineTag() {
  return (
    <div className="inline-flex items-center gap-1.5 bg-gray-100 border border-gray-200 rounded-full px-3 py-1 text-xs text-gray-500">
      <Cpu className="w-3 h-3" /> Motor de reglas propio (RSI · MACD · SMA)
    </div>
  );
}

export default function AiPage() {
  const navigate = useNavigate();
  const [tab,    setTab]    = useState('recommendations');
  const [pid,    setPid]    = useState('');
  const [symbol, setSymbol] = useState('AAPL');
  const [input,  setInput]  = useState('AAPL');

  const { data: portfolios = [] } = useQuery({ queryKey: ['portfolios'], queryFn: portfolioApi.list });
  const firstId  = portfolios[0]?.id;
  const activePid = pid || firstId;

  const { data: recs, isLoading: rLoading, error: rError } = useQuery({
    queryKey: ['ai-recs', activePid],
    queryFn:  () => aiApi.recommendations(activePid),
    enabled:  !!activePid && tab === 'recommendations',
    retry:    false,
    staleTime: 60_000,
  });

  const { data: trend, isLoading: tLoading, error: tError } = useQuery({
    queryKey: ['ai-trend', symbol],
    queryFn:  () => aiApi.predict(symbol),
    enabled:  tab === 'predict',
    retry:    false,
    staleTime: 60_000,
  });

  const { data: news, isLoading: nLoading, error: nError } = useQuery({
    queryKey: ['ai-news', symbol],
    queryFn:  () => aiApi.news(symbol),
    enabled:  tab === 'news',
    retry:    false,
    staleTime: 60_000,
  });

  const TABS = [
    { id: 'recommendations', label: 'Recomendaciones de portafolio', icon: Lightbulb },
    { id: 'predict',         label: 'Análisis técnico',              icon: TrendingUp },
    { id: 'news',            label: 'Sentimiento técnico',           icon: Newspaper  },
  ];

  return (
    <div className="p-6 md:p-8 space-y-6">
      <PageHeader
        title="IA Insights"
        subtitle="Análisis automático basado en indicadores técnicos reales (RSI · MACD · SMA)"
        action={<EngineTag />}
      />

      {/* Explicación de la IA */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {[
          {
            icon: Lightbulb, color: 'text-brand-600', bg: 'bg-brand-50 border-brand-200',
            title: 'Recomendaciones',
            desc: 'Analiza los activos de tu portafolio y genera señales BUY / HOLD / SELL basadas en RSI, MACD y tendencias de precio.',
          },
          {
            icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-50 border-green-200',
            title: 'Análisis técnico',
            desc: 'Escribe cualquier símbolo (AAPL, BTC, SPY…) y obtén la predicción de tendencia, precio objetivo, soporte y resistencia.',
          },
          {
            icon: Newspaper, color: 'text-purple-600', bg: 'bg-purple-50 border-purple-200',
            title: 'Sentimiento técnico',
            desc: 'Calcula el sentimiento alcista/bajista del mercado para un activo usando indicadores técnicos como proxy del sentimiento.',
          },
        ].map(({ icon: Icon, color, bg, title, desc }) => (
          <div key={title} className={`rounded-xl border p-4 ${bg}`}>
            <div className="flex items-center gap-2 mb-1.5">
              <Icon className={`w-4 h-4 ${color}`} />
              <span className={`text-sm font-semibold ${color}`}>{title}</span>
            </div>
            <p className="text-xs text-gray-600">{desc}</p>
          </div>
        ))}
      </div>

      {/* Tab bar */}
      <div className="flex gap-2">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setTab(id)}
            className={clsx(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              tab === id ? 'bg-brand-600 text-white' : 'bg-white border border-gray-300 text-gray-600 hover:border-brand-400'
            )}>
            <Icon className="w-4 h-4" /> {label}
          </button>
        ))}
      </div>

      {/* ── RECOMENDACIONES ─────────────────────────────────────────────────── */}
      {tab === 'recommendations' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <label className="label mb-0 text-sm font-medium text-gray-700">Portafolio</label>
            <select className="input max-w-xs" value={activePid} onChange={e => setPid(e.target.value)}>
              {portfolios.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>

          {rLoading ? <Spinner /> : rError ? (
            <div className="card border-l-4 border-red-400 bg-red-50">
              <p className="text-red-700 text-sm font-medium">{rError?.error ?? 'Error al generar recomendaciones'}</p>
            </div>
          ) : recs ? (
            <>
              {recs.summary && (
                <div className="card border-l-4 border-brand-500 bg-brand-50">
                  <p className="text-sm text-brand-800">{recs.summary}</p>
                </div>
              )}

              {recs.recommendations?.length === 0 && (
                <div className="card text-center py-10 text-gray-400 text-sm">
                  Sin recomendaciones — agrega operaciones al portafolio
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               {(recs.recommendations ?? []).map((r, i) => (
                 <div key={i} className="card space-y-3">
                   {/* Header */}
                   <div className="flex items-center justify-between">
                     <div>
                       <span className="font-bold text-gray-900 text-base">{r.asset}</span>
                       {r.name && <span className="text-xs text-gray-400 ml-1.5">{r.name}</span>}
                     </div>
                     <ActionBadge action={r.action} />
                   </div>

                   {/* Indicadores rápidos */}
                   <div className="grid grid-cols-3 gap-2 text-xs text-center">
                     <div className="bg-gray-50 rounded-lg p-2">
                       <p className="text-gray-400 mb-0.5">RSI</p>
                       <p className={clsx('font-bold', r.rsi < 35 ? 'text-green-600' : r.rsi > 65 ? 'text-red-500' : 'text-gray-700')}>
                         {r.rsi ?? '—'}
                       </p>
                     </div>
                     <div className="bg-gray-50 rounded-lg p-2">
                       <p className="text-gray-400 mb-0.5">P&L</p>
                       <p className={clsx('font-bold', r.pnlPct >= 0 ? 'text-green-600' : 'text-red-500')}>
                         {r.pnlPct >= 0 ? '+' : ''}{r.pnlPct}%
                       </p>
                     </div>
                     <div className="bg-gray-50 rounded-lg p-2">
                       <p className="text-gray-400 mb-0.5">Tendencia</p>
                       <p className="font-bold text-gray-700">{r.trend}</p>
                     </div>
                   </div>

                   {/* Razones */}
                   <ul className="text-xs text-gray-600 space-y-1">
                     {(r.allReasons ?? [r.reason]).slice(0, 3).map((reason, j) => (
                       <li key={j} className="flex gap-1.5">
                         <span className="text-gray-300 mt-0.5">•</span>
                         <span>{reason}</span>
                       </li>
                     ))}
                   </ul>

                   {/* Confianza */}
                   <div>
                     <p className="text-xs text-gray-400 mb-1">Confianza de la señal</p>
                     <ConfidenceBar confidence={r.confidence} />
                   </div>

                   {/* Acciones rápidas */}
                   <div className="flex gap-2 pt-1 border-t border-gray-100">
                     <button
                       onClick={() => navigate(`/analysis?symbol=${r.asset}`)}
                       className="flex-1 flex items-center justify-center gap-1.5 text-xs py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:border-brand-400 hover:text-brand-600 transition-colors"
                     >
                       <BarChart className="w-3.5 h-3.5" /> Ver análisis
                     </button>
                     <button
                       onClick={() => navigate('/operations', { state: { prefill: { assetSymbol: r.asset, portfolioId: activePid } } })}
                       className="flex-1 flex items-center justify-center gap-1.5 text-xs py-1.5 rounded-lg border border-brand-300 text-brand-600 hover:bg-brand-50 transition-colors font-medium"
                     >
                       <PlusCircle className="w-3.5 h-3.5" /> Registrar op.
                     </button>
                   </div>
                 </div>
               ))}
             </div>
            </>
          ) : null}
        </div>
      )}

      {/* ── PREDICCIÓN DE TENDENCIA ─────────────────────────────────────────── */}
      {tab === 'predict' && (
        <div className="space-y-4">
          <form className="flex flex-wrap gap-2 items-center"
            onSubmit={e => { e.preventDefault(); setSymbol(input.trim().toUpperCase()); }}>
            <input className="input max-w-xs" placeholder="Símbolo (AAPL, BTC…)"
              value={input} onChange={e => setInput(e.target.value)} />
            <button className="btn-primary" type="submit">Analizar</button>
            <div className="flex flex-wrap gap-1">
              {POPULAR.map(s => (
                <button key={s} type="button"
                  onClick={() => { setSymbol(s); setInput(s); }}
                  className={clsx('px-2.5 py-1 text-xs rounded-full border transition-colors',
                    symbol === s
                      ? 'bg-brand-600 text-white border-brand-600'
                      : 'border-gray-300 text-gray-600 hover:border-brand-400'
                  )}>
                  {s}
                </button>
              ))}
            </div>
          </form>

          {tLoading ? <Spinner /> : tError ? (
            <div className="card border-l-4 border-red-400 bg-red-50">
              <p className="text-red-700 text-sm">{tError?.error ?? 'Error al analizar'}</p>
            </div>
          ) : trend ? (
            <div className="card space-y-5">
              {/* Header */}
              <div className="flex items-center gap-3 flex-wrap">
                <h3 className="text-2xl font-bold">{trend.symbol}</h3>
                {trend.trend && <TrendBadge trend={trend.trend} />}
                {trend.warning && <span className="text-yellow-600 text-sm">{trend.warning}</span>}
              </div>

              {/* Métricas principales */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-gray-50 rounded-xl p-3 text-center">
                  <p className="text-xs text-gray-400 mb-1">Precio actual</p>
                  <p className="font-bold text-lg">${trend.currentPrice}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3 text-center">
                  <p className="text-xs text-gray-400 mb-1">Precio objetivo</p>
                  <p className={clsx('font-bold text-lg', trend.targetPrice > trend.currentPrice ? 'text-green-600' : 'text-red-500')}>
                    ${trend.targetPrice}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3 text-center">
                  <p className="text-xs text-gray-400 mb-1">Soporte</p>
                  <p className="font-bold text-green-600">${trend.keyLevels?.support}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3 text-center">
                  <p className="text-xs text-gray-400 mb-1">Resistencia</p>
                  <p className="font-bold text-red-500">${trend.keyLevels?.resistance}</p>
                </div>
              </div>

              {/* Indicadores técnicos */}
              {trend.indicators && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Indicadores técnicos</p>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                    {Object.entries(trend.indicators).map(([key, val]) => val != null && (
                      <div key={key} className="bg-gray-50 rounded-lg px-3 py-2 text-center">
                        <p className="text-xs text-gray-400">{key.toUpperCase().replace('ANNUALIZED', '')}</p>
                        <p className="font-semibold text-sm text-gray-700">{val}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Confianza */}
              <div>
                <p className="text-xs text-gray-400 mb-1">Confianza de la señal · Horizonte: {trend.horizon}</p>
                <ConfidenceBar confidence={trend.confidence} />
              </div>

              {/* Razonamiento */}
              {trend.reasoning && (
                <div className="border-t border-gray-100 pt-3">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Razonamiento</p>
                  <ul className="space-y-1">
                    {trend.reasoning.split('. ').filter(Boolean).map((r, i) => (
                      <li key={i} className="flex gap-1.5 text-sm text-gray-600">
                        <span className="text-gray-300 mt-1">•</span> {r}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : null}
        </div>
      )}

      {/* ── SENTIMIENTO TÉCNICO ─────────────────────────────────────────────── */}
      {tab === 'news' && (
        <div className="space-y-4">
          <form className="flex gap-2"
            onSubmit={e => { e.preventDefault(); setSymbol(input.trim().toUpperCase()); }}>
            <input className="input max-w-xs" placeholder="Símbolo (AAPL, BTC…)"
              value={input} onChange={e => setInput(e.target.value)} />
            <button className="btn-primary" type="submit">Analizar</button>
          </form>

          {nLoading ? <Spinner /> : nError ? (
            <div className="card border-l-4 border-red-400 bg-red-50">
              <p className="text-red-700 text-sm">{nError?.error ?? 'Error al analizar'}</p>
            </div>
          ) : news ? (
            <div className="card space-y-4">
              {/* Header */}
              <div className="flex items-center gap-3 flex-wrap">
                <h3 className="text-xl font-bold">{news.symbol}</h3>
                <span className={clsx('badge font-semibold text-sm', {
                  POSITIVE: 'badge-green', NEGATIVE: 'badge-red',
                  NEUTRAL:  'badge-yellow', MIXED:    'badge-blue',
                }[news.sentiment] ?? 'badge bg-gray-100 text-gray-700')}>
                  {news.sentiment}
                </span>
                <span className={clsx('badge', {
                  HIGH: 'badge-red', MEDIUM: 'badge-yellow', LOW: 'badge-green',
                }[news.impactLevel] ?? 'badge bg-gray-100 text-gray-700')}>
                  Impacto {news.impactLevel}
                </span>
              </div>

              {/* Barra de sentimiento */}
              {news.score != null && <SentimentBar score={news.score} />}

              {/* Resumen */}
              {news.summary && (
                <p className="text-sm text-gray-700 border-t border-gray-100 pt-3">{news.summary}</p>
              )}

              {/* Temas clave */}
              {news.keyTopics?.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {news.keyTopics.map(t => (
                    <span key={t} className="badge badge-blue">{t}</span>
                  ))}
                </div>
              )}

              {/* Nota del motor */}
              {news.warning && (
                <p className="text-xs text-gray-400 border-t border-gray-100 pt-3 italic">{news.warning}</p>
              )}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
