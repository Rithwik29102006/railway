import React, { useEffect, useState } from 'react';
import { useRailOpt } from '../context/RailOptContext';
import { X, AlertTriangle, RefreshCw, Zap, CheckCircle2, ArrowRight } from 'lucide-react';

/** Live disruption: lock an in-progress block with its overrun and re-optimise everything else around it. */
export const DisruptionSimulationModal: React.FC = () => {
  const { disruptionModalOpen, setDisruptionModalOpen, triggerDisruptionReplan, isOptimizing, result, lastReplan, setActiveTab } = useRailOpt();
  const [additionalMinutes, setAdditionalMinutes] = useState<number>(90);
  const [reason, setReason] = useState<string>('Contact-wire anchor replacement overrun');
  const [done, setDone] = useState(false);
  const [blockId, setBlockId] = useState<string>('');

  useEffect(() => {
    if (disruptionModalOpen) {
      setDone(false);
      const blocks = result?.scheduled_blocks || [];
      if (!blocks.some(b => b.block_id === blockId)) setBlockId((blocks.find(b => b.power_block && b.integrated_block_id) || blocks.find(b => b.power_block) || blocks[0])?.block_id || '');
    }
  }, [disruptionModalOpen]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!disruptionModalOpen) return null;
  const target = result?.scheduled_blocks.find(b => b.block_id === blockId);

  const handleSimulate = async () => {
    await triggerDisruptionReplan(additionalMinutes, reason, blockId);
    setDone(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl max-w-xl w-full border border-amber-300 shadow-2xl p-6 relative max-h-[90vh] overflow-y-auto">
        <button onClick={() => setDisruptionModalOpen(false)} className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition">
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-3 mb-4">
          <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200"><AlertTriangle className="w-6 h-6 text-amber-600" /></div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Live Disruption Re-plan</h2>
            <p className="text-xs text-slate-500">A block in progress overruns. It is locked in place; every other block is re-optimised around it.</p>
          </div>
        </div>

        {!done ? (
          <div className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Block that overruns:</label>
              <select value={blockId} onChange={e => setBlockId(e.target.value)} className="w-full p-2.5 bg-slate-50 rounded-lg border border-slate-200 font-mono text-slate-800 text-[11px] outline-none focus:border-amber-500">
                {(result?.scheduled_blocks || []).map(b => (
                  <option key={b.block_id} value={b.block_id}>{b.request_id} · {b.asset_name} · {b.section_name} {b.line} · {b.start_time}–{b.end_time}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Overrun:</label>
              <div className="flex items-center space-x-3">
                <input type="range" min="30" max="180" step="15" value={additionalMinutes} onChange={e => setAdditionalMinutes(Number(e.target.value))} className="w-full accent-amber-500" />
                <span className="font-mono font-bold text-amber-800 bg-amber-50 px-2.5 py-1 rounded border border-amber-200 text-sm shrink-0">+{additionalMinutes} min</span>
              </div>
            </div>
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Cause (logged):</label>
              <input type="text" value={reason} onChange={e => setReason(e.target.value)} className="w-full p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-slate-800 focus:border-amber-500 focus:bg-white outline-none transition" />
            </div>
            <button onClick={handleSimulate} disabled={isOptimizing || !target} className="w-full py-2.5 rounded-xl font-bold text-white bg-amber-600 hover:bg-amber-700 shadow-lg shadow-amber-600/20 transition flex items-center justify-center gap-2 disabled:opacity-50">
              {isOptimizing ? <><RefreshCw className="w-4 h-4 animate-spin" /> Re-optimising…</> : <><Zap className="w-4 h-4" /> Inject overrun & re-plan</>}
            </button>
          </div>
        ) : (
          <div className="space-y-3 text-xs">
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 flex gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{lastReplan?.message}</span>
            </div>
            <table className="w-full">
              <thead className="text-[10px] font-mono uppercase text-slate-500"><tr><th className="text-left py-1">Block / train</th><th className="text-left py-1">Change</th><th className="text-left py-1">Before → after</th></tr></thead>
              <tbody>
                {(lastReplan?.shifts_applied || []).map((s, i) => (
                  <tr key={i} className="border-t border-slate-100">
                    <td className="py-1.5 font-mono font-bold pr-2">{s.block_id.replace('BLK-', '')}</td>
                    <td className={`py-1.5 pr-2 ${s.action === 'DEFERRED' ? 'text-rose-700' : s.action === 'DURATION_EXTENDED' ? 'text-amber-700' : s.action === 'TRAIN' ? 'text-slate-600' : 'text-blue-700'}`}>{s.change}</td>
                    <td className="py-1.5 font-mono text-slate-600 flex items-center gap-1">{s.old_slot} <ArrowRight className="w-3 h-3" /> {s.new_slot}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {result && (
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2 rounded-lg bg-slate-50 border border-slate-200"><div className="text-[10px] text-slate-500 font-mono">SAFETY CHECKS</div><div className="font-bold font-mono">{result.validation.filter(v => v.pass).length}/{result.validation.length}</div></div>
                <div className="p-2 rounded-lg bg-slate-50 border border-slate-200"><div className="text-[10px] text-slate-500 font-mono">TRAINS REGULATED</div><div className="font-bold font-mono">{result.after_metrics.affected_trains_count}</div></div>
                <div className="p-2 rounded-lg bg-slate-50 border border-slate-200"><div className="text-[10px] text-slate-500 font-mono">RE-PLAN TIME</div><div className="font-bold font-mono">{result.solver.ms.toFixed(1)} ms</div></div>
              </div>
            )}
            {result && result.validation.some(v => !v.pass) && (
              <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900">
                Flagged for controller: {result.validation.filter(v => !v.pass).map(v => `${v.label} — ${v.detail}`).join(' · ')}
              </div>
            )}
            <button onClick={() => { setDisruptionModalOpen(false); setActiveTab('planner'); }} className="w-full py-2 rounded-lg font-bold text-white bg-blue-600 hover:bg-blue-700">View updated plan</button>
          </div>
        )}
      </div>
    </div>
  );
};
