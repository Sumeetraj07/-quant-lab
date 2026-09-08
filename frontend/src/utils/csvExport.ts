import type { Trade, EquityPoint } from '../types';

/**
 * Downloads a text/csv string as a file using Blob and URL.createObjectURL
 */
export function triggerCsvDownload(csvContent: string, filename: string): void {
  // Prepend UTF-8 BOM so Excel opens special characters (e.g. currency symbols) cleanly
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Generates CSV string and triggers download for Trade execution logs
 */
export function exportTradesToCsv(trades: Trade[], filename: string = 'quantlab_trades.csv'): void {
  if (!trades || trades.length === 0) {
    alert('No trades available to export.');
    return;
  }

  const headers = [
    'Trade ID',
    'Symbol',
    'Side',
    'Entry Time',
    'Exit Time',
    'Entry Price',
    'Exit Price',
    'Quantity',
    'Gross PnL',
    'Transaction Costs',
    'Net PnL',
    'Return Pct (%)'
  ];

  const rows = trades.map((t) => [
    `"${t.trade_id || ''}"`,
    `"${t.symbol || ''}"`,
    `"${t.side || ''}"`,
    `"${t.entry_time || ''}"`,
    `"${t.exit_time || ''}"`,
    t.entry_price !== undefined ? t.entry_price : '',
    t.exit_price !== undefined ? t.exit_price : '',
    t.quantity !== undefined ? t.quantity : '',
    t.gross_pnl !== undefined ? t.gross_pnl : '',
    t.costs !== undefined ? t.costs : '',
    t.net_pnl !== undefined ? t.net_pnl : '',
    t.return_pct !== undefined ? t.return_pct : ''
  ]);

  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  triggerCsvDownload(csvContent, filename);
}

/**
 * Generates CSV string and triggers download for Equity Curve time-series
 */
export function exportEquityCurveToCsv(equityPoints: EquityPoint[], filename: string = 'quantlab_equity_curve.csv'): void {
  if (!equityPoints || equityPoints.length === 0) {
    alert('No equity data available to export.');
    return;
  }

  const headers = ['Timestamp', 'Strategy Equity', 'Benchmark Equity', 'Drawdown (%)'];

  const rows = equityPoints.map((pt) => [
    `"${pt.timestamp || ''}"`,
    pt.equity !== undefined ? pt.equity : '',
    pt.benchmark_equity !== undefined ? pt.benchmark_equity : '',
    pt.drawdown !== undefined ? pt.drawdown : ''
  ]);

  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  triggerCsvDownload(csvContent, filename);
}
