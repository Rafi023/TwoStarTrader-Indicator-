import React from 'react';
import { ScalpingSignal } from '../types';
import { History, TrendingUp, TrendingDown, Target, CheckCircle, XCircle, Clock } from 'lucide-react';

interface SignalHistoryTableProps {
  signals: ScalpingSignal[];
  onSelectSignal: (signal: ScalpingSignal) => void;
  activeSignalId?: string;
}

export const SignalHistoryTable: React.FC<SignalHistoryTableProps> = ({
  signals,
  onSelectSignal,
  activeSignalId,
}) => {
  // Compute overall performance statistics
  const totalSignals = signals.length;
  const wins = signals.filter(s => s.status === 'HIT_TP1' || s.status === 'HIT_TP2').length;
  const losses = signals.filter(s => s.status === 'STOPPED_OUT').length;
  const winRate = totalSignals > 0 ? Math.round((wins / Math.max(1, wins + losses)) * 100) : 0;
  const totalPips = signals.reduce((acc, s) => acc + (s.profitPips || 0), 0);

  return (
    <div id="signals-history-section" className="bg-white border border-sky-100 rounded-xl p-4 space-y-3 shadow-sm">
      
      {/* Header & Stats Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-sky-100 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-sky-50 border border-sky-200 flex items-center justify-center text-sky-700">
            <History className="w-4 h-4 text-sky-600" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-tight">Verified Scalp Entries Log</h3>
            <p className="text-[11px] text-slate-500">Tracked XAU/USD scalping signals with real-time execution</p>
          </div>
        </div>

        {/* Stats strip */}
        <div className="flex items-center gap-3 text-xs font-mono">
          <div className="bg-sky-50/60 px-3 py-1.5 rounded-lg border border-sky-100">
            <span className="text-slate-500">Win Rate: </span>
            <span className={`font-black ${winRate >= 65 ? 'text-emerald-700' : 'text-sky-700'}`}>
              {winRate}% ({wins}W / {losses}L)
            </span>
          </div>

          <div className="bg-sky-50/60 px-3 py-1.5 rounded-lg border border-sky-100">
            <span className="text-slate-500">Net: </span>
            <span className={`font-black ${totalPips >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
              {totalPips >= 0 ? `+${totalPips}` : totalPips} pips
            </span>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-sky-100 text-slate-400 uppercase tracking-wider text-[10px]">
              <th className="py-2 px-3">Time</th>
              <th className="py-2 px-3">Signal</th>
              <th className="py-2 px-3">Entry Price</th>
              <th className="py-2 px-3">Stop Loss</th>
              <th className="py-2 px-3">Take Profit (1 & 2)</th>
              <th className="py-2 px-3">Confluence</th>
              <th className="py-2 px-3">Outcome</th>
              <th className="py-2 px-3 text-right">PnL</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-sky-50 font-mono">
            {signals.slice().reverse().map((sig) => {
              const isBuy = sig.type.includes('BUY');
              const isSelected = activeSignalId === sig.id;

              return (
                <tr
                  key={sig.id}
                  onClick={() => onSelectSignal(sig)}
                  className={`cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-sky-100/60'
                      : 'hover:bg-sky-50/60'
                  }`}
                >
                  <td className="py-2.5 px-3 text-slate-500 flex items-center gap-1 font-sans">
                    <Clock className="w-3 h-3 text-slate-400" />
                    <span>{sig.timeStr}</span>
                  </td>

                  <td className="py-2.5 px-3">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`inline-flex items-center gap-1 font-sans font-bold px-2 py-0.5 rounded text-[10px] ${
                          isBuy
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        {isBuy ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        <span>{sig.type.replace('_', ' ')}</span>
                      </span>
                      {sig.signalGrade && (
                        <span className={`text-[9px] font-black px-1.5 py-0.2 rounded uppercase ${
                          sig.signalGrade === 'A+'
                            ? 'bg-amber-400 text-slate-950 font-extrabold'
                            : sig.signalGrade === 'A'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}>
                          {sig.signalGrade}
                        </span>
                      )}
                    </div>
                  </td>

                  <td className="py-2.5 px-3 font-bold text-slate-800">
                    ${sig.entryPrice.toFixed(2)}
                  </td>

                  <td className="py-2.5 px-3 text-rose-600 font-bold">
                    ${sig.stopLoss.toFixed(2)}
                  </td>

                  <td className="py-2.5 px-3 text-slate-700">
                    <span>${sig.takeProfit1.toFixed(2)}</span>
                    <span className="text-slate-400 mx-1">/</span>
                    <span className="text-emerald-700 font-bold">${sig.takeProfit2.toFixed(2)}</span>
                  </td>

                  <td className="py-2.5 px-3">
                    <span className="text-sky-800 font-bold">{sig.confluenceScore}%</span>
                    <span className="text-slate-400 text-[10px] ml-1">({sig.confluences.length}x)</span>
                  </td>

                  <td className="py-2.5 px-3">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-sans font-bold ${
                        sig.status === 'HIT_TP2'
                          ? 'bg-emerald-100 text-emerald-800'
                          : sig.status === 'HIT_TP1'
                          ? 'bg-sky-100 text-sky-800'
                          : sig.status === 'STOPPED_OUT'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {sig.status === 'HIT_TP2' ? (
                        <CheckCircle className="w-3 h-3 text-emerald-600" />
                      ) : sig.status === 'STOPPED_OUT' ? (
                        <XCircle className="w-3 h-3 text-rose-600" />
                      ) : (
                        <Target className="w-3 h-3 text-sky-600" />
                      )}
                      <span>{sig.status.replace('_', ' ')}</span>
                    </span>
                  </td>

                  <td
                    className={`py-2.5 px-3 text-right font-black ${
                      (sig.profitPips || 0) > 0
                        ? 'text-emerald-600'
                        : (sig.profitPips || 0) < 0
                        ? 'text-rose-600'
                        : 'text-slate-500'
                    }`}
                  >
                    {(sig.profitPips || 0) > 0 ? `+${sig.profitPips}` : sig.profitPips || 0} pips
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

    </div>
  );
};
