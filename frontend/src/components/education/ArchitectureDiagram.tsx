import React, { useState } from 'react';
import { Info } from 'lucide-react';

interface NodeInfo {
  id: string;
  name: string;
  category: string;
  description: string;
  input: string;
  output: string;
}

export const ArchitectureDiagram: React.FC = () => {
  const [selectedNode, setSelectedNode] = useState<string>('strategy');

  const nodes: NodeInfo[] = [
    {
      id: 'data',
      name: 'Market Data Ingestion',
      category: 'Data Layer',
      description: 'Fetches historical OHLCV bars from Alpha Vantage & local databases.',
      input: 'Symbol (NIFTY 50), Date range',
      output: 'Chronological Bar Stream',
    },
    {
      id: 'validator',
      name: 'Data Validation Pipeline',
      category: 'Data Layer',
      description: 'Validates missing bars, detects price anomalies, and normalizes timeframes.',
      input: 'Raw OHLCV Bars',
      output: 'Validated Clean Data Feed',
    },
    {
      id: 'strategy',
      name: 'Quantitative Strategy Engine',
      category: 'Core Engine',
      description: 'Applies event-driven mathematical signal rules (Moving Averages, RSI) without look-ahead bias.',
      input: 'Current Bar (t)',
      output: 'Trading Signals (BUY / SELL / HOLD)',
    },
    {
      id: 'risk',
      name: 'Risk & Position Sizer',
      category: 'Core Engine',
      description: 'Evaluates portfolio risk, leverage constraints, and applies volatility targeting position sizing.',
      input: 'Trading Signal + Target Vol',
      output: 'Sized Target Orders',
    },
    {
      id: 'execution',
      name: 'Execution Simulator',
      category: 'Simulated Execution',
      description: 'Fills orders at Bar t+1 Open price, deducting commission percentages and slippage basis points.',
      input: 'Sized Orders',
      output: 'Filled Trade Executions',
    },
    {
      id: 'portfolio',
      name: 'Portfolio Accounting',
      category: 'Accounting',
      description: 'Tracks cash balances, open positions, gross/net PnL, and equity progression across bars.',
      input: 'Trade Executions',
      output: 'Time-series Equity Curve',
    },
    {
      id: 'metrics',
      name: 'Analytics & Risk Engine',
      category: 'Analytics',
      description: 'Calculates CAGR, Sharpe, Sortino, Max Drawdown, VaR (95%), CVaR, and turnover.',
      input: 'Equity Curve & Trades',
      output: 'Quant Performance Metrics',
    },
    {
      id: 'results',
      name: 'Research Terminal & DB',
      category: 'Persistence',
      description: 'Stores reproducible experiment configs and metrics in PostgreSQL database.',
      input: 'Experiment Payload',
      output: 'Interactive Research Dashboard',
    },
  ];

  const current = nodes.find((n) => n.id === selectedNode) || nodes[2];

  return (
    <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-slate-100">Interactive QuantLab System Architecture</h3>
          <p className="text-xs text-slate-400">Click any pipeline node to inspect details, inputs, and outputs</p>
        </div>
        <span className="px-2.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-mono font-semibold">
          Zero Look-Ahead Bias Architecture
        </span>
      </div>

      {/* Node Flow Horizontal Graph */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {nodes.map((node, i) => (
          <button
            key={node.id}
            onClick={() => setSelectedNode(node.id)}
            className={`p-3 rounded-xl border text-left transition-all ${
              selectedNode === node.id
                ? 'bg-indigo-600/20 border-indigo-500 text-indigo-200 shadow-lg shadow-indigo-600/10'
                : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
            }`}
          >
            <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 mb-1">
              <span>Node {i + 1}</span>
              <span>{node.category}</span>
            </div>
            <div className="text-xs font-bold truncate">{node.name}</div>
          </button>
        ))}
      </div>

      {/* Selected Node Details Box */}
      <div className="p-4 rounded-xl bg-slate-950/80 border border-indigo-500/30 space-y-3">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-indigo-400" />
          <span className="text-sm font-bold text-slate-100">{current.name}</span>
          <span className="text-xs font-mono text-indigo-300">({current.category})</span>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed">{current.description}</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 text-xs font-mono border-t border-slate-800/80">
          <div>
            <span className="text-slate-500">Input:</span> <span className="text-emerald-400">{current.input}</span>
          </div>
          <div>
            <span className="text-slate-500">Output:</span> <span className="text-cyan-400">{current.output}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
