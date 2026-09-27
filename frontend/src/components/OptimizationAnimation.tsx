import React from 'react';
import { useRailOpt } from '../context/RailOptContext';
import { 
  Database, ShieldCheck, Clock, AlertTriangle, 
  Cpu, CheckCircle2, ArrowRight, Activity 
} from 'lucide-react';

export const OptimizationAnimation: React.FC = () => {
  const { optimizationStep, isOptimizing, result, trains, assets, requests } = useRailOpt();
  const s = result?.solver;

  const stages = [
    { id: 1, title: 'DATA INGESTION', desc: `${s?.trains ?? trains.length} train paths, ${assets.length} asset health records, ${s?.requests ?? requests.length} requests`, icon: <Database className="w-4 h-4" /> },
    { id: 2, title: 'AI RISK PRIORITY', desc: 'Health, criticality, GMT & failure trend → deferral penalty per request', icon: <ShieldCheck className="w-4 h-4" /> },
    { id: 3, title: 'CANDIDATE SLOTS', desc: `${s?.optionsEvaluated ?? '—'} slots inside sanctioned windows, clear of premium paths`, icon: <Clock className="w-4 h-4" /> },
    { id: 4, title: 'BRANCH & BOUND', desc: s ? `${s.nodes.toLocaleString('en-IN')} nodes searched in ${s.ms.toFixed(1)} ms` : 'Exact search with pruning', icon: <Cpu className="w-4 h-4" /> },
    { id: 5, title: 'VALIDATED PLAN', desc: result ? `${result.validation.filter(v => v.pass).length}/${result.validation.length} safety checks · ${result.integrated_blocks.length} integrated blocks` : 'Rule-checked output', icon: <CheckCircle2 className="w-4 h-4" /> },
  ];

  return (
    <div className="control-card rounded-xl p-5 border border-blue-200 relative overflow-hidden shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <div className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-ping" />
          <span className="text-xs font-mono font-bold tracking-wider uppercase text-blue-700">
            {isOptimizing ? 'Optimiser running…' : 'AI risk scoring + exact constraint optimisation'}
          </span>
        </div>
        <span className="text-xs font-mono text-slate-500 font-semibold">
          {s ? (s.provenOptimal ? 'Last plan: proven optimal' : 'Last plan: best found') : ''}
        </span>
      </div>

      {/* Progress pipeline */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        {stages.map((stage) => {
          const isActive = isOptimizing && optimizationStep === stage.id;
          const isDone = isOptimizing ? optimizationStep > stage.id : true;

          return (
            <div
              key={stage.id}
              className={`p-3.5 rounded-xl border transition-all duration-300 relative ${
                isActive
                  ? 'bg-blue-50 border-blue-500 shadow-md scale-[1.02]'
                  : isDone
                  ? 'bg-slate-50 border-slate-200 text-slate-700'
                  : 'bg-slate-50/50 border-slate-200/60 opacity-50'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className={`p-1.5 rounded-lg ${
                  isActive ? 'bg-blue-600 text-white font-bold' : 'bg-white border border-slate-200 text-blue-600 shadow-sm'
                }`}>
                  {stage.icon}
                </div>
                <span className="text-[10px] font-mono font-bold text-slate-500">
                  STAGE 0{stage.id}
                </span>
              </div>

              <div className="text-xs font-extrabold text-slate-900 mb-1">
                {stage.title}
              </div>
              <div className="text-[11px] text-slate-500 leading-snug font-medium">
                {stage.desc}
              </div>

              {isActive && (
                <div className="mt-2.5 h-1.5 w-full bg-blue-100 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-blue-600 to-indigo-600 animate-track-shimmer" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
