from fastapi import FastAPI, HTTPException, Body
from pydantic import BaseModel
from services.nlp import nlp_service
from services.ollama import ollama_service
from handlers.main_handler import INTENT_HANDLERS
import logging

# Setup Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Citrux HRMS AI Service")

class AskRequest(BaseModel):
    userId: str
    companyId: str
    message: str

@app.post("/ask")
async def ask(request: AskRequest):
    try:
        logger.info(f"Received message from user {request.userId} in company {request.companyId}")
        
        # 1. NLP Analysis (Intent & Entities)
        intent, entities = nlp_service.extract_intent_and_entities(request.message)
        logger.info(f"Detected intent: {intent}")

        # 2. Handle Business Logic
        if intent in INTENT_HANDLERS:
            data = INTENT_HANDLERS[intent](request.userId, request.companyId, entities)
        else:
            data = {"message": "I'm sorry, I don't know how to handle that request yet."}
            intent = "fallback"

        # 3. Format Response with Ollama
        natural_response = ollama_service.format_response(data, intent, request.message)

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
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
