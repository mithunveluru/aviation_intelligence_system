import logging
import uuid
from datetime import datetime
from pathlib import Path

import pandas as pd
from fastapi import APIRouter, BackgroundTasks, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models.analysis import AnalysisRun
from app.models.incident import Incident
from app.schemas.common import APIResponse

router = APIRouter()
logger = logging.getLogger(__name__)

REQUIRED_COLUMNS = {"date", "operator", "aircraft_type", "fatalities", "aboard", "summary"}
ALLOWED_EXTENSIONS = {".csv"}
MAX_FILE_SIZE_MB = 50


@router.post(
    "",
    response_model=APIResponse[dict],
    status_code=202,
    summary="Upload aviation incident CSV and trigger analysis pipeline",
)
async def upload_csv(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
) -> APIResponse[dict]:
    """
    Accepts a CSV file with aviation incident data. Validates columns, cleans data,
    persists incidents, and triggers the clustering + ML pipeline asynchronously.

    Returns immediately with a run_id. Poll /api/v1/pipeline/{run_id}/status for progress.
    """
    # ── Validate file extension ───────────────────────────────────────────────
    suffix = Path(file.filename or "").suffix.lower()
    if suffix not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"Only CSV files accepted. Got: {suffix!r}")

    # ── Read contents + enforce size limit ────────────────────────────────────
    contents = await file.read()
    size_mb = len(contents) / (1024 * 1024)
    if size_mb > MAX_FILE_SIZE_MB:
        raise HTTPException(
            status_code=413,
            detail=f"File too large: {size_mb:.1f} MB (max {MAX_FILE_SIZE_MB} MB)"
        )

    # ── Parse CSV ─────────────────────────────────────────────────────────────
    try:
        import io
        df = pd.read_csv(io.BytesIO(contents), encoding="utf-8", low_memory=False)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Could not parse CSV: {exc}")

    if df.empty:
        raise HTTPException(status_code=400, detail="CSV file is empty.")

    # ── Check required columns (case-insensitive) ─────────────────────────────
    actual_cols = {c.lower().strip() for c in df.columns}
    missing = REQUIRED_COLUMNS - actual_cols
    if missing:
        raise HTTPException(
            status_code=422,
            detail=f"CSV is missing required columns: {sorted(missing)}"
        )

    # ── Persist file to uploads directory ─────────────────────────────────────
    uid = uuid.uuid4().hex[:12]
    filename = f"{uid}_{file.filename}"
    dest = settings.UPLOADS_DIR / filename
    dest.write_bytes(contents)
    logger.info(f"Saved upload: {dest} ({size_mb:.2f} MB, {len(df):,} rows)")

    # ── Create AnalysisRun record ─────────────────────────────────────────────
    run = AnalysisRun(
        status="pending",
        stage="uploading",
        progress=0.0,
        filename=filename,
        total_rows=len(df),
        started_at=datetime.utcnow(),
    )
    db.add(run)
    db.commit()
    db.refresh(run)
    run_id = run.id
    logger.info(f"Created AnalysisRun id={run_id} for {filename}")

    # ── Kick off pipeline in background ──────────────────────────────────────
    background_tasks.add_task(_run_pipeline, run_id, dest, df)

    return APIResponse(
        message="Upload accepted. Pipeline started.",
        data={
            "run_id":        run_id,
            "filename":      filename,
            "total_rows":    len(df),
            "size_mb":       round(size_mb, 2),
            "poll_url":      f"/api/v1/pipeline/{run_id}/status",
        },
    )


def _run_pipeline(run_id: int, filepath: Path, df: pd.DataFrame) -> None:
    """Background task: clean data → persist incidents → run clustering + ML."""
    from app.database import SessionLocal
    from app.models.analysis import AnalysisRun

    db = SessionLocal()
    try:
        run = db.query(AnalysisRun).filter(AnalysisRun.id == run_id).first()
        if not run:
            return

        # Stage 1: Clean + persist
        run.stage = "cleaning"
        run.status = "running"
        run.progress = 5.0
        db.commit()

        incidents = _clean_and_build_incidents(df)
        if not incidents:
            run.status = "failed"
            run.error_message = "No valid incidents found after cleaning."
            db.commit()
            return

        # Clear existing incidents and insert new batch
        db.query(Incident).delete()
        db.bulk_save_objects(incidents)
        db.commit()
        logger.info(f"[Run {run_id}] Persisted {len(incidents):,} incidents")

        run.processed_rows = len(incidents)
        run.stage = "clustering"
        run.progress = 15.0
        db.commit()
        db.close()

        # Stage 2: Clustering pipeline (manages its own session)
        from app.pipeline.orchestrator import PipelineOrchestrator
        orchestrator = PipelineOrchestrator()
        orchestrator.run_clustering_pipeline(run_id)

        # Stage 3: ML pipeline
        db = SessionLocal()
        run = db.query(AnalysisRun).filter(AnalysisRun.id == run_id).first()
        if run and run.status == "clustered":
            db.close()
            orchestrator.run_ml_pipeline(run_id)
        else:
            db.close()

    except Exception as exc:
        logger.exception(f"[Run {run_id}] Upload pipeline failed: {exc}")
        try:
            run = db.query(AnalysisRun).filter(AnalysisRun.id == run_id).first()
            if run:
                run.status = "failed"
                run.error_message = str(exc)[:1000]
                db.commit()
        except Exception:
            pass
    finally:
        try:
            db.close()
        except Exception:
            pass


def _clean_and_build_incidents(df: pd.DataFrame) -> list[Incident]:
    """Normalize CSV columns and return a list of Incident ORM objects."""
    # Normalize column names
    df.columns = [c.lower().strip().replace(" ", "_") for c in df.columns]

    col_map = {
        "ac_type": "aircraft_type",
        "aircraft": "aircraft_type",
        "type": "aircraft_type",
        "total_fatal": "fatalities",
        "killed": "fatalities",
        "total_aboard": "aboard",
        "passengers": "aboard",
        "on_board": "aboard",
        "narrative": "summary",
        "description": "summary",
        "remarks": "summary",
    }
    df = df.rename(columns={k: v for k, v in col_map.items() if k in df.columns})

    def _safe_float(val):
        try:
            f = float(val)
            return f if f >= 0 else None
        except (TypeError, ValueError):
            return None

    def _safe_int(val):
        try:
            return int(float(val))
        except (TypeError, ValueError):
            return None

    def _parse_year(date_str):
        if not date_str:
            return None
        for fmt in ("%Y-%m-%d", "%m/%d/%Y", "%d/%m/%Y", "%Y"):
            try:
                from datetime import datetime as dt
                return dt.strptime(str(date_str).strip(), fmt).year
            except ValueError:
                pass
        try:
            return int(str(date_str).strip()[:4])
        except (ValueError, TypeError):
            return None

    def _label_severity(fatalities, aboard):
        f = _safe_float(fatalities) or 0
        a = _safe_float(aboard) or 1
        if f == 0:
            return "Minor"
        rate = f / max(a, 1)
        if rate >= 0.9:
            return "Fatal"
        if rate >= 0.5:
            return "Severe"
        if rate > 0:
            return "Moderate"
        return "Minor"

    incidents = []
    for _, row in df.iterrows():
        fatalities = _safe_float(row.get("fatalities"))
        aboard = _safe_float(row.get("aboard"))
        year = _parse_year(row.get("date"))

        fatality_rate = None
        survival_count = None
        if fatalities is not None and aboard is not None and aboard > 0:
            fatality_rate = round(fatalities / aboard, 4)
            survival_count = max(aboard - fatalities, 0)

        severity = _label_severity(fatalities, aboard)

        summary = str(row.get("summary", "") or "").strip()
        if not summary:
            continue

        incidents.append(Incident(
            date=str(row.get("date", "") or "").strip() or None,
            time=str(row.get("time", "") or "").strip() or None,
            location=str(row.get("location", "") or "").strip() or None,
            operator=str(row.get("operator", "") or "").strip() or None,
            flight_number=str(row.get("flight_number", "") or "").strip() or None,
            route=str(row.get("route", "") or "").strip() or None,
            aircraft_type=str(row.get("aircraft_type", "") or "").strip() or None,
            registration=str(row.get("registration", "") or "").strip() or None,
            aboard=aboard,
            fatalities=fatalities,
            ground=_safe_float(row.get("ground")),
            survival_count=survival_count,
            summary=summary,
            year=year,
            fatality_rate=fatality_rate,
            severity_label=severity,
        ))

    return incidents
