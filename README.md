# Aviation Failure Intelligence System

A platform for analyzing historical aviation incidents and identifying safety patterns from large incident datasets.

---

## 1 Project Snapshot

1 Dataset contains more than 6,900 aviation incidents from 1908 to 2020
2 System analyzes incident reports to discover safety trends and failure patterns
3 Includes clustering, severity prediction, and root cause extraction
4 Built as a full stack data system with machine learning and interactive visualization

Live Demo
https://aviation-intelligence-system.vercel.app

Backend API
https://aviation-intelligence-system.onrender.com

---

## 2 Project Preview

![Dashboard Preview](docs/dashboard_demo.gif)

Interactive dashboard for exploring aviation incident clusters, severity trends, and historical patterns.

---

## 3 Why This Project Exists

Aviation safety improves when historical incidents are carefully analyzed.
However many aviation datasets exist only as spreadsheets or textual reports, which makes large scale analysis difficult.

This project demonstrates how modern data tools and machine learning can transform historical aviation incident records into a system that makes safety insights easier to discover.

The goal is to show how data pipelines, machine learning, and visualization can work together to turn raw incident data into meaningful insights.

---

## 4 Key Features

1 Upload aviation incident datasets for analysis
2 Automatic data cleaning and normalization
3 Semantic clustering of incidents using sentence embeddings
4 Machine learning based severity prediction
5 Root cause extraction from incident narratives
6 Interactive dashboard for exploring trends and clusters
7 Filtering incidents by aircraft, operator, location, and decade
8 REST API for programmatic access to analysis results

---

## 5 Key Engineering Highlights

1 Built an end to end data analysis pipeline for processing historical aviation incident records

2 Implemented semantic clustering using sentence embeddings, UMAP dimensionality reduction, and HDBSCAN clustering

3 Designed a machine learning pipeline using RandomForest to predict incident severity

4 Integrated language models to extract structured root cause and contributing factors from narrative descriptions

5 Built an interactive React dashboard to visualize trends, clusters, and historical patterns

6 Deployed a full stack system using Docker, Render, and Vercel

---

## 6 System Architecture

```text
Dataset Upload
        │
        ▼
Data Cleaning and Normalization
        │
        ▼
Sentence Embeddings
        │
        ▼
UMAP Dimensionality Reduction
        │
        ▼
HDBSCAN Clustering
        │
        ▼
Severity Classification
        │
        ▼
Root Cause Extraction
        │
        ▼
REST API
        │
        ▼
React Dashboard
```

---

## 7 Technology Stack

Backend
1 Python
2 FastAPI
3 SQLAlchemy
4 SQLite

Machine Learning
1 scikit-learn
2 HDBSCAN
3 UMAP
4 sentence-transformers

Frontend
1 React
2 TypeScript
3 Vite
4 Recharts
5 Tailwind CSS

Deployment
1 Docker
2 Render for backend hosting
3 Vercel for frontend deployment

---

## 8 Project Structure

```text
backend/
    app/
        api/
        models/
        services/
        pipelines/
    requirements.txt

frontend/
    src/
        components/
        pages/
        services/

data/
    aviation_incidents.csv

docs/
    dashboard_demo.gif
```

---

## 9 Running the Project Locally

Requirements

1 Python 3.12
2 Node.js 18 or newer

---

### Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 10000
```

---

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Create a file:

```
frontend/.env.local
```

Add:

```
VITE_API_URL=http://localhost:10000
```

---

## 10 Example Insights

The system can identify patterns such as:

1 Common categories of aviation incidents based on narrative descriptions
2 Changes in accident severity across decades
3 Frequently occurring contributing factors
4 Similar incidents grouped through semantic clustering

These insights help reveal patterns that are difficult to identify when working directly with raw datasets.

---

## 11 Future Improvements

1 Integration with real time aviation incident datasets
2 Airline specific safety analysis dashboards
3 Automated anomaly detection for new incidents
4 Migration to PostgreSQL for larger multi user workloads

---

## 12 License

MIT License
