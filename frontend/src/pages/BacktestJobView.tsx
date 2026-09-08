import React from 'react';
import { Loader2, CheckCircle2, X } from 'lucide-react';
import type { BacktestJob } from '../types';
import { Button } from '../components/common/Button';

interface BacktestJobViewProps {
  job: BacktestJob;
  onCancelJob: () => void;
  onViewResults: () => void;
}

export const BacktestJobView: React.FC<BacktestJobViewProps> = ({
  job,
  onCancelJob,
  onViewResults,
}) => {
  const stages = [
    { id: 'Dataset Load', label: '1. Load Market Dataset' },
    { id: 'Validation', label: '2. Validate Temporal Bars' },
    { id: 'Strategy Execution', label: '3. Execute Strategy Rules' },
    { id: 'Metrics Calculation', label: '4. Calculate Risk & Metrics' },
    { id: 'Saving', label: '5. Save Experiment Payload' },
  ];

  const getStageIndex = (stage: string) => {
    switch (stage) {
      case 'Dataset Load': return 0;
      case 'Validation': return 1;
      case 'Strategy Execution': return 2;
      case 'Metrics Calculation': return 3;
      case 'Saving': return 4;
      default: return 0;
    }
  };

  const currentIndex = getStageIndex(job.stage);

  return (
    <div className="max-w-2xl mx-auto p-8 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-6 shadow-2xl">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs font-mono text-indigo-400 font-semibold uppercase tracking-wider">Asynchronous Research Job</span>
          <h1 className="text-xl font-bold text-slate-100">{job.config?.strategy_id || 'Backtest Execution'}</h1>
          <div className="text-xs text-slate-400 font-mono">Job ID: {job.id}</div>
        </div>
        <div className="text-right font-mono text-xs">
          <div className="text-slate-500">Elapsed Time</div>
          <div className="text-slate-200 font-bold">{job.elapsed_seconds.toFixed(1)}s</div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-xs font-mono">
          <span className="text-slate-400">Bars Processed: {job.processed_bars} / {job.total_bars}</span>
          <span className="text-indigo-400 font-bold">{job.progress_pct}%</span>
        </div>
        <div className="w-full h-2.5 rounded-full bg-slate-950 border border-slate-800 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-indigo-500 to-emerald-400 transition-all duration-300 rounded-full"
            style={{ width: `${job.progress_pct}%` }}
          ></div>
        </div>
      </div>

      {/* Stage Steps */}
      <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-3">
        <div className="text-xs font-mono text-slate-400 font-semibold mb-2">Quant Engine Execution Stages</div>
        {stages.map((st, idx) => {
          const isDone = idx < currentIndex || job.status === 'COMPLETED';
          const isCurrent = idx === currentIndex && job.status === 'RUNNING';
          return (
            <div key={st.id} className="flex items-center justify-between text-xs font-mono">
              <div className="flex items-center gap-3">
                {isDone ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : isCurrent ? (
                  <Loader2 className="w-4 h-4 text-indigo-400 animate-spin shrink-0" />
                ) : (
                  <div className="w-4 h-4 rounded-full border border-slate-700 shrink-0" />
                )}
                <span className={isDone ? 'text-slate-200 font-medium' : isCurrent ? 'text-indigo-300 font-bold' : 'text-slate-500'}>
                  {st.label}
                </span>
              </div>
              <span className="text-[10px] text-slate-600">
                {isDone ? 'COMPLETED' : isCurrent ? 'IN PROGRESS' : 'QUEUED'}
              </span>
            </div>
          );
        })}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-800">
        <Button variant="outline" size="sm" icon={<X className="w-4 h-4" />} onClick={onCancelJob}>
          Cancel Job
        </Button>
        {job.status === 'COMPLETED' && (
          <Button variant="primary" size="sm" onClick={onViewResults}>
            View Backtest Results Terminal
          </Button>
        )}
      </div>
    </div>
  );
};
