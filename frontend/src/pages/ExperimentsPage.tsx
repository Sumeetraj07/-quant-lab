import React, { useState } from 'react';
import { Search, GitCompare } from 'lucide-react';
import type { Experiment, ActiveTab } from '../types';
import { Button } from '../components/common/Button';

interface ExperimentsPageProps {
  experiments: Experiment[];
  onNavigate: (tab: ActiveTab) => void;
}

export const ExperimentsPage: React.FC<ExperimentsPageProps> = ({ experiments, onNavigate }) => {
  const [search, setSearch] = useState('');

  const filtered = experiments.filter(
    (e) =>
      e.name.toLowerCase().includes(search.toLowerCase()) ||
      e.strategy_name.toLowerCase().includes(search.toLowerCase()) ||
      e.asset_universe.some((u) => u.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Saved Experiments Workspace</h1>
          <p className="text-xs text-slate-400 font-mono">Reproducible Quantitative Backtest Runs & Parameter History</p>
        </div>
        <Button variant="primary" icon={<GitCompare className="w-4 h-4" />} onClick={() => onNavigate('compare')}>
          Compare Selected Experiments
        </Button>
      </div>

      {/* Search */}
      <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search experiments by name, strategy, or universe..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-slate-200 placeholder-slate-500 outline-none"
          />
        </div>
      </div>

      {/* Experiments Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map((exp) => (
          <div
            key={exp.id}
            className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800/80 space-y-4 flex flex-col justify-between hover:border-slate-700 transition-all shadow-lg"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-[10px] font-mono">
                  {exp.id}
                </span>
                <span className="text-[10px] font-mono text-slate-500">{exp.created_at.split('T')[0]}</span>
              </div>

              <div>
                <h3 className="text-base font-bold text-slate-100">{exp.name}</h3>
                <div className="text-xs text-slate-400 font-mono pt-0.5">{exp.strategy_name}</div>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/60 space-y-1.5 font-mono text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Universe:</span>
                  <span className="text-indigo-300 font-semibold">{exp.asset_universe.join(', ')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Period:</span>
                  <span className="text-slate-300 text-[10px]">{exp.period}</span>
                </div>
              </div>

              {exp.notes && <p className="text-xs text-slate-400 italic">"{exp.notes}"</p>}
            </div>

            {/* Metrics Footer */}
            <div className="space-y-4 pt-3 border-t border-slate-800/60">
              <div className="grid grid-cols-3 gap-2 text-center font-mono">
                <div className="p-2 rounded bg-slate-950 border border-slate-850">
                  <div className="text-[10px] text-slate-500">Sharpe</div>
                  <div className="text-sm font-bold text-slate-100">{exp.sharpe}</div>
                </div>
                <div className="p-2 rounded bg-slate-950 border border-slate-850">
                  <div className="text-[10px] text-slate-500">CAGR</div>
                  <div className="text-sm font-bold text-emerald-400">+{exp.cagr}%</div>
                </div>
                <div className="p-2 rounded bg-slate-950 border border-slate-850">
                  <div className="text-[10px] text-slate-500">Max DD</div>
                  <div className="text-sm font-bold text-rose-400">{exp.max_dd}%</div>
                </div>
              </div>

              <Button variant="secondary" className="w-full justify-center" onClick={() => onNavigate('results')}>
                Open Results Terminal
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
