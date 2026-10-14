"""
Prediction router — POST /api/predict
"""
from __future__ import annotations

import logging
from typing import Any

import numpy as np
import pandas as pd
from fastapi import APIRouter, Depends, HTTPException

from app.dependencies import (
    get_class_ranges,
    get_dataset_df,
    get_dataset_statistics,
    get_model,
    get_model_metadata,
)
from app.schemas import (
    BEAN_CLASSES,
    FEATURE_NAMES,
    BeanFeatures,
    PredictionResponse,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["prediction"])


def _range_warnings(features: dict, class_ranges: dict, global_stats: dict) -> list[str]:
    warnings = []
    feat_stats = global_stats.get("feature_stats", {})
    for feat, val in features.items():
        if feat in feat_stats:
            fmin = feat_stats[feat]["min"]
            fmax = feat_stats[feat]["max"]
            if val < fmin or val > fmax:
                warnings.append(
                    f"{feat}: value {val:.4g} is outside the observed dataset "
                    f"range [{fmin:.4g}, {fmax:.4g}]."
                )
    return warnings


@router.post("/predict", response_model=PredictionResponse)
def predict(
    body: BeanFeatures,
    model=Depends(get_model),
    metadata: dict = Depends(get_model_metadata),
    class_ranges: dict = Depends(get_class_ranges),
    global_stats: dict = Depends(get_dataset_statistics),
) -> PredictionResponse:
    if model is None:
        raise HTTPException(
            status_code=503,
            detail=(
                "Model not loaded. Run 'python -m ml.train' in the backend/ "
                "directory to generate the model artifact, then restart the server."
            ),
        )

    features_dict = body.to_dict()
    input_df = pd.DataFrame([features_dict], columns=FEATURE_NAMES)

    # Predict
    predicted_encoded = model.predict(input_df)[0]

    class_labels: list[str] = metadata.get("class_labels", BEAN_CLASSES)

    # Probabilities (pipeline was trained on encoded labels)
    probabilities: dict[str, float] | None = None
    confidence = 0.0

    if hasattr(model, "predict_proba"):
        try:
            proba = model.predict_proba(input_df)[0]
            probabilities = {cls: float(p) for cls, p in zip(class_labels, proba)}
            confidence = float(np.max(proba))
        except Exception as exc:
            logger.warning("predict_proba failed: %s", exc)

    predicted_class = class_labels[predicted_encoded]

    if confidence == 0.0:
        confidence = 1.0  # placeholder for models without proba

    # Range warnings
    range_warns = _range_warnings(features_dict, class_ranges, global_stats)

    interpretation = (
        f"The model classifies this bean as **{predicted_class.title()}** "
        f"with {confidence*100:.1f}% confidence. "
        "This is a statistical estimate based on the 16 morphological features "
        "and the patterns learned from 13,611 bean samples. "
        "It is not a definitive agricultural assessment."
    )

    return PredictionResponse(
        predicted_class=predicted_class,
        confidence=round(confidence, 4),
        probabilities=probabilities,
        model_version=metadata.get("model_version", "unknown"),
        range_warnings=range_warns,
        interpretation=interpretation,
    )


@router.get("/dataset/sample")
def get_sample(df: Any = Depends(get_dataset_df)) -> dict:
    """Return a random dataset row (features only — target hidden from prediction)."""
    if df is None:
        raise HTTPException(
            status_code=503,
            detail="Dataset not available. Check DATASET_PATH configuration.",
        )
    row = df[FEATURE_NAMES].sample(1, random_state=None).iloc[0]
    return {feat: float(row[feat]) for feat in FEATURE_NAMES}
