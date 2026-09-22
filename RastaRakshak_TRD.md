# Technical Requirements Document (TRD)
## RastaRakshak — AI-Powered Urban Infrastructure Reporting Platform

**Version:** 1.0 (MVP / Hackathon Build)
**Companion to:** RastaRakshak_PRD.md
**Author:** Sahil

---

## 1. Purpose & Scope

This TRD translates the PRD's functional requirements into concrete technical specifications: API contracts, database schema, ML pipeline implementation details, mobile app structure, infrastructure, and non-functional engineering targets. It is the build reference for engineering.

---

## 2. System Overview

```
┌────────────────────────────┐
│  Mobile App (Expo SDK 57)  │
│  expo-camera / expo-router │
└──────────────┬─────────────┘
               │ HTTPS (REST) + WS (status push)
┌──────────────▼─────────────┐
│        API Gateway          │
│   FastAPI + Nginx reverse   │
│   proxy, JWT auth, rate     │
│   limiting                  │
└──────┬───────┬───────┬──────┘
       │       │       │
┌──────▼──┐ ┌──▼─────┐ ┌▼────────────┐    ┌──────────────────┐
│Detection│ │Complaint│ │Dedup/Cluster│    │ Works-Coordination│
│Service  │ │Service  │ │Engine       │    │ Ledger Service    │
│(ONNX    │ │(CRUD +  │ │(PostGIS +   │    │(segment/agency    │
│runtime) │ │ SLA)    │ │ embeddings) │    │ conflict checks)  │
└──────┬──┘ └───┬─────┘ └──────┬──────┘    └────────┬──────────┘
       │        │              │                    │
       └────────┴──────┬───────┴────────────────────┘
                        │
             ┌──────────▼───────────┐
             │ PostgreSQL + PostGIS │
             │ + S3-compatible blob │
             │   storage (photos)   │
             └──────────┬───────────┘
                        │
             ┌──────────▼───────────┐
             │ Agency Web Dashboard │
             │ (React + Mapbox/Leaflet)│
             └───────────────────────┘
```

---

## 3. Mobile App — Technical Spec

### 3.1 Environment
- **Framework:** Expo SDK 57 (managed workflow), React Native (New Architecture enabled by default in SDK 57).
- **Language:** TypeScript.
- **Navigation:** `expo-router` (file-based routing).
- **State management:** React Context + `zustand` for lightweight global state (active detection session, auth token, draft report).
- **Distribution (MVP):** Expo Go via QR / `expo start`. No `eas build` required for Phase 1.

### 3.2 Key Dependencies
| Package | Purpose | Expo Go compatible? |
|---|---|---|
| `expo-camera` | Camera preview + photo capture | ✅ |
| `expo-location` | GPS + reverse geocoding | ✅ |
| `expo-notifications` | Push notifications | ✅ |
| `expo-image-manipulator` | Resize/compress preview frames before upload | ✅ |
| `react-native-svg` | Bounding box overlay rendering | ✅ |
| `zustand` | State management | ✅ |
| `axios` | HTTP client | ✅ |
| `react-native-maps` | Draggable pin correction, mini-map on report detail | ✅ |
| *(Phase 2 only)* `react-native-vision-camera` | Native frame processors for on-device inference | ❌ requires Dev Build |
| *(Phase 2 only)* `react-native-fast-tflite` | On-device `.tflite` inference | ❌ requires Dev Build |

### 3.3 App Structure
```
/app
  /(citizen)
    index.tsx                # home / recent reports
    report/camera.tsx        # camera + live detection overlay
    report/confirm.tsx       # complaint form + duplicate check
    report/[id].tsx          # ticket status timeline
  /(officer)
    dashboard/index.tsx      # queue, filters, SLA view
    dashboard/ticket/[id].tsx
    dashboard/works-ledger.tsx
  /auth
    login.tsx
/components
  BoundingBoxOverlay.tsx
  SeverityBadge.tsx
  DuplicateConfirmSheet.tsx
  SLACountdown.tsx
/lib
  api.ts                     # axios instance + endpoints
  detectionPolling.ts        # frame-sampling loop
  store.ts                   # zustand store
/types
  report.ts, agency.ts, worksLedger.ts
```

### 3.4 Real-Time Detection Implementation (Phase 1 — Expo Go compatible)
1. `CameraView` renders live preview.
2. A `setInterval` loop (700ms–1000ms) triggers `takePictureAsync({ quality: 0.3, skipProcessing: true })` on a low-res preview capture.
3. Frame is resized/compressed via `expo-image-manipulator` (target ≤ 200KB) and POSTed to `/detect/frame` as multipart form data.
4. Response `{ boxes: [{x, y, w, h, class, confidence}] }` is normalized to screen coordinates and rendered via `BoundingBoxOverlay.tsx` using `react-native-svg`, positioned absolutely over the camera preview.
5. On shutter tap: full-resolution photo captured via `takePictureAsync({ quality: 0.9 })`; the last received detection result is attached to the draft report state in `zustand`.
6. Polling loop is paused during full-res capture and form navigation to conserve bandwidth/battery.

**Phase 2 (Dev Build) change:** replace steps 2–4 with a `useFrameProcessor` worklet calling `runTflite()` synchronously on-device per frame; no network round-trip.

---

## 4. Backend Services — API Contracts

Base URL: `/api/v1`

### 4.1 Detection Service
**POST `/detect/frame`** — low-res preview frame, fast path (used during live overlay)
```json
Request: multipart/form-data { image: <binary>, lat: float, lng: float }
Response 200:
{
  "boxes": [
    { "class": "pothole", "confidence": 0.87, "x": 0.32, "y": 0.51, "w": 0.18, "h": 0.12 }
  ],
  "inference_ms": 210
}
```
Coordinates are normalized (0–1) relative to frame dimensions.

**POST `/detect/full`** — full-resolution captured photo, used at submission time
```json
Request: multipart/form-data { image: <binary>, lat: float, lng: float }
Response 200:
{
  "primary_detection": { "class": "pothole", "confidence": 0.91, "bbox": [x,y,w,h] },
  "severity_score": 4,
  "severity_label": "High"
}
```

### 4.2 Complaint Service
**POST `/reports`**
```json
Request:
{
  "category": "pothole",
  "photo_url": "s3://.../report_123.jpg",
  "bbox": [0.32, 0.51, 0.18, 0.12],
  "confidence": 0.91,
  "lat": 21.1458, "lng": 79.0882,
  "description": "Deep crater near school gate",
  "severity_score": 4
}
Response 201:
{
  "report_id": "rpt_9f2a",
  "status": "reported",
  "duplicate_candidates": [
    { "report_id": "rpt_7c11", "distance_m": 12, "visual_similarity": 0.86 }
  ],
  "sla_deadline": "2026-10-02T00:00:00Z"
}
```

**POST `/reports/{id}/confirm-duplicate`** — citizen confirms match to an existing report instead of creating a new ticket; increments `corroborating_count` on the existing report.

**GET `/reports?department=roads&ward=Dharampeth&status=open`** — dashboard queue query, paginated, sorted by SLA urgency by default.

**PATCH `/reports/{id}/status`** — officer/contractor status transition; `In Progress → Resolved` requires `closure_photo_url` and triggers re-detection verification (see §4.3).

### 4.3 Closure Verification
**POST `/reports/{id}/closure`**
```json
Request: { "closure_photo_url": "s3://.../closure_123.jpg" }
Response 200:
{
  "verified": true,
  "defect_still_detected": false,
  "new_status": "resolved"
}
```
If `defect_still_detected: true` and confidence exceeds threshold, `new_status` remains `pending_review` and the ticket is flagged for officer manual inspection.

### 4.4 Dedup & Clustering Engine
**GET `/dedup/candidates?lat=..&lng=..&category=pothole&photo_hash=..`**
- Step 1: PostGIS `ST_DWithin` query for open reports of the same category within a category-specific radius (see §6).
- Step 2: For candidates from Step 1, compute visual similarity (perceptual hash Hamming distance for MVP; swap for CNN embedding cosine similarity in Phase 2) against the new photo.
- Step 3: Return candidates where `visual_similarity ≥ 0.8` AND `distance_m ≤ radius`, ranked by combined score.

### 4.5 Works-Coordination Ledger
**POST `/works-ledger`**
```json
{ "road_segment_id": "seg_441", "agency": "water", "start_date": "2026-10-05", "end_date": "2026-10-08", "purpose": "pipeline replacement" }
```
Server checks `road_segments.last_resurfaced_date` for the given segment; if within `RECENT_RESURFACE_WINDOW_DAYS` (default 90), response includes `"conflict_warning": true` and creates a supervisor-review flag rather than blocking the entry outright.

---

## 5. Database Schema (PostgreSQL + PostGIS)

```sql
CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE agencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  asset_types TEXT[] NOT NULL,        -- e.g. {'pothole','road_crack'}
  ward_coverage TEXT[] NOT NULL
);

CREATE TABLE road_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  geom GEOMETRY(LineString, 4326) NOT NULL,
  name TEXT,
  last_resurfaced_date DATE,
  road_class TEXT CHECK (road_class IN ('arterial','collector','inner_lane'))
);

CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL CHECK (category IN ('pothole','road_crack','water_pipeline_damage','streetlight_fault')),
  photo_url TEXT NOT NULL,
  bbox FLOAT[4],
  confidence FLOAT,
  location GEOGRAPHY(Point, 4326) NOT NULL,
  description TEXT,
  severity_score SMALLINT CHECK (severity_score BETWEEN 1 AND 5),
  status TEXT NOT NULL DEFAULT 'reported'
    CHECK (status IN ('reported','verified','assigned','in_progress','pending_review','resolved')),
  assigned_agency_id UUID REFERENCES agencies(id),
  ward TEXT,
  corroborating_count INT DEFAULT 0,
  sla_deadline TIMESTAMPTZ,
  closure_photo_url TEXT,
  reporter_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_reports_location ON reports USING GIST (location);
CREATE INDEX idx_reports_status_ward ON reports (status, ward);

CREATE TABLE report_confirmations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID REFERENCES reports(id),
  citizen_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE works_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  road_segment_id UUID REFERENCES road_segments(id),
  agency_id UUID REFERENCES agencies(id),
  start_date DATE,
  end_date DATE,
  purpose TEXT,
  conflict_warning BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role TEXT CHECK (role IN ('citizen','officer','contractor','supervisor')),
  name TEXT,
  phone TEXT UNIQUE,
  agency_id UUID REFERENCES agencies(id),
  ward TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE status_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID REFERENCES reports(id),
  old_status TEXT,
  new_status TEXT,
  actor_id UUID REFERENCES users(id),
  actor_role TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

## 6. ML Pipeline — Technical Detail

### 6.1 Training
- **Base model:** YOLO11n, pretrained COCO weights as initialization.
- **Fine-tuning dataset:** RDD2022 (India + full 6-country set) for `pothole`, `longitudinal_crack`, `transverse_crack`, `alligator_crack` → remapped at inference time to the app's `pothole` / `road_crack` categories.
- **Custom classes:** `streetlight_fault`, `water_pipeline_damage` — self-collected, 150–300 images/class, labeled in Roboflow or CVAT, exported in YOLO format. Augmentations: rotation (±15°), brightness/contrast jitter, motion blur, random crop.
- **Training env:** Google Colab / local GPU via Ultralytics YOLO CLI:
  ```bash
  yolo train model=yolo11n.pt data=rastarakshak.yaml epochs=100 imgsz=640 batch=16
  ```
- **Export:** `yolo export model=best.pt format=onnx opset=12` for server-side inference (Phase 1); `format=tflite int8=True` for Phase 2 on-device.

### 6.2 Serving (Phase 1)
- FastAPI endpoint loads the ONNX model once at startup via `onnxruntime.InferenceSession`.
- Preprocessing: resize to 640×640, normalize, NCHW tensor.
- Postprocessing: NMS (IoU threshold 0.45), confidence threshold 0.4 for the live-preview endpoint (favor recall for UX feedback) and 0.6 for the full-resolution submission endpoint (favor precision before creating a ticket).
- Target inference time: < 300ms per frame on a modest cloud CPU instance (batch size 1); use GPU instance if available for the frame-polling path.

### 6.3 Severity Scoring (Implementation)
```python
def compute_severity(defect_area_ratio, near_sensitive_site, road_class, days_open, corroborations):
    w = {"size": 0.3, "sensitivity": 0.3, "road_class": 0.15, "age": 0.15, "corroboration": 0.1}
    road_class_weight = {"arterial": 1.0, "collector": 0.6, "inner_lane": 0.3}[road_class]
    score = (
        w["size"] * min(defect_area_ratio * 5, 1.0)
        + w["sensitivity"] * (1.0 if near_sensitive_site else 0.0)
        + w["road_class"] * road_class_weight
        + w["age"] * min(days_open / 10, 1.0)
        + w["corroboration"] * min(corroborations / 5, 1.0)
    )
    return round(score * 5)  # 1-5 scale, clamp to min 1
```
`near_sensitive_site` = point lookup against a static POI table (schools, hospitals) within 100m, precomputed at ingestion.

### 6.4 Dedup Similarity (Implementation)
- **MVP:** `imagehash.phash()` on both images; Hamming distance ≤ 8 (out of 64 bits) treated as visually similar.
- **Phase 2:** replace with a small CNN embedding (e.g., MobileNetV3 penultimate layer) + cosine similarity ≥ 0.85, more robust to angle/lighting variation than pHash.
- **Combined rule:** merge only if geo AND visual both pass threshold — prevents false merges from GPS drift on multi-lane roads and false rejects from lighting differences alone.

---

## 7. Infrastructure & Deployment

| Component | MVP choice |
|---|---|
| Backend hosting | Single containerized FastAPI app (Docker) on a small cloud VM or Render/Railway for hackathon speed |
| ML inference | Same container for MVP scale; split into separate service if load requires |
| Database | Managed Postgres with PostGIS extension (e.g., Supabase or a self-hosted Postgres+PostGIS Docker container) |
| Image storage | S3-compatible bucket (AWS S3 / Cloudflare R2) or Cloudinary for MVP simplicity |
| Mobile distribution | Expo Go (QR code) for Phase 1; `eas build --profile development` for Phase 2 Dev Client |
| CI | GitHub Actions: lint + type-check on PR; manual deploy trigger for hackathon timeline |

### Environment variables (backend)
```
DATABASE_URL=
S3_BUCKET=
S3_ACCESS_KEY / S3_SECRET_KEY=
MODEL_PATH=/models/rastarakshak_yolo11n.onnx
DEDUP_RADIUS_M_DEFAULT=50
DEDUP_RADIUS_M_STREETLIGHT=20
RECENT_RESURFACE_WINDOW_DAYS=90
JWT_SECRET=
```

---

## 8. Security & Privacy

- JWT-based auth; citizen accounts via phone OTP, officer/contractor accounts provisioned by admin.
- Role-based access control on all dashboard endpoints (officer sees only their agency+ward; supervisor sees cross-agency).
- Photos are of infrastructure; no facial recognition or identity processing is run on incidentally captured people.
- Rate limiting on `/detect/frame` per device/session to prevent abuse (e.g., 2 req/sec max).
- All status changes written to `status_audit_log` for accountability (addresses "contractors close with 1 unverifiable photo" directly).

---

## 9. Non-Functional Targets (Engineering)

| Target | Value |
|---|---|
| `/detect/frame` p95 latency | < 500ms |
| `/reports` POST p95 latency | < 800ms |
| Dedup query p95 latency | < 300ms (indexed GIST query) |
| Backend uptime (pilot) | ≥ 99% |
| Mobile app cold start to camera-ready | < 3s |

---

## 10. Testing Strategy

- **Unit tests:** severity scoring function, dedup threshold logic, status-transition state machine (backend, pytest).
- **Integration tests:** end-to-end POST `/reports` → dedup candidate check → duplicate confirmation flow.
- **ML evaluation:** held-out validation split from RDD2022 + custom classes; track mAP@0.5 per class; manual spot-check for known failure modes (shadows, repair patches, occlusion).
- **Mobile:** manual QA checklist for camera permission flows (iOS/Android), GPS accuracy fallback (manual pin), offline/poor-network graceful degradation (frame polling pauses, retry on submit).

---

## 11. Traceability to PRD

| PRD Requirement | TRD Section |
|---|---|
| FR-1 to FR-3 (camera/capture) | §3.4 |
| FR-4, FR-5 (classification, severity) | §4.1, §6.3 |
| FR-8, FR-9 (dedup) | §4.4, §6.4 |
| FR-10 (routing) | §5 schema `assigned_agency_id`, `ward` |
| FR-12, FR-13 (dashboard) | §4.2 GET `/reports`, §5 schema |
| FR-14 (closure verification) | §4.3 |
| FR-15, FR-16 (works ledger) | §4.5, §5 `works_ledger` table |
| FR-17 (SLA escalation) | §5 `sla_deadline`, dashboard sort order |
