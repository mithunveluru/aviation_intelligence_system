from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, Text
from app.database import Base

class Incident(Base):
    __tablename__ = "incidents"
    id                             = Column(Integer, primary_key=True, index=True)
    date                           = Column(String)
    time                           = Column(String)
    location                       = Column(String, index=True)
    operator                       = Column(String, index=True)
    flight_number                  = Column(String)
    route                          = Column(String)
    aircraft_type                  = Column(String, index=True)
    registration                   = Column(String)
    aboard                         = Column(Float)
    fatalities                     = Column(Float)
    ground                         = Column(Float)
    summary                        = Column(Text)
    year                           = Column(Integer, index=True)
    fatality_rate                  = Column(Float)
    severity_label                 = Column(String, index=True)
    cluster_id                     = Column(Integer)
    extracted_cause_category       = Column(String)
    extracted_phase_of_flight      = Column(String)
    extracted_contributing_factors = Column(Text)
    predicted_severity             = Column(String)
    prediction_confidence          = Column(Float)
    created_at                     = Column(DateTime, default=datetime.utcnow)
