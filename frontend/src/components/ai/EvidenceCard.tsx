import React, { useState } from 'react';
import { BarChart3, LineChart, ChevronDown, ChevronUp } from 'lucide-react';
import type { EvidenceItem } from '../../types/ai';

interface EvidenceCardProps {
  item: EvidenceItem;
  onHighlightChartPeriod?: (period: { start: string; end: string }) => void;
}

export const EvidenceCard: React.FC<EvidenceCardProps> = ({ item, onHighlightChartPeriod }) => {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className="rounded-xl bg-slate-950/80 border border-slate-800/90 overflow-hidden text-xs">
      <div className="p-3 bg-slate-900/70 border-b border-slate-800/80 flex items-center justify-between">
        <div className="flex items-center gap-2 font-mono font-semibold text-slate-200">
          <BarChart3 className="w-4 h-4 text-indigo-400" />
          <span className="text-[11px] uppercase tracking-wider">EVIDENCE: {item.title}</span>
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-slate-400 hover:text-slate-200 p-1 transition-colors"
        >
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {isExpanded && (
        <div className="p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 font-mono tabular-nums">
            {item.metrics.map((m, idx) => (
              <div
                key={idx}
                className={`p-3 rounded-xl border ${
                  m.highlight
                    ? 'bg-indigo-500/10 border-indigo-500/30'
                    : 'bg-slate-900/60 border-slate-800/80'
                }`}
              >
                <div className="text-[10px] text-slate-400 uppercase tracking-wider font-mono">{m.label}</div>
                <div className={`text-lg font-bold font-mono tracking-tight mt-1 ${m.highlight ? 'text-indigo-300' : 'text-slate-100'}`}>
                  {m.value}
                </div>
                {m.change && <div className="text-[10px] text-rose-400 font-mono mt-0.5">{m.change}</div>}
              </div>
            ))}
          </div>

          <div className="text-slate-300 font-sans leading-relaxed text-xs bg-slate-900/50 p-3 rounded-xl border border-slate-800/60">
            {item.description}
          </div>

          {item.chartHighlightPeriod && onHighlightChartPeriod && (
            <div className="pt-1 flex justify-end">
              <button
                onClick={() => onHighlightChartPeriod(item.chartHighlightPeriod!)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-mono text-[11px] transition-colors"
              >
                <LineChart className="w-3.5 h-3.5" />
                View Period on Chart ({item.chartHighlightPeriod.start})
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
