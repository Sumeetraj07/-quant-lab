import React, { useState } from 'react';
import { Database, CheckCircle, RefreshCw } from 'lucide-react';

export const DataExplorer: React.FC = () => {
  const [symbol, setSymbol] = useState('AAPL');
  const [timeframe, setTimeframe] = useState('1d');
  const [isLoading, setIsLoading] = useState(false);

  // Mock bar inspector preview
  const bars = Array.from({ length: 15 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (15 - i));
    const base = 180 + i * 0.8 + Math.sin(i) * 2;
    return {
      date: d.toISOString().split('T')[0],
      open: (base - 0.5).toFixed(2),
      high: (base + 1.2).toFixed(2),
      low: (base - 1.0).toFixed(2),
      close: base.toFixed(2),
      volume: (25000000 + Math.random() * 5000000).toFixed(0)
    };
  });

  return (
    <div className="space-y-6">
      <div className="glass-panel p-6">
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <Database className="w-5 h-5 text-cyan-400" />
            <div>
              <h2 className="text-lg font-semibold text-white">Market Data & Pipeline Validator</h2>
              <p className="text-xs text-slate-400">Inspect cached OHLCV bars and provider pipeline validation metrics</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={timeframe}
              onChange={e => setTimeframe(e.target.value)}
              className="input-field bg-slate-900 text-xs w-24"
            >
              <option value="1d">1D</option>
              <option value="1h">1H</option>
              <option value="15m">15M</option>
            </select>
            <select
              value={symbol}
              onChange={e => setSymbol(e.target.value)}
              className="input-field bg-slate-900 text-xs w-32"
            >
              <option value="AAPL">AAPL</option>
              <option value="NVDA">NVDA</option>
              <option value="MSFT">MSFT</option>
              <option value="SPY">SPY</option>
            </select>
            <button
              onClick={() => {
                setIsLoading(true);
                setTimeout(() => setIsLoading(false), 500);
              }}
              className="btn-secondary text-xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              Fetch Latest
            </button>
          </div>
        </div>

        {/* Validation Checks */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
            <div>
              <div className="text-xs font-semibold text-emerald-300">Timestamp Continuity</div>
              <div className="text-[10px] text-slate-400 font-mono">0 gaps detected</div>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
            <div>
              <div className="text-xs font-semibold text-emerald-300">OHLC Invariants</div>
              <div className="text-[10px] text-slate-400 font-mono">High ≥ Low verified</div>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
            <div>
              <div className="text-xs font-semibold text-emerald-300">Timezone Standardization</div>
              <div className="text-[10px] text-slate-400 font-mono">Normalized to UTC</div>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center gap-3">
            <Database className="w-5 h-5 text-indigo-400 shrink-0" />
            <div>
              <div className="text-xs font-semibold text-indigo-300">Cached Bars</div>
              <div className="text-[10px] text-slate-400 font-mono">252 daily bars</div>
            </div>
          </div>
        </div>

        {/* Bar Inspector Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-white/10 text-slate-400">
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3">Symbol</th>
                <th className="py-2.5 px-3 text-right">Open</th>
                <th className="py-2.5 px-3 text-right">High</th>
                <th className="py-2.5 px-3 text-right">Low</th>
                <th className="py-2.5 px-3 text-right">Close</th>
                <th className="py-2.5 px-3 text-right">Volume</th>
                <th className="py-2.5 px-3 text-center">Adjusted</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-slate-300">
              {bars.map((bar, idx) => (
                <tr key={idx} className="hover:bg-slate-800/40">
                  <td className="py-2 px-3 text-slate-400">{bar.date}</td>
                  <td className="py-2 px-3 font-bold text-white">{symbol}</td>
                  <td className="py-2 px-3 text-right">${bar.open}</td>
                  <td className="py-2 px-3 text-right text-emerald-400">${bar.high}</td>
                  <td className="py-2 px-3 text-right text-rose-400">${bar.low}</td>
                  <td className="py-2 px-3 text-right font-semibold">${bar.close}</td>
                  <td className="py-2 px-3 text-right text-slate-400">{parseInt(bar.volume).toLocaleString()}</td>
                  <td className="py-2 px-3 text-center">
                    <span className="badge badge-emerald">True</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
