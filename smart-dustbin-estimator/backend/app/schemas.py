from datetime import datetime
from typing import Optional, List, Any
from pydantic import BaseModel, Field, ConfigDict


# Vision / Image Analysis Schemas
class RoiBox(BaseModel):
    x: int
    y: int
    width: int
    height: int


class RoiPolygon(BaseModel):
    points: List[List[int]]  # [[x, y], ...]


class AnalysisResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: Optional[int] = None
    image_name: str
    original_image_url: str
    processed_image_url: str
    fill_percentage: float
    fill_status: str
    confidence_score: float
    usable_bin_height: Optional[float] = None
    detected_waste_height: Optional[float] = None
    recommendation: str
    notes: Optional[str] = None
    created_at: Optional[datetime] = None
    breakdown: Optional[dict] = None


class AnalysisRecordSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    image_name: str
    original_image_url: str
    processed_image_url: Optional[str] = None
    fill_percentage: float
    fill_status: str
    confidence_score: float
    recommendation: Optional[str] = None
    created_at: datetime
    notes: Optional[str] = None


# Bin & Sensor Schemas
class BinBase(BaseModel):
    name: str = Field(..., max_length=100)
    location: str = Field(..., max_length=150)
    depth_cm: float = Field(100.0, gt=0)
    dead_zone_cm: float = Field(20.0, ge=0)
    warn_pct: float = Field(70.0, ge=0, le=100)
    critical_pct: float = Field(90.0, ge=0, le=100)
    interval_min: int = Field(5, ge=1)


class BinCreate(BinBase):
    pass


class BinUpdate(BaseModel):
    name: Optional[str] = None
    location: Optional[str] = None
    depth_cm: Optional[float] = None
    dead_zone_cm: Optional[float] = None
    warn_pct: Optional[float] = None
    critical_pct: Optional[float] = None
    interval_min: Optional[int] = None


class BinResponse(BinBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    api_key: str
    created_at: datetime
    fill_pct: Optional[float] = 0.0
    rate_pct_per_hr: Optional[float] = 0.0
    ttf_min: Optional[int] = None
    status: Optional[str] = "OK"  # OK, WARN, CRITICAL, OFFLINE
    last_seen: Optional[datetime] = None
    battery_pct: Optional[float] = 100.0


class ReadingCreate(BaseModel):
    bin_id: int
    distance_cm: float
    battery_pct: Optional[float] = 100.0
    timestamp: Optional[datetime] = None


class ReadingResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    bin_id: int
    distance_cm: float
    smoothed_distance_cm: Optional[float]
    fill_pct: float
    battery_pct: float
    ts: datetime


class CollectionCreate(BaseModel):
    emptied_by: Optional[str] = "Staff Operator"


class CollectionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    bin_id: int
    emptied_at: datetime
    emptied_by: str
    fill_before: float


class AlertResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    bin_id: int
    bin_name: Optional[str] = None
    location: Optional[str] = None
    type: str  # WARN, CRITICAL, OFFLINE
    message: str
    created_at: datetime
    acknowledged_at: Optional[datetime] = None


class PriorityItem(BaseModel):
    rank: int
    bin_id: int
    bin_name: str
    location: str
    fill_pct: float
    ttf_min: Optional[int]
    status: str
    priority_score: float
    battery_pct: float
    last_seen: Optional[datetime]


class DashboardStats(BaseModel):
    total_bins: int
    need_emptying: int  # fill >= critical_pct
    warning_bins: int   # fill >= warn_pct and < critical_pct
    offline_bins: int
    total_scans: int
    avg_fill_pct: float
    collection_alerts: List[AlertResponse]
    recent_analyses: List[AnalysisRecordSummary]
    distribution: dict
