import React, { useState, useEffect } from 'react';
import {
  Activity,
  Volume2,
  VolumeX,
  Play,
  Pause,
  Sliders,
  Check,
  ShieldCheck,
  Phone,
  LogOut,
  User,
  Sparkles,
  RefreshCw,
  Zap,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import { getNextScheduledSignalTime } from '../utils/indicatorEngine';
import { IndicatorSettings, UserAccount, Mt5LiveMarketData } from '../types';

interface HeaderProps {
  currentPrice: number;
  prevPrice: number;
  timeframe: '1m' | '5m' | '15m';
  setTimeframe: (tf: '1m' | '5m' | '15m') => void;
  isLiveTicking: boolean;
  setIsLiveTicking: React.Dispatch<React.SetStateAction<boolean>>;
  settings: IndicatorSettings;
  setSettings: React.Dispatch<React.SetStateAction<IndicatorSettings>>;
  onSetBasePrice?: (price: number) => void;
  user?: UserAccount | null;
  onLogout?: () => void;
  onOpenContact?: () => void;
  onOpenAdmin?: () => void;
  pendingCount?: number;
  mt5Data?: Mt5LiveMarketData | null;
  mt5Offset?: number;
  onSetMt5Offset?: (offset: number) => void;
  onManualRefreshMt5?: () => Promise<void>;
}

export const Header: React.FC<HeaderProps> = ({
  currentPrice,
  prevPrice,
  timeframe,
  setTimeframe,
  isLiveTicking,
  setIsLiveTicking,
  settings,
  setSettings,
  onSetBasePrice,
  user,
  onLogout,
  onOpenContact,
  onOpenAdmin,
  pendingCount = 0,
  mt5Data,
  mt5Offset = 0,
  onSetMt5Offset,
  onManualRefreshMt5,
}) => {
  const [isEditingPrice, setIsEditingPrice] = useState(false);
  const [customPriceInput, setCustomPriceInput] = useState(currentPrice.toFixed(2));
  const [isSyncing, setIsSyncing] = useState(false);
  const priceDiff = currentPrice - prevPrice;

  useEffect(() => {
    setCustomPriceInput(currentPrice.toFixed(2));
  }, [currentPrice]);

  const handleApplyCustomPrice = (val: number) => {
    if (onSetBasePrice && !isNaN(val) && val > 0) {
      onSetBasePrice(val);
      setIsEditingPrice(false);
    }
  };

  const handleSyncToMt5 = async () => {
    if (onManualRefreshMt5) {
      setIsSyncing(true);
      try {
        await onManualRefreshMt5();
      } finally {
        setTimeout(() => setIsSyncing(false), 500);
      }
    }
  };

  const handleCalibrateMt5Price = (targetPrice: number) => {
    if (onSetMt5Offset && mt5Data && !isNaN(targetPrice) && targetPrice > 0) {
      const rawPrice = mt5Data.price - mt5Offset;
      const newOffset = Number((targetPrice - rawPrice).toFixed(2));
      onSetMt5Offset(newOffset);
      setIsEditingPrice(false);
    }
  };


  
  const [nextSignalMs, setNextSignalMs] = useState<number>(0);
  const [timeUntilNext, setTimeUntilNext] = useState<string>('');

  useEffect(() => {
    const updateCountdown = () => {
      const nextTime = getNextScheduledSignalTime(Date.now());
      setNextSignalMs(nextTime);
      const diff = nextTime - Date.now();
      if (diff <= 0) {
        setTimeUntilNext('GENERATING NOW...');
        return;
      }
      const h = Math.floor(diff / (1000 * 60 * 60));
      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const s = Math.floor((diff % (1000 * 60)) / 1000);
      
      const nextDate = new Date(nextTime);
      const exactTime = `${nextDate.getHours().toString().padStart(2, '0')}:${nextDate.getMinutes().toString().padStart(2, '0')}`;
      
      setTimeUntilNext(`${exactTime} (in ${h > 0 ? h + 'h ' : ''}${m}m ${s}s)`);
    };
    
    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header id="app-header" className="w-full flex flex-wrap items-center justify-between px-4 sm:px-6 py-2.5 border-b border-sky-100 bg-white shadow-xs select-none gap-3">
      {/* Left: Instrument & Live MT5 Price */}
      <div className="flex items-center gap-4 sm:gap-6">
        <div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Institutional Gold</span>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-black text-slate-900 tracking-tight">XAU/USD</h1>
            <span className="bg-amber-100 text-amber-900 text-[10px] px-2 py-0.5 rounded font-black border border-amber-300 flex items-center gap-1">
              <Zap className="w-2.5 h-2.5 text-amber-600 fill-amber-500" />
              <span>SPOT GOLD</span>
            </span>
          </div>
        </div>

        <div className="h-8 w-[1px] bg-slate-200 hidden sm:block"></div>

        {/* Live Price with Calibrate Dropdown */}
        <div className="relative flex items-center gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                MT5 Live Price
              </span>
              <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Real-Time</span>
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span
                className={`text-2xl font-mono font-black transition-colors ${
                  priceDiff > 0
                    ? 'text-emerald-600'
                    : priceDiff < 0
                    ? 'text-rose-600'
                    : 'text-slate-900'
                }`}
              >
                ${currentPrice.toFixed(2)}
              </span>

              {/* Price adjustment / MT5 Calibrate button */}
              <button
                onClick={() => setIsEditingPrice(!isEditingPrice)}
                className="px-2 py-1 bg-slate-100 hover:bg-sky-50 text-slate-700 hover:text-sky-700 text-xs font-bold rounded-lg border border-slate-200 transition-colors cursor-pointer flex items-center gap-1"
                title="Calibrate or sync with your MT5 terminal price"
              >
                <Sliders className="w-3 h-3 text-slate-500" />
                <span>{isEditingPrice ? 'Close' : 'MT5 Sync'}</span>
              </button>
            </div>
          </div>

          {/* MT5 Price Calibrator Dropdown */}
          {isEditingPrice && (
            <div className="absolute top-14 left-0 z-50 bg-white p-4 rounded-2xl border-2 border-sky-300 shadow-2xl w-80 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div>
                  <span className="text-xs font-black text-slate-900 block">
                    MT5 Price Synchronization
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Match with your MT5 broker quote
                  </span>
                </div>
                <button
                  onClick={handleSyncToMt5}
                  disabled={isSyncing}
                  className="p-1.5 rounded-lg bg-sky-50 text-sky-600 hover:bg-sky-100 border border-sky-200 transition-colors"
                  title="Force refresh live MT5 feed"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                </button>
              </div>

              {mt5Data && (
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1 text-xs">
                  <div className="flex justify-between text-slate-600 font-medium">
                    <span>Market Raw Spot:</span>
                    <span className="font-mono font-bold text-slate-800">
                      ${(mt5Data.price - mt5Offset).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-600 font-medium">
                    <span>Active Broker Offset:</span>
                    <span className="font-mono font-bold text-sky-600">
                      {mt5Offset >= 0 ? `+${mt5Offset.toFixed(2)}` : mt5Offset.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-600 font-medium">
                    <span>Active Display Price:</span>
                    <span className="font-mono font-black text-emerald-600">
                      ${currentPrice.toFixed(2)}
                    </span>
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-700 block">
                  Enter Price from your MT5 screen:
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    step="0.10"
                    value={customPriceInput}
                    onChange={(e) => setCustomPriceInput(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 focus:outline-hidden"
                    placeholder="e.g. 4336.50"
                  />
                  <button
                    onClick={() => handleCalibrateMt5Price(parseFloat(customPriceInput))}
                    className="px-3.5 py-1.5 bg-sky-600 text-white rounded-lg text-xs font-bold hover:bg-sky-500 transition-colors shrink-0 shadow-xs cursor-pointer"
                  >
                    Lock MT5
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[11px]">
                <button
                  type="button"
                  onClick={() => {
                    if (onSetMt5Offset) onSetMt5Offset(0);
                    if (mt5Data && onSetBasePrice) onSetBasePrice(mt5Data.price - mt5Offset);
                    setIsEditingPrice(false);
                  }}
                  className="text-slate-500 hover:text-slate-800 underline font-medium cursor-pointer"
                >
                  Reset to Default Spot
                </button>
                <span className="text-[10px] text-emerald-600 font-bold">
                  ● Real-time Live
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Live MT5 Bid / Ask / Spread Strip */}
        {mt5Data && (
          <div className="hidden xl:flex items-center gap-4 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 font-sans font-medium text-[11px]">Bid:</span>
              <span className="font-bold text-slate-800">${mt5Data.bid.toFixed(2)}</span>
            </div>
            <div className="h-3 w-[1px] bg-slate-200"></div>
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 font-sans font-medium text-[11px]">Ask:</span>
              <span className="font-bold text-slate-800">${mt5Data.ask.toFixed(2)}</span>
            </div>
            <div className="h-3 w-[1px] bg-slate-200"></div>
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 font-sans font-medium text-[11px]">Spread:</span>
              <span className="font-bold text-sky-600">{mt5Data.spreadPips} pips</span>
            </div>
          </div>
        )}
      </div>

      {/* Right: Timeframe, Live Feed Ticker & Sound */}
      <div className="flex items-center gap-3">

        {/* Next Signal Schedule Countdown */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-50 border border-indigo-200 shadow-xs mr-2">
           <Zap className="w-4 h-4 text-indigo-600 animate-pulse" />
           <div className="flex flex-col">
             <span className="text-[9px] font-black uppercase text-indigo-800 tracking-wider leading-none">Next Signal In</span>
             <span className="text-xs font-mono font-bold text-indigo-950 leading-none mt-0.5">{timeUntilNext}</span>
           </div>
        </div>

        {/* Timeframe selector */}
        <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs">
          {(['1m', '5m', '15m'] as const).map((tf) => (
            <button
              key={tf}
              id={`btn-timeframe-${tf}`}
              onClick={() => setTimeframe(tf)}
              className={`px-3 py-1 font-bold rounded-md transition-all cursor-pointer ${
                timeframe === tf
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              {tf.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Live Ticker Toggle */}
        <button
          id="btn-toggle-feed"
          onClick={() => setIsLiveTicking((prev) => !prev)}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
            isLiveTicking
              ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
              : 'bg-slate-100 text-slate-500 border-slate-200'
          }`}
          title={isLiveTicking ? 'Live Market Ticking' : 'Market Paused'}
        >
          {isLiveTicking ? (
            <>
              <Activity className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
              <span>MT5 Live</span>
            </>
          ) : (
            <>
              <Pause className="w-3.5 h-3.5 text-slate-400" />
              <span>Paused</span>
            </>
          )}
        </button>

        {/* Sound Alert Toggle */}
        <button
          id="btn-toggle-sound"
          onClick={() => setSettings((s) => ({ ...s, soundAlerts: !s.soundAlerts }))}
          className={`p-2 rounded-lg border transition-colors cursor-pointer ${
            settings.soundAlerts
              ? 'bg-sky-50 text-sky-700 border-sky-200 hover:bg-sky-100'
              : 'bg-white text-slate-400 border-slate-200 hover:text-slate-600'
          }`}
          title={settings.soundAlerts ? 'Sound alerts enabled' : 'Sound alerts muted'}
        >
          {settings.soundAlerts ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
        </button>

        <div className="h-6 w-[1px] bg-slate-200 hidden sm:block"></div>

        {/* Contact TwoStarTrader Button */}
        {onOpenContact && (
          <button
            onClick={onOpenContact}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold transition-all shadow-2xs cursor-pointer"
            title="TwoStarTrader Official Contacts: 03110116709, 03188154587"
          >
            <Phone className="w-3.5 h-3.5 text-amber-600" />
            <span className="hidden md:inline">Contact TwoStarTrader</span>
            <span className="md:hidden">Contact</span>
          </button>
        )}

        {/* Admin Console Button (Visible for TwoStarTrader) */}
        {user?.role === 'ADMIN' && onOpenAdmin && (
          <button
            onClick={onOpenAdmin}
            className={`relative flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm cursor-pointer ${
              pendingCount > 0
                ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 border border-amber-300 ring-2 ring-amber-400/60 shadow-md shadow-amber-500/20'
                : 'bg-slate-900 hover:bg-slate-800 text-amber-400 border border-amber-400/50 hover:shadow-amber-500/20'
            }`}
            title="Manage customer $15 approvals"
          >
            <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
            <span className="font-extrabold tracking-tight">👑 Admin Console</span>
            {pendingCount > 0 && (
              <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-black animate-pulse shadow-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                <span>{pendingCount} PENDING</span>
              </span>
            )}
          </button>
        )}

        {/* User Badge & Logout */}
        {user && onLogout && (
          <div className="flex items-center gap-2 pl-1">
            <div className="hidden lg:flex flex-col text-right">
              <span className="text-xs font-bold text-slate-800 leading-tight truncate max-w-[140px]">
                {user.role === 'ADMIN' ? 'TwoStarTrader' : user.name}
              </span>
              <span className={`text-[10px] font-black uppercase tracking-wider ${
                user.role === 'ADMIN' ? 'text-amber-600' : 'text-emerald-600'
              }`}>
                {user.role === 'ADMIN' ? '👑 Master Admin' : '✓ VIP Access ($15)'}
              </span>
            </div>

            <button
              onClick={onLogout}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 transition-colors cursor-pointer"
              title="Log Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
