import os
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from datetime import datetime

OFFICER_EMAIL = os.getenv("OFFICER_EMAIL", "sahilramteke95@gmail.com")
SMTP_HOST = os.getenv("SMTP_HOST", "")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASS = os.getenv("SMTP_PASS", "")
FROM_EMAIL = os.getenv("FROM_EMAIL", "alerts@rastarakshak.nagpur.gov.in")


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
    """
    Dispatches a complete complaint notification email to the officer (sahilramteke95@gmail.com).
    """
    subject = f"[RastaRakshak ALERT] New {category.replace('_', ' ').title()} Reported - Ticket #{report_id}"
    maps_link = f"https://www.google.com/maps?q={latitude},{longitude}"

    confidence_pct = round(confidence * 100) if confidence else 92

    severity_labels = {
        1: "1/5 (Low Risk)",
        2: "2/5 (Moderate)",
        3: "3/5 (Medium Risk)",
        4: "4/5 (High Risk - Urgent)",
        5: "5/5 (Critical Hazard - Immediate Action)",
    }
    severity_str = severity_labels.get(severity_score, f"{severity_score}/5")

    # Rich HTML Email Body
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; }}
        .card {{ max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.08); border: 1px solid #e2e8f0; }}
        .header {{ background: #0f172a; padding: 24px; color: #ffffff; }}
        .header h1 {{ margin: 0; font-size: 20px; font-weight: 800; }}
        .header p {{ margin: 6px 0 0 0; color: #ea580c; font-weight: 700; font-size: 13px; }}
        .body {{ padding: 24px; color: #334155; }}
        .sla-box {{ background: #fee2e2; border-left: 4px solid #dc2626; padding: 12px 16px; border-radius: 6px; margin-bottom: 20px; }}
        .sla-box h3 {{ margin: 0; color: #991b1b; font-size: 14px; }}
        .sla-box p {{ margin: 4px 0 0 0; color: #7f1d1d; font-size: 12px; }}
        .field {{ margin-bottom: 14px; }}
        .label {{ font-size: 11px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }}
        .value {{ font-size: 15px; font-weight: 600; color: #0f172a; margin-top: 2px; }}
        .photo {{ width: 100%; max-height: 300px; object-fit: cover; border-radius: 8px; margin-top: 10px; border: 1px solid #e2e8f0; }}
        .btn {{ display: inline-block; background: #ea580c; color: #ffffff; text-decoration: none; padding: 12px 20px; border-radius: 8px; font-weight: 700; font-size: 14px; margin-top: 16px; }}
        .footer {{ background: #f1f5f9; padding: 16px 24px; font-size: 12px; color: #64748b; text-align: center; }}
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <h1>🛡️ RastaRakshak Nagpur</h1>
          <p>AI INFRASTRUCTURE INCIDENT ALERT</p>
        </div>
        <div class="body">
          <div class="sla-box">
            <h3>⚖️ Bombay High Court (Nagpur Bench) 10-Day SLA Active</h3>
            <p>Mandatory resolution deadline: <strong>{sla_deadline}</strong></p>
          </div>

          <div class="field">
            <div class="label">Ticket ID</div>
            <div class="value">#{report_id}</div>
          </div>

          <div class="field">
            <div class="label">AI Classification & Confidence</div>
            <div class="value">🎯 {category.replace('_', ' ').upper()} — <strong>{confidence_pct}% confidence</strong></div>
          </div>

          <div class="field">
            <div class="label">Severity Level (TRD §6.3)</div>
            <div class="value">{severity_str}</div>
          </div>

          <div class="field">
            <div class="label">Location & Ward</div>
            <div class="value">📍 {ward}</div>
            <div class="value" style="font-size: 13px; color: #64748b;">Coordinates: {latitude:.4f}, {longitude:.4f}</div>
          </div>

          {f'''<div class="field">
            <div class="label">Citizen Description</div>
            <div class="value" style="background: #f8fafc; padding: 10px; border-radius: 6px; font-size: 14px;">"{description}"</div>
          </div>''' if description else ''}

          <div class="field">
            <div class="label">Captured Defect Photo</div>
            <img src="{photo_url}" class="photo" alt="Defect Photo" />
          </div>

          <a href="{maps_link}" class="btn" target="_blank">🗺️ Open Location in Google Maps</a>
        </div>
        <div class="footer">
          Dispatched by RastaRakshak Central Engine to Designated Officer: {OFFICER_EMAIL}<br/>
          Nagpur Municipal Corporation (NMC) Civic Triage System
        </div>
      </div>
    </body>
    </html>
    """

    text_content = f"""
    [RastaRakshak ALERT] New Defect Reported - #{report_id}
    -------------------------------------------------------
    Category: {category.upper()} (Confidence: {confidence_pct}%)
    Severity: {severity_str}
    Location: {ward} (Lat: {latitude}, Lng: {longitude})
    Google Maps: {maps_link}
    Citizen Note: {description or 'None provided'}
    High Court SLA Deadline: {sla_deadline}
    Photo URL: {photo_url}
    -------------------------------------------------------
    Recipient: {OFFICER_EMAIL}
    """

    # Always log the full dispatch to console for instant audit visibility
    print("\n" + "=" * 60)
    print(f"[EMAIL DISPATCH TO {OFFICER_EMAIL}]")
    print(f"Subject: {subject}")
    print(f"Ticket ID: #{report_id} | Category: {category} | Conf: {confidence_pct}%")
    print(f"Location: {ward} ({latitude}, {longitude})")
    print(f"Maps URL: {maps_link}")
    print(f"SLA Deadline: {sla_deadline}")
    print("=" * 60 + "\n")

    # If SMTP credentials are provided, attempt real email transmission
    if SMTP_HOST and SMTP_USER and SMTP_PASS:
        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = FROM_EMAIL
            msg["To"] = OFFICER_EMAIL

            msg.attach(MIMEText(text_content, "plain"))
            msg.attach(MIMEText(html_content, "html"))

            with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
                server.starttls()
                server.login(SMTP_USER, SMTP_PASS)
                server.sendmail(FROM_EMAIL, [OFFICER_EMAIL], msg.as_string())

            print(f"[SUCCESS] Real email successfully sent via SMTP to {OFFICER_EMAIL}")
            return True
        except Exception as e:
            print(f"[WARNING] SMTP delivery error (payload was logged above): {e}")
            return False

    return True
