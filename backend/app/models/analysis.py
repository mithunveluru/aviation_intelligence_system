from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, Text
from app.database import Base


class AnalysisRun(Base):
    __tablename__ = "analysis_runs"

    id             = Column(Integer, primary_key=True, index=True)
    status         = Column(String, default="pending", index=True)
    stage          = Column(String, default="pending")
    progress       = Column(Float, default=0.0)
    filename       = Column(String)
    total_rows     = Column(Integer)
    processed_rows = Column(Integer)
    num_clusters   = Column(Integer)
    error_message  = Column(Text)
    started_at     = Column(DateTime, default=datetime.utcnow)
    completed_at   = Column(DateTime)
    created_at     = Column(DateTime, default=datetime.utcnow)


class ModelMetrics(Base):
    __tablename__ = "model_metrics"

    id                     = Column(Integer, primary_key=True, index=True)
    analysis_run_id        = Column(Integer, index=True)
    model_type             = Column(String)
    accuracy               = Column(Float)
    precision_weighted     = Column(Float)
    recall_weighted        = Column(Float)
    f1_weighted            = Column(Float)
    classification_report  = Column(Text)
    confusion_matrix       = Column(Text)
    feature_importances    = Column(Text)
    n_estimators           = Column(Integer)
    test_size              = Column(Float)
    training_samples       = Column(Integer)
    test_samples           = Column(Integer)
    model_path             = Column(String)
    created_at             = Column(DateTime, default=datetime.utcnow)
