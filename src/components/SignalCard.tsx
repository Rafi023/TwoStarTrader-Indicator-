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
}

export const SignalCard: React.FC<SignalCardProps> = ({
  signal,
  currentPrice,
  onAnalyzeWithAi,
  isAiLoading,
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
          Analyzing Institutional Buy/Sell Zones, Order Blocks, and Fair Value Gaps. An exact scalping entry will be broadcasted once high confluence confirms.
        </p>
      </div>
    );
  }

  const isBuy = signal.type.includes('BUY');
  const riskPips = Math.abs(Math.round((signal.entryPrice - signal.stopLoss) * 10));
  const tp1Pips = Math.abs(Math.round((signal.takeProfit1 - signal.entryPrice) * 10));
  const tp2Pips = Math.abs(Math.round((signal.takeProfit2 - signal.entryPrice) * 10));

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
    const text = `XAU/USD ${signal.type} ENTRY\nEntry: $${signal.entryPrice.toFixed(2)}\nStop Loss: $${signal.stopLoss.toFixed(2)} (-${riskPips} pips)\nTP1: $${signal.takeProfit1.toFixed(2)} (+${tp1Pips} pips)\nTP2: $${signal.takeProfit2.toFixed(2)} (+${tp2Pips} pips)\nRisk/Reward: ${signal.riskReward}`;
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
            <div className="flex items-center gap-2">
              <span className={`text-sm font-black uppercase tracking-tight ${isBuy ? 'text-emerald-700' : 'text-rose-700'}`}>
                {signal.type.replace('_', ' ')}
              </span>
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
              <span>Broadcast {signal.timeStr} • Gold Scalp</span>
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

        {/* Core Price Levels: Large, High-Contrast Entry, SL, TP1, TP2 */}
        <div className="grid grid-cols-2 gap-2.5">
          {/* Exact Entry Price */}
          <div className={`p-3 rounded-xl border ${isBuy ? 'bg-emerald-50/50 border-emerald-200' : 'bg-rose-50/50 border-rose-200'}`}>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
              Exact Entry Price
            </span>
            <div className={`text-xl font-mono font-black mt-0.5 ${isBuy ? 'text-emerald-700' : 'text-rose-700'}`}>
              ${signal.entryPrice.toFixed(2)}
            </div>
            <span className="text-[10px] text-slate-500 font-medium">At Candle Close</span>
          </div>

          {/* Stop Loss */}
          <div className="bg-rose-50/60 border border-rose-200 p-3 rounded-xl">
            <div className="flex items-center justify-between text-rose-600">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Stop Loss (SL)</span>
              <ShieldAlert className="w-3.5 h-3.5" />
            </div>
            <div className="text-xl font-mono font-black text-rose-700 mt-0.5">
              ${signal.stopLoss.toFixed(2)}
            </div>
            <span className="text-[10px] text-rose-600 font-bold font-mono">-{riskPips} pips risk</span>
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
        </div>

        {/* Live Running PnL Status */}
        <div className="flex items-center justify-between bg-slate-50 px-3.5 py-2.5 rounded-xl border border-sky-100 text-xs">
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
          <span className="text-[11px] text-slate-600 font-mono font-bold bg-white px-2 py-0.5 rounded border border-slate-200">
            RR {signal.riskReward}
          </span>
        </div>

        {/* Scalp Checklist & Confluences */}
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
      </div>

      {/* Execute Scalp Entry Action Button */}
      <div className="p-4 border-t border-sky-100 bg-sky-50/40">
        <button
          id="btn-execute-scalp"
          onClick={handleExecute}
          className="w-full bg-sky-600 hover:bg-sky-500 text-white font-black py-3 rounded-xl shadow-md shadow-sky-600/20 text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-2"
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

