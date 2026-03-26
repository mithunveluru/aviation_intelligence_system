import json
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.cluster import Cluster

router = APIRouter()


def _parse_factors(val) -> list:
    if not val:
        return []
    if isinstance(val, list):
        return val
    if isinstance(val, str):
        try:
            parsed = json.loads(val)
            if isinstance(parsed, list):
                return parsed
            return [str(parsed)]
        except Exception:
            # stored as plain text — split by newline or comma
            if "\n" in val:
                return [line.strip() for line in val.splitlines() if line.strip()]
            if "," in val:
                return [x.strip() for x in val.split(",") if x.strip()]
            return [val]
    return []


def _serialize(c: Cluster) -> dict:
    return {
        "id":                      c.id,
        "cluster_label":           c.cluster_label,
        "incident_count":          c.incident_count,
        "avg_fatality_rate":       float(c.avg_fatality_rate or 0),
        "avg_fatalities":          float(c.avg_fatalities or 0),
        "dominant_severity":       c.dominant_severity,
        "top_operators":           c.top_operators,
        "top_aircraft_types":      c.top_aircraft_types,
        "year_range_start":        c.year_range_start,
        "year_range_end":          c.year_range_end,
        "root_cause_summary":      c.root_cause_summary or "LLM summary not yet generated.",
        "key_contributing_factors": _parse_factors(c.key_contributing_factors),
        "recommendations":         c.recommendations or "No recommendations yet.",
        "summarized_at":           str(c.summarized_at) if c.summarized_at else None,
        "created_at":              str(c.created_at) if c.created_at else None,
    }


@router.get("")
def get_clusters(db: Session = Depends(get_db)):
    clusters = db.query(Cluster).filter(Cluster.cluster_label != -1).order_by(Cluster.cluster_label).all()
    return {"success": True, "data": [_serialize(c) for c in clusters]}


@router.get("/{cluster_id}")
def get_cluster(cluster_id: int, db: Session = Depends(get_db)):
    from fastapi import HTTPException
    cluster = db.query(Cluster).filter(Cluster.id == cluster_id).first()
    if not cluster:
        raise HTTPException(status_code=404, detail="Cluster not found")
    return {"success": True, "data": _serialize(cluster)}
