import spacy
import re

# Load spaCy model
try:
    nlp = spacy.load("en_core_web_sm")
except OSError:
    # Fallback if model not downloaded yet
    nlp = None

INTENT_KEYWORDS = {
    "work_hours_query": ["hours", "work", "worked", "duration", "time"],
    "attendance_query": ["attendance", "present", "absent", "login", "log in"],
    "leave_query": ["leave", "vacation", "off", "balance"],
    "team_leave_query": ["team", "who", "leave", "absent"],
    "task_query": ["task", "todo", "pending", "assigned"],
    "holiday_query": ["holiday", "tomorrow", "next", "off day"]
}

def detect_intent(message: str):
    message = message.lower()
    
    # Priority for Team Leave vs User Leave
    if "team" in message and ("leave" in message or "absent" in message or "off" in message):
        return "team_leave_query"
    
    if "hours" in message or ("how many" in message and "work" in message):
        return "work_hours_query"
    
    if "leave" in message or "vacation" in message:
        return "leave_query"
    
    if "task" in message or "todo" in message or "pending" in message:
        return "task_query"
    
    if "holiday" in message:
        return "holiday_query"
    
    if "attendance" in message or "login" in message or "log in" in message:
        return "attendance_query"
        
    return "unknown_query"
