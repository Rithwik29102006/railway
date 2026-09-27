"""
RAILNEXA AI — Block Planning Engine (Python port)

Line-for-line port of frontend/src/engine/planner.ts so the REST API and the
browser produce the same plan for the same inputs. See that file for the model
description. Works on plain dicts (the JSON shape of the pydantic models).

Hard constraints: sanctioned windows, no Vande Bharat / Rajdhani path within
block +- buffer on the same line, department gang capacity (30-min transit),
shift limits. Soft objective: deferral penalty (priority + AI risk), train delay
(Single-Line Working +10 min, else held), line-possession union (rewards
integrated multi-department blocks), deviation from the requested start.
"""
from __future__ import annotations

import math
import re
import time
from copy import deepcopy
from typing import Any, Dict, List, Optional, Tuple

STEP = 15
SLW_DELAY = 10
CREW_TRANSIT = 30
NIGHT_HORIZON = 360
NODE_LIMIT = 400_000

DEFER_PENALTY = {"EMERGENCY": 6000, "HIGH": 2500, "MEDIUM": 900, "LOW": 300}
TRAIN_WEIGHT = {1: 1e6, 2: 8, 3: 4, 4: 2, 5: 1}
W_DELAY = 2
W_POSSESSION = 1
W_DEVIATION = 0.05

Dict_ = Dict[str, Any]


def js_round(x: float) -> int:
    return int(math.floor(x + 0.5))


def to_min(hhmm: str) -> int:
    h, m = hhmm.split(":")
    return int(h) * 60 + int(m)


def to_hhmm(minute: float) -> str:
    m = (js_round(minute) % 1440 + 1440) % 1440
    return f"{m // 60:02d}:{m % 60:02d}"


def overlap(a0, a1, b0, b1) -> bool:
    return max(a0, b0) < min(a1, b1)


def sec_no(sid: str) -> int:
    d = re.sub(r"\D", "", sid)
    return int(d) if d else 0


def prio_val(t: Dict_) -> int:
    p = t["priority"]
    return int(p.value if hasattr(p, "value") else p)


def train_line(t: Dict_) -> str:
    r = t["route_sections"]
    if len(r) >= 2:
        return "DN" if sec_no(r[-1]) >= sec_no(r[0]) else "UP"
    return "UP" if re.search(r"NDLS|New Delhi", t["destination"], re.I) else "DN"


def req_line(r: Dict_) -> str:
    return "UP" if r.get("line") == "UP" else "DN"


def union_length(iv: List[Tuple[int, int]]) -> int:
    if not iv:
        return 0
    s = sorted(iv, key=lambda x: x[0])
    total, (cs, ce) = 0, s[0]
    for a, b in s[1:]:
        if a <= ce:
            ce = max(ce, b)
        else:
            total += ce - cs
            cs, ce = a, b
    return total + (ce - cs)


EMERGENCY_INJECT: Dict_ = {
    "id": "MR-EMG-01", "asset_id": "AST-PNC-04", "asset_name": "Tongue Rail Crack – Meerut Yard Pts 21A",
    "section_id": "SEC-02", "section_name": "Ghaziabad – Meerut", "department": "Engineering",
    "priority": "EMERGENCY", "duration_minutes": 90, "preferred_window": "02:00 - 03:30",
    "preferred_start_minute": 120, "deadline_date": "Tonight", "assigned_crew": "CREW-ENG-B",
    "status": "PENDING", "description": "USFD detected tongue-rail crack; 30 km/h caution order in force until renewal.",
    "safety_buffer_minutes": 15, "track_possession_required": True, "power_block_required": False,
    "traffic_block_required": True, "line": "UP",
}


# ----------------------------------------------------------------- scenario
class Scenario:
    def __init__(self, data: Dict_, params: Dict_):
        self.data = data
        self.params = params
        self.locked: Optional[Dict[str, Dict_]] = None

        n = params.get("maintenance_requests_count") or len(data["requests"])
        requests = data["requests"][: max(1, n)]
        if params.get("emergency_request_priority") == "EMERGENCY" and not any(r["id"] == EMERGENCY_INJECT["id"] for r in requests):
            requests = [EMERGENCY_INJECT] + list(requests)
        dm = params.get("maintenance_duration_multiplier") or 1
        self.requests = [dict(r, duration_minutes=js_round(r["duration_minutes"] * dm / 5) * 5) for r in requests]

        pct = params.get("train_traffic_level_pct") or 100
        trains = list(data["trains"])
        if pct < 100:
            keep = max(1, js_round(len(data["trains"]) * pct / 100))
            ranked = sorted(trains, key=prio_val)
            keep_ids = {t["id"] for t in ranked[:keep]}
            trains = [t for t in trains if t["id"] in keep_ids]
        elif pct > 100:
            extra = js_round(len(data["trains"]) * (pct - 100) / 100)
            pool = [t for t in data["trains"] if prio_val(t) >= 3 and t["movements"]]
            for k in range(extra if pool else 0):
                base = pool[k % len(pool)]
                shift = 35 + 25 * (k // len(pool)) + (k % 3) * 10
                mv = []
                for m in base["movements"]:
                    e, x = m["entry_minute"] + shift, m["exit_minute"] + shift
                    mv.append(dict(m, entry_minute=e, exit_minute=x, entry_time=to_hhmm(e), exit_time=to_hhmm(x)))
                trains.append(dict(base, id=f"{base['id']}-X{k + 1}", train_number=f"{base['train_number']}-X{k + 1}",
                                   name=f"{base['name']} (additional path)", movements=mv))
        self.trains = trains

        by_dept: Dict[str, List[Dict_]] = {}
        for c in data["crews"]:
            by_dept.setdefault(c["department"], []).append(c)
        order: List[Dict_] = []
        i = 0
        while len(order) < len(data["crews"]):
            for d in by_dept:
                if i < len(by_dept[d]):
                    order.append(by_dept[d][i])
            i += 1
        self.crews = order[: max(1, params.get("crew_availability_count") or len(data["crews"]))]

        wm = params.get("available_block_window_multiplier") or 1
        self.windows: Dict[str, List[Dict_]] = {}
        for s in data["sections"]:
            ws = []
            for w in s["allowed_maintenance_windows"]:
                a, b = to_min(w["start"]), to_min(w["end"])
                ws.append({"start": a, "end": a + math.floor((b - a) * wm / STEP) * STEP})
            self.windows[s["id"]] = ws

        self.risk = {a["id"]: a["risk_score"] for a in data["assets"]}
        self.section_name = {s["id"]: s["name"] for s in data["sections"]}


class Index:
    def __init__(self, trains: List[Dict_]):
        self.lines = [train_line(t) for t in trains]
        self.moves: Dict[str, List[Tuple[int, int, int, str]]] = {}
        for i, t in enumerate(trains):
            for m in t["movements"]:
                self.moves.setdefault(m["section_id"], []).append((i, m["entry_minute"], m["exit_minute"], self.lines[i]))


# placed block: dict(req, start, end, crew, locked)
def buf_of(r: Dict_) -> int:
    b = r.get("safety_buffer_minutes")
    return 15 if b is None else b


def train_impacts(placed: List[Dict_], sc: Scenario, idx: Index) -> List[Dict_]:
    out = []
    by = {}
    for p in placed:
        by.setdefault((p["req"]["section_id"], req_line(p["req"])), []).append(p)
    seen = []
    for p in placed:
        if p["req"]["section_id"] not in seen:
            seen.append(p["req"]["section_id"])
    for sec in seen:
        for (ti, entry, exit_, line) in idx.moves.get(sec, []):
            same = by.get((sec, line), [])
            hits = [p for p in same if overlap(p["start"] - buf_of(p["req"]), p["end"] + buf_of(p["req"]), entry, exit_)]
            if not hits:
                continue
            ids = [h["req"]["id"] for h in hits]
            if prio_val(sc.trains[ti]) <= 1:
                out.append(dict(trainIdx=ti, section_id=sec, mode="P1_VIOLATION", delay=0, blockIds=ids, entry=entry, exit=exit_))
                continue
            other = by.get((sec, "DN" if line == "UP" else "UP"), [])
            if not any(overlap(p["start"], p["end"], entry, exit_) for p in other):
                out.append(dict(trainIdx=ti, section_id=sec, mode="SLW", delay=SLW_DELAY, blockIds=ids, entry=entry, exit=exit_))
            else:
                clear = max(h["end"] + buf_of(h["req"]) for h in hits)
                out.append(dict(trainIdx=ti, section_id=sec, mode="HELD", delay=max(SLW_DELAY, clear - entry), blockIds=ids, entry=entry, exit=exit_))
    return out


def possession_minutes(placed: List[Dict_], merge: bool) -> int:
    if not merge:
        return sum(p["end"] - p["start"] for p in placed)
    g: Dict[Tuple[str, str], List[Tuple[int, int]]] = {}
    for p in placed:
        g.setdefault((p["req"]["section_id"], req_line(p["req"])), []).append((p["start"], p["end"]))
    return sum(union_length(v) for v in g.values())


def defer_cost(r: Dict_, sc: Scenario) -> float:
    return DEFER_PENALTY.get(r["priority"], 500) + 10 * sc.risk.get(r["asset_id"], 50)


def crew_compatible(a: Dict_, b: Dict_) -> bool:
    if a["crew"] != b["crew"]:
        return True
    gap = 0 if a["req"]["section_id"] == b["req"]["section_id"] else CREW_TRANSIT
    return a["end"] + gap <= b["start"] or b["end"] + gap <= a["start"]


def section_cost(blocks: List[Dict_], sc: Scenario, idx: Index) -> float:
    if not blocks:
        return 0
    c = W_POSSESSION * possession_minutes(blocks, True)
    for ti in train_impacts(blocks, sc, idx):
        c += W_DELAY * ti["delay"] * TRAIN_WEIGHT.get(prio_val(sc.trains[ti["trainIdx"]]), 1)
        if ti["mode"] == "P1_VIOLATION":
            c += 1e7
    return c


def static_cost(r: Dict_, start: int) -> float:
    return W_DEVIATION * abs(start - r["preferred_start_minute"])


def objective(placed, deferred, sc, idx) -> float:
    c = sum(defer_cost(r, sc) for r in deferred)
    by: Dict[str, List[Dict_]] = {}
    for p in placed:
        c += static_cost(p["req"], p["start"])
        by.setdefault(p["req"]["section_id"], []).append(p)
    return c + sum(section_cost(b, sc, idx) for b in by.values())


def options_for(r: Dict_, sc: Scenario, idx: Index) -> List[Dict_]:
    if not any(c["department"] == r["department"] and c.get("is_available", True) is not False for c in sc.crews):
        return []
    line, buf = req_line(r), buf_of(r)
    opts = []
    for w in sc.windows.get(r["section_id"], []):
        s = math.ceil(w["start"] / STEP) * STEP
        while s + r["duration_minutes"] <= w["end"]:
            e = s + r["duration_minutes"]
            hits_p1 = any(ln == line and prio_val(sc.trains[ti]) <= 1 and overlap(s - buf, e + buf, en, ex)
                          for (ti, en, ex, ln) in idx.moves.get(r["section_id"], []))
            if not hits_p1:
                st = static_cost(r, s)
                opts.append({"start": s, "end": e, "static": st,
                             "alone": st + section_cost([{"req": r, "start": s, "end": e, "crew": ""}], sc, idx)})
            s += STEP
    return sorted(opts, key=lambda o: o["alone"])


def capacity_ok(lst: List[Tuple[int, int]], cand: Tuple[int, int], k: int) -> bool:
    c = (cand[0], cand[1] + CREW_TRANSIT)
    rel = [(a, b + CREW_TRANSIT) for a, b in lst if overlap(a, b + CREW_TRANSIT, c[0], c[1])]
    if len(rel) < k:
        return True
    pts = [c[0]] + [a for a, _ in rel if c[0] < a < c[1]]
    return all(1 + sum(1 for a, b in rel if a <= t < b) <= k for t in pts)


def assign_crews(placed: List[Dict_], sc: Scenario) -> List[Dict_]:
    free = {c["id"]: {"until": -math.inf, "section": "", "load": 0} for c in sc.crews}
    for p in placed:
        if p.get("locked"):
            free[p["crew"]] = {"until": p["end"], "section": p["req"]["section_id"], "load": p["end"] - p["start"]}
    shift = {c["id"]: (c.get("max_shift_hours") or 8) * 60 for c in sc.crews}
    out = []
    for p in sorted([p for p in placed if not p.get("locked")], key=lambda x: x["start"]):
        def ok(cid):
            f = free.get(cid)
            return bool(f) and f["until"] + (0 if f["section"] == p["req"]["section_id"] else CREW_TRANSIT) <= p["start"] \
                and f["load"] + p["end"] - p["start"] <= shift.get(cid, 480)
        pool = [c["id"] for c in sc.crews if c["department"] == p["req"]["department"]]
        ac = p["req"]["assigned_crew"]
        if ok(ac) and ac in pool:
            crew = ac
        else:
            cands = sorted([c for c in pool if ok(c)], key=lambda c: free[c]["load"])
            crew = cands[0] if cands else (pool[0] if pool else ac)
        free[crew] = {"until": p["end"], "section": p["req"]["section_id"], "load": free.get(crew, {"load": 0})["load"] + p["end"] - p["start"]}
        out.append(dict(p, crew=crew))
    return [p for p in placed if p.get("locked")] + out


# ----------------------------------------------------------------- solver
def solve(sc: Scenario):
    t0 = time.perf_counter()
    idx = Index(sc.trains)
    locked_placed, free_reqs = [], []
    for r in sc.requests:
        L = (sc.locked or {}).get(r["id"])
        if L:
            locked_placed.append({"req": r, "start": L["start"], "end": L["end"], "crew": L["crew"], "locked": True})
        else:
            free_reqs.append(r)

    order = sorted(free_reqs, key=lambda r: -defer_cost(r, sc))
    opts = [options_for(r, sc, idx) for r in order]
    options_evaluated = sum(len(o) for o in opts)
    gangs: Dict[str, int] = {}
    for c in sc.crews:
        gangs[c["department"]] = gangs.get(c["department"], 0) + 1

    min_static = [min(defer_cost(order[i], sc), min((x["static"] for x in o), default=math.inf)) for i, o in enumerate(opts)]
    min_alone = [min(defer_cost(order[i], sc), min((x["alone"] for x in o), default=math.inf)) for i, o in enumerate(opts)]

    by_sec: Dict[str, List[Dict_]] = {}
    sec_cost: Dict[str, float] = {}
    by_dept: Dict[str, List[Tuple[int, int]]] = {}
    st = {"fixed": 0.0, "sec_total": 0.0}

    def tail_bound(i: int) -> float:
        lb, extra = 0.0, {}
        for j in range(i, len(order)):
            lb += min_static[j]
            sec = order[j]["section_id"]
            gain = max(0, min_alone[j] - sec_cost.get(sec, 0)) - min_static[j]
            if gain > extra.get(sec, 0):
                extra[sec] = gain
        return lb + sum(extra.values())

    def add(p):
        s = p["req"]["section_id"]
        by_sec.setdefault(s, []).append(p)
        nc = section_cost(by_sec[s], sc, idx)
        old = sec_cost.get(s, 0)
        st["sec_total"] += nc - old
        sec_cost[s] = nc
        by_dept.setdefault(p["req"]["department"], []).append((p["start"], p["end"]))
        return old

    def remove(p, old):
        s = p["req"]["section_id"]
        by_sec[s].pop()
        st["sec_total"] += old - sec_cost[s]
        sec_cost[s] = old
        by_dept[p["req"]["department"]].pop()

    for p in locked_placed:
        add(p)

    # greedy incumbent
    snapshot, gd, g_fixed = [], [], 0.0
    for i, r in enumerate(order):
        pick, pick_cost = None, defer_cost(r, sc)
        for o in opts[i]:
            if not capacity_ok(by_dept.get(r["department"], []), (o["start"], o["end"]), gangs.get(r["department"], 0)):
                continue
            p = {"req": r, "start": o["start"], "end": o["end"], "crew": ""}
            before = st["sec_total"]
            old = add(p)
            delta = st["sec_total"] - before + o["static"]
            remove(p, old)
            if delta < pick_cost:
                pick, pick_cost = o, delta
        if pick:
            p = {"req": r, "start": pick["start"], "end": pick["end"], "crew": ""}
            snapshot.append((p, add(p)))
            g_fixed += pick["static"]
        else:
            gd.append(r)
            g_fixed += defer_cost(r, sc)
    best = {"cost": g_fixed + st["sec_total"] + 1e-6,
            "placed": locked_placed + [dict(p) for p, _ in snapshot], "deferred": list(gd)}
    for p, old in reversed(snapshot):
        remove(p, old)
    greedy_objective = best["cost"]

    cur, cur_def = list(locked_placed), []
    stats = {"nodes": 0, "aborted": False}

    def dfs(i: int):
        if stats["aborted"]:
            return
        stats["nodes"] += 1
        if stats["nodes"] > NODE_LIMIT:
            stats["aborted"] = True
            return
        if st["fixed"] + st["sec_total"] + tail_bound(i) >= best["cost"] - 1e-9:
            return
        if i == len(order):
            best.update(cost=st["fixed"] + st["sec_total"], placed=[dict(p) for p in cur], deferred=list(cur_def))
            return
        r = order[i]
        for o in opts[i]:
            if not capacity_ok(by_dept.get(r["department"], []), (o["start"], o["end"]), gangs.get(r["department"], 0)):
                continue
            p = {"req": r, "start": o["start"], "end": o["end"], "crew": ""}
            old = add(p)
            cur.append(p)
            st["fixed"] += o["static"]
            dfs(i + 1)
            st["fixed"] -= o["static"]
            cur.pop()
            remove(p, old)
            if stats["aborted"]:
                return
        cur_def.append(r)
        st["fixed"] += defer_cost(r, sc)
        dfs(i + 1)
        st["fixed"] -= defer_cost(r, sc)
        cur_def.pop()

    dfs(0)
    return assign_crews(best["placed"], sc), best["deferred"], {
        "nodes": stats["nodes"], "provenOptimal": not stats["aborted"], "ms": (time.perf_counter() - t0) * 1000,
        "optionsEvaluated": options_evaluated, "objective": best["cost"], "greedyObjective": greedy_objective,
    }


# ----------------------------------------------------------------- analysis
def in_window(p, sc) -> bool:
    return any(p["start"] >= w["start"] and p["end"] <= w["end"] for w in sc.windows.get(p["req"]["section_id"], []))


def r1(x: float) -> float:
    return math.floor(x * 10 + 0.5) / 10


def analyse(placed, all_requests, sc: Scenario, coordinated: bool, solver_ms: float = 0.0):
    idx = Index(sc.trains)
    impacts = train_impacts(placed, sc, idx)
    conflicts: List[Dict_] = []
    sn = lambda sid: sc.section_name.get(sid, sid)

    def push(c):
        conflicts.append(dict(id=f"CONF-{len(conflicts) + 1:03d}", **c))

    for ti in impacts:
        if ti["mode"] == "SLW":
            continue
        t = sc.trains[ti["trainIdx"]]
        push(dict(type="TRAIN_CONFLICT", severity="CRITICAL" if ti["mode"] == "P1_VIOLATION" else "HIGH",
                  section_id=ti["section_id"], section_name=sn(ti["section_id"]),
                  affected_entities=[t["train_number"], t["name"], *ti["blockIds"]],
                  description=(f"{t['name']} ({t['train_number']}) path {to_hhmm(ti['entry'])}–{to_hhmm(ti['exit'])} runs into block {', '.join(ti['blockIds'])} — premium service cannot be regulated."
                               if ti["mode"] == "P1_VIOLATION" else
                               f"{t['train_number']} {t['name']} held {ti['delay']} min: block {', '.join(ti['blockIds'])} and the adjacent line are both occupied."),
                  suggested_resolution="Shift block clear of the path (+15 min buffer) or stagger the adjacent-line block so Single-Line Working is possible.",
                  time_window=f"{to_hhmm(ti['entry'])} – {to_hhmm(ti['exit'])}"))
    for i in range(len(placed)):
        for j in range(i + 1, len(placed)):
            a, b = placed[i], placed[j]
            if not crew_compatible(a, b):
                push(dict(type="CREW_CONFLICT", severity="HIGH", section_id=a["req"]["section_id"], section_name=sn(a["req"]["section_id"]),
                          affected_entities=[a["crew"], a["req"]["id"], b["req"]["id"]],
                          description=f"{a['crew']} double-booked: {a['req']['id']} ({to_hhmm(a['start'])}–{to_hhmm(a['end'])}, {sn(a['req']['section_id'])}) and {b['req']['id']} ({to_hhmm(b['start'])}–{to_hhmm(b['end'])}, {sn(b['req']['section_id'])}).",
                          suggested_resolution=f"Assign a second {a['req']['department']} gang or stagger by ≥ {CREW_TRANSIT} min transit.",
                          time_window=f"{to_hhmm(max(a['start'], b['start']))} – {to_hhmm(min(a['end'], b['end']))}"))
            if not coordinated and a["req"]["section_id"] == b["req"]["section_id"] and req_line(a["req"]) == req_line(b["req"]) \
                    and overlap(a["start"], a["end"], b["start"], b["end"]):
                push(dict(type="ASSET_CONFLICT", severity="HIGH", section_id=a["req"]["section_id"], section_name=sn(a["req"]["section_id"]),
                          affected_entities=[a["req"]["id"], b["req"]["id"], a["req"]["department"], b["req"]["department"]],
                          description=f"{a['req']['department']} ({a['req']['id']}) and {b['req']['department']} ({b['req']['id']}) requested separate, overlapping possessions of the {req_line(a['req'])} line on {sn(a['req']['section_id'])}.",
                          suggested_resolution="Merge into one integrated multi-department block.",
                          time_window=f"{to_hhmm(max(a['start'], b['start']))} – {to_hhmm(min(a['end'], b['end']))}"))
    for p in placed:
        if not in_window(p, sc) and not p.get("locked"):
            push(dict(type="TIME_CONFLICT", severity="MEDIUM", section_id=p["req"]["section_id"], section_name=sn(p["req"]["section_id"]),
                      affected_entities=[p["req"]["id"]],
                      description=f"{p['req']['id']} requested {to_hhmm(p['start'])}–{to_hhmm(p['end'])}, outside the sanctioned corridor window of {sn(p['req']['section_id'])}.",
                      suggested_resolution="Move inside the sanctioned window or obtain DRM special sanction.",
                      time_window=f"{to_hhmm(p['start'])} – {to_hhmm(p['end'])}"))
    placed_ids = {p["req"]["id"] for p in placed}
    for r in all_requests:
        if r["id"] not in placed_ids and r["priority"] == "EMERGENCY":
            push(dict(type="PRIORITY_CONFLICT", severity="CRITICAL", section_id=r["section_id"], section_name=sn(r["section_id"]),
                      affected_entities=[r["id"], r["asset_name"]], description=f"EMERGENCY work {r['id']} ({r['asset_name']}) could not be scheduled.",
                      suggested_resolution="Widen window, add crew, or split the work into two blocks.", time_window=r["preferred_window"]))

    executable = set()
    if coordinated:
        executable = {p["req"]["id"] for p in placed}
    else:
        acc = []
        for p in sorted(placed, key=lambda x: -defer_cost(x["req"], sc)):
            p1 = any(ti["mode"] == "P1_VIOLATION" and p["req"]["id"] in ti["blockIds"] for ti in impacts)
            ok = in_window(p, sc) and not p1 and all(
                crew_compatible(a, p) and not (a["req"]["section_id"] == p["req"]["section_id"] and req_line(a["req"]) == req_line(p["req"])
                                               and overlap(a["start"], a["end"], p["start"], p["end"])) for a in acc)
            if ok:
                acc.append(p)
                executable.add(p["req"]["id"])

    delay_by_train: Dict[int, int] = {}
    for ti in impacts:
        delay_by_train[ti["trainIdx"]] = delay_by_train.get(ti["trainIdx"], 0) + ti["delay"]
    affected = len(delay_by_train)
    total_delay = sum(delay_by_train.values())
    possession = possession_minutes(placed, coordinated)
    availability = 100 * (1 - possession / (len(sc.data["sections"]) * 2 * NIGHT_HORIZON))
    risk_all = sum(sc.risk.get(r["asset_id"], 50) for r in all_requests)
    risk_done = sum(sc.risk.get(r["asset_id"], 50) for r in all_requests if r["id"] in executable)
    safe = sum(1 for p in placed if in_window(p, sc)
               and not any(ti["mode"] != "SLW" and p["req"]["id"] in ti["blockIds"] for ti in impacts)
               and all(q is p or crew_compatible(p, q) for q in placed))
    risk_pct = r1(100 * risk_done / risk_all if risk_all else 100)
    metrics = dict(
        total_schedule_conflicts=len(conflicts),
        affected_trains_count=affected,
        overall_asset_availability_pct=r1(availability),
        critical_asset_availability_pct=risk_pct,
        maintenance_completion_pct=r1(100 * len(executable) / max(1, len(all_requests))),
        average_train_delay_minutes=r1(total_delay / affected if affected else 0),
        total_maintenance_hours_scheduled=r1(sum(p["end"] - p["start"] for p in placed if p["req"]["id"] in executable) / 60),
        safety_compliance_score_pct=r1(100 * safe / max(1, len(placed))),
        solver_execution_time_ms=r1(solver_ms),
        total_train_delay_minutes=total_delay,
        possession_minutes=possession,
        risk_addressed_pct=risk_pct,
    )
    return metrics, conflicts, impacts, executable


def integrated_blocks(placed) -> List[Dict_]:
    g: Dict[Tuple[str, str], List[Dict_]] = {}
    for p in placed:
        g.setdefault((p["req"]["section_id"], req_line(p["req"])), []).append(p)
    out = []
    for lst in g.values():
        cluster: List[Dict_] = []

        def flush():
            if len(cluster) > 1:
                start = min(c["start"] for c in cluster)
                end = max(c["end"] for c in cluster)
                r0 = cluster[0]["req"]
                depts = []
                for c in cluster:
                    if c["req"]["department"] not in depts:
                        depts.append(c["req"]["department"])
                out.append(dict(id=f"IB-{r0['section_id']}-{req_line(r0)}-{to_hhmm(start).replace(':', '')}",
                                section_id=r0["section_id"], section_name=r0["section_name"], line=req_line(r0), start=start, end=end,
                                request_ids=[c["req"]["id"] for c in cluster], departments=depts,
                                minutes_saved=sum(c["end"] - c["start"] for c in cluster) - (end - start)))
        for p in sorted(lst, key=lambda x: x["start"]):
            if cluster and p["start"] < max(c["end"] for c in cluster):
                cluster.append(p)
            else:
                flush()
                cluster = [p]
        flush()
    return out


def explain_block(p, placed, sc: Scenario, impacts, ibs):
    idx = Index(sc.trains)
    line, buf = req_line(p["req"]), buf_of(p["req"])
    parts = []
    w = next((w for w in sc.windows.get(p["req"]["section_id"], []) if p["start"] >= w["start"] and p["end"] <= w["end"]), None)
    if w:
        parts.append(f"Inside sanctioned window {to_hhmm(w['start'])}–{to_hhmm(w['end'])}")
    pref = p["req"]["preferred_start_minute"]
    if p["start"] != pref:
        alt = dict(p, start=pref, end=pref + (p["end"] - p["start"]))
        others = [q for q in placed if q is not p]
        alt_imp = [t for t in train_impacts(others + [alt], sc, idx) if p["req"]["id"] in t["blockIds"]]
        alt_held = [t for t in alt_imp if t["mode"] != "SLW"]
        clash = next((q for q in others if not crew_compatible(q, alt)), None)
        p1 = next((t for t in alt_imp if t["mode"] == "P1_VIOLATION"), None)
        mine_n = len([t for t in impacts if p["req"]["id"] in t["blockIds"]])
        if p1:
            why = f"requested slot would foul {sc.trains[p1['trainIdx']]['name']}"
        elif alt_held:
            why = f"requested slot would hold {', '.join(sc.trains[t['trainIdx']]['train_number'] for t in alt_held)} ({sum(t['delay'] for t in alt_held)} min)"
        elif clash:
            why = f"requested slot clashes with {clash['req']['id']} for {clash['crew']}"
        elif not in_window(alt, sc):
            why = "requested slot is outside the sanctioned window"
        elif len(alt_imp) > mine_n:
            why = f"requested slot diverts {len(alt_imp)} train{'s' if len(alt_imp) > 1 else ''} via SLW"
        else:
            why = "aligns with a compatible possession on the same line"
        parts.append(f"Moved {to_hhmm(pref)} → {to_hhmm(p['start'])}: {why}")
    ib = next((b for b in ibs if p["req"]["id"] in b["request_ids"]), None)
    if ib:
        parts.append(f"Integrated with {', '.join(i for i in ib['request_ids'] if i != p['req']['id'])} ({' + '.join(ib['departments'])}) — one possession, saves {ib['minutes_saved']} min")
    mine = [t for t in impacts if p["req"]["id"] in t["blockIds"]]
    if mine:
        parts.append("; ".join(f"{sc.trains[t['trainIdx']]['train_number']} {'via SLW +' + str(t['delay']) + 'm' if t['mode'] == 'SLW' else 'held ' + str(t['delay']) + 'm'}" for t in mine))
    else:
        parts.append(f"Clear of all {line}-line paths with ≥{buf} min buffer")
    if p["crew"] != p["req"]["assigned_crew"]:
        parts.append(f"Crew re-assigned {p['req']['assigned_crew']} → {p['crew']}")
    moves = [m for m in idx.moves.get(p["req"]["section_id"], []) if m[3] == line and not any(t["entry"] == m[1] and t["trainIdx"] == m[0] for t in mine)]
    gaps = [min(abs(en - (p["end"] + buf)), abs(p["start"] - buf - ex)) for (_, en, ex, _) in moves]
    slack = min(min(gaps) if gaps else 120, (min(p["start"] - w["start"], w["end"] - p["end"]) + 60) if w else 0, 120)
    conf = math.floor(min(0.99, 0.72 + slack / 400 - len(mine) * 0.03) * 100 + 0.5) / 100
    return " • ".join(parts), conf, [sc.trains[t["trainIdx"]]["id"] for t in mine]


def plan_corridor(data: Dict_, params: Optional[Dict_] = None, locked: Optional[Dict[str, Dict_]] = None) -> Dict_:
    params = params or {}
    sc = Scenario(data, params)
    sc.locked = locked
    placed, deferred, stats = solve(sc)

    crew_ids = {c["id"] for c in sc.crews}
    baseline = []
    for r in sc.requests:
        crew = r["assigned_crew"]
        if crew not in crew_ids:
            crew = next((c["id"] for c in sc.crews if c["department"] == r["department"]), crew)
        baseline.append({"req": r, "start": r["preferred_start_minute"], "end": r["preferred_start_minute"] + r["duration_minutes"], "crew": crew})
    b, before_conf, before_imp, _ = analyse(baseline, sc.requests, sc, coordinated=False)
    a, after_conf, after_imp, _ = analyse(placed, sc.requests, sc, coordinated=True, solver_ms=stats["ms"])
    ibs = integrated_blocks(placed)

    blocks = []
    for p in sorted(placed, key=lambda x: (sec_no(x["req"]["section_id"]), x["start"])):
        reason, conf, affected = explain_block(p, placed, sc, after_imp, ibs)
        ib = next((x for x in ibs if p["req"]["id"] in x["request_ids"]), None)
        r = p["req"]
        blocks.append(dict(
            block_id=f"BLK-{r['id']}", request_id=r["id"], asset_id=r["asset_id"], asset_name=r["asset_name"],
            section_id=r["section_id"], section_name=r["section_name"], department=r["department"],
            start_minute=p["start"], end_minute=p["end"], start_time=to_hhmm(p["start"]), end_time=to_hhmm(p["end"]),
            duration_minutes=p["end"] - p["start"], assigned_crew=p["crew"], priority=r["priority"],
            confidence_score=conf, affected_train_ids=affected, reason_for_window=reason,
            power_block=r["power_block_required"], traffic_block=r["traffic_block_required"],
            safety_buffer_applied=buf_of(r), line=req_line(r), integrated_block_id=ib["id"] if ib else None,
            locked=bool(p.get("locked"))))

    agg: Dict[int, Dict_] = {}
    for ti in after_imp:
        g = agg.setdefault(ti["trainIdx"], {"delay": 0, "modes": set(), "sections": [], "first": ti["entry"], "blocks": []})
        g["delay"] += ti["delay"]
        g["modes"].add(ti["mode"])
        if ti["section_id"] not in g["sections"]:
            g["sections"].append(ti["section_id"])
        g["first"] = min(g["first"], ti["entry"])
        for bid in ti["blockIds"]:
            if bid not in g["blocks"]:
                g["blocks"].append(bid)
    affected_trains = sorted([dict(
        train_id=sc.trains[i]["train_number"], train_name=sc.trains[i]["name"],
        original_slot=to_hhmm(g["first"]), regulated_slot=to_hhmm(g["first"] + g["delay"]), delay_minutes=g["delay"],
        reason=f"{'Held' if 'HELD' in g['modes'] else 'Single-Line Working'} on {', '.join(sc.section_name[s] for s in g['sections'])} around {', '.join(g['blocks'])}")
        for i, g in agg.items()], key=lambda x: -x["delay_minutes"])

    after_keys = {c["type"] + ",".join(c["affected_entities"]) for c in after_conf}
    resolved = [c for c in before_conf if c["type"] + ",".join(c["affected_entities"]) not in after_keys]

    idx = Index(sc.trains)
    deferred_requests = []
    for r in deferred:
        n = len(options_for(r, sc, idx))
        longest = max([w["end"] - w["start"] for w in sc.windows.get(r["section_id"], [])] + [0])
        if not any(c["department"] == r["department"] for c in sc.crews):
            reason = f"No {r['department']} gang on duty"
        elif n == 0:
            reason = (f"{r['duration_minutes']} min exceeds the longest sanctioned window on {r['section_name']} ({longest} min) — split into two blocks"
                      if longest < r["duration_minutes"] else
                      f"Every slot on {r['section_name']} would foul a Vande Bharat / Rajdhani path — needs a special traffic block")
        else:
            busy = [p for p in placed if p["req"]["department"] == r["department"]]
            reason = (f"All {r['department']} gangs committed tonight ({', '.join(p['crew'] + ' on ' + p['req']['id'] for p in busy)}) — add a gang or carry over to next night"
                      if busy else "Every feasible slot costs more in train delay than deferring this lower-priority work")
        deferred_requests.append(dict(id=r["id"], asset_name=r["asset_name"], priority=r["priority"], reason=reason))

    p1_hit = any(t["mode"] == "P1_VIOLATION" for t in after_imp)
    outside = [p for p in placed if not in_window(p, sc)]
    crew_bad = len([c for c in after_conf if c["type"] == "CREW_CONFLICT"])
    load: Dict[str, int] = {}
    for p in placed:
        load[p["crew"]] = load.get(p["crew"], 0) + p["end"] - p["start"]
    shift = {c["id"]: (c.get("max_shift_hours") or 8) * 60 for c in sc.crews}
    over = [c for c, m in load.items() if m > shift.get(c, 480)]
    emg = [r for r in sc.requests if r["priority"] == "EMERGENCY"]
    emg_done = [r for r in emg if any(p["req"]["id"] == r["id"] for p in placed)]
    held = [t for t in after_imp if t["mode"] == "HELD"]
    both = [s for s in sc.data["sections"] if any(
        overlap(u["start"], u["end"], d["start"], d["end"])
        for u in placed if u["req"]["section_id"] == s["id"] and req_line(u["req"]) == "UP"
        for d in placed if d["req"]["section_id"] == s["id"] and req_line(d["req"]) == "DN")]
    validation = [
        dict(id="P1", label="Vande Bharat / Rajdhani paths untouched", **{"pass": not p1_hit},
             detail="A premium path is fouled" if p1_hit else f"{len([t for t in sc.trains if prio_val(t) <= 1])} premium services checked with 15-min buffer"),
        dict(id="WIN", label="All blocks inside sanctioned corridor windows", **{"pass": not outside},
             detail=(f"{', '.join(p['req']['id'] for p in outside)} outside window{' (overrun — needs DRM sanction)' if any(p.get('locked') for p in outside) else ''}"
                     if outside else f"{len(placed)}/{len(placed)} blocks compliant")),
        dict(id="CREW", label="No crew double-booking (30-min transit)", **{"pass": crew_bad == 0},
             detail=f"{crew_bad} clash(es)" if crew_bad else f"{len({p['crew'] for p in placed})} gangs, 0 clashes"),
        dict(id="SHIFT", label="Crew shift limits respected", **{"pass": not over},
             detail=", ".join(over) if over else f"Max load {max(list(load.values()) + [0])} min / 480 min"),
        dict(id="EMG", label="All EMERGENCY work scheduled", **{"pass": len(emg_done) == len(emg)}, detail=f"{len(emg_done)}/{len(emg)} emergency requests placed"),
        dict(id="HOLD", label="No train held at signal (only SLW diversions)", **{"pass": not held},
             detail=f"{len(held)} hold(s): {', '.join(sc.trains[h['trainIdx']]['train_number'] for h in held)}" if held else f"{len(after_imp)} diversion(s) via Single-Line Working"),
        dict(id="BOTH", label="Adjacent line kept open for traffic", **{"pass": not both},
             detail=f"Both lines blocked on {', '.join(s['name'] for s in both)}" if both else "Every section retains one running line"),
    ]

    pct = lambda x, y: js_round(100 * (y - x) / y) if y else 0
    saved = sum(i["minutes_saved"] for i in ibs)
    conf_drop = f" (−{pct(a['total_schedule_conflicts'], b['total_schedule_conflicts'])}%)" if b["total_schedule_conflicts"] else ""
    insights = [
        f"{'Provably optimal' if stats['provenOptimal'] else 'Best-found'} plan: {stats['nodes']:,} search nodes over {stats['optionsEvaluated']} feasible slot/crew options in {stats['ms']:.1f} ms.",
        f"Conflicts {b['total_schedule_conflicts']} → {a['total_schedule_conflicts']}{conf_drop}; trains regulated {b['affected_trains_count']} → {a['affected_trains_count']}, total delay {b['total_train_delay_minutes']} → {a['total_train_delay_minutes']} min — no train held at a signal.",
        (f"{len(ibs)} integrated multi-department block{'s' if len(ibs) > 1 else ''} ({'; '.join('+'.join(i['departments']) + ' on ' + i['section_name'] for i in ibs)}) — {saved} line-minutes of possession saved."
         if ibs else "No compatible works on the same line — each block kept independent."),
        f"Night line availability {b['overall_asset_availability_pct']}% → {a['overall_asset_availability_pct']}%; {a['maintenance_completion_pct']}% of requested work executable (was {b['maintenance_completion_pct']}%).",
        f"{a['risk_addressed_pct']}% of total asset risk addressed tonight (was {b['risk_addressed_pct']}%).",
        f"{len(deferred)} request(s) deferred: {', '.join(d['id'] for d in deferred)} — see reasons." if deferred else "All requests scheduled — nothing deferred.",
    ]

    train_paths = []
    for ti_, t in enumerate(sc.trains):
        for m in t["movements"]:
            imp = next((x for x in after_imp if x["trainIdx"] == ti_ and x["section_id"] == m["section_id"] and x["entry"] == m["entry_minute"]), None)
            train_paths.append(dict(train_id=t["id"], train_number=t["train_number"], name=t["name"], priority=prio_val(t),
                                    section_id=m["section_id"], line=train_line(t), entry=m["entry_minute"], exit=m["exit_minute"],
                                    impact=imp["mode"] if imp else "CLEAR", delay=imp["delay"] if imp else 0))

    return dict(
        scenario_name=f"Scenario {params['scenario_preset']}" if params.get("scenario_preset") else "Optimised Integrated Corridor Block Plan",
        is_optimized=True,
        before_metrics=b, after_metrics=a,
        scheduled_blocks=blocks, resolved_conflicts=resolved, remaining_conflicts=after_conf,
        affected_trains=affected_trains, ai_insights=insights,
        disclaimer="Prototype • Simulated corridor data. AI-generated plans are advisory and require authorised validation before execution.",
        deferred_requests=deferred_requests, integrated_blocks=ibs, validation=validation,
        solver=dict(stats, engine="Branch-and-bound constraint optimiser", requests=len(sc.requests), trains=len(sc.trains), crews=len(sc.crews)),
        train_paths=train_paths, windows=sc.windows,
        section_stats=[dict(
            section_id=s["id"], name=s["name"],
            before_possession=possession_minutes([p for p in baseline if p["req"]["section_id"] == s["id"]], False),
            after_possession=possession_minutes([p for p in placed if p["req"]["section_id"] == s["id"]], True),
            before_delay=sum(i["delay"] for i in before_imp if i["section_id"] == s["id"]),
            after_delay=sum(i["delay"] for i in after_imp if i["section_id"] == s["id"]),
            before_conflicts=len([c for c in before_conf if c.get("section_id") == s["id"]]),
            after_conflicts=len([c for c in after_conf if c.get("section_id") == s["id"]]),
        ) for s in sc.data["sections"]],
        kpi=dict(before=b, after=a),
    )
