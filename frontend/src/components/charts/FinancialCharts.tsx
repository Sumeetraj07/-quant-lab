import React, { useState } from 'react';
import type { EquityPoint } from '../../types';

interface EquityChartProps {
  data: EquityPoint[];
  showBenchmark?: boolean;
}

export const EquityCurveChart: React.FC<EquityChartProps> = ({ data, showBenchmark = true }) => {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [period, setPeriod] = useState<'1M' | '3M' | '6M' | '1Y' | '3Y' | 'ALL'>('ALL');

  if (!data || data.length === 0) return null;

  // Filter data based on selected period
  const displayData = (() => {
    if (period === '1M') return data.slice(-30);
    if (period === '3M') return data.slice(-90);
    if (period === '6M') return data.slice(-180);
    if (period === '1Y') return data.slice(-250);
    if (period === '3Y') return data.slice(-750);
    return data;
  })();

  const width = 800;
  const height = 320;
  const padding = { top: 20, right: 30, bottom: 40, left: 60 };

  const equities = displayData.map((d) => d.equity);
  const benchmarks = displayData.map((d) => d.benchmark_equity || d.equity);

  const minVal = Math.min(...equities, ...(showBenchmark ? benchmarks : [])) * 0.98;
  const maxVal = Math.max(...equities, ...(showBenchmark ? benchmarks : [])) * 1.02;

  const getX = (i: number) => padding.left + (i / Math.max(displayData.length - 1, 1)) * (width - padding.left - padding.right);
  const getY = (val: number) => height - padding.bottom - ((val - minVal) / (maxVal - minVal || 1)) * (height - padding.top - padding.bottom);

  // Path data strings
  const strategyPoints = displayData.map((d, i) => `${getX(i)},${getY(d.equity)}`).join(' L ');
  const strategyPath = `M ${strategyPoints}`;

  const benchmarkPoints = displayData.map((d, i) => `${getX(i)},${getY(d.benchmark_equity || d.equity)}`).join(' L ');
  const benchmarkPath = `M ${benchmarkPoints}`;

  // Area under strategy curve
  const areaPath = `${strategyPath} L ${getX(displayData.length - 1)},${height - padding.bottom} L ${getX(0)},${height - padding.bottom} Z`;

  const hoverItem = hoverIndex !== null ? displayData[hoverIndex] : displayData[displayData.length - 1];

  return (
    <div className="w-full space-y-4">
      {/* Header controls & stats */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-3 rounded-xl bg-slate-950/50 border border-slate-800/80">
        <div className="flex flex-wrap items-center gap-6">
          <div>
            <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">Strategy Value</div>
            <div className="text-xl font-bold font-mono tabular-nums text-emerald-400">
              ₹{hoverItem.equity.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
            </div>
          </div>
          {showBenchmark && hoverItem.benchmark_equity && (
            <div className="border-l border-slate-800 pl-6">
              <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">Benchmark</div>
              <div className="text-xl font-bold font-mono tabular-nums text-slate-300">
                ₹{hoverItem.benchmark_equity.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
              </div>
            </div>
          )}
          <div className="border-l border-slate-800 pl-6">
            <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">Date</div>
            <div className="text-sm font-mono text-slate-200 mt-0.5">{hoverItem.timestamp}</div>
          </div>
        </div>

        {/* Refined Segmented Timeframe Controls */}
        <div className="flex items-center gap-0.5 bg-slate-900/90 p-1 rounded-lg border border-slate-800 text-xs">
          {(['1M', '3M', '6M', '1Y', '3Y', 'ALL'] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriod(p)}
              className={`px-2.5 py-1 rounded font-mono text-xs transition-colors ${
                period === p
                  ? 'bg-indigo-500/20 text-indigo-300 font-semibold border border-indigo-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* SVG Chart Canvas */}
      <div className="relative w-full overflow-hidden rounded-xl bg-slate-950/70 border border-slate-800/80 p-3">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto cursor-crosshair overflow-visible"
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const normalizedX = (mouseX / rect.width) * width;
            const index = Math.round(((normalizedX - padding.left) / (width - padding.left - padding.right)) * (displayData.length - 1));
            if (index >= 0 && index < displayData.length) setHoverIndex(index);
          }}
          onMouseLeave={() => setHoverIndex(null)}
        >
          <defs>
            <linearGradient id="equityGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((pct, idx) => {
            const y = padding.top + pct * (height - padding.top - padding.bottom);
            const val = maxVal - pct * (maxVal - minVal);
            return (
              <g key={idx}>
                <line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="#1e293b" strokeDasharray="3 3" strokeWidth="0.8" />
                <text x={padding.left - 8} y={y + 3} fill="#64748b" fontSize="10" fontFamily="JetBrains Mono" textAnchor="end">
                  ₹{(val / 1000).toFixed(0)}k
                </text>
              </g>
            );
          })}

          {/* Fill Area */}
          <path d={areaPath} fill="url(#equityGradient)" />

          {/* Benchmark Line */}
          {showBenchmark && (
            <path d={benchmarkPath} fill="none" stroke="#64748b" strokeWidth="1.5" strokeDasharray="4 4" opacity="0.6" />
          )}

          {/* Strategy Equity Line */}
          <path d={strategyPath} fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

          {/* Crosshairs on hover */}
          {hoverIndex !== null && (
            <g>
              <line
                x1={getX(hoverIndex)}
                y1={padding.top}
                x2={getX(hoverIndex)}
                y2={height - padding.bottom}
                stroke="#6366f1"
                strokeWidth="1"
                strokeDasharray="2 2"
              />
              <circle cx={getX(hoverIndex)} cy={getY(displayData[hoverIndex].equity)} r="4" fill="#10b981" stroke="#ffffff" strokeWidth="1.5" />
            </g>
          )}
        </svg>

        {/* Legend */}
        <div className="flex items-center justify-between text-xs text-slate-400 pt-3 px-2 border-t border-slate-900/90 font-mono text-[11px]">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="w-3 h-0.5 bg-emerald-500 rounded-full inline-block"></span>
              <span className="text-slate-300">QuantLab Strategy</span>
            </div>
            {showBenchmark && (
              <div className="flex items-center gap-2">
                <span className="w-3 h-0.5 bg-slate-500 stroke-dashed rounded-full inline-block"></span>
                <span className="text-slate-400">Benchmark (Buy & Hold)</span>
              </div>
            )}
          </div>
          <div className="text-slate-500">Live Simulation Feed</div>
        </div>
      </div>
    </div>
  );
};

// Drawdown Chart
export const DrawdownChart: React.FC<{ data: EquityPoint[] }> = ({ data }) => {
  if (!data || data.length === 0) return null;

  const width = 800;
  const height = 160;
  const padding = { top: 15, right: 30, bottom: 30, left: 60 };

  const drawdowns = data.map((d) => d.drawdown);
  const minDD = Math.min(...drawdowns, -25);

  const getX = (i: number) => padding.left + (i / (data.length - 1)) * (width - padding.left - padding.right);
  const getY = (val: number) => padding.top + ((val - 0) / (minDD - 0)) * (height - padding.top - padding.bottom);

  const points = data.map((d, i) => `${getX(i)},${getY(d.drawdown)}`).join(' L ');
  const areaPath = `M ${getX(0)},${padding.top} L ${points} L ${getX(data.length - 1)},${padding.top} Z`;

  return (
    <div className="w-full space-y-2">
      <div className="flex items-center justify-between text-xs px-1">
        <span className="font-semibold text-slate-300">Underwater Drawdown (%)</span>
        <span className="font-mono text-rose-400">Max DD: {minDD.toFixed(2)}%</span>
      </div>

      <div className="relative w-full rounded-xl bg-slate-950/60 border border-slate-800/80 p-2">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
          <defs>
            <linearGradient id="ddGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.0" />
              <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.4" />
            </linearGradient>
          </defs>

          {/* Zero line */}
          <line x1={padding.left} y1={padding.top} x2={width - padding.right} y2={padding.top} stroke="#334155" strokeWidth="1" />

          {/* Area */}
          <path d={areaPath} fill="url(#ddGradient)" />

          {/* Line */}
          <path d={`M ${points}`} fill="none" stroke="#f43f5e" strokeWidth="1.8" />
        </svg>
      </div>
    </div>
  );
};

// Monthly Returns Heatmap Chart
export const ReturnsHeatmapChart: React.FC = () => {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const years = ['2026', '2025', '2024', '2023', '2022', '2021', '2020', '2019', '2018'];

  // Synthetic monthly returns matrix
  const getReturn = (yearIdx: number, monthIdx: number) => {
    const val = (Math.sin(yearIdx * 3 + monthIdx * 2) * 4.5 + Math.cos(monthIdx) * 2.5).toFixed(1);
    return parseFloat(val);
  };

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full border-collapse text-xs tabular-nums text-center">
        <thead>
          <tr className="border-b border-slate-800 text-slate-400">
            <th className="py-2 px-3 text-left font-mono">Year</th>
            {months.map((m) => (
              <th key={m} className="py-2 px-2 font-mono">{m}</th>
            ))}
            <th className="py-2 px-3 font-mono font-semibold text-slate-200">Year Total</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/60">
          {years.map((y, yIdx) => {
            let yearTotal = 0;
            return (
              <tr key={y} className="hover:bg-slate-900/40">
                <td className="py-2.5 px-3 font-mono font-semibold text-slate-300 text-left">{y}</td>
                {months.map((_, mIdx) => {
                  const ret = getReturn(yIdx, mIdx);
                  yearTotal += ret;
                  const isPos = ret >= 0;
                  const intensity = Math.min(Math.abs(ret) / 6, 1);
                  return (
                    <td key={mIdx} className="py-2 px-1">
                      <div
                        className="py-1 px-1.5 rounded font-mono font-medium text-[11px]"
                        style={{
                          backgroundColor: isPos
                            ? `rgba(16, 185, 129, ${0.1 + intensity * 0.35})`
                            : `rgba(244, 63, 94, ${0.1 + intensity * 0.35})`,
                          color: isPos ? '#34d399' : '#fb7185',
                        }}
                      >
                        {ret > 0 ? `+${ret}%` : `${ret}%`}
                      </div>
                    </td>
                  );
                })}
                <td className="py-2 px-3 font-mono font-bold">
                  <span className={yearTotal >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                    {yearTotal > 0 ? `+${yearTotal.toFixed(1)}%` : `${yearTotal.toFixed(1)}%`}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
