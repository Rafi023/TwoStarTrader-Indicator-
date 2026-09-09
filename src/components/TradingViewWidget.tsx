import React, { useEffect, useRef, useState } from 'react';
import { ExternalLink, RefreshCw, Zap, Shield, Maximize2, Radio } from 'lucide-react';

interface TradingViewWidgetProps {
  timeframe: '1m' | '5m' | '15m';
  symbol?: string;
}

export const TradingViewWidget: React.FC<TradingViewWidgetProps> = ({
  timeframe,
  symbol = 'OANDA:XAUUSD',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [key, setKey] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);

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

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    setIsLoading(true);
    // Clear previous widget
    container.innerHTML = '';

    // Create wrapper div required by TradingView embed
    const widgetContainer = document.createElement('div');
    widgetContainer.className = 'tradingview-widget-container__widget';
    widgetContainer.style.height = 'calc(100% - 32px)';
    widgetContainer.style.width = '100%';
    container.appendChild(widgetContainer);

    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
    script.type = 'text/javascript';
    script.async = true;
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol: symbol,
      interval: getTvInterval(timeframe),
      timezone: 'Etc/UTC',
      theme: 'light',
      style: '1',
      locale: 'en',
      enable_publishing: false,
      allow_symbol_change: true,
      hide_side_toolbar: false,
      withdateranges: true,
      save_image: true,
      details: true,
      hotlist: false,
      calendar: false,
      studies: [
        'STD;Supertrend',
        'STD;RSI',
        'STD;SMA',
      ],
      show_popup_button: true,
      popup_width: '1000',
      popup_height: '650',
      support_host: 'https://www.tradingview.com',
    });

    script.onload = () => {
      setIsLoading(false);
    };

    container.appendChild(script);

    return () => {
      if (container) {
        container.innerHTML = '';
      }
    };
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
            onClick={() => setKey((prev) => prev + 1)}
            title="Reload Chart Feed"
            className="flex items-center gap-1 text-[11px] font-medium text-slate-500 hover:text-sky-600 px-2 py-1 rounded-lg hover:bg-sky-50 transition-colors"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Reload</span>
          </button>

          <a
            href="https://www.tradingview.com/chart/?symbol=OANDA:XAUUSD"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-[11px] font-semibold text-sky-600 hover:text-sky-700 bg-sky-50 hover:bg-sky-100 px-2.5 py-1 rounded-lg transition-colors border border-sky-200"
          >
            <ExternalLink className="w-3 h-3" />
            <span>Open in TV</span>
          </a>
        </div>
      </div>

      {/* Real-time TradingView Chart Container */}
      <div className="relative flex-1 w-full min-h-[500px] bg-white">
        {isLoading && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/90 backdrop-blur-xs gap-2">
            <div className="w-8 h-8 rounded-full border-2 border-sky-500 border-t-transparent animate-spin" />
            <p className="text-xs font-semibold text-sky-700">Connecting to Real-Time TradingView Feed...</p>
            <p className="text-[10px] text-slate-400">Loading Gold Spot (XAU/USD) live streaming candles</p>
          </div>
        )}

        <div
          ref={containerRef}
          className="tradingview-widget-container w-full h-full"
          style={{ height: '540px' }}
        />
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
