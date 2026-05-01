import spacy
import dateparser
from datetime import datetime, timedelta

try:
    nlp = spacy.load("en_core_web_sm")
except OSError:
    nlp = None

def extract_entities(message: str):
    entities = {
        "date_range": None,
        "team": None,
        "employee": None
    }
    
    if not nlp:
        return entities

    doc = nlp(message)
    
    # Simple date extraction
    # Keywords for date ranges
    if "this week" in message.lower():
        start = datetime.now() - timedelta(days=datetime.now().weekday())
        entities["date_range"] = (start.date(), datetime.now().date())
    elif "today" in message.lower():
        entities["date_range"] = (datetime.now().date(), datetime.now().date())
    elif "yesterday" in message.lower():
        yesterday = datetime.now() - timedelta(days=1)
        entities["date_range"] = (yesterday.date(), yesterday.date())
    elif "last week" in message.lower():
        end = datetime.now() - timedelta(days=datetime.now().weekday() + 1)
        start = end - timedelta(days=6)
        entities["date_range"] = (start.date(), end.date())
    
    # If no preset range, try to parse with dateparser
    if not entities["date_range"]:
        # Look for date entities in spaCy
        for ent in doc.ents:
            if ent.label_ == "DATE":
                parsed_date = dateparser.parse(ent.text)
                if parsed_date:
                    entities["date_range"] = (parsed_date.date(), parsed_date.date())
                    break

    return entities
