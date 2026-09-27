import React, { useState } from 'react';
import { useRailOpt } from '../context/RailOptContext';
import { MaintenanceRequest, Department, RequestPriority } from '../types';
import { X, PlusCircle, Wrench, Check } from 'lucide-react';

export const NewRequestModal: React.FC = () => {
  const { newRequestModalOpen, setNewRequestModalOpen, sections, assets, addMaintenanceRequest } = useRailOpt();

  const [sectionId, setSectionId] = useState<string>('SEC-03');
  const [assetName, setAssetName] = useState<string>('Ultrasonic Rail Flaw Detection (USFD)');
  const [department, setDepartment] = useState<Department>('Engineering');
  const [priority, setPriority] = useState<RequestPriority>('HIGH');
  const [duration, setDuration] = useState<number>(150);
  const [preferredWindow, setPreferredWindow] = useState<string>('02:00 – 04:30');
  const [assignedCrew, setAssignedCrew] = useState<string>('CREW-ENG-A');
  const [line, setLine] = useState<'UP' | 'DN'>('DN');
  const [description, setDescription] = useState<string>('Special ultrasonic rail scan requested by Chief Track Engineer.');

  if (!newRequestModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetSection = sections.find(s => s.id === sectionId);
    const newReq: MaintenanceRequest = {
      id: `MR-${Math.floor(2000 + Math.random() * 7000)}`,
      asset_id: `AST-CUSTOM-${Date.now().toString().slice(-4)}`,
      asset_name: assetName,
      section_id: sectionId,
      section_name: targetSection?.name || 'Meerut – Aligarh',
      department,
      priority,
      duration_minutes: duration,
      preferred_window: preferredWindow,
      preferred_start_minute: (() => { const m = preferredWindow.match(/(\d{1,2}):(\d{2})/); return m ? +m[1] * 60 + +m[2] : 120; })(),
      line,
      deadline_date: '2026-09-10',
      assigned_crew: assignedCrew,
      status: 'PENDING',
      description,
      safety_buffer_minutes: 15,
      track_possession_required: true,
      power_block_required: department === 'TRD/OHE',
      traffic_block_required: true
    };

    await addMaintenanceRequest(newReq);
    setNewRequestModalOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl max-w-lg w-full border border-blue-200 shadow-2xl p-6 relative">
        <button
          onClick={() => setNewRequestModalOpen(false)}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-3 mb-4">
          <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-200">
            <PlusCircle className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Create Maintenance Block Request</h2>
            <p className="text-xs text-slate-500">
              Submit track possession requirement to AI optimization queue
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          <div>
            <label className="block text-slate-700 font-semibold mb-1">Asset & Maintenance Activity</label>
            <input
              type="text"
              required
              value={assetName}
              onChange={e => setAssetName(e.target.value)}
              className="w-full p-2 bg-slate-50 rounded-lg border border-slate-200 text-slate-800 outline-none focus:border-blue-500 focus:bg-white transition"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Corridor Section</label>
              <select
                value={sectionId}
                onChange={e => setSectionId(e.target.value)}
                className="w-full p-2 bg-slate-50 rounded-lg border border-slate-200 text-slate-800 outline-none focus:border-blue-500 focus:bg-white transition"
              >
                {sections.map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.id})</option>
                ))}
              </select>
              <div className="flex gap-1 mt-1.5">
                {(['UP', 'DN'] as const).map(l => (
                  <button type="button" key={l} onClick={() => setLine(l)} className={`flex-1 py-1 rounded-md text-[11px] font-mono font-bold border ${line === l ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200'}`}>
                    {l} line
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">Department</label>
              <select
                value={department}
                onChange={e => setDepartment(e.target.value as Department)}
                className="w-full p-2 bg-slate-50 rounded-lg border border-slate-200 text-slate-800 outline-none focus:border-blue-500 focus:bg-white transition"
              >
                <option value="Engineering">Engineering (Track)</option>
                <option value="S&T">S&T (Signals/Interlocking)</option>
                <option value="TRD/OHE">TRD/OHE (Traction 25kV)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Priority Classification</label>
              <select
                value={priority}
                onChange={e => setPriority(e.target.value as RequestPriority)}
                className="w-full p-2 bg-slate-50 rounded-lg border border-slate-200 text-slate-800 outline-none focus:border-blue-500 focus:bg-white font-semibold transition"
              >
                <option value="EMERGENCY">EMERGENCY (Critical Fault)</option>
                <option value="HIGH">HIGH (Standard Urgent)</option>
                <option value="MEDIUM">MEDIUM (Periodic Preventive)</option>
                <option value="LOW">LOW (Routine Inspection)</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">Estimated Duration</label>
              <select
                value={duration}
                onChange={e => setDuration(Number(e.target.value))}
                className="w-full p-2 bg-slate-50 rounded-lg border border-slate-200 text-slate-800 outline-none focus:border-blue-500 focus:bg-white font-mono transition"
              >
                <option value={90}>1.5 Hours (90 min)</option>
                <option value={120}>2.0 Hours (120 min)</option>
                <option value={150}>2.5 Hours (150 min)</option>
                <option value={180}>3.0 Hours (180 min)</option>
                <option value={240}>4.0 Hours (240 min)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">Operational Description / Flaw Details</label>
            <textarea
              rows={2}
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full p-2 bg-slate-50 rounded-lg border border-slate-200 text-slate-800 outline-none focus:border-blue-500 focus:bg-white transition"
            />
          </div>

          <button
            type="submit"
            className="w-full mt-2 py-2.5 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-600/20 transition flex items-center justify-center gap-2"
          >
            <Check className="w-4 h-4" />
            Submit Request & Re-Optimize Schedule
          </button>
        </form>
      </div>
    </div>
  );
};
