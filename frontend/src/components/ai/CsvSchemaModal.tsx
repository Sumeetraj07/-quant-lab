import React, { useState } from 'react';
import { X, CheckCircle, AlertTriangle, FileSpreadsheet, ArrowRight } from 'lucide-react';
import type { ParsedCsvResult } from '../../services/tradeAnalyticsEngine';
import type { CsvColumnMapping } from '../../types/ai';

interface CsvSchemaModalProps {
  isOpen: boolean;
  onClose: () => void;
  parsedResult: ParsedCsvResult;
  filename: string;
  onConfirmAnalysis: (customMapping: CsvColumnMapping) => void;
}

export const CsvSchemaModal: React.FC<CsvSchemaModalProps> = ({
  isOpen,
  onClose,
  parsedResult,
  filename,
  onConfirmAnalysis,
}) => {
  const [mapping, setMapping] = useState<CsvColumnMapping>(parsedResult.detectedMapping);

  if (!isOpen) return null;

  const { headers, rawRows, warnings } = parsedResult;

  const fieldDefs: Array<{ key: keyof CsvColumnMapping; label: string; required: boolean }> = [
    { key: 'pnlHeader', label: 'PnL / Net Return', required: true },
    { key: 'dateHeader', label: 'Date / Timestamp', required: false },
    { key: 'symbolHeader', label: 'Symbol / Ticker', required: false },
    { key: 'sideHeader', label: 'Trade Side (BUY/SELL)', required: false },
    { key: 'priceHeader', label: 'Price / Fill Price', required: false },
    { key: 'quantityHeader', label: 'Quantity / Size', required: false },
    { key: 'feesHeader', label: 'Fees / Commission', required: false },
    { key: 'strategyHeader', label: 'Strategy / Tag', required: false },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h3 className="font-bold text-slate-100 text-base">CSV Schema & Data Inspection</h3>
              <p className="text-xs text-slate-400 font-mono">{filename} · {rawRows.length} trades detected</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Detected Schema Badges */}
          <div className="space-y-2">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 font-mono">Detected Columns</div>
            <div className="flex flex-wrap gap-2">
              {fieldDefs.map((f) => {
                const headerVal = mapping[f.key];
                return (
                  <div
                    key={f.key}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono border ${
                      headerVal
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                        : 'bg-slate-800/40 border-slate-700/60 text-slate-400'
                    }`}
                  >
                    {headerVal ? <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> : <span className="w-3.5 h-3.5 text-slate-500">•</span>}
                    <span>{f.label}:</span>
                    <strong className="text-slate-100">{headerVal || 'Not mapped'}</strong>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Warnings List */}
          {warnings.length > 0 && (
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-1 text-xs">
              <div className="flex items-center gap-2 font-semibold text-amber-400 font-mono">
                <AlertTriangle className="w-4 h-4" />
                <span>Schema Warnings ({warnings.length})</span>
              </div>
              <ul className="list-disc list-inside text-amber-200/80 space-y-0.5 font-mono text-[11px] pl-1">
                {warnings.map((w, idx) => (
                  <li key={idx}>{w}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Mapping Controls Override */}
          <div className="space-y-3 pt-2">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 font-mono">
              Adjust Column Mapping
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {fieldDefs.map((f) => (
                <div key={f.key} className="space-y-1">
                  <label className="text-slate-400 font-mono text-[11px]">{f.label}</label>
                  <select
                    value={mapping[f.key] || ''}
                    onChange={(e) => setMapping({ ...mapping, [f.key]: e.target.value || undefined })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-200 font-mono focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="">-- Ignore Column --</option>
                    {headers.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>

          {/* Table Preview */}
          <div className="space-y-2 pt-2">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 font-mono">Data Preview (First 5 Rows)</div>
            <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/70">
              <table className="w-full text-left text-xs font-mono tabular-nums">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 text-[11px] uppercase bg-slate-900/60">
                    {headers.map((h) => (
                      <th key={h} className="py-2 px-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {rawRows.slice(0, 5).map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-900/40">
                      {headers.map((h) => (
                        <td key={h} className="py-2 px-3 text-slate-300 whitespace-nowrap">{row[h]}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Modal Footer CTAs */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-800 text-xs font-mono text-slate-400 hover:text-slate-200 transition-colors"
          >
            Review Data Later
          </button>

          <button
            onClick={() => onConfirmAnalysis(mapping)}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-all flex items-center gap-2 shadow-lg shadow-indigo-600/20"
          >
            Analyze Trades Now
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
