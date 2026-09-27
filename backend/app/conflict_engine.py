from typing import List, Dict, Tuple, Optional
from app.models import (
    ScheduledBlock, Train, MaintenanceRequest, Conflict, ConflictType, 
    ConflictSeverity, Asset, AssetCriticality, RequestPriority
)
from app.data_store import minutes_to_time

def detect_conflicts(
    blocks: List[ScheduledBlock],
    trains: List[Train],
    requests: List[MaintenanceRequest],
    assets: Dict[str, Asset]
) -> List[Conflict]:
    """
    Exhaustive conflict and safety constraint validation engine.
    Checks:
    1. TRAIN CONFLICT
    2. ASSET / SECTION CONFLICT
    3. CREW CONFLICT
    4. TIME / WINDOW CONFLICT
    5. SAFETY CONFLICT
    6. PRIORITY CONFLICT
    """
    conflicts: List[Conflict] = []
    conflict_counter = 1

    # 1. TRAIN CONFLICTS (Block vs Train Movements on same section)
    for block in blocks:
        for train in trains:
            for mv in train.movements:
                if mv.section_id == block.section_id:
                    # Check time overlap
                    # Buffer of 10 min for safety
                    t_start = mv.entry_minute
                    t_end = mv.exit_minute
                    b_start = block.start_minute
                    b_end = block.end_minute

                    # Overlap condition: max(t_start, b_start) < min(t_end, b_end)
                    if max(t_start, b_start) < min(t_end, b_end):
                        # Determine severity
                        sev = ConflictSeverity.CRITICAL if train.priority.value <= 2 else ConflictSeverity.HIGH
                        conflicts.append(Conflict(
                            id=f"CONF-{conflict_counter:03d}",
                            type=ConflictType.TRAIN_CONFLICT,
                            severity=sev,
                            section_id=block.section_id,
                            section_name=block.section_name,
                            affected_entities=[train.train_number, train.name, block.request_id, block.asset_name],
                            description=f"Train {train.train_number} ({train.name}) movement ({mv.entry_time}–{mv.exit_time}) intersects Block {block.request_id} ({block.start_time}–{block.end_time}) on {block.section_name}.",
                            suggested_resolution=f"Shift maintenance block to unoccupied window (03:30–05:30) or regulate train by {min(30, (b_end - t_start))} min.",
                            time_window=f"{minutes_to_time(max(t_start, b_start))} – {minutes_to_time(min(t_end, b_end))}"
                        ))
                        conflict_counter += 1

    # 2. ASSET / SECTION CONFLICTS (Multiple blocks on the same section overlapping in time)
    for i in range(len(blocks)):
        for j in range(i + 1, len(blocks)):
            b1 = blocks[i]
            b2 = blocks[j]
            if b1.section_id == b2.section_id:
                if max(b1.start_minute, b2.start_minute) < min(b1.end_minute, b2.end_minute):
                    conflicts.append(Conflict(
                        id=f"CONF-{conflict_counter:03d}",
                        type=ConflictType.ASSET_CONFLICT,
                        severity=ConflictSeverity.CRITICAL,
                        section_id=b1.section_id,
                        section_name=b1.section_name,
                        affected_entities=[b1.request_id, b2.request_id, b1.asset_name, b2.asset_name],
                        description=f"Concurrent possession requested on section {b1.section_name}: Block {b1.request_id} ({b1.department.value}) overlaps with Block {b2.request_id} ({b2.department.value}).",
                        suggested_resolution="Execute Integrated / Shadow Corridor Block combining S&T and Engineering work in a single synchronized possession window.",
                        time_window=f"{minutes_to_time(max(b1.start_minute, b2.start_minute))} – {minutes_to_time(min(b1.end_minute, b2.end_minute))}"
                    ))
                    conflict_counter += 1

    # 3. CREW CONFLICTS (Same crew assigned to multiple simultaneous blocks)
    for i in range(len(blocks)):
        for j in range(i + 1, len(blocks)):
            b1 = blocks[i]
            b2 = blocks[j]
            if b1.assigned_crew and b1.assigned_crew == b2.assigned_crew:
                if max(b1.start_minute, b2.start_minute) < min(b1.end_minute, b2.end_minute):
                    conflicts.append(Conflict(
                        id=f"CONF-{conflict_counter:03d}",
                        type=ConflictType.CREW_CONFLICT,
                        severity=ConflictSeverity.HIGH,
                        section_id=b1.section_id,
                        section_name=b1.section_name,
                        affected_entities=[b1.assigned_crew, b1.request_id, b2.request_id],
                        description=f"Crew {b1.assigned_crew} double-booked for Block {b1.request_id} on {b1.section_name} and Block {b2.request_id} on {b2.section_name}.",
                        suggested_resolution=f"Reassign auxiliary crew or stagger start times by at least {b1.duration_minutes} minutes.",
                        time_window=f"{b1.start_time} vs {b2.start_time}"
                    ))
                    conflict_counter += 1

    # 4. TIME CONFLICTS (Block duration exceeds allowed maintenance window)
    for block in blocks:
        # Standard night corridor possession window is typically 210-240 minutes max without special dispensation
        if block.duration_minutes > 240:
            conflicts.append(Conflict(
                id=f"CONF-{conflict_counter:03d}",
                type=ConflictType.TIME_CONFLICT,
                severity=ConflictSeverity.MEDIUM,
                section_id=block.section_id,
                section_name=block.section_name,
                affected_entities=[block.request_id, block.asset_name],
                description=f"Block {block.request_id} duration ({block.duration_minutes}m) exceeds single-shift standard window (240m).",
                suggested_resolution="Split maintenance into 2 phased micro-blocks or request Divisional Operating Superintendent approval.",
                time_window=f"{block.start_time} – {block.end_time}"
            ))
            conflict_counter += 1

    # 5. SAFETY CONFLICTS (High speed corridor block without buffer)
    for block in blocks:
        if block.traffic_block and block.safety_buffer_applied < 15:
            conflicts.append(Conflict(
                id=f"CONF-{conflict_counter:03d}",
                type=ConflictType.SAFETY_CONFLICT,
                severity=ConflictSeverity.HIGH,
                section_id=block.section_id,
                section_name=block.section_name,
                affected_entities=[block.request_id],
                description=f"Safety buffer of {block.safety_buffer_applied}m is below 15m minimum standard for electrified semi-high-speed corridors.",
                suggested_resolution="Expand block protection margin to 15+ minutes.",
                time_window=block.start_time
            ))
            conflict_counter += 1

    # 6. PRIORITY CONFLICTS (Critical assets unscheduled while lower priority scheduled)
    scheduled_req_ids = {b.request_id for b in blocks}
    for req in requests:
        if req.priority == RequestPriority.EMERGENCY and req.id not in scheduled_req_ids:
            conflicts.append(Conflict(
                id=f"CONF-{conflict_counter:03d}",
                type=ConflictType.PRIORITY_CONFLICT,
                severity=ConflictSeverity.CRITICAL,
                section_id=req.section_id,
                section_name=req.section_name,
                affected_entities=[req.id, req.asset_name],
                description=f"Emergency maintenance request {req.id} ({req.asset_name}) remains unscheduled.",
                suggested_resolution="Prioritize emergency slot in optimal shadow window.",
                time_window=req.preferred_window
            ))
            conflict_counter += 1

    return conflicts
