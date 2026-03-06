import logging
from typing import Optional

import pandas as pd
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.database import get_db, engine
from app.schemas.common import APIResponse

router = APIRouter()
logger = logging.getLogger(__name__)


def _sql(db: Session, query: str, **params):
    return db.execute(text(query), params).fetchall()


# ─── /overview ────────────────────────────────────────────────────────────────
@router.get("/overview", response_model=APIResponse[dict])
def get_overview(db: Session = Depends(get_db)):
    row = _sql(db, """
        SELECT
            COUNT(*)                                                      AS total_incidents,
            CAST(SUM(fatalities) AS INTEGER)                                 AS total_fatalities,
            ROUND(SUM(aboard), 1)                                         AS total_aboard,
            CAST(SUM(fatalities) * 1.0 / NULLIF(SUM(aboard), 0) AS INTEGER  )     AS overall_fatality_rate,
            MIN(year)                                                     AS year_min,
            MAX(year)                                                     AS year_max,
            COUNT(DISTINCT operator)                                      AS unique_operators,
            COUNT(DISTINCT aircraft_type)                                 AS unique_aircraft_types
        FROM incidents
        WHERE aboard IS NOT NULL AND aboard > 0
    """)[0]
    return APIResponse(data={
        "total_incidents":       row[0] or 0,
        "total_fatalities":      int(row[1] or 0),
        "total_aboard":          int(row[2] or 0),
        "overall_fatality_rate": row[3] or 0,
        "year_min":              row[4],
        "year_max":              row[5],
        "unique_operators":      row[6] or 0,
        "unique_aircraft_types": row[7] or 0,
    })


# ─── /trends/yearly ───────────────────────────────────────────────────────────
@router.get("/trends/yearly", response_model=APIResponse[list])
def get_yearly_trends(db: Session = Depends(get_db)):
    rows = _sql(db, """
        SELECT
            year,
            COUNT(*)                                                     AS incidents,
            CAST(SUM(fatalities) AS INTEGER)                                    AS fatalities,
            ROUND(SUM(fatalities) * 1.0 / NULLIF(SUM(aboard), 0), 4)    AS fatality_rate,
            ROUND(SUM(aboard), 1)                                        AS total_aboard
        FROM incidents
        WHERE year IS NOT NULL
        GROUP BY year
        ORDER BY year ASC
    """)
    data = [
        {
            "year":          r[0],
            "incidents":     r[1],
            "fatalities":    int(r[2] or 0),
            "fatality_rate": r[3] or 0,
            "total_aboard":  r[4] or 0,
        }
        for r in rows
    ]
    # 5-year rolling average in Python (no pandas needed)
    for i, item in enumerate(data):
        window = data[max(0, i - 4): i + 1]
        item["rolling_avg_incidents"] = round(
            sum(w["incidents"] for w in window) / len(window), 2
        )
    return APIResponse(data=data)


# ─── /trends/decade ───────────────────────────────────────────────────────────
@router.get("/trends/decade", response_model=APIResponse[list])
def get_decade_stats(db: Session = Depends(get_db)):
    rows = _sql(db, """
        SELECT
            (year / 10) * 10                                             AS decade,
            COUNT(*)                                                     AS incidents,
            ROUND(SUM(fatalities), 1)                                    AS fatalities,
            ROUND(AVG(fatalities), 2)                                    AS avg_fatalities,
            ROUND(SUM(fatalities) * 1.0 / NULLIF(SUM(aboard), 0), 4)    AS fatality_rate
        FROM incidents
        WHERE year IS NOT NULL
        GROUP BY decade
        ORDER BY decade ASC
    """)
    return APIResponse(data=[
        {
            "decade":         f"{r[0]}s",
            "incidents":      r[1],
            "fatalities":     r[2] or 0,
            "avg_fatalities": r[3] or 0,
            "fatality_rate":  r[4] or 0,
        }
        for r in rows
    ])


# ─── /operators ───────────────────────────────────────────────────────────────
@router.get("/operators", response_model=APIResponse[list])
def get_operator_stats(
    db: Session = Depends(get_db),
    top_n: int = Query(20, ge=5, le=50),
):
    rows = _sql(db, """
        SELECT
            operator,
            COUNT(*)                                                     AS incidents,
            ROUND(SUM(fatalities), 1)                                    AS fatalities,
            ROUND(SUM(fatalities) * 1.0 / NULLIF(SUM(aboard), 0), 4)    AS fatality_rate,
            ROUND(AVG(fatalities), 2)                                    AS avg_fatalities_per_incident
        FROM incidents
        WHERE operator IS NOT NULL AND operator != ''
        GROUP BY operator
        ORDER BY incidents DESC
        LIMIT :top_n
    """, top_n=top_n)
    return APIResponse(data=[
        {
            "operator":                    r[0],
            "incidents":                   r[1],
            "fatalities":                  r[2] or 0,
            "fatality_rate":               r[3] or 0,
            "avg_fatalities_per_incident": r[4] or 0,
        }
        for r in rows
    ])


# ─── /aircraft ────────────────────────────────────────────────────────────────
@router.get("/aircraft", response_model=APIResponse[list])
def get_aircraft_stats(
    db: Session = Depends(get_db),
    top_n: int = Query(20, ge=5, le=50),
):
    rows = _sql(db, """
        SELECT
            aircraft_type,
            COUNT(*)                                                     AS incidents,
            ROUND(SUM(fatalities), 1)                                    AS fatalities,
            ROUND(SUM(fatalities) * 1.0 / NULLIF(SUM(aboard), 0), 4)    AS fatality_rate
        FROM incidents
        WHERE aircraft_type IS NOT NULL AND aircraft_type != ''
        GROUP BY aircraft_type
        ORDER BY incidents DESC
        LIMIT :top_n
    """, top_n=top_n)
    return APIResponse(data=[
        {
            "aircraft_type": r[0],
            "incidents":     r[1],
            "fatalities":    r[2] or 0,
            "fatality_rate": r[3] or 0,
        }
        for r in rows
    ])


# ─── /severity-dist ───────────────────────────────────────────────────────────
@router.get("/severity-dist", response_model=APIResponse[list])
def get_severity_dist(db: Session = Depends(get_db)):
    rows = _sql(db, """
        SELECT
            COALESCE(severity_label, 'Unknown') AS severity,
            COUNT(*)                            AS count
        FROM incidents
        GROUP BY severity
        ORDER BY count DESC
    """)
    total = sum(r[1] for r in rows) or 1
    return APIResponse(data=[
        {
            "severity":   r[0],
            "count":      r[1],
            "percentage": round(r[1] / total * 100, 2),
        }
        for r in rows
    ])


# ─── /umap ────────────────────────────────────────────────────────────────────
@router.get("/umap", response_model=APIResponse[list])
def get_umap_data(
    db: Session = Depends(get_db),
    limit: int = Query(2000, ge=100, le=5000),
):
    rows = _sql(db, """
        SELECT
            id, umap_x, umap_y, cluster_id,
            severity_label, fatalities, year, operator
        FROM incidents
        WHERE umap_x IS NOT NULL AND umap_y IS NOT NULL
        LIMIT :limit
    """, limit=limit)
    return APIResponse(data=[
        {
            "id":         r[0],
            "x":          round(float(r[1]), 4),
            "y":          round(float(r[2]), 4),
            "cluster":    int(r[3]) if r[3] is not None else -1,
            "severity":   r[4] or "Unknown",
            "fatalities": int(r[5]) if r[5] is not None else 0,
            "year":       int(r[6]) if r[6] is not None else 0,
            "operator":   r[7] or "Unknown",
        }
        for r in rows
    ])


# ─── /correlations ────────────────────────────────────────────────────────────
@router.get("/correlations", response_model=APIResponse[dict])
def get_correlation_matrix(db: Session = Depends(get_db)):
    # Only load the 6 numeric columns needed — not full table
    df = pd.read_sql(
        "SELECT aboard, fatalities, ground, year, fatality_rate, survival_count FROM incidents",
        engine,
    )
    df = df.apply(pd.to_numeric, errors="coerce").dropna()
    corr = df.corr().round(4)
    matrix = corr.to_dict()

    # Pre-computed insights sorted by |r|
    insights = []
    cols = list(corr.columns)
    for i, c1 in enumerate(cols):
        for c2 in cols[i + 1:]:
            r = corr.loc[c1, c2]
            if abs(r) > 0.1:
                insights.append({
                    "var1": c1, "var2": c2,
                    "r": round(r, 4),
                    "strength": (
                        "strong" if abs(r) > 0.7 else
                        "moderate" if abs(r) > 0.4 else "weak"
                    ),
                    "direction": "positive" if r > 0 else "negative",
                })
    insights.sort(key=lambda x: -abs(x["r"]))
    return APIResponse(data={"matrix": matrix, "insights": insights})


# ─── /chi-square ──────────────────────────────────────────────────────────────
@router.get("/chi-square", response_model=APIResponse[list])
def get_chi_square_tests(db: Session = Depends(get_db)):
    from scipy.stats import chi2_contingency
    # Only load minimal columns
    df = pd.read_sql(
        "SELECT severity_label, operator, year FROM incidents WHERE severity_label IS NOT NULL",
        engine,
    )
    df["decade"] = (df["year"] // 10 * 10).astype(str) + "s"
    df["operator_category"] = df["operator"].apply(
        lambda x: (
            "Military"   if isinstance(x, str) and "military" in x.lower() else
            "Private"    if isinstance(x, str) and any(k in x.lower() for k in ["private", "charter"]) else
            "Commercial"
        )
    )
    top10 = df["operator"].value_counts().head(10).index
    df_top = df[df["operator"].isin(top10)]

    results = []
    tests = [
        ("Severity vs Operator Category", df,     "severity_label", "operator_category"),
        ("Severity vs Decade",            df,     "severity_label", "decade"),
        ("Severity vs Top 10 Operators",  df_top, "severity_label", "operator"),
    ]
    for name, frame, r, c in tests:
        try:
            ct = pd.crosstab(frame[r], frame[c])
            chi2, p, dof, _ = chi2_contingency(ct)
            results.append({
                "test":            name,
                "chi2":            round(chi2, 4),
                "p_value":         round(p, 6),
                "dof":             dof,
                "significant":     p < 0.05,
                "interpretation":  (
                    f"Significant association between {r} and {c} (p={p:.4f})"
                    if p < 0.05 else
                    f"No significant association between {r} and {c} (p={p:.4f})"
                ),
            })
        except Exception as e:
            results.append({"test": name, "error": str(e)})
    return APIResponse(data=results)


# ─── /summary (single call for dashboard) ────────────────────────────────────
@router.get("/summary", response_model=APIResponse[dict])
def get_full_summary(db: Session = Depends(get_db)):
    overview_resp  = get_overview(db)
    yearly_resp    = get_yearly_trends(db)
    severity_resp  = get_severity_dist(db)
    decade_resp    = get_decade_stats(db)
    return APIResponse(data={
        "overview":  overview_resp.data,
        "yearly":    yearly_resp.data,
        "severity":  severity_resp.data,
        "decade":    decade_resp.data,
    })
