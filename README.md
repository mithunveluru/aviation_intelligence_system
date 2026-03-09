```markdown
# Aviation Failure Intelligence System

A data platform for analyzing historical aviation incidents, identifying failure
patterns, and surfacing the kind of trends that safety teams and investigators
spend weeks trying to find manually.

Live demo: https://aviation-intelligence-system.vercel.app  
API: https://aviation-intelligence-system.onrender.com

---

## Project Overview

This system takes raw aviation incident records — operator, aircraft type,
location, fatalities, narrative summary — and turns them into structured,
searchable intelligence. It covers over 6,900 incidents spanning 1908 to 2009.

You can explore yearly trends, filter incidents by severity, see how failure
patterns cluster together, and understand what the historical data actually says
about risk — without writing a single SQL query.

The backend runs a full ML pipeline: data cleaning, semantic embeddings, cluster
discovery, severity classification, and LLM-assisted root cause extraction. The
frontend presents it all through a dashboard built for clarity, not complexity.

---

## Why This Project Exists

Aviation is one of the safest forms of transport in the world — and it got that
way because the industry takes incident reporting seriously. Every near-miss,
every system failure, every runway excursion gets documented. The problem is
that this data, once collected, often sits in spreadsheets or PDFs that are
difficult to analyze at scale.

A safety analyst trying to answer "what are the most common mechanical failure
modes in regional turboprops over the last 30 years?" might spend days pulling
records and building pivot tables. This project was built to make that kind of
question answerable in seconds.

The goal was not to build another dashboard for the sake of it. The goal was to
show that with the right tooling, historical incident data becomes genuinely
useful for the people responsible for keeping aircraft and passengers safe.

---

## Real-World Impact

Aviation safety depends on learning from what has already happened. The NTSB,
ICAO, and airline safety departments all publish incident data, but synthesizing
it across thousands of records is hard without automation.

This platform demonstrates a few things that matter in practice:

**Earlier pattern detection.** When you can cluster incidents by semantic
similarity — not just by category codes — you start seeing failure patterns that
manual tagging misses. Two incidents logged under different cause codes might
describe the same underlying problem in different words.

**Better briefings for safety teams.** Instead of raw tables, teams get
cluster-level summaries: dominant failure type, top operators involved, year
range, average fatality rate. That's the context an investigator needs at the
start of a review, not after three hours of data wrangling.

**Trend visibility across decades.** A spike in a particular failure mode in the
1970s might be explained by a regulatory change or a specific aircraft type's
retirement. Visualizing incident rates year by year makes those inflection points
visible.

**Severity prediction on unlabeled records.** Not every incident in historical
datasets has a clean severity label. The RandomForest classifier in this pipeline
fills that gap — it learns from labeled records and assigns severity estimates to
the rest, increasing usable dataset coverage.

---

## Key Features

- Upload any aviation incident CSV and run the full analysis pipeline
- Automatic data cleaning: null handling, type normalization, severity labeling
- Semantic clustering using sentence embeddings + HDBSCAN — no predefined
  number of clusters required
- 2D scatter visualization of incident clusters via UMAP dimensionality reduction
- RandomForest severity classifier with 83.1% accuracy on held-out data
- LLM-assisted extraction of root cause, phase of flight, and contributing factors
- Filterable incident table: search by operator, aircraft, location, severity, decade
- Year-by-year trend chart covering the full date range
- REST API with clean, documented endpoints for integration into other tools

---

## System Architecture

```
CSV Upload
    │
    ▼
Cleaning & Normalization        FastAPI BackgroundTask
    │
    ▼
Sentence Embeddings             all-MiniLM-L6-v2 (384-dim)
    │
    ▼
UMAP Reduction (384D → 50D)     For clustering quality
    │
    ▼
HDBSCAN Clustering              Discovers failure pattern groups
    │
    ▼
UMAP Reduction (384D → 2D)      For scatter visualization
    │
    ▼
RandomForest Classifier         Severity prediction on unlabeled rows
    │
    ▼
LLM Extraction                  Root cause, phase of flight, factors
    │
    ▼
REST API → React Dashboard
```

**Backend:** Python 3.12, FastAPI, SQLAlchemy, SQLite  
**ML:** scikit-learn, HDBSCAN, UMAP, sentence-transformers  
**LLM:** Groq API, Google Gemini  
**Frontend:** React 18, TypeScript, Vite, Recharts, TanStack Query, Tailwind CSS  
**Deployment:** Docker on Render (backend), Vercel (frontend)

---

## Example Insights the Platform Can Provide

- *"Structural and systems failures account for the largest single cluster —
  4,564 incidents — with an average fatality rate significantly above the
  dataset mean."*

- *"Incidents involving navigation error and pilot decision-making form a
  distinct cluster separate from mechanical failures, concentrated between
  1960 and 1985."*

- *"Helicopter incidents cluster separately from fixed-wing accidents, with
  rotor and tail-rotor failures as the dominant failure mode."*

- *"Fatalities per incident peaked in the 1970s and declined steadily through
  the 1990s, consistent with the introduction of GPWS and improved ATC
  separation standards."*

These are the kinds of observations that take analysts days to produce from raw
data. The platform surfaces them in the time it takes to upload a CSV and run
the pipeline.

---

## Running the Project Locally

**Requirements:** Docker, or Python 3.12 + Node 18+

### With Docker

```bash
git clone https://github.com/mithunveluru/aviation_intelligence_system
cd aviation_intelligence_system/backend
docker build -t aviation-backend .
docker run -p 10000:10000 aviation-backend
```

### Without Docker

```bash
# Backend
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 10000

# Frontend — separate terminal
cd frontend
npm install
npm run dev       # opens at http://localhost:5173
```

Create `frontend/.env.local` with:
```
VITE_API_URL=http://localhost:10000
```

### Run the pipeline after startup

```bash
# Upload your CSV
curl -X POST http://localhost:10000/api/v1/upload \
  -F "file=@your_data.csv"

# Poll until cleaned
curl http://localhost:10000/api/v1/pipeline/1/status

# Run clustering
curl -X POST http://localhost:10000/api/v1/clusters/run/1

# Train classifier
curl -X POST http://localhost:10000/api/v1/model/train/1

# Run LLM extraction
curl -X POST "http://localhost:10000/api/v1/llm/run/1?extract_limit=200"
```

### Environment variables (backend)

```
DATABASE_URL=sqlite:///./data/aviation.db
ALLOWED_ORIGINS=["https://your-frontend-domain.com"]
GROQ_API_KEY=your_key
GOOGLE_API_KEY=your_key
ENVIRONMENT=production
PORT=10000
```

> ALLOWED_ORIGINS must be a valid JSON array string, not a bare URL.
> A malformed value here will crash the server on startup.

---

## Future Improvements

**Real-time incident feeds.** Connect to live NTSB or ASRS data APIs so the
platform reflects current incidents, not just historical records.

**Airline-specific dashboards.** Let operators filter the entire analysis to
their own fleet and route network — making the insights directly actionable
for their safety management system.

**Regulatory mapping.** Tag incidents against ICAO Annex 13 cause categories
and highlight which regulatory requirements each cluster most frequently
implicates.

**Anomaly alerting.** If a new upload shows a statistically unusual spike in
a particular failure mode, flag it automatically rather than waiting for a
human to notice.

**PostgreSQL backend.** The current SQLite setup works fine for single-user
analysis. Moving to PostgreSQL would allow concurrent pipeline runs and
multi-team access without write contention.

---

# What This Project Demonstrates Technically

This project was built to demonstrate the ability to design and implement a complete data platform that spans data engineering, machine learning, backend systems, and frontend visualization.

Rather than focusing on a single component, the system shows how these pieces work together in a production-style architecture.

### End-to-End Data Pipeline Design

The platform ingests raw aviation incident data and processes it through a multi-stage pipeline including cleaning, normalization, feature generation, clustering, classification, and structured extraction.

This demonstrates the design of a reproducible analytical workflow that transforms unstructured data into actionable insights.

### Applied Machine Learning in a Real Context

The system integrates several machine learning techniques in a practical setting:

* semantic embeddings to represent incident narratives
* density-based clustering (HDBSCAN) to discover failure patterns
* dimensionality reduction (UMAP) for visualization
* supervised learning (RandomForest) for severity prediction

The focus is not just model accuracy, but how models integrate into a larger analytical workflow.

### Production-Oriented Backend Development

The backend is built with FastAPI and structured as a modular API service capable of handling asynchronous tasks such as clustering and model training.

Key backend considerations include:

* background task processing
* structured API design
* dataset lifecycle management
* model training and persistence
* environment-based configuration for deployment

### Data Visualization for Decision Support

The frontend dashboard is designed to make complex analytical results accessible through clear visualizations and interactive filtering.

The emphasis is on presenting safety trends and incident clusters in a way that supports investigation and decision-making rather than simply displaying raw charts.

### Full-Stack System Deployment

The project is deployed as a complete full-stack system:

* containerized backend services deployed on Render
* frontend application deployed on Vercel
* environment-based configuration for development and production

This reflects the architecture used in many modern data platforms.

### Practical Use of LLMs in Data Systems

Large language models are used to extract structured insights from incident narratives, including root causes, phase of flight, and contributing factors.

The goal is not generative output but structured extraction that enriches the dataset and improves downstream analysis.

Together, these components demonstrate the ability to design systems that combine traditional software engineering with modern data and machine learning techniques.


## License

MIT
```
