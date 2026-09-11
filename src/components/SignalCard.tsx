import React, { useState } from 'react';
import { ScalpingSignal } from '../types';
import {
  TrendingUp,
  TrendingDown,
  Target,
  ShieldAlert,
  Clock,
  Sparkles,
  Zap,
  ArrowRight,
  Check,
  Copy,
  CheckCheck,
} from 'lucide-react';

interface SignalCardProps {
  signal: ScalpingSignal | null;
  currentPrice: number;
  onAnalyzeWithAi: () => void;
  isAiLoading: boolean;
  onApplyToPlanner?: (signal: ScalpingSignal) => void;
}

export const SignalCard: React.FC<SignalCardProps> = ({
  signal,
  currentPrice,
  onAnalyzeWithAi,
  isAiLoading,
  onApplyToPlanner,
}) => {
  const [executed, setExecuted] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!signal) {
    return (
      <div id="no-signal-card" className="bg-white border border-sky-100 rounded-xl p-6 flex flex-col items-center justify-center text-center shadow-sm">
        <div className="w-12 h-12 rounded-xl bg-sky-50 border border-sky-200 flex items-center justify-center mb-3">
          <Zap className="w-6 h-6 text-sky-600" />
        </div>
        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Scanning Gold (XAU/USD) Setup</h3>
        <p className="text-xs text-slate-500 max-w-sm mt-1">
          Analyzing EMA 9/21 trend pullbacks, Order Blocks, FVGs, and Liquidity Sweeps. Signals will broadcast with high mathematical confluence.
        </p>
      </div>
    );
  }

  const isBuy = signal.type.includes('BUY');
  const isDayTrade = signal.tradeStyle === 'DAY_TRADE';
  const riskPips = Math.abs(Math.round((signal.entryPrice - signal.stopLoss) * 10));
  const tp1Pips = Math.abs(Math.round((signal.takeProfit1 - signal.entryPrice) * 10));
  const tp2Pips = Math.abs(Math.round((signal.takeProfit2 - signal.entryPrice) * 10));
  const tp3Pips = signal.takeProfit3
    ? Math.abs(Math.round((signal.takeProfit3 - signal.entryPrice) * 10))
    : null;

  // Current live PnL in pips
  const livePips = isBuy
    ? Math.round((currentPrice - signal.entryPrice) * 10)
    : Math.round((signal.entryPrice - currentPrice) * 10);

  const isProfit = livePips >= 0;

  const handleExecute = () => {
    setExecuted(true);
    setTimeout(() => setExecuted(false), 3000);
  };

  const handleCopyParameters = () => {
    const text = `XAU/USD ${signal.type} (${isDayTrade ? 'DAY TRADE' : 'SCALP'})\nEntry: $${signal.entryPrice.toFixed(2)}\nStop Loss: $${signal.stopLoss.toFixed(2)} (-${riskPips} pips)\nTP1: $${signal.takeProfit1.toFixed(2)} (+${tp1Pips} pips)\nTP2: $${signal.takeProfit2.toFixed(2)} (+${tp2Pips} pips)${signal.takeProfit3 ? `\nTP3: $${signal.takeProfit3.toFixed(2)} (+${tp3Pips} pips)` : ''}\nRisk/Reward: ${signal.riskReward}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      id="active-signal-card"
      className={`relative bg-white border border-sky-100 rounded-xl overflow-hidden shadow-sm transition-all duration-300 flex flex-col border-l-4 ${
        isBuy ? 'border-l-emerald-500' : 'border-l-rose-500'
      }`}
    >
      {/* Top Banner Header */}
      <div className="p-4 border-b border-sky-100 bg-gradient-to-r from-sky-50/60 to-white flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center shadow-xs ${
              isBuy ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'
            }`}
          >
            {isBuy ? <TrendingUp className="w-5 h-5 stroke-[2.5]" /> : <TrendingDown className="w-5 h-5 stroke-[2.5]" />}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className={`text-sm font-black uppercase tracking-tight ${isBuy ? 'text-emerald-700' : 'text-rose-700'}`}>
                {signal.type.replace('_', ' ')}
              </span>
              {signal.isPredictiveAdvance && (
                <span className="text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider bg-violet-600 text-white shadow-xs animate-pulse">
                  🔮 ADVANCE SIGNAL
                </span>
              )}
              {signal.signalGrade && (
                <span
                  className={`text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider border shadow-xs ${
                    signal.signalGrade === 'A+'
                      ? 'bg-amber-400 text-slate-950 border-amber-500 font-extrabold'
                      : signal.signalGrade === 'A'
                      ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                      : 'bg-sky-100 text-sky-900 border-sky-300'
                  }`}
                >
                  ★ GRADE {signal.signalGrade}
                </span>
              )}
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider ${
                  isDayTrade ? 'bg-indigo-100 text-indigo-800 border border-indigo-200' : 'bg-amber-100 text-amber-900 border border-amber-200'
                }`}
              >
                {isDayTrade ? '📈 DAY TRADE' : '⚡ SCALP'}
              </span>
              {signal.marketStructureType && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
                  {signal.marketStructureType.replace(/_/g, ' ')}
                </span>
              )}
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                  signal.status === 'HIT_TP2'
                    ? 'bg-emerald-100 text-emerald-800'
                    : signal.status === 'HIT_TP1'
                    ? 'bg-sky-100 text-sky-800'
                    : signal.status === 'STOPPED_OUT'
                    ? 'bg-rose-100 text-rose-800'
                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200 animate-pulse'
                }`}
              >
                {signal.status.replace('_', ' ')}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-mono mt-0.5 flex items-center gap-1">
              <Clock className="w-3 h-3 text-slate-400" />
              <span>Broadcast {signal.timeStr} • Gold {isDayTrade ? 'Day Trade' : 'Scalp'}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={handleCopyParameters}
            title="Copy entry parameters to clipboard for MT4/MT5"
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-700 text-xs font-semibold border border-sky-200 transition-colors"
          >
            {copied ? <CheckCheck className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>

          <button
            id="btn-audit-signal"
            onClick={onAnalyzeWithAi}
            disabled={isAiLoading}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white hover:bg-sky-50 text-slate-700 text-xs font-semibold border border-sky-200 transition-colors disabled:opacity-50 shadow-xs"
          >
            <Sparkles className={`w-3.5 h-3.5 text-sky-600 ${isAiLoading ? 'animate-spin' : ''}`} />
            <span>Audit</span>
          </button>
        </div>
      </div>

      {/* Main Signal Matrix */}
      <div className="p-4 space-y-4 flex-1">
        {/* Bias & Confluence Gauge */}
        <div className="bg-sky-50/50 border border-sky-100 p-3 rounded-xl">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Strategy Bias</span>
            <span
              className={`text-xs font-black uppercase tracking-wider ${
                isBuy ? 'text-emerald-700' : 'text-rose-700'
              }`}
            >
              {isBuy ? 'Institutional Demand Defense' : 'Institutional Supply Pool'} ({signal.confluenceScore}% Conf)
            </span>
          </div>
          <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${isBuy ? 'bg-emerald-500' : 'bg-rose-500'}`}
              style={{ width: `${signal.confluenceScore}%` }}
            ></div>
          </div>
        </div>

        {/* Advance Predictive Move Forecast Banner */}
        {signal.predictedMove && (
          <div className="p-3.5 rounded-xl bg-gradient-to-r from-violet-50 via-purple-50/70 to-indigo-50/50 border border-violet-200 text-violet-950 flex items-start gap-3 shadow-xs">
            <div className="w-8 h-8 rounded-xl bg-violet-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs font-bold text-sm">
              🔮
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between flex-wrap gap-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-violet-800 flex items-center gap-1.5">
                  Advance Direction Prediction • {signal.forecastHorizon || 'Next 1-3 Candles'}
                </span>
                {signal.anticipatedGainPips !== undefined && (
                  <span className="text-[10px] font-mono font-black bg-violet-200/90 text-violet-900 px-2 py-0.5 rounded-md">
                    {isBuy ? '+' : '-'}{signal.anticipatedGainPips} Pips Target
                  </span>
                )}
              </div>
              <p className="font-bold text-xs mt-1 text-slate-900 leading-snug">
                {signal.predictedMove}
              </p>
              {signal.advanceType && (
                <div className="mt-1.5 flex items-center gap-1.5">
                  <span className="text-[9px] font-extrabold uppercase tracking-wider text-violet-700 bg-white/90 px-2 py-0.5 rounded border border-violet-200">
                    Setup: {signal.advanceType.replace(/_/g, ' ')}
                  </span>
                  <span className="text-[9px] text-slate-500 font-medium">
                    Entered before expansion candle runs
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Real-Market Trigger Condition Banner */}
        {signal.triggerCondition && (
          <div className={`p-3 rounded-xl border flex items-start gap-2.5 ${
            isBuy ? 'bg-emerald-50 border-emerald-300 text-emerald-950' : 'bg-rose-50 border-rose-300 text-rose-950'
          }`}>
            <Zap className={`w-4 h-4 shrink-0 mt-0.5 ${isBuy ? 'text-emerald-600' : 'text-rose-600'}`} />
            <div>
              <span className="font-black uppercase tracking-wider text-[10px] block opacity-80">
                Institutional Entry Trigger
              </span>
              <p className="font-bold text-xs mt-0.5 leading-snug">{signal.triggerCondition}</p>
            </div>
          </div>
        )}

        {/* Action Advice (if available) */}
        {signal.actionAdvice && (
          <div className="p-2.5 rounded-xl bg-amber-50/80 border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
            <Zap className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-black uppercase tracking-wide text-[10px] text-amber-800 block">
                Trade Management Advice
              </span>
              <p className="mt-0.5 leading-relaxed">{signal.actionAdvice}</p>
            </div>
          </div>
        )}

        {/* Core Price Levels: Large, High-Contrast Entry, SL, TP1, TP2, TP3 */}
        <div className={`grid ${signal.takeProfit3 ? 'grid-cols-2 sm:grid-cols-3' : 'grid-cols-2'} gap-2.5`}>
          {/* Exact Entry Price */}
          <div className={`p-3 rounded-xl border ${isBuy ? 'bg-emerald-50/50 border-emerald-200' : 'bg-rose-50/50 border-rose-200'}`}>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
              Exact Entry Price
            </span>
            <div className={`text-xl font-mono font-black mt-0.5 ${isBuy ? 'text-emerald-700' : 'text-rose-700'}`}>
              ${signal.entryPrice.toFixed(2)}
            </div>
            <span className="text-[10px] text-slate-500 font-medium">Market Execution</span>
          </div>

          {/* Stop Loss & Spread Protection */}
          <div className="bg-rose-50/60 border border-rose-200 p-3 rounded-xl">
            <div className="flex items-center justify-between text-rose-600">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Stop Loss (SL)</span>
              <ShieldAlert className="w-3.5 h-3.5" />
            </div>
            <div className="text-xl font-mono font-black text-rose-700 mt-0.5">
              ${signal.stopLoss.toFixed(2)}
            </div>
            <div className="flex items-center gap-1.5 text-[10px] font-mono">
              <span className="text-rose-600 font-bold">-{riskPips} pips risk</span>
              {signal.spreadBufferPips && (
                <span className="text-slate-500 bg-white/80 px-1 py-0.2 rounded border border-rose-200">
                  +{signal.spreadBufferPips}p buffer
                </span>
              )}
            </div>
          </div>

          {/* TP 1 */}
          <div className="bg-sky-50/70 border border-sky-200 p-3 rounded-xl">
            <div className="flex items-center justify-between text-sky-600">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">TP 1 (1:1.5 RR)</span>
              <Target className="w-3.5 h-3.5" />
            </div>
            <div className="text-xl font-mono font-black text-sky-700 mt-0.5">
              ${signal.takeProfit1.toFixed(2)}
            </div>
            <span className="text-[10px] text-sky-600 font-bold font-mono">+{tp1Pips} pips (50% exit)</span>
          </div>

          {/* TP 2 */}
          <div className="bg-emerald-50/70 border border-emerald-200 p-3 rounded-xl">
            <div className="flex items-center justify-between text-emerald-600">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">TP 2 (1:3.0 RR)</span>
              <Target className="w-3.5 h-3.5" />
            </div>
            <div className="text-xl font-mono font-black text-emerald-700 mt-0.5">
              ${signal.takeProfit2.toFixed(2)}
            </div>
            <span className="text-[10px] text-emerald-600 font-bold font-mono">+{tp2Pips} pips (runner)</span>
          </div>

          {/* TP 3 (If Available) */}
          {signal.takeProfit3 && (
            <div className="col-span-2 sm:col-span-1 bg-indigo-50/70 border border-indigo-200 p-3 rounded-xl">
              <div className="flex items-center justify-between text-indigo-600">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">TP 3 (Swing Runner)</span>
                <Target className="w-3.5 h-3.5" />
              </div>
              <div className="text-xl font-mono font-black text-indigo-700 mt-0.5">
                ${signal.takeProfit3.toFixed(2)}
              </div>
              <span className="text-[10px] text-indigo-600 font-bold font-mono">+{tp3Pips} pips</span>
            </div>
          )}
        </div>

        {/* Break-Even & Live Running PnL Status */}
        <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 px-3.5 py-2.5 rounded-xl border border-sky-100 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Live Gold:</span>
            <span className="font-mono font-black text-slate-800">${currentPrice.toFixed(2)}</span>
            <ArrowRight className="w-3 h-3 text-slate-400" />
            <span
              className={`font-mono font-black px-2 py-0.5 rounded text-[11px] ${
                isProfit
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-rose-100 text-rose-800'
              }`}
            >
              {isProfit ? `+${livePips}` : livePips} pips
            </span>
          </div>
          <div className="flex items-center gap-2">
            {signal.breakEvenPrice && (
              <span className="text-[10px] text-amber-900 font-mono font-bold bg-amber-100 px-2 py-0.5 rounded border border-amber-300">
                BE Lock: ${signal.breakEvenPrice.toFixed(2)}
              </span>
            )}
            <span className="text-[11px] text-slate-600 font-mono font-bold bg-white px-2 py-0.5 rounded border border-slate-200">
              RR {signal.riskReward}
            </span>
          </div>
        </div>

        {/* Institutional 6-Point Confluence Checklist */}
        {signal.checklist && signal.checklist.length > 0 ? (
          <div className="p-3 bg-sky-50/60 border border-sky-200 rounded-xl">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-sky-900 uppercase tracking-wider block">
                Institutional 6-Point Confluence Checklist
              </span>
              <span className="text-[10px] font-bold font-mono text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                {signal.checklist.filter(c => c.passed).length}/{signal.checklist.length} Passed
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {signal.checklist.map((item, idx) => (
                <div
                  key={idx}
                  className={`p-2 rounded-lg border text-xs flex items-start gap-2 ${
                    item.passed ? 'bg-white/80 border-emerald-200' : 'bg-slate-50 border-slate-200 opacity-60'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5 ${
                      item.passed
                        ? 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                        : 'bg-slate-200 text-slate-500'
                    }`}
                  >
                    {item.passed ? '✓' : '—'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="font-bold text-slate-800 block text-[11px] truncate">{item.name}</span>
                    <span className="text-[10px] text-slate-500 block leading-tight">{item.details}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="p-3 bg-sky-50/60 border border-sky-200 rounded-xl">
            <span className="text-[10px] font-bold text-sky-800 uppercase tracking-wider block">
              Smart Money Strategy Confluences
            </span>
            <ul className="mt-2 space-y-1.5">
              {signal.confluences.map((conf, idx) => (
                <li key={idx} className="flex items-center text-xs gap-2 text-slate-700">
                  <div className="w-4 h-4 bg-emerald-100 border border-emerald-300 rounded-full flex items-center justify-center text-[10px] text-emerald-700 font-bold shrink-0">
                    ✓
                  </div>
                  <span>{conf}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Invalidation Rule Box */}
        {signal.invalidationRule && (
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-start gap-2">
            <ShieldAlert className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
            <div>
              <span className="font-black uppercase tracking-wider text-[10px] text-slate-700 block">
                Setup Invalidation Rule
              </span>
              <p className="mt-0.5 leading-snug text-[11px]">{signal.invalidationRule}</p>
            </div>
          </div>
        )}
      </div>

      {/* Execute Scalp Entry Action Buttons */}
      <div className="p-4 border-t border-sky-100 bg-sky-50/40 flex flex-col sm:flex-row gap-2">
        {onApplyToPlanner && (
          <button
            type="button"
            onClick={() => onApplyToPlanner(signal)}
            className="flex-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black py-2.5 px-3 rounded-xl shadow-sm text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Zap className="w-4 h-4 fill-current" />
            <span>Apply To Chart Tool</span>
          </button>
        )}
        <button
          id="btn-execute-scalp"
          onClick={handleExecute}
          className="flex-1 bg-sky-600 hover:bg-sky-500 text-white font-black py-2.5 px-3 rounded-xl shadow-md shadow-sky-600/20 text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-2 cursor-pointer"
        >
          {executed ? (
            <>
              <Check className="w-4 h-4 stroke-[3]" />
              <span>Real-Time Scalp Order Executed</span>
            </>
          ) : (
            <span>Execute Real-Time Scalp Entry</span>
          )}
        </button>
      </div>
    </div>
  );
};

