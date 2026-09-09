import { Candle } from '../types';

/**
 * Realistic XAU/USD (Gold) Market Data Generator
 * Generates institutional candlestick data with realistic volatility,
 * liquidity sweeps, order block formation, and session characteristics.
 */

export function generateInitialGoldData(
  count = 80,
  timeframe: '1m' | '5m' | '15m' = '5m',
  basePrice = 4378.00
): Candle[] {
  const candles: Candle[] = [];
  const stepMinutes = timeframe === '1m' ? 1 : timeframe === '5m' ? 5 : 15;
  const now = Date.now();
  const startTime = now - count * stepMinutes * 60 * 1000;

  // Realistic gold price centered on 4378
  let currentClose = basePrice;
  let trend = 1; // 1 = bullish, -1 = bearish
  let trendCycles = 0;

  for (let i = 0; i < count; i++) {
    const time = startTime + i * stepMinutes * 60 * 1000;
    const date = new Date(time);
    const timeStr = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;

    // Periodically switch micro-trends to oscillate around 4378
    trendCycles++;
    if (trendCycles > 10 + Math.floor(Math.sin(i / 4) * 3)) {
      trend = -trend;
      trendCycles = 0;
    }

    // Gentle mean reversion pull towards 4378 so price stays accurately in this zone
    const meanPull = (4378.00 - currentClose) * 0.08;

    // Volatility for gold scalping around 4378
    const baseVol = timeframe === '1m' ? 0.45 : timeframe === '5m' ? 0.9 : 1.8;
    const isDisplacement = i % 15 === 0;
    const candleVol = isDisplacement ? baseVol * 1.8 : baseVol * (0.6 + Math.random() * 0.8);

    const open = currentClose;
    const direction = (Math.random() < 0.6 ? trend : -trend);
    const delta = (Math.random() * candleVol * direction) + meanPull + ((Math.random() - 0.5) * 0.3);
    const close = Number((open + delta).toFixed(2));

    // Realistic wicks
    const upperWick = Math.random() * baseVol * (i % 8 === 0 ? 1.8 : 0.6);
    const lowerWick = Math.random() * baseVol * (i % 10 === 0 ? 1.8 : 0.6);

    const high = Number((Math.max(open, close) + upperWick).toFixed(2));
    const low = Number((Math.min(open, close) - lowerWick).toFixed(2));
    const volume = Math.floor(1100 + Math.random() * 1800 * (isDisplacement ? 2.5 : 1));

    candles.push({
      time,
      timeStr,
      open,
      high,
      low,
      close,
      volume,
    });

    currentClose = close;
  }

  return candles;
}

// Generate the next live tick / update candle
export function generateNextTick(
  candles: Candle[],
  timeframe: '1m' | '5m' | '15m'
): { updatedCandles: Candle[]; newCandleCreated: boolean; tickPrice: number } {
  if (candles.length === 0) {
    const initial = generateInitialGoldData(60, timeframe, 4378.00);
    return { updatedCandles: initial, newCandleCreated: true, tickPrice: initial[initial.length - 1].close };
  }

  const stepMinutes = timeframe === '1m' ? 1 : timeframe === '5m' ? 5 : 15;
  const last = candles[candles.length - 1];
  const now = Date.now();
  const candleDuration = stepMinutes * 60 * 1000;
  const elapsed = now - last.time;

  // Realistic gold tick oscillating around 4378.00 zone
  const anchorBias = (4378.00 - last.close) * 0.05;
  const tickDelta = Number((((Math.random() - 0.5) * 0.35) + anchorBias).toFixed(2));
  const newPrice = Number((last.close + tickDelta).toFixed(2));

  if (elapsed >= candleDuration) {
    // Finalize current candle and start a new one
    const date = new Date(now);
    const timeStr = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
    const newCandle: Candle = {
      time: now,
      timeStr,
      open: last.close,
      high: Math.max(last.close, newPrice),
      low: Math.min(last.close, newPrice),
      close: newPrice,
      volume: Math.floor(150 + Math.random() * 200),
    };

    const updated = [...candles.slice(-119), newCandle];
    return { updatedCandles: updated, newCandleCreated: true, tickPrice: newPrice };
  } else {
    // Mutate the last candle
    const updatedLast: Candle = {
      ...last,
      high: Number(Math.max(last.high, newPrice).toFixed(2)),
      low: Number(Math.min(last.low, newPrice).toFixed(2)),
      close: newPrice,
      volume: last.volume + Math.floor(5 + Math.random() * 15),
    };

    const updated = [...candles.slice(0, -1), updatedLast];
    return { updatedCandles: updated, newCandleCreated: false, tickPrice: newPrice };
  }
}
