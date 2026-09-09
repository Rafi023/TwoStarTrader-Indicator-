import {
  Candle,
  MarketZone,
  OrderBlock,
  FairValueGap,
  ReversalEvent,
  ScalpingSignal,
} from '../types';

/**
 * Technical Indicator & Smart Money Engine for XAU/USD (Gold) Scalping
 */

// Helper to calculate Average True Range (ATR)
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

// Generate Precision Gold Scalping Signals with Confluence Scoring
export function generateScalpingSignals(
  candles: Candle[],
  zones: MarketZone[],
  orderBlocks: OrderBlock[],
  fvgs: FairValueGap[],
  reversals: ReversalEvent[]
): ScalpingSignal[] {
  if (candles.length < 10) return [];
  const signals: ScalpingSignal[] = [];
  const atrs = calculateATR(candles, 14);

  // Analyze recent 40 candles for high-probability setups
  const startCheck = Math.max(5, candles.length - 45);

  for (let i = startCheck; i < candles.length; i++) {
    const c = candles[i];
    const prevC = candles[i - 1];
    const currentAtr = atrs[i] || 2.0;

    // Confluence factors for BUY
    let buyConfluences: string[] = [];
    let buyScore = 30; // base probability

    // 1. Is price in or tapping a Buy Zone / Demand?
    const activeBuyZone = zones.find(
      z => z.type === 'BUY_ZONE' && c.low <= z.topPrice && c.low >= z.bottomPrice - 1.0
    );
    if (activeBuyZone) {
      buyConfluences.push('In Institutional Demand Zone');
      buyScore += 20;
    }

    // 2. Is price reacting off a Bullish Order Block?
    const activeBullOb = orderBlocks.find(
      ob => ob.type === 'BULLISH_OB' && ob.startIndex < i && c.low <= ob.topPrice + 0.3 && c.low >= ob.bottomPrice - 0.5
    );
    if (activeBullOb) {
      buyConfluences.push(`+OB Mitigation (${activeBullOb.displacementPips} pips displacement)`);
      buyScore += 25;
    }

    // 3. Is price filling an unmitigated Bullish FVG?
    const activeBullFvg = fvgs.find(
      fvg => fvg.type === 'BULLISH_FVG' && fvg.candleIndex < i && c.low <= fvg.topPrice && c.low >= fvg.bottomPrice
    );
    if (activeBullFvg) {
      buyConfluences.push(`Bullish FVG Retest & Imbalance Fill`);
      buyScore += 15;
    }

    // 4. Reversal Event at or near this candle?
    const revBull = reversals.find(r => r.candleIndex === i && r.direction === 'BULLISH');
    if (revBull) {
      buyConfluences.push(revBull.description);
      buyScore += 20;
    }

    // 5. Bullish confirmation candle (green close with strong momentum)
    if (c.close > c.open && (c.close - c.open) > currentAtr * 0.4) {
      buyConfluences.push('Bullish Candle Expansion');
      buyScore += 10;
    }

    // Trigger BUY Signal if confluence is high
    if (buyScore >= 75 && (activeBullOb || activeBuyZone || revBull)) {
      const entryPrice = c.close;
      // Precision Gold Scalp SL: placed below OB bottom or sweep low with 5 pips buffer
      const lowestAnchor = Math.min(
        c.low,
        activeBullOb?.bottomPrice ?? c.low,
        activeBuyZone?.bottomPrice ?? c.low
      );
      const stopLoss = Number((lowestAnchor - 0.60).toFixed(2));
      const risk = entryPrice - stopLoss;

      if (risk > 0.40 && risk < 6.0) {
        const tp1 = Number((entryPrice + risk * 1.5).toFixed(2));
        const tp2 = Number((entryPrice + risk * 3.0).toFixed(2));

        // Evaluate outcome if candle is not the very latest
        let status: ScalpingSignal['status'] = 'ACTIVE';
        let profitPips = 0;

        for (let k = i + 1; k < candles.length; k++) {
          if (candles[k].high >= tp2) {
            status = 'HIT_TP2';
            profitPips = Math.round((tp2 - entryPrice) * 10);
            break;
          } else if (candles[k].high >= tp1 && status === 'ACTIVE') {
            status = 'HIT_TP1';
            profitPips = Math.round((tp1 - entryPrice) * 10);
          } else if (candles[k].low <= stopLoss) {
            status = status === 'HIT_TP1' ? 'HIT_TP1' : 'STOPPED_OUT';
            profitPips = status === 'HIT_TP1' ? profitPips : -Math.round(risk * 10);
            break;
          }
        }

        signals.push({
          id: `sig-buy-${i}-${c.time}`,
          candleIndex: i,
          timestamp: c.time,
          timeStr: c.timeStr,
          type: buyScore >= 85 ? 'STRONG_BUY' : 'BUY',
          entryPrice: Number(entryPrice.toFixed(2)),
          stopLoss,
          takeProfit1: tp1,
          takeProfit2: tp2,
          riskReward: '1:3 (TP2)',
          confluences: buyConfluences,
          confluenceScore: Math.min(99, buyScore),
          status,
          profitPips,
          reasons: [
            `Entry triggered at institutional demand confluence`,
            `Risk: $${risk.toFixed(2)} | Target: +$${(tp2 - entryPrice).toFixed(2)}`,
            ...buyConfluences,
          ],
        });
      }
    }

    // Confluence factors for SELL
    let sellConfluences: string[] = [];
    let sellScore = 30;

    // 1. Is price in or tapping a Sell Zone / Supply?
    const activeSellZone = zones.find(
      z => z.type === 'SELL_ZONE' && c.high >= z.bottomPrice && c.high <= z.topPrice + 1.0
    );
    if (activeSellZone) {
      sellConfluences.push('In Institutional Supply Zone');
      sellScore += 20;
    }

    // 2. Is price reacting off a Bearish Order Block?
    const activeBearOb = orderBlocks.find(
      ob => ob.type === 'BEARISH_OB' && ob.startIndex < i && c.high >= ob.bottomPrice - 0.3 && c.high <= ob.topPrice + 0.5
    );
    if (activeBearOb) {
      sellConfluences.push(`-OB Mitigation (${activeBearOb.displacementPips} pips displacement)`);
      sellScore += 25;
    }

    // 3. Is price filling an unmitigated Bearish FVG?
    const activeBearFvg = fvgs.find(
      fvg => fvg.type === 'BEARISH_FVG' && fvg.candleIndex < i && c.high >= fvg.bottomPrice && c.high <= fvg.topPrice
    );
    if (activeBearFvg) {
      sellConfluences.push(`Bearish FVG Retest & Imbalance Fill`);
      sellScore += 15;
    }

    // 4. Reversal Event at or near this candle?
    const revBear = reversals.find(r => r.candleIndex === i && r.direction === 'BEARISH');
    if (revBear) {
      sellConfluences.push(revBear.description);
      sellScore += 20;
    }

    // 5. Bearish confirmation candle (red close with strong momentum)
    if (c.close < c.open && (c.open - c.close) > currentAtr * 0.4) {
      sellConfluences.push('Bearish Expansion & Pressure');
      sellScore += 10;
    }

    // Trigger SELL Signal
    if (sellScore >= 75 && (activeBearOb || activeSellZone || revBear)) {
      const entryPrice = c.close;
      const highestAnchor = Math.max(
        c.high,
        activeBearOb?.topPrice ?? c.high,
        activeSellZone?.topPrice ?? c.high
      );
      const stopLoss = Number((highestAnchor + 0.60).toFixed(2));
      const risk = stopLoss - entryPrice;

      if (risk > 0.40 && risk < 6.0) {
        const tp1 = Number((entryPrice - risk * 1.5).toFixed(2));
        const tp2 = Number((entryPrice - risk * 3.0).toFixed(2));

        let status: ScalpingSignal['status'] = 'ACTIVE';
        let profitPips = 0;

        for (let k = i + 1; k < candles.length; k++) {
          if (candles[k].low <= tp2) {
            status = 'HIT_TP2';
            profitPips = Math.round((entryPrice - tp2) * 10);
            break;
          } else if (candles[k].low <= tp1 && status === 'ACTIVE') {
            status = 'HIT_TP1';
            profitPips = Math.round((entryPrice - tp1) * 10);
          } else if (candles[k].high >= stopLoss) {
            status = status === 'HIT_TP1' ? 'HIT_TP1' : 'STOPPED_OUT';
            profitPips = status === 'HIT_TP1' ? profitPips : -Math.round(risk * 10);
            break;
          }
        }

        signals.push({
          id: `sig-sell-${i}-${c.time}`,
          candleIndex: i,
          timestamp: c.time,
          timeStr: c.timeStr,
          type: sellScore >= 85 ? 'STRONG_SELL' : 'SELL',
          entryPrice: Number(entryPrice.toFixed(2)),
          stopLoss,
          takeProfit1: tp1,
          takeProfit2: tp2,
          riskReward: '1:3 (TP2)',
          confluences: sellConfluences,
          confluenceScore: Math.min(99, sellScore),
          status,
          profitPips,
          reasons: [
            `Short entry confirmed at supply pool liquidity rejection`,
            `Risk: $${risk.toFixed(2)} | Target: +$${(entryPrice - tp2).toFixed(2)}`,
            ...sellConfluences,
          ],
        });
      }
    }
  }

  // Deduplicate signals that occur on adjacent candles with the same direction
  const filteredSignals: ScalpingSignal[] = [];
  for (let i = 0; i < signals.length; i++) {
    const current = signals[i];
    const prev = filteredSignals[filteredSignals.length - 1];
    if (prev && Math.abs(current.candleIndex - prev.candleIndex) < 4 && current.type.includes('BUY') === prev.type.includes('BUY')) {
      // Keep the one with higher score
      if (current.confluenceScore > prev.confluenceScore) {
        filteredSignals[filteredSignals.length - 1] = current;
      }
    } else {
      filteredSignals.push(current);
    }
  }

  return filteredSignals;
}
