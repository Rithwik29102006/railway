# RAILNEXA AI — AI-Powered Automatic Block Planning

### Smart India Hackathon 2026 · Problem Statement **SIH26027** (Ministry of Railways)
**AI-Powered Automatic Block Planning to Maximise Asset Availability for Train Operations on Indian Railways**

> [!IMPORTANT]
> RAILNEXA AI is an **advisory decision-support tool** for Divisional block planners and Section Controllers. Every plan must be approved by an authorised officer before a block is granted. All corridor, timetable, asset and crew data in this prototype is **simulated** (New Delhi – Varanasi double-line corridor).

---

## The problem, in one line
Engineering, S&T and TRD each ask for their own block. When uncoordinated, the same line is taken three times, gangs are double-booked, blocks spill outside sanctioned windows and trains get held. That loses both **train paths** and **maintenance time**.

## What RAILNEXA AI does
1. **AI risk priority.** Every asset gets a risk score from health, criticality, GMT loading and failure trend. The score sets how costly it is to defer that job.
2. **Exact block optimisation.** A branch-and-bound search tries every feasible 15-minute slot for every request. It **proves the plan optimal**, typically in about 5 ms.
3. **Integrated multi-department blocks.** Compatible Engg + S&T + TRD works on the same line and time **share one possession**. This is the core idea of the PS: the line is taken once, not three times.
4. **Safety by construction.** No Vande Bharat or Rajdhani path within a block (±15 min buffer). Blocks stay inside sanctioned windows. Gang capacity allows 30 minutes of transit between sections. Shift limits are respected. The adjacent line stays open for **Single-Line Working (SLW)**.
5. **Explainability.** Each block shows *why this slot*: which window, which trains are cleared or diverted, and what would have gone wrong at the slot the department requested. Every deferred job has a reason.
6. **What-if and live disruption.** Traffic surge, emergency defect, shorter windows, larger scope, fewer gangs, or a block overrunning mid-night. The planner re-solves from scratch each time.

## Results on the simulated corridor (Scenario A: 20 trains, 8 requests, 8 gangs)
*Before* = each department's request exactly as submitted. *After* = the RAILNEXA plan. Both are evaluated by the same rules, and nothing is hard-coded.

| Metric | As requested | RAILNEXA plan |
|---|:--:|:--:|
| Conflicts (crew, section, window, train) | 5 | **0** |
| Work executable safely | 62.5 % | **100 %** |
| Asset risk addressed tonight | 61.3 % | **100 %** |
| Line possession (00–06 h, both lines) | 21.5 h | **17 h** (−4 h 30 m) |
| Night line availability | 77.6 % | **82.3 %** |
| Trains regulated / total delay | 8 / 90 min | **7 / 70 min** (SLW only, 0 premium) |
| Integrated multi-department blocks | 0 | **2** |
| Solve time | — | **~5 ms, proven optimal** |

Numbers change live with every what-if and are recomputed by the engine.

## Architecture
```
Corridor data ─► AI risk scoring ─► candidate slots (windows, premium-path filter)
                                    │
                                    ▼
             branch-and-bound optimiser (gang capacity, SLW delay model, possession union)
                                    │
                                    ▼
      validated plan (7 safety checks) ─► explanations ─► dashboard / CSV / API
```
- **Frontend:** React 18 + TypeScript + Vite + Tailwind + Recharts. The engine (`frontend/src/engine/planner.ts`) runs **in the browser**, so the hosted demo needs no server.
- **Backend:** FastAPI (`backend/app/planner.py`), a line-for-line port of the same engine that gives identical plans. It is the integration point for IR systems (e.g. CRIS applications) in a production roll-out.
- **Verification:** `npx tsx tests/verify-optimality.ts` (inside `frontend/`) checks the optimiser against brute-force enumeration on 30 random scenarios.

### Optimisation model
- **Decide** for each request: defer it, or pick a start time on a 15-min grid inside a sanctioned window. Gangs are assigned afterwards.
- **Minimise:** deferral penalty (priority + 10 × asset risk) + 2 × Σ train-class weight × delay + possession minutes (union per section-line) + 0.05 × deviation from the requested start.
- **Train delay model:** if a train meets a block, it runs Single-Line Working over the adjacent line (+10 min) when that line is free; otherwise it is held until the block clears.

## Run locally
```bash
# Backend (optional — the web app works without it)
cd backend && pip install -r requirements.txt && python run.py   # http://127.0.0.1:8000/docs

# Frontend
cd frontend && npm install && npm run dev                         # http://localhost:5173
```

## 3-minute demo script
1. **Dashboard (0:00–0:30).** Six live KPIs, the Safety Validation panel (7/7 pass, proven optimal) and the time-space chart. Point out the two lines per section, the train paths and the dashed purple **integrated blocks**.
2. **AI Block Planner (0:30–1:20).** Click **Generate Optimal Block Plan**. Open the *Generated Block Plan — with reasons* table. MR-1043 (P&C overhaul) and MR-1042 (S&T relay) share one DN-line possession on Meerut–Aligarh, saving 120 min. MR-1043 moved 01:45 → 01:30 because the requested slot is outside the sanctioned window.
3. **Results (1:20–1:50).** Departmental requests vs plan: conflicts 5 → 0, work executable 62.5 % → 100 %, possession by section, and the list of resolved conflicts.
4. **What-If (1:50–2:30).** Run **Scenario C** (emergency tongue-rail crack at Meerut): it is fitted into a third integrated block with nothing deferred. Then pick Scenario A, drag *gangs on duty* to 6 and run: two jobs are deferred, each with a reason ("all TRD gangs committed…").
5. **Live disruption (2:30–3:00).** Run *Simulate Disruption*: MR-1046 overruns +90 min. It is locked, MR-1045 is re-planned inside the extended possession, the newly regulated trains are listed, and the out-of-window overrun is flagged for DRM sanction.

## Roadmap after SIH
- Ingest a real working timetable and asset registers (data exports from CRIS systems).
- Multi-night rolling horizon, and automatic splitting of long works into phases.
- Scale-up solver (e.g. CP-SAT / MILP) for full-division instances, with this exact search kept as the verifiable core.
- Role-based approval workflow (planner → Sr DEN / Sr DSTE / Sr DEE → controller).
