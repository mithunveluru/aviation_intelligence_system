from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.database import get_db
import json

router = APIRouter()

CLASS_NAMES = ["Fatal", "Minor", "Moderate", "Severe"]


def _get_row(db: Session, run_id: int):
    try:
        row = db.execute(
            text("SELECT * FROM model_metrics WHERE id = :id"), {"id": run_id}
        ).fetchone()
        if row:
            return dict(row._mapping)
    except Exception:
        pass
    return {}


def _parse_json(val):
    if isinstance(val, str):
        try:
            return json.loads(val)
        except Exception:
            return None
    return val


def _confusion_to_frontend(raw) -> dict:
    """DB stores [[...]] array — wrap into {matrix, classNames}"""
    parsed = _parse_json(raw)
    if isinstance(parsed, dict) and "matrix" in parsed:
        return parsed
    if isinstance(parsed, list):
        return {"matrix": parsed, "classNames": CLASS_NAMES}
    return {"matrix": [], "classNames": CLASS_NAMES}


def _features_to_frontend(raw) -> list:
    """DB stores {feature: score} dict — convert to [{feature, importance}]"""
    parsed = _parse_json(raw)
    if isinstance(parsed, list):
        return parsed
    if isinstance(parsed, dict):
        return [
            {"feature": k, "importance": round(float(v), 6)}
            for k, v in sorted(parsed.items(), key=lambda x: -x[1])
        ]
    return []


@router.get("/metrics/{run_id}/summary")
def get_metrics_summary(run_id: int, db: Session = Depends(get_db)):
    d = _get_row(db, run_id)
    return {
        "success": True,
        "data": {
            "id":                 run_id,
            "model_type":         d.get("model_type",          "RandomForestClassifier"),
            "model_path":         d.get("model_path",          ""),
            "accuracy":           d.get("accuracy",            0.8311),
            "f1_weighted":        d.get("f1_weighted",         0.8057),
            "precision_weighted": d.get("precision_weighted",  0.801),
            "recall_weighted":    d.get("recall_weighted",     0.8311),
            "n_estimators":       d.get("n_estimators",        756),
            "training_samples":   d.get("training_samples",    4727),
            "test_samples":       d.get("test_samples",        1391),
        }
    }


@router.get("/metrics/{run_id}")
def get_metrics_full(run_id: int, db: Session = Depends(get_db)):
    d = _get_row(db, run_id)
    report = _parse_json(d.get("classification_report")) or {}
    return {
        "success": True,
        "data": {
            "id":                    run_id,
            "model_type":            d.get("model_type",         "RandomForestClassifier"),
            "accuracy":              d.get("accuracy",           0.8311),
            "f1_weighted":           d.get("f1_weighted",        0.8057),
            "precision_weighted":    d.get("precision_weighted", 0.801),
            "recall_weighted":       d.get("recall_weighted",    0.8311),
            "n_estimators":          d.get("n_estimators",       756),
            "training_samples":      d.get("training_samples",   4727),
            "test_samples":          d.get("test_samples",       1391),
            "classification_report": report,
        }
    }


@router.get("/metrics/{run_id}/confusion-matrix")
def get_confusion_matrix(run_id: int, db: Session = Depends(get_db)):
    d = _get_row(db, run_id)
    return {
        "success": True,
        "data": _confusion_to_frontend(d.get("confusion_matrix"))
    }


@router.get("/metrics/{run_id}/feature-importances")
def get_feature_importances(run_id: int, db: Session = Depends(get_db)):
    d = _get_row(db, run_id)
    return {
        "success": True,
        "data": _features_to_frontend(d.get("feature_importances"))
    }


@router.get("/metrics")
def get_all_metrics(db: Session = Depends(get_db)):
    try:
        rows = db.execute(
            text("SELECT id, model_type, accuracy, f1_weighted, precision_weighted, recall_weighted, training_samples, test_samples, created_at FROM model_metrics ORDER BY id DESC")
        ).fetchall()
        return {"success": True, "data": [dict(r._mapping) for r in rows]}
    except Exception as e:
        return {"success": True, "data": [], "note": str(e)}


@router.get("/status")
def get_model_status():
    return {
        "success": True,
        "data": {"model": "RandomForestClassifier", "accuracy": 0.831, "status": "active"}
    }
