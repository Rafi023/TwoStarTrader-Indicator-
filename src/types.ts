export interface Candle {
  time: number; // timestamp in ms
  timeStr: string; // e.g. "14:35"
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export type ZoneType = 'BUY_ZONE' | 'SELL_ZONE';

export interface MarketZone {
  id: string;
  type: ZoneType;
  topPrice: number;
  bottomPrice: number;
  label: string;
  strength: 'STRONG' | 'MODERATE' | 'WEAK';
  touchCount: number;
  mitigated: boolean;
  startCandleIndex: number;
}

export interface OrderBlock {
  id: string;
  type: 'BULLISH_OB' | 'BEARISH_OB';
  topPrice: number;
  bottomPrice: number;
  medianPrice: number; // 50% mitigation line
  startIndex: number;
  endIndex?: number;
  mitigated: boolean;
  mitigatedAt?: number;
  displacementPips: number;
}

export interface FairValueGap {
  id: string;
  type: 'BULLISH_FVG' | 'BEARISH_FVG';
  topPrice: number;
  bottomPrice: number;
  midPrice: number;
  candleIndex: number;
  mitigated: boolean;
  filledPercent: number;
}

export interface ReversalEvent {
  id: string;
  type: 'CHoCH_BULL' | 'CHoCH_BEAR' | 'BOS_BULL' | 'BOS_BEAR' | 'LIQUIDITY_SWEEP_HIGH' | 'LIQUIDITY_SWEEP_LOW' | 'PINBAR_REJECTION' | 'ENGULFING';
  price: number;
  candleIndex: number;
  direction: 'BULLISH' | 'BEARISH';
  description: string;
}

export type SignalType = 'STRONG_BUY' | 'BUY' | 'STRONG_SELL' | 'SELL';
export type TradeStyle = 'SCALPING' | 'DAY_TRADE';

export interface SignalChecklistItem {
  name: string;
  passed: boolean;
  details: string;
}

export interface ScalpingSignal {
  id: string;
  candleIndex: number;
  timestamp: number;
  timeStr: string;
  type: SignalType;
  tradeStyle?: TradeStyle;
  signalGrade?: 'A+' | 'A' | 'B';
  marketStructureType?: 'BOS_CONTINUATION' | 'MSS_REVERSAL' | 'LIQUIDITY_SWEEP' | 'EMA_PULLBACK';
  entryPrice: number;
  entryZone?: { min: number; max: number };
  stopLoss: number;
  breakEvenPrice?: number;
  takeProfit1: number; // 1:1.5 RR
  takeProfit2: number; // 1:2.5 RR
  takeProfit3?: number; // 1:4.0 RR Runner
  riskPips: number;
  rewardPips: number;
  spreadBufferPips?: number;
  riskReward: string;
  actionAdvice?: string;
  confluences: string[];
  confluenceScore: number; // e.g. 92
  checklist?: SignalChecklistItem[];
  triggerCondition?: string;
  invalidationRule?: string;
  isPredictiveAdvance?: boolean;
  advanceType?: 'PREDICTIVE_PULLBACK_DIP' | 'PREDICTIVE_RALLY_FADE' | 'LIQUIDITY_HUNT_REVERSAL' | 'PRE_BREAKOUT_COIL';
  predictedMove?: string;
  forecastHorizon?: string;
  anticipatedGainPips?: number;
  status: 'PENDING' | 'HIT_TP1' | 'HIT_TP2' | 'HIT_TP3' | 'STOPPED_OUT' | 'ACTIVE';
  profitPips?: number;
  reasons: string[];
}

export interface IndicatorSettings {
  timeframe: '1m' | '5m' | '15m';
  tradeMode?: 'SCALPING' | 'DAY_TRADING' | 'ALL';
  signalBias?: 'AUTO' | 'BUY' | 'SELL';
  showOrderBlocks: boolean;
  showFVG: boolean;
  showBuySellZones: boolean;
  showReversals: boolean;
  showSignals: boolean;
  showEquilibrium: boolean;
  showEMAs?: boolean;
  showRsi?: boolean;
  soundAlerts: boolean;
  autoAiAnalysis: boolean;
  riskRewardRatio: number; // default 2 or 3
}

export interface AiAnalysisResult {
  bias: 'STRONG_BULLISH' | 'BULLISH' | 'NEUTRAL' | 'BEARISH' | 'STRONG_BEARISH';
  confluenceScore: number;
  signalGrade: 'A+' | 'A' | 'B' | 'WAIT';
  headline: string;
  aiSummary: string;
  confluencesIdentified: string[];
  invalidationRules: string[];
  recommendedSL: number;
  recommendedTP1: number;
  recommendedTP2: number;
  sessionAdvice: string;
  volatilityWarning: string;
  scalpingTip: string;
}

export interface ScalpPosition {
  id: string;
  direction: 'BUY' | 'SELL';
  entryPrice: number;
  stopLossPrice: number;
  takeProfitPrice: number;
  profitRatio: number; // e.g. 2.0 (1:2)
  riskDollars: number;
  rewardDollars: number;
  riskPips: number;
  rewardPips: number;
  lotSize: number; // e.g. 0.10
  openedAt: number;
  status: 'ACTIVE' | 'HIT_TP' | 'HIT_SL' | 'CLOSED';
}

export type UserStatus = 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';
export type UserRole = 'USER' | 'ADMIN';

export interface UserAccount {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  status: UserStatus;
  paymentProofNotes?: string;
  registeredAt: number;
  approvedAt?: number;
}

export interface TraderQuote {
  id: string;
  quote: string;
  author: string;
  tag: 'PSYCHOLOGY' | 'RISK' | 'EXECUTION' | 'PROFITABILITY';
}

export interface Mt5LiveMarketData {
  symbol: string;
  price: number;
  bid: number;
  ask: number;
  spreadPips: number;
  high24h: number;
  low24h: number;
  change24h: number;
  changePercent: number;
  timestamp: number;
  source: string;
  isLive: boolean;
}

