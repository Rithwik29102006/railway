"""RAILNEXA AI — REST API (FastAPI).

Serves the simulated corridor dataset and runs the block-planning engine
(app/planner.py — identical model to the browser engine in
frontend/src/engine/planner.ts).
"""
import csv
import io
from typing import Any, Dict, Optional

from fastapi import FastAPI, Query, Response
from fastapi.middleware.cors import CORSMiddleware

from app.data_store import (
    get_initial_assets, get_initial_crews, get_initial_requests,
    get_initial_sections, get_initial_trains,
)
from app.models import DisruptionPayload, MaintenanceRequest, WhatIfParameters
from app.planner import plan_corridor, to_hhmm
from app.reporter import get_system_references
from app.risk_engine import calculate_asset_priority_score

SYSTEM = "RAILNEXA AI"
DISCLAIMER = "Prototype • Simulated corridor data. AI-generated plans are advisory and require authorised validation before execution."

REQUEST_LINES = {"MR-1041": "DN", "MR-1042": "DN", "MR-1043": "DN", "MR-1044": "UP",
                 "MR-1045": "DN", "MR-1046": "DN", "MR-1047": "UP", "MR-1048": "DN"}

app = FastAPI(
    title=f"{SYSTEM} API",
    description="AI-Powered Automatic Block Planning to Maximise Asset Availability for Train Operations on Indian Railways (SIH26027)",
    version="2.0.0",
)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])


def _load() -> Dict[str, Any]:
    assets = get_initial_assets()
    for a in assets:
        a.risk_score = calculate_asset_priority_score(a)["risk_score"]
    requests = [r.model_dump(mode="json") for r in get_initial_requests()]
    for r in requests:
        r["line"] = REQUEST_LINES.get(r["id"], "DN")
    return {
        "sections": [s.model_dump(mode="json") for s in get_initial_sections()],
        "assets": [a.model_dump(mode="json") for a in assets],
        "requests": requests,
        "trains": [t.model_dump(mode="json") for t in get_initial_trains()],
        "crews": [c.model_dump(mode="json") for c in get_initial_crews()],
    }


DB: Dict[str, Any] = {"data": _load(), "params": None, "result": None}


def _default_params() -> Dict[str, Any]:
    d = DB["data"]
    return dict(available_block_window_multiplier=1.0, train_traffic_level_pct=100,
                maintenance_requests_count=len(d["requests"]), maintenance_duration_multiplier=1.0,
                crew_availability_count=len(d["crews"]), scenario_preset="A")


PRESETS = {
    "A": {},
    "B": {"train_traffic_level_pct": 150},
    "C": {"emergency_request_priority": "EMERGENCY"},
    "D": {"available_block_window_multiplier": 0.85},
    "E": {"maintenance_duration_multiplier": 1.25},
}


def _params(p: Optional[WhatIfParameters]) -> Dict[str, Any]:
    out = _default_params()
    if p is not None:
        given = p.model_dump(exclude_unset=True)
        if given.get("scenario_preset") in PRESETS:
            out.update(PRESETS[given["scenario_preset"]])
        out.update(given)
    return out


def _run(p: Dict[str, Any], locked=None) -> Dict[str, Any]:
    res = plan_corridor(DB["data"], p, locked)
    DB["params"], DB["result"] = p, res
    return res


@app.get("/")
def root():
    return {"system": SYSTEM, "problem_statement": "SIH26027 – AI-Powered Automatic Block Planning to Maximise Asset Availability",
            "corridor": "New Delhi – Varanasi (simulated)", "engine": "AI risk scoring + exact branch-and-bound block optimiser",
            "docs": "/docs", "disclaimer": DISCLAIMER}


@app.get("/api/health")
def health():
    return {"status": "healthy", "service": f"{SYSTEM} Engine", "version": "2.0.0"}


@app.get("/api/data")
def get_all_data():
    return {**DB["data"], "metadata": {"corridor_name": "New Delhi (NDLS) – Varanasi (BSB) double-line corridor", "prototype_disclaimer": DISCLAIMER}}


@app.post("/api/optimize")
def optimize(params: Optional[WhatIfParameters] = None):
    """Generate the optimal block plan for the given what-if parameters."""
    return _run(_params(params))


@app.post("/api/simulate")
def simulate(params: WhatIfParameters):
    p = _params(params)
    return {"scenario_parameters": p, "result": _run(p)}


@app.post("/api/replan")
def replan(payload: DisruptionPayload):
    """A block in progress overruns: lock it with its extension and re-optimise the rest."""
    p = DB["params"] or _default_params()
    prev = DB["result"] or plan_corridor(DB["data"], p)
    blk = next((b for b in prev["scheduled_blocks"] if b["block_id"] == payload.block_id), None) or prev["scheduled_blocks"][0]
    locked = {blk["request_id"]: {"start": blk["start_minute"], "end": blk["end_minute"] + payload.additional_minutes, "crew": blk["assigned_crew"]}}
    nxt = _run(p, locked)
    changes = []
    for nb in nxt["scheduled_blocks"]:
        ob = next((b for b in prev["scheduled_blocks"] if b["request_id"] == nb["request_id"]), None)
        if ob and (ob["start_minute"] != nb["start_minute"] or ob["end_minute"] != nb["end_minute"] or ob["assigned_crew"] != nb["assigned_crew"]):
            changes.append({"block_id": nb["block_id"], "old_slot": f"{ob['start_time']}–{ob['end_time']}", "new_slot": f"{nb['start_time']}–{nb['end_time']}"})
    return {
        "disruption_event": {"block_id": blk["block_id"], "additional_minutes": payload.additional_minutes, "reason": payload.reason},
        "re_optimization_summary": {"message": f"{blk['request_id']} held until {to_hhmm(blk['end_minute'] + payload.additional_minutes)}; {len(changes)} block(s) changed.", "shifts_applied": changes},
        "result": nxt,
    }


@app.post("/api/requests")
def add_request(request: MaintenanceRequest):
    r = request.model_dump(mode="json")
    r.setdefault("line", "DN")
    DB["data"]["requests"] = [r] + [x for x in DB["data"]["requests"] if x["id"] != r["id"]]
    return {"message": "Maintenance request submitted", "request": r}


@app.get("/api/export-report")
def export_report(format: str = Query("csv", enum=["csv", "json"])):
    res = DB["result"] or _run(_default_params())
    if format == "json":
        return res
    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow(["Block ID", "Request", "Section", "Line", "Asset", "Department", "Priority", "Start", "End", "Duration (min)", "Gang", "Integrated block", "Justification"])
    for b in res["scheduled_blocks"]:
        w.writerow([b["block_id"], b["request_id"], b["section_name"], b["line"], b["asset_name"], b["department"], b["priority"],
                    b["start_time"], b["end_time"], b["duration_minutes"], b["assigned_crew"], b["integrated_block_id"] or "", b["reason_for_window"]])
    w.writerow([])
    w.writerow(["Metric", "As requested", "Optimised"])
    for k in ["total_schedule_conflicts", "maintenance_completion_pct", "overall_asset_availability_pct", "risk_addressed_pct", "affected_trains_count", "total_train_delay_minutes", "possession_minutes"]:
        w.writerow([k, res["kpi"]["before"][k], res["kpi"]["after"][k]])
    w.writerow([])
    w.writerow(["Safety check", "Result", "Detail"])
    for v in res["validation"]:
        w.writerow([v["label"], "PASS" if v["pass"] else "FAIL", v["detail"]])
    return Response(content=buf.getvalue(), media_type="text/csv",
                    headers={"Content-Disposition": "attachment; filename=RAILNEXA_block_plan.csv"})


@app.get("/api/references")
def references():
    return {"references": get_system_references(), "disclaimer": f"{SYSTEM} is an advisory decision-support layer."}
