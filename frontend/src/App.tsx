import { useState, useEffect } from 'react';
import { AppShell } from './components/layout/AppShell';
import { DashboardPage } from './pages/DashboardPage';
import { MarketDataPage } from './pages/MarketDataPage';
import { StrategiesPage } from './pages/StrategiesPage';
import { StrategyBuilderPage } from './pages/StrategyBuilderPage';
import { BacktestJobView } from './pages/BacktestJobView';
import { ResultsPage } from './pages/ResultsPage';
import { RiskPage } from './pages/RiskPage';
import { ExperimentsPage } from './pages/ExperimentsPage';
import { ComparePage } from './pages/ComparePage';
import { OptimizationPage } from './pages/OptimizationPage';
import { WalkForwardPage } from './pages/WalkForwardPage';
import { MonteCarloPage } from './pages/MonteCarloPage';
import { CommandPalette } from './components/common/CommandPalette';
import { OnboardingTour } from './components/onboarding/OnboardingTour';
import { GlossaryModal } from './components/education/GlossaryModal';
import { ArchitectureDiagram } from './components/education/ArchitectureDiagram';
import { AiResearchPage } from './pages/AiResearchPage';
import { AiAssistantModal } from './components/AiAssistantModal';
import {
  INITIAL_ASSETS,
  INITIAL_STRATEGIES,
  INITIAL_EXPERIMENTS,
  runClientSideBacktest,
} from './services/api';
import type {
  ActiveTab,
  ThemeMode,
  Strategy,
  BacktestConfig,
  BacktestResult,
  BacktestJob,
  Experiment,
} from './types';

export function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [theme, setTheme] = useState<ThemeMode>('dark');
  const [isDemoMode, setIsDemoMode] = useState<boolean>(true);

  // Modals state
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [isGlossaryOpen, setIsGlossaryOpen] = useState(false);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);

  // Data state
  const [assets] = useState(INITIAL_ASSETS);
  const [strategies] = useState(INITIAL_STRATEGIES);
  const [experiments, setExperiments] = useState<Experiment[]>(INITIAL_EXPERIMENTS);
  const [selectedStrategy, setSelectedStrategy] = useState<Strategy | undefined>(INITIAL_STRATEGIES[0]);

  // Backtest state
  const initialResults = runClientSideBacktest(INITIAL_EXPERIMENTS[0].config);
  const [backtestResults, setBacktestResults] = useState<BacktestResult | null>(initialResults);
  const [activeJob, setActiveJob] = useState<BacktestJob | null>(null);
  const [isExecutingJob, setIsExecutingJob] = useState(false);

  // Keyboard shortcut listener (Cmd+K / Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Handle Backtest execution
  const handleRunBacktest = async (config: BacktestConfig) => {
    setIsExecutingJob(true);

    const initialJob: BacktestJob = {
      id: `job-${Date.now()}`,
      status: 'RUNNING',
      progress_pct: 10,
      processed_bars: 250,
      total_bars: 2500,
      stage: 'Dataset Load',
      elapsed_seconds: 0.2,
      config,
    };

    setActiveJob(initialJob);
    setActiveTab('job');

    // Simulate async job stages
    setTimeout(() => {
      setActiveJob((prev) =>
        prev
          ? {
              ...prev,
              progress_pct: 40,
              processed_bars: 1000,
              stage: 'Validation',
              elapsed_seconds: 0.5,
            }
          : null
      );
    }, 400);

    setTimeout(() => {
      setActiveJob((prev) =>
        prev
          ? {
              ...prev,
              progress_pct: 75,
              processed_bars: 1875,
              stage: 'Strategy Execution',
              elapsed_seconds: 0.9,
            }
          : null
      );
    }, 800);

    setTimeout(() => {
      const results = runClientSideBacktest(config);
      setBacktestResults(results);

      // Create new experiment record
      const stratObj = strategies.find((s) => s.id === config.strategy_id);
      const newExp: Experiment = {
        id: `exp-${Date.now().toString().slice(-4)}`,
        name: `${stratObj?.name || 'Backtest Run'} (${config.symbols[0]})`,
        strategy_name: stratObj?.name || 'Custom Strategy',
        asset_universe: config.symbols,
        period: `${config.start_date} → ${config.end_date}`,
        sharpe: results.metrics.sharpe_ratio,
        cagr: results.metrics.cagr,
        max_dd: results.metrics.max_drawdown,
        created_at: new Date().toISOString(),
        config,
        metrics: results.metrics,
      };

      setExperiments((prev) => [newExp, ...prev]);

      setActiveJob((prev) =>
        prev
          ? {
              ...prev,
              status: 'COMPLETED',
              progress_pct: 100,
              processed_bars: 2500,
              stage: 'Saving',
              elapsed_seconds: 1.2,
              result: results,
            }
          : null
      );

      setIsExecutingJob(false);
    }, 1200);
  };

  const handleRunDefaultBacktest = () => {
    handleRunBacktest(INITIAL_EXPERIMENTS[0].config);
  };

  return (
    <AppShell
      activeTab={activeTab}
      setActiveTab={(tab) => setActiveTab(tab)}
      theme={theme}
      onToggleTheme={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
      onOpenOnboarding={() => setIsOnboardingOpen(true)}
      onOpenGlossary={() => setIsGlossaryOpen(true)}
      isDemoMode={isDemoMode}
      onToggleDemoMode={() => setIsDemoMode(!isDemoMode)}
    >
      {/* Route Views */}
      {activeTab === 'dashboard' && (
        <DashboardPage
          experiments={experiments}
          onNavigate={(tab) => setActiveTab(tab)}
          onRunDefaultBacktest={handleRunDefaultBacktest}
        />
      )}

      {activeTab === 'market' && (
        <MarketDataPage assets={assets} onNavigate={(tab) => setActiveTab(tab)} />
      )}

      {activeTab === 'strategies' && (
        <StrategiesPage
          strategies={strategies}
          onNavigate={(tab) => setActiveTab(tab)}
          onSelectStrategy={(strat) => setSelectedStrategy(strat)}
        />
      )}

      {activeTab === 'builder' && (
        <StrategyBuilderPage
          strategies={strategies}
          assets={assets}
          selectedStrategy={selectedStrategy}
          onRunBacktest={handleRunBacktest}
          isLoading={isExecutingJob}
        />
      )}

      {activeTab === 'job' && activeJob && (
        <BacktestJobView
          job={activeJob}
          onCancelJob={() => {
            setActiveJob(null);
            setActiveTab('builder');
          }}
          onViewResults={() => setActiveTab('results')}
        />
      )}

      {activeTab === 'results' && (
        <ResultsPage
          results={backtestResults}
          onRunAgain={() => setActiveTab('builder')}
        />
      )}

      {activeTab === 'risk' && <RiskPage />}

      {activeTab === 'experiments' && (
        <ExperimentsPage experiments={experiments} onNavigate={(tab) => setActiveTab(tab)} />
      )}

      {activeTab === 'compare' && <ComparePage experiments={experiments} />}

      {activeTab === 'optimization' && <OptimizationPage />}

      {activeTab === 'walk-forward' && <WalkForwardPage />}

      {activeTab === 'monte-carlo' && <MonteCarloPage />}

      {activeTab === 'ai' && (
        <AiResearchPage
          onRunBacktest={handleRunBacktest}
          activeBacktestResult={backtestResults}
          experiments={experiments}
        />
      )}

      {activeTab === 'settings' && (
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-100">QuantLab Settings & Architecture</h1>
            <p className="text-xs text-slate-400 font-mono">Platform Configuration, Terminology & Engine Design</p>
          </div>
          <ArchitectureDiagram />
        </div>
      )}

      {/* Global Modals */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onNavigate={(tab) => {
          setActiveTab(tab);
          setIsCommandPaletteOpen(false);
        }}
        onToggleTheme={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      />

      <OnboardingTour
        isOpen={isOnboardingOpen}
        onClose={() => setIsOnboardingOpen(false)}
        onStartGuidedBacktest={() => {
          setIsOnboardingOpen(false);
          handleRunDefaultBacktest();
        }}
      />

      <GlossaryModal isOpen={isGlossaryOpen} onClose={() => setIsGlossaryOpen(false)} />

      <AiAssistantModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        onApplyConfig={(cfg) => {
          setIsAiModalOpen(false);
          handleRunBacktest(cfg);
        }}
      />
    </AppShell>
  );
}

export default App;
