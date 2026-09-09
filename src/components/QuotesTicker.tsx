import React, { useState, useEffect } from 'react';
import { TRADER_QUOTES } from '../data/quotes';
import { Sparkles, Quote, BookOpen, X, TrendingUp, ShieldAlert, ArrowRight } from 'lucide-react';

interface QuotesTickerProps {
  onOpenContact?: () => void;
}

export const QuotesTicker: React.FC<QuotesTickerProps> = ({ onOpenContact }) => {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [showAllQuotes, setShowAllQuotes] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIdx((prev) => (prev + 1) % TRADER_QUOTES.length);
    }, 9000);
    return () => clearInterval(timer);
  }, []);

  const activeQuote = TRADER_QUOTES[currentIdx];

  return (
    <>
      {/* Sleek Discipline Quotes Banner */}
      <div className="w-full bg-gradient-to-r from-amber-500/10 via-sky-500/10 to-amber-500/10 border-b border-amber-200/60 px-4 py-2 flex items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <span className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500 text-white font-black text-[10px] tracking-wider uppercase shadow-xs">
            <Sparkles className="w-3 h-3" />
            <span>Trader Mindset</span>
          </span>

          <p className="truncate text-slate-700 font-medium">
            <span className="font-serif italic">"{activeQuote.quote}"</span>
            <span className="text-slate-400 font-sans ml-2 text-[11px]">— {activeQuote.author}</span>
          </p>
        </div>

        <div className="shrink-0 flex items-center gap-2">
          <button
            onClick={() => setShowAllQuotes(true)}
            className="text-[11px] font-bold text-sky-700 hover:text-sky-800 hover:underline flex items-center gap-1 cursor-pointer"
          >
            <BookOpen className="w-3 h-3" />
            <span>All Quotes</span>
          </button>
        </div>
      </div>

      {/* Modal to Read All Profitability Quotes */}
      {showAllQuotes && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-white rounded-2xl border border-sky-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="bg-gradient-to-r from-slate-900 via-sky-950 to-slate-900 px-6 py-5 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
                  <Quote className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold">Stop Losing Money: The Trader's Rulebook</h2>
                  <p className="text-xs text-slate-300">Why retail traders fail & how to become profitable with TwoStarTrader</p>
                </div>
              </div>
              <button
                onClick={() => setShowAllQuotes(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quotes List */}
            <div className="p-6 max-h-[70vh] overflow-y-auto space-y-4">
              {TRADER_QUOTES.map((q, idx) => (
                <div
                  key={q.id}
                  className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-sky-50/40 hover:border-sky-300 transition-all space-y-2"
                >
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold text-slate-400">RULE #{idx + 1}</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                      {q.tag}
                    </span>
                  </div>
                  <p className="text-sm font-serif italic text-slate-800 leading-relaxed">
                    "{q.quote}"
                  </p>
                  <div className="text-xs font-sans font-bold text-sky-700">
                    — {q.author}
                  </div>
                </div>
              ))}

              {/* Call to action */}
              <div className="p-4 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 text-white shadow-md space-y-2">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-white" />
                  <h3 className="font-bold text-sm">Become a Profitable Trader for Just $15</h3>
                </div>
                <p className="text-xs text-amber-100 leading-relaxed">
                  Stop funding the broker. Equip your charts with institutional Smart Money Concepts, Order Blocks, and automated 1:2+ risk/reward targets.
                </p>
                {onOpenContact && (
                  <button
                    onClick={() => {
                      setShowAllQuotes(false);
                      onOpenContact();
                    }}
                    className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white text-amber-950 font-bold text-xs hover:bg-amber-50 transition-colors shadow-xs"
                  >
                    <span>Contact TwoStarTrader for Access</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 text-center text-xs text-slate-500">
              Regard <strong>TwoStarTrader</strong> • khrafiullah2@gmail.com • 03110116709 • 03188154587
            </div>
          </div>
        </div>
      )}
    </>
  );
};
