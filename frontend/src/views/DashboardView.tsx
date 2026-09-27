import React from 'react';
import { useRailOpt } from '../context/RailOptContext';
import { KPICards } from '../components/KPICards';
import { NetworkMap3D } from '../components/NetworkMap3D';
import { GanttTimeline } from '../components/GanttTimeline';
import { ValidationPanel } from '../components/ValidationPanel';
import { 
  Sparkles, CheckCircle2, AlertCircle, ArrowRight, 
  TrendingUp, Shield, Layers, FileSpreadsheet, RefreshCw 
} from 'lucide-react';

export const DashboardView: React.FC = () => {
  const { result, setActiveTab, triggerOptimization, isOptimizing } = useRailOpt();

  return (
    <div className="space-y-4">
      {/* Top 6 KPI Cards */}
      <KPICards />

      {/* Main Grid: Network Visualizer + AI Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left: 2.5D Corridor Visualizer */}
        <div className="lg:col-span-2 space-y-4">
          <NetworkMap3D />
          <ValidationPanel />
        </div>

        {/* Right: AI Insights & Quick Action Deck */}
        <div className="space-y-4 flex flex-col justify-between">
          {/* AI Insights Card */}
          <div className="control-card rounded-xl p-4 border border-blue-200 flex-1 flex flex-col justify-between shadow-sm">
            <div>
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 mb-3">
                <div className="flex items-center space-x-2">
                  <div className="p-1.5 rounded-lg bg-blue-50 border border-blue-200">
                    <Sparkles className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">AI Block Planning Insights</h3>
                    <p className="text-[10px] text-slate-500 font-mono">Constraint optimiser · advisory output</p>
                  </div>
                </div>
                <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                  {result?.solver.provenOptimal ? 'OPTIMAL PLAN' : 'PLAN READY'}
                </span>
              </div>

              {/* Insights List */}
              <div className="space-y-2.5 text-xs text-slate-700">
                {(result?.ai_insights || []).slice(0, 6).map((insight, idx) => (
                  <div key={idx} className="flex items-start space-x-2 bg-slate-50 p-2.5 rounded-lg border border-slate-200/80">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span className="leading-snug text-slate-800 font-medium">{insight}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Action Navigation */}
            <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2">
              <button
                onClick={() => setActiveTab('planner')}
                className="py-2 px-3 rounded-lg text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-md transition flex items-center justify-center gap-1.5"
              >
                <span>AI Planner</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => setActiveTab('results')}
                className="py-2 px-3 rounded-lg text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition flex items-center justify-center gap-1.5"
              >
                <span>Before vs After</span>
                <TrendingUp className="w-3.5 h-3.5 text-blue-600" />
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* Gantt Timeline */}
      <GanttTimeline />
    </div>
  );
};
