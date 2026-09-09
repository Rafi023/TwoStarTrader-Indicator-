import React, { useState } from 'react';
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
} from 'lucide-react';
import { IndicatorSettings, UserAccount } from '../types';

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
}) => {
  const [isEditingPrice, setIsEditingPrice] = useState(false);
  const [customPriceInput, setCustomPriceInput] = useState(currentPrice.toFixed(2));
  const priceDiff = currentPrice - prevPrice;

  const handleApplyCustomPrice = (val: number) => {
    if (onSetBasePrice && !isNaN(val) && val > 0) {
      onSetBasePrice(val);
      setIsEditingPrice(false);
    }
  };

  return (
    <header id="app-header" className="w-full flex items-center justify-between px-5 py-3 border-b border-sky-100 bg-white shadow-xs select-none">
      {/* Left: Instrument & Live Price */}
      <div className="flex items-center gap-6">
        <div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Gold Scalper</span>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-black text-slate-900 tracking-tight">XAU/USD</h1>
            <span className="bg-amber-100/70 text-amber-800 text-[10px] px-1.5 py-0.5 rounded font-bold border border-amber-200">
              GOLD SPOT
            </span>
          </div>
        </div>

        <div className="h-7 w-[1px] bg-slate-200"></div>

        {/* Live Price with Calibrate Dropdown */}
        <div className="relative flex items-center gap-3">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Live Price</span>
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

              {/* Price adjustment button */}
              {onSetBasePrice && (
                <button
                  onClick={() => setIsEditingPrice(!isEditingPrice)}
                  className="px-2 py-0.5 bg-slate-100 hover:bg-sky-50 text-slate-600 hover:text-sky-700 text-xs font-semibold rounded border border-slate-200 transition-colors cursor-pointer flex items-center gap-1"
                  title="Calibrate exact gold price (e.g. 4378.00)"
                >
                  <Sliders className="w-3 h-3 text-slate-500" />
                  <span>{isEditingPrice ? 'Close' : 'Adjust'}</span>
                </button>
              )}
            </div>
          </div>

          {/* Quick Price Calibrator Dropdown */}
          {isEditingPrice && onSetBasePrice && (
            <div className="absolute top-12 left-0 z-50 bg-white p-3.5 rounded-xl border border-sky-200 shadow-xl w-64 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800">
                  Calibrate Gold Price
                </span>
                <span className="text-[10px] font-bold text-sky-600">Active: 4378</span>
              </div>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  step="0.50"
                  value={customPriceInput}
                  onChange={(e) => setCustomPriceInput(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-800 focus:border-sky-500 focus:outline-hidden"
                  placeholder="e.g. 4378.00"
                />
                <button
                  onClick={() => handleApplyCustomPrice(parseFloat(customPriceInput))}
                  className="px-3 py-1.5 bg-sky-600 text-white rounded-lg text-xs font-bold hover:bg-sky-500 transition-colors"
                >
                  Set
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {[4378.0, 4378.5, 4380.0, 4375.0].map((preset) => (
                  <button
                    key={preset}
                    onClick={() => {
                      setCustomPriceInput(preset.toFixed(2));
                      handleApplyCustomPrice(preset);
                    }}
                    className="px-2 py-1 bg-slate-50 hover:bg-sky-50 text-[11px] font-mono font-bold rounded-md text-slate-700 border border-slate-200 hover:border-sky-300 transition-colors"
                  >
                    ${preset.toFixed(1)}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right: Timeframe, Live Feed Ticker & Sound */}
      <div className="flex items-center gap-3">
        {/* Timeframe selector */}
        <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs">
          {(['1m', '5m', '15m'] as const).map((tf) => (
            <button
              key={tf}
              id={`btn-timeframe-${tf}`}
              onClick={() => setTimeframe(tf)}
              className={`px-3 py-1 font-bold rounded-md transition-all ${
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
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border transition-all ${
            isLiveTicking
              ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
              : 'bg-slate-100 text-slate-500 border-slate-200'
          }`}
          title={isLiveTicking ? 'Live Market Ticking' : 'Market Paused'}
        >
          {isLiveTicking ? (
            <>
              <Activity className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
              <span>Live Tick</span>
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
          className={`p-2 rounded-lg border transition-colors ${
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
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-amber-400 border border-amber-400/40 text-xs font-bold transition-all shadow-xs cursor-pointer"
            title="Manage $15 user approvals"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
            <span>Admin Approvals</span>
          </button>
        )}

        {/* User Badge & Logout */}
        {user && onLogout && (
          <div className="flex items-center gap-2 pl-1">
            <div className="hidden lg:flex flex-col text-right">
              <span className="text-xs font-bold text-slate-800 leading-tight truncate max-w-[120px]">
                {user.name}
              </span>
              <span className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider">
                ✓ VIP Access ($15)
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
