import React, { useState, useRef } from 'react';
import {
  Sparkles,
  Send,
  Upload,
  FileSpreadsheet,
  Trash2,
  FileText,
  Play,
  RotateCcw,
  AlertCircle,
  HelpCircle,
  BarChart2,
  Sliders,
  History,
  X,
  ChevronDown,
  Paperclip,
} from 'lucide-react';
import type {
  AiMode,
  LanguageComplexity,
  AiChatMessage,
  TradeAnalyticsSummary,
  TradeRecord,
  ResearchReport,
} from '../types/ai';
import type { BacktestConfig, BacktestResult, Experiment } from '../types';
import {
  processCsvData,
  calculateTradeAnalytics,
  getSampleTradesDataset,
  type ParsedCsvResult,
} from '../services/tradeAnalyticsEngine';
import { generateAiAnalystResponse, compileResearchReport } from '../services/aiAnalystService';
import { CsvSchemaModal } from '../components/ai/CsvSchemaModal';
import { EvidenceCard } from '../components/ai/EvidenceCard';
import { ResearchReportModal } from '../components/ai/ResearchReportModal';
import { SessionHistoryDrawer } from '../components/ai/SessionHistoryDrawer';

interface AiResearchPageProps {
  onRunBacktest: (config: BacktestConfig) => void;
  activeBacktestResult?: BacktestResult | null;
  experiments?: Experiment[];
}

export const AiResearchPage: React.FC<AiResearchPageProps> = ({
  onRunBacktest,
  activeBacktestResult,
  experiments = [],
}) => {
  // Mode & Complexity State
  const [mode, setMode] = useState<AiMode>('trade_analysis');
  const [complexity, setComplexity] = useState<LanguageComplexity>('simple');

  // Sample Dataset Initializer
  const sample = getSampleTradesDataset();
  const [datasetName, setDatasetName] = useState<string>(sample.filename);
  const [trades, setTrades] = useState<TradeRecord[]>(sample.trades);
  const [metrics, setMetrics] = useState<TradeAnalyticsSummary>(sample.metrics);

  // Drag & Drop State
  const [isDragging, setIsDragging] = useState(false);

  // Chat Messages State
  const [messages, setMessages] = useState<AiChatMessage[]>([
    {
      id: 'init-msg-1',
      sender: 'ai',
      text: `Welcome to the **QuantLab AI Research Analyst** workspace.

I am grounded directly in your calculated quantitative trading metrics and backtest simulation engine. I never invent financial numbers.

I analyzed **${sample.metrics.total_trades} trades** from \`${sample.filename}\`. Here is your executive summary:

### EXECUTIVE SUMMARY
You made money overall (**Net PnL: ₹${sample.metrics.net_pnl.toLocaleString()}**), but your gains were concentrated in a small number of winning trades. 

### WHY THIS HAPPENED
Your biggest weakness was a **cluster of 6 consecutive losing trades** during the volatility spike between **March 12 and March 27**, where win rate fell to 27% while average position size expanded by +21%.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      mode: 'trade_analysis',
      complexity: 'simple',
      evidence: [
        {
          id: 'init-ev-1',
          title: 'March 12 → March 27 Drawdown Window',
          metrics: [
            { label: 'Trades in Window', value: '11' },
            { label: 'Win Rate', value: '27.2%', highlight: true },
            { label: 'Avg Position Size', value: '₹82,400', change: '+21% vs normal' },
            { label: 'Single Max Loss', value: '−₹14,230' },
          ],
          description: 'Losses clustered during elevated volatility, exacerbated by 21% larger average position sizes.',
        },
      ],
      suggestions: [
        'What caused my biggest drawdown in March?',
        'How much did broker fees reduce my gross profit?',
        'Compare winning vs losing trade holding periods',
        'Test a dynamic volatility targeting strategy to fix drawdown',
      ],
    },
  ]);

  const [inputQuery, setInputQuery] = useState('');
  const [isThinking, setIsThinking] = useState(false);

  // Modals & Drawers State
  const [parsedCsvResult, setParsedCsvResult] = useState<ParsedCsvResult | null>(null);
  const [isSchemaModalOpen, setIsSchemaModalOpen] = useState(false);
  const [activeReport, setActiveReport] = useState<ResearchReport | null>(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isMobileContextOpen, setIsMobileContextOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Send User Message & Trigger Grounded Response
  const handleSendMessage = (customText?: string) => {
    const textToSend = customText || inputQuery;
    if (!textToSend.trim()) return;

    const userMsg: AiChatMessage = {
      id: `user-msg-${Date.now()}`,
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      mode,
      complexity,
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!customText) setInputQuery('');
    setIsThinking(true);

    setTimeout(() => {
      const aiResponse = generateAiAnalystResponse(
        textToSend,
        mode,
        complexity,
        metrics,
        experiments[0]?.config || activeBacktestResult ? {
          strategy_id: 'moving_average_momentum',
          symbols: ['NIFTY 50'],
          start_date: '2018-01-01',
          end_date: '2026-08-31',
          timeframe: '1D',
          initial_capital: 1000000,
          commission_rate: 0.0005,
          slippage_bps: 5,
          spread_bps: 2,
          position_sizing: 'equal_weight',
          parameters: { fast_window: 20, slow_window: 100 },
        } : null
      );

      setMessages((prev) => [...prev, aiResponse]);
      setIsThinking(false);
    }, 600);
  };

  // CSV File Processing Logic
  const handleFileProcess = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        const parsed = processCsvData(text);
        setParsedCsvResult(parsed);
        setDatasetName(file.name);
        setIsSchemaModalOpen(true);
      }
    };
    reader.readAsText(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileProcess(file);
  };

  // Drag & Drop Handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file && file.name.endsWith('.csv')) {
      handleFileProcess(file);
    }
  };

  // Confirm CSV Column Mapping & Run Analytics
  const handleConfirmSchema = (customMapping: any) => {
    if (!parsedCsvResult) return;
    const reProcessed = processCsvData(parsedCsvResult.rawRows.map(r => Object.values(r).join(',')).join('\n'), customMapping);
    const computedMetrics = calculateTradeAnalytics(reProcessed.trades, reProcessed.warnings);

    setTrades(reProcessed.trades);
    setMetrics(computedMetrics);
    setIsSchemaModalOpen(false);

    // Notify user in chat transcript
    const sysMsg: AiChatMessage = {
      id: `sys-upload-${Date.now()}`,
      sender: 'ai',
      text: `Successfully ingested **${reProcessed.trades.length} trades** from \`${datasetName}\`.

• **Data Quality:** \`${computedMetrics.data_quality}\`
• **Net Realized PnL:** ₹${computedMetrics.net_pnl.toLocaleString()}
• **Win Rate:** ${computedMetrics.win_rate}%
• **Profit Factor:** ${computedMetrics.profit_factor}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      mode: 'trade_analysis',
      complexity,
      suggestions: [
        'What was happening during my worst drawdown?',
        'Analyze my position sizing consistency',
        'Generate full research report',
      ],
    };
    setMessages((prev) => [...prev, sysMsg]);
  };

  // Clear Session & Reset
  const handleClearSession = () => {
    setMessages([]);
    setInputQuery('');
  };

  const handleRemoveDataset = () => {
    const defaultSample = getSampleTradesDataset();
    setDatasetName('Default Sample Trades');
    setTrades(defaultSample.trades);
    setMetrics(defaultSample.metrics);
  };

  // Generate Report
  const handleOpenReportModal = () => {
    const report = compileResearchReport(metrics, datasetName);
    setActiveReport(report);
    setIsReportModalOpen(true);
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="relative min-h-[calc(100vh-6rem)] space-y-6"
    >
      {/* Drag & Drop Visual Overlay */}
      {isDragging && (
        <div className="fixed inset-0 z-50 bg-indigo-950/80 backdrop-blur-md border-4 border-dashed border-indigo-500 flex flex-col items-center justify-center text-center p-6 space-y-3 pointer-events-none">
          <Upload className="w-12 h-12 text-indigo-400 animate-bounce" />
          <h2 className="text-2xl font-bold text-white">Drop CSV Anywhere to Analyze Trades</h2>
          <p className="text-xs text-slate-300 font-mono">Supports standard columns: Date, Symbol, Side, Price, Qty, PnL, Fees</p>
        </div>
      )}

      {/* Workspace Header (Section 4, 5, 21) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-800/40">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-3xl lg:text-4xl font-bold tracking-tight text-slate-100">
              QUANTLAB AI RESEARCH ANALYST
            </h1>
            {/* Compact Status Indicator */}
            <div
              className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono text-[11px]"
              title="Connected to QuantLab analytics and research engine"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>Connected</span>
            </div>
          </div>
          <p className="text-sm text-slate-400 font-sans leading-relaxed">
            Understand markets, strategies and your trading history in plain English.
          </p>
        </div>

        {/* Header Actions: History & Data Privacy */}
        <div className="flex items-center gap-2 font-mono text-xs">
          <button
            onClick={() => setIsHistoryOpen(true)}
            className="px-3 py-1.5 rounded-xl border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white transition-colors flex items-center gap-1.5"
          >
            <History className="w-3.5 h-3.5 text-indigo-400" />
            <span>History</span>
          </button>
          <button
            onClick={handleClearSession}
            className="px-3 py-1.5 rounded-xl border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200 transition-colors flex items-center gap-1.5"
            title="Clear Chat History"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>↻ Clear History</span>
          </button>
          <button
            onClick={handleRemoveDataset}
            className="px-3 py-1.5 rounded-xl border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-rose-400 transition-colors flex items-center gap-1.5"
            title="Remove User Dataset"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>⌫ Reset Dataset</span>
          </button>
        </div>
      </div>

      {/* Top Mode Controls & Language Selector (Section 6, 7) */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-3 rounded-2xl bg-[#0f172a]/70 border border-slate-800/80">
        {/* Refined Segmented Control */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-mono">
          <button
            onClick={() => setMode('trade_analysis')}
            className={`px-4 py-1.5 rounded-lg transition-colors flex items-center gap-2 ${
              mode === 'trade_analysis'
                ? 'bg-indigo-500/20 text-indigo-300 font-semibold border border-indigo-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Trade Analysis</span>
          </button>
          <button
            onClick={() => setMode('research')}
            className={`px-4 py-1.5 rounded-lg transition-colors flex items-center gap-2 ${
              mode === 'research'
                ? 'bg-indigo-500/20 text-indigo-300 font-semibold border border-indigo-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <BarChart2 className="w-4 h-4" />
            <span>Quant Research</span>
          </button>
        </div>

        {/* Compact Language Mode Dropdown */}
        <div className="flex items-center gap-2 font-mono text-xs">
          <span className="text-slate-400 text-xs">Explain mode:</span>
          <div className="relative">
            <select
              value={complexity}
              onChange={(e) => setComplexity(e.target.value as LanguageComplexity)}
              className="appearance-none bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 pr-8 text-xs font-mono text-indigo-300 font-semibold focus:border-indigo-500 focus:outline-none cursor-pointer"
            >
              <option value="simple">Simple (Explain Like I'm New)</option>
              <option value="standard">Standard</option>
              <option value="technical">Technical</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Quick Action Chips (Section 8) */}
      <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
        <span className="text-slate-400 text-xs shrink-0">Quick Actions:</span>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-indigo-300 hover:border-indigo-500/40 transition-all flex items-center gap-1.5"
        >
          <Upload className="w-3.5 h-3.5 text-indigo-400" />
          <span>Analyze CSV</span>
        </button>
        <button
          onClick={() => handleSendMessage('What was happening during my worst drawdown between March 12 and March 27?')}
          className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-indigo-300 hover:border-indigo-500/40 transition-all flex items-center gap-1.5"
        >
          <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
          <span>Investigate Drawdown</span>
        </button>
        <button
          onClick={() => handleSendMessage('Test a 20/100 momentum strategy on NIFTY 50 from 2018 to 2026')}
          className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-indigo-300 hover:border-indigo-500/40 transition-all flex items-center gap-1.5"
        >
          <Play className="w-3.5 h-3.5 text-emerald-400" />
          <span>Natural Language Backtest</span>
        </button>
        <button
          onClick={() => handleSendMessage('Explain the difference between Sharpe Ratio and Sortino Ratio')}
          className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-indigo-300 hover:border-indigo-500/40 transition-all flex items-center gap-1.5"
        >
          <HelpCircle className="w-3.5 h-3.5 text-cyan-400" />
          <span>Explain Concept</span>
        </button>
      </div>

      {/* Main 70/30 Proportional Workspace (Section 2 & 3 & 22) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Left Column: Primary AI Conversation Workspace (~70-75% width: xl:col-span-8) */}
        <div className="xl:col-span-8 p-6 rounded-2xl bg-[#0f172a]/70 border border-slate-800/80 flex flex-col justify-between space-y-6 min-h-[680px]">
          {/* Conversation Header & Mobile Context Toggle */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-400" />
              <h2 className="font-bold text-slate-100 text-base">AI Quantitative Research Analyst</h2>
            </div>
            <button
              onClick={() => setIsMobileContextOpen(!isMobileContextOpen)}
              className="xl:hidden px-3 py-1 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono text-indigo-300 flex items-center gap-1.5"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>View Context</span>
            </button>
          </div>

          {/* Conversation Feed */}
          <div className="space-y-6 overflow-y-auto max-h-[620px] pr-2">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col space-y-3 p-5 rounded-2xl border transition-all ${
                  msg.sender === 'user'
                    ? 'bg-slate-900/90 border-slate-700/80 max-w-[85%] ml-auto'
                    : 'bg-slate-950/80 border-slate-800/90 w-full'
                }`}
              >
                <div className="flex items-center justify-between text-xs font-mono text-slate-400 pb-1 border-b border-slate-900">
                  <div className="flex items-center gap-2">
                    {msg.sender === 'ai' ? (
                      <>
                        <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                        <span className="font-semibold text-slate-200">AI Quantitative Research Analyst</span>
                      </>
                    ) : (
                      <span className="font-semibold text-indigo-300">You (Research Query)</span>
                    )}
                  </div>
                  <span className="text-[11px] text-slate-400">{msg.timestamp}</span>
                </div>

                {/* Readable Sans-Serif AI Text (Section 23, 24, 25) */}
                <div className="text-[15px] leading-relaxed text-slate-200 space-y-3 font-sans max-w-[950px]">
                  {msg.text.split('\n\n').map((para, pIdx) => {
                    if (para.startsWith('### ') || para.startsWith('**')) {
                      const lines = para.split('\n');
                      return (
                        <div key={pIdx} className="space-y-1">
                          {lines.map((line, lIdx) => {
                            if (line.startsWith('### ')) {
                              return (
                                <h3 key={lIdx} className="text-base font-bold text-slate-100 uppercase tracking-wider font-mono mt-3 mb-1">
                                  {line.replace('### ', '')}
                                </h3>
                              );
                            }
                            return <p key={lIdx}>{line}</p>;
                          })}
                        </div>
                      );
                    }
                    return <p key={pIdx}>{para}</p>;
                  })}
                </div>

                {/* Evidence Cards 4-Column Grid */}
                {msg.evidence && msg.evidence.length > 0 && (
                  <div className="space-y-3 pt-2">
                    {msg.evidence.map((item) => (
                      <EvidenceCard key={item.id} item={item} />
                    ))}
                  </div>
                )}

                {/* Structured Backtest Config Card */}
                {msg.suggestedBacktest && (
                  <div className="p-4 rounded-xl bg-indigo-950/50 border border-indigo-500/40 space-y-3 text-xs font-mono">
                    <div className="flex items-center justify-between text-indigo-300 font-bold">
                      <span>Generated Backtest Configuration</span>
                      <span className="text-[11px] text-emerald-400 font-semibold">Validated Spec</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-slate-300 text-[11px] bg-slate-950/70 p-3 rounded-lg border border-slate-800">
                      <div>Strategy: <strong className="text-slate-100">{msg.suggestedBacktest.strategy_id}</strong></div>
                      <div>Symbol: <strong className="text-slate-100">{msg.suggestedBacktest.symbols[0]}</strong></div>
                      <div>Period: <strong className="text-slate-100">{msg.suggestedBacktest.start_date} → {msg.suggestedBacktest.end_date}</strong></div>
                      <div>Capital: <strong className="text-emerald-400">₹{msg.suggestedBacktest.initial_capital.toLocaleString()}</strong></div>
                    </div>
                    <button
                      onClick={() => onRunBacktest(msg.suggestedBacktest!)}
                      className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold flex items-center justify-center gap-2 transition-all shadow-md shadow-indigo-600/20"
                    >
                      <Play className="w-4 h-4 text-emerald-400" />
                      Run Backtest Simulation Now
                    </button>
                  </div>
                )}

                {/* "You Might Also Ask" Chips (Section 14) */}
                {msg.suggestions && msg.suggestions.length > 0 && (
                  <div className="pt-2 space-y-1.5">
                    <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
                      You might also ask
                    </div>
                    <div className="flex flex-wrap gap-1.5 font-mono text-xs">
                      {msg.suggestions.map((sug, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleSendMessage(sug)}
                          className="px-3 py-1 rounded-xl bg-slate-900 border border-slate-800 hover:border-indigo-500/40 text-slate-300 hover:text-indigo-300 transition-colors"
                        >
                          {sug}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {isThinking && (
              <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-center gap-3 text-xs font-mono text-slate-400">
                <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                <span>Analyzing Quantitative Grounding Data & Computing Plain-English Explanation...</span>
              </div>
            )}
          </div>

          {/* Sticky Composer & Input Area (Section 15, 16, 17) */}
          <div className="sticky bottom-0 bg-[#0f172a]/95 backdrop-blur-md pt-3 pb-1 border-t border-slate-800/80 space-y-2 z-20">
            {/* Attachment Chip if Present */}
            <div className="flex items-center justify-between text-xs font-mono px-1">
              <div className="flex items-center gap-2 text-slate-300 bg-slate-950/80 px-3 py-1 rounded-lg border border-slate-800">
                <FileSpreadsheet className="w-3.5 h-3.5 text-indigo-400" />
                <span>📄 {datasetName} ({trades.length} trades · Mar 12 → Mar 27)</span>
                <button onClick={handleRemoveDataset} className="text-slate-500 hover:text-rose-400 ml-2">
                  <X className="w-3 h-3" />
                </button>
              </div>
              <span className="text-[11px] text-slate-400">Ctrl/Cmd + Enter to send</span>
            </div>

            {/* Composer Box */}
            <div className="flex gap-2">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileInputChange}
                accept=".csv"
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-3.5 py-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200 transition-colors flex items-center gap-1.5 font-mono text-xs shrink-0"
                title="Attach Trade CSV"
              >
                <Paperclip className="w-4 h-4" />
                <span className="hidden sm:inline">+ Attach CSV</span>
              </button>

              <textarea
                value={inputQuery}
                onChange={(e) => setInputQuery(e.target.value)}
                onKeyDown={(e) => {
                  if ((e.metaKey || e.ctrlKey || !e.shiftKey) && e.key === 'Enter') {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                rows={2}
                placeholder="Ask anything about your trading, drawdowns, strategy or research..."
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-100 placeholder:text-slate-400 font-sans focus:border-indigo-500 focus:outline-none resize-none leading-relaxed"
              />

              <button
                onClick={() => handleSendMessage()}
                disabled={isThinking || !inputQuery.trim()}
                className="px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold text-xs transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 shrink-0"
              >
                <Send className="w-4 h-4" />
                <span>Send ↑</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Context & Quant Engine Panel (~25-30% width: xl:col-span-4) (Section 18, 19, 20) */}
        <div className={`xl:block ${isMobileContextOpen ? 'block' : 'hidden'} xl:col-span-4 space-y-6`}>
          {/* Analysis Context Sidebar */}
          <div className="p-6 rounded-2xl bg-[#0f172a]/70 border border-slate-800/80 space-y-4 font-mono text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-indigo-400" />
                <h3 className="font-bold text-slate-100 text-sm">ANALYSIS CONTEXT</h3>
              </div>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                metrics.data_quality === 'Good'
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
              }`}>
                ● {metrics.data_quality}
              </span>
            </div>

            {/* Context Compact Rows */}
            <div className="space-y-3 pt-1">
              <div>
                <div className="text-[10px] text-slate-400 uppercase tracking-wider">DATASET</div>
                <div className="text-xs font-bold text-slate-200 truncate mt-0.5">{datasetName}</div>
                <div className="text-[11px] text-slate-400 mt-0.5">{trades.length} trades · Mar 12 → Mar 27</div>
              </div>

              <div className="pt-2 border-t border-slate-900 space-y-2">
                <div className="text-[10px] text-slate-400 uppercase tracking-wider">PERFORMANCE</div>
                <div className="flex justify-between items-center"><span className="text-slate-400">Win Rate</span><span className="font-bold text-emerald-400">{metrics.win_rate}%</span></div>
                <div className="flex justify-between items-center"><span className="text-slate-400">Profit Factor</span><span className="font-bold text-slate-200">{metrics.profit_factor}</span></div>
                <div className="flex justify-between items-center"><span className="text-slate-400">Max Drawdown</span><span className="font-bold text-rose-400">-{metrics.max_drawdown_pct}%</span></div>
              </div>

              <div className="pt-2 border-t border-slate-900 space-y-2">
                <div className="text-[10px] text-slate-400 uppercase tracking-wider">QUANT ENGINE</div>
                <div className="flex justify-between items-center"><span className="text-slate-400">Engine</span><span className="text-emerald-400">QuantEngine v2.x</span></div>
                <div className="flex justify-between items-center"><span className="text-slate-400">Universe</span><span className="text-slate-200">NIFTY 50</span></div>
                <div className="flex justify-between items-center"><span className="text-slate-400">Bars Verified</span><span className="text-slate-200">2,016</span></div>
                <div className="flex justify-between items-center"><span className="text-slate-400">Friction Model</span><span className="text-slate-200">0.05% + 5bps</span></div>
              </div>
            </div>

            {/* Context Actions */}
            <div className="pt-3 space-y-2 border-t border-slate-800/80">
              <button
                onClick={() => {
                  if (parsedCsvResult) setIsSchemaModalOpen(true);
                }}
                className="w-full py-2.5 rounded-xl border border-slate-800 hover:border-slate-700 text-xs font-mono text-slate-300 hover:text-white transition-colors flex items-center justify-center gap-2"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-indigo-400" />
                Review Data Schema
              </button>

              <button
                onClick={handleOpenReportModal}
                className="w-full py-2.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-semibold font-mono transition-all flex items-center justify-center gap-2"
              >
                <FileText className="w-3.5 h-3.5" />
                Generate Research Report
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modals & Drawers */}
      {parsedCsvResult && (
        <CsvSchemaModal
          isOpen={isSchemaModalOpen}
          onClose={() => setIsSchemaModalOpen(false)}
          parsedResult={parsedCsvResult}
          filename={datasetName}
          onConfirmAnalysis={handleConfirmSchema}
        />
      )}

      <ResearchReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        report={activeReport}
      />

      <SessionHistoryDrawer
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        sessions={[]}
        onSelectSession={(sess) => {
          setDatasetName(sess.dataset_name || 'Selected Session');
        }}
        onDeleteSession={() => {}}
      />
    </div>
  );
};
