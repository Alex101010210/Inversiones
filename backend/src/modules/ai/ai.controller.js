/**
 * AI Module — Motor de reglas propio (sin OpenAI)
 *
 * Genera recomendaciones, predicciones de tendencia y análisis de noticias simulado
 * basándose en indicadores técnicos reales: RSI, MACD, SMA, volatilidad, drawdown.
 */

const prisma = require('../../config/prisma');
const { getLatestPrice, fetchOHLC } = require('../../config/marketData');

// ─── Indicadores técnicos (reutilizados del módulo analysis) ─────────────────

function calcEMA(closes, period) {
  const k = 2 / (period + 1);
  const ema = [closes[0]];
  for (let i = 1; i < closes.length; i++) {
    ema.push(closes[i] * k + ema[i - 1] * (1 - k));
  }
  return ema;
}

function calcRSI(closes, period = 14) {
  if (closes.length < period + 1) return null;
  const rsi = new Array(period).fill(null);
  let gains = 0, losses = 0;
  for (let i = 1; i <= period; i++) {
    const change = closes[i] - closes[i - 1];
    if (change >= 0) gains += change; else losses -= change;
  }
  let avgGain = gains / period;
  let avgLoss = losses / period;
  rsi.push(avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss));
  for (let i = period + 1; i < closes.length; i++) {
    const change = closes[i] - closes[i - 1];
    const g = change >= 0 ? change : 0;
    const l = change < 0 ? -change : 0;
    avgGain = (avgGain * (period - 1) + g) / period;
    avgLoss = (avgLoss * (period - 1) + l) / period;
    rsi.push(avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss));
  }
  return rsi[rsi.length - 1];
}

function calcMACD(closes) {
  if (closes.length < 35) return null;
  const emaFast = calcEMA(closes, 12);
  const emaSlow = calcEMA(closes, 26);
  const macdLine = emaFast.map((v, i) => v - emaSlow[i]).slice(25);
  const signalLine = calcEMA(macdLine, 9);
  const histogram  = macdLine.map((v, i) => v - (signalLine[i] ?? 0));
  return {
    value:     macdLine[macdLine.length - 1],
    signal:    signalLine[signalLine.length - 1],
    histogram: histogram[histogram.length - 1],
  };
}

function calcSMA(closes, period) {
  if (closes.length < period) return null;
  const slice = closes.slice(-period);
  return slice.reduce((s, v) => s + v, 0) / period;
}

function calcVolatility(closes, period = 20) {
  if (closes.length < period + 1) return null;
  const returns = [];
  for (let i = closes.length - period; i < closes.length; i++) {
    returns.push((closes[i] - closes[i - 1]) / closes[i - 1]);
  }
  const mean = returns.reduce((s, v) => s + v, 0) / returns.length;
  const variance = returns.reduce((s, v) => s + (v - mean) ** 2, 0) / returns.length;
  return Math.sqrt(variance) * Math.sqrt(252) * 100; // annualised %
}

// ─── Motor de reglas ─────────────────────────────────────────────────────────

function generateSignal(rsi, macd, price, sma20, sma50) {
  let bullPoints = 0;
  let bearPoints = 0;
  const reasons  = [];

  // RSI
  if (rsi !== null) {
    if (rsi < 30) { bullPoints += 3; reasons.push(`RSI en zona de sobreventa (${rsi.toFixed(1)}) — posible rebote`); }
    else if (rsi < 45) { bullPoints += 1; reasons.push(`RSI neutral-bajo (${rsi.toFixed(1)})`); }
    else if (rsi > 70) { bearPoints += 3; reasons.push(`RSI en zona de sobrecompra (${rsi.toFixed(1)}) — posible corrección`); }
    else if (rsi > 55) { bearPoints += 1; reasons.push(`RSI neutral-alto (${rsi.toFixed(1)})`); }
  }

  // MACD
  if (macd !== null) {
    if (macd.histogram > 0 && macd.value > macd.signal) {
      bullPoints += 2;
      reasons.push(`MACD positivo y por encima de la señal — momentum alcista`);
    } else if (macd.histogram < 0 && macd.value < macd.signal) {
      bearPoints += 2;
      reasons.push(`MACD negativo y por debajo de la señal — momentum bajista`);
    }
    if (macd.histogram > 0 && macd.histogram < 0.1) {
      bullPoints += 1;
      reasons.push(`Cruce alcista del MACD reciente`);
    }
  }

  // SMA
  if (sma20 !== null && price !== null) {
    if (price > sma20) { bullPoints += 1; reasons.push(`Precio por encima de SMA 20 — tendencia de corto plazo alcista`); }
    else { bearPoints += 1; reasons.push(`Precio por debajo de SMA 20 — tendencia de corto plazo bajista`); }
  }
  if (sma50 !== null && price !== null) {
    if (price > sma50) { bullPoints += 1; reasons.push(`Precio por encima de SMA 50 — tendencia de mediano plazo alcista`); }
    else { bearPoints += 1; reasons.push(`Precio por debajo de SMA 50 — tendencia de mediano plazo bajista`); }
  }

  const total     = bullPoints + bearPoints;
  const confidence = total > 0 ? +(Math.max(bullPoints, bearPoints) / total).toFixed(2) : 0.5;

  let action, trend;
  if (bullPoints > bearPoints + 2) { action = 'BUY';  trend = 'BULLISH'; }
  else if (bearPoints > bullPoints + 2) { action = 'SELL'; trend = 'BEARISH'; }
  else { action = 'HOLD'; trend = 'SIDEWAYS'; }

  return { action, trend, confidence, bullPoints, bearPoints, reasons };
}

async function getAssetAnalysis(symbol, assetType) {
  const upperSymbol = symbol.toUpperCase();

  // Try DB price history first
  let closes = [];
  const asset = await prisma.asset.findFirst({ where: { symbol: upperSymbol } });
  if (asset) {
    const prices = await prisma.priceHistory.findMany({
      where:   { assetId: asset.id, date: { gte: new Date(Date.now() - 200 * 86400000) } },
      orderBy: { date: 'asc' },
      select:  { close: true },
    });
    closes = prices.map(p => p.close);
  }

  // Fall back to live Yahoo Finance OHLC if DB is insufficient
  if (closes.length < 30) {
    const ohlc = await fetchOHLC(upperSymbol, 90).catch(() => []);
    closes = ohlc.map(r => r.close);
  }

  if (closes.length < 30) return null;

  const current = closes[closes.length - 1];
  const rsi     = calcRSI(closes);
  const macd    = calcMACD(closes);
  const sma20   = calcSMA(closes, 20);
  const sma50   = calcSMA(closes, 50);
  const vol     = calcVolatility(closes);

  const sig = generateSignal(rsi, macd, current, sma20, sma50);

  return { symbol: upperSymbol, rsi, macd, sma20, sma50, currentPrice: current, volatility: vol, ...sig };
}

// ─── Controllers ─────────────────────────────────────────────────────────────

const getRecommendations = async (req, res, next) => {
  try {
    const portfolio = await prisma.portfolio.findFirst({
      where:   { id: req.params.portfolioId, userId: req.user.id },
      include: { holdings: { include: { asset: true } } },
    });
    if (!portfolio) return res.status(404).json({ error: 'Portfolio not found' });
    if (portfolio.holdings.length === 0) {
      return res.json({ recommendations: [], summary: 'El portafolio está vacío. Agrega operaciones para recibir recomendaciones.', generatedAt: new Date() });
    }

    const recommendations = [];

    // Analizar cada holding
    for (const h of portfolio.holdings) {
      const analysis = await getAssetAnalysis(h.asset.symbol, h.asset.type);
      if (!analysis) continue;

      const currentPrice = await getLatestPrice(h.asset.symbol, h.asset.type);
      const pnlPct = h.avgCostBasis > 0 ? ((currentPrice - h.avgCostBasis) / h.avgCostBasis * 100) : 0;

      // Añadir contexto de P&L a la lógica
      let action    = analysis.action;
      let reasons   = [...analysis.reasons];
      let confidence = analysis.confidence;

      if (pnlPct > 30 && action === 'HOLD') {
        action = 'SELL'; confidence = 0.6;
        reasons.unshift(`P&L acumulado de +${pnlPct.toFixed(1)}% — considera tomar ganancias parciales`);
      } else if (pnlPct < -15 && action === 'HOLD') {
        reasons.unshift(`P&L de ${pnlPct.toFixed(1)}% — revisa si el tesis de inversión sigue vigente`);
      }

      recommendations.push({
        asset:      h.asset.symbol,
        name:       h.asset.name,
        action,
        confidence,
        currentPrice: +currentPrice.toFixed(2),
        avgCost:      +h.avgCostBasis.toFixed(2),
        pnlPct:       +pnlPct.toFixed(2),
        rsi:          analysis.rsi ? +analysis.rsi.toFixed(1) : null,
        trend:        analysis.trend,
        reason:       reasons.slice(0, 2).join('. '),
        allReasons:   reasons,
      });
    }

    // Análisis de diversificación del portafolio completo
    const byType = {};
    for (const h of portfolio.holdings) {
      byType[h.asset.type] = (byType[h.asset.type] || 0) + 1;
    }
    const types = Object.keys(byType);
    let summary = `Portafolio con ${portfolio.holdings.length} posiciones en ${types.length} tipo(s) de activos.`;
    if (types.length === 1) summary += ' Considera diversificar en otros tipos de activos para reducir riesgo.';
    if (!byType['CRYPTO'] && portfolio.holdings.length >= 3) summary += ' Sin exposición a cripto — puede agregar diversificación adicional.';

    // Guardar insights en BD
    for (const r of recommendations) {
      await prisma.aiInsight.create({
        data: {
          portfolioId: portfolio.id,
          type:        'RECOMMENDATION',
          title:       `${r.action} ${r.asset}`,
          content:     r.reason,
          confidence:  r.confidence,
        },
      }).catch(() => {}); // ignorar errores de duplicados
    }

    res.json({ recommendations, summary, generatedAt: new Date(), engine: 'rules-based' });
  } catch (err) { next(err); }
};

const predictTrend = async (req, res, next) => {
  try {
    const symbol = req.params.symbol.toUpperCase();
    const analysis = await getAssetAnalysis(symbol);

    if (!analysis) {
      return res.json({ symbol, warning: 'Historial de precios insuficiente para predicción', generatedAt: new Date() });
    }

    const { currentPrice, rsi, macd, sma20, sma50, volatility, trend, confidence, reasons } = analysis;

    // Calcular target price basado en volatilidad y señal
    const direction   = trend === 'BULLISH' ? 1 : trend === 'BEARISH' ? -1 : 0;
    const dailyVol    = volatility ? volatility / Math.sqrt(252) / 100 : 0.015;
    const expectedMove = direction * dailyVol * 10 * currentPrice; // 10 días
    const targetPrice  = +(currentPrice + expectedMove).toFixed(2);

    // Niveles de soporte y resistencia aproximados desde SMA
    const support    = sma50 ? +Math.min(sma20 ?? currentPrice, sma50).toFixed(2) : +(currentPrice * 0.95).toFixed(2);
    const resistance = sma50 ? +Math.max(sma20 ?? currentPrice, sma50 * 1.05).toFixed(2) : +(currentPrice * 1.05).toFixed(2);

    res.json({
      symbol,
      trend,
      targetPrice,
      confidence,
      currentPrice: +currentPrice.toFixed(2),
      keyLevels:    { support, resistance },
      indicators:   {
        rsi:  rsi  ? +rsi.toFixed(1)  : null,
        macd: macd ? +macd.value.toFixed(4) : null,
        sma20: sma20 ? +sma20.toFixed(2) : null,
        sma50: sma50 ? +sma50.toFixed(2) : null,
        volatilityAnnualized: volatility ? +volatility.toFixed(1) + '%' : null,
      },
      reasoning: reasons.join('. ') || 'No hay suficientes señales técnicas definidas.',
      horizon:   '7-14 días',
      generatedAt: new Date(),
      engine: 'rules-based',
    });
  } catch (err) { next(err); }
};

const getNewsAnalysis = async (req, res, next) => {
  try {
    const symbol   = req.params.symbol.toUpperCase();
    const analysis = await getAssetAnalysis(symbol);

    // Sin API de noticias, generamos un análisis de sentimiento técnico
    let sentiment, score, impactLevel;

    if (analysis) {
      const { trend, rsi, macd } = analysis;
      if (trend === 'BULLISH') { sentiment = 'POSITIVE'; score = +(0.3 + (analysis.confidence - 0.5) * 0.8).toFixed(2); }
      else if (trend === 'BEARISH') { sentiment = 'NEGATIVE'; score = -(0.3 + (analysis.confidence - 0.5) * 0.8).toFixed(2); }
      else { sentiment = 'NEUTRAL'; score = 0; }

      const volatility = analysis.volatility ?? 20;
      impactLevel = volatility > 35 ? 'HIGH' : volatility > 20 ? 'MEDIUM' : 'LOW';
    } else {
      sentiment = 'NEUTRAL'; score = 0; impactLevel = 'LOW';
    }

    const keyTopics = [];
    if (analysis?.rsi && analysis.rsi < 35)  keyTopics.push('Sobreventa técnica');
    if (analysis?.rsi && analysis.rsi > 65)  keyTopics.push('Sobrecompra técnica');
    if (analysis?.macd?.histogram > 0)       keyTopics.push('Momentum alcista');
    if (analysis?.macd?.histogram < 0)       keyTopics.push('Momentum bajista');
    if (analysis?.volatility > 30)           keyTopics.push('Alta volatilidad');
    if (keyTopics.length === 0)              keyTopics.push('Sin señales extremas');

    res.json({
      symbol,
      sentiment,
      score,
      impactLevel,
      summary: analysis
        ? `Análisis técnico de ${symbol}: ${analysis.reasons.slice(0, 3).join('. ')}.`
        : `No hay historial suficiente para analizar ${symbol}.`,
      keyTopics,
      articles: [],
      warning: 'Análisis basado en indicadores técnicos (sin API de noticias configurada)',
      generatedAt: new Date(),
      engine: 'rules-based',
    });
  } catch (err) { next(err); }
};

const listInsights = async (req, res, next) => {
  try {
    const { portfolioId, assetId, type, limit = 20 } = req.query;
    const where = {};
    if (portfolioId) where.portfolioId = portfolioId;
    if (assetId)     where.assetId     = assetId;
    if (type)        where.type        = type;
    const insights = await prisma.aiInsight.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take:    +limit,
    });
    res.json(insights);
  } catch (err) { next(err); }
};

module.exports = { getRecommendations, predictTrend, getNewsAnalysis, listInsights };
