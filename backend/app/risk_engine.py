from typing import List, Dict, Any
from app.models import Asset, AssetCriticality, AssetStatus, MaintenanceRequest, RequestPriority

def calculate_asset_priority_score(asset: Asset) -> Dict[str, Any]:
    """
    AI Risk & Priority Scoring Model
    Formula:
    Risk Score (0-100) = (100 - Health_Score) * 0.35 + Criticality_Weight * 0.25 + 
                         Operational_Impact_Weight * 0.20 + Tonnage_Factor * 0.10 + Failure_Urgency * 0.10
    """
    # 1. Health deterioration component (0 - 35 pts)
    health_penalty = max(0.0, 100.0 - asset.health_score) * 0.35

    # 2. Criticality component (0 - 25 pts)
    crit_map = {
        AssetCriticality.LOW: 5.0,
        AssetCriticality.MEDIUM: 12.0,
        AssetCriticality.HIGH: 20.0,
        AssetCriticality.CRITICAL: 25.0
    }
    crit_score = crit_map.get(asset.criticality, 15.0)

    # 3. Operational Impact component (0 - 20 pts)
    op_map = {
        "LOW": 5.0,
        "MEDIUM": 12.0,
        "HIGH": 20.0
    }
    op_score = op_map.get(asset.operational_impact, 12.0)

    # 4. High-Density Tonnage GMT factor (0 - 10 pts)
    # Baseline 40 GMT; above 60 GMT gets full 10 pts
    tonnage_score = min(10.0, max(2.0, (asset.tonnage_gmt / 60.0) * 10.0))

    # 5. Failure Urgency / Status factor (0 - 10 pts)
    status_map = {
        AssetStatus.HEALTHY: 1.0,
        AssetStatus.ATTENTION_REQUIRED: 6.5,
        AssetStatus.CRITICAL_ACTION: 10.0,
        AssetStatus.UNDER_MAINTENANCE: 3.0
    }
    status_score = status_map.get(asset.status, 5.0)

    total_risk = round(min(100.0, health_penalty + crit_score + op_score + tonnage_score + status_score), 1)

    # Key drivers explanation
    factors = []
    if asset.health_score < 70:
        factors.append(f"Sub-threshold asset health index ({asset.health_score}%)")
    if asset.criticality in [AssetCriticality.CRITICAL, AssetCriticality.HIGH]:
        factors.append(f"High network criticality grade ({asset.criticality.value})")
    if asset.tonnage_gmt >= 50:
        factors.append(f"Heavy traffic loading ({asset.tonnage_gmt} GMT/year)")
    if asset.failure_risk == "HIGH":
        factors.append("Elevated sensor drift / telemetry anomaly rate")

    return {
        "asset_id": asset.id,
        "risk_score": total_risk,
        "health_score": asset.health_score,
        "criticality": asset.criticality.value,
        "operational_impact": asset.operational_impact,
        "failure_risk": asset.failure_risk,
        "contributing_factors": factors,
        "recommended_block_urgency": "IMMEDIATE (0-24h)" if total_risk >= 75 else ("ELEVATED (24-72h)" if total_risk >= 50 else "ROUTINE")
    }

def prioritize_requests(requests: List[MaintenanceRequest], assets_dict: Dict[str, Asset]) -> List[MaintenanceRequest]:
    """
    Sorts and enriches maintenance requests based on AI composite priority score.
    """
    scored = []
    for req in requests:
        asset = assets_dict.get(req.asset_id)
        if asset:
            risk_info = calculate_asset_priority_score(asset)
            risk_val = risk_info["risk_score"]
        else:
            risk_val = 50.0

        # Base priority weight
        prio_weight = {
            RequestPriority.EMERGENCY: 1000,
            RequestPriority.HIGH: 500,
            RequestPriority.MEDIUM: 200,
            RequestPriority.LOW: 50
        }.get(req.priority, 100)

        composite_rank = prio_weight + risk_val
        scored.append((composite_rank, req))

    scored.sort(key=lambda x: x[0], reverse=True)
    return [item[1] for item in scored]
