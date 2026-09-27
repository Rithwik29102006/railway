from typing import List, Dict
from app.models import (
    TrackSection, Asset, AssetType, AssetCriticality, AssetStatus,
    MaintenanceRequest, Department, RequestPriority, RequestStatus,
    Train, TrainType, TrainPriority, TrainStatus, TrainMovement,
    Crew
)

def get_initial_sections() -> List[TrackSection]:
    return [
        TrackSection(
            id="SEC-01",
            name="New Delhi – Ghaziabad",
            from_station="New Delhi (NDLS)",
            to_station="Ghaziabad (GZB)",
            length_km=25.6,
            max_speed_kmph=130,
            allowed_maintenance_windows=[{"start": "01:00", "end": "04:30"}, {"start": "13:00", "end": "14:30"}],
            current_health_score=82.0
        ),
        TrackSection(
            id="SEC-02",
            name="Ghaziabad – Meerut",
            from_station="Ghaziabad (GZB)",
            to_station="Meerut City (MTC)",
            length_km=48.2,
            max_speed_kmph=110,
            allowed_maintenance_windows=[{"start": "00:30", "end": "04:00"}, {"start": "11:30", "end": "13:00"}],
            current_health_score=78.5
        ),
        TrackSection(
            id="SEC-03",
            name="Meerut – Aligarh",
            from_station="Meerut City (MTC)",
            to_station="Aligarh Jn (ALJN)",
            length_km=112.4,
            max_speed_kmph=120,
            allowed_maintenance_windows=[{"start": "01:30", "end": "05:00"}, {"start": "14:00", "end": "15:30"}],
            current_health_score=68.0
        ),
        TrackSection(
            id="SEC-04",
            name="Aligarh – Tundla",
            from_station="Aligarh Jn (ALJN)",
            to_station="Tundla Jn (TDL)",
            length_km=78.0,
            max_speed_kmph=130,
            allowed_maintenance_windows=[{"start": "01:00", "end": "04:30"}, {"start": "12:00", "end": "13:30"}],
            current_health_score=86.0
        ),
        TrackSection(
            id="SEC-05",
            name="Tundla – Kanpur",
            from_station="Tundla Jn (TDL)",
            to_station="Kanpur Central (CNB)",
            length_km=228.0,
            max_speed_kmph=130,
            allowed_maintenance_windows=[{"start": "02:00", "end": "05:30"}, {"start": "14:30", "end": "16:00"}],
            current_health_score=74.0
        ),
        TrackSection(
            id="SEC-06",
            name="Kanpur – Etawah",
            from_station="Kanpur Central (CNB)",
            to_station="Etawah Jn (ETW)",
            length_km=139.0,
            max_speed_kmph=130,
            allowed_maintenance_windows=[{"start": "00:45", "end": "04:15"}, {"start": "11:00", "end": "12:30"}],
            current_health_score=89.0
        ),
        TrackSection(
            id="SEC-07",
            name="Etawah – Prayagraj",
            from_station="Etawah Jn (ETW)",
            to_station="Prayagraj Jn (PRYJ)",
            length_km=280.0,
            max_speed_kmph=130,
            allowed_maintenance_windows=[{"start": "01:15", "end": "04:45"}, {"start": "13:30", "end": "15:00"}],
            current_health_score=71.5
        ),
        TrackSection(
            id="SEC-08",
            name="Prayagraj – Varanasi",
            from_station="Prayagraj Jn (PRYJ)",
            to_station="Varanasi Cantt (BSB)",
            length_km=124.5,
            max_speed_kmph=110,
            allowed_maintenance_windows=[{"start": "01:45", "end": "05:15"}, {"start": "12:30", "end": "14:00"}],
            current_health_score=80.0
        ),
    ]

def get_initial_assets() -> List[Asset]:
    return [
        Asset(
            id="AST-TRK-01",
            name="Continuous Welded Rail (CWR 60kg)",
            section_id="SEC-01",
            section_name="New Delhi – Ghaziabad",
            type=AssetType.TRACK,
            health_score=62.0,
            criticality=AssetCriticality.HIGH,
            last_inspection="2026-08-20",
            next_maintenance_due="2026-09-08",
            estimated_duration_hours=2.5,
            status=AssetStatus.ATTENTION_REQUIRED,
            operational_impact="HIGH",
            failure_risk="MEDIUM",
            tonnage_gmt=52.0
        ),
        Asset(
            id="AST-SIG-02",
            name="Electronic Interlocking (EI) Axle Counter",
            section_id="SEC-01",
            section_name="New Delhi – Ghaziabad",
            type=AssetType.SIGNAL,
            health_score=88.0,
            criticality=AssetCriticality.CRITICAL,
            last_inspection="2026-08-30",
            next_maintenance_due="2026-09-25",
            estimated_duration_hours=1.5,
            status=AssetStatus.HEALTHY,
            operational_impact="HIGH",
            failure_risk="LOW",
            tonnage_gmt=52.0
        ),
        Asset(
            id="AST-OHE-03",
            name="25kV AC Overhead Catenary & Contact Wire",
            section_id="SEC-02",
            section_name="Ghaziabad – Meerut",
            type=AssetType.OHE,
            health_score=71.0,
            criticality=AssetCriticality.HIGH,
            last_inspection="2026-08-15",
            next_maintenance_due="2026-09-09",
            estimated_duration_hours=3.0,
            status=AssetStatus.ATTENTION_REQUIRED,
            operational_impact="HIGH",
            failure_risk="MEDIUM",
            tonnage_gmt=38.0
        ),
        Asset(
            id="AST-PNC-04",
            name="1-in-12 Curved Switch Point & Crossing",
            section_id="SEC-03",
            section_name="Meerut – Aligarh",
            type=AssetType.POINT_CROSSING,
            health_score=54.0,
            criticality=AssetCriticality.CRITICAL,
            last_inspection="2026-08-10",
            next_maintenance_due="2026-09-07",
            estimated_duration_hours=3.5,
            status=AssetStatus.CRITICAL_ACTION,
            operational_impact="HIGH",
            failure_risk="HIGH",
            tonnage_gmt=48.0
        ),
        Asset(
            id="AST-SIG-05",
            name="Auto Block Signal Relay Rack (AB-44)",
            section_id="SEC-03",
            section_name="Meerut – Aligarh",
            type=AssetType.SIGNAL,
            health_score=60.0,
            criticality=AssetCriticality.HIGH,
            last_inspection="2026-08-18",
            next_maintenance_due="2026-09-07",
            estimated_duration_hours=2.0,
            status=AssetStatus.ATTENTION_REQUIRED,
            operational_impact="HIGH",
            failure_risk="HIGH",
            tonnage_gmt=48.0
        ),
        Asset(
            id="AST-BDG-06",
            name="Ganga Canal Steel Girder Bridge #114",
            section_id="SEC-04",
            section_name="Aligarh – Tundla",
            type=AssetType.BRIDGE,
            health_score=79.0,
            criticality=AssetCriticality.MEDIUM,
            last_inspection="2026-08-01",
            next_maintenance_due="2026-09-15",
            estimated_duration_hours=4.0,
            status=AssetStatus.HEALTHY,
            operational_impact="MEDIUM",
            failure_risk="LOW",
            tonnage_gmt=45.0
        ),
        Asset(
            id="AST-TRK-07",
            name="Deep Screening Track Bed Section Km 342",
            section_id="SEC-05",
            section_name="Tundla – Kanpur",
            type=AssetType.TRACK,
            health_score=58.0,
            criticality=AssetCriticality.HIGH,
            last_inspection="2026-08-12",
            next_maintenance_due="2026-09-07",
            estimated_duration_hours=3.0,
            status=AssetStatus.ATTENTION_REQUIRED,
            operational_impact="HIGH",
            failure_risk="MEDIUM",
            tonnage_gmt=65.0
        ),
        Asset(
            id="AST-OHE-08",
            name="Section Insulator & Isolator Unit (TRD)",
            section_id="SEC-05",
            section_name="Tundla – Kanpur",
            type=AssetType.OHE,
            health_score=64.0,
            criticality=AssetCriticality.HIGH,
            last_inspection="2026-08-14",
            next_maintenance_due="2026-09-08",
            estimated_duration_hours=2.5,
            status=AssetStatus.ATTENTION_REQUIRED,
            operational_impact="HIGH",
            failure_risk="MEDIUM",
            tonnage_gmt=65.0
        ),
        Asset(
            id="AST-SIG-09",
            name="Solid State Interlocking (SSI) Card Frame",
            section_id="SEC-06",
            section_name="Kanpur – Etawah",
            type=AssetType.SIGNAL,
            health_score=92.0,
            criticality=AssetCriticality.CRITICAL,
            last_inspection="2026-08-28",
            next_maintenance_due="2026-09-30",
            estimated_duration_hours=1.5,
            status=AssetStatus.HEALTHY,
            operational_impact="HIGH",
            failure_risk="LOW",
            tonnage_gmt=50.0
        ),
        Asset(
            id="AST-TRK-10",
            name="Flash Butt Welded Joint Assessment",
            section_id="SEC-07",
            section_name="Etawah – Prayagraj",
            type=AssetType.TRACK,
            health_score=66.0,
            criticality=AssetCriticality.HIGH,
            last_inspection="2026-08-19",
            next_maintenance_due="2026-09-08",
            estimated_duration_hours=2.5,
            status=AssetStatus.ATTENTION_REQUIRED,
            operational_impact="HIGH",
            failure_risk="MEDIUM",
            tonnage_gmt=58.0
        ),
        Asset(
            id="AST-OHE-11",
            name="Auto-Tensioning Device (ATD) Pulley Set",
            section_id="SEC-07",
            section_name="Etawah – Prayagraj",
            type=AssetType.OHE,
            health_score=52.0,
            criticality=AssetCriticality.HIGH,
            last_inspection="2026-08-08",
            next_maintenance_due="2026-09-07",
            estimated_duration_hours=3.0,
            status=AssetStatus.CRITICAL_ACTION,
            operational_impact="HIGH",
            failure_risk="HIGH",
            tonnage_gmt=58.0
        ),
        Asset(
            id="AST-BDG-12",
            name="Yamuna Rail Bridge #80 Expansion Joints",
            section_id="SEC-07",
            section_name="Etawah – Prayagraj",
            type=AssetType.BRIDGE,
            health_score=69.0,
            criticality=AssetCriticality.HIGH,
            last_inspection="2026-08-11",
            next_maintenance_due="2026-09-10",
            estimated_duration_hours=3.5,
            status=AssetStatus.ATTENTION_REQUIRED,
            operational_impact="HIGH",
            failure_risk="MEDIUM",
            tonnage_gmt=58.0
        ),
        Asset(
            id="AST-PNC-13",
            name="Diamond Crossing #22 with Slip Points",
            section_id="SEC-08",
            section_name="Prayagraj – Varanasi",
            type=AssetType.POINT_CROSSING,
            health_score=75.0,
            criticality=AssetCriticality.MEDIUM,
            last_inspection="2026-08-22",
            next_maintenance_due="2026-09-18",
            estimated_duration_hours=2.0,
            status=AssetStatus.HEALTHY,
            operational_impact="MEDIUM",
            failure_risk="LOW",
            tonnage_gmt=32.0
        ),
        Asset(
            id="AST-SIG-14",
            name="Digital Axle Counter Evaluation (DAC)",
            section_id="SEC-08",
            section_name="Prayagraj – Varanasi",
            type=AssetType.SIGNAL,
            health_score=67.0,
            criticality=AssetCriticality.HIGH,
            last_inspection="2026-08-17",
            next_maintenance_due="2026-09-09",
            estimated_duration_hours=2.0,
            status=AssetStatus.ATTENTION_REQUIRED,
            operational_impact="HIGH",
            failure_risk="MEDIUM",
            tonnage_gmt=32.0
        ),
        Asset(
            id="AST-TRK-15",
            name="Tamping Machine Corridor Run Km 710",
            section_id="SEC-08",
            section_name="Prayagraj – Varanasi",
            type=AssetType.TRACK,
            health_score=81.0,
            criticality=AssetCriticality.MEDIUM,
            last_inspection="2026-08-26",
            next_maintenance_due="2026-09-22",
            estimated_duration_hours=2.5,
            status=AssetStatus.HEALTHY,
            operational_impact="MEDIUM",
            failure_risk="LOW",
            tonnage_gmt=32.0
        )
    ]

def get_initial_requests() -> List[MaintenanceRequest]:
    return [
        MaintenanceRequest(
            id="MR-1041",
            asset_id="AST-TRK-01",
            asset_name="Track Rail Tamping & De-stressing",
            section_id="SEC-01",
            section_name="New Delhi – Ghaziabad",
            department=Department.ENGINEERING,
            priority=RequestPriority.HIGH,
            duration_minutes=150, # 2.5h
            preferred_window="01:30 – 04:00",
            preferred_start_minute=90,
            deadline_date="2026-09-08",
            assigned_crew="CREW-ENG-A",
            status=RequestStatus.PENDING,
            description="High-tonnage rail de-stressing and ultrasonic flaw inspection post-monsoon.",
            track_possession_required=True,
            traffic_block_required=True
        ),
        MaintenanceRequest(
            id="MR-1042",
            asset_id="AST-SIG-05",
            asset_name="Auto Block Signal Relay Rack (AB-44)",
            section_id="SEC-03",
            section_name="Meerut – Aligarh",
            department=Department.ST,
            priority=RequestPriority.HIGH,
            duration_minutes=120, # 2.0h
            preferred_window="02:00 – 04:00", # conflict intentionally in unoptimized schedule
            preferred_start_minute=120,
            deadline_date="2026-09-07",
            assigned_crew="CREW-SNT-A",
            status=RequestStatus.PENDING,
            description="Intermittent relay impedance drop detected during nocturnal cycle.",
            track_possession_required=False,
            traffic_block_required=True
        ),
        MaintenanceRequest(
            id="MR-1043",
            asset_id="AST-PNC-04",
            asset_name="Curved Switch Point & Crossing Overhaul",
            section_id="SEC-03",
            section_name="Meerut – Aligarh",
            department=Department.ENGINEERING,
            priority=RequestPriority.EMERGENCY,
            duration_minutes=210, # 3.5h
            preferred_window="01:45 – 05:15",
            preferred_start_minute=105,
            deadline_date="2026-09-07",
            assigned_crew="CREW-ENG-B",
            status=RequestStatus.PENDING,
            description="Critical tongue rail wear exceeding safety threshold (4.8mm vs 5.0mm max).",
            track_possession_required=True,
            traffic_block_required=True
        ),
        MaintenanceRequest(
            id="MR-1044",
            asset_id="AST-OHE-03",
            asset_name="Catenary Contact Wire Stagger Adjustment",
            section_id="SEC-02",
            section_name="Ghaziabad – Meerut",
            department=Department.TRD_OHE,
            priority=RequestPriority.HIGH,
            duration_minutes=180, # 3.0h
            preferred_window="01:00 – 04:00",
            preferred_start_minute=60,
            deadline_date="2026-09-09",
            assigned_crew="CREW-TRD-A",
            status=RequestStatus.PENDING,
            description="Periodic contact wire thickness verification and dropper tension tuning.",
            track_possession_required=False,
            power_block_required=True,
            traffic_block_required=True
        ),
        MaintenanceRequest(
            id="MR-1045",
            asset_id="AST-TRK-07",
            asset_name="Deep Ballast Screening & Shoulder Cleaning",
            section_id="SEC-05",
            section_name="Tundla – Kanpur",
            department=Department.ENGINEERING,
            priority=RequestPriority.HIGH,
            duration_minutes=180, # 3.0h
            preferred_window="02:15 – 05:15",
            preferred_start_minute=135,
            deadline_date="2026-09-07",
            assigned_crew="CREW-ENG-A", # Potential crew overlap in unoptimized schedule
            status=RequestStatus.PENDING,
            description="Clogging in ballast pocket causing drainage retention near Km 342.",
            track_possession_required=True,
            traffic_block_required=True
        ),
        MaintenanceRequest(
            id="MR-1046",
            asset_id="AST-OHE-08",
            asset_name="Section Insulator & Isolator Unit (TRD)",
            section_id="SEC-05",
            section_name="Tundla – Kanpur",
            department=Department.TRD_OHE,
            priority=RequestPriority.MEDIUM,
            duration_minutes=150, # 2.5h
            preferred_window="02:30 – 05:00",
            preferred_start_minute=150,
            deadline_date="2026-09-08",
            assigned_crew="CREW-TRD-A", # Multiple OHE requests on same crew
            status=RequestStatus.PENDING,
            description="Corona ring thermal inspection and ceramic insulator wipe-down.",
            track_possession_required=False,
            power_block_required=True,
            traffic_block_required=True
        ),
        MaintenanceRequest(
            id="MR-1047",
            asset_id="AST-OHE-11",
            asset_name="Auto-Tensioning Device (ATD) Pulley Set",
            section_id="SEC-07",
            section_name="Etawah – Prayagraj",
            department=Department.TRD_OHE,
            priority=RequestPriority.EMERGENCY,
            duration_minutes=180, # 3.0h
            preferred_window="01:30 – 04:30",
            preferred_start_minute=90,
            deadline_date="2026-09-07",
            assigned_crew="CREW-TRD-B",
            status=RequestStatus.PENDING,
            description="Stuck counterweight compensation lever observed during dynamic pantograph recording.",
            track_possession_required=False,
            power_block_required=True,
            traffic_block_required=True
        ),
        MaintenanceRequest(
            id="MR-1048",
            asset_id="AST-SIG-14",
            asset_name="Digital Axle Counter Evaluation (DAC)",
            section_id="SEC-08",
            section_name="Prayagraj – Varanasi",
            department=Department.ST,
            priority=RequestPriority.HIGH,
            duration_minutes=120, # 2.0h
            preferred_window="02:00 – 04:00",
            preferred_start_minute=120,
            deadline_date="2026-09-09",
            assigned_crew="CREW-SNT-B",
            status=RequestStatus.PENDING,
            description="Phase shift error detection on downstream wheel sensor channel 2.",
            track_possession_required=False,
            traffic_block_required=True
        ),
    ]

def get_initial_crews() -> List[Crew]:
    return [
        Crew(
            id="CREW-ENG-A",
            name="Permanent Way Gang Alpha (Engg)",
            department=Department.ENGINEERING,
            base_station="Ghaziabad (GZB)",
            is_available=True
        ),
        Crew(
            id="CREW-ENG-B",
            name="Permanent Way Gang Beta (Engg)",
            department=Department.ENGINEERING,
            base_station="Kanpur Central (CNB)",
            is_available=True
        ),
        Crew(
            id="CREW-SNT-A",
            name="Signalling & Telecom Tech-1 (S&T)",
            department=Department.ST,
            base_station="Aligarh Jn (ALJN)",
            is_available=True
        ),
        Crew(
            id="CREW-SNT-B",
            name="Signalling & Telecom Tech-2 (S&T)",
            department=Department.ST,
            base_station="Prayagraj Jn (PRYJ)",
            is_available=True
        ),
        Crew(
            id="CREW-TRD-A",
            name="Traction Distribution Tower Wagon 1 (TRD)",
            department=Department.TRD_OHE,
            base_station="Ghaziabad (GZB)",
            is_available=True
        ),
        Crew(
            id="CREW-TRD-B",
            name="Traction Distribution Tower Wagon 2 (TRD)",
            department=Department.TRD_OHE,
            base_station="Etawah Jn (ETW)",
            is_available=True
        ),
        Crew(
            id="CREW-ENG-C",
            name="Permanent Way Gang Charlie (Engg)",
            department=Department.ENGINEERING,
            base_station="Tundla Jn (TDL)",
            is_available=True
        ),
        Crew(
            id="CREW-TRD-C",
            name="Traction Distribution Tower Wagon 3 (TRD)",
            department=Department.TRD_OHE,
            base_station="Kanpur Central (CNB)",
            is_available=True
        ),
    ]

def get_initial_trains() -> List[Train]:
    """
    Simulated 20 trains across New Delhi to Varanasi corridor.
    Times in minute offsets from 00:00.
    """
    trains_def = [
        {
            "id": "TR-101",
            "train_number": "IR-22436",
            "name": "Vande Bharat Express (NDLS-BSB)",
            "type": TrainType.VANDE_BHARAT,
            "origin": "New Delhi (NDLS)",
            "destination": "Varanasi (BSB)",
            "dep": "06:00",
            "arr": "14:00",
            "priority": TrainPriority.CRITICAL,
            "route": ["SEC-01", "SEC-02", "SEC-03", "SEC-04", "SEC-05", "SEC-06", "SEC-07", "SEC-08"],
            "movements": [
                {"section_id": "SEC-01", "entry_min": 360, "exit_min": 380}, # 06:00 - 06:20
                {"section_id": "SEC-02", "entry_min": 380, "exit_min": 415},
                {"section_id": "SEC-03", "entry_min": 415, "exit_min": 490},
                {"section_id": "SEC-04", "entry_min": 490, "exit_min": 540},
                {"section_id": "SEC-05", "entry_min": 540, "exit_min": 680},
                {"section_id": "SEC-06", "entry_min": 680, "exit_min": 760},
                {"section_id": "SEC-07", "entry_min": 760, "exit_min": 910},
                {"section_id": "SEC-08", "entry_min": 910, "exit_min": 980},
            ]
        },
        {
            "id": "TR-102",
            "train_number": "IR-12302",
            "name": "Howrah Rajdhani Express",
            "type": TrainType.RAJDHANI,
            "origin": "New Delhi (NDLS)",
            "destination": "Howrah (via CNB/PRYJ)",
            "dep": "16:50",
            "arr": "09:55",
            "priority": TrainPriority.CRITICAL,
            "route": ["SEC-01", "SEC-04", "SEC-05", "SEC-06", "SEC-07"],
            "movements": [
                {"section_id": "SEC-01", "entry_min": 1010, "exit_min": 1030},
                {"section_id": "SEC-04", "entry_min": 1030, "exit_min": 1100},
                {"section_id": "SEC-05", "entry_min": 1100, "exit_min": 1260},
                {"section_id": "SEC-06", "entry_min": 1260, "exit_min": 1345},
                {"section_id": "SEC-07", "entry_min": 1345, "exit_min": 1439},
            ]
        },
        {
            "id": "TR-103",
            "train_number": "IR-12418",
            "name": "Prayagraj Express",
            "type": TrainType.SUPERFAST,
            "origin": "New Delhi (NDLS)",
            "destination": "Prayagraj (PRYJ)",
            "dep": "22:10",
            "arr": "07:00",
            "priority": TrainPriority.HIGH,
            "route": ["SEC-01", "SEC-03", "SEC-04", "SEC-05", "SEC-06", "SEC-07"],
            "movements": [
                {"section_id": "SEC-01", "entry_min": 1330, "exit_min": 1360},
                {"section_id": "SEC-03", "entry_min": 1360, "exit_min": 1435},
                {"section_id": "SEC-04", "entry_min": 0, "exit_min": 60},     # 00:00 - 01:00
                {"section_id": "SEC-05", "entry_min": 60, "exit_min": 220},   # 01:00 - 03:40 (Night movement)
                {"section_id": "SEC-06", "entry_min": 220, "exit_min": 310},  # 03:40 - 05:10
                {"section_id": "SEC-07", "entry_min": 310, "exit_min": 420},
            ]
        },
        {
            "id": "TR-104",
            "train_number": "IR-12560",
            "name": "Shiv Ganga Superfast Express",
            "type": TrainType.SUPERFAST,
            "origin": "New Delhi (NDLS)",
            "destination": "Varanasi (BSB)",
            "dep": "20:05",
            "arr": "06:10",
            "priority": TrainPriority.HIGH,
            "route": ["SEC-01", "SEC-03", "SEC-05", "SEC-06", "SEC-07", "SEC-08"],
            "movements": [
                {"section_id": "SEC-01", "entry_min": 1205, "exit_min": 1235},
                {"section_id": "SEC-03", "entry_min": 1235, "exit_min": 1320},
                {"section_id": "SEC-05", "entry_min": 1320, "exit_min": 1439},
                {"section_id": "SEC-06", "entry_min": 0, "exit_min": 85},     # 00:00 - 01:25
                {"section_id": "SEC-07", "entry_min": 85, "exit_min": 240},   # 01:25 - 04:00 (Night movement)
                {"section_id": "SEC-08", "entry_min": 240, "exit_min": 370},  # 04:00 - 06:10
            ]
        },
        {
            "id": "TR-105",
            "train_number": "IR-12004",
            "name": "Lucknow Swarna Shatabdi",
            "type": TrainType.SHATABDI,
            "origin": "New Delhi (NDLS)",
            "destination": "Kanpur / Lucknow",
            "dep": "06:10",
            "arr": "12:40",
            "priority": TrainPriority.HIGH,
            "route": ["SEC-01", "SEC-04", "SEC-05"],
            "movements": [
                {"section_id": "SEC-01", "entry_min": 370, "exit_min": 395},
                {"section_id": "SEC-04", "entry_min": 395, "exit_min": 465},
                {"section_id": "SEC-05", "entry_min": 465, "exit_min": 615},
            ]
        },
        {
            "id": "TR-106",
            "train_number": "IR-14218",
            "name": "Unchahar Express",
            "type": TrainType.SUPERFAST,
            "origin": "Chandigarh / Delhi",
            "destination": "Prayagraj (PRYJ)",
            "dep": "21:30",
            "arr": "11:15",
            "priority": TrainPriority.MEDIUM,
            "route": ["SEC-01", "SEC-02", "SEC-03", "SEC-04", "SEC-05", "SEC-06", "SEC-07"],
            "movements": [
                {"section_id": "SEC-01", "entry_min": 1290, "exit_min": 1320},
                {"section_id": "SEC-02", "entry_min": 1320, "exit_min": 1370},
                {"section_id": "SEC-03", "entry_min": 1370, "exit_min": 1439},
                {"section_id": "SEC-04", "entry_min": 0, "exit_min": 75},      # 00:00 - 01:15
                {"section_id": "SEC-05", "entry_min": 75, "exit_min": 270},    # 01:15 - 04:30 (Overlap with night window)
                {"section_id": "SEC-06", "entry_min": 270, "exit_min": 390},
                {"section_id": "SEC-07", "entry_min": 390, "exit_min": 560},
            ]
        },
        {
            "id": "TR-107",
            "train_number": "IR-04404",
            "name": "Delhi–Meerut Shuttle Express",
            "type": TrainType.PASSENGER,
            "origin": "New Delhi (NDLS)",
            "destination": "Meerut City (MTC)",
            "dep": "05:15",
            "arr": "07:10",
            "priority": TrainPriority.LOW,
            "route": ["SEC-01", "SEC-02"],
            "movements": [
                {"section_id": "SEC-01", "entry_min": 315, "exit_min": 355},
                {"section_id": "SEC-02", "entry_min": 355, "exit_min": 430},
            ]
        },
        {
            "id": "TR-108",
            "train_number": "IR-04142",
            "name": "Kanpur–Etawah Passenger Local",
            "type": TrainType.PASSENGER,
            "origin": "Kanpur Central (CNB)",
            "destination": "Etawah Jn (ETW)",
            "dep": "02:15",
            "arr": "05:00",
            "priority": TrainPriority.LOW,
            "route": ["SEC-06"],
            "movements": [
                {"section_id": "SEC-06", "entry_min": 135, "exit_min": 300}, # 02:15 - 05:00
            ]
        },
        {
            "id": "TR-109",
            "train_number": "IR-CONTR-01",
            "name": "DFCCIL Container Cargo (Dadri-Varanasi)",
            "type": TrainType.FREIGHT,
            "origin": "Dadri Freight Hub",
            "destination": "Mughalsarai / DDU",
            "dep": "01:00",
            "arr": "10:30",
            "priority": TrainPriority.FREIGHT,
            "route": ["SEC-02", "SEC-03", "SEC-04", "SEC-05", "SEC-06", "SEC-07", "SEC-08"],
            "movements": [
                {"section_id": "SEC-02", "entry_min": 60, "exit_min": 130},   # 01:00 - 02:10
                {"section_id": "SEC-03", "entry_min": 130, "exit_min": 270},  # 02:10 - 04:30
                {"section_id": "SEC-04", "entry_min": 270, "exit_min": 360},
                {"section_id": "SEC-05", "entry_min": 360, "exit_min": 540},
                {"section_id": "SEC-06", "entry_min": 540, "exit_min": 650},
                {"section_id": "SEC-07", "entry_min": 650, "exit_min": 820},
                {"section_id": "SEC-08", "entry_min": 820, "exit_min": 930},
            ]
        },
        {
            "id": "TR-110",
            "train_number": "IR-COAL-04",
            "name": "NTPC Thermal Coal Bulk Freight",
            "type": TrainType.FREIGHT,
            "origin": "Varanasi Area",
            "destination": "Dadri Power Plant",
            "dep": "00:30",
            "arr": "11:45",
            "priority": TrainPriority.FREIGHT,
            "route": ["SEC-08", "SEC-07", "SEC-06", "SEC-05", "SEC-04", "SEC-01"],
            "movements": [
                {"section_id": "SEC-08", "entry_min": 30, "exit_min": 150},   # 00:30 - 02:30
                {"section_id": "SEC-07", "entry_min": 150, "exit_min": 350},  # 02:30 - 05:50
                {"section_id": "SEC-06", "entry_min": 350, "exit_min": 470},
                {"section_id": "SEC-05", "entry_min": 470, "exit_min": 650},
                {"section_id": "SEC-04", "entry_min": 650, "exit_min": 740},
                {"section_id": "SEC-01", "entry_min": 740, "exit_min": 790},
            ]
        },
        {
            "id": "TR-111",
            "train_number": "IR-12582",
            "name": "BSB–NDLS Superfast Express",
            "type": TrainType.SUPERFAST,
            "origin": "Varanasi (BSB)",
            "destination": "New Delhi (NDLS)",
            "dep": "23:10",
            "arr": "11:20",
            "priority": TrainPriority.HIGH,
            "route": ["SEC-08", "SEC-07", "SEC-06", "SEC-05", "SEC-04", "SEC-01"],
            "movements": [
                {"section_id": "SEC-08", "entry_min": 1390, "exit_min": 1439},
                {"section_id": "SEC-07", "entry_min": 0, "exit_min": 180},    # 00:00 - 03:00
                {"section_id": "SEC-06", "entry_min": 180, "exit_min": 280},  # 03:00 - 04:40
                {"section_id": "SEC-05", "entry_min": 280, "exit_min": 440},
                {"section_id": "SEC-04", "entry_min": 440, "exit_min": 520},
                {"section_id": "SEC-01", "entry_min": 520, "exit_min": 560},
            ]
        },
        {
            "id": "TR-112",
            "train_number": "IR-20801",
            "name": "Magadh Express",
            "type": TrainType.SUPERFAST,
            "origin": "New Delhi (NDLS)",
            "destination": "Islampur (via CNB/PRYJ)",
            "dep": "21:05",
            "arr": "11:40",
            "priority": TrainPriority.MEDIUM,
            "route": ["SEC-01", "SEC-04", "SEC-05", "SEC-06", "SEC-07"],
            "movements": [
                {"section_id": "SEC-01", "entry_min": 1265, "exit_min": 1295},
                {"section_id": "SEC-04", "entry_min": 1295, "exit_min": 1365},
                {"section_id": "SEC-05", "entry_min": 1365, "exit_min": 1439},
                {"section_id": "SEC-06", "entry_min": 30, "exit_min": 160},   # 00:30 - 02:40
                {"section_id": "SEC-07", "entry_min": 160, "exit_min": 360},  # 02:40 - 06:00
            ]
        },
        {
            "id": "TR-113",
            "train_number": "IR-12398",
            "name": "Mahabodhi Superfast Express",
            "type": TrainType.SUPERFAST,
            "origin": "New Delhi (NDLS)",
            "destination": "Gaya Jn",
            "dep": "12:50",
            "arr": "03:00",
            "priority": TrainPriority.MEDIUM,
            "route": ["SEC-01", "SEC-04", "SEC-05", "SEC-06", "SEC-07"],
            "movements": [
                {"section_id": "SEC-01", "entry_min": 770, "exit_min": 800},
                {"section_id": "SEC-04", "entry_min": 800, "exit_min": 870},
                {"section_id": "SEC-05", "entry_min": 870, "exit_min": 1040},
                {"section_id": "SEC-06", "entry_min": 1040, "exit_min": 1130},
                {"section_id": "SEC-07", "entry_min": 1130, "exit_min": 1300},
            ]
        },
        {
            "id": "TR-114",
            "train_number": "IR-12276",
            "name": "Prayagraj Humsafar Express",
            "type": TrainType.SUPERFAST,
            "origin": "New Delhi (NDLS)",
            "destination": "Prayagraj (PRYJ)",
            "dep": "22:30",
            "arr": "06:20",
            "priority": TrainPriority.HIGH,
            "route": ["SEC-01", "SEC-04", "SEC-05", "SEC-06", "SEC-07"],
            "movements": [
                {"section_id": "SEC-01", "entry_min": 1350, "exit_min": 1380},
                {"section_id": "SEC-04", "entry_min": 1380, "exit_min": 1439},
                {"section_id": "SEC-05", "entry_min": 0, "exit_min": 160},    # 00:00 - 02:40
                {"section_id": "SEC-06", "entry_min": 160, "exit_min": 260},  # 02:40 - 04:20
                {"section_id": "SEC-07", "entry_min": 260, "exit_min": 380},
            ]
        },
        {
            "id": "TR-115",
            "train_number": "IR-14164",
            "name": "Sangam Express",
            "type": TrainType.PASSENGER,
            "origin": "Meerut City (MTC)",
            "destination": "Prayagraj (PRYJ)",
            "dep": "19:00",
            "arr": "08:30",
            "priority": TrainPriority.LOW,
            "route": ["SEC-03", "SEC-04", "SEC-05", "SEC-06", "SEC-07"],
            "movements": [
                {"section_id": "SEC-03", "entry_min": 1140, "exit_min": 1260},
                {"section_id": "SEC-04", "entry_min": 1260, "exit_min": 1350},
                {"section_id": "SEC-05", "entry_min": 1350, "exit_min": 1439},
                {"section_id": "SEC-06", "entry_min": 50, "exit_min": 220},   # 00:50 - 03:40
                {"section_id": "SEC-07", "entry_min": 220, "exit_min": 460},
            ]
        },
        {
            "id": "TR-116",
            "train_number": "IR-12402",
            "name": "Magadh Express (Up Line)",
            "type": TrainType.SUPERFAST,
            "origin": "Islampur",
            "destination": "New Delhi (NDLS)",
            "dep": "16:30",
            "arr": "07:35",
            "priority": TrainPriority.MEDIUM,
            "route": ["SEC-07", "SEC-06", "SEC-05", "SEC-04", "SEC-01"],
            "movements": [
                {"section_id": "SEC-07", "entry_min": 1380, "exit_min": 1439},
                {"section_id": "SEC-06", "entry_min": 0, "exit_min": 90},     # 00:00 - 01:30
                {"section_id": "SEC-05", "entry_min": 90, "exit_min": 260},   # 01:30 - 04:20
                {"section_id": "SEC-04", "entry_min": 260, "exit_min": 340},
                {"section_id": "SEC-01", "entry_min": 340, "exit_min": 380},
            ]
        },
        {
            "id": "TR-117",
            "train_number": "IR-22435",
            "name": "Vande Bharat Express (BSB-NDLS)",
            "type": TrainType.VANDE_BHARAT,
            "origin": "Varanasi (BSB)",
            "destination": "New Delhi (NDLS)",
            "dep": "15:00",
            "arr": "23:00",
            "priority": TrainPriority.CRITICAL,
            "route": ["SEC-08", "SEC-07", "SEC-06", "SEC-05", "SEC-04", "SEC-01"],
            "movements": [
                {"section_id": "SEC-08", "entry_min": 900, "exit_min": 970},
                {"section_id": "SEC-07", "entry_min": 970, "exit_min": 1120},
                {"section_id": "SEC-06", "entry_min": 1120, "exit_min": 1200},
                {"section_id": "SEC-05", "entry_min": 1200, "exit_min": 1320},
                {"section_id": "SEC-04", "entry_min": 1320, "exit_min": 1360},
                {"section_id": "SEC-01", "entry_min": 1360, "exit_min": 1380},
            ]
        },
        {
            "id": "TR-118",
            "train_number": "IR-AUTO-02",
            "name": "Automobile Carrier Special Freight",
            "type": TrainType.FREIGHT,
            "origin": "Maruti Hub (GZB)",
            "destination": "Varanasi Yard",
            "dep": "02:00",
            "arr": "12:00",
            "priority": TrainPriority.FREIGHT,
            "route": ["SEC-03", "SEC-04", "SEC-05", "SEC-06", "SEC-07", "SEC-08"],
            "movements": [
                {"section_id": "SEC-03", "entry_min": 120, "exit_min": 240},  # 02:00 - 04:00 (Directly on SEC-03)
                {"section_id": "SEC-04", "entry_min": 240, "exit_min": 320},
                {"section_id": "SEC-05", "entry_min": 320, "exit_min": 490},
                {"section_id": "SEC-06", "entry_min": 490, "exit_min": 590},
                {"section_id": "SEC-07", "entry_min": 590, "exit_min": 750},
                {"section_id": "SEC-08", "entry_min": 750, "exit_min": 850},
            ]
        },
        {
            "id": "TR-119",
            "train_number": "IR-14266",
            "name": "Dehradun–Varanasi Janta Express",
            "type": TrainType.PASSENGER,
            "origin": "Dehradun",
            "destination": "Varanasi (BSB)",
            "dep": "18:15",
            "arr": "12:30",
            "priority": TrainPriority.LOW,
            "route": ["SEC-02", "SEC-03", "SEC-04", "SEC-07", "SEC-08"],
            "movements": [
                {"section_id": "SEC-02", "entry_min": 1310, "exit_min": 1380},
                {"section_id": "SEC-03", "entry_min": 1380, "exit_min": 1439},
                {"section_id": "SEC-04", "entry_min": 0, "exit_min": 80},      # 00:00 - 01:20
                {"section_id": "SEC-07", "entry_min": 200, "exit_min": 420},   # 03:20 - 07:00
                {"section_id": "SEC-08", "entry_min": 420, "exit_min": 540},
            ]
        },
        {
            "id": "TR-120",
            "train_number": "IR-04288",
            "name": "Kanpur–Varanasi MEMU Special",
            "type": TrainType.PASSENGER,
            "origin": "Kanpur Central (CNB)",
            "destination": "Varanasi (BSB)",
            "dep": "05:00",
            "arr": "10:45",
            "priority": TrainPriority.LOW,
            "route": ["SEC-07", "SEC-08"],
            "movements": [
                {"section_id": "SEC-07", "entry_min": 300, "exit_min": 480},
                {"section_id": "SEC-08", "entry_min": 480, "exit_min": 645},
            ]
        },
    ]

    trains: List[Train] = []
    for td in trains_def:
        mvs = []
        for m in td["movements"]:
            e_h = m["entry_min"] // 60
            e_m = m["entry_min"] % 60
            x_h = m["exit_min"] // 60
            x_m = m["exit_min"] % 60
            mvs.append(
                TrainMovement(
                    section_id=m["section_id"],
                    entry_minute=m["entry_min"],
                    exit_minute=m["exit_min"],
                    entry_time=f"{e_h:02d}:{e_m:02d}",
                    exit_time=f"{x_h:02d}:{x_m:02d}"
                )
            )
        trains.append(
            Train(
                id=td["id"],
                train_number=td["train_number"],
                name=td["name"],
                type=td["type"],
                origin=td["origin"],
                destination=td["destination"],
                departure_time=td["dep"],
                arrival_time=td["arr"],
                priority=td["priority"],
                route_sections=td["route"],
                movements=mvs
            )
        )
    return trains

def minutes_to_time(minutes: int) -> str:
    h = (minutes // 60) % 24
    m = minutes % 60
    return f"{h:02d}:{m:02d}"
