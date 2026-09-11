import React, { useState } from 'react';
import { AiAnalysisResult, ScalpingSignal } from '../types';
import {
  Sparkles,
  ShieldCheck,
  AlertTriangle,
  Lightbulb,
  Clock,
  Send,
  HelpCircle,
  TrendingUp,
  TrendingDown,
  Compass,
} from 'lucide-react';
import { safeParseResponse } from '../utils/authClient';

interface AiAnalysisPanelProps {
  analysis: AiAnalysisResult | null;
  isLoading: boolean;
  onRefreshAnalysis: () => void;
  currentPrice: number;
  timeframe: string;
  latestSignal: ScalpingSignal | null;
}

export const AiAnalysisPanel: React.FC<AiAnalysisPanelProps> = ({
  analysis,
  isLoading,
  onRefreshAnalysis,
  currentPrice,
  timeframe,
  latestSignal,
}) => {
  const [question, setQuestion] = useState('');
  const [isAsking, setIsAsking] = useState(false);
  const [chatHistory, setChatHistory] = useState<{ sender: 'USER' | 'AI'; text: string }[]>([]);

  const handleAskQuestion = async (promptText?: string) => {
    const q = promptText || question;
    if (!q.trim() || isAsking) return;

    const userMsg = q.trim();
    setChatHistory((prev) => [...prev, { sender: 'USER', text: userMsg }]);
    setQuestion('');
    setIsAsking(true);

    try {
      const res = await fetch('/api/gemini/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: userMsg,
          currentPrice,
          timeframe,
          latestSignal,
        }),
      });
      const parsed = await safeParseResponse(res);
      const answer = parsed.ok && parsed.data?.answer ? parsed.data.answer : null;
      if (answer) {
        setChatHistory((prev) => [...prev, { sender: 'AI', text: answer }]);
      } else {
        throw new Error('Fallback to local intelligence');
      }
    } catch {
      setChatHistory((prev) => [
        ...prev,
        {
          sender: 'AI',
          text: `Gold is currently at $${currentPrice.toFixed(2)}. In scalping, focus on tapping Order Blocks after liquidity has been swept. Keep tight invalidations.`,
        },
      ]);
    } finally {
      setIsAsking(false);
    }
  };

  const quickPrompts = [
    'Should I scalp the London/NY overlap right now?',
    'What is the invalidation for this gold setup?',
    'Where is the nearest liquidity pool for TP?',
  ];

  return (
    <div id="ai-intelligence-panel" className="bg-white border border-sky-100 rounded-xl p-4 flex flex-col gap-4 shadow-sm">
      
      {/* Header */}
      <div className="flex items-center justify-between border-b border-sky-100 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-sky-600 flex items-center justify-center text-white shadow-md shadow-sky-600/20">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              Gemini AI Scalping Confluence
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200 uppercase tracking-wider">
                Institutional AI
              </span>
            </h3>
            <p className="text-[11px] text-slate-500">
              Live multi-confluence audit of Order Blocks, FVGs & sweeps
            </p>
          </div>
        </div>

        <button
          id="btn-reanalyze-ai"
          onClick={onRefreshAnalysis}
          disabled={isLoading}
          className="px-3 py-1.5 rounded-lg bg-white hover:bg-sky-50 text-xs font-semibold text-slate-700 border border-sky-200 transition-all disabled:opacity-50 shadow-xs"
        >
          {isLoading ? 'Auditing...' : 'Re-Audit'}
        </button>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="p-8 text-center space-y-3 bg-sky-50/30 rounded-xl border border-sky-100">
          <div className="w-8 h-8 border-2 border-sky-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-600 font-medium">
            Gemini evaluating institutional order flow, fair value gaps, and liquidity sweeps...
          </p>
        </div>
      )}

      {/* AI Analysis Content */}
      {!isLoading && analysis && (
        <div className="space-y-4">
          
          {/* Bias & Score Strip */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-sky-50/50 border border-sky-100">
            <div className="flex items-center gap-3">
              <div
                className={`px-2.5 py-1 rounded-lg text-xs font-black tracking-wide flex items-center gap-1.5 ${
                  analysis.bias.includes('BULLISH')
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : analysis.bias.includes('BEARISH')
                    ? 'bg-rose-100 text-rose-800 border border-rose-300'
                    : 'bg-white text-slate-700 border border-slate-200'
                }`}
              >
                {analysis.bias.includes('BULLISH') ? (
                  <TrendingUp className="w-3.5 h-3.5" />
                ) : (
                  <TrendingDown className="w-3.5 h-3.5" />
                )}
                <span>BIAS: {analysis.bias.replace('_', ' ')}</span>
              </div>

              <div className="text-xs font-bold text-sky-800">
                Confluence Grade: <span className="text-slate-900 font-black">{analysis.signalGrade} ({analysis.confluenceScore}%)</span>
              </div>
            </div>

            <div className="text-xs text-slate-500 font-mono flex items-center gap-1.5 font-semibold">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>{timeframe} Timeframe</span>
            </div>
          </div>

          {/* Headline & Summary */}
          <div>
            <h4 className="text-sm font-bold text-slate-800 mb-1.5">{analysis.headline}</h4>
            <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl border border-sky-100">
              {analysis.aiSummary}
            </p>
          </div>

          {/* Key Confluences */}
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1.5 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Confirmed Institutional Drivers
            </span>
            <ul className="space-y-1.5 text-xs text-slate-700">
              {analysis.confluencesIdentified.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2 bg-sky-50/40 p-2 rounded-lg border border-sky-100">
                  <span className="text-emerald-600 font-bold">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Invalidation Rules */}
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 block mb-1.5 flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-600" /> Structural Invalidation Rules
            </span>
            <ul className="space-y-1.5 text-xs text-rose-900">
              {analysis.invalidationRules.map((rule, idx) => (
                <li key={idx} className="flex items-start gap-2 bg-rose-50/60 p-2 rounded-lg border border-rose-200">
                  <span className="text-rose-600 font-bold">✕</span>
                  <span>{rule}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Scalper Tip & Session Advice */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            <div className="bg-sky-50/60 p-3 rounded-xl border border-sky-200">
              <div className="flex items-center gap-1.5 text-sky-800 text-xs font-bold mb-1">
                <Lightbulb className="w-3.5 h-3.5 text-sky-600" />
                <span className="uppercase tracking-wider text-[10px]">Execution Tip</span>
              </div>
              <p className="text-[11px] text-slate-700 leading-relaxed font-medium">
                {analysis.scalpingTip}
              </p>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
              <div className="flex items-center gap-1.5 text-slate-700 text-xs font-bold mb-1">
                <Compass className="w-3.5 h-3.5 text-sky-600" />
                <span className="uppercase tracking-wider text-[10px]">Session Dynamics</span>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed font-medium">
                {analysis.sessionAdvice}
              </p>
            </div>
          </div>

        </div>
      )}

      {/* Ask AI Scalper Interactive Section */}
      <div className="border-t border-sky-100 pt-3 space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
            <HelpCircle className="w-3.5 h-3.5 text-sky-600" />
            Ask AI Gold Analyst
          </span>
          <span className="text-[10px] text-slate-500 font-mono font-bold">XAU/USD ${currentPrice.toFixed(2)}</span>
        </div>

        {/* Quick Prompts */}
        <div className="flex flex-wrap gap-1.5">
          {quickPrompts.map((qp, idx) => (
            <button
              key={idx}
              onClick={() => handleAskQuestion(qp)}
              disabled={isAsking}
              className="text-[10px] bg-sky-50 hover:bg-sky-100 text-sky-800 px-2.5 py-1 rounded-lg border border-sky-200 transition-colors text-left font-medium"
            >
              {qp}
            </button>
          ))}
        </div>

        {/* Chat History */}
        {chatHistory.length > 0 && (
          <div className="max-h-48 overflow-y-auto space-y-2 pr-1 text-xs">
            {chatHistory.map((msg, idx) => (
              <div
                key={idx}
                className={`p-2.5 rounded-xl ${
                  msg.sender === 'USER'
                    ? 'bg-sky-100 border border-sky-200 text-sky-900 ml-4'
                    : 'bg-slate-50 border border-slate-200 text-slate-800 mr-4'
                }`}
              >
                <span className="text-[10px] font-bold text-slate-500 block mb-0.5">
                  {msg.sender === 'USER' ? 'You' : 'Gemini Scalper'}
                </span>
                <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>
              </div>
            ))}
          </div>
        )}

        {/* Input bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleAskQuestion();
          }}
          className="flex items-center gap-2"
        >
          <input
            id="input-ask-ai"
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask about key price levels, order block rejection, or session bias..."
            className="flex-1 bg-white border border-sky-200 rounded-xl px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-sky-500 shadow-xs"
          />
          <button
            id="btn-send-question"
            type="submit"
            disabled={!question.trim() || isAsking}
            className="p-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white disabled:opacity-40 transition-colors shadow-xs"
          >
            <Send className="w-3.5 h-3.5 stroke-[2.5]" />
          </button>
        </form>

      </div>

    </div>
  );
};
