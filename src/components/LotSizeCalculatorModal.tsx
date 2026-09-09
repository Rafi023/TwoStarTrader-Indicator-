import React, { useState } from 'react';
import { X, Calculator, ShieldCheck, DollarSign, Percent } from 'lucide-react';

interface LotSizeCalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPrice: number;
  defaultSlPips?: number;
}

export const LotSizeCalculatorModal: React.FC<LotSizeCalculatorModalProps> = ({
  isOpen,
  onClose,
  currentPrice,
  defaultSlPips = 20,
}) => {
  const [accountBalance, setAccountBalance] = useState<number>(10000);
  const [riskPercent, setRiskPercent] = useState<number>(1.0);
  const [stopLossPips, setStopLossPips] = useState<number>(defaultSlPips);

  if (!isOpen) return null;

  // Gold Position Sizing Math:
  // Risk Amount ($) = Balance * (Risk% / 100)
  // Gold: 1 standard lot (1.00) = 100 oz -> $1.00 price change ($0.10 pip = 1 pip) = $10 / pip
  // pipValuePerStandardLot = $10.00
  // Total Risk ($) = LotSize * StopLossPips * 10
  // LotSize = Risk Amount / (StopLossPips * 10)
  const riskAmount = (accountBalance * riskPercent) / 100;
  const calculatedLots = stopLossPips > 0 ? (riskAmount / (stopLossPips * 10)) : 0;
  const recommendedLot = Number(calculatedLots.toFixed(2));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 select-none">
      <div className="bg-white border border-sky-100 w-full max-w-lg rounded-xl shadow-xl overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-sky-100 bg-gradient-to-r from-sky-50/60 to-white">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-50 border border-sky-200 flex items-center justify-center text-sky-700 shadow-xs">
              <Calculator className="w-4 h-4 text-sky-600" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800 uppercase tracking-tight">Gold (XAU/USD) Lot Size Calculator</h3>
              <p className="text-xs text-slate-500">Precision institutional risk management for scalping</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-sky-50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Content */}
        <div className="p-6 space-y-4">
          
          {/* Account Balance */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1">
              <DollarSign className="w-3.5 h-3.5 text-emerald-600" /> Account Balance ($)
            </label>
            <input
              type="number"
              value={accountBalance}
              onChange={(e) => setAccountBalance(Math.max(10, Number(e.target.value)))}
              className="w-full bg-white border border-sky-200 rounded-lg px-3.5 py-2.5 text-sm font-mono text-slate-900 focus:outline-none focus:border-sky-500 shadow-xs"
            />
          </div>

          {/* Risk Percentage */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                <Percent className="w-3.5 h-3.5 text-sky-600" /> Risk per Scalp: {riskPercent}%
              </label>
              <span className="text-xs font-mono font-bold text-rose-600">
                ${riskAmount.toFixed(2)} Risk Capital
              </span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {[0.5, 1.0, 1.5, 2.0].map((pct) => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => setRiskPercent(pct)}
                  className={`py-2 rounded-lg text-xs font-bold transition-all border ${
                    riskPercent === pct
                      ? 'bg-sky-600 text-white border-sky-600 shadow-sm shadow-sky-600/20'
                      : 'bg-sky-50/50 text-slate-700 border-sky-200 hover:bg-sky-100'
                  }`}
                >
                  {pct}%
                </button>
              ))}
            </div>
          </div>

          {/* Stop Loss Pips */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Stop Loss Size in Pips (1 pip = $0.10)
            </label>
            <input
              type="number"
              value={stopLossPips}
              onChange={(e) => setStopLossPips(Math.max(1, Number(e.target.value)))}
              className="w-full bg-white border border-sky-200 rounded-lg px-3.5 py-2.5 text-sm font-mono text-slate-900 focus:outline-none focus:border-sky-500 shadow-xs"
            />
          </div>

          {/* Result Card */}
          <div className="p-4 rounded-xl bg-sky-50 border border-sky-200 text-center space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-sky-800">
              Recommended Position Size
            </span>
            <div className="text-3xl font-mono font-extrabold text-slate-900">
              {recommendedLot} <span className="text-base text-slate-600">Lots</span>
            </div>
            <p className="text-[11px] text-slate-600 font-mono font-medium">
              Max loss if SL is hit: <strong className="text-rose-600">-${(recommendedLot * stopLossPips * 10).toFixed(2)}</strong>
            </p>
          </div>

          <div className="flex items-start gap-2 p-3 rounded-lg bg-sky-50/40 border border-sky-100 text-[11px] text-slate-600">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span>
              Gold moves rapidly around London and New York opens. Professional scalpers rarely risk more than 1% to 1.5% per trade.
            </span>
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-sky-100 bg-sky-50/30 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-white bg-sky-600 hover:bg-sky-500 rounded-lg transition-colors shadow-xs"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
};
