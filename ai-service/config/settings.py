import os
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

load_dotenv()

class Settings(BaseSettings):
    DATABASE_URL: str = (
        os.getenv("DIRECT_URL")
        if (os.getenv("DATABASE_URL") and "db.prisma.io" in os.getenv("DATABASE_URL") and os.getenv("DIRECT_URL"))
        else os.getenv("DATABASE_URL", "postgresql://user:pass@localhost:5432/postgres")
    )
    OLLAMA_BASE_URL: str = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
    OLLAMA_MODEL: str = os.getenv("OLLAMA_MODEL", "llama3")
    GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    NLP_MODEL: str = os.getenv("NLP_MODEL", "en_core_web_md")
    
    class Config:
        env_file = ".env"

settings = Settings()
