from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


# ─── AUTH SCHEMAS ──────────────────────────────────────────────
class RegisterCitizenRequest(BaseModel):
    name: str
    email: str
    phone: Optional[str] = None
    password: str


class RegisterOfficerRequest(BaseModel):
    name: str
    email: str
    phone: Optional[str] = None
    password: str
    department: str
    ward: Optional[str] = None


class LoginRequest(BaseModel):
    email: str
    password: str
    role: Optional[str] = "citizen"  # "citizen" or "officer"


class UserResponse(BaseModel):
    id: str
    name: str
    email: str
    phone: Optional[str] = None
    role: str
    department_name: Optional[str] = None
    ward: Optional[str] = None


class AuthResponse(BaseModel):
    token: str
    user: UserResponse


# ─── REAL YOLO DETECTION SCHEMAS (Section 5 Spec) ───────────────
class BoundingBoxNormalized(BaseModel):
    x: float  # Top-left x [0, 1]
    y: float  # Top-left y [0, 1]
    width: float  # Width [0, 1]
    height: float  # Height [0, 1]


class PotholeDetection(BaseModel):
    class_: str = Field(alias="class", default="pothole")
    confidence: float
    bbox: BoundingBoxNormalized

    class Config:
        populate_by_name = True


class DetectionResponse(BaseModel):
    detections: List[PotholeDetection] = []
    inference_ms: int
    detected: bool
    count: int = 0


# Legacy BoundingBoxSchema for backward compatibility
class BoundingBoxSchema(BaseModel):
    class_: str = Field(alias="class")
    confidence: float
    x: float
    y: float
    w: float
    h: float

    class Config:
        populate_by_name = True


class DetectionFrameResponse(BaseModel):
    boxes: List[BoundingBoxSchema]
    inference_ms: int


class PrimaryDetectionSchema(BaseModel):
    class_: str = Field(alias="class")
    confidence: float
    bbox: List[float]

    class Config:
        populate_by_name = True


class FullDetectionResponse(BaseModel):
    primary_detection: Optional[PrimaryDetectionSchema] = None
    detections: List[PotholeDetection] = []
    severity_score: int
    severity_label: str
    detected: bool = True


# ─── COMPLAINT SCHEMAS ─────────────────────────────────────────
class CreateComplaintRequest(BaseModel):
    department: str = "Roads & Infrastructure"
    issue_type: str = "Pothole"
    image_url: str
    ai_confidence: Optional[float] = None
    bounding_boxes: Optional[List[Dict[str, Any]]] = None
    latitude: float
    longitude: float
    address: str
    location_source: str = "gps"  # "gps" or "manual"
    severity: str = "High"  # "Low", "Medium", "High", "Critical"
    description: Optional[str] = None
    citizen_id: Optional[str] = "usr_citizen_demo"
    citizen_name: Optional[str] = "Nagpur Citizen"
    citizen_email: Optional[str] = "citizen@example.com"
    citizen_phone: Optional[str] = "+91 98230 12345"


class ComplaintResponse(BaseModel):
    id: str
    citizen_id: Optional[str] = None
    citizen_name: Optional[str] = None
    citizen_email: Optional[str] = None
    citizen_phone: Optional[str] = None
    department_id: str
    department_name: str
    issue_type: str
    image_url: str
    ai_confidence: Optional[float] = None
    bounding_boxes: Optional[List[Dict[str, Any]]] = None
    latitude: float
    longitude: float
    address: str
    location_source: str
    severity: str
    description: Optional[str] = None
    status: str
    is_demo: bool = False
    created_at: str
    updated_at: str


class UpdateComplaintStatusRequest(BaseModel):
    status: str  # "Submitted", "Under Review", "Assigned", "In Progress", "Resolved"


class ComplaintStatsResponse(BaseModel):
    total: int
    pending: int
    in_progress: int
    resolved: int
    new_complaints: int


# ─── LEGACY REPORT SCHEMAS (Maintained for backward compatibility) ──
class DuplicateCandidateSchema(BaseModel):
    report_id: str
    distance_m: float
    visual_similarity: float
    category: Optional[str] = None
    photo_url: Optional[str] = None
    ward: Optional[str] = None


class CreateReportRequest(BaseModel):
    category: str = "pothole"
    photo_url: str
    bbox: Optional[List[float]] = None
    confidence: Optional[float] = 0.92
    lat: float
    lng: float
    description: Optional[str] = None
    severity_score: int = 4
    ward: Optional[str] = None


class CreateReportResponse(BaseModel):
    report_id: str
    status: str
    duplicate_candidates: List[DuplicateCandidateSchema] = []
    sla_deadline: str


class ReportResponse(BaseModel):
    id: str
    category: str
    photo_url: str
    bbox: Optional[List[float]] = None
    confidence: Optional[float] = None
    lat: float
    lng: float
    description: Optional[str] = None
    severity_score: int
    status: str
    assigned_department: Optional[str] = None
    ward: Optional[str] = None
    corroborating_count: int
    sla_deadline: Optional[str] = None
    closure_photo_url: Optional[str] = None
    created_at: str
    updated_at: str


class CreateWorksLedgerRequest(BaseModel):
    road_segment_id: str
    agency: str
    start_date: str
    end_date: str
    purpose: str
