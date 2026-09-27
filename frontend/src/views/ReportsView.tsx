import React from 'react';
import { useRailOpt } from '../context/RailOptContext';
import { 
  FileText, Download, Printer, CheckCircle2, ShieldCheck, 
  BookOpen, Layers, Cpu, Award, FileSpreadsheet, ExternalLink 
} from 'lucide-react';

export const ReportsView: React.FC = () => {
  const { result, sections, assets, requests, setArchitectureModalOpen } = useRailOpt();

  const handleDownloadCSV = () => {
    if (!result) return;
    const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const rows = [
      ['Block ID', 'Request', 'Section', 'Line', 'Asset', 'Department', 'Priority', 'Start', 'End', 'Duration (min)', 'Gang', 'Power block', 'Integrated block', 'Trains regulated', 'Justification'],
      ...result.scheduled_blocks.map(b => [b.block_id, b.request_id, b.section_name, b.line, b.asset_name, b.department, b.priority, b.start_time, b.end_time, b.duration_minutes, b.assigned_crew, b.power_block ? 'Yes' : 'No', b.integrated_block_id || '', b.affected_train_ids.join(' '), b.reason_for_window]),
      [],
      ['Deferred request', 'Priority', 'Reason'],
      ...result.deferred_requests.map(d => [d.id, d.priority, d.reason]),
      [],
      ['Metric', 'As requested', 'Optimised'],
      ['Conflicts', result.kpi.before.total_schedule_conflicts, result.kpi.after.total_schedule_conflicts],
      ['Work executable %', result.kpi.before.maintenance_completion_pct, result.kpi.after.maintenance_completion_pct],
      ['Line availability 00-06h %', result.kpi.before.overall_asset_availability_pct, result.kpi.after.overall_asset_availability_pct],
      ['Asset risk addressed %', result.kpi.before.risk_addressed_pct, result.kpi.after.risk_addressed_pct],
      ['Trains regulated', result.kpi.before.affected_trains_count, result.kpi.after.affected_trains_count],
      ['Total train delay (min)', result.kpi.before.total_train_delay_minutes, result.kpi.after.total_train_delay_minutes],
      ['Line possession (min)', result.kpi.before.possession_minutes, result.kpi.after.possession_minutes],
      [],
      ['Safety check', 'Result', 'Detail'],
      ...result.validation.map(v => [v.label, v.pass ? 'PASS' : 'FAIL', v.detail]),
    ];
    const csv = rows.map(r => r.map(esc).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `RAILNEXA_block_plan_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };
  const k = result?.kpi;
  const allPass = result?.validation.every(v => v.pass);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-4">
      {/* Header & Export Actions */}
      <div className="control-card rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            Operational Block Planning Report & Governance Dossier
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            Formal decision-support summary for Chief Train Controller & Divisional Operations
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleDownloadCSV}
            className="py-1.5 px-3 rounded-lg text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 transition flex items-center gap-1.5 shadow-md shadow-blue-500/20"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Export CSV Report
          </button>

          <button
            onClick={handlePrint}
            className="py-1.5 px-3 rounded-lg text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition flex items-center gap-1.5 border border-slate-200 shadow-sm"
          >
            <Printer className="w-4 h-4 text-blue-600" />
            Print Dossier
          </button>
        </div>
      </div>

      {/* Main Report Body */}
      <div className="control-card rounded-xl p-6 border border-slate-200 space-y-6 shadow-sm">
        {/* Executive Summary */}
        <div className="border-b border-slate-100 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <img src="/railnexa-logo.png" alt="RAILNEXA AI" className="h-8 object-contain" />
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-blue-700 font-bold">
                  DIVISIONAL CORRIDOR BLOCK PLAN REPORT
                </span>
                <h3 className="text-base font-extrabold text-slate-900 mt-0.5">
                  New Delhi (NDLS) – Varanasi (BSB) HDN-1 High Density Corridor
                </h3>
              </div>
            </div>
            <span className="text-xs font-mono px-2.5 py-1 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold self-start sm:self-auto">
              {allPass ? `STATUS: ${result?.validation.length}/${result?.validation.length} SAFETY CHECKS PASS` : 'STATUS: NEEDS CONTROLLER REVIEW'}
            </span>
          </div>

          <p className="text-xs text-slate-600 mt-3 leading-relaxed font-medium">
            This plan coordinates maintenance requests from <strong>Engineering (P-Way)</strong>, <strong>Signal & Telecom</strong> and <strong>Traction Distribution (OHE)</strong> against {result?.solver.trains ?? '—'} train paths on the double-line corridor.
            {k && <> It schedules <strong>{result?.scheduled_blocks.length} of {result?.solver.requests} requests</strong>, merges compatible works into <strong>{result?.integrated_blocks.length} integrated block(s)</strong>, and cuts conflicts from <strong>{k.before.total_schedule_conflicts} to {k.after.total_schedule_conflicts}</strong> while keeping every Vande Bharat / Rajdhani path untouched.</>}
          </p>
        </div>

        {k && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 shadow-sm">
              <span className="text-[10px] font-mono text-slate-500 font-semibold">LINE AVAILABILITY 00–06h</span>
              <div className="text-xl font-bold font-mono text-emerald-600">{k.after.overall_asset_availability_pct}%</div>
              <span className="text-[10px] text-slate-500 font-medium">was {k.before.overall_asset_availability_pct}% as requested</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 shadow-sm">
              <span className="text-[10px] font-mono text-slate-500 font-semibold">TRAIN DELAY</span>
              <div className="text-xl font-bold font-mono text-blue-700">{k.after.total_train_delay_minutes} min</div>
              <span className="text-[10px] text-slate-500 font-medium">{k.after.affected_trains_count} trains via SLW · premium trains 0 min</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 shadow-sm">
              <span className="text-[10px] font-mono text-slate-500 font-semibold">CONFLICTS</span>
              <div className="text-xl font-bold font-mono text-emerald-600">{k.before.total_schedule_conflicts} → {k.after.total_schedule_conflicts}</div>
              <span className="text-[10px] text-slate-500 font-medium">crew, section, window & train clashes</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 shadow-sm">
              <span className="text-[10px] font-mono text-slate-500 font-semibold">ASSET RISK ADDRESSED</span>
              <div className="text-xl font-bold font-mono text-emerald-600">{k.after.risk_addressed_pct}%</div>
              <span className="text-[10px] text-slate-500 font-medium">was {k.before.risk_addressed_pct}% · AI risk-weighted</span>
            </div>
          </div>
        )}

        {/* Scheduled Blocks Ledger */}
        <div>
          <h4 className="text-xs font-mono uppercase tracking-wider font-bold text-slate-900 mb-2 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-blue-600" />
            Proposed Block Allocations (for controller approval)
          </h4>

          <div className="overflow-x-auto border border-slate-200 rounded-xl shadow-sm">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100/90 border-b border-slate-200 text-slate-700 font-mono text-[10px] uppercase font-semibold">
                <tr>
                  <th className="py-2.5 px-3">Block ID</th>
                  <th className="py-2.5 px-3">Section · Line</th>
                  <th className="py-2.5 px-3">Asset Description</th>
                  <th className="py-2.5 px-3">Dept</th>
                  <th className="py-2.5 px-3">Allocated Window</th>
                  <th className="py-2.5 px-3">Duration</th>
                  <th className="py-2.5 px-3">Assigned Crew</th>
                  <th className="py-2.5 px-3">Safety Buffer</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(result?.scheduled_blocks || []).map(b => (
                  <tr key={b.block_id} className="hover:bg-blue-50/40">
                    <td className="py-2.5 px-3 font-mono font-bold text-blue-700">{b.block_id}</td>
                    <td className="py-2.5 px-3 text-slate-800">{b.section_name} · {b.line}</td>
                    <td className="py-2.5 px-3 font-bold text-slate-900">{b.asset_name}</td>
                    <td className="py-2.5 px-3 text-slate-600">{b.department}</td>
                    <td className="py-2.5 px-3 font-mono text-emerald-700 font-bold">{b.start_time} – {b.end_time}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-800">{b.duration_minutes}m</td>
                    <td className="py-2.5 px-3 text-slate-600">{b.assigned_crew}</td>
                    <td className="py-2.5 px-3 text-amber-800 font-mono font-semibold">{b.safety_buffer_applied} min</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Real-World Positioning & References */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-100">
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
            <h4 className="text-xs font-mono uppercase tracking-wider font-bold text-blue-700 flex items-center gap-2">
              <Layers className="w-4 h-4" />
              Indian Railways System Integration Architecture
            </h4>
            <p className="text-[11px] text-slate-600 leading-relaxed font-medium">
              RAILNEXA AI is designed to integrate with existing railway digitalization systems including the <strong>Track Management System (CRIS TMS)</strong>, <strong>Control Office Application (COA)</strong>, and <strong>Traction Distribution Management System (TDMS)</strong>, functioning as an automated coordination layer.
            </p>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
            <h4 className="text-xs font-mono uppercase tracking-wider font-bold text-blue-700 flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              Regulatory & Research Framework
            </h4>
            <div className="text-[11px] text-slate-600 space-y-1 font-medium">
              <div>• <strong>General & Subsidiary Rules (G&SR):</strong> traffic blocks, Single-Line Working</div>
              <div>• <strong>IR Permanent Way Manual / AC Traction Manual / Signal Engg Manual:</strong> department block requirements</div>
              <div>• <strong>Literature:</strong> Budai, Huisman & Dekker (2006), “Scheduling preventive railway maintenance activities”, JORS 57</div>
            </div>
          </div>
        </div>

        {/* Safety Disclaimer */}
        <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 font-medium">
          <strong>Mandatory Safety Protocol:</strong> Prototype • Simulated Railway Operations Data. AI-generated block proposals are intended as advisory decision support and require authorized validation by Section Controllers prior to physical block granting.
        </div>
      </div>
    </div>
  );
};
