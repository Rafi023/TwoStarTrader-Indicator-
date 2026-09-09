import React, { useEffect, useState } from 'react';
import { ExternalLink, RefreshCw, Zap } from 'lucide-react';

interface TradingViewWidgetProps {
  timeframe: '1m' | '5m' | '15m';
  symbol?: string;
}

export const TradingViewWidget: React.FC<TradingViewWidgetProps> = ({
  timeframe,
  symbol = 'OANDA:XAUUSD',
}) => {
  const [key, setKey] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [hasError, setHasError] = useState<boolean>(false);

  // Map timeframe prop to TradingView interval format
  const getTvInterval = (tf: string) => {
    switch (tf) {
      case '1m':
        return '1';
      case '15m':
        return '15';
      case '5m':
      default:
        return '5';
    }
  };

  const tvInterval = getTvInterval(timeframe);
  const widgetConfig = {
    autosize: true,
    symbol: symbol,
    interval: tvInterval,
    timezone: 'Etc/UTC',
    theme: 'light',
    style: '1',
    locale: 'en',
    toolbar_bg: '#f8fafc',
    enable_publishing: false,
    withdateranges: true,
    hide_side_toolbar: false,
    allow_symbol_change: true,
    save_image: true,
    details: true,
    hotlist: false,
    calendar: false,
    studies: [
      'STD;Supertrend',
      'STD;RSI',
      'STD;SMA',
    ],
    support_host: 'https://www.tradingview.com',
  };

  const iframeSrc = `https://www.tradingview-widget.com/embed-widget/advanced-chart/?locale=en#${encodeURIComponent(
    JSON.stringify(widgetConfig)
  )}`;

  useEffect(() => {
    setIsLoading(true);
    setHasError(false);
  }, [timeframe, symbol, key]);

  return (
    <div className="bg-white border border-sky-100 rounded-xl shadow-sm flex flex-col h-full overflow-hidden">
      
      {/* Widget Header Strip */}
      <div className="flex flex-wrap items-center justify-between px-4 py-2.5 bg-gradient-to-r from-sky-50/80 to-white border-b border-sky-100 gap-2">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>TradingView Real-Time Live</span>
          </div>

          <span className="text-xs font-bold text-slate-700 font-mono">
            {symbol}
          </span>
          <span className="text-[11px] px-1.5 py-0.5 rounded bg-sky-100 text-sky-700 font-semibold uppercase">
            {timeframe}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setKey((prev) => prev + 1)}
            title="Reload Chart Feed"
            className="flex items-center gap-1 text-[11px] font-medium text-slate-500 hover:text-sky-600 px-2 py-1 rounded-lg hover:bg-sky-50 transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Reload</span>
          </button>

          <a
            href="https://www.tradingview.com/chart/?symbol=OANDA:XAUUSD"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-[11px] font-semibold text-sky-600 hover:text-sky-700 bg-sky-50 hover:bg-sky-100 px-2.5 py-1 rounded-lg transition-colors border border-sky-200 cursor-pointer"
          >
            <ExternalLink className="w-3 h-3" />
            <span>Open in TV</span>
          </a>
        </div>
      </div>

      {/* Real-time TradingView Chart Container with isolated iframe */}
      <div className="relative flex-1 w-full min-h-[520px] bg-slate-50">
        {isLoading && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/90 backdrop-blur-xs gap-2">
            <div className="w-8 h-8 rounded-full border-2 border-sky-500 border-t-transparent animate-spin" />
            <p className="text-xs font-semibold text-sky-700">Connecting to Real-Time TradingView Feed...</p>
            <p className="text-[10px] text-slate-400">Loading Gold Spot (XAU/USD) live streaming candles</p>
          </div>
        )}

        {hasError ? (
          <div className="flex flex-col items-center justify-center h-[520px] p-6 text-center gap-3">
            <p className="text-sm font-bold text-slate-700">TradingView Embed Unavailable</p>
            <p className="text-xs text-slate-500 max-w-sm">
              Your browser may restrict external iframe connections. You can view the real-time chart directly on TradingView or use our built-in Smart Money Concept chart.
            </p>
            <div className="flex items-center gap-2 mt-2">
              <button
                type="button"
                onClick={() => setKey((k) => k + 1)}
                className="px-3 py-1.5 bg-sky-600 text-white text-xs font-bold rounded-lg hover:bg-sky-500 transition-colors"
              >
                Retry
              </button>
              <a
                href="https://www.tradingview.com/chart/?symbol=OANDA:XAUUSD"
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 bg-slate-800 text-white text-xs font-bold rounded-lg hover:bg-slate-700 transition-colors"
              >
                Open TradingView
              </a>
            </div>
          </div>
        ) : (
          <iframe
            key={key}
            src={iframeSrc}
            title="TradingView Advanced Real-Time Chart"
            className="w-full h-[540px] border-0"
            onLoad={() => setIsLoading(false)}
            onError={() => {
              setIsLoading(false);
              setHasError(true);
            }}
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
            loading="lazy"
          />
        )}
      </div>

      {/* Quick Indicator Confluence Banner */}
      <div className="px-4 py-2 bg-sky-50/50 border-t border-sky-100 text-[11px] text-slate-600 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Zap className="w-3.5 h-3.5 text-sky-600" />
          <span className="font-semibold text-slate-700">Institutional Strategy:</span>
          <span>Aligned with Smart Money Supply/Demand Order Blocks & FVGs</span>
        </div>

        <div className="flex items-center gap-3 text-slate-500 font-mono text-[10px]">
          <span>Broker: OANDA Gold Feed</span>
          <span>•</span>
          <span>Zero Lag Tick Stream</span>
        </div>
      </div>

    </div>
  );
};
