# BeanVision AI — Dry Bean Classification & Agricultural Intelligence System

[![Python](https://img.shields.io/badge/Python-3.11-blue)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-green)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18-blue)](https://react.dev)
[![scikit-learn](https://img.shields.io/badge/scikit--learn-1.5-orange)](https://scikit-learn.org)

A production-quality machine learning web application that classifies dry bean varieties using 16 morphological features from the UCI Dry Bean Dataset, using traditional ML algorithms only (no deep learning).

---

## Project Overview

BeanVision AI predicts one of **seven dry bean varieties** from 16 numerical shape/size measurements using a trained scikit-learn Pipeline served through a FastAPI REST API and visualised in a React + Tailwind CSS dashboard.

### Problem Statement

Automatically classifying dry bean varieties from physical measurements is a practical agricultural automation problem. Manual classification is slow and error-prone. This system replicates and extends the work of Koklu & Ozkan (2020) using traditional ML classifiers with full cross-validation and explainability.

---

## Dataset

**UCI Machine Learning Repository — Dry Bean Dataset**

| Property | Value |
|---|---|
| Records | 13,611 (13,543 after deduplication) |
| Input features | 16 numerical |
| Target column | `Class` |
| Classes | 7 bean varieties |
| Missing values | None |

**Download:** https://archive.ics.uci.edu/dataset/602/dry+bean

**Citation:**
> Koklu, M. and Ozkan, I. A. (2020). "Multiclass Classification of Dry Beans Using Computer Vision and Machine Learning Techniques." *Computers and Electronics in Agriculture*, 174, 105507.
> DOI: https://doi.org/10.1016/j.compag.2020.105507

---

## Target Classes

| Class | Display Name |
|---|---|
| BARBUNYA | Barbunya |
| BOMBAY | Bombay |
| CALI | Cali |
| DERMASON | Dermason |
| HOROZ | Horoz |
| SEKER | Seker |
| SIRA | Sira |

---

## Input Features (16)

| # | Column Name | Description | Unit |
|---|---|---|---|
| 1 | Area | Bean boundary pixel count | pixels² |
| 2 | Perimeter | Boundary length | pixels |
| 3 | MajorAxisLength | Length of major ellipse axis | pixels |
| 4 | MinorAxisLength | Length of minor ellipse axis | pixels |
| 5 | AspectRation | Major / Minor axis ratio | ratio |
| 6 | Eccentricity | Ellipse eccentricity (0=circle) | ratio |
| 7 | ConvexArea | Convex hull area | pixels² |
| 8 | EquivDiameter | Diameter of circle with same area | pixels |
| 9 | Extent | Area / bounding-box ratio | ratio |
| 10 | Solidity | Area / convex hull area | ratio |
| 11 | roundness | 4π × area / perimeter² | ratio |
| 12 | Compactness | √(4π × area) / major axis | ratio |
| 13 | ShapeFactor1 | Major axis / area | index |
| 14 | ShapeFactor2 | Minor axis / area | index |
| 15 | ShapeFactor3 | Compactness² | index |
| 16 | ShapeFactor4 | Convexity shape factor | index |

---

## ML Algorithms Used

| Model | Preprocessing |
|---|---|
| Random Forest | None |
| SVM (Calibrated) | PowerTransformer (Yeo-Johnson) |
| K-Nearest Neighbors | StandardScaler |
| Logistic Regression | PowerTransformer (Yeo-Johnson) |
| Decision Tree | None |
| HistGradientBoosting | None |

SVM is wrapped with `CalibratedClassifierCV` to produce valid probability estimates.

---

## Training Methodology

1. Load `Dry_Bean_Dataset.xlsx`, remove duplicates, validate columns.
2. Stratified 80/20 train/test split (seed = 42).
3. Fit preprocessing **only on the training split** to avoid leakage.
4. 5-fold stratified cross-validation on training data for all 6 models.
5. **Best model selected by macro-F1** (not accuracy, to handle class imbalance).
6. Final evaluation run **once** on the held-out test set.
7. All artifacts saved to `backend/artifacts/`.

---

## Model Performance

> ⚠️ Run `python -m ml.train` to populate actual results. Values below are pending actual training.

| Metric | Value |
|---|---|
| Test Accuracy | _pending_ |
| Test Macro-F1 | _pending_ |
| Test Weighted-F1 | _pending_ |
| Test Precision (macro) | _pending_ |
| Test Recall (macro) | _pending_ |

From the notebook experiments (cross-validation):
- **SVM + PowerTransformer** achieved the highest macro-F1 (~0.942)
- Random Forest and Logistic Regression followed closely
- Decision Tree had the lowest performance

---

## API Documentation

| Method | Endpoint | Description |
|---|---|---|
| GET | `/` | Service status |
| GET | `/health` | Health check + model status |
| GET | `/api/model-info` | Model metadata and test metrics |
| POST | `/api/predict` | Classify a bean (16 features) |
| GET | `/api/statistics/overview` | Dataset overview |
| GET | `/api/statistics/classes` | Bean class list |
| GET | `/api/statistics/features` | Feature statistics |
| GET | `/api/statistics/class-ranges` | Per-class feature ranges |
| GET | `/api/statistics/class-ranges/{class}` | Single class ranges |
| GET | `/api/evaluation` | Model comparison + test results |
| GET | `/api/evaluation/confusion-matrix` | Confusion matrix |
| GET | `/api/evaluation/feature-importance` | Feature importance |
| GET | `/api/dataset/sample` | Random dataset row (no label) |
| GET | `/api/statistics/export/class-ranges.csv` | CSV download |

Interactive docs: `http://localhost:8000/docs`

---

## Project Structure

```
ml-project/
├── frontend/
│   ├── src/
│   │   ├── api/client.js          ← centralized API client
│   │   ├── components/
│   │   │   ├── Layout.jsx         ← sidebar navigation
│   │   │   └── UI.jsx             ← shared UI primitives
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx      ← home / overview
│   │   │   ├── Classify.jsx       ← prediction form
│   │   │   ├── FeatureExplorer.jsx← class-wise statistics
│   │   │   ├── ModelPerformance.jsx← metrics + confusion matrix
│   │   │   └── DatasetInsights.jsx← EDA visualizations
│   │   ├── hooks/useFetch.js
│   │   ├── utils/features.js      ← feature metadata + helpers
│   │   └── App.jsx
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── .env.example
│   └── vercel.json
├── backend/
│   ├── app/
│   │   ├── main.py               ← FastAPI app + lifespan
│   │   ├── config.py             ← pydantic-settings config
│   │   ├── schemas.py            ← request/response models
│   │   ├── dependencies.py       ← artifact state + loaders
│   │   └── routers/
│   │       ├── prediction.py
│   │       ├── statistics.py
│   │       └── evaluation.py
│   ├── ml/
│   │   └── train.py              ← full training pipeline
│   ├── artifacts/                ← generated by training
│   ├── tests/test_api.py
│   ├── requirements.txt
│   ├── render.yaml
│   └── .env.example
├── dataset/
│   └── Dry_Bean_Dataset.xlsx
├── notebooks/
│   ├── model_pipeline.ipynb
│   └── project_preprocessing_pipeline.ipynb
├── script.txt                    ← setup + deployment commands
├── README.md
└── .gitignore
```

---

## Local Setup

### Backend

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env

# Train the model (required before starting server)
python -m ml.train

# Start the server
uvicorn app.main:app --reload --port 8000
```

### Frontend

```powershell
cd frontend
npm install
copy .env.example .env   # sets VITE_API_BASE_URL=http://localhost:8000
npm run dev
```

Open http://localhost:5173

---

## Render Deployment (Backend)

1. Push repo to GitHub (include `backend/artifacts/` after training).
2. New Web Service → connect repo.
3. Settings:
   - Root Directory: `backend`
   - Build: `pip install -r requirements.txt`
   - Start: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - Health: `/health`
4. Environment variables:
   - `FRONTEND_ORIGINS` = `https://your-app.vercel.app`
   - `DATASET_PATH` = `../dataset/Dry_Bean_Dataset.xlsx`
   - `ARTIFACTS_DIR` = `artifacts`
   - `MODEL_VERSION` = `1.0.0`

> **Important:** Render does not persist files between deploys. Commit your trained `backend/artifacts/` to the repo before deploying.

---

## Vercel Deployment (Frontend)

1. New Project → import repo.
2. Settings:
   - Root: `frontend`
   - Build: `npm run build`
   - Output: `dist`
3. Environment variable:
   - `VITE_API_BASE_URL` = `https://your-backend.onrender.com`
4. Deploy.

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Default | Description |
|---|---|---|
| `FRONTEND_ORIGINS` | `http://localhost:5173` | Comma-separated CORS origins |
| `DATASET_PATH` | `../dataset/Dry_Bean_Dataset.xlsx` | Path to Excel dataset |
| `ARTIFACTS_DIR` | `artifacts` | Directory for trained artifacts |
| `MODEL_VERSION` | `1.0.0` | Artifact version tag |

### Frontend (`frontend/.env`)

| Variable | Default | Description |
|---|---|---|
| `VITE_API_BASE_URL` | `http://localhost:8000` | FastAPI backend URL |

---

## Limitations and Future Improvements

- **Feature engineering** — derived ratio features could improve performance.
- **Hyperparameter tuning** — `GridSearchCV` / `Optuna` for optimal params.
- **Real-time retraining** — admin endpoint to trigger retraining without SSH.
- **Artifact cloud storage** — store `model.joblib` in S3/GCS for Render deploys.
- **Monitoring** — prediction drift detection and logging.
- **More algorithms** — XGBoost, LightGBM, CatBoost.
- **Explainability** — SHAP values per prediction instance.

---

## Testing

```powershell
cd backend
pip install pytest httpx
pytest tests/ -v
```

Tests cover: health, model-info, valid prediction, missing features, NaN rejection, unknown class (404), class ranges, evaluation metrics, 503 when model missing, and response schema.
