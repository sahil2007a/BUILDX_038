# 🛡️ RastaRakshak — AI-Powered Civic Infrastructure Reporting Platform (Nagpur)

> **Track:** Urban Infrastructure & Roads  
> **Target Pilot:** Nagpur Municipal Corporation (NMC), Nagpur Water Works (OCW), and MSEDCL  
> **Key Legal SLA:** Bombay High Court (Nagpur Bench) 10-Day Road Repair Mandate

---

## 📌 Problem & Vision

After the first heavy rains in Nagpur, major corridors (Kamptee Road, Katol Road, Dharampeth, Manish Nagar) become hazardous due to craters, pipeline leaks, and uncoordinated utility trenches. Today's complaint reporting is broken by:
1. **Channel Fragmentation & Duplication:** 5 separate tickets filed for 1 pothole across WhatsApp, phone helplines (155304), and disconnected apps.
2. **Zero Risk-Based Prioritization:** Craters outside school gates sit with the same queue priority as minor cosmetic marks.
3. **No Cross-Agency Dig Coordination:** Roads are repeatedly excavated immediately after resurfacing because utilities (Roads, Water, Electricity) have no unified ledger.
4. **Unverifiable Closures:** Work orders closed with single arbitrary photos without verified defect removal.

**RastaRakshak** provides a single source of truth that de-duplicates reports using geospatial proximity and visual similarity, prioritizes by explainable risk score (TRD §6.3), coordinates utility works, and enforces verified closure.

---

## 🏗️ System Architecture

```
Mobile App (Expo SDK 57, TypeScript, Managed Workflow)
   │  HTTPS (REST) + WS (status updates)
API Gateway & FastAPI Backend
   ├── Detection Service (YOLO11n / ONNX runtime)
   ├── Complaint Service (CRUD, 10-Day SLA tracking)
   ├── Dedup & Clustering Engine (PostGIS ST_DWithin + visual similarity)
   └── Works-Coordination Ledger (resurfacing conflict flags)
   │
PostgreSQL + PostGIS Database
   │
Agency Web Dashboard (React + Leaflet/Mapbox)
```

---

## 🚀 Mobile App Quickstart (Milestone 1)

### Prerequisites
- Node.js (v18+)
- [Expo Go](https://expo.dev/go) app installed on your physical iOS or Android phone

### Running Locally
```bash
# Navigate to mobile app
cd mobile

# Start Expo development server
npx expo start
```

- **Physical Device:** Scan the QR code in your terminal with your phone camera (iOS) or the Expo Go app (Android).
- **Web Browser:** Press `w` in the terminal to preview in your browser.
- **Android Emulator:** Press `a` in the terminal.

---

## 📋 Build Order & Milestones (PRD §11)

- [x] **Milestone 1:** Expo app skeleton: live camera screen, preview frame sampling loop, SVG bounding box overlay, complaint form UI with explainable severity calculation and mock duplicate check flow.
- [ ] **Milestone 2:** FastAPI backend skeleton + Postgres/PostGIS schema (TRD §5); `/detect/frame` and `/detect/full` mock endpoints.
- [ ] **Milestone 3:** Wire mobile app to backend; live bounding-box overlay end-to-end.
- [ ] **Milestone 4:** PostGIS dedup & clustering engine + duplicate-confirmation UI.
- [ ] **Milestone 5:** Officer dashboard (React web): ticket triage queue, SLA countdown, closure verification.
- [ ] **Milestone 6:** Works-coordination ledger + conflict warning engine for recently resurfaced road segments.
- [ ] **Milestone 7:** Fine-tuned YOLO11n model deployment (RDD2022 dataset + custom Nagpur classes).

---

## 📄 Documentation
- [Product Requirements Document (PRD)](./RastaRakshak_PRD.md)
- [Technical Requirements Document (TRD)](./RastaRakshak_TRD.md)
