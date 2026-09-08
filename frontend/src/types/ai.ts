import type { BacktestConfig } from './index';

export type AiMode = 'research' | 'trade_analysis' | 'portfolio' | 'backtest';

export type LanguageComplexity = 'simple' | 'standard' | 'technical';

export type DataQuality = 'Good' | 'Partial' | 'Limited';

export interface TradeRecord {
  id: string;
  timestamp?: string;
  date?: string;
  symbol: string;
  side: 'BUY' | 'SELL' | 'LONG' | 'SHORT';
  entry_price?: number;
  exit_price?: number;
  price?: number;
  quantity?: number;
  pnl: number;
  fees?: number;
  holding_period_mins?: number;
  position_size?: number;
  strategy?: string;
}

export interface CsvColumnMapping {
  dateHeader?: string;
  symbolHeader?: string;
  sideHeader?: string;
  priceHeader?: string;
  quantityHeader?: string;
  pnlHeader?: string;
  feesHeader?: string;
  strategyHeader?: string;
}

export interface TradeAnalyticsSummary {
  total_trades: number;
  winning_trades: number;
  losing_trades: number;
  win_rate: number; // percentage, e.g. 58.2
  profit_factor: number;
  avg_win: number;
  avg_loss: number;
  largest_win: number;
  largest_loss: number;
  total_pnl: number;
  net_pnl: number;
  total_fees: number;
  holding_period_avg_hours?: number;
  max_drawdown: number;
  max_drawdown_pct: number;
  drawdown_start_date?: string;
  drawdown_end_date?: string;
  consecutive_losses_max: number;
  high_volatility_win_rate?: number;
  low_volatility_win_rate?: number;
  position_size_anomaly_pct?: number;
  data_quality: DataQuality;
  warnings: string[];
}

export interface EvidenceItem {
  id: string;
  title: string;
  metrics: Array<{ label: string; value: string | number; change?: string; highlight?: boolean }>;
  description: string;
  chartHighlightPeriod?: { start: string; end: string };
}

export interface AiChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
  mode: AiMode;
  complexity?: LanguageComplexity;
  evidence?: EvidenceItem[];
  suggestedBacktest?: BacktestConfig;
  suggestions?: string[];
  isThinking?: boolean;
}

export interface AiSession {
  id: string;
  title: string;
  mode: AiMode;
  created_at: string;
  dataset_name?: string;
  trade_count?: number;
  messages: AiChatMessage[];
}

export interface ResearchReport {
  id: string;
  title: string;
  created_at: string;
  dataset_name: string;
  date_range: string;
  trade_count: number;
  executive_summary: string;
  why_this_happened: string[];
  what_went_well: string[];
  what_hurt_performance: string[];
  metrics: TradeAnalyticsSummary;
  evidence_items: EvidenceItem[];
  suggested_investigations: string[];
  disclaimer: string;
}
