import React, { useState } from 'react';
import { UserAccount } from '../types';
import {
  Clock,
  DollarSign,
  Phone,
  Mail,
  MessageSquare,
  RefreshCw,
  LogOut,
  Sparkles,
  Copy,
  Check,
  Play,
} from 'lucide-react';
import { TRADER_QUOTES } from '../data/quotes';

interface PendingApprovalViewProps {
  user: UserAccount;
  onRefreshUser: () => Promise<void>;
  onLogout: () => void;
  onEnterDemo?: () => void;
}

export const PendingApprovalView: React.FC<PendingApprovalViewProps> = ({
  user,
  onRefreshUser,
  onLogout,
  onEnterDemo,
}) => {
  const [isChecking, setIsChecking] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleCheckStatus = async () => {
    setIsChecking(true);
    setStatusMessage(null);
    try {
      await onRefreshUser();
      setStatusMessage('Status refreshed. If TwoStarTrader has activated your account, you will enter instantly.');
    } catch {
      setStatusMessage('Unable to reach server. Please try again.');
    } finally {
      setIsChecking(false);
    }
  };

  const whatsappMessage = encodeURIComponent(
    `Hello TwoStarTrader! I have registered for the XAU/USD Gold Scalper ($15 access).\nName: ${user.name}\nEmail: ${user.email}\nPhone: ${user.phone}\nPlease approve my account.`
  );

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-between p-4 sm:p-8">
      {/* Top Header */}
      <header className="max-w-4xl w-full mx-auto flex items-center justify-between py-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-400 font-black text-lg">
            ★
          </div>
          <div>
            <h1 className="text-base font-bold text-white tracking-tight">XAU/USD Gold Scalper</h1>
            <p className="text-xs text-slate-400">TwoStarTrader Institutional Engine</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onEnterDemo && (
            <button
              type="button"
              onClick={onEnterDemo}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-bold transition-all border border-amber-400/30 cursor-pointer"
              title="Explore the indicators in interactive demo mode"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Explore Demo</span>
            </button>
          )}

          <button
            type="button"
            onClick={onLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Log Out</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-4xl w-full mx-auto my-8 space-y-6">
        {/* Verification Status Card */}
        <div className="bg-slate-800/90 rounded-2xl border border-amber-500/40 p-6 sm:p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-700">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-400/50 flex items-center justify-center text-amber-400 shrink-0 animate-pulse">
                <Clock className="w-7 h-7" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-400/40">
                    Awaiting Manual Approval
                  </span>
                  <span className="text-xs text-slate-400">Fee: $15</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-white mt-1">
                  Payment Verification Pending
                </h2>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCheckStatus}
                disabled={isChecking}
                className="flex items-center justify-center gap-2 px-4 py-2.5 bg-sky-600 hover:bg-sky-500 active:scale-95 text-white text-xs font-bold rounded-xl transition-all shadow-md shrink-0 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} />
                <span>{isChecking ? 'Checking...' : 'Check Approval Status'}</span>
              </button>
            </div>
          </div>

          {statusMessage && (
            <div className="mt-4 p-3 rounded-xl bg-sky-950/60 border border-sky-600/40 text-sky-200 text-xs text-center font-semibold">
              {statusMessage}
            </div>
          )}

          {/* Account Details Box */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 my-6 p-4 rounded-xl bg-slate-900/80 border border-slate-700 text-xs">
            <div>
              <span className="text-slate-500 block">Registered Trader</span>
              <strong className="text-slate-200 font-bold text-sm">{user.name}</strong>
            </div>
            <div>
              <span className="text-slate-500 block">Registered Email</span>
              <strong className="text-slate-200 font-mono text-xs">{user.email}</strong>
            </div>
            <div>
              <span className="text-slate-500 block">WhatsApp / Phone</span>
              <strong className="text-slate-200 font-mono text-xs">{user.phone || 'Not provided'}</strong>
            </div>
          </div>

          {/* Interactive Demo Mode Option Banner */}
          {onEnterDemo && (
            <div className="my-5 p-4 rounded-xl bg-gradient-to-r from-amber-500/20 via-sky-500/20 to-amber-500/20 border border-amber-400/40 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div>
                <h4 className="text-xs font-bold text-amber-300 uppercase tracking-wide">
                  Want to explore right now?
                </h4>
                <p className="text-xs text-slate-300">
                  You can explore the live gold chart, MT5 price scale, SMC order blocks, and scalp planner in Demo Mode while TwoStarTrader confirms your payment.
                </p>
              </div>
              <button
                type="button"
                onClick={onEnterDemo}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-black text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 shrink-0 cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Launch Demo View</span>
              </button>
            </div>
          )}

          {/* Instructions on how to get access */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-300 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-emerald-400" />
              <span>How To Activate Your Account ($15 Lifetime Fee)</span>
            </h3>

            <p className="text-xs text-slate-300 leading-relaxed">
              To guarantee that every active member receives dedicated institutional support and to keep trading signals high-probability, all memberships are manually vetted and activated by{' '}
              <strong className="text-amber-400 font-bold">TwoStarTrader</strong>.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-700">
                <span className="w-6 h-6 rounded-full bg-amber-500 text-slate-950 font-bold inline-flex items-center justify-center text-xs mb-2">1</span>
                <h4 className="font-bold text-white mb-1">Send $15</h4>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Send $15 via EasyPaisa, JazzCash, Binance Pay (USDT), or Direct Bank.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-700">
                <span className="w-6 h-6 rounded-full bg-amber-500 text-slate-950 font-bold inline-flex items-center justify-center text-xs mb-2">2</span>
                <h4 className="font-bold text-white mb-1">Message Proof</h4>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Send payment screenshot or Transaction ID to TwoStarTrader on WhatsApp.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-700">
                <span className="w-6 h-6 rounded-full bg-emerald-500 text-slate-950 font-bold inline-flex items-center justify-center text-xs mb-2">3</span>
                <h4 className="font-bold text-white mb-1">TwoStarTrader Gives Permission</h4>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  TwoStarTrader enters your email (<strong className="text-amber-300 font-mono">{user.email}</strong>) and orders the website to give you permission to use the indicator now!
                </p>
              </div>
            </div>

            {/* Direct Contact Buttons */}
            <div className="pt-2 space-y-3">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                Contact TwoStarTrader Now:
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* WhatsApp 1 */}
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-emerald-700/30 hover:bg-emerald-700/40 border border-emerald-500/40 text-white transition-all group">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-emerald-500 text-white">
                      <Phone className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[10px] text-emerald-300 block font-bold">PRIMARY WHATSAPP</span>
                      <span className="text-xs font-mono font-bold">03110116709</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleCopy('03110116709', 'p1')}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                      title="Copy phone number"
                    >
                      {copiedKey === 'p1' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                    <a
                      href={`https://wa.me/923110116709?text=${whatsappMessage}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black flex items-center gap-1 transition-transform active:scale-95"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Chat</span>
                    </a>
                  </div>
                </div>

                {/* WhatsApp 2 */}
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-emerald-700/30 hover:bg-emerald-700/40 border border-emerald-500/40 text-white transition-all group">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-emerald-500 text-white">
                      <Phone className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[10px] text-emerald-300 block font-bold">SECONDARY WHATSAPP</span>
                      <span className="text-xs font-mono font-bold">03188154587</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleCopy('03188154587', 'p2')}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                      title="Copy phone number"
                    >
                      {copiedKey === 'p2' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                    <a
                      href={`https://wa.me/923188154587?text=${whatsappMessage}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black flex items-center gap-1 transition-transform active:scale-95"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Chat</span>
                    </a>
                  </div>
                </div>
              </div>

              {/* Email Button */}
              <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-700 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-sky-500/20 text-sky-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-bold">OFFICIAL EMAIL</span>
                    <span className="text-xs font-mono font-bold text-slate-200">khrafiullah2@gmail.com</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleCopy('khrafiullah2@gmail.com', 'email')}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                    title="Copy email"
                  >
                    {copiedKey === 'email' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                  <a
                    href={`mailto:khrafiullah2@gmail.com?subject=XAUUSD%20$15%20Payment%20Verification&body=${whatsappMessage}`}
                    className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold transition-colors cursor-pointer"
                  >
                    Send Email
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Motivational Discipline Quotes while waiting */}
        <div className="p-6 rounded-2xl bg-slate-800/40 border border-slate-700 space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider">
            <Sparkles className="w-4 h-4" />
            <span>While You Wait: The Golden Rule of Profitability</span>
          </div>
          <blockquote className="font-serif italic text-sm text-slate-300 leading-relaxed">
            "{TRADER_QUOTES[1].quote}"
          </blockquote>
          <span className="text-xs font-sans text-slate-400 block">— {TRADER_QUOTES[1].author}</span>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-4xl w-full mx-auto text-center text-xs text-slate-500 border-t border-slate-800 pt-4">
        Regard <strong>TwoStarTrader</strong> • khrafiullah2@gmail.com • 03110116709 • 03188154587
      </footer>
    </div>
  );
};
