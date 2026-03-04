import json
import logging
from pathlib import Path

from sklearn.cluster import HDBSCAN
import numpy as np
import pandas as pd
import umap

from app.config import settings

logger = logging.getLogger(__name__)


class ClusteringService:
    """
    Two-stage dimensionality reduction + HDBSCAN density clustering.

    ── Why two UMAP passes? ───────────────────────────────────────────
    Pass 1 (384D → 50D, clustering):
      HDBSCAN on raw 384D embeddings suffers from the curse of dimensionality —
      all pairwise distances converge, making density estimation meaningless.
      UMAP to 50D compresses noise while preserving local neighborhood
      structure. min_dist=0.0 forces tight packing (better for HDBSCAN).

    Pass 2 (384D → 2D, visualization):
      Separate UMAP from the original 384D embeddings (not from 50D).
      min_dist=0.1 spreads clusters for readability.
      Why not reuse 50D → 2D? Compounding UMAP passes distort topology.

    ── Why HDBSCAN over KMeans? ───────────────────────────────────────
    1. No K required — we don't know how many failure categories exist
    2. Handles non-spherical, variable-density clusters (realistic failure space)
    3. Noise label (-1) = explicit anomaly detection for unique incidents
    4. Robust to outliers — a single unique crash won't form a false cluster
    5. Hierarchical nature allows post-hoc cluster granularity tuning

    Source: UMAP author confirms UMAP+HDBSCAN > raw embedding HDBSCAN [web:49]
    """

    def reduce_dimensions(
        self,
        embeddings: np.ndarray,
        n_components: int,
        n_neighbors: int = 15,
        min_dist: float = 0.0,
        metric: str = "cosine",
        random_state: int = 42,
    ) -> np.ndarray:
        """
        UMAP dimensionality reduction.

        n_neighbors: local neighborhood size.
          - Small (5–10): captures fine-grained local clusters
          - Large (30–50): emphasizes global structure
          - 15: standard balanced default

        min_dist:
          - 0.0: pack points tightly → best for clustering input
          - 0.1–0.5: spread points → best for scatter visualization

        metric: cosine is optimal for L2-normalized text embeddings.
        """
        logger.info(
            f"UMAP reduction: {embeddings.shape[1]}D → {n_components}D "
            f"(n_neighbors={n_neighbors}, min_dist={min_dist}, metric={metric})"
        )
        reducer = umap.UMAP(
            n_components=n_components,
            n_neighbors=n_neighbors,
            min_dist=min_dist,
            metric=metric,
            random_state=random_state,
            low_memory=False,
            verbose=False,
        )
        reduced = reducer.fit_transform(embeddings)
        logger.info(f"UMAP complete → shape: {reduced.shape}")
        return reduced

    def run_hdbscan(self, reduced: np.ndarray) -> np.ndarray:
        """
        HDBSCAN clustering on UMAP-reduced embeddings.

        min_cluster_size (from settings, default 15):
          Minimum incidents to constitute a real failure pattern.
          Too small → overfitting noise into micro-clusters.
          Too large → merges distinct failure types.
          15 is defensible for 5,000+ incidents.

        min_samples (from settings, default 5):
          Controls conservativeness — higher = more noise points.
          5 is permissive enough for historical sparse data.

        cluster_selection_method='eom':
          Excess of Mass — gives more balanced cluster sizes vs 'leaf'
          which over-fragments into tiny clusters.

        metric='euclidean':
          Used on UMAP output space (already in low-dim Euclidean space).
          Do NOT use cosine here — UMAP output is Euclidean by construction.

        Returns: integer array of labels. -1 = noise (not a bug, a feature).
        """
        logger.info(
            f"HDBSCAN: min_cluster_size={settings.HDBSCAN_MIN_CLUSTER_SIZE}, "
            f"min_samples={settings.HDBSCAN_MIN_SAMPLES}"
        )
        clusterer = HDBSCAN(
    min_cluster_size=settings.HDBSCAN_MIN_CLUSTER_SIZE,
    min_samples=settings.HDBSCAN_MIN_SAMPLES,
    )
        labels: np.ndarray = clusterer.fit_predict(reduced)

        n_clusters = int((labels >= 0).astype(bool).sum() > 0)
        unique_labels = set(labels)
        n_clusters = len(unique_labels) - (1 if -1 in unique_labels else 0)
        n_noise = int((labels == -1).sum())
        coverage_pct = round((1 - n_noise / len(labels)) * 100, 1)

        logger.info(
            f"HDBSCAN complete → {n_clusters} clusters | "
            f"{n_noise} noise points | {coverage_pct}% coverage"
        )
        return labels

    def compute_cluster_stats(
        self,
        df: pd.DataFrame,
        labels: np.ndarray,
    ) -> list[dict]:
        """
        Computes per-cluster aggregate statistics for the clusters table.

        Includes the noise cluster (-1) as a special entry —
        useful for the dashboard to show "uncategorized incidents" panel.
        """
        df = df.copy()
        df["_cluster"] = labels
        stats: list[dict] = []

        for label in sorted(set(labels)):
            cdf = df[df["_cluster"] == label]

            top_operators: list[str] = (
                cdf["operator"].dropna().value_counts().head(5).index.tolist()
            )
            top_aircraft: list[str] = (
                cdf["aircraft_type"].dropna().value_counts().head(5).index.tolist()
            )

            severity_counts = cdf["severity_label"].value_counts()
            dominant_severity: str | None = (
                severity_counts.idxmax() if not severity_counts.empty else None
            )

            valid_years = cdf["year"].dropna()

            stats.append(
                {
                    "cluster_label": int(label),
                    "incident_count": len(cdf),
                    "avg_fatality_rate": (
                        float(round(cdf["fatality_rate"].mean(), 4))
                        if cdf["fatality_rate"].notna().any()
                        else None
                    ),
                    "avg_fatalities": (
                        float(round(cdf["fatalities"].mean(), 2))
                        if cdf["fatalities"].notna().any()
                        else None
                    ),
                    "dominant_severity": dominant_severity,
                    "top_operators": json.dumps(top_operators),
                    "top_aircraft_types": json.dumps(top_aircraft),
                    "year_range_start": (
                        int(valid_years.min()) if not valid_years.empty else None
                    ),
                    "year_range_end": (
                        int(valid_years.max()) if not valid_years.empty else None
                    ),
                }
            )

        return stats

    def save_umap_2d(self, coords: np.ndarray, run_id: int) -> Path:
        path = settings.MODELS_DIR / f"run_{run_id}_umap2d.npy"
        np.save(path, coords)
        logger.info(f"2D UMAP coords saved → {path}")
        return path
