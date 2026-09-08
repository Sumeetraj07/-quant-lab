import React, { useState } from 'react';
import { Search, Filter, TrendingUp, TrendingDown, ArrowUpRight, X, Newspaper, Globe, Sparkles, ExternalLink, Calendar, Layers } from 'lucide-react';
import type { Asset, ActiveTab } from '../types';
import { INITIAL_NEWS } from '../services/api';

interface MarketDataPageProps {
  assets: Asset[];
  onNavigate: (tab: ActiveTab) => void;
}

export const MarketDataPage: React.FC<MarketDataPageProps> = ({ assets, onNavigate }) => {
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [activeTab, setActiveTab] = useState<'ASSETS' | 'NEWS'>('ASSETS');
  const [activeAsset, setActiveAsset] = useState<Asset | null>(null);
  const [newsFilter, setNewsFilter] = useState<string>('ALL');

  const filteredAssets = assets.filter((a) => {
    const matchesSearch =
      a.symbol.toLowerCase().includes(search.toLowerCase()) ||
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      (a.sector && a.sector.toLowerCase().includes(search.toLowerCase()));
    const matchesType = selectedType === 'ALL' || a.asset_type === selectedType;
    return matchesSearch && matchesType;
  });

  const filteredNews = INITIAL_NEWS.filter((n) => {
    if (newsFilter !== 'ALL' && n.symbol !== newsFilter) return false;
    if (!search) return true;
    return (
      n.symbol.toLowerCase().includes(search.toLowerCase()) ||
      n.headline.toLowerCase().includes(search.toLowerCase()) ||
      n.summary.toLowerCase().includes(search.toLowerCase())
    );
  });

  // Ticker items for live Bloomberg banner
  const breakingNews = INITIAL_NEWS.slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Bloomberg-Style Live News Ticker Header Bar */}
      <div className="rounded-xl bg-slate-900/90 border border-slate-800 p-2.5 overflow-hidden shadow-lg">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 text-xs font-mono font-bold shrink-0">
            <Newspaper className="w-3.5 h-3.5 animate-pulse text-indigo-400" />
            <span>BLOOMBERG WIRE</span>
          </div>

          <div className="flex-1 overflow-x-auto whitespace-nowrap scrollbar-none flex items-center gap-6 text-xs font-mono">
            {breakingNews.map((n) => (
              <div key={n.id} className="inline-flex items-center gap-2 shrink-0">
                <span className="px-1.5 py-0.5 rounded bg-slate-800 text-indigo-300 font-bold">{n.symbol}</span>
                <span className="text-slate-200 truncate max-w-md">{n.headline}</span>
                <span className="text-[10px] text-slate-500">{n.timestamp.split(' ')[1]}</span>
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                    n.sentiment === 'POSITIVE'
                      ? 'bg-emerald-500/10 text-emerald-400'
                      : n.sentiment === 'NEGATIVE'
                      ? 'bg-rose-500/10 text-rose-400'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {n.sentiment}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Page Title & Mode Selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <span>Market Data & Financial News Workstation</span>
          </h1>
          <p className="text-xs text-slate-400 font-mono">
            Real-Time Listed Assets, Fundamentals, and Institutional Bloomberg News Feed
          </p>
        </div>

        {/* View Toggle: Asset Universe vs Live News Wire */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono">
          <button
            onClick={() => setActiveTab('ASSETS')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all ${
              activeTab === 'ASSETS'
                ? 'bg-indigo-600 text-white font-semibold shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Asset Universe ({assets.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('NEWS')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all ${
              activeTab === 'NEWS'
                ? 'bg-indigo-600 text-white font-semibold shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Globe className="w-3.5 h-3.5 text-cyan-400" />
            <span>Live News Wire ({INITIAL_NEWS.length})</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder={
              activeTab === 'ASSETS'
                ? 'Search symbol, company, or sector (RELIANCE, AAPL, NIFTY 50)...'
                : 'Search news headlines, keywords, or symbols...'
            }
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-slate-200 placeholder-slate-500 outline-none focus:border-indigo-500"
          />
        </div>

        {activeTab === 'ASSETS' ? (
          <div className="flex items-center gap-1.5 text-xs font-mono">
            <Filter className="w-3.5 h-3.5 text-slate-500 mr-1" />
            {['ALL', 'Equity', 'Index', 'Crypto', 'Forex'].map((t) => (
              <button
                key={t}
                onClick={() => setSelectedType(t)}
                className={`px-3 py-1.5 rounded-lg border transition-all ${
                  selectedType === t
                    ? 'bg-indigo-600 border-indigo-500 text-white font-semibold'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-xs font-mono">
            <span className="text-slate-500 mr-1">Filter Ticker:</span>
            <select
              value={newsFilter}
              onChange={(e) => setNewsFilter(e.target.value)}
              className="p-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-slate-200 font-mono outline-none"
            >
              <option value="ALL">All Tickers</option>
              {assets.map((a) => (
                <option key={a.symbol} value={a.symbol}>
                  {a.symbol} ({a.name})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* ASSETS VIEW */}
      {activeTab === 'ASSETS' && (
        <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800/80 overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs tabular-nums">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-mono">
                <th className="py-3 px-4">Symbol</th>
                <th className="py-3 px-4">Asset Name</th>
                <th className="py-3 px-4">Exchange / Sector</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4 text-right">Price</th>
                <th className="py-3 px-4 text-right">24h Change</th>
                <th className="py-3 px-4 text-right">Market Cap</th>
                <th className="py-3 px-4 text-right">P/E</th>
                <th className="py-3 px-4 text-center">Sentiment</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredAssets.map((asset) => {
                const isPos = asset.change_24h_pct >= 0;
                return (
                  <tr key={asset.symbol} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-indigo-300 font-mono">{asset.symbol}</td>
                    <td className="py-3.5 px-4 font-medium text-slate-200">{asset.name}</td>
                    <td className="py-3.5 px-4 text-slate-400 font-mono">
                      {asset.exchange} {asset.sector ? `· ${asset.sector}` : ''}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded-full bg-slate-800 text-[10px] font-mono text-slate-300 border border-slate-700">
                        {asset.asset_type}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-slate-100">
                      {asset.asset_type === 'Equity' || asset.symbol.includes('NIFTY') ? '₹' : '$'}
                      {asset.price.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold">
                      <span className={`inline-flex items-center gap-0.5 ${isPos ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {isPos ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        {isPos ? `+${asset.change_24h_pct}%` : `${asset.change_24h_pct}%`}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right text-slate-300 font-mono">{asset.market_cap || asset.volume}</td>
                    <td className="py-3.5 px-4 text-right text-slate-400 font-mono">{asset.pe_ratio ? asset.pe_ratio : '-'}</td>
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                          asset.sentiment === 'BULLISH'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                            : asset.sentiment === 'BEARISH'
                            ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                            : 'bg-slate-800 text-slate-400 border border-slate-700'
                        }`}
                      >
                        {asset.sentiment || 'NEUTRAL'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={() => setActiveAsset(asset)}
                        className="p-1.5 rounded-lg bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600 hover:text-white transition-colors"
                        title="Inspect Company & News"
                      >
                        <ArrowUpRight className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* NEWS WIRE VIEW */}
      {activeTab === 'NEWS' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredNews.map((news) => (
              <div
                key={news.id}
                className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800/80 hover:border-indigo-500/40 transition-all space-y-3 shadow-lg flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 font-bold">
                        {news.symbol}
                      </span>
                      <span className="text-slate-400">{news.source}</span>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        news.sentiment === 'POSITIVE'
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : news.sentiment === 'NEGATIVE'
                          ? 'bg-rose-500/10 text-rose-400'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {news.sentiment}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-slate-100 leading-snug">{news.headline}</h3>
                  <p className="text-xs text-slate-300 leading-relaxed">{news.summary}</p>
                </div>

                <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 pt-2 border-t border-slate-800/60">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    <span>{news.timestamp}</span>
                  </div>
                  <div className="flex items-center gap-1 text-indigo-400 hover:text-indigo-300 cursor-pointer">
                    <span>Bloomberg Wire</span>
                    <ExternalLink className="w-3 h-3" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Asset Detail & Historical News Modal */}
      {activeAsset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-3xl rounded-2xl bg-slate-900 border border-slate-700 p-6 space-y-6 relative shadow-2xl max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setActiveAsset(null)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Header */}
            <div className="flex items-center gap-3">
              <div className="p-3.5 rounded-xl bg-indigo-600/20 text-indigo-300 font-mono font-bold text-xl border border-indigo-500/30">
                {activeAsset.symbol}
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-100">{activeAsset.name}</h3>
                <div className="text-xs text-slate-400 font-mono">
                  {activeAsset.exchange} · {activeAsset.asset_type} {activeAsset.sector ? `· ${activeAsset.sector}` : ''}
                </div>
              </div>
            </div>

            {/* Financial Fundamentals Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono p-4 rounded-xl bg-slate-950/80 border border-slate-800">
              <div>
                <div className="text-slate-500">Current Price</div>
                <div className="text-base font-bold text-slate-100">
                  {activeAsset.asset_type === 'Equity' || activeAsset.symbol.includes('NIFTY') ? '₹' : '$'}
                  {activeAsset.price.toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-slate-500">24h Return</div>
                <div className={`text-base font-bold ${activeAsset.change_24h_pct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {activeAsset.change_24h_pct >= 0 ? `+${activeAsset.change_24h_pct}%` : `${activeAsset.change_24h_pct}%`}
                </div>
              </div>
              <div>
                <div className="text-slate-500">Market Cap</div>
                <div className="text-base font-bold text-slate-200">{activeAsset.market_cap || activeAsset.volume}</div>
              </div>
              <div>
                <div className="text-slate-500">P/E Ratio</div>
                <div className="text-base font-bold text-indigo-400">{activeAsset.pe_ratio || '-'}</div>
              </div>
              <div>
                <div className="text-slate-500">52-Week High</div>
                <div className="text-slate-200">{activeAsset.high_52w ? activeAsset.high_52w : '-'}</div>
              </div>
              <div>
                <div className="text-slate-500">52-Week Low</div>
                <div className="text-slate-200">{activeAsset.low_52w ? activeAsset.low_52w : '-'}</div>
              </div>
              <div>
                <div className="text-slate-500">24h Volume</div>
                <div className="text-slate-300">{activeAsset.volume}</div>
              </div>
              <div>
                <div className="text-slate-500">Market Sentiment</div>
                <div className="text-emerald-400 font-bold">{activeAsset.sentiment || 'NEUTRAL'}</div>
              </div>
            </div>

            {/* Asset Live & Historical Bloomberg News Feed */}
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <h4 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                  <Newspaper className="w-4 h-4 text-indigo-400" />
                  <span>Bloomberg News Wire for {activeAsset.symbol}</span>
                </h4>
                <span className="text-[10px] font-mono text-slate-500">Live & Historical Headlines</span>
              </div>

              <div className="space-y-3">
                {INITIAL_NEWS.filter((n) => n.symbol === activeAsset.symbol || n.symbol === 'NIFTY 50').map((news) => (
                  <div key={news.id} className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-indigo-400 font-semibold">{news.source}</span>
                      <span className="text-[10px] text-slate-500">{news.timestamp}</span>
                    </div>
                    <h5 className="text-xs font-bold text-slate-200">{news.headline}</h5>
                    <p className="text-[11px] text-slate-400 leading-relaxed">{news.summary}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                onClick={() => setActiveAsset(null)}
                className="px-4 py-2 text-xs text-slate-400 hover:text-slate-200 font-medium"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setActiveAsset(null);
                  onNavigate('builder');
                }}
                className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-lg flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <span>Configure Backtest on {activeAsset.symbol}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
