import React, { useState } from 'react';
import { useRailOpt } from '../context/RailOptContext';
import { Asset, AssetType, AssetStatus } from '../types';
import { 
  Activity, Search, Filter, AlertTriangle, ShieldCheck, 
  Wrench, Gauge, Zap, TrendingDown, Eye, CheckCircle2 
} from 'lucide-react';

export const TrackAssetsView: React.FC = () => {
  const { assets, selectedAsset, setSelectedAsset } = useRailOpt();
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');

  const filteredAssets = assets.filter(a => {
    const matchesSearch = a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          a.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          a.section_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = selectedType === 'ALL' || a.type === selectedType;
    const matchesStatus = selectedStatus === 'ALL' || a.status === selectedStatus;
    return matchesSearch && matchesType && matchesStatus;
  });

  const getHealthColor = (score: number) => {
    if (score >= 75) return 'text-emerald-700 bg-emerald-50 border-emerald-200';
    if (score >= 60) return 'text-amber-700 bg-amber-50 border-amber-200';
    return 'text-rose-700 bg-rose-50 border-rose-200';
  };

  const getHealthBarColor = (score: number) => {
    if (score >= 75) return 'bg-emerald-500';
    if (score >= 60) return 'bg-amber-500';
    return 'bg-rose-500';
  };

  return (
    <div className="space-y-4">
      {/* Header & Filters */}
      <div className="control-card rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-600" />
            Track & Asset Infrastructure Registry
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 font-semibold">
              {assets.length} Monitored Assets
            </span>
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            AI-assisted health tracking, ultrasonic flaw evaluation, and predictive degradation analytics
          </p>
        </div>

        {/* Filter controls */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Search asset, section..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-8 pr-3 py-1.5 bg-white rounded-lg border border-slate-300 text-xs text-slate-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 w-44 shadow-sm font-medium"
            />
          </div>

          <select
            value={selectedType}
            onChange={e => setSelectedType(e.target.value)}
            className="py-1.5 px-2.5 bg-white rounded-lg border border-slate-300 text-xs text-slate-700 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 shadow-sm font-medium"
          >
            <option value="ALL">All Asset Types</option>
            <option value="TRACK">Track (CWR/Ballast)</option>
            <option value="SIGNAL">Signal (Relays/EI/DAC)</option>
            <option value="OHE">OHE (25kV Catenary/ATD)</option>
            <option value="POINT & CROSSING">Point & Crossing</option>
            <option value="BRIDGE">Bridge Girder</option>
          </select>

          <select
            value={selectedStatus}
            onChange={e => setSelectedStatus(e.target.value)}
            className="py-1.5 px-2.5 bg-white rounded-lg border border-slate-300 text-xs text-slate-700 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 shadow-sm font-medium"
          >
            <option value="ALL">All Health Statuses</option>
            <option value="HEALTHY">Healthy (≥75%)</option>
            <option value="ATTENTION_REQUIRED">Attention Required (60–74%)</option>
            <option value="CRITICAL_ACTION">Critical Action (&lt;60%)</option>
          </select>
        </div>
      </div>

      {/* Main Asset Grid & Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left 2 Cols: Asset Cards */}
        <div className="lg:col-span-2 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {filteredAssets.map(asset => {
              const isSelected = selectedAsset?.id === asset.id;
              return (
                <div
                  key={asset.id}
                  onClick={() => setSelectedAsset(asset)}
                  className={`control-card rounded-xl p-3.5 cursor-pointer transition-all duration-200 hover:border-blue-400 hover:shadow-md hover:translate-y-[-2px] ${
                    isSelected ? 'border-blue-500 control-card-glow ring-2 ring-blue-400/30' : 'border-slate-200'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <span className="text-[10px] font-mono font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                        {asset.id}
                      </span>
                      <h4 className="text-xs font-bold text-slate-900 mt-1 leading-snug truncate max-w-[200px]">
                        {asset.name}
                      </h4>
                      <p className="text-[10px] text-slate-500 truncate font-medium">
                        {asset.section_name}
                      </p>
                    </div>

                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${getHealthColor(asset.health_score)}`}>
                      {asset.health_score}%
                    </span>
                  </div>

                  {/* Health score bar */}
                  <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden my-2">
                    <div
                      className={`h-full rounded-full ${getHealthBarColor(asset.health_score)}`}
                      style={{ width: `${asset.health_score}%` }}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-500 pt-2 border-t border-slate-100 font-mono">
                    <div>
                      <span className="text-slate-400 block font-semibold">TYPE / CRIT:</span>
                      <span className="text-slate-800 font-bold">{asset.type} • {asset.criticality}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-semibold">AI RISK INDEX:</span>
                      <span className={`font-bold ${asset.risk_score >= 75 ? 'text-rose-600' : 'text-amber-600'}`}>
                        {asset.risk_score} / 100
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Col: AI Risk Breakdown Drawer */}
        <div className="space-y-4">
          <div className="control-card rounded-xl p-4 border border-blue-200 shadow-sm">
            <div className="flex items-center space-x-2 border-b border-slate-100 pb-2.5 mb-3">
              <div className="p-1.5 rounded-lg bg-blue-50 border border-blue-200">
                <Gauge className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <h3 className="text-xs font-mono uppercase tracking-wider font-bold text-slate-900">
                  AI Asset Risk & Urgency Model
                </h3>
                <p className="text-[10px] text-slate-500 font-medium">
                  Prototype Risk / Priority Mathematical Scoring
                </p>
              </div>
            </div>

            {selectedAsset ? (
              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-[10px] text-slate-500 font-mono font-semibold block">INSPECTING ASSET:</span>
                  <div className="text-sm font-bold text-blue-700">{selectedAsset.name}</div>
                  <div className="text-[11px] text-slate-600 font-medium">{selectedAsset.section_name} ({selectedAsset.id})</div>
                </div>

                {/* Score badge */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between shadow-sm">
                  <div>
                    <span className="text-[10px] font-mono text-slate-500 font-semibold">COMPOSITE AI RISK SCORE</span>
                    <div className="text-2xl font-extrabold text-rose-600 font-mono">
                      {selectedAsset.risk_score} <span className="text-xs text-slate-400 font-normal">/ 100</span>
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded text-[10px] font-mono font-bold ${
                    selectedAsset.risk_score >= 75 ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                  }`}>
                    {selectedAsset.risk_score >= 75 ? 'IMMEDIATE POSSESSION' : 'ELEVATED MONITORING'}
                  </span>
                </div>

                {/* Mathematical factors */}
                <div className="space-y-1.5 text-[11px] bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                  <div className="font-bold text-slate-800 mb-1">Risk Contribution Factors:</div>
                  <div className="flex justify-between text-slate-600">
                    <span>Health Deterioration Penalty:</span>
                    <span className="font-mono text-slate-900 font-bold">{((100 - selectedAsset.health_score) * 0.35).toFixed(1)} pts</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Network Criticality Weight ({selectedAsset.criticality}):</span>
                    <span className="font-mono text-slate-900 font-bold">20.0 pts</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Gross Million Tonnes ({selectedAsset.tonnage_gmt} GMT):</span>
                    <span className="font-mono text-slate-900 font-bold">{(selectedAsset.tonnage_gmt / 6).toFixed(1)} pts</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Telemetry Failure Rate:</span>
                    <span className="font-mono text-slate-900 font-bold">{selectedAsset.failure_risk === 'HIGH' ? '10.0 pts' : '5.0 pts'}</span>
                  </div>
                </div>

                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-[11px] text-slate-700 space-y-1">
                  <div><strong>Last Field Inspection:</strong> {selectedAsset.last_inspection}</div>
                  <div><strong>Maintenance Duration:</strong> {selectedAsset.estimated_duration_hours} hours</div>
                  <div><strong>Monthly Degradation Rate:</strong> {selectedAsset.degradation_rate_per_month}% / month</div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-slate-500 text-xs">
                Select any asset from the registry to inspect AI risk decomposition and telemetry factors.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
