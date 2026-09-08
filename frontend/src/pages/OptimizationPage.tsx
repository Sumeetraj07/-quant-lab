import React, { useState } from 'react';
import { Sliders, Play, AlertTriangle } from 'lucide-react';
import type { OptimizationResult } from '../types';
import { Button } from '../components/common/Button';
import { quantApi } from '../services/api';

export const OptimizationPage: React.FC = () => {
  const [fastMin, setFastMin] = useState(5);
  const [fastMax, setFastMax] = useState(30);
  const [fastStep, setFastStep] = useState(5);

  const [slowMin, setSlowMin] = useState(50);
  const [slowMax, setSlowMax] = useState(150);
  const [slowStep, setSlowStep] = useState(25);

  const [results, setResults] = useState<OptimizationResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const fastCount = Math.floor((fastMax - fastMin) / fastStep) + 1;
  const slowCount = Math.floor((slowMax - slowMin) / slowStep) + 1;
  const totalCombinations = fastCount * slowCount;

  const handleRunOptimization = () => {
    setIsRunning(true);
    setTimeout(() => {
      setResults(quantApi.getOptimizationResults());
      setIsRunning(false);
    }, 800);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
          <Sliders className="w-6 h-6 text-indigo-400" />
          <span>Parameter Sweep Optimization Workbench</span>
        </h1>
        <p className="text-xs text-slate-400 font-mono">Exhaustive Parameter Matrix Research & Frontier Evaluation</p>
      </div>

      {/* Historical Disclaimer Alert */}
      <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold">RESEARCH WARNING:</span> Parameter sweeps evaluate in-sample historical data. High in-sample Sharpe ratios can indicate overfitting. Always validate top parameters using Walk-Forward out-of-sample testing.
        </div>
      </div>

      {/* Parameter Ranges Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-4">
          <h2 className="text-sm font-bold text-indigo-400 font-mono uppercase">Fast MA Window Range</h2>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] text-slate-500 font-mono">Min</label>
              <input type="number" value={fastMin} onChange={(e) => setFastMin(Number(e.target.value))} className="w-full p-2 rounded bg-slate-950 border border-slate-700 text-xs font-mono" />
            </div>
            <div>
              <label className="text-[10px] text-slate-500 font-mono">Max</label>
              <input type="number" value={fastMax} onChange={(e) => setFastMax(Number(e.target.value))} className="w-full p-2 rounded bg-slate-950 border border-slate-700 text-xs font-mono" />
            </div>
            <div>
              <label className="text-[10px] text-slate-500 font-mono">Step</label>
              <input type="number" value={fastStep} onChange={(e) => setFastStep(Number(e.target.value))} className="w-full p-2 rounded bg-slate-950 border border-slate-700 text-xs font-mono" />
            </div>
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-4">
          <h2 className="text-sm font-bold text-indigo-400 font-mono uppercase">Slow MA Window Range</h2>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] text-slate-500 font-mono">Min</label>
              <input type="number" value={slowMin} onChange={(e) => setSlowMin(Number(e.target.value))} className="w-full p-2 rounded bg-slate-950 border border-slate-700 text-xs font-mono" />
            </div>
            <div>
              <label className="text-[10px] text-slate-500 font-mono">Max</label>
              <input type="number" value={slowMax} onChange={(e) => setSlowMax(Number(e.target.value))} className="w-full p-2 rounded bg-slate-950 border border-slate-700 text-xs font-mono" />
            </div>
            <div>
              <label className="text-[10px] text-slate-500 font-mono">Step</label>
              <input type="number" value={slowStep} onChange={(e) => setSlowStep(Number(e.target.value))} className="w-full p-2 rounded bg-slate-950 border border-slate-700 text-xs font-mono" />
            </div>
          </div>
        </div>
      </div>

      {/* Combinations Counter & Action */}
      <div className="p-4 rounded-xl bg-slate-900/90 border border-indigo-500/30 flex items-center justify-between">
        <div className="font-mono text-xs">
          <span className="text-slate-400">Total Combinations to Test: </span>
          <span className="text-indigo-400 font-bold text-sm">{totalCombinations} Runs</span>
        </div>

        <Button variant="primary" isLoading={isRunning} icon={<Play className="w-4 h-4 text-emerald-400" />} onClick={handleRunOptimization}>
          Run Parameter Sweep
        </Button>
      </div>

      {/* Results Matrix */}
      {results.length > 0 && (
        <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-4">
          <h2 className="text-lg font-bold text-slate-100">Top Parameter Combinations (Sorted by Sharpe)</h2>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs tabular-nums font-mono">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="py-2.5 px-3">Fast MA</th>
                  <th className="py-2.5 px-3">Slow MA</th>
                  <th className="py-2.5 px-3 text-right">Sharpe Ratio</th>
                  <th className="py-2.5 px-3 text-right">CAGR (%)</th>
                  <th className="py-2.5 px-3 text-right">Max DD (%)</th>
                  <th className="py-2.5 px-3 text-right">Win Rate (%)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {results.map((res, i) => (
                  <tr key={i} className="hover:bg-slate-800/40">
                    <td className="py-3 px-3 font-bold text-indigo-300">{res.param_combination.fast_window}</td>
                    <td className="py-3 px-3 font-bold text-indigo-300">{res.param_combination.slow_window}</td>
                    <td className="py-3 px-3 text-right font-bold text-emerald-400">{res.sharpe}</td>
                    <td className="py-3 px-3 text-right font-bold text-slate-100">+{res.cagr}%</td>
                    <td className="py-3 px-3 text-right font-bold text-rose-400">{res.max_drawdown}%</td>
                    <td className="py-3 px-3 text-right text-slate-300">{res.win_rate}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
