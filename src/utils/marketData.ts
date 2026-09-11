import { Candle, Mt5LiveMarketData } from '../types';

/**
 * Real-Time MT5 Gold Market Client
 * Directly streams institutional XAU/USD quotes and candles from live feeds
 */

export async function fetchLiveMt5Price(offset = 0): Promise<Mt5LiveMarketData | null> {
  try {
    const res = await fetch('/api/market/gold-live');
    if (!res.ok || !res.headers.get('content-type')?.includes('application/json')) return null;
    const data: Mt5LiveMarketData = await res.json();
    if (offset !== 0) {
      return {
        ...data,
        price: Number((data.price + offset).toFixed(2)),
        bid: Number((data.bid + offset).toFixed(2)),
        ask: Number((data.ask + offset).toFixed(2)),
        high24h: Number((data.high24h + offset).toFixed(2)),
        low24h: Number((data.low24h + offset).toFixed(2)),
      };
    }
    return data;
  } catch (err) {
    console.warn('Live MT5 price feed notice (switched to institutional generator):', err);
    return null;
  }
}

export async function fetchLiveMt5Candles(
  timeframe: '1m' | '5m' | '15m' = '5m',
  offset = 0,
  limit = 80
): Promise<Candle[] | null> {
  try {
    const res = await fetch(`/api/market/gold-candles?timeframe=${timeframe}&limit=${limit}`);
    if (!res.ok || !res.headers.get('content-type')?.includes('application/json')) return null;
    const data = await res.json();
    if (data.success && Array.isArray(data.candles) && data.candles.length > 0) {
      if (offset !== 0) {
        return data.candles.map((c: Candle) => ({
          ...c,
          open: Number((c.open + offset).toFixed(2)),
          high: Number((c.high + offset).toFixed(2)),
          low: Number((c.low + offset).toFixed(2)),
          close: Number((c.close + offset).toFixed(2)),
        }));
      }
      return data.candles;
    }
    return null;
  } catch (err) {
    console.warn('Failed to fetch live MT5 candles:', err);
    return null;
  }
}

/**
 * Realistic XAU/USD (Gold) Market Data Generator (Fallback / Offline)
 * Centers dynamically on current real gold spot price (~4336.50)
 */
export function generateInitialGoldData(
  count = 80,
  timeframe: '1m' | '5m' | '15m' = '5m',
  basePrice = 4336.50
): Candle[] {
  const candles: Candle[] = [];
  const stepMinutes = timeframe === '1m' ? 1 : timeframe === '5m' ? 5 : 15;
  const now = Date.now();
  const startTime = now - count * stepMinutes * 60 * 1000;

  let currentClose = basePrice;
  let trend = 1;
  let trendCycles = 0;

  for (let i = 0; i < count; i++) {
    const time = startTime + i * stepMinutes * 60 * 1000;
    const date = new Date(time);
    const timeStr = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;

    trendCycles++;
    if (trendCycles > 10 + Math.floor(Math.sin(i / 4) * 3)) {
      trend = -trend;
      trendCycles = 0;
    }

    const meanPull = (basePrice - currentClose) * 0.05;
    const baseVol = timeframe === '1m' ? 0.45 : timeframe === '5m' ? 0.9 : 1.8;
    const isDisplacement = i % 15 === 0;
    const candleVol = isDisplacement ? baseVol * 1.8 : baseVol * (0.6 + Math.random() * 0.8);

    const open = currentClose;
    const direction = Math.random() < 0.6 ? trend : -trend;
    const delta = Math.random() * candleVol * direction + meanPull + (Math.random() - 0.5) * 0.3;
    const close = Number((open + delta).toFixed(2));

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

// Generate the next live tick or incorporate incoming live MT5 tick
export function generateNextTick(
  candles: Candle[],
  timeframe: '1m' | '5m' | '15m',
  liveTargetPrice?: number
): { updatedCandles: Candle[]; newCandleCreated: boolean; tickPrice: number } {
  if (candles.length === 0) {
    const initial = generateInitialGoldData(60, timeframe, liveTargetPrice || 4336.50);
    return { updatedCandles: initial, newCandleCreated: true, tickPrice: initial[initial.length - 1].close };
  }

  const stepMinutes = timeframe === '1m' ? 1 : timeframe === '5m' ? 5 : 15;
  const last = candles[candles.length - 1];
  const now = Date.now();
  const candleDuration = stepMinutes * 60 * 1000;
  const elapsed = now - last.time;

      let newPrice: number;
  if (liveTargetPrice !== undefined && !isNaN(liveTargetPrice) && liveTargetPrice > 0) {
    // Exactly match the live feed without artificial randomization
    newPrice = Number(liveTargetPrice.toFixed(2));
  } else {
    const tickDelta = Number(((Math.random() - 0.5) * 0.45).toFixed(2));
    newPrice = Number((last.close + tickDelta).toFixed(2));
  }

if (elapsed >= candleDuration) {
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
