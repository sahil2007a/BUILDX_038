from typing import List, Optional
from pydantic import BaseModel, Field


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
    primary_detection: PrimaryDetectionSchema
    severity_score: int
    severity_label: str


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
