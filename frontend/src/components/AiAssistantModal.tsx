import React, { useState } from 'react';
import { Cpu, X, Sparkles, Send, ArrowRight } from 'lucide-react';

interface AiAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyConfig: (config: any) => void;
}

const PRESET_QUERIES = [
  "Run a 20/50 SMA Crossover on NVDA from 2023 with 5bps slippage",
  "Test Bollinger Mean Reversion on SPY with 2.5 std deviation",
  "Backtest Donchian Breakout on AAPL with 30-day lookback",
  "Evaluate Volatility Targeting on QQQ with 15% target vol"
];

export const AiAssistantModal: React.FC<AiAssistantModalProps> = ({ isOpen, onClose, onApplyConfig }) => {
  const [prompt, setPrompt] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [parsedResult, setParsedResult] = useState<any>(null);

  if (!isOpen) return null;

  const handleGenerate = (queryText: string) => {
    const text = queryText || prompt;
    if (!text.trim()) return;

    setIsThinking(true);
    setParsedResult(null);

    // Simulate AI parsing natural language into validated strategy configuration
    setTimeout(() => {
      let config: any = {
        name: "AI Suggested: Moving Average Crossover",
        strategy_id: "moving_average_momentum",
        parameters: { fast_window: 20, slow_window: 50 },
        symbols: ["AAPL"],
        start_date: "2023-01-01",
        end_date: "2023-12-31",
        initial_capital: 100000,
        commission_rate: 0.001,
        slippage_bps: 5.0,
        spread_bps: 2.0,
        reasoning: "Parsed request for trend-following momentum strategy on daily OHLCV bars. Selected 20-day fast and 50-day slow windows to capture medium-term trend regime transitions while suppressing noise."
      };

      const lower = text.toLowerCase();
      if (lower.includes('nvda')) config.symbols = ['NVDA'];
      if (lower.includes('spy')) config.symbols = ['SPY'];
      if (lower.includes('qqq')) config.symbols = ['QQQ'];
      if (lower.includes('bollinger')) {
        config.strategy_id = 'bollinger_mean_reversion';
        config.name = 'AI Suggested: Bollinger Mean Reversion';
        config.parameters = { period: 20, num_std: 2.5 };
      } else if (lower.includes('breakout') || lower.includes('donchian')) {
        config.strategy_id = 'breakout';
        config.name = 'AI Suggested: Donchian Breakout';
        config.parameters = { lookback_period: 30 };
      } else if (lower.includes('volatility')) {
        config.strategy_id = 'volatility_targeting';
        config.name = 'AI Suggested: Volatility Targeting';
        config.parameters = { target_volatility: 0.15, lookback: 30 };
      }

      setParsedResult(config);
      setIsThinking(false);
    }, 800);
  };

  const handleApply = () => {
    if (parsedResult) {
      onApplyConfig(parsedResult);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="glass-panel w-full max-w-2xl border-indigo-500/30 overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/30 border border-indigo-500/50 flex items-center justify-center">
              <Cpu className="w-4 h-4 text-indigo-400" />
            </div>
            <div>
              <h3 className="font-semibold text-white text-base">QuantLab AI Copilot</h3>
              <p className="text-xs text-slate-400 font-mono">Convert natural language into validated strategy specs</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-300">Preset Quant Prompt Suggestions</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {PRESET_QUERIES.map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setPrompt(q);
                    handleGenerate(q);
                  }}
                  className="text-left text-xs p-2.5 rounded-lg bg-slate-900/50 border border-white/5 text-slate-300 hover:border-indigo-500/40 hover:text-white transition-all flex items-center justify-between"
                >
                  <span className="truncate">{q}</span>
                  <Sparkles className="w-3 h-3 text-indigo-400 shrink-0 ml-2" />
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-300 block mb-2">Natural Language Strategy Goal</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                placeholder="e.g., Run a 20-day breakout strategy on AAPL with $100k capital..."
                className="input-field py-3 text-sm"
                onKeyDown={e => e.key === 'Enter' && handleGenerate(prompt)}
              />
              <button
                onClick={() => handleGenerate(prompt)}
                disabled={isThinking}
                className="btn-primary shrink-0"
              >
                <Send className="w-4 h-4" />
                Generate
              </button>
            </div>
          </div>

          {isThinking && (
            <div className="p-6 text-center text-slate-400 space-y-2 bg-slate-900/40 rounded-xl border border-white/5">
              <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="text-xs font-mono">Parsing prompt & compiling validated BacktestConfig...</p>
            </div>
          )}

          {parsedResult && !isThinking && (
            <div className="p-5 bg-indigo-950/30 border border-indigo-500/30 rounded-xl space-y-4">
              <div className="flex items-center justify-between">
                <span className="badge badge-emerald">Strategy Spec Generated</span>
                <span className="text-xs text-indigo-300 font-mono">{parsedResult.strategy_id}</span>
              </div>

              <div className="text-xs text-slate-300 leading-relaxed bg-slate-950/50 p-3 rounded-lg border border-white/5">
                <strong className="text-indigo-400 block mb-1">AI Reasoning:</strong>
                {parsedResult.reasoning}
              </div>

              <div className="grid grid-cols-3 gap-2 text-xs font-mono">
                <div className="bg-slate-900/60 p-2 rounded border border-white/5">
                  <span className="text-slate-500 block">Symbol</span>
                  <span className="text-white font-bold">{parsedResult.symbols[0]}</span>
                </div>
                <div className="bg-slate-900/60 p-2 rounded border border-white/5">
                  <span className="text-slate-500 block">Strategy</span>
                  <span className="text-white font-bold truncate block">{parsedResult.strategy_id}</span>
                </div>
                <div className="bg-slate-900/60 p-2 rounded border border-white/5">
                  <span className="text-slate-500 block">Params</span>
                  <span className="text-white font-bold truncate block">{JSON.stringify(parsedResult.parameters)}</span>
                </div>
              </div>

              <button
                onClick={handleApply}
                className="w-full btn-primary justify-center py-2.5 text-sm"
              >
                Apply to Strategy Lab & Run
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
