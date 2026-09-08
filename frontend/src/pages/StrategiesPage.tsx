import React from 'react';
import { Sliders, Play, TrendingUp, ShieldAlert, Zap, Repeat } from 'lucide-react';
import type { Strategy, ActiveTab } from '../types';
import { Button } from '../components/common/Button';

interface StrategiesPageProps {
  strategies: Strategy[];
  onNavigate: (tab: ActiveTab) => void;
  onSelectStrategy: (strat: Strategy) => void;
}

export const StrategiesPage: React.FC<StrategiesPageProps> = ({
  strategies,
  onNavigate,
  onSelectStrategy,
}) => {
  const getIcon = (category: string) => {
    switch (category) {
      case 'Trend Following': return <TrendingUp className="w-5 h-5 text-indigo-400" />;
      case 'Mean Reversion': return <Repeat className="w-5 h-5 text-emerald-400" />;
      case 'Breakout': return <Zap className="w-5 h-5 text-amber-400" />;
      case 'Risk Managed': return <ShieldAlert className="w-5 h-5 text-rose-400" />;
      default: return <Sliders className="w-5 h-5 text-slate-400" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Quantitative Strategy Catalog</h1>
          <p className="text-xs text-slate-400 font-mono">Event-Driven Algorithmic Trading Rules & Signal Generators</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {strategies.map((strat) => (
          <div
            key={strat.id}
            className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800/80 hover:border-indigo-500/40 transition-all space-y-4 flex flex-col justify-between group shadow-lg"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                  {getIcon(strat.category)}
                </div>
                <span className="px-2.5 py-1 rounded-full bg-slate-800 border border-slate-700 text-[10px] font-mono text-slate-300">
                  {strat.category}
                </span>
              </div>

              <div>
                <h3 className="text-lg font-bold text-slate-100 group-hover:text-indigo-300 transition-colors">
                  {strat.name}
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed pt-1">{strat.description}</p>
              </div>

              {/* Strategy Parameters Preview */}
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/60 text-xs font-mono space-y-1">
                <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Default Parameters</div>
                {Object.entries(strat.default_params).map(([key, val]) => (
                  <div key={key} className="flex justify-between">
                    <span className="text-slate-400">{key}:</span>
                    <span className="text-indigo-300 font-semibold">{String(val)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Performance Stats & CTA */}
            <div className="space-y-4 pt-2 border-t border-slate-800/60">
              <div className="flex items-center justify-between text-xs font-mono">
                <div>
                  <div className="text-slate-500">Best Sharpe</div>
                  <div className="text-sm font-bold text-emerald-400">{strat.best_sharpe}</div>
                </div>
                <div>
                  <div className="text-slate-500">Runs Count</div>
                  <div className="text-sm font-bold text-slate-200">{strat.runs_count}</div>
                </div>
                <div>
                  <div className="text-slate-500">Last Tested</div>
                  <div className="text-sm font-bold text-slate-400">{strat.last_used}</div>
                </div>
              </div>

              <Button
                variant="primary"
                className="w-full justify-center"
                icon={<Play className="w-4 h-4 text-emerald-400" />}
                onClick={() => {
                  onSelectStrategy(strat);
                  onNavigate('builder');
                }}
              >
                Configure Backtest
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
