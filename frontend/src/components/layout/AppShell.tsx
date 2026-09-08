import React, { useState } from 'react';
import {
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
  Search,
  Bell,
  PanelLeftClose,
  PanelLeftOpen,
  Sparkles,
  CircleHelp,
  Compass,
  GraduationCap,
} from 'lucide-react';
import type { ActiveTab, ThemeMode } from '../../types';

interface AppShellProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  theme: ThemeMode;
  onToggleTheme: () => void;
  onOpenCommandPalette: () => void;
  onOpenOnboarding: () => void;
  onOpenGlossary: () => void;
  children: React.ReactNode;
  isDemoMode: boolean;
  onToggleDemoMode: () => void;
}

export const AppShell: React.FC<AppShellProps> = ({
  activeTab,
  setActiveTab,
  theme,
  onToggleTheme,
  onOpenCommandPalette,
  onOpenOnboarding,
  onOpenGlossary,
  children,
  isDemoMode,
  onToggleDemoMode,
}) => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  interface NavItem {
    id: string;
    label: string;
    icon: React.ReactNode;
    onClick?: () => void;
  }

  const navGroups: { title: string; items: NavItem[] }[] = [
    {
      title: 'WORKSPACE',
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
        { id: 'market', label: 'Markets', icon: <LineChart className="w-4 h-4" /> },
        { id: 'strategies', label: 'Strategies', icon: <Sliders className="w-4 h-4" /> },
      ],
    },
    {
      title: 'RESEARCH',
      items: [
        { id: 'builder', label: 'New Backtest', icon: <Play className="w-4 h-4 text-emerald-400" /> },
        { id: 'results', label: 'Results Terminal', icon: <Activity className="w-4 h-4 text-indigo-400" /> },
        { id: 'experiments', label: 'Experiments', icon: <Activity className="w-4 h-4 text-slate-400" /> },
        { id: 'compare', label: 'Compare', icon: <GitCompare className="w-4 h-4" /> },
        { id: 'optimization', label: 'Optimization', icon: <Sliders className="w-4 h-4 text-indigo-400" /> },
        { id: 'walk-forward', label: 'Walk-Forward', icon: <Cpu className="w-4 h-4 text-purple-400" /> },
        { id: 'monte-carlo', label: 'Monte Carlo', icon: <Cpu className="w-4 h-4 text-amber-400" /> },
      ],
    },
    {
      title: 'ANALYTICS',
      items: [
        { id: 'risk', label: 'Risk', icon: <Activity className="w-4 h-4 text-rose-400" /> },
      ],
    },
    {
      title: 'AI',
      items: [
        { id: 'ai', label: 'AI Research', icon: <Bot className="w-4 h-4 text-cyan-400" /> },
      ],
    },
    {
      title: 'LEARN',
      items: [
        { id: 'onboarding-tour', label: 'Product Tour', icon: <Compass className="w-4 h-4 text-indigo-400" />, onClick: onOpenOnboarding },
        { id: 'glossary-modal', label: 'Quant Glossary', icon: <GraduationCap className="w-4 h-4 text-cyan-400" />, onClick: onOpenGlossary },
      ],
    },
    {
      title: 'BOTTOM',
      items: [
        { id: 'settings', label: 'Settings', icon: <BookOpen className="w-4 h-4" /> },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-600 selection:text-white">
      {/* Demo Mode Banner */}
      {isDemoMode && (
        <div className="bg-gradient-to-r from-amber-600/90 via-indigo-600/90 to-amber-600/90 text-white text-xs font-medium py-1 px-4 flex items-center justify-between shadow-md">
          <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span><strong>DEMO WORKSPACE:</strong> Populated with sample quantitative backtest data for exploration.</span>
          </div>
          <button
            onClick={onToggleDemoMode}
            className="px-2 py-0.5 rounded bg-black/30 hover:bg-black/50 text-[11px] font-mono transition-colors"
          >
            Exit Demo Mode
          </button>
        </div>
      )}

      {/* Main Desktop Container */}
      <div className="flex-1 flex overflow-hidden">
        {/* Collapsible Refined macOS-Style Left Sidebar (~225px expanded, ~64px collapsed) */}
        <aside
          className={`${
            isSidebarCollapsed ? 'w-16' : 'w-56'
          } bg-slate-900/60 backdrop-blur-xl border-r border-slate-800/60 flex flex-col transition-all duration-200 shrink-0 z-20`}
        >
          {/* Logo / Header */}
          <div className="p-3.5 flex items-center justify-between border-b border-slate-800/60">
            {!isSidebarCollapsed && (
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white shadow-md shadow-indigo-600/30 text-xs">
                  Q
                </div>
                <div>
                  <div className="font-bold text-xs tracking-tight text-slate-100">QuantLab</div>
                  <div className="text-[9px] font-mono text-indigo-400 tracking-wider uppercase">Research Platform</div>
                </div>
              </div>
            )}
            {isSidebarCollapsed && (
              <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white text-xs mx-auto">
                Q
              </div>
            )}
            <button
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="p-1 rounded-md text-slate-500 hover:text-slate-200 hover:bg-slate-800/60 transition-colors"
              title="Toggle Sidebar (Ctrl+B)"
            >
              {isSidebarCollapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
            </button>
          </div>

          {/* Navigation Links Grouped */}
          <nav className="flex-1 p-2 space-y-3 overflow-y-auto">
            {navGroups.map((group) => (
              <div key={group.title} className="space-y-0.5">
                {!isSidebarCollapsed && (
                  <div className="px-3 pt-2 pb-1 text-[9px] font-mono font-semibold tracking-wider text-slate-500 uppercase">
                    {group.title}
                  </div>
                )}
                {group.items.map((item) => {
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        if (item.onClick) {
                          item.onClick();
                        } else {
                          setActiveTab(item.id as ActiveTab);
                        }
                      }}
                      title={isSidebarCollapsed ? item.label : undefined}
                      className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        isActive
                          ? 'bg-indigo-500/10 text-indigo-300 font-semibold border-l-2 border-indigo-500'
                          : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
                      }`}
                    >
                      <span className="shrink-0">{item.icon}</span>
                      {!isSidebarCollapsed && <span className="truncate">{item.label}</span>}
                    </button>
                  );
                })}
              </div>
            ))}
          </nav>
        </aside>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-slate-950">
          {/* Refined Top Bar Navigation */}
          <header className="h-13 bg-slate-900/40 backdrop-blur-md border-b border-slate-800/60 px-4 md:px-8 flex items-center justify-between gap-4 shrink-0">
            {/* Breadcrumb / Title */}
            <div className="flex items-center gap-2 text-xs font-mono">
              <span className="text-slate-500">QuantLab</span>
              <span className="text-slate-600">/</span>
              <span className="text-slate-400">WORKSPACE</span>
              <span className="text-slate-600">/</span>
              <span className="text-indigo-400 font-semibold uppercase">{activeTab}</span>
            </div>

            {/* Global Search & Actions */}
            <div className="flex items-center gap-4">
              {/* Command Palette Trigger */}
              <button
                onClick={onOpenCommandPalette}
                className="flex items-center gap-3 px-3 py-1.5 rounded-lg bg-slate-900/80 border border-slate-800/80 text-slate-400 text-xs hover:border-slate-700 hover:text-slate-200 transition-colors shadow-sm"
              >
                <Search className="w-3.5 h-3.5 text-indigo-400" />
                <span className="hidden md:inline text-slate-400">Search commands or assets...</span>
                <span className="px-1.5 py-0.5 rounded bg-slate-800/80 text-[10px] font-mono text-slate-400 border border-slate-700/60">⌘K</span>
              </button>

              {/* Help Circle Button */}
              <button
                onClick={onOpenOnboarding}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition-colors"
                title="Product Tour & Help"
              >
                <CircleHelp className="w-4 h-4" />
              </button>

              {/* Theme Switcher */}
              <button
                onClick={onToggleTheme}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition-colors"
                title="Toggle Theme"
              >
                {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-400" />}
              </button>

              {/* Notifications */}
              <button className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition-colors relative">
                <Bell className="w-4 h-4" />
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 absolute top-1.5 right-1.5"></span>
              </button>

              {/* User Profile */}
              <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-indigo-600 to-slate-700 flex items-center justify-center text-[11px] font-bold text-white shadow-sm border border-slate-700">
                QR
              </div>
            </div>
          </header>

          {/* Main View Container with Responsive Max-Width Strategy */}
          <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto w-full">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
};
