from datetime import datetime
from typing import Optional, Any
from pydantic import BaseModel


class IncidentBase(BaseModel):
    date: Optional[str] = None
    time: Optional[str] = None
    location: Optional[str] = None
    operator: Optional[str] = None
    flight_number: Optional[str] = None
    route: Optional[str] = None
    aircraft_type: Optional[str] = None
    registration: Optional[str] = None
    aboard: Optional[float] = None
    fatalities: Optional[float] = None
    ground: Optional[float] = None
    summary: Optional[str] = None


class IncidentRead(IncidentBase):
    """Full incident detail — used for single-record endpoints."""
    id: int
    year: Optional[int] = None
    fatality_rate: Optional[float] = None
    severity_label: Optional[str] = None
    cluster_id: Optional[int] = None
    umap_x: Optional[float] = None
    umap_y: Optional[float] = None
    extracted_cause_category: Optional[str] = None
    extracted_phase_of_flight: Optional[str] = None
    extracted_contributing_factors: Optional[Any] = None
    predicted_severity: Optional[str] = None
    prediction_confidence: Optional[float] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class IncidentSummary(BaseModel):
    """Lightweight schema for list and dashboard endpoints."""
    id: int
    date: Optional[str] = None
    location: Optional[str] = None
    operator: Optional[str] = None
    aircraft_type: Optional[str] = None
    fatalities: Optional[float] = None
    severity_label: Optional[str] = None
    cluster_id: Optional[int] = None
    aboard:            float | None          = 0
    summary:           str | None          = None

    model_config = {"from_attributes": True}
