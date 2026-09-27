export type AssetType = 'TRACK' | 'SIGNAL' | 'OHE' | 'POINT & CROSSING' | 'BRIDGE';

export type AssetCriticality = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type AssetStatus = 'HEALTHY' | 'ATTENTION_REQUIRED' | 'CRITICAL_ACTION' | 'UNDER_MAINTENANCE';

export type Department = 'Engineering' | 'S&T' | 'TRD/OHE' | 'Operations';

export type RequestPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'EMERGENCY';

export type RequestStatus = 'PENDING' | 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'DEFERRED';

export type TrainType = 'Vande Bharat' | 'Rajdhani Express' | 'Shatabdi Express' | 'Superfast Mail/Exp' | 'Passenger Local' | 'Freight / Container';

export type TrainStatus = 'ON_TIME' | 'DELAYED' | 'REROUTED' | 'REGULATED';

export interface TrackSection {
  id: string;
  name: string;
  from_station: string;
  to_station: string;
  length_km: number;
  max_speed_kmph: number;
  line_type: string;
  electrified: boolean;
  corridor_category: string;
  allowed_maintenance_windows: Array<{ start: string; end: string }>;
  current_health_score: number;
}

export interface Asset {
  id: string;
  name: string;
  section_id: string;
  section_name: string;
  type: AssetType;
  health_score: number;
  criticality: AssetCriticality;
  last_inspection: string;
  next_maintenance_due: string;
  estimated_duration_hours: number;
  status: AssetStatus;
  risk_score: number;
  operational_impact: 'LOW' | 'MEDIUM' | 'HIGH';
  failure_risk: 'LOW' | 'MEDIUM' | 'HIGH';
  degradation_rate_per_month: number;
  tonnage_gmt: number;
}

export interface MaintenanceRequest {
  id: string;
  asset_id: string;
  asset_name: string;
  section_id: string;
  section_name: string;
  department: Department;
  priority: RequestPriority;
  duration_minutes: number;
  preferred_window: string;
  preferred_start_minute: number;
  deadline_date: string;
  assigned_crew: string;
  status: RequestStatus;
  description: string;
  safety_buffer_minutes: number;
  track_possession_required: boolean;
  power_block_required: boolean;
  traffic_block_required: boolean;
  line?: 'UP' | 'DN';
}

export interface TrainMovement {
  section_id: string;
  entry_minute: number;
  exit_minute: number;
  entry_time: string;
  exit_time: string;
}

export interface Train {
  id: string;
  train_number: string;
  name: string;
  type: TrainType;
  origin: string;
  destination: string;
  departure_time: string;
  arrival_time: string;
  priority: number;
  status: TrainStatus;
  affected_by_block: boolean;
  delay_minutes: number;
  route_sections: string[];
  movements: TrainMovement[];
}

export interface Crew {
  id: string;
  name: string;
  department: Department;
  base_station: string;
  max_shift_hours: number;
  is_available: boolean;
  active_assignments: string[];
}

export interface ScheduledBlock {
  block_id: string;
  request_id: string;
  asset_id: string;
  asset_name: string;
  section_id: string;
  section_name: string;
  department: Department;
  start_minute: number;
  end_minute: number;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  assigned_crew: string;
  priority: RequestPriority;
  confidence_score: number;
  affected_train_ids: string[];
  reason_for_window: string;
  power_block: boolean;
  traffic_block: boolean;
  safety_buffer_applied: number;
  line?: 'UP' | 'DN';
  integrated_block_id?: string;
  locked?: boolean;
}

export type ConflictType = 'TRAIN_CONFLICT' | 'ASSET_CONFLICT' | 'CREW_CONFLICT' | 'TIME_CONFLICT' | 'SAFETY_CONFLICT' | 'PRIORITY_CONFLICT';

export type ConflictSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface Conflict {
  id: string;
  type: ConflictType;
  severity: ConflictSeverity;
  section_id?: string;
  section_name?: string;
  affected_entities: string[];
  description: string;
  suggested_resolution: string;
  time_window?: string;
}

export interface OptimizationMetrics {
  total_schedule_conflicts: number;
  affected_trains_count: number;
  overall_asset_availability_pct: number;
  critical_asset_availability_pct: number;
  maintenance_completion_pct: number;
  average_train_delay_minutes: number;
  total_maintenance_hours_scheduled: number;
  safety_compliance_score_pct: number;
  solver_execution_time_ms: number;
}

export interface OptimizationResult {
  scenario_name: string;
  is_optimized: boolean;
  before_metrics: OptimizationMetrics;
  after_metrics: OptimizationMetrics;
  scheduled_blocks: ScheduledBlock[];
  resolved_conflicts: Conflict[];
  remaining_conflicts: Conflict[];
  affected_trains: Array<{
    train_id: string;
    train_name: string;
    original_slot: string;
    regulated_slot: string;
    delay_minutes: number;
    reason: string;
  }>;
  ai_insights: string[];
  disclaimer: string;
}

export interface WhatIfParameters {
  available_block_window_multiplier: number;
  train_traffic_level_pct: number;
  maintenance_requests_count: number;
  maintenance_duration_multiplier: number;
  crew_availability_count: number;
  emergency_request_priority?: string;
  scenario_preset?: string;
}

export type ActiveTab = 
  | 'dashboard'
  | 'trains'
  | 'assets'
  | 'requests'
  | 'planner'
  | 'results'
  | 'whatif'
  | 'reports';
