import logging
import pandas as pd

logger = logging.getLogger(__name__)

class StatisticalService:
    def get_full_summary(self, df: pd.DataFrame) -> dict:
        total = len(df)
        fatalities = int(df["fatalities"].sum()) if "fatalities" in df.columns else 0
        severity_dist = df["severity_label"].value_counts().to_dict() if "severity_label" in df.columns else {}
        return {"total_incidents": total, "total_fatalities": fatalities, "severity_distribution": severity_dist}

    def get_severity_distribution(self, df: pd.DataFrame) -> list:
        if "severity_label" not in df.columns:
            return []
        counts = df["severity_label"].value_counts()
        total = counts.sum()
        return [{"severity": k, "count": int(v), "percentage": round(v / total * 100, 1)} for k, v in counts.items()]

    def get_trends_by_decade(self, df: pd.DataFrame) -> list:
        if "year" not in df.columns:
            return []
        df = df.copy()
        df["decade"] = (df["year"] // 10 * 10).astype(str) + "s"
        grouped = df.groupby("decade").agg(incidents=("year", "count"), fatalities=("fatalities", "sum")).reset_index()
        return grouped.to_dict(orient="records")

    def get_trends_by_year(self, df: pd.DataFrame) -> list:
        if "year" not in df.columns:
            return []
        grouped = df.groupby("year").agg(incidents=("year", "count"), fatalities=("fatalities", "sum")).reset_index()
        return grouped.to_dict(orient="records")

    def get_overview_stats(self, df: pd.DataFrame) -> dict:
        return self.get_full_summary(df)
