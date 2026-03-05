import logging

import pandas as pd
from fastapi import APIRouter, Query

from app.database import engine
from app.schemas.common import APIResponse
from app.services.statistical_service import StatisticalService

router = APIRouter()
logger = logging.getLogger(__name__)

_stat_svc = StatisticalService()


_cached_df = None
def _load_incidents_df() -> pd.DataFrame:
    global _cached_df

    if _cached_df is None:
        logger.info("Loading incidents table into memory")
        _cached_df = pd.read_sql_table("incidents", engine)

    return _cached_df


@router.get(
    "/overview",
    response_model=APIResponse[dict],
    summary="High-level dataset statistics",
)
def get_overview() -> APIResponse[dict]:
    """Dashboard header card data: totals, rates, date range, unique counts."""
    return APIResponse(data=_stat_svc.compute_overview(_load_incidents_df()))


@router.get(
    "/trends/yearly",
    response_model=APIResponse[list],
    summary="Year-over-year incident + fatality trends",
)
def get_yearly_trends() -> APIResponse[list]:
    """
    Powers the time-series line chart.
    Includes raw annual values + 5-year rolling average for trend smoothing.
    """
    return APIResponse(data=_stat_svc.compute_yearly_trends(_load_incidents_df()))


@router.get(
    "/trends/decade",
    response_model=APIResponse[list],
    summary="Incident statistics grouped by decade",
)
def get_decade_stats() -> APIResponse[list]:
    """Bar chart data for decade-over-decade safety improvement analysis."""
    return APIResponse(data=_stat_svc.compute_decade_stats(_load_incidents_df()))


@router.get(
    "/operators",
    response_model=APIResponse[list],
    summary="Top operators by incident count",
)
def get_operator_stats(
    top_n: int = Query(20, ge=5, le=50, description="Number of operators to return"),
) -> APIResponse[list]:
    return APIResponse(
        data=_stat_svc.compute_operator_stats(_load_incidents_df(), top_n=top_n)
    )


@router.get(
    "/aircraft",
    response_model=APIResponse[list],
    summary="Top aircraft types by incident count",
)
def get_aircraft_stats(
    top_n: int = Query(20, ge=5, le=50, description="Number of aircraft types to return"),
) -> APIResponse[list]:
    return APIResponse(
        data=_stat_svc.compute_aircraft_stats(_load_incidents_df(), top_n=top_n)
    )


@router.get(
    "/chi-square",
    response_model=APIResponse[list],
    summary="Chi-square independence tests",
)
def get_chi_square_tests() -> APIResponse[list]:
    """
    Three chi-square tests:
      1. Severity vs Operator Category (Military/Commercial/Private)
      2. Severity vs Decade
      3. Severity vs Top 10 Operators
    Each result includes chi² statistic, p-value, degrees of freedom,
    significance flag, and plain-English interpretation.
    """
    return APIResponse(data=_stat_svc.compute_chi_square_tests(_load_incidents_df()))


@router.get(
    "/correlations",
    response_model=APIResponse[dict],
    summary="Pearson correlation matrix for numeric features",
)
def get_correlation_matrix() -> APIResponse[dict]:
    """
    Correlation matrix for: aboard, fatalities, ground, year,
    fatality_rate, survival_count.
    Includes pre-computed insights sorted by |r| strength.
    Used by the heatmap visualization in the dashboard.
    """
    return APIResponse(
        data=_stat_svc.compute_correlation_matrix(_load_incidents_df())
    )


@router.get(
    "/summary",
    response_model=APIResponse[dict],
    summary="All statistics in one call (dashboard initial load)",
)
def get_full_summary() -> APIResponse[dict]:
    """
    Single endpoint for the React dashboard's initial mount.
    Eliminates 6 sequential API calls at page load.
    One DB read → all analytics computed → one JSON response.
    """
    df = _load_incidents_df()
    logger.info(f"Full summary requested — {len(df):,} incidents loaded")
    return APIResponse(data=_stat_svc.get_full_summary(df))
# ─── /analysis/severity-dist ─────────────────────────────────────────────────
@router.get(
    "/severity-dist",
    response_model=APIResponse[list],
    summary="Severity label distribution for pie chart",
)
def get_severity_dist() -> APIResponse[list]:
    """Returns severity distribution — used by Analysis page pie chart."""
    df = _load_incidents_df()
    counts = (
        df["severity_label"]
        .fillna("Unknown")
        .value_counts()
        .reset_index()
    )
    counts.columns = ["severity", "count"]
    total = int(counts["count"].sum()) or 1
    return APIResponse(data=[
        {
            "severity":   row["severity"],
            "count":      int(row["count"]),
            "percentage": round(row["count"] / total * 100, 2),
        }
        for _, row in counts.iterrows()
    ])


# ─── /analysis/umap ──────────────────────────────────────────────────────────
@router.get(
    "/umap",
    response_model=APIResponse[list],
    summary="UMAP 2D scatter plot coordinates",
)
def get_umap_data(
    limit: int = Query(2000, ge=100, le=5000, description="Max points to return"),
) -> APIResponse[list]:
    """Returns UMAP x/y coordinates for scatter plot — limited for performance."""
    df = _load_incidents_df()

    # Guard: return empty if UMAP hasn't been computed yet
    if "umap_x" not in df.columns or "umap_y" not in df.columns:
        return APIResponse(data=[])

    # Only rows where UMAP was computed
    umap_df = df[df["umap_x"].notna() & df["umap_y"].notna()].head(limit)

    if umap_df.empty:
        return APIResponse(data=[])

    result = []
    for _, row in umap_df.iterrows():
        # ✅ FIX: explicit notna check before int() — cluster_id can be NaN
        cluster_id  = int(row["cluster_id"])    if pd.notna(row["cluster_id"])    else -1
        severity    = str(row["severity_label"]) if pd.notna(row["severity_label"]) else "Unknown"
        fatalities  = int(row["fatalities"])     if pd.notna(row["fatalities"])     else 0
        # ✅ year column is already stored in DB — no need to parse from date
        year        = int(row["year"])           if pd.notna(row["year"])           else 0
        operator    = str(row["operator"])       if pd.notna(row["operator"])       else "Unknown"

        result.append({
            "id":        int(row["id"]),
            "x":         round(float(row["umap_x"]), 4),
            "y":         round(float(row["umap_y"]), 4),
            "cluster":   cluster_id,
            "severity":  severity,
            "fatalities":fatalities,
            "year":      year,
            "operator":  operator,
        })

    return APIResponse(data=result)
