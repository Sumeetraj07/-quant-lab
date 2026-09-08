import React, { useState } from 'react';
import { Play, CheckCircle2, ShieldCheck } from 'lucide-react';
import type { Strategy, Asset, BacktestConfig } from '../types';
import { Button } from '../components/common/Button';

interface StrategyBuilderPageProps {
  strategies: Strategy[];
  assets: Asset[];
  selectedStrategy?: Strategy;
  onRunBacktest: (config: BacktestConfig) => void;
  isLoading: boolean;
}

export const StrategyBuilderPage: React.FC<StrategyBuilderPageProps> = ({
  strategies,
  assets,
  selectedStrategy,
  onRunBacktest,
  isLoading,
}) => {
  const [strategyId, setStrategyId] = useState<string>(
    selectedStrategy ? selectedStrategy.id : 'moving_average_momentum'
  );
  const [symbol, setSymbol] = useState<string>('NIFTY 50');
  const [startDate, setStartDate] = useState<string>('2018-01-01');
  const [endDate, setEndDate] = useState<string>('2026-08-31');
  const [timeframe, setTimeframe] = useState<string>('1d');
  const [initialCapital, setInitialCapital] = useState<number>(1000000);
  const [commissionRate, setCommissionRate] = useState<number>(0.05); // 0.05%
  const [slippageBps, setSlippageBps] = useState<number>(5); // 5 bps
  const [spreadBps, setSpreadBps] = useState<number>(2); // 2 bps
  const [positionSizing, setPositionSizing] = useState<string>('Volatility Target');
  const [fastWindow, setFastWindow] = useState<number>(20);
  const [slowWindow, setSlowWindow] = useState<number>(100);

  const currentStrat = strategies.find((s) => s.id === strategyId) || strategies[0];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const config: BacktestConfig = {
      strategy_id: strategyId,
      symbols: [symbol],
      start_date: startDate,
      end_date: endDate,
      timeframe,
      initial_capital: initialCapital,
      commission_rate: commissionRate / 100,
      slippage_bps: slippageBps,
      spread_bps: spreadBps,
      position_sizing: positionSizing,
      target_volatility: 0.12,
      parameters: {
        fast_window: fastWindow,
        slow_window: slowWindow,
      },
    };
    onRunBacktest(config);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Backtest Strategy Workbench</h1>
        <p className="text-xs text-slate-400 font-mono">Configure Mathematical Signals, Universe & Transaction Costs</p>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Config Inputs */}
        <div className="lg:col-span-2 space-y-6">
          {/* Strategy Selection */}
          <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800/80 space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-indigo-400 font-mono">1. Strategy Model</h2>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Select Quantitative Strategy</label>
              <select
                value={strategyId}
                onChange={(e) => setStrategyId(e.target.value)}
                className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-700 text-xs font-mono text-slate-100 outline-none focus:border-indigo-500"
              >
                {strategies.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.category})
                  </option>
                ))}
              </select>
              <p className="text-xs text-slate-400 mt-2">{currentStrat.description}</p>
            </div>
          </div>

          {/* Asset & Period */}
          <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800/80 space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-indigo-400 font-mono">2. Market Universe & Period</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Asset Symbol</label>
                <select
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value)}
                  className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-700 text-xs font-mono text-slate-100 outline-none"
                >
                  {assets.map((a) => (
                    <option key={a.symbol} value={a.symbol}>
                      {a.symbol} — {a.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Bar Timeframe</label>
                <select
                  value={timeframe}
                  onChange={(e) => setTimeframe(e.target.value)}
                  className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-700 text-xs font-mono text-slate-100 outline-none"
                >
                  <option value="1d">Daily (1D)</option>
                  <option value="1h">Hourly (1H)</option>
                  <option value="15m">Intraday (15M)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-700 text-xs font-mono text-slate-100 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">End Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-700 text-xs font-mono text-slate-100 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Strategy Parameters */}
          <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800/80 space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-indigo-400 font-mono">3. Strategy Parameters</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Fast Moving Average Window</label>
                <input
                  type="number"
                  value={fastWindow}
                  onChange={(e) => setFastWindow(Number(e.target.value))}
                  className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-700 text-xs font-mono text-slate-100 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Slow Moving Average Window</label>
                <input
                  type="number"
                  value={slowWindow}
                  onChange={(e) => setSlowWindow(Number(e.target.value))}
                  className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-700 text-xs font-mono text-slate-100 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Execution & Costs */}
          <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800/80 space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-indigo-400 font-mono">4. Capital & Execution Costs</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Initial Capital (₹)</label>
                <input
                  type="number"
                  value={initialCapital}
                  onChange={(e) => setInitialCapital(Number(e.target.value))}
                  className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-700 text-xs font-mono text-slate-100 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Position Sizing Logic</label>
                <select
                  value={positionSizing}
                  onChange={(e) => setPositionSizing(e.target.value)}
                  className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-700 text-xs font-mono text-slate-100 outline-none"
                >
                  <option value="Volatility Target">Volatility Target (12% Vol)</option>
                  <option value="Fixed Allocation">Fixed Allocation (95% Equity)</option>
                  <option value="Equal Weight">Equal Weight Allocation</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Commission Rate (%)</label>
                <input
                  type="number"
                  step="0.01"
                  value={commissionRate}
                  onChange={(e) => setCommissionRate(Number(e.target.value))}
                  className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-700 text-xs font-mono text-slate-100 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Slippage (bps)</label>
                <input
                  type="number"
                  value={slippageBps}
                  onChange={(e) => setSlippageBps(Number(e.target.value))}
                  className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-700 text-xs font-mono text-slate-100 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Spread Penalty (bps)</label>
                <input
                  type="number"
                  value={spreadBps}
                  onChange={(e) => setSpreadBps(Number(e.target.value))}
                  className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-700 text-xs font-mono text-slate-100 outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Pre-Run Summary Card & CTA */}
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-slate-900/70 border border-indigo-500/30 space-y-4 sticky top-6 shadow-xl">
            <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Backtest Run Summary</span>
            </h2>

            <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2.5 text-xs font-mono">
              <div className="flex justify-between">
                <span className="text-slate-500">Strategy:</span>
                <span className="text-indigo-300 font-bold">{currentStrat.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Universe:</span>
                <span className="text-slate-200 font-bold">{symbol}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Timeframe:</span>
                <span className="text-slate-300">{timeframe}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Date Range:</span>
                <span className="text-slate-300 text-[11px]">{startDate} → {endDate}</span>
              </div>
              <div className="flex justify-between border-t border-slate-800 pt-2">
                <span className="text-slate-500">Capital:</span>
                <span className="text-emerald-400 font-bold">₹{initialCapital.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Comm / Slip:</span>
                <span className="text-rose-400 font-bold">{commissionRate}% / {slippageBps} bps</span>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-300 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
              <span>Engine enforces strict temporal causality (Signal t executes at Bar t+1 Open).</span>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={isLoading}
              className="w-full justify-center shadow-indigo-600/40"
              icon={<Play className="w-5 h-5 text-emerald-400 fill-emerald-400" />}
            >
              Execute Backtest Job
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
};
