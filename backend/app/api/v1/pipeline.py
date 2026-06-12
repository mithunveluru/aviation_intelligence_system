from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.analysis import AnalysisRun
from app.schemas.common import APIResponse

router = APIRouter()


@router.get(
    "",
    response_model=APIResponse[list],
    summary="List all analysis pipeline runs",
)
def list_runs(db: Session = Depends(get_db)) -> APIResponse[list]:
    runs = db.query(AnalysisRun).order_by(AnalysisRun.id.desc()).all()
    return APIResponse(data=[_serialize(r) for r in runs])


@router.get(
    "/{run_id}/status",
    response_model=APIResponse[dict],
    summary="Get pipeline run status and progress",
)
def get_run_status(run_id: int, db: Session = Depends(get_db)) -> APIResponse[dict]:
    from fastapi import HTTPException
    run = db.query(AnalysisRun).filter(AnalysisRun.id == run_id).first()
    if not run:
        raise HTTPException(status_code=404, detail=f"Run {run_id} not found.")
    return APIResponse(data=_serialize(run))


def _serialize(run: AnalysisRun) -> dict:
    return {
        "id":             run.id,
        "status":         run.status,
        "stage":          run.stage or "pending",
        "progress":       run.progress or 0.0,
        "filename":       run.filename,
        "total_rows":     run.total_rows,
        "processed_rows": run.processed_rows,
        "num_clusters":   run.num_clusters,
        "error_message":  run.error_message,
        "started_at":     run.started_at.isoformat() if run.started_at else None,
        "completed_at":   run.completed_at.isoformat() if run.completed_at else None,
        "created_at":     run.created_at.isoformat() if run.created_at else None,
    }
