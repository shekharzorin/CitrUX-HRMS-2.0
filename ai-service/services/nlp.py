import spacy
from config.settings import settings

class NLPService:
    def __init__(self):
        try:
            self.nlp = spacy.load(settings.NLP_MODEL)
        except OSError:
            # Fallback if model not downloaded
            print(f"Downloading spaCy model {settings.NLP_MODEL}...")
            spacy.cli.download(settings.NLP_MODEL)
            self.nlp = spacy.load(settings.NLP_MODEL)

    def extract_intent_and_entities(self, text: str):
        doc = self.nlp(text.lower())
        
        # Simple rule-based intent detection for this prototype
        intent = "unknown"
        if any(token.lemma_ in ["leave", "holiday", "off"] for token in doc):
            if any(token.lemma_ in ["balance", "limit", "remaining"] for token in doc):
                intent = "leave_balance"
            elif any(token.lemma_ in ["apply", "request", "book"] for token in doc):
                intent = "apply_leave"
            elif any(token.lemma_ in ["on", "who", "today"] for token in doc):
                intent = "who_is_on_leave"
        
        elif any(token.lemma_ in ["attendance", "present", "clock"] for token in doc):
            intent = "attendance_status"
            
        elif any(token.lemma_ in ["payslip", "salary", "pay", "money"] for token in doc):
            intent = "get_payslip"

        # Entity extraction
        entities = {
            "dates": [ent.text for ent in doc.ents if ent.label_ == "DATE"],
            "names": [ent.text for ent in doc.ents if ent.label_ == "PERSON"]
        }

        return intent, entities

nlp_service = NLPService()
