import React, { useState } from 'react';
import { Search, BookOpen, X } from 'lucide-react';
import type { GlossaryTerm } from '../../types';

interface GlossaryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GLOSSARY_TERMS: GlossaryTerm[] = [
  {
    term: 'Sharpe Ratio',
    category: 'Quant Research',
    simple_def: 'Measures risk-adjusted return relative to total volatility.',
    technical_def: 'Excess return divided by annualized standard deviation of returns: (R_p - R_f) / σ_p.',
    example: 'A Sharpe ratio above 1.5 indicates strong return per unit of total volatility.',
  },
  {
    term: 'Sortino Ratio',
    category: 'Quant Research',
    simple_def: 'Similar to Sharpe, but only penalizes downside volatility rather than total volatility.',
    technical_def: '(R_p - R_f) / σ_d, where σ_d is downside deviation of negative returns.',
    example: 'Sortino is preferred for asymmetric strategies with upside spikes.',
  },
  {
    term: 'CAGR',
    category: 'Quant Research',
    simple_def: 'Compound Annual Growth Rate — the geometric mean annual return rate.',
    technical_def: '(Final Equity / Initial Capital)^(1 / Years) - 1.',
    example: '18.42% CAGR over 8 years turns ₹10L into ₹38.4L.',
  },
  {
    term: 'Maximum Drawdown',
    category: 'Risk',
    simple_def: 'The largest peak-to-trough drop in portfolio value during the backtest.',
    technical_def: 'Max((Peak - Trough) / Peak) evaluated across all time steps.',
    example: 'A -11.84% drawdown means at worst the portfolio was 11.84% below its peak.',
  },
  {
    term: 'Value at Risk (VaR 95%)',
    category: 'Risk',
    simple_def: 'Estimated maximum loss over a 1-day horizon with 95% confidence.',
    technical_def: '5th percentile of daily return distribution.',
    example: 'A 95% VaR of -1.8% means on 95% of days, losses will not exceed 1.8%.',
  },
  {
    term: 'Conditional VaR (CVaR)',
    category: 'Risk',
    simple_def: 'Expected Tail Loss — average loss in the worst 5% of trading days.',
    technical_def: 'E[R | R <= VaR_95].',
    example: 'CVaR provides deeper insight into extreme market crash events.',
  },
  {
    term: 'Slippage',
    category: 'Trading',
    simple_def: 'Difference between signal price and actual order fill price.',
    technical_def: 'Execution penalty modeled in basis points (bps) due to latency & market impact.',
    example: '5 bps slippage on ₹1,000 buy order results in ₹1,000.50 fill price.',
  },
  {
    term: 'Walk-Forward Analysis',
    category: 'Quant Research',
    simple_def: 'Evaluating strategy parameters on unseen out-of-sample future time windows.',
    technical_def: 'Optimizes parameters on [t_0, t_1] (train) and tests on [t_1, t_2] (out-of-sample).',
    example: 'Prevents overfitting historical data by testing continuous out-of-sample segments.',
  },
];

export const GlossaryModal: React.FC<GlossaryModalProps> = ({ isOpen, onClose }) => {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string>('ALL');

  if (!isOpen) return null;

  const filtered = GLOSSARY_TERMS.filter((t) => {
    const matchesSearch =
      t.term.toLowerCase().includes(search.toLowerCase()) ||
      t.simple_def.toLowerCase().includes(search.toLowerCase());
    const matchesCat = category === 'ALL' || t.category === category;
    return matchesSearch && matchesCat;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-150">
      <div className="w-full max-w-3xl rounded-2xl bg-slate-900 border border-slate-700/80 shadow-2xl overflow-hidden divide-y divide-slate-800 flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-indigo-400" />
            <h2 className="text-lg font-bold text-slate-100">QuantLab Financial & Research Glossary</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter bar */}
        <div className="p-4 bg-slate-950/40 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search term or concept..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs text-slate-200 placeholder-slate-500 outline-none focus:border-indigo-500"
            />
          </div>

          <div className="flex items-center gap-1 text-xs">
            {['ALL', 'Quant Research', 'Risk', 'Trading'].map((cat) => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`px-2.5 py-1 rounded-md font-mono transition-colors ${
                  category === cat ? 'bg-indigo-600 text-white font-medium' : 'text-slate-400 hover:bg-slate-800'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Terms list */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {filtered.map((item) => (
            <div key={item.term} className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-indigo-300">{item.term}</h3>
                <span className="px-2 py-0.5 rounded-full bg-slate-800 text-[10px] font-mono text-slate-400 border border-slate-700">
                  {item.category}
                </span>
              </div>
              <p className="text-sm text-slate-200 font-medium">{item.simple_def}</p>
              <p className="text-xs text-slate-400 font-mono bg-slate-900/80 p-2 rounded border border-slate-800/60">
                Formula / Math: {item.technical_def}
              </p>
              <div className="text-xs text-emerald-400/90 italic">Example: {item.example}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
