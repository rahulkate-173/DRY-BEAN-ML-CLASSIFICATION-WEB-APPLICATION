"""
Pydantic request/response schemas for the BeanVision AI API.
"""
from __future__ import annotations

import math
from typing import Any, Optional

from pydantic import BaseModel, Field, field_validator


# ---------------------------------------------------------------------------
# Feature names (exact column names from dataset)
# ---------------------------------------------------------------------------
FEATURE_NAMES: list[str] = [
    "Area",
    "Perimeter",
    "MajorAxisLength",
    "MinorAxisLength",
    "AspectRation",
    "Eccentricity",
    "ConvexArea",
    "EquivDiameter",
    "Extent",
    "Solidity",
    "roundness",
    "Compactness",
    "ShapeFactor1",
    "ShapeFactor2",
    "ShapeFactor3",
    "ShapeFactor4",
]

BEAN_CLASSES: list[str] = [
    "BARBUNYA",
    "BOMBAY",
    "CALI",
    "DERMASON",
    "HOROZ",
    "SEKER",
    "SIRA",
]


# ---------------------------------------------------------------------------
# Request model
# ---------------------------------------------------------------------------
class BeanFeatures(BaseModel):
    Area: float = Field(..., description="Area of the bean (pixels²)")
    Perimeter: float = Field(..., description="Perimeter of the bean (pixels)")
    MajorAxisLength: float = Field(..., description="Length of the major axis (pixels)")
    MinorAxisLength: float = Field(..., description="Length of the minor axis (pixels)")
    AspectRation: float = Field(..., description="Aspect ratio (major / minor axis)")
    Eccentricity: float = Field(..., description="Eccentricity of the ellipse")
    ConvexArea: float = Field(..., description="Area of the convex hull (pixels²)")
    EquivDiameter: float = Field(..., description="Equivalent circular diameter (pixels)")
    Extent: float = Field(..., description="Ratio of pixels in the bounding box")
    Solidity: float = Field(..., description="Ratio of area to convex area")
    roundness: float = Field(..., description="Roundness measure")
    Compactness: float = Field(..., description="Compactness measure")
    ShapeFactor1: float = Field(..., description="Shape factor 1")
    ShapeFactor2: float = Field(..., description="Shape factor 2")
    ShapeFactor3: float = Field(..., description="Shape factor 3")
    ShapeFactor4: float = Field(..., description="Shape factor 4")

    @field_validator("*", mode="before")
    @classmethod
    def validate_numeric(cls, v: Any) -> float:
        try:
            val = float(v)
        except (TypeError, ValueError):
            raise ValueError("Must be a finite number")
        if math.isnan(val) or math.isinf(val):
            raise ValueError("Value must be finite (not NaN or Infinity)")
        return val

    def to_dict(self) -> dict[str, float]:
        return self.model_dump()


# ---------------------------------------------------------------------------
# Response models
# ---------------------------------------------------------------------------
class PredictionResponse(BaseModel):
    predicted_class: str
    confidence: float
    probabilities: Optional[dict[str, float]] = None
    model_version: str
    range_warnings: list[str] = []
    interpretation: str


class ModelInfoResponse(BaseModel):
    model_name: str
    preprocessor: str
    model_version: str
    feature_names: list[str]
    class_labels: list[str]
    training_date: Optional[str]
    dataset_source: str
    random_seed: int
    test_metrics: dict[str, Any]


class HealthResponse(BaseModel):
    status: str
    model_loaded: bool
    model_version: Optional[str]
    dataset_available: bool


class StatisticsOverviewResponse(BaseModel):
    total_records: int
    feature_count: int
    class_count: int
    class_distribution: dict[str, int]


class FeatureStatsResponse(BaseModel):
    feature: str
    min: float
    max: float
    mean: float
    median: float
    std: float
    q25: float
    q75: float


class ClassFeatureStats(BaseModel):
    bean_class: str
    feature: str
    min: float
    max: float
    mean: float
    median: float
    std: float
    q25: float
    q75: float
    count: int


class EvaluationResponse(BaseModel):
    best_model: str
    selection_metric: str
    model_comparison: list[dict[str, Any]]
    test_metrics: dict[str, Any]
    cross_validation: dict[str, Any]
    training_samples: int
    test_samples: int
