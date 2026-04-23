import google.generativeai as genai
from config.settings import settings
import json

class GeminiService:
    def __init__(self):
        self.api_key = settings.GEMINI_API_KEY
        if self.api_key:
            genai.configure(api_key=self.api_key)
            self.model = genai.GenerativeModel('gemini-1.5-flash')
        else:
            self.model = None

    def format_response(self, context_data: dict, intent: str, original_query: str):
        if not self.model:
            return None

        prompt = f"""
        You are a friendly HR Assistant for Citrux HRMS.
        
        Intent: {intent}
        Original Query: {original_query}
        Data from Database: {json.dumps(context_data)}
        
        Task: Convert the data into a natural, helpful, and professional response.
        If data is empty, politely say you couldn't find the information.
        Do not make up facts. Only use the data provided.
        Keep the response concise and friendly.
        """
        
        try:
            response = self.model.generate_content(prompt)
            return response.text
        except Exception as e:
            print(f"Gemini Error: {e}")
            return None

gemini_service = GeminiService()
