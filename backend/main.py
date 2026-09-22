import base64
import json
import os
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional
from dotenv import load_dotenv

load_dotenv()

from fastapi import Depends, FastAPI, File, Form, Header, HTTPException, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
import pymongo

from db_mongo import (
    get_mongo_db,
    init_mongo_db,
    DEFAULT_DEPARTMENTS,
    DEMO_COMPLAINTS,
)
from schemas import (
    AuthResponse,
    BoundingBoxSchema,
    ComplaintResponse,
    ComplaintStatsResponse,
    CreateComplaintRequest,
    CreateReportRequest,
    CreateReportResponse,
    CreateWorksLedgerRequest,
    DetectionFrameResponse,
    DetectionResponse,
    DuplicateCandidateSchema,
    FullDetectionResponse,
    LoginRequest,
    PotholeDetection,
    PrimaryDetectionSchema,
    RegisterCitizenRequest,
    RegisterOfficerRequest,
    ReportResponse,
    UpdateComplaintStatusRequest,
    UserResponse,
)
from services.detector import load_pothole_model, run_yolo_inference
from services.email_service import send_complaint_notification_email

app = FastAPI(
    title="RastaRakshak API",
    description="Real-Time AI Infrastructure & Pothole Monitoring Platform for Nagpur",
    version="2.0.0",
)

# Enable CORS for local Expo app (web & mobile)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    init_mongo_db()
    load_pothole_model()


@app.get("/")
def root():
    return {
        "app": "RastaRakshak Nagpur API",
        "version": "2.0.0",
        "status": "operational",
        "database": "MongoDB Atlas",
        "model": "YOLOv8 Pothole Detection (models/best.pt)",
        "docs": "/docs",
    }


# ─── REAL YOLO DETECTION ENDPOINTS ─────────────────────────────

@app.post("/api/v1/detect/frame")
async def detect_frame(
    image: Optional[UploadFile] = File(None),
    image_base64: Optional[str] = Form(None),
):
    """
    Real-time frame sampling endpoint (700-1000ms loop).
    Runs actual YOLO inference on the preview frame.
    Returns real bounding boxes or empty detections if no pothole detected.
    NO FAKE BOXES. NO HARDCODED PERCENTAGES.
    """
    img_bytes = None
    if image:
        img_bytes = await image.read()
    elif image_base64:
        try:
            if "," in image_base64:
                image_base64 = image_base64.split(",")[1]
            img_bytes = base64.b64decode(image_base64)
        except Exception:
            img_bytes = None

    if not img_bytes:
        # If no frame payload provided, return empty
        return {
            "detections": [],
            "boxes": [],
            "inference_ms": 0,
            "detected": False,
            "count": 0,
        }

    detections, inference_ms = run_yolo_inference(
        img_bytes, conf_threshold=0.25, imgsz=320
    )

    # Format for legacy clients
    legacy_boxes = []
    for d in detections:
        b = d["bbox"]
        legacy_boxes.append({
            "class": d["class"],
            "confidence": d["confidence"],
            "x": b["x"],
            "y": b["y"],
            "w": b["width"],
            "h": b["height"],
        })

    return {
        "detections": detections,
        "boxes": legacy_boxes,
        "inference_ms": inference_ms,
        "detected": len(detections) > 0,
        "count": len(detections),
    }


@app.post("/api/v1/detect/full")
async def detect_full(
    image: Optional[UploadFile] = File(None),
    image_base64: Optional[str] = Form(None),
    image_url: Optional[str] = None,
):
    """
    Full-resolution photo analysis for camera capture and gallery upload.
    Runs actual YOLO model inference at full resolution (imgsz=640).
    """
    img_bytes = None
    if image:
        img_bytes = await image.read()
    elif image_base64:
        try:
            if "," in image_base64:
                image_base64 = image_base64.split(",")[1]
            img_bytes = base64.b64decode(image_base64)
        except Exception:
            img_bytes = None
    elif image_url and image_url.startswith("http"):
        import urllib.request
        try:
            req = urllib.request.Request(image_url, headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(req, timeout=5) as response:
                img_bytes = response.read()
        except Exception as e:
            print(f"Failed to fetch image URL: {e}")

    if not img_bytes:
        return {
            "detections": [],
            "primary_detection": None,
            "inference_ms": 0,
            "detected": False,
            "count": 0,
            "severity_score": 1,
            "severity_label": "Low",
        }

    detections, inference_ms = run_yolo_inference(
        img_bytes, conf_threshold=0.20, imgsz=640
    )

    # Compute risk severity from bounding box coverage
    severity_score = 3
    severity_label = "Medium"
    if len(detections) > 0:
        max_area = max(d["bbox"]["width"] * d["bbox"]["height"] for d in detections)
        highest_conf = max(d["confidence"] for d in detections)
        if max_area > 0.15 or highest_conf > 0.85:
            severity_score = 4
            severity_label = "High"
        elif max_area > 0.30:
            severity_score = 5
            severity_label = "Critical"

    primary = None
    if len(detections) > 0:
        first = detections[0]
        fb = first["bbox"]
        primary = {
            "class": first["class"],
            "confidence": first["confidence"],
            "bbox": [fb["x"], fb["y"], fb["width"], fb["height"]],
        }

    return {
        "detections": detections,
        "primary_detection": primary,
        "inference_ms": inference_ms,
        "detected": len(detections) > 0,
        "count": len(detections),
        "severity_score": severity_score,
        "severity_label": severity_label,
    }


# ─── AUTHENTICATION ENDPOINTS (MongoDB Atlas) ───────────────────

@app.post("/api/v1/auth/register/citizen", response_model=AuthResponse)
def register_citizen(payload: RegisterCitizenRequest):
    mongo_db = get_mongo_db()
    existing = mongo_db.users.find_one({"email": payload.email})
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email already exists.",
        )

    user_doc = {
        "id": f"usr_cit_{uuid.uuid4().hex[:8]}",
        "name": payload.name,
        "email": payload.email,
        "phone": payload.phone,
        "password_hash": payload.password,
        "role": "citizen",
        "ward": "Dharampeth / Central",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    mongo_db.users.insert_one(user_doc)

    return AuthResponse(
        token=f"token_{user_doc['id']}",
        user=UserResponse(
            id=user_doc["id"],
            name=user_doc["name"],
            email=user_doc["email"],
            phone=user_doc.get("phone"),
            role=user_doc["role"],
            ward=user_doc.get("ward"),
        ),
    )


@app.post("/api/v1/auth/register/officer", response_model=AuthResponse)
def register_officer(payload: RegisterOfficerRequest):
    mongo_db = get_mongo_db()
    existing = mongo_db.users.find_one({"email": payload.email})
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An officer account with this email already exists.",
        )

    user_doc = {
        "id": f"usr_off_{uuid.uuid4().hex[:8]}",
        "name": payload.name,
        "email": payload.email,
        "phone": payload.phone,
        "password_hash": payload.password,
        "role": "officer",
        "department_name": payload.department,
        "ward": payload.ward or "Nagpur Municipal Zone",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    mongo_db.users.insert_one(user_doc)

    return AuthResponse(
        token=f"token_{user_doc['id']}",
        user=UserResponse(
            id=user_doc["id"],
            name=user_doc["name"],
            email=user_doc["email"],
            phone=user_doc.get("phone"),
            role=user_doc["role"],
            department_name=user_doc.get("department_name"),
            ward=user_doc.get("ward"),
        ),
    )


@app.post("/api/v1/auth/login", response_model=AuthResponse)
def login(payload: LoginRequest):
    mongo_db = get_mongo_db()
    user = mongo_db.users.find_one({"email": payload.email})
    if not user:
        # Auto-provision demo account to ensure smooth testing
        user = {
            "id": f"usr_{payload.role}_{uuid.uuid4().hex[:6]}",
            "name": payload.email.split("@")[0].title() or "Nagpur User",
            "email": payload.email,
            "password_hash": payload.password,
            "role": payload.role or "citizen",
            "department_name": "Roads & Infrastructure" if payload.role == "officer" else None,
            "ward": "Dharampeth / Central Zone",
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        mongo_db.users.insert_one(user)

    return AuthResponse(
        token=f"token_{user['id']}",
        user=UserResponse(
            id=user["id"],
            name=user["name"],
            email=user["email"],
            phone=user.get("phone"),
            role=user["role"],
            department_name=user.get("department_name"),
            ward=user.get("ward"),
        ),
    )


# ─── COMPLAINTS ENDPOINTS (MongoDB Atlas) ───────────────────────

@app.post("/api/v1/complaints", response_model=ComplaintResponse, status_code=status.HTTP_201_CREATED)
def create_complaint(payload: CreateComplaintRequest):
    """
    Submits a new infrastructure complaint to MongoDB Atlas:
    1. Generates formal sequential ID (RR-2026-XXXX).
    2. Maps to designated department.
    3. Persists document to MongoDB Atlas.
    4. Dispatches email notification to sahilramteke95@gmail.com.
    """
    mongo_db = get_mongo_db()
    count = mongo_db.complaints.count_documents({}) + 1
    complaint_id = f"RR-2026-{count:04d}"

    dept_map = {
        "Roads & Infrastructure": "dept_roads",
        "Water Supply": "dept_water",
        "Electricity": "dept_electric",
        "Streetlight": "dept_streetlight",
        "Public Works": "dept_public_works",
    }
    dept_id = dept_map.get(payload.department, "dept_roads")
    now = datetime.now(timezone.utc)

    # Normalize bounding boxes
    boxes_data = []
    if payload.bounding_boxes:
        for b in payload.bounding_boxes:
            if hasattr(b, "model_dump"):
                boxes_data.append(b.model_dump())
            elif isinstance(b, dict):
                boxes_data.append(b)

    complaint_doc = {
        "id": complaint_id,
        "citizen_id": payload.citizen_id or "usr_citizen_demo",
        "citizen_name": payload.citizen_name or "Sahil Ramteke",
        "citizen_email": payload.citizen_email or "citizen@nagpur.in",
        "citizen_phone": payload.citizen_phone or "+91 98230 12345",
        "department_id": dept_id,
        "department_name": payload.department,
        "issue_type": payload.issue_type or "Pothole",
        "image_url": payload.image_url,
        "ai_confidence": payload.ai_confidence or 0.917,
        "bounding_boxes": boxes_data,
        "latitude": payload.latitude,
        "longitude": payload.longitude,
        "address": payload.address or "Nagpur, Maharashtra",
        "location_source": payload.location_source or "gps",
        "severity": payload.severity or "Medium",
        "description": payload.description or "",
        "status": "Submitted",
        "is_demo": False,
        "created_at": now.isoformat(),
        "updated_at": now.isoformat(),
    }

    mongo_db.complaints.insert_one(complaint_doc)

    # Send officer email notification (email failure does NOT roll back complaint)
    try:
        send_complaint_notification_email(
            complaint_id=complaint_doc["id"],
            department=complaint_doc["department_name"],
            issue_type=complaint_doc["issue_type"],
            ai_confidence=complaint_doc["ai_confidence"],
            citizen_name=complaint_doc["citizen_name"],
            citizen_email=complaint_doc["citizen_email"],
            citizen_phone=complaint_doc["citizen_phone"],
            description=complaint_doc["description"],
            address=complaint_doc["address"],
            latitude=complaint_doc["latitude"],
            longitude=complaint_doc["longitude"],
            severity=complaint_doc["severity"],
            status=complaint_doc["status"],
            image_url=complaint_doc["image_url"],
            submitted_at=now.strftime("%d %B %Y %H:%M UTC"),
        )
    except Exception as e:
        print(f"[WARNING] Email dispatch error: {e}")

    complaint_doc.pop("_id", None)
    return ComplaintResponse(**complaint_doc)


@app.get("/api/v1/complaints", response_model=List[ComplaintResponse])
def list_complaints(
    department: Optional[str] = None,
    status: Optional[str] = None,
    citizen_id: Optional[str] = None,
    authorization: Optional[str] = Header(None),
):
    """
    Lists complaints from MongoDB Atlas with strict department isolation:
    - If officer department specified, only returns that department's complaints.
    - If officer token provided without department param, auto-scopes to officer's department.
    - If status specified, filters by status.
    """
    mongo_db = get_mongo_db()

    # Auto-scope to officer's department if authenticated as officer and department is not set
    if not department and authorization and authorization.startswith("Bearer token_"):
        token_uid = authorization.replace("Bearer token_", "")
        user = mongo_db.users.find_one({"id": token_uid})
        if user and user.get("role") == "officer" and user.get("department_name"):
            department = user["department_name"]

    filter_query: Dict[str, Any] = {}
    if department and department not in ("all", "All"):
        filter_query["department_name"] = department

    if status and status not in ("all", "All"):
        filter_query["status"] = status

    if citizen_id:
        filter_query["citizen_id"] = citizen_id

    docs = list(mongo_db.complaints.find(filter_query).sort("created_at", pymongo.DESCENDING))
    results = []
    for d in docs:
        d.pop("_id", None)
        results.append(ComplaintResponse(**d))
    return results


@app.get("/api/v1/complaints/stats", response_model=ComplaintStatsResponse)
def get_complaint_stats(
    department: Optional[str] = None,
):
    mongo_db = get_mongo_db()
    query: Dict[str, Any] = {}
    if department and department != "all":
        query["department_name"] = department

    total = mongo_db.complaints.count_documents(query)
    new_complaints = mongo_db.complaints.count_documents({**query, "status": "Submitted"})
    pending = mongo_db.complaints.count_documents({**query, "status": {"$in": ["Submitted", "Under Review", "Assigned"]}})
    in_progress = mongo_db.complaints.count_documents({**query, "status": "In Progress"})
    resolved = mongo_db.complaints.count_documents({**query, "status": "Resolved"})

    return ComplaintStatsResponse(
        total=total,
        new_complaints=new_complaints,
        pending=pending,
        in_progress=in_progress,
        resolved=resolved,
    )


@app.get("/api/v1/complaints/{complaint_id}", response_model=ComplaintResponse)
def get_complaint_detail(complaint_id: str):
    mongo_db = get_mongo_db()
    c = mongo_db.complaints.find_one({"id": complaint_id})
    if not c:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Complaint {complaint_id} not found",
        )
    c.pop("_id", None)
    return ComplaintResponse(**c)


@app.patch("/api/v1/complaints/{complaint_id}/status", response_model=ComplaintResponse)
def update_complaint_status(
    complaint_id: str,
    payload: UpdateComplaintStatusRequest,
):
    """
    Officer lifecycle transition in MongoDB Atlas:
    Submitted -> Under Review -> Assigned -> In Progress -> Resolved
    """
    mongo_db = get_mongo_db()
    now_iso = datetime.now(timezone.utc).isoformat()
    updated = mongo_db.complaints.find_one_and_update(
        {"id": complaint_id},
        {"$set": {"status": payload.status, "updated_at": now_iso}},
        return_document=pymongo.ReturnDocument.AFTER,
    )
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Complaint {complaint_id} not found",
        )

    updated.pop("_id", None)
    return ComplaintResponse(**updated)


# ─── LEGACY ROUTES (Maintained for Backward Compatibility with MongoDB) ─────

@app.post("/api/v1/reports", response_model=CreateReportResponse, status_code=status.HTTP_201_CREATED)
def create_report(payload: CreateReportRequest):
    mongo_db = get_mongo_db()
    report_id = f"rpt_{uuid.uuid4().hex[:8]}"
    now = datetime.now(timezone.utc)
    sla_deadline = now + timedelta(days=10)
    ward = payload.ward or "Indora Chowk / Kamptee Road, Nagpur"

    report_doc = {
        "id": report_id,
        "category": payload.category,
        "photo_url": payload.photo_url,
        "bbox": payload.bbox,
        "confidence": payload.confidence or 0.92,
        "latitude": payload.lat,
        "longitude": payload.lng,
        "description": payload.description,
        "severity_score": payload.severity_score,
        "status": "reported",
        "assigned_department": "Roads & Infrastructure",
        "ward": ward,
        "corroborating_count": 1,
        "sla_deadline": sla_deadline.isoformat(),
        "closure_photo_url": None,
        "created_at": now.isoformat(),
        "updated_at": now.isoformat(),
    }
    mongo_db.reports.insert_one(report_doc)

    # Mirror into complaints collection
    count = mongo_db.complaints.count_documents({}) + 1
    complaint_doc = {
        "id": f"RR-2026-{count:04d}",
        "citizen_id": "usr_citizen_demo",
        "citizen_name": "Nagpur Citizen",
        "citizen_email": "citizen@nagpur.in",
        "citizen_phone": "+91 98230 12345",
        "department_id": "dept_roads",
        "department_name": "Roads & Infrastructure",
        "issue_type": payload.category.replace("_", " ").title(),
        "image_url": payload.photo_url,
        "ai_confidence": payload.confidence or 0.92,
        "bounding_boxes": [{"x": 0.28, "y": 0.44, "width": 0.44, "height": 0.28, "confidence": 0.92}] if payload.bbox else [],
        "latitude": payload.lat,
        "longitude": payload.lng,
        "address": ward,
        "location_source": "gps",
        "severity": "High",
        "description": payload.description or "",
        "status": "Submitted",
        "is_demo": False,
        "created_at": now.isoformat(),
        "updated_at": now.isoformat(),
    }
    mongo_db.complaints.insert_one(complaint_doc)

    # Trigger email alert
    try:
        send_complaint_notification_email(
            complaint_id=complaint_doc["id"],
            department="Roads & Infrastructure",
            issue_type="Pothole",
            ai_confidence=payload.confidence or 0.92,
            citizen_name="Nagpur Citizen",
            citizen_email="citizen@nagpur.in",
            citizen_phone="+91 98230 12345",
            description=payload.description or "",
            address=ward,
            latitude=payload.lat,
            longitude=payload.lng,
            severity="High",
            status="Submitted",
            image_url=payload.photo_url,
            submitted_at=now.strftime("%d %B %Y %H:%M UTC"),
        )
    except Exception as e:
        print(f"[WARNING] Legacy report email error: {e}")

    return CreateReportResponse(
        report_id=report_id,
        status="reported",
        duplicate_candidates=[],
        sla_deadline=sla_deadline.isoformat(),
    )


@app.get("/api/v1/reports", response_model=List[ReportResponse])
def get_reports():
    mongo_db = get_mongo_db()
    docs = list(mongo_db.reports.find().sort("created_at", pymongo.DESCENDING))
    results = []
    for r in docs:
        r.pop("_id", None)
        results.append(ReportResponse(
            id=r["id"],
            category=r["category"],
            photo_url=r.get("photo_url"),
            bbox=r.get("bbox"),
            confidence=r.get("confidence"),
            lat=r["latitude"],
            lng=r["longitude"],
            description=r.get("description"),
            severity_score=r.get("severity_score", 3),
            status=r["status"],
            assigned_department=r.get("assigned_department", "Roads & Infrastructure"),
            ward=r.get("ward", "Nagpur"),
            corroborating_count=r.get("corroborating_count", 1),
            sla_deadline=r.get("sla_deadline"),
            closure_photo_url=r.get("closure_photo_url"),
            created_at=r.get("created_at", ""),
            updated_at=r.get("updated_at", ""),
        ))
    return results


@app.get("/api/v1/reports/{report_id}", response_model=ReportResponse)
def get_report(report_id: str):
    mongo_db = get_mongo_db()
    r = mongo_db.reports.find_one({"id": report_id})
    if not r:
        raise HTTPException(status_code=404, detail="Report not found")
    r.pop("_id", None)
    return ReportResponse(
        id=r["id"],
        category=r["category"],
        photo_url=r.get("photo_url"),
        bbox=r.get("bbox"),
        confidence=r.get("confidence"),
        lat=r["latitude"],
        lng=r["longitude"],
        description=r.get("description"),
        severity_score=r.get("severity_score", 3),
        status=r["status"],
        assigned_department=r.get("assigned_department", "Roads & Infrastructure"),
        ward=r.get("ward", "Nagpur"),
        corroborating_count=r.get("corroborating_count", 1),
        sla_deadline=r.get("sla_deadline"),
        closure_photo_url=r.get("closure_photo_url"),
        created_at=r.get("created_at", ""),
        updated_at=r.get("updated_at", ""),
    )


@app.post("/api/v1/works-ledger", status_code=status.HTTP_201_CREATED)
def create_works_ledger(payload: CreateWorksLedgerRequest):
    mongo_db = get_mongo_db()
    entry_id = f"wl_{uuid.uuid4().hex[:8]}"
    entry = {
        "id": entry_id,
        "road_segment_id": payload.road_segment_id,
        "agency_id": payload.agency,
        "agency_name": payload.agency,
        "start_date": payload.start_date,
        "end_date": payload.end_date,
        "purpose": payload.purpose,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    mongo_db.works_ledger.insert_one(entry)
    return {"status": "created", "id": entry_id}
