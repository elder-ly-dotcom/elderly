from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "ELDERLY"
    API_V1_STR: str = "/api/v1"
    DATABASE_URL: str
    SYNC_DATABASE_URL: str
    REDIS_URL: str
    SECRET_KEY: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 60
    CELERY_TASKS_ENABLED: bool = True
    GEOFENCE_RADIUS_METERS: float = 100
    SOS_ALERT_EMAIL: str = "alerts@elderly.local"
    EMAIL_ENABLED: bool = True
    EMAIL_FROM_ADDRESS: str = "elderly.hello@gmail.com"
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 465
    SMTP_USERNAME: str = "elderly.hello@gmail.com"
    SMTP_PASSWORD: str | None = None
    SMTP_USE_SSL: bool = True
    ADMIN_ALERT_EMAILS: str = ""
    SMS_ENABLED: bool = False
    TWILIO_ACCOUNT_SID: str | None = None
    TWILIO_AUTH_TOKEN: str | None = None
    TWILIO_FROM_NUMBER: str | None = None
    BACKEND_CORS_ORIGINS: list[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://192.168.1.43:5173",
    ]
    BACKEND_CORS_ORIGIN_REGEX: str = r"^https?://(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+)(:\d+)?$"
    FIRST_ADMIN_EMAIL: str | None = None
    FIRST_ADMIN_PASSWORD: str | None = None
    FIRST_ADMIN_NAME: str = "Platform Admin"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )


settings = Settings()
