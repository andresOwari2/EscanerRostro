import sys
import os
import logging
import traceback
from dotenv import load_dotenv

# Setup logging ASAP
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Load environment variables FIRST before database imports
env_path = os.path.join(os.path.dirname(__file__), "..", ".env")
if os.path.exists(env_path):
    load_dotenv(env_path, override=False)
    logger.info("Loaded local .env file (non-override mode)")
else:
    logger.info("No local .env file found, using system environment variables")

from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
import json
import uvicorn
import datetime

from database import init_db, get_db, User, FaceVector, AttendanceLog, AttendanceSession, Project, Survey
import face_logic
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
    logger.info("--- APPLICATION STARTUP ---")
    try:
        logger.info("Initializing database...")
        init_db()
        
        # Create default admin if not exists
        db = next(get_db())
        admin = db.query(User).filter(User.username == "admin").first()
        if not admin:
            logger.info("Creating default admin user...")
            new_admin = User(
                username="admin", 
                password_hash="1234", # In production use hashing
                full_name="Administrador Sistema",
                is_admin=1
            )
            db.add(new_admin)
            db.commit()
            logger.info("Admin user created successfully.")
        
        logger.info("Database initialized successfully.")
    except Exception as e:
        logger.error(f"FATAL: Database initialization failed: {e}")
        # We don't raise here to allow the process to stay alive 
        # so we can see the logs in Render, or let the health check fail naturally.
    
    logger.info("Startup sequence complete.")
    
@app.get("/")
def health_check():
    return {"status": "ok", "message": "Face Attendance API is running"}

@app.post("/register/check_face")
async def check_face(
    image: str = Form(...), # Base64 image
    target_pos: str = Form(...) # front, left, right, up
):
    try:
        img_bytes = face_logic.decode_base64_image(image)
        pos_data = face_logic.get_face_position(img_bytes)
        
        detected_pos = pos_data["position"]
        logger.info(f"Face check: detected={detected_pos}, distance={pos_data['distance']}")
        
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
        logger.error(f"Error in check_face: {e}\n{traceback.format_exc()}")
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
        logger.warning("Verify: No face encoding extracted from image")
        raise HTTPException(status_code=400, detail="No face detected in camera")

    # This is a naive implementation: fetch all vectors and compare
    # In a real system, you'd use a vector DB or optimize this.
    all_vectors = db.query(FaceVector).all()
    
    for vec in all_vectors:
        known_encoding = json.loads(vec.vector)
        if face_logic.compare_faces([known_encoding], unknown_encoding, tolerance=0.4):
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

# --- ADMIN ENDPOINTS ---

@app.get("/admin/users")
async def get_admin_users(db: Session = Depends(get_db)):
    users = db.query(User).all()
    return [{
        "id": u.id,
        "username": u.username,
        "full_name": u.full_name,
        "monthly_salary": u.monthly_salary,
        "is_admin": u.is_admin,
        "project_id": u.project_id
    } for u in users]

@app.get("/admin/projects")
async def get_projects(db: Session = Depends(get_db)):
    return db.query(Project).all()

@app.post("/admin/projects")
async def create_project(name: str = Form(...), description: str = Form(""), db: Session = Depends(get_db)):
    project = Project(name=name, description=description)
    db.add(project)
    db.commit()
    return {"message": "Proyecto creado"}

@app.post("/admin/assign")
async def assign_project(user_id: int = Form(...), project_id: int = Form(...), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user: raise HTTPException(status_code=404, detail="Usuario no encontrado")
    user.project_id = project_id
    db.commit()
    return {"message": "Proyecto asignado"}

@app.post("/admin/salary")
async def update_salary(user_id: int = Form(...), salary: int = Form(...), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user: raise HTTPException(status_code=404, detail="Usuario no encontrado")
    user.monthly_salary = salary
    db.commit()
    return {"message": "Sueldo actualizado"}

@app.post("/admin/surveys")
async def submit_survey(
    user_id: int = Form(...),
    project_id: int = Form(...),
    productivity: int = Form(...),
    quality: int = Form(...),
    teamwork: int = Form(...),
    problem_solving: int = Form(...),
    punctuality: int = Form(...),
    comments: str = Form(""),
    db: Session = Depends(get_db)
):
    survey = Survey(
        user_id=user_id, project_id=project_id,
        productivity=productivity, quality=quality, teamwork=teamwork,
        problem_solving=problem_solving, punctuality=punctuality,
        comments=comments
    )
    db.add(survey)
    db.commit()
    return {"message": "Encuesta guardada"}

@app.get("/admin/reports")
async def get_reports(project_id: int, period: str = "monthly", db: Session = Depends(get_db)):
    users = db.query(User).filter(User.project_id == project_id).all()
    now = datetime.datetime.utcnow()
    
    if period == "weekly": delta = datetime.timedelta(days=7)
    elif period == "monthly": delta = datetime.timedelta(days=30)
    else: delta = datetime.timedelta(days=365)
    
    start_date = now - delta
    prev_start_date = start_date - delta
    
    report_data = []
    for u in users:
        # 1. Total Hours
        sessions = db.query(AttendanceSession).filter(
            AttendanceSession.user_id == u.id,
            AttendanceSession.check_in >= start_date
        ).all()
        total_seconds = 0
        for s in sessions:
            if s.check_in and s.check_out:
                total_seconds += (s.check_out - s.check_in).total_seconds()
        total_hours = total_seconds / 3600
        
        # 2. Avg Survey Productivity
        current_surveys = db.query(Survey).filter(Survey.user_id == u.id, Survey.timestamp >= start_date).all()
        prev_surveys = db.query(Survey).filter(Survey.user_id == u.id, Survey.timestamp >= prev_start_date, Survey.timestamp < start_date).all()
        
        def avg_score(survs):
            if not survs: return 0
            return sum([s.productivity + s.quality + s.teamwork + s.problem_solving + s.punctuality for s in survs]) / (len(survs) * 5)

        curr_avg = avg_score(current_surveys)
        prev_avg = avg_score(prev_surveys)
        
        trend = "stable"
        if curr_avg > prev_avg + 0.2: trend = "up"
        elif curr_avg < prev_avg - 0.2: trend = "down"
        
        # 3. Estimated Expenses (Salary/160 hours * actual hours)
        hourly_cost = u.monthly_salary / 160
        expense = hourly_cost * total_hours
        
        report_data.append({
            "user_id": u.id,
            "name": u.full_name,
            "hours": round(total_hours, 2),
            "productivity": round(curr_avg, 2),
            "trend": trend,
            "estimated_cost": round(expense, 2),
            "salary": u.monthly_salary
        })
        
    return report_data
