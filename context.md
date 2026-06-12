# Aviation Intelligence System — Project Context

Last updated: 2026-06-12

---

## Architecture Overview

Full-stack aviation incident analysis platform.

- **Backend**: Python 3.12 · FastAPI · SQLAlchemy · SQLite
- **Frontend**: React 19 · TypeScript · Vite · TanStack Query · Tailwind CSS · Recharts · Framer Motion
- **ML pipeline**: sentence-transformers (all-MiniLM-L6-v2) → UMAP 384D→50D → HDBSCAN → UMAP 384D→2D → XGBoost severity classifier
- **LLM**: Groq (llama-3.1-8b-instant) for per-incident extraction + cluster summarization
- **Deployment**: Docker (backend on Render) + Vercel (frontend)

---

## Data Flow

```
CSV Upload → Data Cleaning → Sentence Embedding → UMAP 50D → HDBSCAN →
UMAP 2D → XGBoost Severity → Groq LLM Extraction → REST API → React Dashboard
```

---

## File Structure

```
backend/app/
  main.py          — FastAPI app factory, lifespan, CORS, middleware
  config.py        — Pydantic settings (env vars, paths, ML params)
  database.py      — SQLAlchemy engine + session factory + get_db
  models/
    incident.py    — Incident ORM model (6,900+ records)
    cluster.py     — Cluster ORM model (HDBSCAN output)
    analysis.py    — AnalysisRun ORM model; ModelMetrics ORM model
  schemas/
    common.py      — APIResponse[T], PaginatedResponse[T]
    incident.py    — IncidentRead, IncidentSummary Pydantic schemas
  api/v1/
    router.py      — Aggregates all sub-routers
    incidents.py   — CRUD + paginated list with filter/sort
    analysis.py    — Statistical endpoints (overview, trends, UMAP, etc.)
    clusters.py    — Cluster read endpoints
    llm.py         — LLM health, pipeline trigger, cluster summaries
    model.py       — ML metrics endpoints (reads model_metrics table)
    pipeline.py    — Pipeline status endpoint (added 2026-06-12)
    upload.py      — CSV upload + pipeline trigger endpoint (added 2026-06-12)
  core/
    exceptions.py  — AFISException + global exception handlers
    logging.py     — Structured logging setup
    middleware.py  — RequestLoggingMiddleware (request ID + timing)
  services/
    embedding_service.py  — sentence-transformers encoding
    clustering_service.py — UMAP + HDBSCAN + cluster stats
    ml_service.py         — XGBoost training + prediction
    llm_service.py        — Groq API client + retry logic
    statistical_service.py — Operator classification helper
  pipeline/
    orchestrator.py — Coordinates all pipeline stages, writes progress

frontend/src/
  App.tsx          — Routes + QueryClientProvider
  api/client.ts    — Axios instance + endpoint builders
  hooks/useAnalysis.ts — All TanStack Query hooks
  pages/
    Overview.tsx   — Stats cards + yearly trend chart
    Clusters.tsx   — Cluster cards with LLM summaries
    Analysis.tsx   — UMAP scatter + severity pie + decade bar
    Model.tsx      — Confusion matrix + per-class metrics
    Incidents.tsx  — Filterable + sortable incident table
  components/
    layout/Layout.tsx     — Sidebar + Outlet wrapper
    layout/Sidebar.tsx    — Collapsible nav sidebar
    layout/AviationBg.tsx — SVG radar rings background
    ui/GlassCard.tsx      — Animated glass-morphism card
    ui/StatCard.tsx       — Icon + value stat tile
    ui/Badge.tsx          — Severity color badge
    ui/PageHeader.tsx     — Page title + subtitle
```

---

## Design Decisions

- **Two-pass UMAP**: 384D→50D for HDBSCAN (avoids curse of dimensionality), separate 384D→2D for visualization (avoids topological distortion from chaining).
- **HDBSCAN over KMeans**: No predefined K required; handles non-spherical clusters; -1 label = explicit noise/anomaly detection.
- **XGBoost over RandomForest**: README says RandomForest but code uses XGBoost. 83% accuracy on severity classification. ~44 structural features + 600 TF-IDF terms.
- **Groq over local Ollama**: Speed (~1s/request), free tier, no GPU needed. RPM-limited to 30/min, so 2.1s sleep between calls.
- **SQLite**: Sufficient for read-heavy single-user analytics. Future: migrate to PostgreSQL for multi-user.
- **Hard-wired RUN_ID=2**: Frontend hooks hard-code `RUN_ID = 2`. Only run 2 data is shown. No multi-run UI.
- **Glass morphism UI**: Dark navy theme (bg #020817), cyan/teal accent, subtle glass cards with backdrop-blur.

---

## Security Findings

| Severity | Issue | Status |
|----------|-------|--------|
| CRITICAL | `backend/.env` tracked by git with real Groq API key | Fixed: removed from tracking 2026-06-12 |
| HIGH | CORS configured as `allow_origins=["*"]` with `allow_credentials=True` | Fixed 2026-06-12 |
| MEDIUM | `console.log("API BASE =", API_BASE)` in production bundle | Fixed 2026-06-12 |
| LOW | Error messages hardcode `localhost:8000` in production UI | Fixed 2026-06-12 |
| LOW | No rate limiting on any endpoints | Pending |
| LOW | No authentication / authorization on any endpoints | Pending (acceptable for read-only demo) |

**IMPORTANT**: The Groq API key `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` was committed to git history. Rotate this key immediately.

---

## Critical Bugs Fixed (2026-06-12)

### 1. Missing ORM model fields
- `AnalysisRun` was missing `stage`, `progress`, `num_clusters` — the orchestrator was writing to these attributes silently (no DB persistence)
- `Incident` was missing `survival_count`, `extracted_at` — analysis.py queried `survival_count` causing SQL errors; orchestrator wrote `extracted_at` without persisting
- `Cluster` was missing `analysis_run_id` — orchestrator set this without the ORM column
- `ModelMetrics` model was completely absent from `analysis.py` — orchestrator imports and uses it; would have thrown `ImportError` on ML pipeline run

### 2. JSON parsing bug in LLMService
- `parts[1].split("```").strip()` — calling `.strip()` on a list, throws `AttributeError`
- Fixed to `parts[1].split("```")[0].strip()`

### 3. CORS wildcard + credentials
- `allow_origins=["*"]` with `allow_credentials=True` is disallowed by CORS spec (browsers reject it)
- Fixed to use `settings.ALLOWED_ORIGINS` with `allow_credentials=False`

### 4. Missing `/api/v1/pipeline/{run_id}/status` endpoint
- Frontend polls this URL for pipeline progress; endpoint didn't exist
- Added `pipeline.py` router with status + list endpoints

### 5. Missing upload endpoint
- README documents `POST /api/v1/upload` but no such route existed
- Added `upload.py` router

### 6. Frontend hardcoded `localhost:8000`
- App.tsx used `localhost:8000` fallback instead of `localhost:10000` (the actual dev port)
- All error states also hardcoded `localhost:8000`

### 7. Duplicate QueryClient instance
- `client.ts` exported a `queryClient` that was never used (App.tsx creates its own)
- Removed unused export

### 8. `APIResponse` missing `message` field
- `llm.py` passes `message=` to `APIResponse()` but schema had no such field
- Silently dropped; now preserved

---

## Technical Debt

- **No database migrations**: Schema changes require dropping tables on fresh deploy. Production SQLite on Render will lose data on re-deploy unless a persistent disk is mounted.
- **Hardcoded RUN_ID=2**: Frontend always shows run 2. No UI to select analysis runs or trigger new ones.
- **No upload UI**: CSV upload + pipeline trigger only possible via curl. No UI workflow.
- **No test suite**: Zero tests (unit, integration, or e2e).
- **Compiled `.js`/`.d.ts` files alongside `.ts` sources**: Frontend `src/` contains compiled output. Should be in `.gitignore`.
- **Multiple backup `.db` files** in root directory committed to repo.
- **`catboost_info/` directory** in backend (artifact from CatBoost which is not the current model).
- **README says RandomForest** but code uses XGBoost. README is inaccurate.

---

## Completed Improvements (2026-06-12)

### Phase 1 — Repository Audit
- Comprehensive audit of all 14 backend Python files and 12 frontend TypeScript files
- Documented all architecture, data flow, security issues, and bugs in this context.md

### Phase 2 — Architecture Fixes
- Added `stage`, `progress`, `num_clusters` to `AnalysisRun` ORM model
- Added `ModelMetrics` ORM model (was completely missing)
- Added `survival_count`, `extracted_at` to `Incident` ORM model
- Added `analysis_run_id` to `Cluster` ORM model
- Registered `ModelMetrics` in `models/__init__.py` for `create_all`
- Fixed `model.py` to query `model_metrics WHERE analysis_run_id` (not `id`)

### Phase 3 — Product Logic
- Added `/api/v1/pipeline/{run_id}/status` and `/api/v1/pipeline` endpoints
- Added `/api/v1/upload` endpoint with full CSV validation + pipeline trigger
- Fixed `analysis.py` SQL to remove non-existent `survival_count` column reference
- Fixed `model.py` + orchestrator to correctly label "XGBClassifier" (was "RandomForestClassifier")
- Fixed deprecated FastAPI `regex=` → `pattern=` in `incidents.py`
- Added `message` field to `APIResponse` schema
- Model.py `_get_row` now queries by `analysis_run_id` correctly

### Phase 4 — Security
- Fixed CORS: `allow_origins=settings.ALLOWED_ORIGINS` (was `["*"]`), `allow_credentials=False`
- Removed `"*"` wildcard from `ALLOWED_ORIGINS` defaults
- Fixed LLMService JSON parsing bug: `parts[1].split("```").strip()` → `parts[1].split("```")[0].strip()`
- Improved `.gitignore` to cover compiled JS/TS files, backup DBs, and upload artifacts

### Phase 5 — UX
- Added incident detail modal in `Incidents.tsx` (click any row to open full incident view)
- Expanded decade filter from 1960s–2000s to 1910s–2010s (full dataset range)
- Added prev/next pagination buttons alongside page number buttons
- Replaced duplicate inline `ErrorState` components with shared `ErrorState` component
- Error messages no longer hardcode `localhost:8000`; show actual configured API URL

### Phase 6 — UI
- Created reusable `ErrorState` component used across all 4 pages
- Fixed Model page: "Random Forest" → "XGBoost" in labels, subtitle, and stat pill
- Fixed Overview: subtitle now shows "1908–2020" (was "1908–2009"), model label says "XGBoost"
- Removed `console.log("API BASE = ...")` from production bundle

### Phase 7 — Performance
- Frontend bundle split into 6 chunks (was 1 monolith × 905KB → largest chunk 433KB recharts)
- Removed unused duplicate `QueryClient` export from `client.ts`
- Fixed Vite dev proxy target from port 8000 → 10000

### Phase 8 — Developer Experience
- Fixed App.tsx localhost fallback from 8000 → 10000 (matching actual backend port)
- Added `useIncidentDetail` hook for future use
- Added `tfidfVocabSize` to `useModelMetricsFull` return value
- Fixed `vite.config.js` and `vite.config.ts` to match (Vite was loading stale .js)

## Pending Work

- [ ] Add CSV upload workflow UI (currently endpoint-only, no UI)
- [ ] Run selection UI (switch between analysis runs, currently hardcoded to RUN_ID=2)
- [ ] Rate limiting on API endpoints (no auth layer exists)
- [ ] PostgreSQL migration for production persistence (SQLite lost on Render re-deploy)
- [ ] Test suite (pytest for backend, vitest for frontend — zero tests currently)
- [ ] CI/CD pipeline (GitHub Actions)
- [ ] Remove compiled JS/d.ts files from `frontend/src/` (in git, tracked by old commits)
- [ ] Clean up root-level .db backup files (4 files, in git, ~5MB)
- [ ] Update README to reflect XGBoost (not RandomForest)
- [ ] Date sorting on incidents works alphabetically not chronologically (dates stored as strings)

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/incidents` | List incidents (filter, sort, paginate) |
| GET | `/api/v1/incidents/stats` | Dataset stats |
| GET | `/api/v1/incidents/{id}` | Single incident detail |
| GET | `/api/v1/analysis/overview` | Global stats |
| GET | `/api/v1/analysis/trends/yearly` | Yearly trends |
| GET | `/api/v1/analysis/trends/decade` | Decade breakdown |
| GET | `/api/v1/analysis/operators` | Top operators |
| GET | `/api/v1/analysis/aircraft` | Top aircraft types |
| GET | `/api/v1/analysis/severity-dist` | Severity distribution |
| GET | `/api/v1/analysis/umap` | UMAP 2D scatter data |
| GET | `/api/v1/analysis/correlations` | Correlation matrix |
| GET | `/api/v1/analysis/chi-square` | Chi-square tests |
| GET | `/api/v1/analysis/summary` | Combined summary |
| GET | `/api/v1/clusters` | All clusters |
| GET | `/api/v1/clusters/{id}` | Single cluster |
| GET | `/api/v1/llm/health` | Groq API health check |
| POST | `/api/v1/llm/run/{run_id}` | Trigger LLM pipeline |
| GET | `/api/v1/llm/clusters` | All cluster summaries |
| GET | `/api/v1/llm/clusters/{label}` | Single cluster summary |
| GET | `/api/v1/llm/extractions/stats` | Extraction coverage |
| GET | `/api/v1/model/metrics/{run_id}` | Full model metrics |
| GET | `/api/v1/model/metrics/{run_id}/summary` | Summary metrics |
| GET | `/api/v1/model/metrics/{run_id}/confusion-matrix` | Confusion matrix |
| GET | `/api/v1/model/metrics/{run_id}/feature-importances` | Feature importances |
| GET | `/api/v1/model/metrics` | All runs metrics |
| GET | `/api/v1/model/status` | Model status |
| GET | `/api/v1/pipeline/{run_id}/status` | Pipeline status (added 2026-06-12) |
| GET | `/api/v1/pipeline` | List all pipeline runs (added 2026-06-12) |
| POST | `/api/v1/upload` | Upload CSV + trigger pipeline (added 2026-06-12) |

---

## Environment Variables

```
# Backend (backend/.env)
GROQ_API_KEY=...          # Groq API key (ROTATE — was in git history)
DATABASE_URL=sqlite:////app/data/aviation.db
ALLOWED_ORIGINS=["https://aviation-intelligence-system.vercel.app"]
ENVIRONMENT=production
PORT=10000
EMBEDDING_MODEL=all-MiniLM-L6-v2

# Frontend (frontend/.env.local for dev)
VITE_API_URL=http://localhost:10000
```

---

## Known Deployment Notes

- Backend on Render free tier: SQLite lives in `/app/data/`. Data lost on re-deploy unless a persistent disk is attached.
- Frontend on Vercel: Static SPA with `vercel.json` configuring SPA routing rewrites.
- CORS: Backend must have Vercel URL in `ALLOWED_ORIGINS` env var.
