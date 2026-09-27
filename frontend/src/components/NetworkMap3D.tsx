import React, { useState, useEffect } from 'react';
import { useRailOpt } from '../context/RailOptContext';
import { TrackSection, Asset } from '../types';
import { 
  Train, AlertOctagon, CheckCircle2, ShieldAlert, 
  Wrench, Eye, Activity, Zap, Compass, Info, X 
} from 'lucide-react';

export const NetworkMap3D: React.FC = () => {
  const { sections, assets, result, trains, selectedSection, setSelectedSection } = useRailOpt();
  const [hoveredStation, setHoveredStation] = useState<string | null>(null);
  const [trainPositions, setTrainPositions] = useState<{ [trainId: string]: number }>({
    'TR-101': 15,
    'TR-103': 45,
    'TR-104': 72,
    'TR-109': 30,
    'TR-111': 88,
  });

  // Animated train motion along the line
  useEffect(() => {
    const interval = setInterval(() => {
      setTrainPositions(prev => {
        const next = { ...prev };
        Object.keys(next).forEach(k => {
          next[k] = (next[k] + 0.35) % 100;
        });
        return next;
      });
    }, 100);
    return () => clearInterval(interval);
  }, []);

  const stations = [
    { id: 'NDLS', name: 'New Delhi', x: 6, y: 50, tag: 'Origin Junction' },
    { id: 'GZB', name: 'Ghaziabad', x: 18, y: 35, tag: 'Interchange' },
    { id: 'MTC', name: 'Meerut City', x: 28, y: 20, tag: 'Spur Division' },
    { id: 'ALJN', name: 'Aligarh Jn', x: 40, y: 48, tag: 'Major Junction' },
    { id: 'TDL', name: 'Tundla Jn', x: 52, y: 55, tag: 'Crew Hub' },
    { id: 'CNB', name: 'Kanpur Central', x: 65, y: 42, tag: 'High Density Hub' },
    { id: 'ETW', name: 'Etawah Jn', x: 76, y: 60, tag: 'Traction Substation' },
    { id: 'PRYJ', name: 'Prayagraj Jn', x: 87, y: 45, tag: 'Zonal Division' },
    { id: 'BSB', name: 'Varanasi Cantt', x: 96, y: 50, tag: 'Terminal' },
  ];

  // Helper to find blocks active on each section
  const getSectionBlocks = (sectionId: string) => {
    return (result?.scheduled_blocks || []).filter(b => b.section_id === sectionId);
  };

  const getSectionAssets = (sectionId: string) => {
    return assets.filter(a => a.section_id === sectionId);
  };

  return (
    <div className="control-card rounded-xl p-4 relative overflow-hidden flex flex-col">
      {/* Header controls */}
      <div className="flex items-center justify-between mb-3 z-10">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 rounded-lg bg-blue-50 border border-blue-200">
            <Compass className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              HDN-1 Corridor Network Map
              <span className="text-[10px] font-mono font-medium text-slate-600 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded">
                1036.7 Route km • New Delhi to Varanasi
              </span>
            </h3>
            <p className="text-[11px] text-slate-500 font-medium">
              Interactive 2.5D Track Possession, Active Train Telemetry & Asset Health Monitor
            </p>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center space-x-3 text-[11px] font-mono bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
          <span className="flex items-center gap-1 text-emerald-700 font-semibold">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            Clear Track
          </span>
          <span className="flex items-center gap-1 text-rose-700 font-semibold">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
            Active Block
          </span>
          <span className="flex items-center gap-1 text-blue-700 font-semibold">
            <Train className="w-3.5 h-3.5 text-blue-600" />
            Active Train
          </span>
          <span className="flex items-center gap-1 text-amber-700 font-semibold">
            <AlertOctagon className="w-3.5 h-3.5 text-amber-600" />
            Asset Attention
          </span>
        </div>
      </div>

      {/* Main Stylized 2.5D Railway Corridor Canvas / SVG */}
      <div className="relative w-full h-64 bg-gradient-to-b from-slate-50/80 via-white to-slate-50/80 rounded-xl border border-slate-200 p-4 flex items-center justify-center overflow-hidden shadow-inner">
        {/* Subtle 3D grid perspective lines */}
        <div 
          className="absolute inset-0 opacity-20 pointer-events-none" 
          style={{
            backgroundImage: `linear-gradient(to right, #94a3b8 1px, transparent 1px), linear-gradient(to bottom, #94a3b8 1px, transparent 1px)`,
            backgroundSize: '40px 40px',
            transform: 'perspective(400px) rotateX(25deg)'
          }}
        />

        <svg className="w-full h-full relative z-10" viewBox="0 0 1000 240" preserveAspectRatio="none">
          <defs>
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2" result="glow" />
              <feComposite in="SourceGraphic" in2="glow" operator="over" />
            </filter>
          </defs>

          {/* Section connection paths */}
          {sections.map((sec, i) => {
            const st1 = stations[i] || stations[0];
            const st2 = stations[i + 1] || stations[stations.length - 1];
            const x1 = st1.x * 10;
            const y1 = st1.y * 2.4;
            const x2 = st2.x * 10;
            const y2 = st2.y * 2.4;
            const isSelected = selectedSection?.id === sec.id;
            const hasBlock = getSectionBlocks(sec.id).length > 0;
            const secAssets = getSectionAssets(sec.id);
            const hasCriticalAsset = secAssets.some(a => a.status === 'CRITICAL_ACTION');

            return (
              <g key={sec.id} className="cursor-pointer" onClick={() => setSelectedSection(sec)}>
                {/* Track Base line */}
                <line
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke="#cbd5e1"
                  strokeWidth="8"
                  strokeLinecap="round"
                />

                {/* Track Sleepers visual hash */}
                <line
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke="#94a3b8"
                  strokeWidth="4"
                  strokeDasharray="4,6"
                  strokeLinecap="round"
                />

                {/* Active status track overlay */}
                <line
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke={hasBlock ? '#e11d48' : (hasCriticalAsset ? '#d97706' : '#2563eb')}
                  strokeWidth={isSelected ? '5' : '3'}
                  strokeDasharray={hasBlock ? '8,4' : 'none'}
                  className={hasBlock ? 'animate-pulse' : ''}
                  opacity={isSelected ? 1.0 : 0.85}
                />

                {/* Section Click Area */}
                <line
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke="transparent"
                  strokeWidth="20"
                />

                {/* Block tag badge floating on section */}
                {hasBlock && (
                  <g transform={`translate(${(x1 + x2) / 2}, ${(y1 + y2) / 2 - 14})`}>
                    <rect
                      x="-38"
                      y="-10"
                      width="76"
                      height="20"
                      rx="4"
                      fill="#fee2e2"
                      stroke="#e11d48"
                      strokeWidth="1.2"
                    />
                    <text
                      x="0"
                      y="4"
                      textAnchor="middle"
                      fill="#991b1b"
                      fontSize="9"
                      fontWeight="bold"
                      fontFamily="monospace"
                    >
                      POSSESSION
                    </text>
                  </g>
                )}
              </g>
            );
          })}

          {/* Animated moving train pulses */}
          {Object.entries(trainPositions).map(([trainId, posPct]) => {
            const totalStations = stations.length;
            const segmentIdx = Math.min(
              totalStations - 2,
              Math.floor((posPct / 100) * (totalStations - 1))
            );
            const localPct = ((posPct / 100) * (totalStations - 1)) - segmentIdx;
            const st1 = stations[segmentIdx];
            const st2 = stations[segmentIdx + 1] || st1;
            const px = (st1.x + (st2.x - st1.x) * localPct) * 10;
            const py = (st1.y + (st2.y - st1.y) * localPct) * 2.4;

            const trainObj = trains.find(t => t.id === trainId);
            const isVandeBharat = trainObj?.type === 'Vande Bharat';

            return (
              <g key={trainId} transform={`translate(${px}, ${py})`}>
                <circle
                  r="7"
                  fill={isVandeBharat ? '#0284c7' : '#059669'}
                />
                <circle
                  r="12"
                  fill="none"
                  stroke={isVandeBharat ? '#0284c7' : '#059669'}
                  strokeWidth="1.5"
                  opacity="0.5"
                  className="animate-ping"
                />
                {/* Train tooltip tag */}
                <g transform="translate(0, -14)">
                  <rect
                    x="-25"
                    y="-9"
                    width="50"
                    height="16"
                    rx="3"
                    fill="#1e293b"
                    stroke={isVandeBharat ? '#38bdf8' : '#34d399'}
                    strokeWidth="0.8"
                  />
                  <text
                    x="0"
                    y="3"
                    textAnchor="middle"
                    fill="#ffffff"
                    fontSize="8"
                    fontFamily="monospace"
                    fontWeight="bold"
                  >
                    {trainObj?.train_number.replace('IR-', '') || trainId}
                  </text>
                </g>
              </g>
            );
          })}

          {/* Station Nodes */}
          {stations.map((st) => {
            const isHovered = hoveredStation === st.id;
            const cx = st.x * 10;
            const cy = st.y * 2.4;

            return (
              <g
                key={st.id}
                transform={`translate(${cx}, ${cy})`}
                className="cursor-pointer"
                onMouseEnter={() => setHoveredStation(st.id)}
                onMouseLeave={() => setHoveredStation(null)}
              >
                {/* Outer ring */}
                <circle
                  r={isHovered ? "10" : "7"}
                  fill="#ffffff"
                  stroke="#2563eb"
                  strokeWidth="2.5"
                />
                {/* Center dot */}
                <circle
                  r="3"
                  fill="#2563eb"
                />

                {/* Station Label */}
                <text
                  x="0"
                  y="22"
                  textAnchor="middle"
                  fill="#0f172a"
                  fontSize="11"
                  fontWeight="700"
                  fontFamily="sans-serif"
                >
                  {st.name}
                </text>

                <text
                  x="0"
                  y="33"
                  textAnchor="middle"
                  fill="#64748b"
                  fontSize="8"
                  fontWeight="600"
                  fontFamily="monospace"
                >
                  {st.id}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Floating guidance banner */}
        <div className="absolute bottom-2 left-3 text-[10px] text-slate-600 font-mono flex items-center gap-1 bg-white/90 px-2 py-1 rounded border border-slate-200 shadow-sm">
          <Info className="w-3 h-3 text-blue-600" />
          Click any section to inspect real-time track condition, active possession, and asset telemetry.
        </div>
      </div>

      {/* Selected Section Inspection Drawer */}
      {selectedSection && (
        <div className="mt-3 p-3.5 bg-slate-50 rounded-xl border border-blue-200 animate-fadeIn shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-2.5">
            <div className="flex items-center space-x-2">
              <Activity className="w-4 h-4 text-blue-600" />
              <span className="font-bold text-slate-900 text-sm">
                Section Inspection: {selectedSection.name} ({selectedSection.id})
              </span>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 font-semibold">
                Health: {selectedSection.current_health_score}%
              </span>
            </div>
            <button
              onClick={() => setSelectedSection(null)}
              className="p-1 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-200 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-sm">
              <span className="text-slate-500 font-mono text-[10px] font-semibold block mb-1">SECTION SPECIFICATION</span>
              <div className="text-slate-800"><strong>Length:</strong> {selectedSection.length_km} km</div>
              <div className="text-slate-800"><strong>Max Permissible Speed:</strong> {selectedSection.max_speed_kmph} km/h</div>
              <div className="text-slate-800"><strong>Traction:</strong> 25kV AC Electrified Double Track</div>
              <div className="text-slate-800"><strong>Allowed Maintenance Window:</strong> 01:00 – 04:30</div>
            </div>

            <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-sm">
              <span className="text-slate-500 font-mono text-[10px] font-semibold block mb-1">CRITICAL ASSETS ON SECTION</span>
              <div className="space-y-1">
                {getSectionAssets(selectedSection.id).slice(0, 3).map(asset => (
                  <div key={asset.id} className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-700 font-medium truncate max-w-[150px]">{asset.name}</span>
                    <span className={`px-1.5 py-0.2 rounded font-mono text-[10px] font-semibold ${
                      asset.health_score > 75 ? 'text-emerald-700 bg-emerald-50 border border-emerald-200' : 'text-amber-700 bg-amber-50 border border-amber-200'
                    }`}>
                      {asset.health_score}%
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-sm">
              <span className="text-slate-500 font-mono text-[10px] font-semibold block mb-1">OPTIMIZED POSSESSION STATUS</span>
              {getSectionBlocks(selectedSection.id).length > 0 ? (
                getSectionBlocks(selectedSection.id).map(blk => (
                  <div key={blk.block_id} className="text-[11px] text-slate-800">
                    <div className="text-blue-700 font-bold">{blk.asset_name}</div>
                    <div className="text-slate-600">Time: <span className="text-slate-900 font-mono font-semibold">{blk.start_time} – {blk.end_time}</span> ({blk.duration_minutes}m)</div>
                    <div className="text-emerald-700 font-mono text-[10px] font-semibold mt-0.5">✓ 0 Passenger Train Conflicts</div>
                  </div>
                ))
              ) : (
                <div className="text-slate-500 italic">No possession scheduled during this cycle. Section operating normally.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
