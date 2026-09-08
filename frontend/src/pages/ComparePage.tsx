import React from 'react';
import { GitCompare } from 'lucide-react';
import type { Experiment } from '../types';
import { EquityCurveChart } from '../components/charts/FinancialCharts';

interface ComparePageProps {
  experiments: Experiment[];
}

export const ComparePage: React.FC<ComparePageProps> = ({ experiments }) => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
          <GitCompare className="w-6 h-6 text-indigo-400" />
          <span>Multi-Strategy Comparison Workspace</span>
        </h1>
        <p className="text-xs text-slate-400 font-mono">Side-by-side Quantitative Matrix & Equity Curve Overlay</p>
      </div>

      {/* Comparison Matrix Table */}
      <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800/80 overflow-x-auto">
        <table className="w-full border-collapse text-left text-xs tabular-nums">
          <thead>
            <tr className="border-b border-slate-800 text-slate-400 font-mono">
              <th className="py-3 px-4">Metric / Parameter</th>
              {experiments.map((exp) => (
                <th key={exp.id} className="py-3 px-4 text-center font-bold text-indigo-300">
                  {exp.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-mono">
            <tr>
              <td className="py-3 px-4 font-semibold text-slate-300">Strategy Model</td>
              {experiments.map((exp) => (
                <td key={exp.id} className="py-3 px-4 text-center text-slate-200">{exp.strategy_name}</td>
              ))}
            </tr>
            <tr>
              <td className="py-3 px-4 font-semibold text-slate-300">Universe</td>
              {experiments.map((exp) => (
                <td key={exp.id} className="py-3 px-4 text-center text-indigo-400 font-bold">{exp.asset_universe.join(', ')}</td>
              ))}
            </tr>
            <tr>
              <td className="py-3 px-4 font-semibold text-slate-300">CAGR (%)</td>
              {experiments.map((exp) => (
                <td key={exp.id} className="py-3 px-4 text-center font-bold text-emerald-400">+{exp.cagr}%</td>
              ))}
            </tr>
            <tr>
              <td className="py-3 px-4 font-semibold text-slate-300">Sharpe Ratio</td>
              {experiments.map((exp) => (
                <td key={exp.id} className="py-3 px-4 text-center font-bold text-slate-100">{exp.sharpe}</td>
              ))}
            </tr>
            <tr>
              <td className="py-3 px-4 font-semibold text-slate-300">Max Drawdown (%)</td>
              {experiments.map((exp) => (
                <td key={exp.id} className="py-3 px-4 text-center font-bold text-rose-400">{exp.max_dd}%</td>
              ))}
            </tr>
            <tr>
              <td className="py-3 px-4 font-semibold text-slate-300">Sortino Ratio</td>
              {experiments.map((exp) => (
                <td key={exp.id} className="py-3 px-4 text-center text-slate-300">{exp.metrics.sortino_ratio}</td>
              ))}
            </tr>
            <tr>
              <td className="py-3 px-4 font-semibold text-slate-300">Win Rate (%)</td>
              {experiments.map((exp) => (
                <td key={exp.id} className="py-3 px-4 text-center text-slate-300">{exp.metrics.win_rate}%</td>
              ))}
            </tr>
            <tr>
              <td className="py-3 px-4 font-semibold text-slate-300">Profit Factor</td>
              {experiments.map((exp) => (
                <td key={exp.id} className="py-3 px-4 text-center text-slate-300">{exp.metrics.profit_factor}</td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      {/* Equity Overlay Chart */}
      <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800/80 space-y-4">
        <h2 className="text-lg font-bold text-slate-100">Overlaid Strategy Equity Growth</h2>
        <EquityCurveChart
          data={Array.from({ length: 100 }, (_, i) => ({
            timestamp: `2024-${String(Math.floor(i / 8) + 1).padStart(2, '0')}-01`,
            equity: 1000000 * (1 + (i * 0.008 + Math.sin(i / 5) * 0.05)),
            benchmark_equity: 1000000 * (1 + i * 0.004),
            drawdown: -2.5,
          }))}
          showBenchmark={true}
        />
      </div>
    </div>
  );
};
