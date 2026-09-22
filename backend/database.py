import json
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

# Database URL from env or default SQLite for local development
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./rastarakshak.db")

connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


class UserModel(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=lambda: f"usr_{uuid.uuid4().hex[:8]}")
    name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False)
    phone = Column(String, nullable=True)
    password_hash = Column(String, nullable=False)
    role = Column(String, nullable=False, default="citizen")  # "citizen" or "officer"
    department_id = Column(String, nullable=True)
    department_name = Column(String, nullable=True)
    ward = Column(String, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class DepartmentModel(Base):
    __tablename__ = "departments"

    id = Column(String, primary_key=True)
    name = Column(String, nullable=False, unique=True)
    description = Column(Text, nullable=True)


class ComplaintModel(Base):
    __tablename__ = "complaints"

    id = Column(String, primary_key=True)  # e.g. RR-2026-0001
    citizen_id = Column(String, nullable=True)
    citizen_name = Column(String, nullable=True, default="Nagpur Citizen")
    citizen_email = Column(String, nullable=True, default="citizen@example.com")
    citizen_phone = Column(String, nullable=True, default="+91 98230 12345")
    department_id = Column(String, nullable=False)
    department_name = Column(String, nullable=False, default="Roads & Infrastructure")
    issue_type = Column(String, nullable=False, default="Pothole")
    image_url = Column(Text, nullable=False)
    ai_confidence = Column(Float, nullable=True)
    bounding_boxes = Column(Text, nullable=True)  # JSON array of [{ x, y, width, height, confidence }]
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    address = Column(String, nullable=False)
    location_source = Column(String, nullable=False, default="gps")  # "gps" or "manual"
    severity = Column(String, nullable=False, default="High")  # "Low", "Medium", "High", "Critical"
    description = Column(Text, nullable=True)
    status = Column(String, nullable=False, default="Submitted")  # "Submitted", "Under Review", "Assigned", "In Progress", "Resolved"
    is_demo = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))


# Legacy tables for backward compatibility
class ReportModel(Base):
    __tablename__ = "reports"

    id = Column(String, primary_key=True, default=lambda: f"rpt_{uuid.uuid4().hex[:8]}")
    category = Column(String, nullable=False, default="pothole")
    photo_url = Column(Text, nullable=False)
    bbox = Column(String, nullable=True)
    confidence = Column(Float, nullable=True)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    description = Column(Text, nullable=True)
    severity_score = Column(Integer, nullable=False, default=3)
    status = Column(String, nullable=False, default="reported")
    assigned_agency_id = Column(String, nullable=True)
    assigned_department = Column(String, nullable=True, default="Roads & Infrastructure")
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
    asset_types = Column(String, nullable=False)
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


DEFAULT_DEPARTMENTS = [
    {"id": "dept_roads", "name": "Roads & Infrastructure", "description": "Nagpur Municipal Corporation Road Maintenance & Pothole Repair"},
    {"id": "dept_water", "name": "Water Supply", "description": "Orange City Water (OCW) & NMC Water Works Department"},
    {"id": "dept_electric", "name": "Electricity", "description": "MSEDCL Power Distribution & Underground Cabling"},
    {"id": "dept_streetlight", "name": "Streetlight", "description": "NMC Electrical & Public Street Lighting Department"},
    {"id": "dept_public_works", "name": "Public Works", "description": "Public Works Department (PWD) Infrastructure & Bridges"},
]


DEMO_COMPLAINTS = [
    {
        "id": "RR-2026-0001",
        "citizen_id": "usr_demo_1",
        "citizen_name": "Ramesh Deshmukh",
        "citizen_email": "ramesh.deshmukh@nagpur.in",
        "citizen_phone": "+91 98230 11223",
        "department_id": "dept_roads",
        "department_name": "Roads & Infrastructure",
        "issue_type": "Pothole",
        "image_url": "https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=800&q=80",
        "ai_confidence": 0.917,
        "bounding_boxes": json.dumps([{"x": 0.28, "y": 0.44, "width": 0.44, "height": 0.28, "confidence": 0.917}]),
        "latitude": 21.1730,
        "longitude": 79.1025,
        "address": "Kamptee Road, Indora Chowk, Nagpur",
        "location_source": "gps",
        "severity": "High",
        "description": "Deep crater on main arterial corridor. Two-wheelers losing balance during evening traffic.",
        "status": "Submitted",
        "is_demo": True,
    },
    {
        "id": "RR-2026-0002",
        "citizen_id": "usr_demo_2",
        "citizen_name": "Priya Sharma",
        "citizen_email": "priya.sharma@nagpur.in",
        "citizen_phone": "+91 94221 44556",
        "department_id": "dept_roads",
        "department_name": "Roads & Infrastructure",
        "issue_type": "Pothole",
        "image_url": "https://images.unsplash.com/photo-1578916171728-46686eac8d58?auto=format&fit=crop&w=800&q=80",
        "ai_confidence": 0.884,
        "bounding_boxes": json.dumps([{"x": 0.32, "y": 0.48, "width": 0.38, "height": 0.26, "confidence": 0.884}]),
        "latitude": 21.1624,
        "longitude": 79.0558,
        "address": "Katol Road / Gittikhadan (Near School Gate), Nagpur",
        "location_source": "manual",
        "severity": "Critical",
        "description": "[DEMO SCENARIO 2: School Gate Risk] Dangerous pothole right in front of school entrance. High risk of student van skidding.",
        "status": "In Progress",
        "is_demo": True,
    },
    {
        "id": "RR-2026-0003",
        "citizen_id": "usr_demo_3",
        "citizen_name": "Anil Kulkarni",
        "citizen_email": "anil.kulkarni@nagpur.in",
        "citizen_phone": "+91 98229 66778",
        "department_id": "dept_roads",
        "department_name": "Roads & Infrastructure",
        "issue_type": "Road Damage",
        "image_url": "https://images.unsplash.com/photo-1541888946425-d0fbb186c5f7?auto=format&fit=crop&w=800&q=80",
        "ai_confidence": 0.852,
        "bounding_boxes": json.dumps([{"x": 0.25, "y": 0.40, "width": 0.50, "height": 0.32, "confidence": 0.852}]),
        "latitude": 21.1352,
        "longitude": 79.0621,
        "address": "West High Court Road, Dharampeth, Nagpur",
        "location_source": "gps",
        "severity": "High",
        "description": "[DEMO SCENARIO 3: Resurfaced Road Conflict] Road resurfaced 40 days ago; now experiencing trench damage from uncoordinated digging.",
        "status": "Under Review",
        "is_demo": True,
    },
    {
        "id": "RR-2026-0004",
        "citizen_id": "usr_demo_4",
        "citizen_name": "Sunita Patil",
        "citizen_email": "sunita.patil@nagpur.in",
        "citizen_phone": "+91 98901 22334",
        "department_id": "dept_roads",
        "department_name": "Roads & Infrastructure",
        "issue_type": "Pothole",
        "image_url": "https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=800&q=80",
        "ai_confidence": 0.931,
        "bounding_boxes": json.dumps([{"x": 0.30, "y": 0.45, "width": 0.42, "height": 0.27, "confidence": 0.931}]),
        "latitude": 21.1065,
        "longitude": 79.0812,
        "address": "Manish Nagar T-Point, Nagpur",
        "location_source": "gps",
        "severity": "Medium",
        "description": "Pothole patched and resurfaced by NMC road repair team.",
        "status": "Resolved",
        "is_demo": True,
    },
    {
        "id": "RR-2026-0005",
        "citizen_id": "usr_demo_5",
        "citizen_name": "Vikas Raut",
        "citizen_email": "vikas.raut@nagpur.in",
        "citizen_phone": "+91 97654 33221",
        "department_id": "dept_roads",
        "department_name": "Roads & Infrastructure",
        "issue_type": "Pothole",
        "image_url": "https://images.unsplash.com/photo-1578916171728-46686eac8d58?auto=format&fit=crop&w=800&q=80",
        "ai_confidence": 0.895,
        "bounding_boxes": json.dumps([{"x": 0.35, "y": 0.42, "width": 0.35, "height": 0.28, "confidence": 0.895}]),
        "latitude": 21.1215,
        "longitude": 79.0732,
        "address": "Laxmi Nagar Square, Nagpur",
        "location_source": "manual",
        "severity": "High",
        "description": "[DEMO SCENARIO 1: Repeated Laxmi Nagar Complaint] Pothole reported multiple times across helpline and social media. Multiple reports detected in 30m radius.",
        "status": "Submitted",
        "is_demo": True,
    },
    {
        "id": "RR-2026-0006",
        "citizen_id": "usr_demo_6",
        "citizen_name": "Mahesh Bhende",
        "citizen_email": "mahesh.bhende@nagpur.in",
        "citizen_phone": "+91 98222 77889",
        "department_id": "dept_streetlight",
        "department_name": "Streetlight",
        "issue_type": "Streetlight Fault",
        "image_url": "https://images.unsplash.com/photo-1509114397022-ed747cca3f65?auto=format&fit=crop&w=800&q=80",
        "ai_confidence": 0.942,
        "bounding_boxes": json.dumps([{"x": 0.40, "y": 0.20, "width": 0.20, "height": 0.40, "confidence": 0.942}]),
        "latitude": 21.1500,
        "longitude": 79.0100,
        "address": "Wadi Bus Stop Main Junction, Nagpur",
        "location_source": "gps",
        "severity": "Medium",
        "description": "[DEMO SCENARIO 4: Wadi Streetlight Fault] Pole #WD-14 non-functional for 12 days near bus shelter.",
        "status": "Submitted",
        "is_demo": True,
    },
]


def init_db():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    # Seed default departments if missing
    for d in DEFAULT_DEPARTMENTS:
        existing = db.query(DepartmentModel).filter(DepartmentModel.id == d["id"]).first()
        if not existing:
            db.add(DepartmentModel(id=d["id"], name=d["name"], description=d["description"]))

    # Seed default demo officers
    default_officers = [
        {"id": "usr_off_roads", "name": "Er. Vijay Gokhale", "email": "officer.roads@nagpur.gov.in", "phone": "+91 98230 99881", "department_id": "dept_roads", "department_name": "Roads & Infrastructure", "ward": "Zone 9 (Dharampeth / Central)"},
        {"id": "usr_off_water", "name": "Er. Rajesh Meshram", "email": "officer.water@nagpur.gov.in", "phone": "+91 98230 99882", "department_id": "dept_water", "department_name": "Water Supply", "ward": "Nagpur West Zone"},
        {"id": "usr_off_electric", "name": "Er. Sanjay Wankhede", "email": "officer.electric@nagpur.gov.in", "phone": "+91 98230 99883", "department_id": "dept_electric", "department_name": "Electricity", "ward": "Nagpur East Zone"},
        {"id": "usr_off_light", "name": "Er. Nitin Thakre", "email": "officer.light@nagpur.gov.in", "phone": "+91 98230 99884", "department_id": "dept_streetlight", "department_name": "Streetlight", "ward": "Nagpur Central & Wadi"},
        {"id": "usr_off_pwd", "name": "Er. Mohan Joshi", "email": "officer.pwd@nagpur.gov.in", "phone": "+91 98230 99885", "department_id": "dept_public_works", "department_name": "Public Works", "ward": "Nagpur Metropolitan"},
    ]
    for o in default_officers:
        existing = db.query(UserModel).filter(UserModel.id == o["id"]).first()
        if not existing:
            db.add(UserModel(
                id=o["id"],
                name=o["name"],
                email=o["email"],
                phone=o["phone"],
                password_hash="demo_password_hash",
                role="officer",
                department_id=o["department_id"],
                department_name=o["department_name"],
                ward=o["ward"]
            ))

    # Seed demo citizen
    demo_citizen = db.query(UserModel).filter(UserModel.id == "usr_citizen_demo").first()
    if not demo_citizen:
        db.add(UserModel(
            id="usr_citizen_demo",
            name="Sahil Ramteke",
            email="citizen@nagpur.in",
            phone="+91 98230 12345",
            password_hash="demo_password_hash",
            role="citizen",
            ward="Dharampeth"
        ))

    # Seed demo complaints if table is empty
    if db.query(ComplaintModel).count() == 0:
        for c in DEMO_COMPLAINTS:
            db.add(ComplaintModel(**c))

    db.commit()
    db.close()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
