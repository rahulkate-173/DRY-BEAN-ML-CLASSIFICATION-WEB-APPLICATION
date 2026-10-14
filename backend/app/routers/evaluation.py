"""
Evaluation router — model comparison and performance metrics.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException

from app.dependencies import (
    get_confusion_matrix_data,
    get_evaluation_metrics,
    get_feature_importance,
    get_model_metadata,
)

router = APIRouter(prefix="/api/evaluation", tags=["evaluation"])


@router.get("")
def evaluation(metrics: dict = Depends(get_evaluation_metrics)) -> dict:
    if not metrics:
        raise HTTPException(503, "Evaluation metrics not available — run training first.")
    return metrics


@router.get("/confusion-matrix")
def confusion_matrix_endpoint(cm: dict = Depends(get_confusion_matrix_data)) -> dict:
    if not cm:
        raise HTTPException(503, "Confusion matrix not available — run training first.")
    return cm


@router.get("/feature-importance")
def feature_importance(fi: dict = Depends(get_feature_importance)) -> dict:
    if not fi:
        raise HTTPException(503, "Feature importance not available — run training first.")
    return fi
