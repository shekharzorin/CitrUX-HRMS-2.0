from fastapi import FastAPI
from app.api import chat
from app.db.database import engine, Base, SessionLocal
from app.models import models
from app.core.config import settings
import datetime

app = FastAPI(title=settings.PROJECT_NAME)

app.include_router(chat.router, prefix="/api", tags=["chat"])

@app.get("/")
def read_root():
    return {"message": "Welcome to HRMS Chatbot API", "status": "online"}

# Create database tables
@app.on_event("startup")
def startup_event():
    print("🚀 Chatbot starting up...")
    try:
        print("Creating database tables...")
        Base.metadata.create_all(bind=engine)
        print("Database tables verified.")
        seed_data()
    except Exception as e:
        print(f"❌ Startup Error: {e}")
        import traceback
        traceback.print_exc()

def seed_data():
    print("Seeding data if needed...")
    db = SessionLocal()
    try:
        # Check if data exists
        if db.query(models.User).count() == 0:
            # Seed Users
            admin = models.User(name="Admin HR", role="admin", email="admin@example.com")
            manager = models.User(name="John Manager", role="manager", email="manager@example.com")
            employee = models.User(name="Alice Smith", role="employee", email="alice@example.com")
            db.add_all([admin, manager, employee])
            db.commit()
            
            # Seed Team
            team = models.Team(name="Engineering", manager_id=manager.id)
            db.add(team)
            db.commit()
            
            # Seed Team Members
            tm = models.TeamMember(team_id=team.id, user_id=employee.id)
            db.add(tm)
            db.commit()
            
            # Seed Attendance
            db.add(models.Attendance(user_id=employee.id, date=datetime.date.today(), hours=8.5))
            db.add(models.Attendance(user_id=employee.id, date=datetime.date.today() - datetime.timedelta(days=1), hours=7.0))
            
            # Seed Holiday
            db.add(models.Holiday(date=datetime.date(2026, 5, 1), name="Labor Day"))
            db.add(models.Holiday(date=datetime.date(2026, 12, 25), name="Christmas"))
            
            # Seed Tasks
            db.add(models.Task(user_id=employee.id, title="Submit Report", status="pending"))
            db.add(models.Task(user_id=employee.id, title="Review PR", status="pending"))
            
            db.commit()
    finally:
        db.close()
