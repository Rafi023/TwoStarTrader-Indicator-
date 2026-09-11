import React, { useState, useEffect } from 'react';
import { ScalpPosition, ScalpingSignal } from '../types';
import {
  TrendingUp,
  TrendingDown,
  Target,
  ShieldAlert,
  Copy,
  Check,
  Zap,
  Lock,
  RotateCcw,
  Sliders,
  Sparkles,
  ArrowRight,
} from 'lucide-react';

interface SimpleScalpPlannerProps {
  currentPrice: number;
  activePosition: ScalpPosition | null;
  activeSignal?: ScalpingSignal | null;
  onApplyPosition: (pos: ScalpPosition) => void;
  onClosePosition: () => void;
  onSetBreakEven: () => void;
}

const PROFIT_RATIOS = [
  { label: '1 : 1.0', ratio: 1.0, name: 'Quick 1:1' },
  { label: '1 : 1.5', ratio: 1.5, name: '1:1.5' },
  { label: '1 : 2.0', ratio: 2.0, name: 'Standard 1:2' },
  { label: '1 : 2.5', ratio: 2.5, name: '1:2.5' },
  { label: '1 : 3.0', ratio: 3.0, name: 'Runner 1:3' },
  { label: '1 : 4.0', ratio: 4.0, name: '1:4' },
];

const SL_OPTIONS = [
  { label: '10 pips ($1.00)', dollars: 1.0 },
  { label: '15 pips ($1.50)', dollars: 1.5 },
  { label: '20 pips ($2.00)', dollars: 2.0 },
  { label: '30 pips ($3.00)', dollars: 3.0 },
];

export const SimpleScalpPlanner: React.FC<SimpleScalpPlannerProps> = ({
  currentPrice,
  activePosition,
  activeSignal,
  onApplyPosition,
  onClosePosition,
  onSetBreakEven,
}) => {
  const [direction, setDirection] = useState<'BUY' | 'SELL'>('BUY');
  const [profitRatio, setProfitRatio] = useState<number>(2.0);
  const [slDollars, setSlDollars] = useState<number>(1.5); // $1.50 = 15 pips
  const [copied, setCopied] = useState<boolean>(false);

  const isBuy = direction === 'BUY';
  const effectiveEntry = Number(currentPrice.toFixed(2));
  const stopLossPrice = Number(
    (isBuy ? effectiveEntry - slDollars : effectiveEntry + slDollars).toFixed(2)
  );
  const rewardDollars = Number((slDollars * profitRatio).toFixed(2));
  const takeProfitPrice = Number(
    (isBuy ? effectiveEntry + rewardDollars : effectiveEntry - rewardDollars).toFixed(2)
  );

  const riskPips = Math.round(slDollars * 10);
  const rewardPips = Math.round(rewardDollars * 10);
  const lotSize = 0.1; // 0.10 lot standard
  const pipValue = lotSize * 10;
  const potentialProfitDollars = Number((rewardPips * pipValue).toFixed(2));
  const potentialRiskDollars = Number((riskPips * pipValue).toFixed(2));

  // Adopt parameters from Active AI Signal
  const handleAdoptSignal = (sig: ScalpingSignal) => {
    const isSigBuy = sig.type.includes('BUY');
    setDirection(isSigBuy ? 'BUY' : 'SELL');
    const slDist = Math.max(0.8, Math.abs(sig.entryPrice - sig.stopLoss));
    setSlDollars(Number(slDist.toFixed(2)));
    const tpDist = Math.abs(sig.takeProfit2 - sig.entryPrice);
    const ratio = slDist > 0 ? Number((tpDist / slDist).toFixed(1)) : 2.0;
    setProfitRatio(ratio);

    const pos: ScalpPosition = {
      id: `pos-${Date.now()}`,
      direction: isSigBuy ? 'BUY' : 'SELL',
      entryPrice: Number(sig.entryPrice.toFixed(2)),
      stopLossPrice: Number(sig.stopLoss.toFixed(2)),
      takeProfitPrice: Number(sig.takeProfit2.toFixed(2)),
      profitRatio: ratio,
      riskDollars: Number(slDist.toFixed(2)),
      rewardDollars: Number(tpDist.toFixed(2)),
      riskPips: sig.riskPips || Math.round(slDist * 10),
      rewardPips: sig.rewardPips || Math.round(tpDist * 10),
      lotSize,
      openedAt: Date.now(),
      status: 'ACTIVE',
    };
    onApplyPosition(pos);
  };

  // Handle Enter Scalp
  const handleEnterScalp = () => {
    const pos: ScalpPosition = {
      id: `pos-${Date.now()}`,
      direction,
      entryPrice: effectiveEntry,
      stopLossPrice,
      takeProfitPrice,
      profitRatio,
      riskDollars: slDollars,
      rewardDollars,
      riskPips,
      rewardPips,
      lotSize,
      openedAt: Date.now(),
      status: 'ACTIVE',
    };
    onApplyPosition(pos);
  };

  // Copy values for MT4/MT5 / TradingView
  const handleCopy = () => {
    const text = `XAU/USD ${direction} SCALP\nEntry: $${effectiveEntry.toFixed(2)}\nTP: $${takeProfitPrice.toFixed(2)} (+${rewardPips} pips)\nSL: $${stopLossPrice.toFixed(2)} (-${riskPips} pips)\nProfit Ratio: 1:${profitRatio.toFixed(1)}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Current Live P&L if active
  let activeLivePips = 0;
  let activeLiveDollars = 0;
  let activeIsProfit = false;
  let progressPercent = 0;

  if (activePosition && activePosition.status === 'ACTIVE') {
    const activeIsBuy = activePosition.direction === 'BUY';
    const delta = activeIsBuy
      ? currentPrice - activePosition.entryPrice
      : activePosition.entryPrice - currentPrice;
    activeLivePips = Math.round(delta * 10);
    activeLiveDollars = Number((activeLivePips * (activePosition.lotSize * 10)).toFixed(2));
    activeIsProfit = activeLivePips >= 0;

    const totalDist = Math.abs(activePosition.takeProfitPrice - activePosition.entryPrice);
    if (totalDist > 0) {
      progressPercent = Math.min(100, Math.max(0, Math.round((delta / totalDist) * 100)));
    }
  }

  return (
    <div
      id="simple-scalp-planner"
      className="bg-white rounded-2xl border border-sky-100 shadow-sm p-5 flex flex-col space-y-5"
    >
      {/* Title & Quick Copy */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-black text-slate-900 tracking-tight">
            Order Entry & Scalp Planner
          </h2>
          <p className="text-xs text-slate-500">
            Select BUY or SELL, adopt AI signals, & manage profit targets
          </p>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:text-sky-700 bg-slate-50 hover:bg-sky-50 border border-slate-200 rounded-lg transition-colors cursor-pointer"
          title="Copy exact parameters"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>

      {/* Active AI Confluence Signal Sync Card */}
      {activeSignal && (
        <div
          className={`p-3.5 rounded-xl border-2 transition-all ${
            activeSignal.type.includes('BUY')
              ? 'bg-emerald-50/70 border-emerald-300'
              : 'bg-rose-50/70 border-rose-300'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span
                className={`w-2 h-2 rounded-full animate-ping ${
                  activeSignal.type.includes('BUY') ? 'bg-emerald-500' : 'bg-rose-500'
                }`}
              />
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-800">
                {activeSignal.tradeStyle === 'DAY_TRADE' ? '📈 AI DAY TRADE' : '⚡ AI SCALP'}
              </span>
              {activeSignal.signalGrade && (
                <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-amber-400 text-slate-950 border border-amber-500 shadow-2xs">
                  ★ {activeSignal.signalGrade}
                </span>
              )}
            </div>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-white text-slate-700 border border-slate-200">
              {activeSignal.confluenceScore}% Conf
            </span>
          </div>

          <div className="flex items-center justify-between text-xs font-mono py-1">
            <span className="font-black text-slate-800">
              {activeSignal.type} @ ${activeSignal.entryPrice.toFixed(2)}
            </span>
            <div className="flex items-center gap-2 text-[11px]">
              <span className="text-rose-600 font-bold">SL ${activeSignal.stopLoss.toFixed(2)}</span>
              <span className="text-slate-300">•</span>
              <span className="text-emerald-700 font-bold">TP2 ${activeSignal.takeProfit2.toFixed(2)}</span>
            </div>
          </div>

          {activeSignal.triggerCondition && (
            <p className="text-[10px] font-bold text-slate-700 mt-1 bg-white/70 p-1.5 rounded border border-slate-200/80">
              🎯 {activeSignal.triggerCondition}
            </p>
          )}

          {activeSignal.breakEvenPrice && (
            <div className="flex items-center justify-between text-[10px] font-mono mt-1 text-slate-600">
              <span>BE Lock: ${activeSignal.breakEvenPrice.toFixed(2)}</span>
              <span>Buffer: +{activeSignal.spreadBufferPips || 5}p</span>
            </div>
          )}

          {activeSignal.actionAdvice && (
            <p className="text-[10px] text-slate-600 italic mt-1 font-medium">
              💡 {activeSignal.actionAdvice}
            </p>
          )}

          <button
            type="button"
            onClick={() => handleAdoptSignal(activeSignal)}
            className={`mt-2.5 w-full py-2 px-3 rounded-lg text-xs font-black uppercase tracking-wide flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer ${
              activeSignal.type.includes('BUY')
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20'
                : 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/20'
            }`}
          >
            <Zap className="w-3.5 h-3.5 fill-current" />
            <span>Apply Signal & Plot On Chart</span>
          </button>
        </div>
      )}

      {/* Fast Strategy Presets for Day Traders and Scalpers */}
      <div>
        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
          Fast Strategy Presets
        </label>
        <div className="grid grid-cols-3 gap-1.5 text-[11px] font-semibold">
          <button
            type="button"
            onClick={() => {
              setSlDollars(1.5);
              setProfitRatio(2.0);
            }}
            className={`py-1.5 px-2 rounded-lg border text-center transition-all cursor-pointer ${
              slDollars === 1.5 && profitRatio === 2.0
                ? 'bg-amber-500 text-slate-950 font-black border-amber-500 shadow-xs'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border-slate-200'
            }`}
          >
            ⚡ Scalp (15p/30p)
          </button>
          <button
            type="button"
            onClick={() => {
              setSlDollars(3.0);
              setProfitRatio(2.5);
            }}
            className={`py-1.5 px-2 rounded-lg border text-center transition-all cursor-pointer ${
              slDollars === 3.0 && profitRatio === 2.5
                ? 'bg-indigo-600 text-white font-black border-indigo-600 shadow-xs'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border-slate-200'
            }`}
          >
            📈 Day (30p/75p)
          </button>
          <button
            type="button"
            onClick={() => {
              setSlDollars(1.0);
              setProfitRatio(2.0);
            }}
            className={`py-1.5 px-2 rounded-lg border text-center transition-all cursor-pointer ${
              slDollars === 1.0 && profitRatio === 2.0
                ? 'bg-emerald-600 text-white font-black border-emerald-600 shadow-xs'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border-slate-200'
            }`}
          >
            🎯 Sniper (10p/20p)
          </button>
        </div>
      </div>

      {/* 1. SELECT BUY OR SELL */}
      <div>
        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">
          1. Trade Direction
        </label>
        <div className="grid grid-cols-2 gap-3">
          {/* BUY BUTTON */}
          <button
            id="btn-select-buy"
            onClick={() => setDirection('BUY')}
            className={`py-3.5 px-4 rounded-xl font-black text-base flex items-center justify-center gap-2.5 border-2 transition-all cursor-pointer ${
              isBuy
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/20'
                : 'bg-emerald-50/50 text-emerald-700 border-emerald-200 hover:bg-emerald-100/60'
            }`}
          >
            <TrendingUp className="w-5 h-5 stroke-[2.5]" />
            <span>BUY (LONG)</span>
          </button>

          {/* SELL BUTTON */}
          <button
            id="btn-select-sell"
            onClick={() => setDirection('SELL')}
            className={`py-3.5 px-4 rounded-xl font-black text-base flex items-center justify-center gap-2.5 border-2 transition-all cursor-pointer ${
              !isBuy
                ? 'bg-rose-600 text-white border-rose-600 shadow-md shadow-rose-600/20'
                : 'bg-rose-50/50 text-rose-700 border-rose-200 hover:bg-rose-100/60'
            }`}
          >
            <TrendingDown className="w-5 h-5 stroke-[2.5]" />
            <span>SELL (SHORT)</span>
          </button>
        </div>
      </div>

      {/* 2. HOW MUCH PROFIT RATIO */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            2. Profit Ratio
          </label>
          <span className="text-xs font-mono font-black px-2.5 py-0.5 rounded-full bg-sky-100 text-sky-800">
            1 : {profitRatio.toFixed(1)} RR
          </span>
        </div>

        {/* Profit Ratio Quick Buttons */}
        <div className="grid grid-cols-3 gap-2">
          {PROFIT_RATIOS.map((item) => (
            <button
              key={item.ratio}
              onClick={() => setProfitRatio(item.ratio)}
              className={`py-2 px-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer flex flex-col items-center ${
                profitRatio === item.ratio
                  ? 'bg-sky-600 border-sky-600 text-white shadow-xs'
                  : 'bg-slate-50 hover:bg-sky-50 border-slate-200 text-slate-700'
              }`}
            >
              <span>{item.label}</span>
              <span
                className={`text-[10px] font-normal ${
                  profitRatio === item.ratio ? 'text-sky-100' : 'text-slate-400'
                }`}
              >
                {item.name}
              </span>
            </button>
          ))}
        </div>

        {/* Fine Tuning Slider */}
        <div className="mt-3 flex items-center gap-3">
          <span className="text-[11px] text-slate-400 font-mono">1:1.0</span>
          <input
            type="range"
            min="1.0"
            max="4.0"
            step="0.1"
            value={profitRatio}
            onChange={(e) => setProfitRatio(parseFloat(e.target.value))}
            className="w-full accent-sky-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
          />
          <span className="text-[11px] text-slate-400 font-mono">1:4.0</span>
        </div>
      </div>

      {/* 3. STOP LOSS DISTANCE */}
      <div>
        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">
          3. Stop Loss Distance
        </label>
        <div className="grid grid-cols-2 gap-2">
          {SL_OPTIONS.map((opt) => (
            <button
              key={opt.dollars}
              onClick={() => setSlDollars(opt.dollars)}
              className={`py-2 px-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer text-center ${
                slDollars === opt.dollars
                  ? 'bg-slate-800 text-white border-slate-800 shadow-xs'
                  : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* 4. EXACT TRADINGVIEW LEVELS PREVIEW */}
      <div
        className={`p-4 rounded-xl border-2 transition-all space-y-2.5 ${
          isBuy ? 'bg-emerald-50/40 border-emerald-300' : 'bg-rose-50/40 border-rose-300'
        }`}
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-black uppercase tracking-wider text-slate-700">
            Exact Scalp Levels
          </span>
          <span
            className={`text-xs font-mono font-black px-2 py-0.5 rounded ${
              isBuy ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
            }`}
          >
            {direction} 1:{profitRatio.toFixed(1)}
          </span>
        </div>

        {/* Take Profit Target */}
        <div className="flex items-center justify-between p-2.5 bg-white rounded-lg border border-emerald-200">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-emerald-600" />
            <div>
              <span className="text-[10px] font-bold text-emerald-700 uppercase block">
                Take Profit (Target)
              </span>
              <span className="text-sm font-mono font-black text-emerald-600">
                ${takeProfitPrice.toFixed(2)}
              </span>
            </div>
          </div>
          <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded">
            +{rewardPips} pips (+${potentialProfitDollars})
          </span>
        </div>

        {/* Entry Price */}
        <div className="flex items-center justify-between p-2 bg-white rounded-lg border border-sky-200">
          <span className="text-xs font-bold text-slate-600">Entry Price (Live)</span>
          <span className="text-sm font-mono font-black text-sky-700">
            ${effectiveEntry.toFixed(2)}
          </span>
        </div>

        {/* Stop Loss Risk */}
        <div className="flex items-center justify-between p-2.5 bg-white rounded-lg border border-rose-200">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-rose-600" />
            <div>
              <span className="text-[10px] font-bold text-rose-700 uppercase block">
                Stop Loss (Risk)
              </span>
              <span className="text-sm font-mono font-black text-rose-600">
                ${stopLossPrice.toFixed(2)}
              </span>
            </div>
          </div>
          <span className="text-xs font-mono font-bold text-rose-700 bg-rose-50 px-2 py-1 rounded">
            -{riskPips} pips (-${potentialRiskDollars})
          </span>
        </div>
      </div>

      {/* 5. ENTER SCALP ACTION BUTTON */}
      <button
        id="btn-enter-scalp"
        onClick={handleEnterScalp}
        className={`w-full py-3.5 px-4 rounded-xl font-black text-base uppercase tracking-wider text-white shadow-lg transition-transform active:scale-[0.99] cursor-pointer flex items-center justify-center gap-2 ${
          isBuy
            ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30'
            : 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/30'
        }`}
      >
        <Zap className="w-5 h-5 fill-current" />
        <span>
          Enter {direction} Scalp (1:{profitRatio.toFixed(1)})
        </span>
      </button>

      {/* 6. ACTIVE SCALP STATUS (When position is open) */}
      {activePosition && (
        <div className="p-4 bg-slate-900 text-white rounded-xl space-y-3 shadow-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  activePosition.status === 'HIT_TP'
                    ? 'bg-emerald-400'
                    : activePosition.status === 'HIT_SL'
                    ? 'bg-rose-400'
                    : 'bg-sky-400 animate-pulse'
                }`}
              />
              <span className="text-xs font-bold uppercase tracking-wider">
                Active {activePosition.direction} Scalp
              </span>
            </div>
            <span
              className={`text-xs font-mono font-black px-2 py-0.5 rounded ${
                activeIsProfit ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
              }`}
            >
              {activeIsProfit ? '+' : ''}
              {activeLivePips} pips ({activeIsProfit ? '+$' : '-$'}
              {Math.abs(activeLiveDollars)})
            </span>
          </div>

          {/* Progress towards TP */}
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] text-slate-400 font-mono">
              <span>Target: ${activePosition.takeProfitPrice.toFixed(2)}</span>
              <span>{progressPercent}% reached</span>
            </div>
            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Actions: Move SL to Break Even or Close */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              onClick={onSetBreakEven}
              className="py-1.5 px-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5"
              title="Lock entry price as Stop Loss"
            >
              <Lock className="w-3.5 h-3.5 text-sky-400" />
              <span>Set B/E ($0 Risk)</span>
            </button>
            <button
              onClick={onClosePosition}
              className="py-1.5 px-2 bg-rose-600/30 hover:bg-rose-600/50 text-rose-200 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Close Scalp</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
