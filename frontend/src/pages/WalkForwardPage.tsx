import React from 'react';
import { Cpu, ArrowRight, ShieldCheck } from 'lucide-react';
import { quantApi } from '../services/api';

export const WalkForwardPage: React.FC = () => {
  const windows = quantApi.getWalkForwardWindows();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
          <Cpu className="w-6 h-6 text-purple-400" />
          <span>Walk-Forward Robustness Analysis</span>
        </h1>
        <p className="text-xs text-slate-400 font-mono">Continuous Rolling In-Sample Training vs Out-of-Sample Testing Windows</p>
      </div>

      {/* Educational Banner */}
      <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold">WHY WALK-FORWARD MATTERS:</span> Traditional backtests optimize parameters on the exact same data used for evaluation. Walk-Forward testing trains on a past window (e.g., 2018-2020) and evaluates performance exclusively on unseen future data (e.g., 2021).
        </div>
      </div>

      {/* Rolling Windows Step List */}
      <div className="space-y-4">
        {windows.map((w) => (
          <div key={w.window_id} className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs font-mono font-bold">
                Window #{w.window_id}
              </span>
              <div className="text-xs font-mono text-emerald-400 font-bold">
                Out-of-Sample CAGR: +{w.out_of_sample_cagr}%
              </div>
            </div>

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 font-mono text-xs p-4 rounded-xl bg-slate-950/80 border border-slate-850">
              <div className="space-y-1">
                <div className="text-[10px] text-slate-500 uppercase">Training Window (In-Sample)</div>
                <div className="text-slate-200 font-bold">{w.train_period}</div>
                <div className="text-slate-400">In-Sample Sharpe: {w.in_sample_sharpe}</div>
              </div>

              <ArrowRight className="w-5 h-5 text-purple-400 hidden md:block shrink-0" />

              <div className="space-y-1">
                <div className="text-[10px] text-slate-500 uppercase">Test Window (Out-of-Sample)</div>
                <div className="text-purple-300 font-bold">{w.test_period}</div>
                <div className="text-emerald-400 font-bold">Out-of-Sample Sharpe: {w.out_of_sample_sharpe}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
