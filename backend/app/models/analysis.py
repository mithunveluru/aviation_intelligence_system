from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, Text
from app.database import Base

class AnalysisRun(Base):
    __tablename__ = "analysis_runs"

    id             = Column(Integer, primary_key=True, index=True)
    status         = Column(String, default="pending", index=True)
    filename       = Column(String)
    total_rows     = Column(Integer)
    processed_rows = Column(Integer)
    error_message  = Column(Text)
    started_at     = Column(DateTime, default=datetime.utcnow)
    completed_at   = Column(DateTime)
    created_at     = Column(DateTime, default=datetime.utcnow)
