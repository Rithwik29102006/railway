import React from 'react';
import { RailOptProvider, useRailOpt } from './context/RailOptContext';
import { Navbar } from './components/Navbar';
import { DashboardView } from './views/DashboardView';
import { TrainScheduleView } from './views/TrainScheduleView';
import { TrackAssetsView } from './views/TrackAssetsView';
import { MaintenanceRequestsView } from './views/MaintenanceRequestsView';
import { AIBlockPlannerView } from './views/AIBlockPlannerView';
import { OptimizationResultsView } from './views/OptimizationResultsView';
import { WhatIfSimulatorView } from './views/WhatIfSimulatorView';
import { ReportsView } from './views/ReportsView';
import { ArchitectureModal } from './components/ArchitectureModal';
import { DisruptionSimulationModal } from './components/DisruptionSimulationModal';
import { NewRequestModal } from './components/NewRequestModal';
import { TrainTrack, ShieldCheck, Sparkles, Cpu, Layers } from 'lucide-react';

const MainContent: React.FC = () => {
  const { activeTab, setArchitectureModalOpen } = useRailOpt();

  return (
    <div className="min-h-screen flex flex-col justify-between bg-slate-50 text-slate-800 selection:bg-blue-600 selection:text-white">
      <div>
        {/* Top Navbar */}
        <Navbar />

        {/* Dynamic Main Workspace Container */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          {activeTab === 'dashboard' && <DashboardView />}
          {activeTab === 'trains' && <TrainScheduleView />}
          {activeTab === 'assets' && <TrackAssetsView />}
          {activeTab === 'requests' && <MaintenanceRequestsView />}
          {activeTab === 'planner' && <AIBlockPlannerView />}
          {activeTab === 'results' && <OptimizationResultsView />}
          {activeTab === 'whatif' && <WhatIfSimulatorView />}
          {activeTab === 'reports' && <ReportsView />}
        </main>
      </div>

      {/* Control Center Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 px-4 sm:px-6 lg:px-8 text-xs text-slate-500 mt-8 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="flex items-center gap-2 font-bold text-slate-800">
              <img src="/railnexa-logo.png" alt="RAILNEXA AI Logo" className="h-5 object-contain" />
              <span>RAILNEXA AI</span>
            </div>
            <span className="text-slate-300">|</span>
            <span className="text-slate-500">
              AI-Powered Railway Maintenance Intelligence
            </span>
          </div>

          <div className="flex items-center space-x-4 text-[11px]">
            <button
              onClick={() => setArchitectureModalOpen(true)}
              className="text-blue-600 hover:text-blue-800 font-mono flex items-center gap-1 font-semibold"
            >
              <Cpu className="w-3.5 h-3.5" />
              Architecture & Research
            </button>
            <span className="text-slate-300">•</span>
            <span className="text-slate-500">
              Corridor Simulation Platform (NDLS – BSB)
            </span>
          </div>
        </div>
      </footer>

      {/* Global Modals */}
      <ArchitectureModal />
      <DisruptionSimulationModal />
      <NewRequestModal />
    </div>
  );
};

export default function App() {
  return (
    <RailOptProvider>
      <MainContent />
    </RailOptProvider>
  );
}
