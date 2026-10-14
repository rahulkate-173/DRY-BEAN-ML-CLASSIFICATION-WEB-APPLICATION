"""
BeanVision AI — FastAPI Application Entry Point
"""
from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.dependencies import (
    dataset_is_loaded,
    get_model_metadata,
    load_artifacts,
    model_is_loaded,
)
from app.routers import evaluation, prediction, statistics

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)-8s %(name)s — %(message)s",
)
logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Lifespan — load artifacts once at startup
# ---------------------------------------------------------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("BeanVision AI — loading artifacts…")
    load_artifacts()
    if model_is_loaded():
        logger.info("✓ Model ready")
    else:
        logger.warning("✗ Model NOT loaded — predictions unavailable")
    yield
    logger.info("BeanVision AI — shutting down")


# ---------------------------------------------------------------------------
# Application
# ---------------------------------------------------------------------------
app = FastAPI(
    title="BeanVision AI",
    description="Dry Bean Classification & Agricultural Intelligence API",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(prediction.router)
app.include_router(statistics.router)
app.include_router(evaluation.router)


# ---------------------------------------------------------------------------
# Root & Health
# ---------------------------------------------------------------------------
@app.get("/")
def root() -> dict:
    return {
        "service": "BeanVision AI",
        "description": "Dry Bean Classification API",
        "version": "1.0.0",
        "docs": "/docs",
    }


@app.get("/health")
def health() -> dict:
    metadata = get_model_metadata()
    return {
        "status": "ok",
        "model_loaded": model_is_loaded(),
        "model_version": metadata.get("model_version") if metadata else None,
        "dataset_available": dataset_is_loaded(),
    }


@app.get("/api/model-info")
def model_info() -> dict:
    metadata = get_model_metadata()
    if not metadata:
        return {
            "error": "Model not trained yet. Run: python -m ml.train",
            "model_loaded": False,
        }
    return metadata
