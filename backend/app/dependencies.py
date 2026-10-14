"""
Shared application state loaded once at startup via FastAPI lifespan.
Provides dependency-injected access to the trained model and dataset stats.
"""
from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Any, Optional

import joblib
import pandas as pd

from app.config import settings

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Module-level state (populated during lifespan startup)
# ---------------------------------------------------------------------------
_model_pipeline = None
_model_metadata: dict[str, Any] = {}
_evaluation_metrics: dict[str, Any] = {}
_dataset_statistics: dict[str, Any] = {}
_feature_importance: dict[str, Any] = {}
_confusion_matrix_data: dict[str, Any] = {}
_dataset_df: Optional[pd.DataFrame] = None
_class_ranges: dict[str, Any] = {}


def load_artifacts() -> None:
    """Load all saved artifacts from disk into module-level state."""
    global _model_pipeline, _model_metadata, _evaluation_metrics
    global _dataset_statistics, _feature_importance, _confusion_matrix_data
    global _dataset_df, _class_ranges

    artifacts = settings.artifacts_path

    # ---- model pipeline ----
    model_path = artifacts / "model.joblib"
    if model_path.exists():
        try:
            _model_pipeline = joblib.load(model_path)
            logger.info("Model pipeline loaded from %s", model_path)
        except Exception as exc:
            logger.error("Failed to load model: %s", exc)
            _model_pipeline = None
    else:
        logger.warning("model.joblib not found at %s — run training first", model_path)

    # ---- JSON artifacts ----
    def _load_json(name: str) -> dict:
        p = artifacts / name
        if p.exists():
            with open(p, "r", encoding="utf-8") as f:
                return json.load(f)
        logger.warning("%s not found — run training first", p)
        return {}

    _model_metadata = _load_json("model_metadata.json")
    _evaluation_metrics = _load_json("evaluation_metrics.json")
    _dataset_statistics = _load_json("dataset_statistics.json")
    _feature_importance = _load_json("feature_importance.json")
    _confusion_matrix_data = _load_json("confusion_matrix.json")
    _class_ranges = _load_json("class_ranges.json")

    # ---- dataset for sample endpoint ----
    dataset_path = settings.dataset_file_path
    if dataset_path.exists():
        try:
            _dataset_df = pd.read_excel(dataset_path, engine="openpyxl")
            logger.info("Dataset loaded: %d rows", len(_dataset_df))
        except Exception as exc:
            logger.error("Failed to load dataset: %s", exc)
    else:
        logger.warning("Dataset not found at %s", dataset_path)


# ---------------------------------------------------------------------------
# Dependency functions (injected via FastAPI Depends)
# ---------------------------------------------------------------------------
def get_model():
    return _model_pipeline


def get_model_metadata() -> dict:
    return _model_metadata


def get_evaluation_metrics() -> dict:
    return _evaluation_metrics


def get_dataset_statistics() -> dict:
    return _dataset_statistics


def get_feature_importance() -> dict:
    return _feature_importance


def get_confusion_matrix_data() -> dict:
    return _confusion_matrix_data


def get_dataset_df() -> Optional[pd.DataFrame]:
    return _dataset_df


def get_class_ranges() -> dict:
    return _class_ranges


def model_is_loaded() -> bool:
    return _model_pipeline is not None


def dataset_is_loaded() -> bool:
    return _dataset_df is not None
