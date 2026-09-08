import React, { useState } from 'react';
import { X, Download, Printer, FileText, CheckCircle2, AlertCircle } from 'lucide-react';
import type { ResearchReport } from '../../types/ai';

interface ResearchReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: ResearchReport | null;
}

export const ResearchReportModal: React.FC<ResearchReportModalProps> = ({ isOpen, onClose, report }) => {
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);

  if (!isOpen || !report) return null;

  const handleExportMarkdown = () => {
    const mdContent = `# ${report.title}
**Dataset:** ${report.dataset_name} | **Period:** ${report.date_range} | **Trades:** ${report.trade_count}

## 1. Executive Summary
${report.executive_summary}

## 2. Key Metrics Summary
- **Net Realized PnL:** ₹${report.metrics.net_pnl.toLocaleString()}
- **Win Rate:** ${report.metrics.win_rate}%
- **Profit Factor:** ${report.metrics.profit_factor}
- **Max Peak-to-Trough Drawdown:** -${report.metrics.max_drawdown_pct}%
- **Total Broker Fees:** ₹${report.metrics.total_fees.toLocaleString()}

## 3. Why This Happened
${report.why_this_happened.map((item) => `- ${item}`).join('\n')}

## 4. Strengths
${report.what_went_well.map((item) => `- ${item}`).join('\n')}

## 5. Performance Bottlenecks
${report.what_hurt_performance.map((item) => `- ${item}`).join('\n')}

## 6. Suggested Follow-Up Investigations
${report.suggested_investigations.map((item) => `- ${item}`).join('\n')}

---
*Disclaimer: ${report.disclaimer}*
`;

    const blob = new Blob([mdContent], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `QuantLab_Research_Report_${report.dataset_name.replace(/[^a-z0-9]/gi, '_')}.md`;
    a.click();
    URL.revokeObjectURL(url);

    setDownloadSuccess('Markdown (.md)');
    setTimeout(() => setDownloadSuccess(null), 3000);
  };

  const handleExportJson = () => {
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `QuantLab_Research_Report_${report.dataset_name.replace(/[^a-z0-9]/gi, '_')}.json`;
    a.click();
    URL.revokeObjectURL(url);

    setDownloadSuccess('JSON (.json)');
    setTimeout(() => setDownloadSuccess(null), 3000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
              <FileText className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h3 className="font-bold text-slate-100 text-base">{report.title}</h3>
              <p className="text-xs text-slate-400 font-mono">Dataset: {report.dataset_name} · Generated on {report.created_at}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Report Document Content */}
        <div className="p-6 space-y-6 overflow-y-auto font-sans text-xs text-slate-200 leading-relaxed print:text-black">
          {/* Metadata Banner */}
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 font-mono grid grid-cols-2 sm:grid-cols-4 gap-4 text-center tabular-nums">
            <div>
              <div className="text-[10px] text-slate-400 uppercase">Dataset</div>
              <div className="text-sm font-bold text-slate-200 truncate mt-0.5">{report.dataset_name}</div>
            </div>
            <div>
              <div className="text-[10px] text-slate-400 uppercase">Trades</div>
              <div className="text-sm font-bold text-slate-200 mt-0.5">{report.trade_count}</div>
            </div>
            <div>
              <div className="text-[10px] text-slate-400 uppercase">Net Realized PnL</div>
              <div className="text-sm font-bold text-emerald-400 mt-0.5">₹{report.metrics.net_pnl.toLocaleString()}</div>
            </div>
            <div>
              <div className="text-[10px] text-slate-400 uppercase">Win Rate</div>
              <div className="text-sm font-bold text-indigo-300 mt-0.5">{report.metrics.win_rate}%</div>
            </div>
          </div>

          {/* 1. Executive Summary */}
          <div className="space-y-2">
            <h4 className="text-sm font-bold text-slate-100 uppercase tracking-wider font-mono border-b border-slate-800 pb-1">
              1. Executive Summary
            </h4>
            <p className="text-slate-300">{report.executive_summary}</p>
          </div>

          {/* 2. Why This Happened */}
          <div className="space-y-2">
            <h4 className="text-sm font-bold text-slate-100 uppercase tracking-wider font-mono border-b border-slate-800 pb-1">
              2. Why This Happened (Key Drivers)
            </h4>
            <ul className="space-y-1.5 list-disc list-inside text-slate-300">
              {report.why_this_happened.map((item, idx) => (
                <li key={idx} className="leading-relaxed">{item}</li>
              ))}
            </ul>
          </div>

          {/* 3. Strengths vs Bottlenecks Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 space-y-2">
              <div className="flex items-center gap-2 font-mono font-bold text-emerald-400 text-xs">
                <CheckCircle2 className="w-4 h-4" />
                <span>WHAT WENT WELL</span>
              </div>
              <ul className="space-y-1 list-disc list-inside text-emerald-200/90 text-[11px]">
                {report.what_went_well.map((item, idx) => (
                  <li key={idx}>{item}</li>
                ))}
              </ul>
            </div>

            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 space-y-2">
              <div className="flex items-center gap-2 font-mono font-bold text-rose-400 text-xs">
                <AlertCircle className="w-4 h-4" />
                <span>WHAT HURT PERFORMANCE</span>
              </div>
              <ul className="space-y-1 list-disc list-inside text-rose-200/90 text-[11px]">
                {report.what_hurt_performance.map((item, idx) => (
                  <li key={idx}>{item}</li>
                ))}
              </ul>
            </div>
          </div>

          {/* 4. Suggested Next Investigations */}
          <div className="space-y-2">
            <h4 className="text-sm font-bold text-slate-100 uppercase tracking-wider font-mono border-b border-slate-800 pb-1">
              3. Suggested Quantitative Investigations
            </h4>
            <ul className="space-y-1.5 list-disc list-inside text-slate-300">
              {report.suggested_investigations.map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          </div>

          {/* Disclaimer */}
          <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 text-[11px] text-slate-400 font-mono">
            {report.disclaimer}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between shrink-0">
          <div className="text-xs font-mono text-emerald-400">
            {downloadSuccess && `Exported ${downloadSuccess} successfully!`}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              className="px-3.5 py-2 rounded-xl border border-slate-800 hover:border-slate-700 text-xs font-mono text-slate-300 hover:text-white transition-colors flex items-center gap-2"
            >
              <Printer className="w-3.5 h-3.5" />
              Print / PDF
            </button>
            <button
              onClick={handleExportJson}
              className="px-3.5 py-2 rounded-xl border border-slate-800 hover:border-slate-700 text-xs font-mono text-slate-300 hover:text-white transition-colors flex items-center gap-2"
            >
              <Download className="w-3.5 h-3.5" />
              JSON
            </button>
            <button
              onClick={handleExportMarkdown}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-all flex items-center gap-2 shadow-md shadow-indigo-600/20"
            >
              <Download className="w-4 h-4" />
              Export Markdown (.md)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
