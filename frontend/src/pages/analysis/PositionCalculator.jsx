/**
 * PositionCalculator — calculates position size based on risk management.
 * Given capital, risk %, entry price and stop-loss, computes shares & RRR.
 */
import { useState, useMemo } from 'react';
import { PageHeader } from '../../components/ui/components';
import { Calculator, TrendingUp, ShieldAlert, DollarSign } from 'lucide-react';
import clsx from 'clsx';

function ResultCard({ icon: Icon, label, value, sub, color = 'blue' }) {
  const colors = { blue: 'text-brand-600', green: 'text-success', red: 'text-danger', yellow: 'text-warn' };
  return (
    <div className="bg-gray-50 rounded-xl p-4 text-center">
      <Icon className={clsx('w-5 h-5 mx-auto mb-1', colors[color])} />
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <p className={clsx('font-bold text-xl', colors[color])}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

export default function PositionCalculator() {
  const [form, setForm] = useState({
    capital:     '10000',
    riskPct:     '1',
    entry:       '150',
    stopLoss:    '140',
    target:      '170',
  });

  const set = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.value }));

  const calc = useMemo(() => {
    const capital  = +form.capital  || 0;
    const riskPct  = +form.riskPct  || 0;
    const entry    = +form.entry    || 0;
    const stop     = +form.stopLoss || 0;
    const target   = +form.target   || 0;

    if (!capital || !riskPct || !entry || !stop || entry <= 0 || stop <= 0) return null;
    if (entry === stop) return null;

    const riskAmount  = (capital * riskPct) / 100;
    const riskPerShare = Math.abs(entry - stop);
    const shares       = Math.floor(riskAmount / riskPerShare);
    const totalCost    = shares * entry;
    const totalRisk    = shares * riskPerShare;
    const reward       = target > 0 ? Math.abs(target - entry) * shares : null;
    const rrr          = reward && totalRisk > 0 ? reward / totalRisk : null;
    const capitalPct   = capital > 0 ? (totalCost / capital) * 100 : 0;
    const isLong       = entry > stop;

    return { shares, totalCost, totalRisk, reward, rrr, capitalPct, riskAmount, isLong };
  }, [form]);

  return (
    <div className="p-6 md:p-8 max-w-3xl">
      <PageHeader
        title="Calculadora de Posición"
        subtitle="Calcula el tamaño óptimo de una operación basado en tu gestión de riesgo"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* ── Inputs ──────────────────────────────────────────────────── */}
        <div className="card space-y-4">
          <h3 className="font-semibold text-gray-700 flex items-center gap-2">
            <Calculator className="w-4 h-4 text-brand-600" /> Parámetros
          </h3>

          {[
            { key: 'capital',  label: 'Capital disponible ($)', placeholder: '10000', step: '100' },
            { key: 'riskPct',  label: 'Riesgo por operación (%)', placeholder: '1', step: '0.5' },
            { key: 'entry',    label: 'Precio de entrada ($)', placeholder: '150.00', step: '0.01' },
            { key: 'stopLoss', label: 'Stop-loss ($)', placeholder: '140.00', step: '0.01' },
            { key: 'target',   label: 'Precio objetivo ($) — opcional', placeholder: '170.00', step: '0.01' },
          ].map(({ key, label, placeholder, step }) => (
            <div key={key}>
              <label className="label">{label}</label>
              <input
                className="input"
                type="number"
                step={step}
                min="0"
                placeholder={placeholder}
                value={form[key]}
                onChange={set(key)}
              />
            </div>
          ))}
        </div>

        {/* ── Results ─────────────────────────────────────────────────── */}
        <div className="card space-y-4">
          <h3 className="font-semibold text-gray-700 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-green-600" /> Resultado
          </h3>

          {calc === null ? (
            <p className="text-sm text-gray-400 text-center py-8">
              Ingresa todos los parámetros para ver el cálculo.
            </p>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <ResultCard
                  icon={TrendingUp}
                  label="Acciones / Unidades"
                  value={calc.shares.toLocaleString()}
                  sub={calc.isLong ? 'posición LONG' : 'posición SHORT'}
                  color="blue"
                />
                <ResultCard
                  icon={DollarSign}
                  label="Capital invertido"
                  value={`$${calc.totalCost.toLocaleString('en-US', { maximumFractionDigits: 0 })}`}
                  sub={`${calc.capitalPct.toFixed(1)}% del capital`}
                  color={calc.capitalPct > 50 ? 'red' : 'blue'}
                />
                <ResultCard
                  icon={ShieldAlert}
                  label="Riesgo máximo"
                  value={`$${calc.totalRisk.toLocaleString('en-US', { maximumFractionDigits: 0 })}`}
                  sub={`${+form.riskPct}% del capital`}
                  color="red"
                />
                {calc.rrr !== null && (
                  <ResultCard
                    icon={Calculator}
                    label="Ratio R:R"
                    value={`1 : ${calc.rrr.toFixed(2)}`}
                    sub={calc.rrr >= 2 ? '✓ Favorable' : calc.rrr >= 1 ? 'Aceptable' : '✗ Bajo'}
                    color={calc.rrr >= 2 ? 'green' : calc.rrr >= 1 ? 'yellow' : 'red'}
                  />
                )}
              </div>

              {/* ── Trade summary ──────────────────────────────────────── */}
              <div className="bg-gray-50 rounded-xl p-4 text-sm space-y-2 border border-gray-100">
                <p className="font-semibold text-gray-700 mb-2">Resumen de la operación</p>
                <div className="flex justify-between text-gray-600">
                  <span>Comprar {calc.shares} unidades a</span>
                  <span className="font-mono">${+form.entry}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Stop-loss en</span>
                  <span className="font-mono text-danger">${+form.stopLoss}</span>
                </div>
                {+form.target > 0 && (
                  <div className="flex justify-between text-gray-600">
                    <span>Precio objetivo</span>
                    <span className="font-mono text-success">${+form.target}</span>
                  </div>
                )}
                <div className="flex justify-between text-gray-600 border-t border-gray-200 pt-2 mt-2">
                  <span>Ganancia potencial</span>
                  <span className={clsx('font-mono font-semibold', calc.reward != null ? 'text-success' : 'text-gray-400')}>
                    {calc.reward != null ? `$${calc.reward.toLocaleString('en-US', { maximumFractionDigits: 0 })}` : '—'}
                  </span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Guide ────────────────────────────────────────────────────────── */}
      <div className="card mt-6">
        <h3 className="font-semibold text-gray-700 mb-3 text-sm">¿Cómo funciona?</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-gray-500">
          <div>
            <p className="font-semibold text-gray-700 mb-1">Fórmula</p>
            <p><code className="bg-gray-100 px-1 rounded">Unidades = (Capital × Riesgo%) ÷ |Entrada − Stop|</code></p>
          </div>
          <div>
            <p className="font-semibold text-gray-700 mb-1">Riesgo por operación</p>
            <p>Se recomienda no arriesgar más del <strong>1–2%</strong> del capital por operación.</p>
          </div>
          <div>
            <p className="font-semibold text-gray-700 mb-1">Ratio R:R</p>
            <p>Un ratio mayor a <strong>1:2</strong> es generalmente considerado favorable.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
