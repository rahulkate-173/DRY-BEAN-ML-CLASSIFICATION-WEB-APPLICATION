"""
Statistics router — dataset and class-range endpoints.
"""
from __future__ import annotations

import csv
import io

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse

from app.dependencies import (
    get_class_ranges,
    get_dataset_statistics,
)
from app.schemas import BEAN_CLASSES, FEATURE_NAMES

router = APIRouter(prefix="/api/statistics", tags=["statistics"])


@router.get("/overview")
def overview(stats: dict = Depends(get_dataset_statistics)) -> dict:
    if not stats:
        raise HTTPException(503, "Statistics not available — run training first.")
    return {
        "total_records": stats.get("total_records", 0),
        "feature_count": stats.get("feature_count", len(FEATURE_NAMES)),
        "class_count": stats.get("class_count", len(BEAN_CLASSES)),
        "class_distribution": stats.get("class_distribution", {}),
    }


@router.get("/classes")
def classes() -> dict:
    return {"classes": BEAN_CLASSES}


@router.get("/features")
def features(stats: dict = Depends(get_dataset_statistics)) -> dict:
    if not stats:
        raise HTTPException(503, "Statistics not available — run training first.")
    return {
        "feature_names": FEATURE_NAMES,
        "feature_stats": stats.get("feature_stats", {}),
    }


@router.get("/class-ranges")
def all_class_ranges(class_ranges: dict = Depends(get_class_ranges)) -> dict:
    if not class_ranges:
        raise HTTPException(503, "Class ranges not available — run training first.")
    return class_ranges


@router.get("/class-ranges/{class_name}")
def single_class_ranges(
    class_name: str,
    class_ranges: dict = Depends(get_class_ranges),
) -> dict:
    normalized = class_name.strip().upper()
    if not class_ranges:
        raise HTTPException(503, "Class ranges not available — run training first.")
    if normalized not in class_ranges:
        raise HTTPException(
            404,
            detail=f"Unknown class '{class_name}'. Valid classes: {sorted(class_ranges.keys())}",
        )
    return {"bean_class": normalized, "feature_stats": class_ranges[normalized]}


# ---------------------------------------------------------------------------
# CSV export
# ---------------------------------------------------------------------------
@router.get("/export/class-ranges.csv", response_class=StreamingResponse)
def export_class_ranges_csv(class_ranges: dict = Depends(get_class_ranges)):
    if not class_ranges:
        raise HTTPException(503, "Class ranges not available — run training first.")

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Class", "Feature", "Min", "Max", "Mean", "Median",
        "Std", "Q25", "Q75", "Count",
    ])
    for cls, features in class_ranges.items():
        for feat, s in features.items():
            writer.writerow([
                cls, feat,
                s["min"], s["max"], s["mean"], s["median"],
                s["std"], s["q25"], s["q75"], s["count"],
            ])

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=class_ranges.csv"},
    )
