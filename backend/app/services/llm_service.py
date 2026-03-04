import json
import logging
import time

from pydantic import BaseModel, field_validator
from app.config import settings

logger = logging.getLogger(__name__)

_VALID_CAUSES = {
    "Mechanical", "Weather", "Human Error",
    "Structural", "Fire", "Navigation", "Unknown",
}
_VALID_PHASES = {
    "Takeoff", "Cruise", "Landing", "Ground",
    "Approach", "Climb", "Descent", "Unknown",
}
_CAUSE_ALIASES = {
    "Mechanical Failure":  "Mechanical",
    "Pilot Error":         "Human Error",
    "Crew Error":          "Human Error",
    "Structural Failure":  "Structural",
    "Terrorism":           "Unknown",
    "Sabotage":            "Unknown",
}


class IncidentExtraction(BaseModel):
    cause_category: str = "Unknown"
    phase_of_flight: str = "Unknown"
    contributing_factors: list[str] = []
    is_mechanical_failure: bool = False
    is_weather_related: bool = False
    is_human_error: bool = False

    @field_validator("cause_category", mode="before")
    @classmethod
    def validate_cause(cls, v: str) -> str:
        if not v:
            return "Unknown"
        candidates = [s.strip().title() for s in str(v).replace(",", "|").split("|")]
        for candidate in candidates:
            normalized = _CAUSE_ALIASES.get(candidate, candidate)
            if normalized in _VALID_CAUSES:
                return normalized
        return "Unknown"

    @field_validator("phase_of_flight", mode="before")
    @classmethod
    def validate_phase(cls, v: str) -> str:
        if not v:
            return "Unknown"
        candidates = [s.strip().title() for s in str(v).replace(",", "|").split("|")]
        for candidate in candidates:
            if candidate in _VALID_PHASES:
                return candidate
        return "Unknown"

    @field_validator("contributing_factors", mode="before")
    @classmethod
    def validate_factors(cls, v) -> list[str]:
        if not isinstance(v, list):
            return []
        return [str(f).strip() for f in v if f][:5]


class ClusterSummary(BaseModel):
    root_cause_summary: str = ""
    key_contributing_factors: list[str] = []
    recommendations: str = ""

    @field_validator("key_contributing_factors", mode="before")
    @classmethod
    def validate_factors(cls, v) -> list[str]:
        if not isinstance(v, list):
            return []
        return [str(f).strip() for f in v if f][:6]

    @field_validator("root_cause_summary", "recommendations", mode="before")
    @classmethod
    def validate_text(cls, v) -> str:
        return str(v).strip() if v else ""


class LLMService:
    """
    Groq-backed LLM service for structured aviation incident analysis.
    Uses llama-3.1-8b-instant — free tier: 14,400 RPD, 30 RPM.
    Fast (~1s/request), reliable JSON output, no billing required.
    """

    _EXTRACTION_PROMPT = (
        "You are an aviation safety analyst. Extract structured data from the incident report below.\n"
        "You MUST respond with ONLY a valid JSON object. No explanation. No markdown. No code blocks.\n"
        "Start your response with {{ and end with }}.\n\n"
        "Required JSON structure:\n"
        "{{\n"
        "  \"cause_category\": \"Mechanical|Weather|Human Error|Structural|Fire|Navigation|Unknown\",\n"
        "  \"phase_of_flight\": \"Takeoff|Cruise|Landing|Ground|Approach|Climb|Descent|Unknown\",\n"
        "  \"contributing_factors\": [\"factor1\", \"factor2\", \"factor3\"],\n"
        "  \"is_mechanical_failure\": true,\n"
        "  \"is_weather_related\": false,\n"
        "  \"is_human_error\": false\n"
        "}}\n\n"
        "INCIDENT REPORT:\n{summary}\n\n"
        "JSON response:"
    )

    _CLUSTER_PROMPT = (
        "You are a senior aviation safety engineer conducting a failure pattern analysis.\n"
        "You MUST respond with ONLY a valid JSON object. No explanation. No markdown. No code blocks.\n"
        "Start your response with {{ and end with }}.\n\n"
        "CLUSTER PROFILE ({count} incidents, {year_start}-{year_end}):\n"
        "- Dominant severity: {severity}\n"
        "- Average fatality rate: {fatality_rate}\n"
        "- Common operators: {operators}\n"
        "- Common aircraft types: {aircraft}\n\n"
        "REPRESENTATIVE INCIDENT SUMMARIES:\n"
        "{summaries}\n\n"
        "Required JSON structure:\n"
        "{{\n"
        "  \"root_cause_summary\": \"2-3 technical sentences identifying the primary failure pattern\",\n"
        "  \"key_contributing_factors\": [\"factor1\", \"factor2\", \"factor3\", \"factor4\"],\n"
        "  \"recommendations\": \"2-3 specific actionable safety recommendations\"\n"
        "}}\n\n"
        "JSON response:"
    )

    def __init__(self) -> None:
        from groq import Groq
        self._client = Groq(api_key=settings.GROQ_API_KEY)
        self._model = "llama-3.1-8b-instant"
        self._rpm_delay = 2.1  # 30 RPM → 1 call per 2.1s

    def is_available(self) -> bool:
        key = settings.GROQ_API_KEY
        if not key or key.strip() == "":
            logger.warning("GROQ_API_KEY is not set.")
            return False
        return True

    def extract_incident_fields(self, summary: str, max_retries: int = 3) -> IncidentExtraction:
        if not summary or not summary.strip():
            return IncidentExtraction()
        prompt = self._EXTRACTION_PROMPT.format(summary=summary.strip()[:800])
        return self._call_with_retry(
            prompt=prompt, schema=IncidentExtraction,
            label="extraction", max_retries=max_retries,
        )

    def summarize_cluster(
        self, cluster_label: int, summaries: list[str],
        stats: dict, max_retries: int = 3,
    ) -> ClusterSummary:
        if not summaries:
            return ClusterSummary(
                root_cause_summary=(
                    f"Cluster {cluster_label} contains incidents without "
                    "sufficient summary text for LLM analysis."
                ),
                key_contributing_factors=[],
                recommendations="Collect more incident documentation for this cluster.",
            )
        formatted = "\n\n".join(
            f"[{i+1}] {s.strip()[:350]}{'...' if len(s) > 350 else ''}"
            for i, s in enumerate(summaries)
        )
        rate = stats.get("avg_fatality_rate") or 0.0
        operators = ", ".join(stats.get("top_operators") or [])[:150] or "Various"
        aircraft = ", ".join(stats.get("top_aircraft_types") or [])[:150] or "Various"
        prompt = self._CLUSTER_PROMPT.format(
            count=stats.get("incident_count", len(summaries)),
            year_start=stats.get("year_range_start", "Unknown"),
            year_end=stats.get("year_range_end", "Unknown"),
            severity=stats.get("dominant_severity", "Unknown"),
            fatality_rate=f"{rate:.1%}",
            operators=operators, aircraft=aircraft, summaries=formatted,
        )
        result = self._call_with_retry(
            prompt=prompt, schema=ClusterSummary,
            label=f"cluster_{cluster_label}", max_retries=max_retries,
        )
        logger.info(f"Cluster {cluster_label} summarized — cause: {result.root_cause_summary[:80]}...")
        return result

    def _call_with_retry(self, prompt, schema, label, max_retries):
        last_exc = None
        for attempt in range(1, max_retries + 1):
            try:
                raw = self._call_llm(prompt)
                parsed = self._parse_json(raw)
                return schema(**parsed)
            except Exception as exc:
                last_exc = exc
                if attempt < max_retries:
                    wait = 2 ** attempt
                    logger.warning(
                        f"[{label}] Attempt {attempt}/{max_retries} failed: "
                        f"{type(exc).__name__}: {exc}. Retrying in {wait}s..."
                    )
                    time.sleep(wait)
        logger.error(f"[{label}] All {max_retries} attempts failed. Last: {last_exc}. Returning defaults.")
        return schema()

    def _call_llm(self, prompt: str) -> str:
        try:
            response = self._client.chat.completions.create(
                model=self._model,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.1,
                max_tokens=1024,
            )
            raw = response.choices[0].message.content.strip()
            if not raw:
                raise ValueError("Groq returned empty response")
            logger.debug(f"Groq response ({len(raw)} chars): {raw[:120]}...")
            return raw
        except Exception as exc:
            if "429" in str(exc) or "rate" in str(exc).lower():
                logger.warning("Groq rate limit hit. Waiting 60s...")
                time.sleep(60)
            raise
        finally:
            time.sleep(self._rpm_delay)

    @staticmethod
    def _parse_json(raw: str) -> dict:
        try:
            return json.loads(raw)
        except json.JSONDecodeError:
            pass
        clean = raw.strip()
        for marker in ("```json", "```"):
            if marker in clean:
                parts = clean.split(marker)
                if len(parts) >= 2:
                    clean = parts[1].split("```").strip()
                    break
        try:
            return json.loads(clean)
        except json.JSONDecodeError:
            pass
        start = clean.find("{")
        end = clean.rfind("}")
        if start != -1 and end > start:
            try:
                return json.loads(clean[start:end + 1])
            except json.JSONDecodeError:
                pass
        raise ValueError(f"Could not parse JSON from LLM output. First 200 chars: {raw[:200]!r}")
