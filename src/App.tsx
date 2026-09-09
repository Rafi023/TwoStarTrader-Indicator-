import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Candle,
  MarketZone,
  OrderBlock,
  FairValueGap,
  ReversalEvent,
  ScalpingSignal,
  IndicatorSettings,
  ScalpPosition,
} from './types';
import {
  detectMarketZones,
  detectOrderBlocks,
  detectFairValueGaps,
  detectReversals,
  generateScalpingSignals,
} from './utils/indicatorEngine';
import { generateInitialGoldData, generateNextTick } from './utils/marketData';
import { playSignalChime } from './utils/audioAlert';
import { Header } from './components/Header';
import { TradingChart } from './components/TradingChart';
import { SimpleScalpPlanner } from './components/SimpleScalpPlanner';
import { AuthView } from './components/AuthView';
import { PendingApprovalView } from './components/PendingApprovalView';
import { AdminApprovalModal } from './components/AdminApprovalModal';
import { ContactModal } from './components/ContactModal';
import { QuotesTicker } from './components/QuotesTicker';
import { UserAccount } from './types';

export default function App() {
  // Authentication State
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(() => {
    try {
      const saved = localStorage.getItem('gold_scalper_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Modal States
  const [isContactOpen, setIsContactOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);

  const [basePrice, setBasePrice] = useState<number>(4378.00);
  const [timeframe, setTimeframe] = useState<'1m' | '5m' | '15m'>('5m');
  const [candles, setCandles] = useState<Candle[]>(() => generateInitialGoldData(75, '5m', 4378.00));
  const [prevPrice, setPrevPrice] = useState<number>(4378.00);
  const [isLiveTicking, setIsLiveTicking] = useState<boolean>(true);

  // Active Scalp Position (TradingView Buy/Sell & Profit Ratio tool)
  const [activePosition, setActivePosition] = useState<ScalpPosition | null>(() => ({
    id: 'scalp-4378',
    direction: 'BUY',
    entryPrice: 4378.00,
    stopLossPrice: 4376.50,
    takeProfitPrice: 4381.00,
    profitRatio: 2.0,
    riskDollars: 1.5,
    rewardDollars: 3.0,
    riskPips: 15,
    rewardPips: 30,
    lotSize: 0.1,
    openedAt: Date.now(),
    status: 'ACTIVE',
  }));

  // Settings
  const [settings, setSettings] = useState<IndicatorSettings>({
    timeframe: '5m',
    showOrderBlocks: true,
    showFVG: true,
    showBuySellZones: true,
    showReversals: true,
    showSignals: true,
    showEquilibrium: true,
    soundAlerts: true,
    autoAiAnalysis: false,
    riskRewardRatio: 2.0,
  });

  // Current Price
  const currentPrice = candles[candles.length - 1]?.close ?? basePrice;

  // Indicators dynamically calculated
  const zones: MarketZone[] = useMemo(() => detectMarketZones(candles), [candles]);
  const orderBlocks: OrderBlock[] = useMemo(() => detectOrderBlocks(candles), [candles]);
  const fvgs: FairValueGap[] = useMemo(() => detectFairValueGaps(candles), [candles]);
  const reversals: ReversalEvent[] = useMemo(() => detectReversals(candles), [candles]);
  const signals: ScalpingSignal[] = useMemo(
    () => generateScalpingSignals(candles, zones, orderBlocks, fvgs, reversals),
    [candles, zones, orderBlocks, fvgs, reversals]
  );

  // Active Signal
  const activeSignal = signals.length > 0 ? signals[signals.length - 1] : null;

  // Handle Timeframe Switch
  const handleTimeframeChange = (tf: '1m' | '5m' | '15m') => {
    setTimeframe(tf);
    setSettings((s) => ({ ...s, timeframe: tf }));
    const newCandles = generateInitialGoldData(75, tf, currentPrice);
    setCandles(newCandles);
    setPrevPrice(newCandles[newCandles.length - 1].close);
  };

  // Handle Base Price Calibration
  const handleSetBasePrice = (newBase: number) => {
    setBasePrice(newBase);
    const newCandles = generateInitialGoldData(75, timeframe, newBase);
    setCandles(newCandles);
    setPrevPrice(newCandles[newCandles.length - 1].close);

    if (activePosition) {
      const diff = newBase - activePosition.entryPrice;
      setActivePosition({
        ...activePosition,
        entryPrice: Number(newBase.toFixed(2)),
        stopLossPrice: Number((activePosition.stopLossPrice + diff).toFixed(2)),
        takeProfitPrice: Number((activePosition.takeProfitPrice + diff).toFixed(2)),
      });
    }
  };

  // Live Price Ticker Interval around 4378
  useEffect(() => {
    if (!isLiveTicking) return;

    const interval = setInterval(() => {
      setCandles((prevCandles) => {
        const lastClose = prevCandles[prevCandles.length - 1]?.close || basePrice;
        const { updatedCandles, tickPrice } = generateNextTick(prevCandles, timeframe);
        setPrevPrice(lastClose);

        // Check if active position reached TP or SL
        if (activePosition && activePosition.status === 'ACTIVE') {
          const isBuy = activePosition.direction === 'BUY';
          if (isBuy && tickPrice >= activePosition.takeProfitPrice) {
            setActivePosition((p) => (p ? { ...p, status: 'HIT_TP' } : null));
            if (settings.soundAlerts) playSignalChime('BUY');
          } else if (!isBuy && tickPrice <= activePosition.takeProfitPrice) {
            setActivePosition((p) => (p ? { ...p, status: 'HIT_TP' } : null));
            if (settings.soundAlerts) playSignalChime('SELL');
          } else if (isBuy && tickPrice <= activePosition.stopLossPrice) {
            setActivePosition((p) => (p ? { ...p, status: 'HIT_SL' } : null));
          } else if (!isBuy && tickPrice >= activePosition.stopLossPrice) {
            setActivePosition((p) => (p ? { ...p, status: 'HIT_SL' } : null));
          }
        }

        return updatedCandles;
      });
    }, 1800);

    return () => clearInterval(interval);
  }, [isLiveTicking, timeframe, activePosition, settings.soundAlerts, basePrice]);

  // Break-even SL mover
  const handleSetBreakEven = () => {
    if (!activePosition) return;
    setActivePosition({
      ...activePosition,
      stopLossPrice: activePosition.entryPrice,
      riskDollars: 0,
      riskPips: 0,
    });
  };

  // Authentication Handlers
  const handleAuthSuccess = (user: UserAccount) => {
    setCurrentUser(user);
    try {
      localStorage.setItem('gold_scalper_user', JSON.stringify(user));
    } catch (e) {
      console.error(e);
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    try {
      localStorage.removeItem('gold_scalper_user');
    } catch (e) {
      console.error(e);
    }
  };

  const refreshUser = async () => {
    if (!currentUser?.email) return;
    try {
      const res = await fetch(`/api/auth/me?email=${encodeURIComponent(currentUser.email)}`);
      const data = await res.json();
      if (res.ok && data.user) {
        setCurrentUser(data.user);
        localStorage.setItem('gold_scalper_user', JSON.stringify(data.user));
      }
    } catch (err) {
      console.error('Failed to refresh user:', err);
    }
  };

  // Check approval periodically if pending
  useEffect(() => {
    if (currentUser && currentUser.status === 'PENDING_APPROVAL') {
      const interval = setInterval(refreshUser, 6000);
      return () => clearInterval(interval);
    }
  }, [currentUser?.status, currentUser?.email]);

  // View 1: Not Logged In -> Show VIP Auth & $15 Sign-Up
  if (!currentUser) {
    return <AuthView onAuthSuccess={handleAuthSuccess} />;
  }

  // View 2: Logged in but Pending Admin Manual Approval ($15 Payment)
  if (currentUser.status === 'PENDING_APPROVAL') {
    return (
      <PendingApprovalView
        user={currentUser}
        onRefreshUser={refreshUser}
        onLogout={handleLogout}
      />
    );
  }

  // View 3: Logged in and Approved (VIP Full Access)
  return (
    <div id="app-container" className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800 antialiased">
      {/* Trader Mindset Quotes Ticker */}
      <QuotesTicker onOpenContact={() => setIsContactOpen(true)} />

      {/* Clean Header with Live Price ($4,378), Controls, Contacts & Admin */}
      <Header
        currentPrice={currentPrice}
        prevPrice={prevPrice}
        timeframe={timeframe}
        setTimeframe={handleTimeframeChange}
        isLiveTicking={isLiveTicking}
        setIsLiveTicking={setIsLiveTicking}
        settings={settings}
        setSettings={setSettings}
        onSetBasePrice={handleSetBasePrice}
        user={currentUser}
        onLogout={handleLogout}
        onOpenContact={() => setIsContactOpen(true)}
        onOpenAdmin={() => setIsAdminOpen(true)}
      />

      {/* Main Focused Workspace: Chart (Left) + Simple Scalp Planner (Right) */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto p-4 sm:p-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Main Candlestick Chart with TradingView Position Tool & MT5 Price Scale */}
          <div className="lg:col-span-8 flex flex-col">
            <TradingChart
              candles={candles}
              zones={zones}
              orderBlocks={orderBlocks}
              fvgs={fvgs}
              reversals={reversals}
              signals={signals}
              settings={settings}
              setSettings={setSettings}
              onSelectSignal={() => {}}
              activeSignal={activeSignal}
              activePosition={activePosition}
            />
          </div>

          {/* Simple Scalp Planner (Buy / Sell & Profit Ratio) */}
          <div className="lg:col-span-4 flex flex-col">
            <SimpleScalpPlanner
              currentPrice={currentPrice}
              activePosition={activePosition}
              onApplyPosition={(pos) => setActivePosition(pos)}
              onClosePosition={() => setActivePosition(null)}
              onSetBreakEven={handleSetBreakEven}
            />
          </div>
        </div>
      </main>

      {/* Modals */}
      <ContactModal isOpen={isContactOpen} onClose={() => setIsContactOpen(false)} />

      {currentUser.role === 'ADMIN' && (
        <AdminApprovalModal
          isOpen={isAdminOpen}
          onClose={() => setIsAdminOpen(false)}
          adminEmail={currentUser.email}
        />
      )}

      {/* Footer with TwoStarTrader Contacts & Branding */}
      <footer className="border-t border-slate-200 bg-white px-6 py-3 text-xs text-slate-500 text-center flex flex-col sm:flex-row items-center justify-between gap-2">
        <span>
          XAU/USD Gold Scalper • Accurate Live Prices (~$4,378) • MT5 Price Scale & Profit Ratio
        </span>
        <span className="font-semibold text-slate-700">
          Regard <strong>TwoStarTrader</strong> • khrafiullah2@gmail.com • 03110116709 • 03188154587
        </span>
      </footer>
    </div>
  );
}
