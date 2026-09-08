import React, { useState } from 'react';
import { CircleHelp, TrendingUp, TrendingDown } from 'lucide-react';

interface MetricCardProps {
  label: string;
  value: string | number;
  change?: string;
  isPositive?: boolean;
  isNegative?: boolean;
  tooltipText?: string;
  subtitle?: string;
  icon?: React.ReactNode;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  change,
  isPositive,
  isNegative,
  tooltipText,
  subtitle,
  icon,
}) => {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div className="relative group p-4 rounded-xl bg-[#0f172a]/70 border border-slate-800/80 hover:border-slate-700/80 transition-all duration-150">
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 font-mono">{label}</span>
          {tooltipText && (
            <div className="relative">
              <button
                type="button"
                onMouseEnter={() => setShowTooltip(true)}
                onMouseLeave={() => setShowTooltip(false)}
                className="text-slate-500 hover:text-slate-300 transition-colors focus:outline-none"
              >
                <CircleHelp className="w-3.5 h-3.5" />
              </button>
              {showTooltip && (
                <div className="absolute left-0 bottom-full mb-2 w-64 p-3 rounded-lg bg-slate-950 border border-slate-700/90 text-xs text-slate-200 shadow-xl z-50 pointer-events-none">
                  <div className="font-semibold text-slate-100 mb-1">{label}</div>
                  <div className="text-slate-300 leading-relaxed text-[11px] font-sans">{tooltipText}</div>
                </div>
              )}
            </div>
          )}
        </div>
        {icon && <div className="text-slate-400">{icon}</div>}
      </div>

      <div className="flex items-baseline justify-between gap-2">
        <div
          className={`text-2xl lg:text-3xl font-bold font-mono tabular-nums tracking-tight ${
            isPositive
              ? 'text-emerald-400'
              : isNegative
              ? 'text-rose-400'
              : 'text-slate-100'
          }`}
        >
          {value}
        </div>

        {change && (
          <div
            className={`inline-flex items-center gap-1 text-[11px] font-semibold font-mono tabular-nums px-2 py-0.5 rounded ${
              isPositive
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
            }`}
          >
            {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            <span>{change}</span>
          </div>
        )}
      </div>

      {subtitle && <div className="mt-1.5 text-[11px] text-slate-400 font-mono leading-none">{subtitle}</div>}
    </div>
  );
};

