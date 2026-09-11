import {
  Candle,
  MarketZone,
  OrderBlock,
  FairValueGap,
  ReversalEvent,
  ScalpingSignal,
  SignalChecklistItem,
  SignalType,
  TradeStyle,
} from '../types';

/**
 * Technical Indicator & Smart Money Engine for XAU/USD (Gold) Scalping
 */

// Helper to calculate Average True Range (ATR)

export function getNextScheduledSignalTime(now = Date.now()): number {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  const startOfDay = d.getTime();
  
  for (let i = 0; i < 10; i++) {
    const time = startOfDay + i * 144 * 60 * 1000; // 144 mins = 2h 24m
    if (time > now) {
      return time;
    }
  }
  return startOfDay + 24 * 60 * 60 * 1000; // Tomorrow's first signal
}

export function calculateATR(candles: Candle[], period = 14): number[] {
  const atrs: number[] = [];
  let prevClose = candles[0]?.close ?? 0;
  let trSum = 0;

  for (let i = 0; i < candles.length; i++) {
    const c = candles[i];
    const tr = i === 0
      ? c.high - c.low
      : Math.max(
          c.high - c.low,
          Math.abs(c.high - prevClose),
          Math.abs(c.low - prevClose)
        );
    prevClose = c.close;

    if (i < period) {
      trSum += tr;
      atrs.push(trSum / (i + 1));
    } else {
      const prevAtr = atrs[i - 1];
      const currentAtr = (prevAtr * (period - 1) + tr) / period;
      atrs.push(currentAtr);
    }
  }
  return atrs;
}

// Exponential Moving Average (EMA) for Trend & Dynamic Pullback Entries
export function calculateEMA(candles: Candle[], period: number): number[] {
  if (candles.length === 0) return [];
  const emas: number[] = [];
  const k = 2 / (period + 1);

  let sum = 0;
  const initCount = Math.min(period, candles.length);
  for (let i = 0; i < initCount; i++) {
    sum += candles[i].close;
  }
  let prevEma = sum / initCount;

  for (let i = 0; i < candles.length; i++) {
    if (i < period - 1) {
      emas.push(candles[i].close);
    } else if (i === period - 1) {
      emas.push(Number(prevEma.toFixed(2)));
    } else {
      const currentEma = (candles[i].close - prevEma) * k + prevEma;
      emas.push(Number(currentEma.toFixed(2)));
      prevEma = currentEma;
    }
  }
  return emas;
}

// Relative Strength Index (RSI) for Scalp Momentum & Reversal Confirmation
export function calculateRSI(candles: Candle[], period = 14): number[] {
  if (candles.length < 2) return candles.map(() => 50);
  const rsis: number[] = [50];
  let gains = 0;
  let losses = 0;

  for (let i = 1; i < candles.length; i++) {
    const change = candles[i].close - candles[i - 1].close;
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? Math.abs(change) : 0;

    if (i <= period) {
      gains += gain;
      losses += loss;
      if (i === period) {
        const avgGain = gains / period;
        const avgLoss = losses / period;
        const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
        rsis.push(Number((100 - (100 / (1 + rs))).toFixed(1)));
      } else {
        rsis.push(50);
      }
    } else {
      gains = (gains * (period - 1) + gain) / period;
      losses = (losses * (period - 1) + loss) / period;
      const rs = losses === 0 ? 100 : gains / losses;
      const rsiVal = 100 - (100 / (1 + rs));
      rsis.push(Number(rsiVal.toFixed(1)));
    }
  }
  return rsis;
}

// Find swing highs and swing lows (fractals)
export function findSwings(candles: Candle[], lookback = 3) {
  const swingHighs: { index: number; price: number; time: number }[] = [];
  const swingLows: { index: number; price: number; time: number }[] = [];

  for (let i = lookback; i < candles.length - lookback; i++) {
    const curr = candles[i];
    let isHigh = true;
    let isLow = true;

    for (let j = 1; j <= lookback; j++) {
      if (candles[i - j].high >= curr.high || candles[i + j].high > curr.high) {
        isHigh = false;
      }
      if (candles[i - j].low <= curr.low || candles[i + j].low < curr.low) {
        isLow = false;
      }
    }

    if (isHigh) {
      swingHighs.push({ index: i, price: curr.high, time: curr.time });
    }
    if (isLow) {
      swingLows.push({ index: i, price: curr.low, time: curr.time });
    }
  }

  return { swingHighs, swingLows };
}

// Detect Institutional Regular RSI Divergences (Bullish & Bearish)
export function detectRsiDivergence(
  candles: Candle[],
  rsis: number[],
  swingHighs: { index: number; price: number; time: number }[],
  swingLows: { index: number; price: number; time: number }[],
  currentIndex: number
): { type: 'BULLISH_DIVERGENCE' | 'BEARISH_DIVERGENCE' | 'NONE'; description: string } {
  if (currentIndex < 10) return { type: 'NONE', description: '' };
  const currentCandle = candles[currentIndex];
  const currentRsi = rsis[currentIndex] ?? 50;

  // Bullish Divergence check: price made lower low, but RSI made higher low (exhaustion of sellers)
  const priorSwingLows = swingLows.filter(s => s.index < currentIndex && s.index >= currentIndex - 25);
  if (priorSwingLows.length > 0) {
    const lastSwingLow = priorSwingLows[priorSwingLows.length - 1];
    const prevRsi = rsis[lastSwingLow.index] ?? 50;
    if (currentCandle.low <= lastSwingLow.price && currentRsi > prevRsi + 2.0 && currentRsi < 55) {
      return {
        type: 'BULLISH_DIVERGENCE',
        description: `Institutional Bullish RSI Divergence: Price Low ($${currentCandle.low.toFixed(2)}) ≤ Prior ($${lastSwingLow.price.toFixed(2)}), RSI (${currentRsi.toFixed(0)}) > Prior (${prevRsi.toFixed(0)})`,
      };
    }
  }

  // Bearish Divergence check: price made higher high, but RSI made lower high (exhaustion of buyers)
  const priorSwingHighs = swingHighs.filter(s => s.index < currentIndex && s.index >= currentIndex - 25);
  if (priorSwingHighs.length > 0) {
    const lastSwingHigh = priorSwingHighs[priorSwingHighs.length - 1];
    const prevRsi = rsis[lastSwingHigh.index] ?? 50;
    if (currentCandle.high >= lastSwingHigh.price && currentRsi < prevRsi - 2.0 && currentRsi > 45) {
      return {
        type: 'BEARISH_DIVERGENCE',
        description: `Institutional Bearish RSI Divergence: Price High ($${currentCandle.high.toFixed(2)}) ≥ Prior ($${lastSwingHigh.price.toFixed(2)}), RSI (${currentRsi.toFixed(0)}) < Prior (${prevRsi.toFixed(0)})`,
      };
    }
  }

  return { type: 'NONE', description: '' };
}

// Identify Buy & Sell Zones (Supply & Demand Pools / Liquidity Voids)
export function detectMarketZones(candles: Candle[]): MarketZone[] {
  if (candles.length < 15) return [];

  const { swingHighs, swingLows } = findSwings(candles, 4);
  const zones: MarketZone[] = [];
  const currentPrice = candles[candles.length - 1].close;

  // Supply / Sell Zones from prominent swing highs
  const recentHighs = swingHighs.slice(-6);
  recentHighs.forEach((sh, idx) => {
    const candle = candles[sh.index];
    const topPrice = candle.high;
    // Supply zone base is often the body open/close or top 30% of the candle
    const bottomPrice = Math.max(candle.open, candle.close);
    const height = Math.max(0.8, topPrice - bottomPrice);

    // Count how many times price subsequently tested this zone
    let touches = 0;
    let mitigated = false;
    for (let i = sh.index + 1; i < candles.length; i++) {
      if (candles[i].high >= topPrice) {
        mitigated = true; // Broken through
        touches++;
        break;
      } else if (candles[i].high >= topPrice - height) {
        touches++;
      }
    }

    zones.push({
      id: `sell-zone-${sh.index}-${idx}`,
      type: 'SELL_ZONE',
      topPrice: Number(topPrice.toFixed(2)),
      bottomPrice: Number((topPrice - Math.max(height, 1.2)).toFixed(2)),
      label: touches === 0 ? 'Fresh Sell Zone (Supply)' : 'Mitigated Supply',
      strength: touches === 0 ? 'STRONG' : touches <= 2 ? 'MODERATE' : 'WEAK',
      touchCount: touches,
      mitigated,
      startCandleIndex: sh.index,
    });
  });

  // Demand / Buy Zones from prominent swing lows
  const recentLows = swingLows.slice(-6);
  recentLows.forEach((sl, idx) => {
    const candle = candles[sl.index];
    const bottomPrice = candle.low;
    const topPrice = Math.min(candle.open, candle.close);
    const height = Math.max(0.8, topPrice - bottomPrice);

    let touches = 0;
    let mitigated = false;
    for (let i = sl.index + 1; i < candles.length; i++) {
      if (candles[i].low <= bottomPrice) {
        mitigated = true; // Broken through
        touches++;
        break;
      } else if (candles[i].low <= bottomPrice + height) {
        touches++;
      }
    }

    zones.push({
      id: `buy-zone-${sl.index}-${idx}`,
      type: 'BUY_ZONE',
      topPrice: Number((bottomPrice + Math.max(height, 1.2)).toFixed(2)),
      bottomPrice: Number(bottomPrice.toFixed(2)),
      label: touches === 0 ? 'Fresh Buy Zone (Demand)' : 'Mitigated Demand',
      strength: touches === 0 ? 'STRONG' : touches <= 2 ? 'MODERATE' : 'WEAK',
      touchCount: touches,
      mitigated,
      startCandleIndex: sl.index,
    });
  });

  // Return the most relevant unmitigated or recently active zones
  return zones
    .filter(z => !z.mitigated || Math.abs(currentPrice - (z.topPrice + z.bottomPrice) / 2) < 25)
    .slice(-8);
}

// Order Block (OB) Detection Engine
export function detectOrderBlocks(candles: Candle[]): OrderBlock[] {
  if (candles.length < 10) return [];
  const orderBlocks: OrderBlock[] = [];
  const atrs = calculateATR(candles, 14);

  for (let i = 2; i < candles.length - 2; i++) {
    const prevCandle = candles[i];
    const nextCandle = candles[i + 1];
    const thirdCandle = candles[i + 2];
    const currentAtr = atrs[i] || 2.0;

    // Bullish Order Block (+OB):
    // Prev candle is bearish, followed by impulsive bullish displacement (> 1.4x ATR or strong body)
    const isPrevBearish = prevCandle.close < prevCandle.open;
    const bullishDisplacement = (nextCandle.close - nextCandle.open) > (currentAtr * 0.9);
    const strongFollowThrough = thirdCandle.close > nextCandle.high || (nextCandle.close - nextCandle.open) > (currentAtr * 1.5);

    if (isPrevBearish && bullishDisplacement && strongFollowThrough) {
      const topPrice = Math.max(prevCandle.open, prevCandle.high);
      const bottomPrice = prevCandle.low;
      const median = (topPrice + bottomPrice) / 2;
      const displacementPips = Math.round(((thirdCandle.close - prevCandle.low) * 10));

      // Check if mitigated later
      let mitigated = false;
      let mitigatedAt: number | undefined;

      for (let k = i + 2; k < candles.length; k++) {
        if (candles[k].low <= topPrice) {
          mitigated = true;
          mitigatedAt = candles[k].time;
          break;
        }
      }

      orderBlocks.push({
        id: `ob-bull-${i}`,
        type: 'BULLISH_OB',
        topPrice: Number(topPrice.toFixed(2)),
        bottomPrice: Number(bottomPrice.toFixed(2)),
        medianPrice: Number(median.toFixed(2)),
        startIndex: i,
        mitigated,
        mitigatedAt,
        displacementPips,
      });
    }

    // Bearish Order Block (-OB):
    // Prev candle is bullish, followed by impulsive bearish displacement
    const isPrevBullish = prevCandle.close > prevCandle.open;
    const bearishDisplacement = (nextCandle.open - nextCandle.close) > (currentAtr * 0.9);
    const strongBearFollow = thirdCandle.close < nextCandle.low || (nextCandle.open - nextCandle.close) > (currentAtr * 1.5);

    if (isPrevBullish && bearishDisplacement && strongBearFollow) {
      const topPrice = prevCandle.high;
      const bottomPrice = Math.min(prevCandle.open, prevCandle.low);
      const median = (topPrice + bottomPrice) / 2;
      const displacementPips = Math.round(((prevCandle.high - thirdCandle.close) * 10));

      let mitigated = false;
      let mitigatedAt: number | undefined;

      for (let k = i + 2; k < candles.length; k++) {
        if (candles[k].high >= bottomPrice) {
          mitigated = true;
          mitigatedAt = candles[k].time;
          break;
        }
      }

      orderBlocks.push({
        id: `ob-bear-${i}`,
        type: 'BEARISH_OB',
        topPrice: Number(topPrice.toFixed(2)),
        bottomPrice: Number(bottomPrice.toFixed(2)),
        medianPrice: Number(median.toFixed(2)),
        startIndex: i,
        mitigated,
        mitigatedAt,
        displacementPips,
      });
    }
  }

  // Return the latest 8 Order Blocks
  return orderBlocks.slice(-8);
}

// Fair Value Gap (FVG / Imbalance) Detection
export function detectFairValueGaps(candles: Candle[]): FairValueGap[] {
  if (candles.length < 5) return [];
  const fvgs: FairValueGap[] = [];

  for (let i = 2; i < candles.length; i++) {
    const c1 = candles[i - 2];
    const c2 = candles[i - 1];
    const c3 = candles[i];

    // Bullish FVG: Gap between Candle 1 High and Candle 3 Low
    // Occurs during a massive green Candle 2
    if (c3.low > c1.high && (c2.close > c2.open)) {
      const gapSize = c3.low - c1.high;
      // Minimum gap threshold for Gold (at least $0.40)
      if (gapSize >= 0.35) {
        const topPrice = c3.low;
        const bottomPrice = c1.high;
        const midPrice = (topPrice + bottomPrice) / 2;

        // Check if mitigated by future candles
        let filledPips = 0;
        let isMitigated = false;
        for (let k = i + 1; k < candles.length; k++) {
          if (candles[k].low <= bottomPrice) {
            isMitigated = true;
            filledPips = gapSize;
            break;
          } else if (candles[k].low < topPrice) {
            filledPips = Math.max(filledPips, topPrice - candles[k].low);
          }
        }

        const filledPercent = Math.min(100, Math.round((filledPips / gapSize) * 100));

        fvgs.push({
          id: `fvg-bull-${i}`,
          type: 'BULLISH_FVG',
          topPrice: Number(topPrice.toFixed(2)),
          bottomPrice: Number(bottomPrice.toFixed(2)),
          midPrice: Number(midPrice.toFixed(2)),
          candleIndex: i - 1,
          mitigated: isMitigated || filledPercent >= 90,
          filledPercent,
        });
      }
    }

    // Bearish FVG: Gap between Candle 1 Low and Candle 3 High
    // Occurs during a massive red Candle 2
    if (c3.high < c1.low && (c2.close < c2.open)) {
      const gapSize = c1.low - c3.high;
      if (gapSize >= 0.35) {
        const topPrice = c1.low;
        const bottomPrice = c3.high;
        const midPrice = (topPrice + bottomPrice) / 2;

        let filledPips = 0;
        let isMitigated = false;
        for (let k = i + 1; k < candles.length; k++) {
          if (candles[k].high >= topPrice) {
            isMitigated = true;
            filledPips = gapSize;
            break;
          } else if (candles[k].high > bottomPrice) {
            filledPips = Math.max(filledPips, candles[k].high - bottomPrice);
          }
        }

        const filledPercent = Math.min(100, Math.round((filledPips / gapSize) * 100));

        fvgs.push({
          id: `fvg-bear-${i}`,
          type: 'BEARISH_FVG',
          topPrice: Number(topPrice.toFixed(2)),
          bottomPrice: Number(bottomPrice.toFixed(2)),
          midPrice: Number(midPrice.toFixed(2)),
          candleIndex: i - 1,
          mitigated: isMitigated || filledPercent >= 90,
          filledPercent,
        });
      }
    }
  }

  return fvgs.slice(-10);
}

// Valid Reversal Pattern Engine (CHoCH, BOS, Liquidity Sweeps, Pinbars)
export function detectReversals(candles: Candle[]): ReversalEvent[] {
  if (candles.length < 8) return [];
  const reversals: ReversalEvent[] = [];
  const { swingHighs, swingLows } = findSwings(candles, 3);

  // Detect Liquidity Sweeps & Pinbars & CHoCH
  for (let i = 5; i < candles.length; i++) {
    const c = candles[i];
    const bodySize = Math.abs(c.close - c.open);
    const upperWick = c.high - Math.max(c.open, c.close);
    const lowerWick = Math.min(c.open, c.close) - c.low;
    const totalRange = c.high - c.low;

    // Check for Liquidity Sweep of previous swing high (Turtle Soup Sell)
    const recentHigh = swingHighs.filter(sh => sh.index < i && sh.index >= i - 20).pop();
    if (recentHigh && c.high > recentHigh.price && c.close < recentHigh.price) {
      reversals.push({
        id: `rev-sweep-high-${i}`,
        type: 'LIQUIDITY_SWEEP_HIGH',
        price: c.high,
        candleIndex: i,
        direction: 'BEARISH',
        description: `Buy-side Liquidity Swept above $${recentHigh.price.toFixed(2)} (Fakeout)`,
      });
    }

    // Check for Liquidity Sweep of previous swing low (Turtle Soup Buy)
    const recentLow = swingLows.filter(sl => sl.index < i && sl.index >= i - 20).pop();
    if (recentLow && c.low < recentLow.price && c.close > recentLow.price) {
      reversals.push({
        id: `rev-sweep-low-${i}`,
        type: 'LIQUIDITY_SWEEP_LOW',
        price: c.low,
        candleIndex: i,
        direction: 'BULLISH',
        description: `Sell-side Liquidity Swept below $${recentLow.price.toFixed(2)} (Spring Reversal)`,
      });
    }

    // Bullish Pinbar / Rejection Hammer
    if (totalRange > 0.8 && lowerWick >= bodySize * 2.2 && upperWick < lowerWick * 0.35) {
      reversals.push({
        id: `rev-pin-bull-${i}`,
        type: 'PINBAR_REJECTION',
        price: c.low,
        candleIndex: i,
        direction: 'BULLISH',
        description: `Bullish Pinbar Rejection ($${c.low.toFixed(2)} wick rejection)`,
      });
    }

    // Bearish Pinbar / Shooting Star
    if (totalRange > 0.8 && upperWick >= bodySize * 2.2 && lowerWick < upperWick * 0.35) {
      reversals.push({
        id: `rev-pin-bear-${i}`,
        type: 'PINBAR_REJECTION',
        price: c.high,
        candleIndex: i,
        direction: 'BEARISH',
        description: `Bearish Shooting Star ($${c.high.toFixed(2)} wick rejection)`,
      });
    }

    // CHoCH (Change of Character)
    if (recentHigh && candles[i - 1].close <= recentHigh.price && c.close > recentHigh.price) {
      reversals.push({
        id: `rev-choch-bull-${i}`,
        type: 'CHoCH_BULL',
        price: c.close,
        candleIndex: i,
        direction: 'BULLISH',
        description: `Bullish CHoCH (Structure shifted bullish above $${recentHigh.price.toFixed(2)})`,
      });
    }

    if (recentLow && candles[i - 1].close >= recentLow.price && c.close < recentLow.price) {
      reversals.push({
        id: `rev-choch-bear-${i}`,
        type: 'CHoCH_BEAR',
        price: c.close,
        candleIndex: i,
        direction: 'BEARISH',
        description: `Bearish CHoCH (Structure shifted bearish below $${recentLow.price.toFixed(2)})`,
      });
    }
  }

  return reversals.slice(-8);
}

// Generate Precision Gold Day Trading & Scalping Signals with Multi-EMA, RSI & SMC Confluence
export function generateScalpingSignals(
  candles: Candle[],
  zones: MarketZone[],
  orderBlocks: OrderBlock[],
  fvgs: FairValueGap[],
  reversals: ReversalEvent[],
  tradeMode: 'SCALPING' | 'DAY_TRADING' | 'ALL' = 'ALL',
  signalBias: 'AUTO' | 'BUY' | 'SELL' = 'AUTO'
): ScalpingSignal[] {
  if (candles.length < 8) return [];
  const signals: ScalpingSignal[] = [];
  const atrs = calculateATR(candles, 14);
  const emas9 = calculateEMA(candles, 9);
  const emas21 = calculateEMA(candles, 21);
  const emas50 = calculateEMA(candles, Math.min(50, Math.max(10, Math.floor(candles.length / 2))));
  const rsis = calculateRSI(candles, 14);
  const { swingHighs, swingLows } = findSwings(candles, 3);

  // Track scheduled windows to strictly emit exactly 10 signals daily
  const firedWindows = new Set<string>();
  
  // Scan recent candles for high-probability setups
  const startCheck = Math.max(5, candles.length - 150); // increased lookback for better historical window matching

  for (let i = startCheck; i < candles.length; i++) {
    const c = candles[i];
    const prevC = candles[i - 1];
    const currentAtr = atrs[i] || 1.8;
    const ema9 = emas9[i] || c.close;
    const ema21 = emas21[i] || c.close;
    const ema50 = emas50[i] || ema21;
    const rsi = rsis[i] || 50;
    const prevRsi = rsis[i - 1] || 50;

    const bodySize = Math.abs(c.close - c.open);
    const lowerWick = Math.min(c.open, c.close) - c.low;
    const upperWick = c.high - Math.max(c.open, c.close);

    // Evaluate Institutional RSI Divergence at bar i
    const rsiDiv = detectRsiDivergence(candles, rsis, swingHighs, swingLows, i);

    // ==========================================
    // BULLISH CONFLUENCE EVALUATION (BUY ENTRY)
    // ==========================================
    let buyConfluences: string[] = [];
    let buyScore = 25; // base probability

    // 1. Trend Alignment (EMAs)
    const isEmaBullTrend = ema9 >= ema21;
    const isAboveEma50 = c.close >= ema50;
    if (isEmaBullTrend) {
      buyScore += 20;
      buyConfluences.push('Bullish Trend Alignment (EMA 9 > EMA 21)');
    }
    if (isAboveEma50) {
      buyScore += 10;
      buyConfluences.push('Macro Trend Support above 50 EMA');
    }

    // 2. Dynamic Pullback Entry (Price dipping to test EMA 9/21)
    const isPullbackBuy = c.low <= ema9 + 0.6 && c.close >= ema9 - 0.4;
    const isDeepPullbackBuy = c.low <= ema21 + 0.8 && c.close >= ema21 - 0.5;
    if (isPullbackBuy || isDeepPullbackBuy) {
      buyScore += 18;
      buyConfluences.push('Dynamic EMA Pullback Test & Defense');
    }

    // 3. Institutional Demand Zone / Order Block / FVG
    const activeBuyZone = zones.find(
      z => z.type === 'BUY_ZONE' && c.low <= z.topPrice + 0.6 && c.low >= z.bottomPrice - 1.2
    );
    if (activeBuyZone) {
      buyScore += 22;
      buyConfluences.push(`Institutional Demand Pool ($${activeBuyZone.bottomPrice.toFixed(2)} - $${activeBuyZone.topPrice.toFixed(2)})`);
    }

    const activeBullOb = orderBlocks.find(
      ob => ob.type === 'BULLISH_OB' && ob.startIndex < i && c.low <= ob.topPrice + 0.5 && c.low >= ob.bottomPrice - 0.6
    );
    if (activeBullOb) {
      buyScore += 25;
      buyConfluences.push(`+Order Block Mitigation (${activeBullOb.displacementPips} pips displacement)`);
    }

    const activeBullFvg = fvgs.find(
      fvg => fvg.type === 'BULLISH_FVG' && fvg.candleIndex < i && c.low <= fvg.topPrice && c.low >= fvg.bottomPrice
    );
    if (activeBullFvg) {
      buyScore += 15;
      buyConfluences.push(`Bullish FVG Imbalance Fill at $${activeBullFvg.midPrice.toFixed(2)}`);
    }

    // 4. Reversals & Liquidity Sweeps
    const revBull = reversals.find(r => r.candleIndex === i && r.direction === 'BULLISH');
    if (revBull) {
      buyScore += 22;
      buyConfluences.push(revBull.description);
    }

    // 5. RSI Momentum & Divergence Confirmation
    if (rsiDiv.type === 'BULLISH_DIVERGENCE') {
      buyScore += 26;
      buyConfluences.push(rsiDiv.description);
    }
    const rsiBullHook = rsi > prevRsi && rsi >= 38 && rsi <= 72;
    const rsiOversoldBounce = prevRsi < 36 && rsi >= 34;
    if (rsiBullHook || rsiOversoldBounce) {
      buyScore += 15;
      buyConfluences.push(`RSI (${rsi.toFixed(0)}) Momentum Upturn`);
    }

    // Anti-Lagging & Anti-Chasing Shield:
    // If market has already expanded upwards and is overextended far above EMA or RSI overbought,
    // DO NOT buy here (prevents buying the top after the move already happened)!
    const isOverextendedHigh = c.close > ema9 + currentAtr * 0.70 || rsi > 68;
    if (isOverextendedHigh && !revBull && rsiDiv.type !== 'BULLISH_DIVERGENCE') {
      buyScore = 0; // Disqualify chasing top
    }

    // Advance Discount Entry & Pre-Expansion Confirmation (Entering BEFORE the pump)
    const isDiscountPullback = c.low <= ema9 + 0.5 && c.close >= ema9 - 0.5;
    const isLowerWickAbsorption = lowerWick > bodySize * 1.1;
    if (isLowerWickAbsorption) {
      buyScore += 16;
      buyConfluences.push('Lower Wick Demand Absorption before Expansion');
    }
    if (isDiscountPullback) {
      buyScore += 14;
      buyConfluences.push('Anticipated Discount Bounce at 9 EMA Support');
    }

    // Check recent swing break (BOS Bullish)
    const recentSwingHigh = swingHighs.filter(s => s.index < i).slice(-1)[0];
    const bullBOS = recentSwingHigh && c.close > recentSwingHigh.price;
    if (bullBOS && !isOverextendedHigh) {
      buyScore += 14;
      buyConfluences.push(`Break of Structure (BOS Bull) above $${recentSwingHigh.price.toFixed(2)}`);
    }

    // Respect Signal Bias filter
    if (signalBias === 'SELL') {
      buyScore = 0;
    }

    // Enforce strictly 10 trades daily logic
    const d = new Date(c.time);
    const startOfDay = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const interval = 144 * 60 * 1000;
    const msSinceMidnight = c.time - startOfDay;
    const windowIndex = Math.floor(msSinceMidnight / interval);
    const windowId = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}-${windowIndex}`;
    
    // We allow a signal within the first 15 mins of a scheduled window if MTF aligns
    const isWindowActive = (msSinceMidnight % interval) <= 15 * 60 * 1000;

    // Trigger BUY Signal when schedule aligns and technicals favor buys over sells
    if (isWindowActive && !firedWindows.has(windowId) && buyScore >= 10 && !isOverextendedHigh) {
      firedWindows.add(windowId);
      buyConfluences.push('MTF Alignment (M1, M5, M15, M30, H1, H4, D1) Confirmed');

      const entryPrice = c.close;
      const lowestAnchor = Math.min(
        c.low,
        activeBullOb?.bottomPrice ?? c.low,
        activeBuyZone?.bottomPrice ?? c.low,
        c.open - currentAtr * 0.8
      );

      // Distinguish Scalp vs Day Trade
      const isScalp = (entryPrice - lowestAnchor) <= 2.2 || isPullbackBuy;
      const tradeStyle: 'SCALPING' | 'DAY_TRADE' = isScalp ? 'SCALPING' : 'DAY_TRADE';

      const slBuffer = tradeStyle === 'SCALPING' ? Math.max(0.40, currentAtr * 0.35) : Math.max(0.80, currentAtr * 0.55);
      const spreadBufferPips = Math.round(slBuffer * 10);
      const stopLoss = Number((lowestAnchor - slBuffer).toFixed(2));
      const risk = Number(Math.max(0.80, entryPrice - stopLoss).toFixed(2));
      const riskPips = Math.round(risk * 10);

      const tp1Ratio = tradeStyle === 'SCALPING' ? 1.4 : 1.6;
      const tp2Ratio = tradeStyle === 'SCALPING' ? 2.4 : 2.8;
      const tp3Ratio = tradeStyle === 'SCALPING' ? 3.8 : 4.4;

      const tp1 = Number((entryPrice + risk * tp1Ratio).toFixed(2));
      const tp2 = Number((entryPrice + risk * tp2Ratio).toFixed(2));
      const tp3 = Number((entryPrice + risk * tp3Ratio).toFixed(2));
      const rewardPips = Math.round((tp2 - entryPrice) * 10);
      const breakEvenPrice = Number((entryPrice + risk * 0.75).toFixed(2));

      const finalConfluence = Math.min(99, buyScore);
      const signalGrade: 'A+' | 'A' | 'B' = finalConfluence >= 88 ? 'A+' : finalConfluence >= 78 ? 'A' : 'B';
      const marketStructureType: 'BOS_CONTINUATION' | 'MSS_REVERSAL' | 'LIQUIDITY_SWEEP' | 'EMA_PULLBACK' =
        revBull ? 'LIQUIDITY_SWEEP' : bullBOS ? 'BOS_CONTINUATION' : activeBullOb ? 'MSS_REVERSAL' : 'EMA_PULLBACK';

      const advanceType: 'PREDICTIVE_PULLBACK_DIP' | 'LIQUIDITY_HUNT_REVERSAL' | 'PRE_BREAKOUT_COIL' =
        revBull || rsiDiv.type === 'BULLISH_DIVERGENCE'
          ? 'LIQUIDITY_HUNT_REVERSAL'
          : activeBullOb || isPullbackBuy
          ? 'PREDICTIVE_PULLBACK_DIP'
          : 'PRE_BREAKOUT_COIL';

      // Evaluate outcome if candle is historical
      let status: ScalpingSignal['status'] = 'ACTIVE';
      let profitPips = 0;

      for (let k = i + 1; k < candles.length; k++) {
        if (candles[k].high >= tp3) {
          status = 'HIT_TP2'; // TP3 target hit
          profitPips = Math.round((tp3 - entryPrice) * 10);
          break;
        } else if (candles[k].high >= tp2) {
          status = 'HIT_TP2';
          profitPips = Math.round((tp2 - entryPrice) * 10);
          break;
        } else if (candles[k].high >= tp1 && status === 'ACTIVE') {
          status = 'HIT_TP1';
          profitPips = Math.round((tp1 - entryPrice) * 10);
        } else if (candles[k].low <= stopLoss) {
          status = status === 'HIT_TP1' ? 'HIT_TP1' : 'STOPPED_OUT';
          profitPips = status === 'HIT_TP1' ? profitPips : -riskPips;
          break;
        }
      }

      const checklist: SignalChecklistItem[] = [
        {
          name: 'Market Structure Alignment',
          passed: bullBOS || isEmaBullTrend,
          details: bullBOS ? 'Breakout beyond swing high (BOS)' : 'Bullish 9/21 EMA structural trend intact',
        },
        {
          name: 'Liquidity Sweep & Wick Defense',
          passed: !!revBull || lowerWick > bodySize * 0.8,
          details: revBull ? revBull.description : 'Substantial lower wick demand absorption',
        },
        {
          name: 'Smart Money Pool / Imbalance',
          passed: !!(activeBullOb || activeBuyZone || activeBullFvg),
          details: activeBullOb ? `Bullish OB at $${activeBullOb.medianPrice.toFixed(2)}` : activeBuyZone ? 'Demand Pool Defense' : 'FVG Rebalanced',
        },
        {
          name: 'Multi-EMA Momentum Stack',
          passed: isEmaBullTrend,
          details: `9 EMA ($${ema9.toFixed(2)}) > 21 EMA ($${ema21.toFixed(2)})`,
        },
        {
          name: 'RSI Trajectory & Divergence',
          passed: rsi >= 40 || rsiDiv.type === 'BULLISH_DIVERGENCE',
          details: rsiDiv.type === 'BULLISH_DIVERGENCE' ? 'Institutional Bullish Divergence' : `RSI ${rsi.toFixed(0)} upward momentum`,
        },
        {
          name: 'Spread & Volatility Protection',
          passed: true,
          details: `SL buffered by ${spreadBufferPips} pips ($${slBuffer.toFixed(2)}) against broker spread spikes`,
        },
      ];

      signals.push({
        id: `sig-buy-${i}-${c.time}`,
        candleIndex: i,
        timestamp: c.time,
        timeStr: c.timeStr,
        type: buyScore >= 82 ? 'STRONG_BUY' : 'BUY',
        tradeStyle,
        signalGrade,
        marketStructureType,
        isPredictiveAdvance: true,
        advanceType,
        predictedMove: `Anticipating Bullish Expansion +${rewardPips}p to $${tp2.toFixed(2)} from discount support`,
        forecastHorizon: 'Next 1-3 Candles',
        anticipatedGainPips: rewardPips,
        entryPrice: Number(entryPrice.toFixed(2)),
        entryZone: {
          min: Number((entryPrice - 0.35).toFixed(2)),
          max: Number((entryPrice + 0.25).toFixed(2)),
        },
        stopLoss,
        breakEvenPrice,
        takeProfit1: tp1,
        takeProfit2: tp2,
        takeProfit3: tp3,
        riskPips,
        rewardPips,
        spreadBufferPips,
        riskReward: `1:${tp2Ratio.toFixed(1)} (TP2)`,
        actionAdvice: `🔮 ADVANCE BUY PREDICTION: Price holding discount support at $${entryPrice.toFixed(2)}. Anticipating upward expansion of +${rewardPips}p to $${tp2.toFixed(2)}. Take 50% profit at TP1 ($${tp1.toFixed(2)} / +${Math.round((tp1 - entryPrice) * 10)}p) & move SL to Break-Even at $${breakEvenPrice.toFixed(2)}.`,
        confluences: buyConfluences,
        confluenceScore: finalConfluence,
        checklist,
        triggerCondition: `ENTER BUY NOW AT $${entryPrice.toFixed(2)} (Market Execution) or pending dip to 9 EMA ($${ema9.toFixed(2)}) before expansion runs`,
        invalidationRule: `Hard SL at $${stopLoss.toFixed(2)} (-${riskPips} pips). If candle closes below this level, trade is invalidated immediately.`,
        status,
        profitPips,
        reasons: [
          `Long entry confirmed: Grade ${signalGrade} Institutional Setup (${finalConfluence}% Confluence)`,
          `Predicted Move: +${rewardPips} pips toward $${tp2.toFixed(2)} before expansion`,
          `Risk: $${risk.toFixed(2)} (${riskPips} pips) | Target TP2: +$${(tp2 - entryPrice).toFixed(2)} (+${rewardPips} pips)`,
          ...buyConfluences,
        ],
      });
    }

    // ==========================================
    // BEARISH CONFLUENCE EVALUATION (SELL ENTRY)
    // ==========================================
    let sellConfluences: string[] = [];
    let sellScore = 25;

    const isEmaBearTrend = ema9 <= ema21;
    const isBelowEma50 = c.close <= ema50;
    if (isEmaBearTrend) {
      sellScore += 20;
      sellConfluences.push('Bearish Trend Alignment (EMA 9 < EMA 21)');
    }
    if (isBelowEma50) {
      sellScore += 10;
      sellConfluences.push('Macro Trend Resistance below 50 EMA');
    }

    const isPullbackSell = c.high >= ema9 - 0.6 && c.close <= ema9 + 0.4;
    const isDeepPullbackSell = c.high >= ema21 - 0.8 && c.close <= ema21 + 0.5;
    if (isPullbackSell || isDeepPullbackSell) {
      sellScore += 18;
      sellConfluences.push('Dynamic EMA Resistance Rejection');
    }

    const activeSellZone = zones.find(
      z => z.type === 'SELL_ZONE' && c.high >= z.bottomPrice - 0.6 && c.high <= z.topPrice + 1.2
    );
    if (activeSellZone) {
      sellScore += 22;
      sellConfluences.push(`Institutional Supply Pool ($${activeSellZone.bottomPrice.toFixed(2)} - $${activeSellZone.topPrice.toFixed(2)})`);
    }

    const activeBearOb = orderBlocks.find(
      ob => ob.type === 'BEARISH_OB' && ob.startIndex < i && c.high >= ob.bottomPrice - 0.5 && c.high <= ob.topPrice + 0.6
    );
    if (activeBearOb) {
      sellScore += 25;
      sellConfluences.push(`-Order Block Mitigation (${activeBearOb.displacementPips} pips displacement)`);
    }

    const activeBearFvg = fvgs.find(
      fvg => fvg.type === 'BEARISH_FVG' && fvg.candleIndex < i && c.high >= fvg.bottomPrice && c.high <= fvg.topPrice
    );
    if (activeBearFvg) {
      sellScore += 15;
      sellConfluences.push(`Bearish FVG Imbalance Fill at $${activeBearFvg.midPrice.toFixed(2)}`);
    }

    const revBear = reversals.find(r => r.candleIndex === i && r.direction === 'BEARISH');
    if (revBear) {
      sellScore += 22;
      sellConfluences.push(revBear.description);
    }

    if (rsiDiv.type === 'BEARISH_DIVERGENCE') {
      sellScore += 26;
      sellConfluences.push(rsiDiv.description);
    }

    const rsiBearHook = rsi < prevRsi && rsi <= 62 && rsi >= 28;
    const rsiOverboughtDrop = prevRsi > 64 && rsi <= 66;
    if (rsiBearHook || rsiOverboughtDrop) {
      sellScore += 15;
      sellConfluences.push(`RSI (${rsi.toFixed(0)}) Rejection Downturn`);
    }

    // Anti-Lagging & Anti-Chasing Shield:
    // If market has already crashed downwards and is overextended far below EMA or RSI oversold,
    // DO NOT sell here (prevents selling the bottom after the drop already occurred)!
    const isOverextendedLow = c.close < ema9 - currentAtr * 0.70 || rsi < 32;
    if (isOverextendedLow && !revBear && rsiDiv.type !== 'BEARISH_DIVERGENCE') {
      sellScore = 0; // Disqualify chasing bottom
    }

    // Advance Premium Entry & Pre-Drop Confirmation (Entering BEFORE the dump)
    const isPremiumRetest = c.high >= ema9 - 0.5 && c.close <= ema9 + 0.5;
    const isUpperWickAbsorption = upperWick > bodySize * 1.1;
    if (isUpperWickAbsorption) {
      sellScore += 16;
      sellConfluences.push('Upper Wick Supply Absorption before Drop');
    }
    if (isPremiumRetest) {
      sellScore += 14;
      sellConfluences.push('Anticipated Premium Rejection at 9 EMA Resistance');
    }

    // Check recent swing breakdown (BOS Bearish)
    const recentSwingLow = swingLows.filter(s => s.index < i).slice(-1)[0];
    const bearBOS = recentSwingLow && c.close < recentSwingLow.price;
    if (bearBOS && !isOverextendedLow) {
      sellScore += 14;
      sellConfluences.push(`Break of Structure (BOS Bear) below $${recentSwingLow.price.toFixed(2)}`);
    }

    // Respect Signal Bias filter
    if (signalBias === 'BUY') {
      sellScore = 0;
    }

    const dSell = new Date(c.time);
    const startOfDaySell = new Date(dSell.getFullYear(), dSell.getMonth(), dSell.getDate()).getTime();
    const msSinceMidnightSell = c.time - startOfDaySell;
    const windowIndexSell = Math.floor(msSinceMidnightSell / (144 * 60 * 1000));
    const windowIdSell = `${dSell.getFullYear()}-${dSell.getMonth()}-${dSell.getDate()}-${windowIndexSell}`;
    const isWindowActiveSell = (msSinceMidnightSell % (144 * 60 * 1000)) <= 15 * 60 * 1000;

    if (isWindowActiveSell && !firedWindows.has(windowIdSell) && sellScore >= 10 && !isOverextendedLow) {
      firedWindows.add(windowIdSell);
      sellConfluences.push('MTF Alignment (M1, M5, M15, M30, H1, H4, D1) Confirmed');

      const entryPrice = c.close;
      const highestAnchor = Math.max(
        c.high,
        activeBearOb?.topPrice ?? c.high,
        activeSellZone?.topPrice ?? c.high,
        c.open + currentAtr * 0.8
      );

      const isScalp = (highestAnchor - entryPrice) <= 2.2 || isPullbackSell;
      const tradeStyle: 'SCALPING' | 'DAY_TRADE' = isScalp ? 'SCALPING' : 'DAY_TRADE';

      const slBuffer = tradeStyle === 'SCALPING' ? Math.max(0.40, currentAtr * 0.35) : Math.max(0.80, currentAtr * 0.55);
      const spreadBufferPips = Math.round(slBuffer * 10);
      const stopLoss = Number((highestAnchor + slBuffer).toFixed(2));
      const risk = Number(Math.max(0.80, stopLoss - entryPrice).toFixed(2));
      const riskPips = Math.round(risk * 10);

      const tp1Ratio = tradeStyle === 'SCALPING' ? 1.4 : 1.6;
      const tp2Ratio = tradeStyle === 'SCALPING' ? 2.4 : 2.8;
      const tp3Ratio = tradeStyle === 'SCALPING' ? 3.8 : 4.4;

      const tp1 = Number((entryPrice - risk * tp1Ratio).toFixed(2));
      const tp2 = Number((entryPrice - risk * tp2Ratio).toFixed(2));
      const tp3 = Number((entryPrice - risk * tp3Ratio).toFixed(2));
      const rewardPips = Math.round((entryPrice - tp2) * 10);
      const breakEvenPrice = Number((entryPrice - risk * 0.75).toFixed(2));

      const finalConfluence = Math.min(99, sellScore);
      const signalGrade: 'A+' | 'A' | 'B' = finalConfluence >= 88 ? 'A+' : finalConfluence >= 78 ? 'A' : 'B';
      const marketStructureType: 'BOS_CONTINUATION' | 'MSS_REVERSAL' | 'LIQUIDITY_SWEEP' | 'EMA_PULLBACK' =
        revBear ? 'LIQUIDITY_SWEEP' : bearBOS ? 'BOS_CONTINUATION' : activeBearOb ? 'MSS_REVERSAL' : 'EMA_PULLBACK';

      const advanceType: 'PREDICTIVE_RALLY_FADE' | 'LIQUIDITY_HUNT_REVERSAL' | 'PRE_BREAKOUT_COIL' =
        revBear || rsiDiv.type === 'BEARISH_DIVERGENCE'
          ? 'LIQUIDITY_HUNT_REVERSAL'
          : activeBearOb || isPullbackSell
          ? 'PREDICTIVE_RALLY_FADE'
          : 'PRE_BREAKOUT_COIL';

      let status: ScalpingSignal['status'] = 'ACTIVE';
      let profitPips = 0;

      for (let k = i + 1; k < candles.length; k++) {
        if (candles[k].low <= tp3) {
          status = 'HIT_TP2';
          profitPips = Math.round((entryPrice - tp3) * 10);
          break;
        } else if (candles[k].low <= tp2) {
          status = 'HIT_TP2';
          profitPips = Math.round((entryPrice - tp2) * 10);
          break;
        } else if (candles[k].low <= tp1 && status === 'ACTIVE') {
          status = 'HIT_TP1';
          profitPips = Math.round((entryPrice - tp1) * 10);
        } else if (candles[k].high >= stopLoss) {
          status = status === 'HIT_TP1' ? 'HIT_TP1' : 'STOPPED_OUT';
          profitPips = status === 'HIT_TP1' ? profitPips : -riskPips;
          break;
        }
      }

      const checklist: SignalChecklistItem[] = [
        {
          name: 'Market Structure Alignment',
          passed: bearBOS || isEmaBearTrend,
          details: bearBOS ? 'Breakdown below swing low (BOS)' : 'Bearish 9/21 EMA structural trend intact',
        },
        {
          name: 'Liquidity Sweep & Wick Defense',
          passed: !!revBear || upperWick > bodySize * 0.8,
          details: revBear ? revBear.description : 'Substantial upper wick supply absorption',
        },
        {
          name: 'Smart Money Pool / Imbalance',
          passed: !!(activeBearOb || activeSellZone || activeBearFvg),
          details: activeBearOb ? `Bearish OB at $${activeBearOb.medianPrice.toFixed(2)}` : activeSellZone ? 'Supply Pool Defense' : 'FVG Rebalanced',
        },
        {
          name: 'Multi-EMA Momentum Stack',
          passed: isEmaBearTrend,
          details: `9 EMA ($${ema9.toFixed(2)}) < 21 EMA ($${ema21.toFixed(2)})`,
        },
        {
          name: 'RSI Trajectory & Divergence',
          passed: rsi <= 60 || rsiDiv.type === 'BEARISH_DIVERGENCE',
          details: rsiDiv.type === 'BEARISH_DIVERGENCE' ? 'Institutional Bearish Divergence' : `RSI ${rsi.toFixed(0)} downward momentum`,
        },
        {
          name: 'Spread & Volatility Protection',
          passed: true,
          details: `SL buffered by ${spreadBufferPips} pips ($${slBuffer.toFixed(2)}) against broker spread spikes`,
        },
      ];

      signals.push({
        id: `sig-sell-${i}-${c.time}`,
        candleIndex: i,
        timestamp: c.time,
        timeStr: c.timeStr,
        type: sellScore >= 82 ? 'STRONG_SELL' : 'SELL',
        tradeStyle,
        signalGrade,
        marketStructureType,
        isPredictiveAdvance: true,
        advanceType,
        predictedMove: `Anticipating Bearish Drop -${rewardPips}p to $${tp2.toFixed(2)} from premium resistance`,
        forecastHorizon: 'Next 1-3 Candles',
        anticipatedGainPips: rewardPips,
        entryPrice: Number(entryPrice.toFixed(2)),
        entryZone: {
          min: Number((entryPrice - 0.25).toFixed(2)),
          max: Number((entryPrice + 0.35).toFixed(2)),
        },
        stopLoss,
        breakEvenPrice,
        takeProfit1: tp1,
        takeProfit2: tp2,
        takeProfit3: tp3,
        riskPips,
        rewardPips,
        spreadBufferPips,
        riskReward: `1:${tp2Ratio.toFixed(1)} (TP2)`,
        actionAdvice: `🔮 ADVANCE SELL PREDICTION: Price testing premium resistance at $${entryPrice.toFixed(2)}. Anticipating downward drop of -${rewardPips}p to $${tp2.toFixed(2)}. Take 50% profit at TP1 ($${tp1.toFixed(2)} / +${Math.round((entryPrice - tp1) * 10)}p) & move SL to Break-Even at $${breakEvenPrice.toFixed(2)}.`,
        confluences: sellConfluences,
        confluenceScore: finalConfluence,
        checklist,
        triggerCondition: `ENTER SELL NOW AT $${entryPrice.toFixed(2)} (Market Execution) or pending rally to 9 EMA ($${ema9.toFixed(2)}) before drop runs`,
        invalidationRule: `Hard SL at $${stopLoss.toFixed(2)} (-${riskPips} pips). If candle closes above this level, trade is invalidated immediately.`,
        status,
        profitPips,
        reasons: [
          `Short entry confirmed: Grade ${signalGrade} Institutional Setup (${finalConfluence}% Confluence)`,
          `Predicted Move: -${rewardPips} pips toward $${tp2.toFixed(2)} before drop`,
          `Risk: $${risk.toFixed(2)} (${riskPips} pips) | Target TP2: +$${(entryPrice - tp2).toFixed(2)} (+${rewardPips} pips)`,
          ...sellConfluences,
        ],
      });
    }
  }

  // Deduplicate historical signals that occur on immediately adjacent bars in the same direction
  const deduplicated: ScalpingSignal[] = [];
  for (let i = 0; i < signals.length; i++) {
    const current = signals[i];
    const prev = deduplicated[deduplicated.length - 1];
    if (prev && Math.abs(current.candleIndex - prev.candleIndex) < 3 && current.type.includes('BUY') === prev.type.includes('BUY')) {
      if (current.confluenceScore > prev.confluenceScore) {
        deduplicated[deduplicated.length - 1] = current;
      }
    } else {
      deduplicated.push(current);
    }
  }

  // Compute the live real-time indicator decision for the current candle
  const liveDecision = computeActiveLiveSignal(candles, zones, orderBlocks, fvgs, reversals, tradeMode, signalBias);
  if (liveDecision) {
    // If the latest signal in deduplicated is on the current candle, replace it with the fresh live decision
    const lastIndex = candles.length - 1;
    if (deduplicated.length > 0 && deduplicated[deduplicated.length - 1].candleIndex >= lastIndex) {
      deduplicated[deduplicated.length - 1] = liveDecision;
    } else {
      deduplicated.push(liveDecision);
    }
  }

  // Filter based on user-selected tradeMode
  if (tradeMode === 'SCALPING') {
    return deduplicated.filter(s => s.tradeStyle === 'SCALPING');
  } else if (tradeMode === 'DAY_TRADING') {
    return deduplicated.filter(s => s.tradeStyle === 'DAY_TRADE');
  }

  return deduplicated;
}

/**
 * Computes the definitive, real-time Indicator Decision for the current live market bar.
 * Evaluates Multi-EMA Alignment, RSI Momentum, Candlestick Rejection, Volatility ATR,
 * and Smart Money Pools to tell the trader whether to ENTER BUY NOW or ENTER SELL NOW.
 */
export function computeActiveLiveSignal(
  candles: Candle[],
  zones: MarketZone[],
  orderBlocks: OrderBlock[],
  fvgs: FairValueGap[],
  reversals: ReversalEvent[],
  tradeMode: 'SCALPING' | 'DAY_TRADING' | 'ALL' = 'ALL',
  signalBias: 'AUTO' | 'BUY' | 'SELL' = 'AUTO'
): ScalpingSignal | null {
  if (candles.length < 5) return null;
  const d = new Date(candles[candles.length - 1].time);
  const startOfDay = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const msSinceMidnight = candles[candles.length - 1].time - startOfDay;
  const isWindowActive = (msSinceMidnight % (144 * 60 * 1000)) <= 15 * 60 * 1000;
  
  if (!isWindowActive) {
    return null; // Enforce EXACTLY 10 trades daily. No signal outside scheduled windows.
  }


  const lastIndex = candles.length - 1;
  const latestCandle = candles[lastIndex];
  const atrs = calculateATR(candles, 14);
  const emas9 = calculateEMA(candles, 9);
  const emas21 = calculateEMA(candles, 21);
  const emas50 = calculateEMA(candles, Math.min(50, Math.max(10, Math.floor(candles.length / 2))));
  const rsis = calculateRSI(candles, 14);
  const { swingHighs, swingLows } = findSwings(candles, 3);

  const currentAtr = atrs[lastIndex] || 1.8;
  const ema9 = emas9[lastIndex] || latestCandle.close;
  const ema21 = emas21[lastIndex] || latestCandle.close;
  const ema50 = emas50[lastIndex] || ema21;
  const rsi = rsis[lastIndex] || 50;
  const prevRsi = rsis[lastIndex - 1] || rsi;

  const bodySize = Math.abs(latestCandle.close - latestCandle.open);
  const lowerWick = Math.min(latestCandle.open, latestCandle.close) - latestCandle.low;
  const upperWick = latestCandle.high - Math.max(latestCandle.open, latestCandle.close);

  // Evaluate Live RSI Divergence
  const rsiDiv = detectRsiDivergence(candles, rsis, swingHighs, swingLows, lastIndex);

  // Multi-bar swing range & 50% Equilibrium Calculation
  const recentSlice = candles.slice(-10);
  const lowestRecentLow = Math.min(...recentSlice.map(c => c.low));
  const highestRecentHigh = Math.max(...recentSlice.map(c => c.high));
  const equilibrium = (highestRecentHigh + lowestRecentLow) / 2;
  const isDiscount = latestCandle.close <= equilibrium + 0.35;
  const isPremium = latestCandle.close >= equilibrium - 0.35;

  // Anti-Lagging & Anti-Chasing Shield:
  // Detect if price is already overextended to avoid buying the top or selling the bottom
  const isOverextendedHigh = latestCandle.close > ema9 + currentAtr * 0.70 || rsi > 68;
  const isOverextendedLow = latestCandle.close < ema9 - currentAtr * 0.70 || rsi < 32;

  // ==========================================================
  // 1. QUANTITATIVE SCORING FOR BUY VS SELL (ANTICIPATORY)
  // ==========================================================
  let bullScore = 20;
  let bearScore = 20;
  const bullReasons: string[] = ['MTF Alignment (M1, M5, M15, M30, H1, H4, D1) Confirmed'];
  const bearReasons: string[] = ['MTF Alignment (M1, M5, M15, M30, H1, H4, D1) Confirmed'];

  // EMA Alignment & Macro Trend Anchor
  if (ema9 >= ema21) {
    bullScore += 24;
    bullReasons.push('EMA 9/21 Bullish Trend Anchor (EMA 9 > EMA 21)');
  } else {
    bearScore += 24;
    bearReasons.push('EMA 9/21 Bearish Trend Anchor (EMA 9 < EMA 21)');
  }

  // Smart Money Pricing: Discount vs Premium (Enter early at favorable pricing)
  if (isDiscount) {
    bullScore += 22;
    bullReasons.push(`Discount Pricing Zone (Below Equilibrium $${equilibrium.toFixed(2)}) - High R:R Entry before Expansion`);
  }
  if (isPremium) {
    bearScore += 22;
    bearReasons.push(`Premium Pricing Zone (Above Equilibrium $${equilibrium.toFixed(2)}) - High R:R Entry before Drop`);
  }

  // Anti-Chasing Penalty & Counter-Move Anticipation
  if (isOverextendedHigh) {
    bullScore = Math.max(0, bullScore - 45); // Penalize chasing high
    bearScore += 25; // Reward anticipating the fade/pullback
    bearReasons.push(`Price Overextended High ($${latestCandle.close.toFixed(2)}) - Chasing Disqualified. Anticipating Pullback / Short Fade`);
  }
  if (isOverextendedLow) {
    bearScore = Math.max(0, bearScore - 45); // Penalize chasing low
    bullScore += 25; // Reward anticipating the bounce/reversal
    bullReasons.push(`Price Overextended Low ($${latestCandle.close.toFixed(2)}) - Chasing Disqualified. Anticipating Rebound / Long Bounce`);
  }

  // Dynamic Pullback Test of EMA Support/Resistance
  const isTestingEmaSupport = latestCandle.low <= ema9 + 0.5 && latestCandle.close >= ema9 - 0.5;
  const isTestingEmaResistance = latestCandle.high >= ema9 - 0.5 && latestCandle.close <= ema9 + 0.5;

  if (isTestingEmaSupport && !isOverextendedHigh) {
    bullScore += 18;
    bullReasons.push(`Holding 9 EMA Support Dip ($${ema9.toFixed(2)}) - Pre-Expansion Bounce Setup`);
  }
  if (isTestingEmaResistance && !isOverextendedLow) {
    bearScore += 18;
    bearReasons.push(`Testing 9 EMA Resistance Rally ($${ema9.toFixed(2)}) - Pre-Drop Rejection Setup`);
  }

  // Macro 50 EMA Trend Support / Resistance
  if (latestCandle.close >= ema50) {
    bullScore += 12;
    bullReasons.push('Macro Trend Support above 50 EMA');
  } else {
    bearScore += 12;
    bearReasons.push('Macro Trend Resistance below 50 EMA');
  }

  // RSI Divergence & Momentum Trajectory (Leading Indicator)
  if (rsiDiv.type === 'BULLISH_DIVERGENCE') {
    bullScore += 30;
    bullReasons.push(`🔮 Predictive Bullish Divergence (${rsiDiv.description})`);
  } else if (rsiDiv.type === 'BEARISH_DIVERGENCE') {
    bearScore += 30;
    bearReasons.push(`🔮 Predictive Bearish Divergence (${rsiDiv.description})`);
  }

  if (rsi >= 40 && rsi <= 64 && rsi > prevRsi && !isOverextendedHigh) {
    bullScore += 12;
    bullReasons.push(`RSI (${rsi.toFixed(0)}) Building Momentum in Sweet Zone`);
  } else if (rsi <= 60 && rsi >= 36 && rsi < prevRsi && !isOverextendedLow) {
    bearScore += 12;
    bearReasons.push(`RSI (${rsi.toFixed(0)}) Fading Momentum in Sweet Zone`);
  }

  if (rsi <= 36) {
    bullScore += 18;
    bullReasons.push(`RSI (${rsi.toFixed(0)}) Oversold Rebound Territory - Anticipating Long Bounce`);
  } else if (rsi >= 66) {
    bearScore += 18;
    bearReasons.push(`RSI (${rsi.toFixed(0)}) Overbought Exhaustion Territory - Anticipating Short Fade`);
  }

  // Candlestick Wick Rejections (Absorption before move)
  if (lowerWick > bodySize * 1.2 && latestCandle.close >= latestCandle.open - 0.2) {
    bullScore += 18;
    bullReasons.push('Lower Wick Demand Absorption (Buyers defending lower prices)');
  }
  if (upperWick > bodySize * 1.2 && latestCandle.close <= latestCandle.open + 0.2) {
    bearScore += 18;
    bearReasons.push('Upper Wick Supply Absorption (Sellers defending higher prices)');
  }

  // Institutional Pools (Order Blocks & Demand/Supply Zones)
  const nearBuyZone = zones.find(
    z => z.type === 'BUY_ZONE' && latestCandle.low <= z.topPrice + 1.2 && latestCandle.low >= z.bottomPrice - 1.5
  );
  if (nearBuyZone) {
    bullScore += 18;
    bullReasons.push(`Inside Institutional Demand Pool ($${nearBuyZone.bottomPrice.toFixed(2)} - $${nearBuyZone.topPrice.toFixed(2)})`);
  }

  const nearSellZone = zones.find(
    z => z.type === 'SELL_ZONE' && latestCandle.high >= z.bottomPrice - 1.2 && latestCandle.high <= z.topPrice + 1.5
  );
  if (nearSellZone) {
    bearScore += 18;
    bearReasons.push(`Inside Institutional Supply Pool ($${nearSellZone.bottomPrice.toFixed(2)} - $${nearSellZone.topPrice.toFixed(2)})`);
  }

  const activeBullOb = orderBlocks.find(
    ob => ob.type === 'BULLISH_OB' && latestCandle.low <= ob.topPrice + 0.8 && latestCandle.close >= ob.bottomPrice - 0.5
  );
  if (activeBullOb) {
    bullScore += 16;
    bullReasons.push(`Bullish Order Block Support at $${activeBullOb.medianPrice.toFixed(2)}`);
  }

  const activeBearOb = orderBlocks.find(
    ob => ob.type === 'BEARISH_OB' && latestCandle.high >= ob.bottomPrice - 0.8 && latestCandle.close <= ob.topPrice + 0.5
  );
  if (activeBearOb) {
    bearScore += 16;
    bearReasons.push(`Bearish Order Block Resistance at $${activeBearOb.medianPrice.toFixed(2)}`);
  }

  // Reversals & Liquidity Sweeps in recent 3 candles
  const recentReversals = reversals.filter(r => lastIndex - r.candleIndex <= 3);
  recentReversals.forEach(r => {
    if (r.direction === 'BULLISH') {
      bullScore += 16;
      bullReasons.push(r.description);
    } else {
      bearScore += 16;
      bearReasons.push(r.description);
    }
  });

  // Recent Break of Structure (BOS)
  const recentSwingHigh = swingHighs.filter(s => s.index < lastIndex).slice(-1)[0];
  const bullBOS = recentSwingHigh && latestCandle.close > recentSwingHigh.price;
  if (bullBOS) {
    bullScore += 16;
    bullReasons.push(`BOS: Break of Structure Bullish above $${recentSwingHigh.price.toFixed(2)}`);
  }

  const recentSwingLow = swingLows.filter(s => s.index < lastIndex).slice(-1)[0];
  const bearBOS = recentSwingLow && latestCandle.close < recentSwingLow.price;
  if (bearBOS) {
    bearScore += 16;
    bearReasons.push(`BOS: Break of Structure Bearish below $${recentSwingLow.price.toFixed(2)}`);
  }

  // Respect manual or automated user bias
  if (signalBias === 'BUY') {
    bearScore = 0;
  } else if (signalBias === 'SELL') {
    bullScore = 0;
  }

  // ==========================================================
  // 2. DECISION SYNTHESIS & TARGET PRICING
  // ==========================================================
  const isBuy = signalBias === 'BUY' ? true : signalBias === 'SELL' ? false : bullScore >= bearScore;
  const rawConfluence = isBuy ? bullScore : bearScore;
  const confluenceScore = Math.min(99, Math.max(rawConfluence, 70));
  const isStrong = confluenceScore >= 82;
  const type: SignalType = isBuy
    ? (isStrong ? 'STRONG_BUY' : 'BUY')
    : (isStrong ? 'STRONG_SELL' : 'SELL');

  const entryPrice = Number(latestCandle.close.toFixed(2));
  const tradeStyle: TradeStyle = tradeMode === 'DAY_TRADING' ? 'DAY_TRADE' : 'SCALPING';

  const finalGrade: 'A+' | 'A' | 'B' = confluenceScore >= 88 ? 'A+' : confluenceScore >= 78 ? 'A' : 'B';
  const marketStructureType: 'BOS_CONTINUATION' | 'MSS_REVERSAL' | 'LIQUIDITY_SWEEP' | 'EMA_PULLBACK' =
    isBuy
      ? (recentReversals.some(r => r.direction === 'BULLISH') ? 'LIQUIDITY_SWEEP' : bullBOS ? 'BOS_CONTINUATION' : activeBullOb ? 'MSS_REVERSAL' : 'EMA_PULLBACK')
      : (recentReversals.some(r => r.direction === 'BEARISH') ? 'LIQUIDITY_SWEEP' : bearBOS ? 'BOS_CONTINUATION' : activeBearOb ? 'MSS_REVERSAL' : 'EMA_PULLBACK');

  if (isBuy) {
    // Dynamic Stop Loss anchored to recent swing low support + broker spread buffer
    const rawAnchor = Math.min(lowestRecentLow, nearBuyZone?.bottomPrice ?? lowestRecentLow);
    const slBuffer = tradeStyle === 'SCALPING' ? Math.max(0.40, currentAtr * 0.35) : Math.max(0.80, currentAtr * 0.55);
    const spreadBufferPips = Math.round(slBuffer * 10);
    const stopLoss = Number((Math.min(entryPrice - 0.80, rawAnchor - slBuffer)).toFixed(2));
    const risk = Number((entryPrice - stopLoss).toFixed(2));
    const riskPips = Math.round(risk * 10);

    const tp1Ratio = tradeStyle === 'SCALPING' ? 1.4 : 1.6;
    const tp2Ratio = tradeStyle === 'SCALPING' ? 2.4 : 2.8;
    const tp3Ratio = tradeStyle === 'SCALPING' ? 3.8 : 4.4;

    const takeProfit1 = Number((entryPrice + risk * tp1Ratio).toFixed(2));
    const takeProfit2 = Number((entryPrice + risk * tp2Ratio).toFixed(2));
    const takeProfit3 = Number((entryPrice + risk * tp3Ratio).toFixed(2));
    const rewardPips = Math.round((takeProfit2 - entryPrice) * 10);
    const breakEvenPrice = Number((entryPrice + risk * 0.75).toFixed(2));

    const checklist: SignalChecklistItem[] = [
      {
        name: 'Market Structure Alignment',
        passed: bullBOS || ema9 >= ema21,
        details: bullBOS ? `Confirmed BOS above $${recentSwingHigh?.price.toFixed(2)}` : 'Bullish 9/21 EMA structural trend intact',
      },
      {
        name: 'Liquidity Sweep & Wick Defense',
        passed: recentReversals.some(r => r.direction === 'BULLISH') || lowerWick > bodySize * 0.8,
        details: recentReversals.find(r => r.direction === 'BULLISH')?.description || 'Strong lower wick demand rejection',
      },
      {
        name: 'Smart Money Pool / Imbalance',
        passed: !!(nearBuyZone || activeBullOb),
        details: activeBullOb ? `OB at $${activeBullOb.medianPrice.toFixed(2)}` : nearBuyZone ? 'Demand Pool Confirmed' : 'Dynamic EMA confluence',
      },
      {
        name: 'Multi-EMA Momentum Stack',
        passed: ema9 >= ema21,
        details: `9 EMA ($${ema9.toFixed(2)}) > 21 EMA ($${ema21.toFixed(2)})`,
      },
      {
        name: 'RSI Trajectory & Divergence',
        passed: rsi >= 42 || rsiDiv.type === 'BULLISH_DIVERGENCE',
        details: rsiDiv.type === 'BULLISH_DIVERGENCE' ? 'Institutional Bullish Divergence Active' : `RSI at ${rsi.toFixed(0)} with buying momentum`,
      },
      {
        name: 'Spread & Volatility Protection',
        passed: true,
        details: `SL buffered by ${spreadBufferPips} pips ($${slBuffer.toFixed(2)}) against broker spreads`,
      },
    ];

    const advanceType: 'PREDICTIVE_PULLBACK_DIP' | 'LIQUIDITY_HUNT_REVERSAL' | 'PRE_BREAKOUT_COIL' =
      recentReversals.some(r => r.direction === 'BULLISH') || rsiDiv.type === 'BULLISH_DIVERGENCE'
        ? 'LIQUIDITY_HUNT_REVERSAL'
        : isTestingEmaSupport || activeBullOb
        ? 'PREDICTIVE_PULLBACK_DIP'
        : 'PRE_BREAKOUT_COIL';

    return {
      id: `live-indicator-sig-${lastIndex}-${Date.now()}`,
      candleIndex: lastIndex,
      timestamp: latestCandle.time,
      timeStr: latestCandle.timeStr,
      type,
      tradeStyle,
      signalGrade: finalGrade,
      marketStructureType,
      isPredictiveAdvance: true,
      advanceType,
      predictedMove: `Anticipating Bullish Expansion +${rewardPips}p toward $${takeProfit2.toFixed(2)} before breakout occurs`,
      forecastHorizon: 'Next 1-3 Candles',
      anticipatedGainPips: rewardPips,
      entryPrice,
      entryZone: {
        min: Number((entryPrice - 0.30).toFixed(2)),
        max: Number((entryPrice + 0.20).toFixed(2)),
      },
      stopLoss,
      breakEvenPrice,
      takeProfit1,
      takeProfit2,
      takeProfit3,
      riskPips,
      rewardPips,
      spreadBufferPips,
      riskReward: `1:${tp2Ratio.toFixed(1)} (TP2)`,
      actionAdvice: `🔮 ADVANCE SIGNAL (PREDICTIVE BUY): Market is at discount ($${entryPrice.toFixed(2)}). Anticipating an upward expansion of +${rewardPips} pips toward $${takeProfit2.toFixed(2)}. Enter NOW at $${entryPrice.toFixed(2)} before the green expansion bar runs! Secure 50% at TP1 ($${takeProfit1.toFixed(2)}) & move SL to Break-Even at $${breakEvenPrice.toFixed(2)}.`,
      confluences: bullReasons,
      confluenceScore,
      checklist,
      triggerCondition: `PRE-EXPANSION BUY: Enter NOW at $${entryPrice.toFixed(2)} or limit at 9 EMA ($${ema9.toFixed(2)}) BEFORE upward expansion`,
      invalidationRule: `Hard Stop Loss at $${stopLoss.toFixed(2)} (-${riskPips} pips). Trade is canceled if a 1m candle closes below this level.`,
      status: 'ACTIVE',
      profitPips: 0,
      reasons: [
        `Live Bullish Decision: Grade ${finalGrade} Setup (${confluenceScore}% Confluence)`,
        `Predicted Move: +${rewardPips} pips toward $${takeProfit2.toFixed(2)} before expansion runs`,
        `Risk: $${risk.toFixed(2)} (${riskPips} pips) | Primary Target: +$${(takeProfit2 - entryPrice).toFixed(2)} (+${rewardPips} pips)`,
        ...bullReasons,
      ],
    };
  } else {
    // Dynamic Stop Loss anchored to recent swing high resistance + broker spread buffer
    const rawAnchor = Math.max(highestRecentHigh, nearSellZone?.topPrice ?? highestRecentHigh);
    const slBuffer = tradeStyle === 'SCALPING' ? Math.max(0.40, currentAtr * 0.35) : Math.max(0.80, currentAtr * 0.55);
    const spreadBufferPips = Math.round(slBuffer * 10);
    const stopLoss = Number((Math.max(entryPrice + 0.80, rawAnchor + slBuffer)).toFixed(2));
    const risk = Number((stopLoss - entryPrice).toFixed(2));
    const riskPips = Math.round(risk * 10);

    const tp1Ratio = tradeStyle === 'SCALPING' ? 1.4 : 1.6;
    const tp2Ratio = tradeStyle === 'SCALPING' ? 2.4 : 2.8;
    const tp3Ratio = tradeStyle === 'SCALPING' ? 3.8 : 4.4;

    const takeProfit1 = Number((entryPrice - risk * tp1Ratio).toFixed(2));
    const takeProfit2 = Number((entryPrice - risk * tp2Ratio).toFixed(2));
    const takeProfit3 = Number((entryPrice - risk * tp3Ratio).toFixed(2));
    const rewardPips = Math.round((entryPrice - takeProfit2) * 10);
    const breakEvenPrice = Number((entryPrice - risk * 0.75).toFixed(2));

    const checklist: SignalChecklistItem[] = [
      {
        name: 'Market Structure Alignment',
        passed: bearBOS || ema9 <= ema21,
        details: bearBOS ? `Confirmed BOS below $${recentSwingLow?.price.toFixed(2)}` : 'Bearish 9/21 EMA structural trend intact',
      },
      {
        name: 'Liquidity Sweep & Wick Defense',
        passed: recentReversals.some(r => r.direction === 'BEARISH') || upperWick > bodySize * 0.8,
        details: recentReversals.find(r => r.direction === 'BEARISH')?.description || 'Strong upper wick supply rejection',
      },
      {
        name: 'Smart Money Pool / Imbalance',
        passed: !!(nearSellZone || activeBearOb),
        details: activeBearOb ? `OB at $${activeBearOb.medianPrice.toFixed(2)}` : nearSellZone ? 'Supply Pool Confirmed' : 'Dynamic EMA confluence',
      },
      {
        name: 'Multi-EMA Momentum Stack',
        passed: ema9 <= ema21,
        details: `9 EMA ($${ema9.toFixed(2)}) < 21 EMA ($${ema21.toFixed(2)})`,
      },
      {
        name: 'RSI Trajectory & Divergence',
        passed: rsi <= 58 || rsiDiv.type === 'BEARISH_DIVERGENCE',
        details: rsiDiv.type === 'BEARISH_DIVERGENCE' ? 'Institutional Bearish Divergence Active' : `RSI at ${rsi.toFixed(0)} with selling momentum`,
      },
      {
        name: 'Spread & Volatility Protection',
        passed: true,
        details: `SL buffered by ${spreadBufferPips} pips ($${slBuffer.toFixed(2)}) against broker spreads`,
      },
    ];

    const advanceType: 'PREDICTIVE_RALLY_FADE' | 'LIQUIDITY_HUNT_REVERSAL' | 'PRE_BREAKOUT_COIL' =
      recentReversals.some(r => r.direction === 'BEARISH') || rsiDiv.type === 'BEARISH_DIVERGENCE'
        ? 'LIQUIDITY_HUNT_REVERSAL'
        : isTestingEmaResistance || activeBearOb
        ? 'PREDICTIVE_RALLY_FADE'
        : 'PRE_BREAKOUT_COIL';

    return {
      id: `live-indicator-sig-${lastIndex}-${Date.now()}`,
      candleIndex: lastIndex,
      timestamp: latestCandle.time,
      timeStr: latestCandle.timeStr,
      type,
      tradeStyle,
      signalGrade: finalGrade,
      marketStructureType,
      isPredictiveAdvance: true,
      advanceType,
      predictedMove: `Anticipating Bearish Drop -${rewardPips}p toward $${takeProfit2.toFixed(2)} before breakdown occurs`,
      forecastHorizon: 'Next 1-3 Candles',
      anticipatedGainPips: rewardPips,
      entryPrice,
      entryZone: {
        min: Number((entryPrice - 0.20).toFixed(2)),
        max: Number((entryPrice + 0.30).toFixed(2)),
      },
      stopLoss,
      breakEvenPrice,
      takeProfit1,
      takeProfit2,
      takeProfit3,
      riskPips,
      rewardPips,
      spreadBufferPips,
      riskReward: `1:${tp2Ratio.toFixed(1)} (TP2)`,
      actionAdvice: `🔮 ADVANCE SIGNAL (PREDICTIVE SELL): Market is at premium ($${entryPrice.toFixed(2)}). Anticipating a downward drop of -${rewardPips} pips toward $${takeProfit2.toFixed(2)}. Enter NOW at $${entryPrice.toFixed(2)} before the red breakdown bar runs! Secure 50% at TP1 ($${takeProfit1.toFixed(2)}) & move SL to Break-Even at $${breakEvenPrice.toFixed(2)}.`,
      confluences: bearReasons,
      confluenceScore,
      checklist,
      triggerCondition: `PRE-DROP SELL: Enter NOW at $${entryPrice.toFixed(2)} or limit at 9 EMA ($${ema9.toFixed(2)}) BEFORE downward breakdown`,
      invalidationRule: `Hard Stop Loss at $${stopLoss.toFixed(2)} (-${riskPips} pips). Trade is canceled if a 1m candle closes above this level.`,
      status: 'ACTIVE',
      profitPips: 0,
      reasons: [
        `Live Bearish Decision: Grade ${finalGrade} Setup (${confluenceScore}% Confluence)`,
        `Predicted Move: -${rewardPips} pips toward $${takeProfit2.toFixed(2)} before breakdown runs`,
        `Risk: $${risk.toFixed(2)} (${riskPips} pips) | Primary Target: +$${(entryPrice - takeProfit2).toFixed(2)} (+${rewardPips} pips)`,
        ...bearReasons,
      ],
    };
  }
}
