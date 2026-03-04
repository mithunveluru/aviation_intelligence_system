from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, or_

from app.database import get_db
from app.models.incident import Incident
from app.schemas.common import APIResponse, PaginatedResponse
from app.schemas.incident import IncidentRead, IncidentSummary

router = APIRouter()

# ─── Whitelist sort columns ───────────────────────────────────────────────────
SORT_MAP = {
    "date":       Incident.date,
    "operator":   Incident.operator,
    "aircraft":   Incident.aircraft_type,
    "location":   Incident.location,
    "severity":   Incident.severity_label,
    "fatalities": Incident.fatalities,
    "aboard":     Incident.aboard,
}

@router.get(
    "",
    response_model=PaginatedResponse[IncidentSummary],
    summary="List incidents with filtering, search, sorting and pagination",
)
def list_incidents(
    page:      int          = Query(1,      ge=1,              description="Page number"),
    page_size: int          = Query(12,     ge=1,   le=100,    description="Records per page"),
    severity:  str | None   = Query(None,                      description="Filter: Minor/Moderate/Severe/Fatal"),
    decade:    str | None   = Query(None,                      description="Filter by decade e.g. 1980s"),
    search:    str | None   = Query(None,                      description="Search operator/aircraft/location/summary"),
    sort_key:  str          = Query("date",                    description="Sort column"),
    sort_dir:  str          = Query("desc", regex="^(asc|desc)$", description="asc or desc"),
    db: Session = Depends(get_db),
):
    query = db.query(Incident)

    # ── Severity filter ───────────────────────────────────────────────────────
    if severity and severity != "All":
        query = query.filter(Incident.severity_label == severity)

    # ── Decade filter ─────────────────────────────────────────────────────────
    if decade and decade != "All":
        try:
            decade_start = int(decade.replace("s", ""))
            query = query.filter(
                Incident.year >= decade_start,
                Incident.year <= decade_start + 9,
            )
        except ValueError:
            pass

    # ── Text search ───────────────────────────────────────────────────────────
    if search and search.strip():
        term = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Incident.operator.ilike(term),
                Incident.aircraft_type.ilike(term),
                Incident.location.ilike(term),
                Incident.summary.ilike(term),
            )
        )

    # ── Sorting ───────────────────────────────────────────────────────────────
    sort_col = SORT_MAP.get(sort_key, Incident.date)
    query = query.order_by(
        sort_col.asc() if sort_dir == "asc" else sort_col.desc()
    )

    # ── Paginate ──────────────────────────────────────────────────────────────
    total = query.count()
    items = query.offset((page - 1) * page_size).limit(page_size).all()

    return PaginatedResponse(
        data=[IncidentSummary.model_validate(i) for i in items],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=max(1, (total + page_size - 1) // page_size),
    )


@router.get(
    "/stats",
    response_model=APIResponse[dict],
    summary="Quick dataset statistics",
)
def get_incident_stats(db: Session = Depends(get_db)):
    rows = (
        db.query(Incident.severity_label, func.count(Incident.id))
        .group_by(Incident.severity_label)
        .all()
    )
    distribution = {label: count for label, count in rows}
    return APIResponse(data={
        "total":        sum(distribution.values()),
        "distribution": distribution,
    })


@router.get(
    "/{incident_id}",
    response_model=APIResponse[IncidentRead],
    summary="Get full incident detail",
)
def get_incident(incident_id: int, db: Session = Depends(get_db)):
    from fastapi import HTTPException
    incident = db.query(Incident).filter(Incident.id == incident_id).first()
    if not incident:
        raise HTTPException(status_code=404, detail=f"Incident {incident_id} not found.")
    return APIResponse(data=IncidentRead.model_validate(incident))
