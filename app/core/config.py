import os
from pydantic_settings import BaseSettings

from pydantic import field_validator

class Settings(BaseSettings):
    PROJECT_NAME: str = "HRMS Chatbot"
    DATABASE_URL: str = os.getenv("DATABASE_URL", "postgresql://user:password@localhost/hrms")
    SECRET_KEY: str = os.getenv("SECRET_KEY", "your-secret-key-for-jwt")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    @field_validator("DATABASE_URL", mode="before")
    @classmethod
    def sanitize_db_url(cls, v: str) -> str:
        if isinstance(v, str):
            # Strip pgbouncer parameter which psycopg2 doesn't support
            return v.replace("?pgbouncer=true", "").replace("&pgbouncer=true", "")
        return v
    
    class Config:
        case_sensitive = True

settings = Settings()
