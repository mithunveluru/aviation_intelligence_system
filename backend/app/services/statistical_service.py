import logging
import pandas as pd
import numpy as np
from scipy import stats

logger = logging.getLogger(__name__)


class StatisticalService:

    # ── Overview ──────────────────────────────────────────────────────────────

    def compute_overview(self, df: pd.DataFrame) -> dict:
        total = len(df)
        fatalities   = int(df["fatalities"].sum())   if "fatalities"   in df.columns else 0
        aboard       = int(df["aboard"].sum())        if "aboard"       in df.columns else 0
        survived     = aboard - fatalities
        fatality_rate  = round(fatalities / aboard, 4) if aboard > 0 else 0.0
        survival_rate  = round(survived   / aboard, 4) if aboard > 0 else 0.0

        year_min = int(df["year"].min()) if "year" in df.columns else 0
        year_max = int(df["year"].max()) if "year" in df.columns else 0

        unique_operators     = int(df["operator"].nunique())      if "operator"      in df.columns else 0
        unique_aircraft      = int(df["aircraft_type"].nunique()) if "aircraft_type" in df.columns else 0
        unique_locations     = int(df["location"].nunique())      if "location"      in df.columns else 0

        severity_dist = df["severity_label"].value_counts().to_dict() if "severity_label" in df.columns else {}

        return {
            "total_incidents":       total,
            "total_fatalities":      fatalities,
            "total_aboard":          aboard,
            "overall_fatality_rate": fatality_rate,
            "overall_survival_rate": survival_rate,
            "year_min":              year_min,
            "year_max":              year_max,
            "unique_operators":      unique_operators,
            "unique_aircraft_types": unique_aircraft,
            "unique_locations":      unique_locations,
            "severity_distribution": severity_dist,
        }

    def get_full_summary(self, df: pd.DataFrame) -> dict:
        return self.compute_overview(df)

    def get_overview_stats(self, df: pd.DataFrame) -> dict:
        return self.compute_overview(df)

    # ── Yearly trends ─────────────────────────────────────────────────────────

    def compute_yearly_trends(self, df: pd.DataFrame) -> list:
        if "year" not in df.columns:
            return []
        grp = df.groupby("year").agg(
            incident_count  =("year",       "count"),
            total_fatalities=("fatalities",  "sum"),
            total_aboard    =("aboard",      "sum"),
        ).reset_index()
        grp["avg_fatality_rate"] = (
            grp["total_fatalities"] / grp["total_aboard"].replace(0, np.nan) * 100
        ).round(2).fillna(0)
        grp["total_fatalities"] = grp["total_fatalities"].astype(int)
        grp["total_aboard"]     = grp["total_aboard"].astype(int)
        return grp.to_dict(orient="records")

    # ── Decade trends ─────────────────────────────────────────────────────────

    def compute_decade_stats(self, df: pd.DataFrame) -> list:
        return self.compute_decade_trends(df)

    def compute_decade_trends(self, df: pd.DataFrame) -> list:
        if "year" not in df.columns:
            return []
        df = df.copy()
        df["decade"] = (df["year"] // 10 * 10).astype(str) + "s"
        df["decade_label"] = df["decade"]
        grp = df.groupby("decade_label").agg(
            incident_count  =("year",       "count"),
            total_fatalities=("fatalities",  "sum"),
            total_aboard    =("aboard",      "sum"),
        ).reset_index()
        grp["avg_fatality_rate"] = (
            grp["total_fatalities"] / grp["total_aboard"].replace(0, np.nan) * 100
        ).round(2).fillna(0)
        grp["total_fatalities"] = grp["total_fatalities"].astype(int)
        return grp.to_dict(orient="records")

    # ── Severity distribution ─────────────────────────────────────────────────

    def get_severity_distribution(self, df: pd.DataFrame) -> list:
        if "severity_label" not in df.columns:
            return []
        counts = df["severity_label"].value_counts()
        total = counts.sum()
        return [
            {"severity": k, "count": int(v), "percentage": round(v / total * 100, 1)}
            for k, v in counts.items()
        ]

    def compute_severity_distribution(self, df: pd.DataFrame) -> list:
        return self.get_severity_distribution(df)

    # ── Operator / Aircraft stats ─────────────────────────────────────────────

    def compute_operator_stats(self, df: pd.DataFrame, top_n: int = 10) -> list:
        col = next((c for c in ["operator", "airline"] if c in df.columns), None)
        if not col:
            return []
        counts = df[col].value_counts().head(top_n)
        total = len(df)
        return [
            {
                "operator":       k,
                "incident_count": int(v),
                "percentage":     round(v / total * 100, 1),
                "fatalities":     int(df[df[col] == k]["fatalities"].sum()) if "fatalities" in df.columns else 0,
            }
            for k, v in counts.items()
        ]

    def compute_aircraft_stats(self, df: pd.DataFrame, top_n: int = 10) -> list:
        col = next((c for c in ["aircraft_type", "aircraft"] if c in df.columns), None)
        if not col:
            return []
        counts = df[col].value_counts().head(top_n)
        total = len(df)
        return [
            {
                "aircraft_type":  k,
                "incident_count": int(v),
                "percentage":     round(v / total * 100, 1),
                "fatalities":     int(df[df[col] == k]["fatalities"].sum()) if "fatalities" in df.columns else 0,
            }
            for k, v in counts.items()
        ]

    # ── Statistical tests ─────────────────────────────────────────────────────

    def compute_chi_square_tests(self, df: pd.DataFrame) -> dict:
        results = {}
        try:
            if "severity_label" in df.columns and "year" in df.columns:
                df2 = df.copy()
                df2["decade"] = (df2["year"] // 10 * 10).astype(str) + "s"
                ct = pd.crosstab(df2["severity_label"], df2["decade"])
                chi2, p, dof, _ = stats.chi2_contingency(ct)
                results["severity_vs_decade"] = {
                    "chi2": round(float(chi2), 4),
                    "p_value": round(float(p), 6),
                    "degrees_of_freedom": int(dof),
                    "significant": bool(p < 0.05),
                }
        except Exception as e:
            results["error"] = str(e)
        return results

    def compute_correlation_matrix(self, df: pd.DataFrame) -> dict:
        numeric_cols = [c for c in ["fatalities", "aboard", "year"] if c in df.columns]
        if len(numeric_cols) < 2:
            return {"columns": [], "matrix": []}
        corr = df[numeric_cols].corr().round(4)
        return {"columns": numeric_cols, "matrix": corr.values.tolist()}

    # ── Aliases ───────────────────────────────────────────────────────────────

    def compute_summary(self, df: pd.DataFrame) -> dict:
        return self.compute_overview(df)

    def compute_statistics(self, df: pd.DataFrame) -> dict:
        return self.compute_overview(df)

    def compute_trends(self, df: pd.DataFrame) -> list:
        return self.compute_yearly_trends(df)
