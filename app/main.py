from fastapi import FastAPI
from app.api import chat
from app.db.database import engine, Base, SessionLocal
from app.models import models
from app.core.config import settings
import datetime
import threading

app = FastAPI(title=settings.PROJECT_NAME)

app.include_router(chat.router, prefix="/api", tags=["chat"])

@app.get("/")
def read_root():
    return {"message": "Welcome to HRMS Chatbot API", "status": "online"}

@app.get("/health")
def health_check():
    return {"status": "ok"}

# Run DB initialization in background so it doesn't block startup
def _init_db():
    print("🔄 Running DB initialization in background thread...")
    try:
        Base.metadata.create_all(bind=engine)
        print("✅ Database tables verified.")
        _seed_data()
    except Exception as e:
        print(f"❌ DB Init Error (non-fatal): {e}")
        import traceback
        traceback.print_exc()

def _seed_data():
    db = SessionLocal()
    try:
        if db.query(models.User).count() == 0:
            print("🌱 Seeding initial data...")
            admin = models.User(name="Admin HR", role="admin", email="admin@example.com")
            manager = models.User(name="John Manager", role="manager", email="manager@example.com")
            employee = models.User(name="Alice Smith", role="employee", email="alice@example.com")
            db.add_all([admin, manager, employee])
            db.commit()

            team = models.Team(name="Engineering", manager_id=manager.id)
            db.add(team)
            db.commit()

            tm = models.TeamMember(team_id=team.id, user_id=employee.id)
            db.add(tm)
            db.commit()

            db.add(models.Attendance(user_id=employee.id, date=datetime.date.today(), hours=8.5))
            db.add(models.Attendance(user_id=employee.id, date=datetime.date.today() - datetime.timedelta(days=1), hours=7.0))
            db.add(models.Holiday(date=datetime.date(2026, 5, 1), name="Labor Day"))
            db.add(models.Holiday(date=datetime.date(2026, 12, 25), name="Christmas"))
            db.add(models.Task(user_id=employee.id, title="Submit Report", status="pending"))
            db.add(models.Task(user_id=employee.id, title="Review PR", status="pending"))
            db.commit()
            print("✅ Seeding complete.")
        else:
            print("ℹ️ Data already exists, skipping seed.")
    except Exception as e:
        print(f"❌ Seed Error (non-fatal): {e}")
    finally:
        db.close()

@app.on_event("startup")
def startup_event():
    print("🚀 HRMS Chatbot starting up...")
    # Fire-and-forget: DB init runs in background so /health responds immediately
    t = threading.Thread(target=_init_db, daemon=True)
    t.start()
    print("✅ Server ready. DB init running in background.")
