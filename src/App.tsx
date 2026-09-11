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
  UserAccount,
  Mt5LiveMarketData,
} from './types';
import {
  detectMarketZones,
  detectOrderBlocks,
  detectFairValueGaps,
  detectReversals,
  generateScalpingSignals,
} from './utils/indicatorEngine';
import {
  generateInitialGoldData,
  generateNextTick,
  fetchLiveMt5Price,
  fetchLiveMt5Candles,
} from './utils/marketData';
import { playSignalChime } from './utils/audioAlert';
import { Header } from './components/Header';
import { TradingChart } from './components/TradingChart';
import { SimpleScalpPlanner } from './components/SimpleScalpPlanner';
import { SignalCard } from './components/SignalCard';
import { AuthView } from './components/AuthView';
import { PendingApprovalView } from './components/PendingApprovalView';
import { AdminApprovalModal } from './components/AdminApprovalModal';
import { ContactModal } from './components/ContactModal';
import { QuotesTicker } from './components/QuotesTicker';
import {
  clientCheckUserStatus,
  saveCurrentAuthUser,
  clearCurrentAuthUser,
  loadCurrentAuthUser,
  getLocalUsersDb,
  safeParseResponse,
  playRegistrationChime,
} from './utils/authClient';

export default function App() {
  // Authentication State
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(() => {
    try {
      const saved = loadCurrentAuthUser();
      if (saved) {
        if (saved.email?.trim().toLowerCase() === 'khrafiullah2@gmail.com') {
          saved.role = 'ADMIN';
          saved.status = 'APPROVED';
          saved.name = saved.name || 'TwoStarTrader';
        }
        return saved;
      }
      return null;
    } catch {
      return null;
    }
  });

  // Modal States
  const [isContactOpen, setIsContactOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);

  // Admin Real-Time Pending Approvals State (Updated each second)
  const [adminPendingCount, setAdminPendingCount] = useState<number>(() => {
    try {
      const local = getLocalUsersDb();
      return local.filter((u) => u.status === 'PENDING_APPROVAL').length;
    } catch {
      return 0;
    }
  });
  const [newPendingToast, setNewPendingToast] = useState<{
    name: string;
    email: string;
    time: number;
  } | null>(null);
  const prevAdminPendingCountRef = useRef<number | null>(null);

  // MT5 Broker Offset (e.g. +0.25 to align perfectly with user's specific MT5 broker)
  const [mt5Offset, setMt5Offset] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('gold_mt5_offset');
      return saved ? parseFloat(saved) : 0;
    } catch {
      return 0;
    }
  });

  const [mt5Data, setMt5Data] = useState<Mt5LiveMarketData | null>(null);
  const [basePrice, setBasePrice] = useState<number>(4336.50);
  const [timeframe, setTimeframe] = useState<'1m' | '5m' | '15m'>('5m');
  const [candles, setCandles] = useState<Candle[]>(() => generateInitialGoldData(75, '5m', 4336.50));
  const [prevPrice, setPrevPrice] = useState<number>(4336.50);
  const [isLiveTicking, setIsLiveTicking] = useState<boolean>(true);

  // Active Scalp Position (Only set when user explicitly executes / opens a live position)
  const [activePosition, setActivePosition] = useState<ScalpPosition | null>(null);

  // Settings - Pro Trader Clean Mode by default (Only Signals, TPs, and Live MT5 prices)
  const [settings, setSettings] = useState<IndicatorSettings>({
    timeframe: '5m',
    showOrderBlocks: false,
    showFVG: false,
    showBuySellZones: false,
    showReversals: false,
    showSignals: true,
    showEquilibrium: false,
    soundAlerts: true,
    autoAiAnalysis: false,
    riskRewardRatio: 2.0,
    tradeMode: 'ALL',
    signalBias: 'AUTO',
    showEMAs: false,
  });

  const [rightPanelTab, setRightPanelTab] = useState<'PLANNER' | 'SIGNAL'>('SIGNAL');

  // Current Price
  const currentPrice = candles[candles.length - 1]?.close ?? basePrice;

  // Initial Load: Fetch Live MT5 Price and Candles
  useEffect(() => {
    let isMounted = true;

    async function loadLiveMarket() {
      // Fetch live price
      const live = await fetchLiveMt5Price(mt5Offset);
      if (!isMounted) return;
      if (live) {
        setMt5Data(live);
        setBasePrice(live.price);
        setPrevPrice(live.price);
      }

      // Fetch live candles
      const liveCandles = await fetchLiveMt5Candles(timeframe, mt5Offset, 80);
      if (!isMounted) return;
      if (liveCandles && liveCandles.length > 0) {
        setCandles(liveCandles);
        const lastP = liveCandles[liveCandles.length - 1].close;
        setPrevPrice(lastP);
        setBasePrice(lastP);
      }
    }

    loadLiveMarket();

    return () => {
      isMounted = false;
    };
  }, []);

  // Indicators dynamically calculated
  const zones: MarketZone[] = useMemo(() => detectMarketZones(candles), [candles]);
  const orderBlocks: OrderBlock[] = useMemo(() => detectOrderBlocks(candles), [candles]);
  const fvgs: FairValueGap[] = useMemo(() => detectFairValueGaps(candles), [candles]);
  const reversals: ReversalEvent[] = useMemo(() => detectReversals(candles), [candles]);
  const signals: ScalpingSignal[] = useMemo(
    () => generateScalpingSignals(candles, zones, orderBlocks, fvgs, reversals, settings.tradeMode, settings.signalBias),
    [candles, zones, orderBlocks, fvgs, reversals, settings.tradeMode, settings.signalBias]
  );

  // Active Signal
  const activeSignal = signals.length > 0 ? signals[signals.length - 1] : null;

  // Handle Timeframe Switch
  const handleTimeframeChange = async (tf: '1m' | '5m' | '15m') => {
    setTimeframe(tf);
    setSettings((s) => ({ ...s, timeframe: tf }));

    const liveCandles = await fetchLiveMt5Candles(tf, mt5Offset, 80);
    if (liveCandles && liveCandles.length > 0) {
      setCandles(liveCandles);
      setPrevPrice(liveCandles[liveCandles.length - 1].close);
    } else {
      const newCandles = generateInitialGoldData(75, tf, currentPrice);
      setCandles(newCandles);
      setPrevPrice(newCandles[newCandles.length - 1].close);
    }
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

  // Handle MT5 Broker Calibration Offset
  const handleSetMt5Offset = (newOffset: number) => {
    const delta = newOffset - mt5Offset;
    setMt5Offset(newOffset);
    try {
      localStorage.setItem('gold_mt5_offset', newOffset.toString());
    } catch {}

    setBasePrice((p) => Number((p + delta).toFixed(2)));
    setCandles((prev) =>
      prev.map((c) => ({
        ...c,
        open: Number((c.open + delta).toFixed(2)),
        high: Number((c.high + delta).toFixed(2)),
        low: Number((c.low + delta).toFixed(2)),
        close: Number((c.close + delta).toFixed(2)),
      }))
    );

    if (mt5Data) {
      setMt5Data((prev) =>
        prev
          ? {
              ...prev,
              price: Number((prev.price + delta).toFixed(2)),
              bid: Number((prev.bid + delta).toFixed(2)),
              ask: Number((prev.ask + delta).toFixed(2)),
              high24h: Number((prev.high24h + delta).toFixed(2)),
              low24h: Number((prev.low24h + delta).toFixed(2)),
            }
          : null
      );
    }
  };

  // Manual Force Refresh
  const handleManualRefreshMt5 = async () => {
    const live = await fetchLiveMt5Price(mt5Offset);
    if (live) {
      setMt5Data(live);
      setBasePrice(live.price);
    }
    const liveCandles = await fetchLiveMt5Candles(timeframe, mt5Offset, 80);
    if (liveCandles && liveCandles.length > 0) {
      setCandles(liveCandles);
    }
  };

      // Unified Live Price Ticker: Syncs and ticks exactly every 1 second
  useEffect(() => {
    if (!isLiveTicking) return;
    let isMounted = true;
    
    const syncAndTick = async () => {
      try {
        const live = await fetchLiveMt5Price(mt5Offset);
        if (!isMounted || !live) return;
        
        setMt5Data(live);
        
        setCandles((prevCandles) => {
          const lastClose = prevCandles[prevCandles.length - 1]?.close || basePrice;
          const { updatedCandles, tickPrice: resolvedTick } = generateNextTick(
            prevCandles,
            timeframe,
            live.price
          );
          
          setPrevPrice(lastClose);

          if (activePosition && activePosition.status === 'ACTIVE') {
            const isBuy = activePosition.direction === 'BUY';
            if (isBuy && resolvedTick >= activePosition.takeProfitPrice) {
              setActivePosition((p) => (p ? { ...p, status: 'HIT_TP' } : null));
              if (settings.soundAlerts) playSignalChime('BUY');
            } else if (!isBuy && resolvedTick <= activePosition.takeProfitPrice) {
              setActivePosition((p) => (p ? { ...p, status: 'HIT_TP' } : null));
              if (settings.soundAlerts) playSignalChime('SELL');
            } else if (isBuy && resolvedTick <= activePosition.stopLossPrice) {
              setActivePosition((p) => (p ? { ...p, status: 'HIT_SL' } : null));
            } else if (!isBuy && resolvedTick >= activePosition.stopLossPrice) {
              setActivePosition((p) => (p ? { ...p, status: 'HIT_SL' } : null));
            }
          }

          return updatedCandles;
        });
      } catch (err) {
        // silent
      }
    };
    
    syncAndTick();
    const interval = setInterval(syncAndTick, 1000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [isLiveTicking, mt5Offset, timeframe, basePrice, settings, activePosition]);

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
    if (user.role === 'ADMIN') {
      setIsAdminOpen(true);
    }
    saveCurrentAuthUser(user);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    clearCurrentAuthUser();
  };

  const refreshUser = async () => {
    if (!currentUser?.email) return;
    try {
      const updated = await clientCheckUserStatus(currentUser.email);
      if (updated && updated.status !== currentUser.status) {
        setCurrentUser(updated);
      }
    } catch (err) {
      console.warn('Silent refresh check:', err);
    }
  };

  // 1-second real-time check for member approval
  useEffect(() => {
    if (currentUser && currentUser.status === 'PENDING_APPROVAL') {
      const interval = setInterval(refreshUser, 1000);
      return () => clearInterval(interval);
    }
  }, [currentUser?.status, currentUser?.email]);

  // 1-second real-time polling for pending approvals when Admin is logged in
  useEffect(() => {
    if (!currentUser || currentUser.role !== 'ADMIN') return;

    const checkPendingCount = async () => {
      try {
        const local = getLocalUsersDb();
        const localPending = local.filter((u) => u.status === 'PENDING_APPROVAL');

        const res = await fetch(`/api/admin/pending-count?adminEmail=${encodeURIComponent(currentUser.email)}`);
        const parsed = await safeParseResponse(res);
        let count = localPending.length;
        let latestUser: any = localPending[localPending.length - 1];

        if (parsed.ok && typeof parsed.data?.pendingCount === 'number') {
          count = Math.max(parsed.data.pendingCount, localPending.length);
          if (parsed.data.latestPending) {
            latestUser = parsed.data.latestPending;
          }
        }

        if (
          prevAdminPendingCountRef.current !== null &&
          count > prevAdminPendingCountRef.current
        ) {
          // New member registered! Play chime and show toast
          playRegistrationChime();
          if (latestUser) {
            setNewPendingToast({
              name: latestUser.name,
              email: latestUser.email,
              time: Date.now(),
            });
          }
        }
        prevAdminPendingCountRef.current = count;
        setAdminPendingCount(count);
      } catch (err) {
        // silent
      }
    };

    checkPendingCount();
    const interval = setInterval(checkPendingCount, 1000);
    return () => clearInterval(interval);
  }, [currentUser?.role, currentUser?.email]);

  const handleEnterDemo = () => {
    const demoUser: UserAccount = {
      id: 'usr-demo-trader',
      name: 'VIP Guest Trader',
      email: 'demo_trader@xauusd.vip',
      phone: '03110116709',
      role: 'USER',
      status: 'APPROVED',
      registeredAt: Date.now(),
      approvedAt: Date.now(),
      paymentProofNotes: 'VIP Demo Mode Access',
    };
    handleAuthSuccess(demoUser);
  };

  // View 1: Not Logged In -> Show VIP Auth & $15 Sign-Up
  if (!currentUser) {
    return <AuthView onAuthSuccess={handleAuthSuccess} onEnterDemo={handleEnterDemo} />;
  }

  // View 2: Logged in but Pending Admin Manual Approval ($15 Payment)
  if (currentUser.status === 'PENDING_APPROVAL') {
    return (
      <PendingApprovalView
        user={currentUser}
        onRefreshUser={refreshUser}
        onLogout={handleLogout}
        onEnterDemo={handleEnterDemo}
      />
    );
  }

  // View 3: Logged in and Approved (VIP Full Access)
  return (
    <div id="app-container" className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800 antialiased">
      {/* Trader Mindset Quotes Ticker */}
      <QuotesTicker onOpenContact={() => setIsContactOpen(true)} />

      {/* Clean Header with Live MT5 Price, Controls, Contacts & Admin */}
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
        mt5Data={mt5Data}
        mt5Offset={mt5Offset}
        onSetMt5Offset={handleSetMt5Offset}
        onManualRefreshMt5={handleManualRefreshMt5}
        pendingCount={adminPendingCount}
      />

      {/* Real-Time Floating Notification when Member Registers */}
      {newPendingToast && currentUser.role === 'ADMIN' && (
        <div className="fixed top-20 right-4 sm:right-6 z-50 bg-slate-950 text-white p-4 rounded-2xl border-2 border-amber-400 shadow-2xl flex items-center gap-3 animate-in slide-in-from-top-4 duration-300 max-w-md">
          <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-black text-lg shrink-0 animate-pulse shadow-md">
            ★
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 text-xs font-black text-amber-400 uppercase tracking-wide">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping inline-block" />
              <span>New Member Just Registered!</span>
            </div>
            <p className="text-xs text-slate-200 truncate font-semibold mt-0.5">
              <strong>{newPendingToast.name}</strong> ({newPendingToast.email})
            </p>
            <p className="text-[10px] text-slate-400">Awaiting your manual $15 approval</p>
          </div>
          <button
            onClick={() => {
              setIsAdminOpen(true);
              setNewPendingToast(null);
            }}
            className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-black text-xs rounded-xl shadow-md transition-all shrink-0 cursor-pointer"
          >
            Review Now
          </button>
          <button
            onClick={() => setNewPendingToast(null)}
            className="text-slate-400 hover:text-white p-1 cursor-pointer"
            title="Dismiss"
          >
            ✕
          </button>
        </div>
      )}

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

          {/* Simple Scalp Planner & Institutional Signal Matrix */}
          <div className="lg:col-span-4 flex flex-col space-y-3">
            {/* Top View Selector: Planner vs Confluence Signal Card */}
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => setRightPanelTab('PLANNER')}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                  rightPanelTab === 'PLANNER'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                ⚡ Scalp & Day Planner
              </button>
              <button
                type="button"
                onClick={() => setRightPanelTab('SIGNAL')}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  rightPanelTab === 'SIGNAL'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <span>🎯 Confluence Signal</span>
                {activeSignal && (
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                )}
              </button>
            </div>

            {rightPanelTab === 'PLANNER' ? (
              <SimpleScalpPlanner
                currentPrice={currentPrice}
                activePosition={activePosition}
                activeSignal={activeSignal}
                onApplyPosition={(pos) => setActivePosition(pos)}
                onClosePosition={() => setActivePosition(null)}
                onSetBreakEven={handleSetBreakEven}
              />
            ) : (
              <SignalCard
                signal={activeSignal}
                currentPrice={currentPrice}
                onAnalyzeWithAi={() => {}}
                isAiLoading={false}
                onApplyToPlanner={(sig) => {
                  const isSigBuy = sig.type.includes('BUY');
                  const slDist = Math.max(0.8, Math.abs(sig.entryPrice - sig.stopLoss));
                  const tpDist = Math.abs(sig.takeProfit2 - sig.entryPrice);
                  const ratio = slDist > 0 ? Number((tpDist / slDist).toFixed(1)) : 2.0;

                  setActivePosition({
                    id: `pos-${Date.now()}`,
                    direction: isSigBuy ? 'BUY' : 'SELL',
                    entryPrice: Number(sig.entryPrice.toFixed(2)),
                    stopLossPrice: Number(sig.stopLoss.toFixed(2)),
                    takeProfitPrice: Number(sig.takeProfit2.toFixed(2)),
                    profitRatio: ratio,
                    riskDollars: Number(slDist.toFixed(2)),
                    rewardDollars: Number(tpDist.toFixed(2)),
                    riskPips: sig.riskPips || Math.round(slDist * 10),
                    rewardPips: sig.rewardPips || Math.round(tpDist * 10),
                    lotSize: 0.1,
                    openedAt: Date.now(),
                    status: 'ACTIVE',
                  });
                  setRightPanelTab('PLANNER');
                }}
              />
            )}
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
          XAU/USD Gold Scalper • Live Real-Time MT5 Feed • Smart Money Order Blocks & Precision Zones
        </span>
        <span className="font-semibold text-slate-700">
          Owner <strong>TwoStarTrader</strong> • WhatsApp: 03110116709 • 03188154587
        </span>
      </footer>
    </div>
  );
}
