import React from 'react';
import { MetricCard } from '../components/metrics/MetricCard';
import { ShieldAlert, PieChart, BarChart3 } from 'lucide-react';
import type { RiskMetrics } from '../types';

export const RiskPage: React.FC = () => {
  const risk: RiskMetrics = {
    var_95: -1.82,
    cvar_95: -2.45,
    volatility: 13.9,
    beta: 0.68,
    gross_exposure: 95.0,
    net_exposure: 95.0,
    leverage: 1.0,
    max_drawdown: -11.84,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-rose-400" />
            <span>Portfolio Risk Analytics Terminal</span>
          </h1>
          <p className="text-xs text-slate-400 font-mono">Value at Risk, Tail Risk (CVaR), Beta & Market Exposure Metrics</p>
        </div>
      </div>

      {/* Primary Risk Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Value at Risk (VaR 95%)"
          value={`${risk.var_95}%`}
          isNegative
          tooltipText="Estimated 1-day maximum loss at 95% confidence level."
        />
        <MetricCard
          label="Conditional VaR (CVaR)"
          value={`${risk.cvar_95}%`}
          isNegative
          tooltipText="Expected Tail Loss — average loss in the worst 5% of daily returns."
        />
        <MetricCard
          label="Portfolio Beta"
          value={risk.beta.toFixed(2)}
          tooltipText="Sensitivity relative to benchmark market movements (NIFTY 50 = 1.0)."
        />
        <MetricCard
          label="Annual Volatility"
          value={`${risk.volatility}%`}
          tooltipText="Annualized standard deviation of daily strategy returns."
        />
      </div>

      {/* Exposure & Leverage Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-4">
          <div className="flex items-center gap-2 text-indigo-400 font-bold text-sm">
            <PieChart className="w-4 h-4" />
            <span>Market Exposure Breakdown</span>
          </div>
          <div className="space-y-3 font-mono text-xs">
            <div className="flex justify-between border-b border-slate-800 pb-2">
              <span className="text-slate-400">Gross Exposure:</span>
              <span className="text-slate-100 font-bold">{risk.gross_exposure}%</span>
            </div>
            <div className="flex justify-between border-b border-slate-800 pb-2">
              <span className="text-slate-400">Net Exposure:</span>
              <span className="text-slate-100 font-bold">{risk.net_exposure}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Effective Leverage:</span>
              <span className="text-emerald-400 font-bold">{risk.leverage}x</span>
            </div>
          </div>
        </div>

        {/* Tail Risk Stress Tests */}
        <div className="md:col-span-2 p-6 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-4">
          <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
            <BarChart3 className="w-4 h-4" />
            <span>Stress Testing & Tail Shock Scenarios</span>
          </div>

          <div className="grid grid-cols-3 gap-3 font-mono text-xs">
            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
              <div className="text-slate-500">2008 Crash Replay</div>
              <div className="text-sm font-bold text-rose-400">-14.20%</div>
              <div className="text-[10px] text-slate-500">Simulated Drawdown</div>
            </div>
            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
              <div className="text-slate-500">2020 COVID Shock</div>
              <div className="text-sm font-bold text-rose-400">-11.84%</div>
              <div className="text-[10px] text-slate-500">Simulated Drawdown</div>
            </div>
            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
              <div className="text-slate-500">Interest Rate Spike</div>
              <div className="text-sm font-bold text-amber-400">-6.50%</div>
              <div className="text-[10px] text-slate-500">Simulated Drawdown</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
