from openai import OpenAI
from config.settings import settings
import json

class OpenAIService:
    def __init__(self):
        self.api_key = settings.OPENAI_API_KEY
        if self.api_key:
            self.client = OpenAI(api_key=self.api_key)
        else:
            self.client = None

    def format_response(self, context_data: dict, intent: str, original_query: str):
        if not self.client:
            return None

        prompt = f"""
        You are a professional HR Assistant for Citrux HRMS.
        
        Intent: {intent}
        Original Query: {original_query}
        Data from Database: {json.dumps(context_data)}
        
        Task: Convert the data into a natural, helpful, and professional response.
        Use a corporate but friendly tone.
        If data is empty, say "I couldn't find that information in our records."
        Keep it concise.
        """
        
        try:
            response = self.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.3,
                max_tokens=500
            )
            return response.choices[0].message.content
        except Exception as e:
            print(f"OpenAI Error: {e}")
            return None

openai_service = OpenAIService()
