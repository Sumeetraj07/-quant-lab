export * from './ai';

export type ThemeMode = 'dark' | 'light' | 'system';

export type ActiveTab =
  | 'dashboard'
  | 'market'
  | 'strategies'
  | 'builder'
  | 'job'
  | 'results'
  | 'risk'
  | 'experiments'
  | 'compare'
  | 'optimization'
  | 'walk-forward'
  | 'monte-carlo'
  | 'ai'
  | 'settings';

export interface NewsItem {
  id: string;
  symbol: string;
  headline: string;
  summary: string;
  source: string;
  timestamp: string;
  sentiment: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
  impact: 'HIGH' | 'MEDIUM' | 'LOW';
  url?: string;
}

export interface Asset {
  symbol: string;
  name: string;
  exchange: string;
  asset_type: 'Equity' | 'Index' | 'Crypto' | 'Forex';
  price: number;
  change_24h_pct: number;
  volume: string;
  timeframes: string[];
  market_cap?: string;
  pe_ratio?: number;
  high_52w?: number;
  low_52w?: number;
  sector?: string;
  sentiment?: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
}

export interface Strategy {
  id: string;
  name: string;
  description: string;
  category: 'Trend Following' | 'Mean Reversion' | 'Breakout' | 'Risk Managed' | 'Baseline';
  runs_count: number;
  best_sharpe: number;
  last_used: string;
  default_params: Record<string, any>;
}

export interface BacktestConfig {
  strategy_id: string;
  symbols: string[];
  start_date: string;
  end_date: string;
  timeframe: string;
  initial_capital: number;
  commission_rate: number;
  slippage_bps: number;
  spread_bps: number;
  position_sizing: string;
  target_volatility?: number;
  parameters: Record<string, any>;
}

export interface Trade {
  trade_id: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  entry_time: string;
  exit_time: string;
  quantity: number;
  entry_price: number;
  exit_price: number;
  gross_pnl: number;
  costs: number;
  net_pnl: number;
  return_pct: number;
}

export interface EquityPoint {
  timestamp: string;
  equity: number;
  drawdown: number;
  benchmark_equity?: number;
}

export interface BacktestMetrics {
  total_return: number;
  cagr: number;
  sharpe_ratio: number;
  sortino_ratio: number;
  max_drawdown: number;
  volatility: number;
  win_rate: number;
  profit_factor: number;
  total_trades: number;
  winning_trades: number;
  losing_trades: number;
  turnover: number;
  var_95?: number;
  cvar_95?: number;
  beta?: number;
  alpha?: number;
}

export interface BacktestResult {
  experiment_id: string;
  metrics: BacktestMetrics;
  equity_curve: EquityPoint[];
  trades: Trade[];
  warnings: string[];
  run_duration_seconds: number;
}

export interface BacktestJob {
  id: string;
  status: 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  progress_pct: number;
  processed_bars: number;
  total_bars: number;
  stage: 'Dataset Load' | 'Validation' | 'Strategy Execution' | 'Metrics Calculation' | 'Saving';
  elapsed_seconds: number;
  config: BacktestConfig;
  result?: BacktestResult;
  error?: string;
}

export interface Experiment {
  id: string;
  name: string;
  strategy_name: string;
  asset_universe: string[];
  period: string;
  sharpe: number;
  cagr: number;
  max_dd: number;
  created_at: string;
  status?: 'COMPLETED' | 'RUNNING' | 'FAILED' | 'QUEUED';
  notes?: string;
  config: BacktestConfig;
  metrics: BacktestMetrics;
}

export interface RiskMetrics {
  var_95: number;
  cvar_95: number;
  volatility: number;
  beta: number;
  gross_exposure: number;
  net_exposure: number;
  leverage: number;
  max_drawdown: number;
}

export interface OptimizationResult {
  param_combination: Record<string, any>;
  cagr: number;
  sharpe: number;
  max_drawdown: number;
  win_rate: number;
}

export interface WalkForwardWindow {
  window_id: number;
  train_period: string;
  test_period: string;
  in_sample_sharpe: number;
  out_of_sample_sharpe: number;
  out_of_sample_cagr: number;
}

export interface MonteCarloSimulation {
  run_id: number;
  terminal_value: number;
  max_drawdown: number;
}

export interface GlossaryTerm {
  term: string;
  category: 'Trading' | 'Quant Research' | 'Risk' | 'Machine Learning';
  simple_def: string;
  technical_def: string;
  example: string;
}
