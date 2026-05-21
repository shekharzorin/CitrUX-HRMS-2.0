import os
from pydantic_settings import BaseSettings

from pydantic import field_validator

class Settings(BaseSettings):
    PROJECT_NAME: str = "HRMS Chatbot"
    DATABASE_URL: str = (
        os.getenv("DIRECT_URL")
        if (os.getenv("DATABASE_URL") and "db.prisma.io" in os.getenv("DATABASE_URL") and os.getenv("DIRECT_URL"))
        else os.getenv("DATABASE_URL", "postgresql://user:password@localhost/hrms")
    )
    SECRET_KEY: str = os.getenv("SECRET_KEY", "your-secret-key-for-jwt")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    @field_validator("DATABASE_URL", mode="before")
    @classmethod
    def sanitize_db_url(cls, v: str) -> str:
        if isinstance(v, str):
            print(f"DEBUG: Sanitizing DATABASE_URL (length: {len(v)})")
            # 1. Fix postgres:// -> postgresql:// for SQLAlchemy compatibility
            if v.startswith("postgres://"):
                v = v.replace("postgres://", "postgresql://", 1)
            
            # 2. Use urllib to robustly remove pgbouncer and other incompatible params
            from urllib.parse import urlparse, urlunparse, parse_qsl, urlencode
            try:
                u = urlparse(v)
                query = dict(parse_qsl(u.query))
                if "pgbouncer" in query:
                    del query["pgbouncer"]
                v = urlunparse(u._replace(query=urlencode(query)))
            except Exception as e:
                print(f"DEBUG: URL parsing failed: {e}")
        return v
    
    class Config:
        case_sensitive = True

settings = Settings()
