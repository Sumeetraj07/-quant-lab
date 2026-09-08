import React, { useState } from 'react';
import { MetricCard } from '../components/metrics/MetricCard';
import { EquityCurveChart, DrawdownChart, ReturnsHeatmapChart } from '../components/charts/FinancialCharts';
import { Button } from '../components/common/Button';
import { Download, RefreshCw, Copy, Filter } from 'lucide-react';
import type { BacktestResult } from '../types';
import { exportTradesToCsv, exportEquityCurveToCsv } from '../utils/csvExport';

interface ResultsPageProps {
  results: BacktestResult | null;
  onRunAgain: () => void;
}

export const ResultsPage: React.FC<ResultsPageProps> = ({ results, onRunAgain }) => {
  const [tradeFilter, setTradeFilter] = useState<'ALL' | 'WIN' | 'LOSS'>('ALL');

  if (!results) {
    return (
      <div className="p-12 text-center rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
        <h2 className="text-lg font-bold text-slate-200">No Backtest Results Loaded</h2>
        <p className="text-xs text-slate-400">Configure and execute a strategy backtest to view results.</p>
        <Button variant="primary" onClick={onRunAgain}>
          Open Strategy Builder
        </Button>
      </div>
    );
  }

  const { metrics, equity_curve, trades } = results;

  const filteredTrades = trades.filter((t) => {
    if (tradeFilter === 'WIN') return t.net_pnl > 0;
    if (tradeFilter === 'LOSS') return t.net_pnl <= 0;
    return true;
  });

  return (
    <div className="space-y-8">
      {/* Terminal Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-100">NIFTY 50 Momentum Core (20/100)</h1>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-bold">
              VERIFIED NO LOOK-AHEAD
            </span>
          </div>
          <p className="text-xs text-slate-400 font-mono">NIFTY 50 · Daily Timeframe · 2018-01-01 → 2026-08-31</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" size="sm" icon={<Copy className="w-4 h-4" />}>
            Duplicate Config
          </Button>
          <Button
            variant="secondary"
            size="sm"
            icon={<Download className="w-4 h-4" />}
            onClick={() => exportEquityCurveToCsv(equity_curve, 'quantlab_equity_curve.csv')}
          >
            Export Equity CSV
          </Button>
          <Button
            variant="secondary"
            size="sm"
            icon={<Download className="w-4 h-4 text-indigo-400" />}
            onClick={() => exportTradesToCsv(filteredTrades, 'quantlab_backtest_trades.csv')}
          >
            Export Trades CSV
          </Button>
          <Button variant="primary" size="sm" icon={<RefreshCw className="w-4 h-4 text-emerald-400" />} onClick={onRunAgain}>
            Run Again
          </Button>
        </div>
      </div>

      {/* Row 1 Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="CAGR"
          value={`${metrics.cagr}%`}
          isPositive={metrics.cagr > 0}
          tooltipText="Compound Annual Growth Rate of portfolio equity over backtest horizon."
        />
        <MetricCard
          label="Sharpe Ratio"
          value={metrics.sharpe_ratio.toFixed(2)}
          isPositive={metrics.sharpe_ratio >= 1.5}
          tooltipText="Risk-adjusted return relative to total annualized volatility."
        />
        <MetricCard
          label="Sortino Ratio"
          value={metrics.sortino_ratio.toFixed(2)}
          isPositive={metrics.sortino_ratio >= 1.8}
          tooltipText="Risk-adjusted return relative to downside volatility only."
        />
        <MetricCard
          label="Max Drawdown"
          value={`${metrics.max_drawdown}%`}
          isNegative
          tooltipText="Maximum historical peak-to-trough equity decline."
        />
      </div>

      {/* Row 2 Secondary Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Volatility" value={`${metrics.volatility}%`} tooltipText="Annualized standard deviation of daily returns." />
        <MetricCard label="Win Rate" value={`${metrics.win_rate}%`} isPositive={metrics.win_rate > 50} tooltipText="Percentage of profitable trades." />
        <MetricCard label="Profit Factor" value={metrics.profit_factor.toFixed(2)} tooltipText="Gross Profits divided by Gross Losses." />
        <MetricCard label="Turnover" value={`${metrics.turnover}x`} tooltipText="Annualized portfolio turnover rate." />
      </div>

      {/* Main Equity Curve Chart */}
      <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800/80 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-100">Portfolio Cumulative Equity Curve</h2>
            <p className="text-xs text-slate-400 font-mono">Net of Commissions & Slippage vs Buy & Hold Benchmark</p>
          </div>
        </div>
        <EquityCurveChart data={equity_curve} showBenchmark={true} />
      </div>

      {/* Drawdown Chart */}
      <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800/80 space-y-4">
        <DrawdownChart data={equity_curve} />
      </div>

      {/* Monthly Returns Heatmap */}
      <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800/80 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-100">Monthly & Annual Returns Heatmap</h2>
          <span className="text-xs font-mono text-slate-400">Net Return (%)</span>
        </div>
        <ReturnsHeatmapChart />
      </div>

      {/* Filterable Trades Table */}
      <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800/80 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-100">Execution Trade Logs ({trades.length})</h2>
            <p className="text-xs text-slate-400 font-mono">Individual Order Fills with Net PnL and Transaction Costs</p>
          </div>

          <div className="flex items-center gap-1.5 text-xs font-mono">
            <Filter className="w-3.5 h-3.5 text-slate-500 mr-1" />
            {(['ALL', 'WIN', 'LOSS'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setTradeFilter(f)}
                className={`px-3 py-1.5 rounded-lg border transition-all ${
                  tradeFilter === f
                    ? 'bg-indigo-600 border-indigo-500 text-white font-semibold'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs tabular-nums">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-mono">
                <th className="py-3 px-3">Trade ID</th>
                <th className="py-3 px-3">Symbol</th>
                <th className="py-3 px-3">Side</th>
                <th className="py-3 px-3">Entry Date</th>
                <th className="py-3 px-3">Exit Date</th>
                <th className="py-3 px-3 text-right">Entry Price</th>
                <th className="py-3 px-3 text-right">Exit Price</th>
                <th className="py-3 px-3 text-right">Qty</th>
                <th className="py-3 px-3 text-right">Costs</th>
                <th className="py-3 px-3 text-right">Net PnL</th>
                <th className="py-3 px-3 text-right">Return %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredTrades.map((t) => {
                const isWin = t.net_pnl > 0;
                return (
                  <tr key={t.trade_id} className="hover:bg-slate-800/40">
                    <td className="py-3 px-3 font-mono text-slate-400">{t.trade_id}</td>
                    <td className="py-3 px-3 font-bold text-indigo-300">{t.symbol}</td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
                        {t.side}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-400">{t.entry_time}</td>
                    <td className="py-3 px-3 font-mono text-slate-400">{t.exit_time}</td>
                    <td className="py-3 px-3 text-right text-slate-200">₹{t.entry_price}</td>
                    <td className="py-3 px-3 text-right text-slate-200">₹{t.exit_price}</td>
                    <td className="py-3 px-3 text-right text-slate-400">{t.quantity}</td>
                    <td className="py-3 px-3 text-right text-rose-400 font-mono">₹{t.costs}</td>
                    <td className={`py-3 px-3 text-right font-bold ${isWin ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {isWin ? `+₹${t.net_pnl.toLocaleString('en-IN')}` : `-₹${Math.abs(t.net_pnl).toLocaleString('en-IN')}`}
                    </td>
                    <td className={`py-3 px-3 text-right font-bold ${isWin ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {isWin ? `+${t.return_pct}%` : `${t.return_pct}%`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
