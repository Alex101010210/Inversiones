// ─────────────────────────────────────────────────────────────────────────────
// Controlador de métricas de riesgo del portafolio.
//
// Calcula sobre una ventana de 90 días de historial de precios:
//   - Max Drawdown:   caída máxima pico → valle (%)
//   - Volatilidad:    desviación estándar de retornos diarios, anualizada
//   - Sharpe Ratio:   retorno ajustado por riesgo (tasa libre de riesgo = 5%)
//   - VaR 95%:        pérdida máxima esperada en un día con 95% de confianza
// ─────────────────────────────────────────────────────────────────────────────

const prisma = require('../../config/prisma');
const { getLatestPrice } = require('../../config/marketData');

// ─── Funciones matemáticas auxiliares ────────────────────────────────────────

// Calcula los retornos diarios como variación porcentual entre días consecutivos
function calcReturns(prices) {
  const returns = [];
  for (let i = 1; i < prices.length; i++) {
    returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
  }
  return returns;
}

function mean(arr) {
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}

function stdDev(arr) {
  const m = mean(arr);
  const variance = arr.reduce((s, v) => s + (v - m) ** 2, 0) / arr.length;
  return Math.sqrt(variance);
}

// Drawdown máximo: mayor caída porcentual desde el pico hasta el valle
function calcDrawdown(valueSeries) {
  let peak = -Infinity;
  let maxDD = 0;
  for (const v of valueSeries) {
    if (v > peak) peak = v;
    const dd = (peak - v) / peak;
    if (dd > maxDD) maxDD = dd;
  }
  return maxDD;
}

// Sharpe Ratio anualizado: (retorno promedio - tasa libre de riesgo) / desv. estándar
// riskFreeRate = 5% anual → 0.05/252 por día
function calcSharpe(returns, riskFreeRate = 0.05) {
  const annualRF = riskFreeRate / 252;
  const excess   = returns.map((r) => r - annualRF);
  const mu       = mean(excess);
  const sigma    = stdDev(excess);
  return sigma === 0 ? 0 : (mu / sigma) * Math.sqrt(252);
}

// Volatilidad anualizada: desv. estándar de retornos diarios × √252
function calcVolatility(returns) {
  return stdDev(returns) * Math.sqrt(252);
}

// VaR por simulación histórica: percentil (1-confidence) de los retornos ordenados
function calcVaR(returns, confidence = 0.95) {
  const sorted = [...returns].sort((a, b) => a - b);
  const idx = Math.floor((1 - confidence) * sorted.length);
  return sorted[idx];
}

// ─── Calcular riesgo actual del portafolio ────────────────────────────────────
const getPortfolioRisk = async (req, res, next) => {
  try {
    const portfolio = await prisma.portfolio.findFirst({
      where: { id: req.params.portfolioId, userId: req.user.id },
      include: { holdings: { include: { asset: true } } },
    });
    if (!portfolio) return res.status(404).json({ error: 'Portfolio not found' });

    // Obtener historial de precios de los últimos 90 días para todos los holdings
    const since = new Date(Date.now() - 90 * 86400000);
    let allReturns = [];
    let valueSeries = {};

    for (const h of portfolio.holdings) {
      const prices = await prisma.priceHistory.findMany({
        where: { assetId: h.assetId, date: { gte: since } },
        orderBy: { date: 'asc' },
        select: { date: true, close: true },
      });
      if (prices.length < 2) continue;

      const closePrices = prices.map((p) => p.close);
      const returns     = calcReturns(closePrices);
      allReturns.push(...returns); // agregar los retornos de este activo al pool total

      // Construir la serie de valor total del portafolio día a día
      prices.forEach((p, i) => {
        const key = p.date.toISOString().split('T')[0];
        valueSeries[key] = (valueSeries[key] || 0) + p.close * h.quantity;
      });
    }

    const valueArr   = Object.values(valueSeries);
    const drawdown   = valueArr.length > 1 ? calcDrawdown(valueArr)    : 0;
    const volatility = allReturns.length > 1 ? calcVolatility(allReturns) : 0;
    const sharpe     = allReturns.length > 1 ? calcSharpe(allReturns)    : 0;
    const var95      = allReturns.length > 1 ? calcVaR(allReturns)       : 0;

    // Valor actual del portafolio usando precios en vivo (o costo promedio como fallback)
    const totalValue = await Promise.all(
      portfolio.holdings.map(async (h) => {
        const price = (await getLatestPrice(h.asset.symbol, h.asset.type)) ?? h.avgCostBasis;
        return price * h.quantity;
      })
    ).then((vals) => vals.reduce((s, v) => s + v, 0));

    res.json({
      portfolioId:  portfolio.id,
      totalValue,
      drawdown:     +(drawdown   * 100).toFixed(2),   // en porcentaje
      volatility:   +(volatility * 100).toFixed(2),   // en porcentaje anualizado
      sharpeRatio:  +sharpe.toFixed(4),
      var95:        +(var95      * 100).toFixed(2),   // en porcentaje
      calculatedAt: new Date(),
    });
  } catch (err) { next(err); }
};

// ─── Guardar snapshot de riesgo ───────────────────────────────────────────────
// Persiste una fotografía de las métricas de riesgo en un momento dado
// (útil para mostrar el historial de evolución del riesgo del portafolio)
const saveSnapshot = async (req, res, next) => {
  try {
    const portfolio = await prisma.portfolio.findFirst({
      where: { id: req.params.portfolioId, userId: req.user.id },
    });
    if (!portfolio) return res.status(404).json({ error: 'Portfolio not found' });

    const riskData = req.body;
    const snapshot = await prisma.riskSnapshot.create({
      data: {
        portfolioId: req.params.portfolioId,
        date:        new Date(),
        totalValue:  riskData.totalValue,
        drawdown:    riskData.drawdown,
        volatility:  riskData.volatility,
        sharpeRatio: riskData.sharpeRatio,
        var95:       riskData.var95,
      },
    });
    res.status(201).json(snapshot);
  } catch (err) { next(err); }
};

// ─── Historial de snapshots de riesgo ────────────────────────────────────────
// Devuelve los snapshots guardados en los últimos N días para graficar
// la evolución del drawdown y la volatilidad en el tiempo
const getRiskHistory = async (req, res, next) => {
  try {
    const { days = 30 } = req.query;
    const since = new Date(Date.now() - days * 86400000);
    const history = await prisma.riskSnapshot.findMany({
      where: { portfolioId: req.params.portfolioId, date: { gte: since } },
      orderBy: { date: 'asc' },
    });
    res.json(history);
  } catch (err) { next(err); }
};

module.exports = { getPortfolioRisk, saveSnapshot, getRiskHistory };
