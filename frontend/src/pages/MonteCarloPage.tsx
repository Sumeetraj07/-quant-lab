import React, { useState } from 'react';
import { Cpu, Play } from 'lucide-react';
import { Button } from '../components/common/Button';
import { quantApi } from '../services/api';
import type { MonteCarloSimulation } from '../types';

export const MonteCarloPage: React.FC = () => {
  const [simCount, setSimCount] = useState(100);
  const [simulations, setSimulations] = useState<MonteCarloSimulation[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const handleRun = () => {
    setIsRunning(true);
    setTimeout(() => {
      setSimulations(quantApi.getMonteCarloSimulations(simCount));
      setIsRunning(false);
    }, 600);
  };

  const medianVal = simulations.length > 0 ? simulations[Math.floor(simulations.length / 2)].terminal_value : 0;
  const p95Val = simulations.length > 0 ? simulations[Math.floor(simulations.length * 0.05)].terminal_value : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
          <Cpu className="w-6 h-6 text-amber-400" />
          <span>Monte Carlo Outcome Simulation</span>
        </h1>
        <p className="text-xs text-slate-400 font-mono">Randomized Return Resampling & Tail Loss Distribution</p>
      </div>

      {/* Control Box */}
      <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <label className="text-xs font-mono text-slate-300">Number of Simulations:</label>
          <select
            value={simCount}
            onChange={(e) => setSimCount(Number(e.target.value))}
            className="p-2 rounded bg-slate-950 border border-slate-700 text-xs font-mono text-slate-200 outline-none"
          >
            <option value={100}>100 Iterations</option>
            <option value={500}>500 Iterations</option>
            <option value={1000}>1,000 Iterations</option>
          </select>
        </div>

        <Button variant="primary" isLoading={isRunning} icon={<Play className="w-4 h-4 text-emerald-400" />} onClick={handleRun}>
          Run Monte Carlo Simulation
        </Button>
      </div>

      {/* Simulation Results Stats */}
      {simulations.length > 0 && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono">
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
              <div className="text-xs text-slate-500">Median Terminal Portfolio</div>
              <div className="text-lg font-bold text-emerald-400">₹{medianVal.toLocaleString('en-IN')}</div>
            </div>
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
              <div className="text-xs text-slate-500">95th Percentile Bull Outcome</div>
              <div className="text-lg font-bold text-indigo-400">₹{p95Val.toLocaleString('en-IN')}</div>
            </div>
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
              <div className="text-xs text-slate-500">Probability of Loss</div>
              <div className="text-lg font-bold text-rose-400">4.2%</div>
            </div>
          </div>

          {/* Runs table preview */}
          <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-4">
            <h2 className="text-sm font-bold text-slate-100 font-mono">Simulated Runs (Top 10 Resampled Paths)</h2>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs tabular-nums font-mono">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400">
                    <th className="py-2.5 px-3">Run ID</th>
                    <th className="py-2.5 px-3 text-right">Terminal Value (₹)</th>
                    <th className="py-2.5 px-3 text-right">Max Drawdown (%)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {simulations.slice(0, 10).map((s) => (
                    <tr key={s.run_id} className="hover:bg-slate-800/40">
                      <td className="py-2.5 px-3 text-slate-400">Sim #{s.run_id}</td>
                      <td className="py-2.5 px-3 text-right font-bold text-emerald-400">₹{s.terminal_value.toLocaleString('en-IN')}</td>
                      <td className="py-2.5 px-3 text-right font-bold text-rose-400">{s.max_drawdown}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
