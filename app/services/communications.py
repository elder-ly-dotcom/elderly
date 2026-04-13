import smtplib
from email.message import EmailMessage
from typing import Iterable

import httpx

from app.core.config import settings
from app.tasks.celery_app import celery_app


def _split_csv(value: str) -> list[str]:
    return [item.strip() for item in value.split(",") if item.strip()]


def get_admin_alert_emails() -> list[str]:
    configured = _split_csv(settings.ADMIN_ALERT_EMAILS)
    if configured:
        return configured
    if settings.FIRST_ADMIN_EMAIL:
        return [settings.FIRST_ADMIN_EMAIL]
    return []


def email_is_configured() -> bool:
    return bool(
        settings.EMAIL_ENABLED
        and settings.SMTP_HOST
        and settings.SMTP_PORT
        and settings.SMTP_USERNAME
        and settings.SMTP_PASSWORD
        and settings.EMAIL_FROM_ADDRESS
    )


def sms_is_configured() -> bool:
    return bool(
        settings.SMS_ENABLED
        and settings.TWILIO_ACCOUNT_SID
        and settings.TWILIO_AUTH_TOKEN
        and settings.TWILIO_FROM_NUMBER
    )


def normalize_phone_number(phone_number: str | None) -> str | None:
    if not phone_number:
        return None
    cleaned = "".join(char for char in phone_number if char.isdigit() or char == "+")
    if not cleaned:
        return None
    if cleaned.startswith("+"):
        return cleaned
    digits = "".join(char for char in cleaned if char.isdigit())
    if len(digits) == 10:
        return f"+91{digits}"
    return f"+{digits}" if digits else None


def send_email_sync(
    *,
    to_email: str,
    subject: str,
    text_body: str,
    html_body: str | None = None,
) -> dict[str, str]:
    if not email_is_configured():
        return {"status": "skipped", "reason": "email_not_configured", "to": to_email}

    message = EmailMessage()
    message["From"] = settings.EMAIL_FROM_ADDRESS
    message["To"] = to_email
    message["Subject"] = subject
    message.set_content(text_body)
    if html_body:
        message.add_alternative(html_body, subtype="html")

    if settings.SMTP_USE_SSL:
        with smtplib.SMTP_SSL(settings.SMTP_HOST, settings.SMTP_PORT) as smtp:
            smtp.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
            smtp.send_message(message)
    else:
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as smtp:
            smtp.starttls()
            smtp.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
            smtp.send_message(message)
    return {"status": "sent", "to": to_email}


def send_sms_sync(*, to_number: str, body: str) -> dict[str, str]:
    if not sms_is_configured():
        return {"status": "skipped", "reason": "sms_not_configured", "to": to_number}

    response = httpx.post(
        f"https://api.twilio.com/2010-04-01/Accounts/{settings.TWILIO_ACCOUNT_SID}/Messages.json",
        auth=(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN or ""),
        data={
            "To": to_number,
            "From": settings.TWILIO_FROM_NUMBER,
            "Body": body,
        },
        timeout=20.0,
    )
    response.raise_for_status()
    return {"status": "sent", "to": to_number}


def queue_email(
    *,
    recipients: Iterable[str | None],
    subject: str,
    text_body: str,
    html_body: str | None = None,
) -> None:
    for recipient in {item.strip() for item in recipients if item and item.strip()}:
        celery_app.send_task(
            "app.tasks.communications.send_email_notification",
            kwargs={
                "to_email": recipient,
                "subject": subject,
                "text_body": text_body,
                "html_body": html_body,
            },
        )


def queue_sms(*, recipients: Iterable[str | None], body: str) -> None:
    for recipient in {
        normalized
        for normalized in (normalize_phone_number(item) for item in recipients)
        if normalized
    }:
        celery_app.send_task(
            "app.tasks.communications.send_sms_notification",
            kwargs={"to_number": recipient, "body": body},
        )
