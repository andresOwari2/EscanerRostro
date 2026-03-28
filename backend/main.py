import sys
import os

# Add backend and site-packages to path
backend_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, backend_dir)

import logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
import json
import uvicorn

from database import init_db, get_db, User, FaceVector, AttendanceLog, AttendanceSession
import face_logic
import datetime
import os
from dotenv import load_dotenv
import google.generativeai as genai

# Load environment variables (searches in current or parent directory)
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

# Configure Gemini
api_key = os.getenv("gemini_APIKEY")
if api_key:
    genai.configure(api_key=api_key)
else:
    print("Warning: gemini_APIKEY not found in environment variables")

app = FastAPI(title="Face Attendance API")

# Enable CORS for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def startup():
    init_db()

@app.post("/register/check_face")
async def check_face(
    image: str = Form(...), # Base64 image
    target_pos: str = Form(...) # front, left, right, up
):
    try:
        img_bytes = face_logic.decode_base64_image(image)
        pos_data = face_logic.get_face_position(img_bytes)
        
        detected_pos = pos_data["position"]
        return {
            "face_detected": (detected_pos == target_pos and pos_data["distance"] == "ok"),
            "detected_pos": detected_pos,
            "distance_status": pos_data["distance"],
            "metrics": {
                "ratio_lr": pos_data["ratio_lr"],
                "dist_y": pos_data["dist_y"]
            },
            "box": pos_data.get("box"),
            "landmarks": pos_data.get("landmarks")
        }
    except Exception as e:
        return {"face_detected": False, "detected_pos": "error", "message": str(e)}

@app.post("/register")
async def register(
    username: str = Form(...),
    password: str = Form(...),
    full_name: str = Form(...),
    images: list[str] = Form(...), # List of base64 images
    db: Session = Depends(get_db)
):
    # Check if user exists
    existing_user = db.query(User).filter(User.username == username).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Username already registered")

    # Create User
    new_user = User(username=username, password_hash=password, full_name=full_name) # In production use hashing
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Process Images and Extract Vectors
    vectors_saved = 0
    for i, base64_img in enumerate(images):
        img_bytes = face_logic.decode_base64_image(base64_img)
        encoding = face_logic.get_face_encoding(img_bytes)
        if encoding:
            face_vec = FaceVector(
                user_id=new_user.id,
                vector=json.dumps(encoding),
                position_label=f"pos_{i+1}"
            )
            db.add(face_vec)
            vectors_saved += 1
    
    if vectors_saved < 1:
        # Rollback user if no face found in any image
        db.delete(new_user)
        db.commit()
        raise HTTPException(status_code=400, detail="No face detected in provided images")

    db.commit()
    return {"message": "User registered successfully", "vectors_count": vectors_saved}

@app.post("/verify")
async def verify(
    image: str = Form(...), # Base64 image
    action: str = Form("entrada"), # entrada or salida
    db: Session = Depends(get_db)
):
    img_bytes = face_logic.decode_base64_image(image)
    unknown_encoding = face_logic.get_face_encoding(img_bytes)
    
    if not unknown_encoding:
        raise HTTPException(status_code=400, detail="No face detected in camera")

    # This is a naive implementation: fetch all vectors and compare
    # In a real system, you'd use a vector DB or optimize this.
    all_vectors = db.query(FaceVector).all()
    
    for vec in all_vectors:
        known_encoding = json.loads(vec.vector)
        if face_logic.compare_faces([known_encoding], unknown_encoding, tolerance=0.5):
            user = db.query(User).filter(User.id == vec.user_id).first()
            
            # Register in General Log
            log = AttendanceLog(user_id=user.id, method="face", action=action)
            db.add(log)
            
            # Manage Session
            if action == "entrada":
                new_session = AttendanceSession(user_id=user.id, check_in=datetime.datetime.utcnow())
                db.add(new_session)
            else:
                # Find last open session to close
                last_session = db.query(AttendanceSession).filter(
                    AttendanceSession.user_id == user.id, 
                    AttendanceSession.check_out == None
                ).order_by(AttendanceSession.id.desc()).first()
                
                if last_session:
                    last_session.check_out = datetime.datetime.utcnow()
                else:
                    # Orphan exit
                    new_session = AttendanceSession(user_id=user.id, check_out=datetime.datetime.utcnow())
                    db.add(new_session)
            
            db.commit()
            
            # Gemini Greeting disabled by user request
            greeting = "" 
            # try:
            #     model = genai.GenerativeModel("gemini-2.5-flash")
            #     tipo_mensaje = "saludo de BIENVENIDA" if action == "entrada" else "mensaje de DESPEDIDA"
            #     prompt = (
            #         f"Genera un {tipo_mensaje} corto, creativo y orientado a PROGRAMADORES/DEVS para {user.full_name} "
            #         f"que acaba de marcar su {action} en el trabajo. Usa jerga técnica, metáforas de código "
            #         f"(git, syntax, runtime, shutdown, startup, merge) o chistes de dev. Máximo 15 palabras."
            #     )
            #     response = model.generate_content(prompt)
            #     greeting = response.text.strip()
            # except Exception as e:
            #     print(f"Error generating greeting: {e}")

            return {
                "status": "success", 
                "user": user.full_name, 
                "message": f"{action.capitalize()} registrada",
                "greeting": greeting
            }

    return {"status": "fail", "message": "User not recognized"}

@app.post("/login_manual")
async def login_manual(
    username: str = Form(...),
    password: str = Form(...),
    action: str = Form("entrada"),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.username == username, User.password_hash == password).first()
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Register manual in General Log
    log = AttendanceLog(user_id=user.id, method="manual", action=action)
    db.add(log)
    
    # Manage Session
    if action == "entrada":
        new_session = AttendanceSession(user_id=user.id, check_in=datetime.datetime.utcnow())
        db.add(new_session)
    else:
        last_session = db.query(AttendanceSession).filter(
            AttendanceSession.user_id == user.id, 
            AttendanceSession.check_out == None
        ).order_by(AttendanceSession.id.desc()).first()
        
        if last_session:
            last_session.check_out = datetime.datetime.utcnow()
        else:
            new_session = AttendanceSession(user_id=user.id, check_out=datetime.datetime.utcnow())
            db.add(new_session)

    db.commit()

    # Gemini Greeting disabled by user request
    greeting = ""
    # try:
    #     model = genai.GenerativeModel("gemini-2.5-flash")
    #     tipo_mensaje = "saludo de BIENVENIDA" if action == "entrada" else "mensaje de DESPEDIDA"
    #     prompt = (
    #         f"Genera un {tipo_mensaje} corto, creativo y orientado a PROGRAMADORES/DEVS para {user.full_name} "
    #         f"que acaba de marcar su {action} manual en el trabajo. Usa jerga técnica, metáforas de código "
    #         f"(git, syntax, runtime, shutdown, startup, merge) o chistes de dev. Máximo 15 palabras."
    #     )
    #     response = model.generate_content(prompt)
    #     greeting = response.text.strip()
    # except Exception as e:
    #     print(f"Error generating greeting: {e}")

    return {
        "status": "success", 
        "user": user.full_name, 
        "message": f"{action.capitalize()} manual registrada",
        "greeting": greeting
    }

@app.post("/ai/test")
async def ai_test(prompt: str = Form(...)):
    try:
        model = genai.GenerativeModel("gemini-2.5-flash")
        response = model.generate_content(prompt)
        return {"response": response.text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    # Render assigns a dynamic port via the PORT environment variable
    port = int(os.environ.get("PORT", 8001))
    uvicorn.run(app, host="0.0.0.0", port=port)
