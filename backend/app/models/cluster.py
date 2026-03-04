from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, Text
from app.database import Base

class Cluster(Base):
    __tablename__ = "clusters"

    id                      = Column(Integer, primary_key=True, index=True)
    cluster_label           = Column(Integer, index=True)
    incident_count          = Column(Integer)
    year_range_start        = Column(Integer)
    year_range_end          = Column(Integer)
    dominant_severity       = Column(String)
    avg_fatality_rate       = Column(Float)
    avg_fatalities          = Column(Float)
    top_operators           = Column(Text)
    top_aircraft_types      = Column(Text)
    root_cause_summary      = Column(Text)
    key_contributing_factors = Column(Text)
    recommendations         = Column(Text)
    summarized_at           = Column(DateTime)
    created_at              = Column(DateTime, default=datetime.utcnow)
