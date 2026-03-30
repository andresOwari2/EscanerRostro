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

# Add backend to sys.path so backend modules can be found
backend_dir = os.path.dirname(os.path.abspath(__file__))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)
    logger.info(f"Added {backend_dir} to sys.path")

from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
import json
import uvicorn
import datetime

from sqlalchemy import text
from database import init_db, get_db, User, FaceVector, AttendanceLog, AttendanceSession, Project, Survey, SessionLocal
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
        logger.info("Step 1: Initializing database tables (metadata.create_all)...")
        init_db()
        logger.info("Step 1: OK")
        
        # Auto-migration for existing tables using a manual session
        logger.info("Step 2: Checking schema migrations...")
        session = SessionLocal()
        try:
            # PostgreSQL syntax for IF NOT EXISTS
            session.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin INTEGER DEFAULT 0"))
            session.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS monthly_salary INTEGER DEFAULT 0"))
            session.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS project_id INTEGER"))
            session.commit()
            logger.info("Step 2: OK (Schema verified)")
        except Exception as migrate_error:
            logger.warning(f"Step 2: Migration warning: {migrate_error}")
            session.rollback()

        # Create default admin if not exists
        logger.info("Step 3: Verifying default admin user...")
        admin = session.query(User).filter(User.username == "admin").first()
        if not admin:
            new_admin = User(
                username="admin", 
                password_hash="1234", 
                full_name="Administrador Sistema",
                is_admin=1
            )
            session.add(new_admin)
            session.commit()
            logger.info("Step 3: Default admin created (admin / 1234)")
        else:
            logger.info("Step 3: Admin already exists")
        
        session.close()
        logger.info("--- DATABASE READY ---")
    except Exception as e:
        logger.error(f"FATAL during startup: {e}")
        logger.error(traceback.format_exc())
    
    logger.info("Startup sequence finished. Application ready for traffic.")
    
@app.get("/")
def health_check():
    return {"status": "ok", "message": "Face Attendance API is running"}

@app.post("/register/check_face")
async def check_face(
    image: str = Form(...),
    target_pos: str = Form(...)
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
        logger.error(f"Error in check_face: {e}")
        return {"face_detected": False, "detected_pos": "error", "message": str(e)}

@app.post("/register")
async def register(
    username: str = Form(...),
    password: str = Form(...),
    full_name: str = Form(...),
    images: list[str] = Form(...),
    db: Session = Depends(get_db)
):
    existing_user = db.query(User).filter(User.username == username).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Username already registered")

    new_user = User(username=username, password_hash=password, full_name=full_name)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

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
        db.delete(new_user)
        db.commit()
        raise HTTPException(status_code=400, detail="No face detected in provided images")

    db.commit()
    return {"message": "User registered successfully", "vectors_count": vectors_saved}

@app.post("/verify")
async def verify(
    image: str = Form(...),
    action: str = Form("entrada"),
    db: Session = Depends(get_db)
):
    img_bytes = face_logic.decode_base64_image(image)
    unknown_encoding = face_logic.get_face_encoding(img_bytes)
    
    if not unknown_encoding:
        raise HTTPException(status_code=400, detail="No face detected in camera")

    all_vectors = db.query(FaceVector).all()
    
    for vec in all_vectors:
        known_encoding = json.loads(vec.vector)
        if face_logic.compare_faces([known_encoding], unknown_encoding, tolerance=0.4):
            user = db.query(User).filter(User.id == vec.user_id).first()
            
            log = AttendanceLog(user_id=user.id, method="face", action=action)
            db.add(log)
            
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
            return {
                "status": "success", 
                "user": user.full_name, 
                "message": f"{action.capitalize()} registrada",
                "greeting": ""
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
    
    log = AttendanceLog(user_id=user.id, method="manual", action=action)
    db.add(log)
    
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

    return {
        "status": "success", 
        "user": user.full_name, 
        "message": f"{action.capitalize()} manual registrada",
        "greeting": ""
    }

@app.post("/ai/test")
async def ai_test(prompt: str = Form(...)):
    try:
        import google.generativeai as genai
        model = genai.GenerativeModel("gemini-1.5-flash")
        response = model.generate_content(prompt)
        return {"response": response.text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
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
    return {"message": "Proyecto creado", "status": "success"}

@app.delete("/admin/projects/{project_id}")
async def delete_project(project_id: int, db: Session = Depends(get_db)):
    proj = db.query(Project).filter(Project.id == project_id).first()
    if not proj:
        raise HTTPException(status_code=404, detail="Proyecto no hallado")
    
    db.query(User).filter(User.project_id == project_id).update({User.project_id: None})
    db.delete(proj)
    db.commit()
    return {"message": "Proyecto eliminado", "status": "success"}

@app.post("/admin/assign")
async def assign_project(user_id: int = Form(...), project_id: int = Form(...), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user: raise HTTPException(status_code=404, detail="Usuario no encontrado")
    user.project_id = project_id if project_id != 0 else None
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
        sessions = db.query(AttendanceSession).filter(
            AttendanceSession.user_id == u.id,
            AttendanceSession.check_in >= start_date
        ).all()
        total_seconds = 0
        for s in sessions:
            if s.check_in and s.check_out:
                total_seconds += (s.check_out - s.check_in).total_seconds()
        total_hours = total_seconds / 3600
        
        current_surveys = db.query(Survey).filter(Survey.user_id == u.id, Survey.timestamp >= start_date).all()
        prev_surveys = db.query(Survey).filter(Survey.user_id == u.id, Survey.timestamp >= prev_start_date, Survey.timestamp < start_date).all()
        
        def avg_score(survs):
            return sum([s.productivity for s in survs]) / len(survs) if survs else 0

        curr_avg = avg_score(current_surveys)
        prev_avg = avg_score(prev_surveys)
        
        trend = "stable"
        if curr_avg > prev_avg + 0.2: trend = "up"
        elif curr_avg < prev_avg - 0.2: trend = "down"
        
        hourly_cost = u.monthly_salary / 160
        expense = hourly_cost * total_hours
        
        report_data.append({
            "user_id": u.id,
            "name": u.full_name,
            "hours": round(total_hours, 2),
            "productivity": round(curr_avg, 2),
            "trend": trend,
            "estimated_cost": round(expense, 2)
        })
        
    return report_data
