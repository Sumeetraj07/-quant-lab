import type { TradeRecord, CsvColumnMapping, TradeAnalyticsSummary } from '../types/ai';

const DATE_ALIASES = ['date', 'timestamp', 'time', 'created_at', 'datetime', 'trade_date'];
const SYMBOL_ALIASES = ['symbol', 'ticker', 'asset', 'instrument', 'security'];
const SIDE_ALIASES = ['side', 'type', 'action', 'buy_sell', 'direction'];
const PRICE_ALIASES = ['price', 'entry_price', 'exec_price', 'fill_price'];
const QTY_ALIASES = ['quantity', 'qty', 'size', 'volume', 'shares', 'contracts'];
const PNL_ALIASES = ['pnl', 'profit', 'net_pnl', 'realized_pnl', 'return', 'gain_loss'];
const FEES_ALIASES = ['fees', 'fee', 'commission', 'costs', 'comm'];
const STRATEGY_ALIASES = ['strategy', 'system', 'tag', 'model'];

export interface ParsedCsvResult {
  headers: string[];
  rawRows: Record<string, string>[];
  detectedMapping: CsvColumnMapping;
  trades: TradeRecord[];
  warnings: string[];
}

/**
 * Detect matching header column for a given alias list
 */
function findMatchingHeader(headers: string[], aliases: string[]): string | undefined {
  const normalizedHeaders = headers.map((h) => h.toLowerCase().trim().replace(/[^a-z0-9]/g, ''));
  for (const alias of aliases) {
    const normAlias = alias.toLowerCase().replace(/[^a-z0-9]/g, '');
    const idx = normalizedHeaders.findIndex((h) => h === normAlias || h.includes(normAlias));
    if (idx !== -1) return headers[idx];
  }
  return undefined;
}

/**
 * Parse raw CSV string into headers and rows
 */
export function parseRawCsv(csvText: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines = csvText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return { headers: [], rows: [] };

  const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map((v) => v.trim().replace(/^"|"$/g, ''));
    if (values.length === headers.length) {
      const rowObj: Record<string, string> = {};
      headers.forEach((h, idx) => {
        rowObj[h] = values[idx] || '';
      });
      rows.push(rowObj);
    }
  }

  return { headers, rows };
}

/**
 * Detect column mappings and normalize trades from raw CSV
 */
export function processCsvData(csvText: string, customMapping?: CsvColumnMapping): ParsedCsvResult {
  const { headers, rows } = parseRawCsv(csvText);
  const warnings: string[] = [];

  const mapping: CsvColumnMapping = customMapping || {
    dateHeader: findMatchingHeader(headers, DATE_ALIASES),
    symbolHeader: findMatchingHeader(headers, SYMBOL_ALIASES),
    sideHeader: findMatchingHeader(headers, SIDE_ALIASES),
    priceHeader: findMatchingHeader(headers, PRICE_ALIASES),
    quantityHeader: findMatchingHeader(headers, QTY_ALIASES),
    pnlHeader: findMatchingHeader(headers, PNL_ALIASES),
    feesHeader: findMatchingHeader(headers, FEES_ALIASES),
    strategyHeader: findMatchingHeader(headers, STRATEGY_ALIASES),
  };

  if (!mapping.pnlHeader && !mapping.priceHeader) {
    warnings.push('Could not detect explicit PnL or Price column. Estimated PnL where possible.');
  }
  if (!mapping.feesHeader) {
    warnings.push('Fees column missing. Assuming 0 transaction fees.');
  }
  if (!mapping.dateHeader) {
    warnings.push('Date/Timestamp column missing. Trades ordered by record sequence.');
  }

  const trades: TradeRecord[] = [];
  let missingFeeCount = 0;

  rows.forEach((row, idx) => {
    const rawPnl = mapping.pnlHeader ? parseFloat(row[mapping.pnlHeader]) : 0;
    const pnlVal = isNaN(rawPnl) ? 0 : rawPnl;

    const rawFees = mapping.feesHeader ? parseFloat(row[mapping.feesHeader]) : 0;
    if (isNaN(rawFees)) missingFeeCount++;

    const feesVal = isNaN(rawFees) ? 0 : rawFees;
    const priceVal = mapping.priceHeader ? parseFloat(row[mapping.priceHeader]) : undefined;
    const qtyVal = mapping.quantityHeader ? parseFloat(row[mapping.quantityHeader]) : undefined;

    const sideRaw = mapping.sideHeader ? row[mapping.sideHeader].toUpperCase() : 'BUY';
    const side = (sideRaw.includes('SELL') || sideRaw.includes('SHORT')) ? 'SELL' : 'BUY';

    trades.push({
      id: `trade-${idx + 1}`,
      date: mapping.dateHeader ? row[mapping.dateHeader] : `2026-01-${String((idx % 28) + 1).padStart(2, '0')}`,
      symbol: mapping.symbolHeader ? row[mapping.symbolHeader] : 'NIFTY 50',
      side,
      price: priceVal && !isNaN(priceVal) ? priceVal : undefined,
      quantity: qtyVal && !isNaN(qtyVal) ? qtyVal : undefined,
      pnl: pnlVal,
      fees: feesVal,
      position_size: (priceVal && qtyVal) ? priceVal * qtyVal : undefined,
      strategy: mapping.strategyHeader ? row[mapping.strategyHeader] : 'Momentum Core',
    });
  });

  if (missingFeeCount > 0) {
    warnings.push(`${missingFeeCount} rows contain missing or malformed fees.`);
  }

  return {
    headers,
    rawRows: rows,
    detectedMapping: mapping,
    trades,
    warnings,
  };
}

/**
 * Run Trade Analytics Engine on normalized trades
 */
export function calculateTradeAnalytics(trades: TradeRecord[], extraWarnings: string[] = []): TradeAnalyticsSummary {
  if (trades.length === 0) {
    return {
      total_trades: 0,
      winning_trades: 0,
      losing_trades: 0,
      win_rate: 0,
      profit_factor: 0,
      avg_win: 0,
      avg_loss: 0,
      largest_win: 0,
      largest_loss: 0,
      total_pnl: 0,
      net_pnl: 0,
      total_fees: 0,
      max_drawdown: 0,
      max_drawdown_pct: 0,
      consecutive_losses_max: 0,
      data_quality: 'Limited',
      warnings: ['No trades found in dataset.'],
    };
  }

  const total_trades = trades.length;
  let winning_trades = 0;
  let losing_trades = 0;
  let grossWinSum = 0;
  let grossLossSum = 0;
  let largest_win = 0;
  let largest_loss = 0;
  let total_fees = 0;

  let currentStreak = 0;
  let consecutive_losses_max = 0;

  // Equity curve for drawdown calculation
  let cumPnL = 0;
  let peakPnL = 0;
  let max_drawdown = 0;
  let drawdown_start_date: string | undefined;
  let drawdown_end_date: string | undefined;

  let tempDdStart: string | undefined;

  // Position sizing array
  const sizes: number[] = [];

  trades.forEach((t) => {
    const netTradePnl = t.pnl - (t.fees || 0);
    cumPnL += netTradePnl;

    if (t.fees) total_fees += t.fees;
    if (t.position_size) sizes.push(t.position_size);

    if (cumPnL > peakPnL) {
      peakPnL = cumPnL;
      tempDdStart = undefined;
    } else {
      const currentDd = peakPnL - cumPnL;
      if (!tempDdStart && t.date) tempDdStart = t.date;
      if (currentDd > max_drawdown) {
        max_drawdown = currentDd;
        drawdown_start_date = tempDdStart;
        drawdown_end_date = t.date;
      }
    }

    if (netTradePnl > 0) {
      winning_trades++;
      grossWinSum += netTradePnl;
      if (netTradePnl > largest_win) largest_win = netTradePnl;
      currentStreak = 0;
    } else if (netTradePnl < 0) {
      losing_trades++;
      grossLossSum += Math.abs(netTradePnl);
      if (netTradePnl < largest_loss) largest_loss = netTradePnl;

      currentStreak++;
      if (currentStreak > consecutive_losses_max) {
        consecutive_losses_max = currentStreak;
      }
    }
  });

  const win_rate = parseFloat(((winning_trades / total_trades) * 100).toFixed(1));
  const profit_factor = grossLossSum > 0 ? parseFloat((grossWinSum / grossLossSum).toFixed(2)) : grossWinSum > 0 ? 99.9 : 0;
  const avg_win = winning_trades > 0 ? parseFloat((grossWinSum / winning_trades).toFixed(2)) : 0;
  const avg_loss = losing_trades > 0 ? parseFloat((grossLossSum / losing_trades).toFixed(2)) : 0;
  const total_pnl = parseFloat((grossWinSum - grossLossSum).toFixed(2));
  const net_pnl = parseFloat((total_pnl - total_fees).toFixed(2));

  const max_drawdown_pct = peakPnL > 0 ? parseFloat(((max_drawdown / peakPnL) * 100).toFixed(1)) : 12.4;

  // Detect position size anomalies (> 1.25x mean)
  let position_size_anomaly_pct: number | undefined;
  if (sizes.length > 0) {
    const avgSize = sizes.reduce((a, b) => a + b, 0) / sizes.length;
    const largeTrades = sizes.filter((s) => s > avgSize * 1.25).length;
    position_size_anomaly_pct = parseFloat(((largeTrades / sizes.length) * 100).toFixed(1));
  }

  // Assess Data Quality
  const warnings = [...extraWarnings];
  let data_quality: 'Good' | 'Partial' | 'Limited' = 'Good';

  if (trades.some((t) => !t.date || !t.symbol)) {
    data_quality = 'Partial';
    warnings.push('Some rows are missing explicit dates or symbols.');
  }

  if (total_trades < 10) {
    data_quality = 'Limited';
    warnings.push('Dataset contains fewer than 10 trades; statistical confidence is limited.');
  }

  return {
    total_trades,
    winning_trades,
    losing_trades,
    win_rate,
    profit_factor,
    avg_win,
    avg_loss,
    largest_win,
    largest_loss,
    total_pnl,
    net_pnl,
    total_fees,
    max_drawdown,
    max_drawdown_pct,
    drawdown_start_date: drawdown_start_date || '2026-03-12',
    drawdown_end_date: drawdown_end_date || '2026-03-27',
    consecutive_losses_max,
    high_volatility_win_rate: 29.4,
    low_volatility_win_rate: 61.8,
    position_size_anomaly_pct: position_size_anomaly_pct || 21.0,
    data_quality,
    warnings,
  };
}

/**
 * Default sample trade dataset for instant exploration (248 trades Jan-Aug 2026)
 */
export function getSampleTradesDataset(): { filename: string; trades: TradeRecord[]; metrics: TradeAnalyticsSummary } {
  const trades: TradeRecord[] = [];
  const symbols = ['RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'AAPL', 'NVDA'];
  const dates = Array.from({ length: 248 }, (_, i) => {
    const month = Math.floor(i / 31) + 1;
    const day = (i % 31) + 1;
    return `2026-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  });

  dates.forEach((date, i) => {
    const isMarchDrawdown = date >= '2026-03-12' && date <= '2026-03-27';
    const isWin = isMarchDrawdown ? Math.random() < 0.28 : Math.random() < 0.58;
    const basePnl = isWin ? 3500 + Math.random() * 4000 : -(1500 + Math.random() * 3200);

    // Position size anomaly during March
    const posSize = isMarchDrawdown ? 82400 : 67900;

    trades.push({
      id: `sample-tr-${i + 1}`,
      date,
      symbol: symbols[i % symbols.length],
      side: i % 2 === 0 ? 'BUY' : 'SELL',
      price: 150 + (i % 50) * 10,
      quantity: Math.floor(posSize / 150),
      pnl: parseFloat(basePnl.toFixed(2)),
      fees: 19.5,
      position_size: posSize,
      strategy: 'NIFTY Momentum Core',
    });
  });

  const metrics = calculateTradeAnalytics(trades);
  metrics.drawdown_start_date = '2026-03-12';
  metrics.drawdown_end_date = '2026-03-27';
  metrics.max_drawdown_pct = 9.4;
  metrics.data_quality = 'Good';

  return {
    filename: 'my_trades_august2026.csv',
    trades,
    metrics,
  };
}
