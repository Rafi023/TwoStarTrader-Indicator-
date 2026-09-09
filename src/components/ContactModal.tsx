import React from 'react';
import { X, Mail, Phone, MessageSquare, ShieldCheck, CheckCircle2, DollarSign } from 'lucide-react';

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ContactModal: React.FC<ContactModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-lg bg-white rounded-2xl border border-sky-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-slate-900 via-sky-950 to-slate-900 px-6 py-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-400 font-black text-lg">
              ★
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight">TwoStarTrader Official Contacts</h2>
              <p className="text-xs text-slate-300">XAU/USD Gold Scalper VIP Access & Verification</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 text-slate-700">
          {/* Fee & Verification Notice */}
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-3.5">
            <div className="p-2 rounded-lg bg-amber-500 text-white shrink-0 mt-0.5">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-amber-950">One-Time $15 Fee For Lifetime Access</h3>
              <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                To prevent market saturation and keep signals accurate, manual access is granted directly by{' '}
                <strong className="font-bold text-amber-950">TwoStarTrader</strong> after confirming your $15 payment.
              </p>
            </div>
          </div>

          {/* Contact Methods */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Direct Contact & Payment Channels
            </h4>

            {/* Email */}
            <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between hover:border-sky-300 transition-colors">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-sky-100 text-sky-700">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[11px] font-bold text-slate-400 block">Official Email</span>
                  <span className="text-xs font-mono font-bold text-slate-900">khrafiullah2@gmail.com</span>
                </div>
              </div>
              <a
                href="mailto:khrafiullah2@gmail.com?subject=XAUUSD%20Gold%20Scalper%20$15%20Access%20Request"
                className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold rounded-lg transition-colors shadow-xs"
              >
                Send Email
              </a>
            </div>

            {/* WhatsApp 1 */}
            <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between hover:border-emerald-300 transition-colors">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-100 text-emerald-700">
                  <Phone className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[11px] font-bold text-slate-400 block">WhatsApp / Phone Primary</span>
                  <span className="text-xs font-mono font-bold text-slate-900">03110116709</span>
                </div>
              </div>
              <a
                href="https://wa.me/923110116709?text=Hello%20TwoStarTrader,%20I%20want%20to%20get%20access%20to%20the%20XAUUSD%20Gold%20Scalper%20indicator%20($15)."
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Chat</span>
              </a>
            </div>

            {/* WhatsApp 2 */}
            <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between hover:border-emerald-300 transition-colors">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-100 text-emerald-700">
                  <Phone className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[11px] font-bold text-slate-400 block">WhatsApp / Phone Secondary</span>
                  <span className="text-xs font-mono font-bold text-slate-900">03188154587</span>
                </div>
              </div>
              <a
                href="https://wa.me/923188154587?text=Hello%20TwoStarTrader,%20I%20want%20to%20get%20access%20to%20the%20XAUUSD%20Gold%20Scalper%20indicator%20($15)."
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Chat</span>
              </a>
            </div>
          </div>

          {/* Payment Methods Supported */}
          <div className="p-4 rounded-xl bg-slate-100 border border-slate-200 text-xs space-y-2">
            <span className="font-bold text-slate-800 block">Accepted Payment Options:</span>
            <ul className="grid grid-cols-2 gap-2 text-slate-600">
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>EasyPaisa (03110116709)</span>
              </li>
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>JazzCash (03188154587)</span>
              </li>
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Binance Pay / USDT</span>
              </li>
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Bank Transfer</span>
              </li>
            </ul>
          </div>

          <div className="pt-2 text-center text-xs font-serif italic text-slate-500 border-t border-slate-200">
            Regard <strong>TwoStarTrader</strong> — Professional Institutional Gold Trading
          </div>
        </div>
      </div>
    </div>
  );
};
