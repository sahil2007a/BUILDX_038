import os
import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Float,
    Integer,
    String,
    Text,
    create_engine,
)
from sqlalchemy.orm import declarative_base, sessionmaker

# Database URL from env or default SQLite for zero-friction local development
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./rastarakshak.db")

connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


class ReportModel(Base):
    __tablename__ = "reports"

    id = Column(String, primary_key=True, default=lambda: f"rpt_{uuid.uuid4().hex[:8]}")
    category = Column(String, nullable=False, default="pothole")
    photo_url = Column(Text, nullable=False)
    bbox = Column(String, nullable=True)  # JSON stringified [x, y, w, h]
    confidence = Column(Float, nullable=True)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    description = Column(Text, nullable=True)
    severity_score = Column(Integer, nullable=False, default=3)
    status = Column(String, nullable=False, default="reported")
    assigned_agency_id = Column(String, nullable=True)
    assigned_department = Column(String, nullable=True, default="NMC Road Maintenance")
    ward = Column(String, nullable=True, default="Nagpur Central / Dharampeth")
    corroborating_count = Column(Integer, default=1)
    sla_deadline = Column(DateTime, nullable=True)
    closure_photo_url = Column(Text, nullable=True)
    reporter_id = Column(String, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))


class AgencyModel(Base):
    __tablename__ = "agencies"

    id = Column(String, primary_key=True, default=lambda: f"agn_{uuid.uuid4().hex[:6]}")
    name = Column(String, nullable=False)
    asset_types = Column(String, nullable=False)  # comma separated
    ward_coverage = Column(String, nullable=False)


class WorksLedgerModel(Base):
    __tablename__ = "works_ledger"

    id = Column(String, primary_key=True, default=lambda: f"wl_{uuid.uuid4().hex[:6]}")
    road_segment_id = Column(String, nullable=False)
    agency_id = Column(String, nullable=False)
    agency_name = Column(String, nullable=True)
    road_segment_name = Column(String, nullable=True)
    start_date = Column(String, nullable=False)
    end_date = Column(String, nullable=False)
    purpose = Column(Text, nullable=True)
    conflict_warning = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


def init_db():
    Base.metadata.create_all(bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
