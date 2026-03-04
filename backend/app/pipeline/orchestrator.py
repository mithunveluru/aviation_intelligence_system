import logging
from datetime import datetime

import numpy as np
import pandas as pd
from sqlalchemy import delete
from sqlalchemy.orm import Session


from app.database import SessionLocal
from app.models.analysis import AnalysisRun
from app.models.cluster import Cluster
from app.models.incident import Incident
from app.services.clustering_service import ClusteringService
from app.services.embedding_service import EmbeddingService
from app.config import settings

logger = logging.getLogger(__name__)


class PipelineOrchestrator:
    """
    Coordinates multi-stage ML pipeline execution.

    Design contract:
    - Each stage checkpoints progress to DB before starting work.
    - Any unhandled exception marks the run as 'failed' with message.
    - Uses its own SessionLocal() — never the HTTP request session.
    - Services (EmbeddingService, ClusteringService) are injected at init —
      allows unit testing with mock services.
    """

    def __init__(self) -> None:
        self.embedding_svc = EmbeddingService()
        self.clustering_svc = ClusteringService()

    # ── Public entry point ────────────────────────────────────────────────────

    def run_clustering_pipeline(self, run_id: int) -> None:
        """
        Full embedding + clustering pipeline.
        Called as a FastAPI BackgroundTask — runs after HTTP response is sent.

        Progress checkpoints:
          embedding         →  10%
          umap_50d          →  35%
          hdbscan           →  58%
          umap_2d           →  72%
          persisting        →  88%
          cluster_stats     →  96%
          complete          → 100%
        """
        db = SessionLocal()
        try:
            self._checkpoint(db, run_id, "embedding", 10.0, "running")

            # ── Stage 1: Load incidents ────────────────────────────────────
            incidents = db.query(Incident).all()
            if not incidents:
                raise RuntimeError(
                    "No incidents in database. Upload and clean a CSV first."
                )
            logger.info(f"[Run {run_id}] Loaded {len(incidents):,} incidents")

            summaries = [i.summary for i in incidents]
            metadata = [
                {"operator": i.operator, "aircraft_type": i.aircraft_type}
                for i in incidents
            ]
            incident_ids = [i.id for i in incidents]

            # DataFrame for stats — only columns needed for cluster computation
            df = pd.DataFrame(
                [
                    {
                        "operator": i.operator,
                        "aircraft_type": i.aircraft_type,
                        "fatality_rate": i.fatality_rate,
                        "fatalities": i.fatalities,
                        "severity_label": i.severity_label,
                        "year": i.year,
                    }
                    for i in incidents
                ]
            )

            # ── Stage 2: Embed ─────────────────────────────────────────────
            texts = self.embedding_svc.build_text_inputs(summaries, metadata)
            embeddings = self.embedding_svc.encode(texts)
            self.embedding_svc.save(embeddings, run_id)

            self._checkpoint(db, run_id, "umap_50d", 35.0)

            # ── Stage 3: UMAP 50D (clustering input) ──────────────────────
            reduced_50d = self.clustering_svc.reduce_dimensions(
                embeddings,
                n_components=50,
                n_neighbors=15,
                min_dist=0.0,   # tight packing for HDBSCAN
                metric="cosine",
            )

            self._checkpoint(db, run_id, "hdbscan", 58.0)

            # ── Stage 4: HDBSCAN clustering ───────────────────────────────
            labels = self.clustering_svc.run_hdbscan(reduced_50d)

            self._checkpoint(db, run_id, "umap_2d", 72.0)

            # ── Stage 5: UMAP 2D (scatter visualization) ──────────────────
            # Reduce from original 384D embeddings — not from 50D.
            # Chaining UMAP passes compounds distortion.
            coords_2d = self.clustering_svc.reduce_dimensions(
                embeddings,
                n_components=2,
                n_neighbors=15,
                min_dist=0.1,   # spread for readability
                metric="cosine",
            )
            self.clustering_svc.save_umap_2d(coords_2d, run_id)

            self._checkpoint(db, run_id, "persisting_incidents", 88.0)

            # ── Stage 6: Write cluster_id + UMAP coords to incidents ──────
            # Batch updates to avoid N+1 query issue
            BATCH = 500
            for start in range(0, len(incident_ids), BATCH):
                batch_ids = incident_ids[start : start + BATCH]
                batch_labels = labels[start : start + BATCH]
                batch_x = coords_2d[start : start + BATCH, 0]
                batch_y = coords_2d[start : start + BATCH, 1]

                for i, inc_id in enumerate(batch_ids):
                    db.query(Incident).filter(Incident.id == inc_id).update(
                        {
                            "cluster_id": int(batch_labels[i]),
                            "umap_x": float(batch_x[i]),
                            "umap_y": float(batch_y[i]),
                        },
                        synchronize_session=False,
                    )
                db.commit()

            logger.info(
                f"[Run {run_id}] Updated {len(incident_ids):,} incidents "
                "with cluster_id + UMAP coordinates"
            )

            self._checkpoint(db, run_id, "cluster_stats", 96.0)

            # ── Stage 7: Populate clusters table ──────────────────────────
            db.execute(delete(Cluster))
            db.commit()

            cluster_stats = self.clustering_svc.compute_cluster_stats(df, labels)
            for stat in cluster_stats:
                stat["analysis_run_id"] = run_id
                db.add(Cluster(**stat))
            db.commit()

            n_real_clusters = len(
                [s for s in cluster_stats if s["cluster_label"] != -1]
            )

            # ── Finalize run ───────────────────────────────────────────────
            run = db.query(AnalysisRun).filter(AnalysisRun.id == run_id).first()
            if run:
                run.status = "clustered"
                run.stage = "clustering_complete"
                run.progress = 100.0
                run.num_clusters = n_real_clusters
                run.completed_at = datetime.utcnow()
                db.commit()

            logger.info(
                f"[Run {run_id}] ✅ Clustering complete — "
                f"{n_real_clusters} clusters | "
                f"{int((labels == -1).sum())} noise points"
            )

        except Exception as exc:
            logger.exception(f"[Run {run_id}] Clustering pipeline failed: {exc}")
            run = db.query(AnalysisRun).filter(AnalysisRun.id == run_id).first()
            if run:
                run.status = "failed"
                run.stage = "failed"
                run.error_message = str(exc)[:1000]
                db.commit()
        finally:
            db.close()

    # ── Private helpers ───────────────────────────────────────────────────────

    @staticmethod
    def _checkpoint(
        db: Session,
        run_id: int,
        stage: str,
        progress: float,
        status: str = "running",
    ) -> None:
        """Commits a progress snapshot before each pipeline stage."""
        run = db.query(AnalysisRun).filter(AnalysisRun.id == run_id).first()
        if run:
            run.stage = stage
            run.progress = progress
            run.status = status
            db.commit()
        logger.info(f"[Run {run_id}] ── {stage} ({progress:.0f}%)")

    def run_ml_pipeline(self, run_id: int) -> None:
        """
        ML training + inference pipeline.

        Stages:
        feature_engineering → 15%
        training            → 60%
        evaluation          → 75%
        predicting_unknown  → 90%
        complete            → 100%
        """
        from sqlalchemy import delete
        import json
        import pandas as pd

        from app.database import engine
        from app.models.analysis import ModelMetrics
        from app.services.ml_service import MLService
        from app.services.statistical_service import StatisticalService

        db = SessionLocal()
        try:
            self._checkpoint(db, run_id, "feature_engineering", 15.0, "running")

            # ── Load full incidents DataFrame ──────────────────────────────────
            df = pd.read_sql_table("incidents", engine)
            if df.empty:
                raise RuntimeError(
                    "No incidents in database. Complete Phase 2 (CSV upload) first."
                )
            logger.info(f"[Run {run_id}] Loaded {len(df):,} incidents for ML pipeline")

            # Compute operator_category (not stored in DB — derived on the fly)
            stat_svc = StatisticalService()
            df["operator_category"] = df["operator"].fillna("").apply(
                stat_svc._classify_operator
            )

            ml_svc = MLService()

            self._checkpoint(db, run_id, "training", 30.0)

            # ── Train model ────────────────────────────────────────────────────
            metrics = ml_svc.train(df, run_id)

            self._checkpoint(db, run_id, "persisting_metrics", 75.0)

            # ── Persist ModelMetrics ───────────────────────────────────────────
            db.execute(
                delete(ModelMetrics).where(ModelMetrics.analysis_run_id == run_id)
            )
            db.commit()

            model_record = ModelMetrics(
                analysis_run_id=run_id,
                model_type="RandomForestClassifier",
                accuracy=metrics["accuracy"],
                precision_weighted=metrics["precision_weighted"],
                recall_weighted=metrics["recall_weighted"],
                f1_weighted=metrics["f1_weighted"],
                classification_report=json.dumps(metrics["classification_report"]),
                confusion_matrix=json.dumps(metrics["confusion_matrix"]),
                feature_importances=json.dumps(metrics["feature_importances"]),
                n_estimators=metrics["n_estimators"],
                test_size=metrics["test_size"],
                training_samples=metrics["training_samples"],
                test_samples=metrics["test_samples"],
                model_path=metrics["model_path"],
            )
            db.add(model_record)
            db.commit()

            self._checkpoint(db, run_id, "predicting_unknown", 90.0)

            # ── Back-fill Unknown severity rows ───────────────────────────────
            labels, confidences, incident_ids = ml_svc.predict_unknown(df, run_id)

            if len(incident_ids) > 0:
                BATCH = 500
                for start in range(0, len(incident_ids), BATCH):
                    batch_ids = incident_ids[start : start + BATCH]
                    batch_labels = labels[start : start + BATCH]
                    batch_conf = confidences[start : start + BATCH]
                    for i, inc_id in enumerate(batch_ids):
                        db.query(Incident).filter(Incident.id == inc_id).update(
                            {
                                "predicted_severity": str(batch_labels[i]),
                                "prediction_confidence": float(batch_conf[i]),
                            },
                            synchronize_session=False,
                        )
                    db.commit()
                logger.info(
                    f"[Run {run_id}] Back-filled {len(incident_ids):,} "
                    "Unknown incidents with predicted severity"
                )

            # ── Finalize run ───────────────────────────────────────────────────
            run = db.query(AnalysisRun).filter(AnalysisRun.id == run_id).first()
            if run:
                run.status = "completed"
                run.stage = "ml_complete"
                run.progress = 100.0
                run.completed_at = datetime.utcnow()
                db.commit()

            logger.info(
                f"[Run {run_id}] ✅ ML pipeline complete | "
                f"Accuracy={metrics['accuracy']:.4f} | "
                f"F1={metrics['f1_weighted']:.4f}"
            )

        except Exception as exc:
            logger.exception(f"[Run {run_id}] ML pipeline failed: {exc}")
            run = db.query(AnalysisRun).filter(AnalysisRun.id == run_id).first()
            if run:
                run.status = "failed"
                run.stage = "failed"
                run.error_message = str(exc)[:1000]
                db.commit()
        finally:
            db.close()

    def run_llm_pipeline(
        self,
        run_id: int,
        extract_limit: int | None = 200,
    ) -> None:
        """
        LLM pipeline — two stages:

        Stage 1 — Per-incident structured extraction (optional, configurable limit):
        Reads raw Summary text → Mistral 7B → structured JSON fields.
        extract_limit=200 by default (dev mode — ~25 min).
        extract_limit=None = process all incidents with summaries (~8-13 hrs).

        Stage 2 — Cluster root cause summarization (always runs, ~11 min):
        Samples top-12 incidents per cluster → Mistral 7B → root cause JSON.
        Writes to clusters table: root_cause_summary, key_contributing_factors,
        recommendations.

        Progress tracking:
        checking_ollama     →  3%
        extracting_fields   →  3% → 60% (proportional across batches)
        summarizing_clusters → 60% → 97%
        complete            → 100%
        """
        import json
        from datetime import datetime

        from app.database import engine
        from app.models.cluster import Cluster
        from app.services.llm_service import LLMService

        db = SessionLocal()
        llm_svc = LLMService()

        try:
            # ── Pre-flight: Ollama availability ───────────────────────────────────
            # REPLACE WITH:
            self._checkpoint(db, run_id, "checking_gemini", 3.0, "running")

            if not llm_svc.is_available():
                raise RuntimeError(
                    "Gemini API is not reachable. Check GOOGLE_API_KEY environment variable."
                )
            logger.info(f"[Run {run_id}] Groq available — model: llama-3.1-8b-instant")


            # ── Stage 1: Per-incident extraction ──────────────────────────────────
            extraction_query = (
                db.query(Incident)
                .filter(
                    Incident.summary.isnot(None),
                    Incident.extracted_cause_category.is_(None),
                )
                .order_by(Incident.fatalities.desc())   # richest incidents first
            )

            if extract_limit:
                incidents_to_extract = extraction_query.limit(extract_limit).all()
            else:
                incidents_to_extract = extraction_query.all()

            total_extract = len(incidents_to_extract)
            logger.info(
                f"[Run {run_id}] Starting extraction for {total_extract:,} incidents "
                f"(limit={extract_limit})"
            )

            # REPLACE WITH this clean version:
            BATCH_SIZE = 50
            for batch_start in range(0, total_extract, BATCH_SIZE):
                batch = incidents_to_extract[batch_start : batch_start + BATCH_SIZE]

                for incident in batch:
                    extraction = llm_svc.extract_incident_fields(incident.summary)
                    incident.extracted_cause_category = extraction.cause_category
                    incident.extracted_phase_of_flight = extraction.phase_of_flight
                    incident.extracted_contributing_factors = json.dumps(
                        extraction.contributing_factors
                    )
                    incident.extracted_at = datetime.utcnow()

                db.commit()  # commit per batch of 50, not per row

                done = min(batch_start + BATCH_SIZE, total_extract)
                progress = 3.0 + (done / total_extract) * 57.0
                self._checkpoint(
                    db, run_id,
                    f"extracting_fields ({done}/{total_extract})",
                    round(progress, 1),
                )
                logger.info(
                    f"[Run {run_id}] Extraction {done}/{total_extract} "
                    f"({progress:.1f}%)"
                )


            # ── Stage 2: Cluster root cause summarization ──────────────────────────
            clusters = (
                db.query(Cluster)
                .filter(Cluster.cluster_label != -1)
                .order_by(Cluster.incident_count.desc())
                .all()
            )

            total_clusters = len(clusters)
            logger.info(
                f"[Run {run_id}] Summarizing {total_clusters} clusters with LLM..."
            )

            for idx, cluster in enumerate(clusters):
                # Sample top 12 incidents by fatality count — richest summaries
                sample = (
                    db.query(Incident)
                    .filter(
                        Incident.cluster_id == cluster.cluster_label,
                        Incident.summary.isnot(None),
                    )
                    .order_by(Incident.fatalities.desc())
                    .limit(12)
                    .all()
                )

                summaries = [i.summary for i in sample if i.summary]

                stats = {
                    "incident_count": cluster.incident_count,
                    "year_range_start": cluster.year_range_start,
                    "year_range_end": cluster.year_range_end,
                    "dominant_severity": cluster.dominant_severity,
                    "avg_fatality_rate": cluster.avg_fatality_rate,
                    "top_operators": json.loads(cluster.top_operators or "[]"),
                    "top_aircraft_types": json.loads(cluster.top_aircraft_types or "[]"),
                }

                result = llm_svc.summarize_cluster(
                    cluster_label=cluster.cluster_label,
                    summaries=summaries,
                    stats=stats,
                )

                cluster.root_cause_summary = result.root_cause_summary
                cluster.key_contributing_factors = json.dumps(
                    result.key_contributing_factors
                )
                cluster.recommendations = result.recommendations
                cluster.summarized_at = datetime.utcnow()
                db.commit()

                # Progress maps 60% → 97% across summarization
                progress = 60.0 + ((idx + 1) / total_clusters) * 37.0
                self._checkpoint(
                    db, run_id,
                    f"summarizing_clusters ({idx + 1}/{total_clusters})",
                    round(progress, 1),
                )
                logger.info(
                    f"[Run {run_id}] Cluster {cluster.cluster_label} done "
                    f"({idx + 1}/{total_clusters})"
                )

            # ── Finalize ───────────────────────────────────────────────────────────
            run = db.query(AnalysisRun).filter(AnalysisRun.id == run_id).first()
            if run:
                run.status = "llm_complete"
                run.stage = "llm_complete"
                run.progress = 100.0
                run.completed_at = datetime.utcnow()
                db.commit()

            logger.info(
                f"[Run {run_id}] ✅ LLM pipeline complete — "
                f"{total_extract} extractions + {total_clusters} cluster summaries"
            )

        except Exception as exc:
            logger.exception(f"[Run {run_id}] LLM pipeline failed: {exc}")
            run = db.query(AnalysisRun).filter(AnalysisRun.id == run_id).first()
            if run:
                run.status = "failed"
                run.stage = "failed"
                run.error_message = str(exc)[:1000]
                db.commit()
        finally:
            db.close()
