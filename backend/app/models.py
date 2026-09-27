from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from enum import Enum

class AssetType(str, Enum):
    TRACK = "TRACK"
    SIGNAL = "SIGNAL"
    OHE = "OHE"
    POINT_CROSSING = "POINT & CROSSING"
    BRIDGE = "BRIDGE"

class AssetCriticality(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"

class AssetStatus(str, Enum):
    HEALTHY = "HEALTHY"
    ATTENTION_REQUIRED = "ATTENTION_REQUIRED"
    CRITICAL_ACTION = "CRITICAL_ACTION"
    UNDER_MAINTENANCE = "UNDER_MAINTENANCE"

class Department(str, Enum):
    ENGINEERING = "Engineering"
    ST = "S&T"
    TRD_OHE = "TRD/OHE"
    OPERATIONS = "Operations"

class RequestPriority(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    EMERGENCY = "EMERGENCY"

class RequestStatus(str, Enum):
    PENDING = "PENDING"
    SCHEDULED = "SCHEDULED"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    DEFERRED = "DEFERRED"

class TrainType(str, Enum):
    VANDE_BHARAT = "Vande Bharat"
    RAJDHANI = "Rajdhani Express"
    SHATABDI = "Shatabdi Express"
    SUPERFAST = "Superfast Mail/Exp"
    PASSENGER = "Passenger Local"
    FREIGHT = "Freight / Container"

class TrainPriority(int, Enum):
    CRITICAL = 1  # Vande Bharat, Rajdhani
    HIGH = 2      # Shatabdi, Superfast
    MEDIUM = 3    # Regular Express
    LOW = 4       # Passenger
    FREIGHT = 5   # Freight

class TrainStatus(str, Enum):
    ON_TIME = "ON_TIME"
    DELAYED = "DELAYED"
    REROUTED = "REROUTED"
    REGULATED = "REGULATED"

# Models
class TrackSection(BaseModel):
    id: str
    name: str
    from_station: str
    to_station: str
    length_km: float
    max_speed_kmph: int
    line_type: str = "Double Line"
    electrified: bool = True
    corridor_category: str = "High Density Network (HDN-1)"
    allowed_maintenance_windows: List[Dict[str, str]] = [] # e.g. [{"start": "01:00", "end": "05:00"}]
    current_health_score: float = 85.0

class Asset(BaseModel):
    id: str
    name: str
    section_id: str
    section_name: str
    type: AssetType
    health_score: float = Field(..., ge=0, le=100)
    criticality: AssetCriticality
    last_inspection: str
    next_maintenance_due: str
    estimated_duration_hours: float
    status: AssetStatus
    risk_score: float = 0.0 # Calculated by AI Risk Engine
    operational_impact: str = "MEDIUM" # LOW, MEDIUM, HIGH
    failure_risk: str = "MEDIUM"
    degradation_rate_per_month: float = 2.5
    tonnage_gmt: float = 45.0 # Gross Million Tonnes

class MaintenanceRequest(BaseModel):
    id: str
    asset_id: str
    asset_name: str
    section_id: str
    section_name: str
    department: Department
    priority: RequestPriority
    duration_minutes: int
    preferred_window: str # "01:30 - 04:30"
    preferred_start_minute: int = 90  # minutes from 00:00
    deadline_date: str
    assigned_crew: str
    status: RequestStatus = RequestStatus.PENDING
    description: str
    safety_buffer_minutes: int = 15
    track_possession_required: bool = True
    power_block_required: bool = False
    traffic_block_required: bool = True
    line: str = "DN"  # "UP" or "DN" line of the double-line section

class TrainMovement(BaseModel):
    section_id: str
    entry_minute: int  # minutes from 00:00 (0 to 1440)
    exit_minute: int
    entry_time: str
    exit_time: str

class Train(BaseModel):
    id: str
    train_number: str
    name: str
    type: TrainType
    origin: str
    destination: str
    departure_time: str
    arrival_time: str
    priority: TrainPriority
    status: TrainStatus = TrainStatus.ON_TIME
    affected_by_block: bool = False
    delay_minutes: int = 0
    route_sections: List[str] # section_ids in order
    movements: List[TrainMovement] = []

class Crew(BaseModel):
    id: str
    name: str
    department: Department
    base_station: str
    max_shift_hours: float = 8.0
    is_available: bool = True
    active_assignments: List[str] = []

class ScheduledBlock(BaseModel):
    block_id: str
    request_id: str
    asset_id: str
    asset_name: str
    section_id: str
    section_name: str
    department: Department
    start_minute: int
    end_minute: int
    start_time: str
    end_time: str
    duration_minutes: int
    assigned_crew: str
    priority: RequestPriority
    confidence_score: float = 0.95
    affected_train_ids: List[str] = []
    reason_for_window: str
    power_block: bool = False
    traffic_block: bool = True
    safety_buffer_applied: int = 15

class ConflictType(str, Enum):
    TRAIN_CONFLICT = "TRAIN_CONFLICT"
    ASSET_CONFLICT = "ASSET_CONFLICT"
    CREW_CONFLICT = "CREW_CONFLICT"
    TIME_CONFLICT = "TIME_CONFLICT"
    SAFETY_CONFLICT = "SAFETY_CONFLICT"
    PRIORITY_CONFLICT = "PRIORITY_CONFLICT"

class ConflictSeverity(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"

class Conflict(BaseModel):
    id: str
    type: ConflictType
    severity: ConflictSeverity
    section_id: Optional[str] = None
    section_name: Optional[str] = None
    affected_entities: List[str] = []
    description: str
    suggested_resolution: str
    time_window: Optional[str] = None

class OptimizationMetrics(BaseModel):
    total_schedule_conflicts: int
    affected_trains_count: int
    overall_asset_availability_pct: float
    critical_asset_availability_pct: float
    maintenance_completion_pct: float
    average_train_delay_minutes: float
    total_maintenance_hours_scheduled: float
    safety_compliance_score_pct: float
    solver_execution_time_ms: float

class OptimizationResult(BaseModel):
    scenario_name: str = "Standard High-Density Schedule"
    is_optimized: bool = True
    before_metrics: OptimizationMetrics
    after_metrics: OptimizationMetrics
    scheduled_blocks: List[ScheduledBlock]
    resolved_conflicts: List[Conflict]
    remaining_conflicts: List[Conflict]
    affected_trains: List[Dict[str, Any]]
    ai_insights: List[str]
    disclaimer: str = "Prototype • Simulated Railway Operations Data. AI-generated plans require authorized operational validation before execution."

class WhatIfParameters(BaseModel):
    available_block_window_multiplier: float = 1.0  # e.g. 0.8 = reduced windows, 1.2 = expanded
    train_traffic_level_pct: int = 100               # 80%, 100%, 120%, 150%
    maintenance_requests_count: int = 8
    maintenance_duration_multiplier: float = 1.0     # 1.0 = normal, 1.5 = overrun (+50%)
    crew_availability_count: int = 4
    emergency_request_priority: Optional[str] = None # None, "HIGH", "EMERGENCY"
    scenario_preset: Optional[str] = None            # "A", "B", "C", "D", "E"

class DisruptionPayload(BaseModel):
    block_id: str
    additional_minutes: int = 90
    reason: str = "OHE Mast Structural Anchor Replacement Overrun"
