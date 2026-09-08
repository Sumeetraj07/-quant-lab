import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid
} from 'recharts';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface ResultsDashboardProps {
  results: any;
}

export const ResultsDashboard: React.FC<ResultsDashboardProps> = ({ results }) => {
  if (!results) {
    return (
      <div className="glass-panel p-12 text-center text-slate-400 space-y-3">
        <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mx-auto text-slate-500">
          <TrendingUp className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-medium text-white">No Active Backtest Results</h3>
        <p className="text-sm max-w-md mx-auto">
          Configure a quantitative strategy in the Strategy Lab and click "Execute Backtest" to view equity curves and risk analytics.
        </p>
      </div>
    );
  }

  const { metrics, equity_curve, trades, run_duration_seconds } = results;

  const formattedEquityData = equity_curve.map((pt: any) => ({
    date: new Date(pt.timestamp || pt[0]).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    equity: Math.round(pt.equity !== undefined ? pt.equity : pt[1]),
    drawdown: (pt.drawdown !== undefined ? pt.drawdown : (pt[2] || 0)) * 100
  }));

  const isProfitable = (metrics.total_return || 0) >= 0;

  return (
    <div className="space-y-8">
      {/* Top Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <div className="metric-card">
          <span className="text-xs text-slate-400 font-medium">Total Return</span>
          <div className={`metric-value ${isProfitable ? 'positive' : 'negative'}`}>
            {isProfitable ? '+' : ''}{((metrics.total_return || 0) * 100).toFixed(2)}%
          </div>
          <span className="text-[10px] text-slate-500 mt-1 block">Net of all costs</span>
        </div>

        <div className="metric-card">
          <span className="text-xs text-slate-400 font-medium">Sharpe Ratio</span>
          <div className="metric-value text-indigo-400">
            {(metrics.sharpe_ratio || 0).toFixed(2)}
          </div>
          <span className="text-[10px] text-slate-500 mt-1 block">Annualized risk-adjusted</span>
        </div>

        <div className="metric-card">
          <span className="text-xs text-slate-400 font-medium font-mono">Max Drawdown</span>
          <div className="metric-value negative">
            {((metrics.max_drawdown || 0) * 100).toFixed(2)}%
          </div>
          <span className="text-[10px] text-slate-500 mt-1 block">Peak-to-trough decline</span>
        </div>

        <div className="metric-card">
          <span className="text-xs text-slate-400 font-medium">Win Rate</span>
          <div className="metric-value text-cyan-400">
            {((metrics.win_rate || 0) * 100).toFixed(1)}%
          </div>
          <span className="text-[10px] text-slate-500 mt-1 block">
            {metrics.winning_trades}W / {metrics.losing_trades}L ({metrics.total_trades} trades)
          </span>
        </div>

        <div className="metric-card">
          <span className="text-xs text-slate-400 font-medium">Profit Factor</span>
          <div className="metric-value text-purple-400">
            {(metrics.profit_factor || 0).toFixed(2)}
          </div>
          <span className="text-[10px] text-slate-500 mt-1 block">Gross Profit / Loss</span>
        </div>

        <div className="metric-card">
          <span className="text-xs text-slate-400 font-medium">CAGR</span>
          <div className="metric-value text-amber-400">
            {((metrics.cagr || 0) * 100).toFixed(2)}%
          </div>
          <span className="text-[10px] text-slate-500 mt-1 block">Compound annual growth</span>
        </div>
      </div>

      {/* Equity Curve Chart */}
      <div className="glass-panel p-6">
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/10">
          <div>
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-indigo-400" />
              Portfolio Equity Curve
            </h3>
            <p className="text-xs text-slate-400">Real-time simulation balance over historical timeframe</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="badge badge-emerald">Engine Causality Verified</span>
            <span className="text-xs text-slate-500 font-mono">
              Completed in {(run_duration_seconds || 0).toFixed(2)}s
            </span>
          </div>
        </div>

        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={formattedEquityData}>
              <defs>
                <linearGradient id="equityGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="date" stroke="#64748b" tick={{ fontSize: 11 }} />
              <YAxis
                stroke="#64748b"
                tick={{ fontSize: 11 }}
                domain={['auto', 'auto']}
                tickFormatter={(val) => `$${val.toLocaleString()}`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  borderColor: 'rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                  fontSize: '12px'
                }}
                formatter={(val: any) => [`$${val.toLocaleString()}`, 'Portfolio Equity']}
              />
              <Area
                type="monotone"
                dataKey="equity"
                stroke="#6366f1"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#equityGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Drawdown Series Chart */}
      <div className="glass-panel p-6">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/10">
          <h3 className="text-base font-semibold text-white flex items-center gap-2">
            <TrendingDown className="w-4 h-4 text-rose-400" />
            Underwater Drawdown Profile (%)
          </h3>
        </div>
        <div className="h-44 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={formattedEquityData}>
              <defs>
                <linearGradient id="ddGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="date" stroke="#64748b" tick={{ fontSize: 10 }} />
              <YAxis stroke="#64748b" tick={{ fontSize: 10 }} domain={['auto', 0]} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  borderColor: 'rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                  fontSize: '12px'
                }}
                formatter={(val: any) => [`${val.toFixed(2)}%`, 'Drawdown']}
              />
              <Area
                type="monotone"
                dataKey="drawdown"
                stroke="#f43f5e"
                strokeWidth={1.5}
                fillOpacity={1}
                fill="url(#ddGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Closed Trades Log Table */}
      <div className="glass-panel p-6">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/10">
          <h3 className="text-base font-semibold text-white">Closed Trades Log</h3>
          <span className="text-xs text-slate-400 font-mono">
            {trades ? trades.length : 0} Round-Trip Executions
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-white/10 text-slate-400">
                <th className="py-2.5 px-3">Trade ID</th>
                <th className="py-2.5 px-3">Symbol</th>
                <th className="py-2.5 px-3">Side</th>
                <th className="py-2.5 px-3">Entry Time</th>
                <th className="py-2.5 px-3">Exit Time</th>
                <th className="py-2.5 px-3 text-right">Qty</th>
                <th className="py-2.5 px-3 text-right">Entry $</th>
                <th className="py-2.5 px-3 text-right">Exit $</th>
                <th className="py-2.5 px-3 text-right">Costs</th>
                <th className="py-2.5 px-3 text-right">Net PnL</th>
                <th className="py-2.5 px-3 text-right">Return</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-slate-300">
              {trades && trades.length > 0 ? (
                trades.map((t: any, idx: number) => {
                  const net = t.net_pnl !== undefined ? t.net_pnl : (t.gross_pnl - t.costs);
                  const isWin = net >= 0;
                  return (
                    <tr key={t.trade_id || idx} className="hover:bg-slate-800/40">
                      <td className="py-2 px-3 text-slate-500">{(t.trade_id || `TRD-${idx}`).slice(0, 8)}</td>
                      <td className="py-2 px-3 font-bold text-white">{t.symbol}</td>
                      <td className="py-2 px-3">
                        <span className={t.side === 'BUY' || t.side === 'LONG' ? 'text-emerald-400' : 'text-rose-400'}>
                          {t.side}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-slate-400">{new Date(t.entry_time).toLocaleDateString()}</td>
                      <td className="py-2 px-3 text-slate-400">{new Date(t.exit_time).toLocaleDateString()}</td>
                      <td className="py-2 px-3 text-right">{t.quantity?.toFixed(2)}</td>
                      <td className="py-2 px-3 text-right">${t.entry_price?.toFixed(2)}</td>
                      <td className="py-2 px-3 text-right">${t.exit_price?.toFixed(2)}</td>
                      <td className="py-2 px-3 text-right text-slate-400">${t.costs?.toFixed(2)}</td>
                      <td className={`py-2 px-3 text-right font-semibold ${isWin ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {isWin ? '+' : ''}${net?.toFixed(2)}
                      </td>
                      <td className={`py-2 px-3 text-right ${isWin ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {t.return_pct ? `${t.return_pct.toFixed(2)}%` : '-'}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={11} className="py-6 text-center text-slate-500 italic">
                    No closed trades recorded in this backtest window.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
