# Citrux HRMS AI Microservice

This service provides Natural Language Understanding and Deterministic HR Logic for the Citrux HRMS platform.

## Prerequisites

1. **Python 3.10+**
2. **Ollama**: Installed and running locally ([ollama.com](https://ollama.com))
3. **spaCy Model**: Will be downloaded automatically on first run.

## Setup

1. Navigate to the service directory:
   ```bash
   cd ai-service
   ```

2. Create a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # Windows: venv\Scripts\activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Configure `.env`:
   Create a `.env` file with your database credentials:
   ```env
   DATABASE_URL=postgresql://postgres:[password]@aws-1-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true
   OLLAMA_BASE_URL=http://localhost:11434
   OLLAMA_MODEL=llama3
   ```

## Running the Service

```bash
python main.py
```
The service will be available at `http://localhost:8000`.

## Sample API Requests

### 1. Check Leave Balance
**POST** `http://localhost:8000/ask`
```json
{
  "userId": "user-uuid",
  "companyId": "company-uuid",
  "message": "What is my leave balance?"
}
```

### 2. Check Who's Out Today
**POST** `http://localhost:8000/ask`
```json
{
  "userId": "user-uuid",
  "companyId": "company-uuid",
  "message": "Who is on leave today?"
}
```

## Architecture Notes

- **NLP Layer**: Uses spaCy for fast, reliable intent classification and entity extraction.
- **Logic Layer**: Handlers in `handlers/` ensure that HR rules are executed deterministically by querying the database directly.
- **LLM Layer**: Ollama is used *only* to take the structured database results and turn them into a friendly, conversational message. This prevents "AI hallucinations" while maintaining a premium chat experience.
