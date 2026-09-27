import React from 'react';
import { useRailOpt } from '../context/RailOptContext';
import { ActiveTab } from '../types';
import { 
  LayoutDashboard, TrainTrack, Activity, Wrench, 
  Sparkles, BarChart3, SlidersHorizontal, FileText, 
  Play, AlertTriangle, Layers, Cpu
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const { 
    activeTab, 
    setActiveTab, 
    systemTime, 
    startJudgeDemoFlow, 
    isOptimizing,
    setDisruptionModalOpen,
    setArchitectureModalOpen
  } = useRailOpt();

  const navItems: Array<{ id: ActiveTab; label: string; icon: React.ReactNode; isHeart?: boolean }> = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'trains', label: 'Train Schedule', icon: <TrainTrack className="w-4 h-4" /> },
    { id: 'assets', label: 'Track & Assets', icon: <Activity className="w-4 h-4" /> },
    { id: 'requests', label: 'Maintenance Requests', icon: <Wrench className="w-4 h-4" /> },
    { id: 'planner', label: 'AI Block Planner', icon: <Sparkles className="w-4 h-4 text-blue-600" />, isHeart: true },
    { id: 'results', label: 'Optimization Results', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'whatif', label: 'What-If Simulator', icon: <SlidersHorizontal className="w-4 h-4" /> },
    { id: 'reports', label: 'Reports & Governance', icon: <FileText className="w-4 h-4" /> },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/95 border-b border-slate-200 backdrop-blur-md shadow-sm">
      {/* Top operational banner */}
      <div className="bg-slate-100/90 px-4 py-1 border-b border-slate-200/80 text-xs flex items-center justify-between text-slate-600">
        <div className="flex items-center space-x-3">
          <span className="flex items-center gap-1.5 font-mono text-[11px] text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 font-semibold">
            <span className="w-2 h-2 rounded-full bg-blue-600" />
            SIH 2026 · PS SIH26027 · Ministry of Railways
          </span>
          <span className="hidden md:inline text-slate-500 font-medium">
            AI-Powered Automatic Block Planning to Maximise Asset Availability
          </span>
        </div>

        <div className="flex items-center space-x-4">
          <span className="text-[11px] text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 font-medium hidden sm:inline-flex items-center gap-1.5" title="Corridor, timetable and asset data are simulated for the prototype">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            Simulated data · NDLS–BSB
          </span>
          <span className="font-mono text-slate-700 font-semibold text-xs">
            {systemTime}
          </span>
        </div>
      </div>

      {/* Main Navbar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center space-x-3 cursor-pointer py-1" onClick={() => setActiveTab('dashboard')}>
            <img 
              src="/railnexa-logo.png" 
              alt="RAILNEXA AI Logo" 
              className="h-11 max-w-[240px] sm:max-w-[280px] object-contain rounded-md"
            />
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setDisruptionModalOpen(true)}
              className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-amber-800 bg-amber-50 border border-amber-200 hover:bg-amber-100 transition flex items-center gap-1.5 shadow-sm"
              title="Test dynamic disruption re-optimization"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              <span className="hidden md:inline">Simulate Disruption (+90m)</span>
            </button>

            <button
              onClick={() => setArchitectureModalOpen(true)}
              className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-slate-100 border border-slate-200 hover:bg-slate-200 transition flex items-center gap-1.5 shadow-sm"
            >
              <Layers className="w-3.5 h-3.5 text-blue-600" />
              <span className="hidden md:inline">Architecture</span>
            </button>

            <button
              onClick={startJudgeDemoFlow}
              disabled={isOptimizing}
              className="relative group overflow-hidden px-3.5 py-1.5 rounded-lg text-xs font-bold text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-800 shadow-md shadow-blue-500/20 transition-all flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5 fill-white text-white relative z-10" />
              <span className="relative z-10 hidden sm:inline">Run Guided Demo</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation Menu */}
        <nav className="flex space-x-1 overflow-x-auto pb-2 scrollbar-none border-t border-slate-100 pt-2">
          {navItems.map(item => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all duration-150 ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 border border-blue-200 shadow-sm font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-transparent'
                } ${item.isHeart ? 'ring-1 ring-blue-300 font-semibold' : ''}`}
              >
                {item.icon}
                <span>{item.label}</span>
                {item.isHeart && (
                  <span className="px-1 py-0.2 rounded text-[9px] bg-blue-100 text-blue-700 border border-blue-200 font-bold">
                    CORE
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
