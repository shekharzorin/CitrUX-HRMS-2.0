from groq import Groq
from config.settings import settings
import json

class GroqService:
    def __init__(self):
        self.api_key = settings.GROQ_API_KEY
        if self.api_key:
            self.client = Groq(api_key=self.api_key)
        else:
            self.client = None

    def format_response(self, context_data: dict, intent: str, original_query: str):
        if not self.client:
            return None

        prompt = f"""You are a friendly HR Assistant for Citrux HRMS.

Intent: {intent}
Original Query: {original_query}
Data from Database: {json.dumps(context_data)}

Task: Convert the data into a natural, helpful, and professional response.
If data is empty, politely say you couldn't find the information.
Do not make up facts. Only use the data provided.
Keep the response concise and friendly."""

        try:
            response = self.client.chat.completions.create(
                model="llama3-8b-8192",   # Open source LLaMA 3 by Meta, running on Groq
                messages=[{"role": "user", "content": prompt}],
                temperature=0.3,
                max_tokens=500
            )
            return response.choices[0].message.content
        except Exception as e:
            print(f"Groq Error: {e}")
            return None

groq_service = GroqService()
