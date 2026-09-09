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
} from 'lucide-react';
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

  // Calculate High/Low range of displayed candles
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

    if (activePosition) {
      min = Math.min(min, activePosition.stopLossPrice, activePosition.takeProfitPrice);
      max = Math.max(max, activePosition.stopLossPrice, activePosition.takeProfitPrice);
    }

    // Include buffer for MT5 breathing room
    const buffer = Math.max((max - min) * 0.12, 1.8);
    return {
      minPrice: Number((min - buffer).toFixed(2)),
      maxPrice: Number((max + buffer).toFixed(2)),
      priceRange: Number(((max + buffer) - (min - buffer)).toFixed(2)),
    };
  }, [displayedCandles, activePosition]);

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
          {/* Clean Candlestick Metrics Bar */}
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

            {/* Zoom & View Reset */}
            <div className="flex items-center gap-1">
              <button
                id="btn-zoom-in"
                onClick={() => setVisibleCount((c) => Math.max(25, c - 10))}
                className="p-1.5 rounded-lg bg-white border border-sky-200 text-slate-600 hover:text-sky-700 hover:bg-sky-50 transition-colors shadow-xs"
                title="Zoom In"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <button
                id="btn-zoom-out"
                onClick={() => setVisibleCount((c) => Math.min(80, c + 10))}
                className="p-1.5 rounded-lg bg-white border border-sky-200 text-slate-600 hover:text-sky-700 hover:bg-sky-50 transition-colors shadow-xs"
                title="Zoom Out"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <button
                id="btn-reset-zoom"
                onClick={() => setVisibleCount(45)}
                className="p-1.5 rounded-lg bg-white border border-sky-200 text-slate-600 hover:text-sky-700 hover:bg-sky-50 transition-colors shadow-xs"
                title="Reset View"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

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

              {/* 6. SCALPING SIGNALS MARKERS */}
              {settings.showSignals &&
                signals.map((sig) => {
                  const candlePos = sig.candleIndex - startIndex;
                  if (candlePos < 0 || candlePos >= displayedCandles.length) return null;

                  const xCenter = padding.left + candlePos * candleWidth + candleWidth / 2;
                  const candle = displayedCandles[candlePos];
                  if (!candle) return null;

                  const isBuy = sig.type.includes('BUY');
                  const yPos = isBuy ? getY(candle.low) + 40 : getY(candle.high) - 38;
                  const isSelected = activeSignal?.id === sig.id;

                  return (
                    <g
                      key={sig.id}
                      onClick={() => onSelectSignal(sig)}
                      className="cursor-pointer group"
                    >
                      <polygon
                        points={
                          isBuy
                            ? `${xCenter},${yPos - 14} ${xCenter - 8},${yPos - 2} ${xCenter + 8},${yPos - 2}`
                            : `${xCenter},${yPos + 14} ${xCenter - 8},${yPos + 2} ${xCenter + 8},${yPos + 2}`
                        }
                        fill={isBuy ? '#10b981' : '#f43f5e'}
                      />
                      <rect
                        x={xCenter - 56}
                        y={isBuy ? yPos : yPos - 22}
                        width="112"
                        height="20"
                        rx="10"
                        fill={isBuy ? '#10b981' : '#f43f5e'}
                        stroke={isSelected ? '#0f172a' : 'none'}
                        strokeWidth={isSelected ? '2' : '0'}
                      />
                      <text
                        x={xCenter}
                        y={isBuy ? yPos + 13.5 : yPos - 8.5}
                        fill="#ffffff"
                        fontSize="9.5"
                        fontFamily="Plus Jakarta Sans, sans-serif"
                        fontWeight="900"
                        letterSpacing="0.06em"
                        textAnchor="middle"
                      >
                        {isBuy ? 'AI BUY SIGNAL' : 'AI SELL SIGNAL'}
                      </text>
                    </g>
                  );
                })}

              {/* ========================================================== */}
              {/* 7. SCALP POSITION TARGET / STOP SHADED BOX (TradingView/MT5)*/}
              {/* ========================================================== */}
              {activePosition && (() => {
                const isLong = activePosition.direction === 'BUY';
                const yEntry = getY(activePosition.entryPrice);
                const yTP = getY(activePosition.takeProfitPrice);
                const ySL = getY(activePosition.stopLossPrice);

                const greenTop = isLong ? yTP : yEntry;
                const greenHeight = Math.max(3, Math.abs(yTP - yEntry));

                const redTop = isLong ? yEntry : ySL;
                const redHeight = Math.max(3, Math.abs(ySL - yEntry));

                const boxLeft = padding.left + usableWidth * 0.45;
                const boxWidth = usableWidth * 0.55;

                return (
                  <g id="scalp-position-shaded-zone">
                    {/* Shaded Profit Target Area */}
                    <rect
                      x={boxLeft}
                      y={greenTop}
                      width={boxWidth}
                      height={greenHeight}
                      fill="#22c55e"
                      fillOpacity="0.18"
                      stroke="#16a34a"
                      strokeWidth="1.2"
                    />

                    {/* Shaded Stop Loss Risk Area */}
                    <rect
                      x={boxLeft}
                      y={redTop}
                      width={boxWidth}
                      height={redHeight}
                      fill="#ef4444"
                      fillOpacity="0.18"
                      stroke="#dc2626"
                      strokeWidth="1.2"
                    />

                    {/* Entry Center Line */}
                    <line
                      x1={boxLeft}
                      y1={yEntry}
                      x2={rightScaleX}
                      y2={yEntry}
                      stroke="#2563eb"
                      strokeWidth="1.5"
                    />
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
              {/* 9. MT5 ACTIVE POSITION ORDER LINES & RIGHT SCALE BADGES    */}
              {/* ========================================================== */}
              {activePosition && (() => {
                const yEntry = getY(activePosition.entryPrice);
                const yTP = getY(activePosition.takeProfitPrice);
                const ySL = getY(activePosition.stopLossPrice);

                return (
                  <g id="mt5-active-order-badges">
                    {/* Take Profit (TP) Line & Right Badge */}
                    <line
                      x1={padding.left}
                      y1={yTP}
                      x2={rightScaleX}
                      y2={yTP}
                      stroke="#16a34a"
                      strokeWidth="1.2"
                      strokeDasharray="4 3"
                    />
                    <text
                      x={padding.left + 8}
                      y={yTP - 4}
                      fill="#16a34a"
                      fontSize="9.5"
                      fontFamily="JetBrains Mono, monospace"
                      fontWeight="bold"
                    >
                      t/p: +{activePosition.rewardPips} pips
                    </text>
                    {/* MT5 Right Scale TP Badge */}
                    <polygon
                      points={`${rightScaleX},${yTP} ${rightScaleX + 6},${yTP - 8} ${rightScaleX + 6},${yTP + 8}`}
                      fill="#16a34a"
                    />
                    <rect
                      x={rightScaleX + 6}
                      y={yTP - 9}
                      width={padding.right - 8}
                      height={18}
                      rx="2"
                      fill="#16a34a"
                    />
                    <text
                      x={rightScaleX + 9}
                      y={yTP + 3.5}
                      fill="#ffffff"
                      fontSize="10"
                      fontFamily="JetBrains Mono, monospace"
                      fontWeight="bold"
                    >
                      TP {activePosition.takeProfitPrice.toFixed(2)}
                    </text>

                    {/* Entry Price Line & Right Badge */}
                    <line
                      x1={padding.left}
                      y1={yEntry}
                      x2={rightScaleX}
                      y2={yEntry}
                      stroke="#2563eb"
                      strokeWidth="1.2"
                      strokeDasharray="5 3"
                    />
                    <text
                      x={padding.left + 8}
                      y={yEntry - 4}
                      fill="#2563eb"
                      fontSize="9.5"
                      fontFamily="JetBrains Mono, monospace"
                      fontWeight="bold"
                    >
                      {activePosition.direction.toLowerCase()} {activePosition.lotSize.toFixed(2)}
                    </text>
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
                      {activePosition.direction} {activePosition.entryPrice.toFixed(2)}
                    </text>

                    {/* Stop Loss (SL) Line & Right Badge */}
                    <line
                      x1={padding.left}
                      y1={ySL}
                      x2={rightScaleX}
                      y2={ySL}
                      stroke="#dc2626"
                      strokeWidth="1.2"
                      strokeDasharray="3 3"
                    />
                    <text
                      x={padding.left + 8}
                      y={ySL - 4}
                      fill="#dc2626"
                      fontSize="9.5"
                      fontFamily="JetBrains Mono, monospace"
                      fontWeight="bold"
                    >
                      s/l: -{activePosition.riskPips} pips
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
                      SL {activePosition.stopLossPrice.toFixed(2)}
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
