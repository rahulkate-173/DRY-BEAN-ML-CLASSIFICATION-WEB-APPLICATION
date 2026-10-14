"""
pytest test suite for BeanVision AI backend.
Run from backend/ directory: pytest tests/ -v
"""
from __future__ import annotations

import json
from unittest.mock import MagicMock, patch

import numpy as np
import pytest
from fastapi.testclient import TestClient

# ---- We must patch artifact loading before importing the app ----
# This avoids needing real files on disk during CI.


@pytest.fixture(scope="session")
def mock_model():
    """A mock sklearn pipeline that always predicts class index 5 (SEKER)."""
    m = MagicMock()
    m.predict.return_value = np.array([5])  # SEKER
    m.predict_proba.return_value = np.array(
        [[0.01, 0.01, 0.02, 0.02, 0.02, 0.90, 0.02]]
    )
    return m


@pytest.fixture(scope="session")
def mock_metadata():
    return {
        "model_name": "SVM_Calibrated",
        "preprocessor": "PowerTransformer",
        "model_version": "1.0.0",
        "training_date": "2026-01-01T00:00:00+00:00",
        "dataset_source": "UCI ML Repository",
        "random_seed": 42,
        "feature_names": [
            "Area", "Perimeter", "MajorAxisLength", "MinorAxisLength",
            "AspectRation", "Eccentricity", "ConvexArea", "EquivDiameter",
            "Extent", "Solidity", "roundness", "Compactness",
            "ShapeFactor1", "ShapeFactor2", "ShapeFactor3", "ShapeFactor4",
        ],
        "class_labels": [
            "BARBUNYA", "BOMBAY", "CALI", "DERMASON", "HOROZ", "SEKER", "SIRA"
        ],
        "training_samples": 10834,
        "test_samples": 2709,
        "test_metrics": {
            "accuracy": 0.93,
            "f1_macro": 0.94,
            "f1_weighted": 0.93,
            "precision_macro": 0.94,
            "recall_macro": 0.94,
        },
    }


@pytest.fixture(scope="session")
def mock_eval_metrics():
    return {
        "best_model": "SVM_Calibrated",
        "selection_metric": "cv_f1_macro_mean",
        "model_comparison": [],
        "test_metrics": {
            "accuracy": 0.93,
            "f1_macro": 0.94,
            "per_class_report": {},
            "confusion_matrix": [[100, 1], [2, 99]],
            "class_labels": ["BARBUNYA", "BOMBAY"],
        },
        "training_samples": 10834,
        "test_samples": 2709,
        "cv_folds": 5,
        "cross_validation": {},
    }


@pytest.fixture(scope="session")
def mock_dataset_stats():
    return {
        "total_records": 13543,
        "feature_count": 16,
        "class_count": 7,
        "class_distribution": {
            "SEKER": 2027, "BARBUNYA": 1322, "BOMBAY": 522,
            "CALI": 1630, "DERMASON": 3546, "HOROZ": 1928, "SIRA": 2636,
        },
        "feature_stats": {
            "Area": {"min": 20420.0, "max": 254616.0, "mean": 53026.0,
                     "median": 45220.0, "std": 29241.0, "q25": 34994.0, "q75": 61695.0},
        },
    }


@pytest.fixture(scope="session")
def mock_class_ranges():
    return {
        "SEKER": {"Area": {"min": 20420.0, "max": 56821.0, "mean": 30951.0,
                           "median": 30264.0, "std": 4742.0, "q25": 27775.0,
                           "q75": 33686.0, "count": 2027}},
    }


@pytest.fixture(scope="session")
def client(mock_model, mock_metadata, mock_eval_metrics, mock_dataset_stats, mock_class_ranges):
    """Create a TestClient with all dependencies mocked."""
    import app.dependencies as deps

    deps._model_pipeline = mock_model
    deps._model_metadata = mock_metadata
    deps._evaluation_metrics = mock_eval_metrics
    deps._dataset_statistics = mock_dataset_stats
    deps._class_ranges = mock_class_ranges
    deps._feature_importance = {"method": "Gini", "model": "SVM_Calibrated", "importances": {}}
    deps._confusion_matrix_data = {"matrix": [[1]], "class_labels": ["SEKER"]}
    deps._dataset_df = None  # sample endpoint will 503

    from app.main import app
    return TestClient(app)


# ---------------------------------------------------------------------------
# Test: Root & Health
# ---------------------------------------------------------------------------
def test_root(client):
    r = client.get("/")
    assert r.status_code == 200
    data = r.json()
    assert "BeanVision" in data["service"]


def test_health_model_loaded(client):
    r = client.get("/health")
    assert r.status_code == 200
    data = r.json()
    assert data["model_loaded"] is True
    assert data["status"] == "ok"


# ---------------------------------------------------------------------------
# Test: Model info
# ---------------------------------------------------------------------------
def test_model_info(client):
    r = client.get("/api/model-info")
    assert r.status_code == 200
    data = r.json()
    assert "model_name" in data
    assert "class_labels" in data
    assert len(data["class_labels"]) == 7


# ---------------------------------------------------------------------------
# Test: Valid prediction
# ---------------------------------------------------------------------------
VALID_PAYLOAD = {
    "Area": 28395.0, "Perimeter": 610.291, "MajorAxisLength": 208.178117,
    "MinorAxisLength": 173.888747, "AspectRation": 1.197191, "Eccentricity": 0.549812,
    "ConvexArea": 28715.0, "EquivDiameter": 190.141097, "Extent": 0.763923,
    "Solidity": 0.988856, "roundness": 0.958027, "Compactness": 0.913358,
    "ShapeFactor1": 0.007332, "ShapeFactor2": 0.003147, "ShapeFactor3": 0.834222,
    "ShapeFactor4": 0.998724,
}


def test_valid_prediction(client):
    r = client.post("/api/predict", json=VALID_PAYLOAD)
    assert r.status_code == 200
    data = r.json()
    assert "predicted_class" in data
    assert data["predicted_class"] in [
        "BARBUNYA", "BOMBAY", "CALI", "DERMASON", "HOROZ", "SEKER", "SIRA"
    ]
    assert "confidence" in data
    assert 0.0 <= data["confidence"] <= 1.0
    assert "model_version" in data


# ---------------------------------------------------------------------------
# Test: Missing field → 422
# ---------------------------------------------------------------------------
def test_missing_field(client):
    payload = {k: v for k, v in VALID_PAYLOAD.items() if k != "Area"}
    r = client.post("/api/predict", json=payload)
    assert r.status_code == 422


# ---------------------------------------------------------------------------
# Test: NaN / Inf rejected → 422
# ---------------------------------------------------------------------------
def test_nan_rejected(client):
    payload = {**VALID_PAYLOAD, "Area": float("nan")}
    r = client.post("/api/predict", json=payload)
    assert r.status_code == 422


def test_inf_rejected(client):
    payload = {**VALID_PAYLOAD, "Area": float("inf")}
    r = client.post("/api/predict", json=payload)
    assert r.status_code == 422


# ---------------------------------------------------------------------------
# Test: Statistics endpoints
# ---------------------------------------------------------------------------
def test_statistics_overview(client):
    r = client.get("/api/statistics/overview")
    assert r.status_code == 200
    data = r.json()
    assert data["total_records"] > 0
    assert data["class_count"] == 7


def test_statistics_classes(client):
    r = client.get("/api/statistics/classes")
    assert r.status_code == 200
    data = r.json()
    assert "classes" in data
    assert "SEKER" in data["classes"]


def test_statistics_features(client):
    r = client.get("/api/statistics/features")
    assert r.status_code == 200
    data = r.json()
    assert "feature_names" in data
    assert len(data["feature_names"]) == 16


def test_class_ranges_all(client):
    r = client.get("/api/statistics/class-ranges")
    assert r.status_code == 200
    data = r.json()
    assert "SEKER" in data


def test_class_ranges_valid(client):
    r = client.get("/api/statistics/class-ranges/SEKER")
    assert r.status_code == 200
    data = r.json()
    assert data["bean_class"] == "SEKER"


def test_class_ranges_invalid(client):
    r = client.get("/api/statistics/class-ranges/FAKECLASSXYZ")
    assert r.status_code == 404


# ---------------------------------------------------------------------------
# Test: Evaluation endpoints
# ---------------------------------------------------------------------------
def test_evaluation(client):
    r = client.get("/api/evaluation")
    assert r.status_code == 200
    data = r.json()
    assert "best_model" in data
    assert "test_metrics" in data


def test_confusion_matrix(client):
    r = client.get("/api/evaluation/confusion-matrix")
    assert r.status_code == 200
    data = r.json()
    assert "matrix" in data
    assert "class_labels" in data


def test_feature_importance(client):
    r = client.get("/api/evaluation/feature-importance")
    assert r.status_code == 200


# ---------------------------------------------------------------------------
# Test: Prediction schema includes all required fields
# ---------------------------------------------------------------------------
def test_prediction_response_schema(client):
    r = client.post("/api/predict", json=VALID_PAYLOAD)
    assert r.status_code == 200
    data = r.json()
    required_keys = {"predicted_class", "confidence", "model_version",
                     "range_warnings", "interpretation"}
    assert required_keys.issubset(data.keys())


# ---------------------------------------------------------------------------
# Test: Model missing → 503
# ---------------------------------------------------------------------------
def test_model_missing_returns_503(mock_metadata, mock_eval_metrics,
                                   mock_dataset_stats, mock_class_ranges):
    import app.dependencies as deps
    original = deps._model_pipeline
    deps._model_pipeline = None
    try:
        from app.main import app
        c = TestClient(app, raise_server_exceptions=False)
        r = c.post("/api/predict", json=VALID_PAYLOAD)
        assert r.status_code == 503
    finally:
        deps._model_pipeline = original
