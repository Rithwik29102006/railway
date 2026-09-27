import React, { useState } from 'react';
import { useRailOpt } from '../context/RailOptContext';
import { Train, TrainType, TrainStatus } from '../types';
import { TrainTrack, Search, Filter, AlertCircle, CheckCircle, Clock, Shield } from 'lucide-react';

export const TrainScheduleView: React.FC = () => {
  const { trains, result } = useRailOpt();
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');

  const filteredTrains = trains.filter(t => {
    const matchesSearch = t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          t.train_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          t.origin.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          t.destination.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = selectedType === 'ALL' || t.type === selectedType;
    const matchesStatus = selectedStatus === 'ALL' || t.status === selectedStatus;
    return matchesSearch && matchesType && matchesStatus;
  });

  return (
    <div className="space-y-4">
      {/* Header & Filter Controls */}
      <div className="control-card rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <TrainTrack className="w-5 h-5 text-blue-600" />
            Corridor Train Timetable & Operational Slotting
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            Real-time tracking of 20 passenger & freight services over the New Delhi–Varanasi corridor
          </p>
        </div>

        {/* Filter bar */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Search box */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Search train or route..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-8 pr-3 py-1.5 bg-white rounded-lg border border-slate-300 text-xs text-slate-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 w-48 shadow-sm"
            />
          </div>

          {/* Type Filter */}
          <select
            value={selectedType}
            onChange={e => setSelectedType(e.target.value)}
            className="py-1.5 px-2.5 bg-white rounded-lg border border-slate-300 text-xs text-slate-700 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 shadow-sm font-medium"
          >
            <option value="ALL">All Train Types</option>
            <option value="Vande Bharat">Vande Bharat</option>
            <option value="Rajdhani Express">Rajdhani Express</option>
            <option value="Shatabdi Express">Shatabdi Express</option>
            <option value="Superfast Mail/Exp">Superfast</option>
            <option value="Passenger Local">Passenger Local</option>
            <option value="Freight / Container">Freight / DFCCIL</option>
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={e => setSelectedStatus(e.target.value)}
            className="py-1.5 px-2.5 bg-white rounded-lg border border-slate-300 text-xs text-slate-700 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 shadow-sm font-medium"
          >
            <option value="ALL">All Statuses</option>
            <option value="ON_TIME">On Time</option>
            <option value="REGULATED">Regulated</option>
            <option value="DELAYED">Delayed</option>
          </select>
        </div>
      </div>

      {/* Timetable Table */}
      <div className="control-card rounded-xl overflow-hidden border border-slate-200 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100/90 border-b border-slate-200 text-slate-700 font-mono text-[11px] uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3 px-4">Train ID / No.</th>
                <th className="py-3 px-4">Train Name</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Origin → Dest</th>
                <th className="py-3 px-4">Schedule (Dep/Arr)</th>
                <th className="py-3 px-4 text-center">Priority</th>
                <th className="py-3 px-4 text-center">Operational Status</th>
                <th className="py-3 px-4 text-center">Block Impact</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTrains.map((train) => {
                const impact = result?.affected_trains.find(a => a.train_id === train.train_number);
                const isAffected = !!impact;
                const isVande = train.type === 'Vande Bharat';
                const isRajdhani = train.type === 'Rajdhani Express';

                return (
                  <tr key={train.id} className="hover:bg-blue-50/40 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-blue-700">
                      {train.train_number}
                    </td>

                    <td className="py-3 px-4 font-bold text-slate-900">
                      <div className="flex items-center gap-1.5">
                        {train.name}
                        {isVande && (
                          <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-blue-100 text-blue-800 border border-blue-200 font-bold">
                            VB-SEMI-HS
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-3 px-4 text-slate-700 font-medium">
                      {train.type}
                    </td>

                    <td className="py-3 px-4 text-slate-700">
                      <div className="text-[11px] font-semibold text-slate-900">{train.origin}</div>
                      <div className="text-[10px] text-slate-500 font-mono font-medium">→ {train.destination}</div>
                    </td>

                    <td className="py-3 px-4 font-mono text-slate-800 font-medium">
                      {train.departure_time} – {train.arrival_time}
                    </td>

                    <td className="py-3 px-4 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                        train.priority === 1
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : train.priority === 2
                          ? 'bg-purple-50 text-purple-700 border border-purple-200'
                          : 'bg-slate-100 text-slate-700 border border-slate-200'
                      }`}>
                        P{train.priority} ({train.priority === 1 ? 'Critical' : train.priority === 2 ? 'High' : 'Standard'})
                      </span>
                    </td>

                    <td className="py-3 px-4 text-center">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                        !isAffected
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : 'bg-amber-50 text-amber-800 border border-amber-200'
                      }`}>
                        {!isAffected ? <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> : <Clock className="w-3.5 h-3.5 text-amber-600" />}
                        {!isAffected ? 'ON TIME' : `REGULATED (+${impact!.delay_minutes}m)`}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-center">
                      {isAffected ? (
                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-mono bg-amber-50 text-amber-800 border border-amber-200 font-semibold max-w-[220px] truncate" title={impact!.reason}>
                          {impact!.reason}
                        </span>
                      ) : (
                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-mono text-emerald-700 bg-emerald-50 border border-emerald-200 font-semibold">
                          ✓ Protected Path
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
