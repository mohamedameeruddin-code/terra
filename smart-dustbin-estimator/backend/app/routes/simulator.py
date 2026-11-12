from fastapi import APIRouter
from app.services.simulator_service import simulator

router = APIRouter(prefix="/api/simulator", tags=["Simulator"])


@router.post("/start")
def start_simulator():
    """Starts simulated continuous telemetry generation for demo bins."""
    simulator.start()
    return {"status": "running", "message": "Telemetry simulator active (5s cycle)"}


@router.post("/stop")
def stop_simulator():
    """Stops simulated telemetry generation."""
    simulator.stop()
    return {"status": "stopped", "message": "Telemetry simulator paused"}


@router.get("/status")
def get_simulator_status():
    return {
        "is_running": simulator.is_running,
        "mode": "Live 8-Bin Campus Demonstration"
    }

