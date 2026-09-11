import React, { useState, useRef, useMemo, useEffect } from 'react';
import {
  Candle,
  MarketZone,
  OrderBlock,
  FairValueGap,
  ReversalEvent,
  ScalpingSignal,
  IndicatorSettings,
  ScalpPosition,
} from '../types';
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Radio,
  BarChart3,
  Layers,
  Activity,
} from 'lucide-react';
import { calculateEMA } from '../utils/indicatorEngine';
import { TradingViewWidget } from './TradingViewWidget';

interface TradingChartProps {
  candles: Candle[];
  zones: MarketZone[];
  orderBlocks: OrderBlock[];
  fvgs: FairValueGap[];
  reversals: ReversalEvent[];
  signals: ScalpingSignal[];
  settings: IndicatorSettings;
  setSettings: React.Dispatch<React.SetStateAction<IndicatorSettings>>;
  onSelectSignal: (signal: ScalpingSignal) => void;
  activeSignal: ScalpingSignal | null;
  activePosition?: ScalpPosition | null;
}

export const TradingChart: React.FC<TradingChartProps> = ({
  candles,
  zones,
  orderBlocks,
  fvgs,
  reversals,
  signals,
  settings,
  setSettings,
  onSelectSignal,
  activeSignal,
  activePosition,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeView, setActiveView] = useState<'indicator' | 'tradingview'>('indicator');
  const [hoveredCandleIndex, setHoveredCandleIndex] = useState<number | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);
  const [visibleCount, setVisibleCount] = useState<number>(45);
  const [chartWidth, setChartWidth] = useState<number>(850);

  // ResizeObserver to track exact container pixel width for responsive SVG rendering
  useEffect(() => {
    if (!containerRef.current) return;
    const updateWidth = () => {
      if (containerRef.current) {
        const width = containerRef.current.clientWidth;
        if (width > 0) setChartWidth(width);
      }
    };
    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Take the slice of candles to render based on zoom level
  const displayedCandles = useMemo(() => {
    return candles.slice(-Math.min(visibleCount, candles.length));
  }, [candles, visibleCount]);

  const startIndex = candles.length - displayedCandles.length;

  // Chart dimensions & layout calculations (MT5 right axis padding = 90px)
  const chartHeight = 520;
  const padding = { top: 32, right: 90, bottom: 32, left: 12 };
  const rightScaleX = Math.max(200, chartWidth - padding.right);
  const usableWidth = Math.max(100, rightScaleX - padding.left);
  const candleWidth = displayedCandles.length > 0 ? usableWidth / displayedCandles.length : 15;

  // Active Trade Setup to project (Indicator Signal has primary priority for indicator analysis)
  const activeTradeSetup = useMemo(() => {
    // 1. Primary Authority: Active Indicator Engine Decision Signal
    if (activeSignal) {
      const isBuy = activeSignal.type.includes('BUY');
      return {
        id: activeSignal.id,
        isBuy,
        direction: isBuy ? ('BUY' as const) : ('SELL' as const),
        entryPrice: activeSignal.entryPrice,
        stopLoss: activeSignal.stopLoss,
        takeProfit1: activeSignal.takeProfit1,
        takeProfit2: activeSignal.takeProfit2,
        takeProfit3: activeSignal.takeProfit3,
        riskPips: activeSignal.riskPips,
        rewardPips: activeSignal.rewardPips,
        lotSize: 0.1,
        tradeStyle: activeSignal.tradeStyle ?? 'SCALPING',
      };
    }
    // 2. Secondary: Active manual user position if opened
    if (activePosition) {
      const isBuy = activePosition.direction === 'BUY';
      const riskPips = activePosition.riskPips || Math.round(Math.abs(activePosition.entryPrice - activePosition.stopLossPrice) * 10);
      const rewardPips = activePosition.rewardPips || Math.round(Math.abs(activePosition.takeProfitPrice - activePosition.entryPrice) * 10);
      const riskAmount = Math.abs(activePosition.entryPrice - activePosition.stopLossPrice);
      return {
        id: activePosition.id,
        isBuy,
        direction: activePosition.direction,
        entryPrice: activePosition.entryPrice,
        stopLoss: activePosition.stopLossPrice,
        takeProfit1: activePosition.takeProfitPrice,
        takeProfit2: isBuy
          ? Number((activePosition.entryPrice + riskAmount * 2.2).toFixed(2))
          : Number((activePosition.entryPrice - riskAmount * 2.2).toFixed(2)),
        takeProfit3: isBuy
          ? Number((activePosition.entryPrice + riskAmount * 3.5).toFixed(2))
          : Number((activePosition.entryPrice - riskAmount * 3.5).toFixed(2)),
        riskPips,
        rewardPips,
        lotSize: activePosition.lotSize,
        tradeStyle: 'SCALPING',
      };
    }
    return null;
  }, [activePosition, activeSignal]);

  // Calculate High/Low range of displayed candles and active trade targets
  const { minPrice, maxPrice, priceRange } = useMemo(() => {
    if (displayedCandles.length === 0) {
      return { minPrice: 4368, maxPrice: 4388, priceRange: 20 };
    }
    let min = Infinity;
    let max = -Infinity;

    displayedCandles.forEach((c) => {
      if (c.low < min) min = c.low;
      if (c.high > max) max = c.high;
    });

    if (activeTradeSetup) {
      min = Math.min(min, activeTradeSetup.stopLoss, activeTradeSetup.takeProfit1, activeTradeSetup.takeProfit2);
      max = Math.max(max, activeTradeSetup.stopLoss, activeTradeSetup.takeProfit1, activeTradeSetup.takeProfit2);
      if (activeTradeSetup.takeProfit3) {
        min = Math.min(min, activeTradeSetup.takeProfit3);
        max = Math.max(max, activeTradeSetup.takeProfit3);
      }
    }

    // Include buffer for MT5 breathing room
    const buffer = Math.max((max - min) * 0.12, 1.8);
    return {
      minPrice: Number((min - buffer).toFixed(2)),
      maxPrice: Number((max + buffer).toFixed(2)),
      priceRange: Number(((max + buffer) - (min - buffer)).toFixed(2)),
    };
  }, [displayedCandles, activeTradeSetup]);

  // Coordinate conversion functions
  const getY = (price: number) => {
    const usableHeight = chartHeight - padding.top - padding.bottom;
    const fraction = (maxPrice - price) / (priceRange || 1);
    return padding.top + fraction * usableHeight;
  };

  const getPriceAtY = (y: number) => {
    const usableHeight = chartHeight - padding.top - padding.bottom;
    const fraction = (y - padding.top) / usableHeight;
    return maxPrice - fraction * (priceRange || 1);
  };

  // Generate MT5 clean round grid price levels (e.g. 0.50, 1.00, 2.00, 5.00 intervals)
  const priceGridLevels = useMemo(() => {
    if (priceRange <= 0) return [];
    const roughStep = priceRange / 8;
    let step = 1.0;
    if (roughStep <= 0.35) step = 0.25;
    else if (roughStep <= 0.7) step = 0.50;
    else if (roughStep <= 1.6) step = 1.00;
    else if (roughStep <= 3.5) step = 2.00;
    else if (roughStep <= 7.0) step = 5.00;
    else step = 10.00;

    const first = Math.ceil(minPrice / step) * step;
    const levels: number[] = [];
    for (let p = first; p <= maxPrice; p += step) {
      levels.push(Number(p.toFixed(2)));
    }
    return levels;
  }, [minPrice, maxPrice, priceRange]);

  const eqPrice = (maxPrice + minPrice) / 2;

  // Calculate EMA 9 (Fast momentum) & EMA 21 (Dynamic trendline)
  const fullEma9 = useMemo(() => calculateEMA(candles, 9), [candles]);
  const fullEma21 = useMemo(() => calculateEMA(candles, 21), [candles]);
  const showEMAs = settings.showEMAs ?? true;

  const ema9Points = useMemo(() => {
    if (!showEMAs || displayedCandles.length < 2) return '';
    return displayedCandles
      .map((_, idx) => {
        const origIdx = startIndex + idx;
        const val = fullEma9[origIdx];
        if (val === undefined) return '';
        const x = padding.left + idx * candleWidth + candleWidth / 2;
        const y = getY(val);
        return `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .filter(Boolean)
      .join(' ');
  }, [showEMAs, displayedCandles, startIndex, fullEma9, candleWidth, padding.left, maxPrice, priceRange]);

  const ema21Points = useMemo(() => {
    if (!showEMAs || displayedCandles.length < 2) return '';
    return displayedCandles
      .map((_, idx) => {
        const origIdx = startIndex + idx;
        const val = fullEma21[origIdx];
        if (val === undefined) return '';
        const x = padding.left + idx * candleWidth + candleWidth / 2;
        const y = getY(val);
        return `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .filter(Boolean)
      .join(' ');
  }, [showEMAs, displayedCandles, startIndex, fullEma21, candleWidth, padding.left, maxPrice, priceRange]);

  // Mouse move handler for crosshair & tooltip
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setMousePos({ x, y });

    // Find closest candle by x coordinate
    const relativeX = x - padding.left;
    if (relativeX >= 0 && relativeX <= usableWidth) {
      const idx = Math.floor(relativeX / candleWidth);
      if (idx >= 0 && idx < displayedCandles.length) {
        setHoveredCandleIndex(startIndex + idx);
      }
    } else {
      setHoveredCandleIndex(null);
    }
  };

  const handleMouseLeave = () => {
    setMousePos(null);
    setHoveredCandleIndex(null);
  };

  const hoveredCandle = hoveredCandleIndex !== null ? candles[hoveredCandleIndex] : null;

  // Current Bid and Ask prices (Standard MT5 spread is ~0.20 / 20 pts on gold)
  const currentCandle = displayedCandles[displayedCandles.length - 1];
  const bidPrice = currentCandle ? currentCandle.close : 4378.00;
  const askPrice = Number((bidPrice + 0.20).toFixed(2));
  const isBullishTick = currentCandle ? currentCandle.close >= currentCandle.open : true;
  const liveColor = isBullishTick ? '#10b981' : '#f43f5e';

  return (
    <div id="chart-section" className="w-full bg-white rounded-xl border border-sky-100 shadow-sm overflow-hidden flex flex-col">
      {/* View Mode Switcher: SMC AI Strategy vs TradingView Real-Time */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2 bg-sky-50/50 border-b border-sky-100">
        <div className="flex items-center gap-1.5 p-1 bg-white rounded-xl border border-sky-200 shadow-xs">
          <button
            id="tab-smc-indicator"
            onClick={() => setActiveView('indicator')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeView === 'indicator'
                ? 'bg-sky-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-sky-700 hover:bg-sky-50'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>SMC AI Strategy Engine (Order Blocks & Zones)</span>
          </button>

          <button
            id="tab-tradingview-live"
            onClick={() => setActiveView('tradingview')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeView === 'tradingview'
                ? 'bg-sky-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-sky-700 hover:bg-sky-50'
            }`}
          >
            <Radio className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
            <span>TradingView Real-Time Feed</span>
          </button>
        </div>

        <div className="hidden sm:flex items-center gap-3 text-xs font-mono text-slate-500">
          <span>Asset: <strong className="text-slate-800">XAU/USD Gold Spot</strong></span>
          <span>•</span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-emerald-700 font-bold">MT5 Price Scale Active</span>
          </span>
        </div>
      </div>

      {activeView === 'tradingview' ? (
        <div className="p-2 bg-white">
          <TradingViewWidget timeframe={settings.timeframe} symbol="OANDA:XAUUSD" />
        </div>
      ) : (
        <>
          {/* Clean Candlestick Metrics Bar & Day/Scalp Trading Controls */}
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2 bg-slate-50 border-b border-slate-200 text-xs">
            {/* Candle OHLC display */}
            <div className="flex items-center gap-3 font-mono text-xs">
              {displayedCandles.length > 0 && (
                (() => {
                  const last = displayedCandles[displayedCandles.length - 1];
                  const isUp = last.close >= last.open;
                  return (
                    <div className="flex items-center gap-2.5 text-[11px]">
                      <span className="font-bold text-slate-500">O: <strong className="text-slate-800">${last.open.toFixed(2)}</strong></span>
                      <span className="font-bold text-slate-500">H: <strong className="text-emerald-700">${last.high.toFixed(2)}</strong></span>
                      <span className="font-bold text-slate-500">L: <strong className="text-rose-700">${last.low.toFixed(2)}</strong></span>
                      <span className="font-bold text-slate-500">C: <strong className={isUp ? 'text-emerald-600 font-black' : 'text-rose-600 font-black'}>${last.close.toFixed(2)}</strong></span>
                    </div>
                  );
                })()
              )}
            </div>

            {/* Trading Mode Filter & EMA Toggle */}
            <div className="flex items-center gap-2">
              {/* Trade Mode Selector */}
              <div className="flex items-center bg-white rounded-lg border border-sky-200 p-0.5 shadow-xs text-[11px] font-semibold">
                <button
                  type="button"
                  onClick={() => setSettings((s) => ({ ...s, tradeMode: 'ALL' }))}
                  className={`px-2 py-1 rounded transition-all cursor-pointer ${
                    (settings.tradeMode ?? 'ALL') === 'ALL'
                      ? 'bg-sky-600 text-white font-bold'
                      : 'text-slate-600 hover:text-sky-700 hover:bg-sky-50'
                  }`}
                  title="Show all trading signals"
                >
                  All Signals
                </button>
                <button
                  type="button"
                  onClick={() => setSettings((s) => ({ ...s, tradeMode: 'SCALPING' }))}
                  className={`px-2 py-1 rounded transition-all flex items-center gap-1 cursor-pointer ${
                    settings.tradeMode === 'SCALPING'
                      ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                      : 'text-slate-600 hover:text-amber-600 hover:bg-amber-50'
                  }`}
                  title="Scalping Mode (1m - 5m fast entries, 15-35 pips)"
                >
                  <span>⚡ Scalp (M1/M5)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSettings((s) => ({ ...s, tradeMode: 'DAY_TRADING' }))}
                  className={`px-2 py-1 rounded transition-all flex items-center gap-1 cursor-pointer ${
                    settings.tradeMode === 'DAY_TRADING'
                      ? 'bg-indigo-600 text-white font-bold shadow-xs'
                      : 'text-slate-600 hover:text-indigo-600 hover:bg-indigo-50'
                  }`}
                  title="Day Trading Mode (5m - 15m structural trend trades, 40-100 pips)"
                >
                  <span>📈 Day Trade (M5/M15)</span>
                </button>
              </div>

              {/* Indicator Decision Mode (Auto vs Force Direction) */}
              <div className="flex items-center bg-white rounded-lg border border-slate-200 p-0.5 shadow-xs text-[11px] font-semibold">
                <button
                  type="button"
                  onClick={() => setSettings((s) => ({ ...s, signalBias: 'AUTO' }))}
                  className={`px-2 py-1 rounded transition-all cursor-pointer ${
                    (settings.signalBias ?? 'AUTO') === 'AUTO'
                      ? 'bg-slate-900 text-white font-bold shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                  title="Indicator automatically calculates Buy vs Sell based on multi-indicator confluence"
                >
                  ⚡ Auto Decision
                </button>
                <button
                  type="button"
                  onClick={() => setSettings((s) => ({ ...s, signalBias: 'BUY' }))}
                  className={`px-2 py-1 rounded transition-all cursor-pointer ${
                    settings.signalBias === 'BUY'
                      ? 'bg-emerald-600 text-white font-black shadow-xs'
                      : 'text-slate-600 hover:text-emerald-700 hover:bg-emerald-50'
                  }`}
                  title="Calculate precision BUY entry, SL, and TPs on current live market"
                >
                  ▲ Scan BUY
                </button>
                <button
                  type="button"
                  onClick={() => setSettings((s) => ({ ...s, signalBias: 'SELL' }))}
                  className={`px-2 py-1 rounded transition-all cursor-pointer ${
                    settings.signalBias === 'SELL'
                      ? 'bg-rose-600 text-white font-black shadow-xs'
                      : 'text-slate-600 hover:text-rose-700 hover:bg-rose-50'
                  }`}
                  title="Calculate precision SELL entry, SL, and TPs on current live market"
                >
                  ▼ Scan SELL
                </button>
              </div>

              {/* Pro Trader Clean Mode (Only Signals, TPs & MT5 Prices) Toggle */}
              <button
                type="button"
                onClick={() => {
                  const isClean = !settings.showOrderBlocks && !settings.showFVG && !settings.showBuySellZones && !settings.showReversals;
                  if (isClean) {
                    setSettings((s) => ({
                      ...s,
                      showOrderBlocks: true,
                      showFVG: true,
                      showBuySellZones: true,
                      showReversals: true,
                    }));
                  } else {
                    setSettings((s) => ({
                      ...s,
                      showOrderBlocks: false,
                      showFVG: false,
                      showBuySellZones: false,
                      showReversals: false,
                      showSignals: true,
                    }));
                  }
                }}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-semibold transition-all cursor-pointer ${
                  (!settings.showOrderBlocks && !settings.showFVG && !settings.showBuySellZones && !settings.showReversals)
                    ? 'bg-emerald-600 text-white font-black shadow-xs border-emerald-700'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
                title="Toggle Pro Clean View (Exact Signals & TPs only) vs SMC Analysis Layers"
              >
                <span>{(!settings.showOrderBlocks && !settings.showFVG && !settings.showBuySellZones && !settings.showReversals) ? '🛡️ Pro Clean View' : '🔧 SMC Analysis'}</span>
              </button>

              {/* EMA 9 / 21 Overlay Toggle */}
              <button
                type="button"
                onClick={() => setSettings((s) => ({ ...s, showEMAs: !showEMAs }))}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-semibold transition-all cursor-pointer ${
                  showEMAs
                    ? 'bg-sky-50 text-sky-800 border-sky-300 font-bold'
                    : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                }`}
                title="Toggle EMA 9 (Fast Scalp) and EMA 21 (Dynamic Trendline)"
              >
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
                  <span className="w-2 h-2 rounded-full bg-indigo-500 inline-block" />
                </div>
                <span>EMA 9/21</span>
              </button>
            </div>

            {/* Zoom & View Reset */}
            <div className="flex items-center gap-1">
              <button
                id="btn-zoom-in"
                onClick={() => setVisibleCount((c) => Math.max(25, c - 10))}
                className="p-1.5 rounded-lg bg-white border border-sky-200 text-slate-600 hover:text-sky-700 hover:bg-sky-50 transition-colors shadow-xs cursor-pointer"
                title="Zoom In"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <button
                id="btn-zoom-out"
                onClick={() => setVisibleCount((c) => Math.min(80, c + 10))}
                className="p-1.5 rounded-lg bg-white border border-sky-200 text-slate-600 hover:text-sky-700 hover:bg-sky-50 transition-colors shadow-xs cursor-pointer"
                title="Zoom Out"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <button
                id="btn-reset-zoom"
                onClick={() => setVisibleCount(45)}
                className="p-1.5 rounded-lg bg-white border border-sky-200 text-slate-600 hover:text-sky-700 hover:bg-sky-50 transition-colors shadow-xs cursor-pointer"
                title="Reset View"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* ========================================================== */}
          {/* PRO TRADER LIVE INDICATOR DECISION HUD BAR                  */}
          {/* ========================================================== */}
          {activeSignal && (
            <div
              id="indicator-decision-hud"
              className={`px-4 py-2 border-b flex flex-wrap items-center justify-between gap-3 text-xs transition-colors ${
                activeSignal.type.includes('BUY')
                  ? 'bg-emerald-50/95 border-emerald-200 text-emerald-950'
                  : 'bg-rose-50/95 border-rose-200 text-rose-950'
              }`}
            >
              <div className="flex items-center gap-3">
                {/* Decision Badge */}
                <div
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-full font-black text-xs uppercase tracking-wide text-white shadow-xs ${
                    activeSignal.type.includes('BUY')
                      ? 'bg-emerald-600 animate-pulse'
                      : 'bg-rose-600 animate-pulse'
                  }`}
                >
                  <span>{activeSignal.type.includes('BUY') ? '▲ INDICATOR: ENTER BUY NOW' : '▼ INDICATOR: ENTER SELL NOW'}</span>
                </div>

                <div className="flex items-center gap-2 text-[12px] font-mono">
                  <span>Entry: <strong className="font-black">${activeSignal.entryPrice.toFixed(2)}</strong></span>
                  <span className="text-slate-400">|</span>
                  <span className="text-rose-700 font-bold">
                    🛑 SL: ${activeSignal.stopLoss.toFixed(2)} (-{activeSignal.riskPips}p)
                  </span>
                  <span className="text-slate-400">|</span>
                  <span className="text-emerald-700 font-bold">
                    🎯 TP1: ${activeSignal.takeProfit1.toFixed(2)} (+{Math.round(Math.abs(activeSignal.takeProfit1 - activeSignal.entryPrice) * 10)}p)
                  </span>
                  <span className="text-slate-400">|</span>
                  <span className="text-emerald-700 font-black">
                    🎯 TP2: ${activeSignal.takeProfit2.toFixed(2)} (+{activeSignal.rewardPips}p)
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3 text-[11px]">
                <div className="flex items-center gap-1.5 bg-white/90 px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs">
                  <span className="font-bold text-slate-500">Confluence:</span>
                  <strong
                    className={`font-black ${
                      activeSignal.type.includes('BUY') ? 'text-emerald-700' : 'text-rose-700'
                    }`}
                  >
                    {activeSignal.confluenceScore}% ({activeSignal.tradeStyle === 'DAY_TRADE' ? 'Day Trade' : 'Scalp'})
                  </strong>
                </div>

                <div className="hidden lg:block text-slate-700 font-semibold text-[11px] truncate max-w-sm" title={activeSignal.confluences.join(' • ')}>
                  ⚡ {activeSignal.confluences[0] || 'High Probability Structure Alignment'}
                </div>
              </div>
            </div>
          )}

          {/* Chart Canvas Area with MT5-Style Right Price Scale */}
          <div
            ref={containerRef}
            id="trading-chart-canvas"
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            className="relative w-full h-[520px] bg-white cursor-crosshair select-none overflow-hidden"
          >
            {/* Subtle Technical Grid Background */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                backgroundImage:
                  'linear-gradient(rgba(14, 165, 233, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(14, 165, 233, 0.05) 1px, transparent 1px)',
                backgroundSize: '40px 40px',
              }}
            />

            <svg className="w-full h-full relative z-10" style={{ overflow: 'visible' }}>
              {/* ========================================================== */}
              {/* 1. CHART GRID HORIZONTAL LINES (Stop at rightScaleX)       */}
              {/* ========================================================== */}
              {priceGridLevels.map((p, idx) => {
                const y = getY(p);
                return (
                  <line
                    key={`chart-grid-${idx}`}
                    x1={padding.left}
                    y1={y}
                    x2={rightScaleX}
                    y2={y}
                    stroke="#e2e8f0"
                    strokeWidth="1"
                    strokeDasharray="3 3"
                  />
                );
              })}

              {/* 50% Equilibrium Line (Fair Value Balance) */}
              {settings.showEquilibrium && (
                <g>
                  <line
                    x1={padding.left}
                    y1={getY(eqPrice)}
                    x2={rightScaleX}
                    y2={getY(eqPrice)}
                    stroke="#0284c7"
                    strokeWidth="1.2"
                    strokeDasharray="4 4"
                    strokeOpacity="0.7"
                  />
                  <text
                    x={padding.left + 8}
                    y={getY(eqPrice) - 4}
                    fill="#0284c7"
                    fontSize="9.5"
                    fontFamily="JetBrains Mono, monospace"
                    fontWeight="bold"
                  >
                    50% EQUILIBRIUM (DISCOUNT / PREMIUM PIVOT)
                  </text>
                </g>
              )}

              {/* 1. BUY & SELL ZONES (SUPPLY & DEMAND) OVERLAYS */}
              {settings.showBuySellZones &&
                zones.map((zone) => {
                  const yTop = getY(zone.topPrice);
                  const yBot = getY(zone.bottomPrice);
                  const height = Math.max(4, yBot - yTop);
                  const isSell = zone.type === 'SELL_ZONE';

                  return (
                    <g key={zone.id}>
                      <rect
                        x={padding.left}
                        y={yTop}
                        width={usableWidth}
                        height={height}
                        fill={isSell ? '#f43f5e' : '#10b981'}
                        fillOpacity={0.08}
                        stroke={isSell ? '#f43f5e' : '#10b981'}
                        strokeOpacity={0.5}
                        strokeWidth="1.2"
                        strokeDasharray={zone.mitigated ? '4 4' : 'none'}
                        rx="4"
                      />
                      <text
                        x={padding.left + 12}
                        y={yTop + 14}
                        fill={isSell ? '#e11d48' : '#059669'}
                        fontSize="10"
                        fontFamily="Plus Jakarta Sans, sans-serif"
                        fontWeight="800"
                        letterSpacing="0.05em"
                      >
                        {isSell ? 'INSTITUTIONAL SELL ZONE (SUPPLY)' : 'INSTITUTIONAL BUY ZONE (DEMAND)'}
                      </text>
                      <text
                        x={padding.left + 12}
                        y={yTop + 28}
                        fill={isSell ? '#be123c' : '#047857'}
                        fontSize="10"
                        fontFamily="JetBrains Mono, monospace"
                        fontWeight="600"
                      >
                        ${zone.bottomPrice.toFixed(2)} - ${zone.topPrice.toFixed(2)}
                        {zone.touchCount > 0 ? ` (${zone.touchCount}x Tested)` : ' (Fresh Untapped)'}
                      </text>
                    </g>
                  );
                })}

              {/* 2. ORDER BLOCKS (+OB / -OB) */}
              {settings.showOrderBlocks &&
                orderBlocks.map((ob) => {
                  const yTop = getY(ob.topPrice);
                  const yBot = getY(ob.bottomPrice);
                  const yMid = getY(ob.medianPrice);
                  const height = Math.max(3, yBot - yTop);
                  const isBull = ob.type === 'BULLISH_OB';

                  return (
                    <g key={ob.id}>
                      <rect
                        x={padding.left + 20}
                        y={yTop}
                        width={Math.max(20, usableWidth - 20)}
                        height={height}
                        fill={isBull ? '#f0fdf4' : '#fef2f2'}
                        fillOpacity={0.6}
                        stroke={isBull ? '#10b981' : '#f43f5e'}
                        strokeWidth="1.2"
                        strokeDasharray="4 4"
                        rx="4"
                      />
                      {/* 50% Median Mitigation Level */}
                      <line
                        x1={padding.left + 20}
                        y1={yMid}
                        x2={rightScaleX}
                        y2={yMid}
                        stroke="#0284c7"
                        strokeWidth="1"
                        strokeDasharray="2 2"
                        strokeOpacity="0.8"
                      />
                      <text
                        x={padding.left + 26}
                        y={yTop + 12}
                        fill={isBull ? '#047857' : '#be123c'}
                        fontSize="9.5"
                        fontFamily="Plus Jakarta Sans, sans-serif"
                        fontWeight="700"
                        letterSpacing="0.03em"
                      >
                        {ob.mitigated ? 'MITIGATED ORDER BLOCK' : isBull ? '+OB (BULLISH ORDER BLOCK)' : '-OB (BEARISH ORDER BLOCK)'}
                        <tspan fill="#64748b" fontFamily="JetBrains Mono, monospace" dx="6">
                          50%: ${ob.medianPrice.toFixed(2)}
                        </tspan>
                      </text>
                    </g>
                  );
                })}

              {/* 3. FAIR VALUE GAPS (FVG / IMBALANCES) */}
              {settings.showFVG &&
                fvgs.map((fvg) => {
                  const yTop = getY(fvg.topPrice);
                  const yBot = getY(fvg.bottomPrice);
                  const height = Math.max(3, yBot - yTop);

                  return (
                    <g key={fvg.id}>
                      <rect
                        x={padding.left + 40}
                        y={yTop}
                        width={Math.max(20, usableWidth - 40)}
                        height={height}
                        fill="#38bdf8"
                        fillOpacity={0.16}
                        stroke="#0284c7"
                        strokeOpacity={0.5}
                        strokeWidth="1"
                        rx="4"
                      />
                      <text
                        x={padding.left + 48}
                        y={yTop + 11}
                        fill="#0284c7"
                        fontSize="9"
                        fontFamily="Plus Jakarta Sans, sans-serif"
                        fontWeight="800"
                        letterSpacing="0.08em"
                      >
                        FVG IMBALANCE: ${fvg.bottomPrice.toFixed(2)} - ${fvg.topPrice.toFixed(2)}
                      </text>
                    </g>
                  );
                })}

              {/* ========================================================== */}
              {/* 3.5. EMA 9 (Fast Momentum) & EMA 21 (Dynamic Trendline)    */}
              {/* ========================================================== */}
              {showEMAs && (
                <g id="ema-trend-lines">
                  {ema21Points && (
                    <path
                      d={ema21Points}
                      fill="none"
                      stroke="#6366f1"
                      strokeWidth="2"
                      strokeOpacity="0.9"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  )}
                  {ema9Points && (
                    <path
                      d={ema9Points}
                      fill="none"
                      stroke="#f59e0b"
                      strokeWidth="2.2"
                      strokeOpacity="0.95"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  )}
                </g>
              )}

              {/* ========================================================== */}
              {/* 4. CANDLESTICKS RENDERING                                  */}
              {/* ========================================================== */}
              {displayedCandles.map((candle, idx) => {
                const actualIndex = startIndex + idx;
                const xCenter = padding.left + idx * candleWidth + candleWidth / 2;
                const bodyWidth = Math.max(3, candleWidth * 0.72);

                const isGreen = candle.close >= candle.open;
                const yOpen = getY(candle.open);
                const yClose = getY(candle.close);
                const yHigh = getY(candle.high);
                const yLow = getY(candle.low);

                const bodyTop = Math.min(yOpen, yClose);
                const bodyHeight = Math.max(1.5, Math.abs(yOpen - yClose));
                const color = isGreen ? '#10b981' : '#f43f5e';
                const isHovered = hoveredCandleIndex === actualIndex;

                return (
                  <g key={`candle-${candle.time}-${idx}`}>
                    {/* Wick */}
                    <line
                      x1={xCenter}
                      y1={yHigh}
                      x2={xCenter}
                      y2={yLow}
                      stroke={color}
                      strokeWidth={isHovered ? '2' : '1.3'}
                    />
                    {/* Body */}
                    <rect
                      x={xCenter - bodyWidth / 2}
                      y={bodyTop}
                      width={bodyWidth}
                      height={bodyHeight}
                      fill={isGreen ? '#10b981' : '#f43f5e'}
                      stroke={isGreen ? '#059669' : '#e11d48'}
                      strokeWidth="0.8"
                      rx="1"
                      className="transition-all"
                      style={{
                        filter: isHovered ? 'brightness(1.15)' : 'none',
                      }}
                    />

                    {/* Time label on bottom axis every 6 candles */}
                    {idx % 6 === 0 && (
                      <text
                        x={xCenter}
                        y={chartHeight - 12}
                        fill="#64748b"
                        fontSize="9.5"
                        textAnchor="middle"
                        fontFamily="JetBrains Mono, monospace"
                      >
                        {candle.timeStr}
                      </text>
                    )}
                  </g>
                );
              })}

              {/* EMA Live Value Legend on Top-Left */}
              {showEMAs && (
                <g id="ema-canvas-legend" transform="translate(18, 14)">
                  <rect
                    x="0"
                    y="0"
                    width="176"
                    height="20"
                    rx="5"
                    fill="#ffffff"
                    fillOpacity="0.9"
                    stroke="#cbd5e1"
                    strokeWidth="0.8"
                  />
                  <circle cx="10" cy="10" r="3.5" fill="#f59e0b" />
                  <text
                    x="18"
                    y="13.5"
                    fill="#b45309"
                    fontSize="9.5"
                    fontWeight="bold"
                    fontFamily="JetBrains Mono, monospace"
                  >
                    EMA 9: ${(fullEma9[fullEma9.length - 1] || 0).toFixed(2)}
                  </text>
                  <circle cx="98" cy="10" r="3.5" fill="#6366f1" />
                  <text
                    x="106"
                    y="13.5"
                    fill="#4338ca"
                    fontSize="9.5"
                    fontWeight="bold"
                    fontFamily="JetBrains Mono, monospace"
                  >
                    EMA 21: ${(fullEma21[fullEma21.length - 1] || 0).toFixed(2)}
                  </text>
                </g>
              )}

              {/* 5. REVERSALS & SWEEPS */}
              {settings.showReversals &&
                reversals.map((rev) => {
                  const candlePos = rev.candleIndex - startIndex;
                  if (candlePos < 0 || candlePos >= displayedCandles.length) return null;

                  const xCenter = padding.left + candlePos * candleWidth + candleWidth / 2;
                  const candle = displayedCandles[candlePos];
                  if (!candle) return null;

                  const isBull = rev.direction === 'BULLISH';
                  const y = isBull ? getY(candle.low) + 20 : getY(candle.high) - 18;

                  return (
                    <g key={rev.id} className="cursor-pointer">
                      <rect
                        x={xCenter - 42}
                        y={y - 9}
                        width="84"
                        height="18"
                        rx="9"
                        fill={isBull ? '#ecfdf5' : '#fff1f2'}
                        stroke={isBull ? '#10b981' : '#f43f5e'}
                        strokeWidth="1.2"
                      />
                      <text
                        x={xCenter}
                        y={y + 3.5}
                        fill={isBull ? '#065f46' : '#9f1239'}
                        fontSize="8.5"
                        fontFamily="JetBrains Mono, monospace"
                        fontWeight="bold"
                        textAnchor="middle"
                      >
                        {rev.type === 'LIQUIDITY_SWEEP_HIGH'
                          ? '⚡ SWEEP HIGH'
                          : rev.type === 'LIQUIDITY_SWEEP_LOW'
                          ? '⚡ SWEEP LOW'
                          : rev.type === 'CHoCH_BULL'
                          ? 'CHoCH ↗'
                          : rev.type === 'CHoCH_BEAR'
                          ? 'CHoCH ↘'
                          : 'PIN REJECT'}
                      </text>
                    </g>
                  );
                })}

              {/* 6. DAY TRADING & SCALPING SIGNAL MARKERS */}
              {settings.showSignals &&
                signals.map((sig) => {
                  const candlePos = sig.candleIndex - startIndex;
                  if (candlePos < 0 || candlePos >= displayedCandles.length) return null;

                  const xCenter = padding.left + candlePos * candleWidth + candleWidth / 2;
                  const candle = displayedCandles[candlePos];
                  if (!candle) return null;

                  const isBuy = sig.type.includes('BUY');
                  const isDayTrade = sig.tradeStyle === 'DAY_TRADE';
                  const yPos = isBuy ? getY(candle.low) + 40 : getY(candle.high) - 38;
                  const isSelected = activeSignal?.id === sig.id;

                  const isAdvance = sig.isPredictiveAdvance;
                  const advanceIcon = isAdvance ? '🔮 ' : '';
                  const gradePrefix = sig.signalGrade ? `★${sig.signalGrade} ` : '';
                  const stylePrefix = isDayTrade ? 'DAY' : 'SCALP';
                  const labelText = `${advanceIcon}${gradePrefix}${stylePrefix} ${isBuy ? 'BUY' : 'SELL'} $${sig.entryPrice.toFixed(1)}`;
                  const pillWidth = isAdvance ? 152 : 136;

                  return (
                    <g
                      key={sig.id}
                      onClick={() => onSelectSignal(sig)}
                      className="cursor-pointer group"
                    >
                      {/* Directional Indicator Pointer Arrow */}
                      <polygon
                        points={
                          isBuy
                            ? `${xCenter},${yPos - 14} ${xCenter - 7},${yPos - 2} ${xCenter + 7},${yPos - 2}`
                            : `${xCenter},${yPos + 14} ${xCenter - 7},${yPos + 2} ${xCenter + 7},${yPos + 2}`
                        }
                        fill={isBuy ? '#10b981' : '#f43f5e'}
                      />
                      {/* Badge Background */}
                      <rect
                        x={xCenter - pillWidth / 2}
                        y={isBuy ? yPos : yPos - 22}
                        width={pillWidth}
                        height="22"
                        rx="11"
                        fill={isBuy ? '#059669' : '#e11d48'}
                        stroke={isAdvance ? '#c084fc' : sig.signalGrade === 'A+' ? '#fbbf24' : isSelected ? '#0f172a' : '#ffffff'}
                        strokeWidth={isAdvance ? '2.2' : sig.signalGrade === 'A+' ? '2.5' : isSelected ? '2' : '1'}
                        className="transition-transform group-hover:scale-105"
                      />
                      {/* Signal Label with Style and Price */}
                      <text
                        x={xCenter}
                        y={isBuy ? yPos + 14.5 : yPos - 7.5}
                        fill="#ffffff"
                        fontSize="9"
                        fontFamily="JetBrains Mono, monospace"
                        fontWeight="900"
                        letterSpacing="0.04em"
                        textAnchor="middle"
                      >
                        {labelText}
                      </text>

                      {/* Small Status Pill if outcome reached */}
                      {sig.status !== 'ACTIVE' && sig.status !== 'PENDING' && (
                        <g>
                          <rect
                            x={xCenter - 28}
                            y={isBuy ? yPos + 24 : yPos - 38}
                            width="56"
                            height="14"
                            rx="7"
                            fill={sig.status.includes('TP') ? '#ecfdf5' : '#fff1f2'}
                            stroke={sig.status.includes('TP') ? '#10b981' : '#f43f5e'}
                            strokeWidth="0.8"
                          />
                          <text
                            x={xCenter}
                            y={isBuy ? yPos + 34 : yPos - 28}
                            fill={sig.status.includes('TP') ? '#047857' : '#be123c'}
                            fontSize="8"
                            fontFamily="JetBrains Mono, monospace"
                            fontWeight="bold"
                            textAnchor="middle"
                          >
                            {sig.profitPips !== undefined
                              ? `${sig.profitPips >= 0 ? `+${sig.profitPips}` : sig.profitPips}p`
                              : sig.status}
                          </text>
                        </g>
                      )}
                    </g>
                  );
                })}

              {/* ========================================================== */}
              {/* 7. PRO TRADER ACTIVE TRADE PROJECTION (ENTRY, TP & SL)     */}
              {/* ========================================================== */}
              {activeTradeSetup && (() => {
                const isBuy = activeTradeSetup.isBuy;
                const yEntry = getY(activeTradeSetup.entryPrice);
                const ySL = getY(activeTradeSetup.stopLoss);
                const yTP1 = getY(activeTradeSetup.takeProfit1);
                const yTP2 = getY(activeTradeSetup.takeProfit2);
                const yTP3 = activeTradeSetup.takeProfit3 ? getY(activeTradeSetup.takeProfit3) : null;

                const greenTop = isBuy ? yTP2 : yEntry;
                const greenHeight = Math.max(4, Math.abs(yTP2 - yEntry));

                const redTop = isBuy ? yEntry : ySL;
                const redHeight = Math.max(4, Math.abs(ySL - yEntry));

                const tp1Pips = Math.round(Math.abs(activeTradeSetup.takeProfit1 - activeTradeSetup.entryPrice) * 10);
                const tp2Pips = Math.round(Math.abs(activeTradeSetup.takeProfit2 - activeTradeSetup.entryPrice) * 10);
                const tp3Pips = activeTradeSetup.takeProfit3 ? Math.round(Math.abs(activeTradeSetup.takeProfit3 - activeTradeSetup.entryPrice) * 10) : 0;
                const slPips = Math.round(Math.abs(activeTradeSetup.entryPrice - activeTradeSetup.stopLoss) * 10);

                const boxLeft = padding.left + usableWidth * 0.40;
                const boxWidth = usableWidth * 0.60;

                return (
                  <g id="pro-trader-trade-projections">
                    {/* Shaded Profit Target Area */}
                    <rect
                      x={boxLeft}
                      y={greenTop}
                      width={boxWidth}
                      height={greenHeight}
                      fill="#10b981"
                      fillOpacity="0.14"
                      stroke="#059669"
                      strokeWidth="1.2"
                      strokeDasharray="4 2"
                      rx="3"
                    />

                    {/* Shaded Stop Loss Risk Area */}
                    <rect
                      x={boxLeft}
                      y={redTop}
                      width={boxWidth}
                      height={redHeight}
                      fill="#f43f5e"
                      fillOpacity="0.14"
                      stroke="#dc2626"
                      strokeWidth="1.2"
                      strokeDasharray="4 2"
                      rx="3"
                    />

                    {/* TAKE PROFIT 2 (MAIN TARGET) LINE & PILL */}
                    <line
                      x1={padding.left}
                      y1={yTP2}
                      x2={rightScaleX}
                      y2={yTP2}
                      stroke="#059669"
                      strokeWidth="2.2"
                      strokeDasharray="6 3"
                    />
                    <rect
                      x={padding.left + 12}
                      y={yTP2 - 11}
                      width="170"
                      height="21"
                      rx="10.5"
                      fill="#059669"
                      filter="drop-shadow(0 1px 2px rgba(0,0,0,0.15))"
                    />
                    <text
                      x={padding.left + 22}
                      y={yTP2 + 3.5}
                      fill="#ffffff"
                      fontSize="10"
                      fontFamily="JetBrains Mono, monospace"
                      fontWeight="900"
                      letterSpacing="0.03em"
                    >
                      🎯 TP 2: ${activeTradeSetup.takeProfit2.toFixed(2)} (+{tp2Pips}p)
                    </text>

                    {/* TAKE PROFIT 1 (FIRST TARGET) LINE & PILL */}
                    <line
                      x1={padding.left}
                      y1={yTP1}
                      x2={rightScaleX}
                      y2={yTP1}
                      stroke="#16a34a"
                      strokeWidth="1.8"
                      strokeDasharray="4 3"
                    />
                    <rect
                      x={padding.left + 12}
                      y={yTP1 - 10}
                      width="160"
                      height="20"
                      rx="10"
                      fill="#16a34a"
                      filter="drop-shadow(0 1px 2px rgba(0,0,0,0.15))"
                    />
                    <text
                      x={padding.left + 22}
                      y={yTP1 + 3.5}
                      fill="#ffffff"
                      fontSize="9.5"
                      fontFamily="JetBrains Mono, monospace"
                      fontWeight="900"
                      letterSpacing="0.03em"
                    >
                      🎯 TP 1: ${activeTradeSetup.takeProfit1.toFixed(2)} (+{tp1Pips}p)
                    </text>

                    {/* TAKE PROFIT 3 (RUNNER TARGET IF PRESENT) LINE & PILL */}
                    {yTP3 !== null && activeTradeSetup.takeProfit3 && (
                      <g>
                        <line
                          x1={padding.left}
                          y1={yTP3}
                          x2={rightScaleX}
                          y2={yTP3}
                          stroke="#0d9488"
                          strokeWidth="1.8"
                          strokeDasharray="5 3"
                        />
                        <rect
                          x={padding.left + 12}
                          y={yTP3 - 10}
                          width="180"
                          height="20"
                          rx="10"
                          fill="#0d9488"
                          filter="drop-shadow(0 1px 2px rgba(0,0,0,0.15))"
                        />
                        <text
                          x={padding.left + 22}
                          y={yTP3 + 3.5}
                          fill="#ffffff"
                          fontSize="9.5"
                          fontFamily="JetBrains Mono, monospace"
                          fontWeight="900"
                          letterSpacing="0.03em"
                        >
                          🎯 TP 3: ${activeTradeSetup.takeProfit3.toFixed(2)} (+{tp3Pips}p)
                        </text>
                      </g>
                    )}

                    {/* PINPOINT BUY/SELL ENTRY LINE & PILL */}
                    <line
                      x1={padding.left}
                      y1={yEntry}
                      x2={rightScaleX}
                      y2={yEntry}
                      stroke="#2563eb"
                      strokeWidth="2.4"
                      strokeDasharray="6 3"
                    />
                    <rect
                      x={padding.left + 12}
                      y={yEntry - 12}
                      width="180"
                      height="22"
                      rx="11"
                      fill="#2563eb"
                      filter="drop-shadow(0 2px 3px rgba(0,0,0,0.2))"
                    />
                    <text
                      x={padding.left + 22}
                      y={yEntry + 3.5}
                      fill="#ffffff"
                      fontSize="10"
                      fontFamily="JetBrains Mono, monospace"
                      fontWeight="900"
                      letterSpacing="0.04em"
                    >
                      🔵 {isBuy ? 'BUY' : 'SELL'} ENTRY: ${activeTradeSetup.entryPrice.toFixed(2)}
                    </text>

                    {/* STOP LOSS (SL) LINE & PILL */}
                    <line
                      x1={padding.left}
                      y1={ySL}
                      x2={rightScaleX}
                      y2={ySL}
                      stroke="#dc2626"
                      strokeWidth="2"
                      strokeDasharray="5 3"
                    />
                    <rect
                      x={padding.left + 12}
                      y={ySL - 10}
                      width="165"
                      height="20"
                      rx="10"
                      fill="#dc2626"
                      filter="drop-shadow(0 1px 2px rgba(0,0,0,0.15))"
                    />
                    <text
                      x={padding.left + 22}
                      y={ySL + 3.5}
                      fill="#ffffff"
                      fontSize="9.5"
                      fontFamily="JetBrains Mono, monospace"
                      fontWeight="900"
                      letterSpacing="0.03em"
                    >
                      🛑 STOP LOSS: ${activeTradeSetup.stopLoss.toFixed(2)} (-{slPips}p)
                    </text>
                  </g>
                );
              })()}

              {/* ========================================================== */}
              {/* 8. DEDICATED MT5 RIGHT-SIDE PRICE SCALE (AXIS PANEL)       */}
              {/* ========================================================== */}
              <g id="mt5-right-price-scale">
                {/* MT5 Scale Column Background */}
                <rect
                  x={rightScaleX}
                  y={0}
                  width={padding.right}
                  height={chartHeight - padding.bottom}
                  fill="#f8fafc"
                  stroke="#cbd5e1"
                  strokeWidth="1"
                />

                {/* Vertical Divider Line (Between Chart & Right Scale) */}
                <line
                  x1={rightScaleX}
                  y1={0}
                  x2={rightScaleX}
                  y2={chartHeight - padding.bottom}
                  stroke="#94a3b8"
                  strokeWidth="1.2"
                />

                {/* Top MT5 Spread Indicator */}
                <text
                  x={rightScaleX + 8}
                  y={18}
                  fill="#64748b"
                  fontSize="9"
                  fontFamily="JetBrains Mono, monospace"
                  fontWeight="bold"
                >
                  SPREAD: 20
                </text>

                {/* MT5 Regular Price Tick Marks & Price Labels */}
                {priceGridLevels.map((p, idx) => {
                  const y = getY(p);
                  return (
                    <g key={`mt5-scale-tick-${idx}`}>
                      {/* Scale Tick Protruding Mark */}
                      <line
                        x1={rightScaleX}
                        y1={y}
                        x2={rightScaleX + 5}
                        y2={y}
                        stroke="#64748b"
                        strokeWidth="1.2"
                      />
                      {/* Crisp Monospace MT5 Price Number */}
                      <text
                        x={rightScaleX + 9}
                        y={y + 3.5}
                        fill="#334155"
                        fontSize="11"
                        fontFamily="JetBrains Mono, Consolas, Courier New, monospace"
                        fontWeight="600"
                      >
                        {p.toFixed(2)}
                      </text>
                    </g>
                  );
                })}
              </g>

              {/* ========================================================== */}
              {/* 9. MT5 RIGHT SCALE BADGES FOR ACTIVE TRADE SETUP           */}
              {/* ========================================================== */}
              {activeTradeSetup && (() => {
                const yEntry = getY(activeTradeSetup.entryPrice);
                const yTP1 = getY(activeTradeSetup.takeProfit1);
                const yTP2 = getY(activeTradeSetup.takeProfit2);
                const yTP3 = activeTradeSetup.takeProfit3 ? getY(activeTradeSetup.takeProfit3) : null;
                const ySL = getY(activeTradeSetup.stopLoss);

                return (
                  <g id="mt5-active-order-badges">
                    {/* MT5 Right Scale TP2 Badge */}
                    <polygon
                      points={`${rightScaleX},${yTP2} ${rightScaleX + 6},${yTP2 - 8} ${rightScaleX + 6},${yTP2 + 8}`}
                      fill="#059669"
                    />
                    <rect
                      x={rightScaleX + 6}
                      y={yTP2 - 9}
                      width={padding.right - 8}
                      height={18}
                      rx="2"
                      fill="#059669"
                    />
                    <text
                      x={rightScaleX + 9}
                      y={yTP2 + 3.5}
                      fill="#ffffff"
                      fontSize="10"
                      fontFamily="JetBrains Mono, monospace"
                      fontWeight="bold"
                    >
                      TP2 {activeTradeSetup.takeProfit2.toFixed(2)}
                    </text>

                    {/* MT5 Right Scale TP1 Badge */}
                    <polygon
                      points={`${rightScaleX},${yTP1} ${rightScaleX + 6},${yTP1 - 8} ${rightScaleX + 6},${yTP1 + 8}`}
                      fill="#16a34a"
                    />
                    <rect
                      x={rightScaleX + 6}
                      y={yTP1 - 9}
                      width={padding.right - 8}
                      height={18}
                      rx="2"
                      fill="#16a34a"
                    />
                    <text
                      x={rightScaleX + 9}
                      y={yTP1 + 3.5}
                      fill="#ffffff"
                      fontSize="10"
                      fontFamily="JetBrains Mono, monospace"
                      fontWeight="bold"
                    >
                      TP1 {activeTradeSetup.takeProfit1.toFixed(2)}
                    </text>

                    {/* MT5 Right Scale TP3 Badge (if exists) */}
                    {yTP3 !== null && activeTradeSetup.takeProfit3 && (
                      <g>
                        <polygon
                          points={`${rightScaleX},${yTP3} ${rightScaleX + 6},${yTP3 - 8} ${rightScaleX + 6},${yTP3 + 8}`}
                          fill="#0d9488"
                        />
                        <rect
                          x={rightScaleX + 6}
                          y={yTP3 - 9}
                          width={padding.right - 8}
                          height={18}
                          rx="2"
                          fill="#0d9488"
                        />
                        <text
                          x={rightScaleX + 9}
                          y={yTP3 + 3.5}
                          fill="#ffffff"
                          fontSize="10"
                          fontFamily="JetBrains Mono, monospace"
                          fontWeight="bold"
                        >
                          TP3 {activeTradeSetup.takeProfit3.toFixed(2)}
                        </text>
                      </g>
                    )}

                    {/* MT5 Right Scale Entry Badge */}
                    <polygon
                      points={`${rightScaleX},${yEntry} ${rightScaleX + 6},${yEntry - 8} ${rightScaleX + 6},${yEntry + 8}`}
                      fill="#2563eb"
                    />
                    <rect
                      x={rightScaleX + 6}
                      y={yEntry - 9}
                      width={padding.right - 8}
                      height={18}
                      rx="2"
                      fill="#2563eb"
                    />
                    <text
                      x={rightScaleX + 9}
                      y={yEntry + 3.5}
                      fill="#ffffff"
                      fontSize="10"
                      fontFamily="JetBrains Mono, monospace"
                      fontWeight="bold"
                    >
                      {activeTradeSetup.direction} {activeTradeSetup.entryPrice.toFixed(2)}
                    </text>

                    {/* MT5 Right Scale SL Badge */}
                    <polygon
                      points={`${rightScaleX},${ySL} ${rightScaleX + 6},${ySL - 8} ${rightScaleX + 6},${ySL + 8}`}
                      fill="#dc2626"
                    />
                    <rect
                      x={rightScaleX + 6}
                      y={ySL - 9}
                      width={padding.right - 8}
                      height={18}
                      rx="2"
                      fill="#dc2626"
                    />
                    <text
                      x={rightScaleX + 9}
                      y={ySL + 3.5}
                      fill="#ffffff"
                      fontSize="10"
                      fontFamily="JetBrains Mono, monospace"
                      fontWeight="bold"
                    >
                      SL {activeTradeSetup.stopLoss.toFixed(2)}
                    </text>
                  </g>
                );
              })()}

              {/* ========================================================== */}
              {/* 10. MT5 LIVE BID & ASK CURRENT PRICE SYSTEM                */}
              {/* ========================================================== */}
              {(() => {
                const yBid = getY(bidPrice);
                const yAsk = getY(askPrice);

                return (
                  <g id="mt5-live-bid-ask-tracker">
                    {/* MT5 Ask Line (Dotted Rose) */}
                    <line
                      x1={padding.left}
                      y1={yAsk}
                      x2={rightScaleX}
                      y2={yAsk}
                      stroke="#f43f5e"
                      strokeWidth="1"
                      strokeDasharray="2 2"
                      strokeOpacity="0.85"
                    />
                    {/* MT5 Ask Price Right Scale Tag */}
                    <rect
                      x={rightScaleX + 5}
                      y={yAsk - 7}
                      width={padding.right - 8}
                      height={14}
                      rx="2"
                      fill="#fff1f2"
                      stroke="#f43f5e"
                      strokeWidth="1"
                    />
                    <text
                      x={rightScaleX + 8}
                      y={yAsk + 3.5}
                      fill="#e11d48"
                      fontSize="9"
                      fontFamily="JetBrains Mono, monospace"
                      fontWeight="bold"
                    >
                      Ask {askPrice.toFixed(2)}
                    </text>

                    {/* MT5 Bid Line (Dashed Live Color) */}
                    <line
                      x1={padding.left}
                      y1={yBid}
                      x2={rightScaleX}
                      y2={yBid}
                      stroke={liveColor}
                      strokeWidth="1.3"
                      strokeDasharray="4 2"
                    />

                    {/* Pulsing Beacon Dot at Candle edge */}
                    <circle
                      cx={rightScaleX - 8}
                      y={yBid}
                      r="3.5"
                      fill={liveColor}
                    />

                    {/* MT5 Bid Price Right Scale Primary Badge */}
                    <polygon
                      points={`${rightScaleX},${yBid} ${rightScaleX + 6},${yBid - 8} ${rightScaleX + 6},${yBid + 8}`}
                      fill={liveColor}
                    />
                    <rect
                      x={rightScaleX + 6}
                      y={yBid - 9}
                      width={padding.right - 8}
                      height={18}
                      rx="2"
                      fill={liveColor}
                    />
                    <text
                      x={rightScaleX + 9}
                      y={yBid + 3.5}
                      fill="#ffffff"
                      fontSize="10.5"
                      fontFamily="JetBrains Mono, Consolas, Courier New, monospace"
                      fontWeight="bold"
                    >
                      {bidPrice.toFixed(2)}
                    </text>
                  </g>
                );
              })()}

              {/* ========================================================== */}
              {/* 11. MT5 BOTTOM TIME SCALE (GUTTER & TICKS)                 */}
              {/* ========================================================== */}
              <g id="mt5-bottom-time-scale">
                {/* Horizontal Divider Line */}
                <line
                  x1={0}
                  y1={chartHeight - padding.bottom}
                  x2={chartWidth}
                  y2={chartHeight - padding.bottom}
                  stroke="#cbd5e1"
                  strokeWidth="1"
                />
              </g>

              {/* ========================================================== */}
              {/* 12. MT5 CROSSHAIR INSPECTOR (ON CHART & RIGHT SCALE)       */}
              {/* ========================================================== */}
              {mousePos && mousePos.x >= padding.left && mousePos.x <= rightScaleX && mousePos.y >= padding.top && mousePos.y <= chartHeight - padding.bottom && (
                <g id="mt5-crosshair-overlay">
                  {/* Vertical Crosshair Line */}
                  <line
                    x1={mousePos.x}
                    y1={padding.top}
                    x2={mousePos.x}
                    y2={chartHeight - padding.bottom}
                    stroke="#64748b"
                    strokeWidth="0.8"
                    strokeDasharray="3 3"
                  />
                  {/* Horizontal Crosshair Line to Right Scale */}
                  <line
                    x1={padding.left}
                    y1={mousePos.y}
                    x2={rightScaleX}
                    y2={mousePos.y}
                    stroke="#64748b"
                    strokeWidth="0.8"
                    strokeDasharray="3 3"
                  />

                  {/* MT5 Crosshair Right Scale Price Badge */}
                  <polygon
                    points={`${rightScaleX},${mousePos.y} ${rightScaleX + 5},${mousePos.y - 7} ${rightScaleX + 5},${mousePos.y + 7}`}
                    fill="#0f172a"
                  />
                  <rect
                    x={rightScaleX + 5}
                    y={mousePos.y - 9}
                    width={padding.right - 8}
                    height={18}
                    rx="2"
                    fill="#0f172a"
                    stroke="#38bdf8"
                    strokeWidth="1"
                  />
                  <text
                    x={rightScaleX + 8}
                    y={mousePos.y + 3.5}
                    fill="#ffffff"
                    fontSize="10.5"
                    fontFamily="JetBrains Mono, Consolas, monospace"
                    fontWeight="bold"
                  >
                    {getPriceAtY(mousePos.y).toFixed(2)}
                  </text>

                  {/* Bottom Time Badge */}
                  {hoveredCandle && (
                    <g>
                      <rect
                        x={mousePos.x - 28}
                        y={chartHeight - padding.bottom + 4}
                        width="56"
                        height="18"
                        rx="3"
                        fill="#0f172a"
                      />
                      <text
                        x={mousePos.x}
                        y={chartHeight - padding.bottom + 16}
                        fill="#ffffff"
                        fontSize="9.5"
                        fontFamily="JetBrains Mono, monospace"
                        fontWeight="bold"
                        textAnchor="middle"
                      >
                        {hoveredCandle.timeStr}
                      </text>
                    </g>
                  )}
                </g>
              )}
            </svg>

            {/* Hovered Candlestick Tooltip / HUD */}
            {hoveredCandle && (
              <div className="absolute top-3 left-4 pointer-events-none bg-white/95 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-sky-100 text-xs font-mono flex items-center gap-3 shadow-md z-20">
                <span className="text-slate-500 font-sans font-bold">{hoveredCandle.timeStr}</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400">O:</span>
                  <span className="text-slate-800 font-semibold">${hoveredCandle.open.toFixed(2)}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400">H:</span>
                  <span className="text-emerald-600 font-semibold">${hoveredCandle.high.toFixed(2)}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400">L:</span>
                  <span className="text-rose-600 font-semibold">${hoveredCandle.low.toFixed(2)}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400">C:</span>
                  <span
                    className={`font-bold ${
                      hoveredCandle.close >= hoveredCandle.open ? 'text-emerald-600' : 'text-rose-600'
                    }`}
                  >
                    ${hoveredCandle.close.toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-slate-500 border-l border-slate-200 pl-2">
                  <span className="text-slate-400">Vol:</span>
                  <span>{hoveredCandle.volume.toLocaleString()}</span>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
