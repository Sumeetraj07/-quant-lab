import React, { useState } from 'react';
import { Play, Settings2, DollarSign, Sliders, Calendar, ShieldAlert } from 'lucide-react';

interface StrategyLabProps {
  onRunBacktest: (config: any) => void;
  isLoading: boolean;
}

const AVAILABLE_STRATEGIES = [
  {
    id: 'moving_average_momentum',
    name: 'SMA Crossover Momentum',
    description: 'Dual Simple Moving Average Crossover strategy with trend following filters.',
    defaultParams: { fast_window: 20, slow_window: 50 }
  },
  {
    id: 'bollinger_mean_reversion',
    name: 'Bollinger Mean Reversion',
    description: 'Bands mean-reversion strategy trading oversold and overbought deviations.',
    defaultParams: { period: 20, num_std: 2.0 }
  },
  {
    id: 'breakout',
    name: 'Donchian Channel Breakout',
    description: 'N-day high/low breakout trend-following system.',
    defaultParams: { lookback_period: 20 }
  },
  {
    id: 'volatility_targeting',
    name: 'Volatility Targeting',
    description: 'Dynamic position sizing scaled inversely to realized volatility.',
    defaultParams: { target_volatility: 0.15, lookback: 30 }
  },
  {
    id: 'buy_and_hold',
    name: 'Buy and Hold (Benchmark)',
    description: 'Baseline benchmark allocating 100% equity to underlying asset.',
    defaultParams: {}
  }
];

export const StrategyLab: React.FC<StrategyLabProps> = ({ onRunBacktest, isLoading }) => {
  const [selectedStrategyId, setSelectedStrategyId] = useState('moving_average_momentum');
  const [symbol, setSymbol] = useState('AAPL');
  const [startDate, setStartDate] = useState('2023-01-01');
  const [endDate, setEndDate] = useState('2023-12-31');
  const [capital, setCapital] = useState(100000);
  const [commissionRate, setCommissionRate] = useState(0.001); // 0.1%
  const [slippageBps, setSlippageBps] = useState(5.0); // 5 bps
  const [spreadBps, setSpreadBps] = useState(2.0); // 2 bps

  const selectedStrategy = AVAILABLE_STRATEGIES.find(s => s.id === selectedStrategyId) || AVAILABLE_STRATEGIES[0];
  const [params, setParams] = useState(selectedStrategy.defaultParams);

  const handleStrategyChange = (id: string) => {
    setSelectedStrategyId(id);
    const strat = AVAILABLE_STRATEGIES.find(s => s.id === id);
    if (strat) {
      setParams(strat.defaultParams);
    }
  };

  const handleParamChange = (key: string, val: any) => {
    setParams(prev => ({ ...prev, [key]: parseFloat(val) || val }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onRunBacktest({
      name: `${selectedStrategy.name} on ${symbol}`,
      strategy_id: selectedStrategyId,
      parameters: params,
      symbols: [symbol],
      start_date: startDate,
      end_date: endDate,
      initial_capital: capital,
      commission_rate: commissionRate,
      slippage_bps: slippageBps,
      spread_bps: spreadBps
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Left 2 Cols: Configuration */}
      <div className="lg:col-span-2 space-y-6">
        <div className="glass-panel p-6">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-white/10">
            <Settings2 className="w-5 h-5 text-indigo-400" />
            <h2 className="text-lg font-semibold text-white">Strategy Architecture</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            {AVAILABLE_STRATEGIES.map(strat => (
              <div
                key={strat.id}
                onClick={() => handleStrategyChange(strat.id)}
                className={`p-4 rounded-xl cursor-pointer border transition-all ${
                  selectedStrategyId === strat.id
                    ? 'bg-indigo-600/20 border-indigo-500 shadow-lg shadow-indigo-500/10'
                    : 'bg-slate-900/40 border-white/5 hover:border-white/20'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-semibold text-sm text-white">{strat.name}</h3>
                  {selectedStrategyId === strat.id && (
                    <span className="w-2 h-2 rounded-full bg-indigo-400 shadow-glow"></span>
                  )}
                </div>
                <p className="text-xs text-slate-400 line-clamp-2">{strat.description}</p>
              </div>
            ))}
          </div>

          {/* Strategy Parameters */}
          <div className="bg-slate-950/60 p-5 rounded-xl border border-white/5 space-y-4">
            <div className="flex items-center gap-2 text-xs font-mono text-indigo-400">
              <Sliders className="w-4 h-4" />
              HYPERPARAMETERS FOR {selectedStrategy.name.toUpperCase()}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {Object.entries(params).map(([key, val]) => (
                <div key={key}>
                  <label className="block text-xs font-medium text-slate-300 mb-1 capitalize">
                    {key.replace('_', ' ')}
                  </label>
                  <input
                    type="number"
                    value={val as number}
                    onChange={e => handleParamChange(key, e.target.value)}
                    className="input-field"
                  />
                </div>
              ))}
              {Object.keys(params).length === 0 && (
                <p className="text-xs text-slate-500 italic col-span-2">
                  No adjustable hyperparameters required for this strategy.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Execution & Risk Controls */}
        <div className="glass-panel p-6">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-white/10">
            <ShieldAlert className="w-5 h-5 text-cyan-400" />
            <h2 className="text-lg font-semibold text-white">Execution Simulator & Cost Parameters</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Commission Rate (%)
              </label>
              <input
                type="number"
                step="0.0001"
                value={commissionRate * 100}
                onChange={e => setCommissionRate(parseFloat(e.target.value) / 100 || 0)}
                className="input-field"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">Default: 0.1% per trade</span>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Slippage (BPS)
              </label>
              <input
                type="number"
                step="0.5"
                value={slippageBps}
                onChange={e => setSlippageBps(parseFloat(e.target.value) || 0)}
                className="input-field"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">1 BPS = 0.01%</span>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Bid-Ask Spread (BPS)
              </label>
              <input
                type="number"
                step="0.5"
                value={spreadBps}
                onChange={e => setSpreadBps(parseFloat(e.target.value) || 0)}
                className="input-field"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">Half-spread per side</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Col: Dataset & Execution Panel */}
      <div className="space-y-6">
        <div className="glass-panel p-6">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-white/10">
            <DollarSign className="w-5 h-5 text-emerald-400" />
            <h2 className="text-lg font-semibold text-white">Backtest Settings</h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Asset Symbol
              </label>
              <select
                value={symbol}
                onChange={e => setSymbol(e.target.value)}
                className="input-field bg-slate-900"
              >
                <option value="AAPL">AAPL — Apple Inc.</option>
                <option value="NVDA">NVDA — NVIDIA Corp.</option>
                <option value="MSFT">MSFT — Microsoft Corp.</option>
                <option value="GOOGL">GOOGL — Alphabet Inc.</option>
                <option value="AMZN">AMZN — Amazon.com Inc.</option>
                <option value="SPY">SPY — SPDR S&P 500 ETF</option>
                <option value="QQQ">QQQ — Invesco QQQ Trust</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-slate-400" /> Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-slate-400" /> End Date
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  className="input-field"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Initial Capital ($)
              </label>
              <input
                type="number"
                step="5000"
                value={capital}
                onChange={e => setCapital(parseFloat(e.target.value) || 100000)}
                className="input-field"
              />
            </div>

            <div className="pt-4">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full btn-primary justify-center py-3 text-base shadow-xl disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    Running Quant Engine...
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5 fill-current" />
                    Execute Backtest
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Engine Guarantees */}
        <div className="glass-panel p-5 text-xs space-y-3">
          <div className="text-slate-300 font-medium border-b border-white/5 pb-2">
            🛡 Engine Protection Guarantees
          </div>
          <ul className="space-y-2 text-slate-400">
            <li className="flex items-center gap-2">
              <span className="text-emerald-400">✓</span> Strict next-bar open fill causality (Zero Look-Ahead Bias)
            </li>
            <li className="flex items-center gap-2">
              <span className="text-emerald-400">✓</span> Full transaction cost breakdown (Commissions, Slippage & Spread)
            </li>
            <li className="flex items-center gap-2">
              <span className="text-emerald-400">✓</span> 252-day annualized risk metric calculations
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};
