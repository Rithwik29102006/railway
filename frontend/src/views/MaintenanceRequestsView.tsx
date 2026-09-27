import React, { useState } from 'react';
import { useRailOpt } from '../context/RailOptContext';
import { MaintenanceRequest, Department, RequestPriority } from '../types';
import { Wrench, Plus, Search, Filter, ShieldAlert, CheckCircle, Clock, Zap } from 'lucide-react';

export const MaintenanceRequestsView: React.FC = () => {
  const { requests, setNewRequestModalOpen, result } = useRailOpt();
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedDept, setSelectedDept] = useState<string>('ALL');
  const [selectedPriority, setSelectedPriority] = useState<string>('ALL');

  const filteredRequests = requests.filter(r => {
    const matchesSearch = r.asset_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          r.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          r.section_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDept = selectedDept === 'ALL' || r.department === selectedDept;
    const matchesPriority = selectedPriority === 'ALL' || r.priority === selectedPriority;
    return matchesSearch && matchesDept && matchesPriority;
  });

  return (
    <div className="space-y-4">
      {/* Header & New Request Button */}
      <div className="control-card rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Wrench className="w-5 h-5 text-blue-600" />
            Corridor Maintenance Block Requests
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 font-semibold">
              {requests.length} Departmental Requests Ingested
            </span>
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            Multi-discipline block requisition pipeline across Engineering (Track), S&T, and TRD/OHE
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Search box */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Search request..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-8 pr-3 py-1.5 bg-white rounded-lg border border-slate-300 text-xs text-slate-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 w-40 shadow-sm font-medium"
            />
          </div>

          <select
            value={selectedDept}
            onChange={e => setSelectedDept(e.target.value)}
            className="py-1.5 px-2.5 bg-white rounded-lg border border-slate-300 text-xs text-slate-700 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 shadow-sm font-medium"
          >
            <option value="ALL">All Departments</option>
            <option value="Engineering">Engineering (Track)</option>
            <option value="S&T">S&T (Signals)</option>
            <option value="TRD/OHE">TRD/OHE (Traction)</option>
          </select>

          <select
            value={selectedPriority}
            onChange={e => setSelectedPriority(e.target.value)}
            className="py-1.5 px-2.5 bg-white rounded-lg border border-slate-300 text-xs text-slate-700 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 shadow-sm font-medium"
          >
            <option value="ALL">All Priorities</option>
            <option value="EMERGENCY">EMERGENCY</option>
            <option value="HIGH">HIGH</option>
            <option value="MEDIUM">MEDIUM</option>
          </select>

          <button
            onClick={() => setNewRequestModalOpen(true)}
            className="py-1.5 px-3 rounded-lg text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 transition flex items-center gap-1.5 shadow-md shadow-blue-500/20"
          >
            <Plus className="w-3.5 h-3.5" />
            New Requisition
          </button>
        </div>
      </div>

      {/* Requests Table */}
      <div className="control-card rounded-xl overflow-hidden border border-slate-200 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100/90 border-b border-slate-200 text-slate-700 font-mono text-[11px] uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3 px-4">Req ID</th>
                <th className="py-3 px-4">Asset & Activity</th>
                <th className="py-3 px-4">Section</th>
                <th className="py-3 px-4">Dept</th>
                <th className="py-3 px-4 text-center">Priority</th>
                <th className="py-3 px-4 text-center">Duration</th>
                <th className="py-3 px-4">Preferred Window</th>
                <th className="py-3 px-4">Crew</th>
                <th className="py-3 px-4 text-center">AI Optimization Slot</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRequests.map(req => {
                const optBlock = result?.scheduled_blocks.find(b => b.request_id === req.id);
                const isEmergency = req.priority === 'EMERGENCY';

                return (
                  <tr key={req.id} className="hover:bg-blue-50/40 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-blue-700">
                      {req.id}
                    </td>

                    <td className="py-3 px-4 font-bold text-slate-900 max-w-[200px]">
                      <div className="truncate">{req.asset_name}</div>
                      <div className="text-[10px] text-slate-500 font-normal truncate">{req.description}</div>
                    </td>

                    <td className="py-3 px-4 text-slate-700 font-medium">
                      {req.section_name}
                    </td>

                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-100 text-slate-700 border border-slate-200 font-medium">
                        {req.department}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                        isEmergency
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : req.priority === 'HIGH'
                          ? 'bg-purple-50 text-purple-700 border border-purple-200'
                          : 'bg-slate-100 text-slate-700 border border-slate-200'
                      }`}>
                        {req.priority}
                      </span>
                    </td>

                    <td className="py-3 px-4 font-mono text-center text-slate-800 font-semibold">
                      {req.duration_minutes} min
                    </td>

                    <td className="py-3 px-4 font-mono text-slate-600 font-medium">
                      {req.preferred_window}
                    </td>

                    <td className="py-3 px-4 text-slate-700 text-[11px] font-medium">
                      {req.assigned_crew}
                    </td>

                    <td className="py-3 px-4 text-center">
                      {optBlock ? (
                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                          ✓ {optBlock.start_time} – {optBlock.end_time}
                        </span>
                      ) : (
                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-mono bg-amber-50 text-amber-800 border border-amber-200 font-medium">
                          Queued for Slotting
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
