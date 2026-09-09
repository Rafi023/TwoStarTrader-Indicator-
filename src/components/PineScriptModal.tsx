import React, { useState } from 'react';
import { generatePineScriptV5 } from '../utils/pineScriptGenerator';
import { X, Copy, Check, Code2, ExternalLink } from 'lucide-react';

interface PineScriptModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PineScriptModal: React.FC<PineScriptModalProps> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);
  const pineScriptCode = generatePineScriptV5();

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(pineScriptCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 select-none">
      <div className="bg-white border border-sky-100 w-full max-w-3xl rounded-xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-sky-100 bg-gradient-to-r from-sky-50/60 to-white">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-50 border border-sky-200 flex items-center justify-center text-sky-700 shadow-xs">
              <Code2 className="w-4 h-4 text-sky-600" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800 uppercase tracking-tight">TradingView Pine Script v5 Export</h3>
              <p className="text-xs text-slate-500">Full XAUUSD Smart Money Indicator script ready for Pine Editor</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-sky-50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step by step Instructions */}
        <div className="px-6 py-3 bg-sky-50/60 border-b border-sky-100 text-xs text-slate-700 flex flex-wrap items-center gap-4 font-medium">
          <span className="font-bold text-sky-800 uppercase tracking-wider text-[10px]">How to use in TradingView:</span>
          <span>1. Open <strong className="text-slate-900">tradingview.com</strong> on Gold (XAUUSD)</span>
          <span>2. Click <strong className="text-slate-900">Pine Editor</strong> at bottom</span>
          <span>3. Paste script & click <strong className="text-slate-900">Add to chart</strong></span>
        </div>

        {/* Code View Area */}
        <div className="p-6 overflow-y-auto flex-1 font-mono text-xs text-slate-800 bg-slate-50">
          <pre className="whitespace-pre overflow-x-auto leading-relaxed selection:bg-sky-200">
            {pineScriptCode}
          </pre>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-sky-100 bg-sky-50/30">
          <span className="text-xs text-slate-500">
            Includes: Order Blocks, FVGs, Buy/Sell Zones, Liquidity Sweeps, and Alert triggers
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white hover:bg-sky-50 border border-slate-200 rounded-lg transition-colors"
            >
              Close
            </button>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-sky-600 hover:bg-sky-500 rounded-lg transition-colors shadow-md shadow-sky-600/20 uppercase tracking-wider"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Copied to Clipboard!' : 'Copy Pine Script v5'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
