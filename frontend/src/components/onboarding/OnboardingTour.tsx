import React, { useState } from 'react';
import { Sparkles, CheckCircle2, ChevronRight, X } from 'lucide-react';
import { Button } from '../common/Button';

interface OnboardingTourProps {
  isOpen: boolean;
  onClose: () => void;
  onStartGuidedBacktest: () => void;
}

export const OnboardingTour: React.FC<OnboardingTourProps> = ({
  isOpen,
  onClose,
  onStartGuidedBacktest,
}) => {
  const [step, setStep] = useState(0);

  if (!isOpen) return null;

  const tourSteps = [
    {
      title: 'Welcome to QuantLab Workstation',
      subtitle: 'Production-grade Quantitative Research & Backtesting Environment',
      content:
        'QuantLab allows you to configure mathematical trading strategies, simulate realistic execution with transaction costs and slippage, evaluate risk metrics, and track reproducible quantitative experiments.',
      badge: 'Step 1 of 5',
    },
    {
      title: '1. Choose Data & Strategy',
      subtitle: 'Market Ingestion & Signal Logic',
      content:
        'Select from historical assets (NIFTY 50, Equities, Forex) and quantitative strategy rules (Moving Average Momentum, RSI Mean Reversion, Volatility Target).',
      badge: 'Step 2 of 5',
    },
    {
      title: '2. Asynchronous Job Execution',
      subtitle: 'Zero Look-Ahead Bias Engine',
      content:
        'Backtests run as asynchronous research jobs. Bars are processed chronologically to eliminate look-ahead bias and calculate slippage & commissions.',
      badge: 'Step 3 of 5',
    },
    {
      title: '3. Institutional Performance & Risk',
      subtitle: 'Sharpe, Sortino, VaR & Drawdowns',
      content:
        'Analyze annualized returns (CAGR), risk-adjusted ratios (Sharpe, Sortino), maximum drawdown duration, and Value-at-Risk (VaR 95%).',
      badge: 'Step 4 of 5',
    },
    {
      title: '4. Robustness & Optimization',
      subtitle: 'Walk-Forward & Monte Carlo',
      content:
        'Prevent historical overfitting by evaluating out-of-sample walk-forward windows and running Monte Carlo outcome distributions.',
      badge: 'Step 5 of 5',
    },
  ];

  const current = tourSteps[step];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-xl rounded-2xl bg-slate-900 border border-indigo-500/30 shadow-2xl overflow-hidden p-6 space-y-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Badge */}
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-mono font-semibold">
            {current.badge}
          </span>
          <span className="text-xs text-slate-400">Interactive Walkthrough</span>
        </div>

        {/* Content */}
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-400 shrink-0" />
            <span>{current.title}</span>
          </h2>
          <div className="text-xs font-mono text-indigo-300">{current.subtitle}</div>
          <p className="text-sm text-slate-300 leading-relaxed pt-2">{current.content}</p>
        </div>

        {/* Workflow Nodes Preview */}
        <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between text-xs font-mono text-slate-400 overflow-x-auto">
          <span className={step === 1 ? 'text-indigo-400 font-bold' : ''}>Data</span>
          <ChevronRight className="w-3.5 h-3.5 text-slate-600 shrink-0" />
          <span className={step === 1 ? 'text-indigo-400 font-bold' : ''}>Strategy</span>
          <ChevronRight className="w-3.5 h-3.5 text-slate-600 shrink-0" />
          <span className={step === 2 ? 'text-emerald-400 font-bold' : ''}>Engine</span>
          <ChevronRight className="w-3.5 h-3.5 text-slate-600 shrink-0" />
          <span className={step === 3 ? 'text-cyan-400 font-bold' : ''}>Metrics</span>
          <ChevronRight className="w-3.5 h-3.5 text-slate-600 shrink-0" />
          <span className={step === 4 ? 'text-purple-400 font-bold' : ''}>Robustness</span>
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-800">
          <button
            onClick={onClose}
            className="text-xs text-slate-500 hover:text-slate-300 font-medium"
          >
            Skip Tutorial
          </button>

          <div className="flex items-center gap-2">
            {step > 0 && (
              <Button variant="secondary" size="sm" onClick={() => setStep(step - 1)}>
                Back
              </Button>
            )}

            {step < tourSteps.length - 1 ? (
              <Button variant="primary" size="sm" onClick={() => setStep(step + 1)}>
                Next
              </Button>
            ) : (
              <Button
                variant="primary"
                size="sm"
                icon={<CheckCircle2 className="w-4 h-4" />}
                onClick={() => {
                  onClose();
                  onStartGuidedBacktest();
                }}
              >
                Run First Backtest
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
