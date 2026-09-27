import React from 'react';
import { useRailOpt } from '../context/RailOptContext';
import { 
  Database, FileCheck, Star, Clock, Bot, ShieldCheck, 
  TrendingUp, CheckCircle, Train, Gauge, ArrowRight
} from 'lucide-react';
import { ActiveTab } from '../types';

export const WorkflowBanner: React.FC = () => {
  const { activeTab, setActiveTab, isOptimizing, optimizationStep } = useRailOpt();

  const steps = [
    { id: 1, title: 'Train + Asset Data', sub: 'Corridor telemetry', icon: <Database className="w-3.5 h-3.5" />, tab: 'assets' as ActiveTab },
    { id: 2, title: 'Maintenance Requests', sub: 'Engg, S&T, TRD', icon: <FileCheck className="w-3.5 h-3.5" />, tab: 'requests' as ActiveTab },
    { id: 3, title: 'Asset Prioritization', sub: 'Risk score index', icon: <Star className="w-3.5 h-3.5" />, tab: 'assets' as ActiveTab },
    { id: 4, title: 'Available Windows', sub: 'Night shadow slots', icon: <Clock className="w-3.5 h-3.5" />, tab: 'trains' as ActiveTab },
    { id: 5, title: 'AI Plan Generation', sub: 'Multi-dept coordination', icon: <Bot className="w-3.5 h-3.5" />, tab: 'planner' as ActiveTab },
    { id: 6, title: 'Conflict & Safety Check', sub: '7 safety checks', icon: <ShieldCheck className="w-3.5 h-3.5" />, tab: 'planner' as ActiveTab },
    { id: 7, title: 'Optimization Engine', sub: 'Branch-and-bound search', icon: <TrendingUp className="w-3.5 h-3.5" />, tab: 'results' as ActiveTab },
    { id: 8, title: 'Optimized Plan', sub: 'Corridor block schedule', icon: <CheckCircle className="w-3.5 h-3.5" />, tab: 'results' as ActiveTab },
    { id: 9, title: 'Operations + Availability', sub: 'Line availability', icon: <Train className="w-3.5 h-3.5" />, tab: 'dashboard' as ActiveTab },
    { id: 10, title: 'Live Dashboard', sub: 'Real-time control', icon: <Gauge className="w-3.5 h-3.5" />, tab: 'dashboard' as ActiveTab },
  ];

  return (
    <div className="bg-navy-900/90 border-b border-slate-800/80 px-4 py-2.5 overflow-hidden">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center space-x-2">
            <span className="text-[11px] font-mono font-semibold uppercase text-cyan-400 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
              End-to-End Operational Pipeline
            </span>
            <span className="text-[10px] text-slate-500 hidden md:inline">
              DATA → INSIGHTS → CONSTRAINT SATISFACTION → RELIABLE OPERATIONS
            </span>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">
            {isOptimizing ? `AI Solving Stage ${optimizationStep}/5...` : 'Status: Pipeline Synchronized'}
          </span>
        </div>

        {/* 10 Step horizontal rail */}
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 scrollbar-none">
          {steps.map((step, idx) => {
            const isStepActive = isOptimizing 
              ? (step.id === 5 && optimizationStep === 1) ||
                (step.id === 6 && optimizationStep === 2) ||
                (step.id === 7 && optimizationStep === 4) ||
                (step.id === 8 && optimizationStep === 5)
              : activeTab === step.tab;

            return (
              <React.Fragment key={step.id}>
                <button
                  onClick={() => setActiveTab(step.tab)}
                  className={`flex items-center space-x-2 px-2.5 py-1 rounded-md text-left transition-all shrink-0 ${
                    isStepActive
                      ? 'bg-cyan-950/80 text-cyan-300 border border-cyan-500/60 shadow-sm shadow-cyan-500/20'
                      : 'bg-slate-900/60 text-slate-400 border border-slate-800/80 hover:bg-slate-800/60 hover:text-slate-200'
                  }`}
                >
                  <div className={`w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold ${
                    isStepActive ? 'bg-cyan-500 text-navy-950 font-extrabold' : 'bg-slate-800 text-slate-400'
                  }`}>
                    {step.id}
                  </div>
                  <div>
                    <div className="text-[11px] font-semibold leading-tight flex items-center gap-1">
                      {step.title}
                    </div>
                    <div className="text-[9px] text-slate-400 leading-tight truncate max-w-[100px]">
                      {step.sub}
                    </div>
                  </div>
                </button>

                {idx < steps.length - 1 && (
                  <ArrowRight className="w-3 h-3 text-slate-700 shrink-0" />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
};
