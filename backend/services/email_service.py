import os
import smtplib
from datetime import datetime, timezone
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

OFFICER_EMAIL = os.getenv("OFFICER_EMAIL", "sahilramteke95@gmail.com")
SMTP_HOST = os.getenv("SMTP_HOST", "")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASS = os.getenv("SMTP_PASS", "")
FROM_EMAIL = os.getenv("FROM_EMAIL", "alerts@rastarakshak.nagpur.gov.in")


def send_complaint_notification_email(
    complaint_id: str,
    department: str,
    issue_type: str,
    ai_confidence: float,
    citizen_name: str,
    citizen_email: str,
    citizen_phone: str,
    description: str,
    address: str,
    latitude: float,
    longitude: float,
    severity: str,
    status: str,
    image_url: str,
    submitted_at: str = None,
) -> bool:
    """
    Dispatches a structured complaint notification email to the responsible officer.
    Complies strictly with Section 16 specification.
    """
    if not submitted_at:
        submitted_at = datetime.now(timezone.utc).strftime("%d %B %Y %H:%M UTC")

    subject = f"[RastaRakshak] New Complaint - {complaint_id} - {department}"
    maps_link = f"https://www.google.com/maps?q={latitude},{longitude}"
    conf_str = f"{round(ai_confidence * 100, 1)}%" if ai_confidence else "N/A"

    # Plain text format strictly matching Section 16 specification
    text_content = f"""RASTARAKSHAK
New Infrastructure Complaint

Complaint ID: {complaint_id}
Department: {department}
Issue: {issue_type}
AI Detection: Pothole detected
AI Confidence: {conf_str}
Reported By: {citizen_name or 'Nagpur Citizen'}
Citizen Email: {citizen_email or 'citizen@example.com'}
Citizen Phone: {citizen_phone or 'Not provided'}
Description: {description or 'None provided'}
Location: {address}
Latitude: {latitude:.6f}
Longitude: {longitude:.6f}
Google Maps: {maps_link}
Severity: {severity}
Submitted At: {submitted_at}
Status: {status.upper()}
Complaint Image: {image_url}
"""

    # Rich HTML Email
    html_content = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; }}
    .card {{ max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.08); border: 1px solid #e2e8f0; }}
    .header {{ background: #0f172a; padding: 20px 24px; color: #ffffff; }}
    .header h1 {{ margin: 0; font-size: 20px; font-weight: 800; }}
    .header p {{ margin: 6px 0 0 0; color: #ea580c; font-weight: 700; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; }}
    .body {{ padding: 24px; color: #334155; }}
    .field {{ margin-bottom: 14px; }}
    .label {{ font-size: 11px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }}
    .value {{ font-size: 14px; font-weight: 600; color: #0f172a; margin-top: 2px; }}
    .photo {{ width: 100%; max-height: 280px; object-fit: cover; border-radius: 8px; margin-top: 8px; border: 1px solid #e2e8f0; }}
    .btn {{ display: inline-block; background: #ea580c; color: #ffffff; text-decoration: none; padding: 12px 20px; border-radius: 8px; font-weight: 700; font-size: 14px; margin-top: 16px; text-align: center; }}
    .footer {{ background: #f1f5f9; padding: 16px 24px; font-size: 12px; color: #64748b; text-align: center; }}
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h1>RASTARAKSHAK</h1>
      <p>New Infrastructure Complaint • {department}</p>
    </div>
    <div class="body">
      <div class="field">
        <div class="label">Complaint ID</div>
        <div class="value"><strong>{complaint_id}</strong></div>
      </div>
      <div class="field">
        <div class="label">Department & Issue</div>
        <div class="value">{department} — {issue_type}</div>
      </div>
      <div class="field">
        <div class="label">AI Detection & Confidence</div>
        <div class="value">Pothole detected ({conf_str})</div>
      </div>
      <div class="field">
        <div class="label">Reported By</div>
        <div class="value">{citizen_name} | {citizen_email} | {citizen_phone}</div>
      </div>
      <div class="field">
        <div class="label">Location & Coordinates</div>
        <div class="value">📍 {address}</div>
        <div class="value" style="font-size: 12px; color: #64748b;">Lat: {latitude:.6f}, Lng: {longitude:.6f}</div>
      </div>
      {f'''<div class="field">
        <div class="label">Description</div>
        <div class="value" style="background: #f1f5f9; padding: 10px; border-radius: 6px;">"{description}"</div>
      </div>''' if description else ''}
      <div class="field">
        <div class="label">Severity & Status</div>
        <div class="value">Severity: <strong>{severity}</strong> | Status: <strong>{status.upper()}</strong></div>
      </div>
      <div class="field">
        <div class="label">Complaint Image</div>
        <img src="{image_url}" class="photo" alt="Pothole Photo" />
      </div>
      <a href="{maps_link}" class="btn" target="_blank">🗺️ Open in Google Maps</a>
    </div>
    <div class="footer">
      Dispatched to designated officer at {OFFICER_EMAIL}<br/>
      Nagpur Municipal Corporation (NMC) Civic Triage Engine
    </div>
  </div>
</body>
</html>
"""

    # Always log the full dispatch to console for verification
    print("\n" + "=" * 65)
    print(f"[EMAIL DISPATCH TO {OFFICER_EMAIL}]")
    print(f"Subject: {subject}")
    print(f"Complaint ID: {complaint_id} | Department: {department} | Issue: {issue_type}")
    print(f"AI Detection: Pothole detected ({conf_str})")
    print(f"Reported By: {citizen_name} ({citizen_email})")
    print(f"Location: {address} ({latitude:.6f}, {longitude:.6f})")
    print(f"Maps URL: {maps_link}")
    print(f"Severity: {severity} | Status: {status}")
    print("=" * 65 + "\n")

    # If SMTP credentials exist, send real email
    if SMTP_HOST and SMTP_USER and SMTP_PASS:
        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = FROM_EMAIL
            msg["To"] = OFFICER_EMAIL

            msg.attach(MIMEText(text_content, "plain"))
            msg.attach(MIMEText(html_content, "html"))

            with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=10) as server:
                server.starttls()
                server.login(SMTP_USER, SMTP_PASS)
                server.sendmail(FROM_EMAIL, [OFFICER_EMAIL], msg.as_string())

            print(f"[SUCCESS] Real email successfully delivered via SMTP to {OFFICER_EMAIL}")
            return True
        except Exception as e:
            # Crucial: Email failure does NOT delete or roll back complaint
            print(f"[WARNING] SMTP delivery failed (complaint saved in DB): {e}")
            return False

    return True


# Backward compatibility alias
def send_officer_complaint_email(
    report_id: str,
    category: str,
    confidence: float,
    severity_score: int,
    latitude: float,
    longitude: float,
    ward: str,
    description: str,
    photo_url: str,
    sla_deadline: str,
) -> bool:
    return send_complaint_notification_email(
        complaint_id=report_id,
        department="Roads & Infrastructure",
        issue_type=category.replace("_", " ").title(),
        ai_confidence=confidence,
        citizen_name="Nagpur Citizen",
        citizen_email="citizen@example.com",
        citizen_phone="+91 98230 12345",
        description=description,
        address=ward,
        latitude=latitude,
        longitude=longitude,
        severity="High",
        status="Submitted",
        image_url=photo_url,
    )
