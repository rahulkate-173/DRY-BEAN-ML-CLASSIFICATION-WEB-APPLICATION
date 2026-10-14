"""
BeanVision AI — Full ML Training Pipeline
==========================================
Run from the backend/ directory:
    python -m ml.train

Trains 6 classifiers, selects the best by macro-F1, evaluates on a held-out
test set, and saves all artifacts to the configured artifacts directory.
"""
from __future__ import annotations

import json
import logging
import sys
import warnings
from datetime import datetime, timezone
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.calibration import CalibratedClassifierCV
from sklearn.ensemble import (
    HistGradientBoostingClassifier,
    RandomForestClassifier,
)
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
)
from sklearn.model_selection import StratifiedKFold, cross_validate, train_test_split
from sklearn.neighbors import KNeighborsClassifier
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import LabelEncoder, PowerTransformer, StandardScaler
from sklearn.svm import SVC
from sklearn.tree import DecisionTreeClassifier

# Add backend root to path
sys.path.insert(0, str(Path(__file__).parent.parent))
from app.config import settings

warnings.filterwarnings("ignore")
logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
RANDOM_SEED = 42
TEST_SIZE = 0.2
CV_FOLDS = 5
DATASET_VERSION = "UCI ML Repository — Dry Bean Dataset (Koklu & Ozkan, 2020)"

FEATURE_NAMES = [
    "Area", "Perimeter", "MajorAxisLength", "MinorAxisLength",
    "AspectRation", "Eccentricity", "ConvexArea", "EquivDiameter",
    "Extent", "Solidity", "roundness", "Compactness",
    "ShapeFactor1", "ShapeFactor2", "ShapeFactor3", "ShapeFactor4",
]
TARGET_COL = "Class"


# ---------------------------------------------------------------------------
# 1. Load & Validate Dataset
# ---------------------------------------------------------------------------
def load_dataset(path: Path) -> pd.DataFrame:
    logger.info("Loading dataset from %s", path)
    if not path.exists():
        raise FileNotFoundError(
            f"Dataset not found at '{path}'.\n"
            "Place Dry_Bean_Dataset.xlsx in the dataset/ directory "
            "or set DATASET_PATH in backend/.env"
        )

    df = pd.read_excel(path, engine="openpyxl")
    logger.info("Raw shape: %s", df.shape)

    # Validate required columns
    missing_cols = [c for c in FEATURE_NAMES + [TARGET_COL] if c not in df.columns]
    if missing_cols:
        raise ValueError(f"Missing required columns: {missing_cols}")

    # Remove duplicates
    before = len(df)
    df = df.drop_duplicates()
    logger.info("Removed %d duplicates; %d rows remain", before - len(df), len(df))

    # Check missing values
    nulls = df[FEATURE_NAMES + [TARGET_COL]].isnull().sum().sum()
    if nulls > 0:
        logger.warning("%d missing values found — dropping rows", nulls)
        df = df.dropna(subset=FEATURE_NAMES + [TARGET_COL])

    # Validate numeric features
    for col in FEATURE_NAMES:
        df[col] = pd.to_numeric(df[col], errors="coerce")

    df = df.dropna(subset=FEATURE_NAMES)
    df[TARGET_COL] = df[TARGET_COL].str.strip().str.upper()

    logger.info("Final shape: %s | Classes: %s", df.shape, sorted(df[TARGET_COL].unique()))
    return df


# ---------------------------------------------------------------------------
# 2. Dataset Statistics
# ---------------------------------------------------------------------------
def compute_dataset_statistics(df: pd.DataFrame) -> dict:
    stats: dict = {
        "total_records": int(len(df)),
        "feature_count": len(FEATURE_NAMES),
        "class_count": int(df[TARGET_COL].nunique()),
        "class_distribution": df[TARGET_COL].value_counts().to_dict(),
        "feature_stats": {},
    }
    for col in FEATURE_NAMES:
        s = df[col].describe(percentiles=[0.25, 0.5, 0.75])
        stats["feature_stats"][col] = {
            "min": float(s["min"]),
            "max": float(s["max"]),
            "mean": float(s["mean"]),
            "median": float(s["50%"]),
            "std": float(s["std"]),
            "q25": float(s["25%"]),
            "q75": float(s["75%"]),
            "count": int(s["count"]),
        }
    return stats


def compute_class_ranges(df: pd.DataFrame) -> dict:
    """Per-class descriptive statistics for every feature."""
    result: dict = {}
    for cls in sorted(df[TARGET_COL].unique()):
        sub = df[df[TARGET_COL] == cls]
        result[cls] = {}
        for col in FEATURE_NAMES:
            s = sub[col].describe(percentiles=[0.25, 0.5, 0.75])
            result[cls][col] = {
                "min": float(s["min"]),
                "max": float(s["max"]),
                "mean": float(s["mean"]),
                "median": float(s["50%"]),
                "std": float(s["std"]),
                "q25": float(s["25%"]),
                "q75": float(s["75%"]),
                "count": int(s["count"]),
            }
    return result


# ---------------------------------------------------------------------------
# 3. Model Definitions
# ---------------------------------------------------------------------------
def get_model_configs() -> dict[str, dict]:
    """
    Returns model name → {pipeline, needs_scaling}.
    SVM doesn't support predict_proba natively with rbf; we calibrate it.
    """
    return {
        "RandomForest": {
            "pipeline": Pipeline([
                ("classifier", RandomForestClassifier(
                    n_estimators=200, random_state=RANDOM_SEED, n_jobs=-1
                )),
            ]),
            "needs_scaling": False,
            "supports_proba": True,
        },
        "SVM_Calibrated": {
            "pipeline": Pipeline([
                ("scaler", PowerTransformer(method="yeo-johnson")),
                ("classifier", CalibratedClassifierCV(
                    SVC(kernel="rbf", C=10, gamma="scale", random_state=RANDOM_SEED),
                    cv=3, method="sigmoid",
                )),
            ]),
            "needs_scaling": True,
            "supports_proba": True,
        },
        "KNN": {
            "pipeline": Pipeline([
                ("scaler", StandardScaler()),
                ("classifier", KNeighborsClassifier(n_neighbors=7, n_jobs=-1)),
            ]),
            "needs_scaling": True,
            "supports_proba": True,
        },
        "LogisticRegression": {
            "pipeline": Pipeline([
                ("scaler", PowerTransformer(method="yeo-johnson")),
                ("classifier", LogisticRegression(
                    max_iter=2000, C=1.0, random_state=RANDOM_SEED, n_jobs=-1
                )),
            ]),
            "needs_scaling": True,
            "supports_proba": True,
        },
        "DecisionTree": {
            "pipeline": Pipeline([
                ("classifier", DecisionTreeClassifier(
                    random_state=RANDOM_SEED, max_depth=None
                )),
            ]),
            "needs_scaling": False,
            "supports_proba": True,
        },
        "HistGradientBoosting": {
            "pipeline": Pipeline([
                ("classifier", HistGradientBoostingClassifier(
                    max_iter=200, random_state=RANDOM_SEED
                )),
            ]),
            "needs_scaling": False,
            "supports_proba": True,
        },
    }


# ---------------------------------------------------------------------------
# 4. Cross-Validation Comparison
# ---------------------------------------------------------------------------
def compare_models(
    configs: dict, X_train: pd.DataFrame, y_train: np.ndarray
) -> pd.DataFrame:
    cv = StratifiedKFold(n_splits=CV_FOLDS, shuffle=True, random_state=RANDOM_SEED)
    rows = []
    for name, cfg in configs.items():
        logger.info("  CV evaluating: %s", name)
        scores = cross_validate(
            cfg["pipeline"], X_train, y_train, cv=cv,
            scoring=["accuracy", "f1_macro", "precision_macro", "recall_macro"],
            n_jobs=-1, error_score="raise",
        )
        rows.append({
            "model": name,
            "cv_accuracy_mean": float(scores["test_accuracy"].mean()),
            "cv_accuracy_std": float(scores["test_accuracy"].std()),
            "cv_f1_macro_mean": float(scores["test_f1_macro"].mean()),
            "cv_f1_macro_std": float(scores["test_f1_macro"].std()),
            "cv_precision_macro_mean": float(scores["test_precision_macro"].mean()),
            "cv_recall_macro_mean": float(scores["test_recall_macro"].mean()),
        })
    return pd.DataFrame(rows).sort_values("cv_f1_macro_mean", ascending=False)


# ---------------------------------------------------------------------------
# 5. Final Evaluation on Test Set
# ---------------------------------------------------------------------------
def evaluate_on_test(
    pipeline: Pipeline,
    X_test: pd.DataFrame,
    y_test: np.ndarray,
    label_encoder: LabelEncoder,
) -> dict:
    y_pred = pipeline.predict(X_test)

    report = classification_report(
        y_test, y_pred,
        target_names=label_encoder.classes_,
        output_dict=True,
    )

    cm = confusion_matrix(y_test, y_pred)

    return {
        "accuracy": float(accuracy_score(y_test, y_pred)),
        "f1_macro": float(f1_score(y_test, y_pred, average="macro")),
        "f1_weighted": float(f1_score(y_test, y_pred, average="weighted")),
        "precision_macro": float(precision_score(y_test, y_pred, average="macro")),
        "recall_macro": float(recall_score(y_test, y_pred, average="macro")),
        "per_class_report": {
            k: {mk: float(mv) for mk, mv in v.items()}
            if isinstance(v, dict) else float(v)
            for k, v in report.items()
        },
        "confusion_matrix": cm.tolist(),
        "class_labels": list(label_encoder.classes_),
    }


# ---------------------------------------------------------------------------
# 6. Feature Importance
# ---------------------------------------------------------------------------
def extract_feature_importance(pipeline: Pipeline, model_name: str) -> dict:
    clf = pipeline.named_steps["classifier"]

    if hasattr(clf, "feature_importances_"):
        importances = clf.feature_importances_
        return {
            "method": "Gini impurity (built-in)",
            "model": model_name,
            "importances": {
                f: float(v) for f, v in zip(FEATURE_NAMES, importances)
            },
        }

    if hasattr(clf, "coef_"):
        # Multi-class logistic regression: mean absolute coefficient per feature
        coef_mean = np.abs(clf.coef_).mean(axis=0)
        return {
            "method": "Mean absolute coefficient (Logistic Regression)",
            "model": model_name,
            "importances": {
                f: float(v) for f, v in zip(FEATURE_NAMES, coef_mean)
            },
        }

    return {
        "method": "Not available for this estimator",
        "model": model_name,
        "importances": {},
    }


# ---------------------------------------------------------------------------
# 7. Main Training Entry Point
# ---------------------------------------------------------------------------
def run_training() -> None:
    artifacts_dir = settings.artifacts_path
    artifacts_dir.mkdir(parents=True, exist_ok=True)
    logger.info("Artifacts will be saved to: %s", artifacts_dir.resolve())

    # ---- Load dataset ----
    df = load_dataset(settings.dataset_file_path)

    # ---- Statistics ----
    logger.info("Computing dataset statistics…")
    dataset_stats = compute_dataset_statistics(df)
    class_ranges = compute_class_ranges(df)

    # ---- Split ----
    X = df[FEATURE_NAMES]
    y = df[TARGET_COL]

    le = LabelEncoder()
    y_encoded = le.fit_transform(y)
    logger.info("Classes: %s", list(le.classes_))

    X_train, X_test, y_train, y_test = train_test_split(
        X, y_encoded,
        test_size=TEST_SIZE,
        random_state=RANDOM_SEED,
        stratify=y_encoded,
    )
    logger.info("Train: %d  Test: %d", len(X_train), len(X_test))

    # ---- Cross-validation comparison ----
    configs = get_model_configs()
    logger.info("Running %d-fold CV for %d models…", CV_FOLDS, len(configs))
    comparison_df = compare_models(configs, X_train, y_train)
    logger.info("\nCV Results:\n%s", comparison_df.to_string(index=False))

    best_model_name = comparison_df.iloc[0]["model"]
    logger.info("Best model by macro-F1: %s", best_model_name)

    # ---- Train best model on full training set ----
    best_pipeline = configs[best_model_name]["pipeline"]
    logger.info("Training final pipeline: %s", best_model_name)
    best_pipeline.fit(X_train, y_train)

    # ---- Test-set evaluation ----
    logger.info("Evaluating on held-out test set…")
    test_eval = evaluate_on_test(best_pipeline, X_test, y_test, le)
    logger.info(
        "Test  accuracy=%.4f  macro-F1=%.4f",
        test_eval["accuracy"], test_eval["f1_macro"],
    )

    # ---- Feature importance ----
    feat_imp = extract_feature_importance(best_pipeline, best_model_name)

    # ---- Model metadata ----
    model_metadata = {
        "model_name": best_model_name,
        "preprocessor": str(best_pipeline.named_steps.get("scaler", "None")),
        "model_version": settings.model_version,
        "training_date": datetime.now(timezone.utc).isoformat(),
        "dataset_source": DATASET_VERSION,
        "dataset_path": str(settings.dataset_file_path),
        "random_seed": RANDOM_SEED,
        "test_size": TEST_SIZE,
        "cv_folds": CV_FOLDS,
        "feature_names": FEATURE_NAMES,
        "class_labels": list(le.classes_),
        "training_samples": int(len(X_train)),
        "test_samples": int(len(X_test)),
        "test_metrics": {
            "accuracy": test_eval["accuracy"],
            "f1_macro": test_eval["f1_macro"],
            "f1_weighted": test_eval["f1_weighted"],
            "precision_macro": test_eval["precision_macro"],
            "recall_macro": test_eval["recall_macro"],
        },
    }

    evaluation_metrics = {
        "model_comparison": comparison_df.to_dict(orient="records"),
        "best_model": best_model_name,
        "selection_metric": "cv_f1_macro_mean",
        "test_metrics": test_eval,
        "training_samples": int(len(X_train)),
        "test_samples": int(len(X_test)),
        "cv_folds": CV_FOLDS,
        "cross_validation": {
            row["model"]: {
                "cv_f1_macro_mean": row["cv_f1_macro_mean"],
                "cv_f1_macro_std": row["cv_f1_macro_std"],
                "cv_accuracy_mean": row["cv_accuracy_mean"],
            }
            for row in comparison_df.to_dict(orient="records")
        },
    }

    confusion_matrix_data = {
        "matrix": test_eval["confusion_matrix"],
        "class_labels": list(le.classes_),
    }

    # ---- Save artifacts ----
    joblib.dump(best_pipeline, artifacts_dir / "model.joblib")
    logger.info("Saved model.joblib")

    def _save_json(data: dict, name: str) -> None:
        p = artifacts_dir / name
        with open(p, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, default=str)
        logger.info("Saved %s", name)

    _save_json(model_metadata, "model_metadata.json")
    _save_json(evaluation_metrics, "evaluation_metrics.json")
    _save_json(dataset_stats, "dataset_statistics.json")
    _save_json(feat_imp, "feature_importance.json")
    _save_json(confusion_matrix_data, "confusion_matrix.json")
    _save_json(class_ranges, "class_ranges.json")

    logger.info("✓ Training complete.  All artifacts saved to %s", artifacts_dir.resolve())
    logger.info("  Run: uvicorn app.main:app --reload")


if __name__ == "__main__":
    run_training()
