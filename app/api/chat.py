from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.db.database import get_db
from app.nlp.intent import detect_intent
from app.nlp.entity import extract_entities
from app.services import hrms_service
from app.models.models import User

router = APIRouter()

class ChatRequest(BaseModel):
    user_id: int
    message: str

class ChatResponse(BaseModel):
    intent: str
    response: str

@router.post("/chat", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest, db: Session = Depends(get_db)):
    # 1. Fetch User and Role
    user = db.query(User).filter(User.id == request.user_id).first()
    if not user:
        # For demo purposes, if user not found, we'll create a default one or error out
        # Here we'll just error out as it's a production-ready template
        raise HTTPException(status_code=404, detail="User not found")

    # 2. Detect Intent
    intent = detect_intent(request.message)
    
    # 3. Extract Entities
    entities = extract_entities(request.message)
    
    # 4. Route to Service based on Intent and Role
    response_text = "I'm sorry, I couldn't understand that. Could you please rephrase?"
    
    if intent == "work_hours_query":
        response_text = hrms_service.get_user_hours(db, user.id, entities["date_range"])
        
    elif intent == "leave_query":
        response_text = hrms_service.get_leave_balance(db, user.id)
        
    elif intent == "team_leave_query":
        if user.role not in ["manager", "admin"]:
            response_text = "Only managers or HR can check team leave status."
        else:
            response_text = hrms_service.get_team_on_leave(db, user.id)
            
    elif intent == "task_query":
        response_text = hrms_service.get_pending_tasks(db, user.id)
        
    elif intent == "holiday_query":
        response_text = hrms_service.get_next_holiday(db)
        
    elif intent == "attendance_query":
        if "who" in request.message.lower() and "didn't" in request.message.lower():
            if user.role not in ["manager", "admin"]:
                response_text = "Only managers can see who didn't log in."
            else:
                response_text = hrms_service.get_who_didnt_log_in(db, user.id)
        else:
            response_text = "Your attendance is marked correctly for today."

    return {
        "intent": intent,
        "response": response_text
    }
