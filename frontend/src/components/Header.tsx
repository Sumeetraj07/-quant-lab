import React from 'react';
import { Activity, BarChart2, Cpu, Database, Zap } from 'lucide-react';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenAiAssistant: () => void;
}

export const Header: React.FC<HeaderProps> = ({ activeTab, setActiveTab, onOpenAiAssistant }) => {
  return (
    <header className="glass-panel sticky top-0 z-50 px-6 py-4 flex items-center justify-between border-b border-white/10 mb-8">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-cyan-400 p-[1px]">
          <div className="w-full h-full bg-slate-950 rounded-xl flex items-center justify-center">
            <BarChart2 className="w-5 h-5 text-cyan-400" />
          </div>
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
              QuantLab
            </h1>
            <span className="badge badge-indigo">v0.1.0</span>
          </div>
          <p className="text-xs text-slate-400 font-mono">AI Quant Research & Event-Driven Engine</p>
        </div>
      </div>

      <nav className="flex items-center gap-1 bg-slate-950/60 p-1.5 rounded-xl border border-white/5">
        <button
          onClick={() => setActiveTab('lab')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'lab'
              ? 'bg-indigo-600/90 text-white shadow-lg shadow-indigo-500/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
          }`}
        >
          <Zap className="w-4 h-4" />
          Strategy Lab
        </button>
        <button
          onClick={() => setActiveTab('results')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'results'
              ? 'bg-indigo-600/90 text-white shadow-lg shadow-indigo-500/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
          }`}
        >
          <Activity className="w-4 h-4" />
          Analytics
        </button>
        <button
          onClick={() => setActiveTab('data')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'data'
              ? 'bg-indigo-600/90 text-white shadow-lg shadow-indigo-500/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
          }`}
        >
          <Database className="w-4 h-4" />
          Market Data
        </button>
      </nav>

      <div className="flex items-center gap-3">
        <button
          onClick={onOpenAiAssistant}
          className="btn-primary"
        >
          <Cpu className="w-4 h-4" />
          AI Research Copilot
        </button>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          Engine Online
        </div>
      </div>
    </header>
  );
};
