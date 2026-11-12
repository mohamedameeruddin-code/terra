from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.database import Base


def utcnow():
    return datetime.now(timezone.utc)


class AnalysisRecord(Base):
    __tablename__ = "analysis_records"

    id = Column(Integer, primary_key=True, index=True)
    image_name = Column(String(255), nullable=False)
    image_path = Column(String(512), nullable=False)
    result_image_path = Column(String(512), nullable=True)
    fill_percentage = Column(Float, nullable=False)
    fill_status = Column(String(50), nullable=False)  # Empty, Low, Medium, High, Critical
    confidence_score = Column(Float, default=85.0)
    usable_bin_height = Column(Float, nullable=True)
    detected_waste_height = Column(Float, nullable=True)
    recommendation = Column(String(500), nullable=True)
    roi_coordinates = Column(Text, nullable=True)  # JSON representation of ROI
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utcnow, index=True)


class Bin(Base):
    __tablename__ = "bins"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    location = Column(String(150), nullable=False)
    depth_cm = Column(Float, default=100.0)
    dead_zone_cm = Column(Float, default=20.0)
    warn_pct = Column(Float, default=70.0)
    critical_pct = Column(Float, default=90.0)
    interval_min = Column(Integer, default=5)
    api_key = Column(String(64), unique=True, index=True, nullable=False)
    roi_coordinates = Column(Text, nullable=True)
    empty_reference = Column(Float, nullable=True)
    full_reference = Column(Float, nullable=True)
    created_at = Column(DateTime, default=utcnow)

    readings = relationship("Reading", back_populates="bin", cascade="all, delete-orphan", order_by="desc(Reading.ts)")
    collections = relationship("Collection", back_populates="bin", cascade="all, delete-orphan")
    alerts = relationship("Alert", back_populates="bin", cascade="all, delete-orphan")


class Reading(Base):
    __tablename__ = "readings"

    id = Column(Integer, primary_key=True, index=True)
    bin_id = Column(Integer, ForeignKey("bins.id", ondelete="CASCADE"), nullable=False, index=True)
    distance_cm = Column(Float, nullable=False)
    smoothed_distance_cm = Column(Float, nullable=True)
    fill_pct = Column(Float, nullable=False)
    battery_pct = Column(Float, default=100.0)
    ts = Column(DateTime, default=utcnow, index=True)

    bin = relationship("Bin", back_populates="readings")


class Collection(Base):
    __tablename__ = "collections"

    id = Column(Integer, primary_key=True, index=True)
    bin_id = Column(Integer, ForeignKey("bins.id", ondelete="CASCADE"), nullable=False, index=True)
    emptied_at = Column(DateTime, default=utcnow)
    emptied_by = Column(String(100), default="Staff Operator")
    fill_before = Column(Float, nullable=False)

    bin = relationship("Bin", back_populates="collections")


class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)
    bin_id = Column(Integer, ForeignKey("bins.id", ondelete="CASCADE"), nullable=False, index=True)
    type = Column(String(20), nullable=False)  # WARN, CRITICAL, OFFLINE
    message = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=utcnow, index=True)
    acknowledged_at = Column(DateTime, nullable=True, index=True)

    bin = relationship("Bin", back_populates="alerts")

