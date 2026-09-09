import React, { useState } from 'react';
import { UserAccount } from '../types';
import {
  ShieldCheck,
  DollarSign,
  Phone,
  Mail,
  Lock,
  User,
  Quote,
  MessageSquare,
  ArrowRight,
  AlertCircle,
  Play,
  Copy,
  Check,
} from 'lucide-react';
import { TRADER_QUOTES } from '../data/quotes';

interface AuthViewProps {
  onAuthSuccess: (user: UserAccount) => void;
  onEnterDemo?: () => void;
}

export const AuthView: React.FC<AuthViewProps> = ({ onAuthSuccess, onEnterDemo }) => {
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>('signup');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Form Fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');

  // Quotes rotation index
  const [quoteIdx, setQuoteIdx] = useState(0);

  const cleanEmail = email.trim().toLowerCase();
  const isAdminEmail = cleanEmail === 'khrafiullah2@gmail.com';

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleAdminDirectAccess = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'khrafiullah2@gmail.com', password: password || 'TwoStarTrader' }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Admin login failed');
      }
      onAuthSuccess(data.user);
    } catch (err: any) {
      setErrorMessage(err.message || 'Admin login error');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setLoading(true);

    try {
      // If admin email, always use direct admin authentication
      if (isAdminEmail) {
        await handleAdminDirectAccess();
        return;
      }

      const endpoint = activeTab === 'signup' ? '/api/auth/register' : '/api/auth/login';
      const payload =
        activeTab === 'signup'
          ? { name, email, phone, password, paymentProofNotes: paymentNotes }
          : { email, password };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed. Please try again.');
      }

      onAuthSuccess(data.user);
    } catch (err: any) {
      setErrorMessage(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleAdminQuickLogin = async () => {
    setEmail('khrafiullah2@gmail.com');
    await handleAdminDirectAccess();
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-amber-500 selection:text-slate-950">
      {/* Top Banner / Navbar */}
      <header className="w-full border-b border-slate-800 bg-slate-900/60 backdrop-blur-md px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-400 font-black text-xl shadow-xs">
            ★
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-black tracking-tight text-white">XAU/USD Gold Scalper</h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500 text-slate-950">
                VIP $15 ACCESS
              </span>
            </div>
            <p className="text-xs text-slate-400">Institutional SMC Engine by TwoStarTrader</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {onEnterDemo && (
            <button
              type="button"
              onClick={onEnterDemo}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 hover:text-amber-200 text-xs font-bold transition-all border border-amber-400/40 cursor-pointer"
              title="Explore indicator in live demo mode"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Explore Demo Mode</span>
            </button>
          )}

          {/* Contacts in Navbar */}
          <div className="hidden sm:flex items-center gap-4 text-xs font-mono">
            <div className="hidden md:flex items-center gap-2 text-slate-400">
              <Mail className="w-3.5 h-3.5 text-sky-400" />
              <span>khrafiullah2@gmail.com</span>
            </div>
            <div className="flex items-center gap-2 text-slate-300">
              <Phone className="w-3.5 h-3.5 text-emerald-400" />
              <a href="https://wa.me/923110116709" target="_blank" rel="noreferrer" className="hover:text-emerald-400 underline">
                03110116709
              </a>
              <span>•</span>
              <a href="https://wa.me/923188154587" target="_blank" rel="noreferrer" className="hover:text-emerald-400 underline">
                03188154587
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* Main Grid: Value Proposition & Quotes (Left) + Sign Up / Login Form (Right) */}
      <main className="max-w-7xl w-full mx-auto p-4 sm:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center my-auto">
        {/* Left Column: Why buy this? Quotes & Stop Losing Money */}
        <div className="lg:col-span-7 space-y-6">
          {/* Prominent Price Banner */}
          <div className="p-5 rounded-2xl bg-gradient-to-r from-amber-500/20 via-amber-400/10 to-transparent border-2 border-amber-400/50 shadow-xl space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500 text-slate-950 text-xs font-black uppercase tracking-wider shadow-sm">
                <DollarSign className="w-4 h-4" />
                <span>Price: $15 USD Lifetime Access</span>
              </div>
              <span className="text-xs font-mono text-amber-300 font-bold">
                No Monthly Fees • One-Time Payment
              </span>
            </div>

            <h3 className="text-lg sm:text-xl font-black text-white tracking-tight pt-1">
              To Get Access: Contact Owner <span className="text-amber-400">TwoStarTrader</span>
            </h3>

            <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
              Pay $15 to owner TwoStarTrader via WhatsApp or Email. Create your account below, and TwoStarTrader will manually enter your customer email into the website to grant you immediate permission to use the indicator!
            </p>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight">
            Stop Losing Money on Gold. <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-amber-200 to-sky-400">
              Trade With Institutional Edge.
            </span>
          </h2>

          {/* Hard-hitting truth & quotes card */}
          <div className="p-6 rounded-2xl bg-slate-900/80 border border-amber-500/30 shadow-xl space-y-4 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                <Quote className="w-4 h-4" />
                <span>The Golden Scalping Truth</span>
              </span>
              <div className="flex items-center gap-1">
                {TRADER_QUOTES.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setQuoteIdx(i)}
                    className={`h-2 rounded-full transition-all cursor-pointer ${
                      quoteIdx === i ? 'w-5 bg-amber-400' : 'w-2 bg-slate-700'
                    }`}
                  />
                ))}
              </div>
            </div>

            <blockquote className="text-sm sm:text-base font-serif italic text-slate-200 leading-relaxed min-h-[70px]">
              "{TRADER_QUOTES[quoteIdx].quote}"
            </blockquote>

            <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-800">
              <span className="text-sky-400 font-bold">— {TRADER_QUOTES[quoteIdx].author}</span>
              <button
                type="button"
                onClick={() => setQuoteIdx((prev) => (prev + 1) % TRADER_QUOTES.length)}
                className="text-slate-400 hover:text-white transition-colors cursor-pointer font-bold"
              >
                Next Quote →
              </button>
            </div>
          </div>

          {/* 3 Step Access Flow */}
          <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-3 text-xs">
            <span className="text-xs font-bold text-amber-400 uppercase tracking-wider block">
              How to Get Access in 3 Simple Steps:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
                <span className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 font-black inline-flex items-center justify-center text-[10px]">1</span>
                <div className="font-bold text-white">Contact & Pay $15</div>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Message TwoStarTrader on WhatsApp or Email and send $15.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
                <span className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 font-black inline-flex items-center justify-center text-[10px]">2</span>
                <div className="font-bold text-white">Create Your Account</div>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Fill in your name, email, and password in the form on the right.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
                <span className="w-5 h-5 rounded-full bg-emerald-500 text-slate-950 font-black inline-flex items-center justify-center text-[10px]">3</span>
                <div className="font-bold text-white">TwoStarTrader Approves</div>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  TwoStarTrader enters your email to give you instant permission to use the indicator!
                </p>
              </div>
            </div>
          </div>

          {/* Contact Direct Strip */}
          <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="space-y-1">
              <span className="text-slate-400 block font-medium">Owner TwoStarTrader Direct Channels:</span>
              <div className="flex flex-wrap items-center gap-3 font-mono text-xs">
                <button
                  type="button"
                  onClick={() => handleCopy('khrafiullah2@gmail.com', 'c_email')}
                  className="flex items-center gap-1 text-amber-400 hover:text-amber-300 font-bold cursor-pointer"
                  title="Click to copy email"
                >
                  {copiedKey === 'c_email' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>khrafiullah2@gmail.com</span>
                </button>
                <span className="text-slate-600">•</span>
                <button
                  type="button"
                  onClick={() => handleCopy('03110116709', 'c_p1')}
                  className="flex items-center gap-1 text-emerald-400 hover:text-emerald-300 font-bold cursor-pointer"
                  title="Click to copy phone"
                >
                  {copiedKey === 'c_p1' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>03110116709</span>
                </button>
                <span className="text-slate-600">•</span>
                <button
                  type="button"
                  onClick={() => handleCopy('03188154587', 'c_p2')}
                  className="flex items-center gap-1 text-emerald-400 hover:text-emerald-300 font-bold cursor-pointer"
                  title="Click to copy phone"
                >
                  {copiedKey === 'c_p2' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>03188154587</span>
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <a
                href="https://wa.me/923110116709?text=Hello%20TwoStarTrader,%20I%20want%20to%20get%20access%20to%20the%20XAUUSD%20Gold%20Scalper%20indicator%20and%20pay%20the%20$15%20fee."
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-black transition-all flex items-center gap-1.5 shadow-md cursor-pointer"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>WhatsApp (03110116709)</span>
              </a>
              <a
                href="https://wa.me/923188154587?text=Hello%20TwoStarTrader,%20I%20want%20to%20get%20access%20to%20the%20XAUUSD%20Gold%20Scalper%20indicator%20and%20pay%20the%20$15%20fee."
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-black transition-all flex items-center gap-1.5 shadow-md cursor-pointer"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>WhatsApp (03188154587)</span>
              </a>
            </div>
          </div>
        </div>

        {/* Right Column: Sign Up / Login Form */}
        <div className="lg:col-span-5">
          <div className="bg-slate-900 rounded-3xl border border-slate-800 shadow-2xl p-6 sm:p-8 space-y-5">
            {/* Price Badge on Top of Form */}
            <div className="p-3 rounded-xl bg-amber-500/15 border border-amber-400/40 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-amber-400 shrink-0" />
                <div>
                  <span className="font-black text-amber-300 uppercase tracking-wide block">Indicator Price: $15</span>
                  <span className="text-[10px] text-slate-400">Owner TwoStarTrader manually approves your email</span>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-md bg-amber-500 text-slate-950 font-black text-[10px] uppercase">
                Lifetime
              </span>
            </div>

            {/* Tab Switcher */}
            <div className="flex rounded-xl bg-slate-950 p-1 border border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('signup');
                  setErrorMessage(null);
                }}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  activeTab === 'signup'
                    ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Create Account ($15)
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('login');
                  setErrorMessage(null);
                }}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  activeTab === 'login'
                    ? 'bg-sky-600 text-white shadow-md font-black'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Sign In
              </button>
            </div>

            {errorMessage && (
              <div className="p-3.5 rounded-xl bg-rose-950/70 border border-rose-600/50 text-rose-200 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {activeTab === 'signup' && (
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Full Name</label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Tariq Khan"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-600 focus:border-amber-500 focus:outline-hidden"
                    />
                  </div>
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-300">Email Address</label>
                  {!isAdminEmail && (
                    <button
                      type="button"
                      onClick={() => setEmail('khrafiullah2@gmail.com')}
                      className="text-[11px] text-amber-400 hover:text-amber-300 font-semibold cursor-pointer underline"
                      title="Enter Admin Gmail"
                    >
                      Enter Admin Gmail
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Mail className={`w-4 h-4 absolute left-3 top-3 ${isAdminEmail ? 'text-amber-400' : 'text-slate-500'}`} />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="trader@example.com or khrafiullah2@gmail.com"
                    className={`w-full bg-slate-950 border rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-hidden transition-all ${
                      isAdminEmail
                        ? 'border-amber-400 ring-2 ring-amber-400/30 text-amber-300 font-bold'
                        : 'border-slate-800 focus:border-amber-500'
                    }`}
                  />
                </div>

                {/* Instant Recognition when khrafiullah2@gmail.com is entered */}
                {isAdminEmail && (
                  <div className="mt-2.5 p-3 rounded-xl bg-gradient-to-r from-amber-500/25 to-amber-400/10 border-2 border-amber-400 text-xs space-y-2 animate-fadeIn">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 font-black text-amber-300">
                        <ShieldCheck className="w-4 h-4 text-amber-400" />
                        <span>Master Admin: TwoStarTrader</span>
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 font-black text-[10px] tracking-wider uppercase">
                        Admin Access
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300 leading-snug">
                      Gmail <strong className="text-amber-300 font-mono">khrafiullah2@gmail.com</strong> is verified as the system owner. Click below or press Enter to immediately access the indicator and customer approval console.
                    </p>
                    <button
                      type="button"
                      onClick={handleAdminDirectAccess}
                      disabled={loading}
                      className="w-full py-2.5 px-3 rounded-lg bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black text-xs shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-98"
                    >
                      <ShieldCheck className="w-4 h-4" />
                      <span>Enter Website As Admin Now</span>
                    </button>
                  </div>
                )}
              </div>

              {activeTab === 'signup' && !isAdminEmail && (
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">
                    WhatsApp / Phone Number <span className="text-amber-400">*</span>
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                    <input
                      type="tel"
                      required={!isAdminEmail}
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="03110116709 or +92..."
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-600 focus:border-amber-500 focus:outline-hidden font-mono"
                    />
                  </div>
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    TwoStarTrader will verify your $15 payment through WhatsApp.
                  </span>
                </div>
              )}

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Password {isAdminEmail && <span className="text-amber-400 font-normal">(Optional for Admin)</span>}
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="password"
                    required={!isAdminEmail}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={isAdminEmail ? "Enter any password or leave blank" : "••••••••"}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-600 focus:border-amber-500 focus:outline-hidden"
                  />
                </div>
              </div>

              {activeTab === 'signup' && !isAdminEmail && (
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">
                    Payment Note / Transaction ID (Optional)
                  </label>
                  <input
                    type="text"
                    value={paymentNotes}
                    onChange={(e) => setPaymentNotes(e.target.value)}
                    placeholder="e.g. EasyPaisa / JazzCash Trx ID or Binance Pay"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:border-amber-500 focus:outline-hidden"
                  />
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className={`w-full py-3 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg ${
                  isAdminEmail
                    ? 'bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 shadow-amber-500/30 ring-2 ring-amber-400'
                    : activeTab === 'signup'
                    ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/20'
                    : 'bg-sky-600 hover:bg-sky-500 text-white shadow-sky-600/20'
                } disabled:opacity-50`}
              >
                {loading ? (
                  <span>Authenticating...</span>
                ) : isAdminEmail ? (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Enter As Admin (TwoStarTrader)</span>
                  </>
                ) : activeTab === 'signup' ? (
                  <>
                    <span>Submit & Request $15 Access</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                ) : (
                  <>
                    <span>Sign In to Scalper</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              {/* Tab Switch prompt under submit button */}
              {activeTab === 'signup' ? (
                <div className="text-center text-xs text-slate-400 pt-1">
                  Already registered?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('login');
                      setErrorMessage(null);
                    }}
                    className="text-sky-400 hover:text-sky-300 font-bold underline cursor-pointer"
                  >
                    Sign In here
                  </button>
                </div>
              ) : (
                <div className="text-center text-xs text-slate-400 pt-1">
                  New trader?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('signup');
                      setErrorMessage(null);
                    }}
                    className="text-amber-400 hover:text-amber-300 font-bold underline cursor-pointer"
                  >
                    Create Account ($15)
                  </button>
                </div>
              )}
            </form>

            {/* Explore Live Platform Demo Button */}
            {onEnterDemo && (
              <div className="pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={onEnterDemo}
                  className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600/30 via-sky-600/30 to-amber-600/30 hover:from-emerald-600/40 hover:to-amber-600/40 text-white font-bold text-xs border border-sky-400/40 shadow-sm flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-98"
                >
                  <Play className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  <span>Explore Live Platform (VIP Demo Mode)</span>
                </button>
              </div>
            )}

            {/* Quick Login for Owner TwoStarTrader */}
            <div className="pt-2 border-t border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-[11px] text-slate-500">
                <span>Owner / Admin Direct:</span>
                <span className="text-amber-400 font-bold">TwoStarTrader</span>
              </div>
              <button
                type="button"
                onClick={handleAdminQuickLogin}
                className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold rounded-xl transition-colors border border-slate-700 flex items-center justify-center gap-2 cursor-pointer"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                <span>Log In as Admin (khrafiullah2@gmail.com)</span>
              </button>
            </div>

            {/* Footer Notice */}
            <div className="text-[11px] text-slate-500 text-center leading-relaxed">
              Fee: <strong>$15</strong>. Send proof to <strong>03110116709</strong> or{' '}
              <strong>03188154587</strong>. <br />
              Regard <strong>TwoStarTrader</strong>.
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-slate-800 py-3 text-center text-xs text-slate-500">
        Regard <strong>TwoStarTrader</strong> • khrafiullah2@gmail.com • WhatsApp: 03110116709 / 03188154587 • Stop Losing Money & Trade SMC
      </footer>
    </div>
  );
};
