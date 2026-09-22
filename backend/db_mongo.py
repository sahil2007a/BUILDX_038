import os
import certifi
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from dotenv import load_dotenv
import pymongo
from pymongo import MongoClient

# Load environment variables from .env
load_dotenv()

MONGO_URI = os.getenv("MONGO_URI", "")

DATABASE_NAME = os.getenv("MONGO_DB_NAME", "rastarakshak")

client: Optional[MongoClient] = None
db: Any = None


def get_mongo_db():
    global client, db
    if db is None:
        if not MONGO_URI:
            raise ValueError("MONGO_URI environment variable is not set. Please set it in backend/.env")
        try:
            client = MongoClient(
                MONGO_URI,
                tlsCAFile=certifi.where(),
                serverSelectionTimeoutMS=8000,
                connectTimeoutMS=8000,
            )
            db = client[DATABASE_NAME]
            # Ensure indexes
            db.users.create_index("email", unique=True)
            db.complaints.create_index("id", unique=True)
            db.complaints.create_index([("department_name", 1), ("status", 1)])
            db.complaints.create_index("citizen_id")
        except Exception as e:
            print(f"[MongoDB] Connection error: {e}")
            raise e
    return db


# ─── 5 MUNICIPAL DEPARTMENTS ────────────────────────────────────
DEFAULT_DEPARTMENTS = [
    {
        "id": "dept_roads",
        "name": "Roads & Infrastructure",
        "description": "Potholes, asphalt erosion, crater hazards, speed breaker repairs, and road resurfacing.",
    },
    {
        "id": "dept_water",
        "name": "Water Supply",
        "description": "Pipeline bursts, drinking water leakage, low pressure, water contamination, and valve maintenance.",
    },
    {
        "id": "dept_electric",
        "name": "Electricity",
        "description": "Exposed high-voltage cables, open distribution boxes, transformer sparks, and power fluctuations.",
    },
    {
        "id": "dept_streetlight",
        "name": "Streetlight",
        "description": "Broken streetlight poles, non-functional sodium/LED fixtures, dark pedestrian crossings, and timer faults.",
    },
    {
        "id": "dept_public_works",
        "name": "Public Works",
        "description": "Open manholes, missing storm drain covers, broken pavements, culvert damage, and divider cracks.",
    },
]

# ─── REALTIME NAGPUR DEMO COMPLAINTS ───────────────────────────
DEMO_COMPLAINTS = [
    {
        "id": "RR-2026-0001",
        "citizen_id": "usr_citizen_demo",
        "citizen_name": "Sahil Ramteke",
        "citizen_email": "citizen@nagpur.in",
        "citizen_phone": "+91 98230 12345",
        "department_id": "dept_roads",
        "department_name": "Roads & Infrastructure",
        "issue_type": "Severe Road Pothole",
        "image_url": "https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=800&q=80",
        "ai_confidence": 0.945,
        "bounding_boxes": [{"x": 0.22, "y": 0.38, "width": 0.54, "height": 0.36, "confidence": 0.945}],
        "latitude": 21.1458,
        "longitude": 79.0882,
        "address": "West High Court Road, Dharampeth, Nagpur",
        "location_source": "gps",
        "severity": "Critical",
        "description": "Deep water-filled crater right in front of busy market area. Two-wheelers frequently skidding.",
        "status": "In Progress",
        "is_demo": True,
        "created_at": datetime(2026, 6, 12, 10, 30, tzinfo=timezone.utc).isoformat(),
        "updated_at": datetime(2026, 6, 12, 14, 0, tzinfo=timezone.utc).isoformat(),
    },
    {
        "id": "RR-2026-0002",
        "citizen_id": "usr_cit_7812",
        "citizen_name": "Pooja Deshmukh",
        "citizen_email": "pooja.deshmukh@nagpur.in",
        "citizen_phone": "+91 98230 55443",
        "department_id": "dept_roads",
        "department_name": "Roads & Infrastructure",
        "issue_type": "Cluster Potholes",
        "image_url": "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=800&q=80",
        "ai_confidence": 0.912,
        "bounding_boxes": [{"x": 0.18, "y": 0.42, "width": 0.45, "height": 0.32, "confidence": 0.912}],
        "latitude": 21.1730,
        "longitude": 79.1025,
        "address": "Indora Chowk, Kamptee Road, Nagpur",
        "location_source": "gps",
        "severity": "High",
        "description": "Repeated heavy vehicle transit has caused multiple asphalt depressions near metro pillar #42.",
        "status": "Submitted",
        "is_demo": True,
        "created_at": datetime(2026, 6, 14, 9, 15, tzinfo=timezone.utc).isoformat(),
        "updated_at": datetime(2026, 6, 14, 9, 15, tzinfo=timezone.utc).isoformat(),
    },
    {
        "id": "RR-2026-0003",
        "citizen_id": "usr_cit_9921",
        "citizen_name": "Amit Agrawal",
        "citizen_email": "amit.agrawal@nagpur.in",
        "citizen_phone": "+91 98230 66778",
        "department_id": "dept_roads",
        "department_name": "Roads & Infrastructure",
        "issue_type": "Crater near School Gate",
        "image_url": "https://images.unsplash.com/photo-1578916171728-46686eac8d58?auto=format&fit=crop&w=800&q=80",
        "ai_confidence": 0.938,
        "bounding_boxes": [{"x": 0.28, "y": 0.35, "width": 0.48, "height": 0.40, "confidence": 0.938}],
        "latitude": 21.1620,
        "longitude": 79.0600,
        "address": "Katol Road Bypass, Gittikhadan, Nagpur",
        "location_source": "manual",
        "severity": "Critical",
        "description": "Dangerous pothole right at St. Joseph convent gate. School buses and rickshaws heavily affected.",
        "status": "Under Review",
        "is_demo": True,
        "created_at": datetime(2026, 6, 15, 11, 45, tzinfo=timezone.utc).isoformat(),
        "updated_at": datetime(2026, 6, 15, 12, 10, tzinfo=timezone.utc).isoformat(),
    },
    {
        "id": "RR-2026-0004",
        "citizen_id": "usr_cit_4412",
        "citizen_name": "Rohan Tiwari",
        "citizen_email": "rohan.tiwari@nagpur.in",
        "citizen_phone": "+91 98230 88990",
        "department_id": "dept_roads",
        "department_name": "Roads & Infrastructure",
        "issue_type": "Edge Erosion & Trench",
        "image_url": "https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=800&q=80",
        "ai_confidence": 0.884,
        "bounding_boxes": [{"x": 0.15, "y": 0.50, "width": 0.60, "height": 0.35, "confidence": 0.884}],
        "latitude": 21.0950,
        "longitude": 79.0780,
        "address": "Manish Nagar Railway Crossing Approach, Nagpur",
        "location_source": "gps",
        "severity": "High",
        "description": "Unpaved patch after cable trenching work left incomplete during monsoon showers.",
        "status": "Assigned",
        "is_demo": True,
        "created_at": datetime(2026, 6, 16, 8, 20, tzinfo=timezone.utc).isoformat(),
        "updated_at": datetime(2026, 6, 16, 9, 30, tzinfo=timezone.utc).isoformat(),
    },
    {
        "id": "RR-2026-0005",
        "citizen_id": "usr_cit_1109",
        "citizen_name": "Dr. Sunita Roy",
        "citizen_email": "sunita.roy@nagpur.in",
        "citizen_phone": "+91 98230 11223",
        "department_id": "dept_roads",
        "department_name": "Roads & Infrastructure",
        "issue_type": "Repaired Pothole",
        "image_url": "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=800&q=80",
        "ai_confidence": 0.950,
        "bounding_boxes": [{"x": 0.30, "y": 0.40, "width": 0.38, "height": 0.30, "confidence": 0.950}],
        "latitude": 21.1270,
        "longitude": 79.0660,
        "address": "Laxmi Nagar Square, Wardha Road Junction, Nagpur",
        "location_source": "gps",
        "severity": "Low",
        "description": "Resurfacing cold-mix completed by NMC Zone 9 road gang.",
        "status": "Resolved",
        "is_demo": True,
        "created_at": datetime(2026, 6, 8, 14, 0, tzinfo=timezone.utc).isoformat(),
        "updated_at": datetime(2026, 6, 11, 16, 45, tzinfo=timezone.utc).isoformat(),
    },
    {
        "id": "RR-2026-0006",
        "citizen_id": "usr_cit_5566",
        "citizen_name": "Mahesh Bhende",
        "citizen_email": "mahesh@nagpur.in",
        "citizen_phone": "+91 98230 33221",
        "department_id": "dept_streetlight",
        "department_name": "Streetlight",
        "issue_type": "Streetlight Fault",
        "image_url": "https://images.unsplash.com/photo-1509114397022-ed747cca3f65?auto=format&fit=crop&w=800&q=80",
        "ai_confidence": 0.942,
        "bounding_boxes": [{"x": 0.40, "y": 0.20, "width": 0.20, "height": 0.40, "confidence": 0.942}],
        "latitude": 21.1500,
        "longitude": 79.0100,
        "address": "Wadi Bus Stop Main Junction, Nagpur",
        "location_source": "gps",
        "severity": "Medium",
        "description": "Pole #WD-14 non-functional for 12 days near bus shelter.",
        "status": "Submitted",
        "is_demo": True,
        "created_at": datetime(2026, 6, 17, 19, 0, tzinfo=timezone.utc).isoformat(),
        "updated_at": datetime(2026, 6, 17, 19, 0, tzinfo=timezone.utc).isoformat(),
    },
]

# ─── SEED DATABASE ON STARTUP ───────────────────────────────────
def init_mongo_db():
    database = get_mongo_db()
    print("[MongoDB Atlas] Initializing & seeding collections...")

    # 1. Departments
    for d in DEFAULT_DEPARTMENTS:
        database.departments.update_one(
            {"id": d["id"]},
            {"$set": d},
            upsert=True,
        )

    # 2. Demo Officers
    default_officers = [
        {
            "id": "usr_off_roads",
            "name": "Er. Vijay Gokhale",
            "email": "officer.roads@nagpur.gov.in",
            "phone": "+91 98230 99881",
            "password_hash": "password123",
            "role": "officer",
            "department_id": "dept_roads",
            "department_name": "Roads & Infrastructure",
            "ward": "Zone 9 (Dharampeth / Central)",
        },
        {
            "id": "usr_off_water",
            "name": "Er. Rajesh Meshram",
            "email": "officer.water@nagpur.gov.in",
            "phone": "+91 98230 99882",
            "password_hash": "password123",
            "role": "officer",
            "department_id": "dept_water",
            "department_name": "Water Supply",
            "ward": "Nagpur West Zone",
        },
        {
            "id": "usr_off_electric",
            "name": "Er. Sanjay Wankhede",
            "email": "officer.electric@nagpur.gov.in",
            "phone": "+91 98230 99883",
            "password_hash": "password123",
            "role": "officer",
            "department_id": "dept_electric",
            "department_name": "Electricity",
            "ward": "Nagpur East Zone",
        },
        {
            "id": "usr_off_light",
            "name": "Er. Nitin Thakre",
            "email": "officer.light@nagpur.gov.in",
            "phone": "+91 98230 99884",
            "password_hash": "password123",
            "role": "officer",
            "department_id": "dept_streetlight",
            "department_name": "Streetlight",
            "ward": "Nagpur Central & Wadi",
        },
        {
            "id": "usr_off_pwd",
            "name": "Er. Mohan Joshi",
            "email": "officer.pwd@nagpur.gov.in",
            "phone": "+91 98230 99885",
            "password_hash": "password123",
            "role": "officer",
            "department_id": "dept_public_works",
            "department_name": "Public Works",
            "ward": "Nagpur Metropolitan",
        },
    ]
    for o in default_officers:
        database.users.update_one(
            {"email": o["email"]},
            {"$set": o},
            upsert=True,
        )

    # 3. Demo Citizen
    database.users.update_one(
        {"email": "citizen@nagpur.in"},
        {
            "$set": {
                "id": "usr_citizen_demo",
                "name": "Sahil Ramteke",
                "email": "citizen@nagpur.in",
                "phone": "+91 98230 12345",
                "password_hash": "password123",
                "role": "citizen",
                "ward": "Dharampeth / Central",
            }
        },
        upsert=True,
    )

    # 4. Demo Complaints (Upsert if not already present)
    for c in DEMO_COMPLAINTS:
        database.complaints.update_one(
            {"id": c["id"]},
            {"$set": c},
            upsert=True,
        )

    print("[MongoDB Atlas] [OK] Connected & Seeded: Departments, Officers, Citizen & Nagpur Demo Complaints ready!")
