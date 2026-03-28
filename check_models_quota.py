import os
import google.generativeai as genai
from dotenv import load_dotenv

# Load API Key
load_dotenv()
api_key = os.getenv("gemini_APIKEY")

if not api_key:
    print("Error: gemini_APIKEY not found in .env")
    exit(1)

genai.configure(api_key=api_key)

print(f"--- Checking models for API Key: {api_key[:10]}... ---")

try:
    # List all models
    models = [m for m in genai.list_models() if 'generateContent' in m.supported_generation_methods]
    
    results = []
    
    for model_info in models:
        model_id = model_info.name
        simple_name = model_id.replace("models/", "")
        
        print(f"Testing {simple_name}...", end=" ", flush=True)
        
        try:
            model = genai.GenerativeModel(model_id)
            # Short prompt to minimize quota usage
            response = model.generate_content("Ping", generation_config={"max_output_tokens": 5})
            print("✅ WORKING")
            results.append({"model": simple_name, "status": "WORKING", "message": response.text.strip()})
        except Exception as e:
            error_msg = str(e)
            if "429" in error_msg:
                print("❌ QUOTA EXCEEDED (429)")
                results.append({"model": simple_name, "status": "QUOTA EXCEEDED", "message": "Rate limit reached"})
            elif "404" in error_msg:
                print("❌ NOT FOUND (404)")
                results.append({"model": simple_name, "status": "NOT FOUND", "message": "Model not available for this key"})
            else:
                print(f"❌ ERROR: {error_msg[:50]}...")
                results.append({"model": simple_name, "status": "ERROR", "message": error_msg[:100]})

    print("\n--- FINAL REPORT ---")
    working_models = [r['model'] for r in results if r['status'] == "WORKING"]
    if working_models:
        print(f"Available models with credit: {', '.join(working_models)}")
    else:
        print("No models currently have available quota.")

except Exception as e:
    print(f"General Error: {e}")
