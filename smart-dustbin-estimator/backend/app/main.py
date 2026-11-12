from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import UPLOAD_DIR, PROCESSED_DIR, SAMPLE_DIR
from app.database import engine, Base, SessionLocal
from app.services.simulator_service import simulator
from app.services.sample_generator import generate_sample_images_if_missing

# Routers
from app.routes.analysis import router as analysis_router
from app.routes.dashboard import router as dashboard_router
from app.routes.bins import router as bins_router
from app.routes.readings import router as readings_router
from app.routes.collection import router as collection_router
from app.routes.alerts import router as alerts_router
from app.routes.history import router as history_router
from app.routes.export import router as export_router
from app.routes.stream import router as stream_router
from app.routes.simulator import router as simulator_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: create SQLite database tables
    Base.metadata.create_all(bind=engine)

    # Generate sample test suite images
    generate_sample_images_if_missing()

    # Seed demo bins and realistic telemetry
    db = SessionLocal()
    try:
        simulator.initialize_demo_bins(db)
    finally:
        db.close()

    yield

    # Shutdown
    simulator.stop()


app = FastAPI(
    title="Smart Dustbin Estimator - Waste Intelligence API",
    version="1.0.0",
    description="Unified Computer Vision & IoT Sensor Platform for Waste Fill Estimation",
    lifespan=lifespan
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static file serving
app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")
app.mount("/processed", StaticFiles(directory=str(PROCESSED_DIR)), name="processed")
app.mount("/samples", StaticFiles(directory=str(SAMPLE_DIR)), name="samples")

# Register routes
app.include_router(analysis_router)
app.include_router(dashboard_router)
app.include_router(bins_router)
app.include_router(readings_router)
app.include_router(collection_router)
app.include_router(alerts_router)
app.include_router(history_router)
app.include_router(export_router)
app.include_router(stream_router)
app.include_router(simulator_router)


@app.get("/api/health", tags=["Health"])
def health_check():
    """Health check endpoint to verify backend status."""
    return {
        "status": "healthy",
        "service": "Smart Dustbin Estimator API",
        "version": "1.0.0",
        "system": "Terra & Soil/Signal Waste Intelligence"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)

