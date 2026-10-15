# BeanVision AI — Dry Bean Classification Web Application

## 1. Project Overview

**BeanVision AI** is a full-stack machine-learning web application that classifies dry bean varieties from 16 numerical morphological measurements. The project combines a scikit-learn classification pipeline, a FastAPI REST backend, and a React/Vite frontend.

The application supports:

- Dry bean variety prediction from manually entered measurements.
- Dataset statistics and class-distribution exploration.
- Per-feature and per-class range analysis.
- Model comparison and evaluation metrics.
- Confusion-matrix visualization.
- Interactive REST API documentation through Swagger UI and ReDoc.
- Production deployment with Render for the backend and Vercel for the frontend.

Repository: [rahulkate-173/DRY-BEAN-ML-CLASSIFICATION-WEB-APPLICATION](https://github.com/rahulkate-173/DRY-BEAN-ML-CLASSIFICATION-WEB-APPLICATION)

Live frontend configured in the repository: [dry-bean-ml-classification-web-appl.vercel.app](https://dry-bean-ml-classification-web-appl.vercel.app)

Project description: `college group ml project`

---

## 2. Problem Statement

Dry bean varieties have different physical characteristics, including area, perimeter, axis lengths, compactness, eccentricity, and shape factors. Traditionally, identifying varieties can require manual inspection and expert knowledge.

This project automates the classification process by using computer-vision-derived measurements and supervised machine-learning algorithms. Given the 16 measurements for a bean, the application predicts one of seven bean varieties.

The solution is intended for educational and demonstration purposes. It is not a replacement for laboratory-grade agricultural identification or quality-control systems.

---

## 3. Main Objectives

1. Load and validate the UCI Dry Bean Dataset.
2. Remove duplicate records and handle invalid or missing values.
3. Compare multiple traditional machine-learning classifiers.
4. Select the best model using macro-F1 from stratified cross-validation.
5. Evaluate the selected model on a separate held-out test set.
6. Save the trained pipeline and evaluation artifacts.
7. Expose predictions and analytical results through a REST API.
8. Provide an interactive frontend for predictions, metrics, and dataset exploration.
9. Deploy the backend and frontend as separate services.

---

## 4. Dataset

### 4.1 Source

The project uses the **UCI Machine Learning Repository — Dry Bean Dataset**.

- Dataset page: https://archive.ics.uci.edu/dataset/602/dry+bean
- Dataset file used by the project: `dataset/Dry_Bean_Dataset.xlsx`
- Related paper: Koklu, M. and Ozkan, I. A. (2020), “Multiclass Classification of Dry Beans Using Computer Vision and Machine Learning Techniques,” *Computers and Electronics in Agriculture*, 174, 105507.
- DOI: https://doi.org/10.1016/j.compag.2020.105507

### 4.2 Dataset Summary

| Property | Value |
|---|---:|
| Original records | 13,611 |
| Records after duplicate removal | 13,543 |
| Input features | 16 numerical features |
| Target column | `Class` |
| Number of classes | 7 |
| Missing values after preprocessing | None |
| Training records | 10,834 |
| Test records | 2,709 |
| Train/test split | 80% / 20% |
| Random seed | 42 |

The training artifacts show that 68 duplicate rows were removed from the original dataset, leaving 13,543 records for modeling.

### 4.3 Target Classes

| Class label | Bean variety |
|---|---|
| `BARBUNYA` | Barbunya |
| `BOMBAY` | Bombay |
| `CALI` | Cali |
| `DERMASON` | Dermason |
| `HOROZ` | Horoz |
| `SEKER` | Seker |
| `SIRA` | Sira |

### 4.4 Class Distribution

| Class | Records |
|---|---:|
| `DERMASON` | 3,546 |
| `SIRA` | 2,636 |
| `SEKER` | 2,027 |
| `HOROZ` | 1,860 |
| `CALI` | 1,630 |
| `BARBUNYA` | 1,322 |
| `BOMBAY` | 522 |

The dataset is not perfectly balanced. For this reason, macro-averaged precision, recall, and F1 are used in model comparison instead of relying only on accuracy.

### 4.5 Input Features

The prediction API expects the following 16 numerical features:

| # | Feature | Meaning |
|---:|---|---|
| 1 | `Area` | Bean boundary area in pixels² |
| 2 | `Perimeter` | Bean boundary length in pixels |
| 3 | `MajorAxisLength` | Length of the major ellipse axis |
| 4 | `MinorAxisLength` | Length of the minor ellipse axis |
| 5 | `AspectRation` | Ratio of major axis length to minor axis length |
| 6 | `Eccentricity` | Ellipse eccentricity; lower values are more circular |
| 7 | `ConvexArea` | Area of the bean convex hull |
| 8 | `EquivDiameter` | Diameter of a circle with the same area |
| 9 | `Extent` | Bean area divided by bounding-box area |
| 10 | `Solidity` | Bean area divided by convex-hull area |
| 11 | `roundness` | Circularity-related shape measure |
| 12 | `Compactness` | Compactness of the bean shape |
| 13 | `ShapeFactor1` | Shape factor derived from major axis and area |
| 14 | `ShapeFactor2` | Shape factor derived from minor axis and area |
| 15 | `ShapeFactor3` | Compactness-related shape factor |
| 16 | `ShapeFactor4` | Convexity-related shape factor |

---

## 5. Machine-Learning Workflow

The training pipeline is implemented in `backend/ml/train.py`.

### 5.1 Data Preparation

The pipeline performs the following steps:

1. Loads the Excel dataset using pandas and `openpyxl`.
2. Verifies that all 16 feature columns and the `Class` target exist.
3. Removes duplicate rows.
4. Converts feature values to numeric values.
5. Removes rows with invalid or missing feature/target values.
6. Normalizes target labels by trimming whitespace and converting them to uppercase.
7. Encodes class labels using `LabelEncoder`.
8. Performs a stratified 80/20 train/test split with `random_state=42`.
9. Runs five-fold stratified cross-validation on the training split.
10. Selects the model with the highest mean cross-validation macro-F1.
11. Fits the selected pipeline on the complete training split.
12. Evaluates the final pipeline once on the held-out test set.
13. Saves the model and analytical artifacts under `backend/artifacts/`.

Preprocessing is placed inside scikit-learn `Pipeline` objects. This ensures that transformations are learned only from the relevant training folds and prevents data leakage.

### 5.2 Model Selection Criterion

The primary selection metric is:

```text
cv_f1_macro_mean
```

Macro-F1 calculates F1 independently for every class and then averages the scores. It gives each bean variety equal importance, which is useful because `BOMBAY` has substantially fewer records than `DERMASON` or `SIRA`.

---

## 6. Models Evaluated

Six traditional supervised-learning models are compared.

| Model | Preprocessing | Important configuration |
|---|---|---|
| Random Forest | None | 200 trees, `random_state=42`, parallel training |
| Calibrated SVM | `PowerTransformer(method="yeo-johnson")` | RBF kernel, `C=10`, calibrated with sigmoid probabilities and 3-fold internal CV |
| K-Nearest Neighbors | `StandardScaler` | `n_neighbors=7` |
| Logistic Regression | `PowerTransformer(method="yeo-johnson")` | `max_iter=2000`, `C=1.0` |
| Decision Tree | None | Unrestricted depth, `random_state=42` |
| HistGradientBoosting | None | `max_iter=200`, `random_state=42` |

The selected production model is `SVM_Calibrated`. The SVM is wrapped in `CalibratedClassifierCV` so that the API can return meaningful class-probability estimates.

---

## 7. Cross-Validation Results

The following results are stored in `backend/artifacts/evaluation_metrics.json`. Values are five-fold cross-validation means calculated on the training set.

| Rank | Model | CV Accuracy | CV Macro-F1 | CV Macro-F1 Std. | CV Macro Precision | CV Macro Recall |
|---:|---|---:|---:|---:|---:|---:|
| 1 | SVM_Calibrated | 0.9323 | 0.9436 | 0.0038 | 0.9458 | 0.9417 |
| 2 | HistGradientBoosting | 0.9277 | 0.9400 | 0.0028 | 0.9418 | 0.9384 |
| 3 | LogisticRegression | 0.9265 | 0.9390 | 0.0041 | 0.9399 | 0.9384 |
| 4 | KNN | 0.9232 | 0.9359 | 0.0056 | 0.9382 | 0.9343 |
| 5 | RandomForest | 0.9230 | 0.9341 | 0.0070 | 0.9362 | 0.9326 |
| 6 | DecisionTree | 0.8960 | 0.9107 | 0.0046 | 0.9111 | 0.9106 |

### Cross-Validation Interpretation

- `SVM_Calibrated` achieved the highest mean macro-F1 and was selected.
- `HistGradientBoosting` and `LogisticRegression` were close alternatives.
- `DecisionTree` was the weakest model in this experiment.
- The relatively small cross-validation standard deviations indicate stable performance across folds.

---

## 8. Final Test-Set Results

The final selected model was evaluated on the held-out test set of 2,709 records.

| Metric | Score |
|---|---:|
| Accuracy | 0.9217, or 92.17% |
| Macro precision | 0.9352 |
| Macro recall | 0.9328 |
| Macro-F1 | 0.9339 |
| Weighted-F1 | 0.9217 |

### Per-Class Test Results

| Class | Precision | Recall | F1-score | Support |
|---|---:|---:|---:|---:|
| `BARBUNYA` | 0.9377 | 0.9094 | 0.9234 | 265 |
| `BOMBAY` | 1.0000 | 1.0000 | 1.0000 | 104 |
| `CALI` | 0.9196 | 0.9479 | 0.9335 | 326 |
| `DERMASON` | 0.9085 | 0.9238 | 0.9161 | 709 |
| `HOROZ` | 0.9667 | 0.9355 | 0.9508 | 372 |
| `SEKER` | 0.9462 | 0.9532 | 0.9497 | 406 |
| `SIRA` | 0.8678 | 0.8596 | 0.8637 | 527 |

`BOMBAY` received a perfect score on this test split, while `SIRA` was the most difficult class for the selected model. The most visible confusion is between `SIRA` and `DERMASON`, which is consistent with the confusion matrix.

---

## 9. Confusion Matrix

Class order:

```text
[BARBUNYA, BOMBAY, CALI, DERMASON, HOROZ, SEKER, SIRA]
```

Rows represent actual classes and columns represent predicted classes.

| Actual \\ Predicted | BARBUNYA | BOMBAY | CALI | DERMASON | HOROZ | SEKER | SIRA |
|---|---:|---:|---:|---:|---:|---:|---:|
| BARBUNYA | 241 | 0 | 16 | 0 | 0 | 2 | 6 |
| BOMBAY | 0 | 104 | 0 | 0 | 0 | 0 | 0 |
| CALI | 8 | 0 | 309 | 0 | 5 | 2 | 2 |
| DERMASON | 0 | 0 | 0 | 655 | 0 | 10 | 44 |
| HOROZ | 1 | 0 | 9 | 5 | 348 | 0 | 9 |
| SEKER | 4 | 0 | 1 | 6 | 0 | 387 | 8 |
| SIRA | 3 | 0 | 1 | 55 | 7 | 8 | 453 |

Important observations:

- All 104 `BOMBAY` test examples were correctly classified.
- The largest error count is `SIRA` predicted as `DERMASON` with 55 cases.
- `DERMASON` was sometimes predicted as `SIRA` with 44 cases.
- `BARBUNYA` and `CALI` show a smaller amount of mutual confusion.

---

## 10. Feature Importance and Explainability

The final model is a calibrated RBF-kernel SVM. The generated artifact is:

```json
{
  "method": "Not available for this estimator",
  "model": "SVM_Calibrated",
  "importances": {}
}
```

The current application does not expose direct built-in feature importance for the selected SVM pipeline because the calibrated nonlinear SVM does not provide a simple `feature_importances_` attribute.

Possible future explainability improvements include:

- Permutation importance.
- SHAP explanations.
- Partial-dependence plots.
- Per-prediction explanation summaries.
- Comparison against a tree-based surrogate model.

---

## 11. Saved Model Artifacts

Training creates the following files in `backend/artifacts/`:

| File | Purpose |
|---|---|
| `model.joblib` | Serialized fitted scikit-learn pipeline used for prediction |
| `model_metadata.json` | Model name, version, classes, features, split details, and test metrics |
| `evaluation_metrics.json` | Cross-validation comparison, selected model, test metrics, and per-class report |
| `dataset_statistics.json` | Global dataset size, class distribution, and per-feature statistics |
| `feature_importance.json` | Feature-importance information when supported by the selected estimator |
| `confusion_matrix.json` | Confusion-matrix values and class-label order |
| `class_ranges.json` | Per-class min, max, mean, median, standard deviation, and quartiles for each feature |

Current model metadata:

- Model: `SVM_Calibrated`
- Preprocessor: `PowerTransformer`
- Model version: `1.0.0`
- Random seed: `42`
- Training date recorded in artifact: `2026-10-14T09:40:27.399153+00:00`
- Training samples: `10,834`
- Test samples: `2,709`
- Cross-validation folds: `5`

---

## 12. System Architecture

```text
┌─────────────────────────────┐
│ React + Vite Frontend        │
│ Vercel deployment            │
│                             │
│ - Dashboard                 │
│ - Classification form       │
│ - Dataset insights          │
│ - Feature explorer          │
│ - Model performance         │
└──────────────┬──────────────┘
               │ HTTP / JSON
               ▼
┌─────────────────────────────┐
│ FastAPI Backend              │
│ Render deployment            │
│                             │
│ - Request validation         │
│ - Prediction endpoint       │
│ - Statistics endpoints      │
│ - Evaluation endpoints      │
│ - CORS configuration        │
└──────────────┬──────────────┘
               │ loads
               ▼
┌─────────────────────────────┐
│ Serialized ML Artifacts      │
│                             │
│ - model.joblib              │
│ - JSON metadata             │
│ - Evaluation artifacts      │
└─────────────────────────────┘
```

### Prediction Flow

1. A user enters 16 bean measurements in the React interface.
2. The frontend sends a JSON request to `POST /api/predict`.
3. FastAPI validates the request with Pydantic schemas.
4. The backend loads the serialized scikit-learn pipeline from `model.joblib`.
5. The pipeline applies the saved preprocessing and produces a class prediction.
6. The calibrated classifier returns probabilities when available.
7. The API returns the predicted class, confidence information, and model metadata.
8. The frontend renders the prediction result.

---

## 13. Technology Stack

### Machine Learning and Data Science

- Python 3.11
- pandas 2.2.3
- NumPy 1.26.4
- scikit-learn 1.5.2
- joblib 1.4.2
- openpyxl 3.1.5
- Jupyter Notebook

### Backend

- FastAPI 0.115.0
- Uvicorn 0.30.6
- Pydantic 2.9.2
- pydantic-settings 2.5.2
- python-dotenv 1.0.1
- python-multipart 0.0.12

### Frontend

- React 18.3.1
- React DOM 18.3.1
- React Router DOM 6.26.2
- Vite 5.4.8
- Tailwind CSS 3.4.13
- Recharts 2.12.7
- Lucide React 0.447.0
- PostCSS and Autoprefixer

### Deployment and Operations

- GitHub for source control
- Render for the FastAPI backend
- Vercel for the React frontend
- Environment variables for API URLs and CORS configuration
- JSON and Joblib artifacts for model serving

---

## 14. Frontend Features

The frontend is located in `frontend/` and is built with React, Vite, Tailwind CSS, and Recharts.

### Dashboard

Provides a high-level view of:

- Dataset size.
- Number of bean classes.
- Selected model.
- Main evaluation metrics.
- Links to prediction and analysis pages.

### Classification Page

Allows users to:

- Enter all 16 input features.
- Fill the form using a sample dataset row.
- Submit measurements to the backend.
- View the predicted bean variety.
- View confidence/probability information when returned by the API.

### Dataset Insights Page

Displays dataset-level information such as:

- Total records.
- Feature count.
- Class count.
- Class distribution.
- Descriptive statistics.

### Feature Explorer

Allows users to investigate feature behavior across bean classes using class-specific ranges and summary statistics.

### Model Performance Page

Displays:

- Model comparison results.
- Cross-validation metrics.
- Final test metrics.
- Per-class metrics.
- Confusion matrix.
- Feature-importance output when available.

---

## 15. Backend API

The backend exposes interactive API documentation at:

- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

### Endpoint Reference

| Method | Endpoint | Description |
|---|---|---|
| GET | `/` | Returns service status information |
| GET | `/health` | Health check and model-loaded status |
| GET | `/api/model-info` | Returns model metadata and test metrics |
| POST | `/api/predict` | Predicts the bean class from 16 numerical features |
| GET | `/api/statistics/overview` | Returns dataset overview statistics |
| GET | `/api/statistics/classes` | Returns supported bean classes |
| GET | `/api/statistics/features` | Returns global feature statistics |
| GET | `/api/statistics/class-ranges` | Returns feature ranges for every class |
| GET | `/api/statistics/class-ranges/{class}` | Returns ranges for one class |
| GET | `/api/evaluation` | Returns model comparison and test results |
| GET | `/api/evaluation/confusion-matrix` | Returns the confusion matrix and label order |
| GET | `/api/evaluation/feature-importance` | Returns feature importance if available |
| GET | `/api/dataset/sample` | Returns a sample row without the target label |
| GET | `/api/statistics/export/class-ranges.csv` | Downloads class ranges as CSV |

### Example Prediction Payload

```json
{
  "Area": 28395,
  "Perimeter": 610.291,
  "MajorAxisLength": 208.178117,
  "MinorAxisLength": 173.888747,
  "AspectRation": 1.197191,
  "Eccentricity": 0.549812,
  "ConvexArea": 28715,
  "EquivDiameter": 190.141097,
  "Extent": 0.763923,
  "Solidity": 0.988856,
  "roundness": 0.958027,
  "Compactness": 0.913358,
  "ShapeFactor1": 0.007332,
  "ShapeFactor2": 0.003147,
  "ShapeFactor3": 0.834222,
  "ShapeFactor4": 0.998724
}
```

### Example Request

```bash
curl -X POST "http://localhost:8000/api/predict" \
  -H "Content-Type: application/json" \
  -d @prediction.json
```

---

## 16. Repository Structure

```text
DRY-BEAN-ML-CLASSIFICATION-WEB-APPLICATION/
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── config.py
│   │   ├── dependencies.py
│   │   ├── schemas.py
│   │   └── routers/
│   │       ├── prediction.py
│   │       ├── statistics.py
│   │       └── evaluation.py
│   ├── artifacts/
│   │   ├── model.joblib
│   │   ├── model_metadata.json
│   │   ├── evaluation_metrics.json
│   │   ├── dataset_statistics.json
│   │   ├── feature_importance.json
│   │   ├── confusion_matrix.json
│   │   └── class_ranges.json
│   ├── data/README.md
│   ├── ml/
│   │   └── train.py
│   ├── tests/
│   ├── requirements.txt
│   ├── render.yaml
│   └── .env.example
├── dataset/
│   ├── Dry_Bean_Dataset.xlsx
│   ├── Dry_Bean_Dataset.arff
│   └── Dry_Bean_Dataset.txt
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── pages/
│   │   └── utils/
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   └── vercel.json
├── notebooks/
│   ├── model_pipeline.ipynb
│   ├── project_preprocessing_pipeline.ipynb
│   └── project_inference and visualization.ipynb
├── README.md
├── script.txt
└── document.md
```

---

## 17. Local Development Setup

### Prerequisites

- Python 3.11
- Node.js 18 or newer
- npm
- Git

### 17.1 Backend Setup

From the repository root:

```bash
cd backend
python -m venv .venv
```

Activate the environment.

Windows PowerShell:

```powershell
.\.venv\Scripts\Activate.ps1
```

Linux/macOS:

```bash
source .venv/bin/activate
```

Install dependencies and configure the environment:

```bash
pip install -r requirements.txt
cp .env.example .env
```

On Windows, use `copy .env.example .env` instead of `cp`.

### 17.2 Train the Model

The model must be trained before starting the backend if artifacts are not already available:

```bash
cd backend
python -m ml.train
```

This creates all files under `backend/artifacts/`.

### 17.3 Start the Backend

```bash
cd backend
uvicorn app.main:app --reload --port 8000
```

The backend is available at `http://localhost:8000`.

### 17.4 Start the Frontend

In a second terminal:

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

On Windows, use `copy .env.example .env`.

The frontend is available at `http://localhost:5173`.

---

## 18. Environment Variables

### Backend: `backend/.env`

| Variable | Default | Purpose |
|---|---|---|
| `FRONTEND_ORIGINS` | `http://localhost:5173` | Comma-separated list of allowed frontend origins for CORS |
| `DATASET_PATH` | `../dataset/Dry_Bean_Dataset.xlsx` | Location of the Excel dataset relative to `backend/` |
| `ARTIFACTS_DIR` | `artifacts` | Directory containing the trained model and JSON artifacts |
| `MODEL_VERSION` | `1.0.0` | Version label stored in model metadata |

Example:

```env
FRONTEND_ORIGINS=http://localhost:5173,https://your-app.vercel.app
DATASET_PATH=../dataset/Dry_Bean_Dataset.xlsx
ARTIFACTS_DIR=artifacts
MODEL_VERSION=1.0.0
```

### Frontend: `frontend/.env`

| Variable | Default | Purpose |
|---|---|---|
| `VITE_API_BASE_URL` | `http://localhost:8000` | Base URL of the FastAPI backend |

Example:

```env
VITE_API_BASE_URL=http://localhost:8000
```

---

## 19. Deployment

The project is designed for a split deployment:

- **Frontend:** Vercel
- **Backend:** Render

### 19.1 Deploy the Backend to Render

The backend includes `backend/render.yaml` with the service configuration.

Recommended Render settings:

| Setting | Value |
|---|---|
| Service type | Web Service |
| Root directory | `backend` |
| Runtime | Python 3 |
| Build command | `pip install -r requirements.txt` |
| Start command | `uvicorn app.main:app --host 0.0.0.0 --port $PORT` |
| Health-check path | `/health` |

Configure these Render environment variables:

```env
FRONTEND_ORIGINS=https://dry-bean-ml-classification-web-appl.vercel.app
DATASET_PATH=../dataset/Dry_Bean_Dataset.xlsx
ARTIFACTS_DIR=artifacts
MODEL_VERSION=1.0.0
```

#### Important Render Consideration

Render services do not provide a persistent filesystem for generated files between deploys. The trained artifacts must therefore be committed to the repository, or the deployment must be changed to download them from durable cloud storage.

For the current project, the expected production approach is to commit the required files under `backend/artifacts/`, especially:

- `model.joblib`
- `model_metadata.json`
- `evaluation_metrics.json`
- `dataset_statistics.json`
- `feature_importance.json`
- `confusion_matrix.json`
- `class_ranges.json`

After deployment, verify:

```text
https://your-render-service.onrender.com/health
https://your-render-service.onrender.com/docs
```

### 19.2 Deploy the Frontend to Vercel

Recommended Vercel settings:

| Setting | Value |
|---|---|
| Framework preset | Vite |
| Root directory | `frontend` |
| Build command | `npm run build` |
| Output directory | `dist` |

Set the frontend environment variable:

```env
VITE_API_BASE_URL=https://your-render-service.onrender.com
```

After deploying the frontend, update the backend `FRONTEND_ORIGINS` variable to include the exact Vercel URL, then redeploy or restart the backend.

### 19.3 Deployment Checklist

- [ ] Train the model successfully.
- [ ] Verify `backend/artifacts/model.joblib` exists.
- [ ] Verify all JSON artifacts exist.
- [ ] Confirm the dataset path works in the deployed environment.
- [ ] Set `FRONTEND_ORIGINS` to the production frontend URL.
- [ ] Set `VITE_API_BASE_URL` to the production backend URL.
- [ ] Confirm `/health` returns a healthy response.
- [ ] Confirm `/api/model-info` returns the selected model.
- [ ] Test a real request to `/api/predict`.
- [ ] Open the frontend and verify that it can reach the backend.
- [ ] Check browser developer tools for CORS or network errors.

---

## 20. Testing

Backend tests are located under `backend/tests/`.

Install test dependencies if needed:

```bash
cd backend
pip install pytest httpx
```

Run all tests:

```bash
pytest tests/ -v
```

The documented test coverage includes:

- Health endpoint behavior.
- Model information endpoint.
- Valid prediction requests.
- Missing-feature validation.
- NaN rejection.
- Unknown-class handling.
- Class-range endpoints.
- Evaluation metric responses.
- Behavior when the model is unavailable.
- Response-schema validation.

---

## 21. Retraining Procedure

To retrain the model after changing the dataset or training code:

```bash
cd backend
python -m ml.train
```

Review the generated metrics:

```text
backend/artifacts/evaluation_metrics.json
backend/artifacts/model_metadata.json
```

Then verify the artifacts and commit them:

```bash
git add backend/artifacts/
git commit -m "Retrain dry bean classification model"
git push
```

If automatic deployment is enabled, the Render service can redeploy from the new commit. Otherwise, trigger a manual redeploy in the Render dashboard.

---

## 22. Troubleshooting

### Prediction returns `503 Model not loaded`

- Run `python -m ml.train` from the `backend/` directory.
- Confirm `backend/artifacts/model.joblib` exists.
- Confirm `ARTIFACTS_DIR` points to the correct directory.
- Restart the Uvicorn server.

### Dataset not found during training

- Confirm `dataset/Dry_Bean_Dataset.xlsx` exists.
- Confirm `DATASET_PATH=../dataset/Dry_Bean_Dataset.xlsx` when running from `backend/`.
- Run the command from the `backend/` directory.

### Frontend cannot reach backend

- Confirm the backend is running.
- Check `VITE_API_BASE_URL`.
- Check the browser network tab.
- Confirm the Render service is awake and healthy.

### CORS error

Set the backend variable to include the complete frontend origin:

```env
FRONTEND_ORIGINS=http://localhost:5173,https://dry-bean-ml-classification-web-appl.vercel.app
```

Restart or redeploy the backend after changing the value.

### Render deployment cannot find model artifacts

- Confirm artifacts are committed to Git.
- Confirm the artifact paths are relative to the Render root directory.
- Confirm `ARTIFACTS_DIR=artifacts`.
- Consider durable object storage for larger or frequently updated models.

### Incorrect class name in a statistics URL

Class names are uppercase and must match one of:

```text
BARBUNYA
BOMBAY
CALI
DERMASON
HOROZ
SEKER
SIRA
```

---

## 23. Limitations

- The model depends on manually supplied numerical measurements rather than directly analyzing bean images.
- Performance may change for beans collected under different imaging conditions, equipment, or populations.
- The dataset is not perfectly balanced.
- The selected nonlinear SVM does not currently provide built-in feature importance.
- Model monitoring and prediction-drift detection are not implemented.
- The application does not currently include authentication or role-based access control.
- The current deployment strategy requires careful handling of serialized artifacts.
- The evaluation results are based on one fixed train/test split and should not be interpreted as a guarantee of real-world accuracy.

---

## 24. Future Improvements

Potential improvements include:

1. Add image-upload support and an image-based computer-vision model.
2. Tune hyperparameters using `GridSearchCV`, `RandomizedSearchCV`, or Optuna.
3. Add permutation importance or SHAP explanations.
4. Add model and data version tracking.
5. Store artifacts in Amazon S3, Google Cloud Storage, or another durable object store.
6. Add prediction logging and monitoring.
7. Add input-range warnings for values outside the observed dataset distribution.
8. Add authentication and rate limiting to the production API.
9. Add CI workflows for linting, testing, frontend builds, and backend validation.
10. Add automated retraining and model approval workflows.
11. Compare additional classifiers such as XGBoost, LightGBM, or CatBoost.
12. Add automated data-quality checks before training.

---

## 25. License and Attribution

The repository does not currently specify a project license. Add an explicit license before distributing the application as reusable software.

The Dry Bean Dataset should be attributed to its original authors and the UCI Machine Learning Repository:

> Koklu, M. and Ozkan, I. A. (2020). “Multiclass Classification of Dry Beans Using Computer Vision and Machine Learning Techniques.” *Computers and Electronics in Agriculture*, 174, 105507.

---

## 26. Quick Reference

### Train

```bash
cd backend
python -m ml.train
```

### Start backend

```bash
cd backend
uvicorn app.main:app --reload --port 8000
```

### Start frontend

```bash
cd frontend
npm install
npm run dev
```

### Run tests

```bash
cd backend
pytest tests/ -v
```

### Key URLs

```text
Frontend: http://localhost:5173
Backend:  http://localhost:8000
Swagger:  http://localhost:8000/docs
ReDoc:    http://localhost:8000/redoc
Health:   http://localhost:8000/health
```
