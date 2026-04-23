from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from services.nlp import nlp_service
from services.ollama import ollama_service
from services.gemini import gemini_service
from services.openai_service import openai_service
from services.groq_service import groq_service
from handlers.main_handler import INTENT_HANDLERS
import logging
import json

# Setup Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Citrux HRMS AI Service")

class AskRequest(BaseModel):
    userId: str
    companyId: str
    message: str
    provider: str = "groq"  # Default: Groq (LLaMA 3 - open source, free, fastest)

@app.post("/ask")
async def ask(request: AskRequest):
    try:
        logger.info(f"Received message from user {request.userId} | provider: {request.provider}")

        # 1. NLP Analysis (Intent & Entities)
        intent, entities = nlp_service.extract_intent_and_entities(request.message)
        logger.info(f"Detected intent: {intent}")

        # 2. Handle Business Logic
        if intent in INTENT_HANDLERS:
            data = INTENT_HANDLERS[intent](request.userId, request.companyId, entities)
        else:
            data = {"message": "I'm sorry, I don't know how to handle that request yet."}
            intent = "fallback"

        # 3. Format Response based on selected Provider
        natural_response = None

        if request.provider == "groq":
            natural_response = groq_service.format_response(data, intent, request.message)
        elif request.provider == "gemini":
            natural_response = gemini_service.format_response(data, intent, request.message)
        elif request.provider == "openai":
            natural_response = openai_service.format_response(data, intent, request.message)
        elif request.provider == "ollama":
            try:
                natural_response = ollama_service.format_response(data, intent, request.message)
            except Exception as ollama_err:
                logger.warning(f"Ollama unavailable: {ollama_err}. Switching to cloud fallback.")
                natural_response = None

        # 4. Smart Fallback Chain: Groq -> Gemini -> OpenAI -> Raw Data
        if not natural_response:
            logger.info(f"Provider '{request.provider}' unavailable — running fallback chain")
            natural_response = groq_service.format_response(data, intent, request.message)
        if not natural_response:
            natural_response = gemini_service.format_response(data, intent, request.message)
        if not natural_response:
            natural_response = openai_service.format_response(data, intent, request.message)
        if not natural_response:
            # Last resort: return raw structured data
            natural_response = f"Here is the information I found:\n{json.dumps(data, indent=2)}"

        return {
            "response": natural_response,
            "intent": intent,
            "data": data
        }

    except Exception as e:
        logger.error(f"Error processing request: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal AI Processing Error")

@app.get("/health")
async def health():
    return {"status": "healthy", "default_provider": "groq (LLaMA 3 - open source)"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
