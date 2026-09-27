import io
import csv
from typing import List, Dict, Any
from app.models import OptimizationResult, ScheduledBlock

def generate_csv_report(result: OptimizationResult) -> str:
    """
    Generates a structured CSV report for export.
    """
    output = io.StringIO()
    writer = csv.writer(output)

    # Header section
    writer.writerow(["RAILOPT AI - AUTOMATIC BLOCK PLANNING & ASSET AVAILABILITY REPORT"])
    writer.writerow(["CORRIDOR", "Northern / North-Central Railway (New Delhi – Ghaziabad – Kanpur – Varanasi)"])
    writer.writerow(["PLAN STATUS", "OPTIMIZED (Google OR-Tools CP-SAT + AI Risk Engine)"])
    writer.writerow(["DISCLAIMER", "Simulated Railway Operations Data. Requires authorized operational validation before execution."])
    writer.writerow([])

    # KPI summary
    writer.writerow(["KEY PERFORMANCE METRIC", "BEFORE AI (MANUAL)", "AFTER AI (OPTIMIZED)", "IMPROVEMENT"])
    writer.writerow([
        "Schedule Conflicts", 
        result.before_metrics.total_schedule_conflicts, 
        result.after_metrics.total_schedule_conflicts,
        f"-{result.before_metrics.total_schedule_conflicts - result.after_metrics.total_schedule_conflicts}"
    ])
    writer.writerow([
        "Affected Train Movements", 
        result.before_metrics.affected_trains_count, 
        result.after_metrics.affected_trains_count,
        f"-{result.before_metrics.affected_trains_count - result.after_metrics.affected_trains_count}"
    ])
    writer.writerow([
        "Overall Asset Availability (%)", 
        f"{result.before_metrics.overall_asset_availability_pct}%", 
        f"{result.after_metrics.overall_asset_availability_pct}%",
        f"+{round(result.after_metrics.overall_asset_availability_pct - result.before_metrics.overall_asset_availability_pct, 1)}%"
    ])
    writer.writerow([
        "Average Train Delay (min)", 
        f"{result.before_metrics.average_train_delay_minutes}m", 
        f"{result.after_metrics.average_train_delay_minutes}m",
        f"-{round(result.before_metrics.average_train_delay_minutes - result.after_metrics.average_train_delay_minutes, 1)}m"
    ])
    writer.writerow([
        "Maintenance Plan Completion (%)", 
        f"{result.before_metrics.maintenance_completion_pct}%", 
        f"{result.after_metrics.maintenance_completion_pct}%",
        f"+{round(result.after_metrics.maintenance_completion_pct - result.before_metrics.maintenance_completion_pct, 1)}%"
    ])
    writer.writerow([])

    # Scheduled Blocks Table
    writer.writerow(["SCHEDULED CORRIDOR MAINTENANCE BLOCKS"])
    writer.writerow([
        "Block ID", "Request ID", "Section", "Asset Description", 
        "Department", "Start Time", "End Time", "Duration (min)", "Crew Assigned", "Priority", "Block Justification"
    ])
    for blk in result.scheduled_blocks:
        writer.writerow([
            blk.block_id,
            blk.request_id,
            blk.section_name,
            blk.asset_name,
            blk.department.value,
            blk.start_time,
            blk.end_time,
            blk.duration_minutes,
            blk.assigned_crew,
            blk.priority.value,
            blk.reason_for_window
        ])

    return output.getvalue()

def get_system_references() -> List[Dict[str, str]]:
    return [
        {
            "title": "Indian Railways Operating Manual (IR-OM)",
            "authority": "Railway Board, Ministry of Railways, Govt of India",
            "section": "Chapter 9: Maintenance Blocks, Corridor Blocks, and Integrated Shadow Blocks",
            "relevance": "Defines regulatory procedures for traffic possession, power isolation, and joint multi-department corridor blocks."
        },
        {
            "title": "Track Management System (CRIS TMS)",
            "authority": "Centre for Railway Information Systems (CRIS)",
            "section": "Asset Health Monitoring & Ultrasonic Flaw Detection (USFD) Module",
            "relevance": "Source schema design for track degradation rates, Gross Million Tonnes (GMT) loading, and weld defect records."
        },
        {
            "title": "Traction Distribution Management System (TDMS)",
            "authority": "CRIS / Indian Railways Electrical Engineering",
            "section": "OHE Catenary & Section Insulator Maintenance Guidelines",
            "relevance": "Operational guidelines for 25kV AC power blocks, isolator cut-offs, and tower wagon deployment."
        },
        {
            "title": "Integrated Train Scheduling and Preventive Maintenance on High-Speed Rail Corridors",
            "authority": "Transportation Research Part B: Methodological (Academic Literature)",
            "section": "Mixed-Integer Linear Programming (MILP) & Constraint Programming Formulations",
            "relevance": "Mathematical framework for non-overlapping interval scheduling and multi-objective weighted train delay penalties."
        }
    ]
