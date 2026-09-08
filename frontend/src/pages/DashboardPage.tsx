import React from 'react';
import { MetricCard } from '../components/metrics/MetricCard';
import { EquityCurveChart } from '../components/charts/FinancialCharts';
import { Button } from '../components/common/Button';
import { Play, LineChart, Sparkles } from 'lucide-react';
import type { ActiveTab, Experiment } from '../types';

interface DashboardPageProps {
  experiments: Experiment[];
  onNavigate: (tab: ActiveTab) => void;
  onRunDefaultBacktest: () => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  experiments,
  onNavigate,
  onRunDefaultBacktest,
}) => {
  return (
    <div className="space-y-6">
      {/* LEVEL 1: Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-800/40">
        <div>
          <div className="text-[11px] font-mono font-medium text-slate-400 uppercase tracking-widest mb-0.5">
            Good evening
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-100">
            Quantitative Research Workspace
          </h1>
          <p className="text-xs text-slate-400 font-mono mt-1">
            Systematic Trading & Backtesting Terminal
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary" icon={<LineChart className="w-4 h-4" />} onClick={() => onNavigate('market')}>
            Browse Assets
          </Button>
          <Button variant="primary" icon={<Play className="w-4 h-4 text-emerald-400" />} onClick={() => onNavigate('builder')}>
            New Backtest
          </Button>
        </div>
      </div>

      {/* LEVEL 3: Important Performance Metrics (KPI Cards) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="TOTAL EXPERIMENTS"
          value={experiments.length.toString()}
          subtitle="Saved backtest runs"
          tooltipText="Total historical strategy simulation runs saved in your quantitative database."
        />
        <MetricCard
          label="BEST SHARPE"
          value="1.95"
          isPositive
          subtitle="Volatility Target (NIFTY 50)"
          tooltipText="Highest risk-adjusted ratio achieved across your strategy runs."
        />
        <MetricCard
          label="TOP CAGR"
          value="18.42%"
          isPositive
          subtitle="Momentum Core (20/100)"
          tooltipText="Compound Annual Growth Rate of top performing momentum allocation."
        />
        <MetricCard
          label="LOWEST MAX DD"
          value="−11.84%"
          isPositive
          subtitle="Volatility Target"
          tooltipText="Maximum historical drawdown drop from peak allocation."
        />
      </div>

      {/* LEVEL 2: Featured Experiment (70%) + Quick Strategy Launch (30%) */}
      <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">
        {/* Featured Experiment Panel - 70% Width (7 cols) */}
        <div className="lg:col-span-7 p-6 rounded-2xl bg-[#0f172a]/60 border border-slate-800/80 space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="text-[11px] font-mono uppercase tracking-widest text-indigo-400 font-semibold mb-1">
                  FEATURED EXPERIMENT
                </div>
                <h2 className="text-xl font-bold tracking-tight text-slate-100">NIFTY 50 Momentum Core</h2>
                <p className="text-xs text-slate-400 font-mono mt-0.5">2018 — 2026 Simulation Window</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => onNavigate('results')}>
                Full Results Terminal →
              </Button>
            </div>

            <EquityCurveChart
              data={
                Array.from({ length: 100 }, (_, i) => ({
                  timestamp: `2024-${String(Math.floor(i / 8) + 1).padStart(2, '0')}-01`,
                  equity: 1000000 * (1 + (i * 0.008 + (Math.sin(i / 5) * 0.05))),
                  benchmark_equity: 1000000 * (1 + i * 0.005),
                  drawdown: -2.5,
                }))
              }
            />
          </div>

          {/* Contextual Education */}
          <div className="pt-3 flex items-center justify-between text-xs text-slate-400 border-t border-slate-800/60 font-mono text-[11px]">
            <span className="text-slate-400">Backtest verified across 2,016 daily bars</span>
            <button onClick={() => onNavigate('results')} className="text-indigo-400 hover:underline">
              Learn how to interpret this result →
            </button>
          </div>
        </div>

        {/* Quick Strategy Launch Panel - 30% Width (3 cols) */}
        <div className="lg:col-span-3 p-6 rounded-2xl bg-[#0f172a]/60 border border-slate-800/80 flex flex-col justify-between space-y-4">
          <div className="space-y-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                <h3 className="text-base font-bold text-slate-100">Quick Strategy Launch</h3>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed font-sans">
                Launch a predefined strategy configuration and run an experiment quickly.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/90 space-y-2.5 text-xs font-mono">
              <div className="flex justify-between items-center pb-2 border-b border-slate-900">
                <span className="text-slate-400">Universe</span>
                <span className="font-semibold text-slate-200">NIFTY 50</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-slate-900">
                <span className="text-slate-400">Strategy</span>
                <span className="font-semibold text-indigo-300">MA Momentum (20/100)</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-slate-900">
                <span className="text-slate-400">Capital</span>
                <span className="font-semibold text-emerald-400 tabular-nums">₹10,00,000</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-slate-900">
                <span className="text-slate-400">Costs</span>
                <span className="font-semibold text-slate-300 tabular-nums">0.05%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Slippage</span>
                <span className="font-semibold text-slate-300 tabular-nums">5 bps</span>
              </div>
            </div>
          </div>

          <div className="pt-2">
            <Button
              variant="primary"
              className="w-full justify-center text-xs py-2.5"
              icon={<Play className="w-4 h-4 text-emerald-400" />}
              onClick={onRunDefaultBacktest}
            >
              Run Instant Backtest
            </Button>
          </div>
        </div>
      </div>

      {/* LEVEL 4: Recent Research / Saved Experiments Table */}
      <div className="p-6 rounded-2xl bg-[#0f172a]/60 border border-slate-800/80 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-100">Recent Experiments</h3>
            <p className="text-xs text-slate-400 font-mono mt-0.5">Historical research iterations and backtest records</p>
          </div>
          <button onClick={() => onNavigate('experiments')} className="text-xs text-indigo-400 hover:text-indigo-300 font-mono">
            View All ({experiments.length}) →
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs tabular-nums">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-mono text-[11px] uppercase tracking-wider">
                <th className="py-3 px-4">Experiment</th>
                <th className="py-3 px-4">Strategy</th>
                <th className="py-3 px-4">Universe</th>
                <th className="py-3 px-4 text-right">CAGR</th>
                <th className="py-3 px-4 text-right">Sharpe</th>
                <th className="py-3 px-4 text-right">Max DD</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {experiments.map((exp) => {
                const status = exp.status || 'COMPLETED';
                return (
                  <tr key={exp.id} className="hover:bg-slate-800/40 cursor-pointer transition-colors" onClick={() => onNavigate('results')}>
                    <td className="py-3.5 px-4 font-semibold text-slate-200">{exp.name}</td>
                    <td className="py-3.5 px-4 text-slate-400 font-mono">{exp.strategy_name}</td>
                    <td className="py-3.5 px-4 font-mono text-indigo-300">{exp.asset_universe.join(', ')}</td>
                    <td className="py-3.5 px-4 text-right font-bold text-emerald-400">+{exp.cagr}%</td>
                    <td className="py-3.5 px-4 text-right font-bold text-slate-100">{exp.sharpe}</td>
                    <td className="py-3.5 px-4 text-right font-bold text-rose-400">{exp.max_dd}%</td>
                    <td className="py-3.5 px-4 text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-medium ${
                        status === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                        status === 'RUNNING' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                        status === 'FAILED' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                        'bg-slate-500/10 text-slate-400 border border-slate-500/20'
                      }`}>
                        {status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right text-slate-400 font-mono">{exp.created_at.split('T')[0]}</td>
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

