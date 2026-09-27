import React from 'react';
import { useRailOpt } from '../context/RailOptContext';
import { X, Cpu, Database, ShieldCheck, CheckCircle2, BookOpen, Layers, GitFork } from 'lucide-react';

export const ArchitectureModal: React.FC = () => {
  const { architectureModalOpen, setArchitectureModalOpen } = useRailOpt();

  if (!architectureModalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="control-card rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-slate-200 shadow-2xl p-6 relative bg-white">
        {/* Close button */}
        <button
          onClick={() => setArchitectureModalOpen(false)}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Title */}
        <div className="flex items-center space-x-3 mb-4">
          <div className="p-2 rounded-xl bg-blue-50 border border-blue-200">
            <Layers className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              RAILNEXA AI — Architecture & Mathematical Model
              <span className="text-xs font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                AI risk scoring + exact optimisation
              </span>
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              Technical Credibility & Real-World Integration Blueprint for Indian Railways
            </p>
          </div>
        </div>

        {/* Architecture flow */}
        <div className="space-y-6">
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <h3 className="text-xs font-mono uppercase tracking-wider text-blue-700 font-bold mb-3 flex items-center gap-2">
              <Cpu className="w-4 h-4" />
              End-to-End Decision Support Pipeline
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
              <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                <span className="font-bold text-slate-900 block mb-1">1. Ingestion Layer</span>
                <p className="text-slate-600 text-[11px] font-medium">
                  Consumes Timetables, Track Management System (CRIS TMS), and Traction logs (TDMS).
                </p>
              </div>

              <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                <span className="font-bold text-blue-700 block mb-1">2. AI Risk Scoring</span>
                <p className="text-slate-600 text-[11px] font-medium">
                  Calculates composite degradation indices based on GMT loading, wear telemetry, and sensor drifts.
                </p>
              </div>

              <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                <span className="font-bold text-emerald-700 block mb-1">3. Block Optimiser</span>
                <p className="text-slate-600 text-[11px] font-medium">
                  Branch-and-bound over every feasible 15-min slot; crew capacity checked as interval colouring; proves optimality. Same model runs in the browser and in the FastAPI service.
                </p>
              </div>

              <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                <span className="font-bold text-purple-700 block mb-1">4. Advisory Dashboard</span>
                <p className="text-slate-600 text-[11px] font-medium">
                  Presents verified shadow windows to Section Controllers for authorized validation.
                </p>
              </div>
            </div>
          </div>

          {/* Mathematical Formulation */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <h3 className="text-xs font-mono uppercase tracking-wider text-blue-700 font-bold mb-2 flex items-center gap-2">
              <GitFork className="w-4 h-4" />
              Optimization Objective Function
            </h3>
            <div className="p-3 bg-white rounded-lg font-mono text-[11.5px] text-blue-900 border border-slate-200 space-y-1 shadow-sm">
              <div><strong>Decide</strong> for each request r: defer, or start sᵣ on a 15-min grid (gang assigned afterwards)</div>
              <div><strong>Minimise</strong> Σ<sub>deferred</sub> (P<sub>priority</sub> + 10·Risk<sub>asset</sub>) + 2·Σ<sub>trains</sub> w<sub>class</sub>·delay + Σ<sub>section-line</sub> |∪ possession| + 0.05·Σ|sᵣ − requestedᵣ|</div>
              <div className="text-[11px] text-slate-600 pt-2 border-t border-slate-100 font-medium space-y-0.5">
                <div><strong>Hard constraints:</strong></div>
                <div>• block ⊂ sanctioned window of its section</div>
                <div>• no Vande Bharat / Rajdhani path within block ± 15 min on the same line</div>
                <div>• concurrent blocks of a department ≤ gangs on duty (30 min transit between sections); shift ≤ 8 h</div>
                <div><strong>Train delay model:</strong> train meets a block → Single-Line Working over the adjacent line (+10 min) if that line is free, otherwise held until the block clears + buffer.</div>
                <div><strong>Why possession is a union:</strong> Engg + S&T + TRD works on the same line and time share one possession — this is what rewards integrated blocks.</div>
              </div>
            </div>
          </div>

          {/* Credible Indian Railways References */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <h3 className="text-xs font-mono uppercase tracking-wider text-blue-700 font-bold mb-3 flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              Authoritative Railway Operations & Research References
            </h3>

            <div className="space-y-2 text-xs">
              <div className="p-2.5 bg-white rounded-lg border border-slate-200 shadow-sm">
                <div className="font-bold text-slate-900">1. General & Subsidiary Rules (G&SR), Indian Railways</div>
                <div className="text-slate-600 text-[11px] font-medium">Rules for traffic blocks, line clear and Single-Line Working on double lines.</div>
              </div>

              <div className="p-2.5 bg-white rounded-lg border border-slate-200 shadow-sm">
                <div className="font-bold text-slate-900">2. CRIS Track Management System (TMS)</div>
                <div className="text-slate-600 text-[11px] font-medium">Ultrasonic Flaw Detection (USFD) & Track Recording Car (TRC) Asset Health Indexing Standards.</div>
              </div>

              <div className="p-2.5 bg-white rounded-lg border border-slate-200 shadow-sm">
                <div className="font-bold text-slate-900">3. CRIS Traction Distribution Management System (TDMS)</div>
                <div className="text-slate-600 text-[11px] font-medium">25kV AC Overhead Catenary, Section Insulator & Tower Wagon Operational Protocols.</div>
              </div>

              <div className="p-2.5 bg-white rounded-lg border border-slate-200 shadow-sm">
                <div className="font-bold text-slate-900">4. Budai, Huisman & Dekker (2006) — Scheduling preventive railway maintenance activities</div>
                <div className="text-slate-600 text-[11px] font-medium">Journal of the Operational Research Society 57: clustering maintenance works into shared possessions to cut track downtime.</div>
              </div>
            </div>
          </div>

          {/* Safety disclaimer */}
          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 font-medium">
            <strong>Operational Governance Standard:</strong> RAILNEXA AI acts strictly as an advisory decision-support layer. AI-generated block proposals require authorized Section Controller validation before physical block execution.
          </div>
        </div>
      </div>
    </div>
  );
};
