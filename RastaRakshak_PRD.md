# Product Requirements Document (PRD)
## RastaRakshak — AI-Powered Urban Infrastructure Reporting Platform

**Track:** Urban Infrastructure & Roads
**Version:** 1.0 (MVP / Hackathon Build)
**Platform:** Mobile app (Expo SDK 57) + Web dashboard
**Author:** Sahil
**Status:** Draft for build

---

## 1. Problem Statement

After the first heavy rain in Nagpur, potholes appear across major roads (Kamptee Road, Katol Road) and inner lanes (Dharampeth, Manish Nagar). Today, civic complaint reporting is broken in three specific ways:

1. **Fragmentation & duplication** — The same pothole gets reported through multiple disconnected channels (app, helpline, social media, letter, WhatsApp), creating 5 separate tickets for one issue. NMC's own "My Nagpur" app currently has a 2.6-star rating, with users reporting crashes and being unable to get past login, pushing people toward informal channels like WhatsApp and a separate helpline (155304) — none of which talk to each other.
2. **No risk-based prioritization** — A minor complaint gets the same queue priority as a crater near a school gate. The Nagpur crater in our scenario stayed open 3 weeks until a rider was injured, despite a 2019 Bombay High Court order mandating a 10-day repair SLA for reported potholes.
3. **No cross-agency coordination or verified closure** — Roads get dug up repeatedly by different utilities (water, electricity) because no agency can see what others have planned or recently completed. Contractors close work orders with a single unverifiable photo. A streetlight fault can sit unresolved for 12+ days simply because it was filed under the wrong department.

**Core insight:** Nagpur does not lack complaint channels — it has too many disconnected ones. The gap is a single source of truth that de-duplicates automatically, prioritizes by real risk, routes to the correct department by asset type, coordinates digs across agencies, and verifies that "resolved" actually means resolved.

---

## 2. Goals & Success Metrics

### Goals
- Reduce duplicate ticket volume for the same physical defect.
- Cut average time-to-first-response for high-risk defects (e.g., near schools/hospitals/high-traffic arterials).
- Give civic officials a single dashboard showing every open defect, its owner department, and SLA status.
- Prevent repeat excavation of recently resurfaced roads via a shared works ledger.
- Make "resolved" verifiable, not just claimed.

### MVP Success Metrics (for hackathon demo / pilot)
| Metric | Target |
|---|---|
| Duplicate reports auto-merged instead of creating new tickets | ≥ 60% of near-duplicate submissions |
| Detection latency (capture → classification result shown) | < 1.5s on 4G |
| Model precision on demo dataset (pothole class) | ≥ 80% @ IoU 0.5 (MVP-scale target, not production claim) |
| High-risk reports flagged and visually distinguished from normal queue | 100% of reports scored |
| End-to-end flow (camera → detection → complaint submitted) | < 60 seconds for a first-time user |

---

## 3. Users & Personas

| Persona | Needs |
|---|---|
| **Citizen reporter** (e.g., daily commuter, resident) | Report a defect in under a minute, avoid re-reporting something already logged, see status updates |
| **Field engineer / department officer** (Roads, Water, Electricity) | See only tickets relevant to their department and ward, verify closure with evidence |
| **Contractor** | Submit before/after proof of work that can't be gamed with a single arbitrary photo |
| **Ward/zone supervisor** | Cross-agency visibility — see planned digs, avoid re-cutting a resurfaced road, escalate overdue tickets |
| **Citizen (read-only)** | View a public map/heatmap of known issues in their area |

---

## 4. Scope

### 4.1 In Scope (MVP)
- Citizen mobile app: camera capture, near-real-time AI defect detection with bounding box overlay, complaint submission with location + optional description.
- AI detection for 4 classes: **Pothole, Road Crack, Water Pipeline Damage, Streetlight Fault.**
- Automatic severity/risk scoring (Low/Medium/High/Critical).
- Duplicate detection via geolocation + visual similarity, with citizen confirmation flow ("Is this the same issue?").
- Complaint status tracking (Reported → Verified → Assigned → In Progress → Resolved).
- Officer/agency web dashboard: ticket queue by department & ward, map view, SLA countdown, closure verification.
- Basic works-coordination ledger: agencies log active/planned excavation on a road segment; system flags conflicts against recently resurfaced segments.
- Push notifications on status change.

### 4.2 Out of Scope (MVP)
- True on-device (offline) real-time video inference — deferred to Phase 2 (see §9).
- Payment/contractor billing integration.
- Full legal/FIR escalation workflow automation (HC-mandated FIR trigger) — logged only, not automated, in MVP.
- Multi-language UI beyond English/Hindi/Marathi text labels (translation infra deferred).
- iOS/Android native builds outside Expo Go for MVP (see §9 for Dev Build phase).

---

## 5. User Flows

### 5.1 Citizen: Report a Defect
1. Open app → tap "Report an Issue" → camera opens (`expo-camera`).
2. App samples preview frames (~every 700ms–1s) and sends to Detection Service; bounding box + class + confidence drawn as overlay on live preview.
3. User taps shutter once a defect is boxed → full-resolution photo captured and locked to that detection result.
4. Complaint form pre-fills: category (editable), GPS location (draggable pin to correct), auto-computed severity badge (read-only), optional free-text description.
5. **Duplicate check:** before submit, app queries existing open reports within an asset-appropriate radius (tighter for point defects like streetlights, wider for road stretches) using geolocation + image similarity.
   - If a match is found → "This looks like an existing report — confirm it's the same issue?" → one-tap confirm adds citizen as a corroborating reporter instead of creating a new ticket.
   - If no match → new ticket created.
6. Citizen receives ticket ID and can track status; push notification on each status change.

### 5.2 Officer: Triage & Resolve
1. Officer logs into dashboard, sees queue filtered to their department + ward, sorted by SLA urgency.
2. Opens ticket → sees photo, AI classification + confidence, risk score, location, number of corroborating reports.
3. Assigns to contractor / field team; status → In Progress.
4. On completion, contractor uploads a **closure photo from the same location**.
5. System re-runs detection on the closure photo; if the same defect class is still detected above threshold at that location, auto-reject closure and flag for officer review. Otherwise, mark Resolved.

### 5.3 Agency: Coordinate Works
1. Before starting excavation, agency logs the road segment + planned dates in the works ledger.
2. System checks whether that segment was resurfaced within a configurable recent window (e.g., 90 days); if so, surfaces a conflict warning to a supervisor for manual override/approval.

---

## 6. Functional Requirements

| ID | Requirement | Priority |
|---|---|---|
| FR-1 | App shall open device camera and display live preview | P0 |
| FR-2 | App shall periodically send preview frames to Detection Service and render returned bounding boxes as an overlay | P0 |
| FR-3 | App shall let user capture a full-res photo tied to the active detection | P0 |
| FR-4 | System shall classify captured image into Pothole / Road Crack / Water Pipeline Damage / Streetlight Fault | P0 |
| FR-5 | System shall compute a severity score (1–5) from defect size, location type, road class, and existing report count | P0 |
| FR-6 | App shall capture GPS location and allow manual pin correction | P0 |
| FR-7 | App shall allow optional free-text description | P1 |
| FR-8 | System shall detect near-duplicate reports (geo + visual similarity) before final submission | P0 |
| FR-9 | System shall allow a citizen to confirm an existing report instead of creating a new one | P0 |
| FR-10 | System shall route each new ticket to the correct department based on detected asset type + ward | P0 |
| FR-11 | System shall maintain a status timeline per ticket and notify the citizen on change | P1 |
| FR-12 | Dashboard shall display tickets filtered by department, ward, status, and SLA countdown | P0 |
| FR-13 | Dashboard shall show a map/heatmap of open issues | P1 |
| FR-14 | System shall require a closure photo from contractors and re-run detection to verify defect is gone before allowing auto-resolution | P0 |
| FR-15 | System shall provide a shared works ledger where agencies log active/planned excavation per road segment | P1 |
| FR-16 | System shall flag a warning when new excavation is logged on a recently resurfaced segment | P1 |
| FR-17 | System shall escalate tickets that breach their SLA countdown to a supervisor view | P1 |

---

## 7. Non-Functional Requirements

- **Latency:** Detection round-trip < 1.5s on typical 4G connection.
- **Availability:** Backend uptime target ≥ 99% during pilot window.
- **Scalability:** Dedup/clustering queries must remain performant as report volume grows per ward (indexed geospatial queries via PostGIS).
- **Privacy:** No facial data stored; photos are of infrastructure, not people — if a person appears incidentally in a photo, no identification/recognition processing is performed.
- **Accessibility:** Complaint form usable one-handed; supports Hindi/Marathi + English labels.
- **Auditability:** Every status change and closure verification is logged with timestamp and actor (citizen, officer, contractor, system).

---

## 8. AI/ML Requirements

- **Model:** YOLO11n (nano), fine-tuned for real-time-capable inference.
- **Base training data:** RDD2022 dataset (India subset + full multi-country set) for pothole, longitudinal crack, transverse crack, and alligator crack classes.
- **Custom classes (must be self-collected — not covered by public datasets):** Streetlight fault (dark/broken/leaning pole), Water Pipeline Damage (visible leak, waterlogging, exposed/burst pipe). MVP target: 150–300 labeled images per custom class, augmented (rotation, brightness, blur) for a credible nano-model demo — explicitly framed as MVP-scale accuracy, not production-grade.
- **Known failure modes to account for (from prior research on YOLO road-damage models):** shadows/dark patches/repair marks misclassified as damage; overlapping boxes on closely spaced defects; missed detections under partial occlusion by vehicles/debris. Confidence thresholding and human verification in the officer dashboard mitigate this.
- **Severity scoring formula (MVP, explainable):**
  ```
  risk_score = w1·(defect_size_area) + w2·(proximity_to_school_or_hospital)
             + w3·(road_type_weight: arterial > inner lane)
             + w4·(days_since_first_report) + w5·(number_of_confirming_reports)
  ```
  Normalized to a 1–5 badge (Low → Critical).
- **Dedup similarity:** geolocation distance (asset-type-specific radius) + image similarity (perceptual hash or lightweight embedding for MVP) — both signals required to auto-merge, to avoid false merges from GPS drift on multi-lane roads.
- **Closure verification:** re-run detection on contractor's "after" photo at the same location; presence of the same class above threshold blocks auto-closure.

---

## 9. Technical Architecture

### 9.1 Stack
| Layer | Choice |
|---|---|
| Mobile app | Expo SDK 57 (React Native), `expo-camera`, `expo-location`, `expo-router`, `expo-notifications` |
| Real-time overlay | `react-native-svg` for bounding boxes on live preview |
| Backend API | FastAPI (Python) |
| ML serving | YOLO11n exported to ONNX, served via `onnxruntime` (or Roboflow-hosted inference for fastest MVP setup) |
| Database | PostgreSQL + PostGIS (geospatial queries for dedup radius, ward routing) |
| Image storage | S3-compatible bucket / Cloudinary |
| Dashboard | React web app — ticket queue + map heatmap |
| Auth | Firebase Auth or JWT-based service |

### 9.2 Critical Constraint — Expo Go and Real-Time Detection
Plain Expo Go runs the app inside a pre-built native container that cannot load custom native modules. This means continuous frame-by-frame on-device inference (via `react-native-vision-camera` frame processors + `react-native-fast-tflite`) is **not possible in Expo Go**.

- **MVP approach (Phase 1 — build this first):** `expo-camera` captures preview frames at ~700ms–1s intervals, sent over HTTPS to a cloud Detection Service; results overlaid in JS. Fully compatible with plain Expo Go — installable and demoable via QR code, no custom build required.
- **Production upgrade (Phase 2 — post-MVP):** Move to an **Expo Development Build** (still Expo's managed workflow, not a bare eject) and add `react-native-vision-camera` + `react-native-fast-tflite` with the YOLO model exported to quantized `.tflite`, enabling true 15–30fps on-device, offline-capable detection.

### 9.3 High-Level System Diagram
```
Mobile App (Expo SDK 57)
   │  HTTPS / WebSocket
API Gateway (auth, rate-limit, routing)
   ├── Detection Service (ML inference)
   ├── Complaint Service (CRUD, status)
   ├── Dedup & Clustering Engine (geo + visual)
   └── Works-Coordination Ledger
   │
PostgreSQL + PostGIS
   │
Agency Web Dashboard (routing, verification, escalation, analytics)
```

---

## 10. Data Model (Core Entities)

- **Report:** id, category, bounding_box, confidence, severity_score, photo_url, lat, lng, description, status, created_at, corroborating_report_ids[], assigned_department, assigned_ward, sla_deadline
- **Agency/Department:** id, name, asset_types_owned[], ward_coverage[]
- **WorksLedgerEntry:** id, road_segment_id, agency_id, start_date, end_date, purpose
- **RoadSegment:** id, geometry, last_resurfaced_date
- **User:** id, role (citizen/officer/contractor/supervisor), department_id (if applicable), ward (if applicable)

---

## 11. Milestones (Hackathon Build Plan)

| Phase | Deliverable |
|---|---|
| 1 | Expo app skeleton: camera screen, capture flow, complaint form UI (no ML yet, mock detection) |
| 2 | Train/fine-tune YOLO11n on RDD2022 subset + self-collected streetlight/pipeline images; stand up FastAPI inference endpoint |
| 3 | Wire app → Detection Service; live bounding-box overlay working end-to-end |
| 4 | Dedup engine (geo + visual similarity) + duplicate-confirmation UI |
| 5 | Officer dashboard: ticket queue, SLA countdown, closure verification flow |
| 6 | Works-coordination ledger + conflict flagging |
| 7 | Polish, demo dataset seeding (use real Nagpur pothole survey data referenced in local reporting), rehearse demo |

---

## 12. Risks & Open Questions

- **Model accuracy at hackathon scale** is inherently limited by small custom-class datasets (streetlight/pipeline) — mitigate by being upfront about MVP-scale accuracy in the pitch, not overclaiming.
- **False duplicate merges** from GPS drift — mitigated by requiring both geo AND visual similarity to auto-merge.
- **Gaming closure verification** (e.g., contractor photographs a different, undamaged spot) — mitigate with location-tagged photo requirement and random officer spot-checks.
- **Cross-agency adoption** of the works ledger is a process/policy change, not just software — real-world rollout would need NMC buy-in across Roads, Water, and Electricity departments.
- **Open question:** Should the FIR-escalation clause (from the 2019 HC order) be automated in a future phase, or remain a manual supervisor action? Recommend manual for MVP to avoid legal complications in a hackathon demo.

---

## 13. Appendix — Why This Approach (Research Basis)

- YOLO-family detectors are the established approach for real-time pothole/road-damage detection; RDD2022 is the standard multi-country benchmark dataset including India.
- Duplicate-report suggestion by proximity is a proven pattern (used in FixMyStreet Pro deployments) — confirmed as the right UX for the "same pothole, 5 channels" problem.
- Nagpur's own civic-app history (Live City / My Nagpur, helpline 155304, WhatsApp complaints) shows the failure mode is channel fragmentation and lack of verification — not absence of a reporting tool. This PRD's differentiators (dedup, verified closure, works ledger) target that gap directly.
