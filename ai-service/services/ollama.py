import requests
import json
from config.settings import settings

class OllamaService:
    def __init__(self):
        self.base_url = f"{settings.OLLAMA_BASE_URL}/api/generate"
        self.model = settings.OLLAMA_MODEL

    def format_response(self, context_data: dict, intent: str, original_query: str):
        prompt = f"""
        You are a friendly HR Assistant for Citrux HRMS.
        
        Intent: {intent}
        Original Query: {original_query}
        Data from Database: {json.dumps(context_data)}
        
        Task: Convert the data into a natural, helpful, and professional response.
        If data is empty, politely say you couldn't find the information.
        Do not make up facts. Only use the data provided.
        """
        
        try:
            payload = {
                "model": self.model,
                "prompt": prompt,
                "stream": False
            }
            response = requests.post(self.base_url, json=payload, timeout=30)
            if response.status_code == 200:
                return response.json().get("response", "I have the data but couldn't format it nicely.")
            return f"System Response: {json.dumps(context_data)}"
        except Exception as e:
            print(f"Ollama Error: {e}")
            return f"I found this in the records: {json.dumps(context_data)}"

ollama_service = OllamaService()
