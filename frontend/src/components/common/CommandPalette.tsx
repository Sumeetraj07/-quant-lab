import React, { useState, useEffect } from 'react';
import {
  Search,
  LayoutDashboard,
  LineChart,
  Sliders,
  Play,
  Activity,
  GitCompare,
  Cpu,
  BookOpen,
  Bot,
  Sun,
  Moon,
  X,
} from 'lucide-react';
import type { ActiveTab } from '../../types';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTab?: (tab: ActiveTab) => void;
  onNavigate?: (tab: ActiveTab) => void;
  onToggleTheme: () => void;
  currentTheme?: string;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onSelectTab,
  onNavigate,
  onToggleTheme,
  currentTheme = 'dark',
}) => {
  const handleSelectTab = (tab: ActiveTab) => {
    if (onNavigate) onNavigate(tab);
    else if (onSelectTab) onSelectTab(tab);
  };
  const [query, setQuery] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else {
          // Open
        }
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const actions = [
    { id: 'dashboard', title: 'Open Overview Dashboard', icon: <LayoutDashboard className="w-4 h-4" />, category: 'Navigation', tab: 'dashboard' as ActiveTab },
    { id: 'builder', title: 'Configure & Run Backtest', icon: <Play className="w-4 h-4 text-emerald-400" />, category: 'Actions', tab: 'builder' as ActiveTab },
    { id: 'market', title: 'Browse Market Data & Assets', icon: <LineChart className="w-4 h-4" />, category: 'Navigation', tab: 'market' as ActiveTab },
    { id: 'strategies', title: 'Explore Quantitative Strategies', icon: <Sliders className="w-4 h-4" />, category: 'Navigation', tab: 'strategies' as ActiveTab },
    { id: 'experiments', title: 'View Saved Research Experiments', icon: <Activity className="w-4 h-4" />, category: 'Navigation', tab: 'experiments' as ActiveTab },
    { id: 'compare', title: 'Compare Multi-Strategy Equity Curves', icon: <GitCompare className="w-4 h-4" />, category: 'Analysis', tab: 'compare' as ActiveTab },
    { id: 'risk', title: 'Open Portfolio Risk Terminal (VaR / CVaR)', icon: <Activity className="w-4 h-4 text-rose-400" />, category: 'Analysis', tab: 'risk' as ActiveTab },
    { id: 'optimization', title: 'Run Parameter Sweep Optimization', icon: <Sliders className="w-4 h-4 text-indigo-400" />, category: 'Advanced Research', tab: 'optimization' as ActiveTab },
    { id: 'walk-forward', title: 'Perform Walk-Forward Robustness Test', icon: <Cpu className="w-4 h-4 text-purple-400" />, category: 'Advanced Research', tab: 'walk-forward' as ActiveTab },
    { id: 'monte-carlo', title: 'Run Monte Carlo Outcome Simulation', icon: <Cpu className="w-4 h-4 text-amber-400" />, category: 'Advanced Research', tab: 'monte-carlo' as ActiveTab },
    { id: 'ai', title: 'Ask AI Quant Research Assistant', icon: <Bot className="w-4 h-4 text-cyan-400" />, category: 'AI Copilot', tab: 'ai' as ActiveTab },
    { id: 'settings', title: 'Open Settings & Quant Glossary', icon: <BookOpen className="w-4 h-4" />, category: 'Documentation', tab: 'settings' as ActiveTab },
  ];

  const filteredActions = actions.filter(
    (a) => a.title.toLowerCase().includes(query.toLowerCase()) || a.category.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-150">
      <div className="w-full max-w-2xl rounded-2xl bg-slate-900 border border-slate-700/80 shadow-2xl overflow-hidden divide-y divide-slate-800">
        {/* Search Header */}
        <div className="flex items-center px-4 py-3 gap-3">
          <Search className="w-5 h-5 text-indigo-400 shrink-0" />
          <input
            type="text"
            autoFocus
            placeholder="Type a command or search action (e.g. Backtest, Risk, AI)..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-transparent text-slate-100 placeholder-slate-500 text-sm outline-none"
          />
          <button onClick={onClose} className="p-1 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-800">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Action List */}
        <div className="max-h-80 overflow-y-auto p-2 space-y-1">
          {filteredActions.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-500">No matching commands found.</div>
          ) : (
            filteredActions.map((action) => (
              <button
                key={action.id}
                onClick={() => {
                  handleSelectTab(action.tab);
                  onClose();
                }}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left text-sm text-slate-200 hover:bg-indigo-600/20 hover:text-indigo-300 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-1.5 rounded-md bg-slate-800 text-slate-400 group-hover:bg-indigo-600/30 group-hover:text-indigo-300 transition-colors">
                    {action.icon}
                  </div>
                  <span className="font-medium">{action.title}</span>
                </div>
                <span className="text-xs font-mono text-slate-500 group-hover:text-indigo-400">{action.category}</span>
              </button>
            ))
          )}

          {/* Theme Switch Action */}
          <button
            onClick={() => {
              onToggleTheme();
              onClose();
            }}
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left text-sm text-slate-200 hover:bg-indigo-600/20 hover:text-indigo-300 transition-colors group"
          >
            <div className="flex items-center gap-3">
              <div className="p-1.5 rounded-md bg-slate-800 text-amber-400">
                {currentTheme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </div>
              <span className="font-medium">Toggle Interface Theme ({currentTheme === 'dark' ? 'Light' : 'Dark'})</span>
            </div>
            <span className="text-xs font-mono text-slate-500">System</span>
          </button>
        </div>

        {/* Footer shortcuts */}
        <div className="px-4 py-2 bg-slate-950/50 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-[10px] font-mono">↑↓</span> to navigate
            <span className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-[10px] font-mono">↵</span> to select
          </div>
          <div>
            <span className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-[10px] font-mono">ESC</span> to close
          </div>
        </div>
      </div>
    </div>
  );
};
