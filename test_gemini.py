import os
from dotenv import load_dotenv
import google.generativeai as genai

# Load environment variables
load_dotenv(".env")
api_key = os.getenv("gemini_APIKEY")

if not api_key:
    print("Error: gemini_APIKEY not found in .env")
    exit(1)

genai.configure(api_key=api_key)

try:
    model = genai.GenerativeModel("gemini-1.5-flash")
    response = model.generate_content("Responde con una sola palabra: OK")
    print(f"Connection result: {response.text.strip()}")
except Exception as e:
    print(f"Error connecting to Gemini: {str(e)}")
