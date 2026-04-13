from app.services.communications import send_email_sync, send_sms_sync
from app.tasks.celery_app import celery_app


@celery_app.task(name="app.tasks.communications.send_email_notification")
def send_email_notification(
    to_email: str,
    subject: str,
    text_body: str,
    html_body: str | None = None,
) -> dict[str, str]:
    return send_email_sync(
        to_email=to_email,
        subject=subject,
        text_body=text_body,
        html_body=html_body,
    )


@celery_app.task(name="app.tasks.communications.send_sms_notification")
def send_sms_notification(to_number: str, body: str) -> dict[str, str]:
    return send_sms_sync(to_number=to_number, body=body)
