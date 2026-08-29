"""
SMTP email sending — currently just password-reset emails. Uses stdlib
smtplib/email (no new dependency), configured via env vars:

  SMTP_HOST, SMTP_PORT, SMTP_USERNAME, SMTP_PASSWORD, SMTP_FROM_EMAIL,
  SMTP_USE_TLS (default true)

If SMTP_HOST isn't set (not configured yet), the email is logged instead of
sent — this keeps the whole forgot/reset-password flow testable end-to-end
before real credentials are added, and starts actually sending the moment
they are, with no code change.
"""

import logging
import os
import smtplib
from email.mime.text import MIMEText

logger = logging.getLogger(__name__)


def _smtp_configured() -> bool:
    return bool(os.getenv("SMTP_HOST"))


def send_password_reset_email(to_email: str, reset_link: str) -> None:
    subject = "Reset your password"
    body = (
        "We received a request to reset your password.\n\n"
        f"Reset it here: {reset_link}\n\n"
        "If you didn't request this, you can safely ignore this email — "
        "your password will not be changed."
    )

    if not _smtp_configured():
        logger.warning(
            "SMTP not configured (SMTP_HOST unset) — logging the reset link instead of emailing it."
        )
        logger.warning("Password reset link for %s: %s", to_email, reset_link)
        return

    host = os.getenv("SMTP_HOST")
    port = int(os.getenv("SMTP_PORT", "587"))
    username = os.getenv("SMTP_USERNAME")
    password = os.getenv("SMTP_PASSWORD")
    from_email = os.getenv("SMTP_FROM_EMAIL", username or "no-reply@localhost")
    use_tls = os.getenv("SMTP_USE_TLS", "true").lower() != "false"

    message = MIMEText(body)
    message["Subject"] = subject
    message["From"] = from_email
    message["To"] = to_email

    try:
        with smtplib.SMTP(host, port, timeout=10) as server:
            if use_tls:
                server.starttls()
            if username and password:
                server.login(username, password)
            server.sendmail(from_email, [to_email], message.as_string())
    except Exception as e:
        # Never let an SMTP failure surface details to the caller — the
        # forgot-password endpoint always returns the same generic response
        # regardless of what happens here (see auth_routes.py).
        logger.warning("Failed to send password reset email to %s: %s", to_email, e)
