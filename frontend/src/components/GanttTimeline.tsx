import React, { useState } from 'react';
import { useRailOpt } from '../context/RailOptContext';
import type { ScheduledBlock } from '../types';
import { Clock, Sparkles } from 'lucide-react';

const T0 = 0;          // 00:00
const T1 = 420;        // 07:00
const SPAN = T1 - T0;
const HOURS = [0, 1, 2, 3, 4, 5, 6, 7];
const pct = (m: number) => `${(Math.max(0, Math.min(SPAN, m - T0)) / SPAN) * 100}%`;
const w = (a: number, b: number) => `${((Math.max(T0, Math.min(T1, b)) - Math.max(T0, Math.min(T1, a))) / SPAN) * 100}%`;
const hh = (m: number) => `${String(Math.floor(((m % 1440) + 1440) % 1440 / 60)).padStart(2, '0')}:${String(((m % 60) + 60) % 60).padStart(2, '0')}`;

const trainStyle: Record<string, string> = {
  CLEAR: 'bg-emerald-100 border-emerald-400 text-emerald-900',
  SLW: 'bg-amber-100 border-amber-500 text-amber-900',
  HELD: 'bg-rose-100 border-rose-500 text-rose-900',
  P1_VIOLATION: 'bg-rose-600 border-rose-800 text-white',
};

/** Time–space chart: each section has an UP and a DN line; blocks, sanctioned windows and every real train path are drawn from the plan. */
export const GanttTimeline: React.FC = () => {
  const { sections, result, selectedBlockId, setSelectedBlockId } = useRailOpt();
  const [hovered, setHovered] = useState<ScheduledBlock | null>(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });

  return (
    <div className="control-card rounded-xl p-4 relative flex flex-col">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2 mb-3">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 rounded-lg bg-blue-50 border border-blue-200"><Clock className="w-4 h-4 text-blue-600" /></div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Corridor Block Plan — Time-Space Chart (00:00–07:00)</h3>
            <p className="text-[11px] text-slate-500 font-medium">Two lines per section · shaded = sanctioned block window · train paths from the working timetable</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10.5px] font-mono bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 shrink-0">
          <span className="flex items-center gap-1"><span className="w-3 h-2.5 rounded-sm bg-blue-600" />Block</span>
          <span className="flex items-center gap-1"><span className="w-3 h-2.5 rounded-sm bg-rose-600" />Emergency</span>
          <span className="flex items-center gap-1"><span className="w-3 h-2.5 rounded-sm border-2 border-dashed border-purple-500" />Integrated</span>
          <span className="flex items-center gap-1"><span className="w-3 h-2.5 rounded-sm bg-emerald-100 border border-emerald-400" />Train clear</span>
          <span className="flex items-center gap-1"><span className="w-3 h-2.5 rounded-sm bg-amber-100 border border-amber-500" />Train via SLW</span>
          <span className="flex items-center gap-1"><span className="w-3 h-2.5 rounded-sm bg-slate-200" />Window</span>
        </div>
      </div>

      <div className="overflow-x-auto border border-slate-200 rounded-xl bg-slate-50/80 p-3 shadow-inner">
        <div className="min-w-[860px]">
          <div className="flex border-b border-slate-200 pb-2 mb-1 text-xs font-mono text-slate-500 font-semibold">
            <div className="w-[200px] shrink-0 text-slate-700 font-bold pl-2">SECTION / LINE</div>
            <div className="flex-1 relative h-4">
              {HOURS.map(h => (
                <span key={h} className={`absolute text-[11px] text-blue-700 font-bold ${h === 0 ? '' : h === 7 ? '-translate-x-full' : '-translate-x-1/2'}`} style={{ left: pct(h * 60) }}>
                  {String(h).padStart(2, '0')}:00
                </span>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            {sections.map(sec => (
              <div key={sec.id} className="flex items-stretch rounded-lg hover:bg-slate-100/70 py-1">
                <div className="w-[200px] shrink-0 pl-2 pr-2 flex flex-col justify-center">
                  <div className="text-xs font-bold text-slate-800 truncate">{sec.name}</div>
                  <div className="text-[10px] text-slate-500 font-mono">{sec.id} · {sec.length_km} km</div>
                </div>
                <div className="flex-1 space-y-1">
                  {(['UP', 'DN'] as const).map(line => {
                    const blocks = (result?.scheduled_blocks || []).filter(b => b.section_id === sec.id && (b.line || 'DN') === line);
                    const paths = (result?.train_paths || []).filter(p => p.section_id === sec.id && p.line === line && p.exit > T0 && p.entry < T1);
                    const ibs = (result?.integrated_blocks || []).filter(ib => ib.section_id === sec.id && ib.line === line);
                    return (
                      <div key={line} className={`relative ${blocks.length > 1 && blocks.some(x => blocks.some(y => x !== y && x.start_minute < y.end_minute && y.start_minute < x.end_minute)) ? 'h-10' : 'h-7'} bg-white rounded border border-slate-200 overflow-hidden`}>
                        <span className="absolute left-1 top-1/2 -translate-y-1/2 text-[9px] font-mono font-bold text-slate-400 z-30">{line}</span>
                        {HOURS.map(h => <div key={h} className="absolute top-0 bottom-0 border-r border-slate-100" style={{ left: pct(h * 60) }} />)}
                        {(result?.windows[sec.id] || []).filter(win => win.start < T1).map((win, i) => (
                          <div key={i} className="absolute top-0 bottom-0 bg-slate-200/70" style={{ left: pct(win.start), width: w(win.start, win.end) }} />
                        ))}
                        {paths.map((p, i) => (
                          <div
                            key={i}
                            title={`${p.train_number} ${p.name} ${hh(p.entry)}–${hh(p.exit)}${p.impact === 'SLW' ? ` · Single-Line Working +${p.delay} min` : p.impact === 'HELD' ? ` · held ${p.delay} min` : ''}`}
                            className={`absolute top-0.5 h-2.5 rounded-sm border text-[8px] leading-[8px] font-mono px-0.5 truncate z-10 ${p.priority <= 1 ? 'bg-violet-100 border-violet-500 text-violet-900' : trainStyle[p.impact]}`}
                            style={{ left: pct(p.entry), width: w(p.entry, p.exit) }}
                          >
                            {p.train_number.replace('IR-', '')}
                          </div>
                        ))}
                        {ibs.map(ib => (
                          <div key={ib.id} className="absolute top-[11px] bottom-[1px] border-2 border-dashed border-purple-500 rounded z-20 pointer-events-none" style={{ left: pct(ib.start), width: w(ib.start, ib.end) }} />
                        ))}
                        {blocks.map((b, i) => {
                          const offscreen = b.start_minute >= T1;
                          const sel = selectedBlockId === b.block_id;
                          const stack = blocks.filter(o => o.start_minute < b.end_minute && b.start_minute < o.end_minute).length > 1;
                          const idxInStack = blocks.filter(o => o.start_minute < b.end_minute && b.start_minute < o.end_minute).indexOf(b);
                          return (
                            <div
                              key={b.block_id}
                              onClick={() => setSelectedBlockId(sel ? null : b.block_id)}
                              onMouseEnter={e => { const r = e.currentTarget.getBoundingClientRect(); setHovered(b); setPos({ x: r.left, y: r.bottom }); }}
                              onMouseLeave={() => setHovered(null)}
                              className={`absolute rounded-sm cursor-pointer flex items-center px-1.5 z-20 text-white shadow-sm transition ${b.priority === 'EMERGENCY' ? 'bg-rose-600' : 'bg-blue-600'} ${sel ? 'ring-2 ring-offset-1 ring-amber-400' : ''} ${b.locked ? 'bg-[repeating-linear-gradient(45deg,#d97706,#d97706_6px,#b45309_6px,#b45309_12px)]' : ''}`}
                              style={offscreen
                                ? { right: 0, width: '9%', top: 13, height: 12 }
                                : { left: pct(b.start_minute), width: w(b.start_minute, b.end_minute), top: stack ? 13 + idxInStack * 12 : 13, height: stack ? 11 : 12 }}
                            >
                              <span className="text-[9px] font-bold font-mono truncate">
                                {offscreen ? `→ ${b.start_time}` : `${b.request_id} ${b.start_time}–${b.end_time}`}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {hovered && (
        <div
          className="fixed z-50 p-3.5 bg-white border border-slate-200 rounded-xl shadow-2xl max-w-sm text-xs pointer-events-none"
          style={{ left: `${Math.min(window.innerWidth - 360, pos.x)}px`, top: `${Math.min(window.innerHeight - 220, pos.y + 8)}px` }}
        >
          <div className="flex items-center justify-between border-b border-slate-100 pb-1.5 mb-2 gap-2">
            <span className="font-bold text-slate-900 flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5 text-blue-600" />{hovered.request_id} · {hovered.asset_name}</span>
            <span className={`text-[10px] font-mono px-1.5 rounded font-bold border ${hovered.priority === 'EMERGENCY' ? 'bg-rose-100 text-rose-800 border-rose-200' : 'bg-blue-100 text-blue-800 border-blue-200'}`}>{hovered.priority}</span>
          </div>
          <div className="space-y-1 text-slate-700">
            <div><strong>Section:</strong> {hovered.section_name} · {hovered.line} line</div>
            <div><strong>Block:</strong> <span className="font-mono font-semibold text-slate-900">{hovered.start_time}–{hovered.end_time}</span> ({hovered.duration_minutes} min){hovered.power_block ? ' · power block' : ''}</div>
            <div><strong>Dept / gang:</strong> {hovered.department} · {hovered.assigned_crew}</div>
            <ul className="text-[11px] text-blue-800 pt-1 border-t border-slate-100 mt-1 space-y-0.5">
              {hovered.reason_for_window.split(' • ').map((r, i) => <li key={i}>• {r}</li>)}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};
