import sys
import os
import logging
import traceback

# Setup logging ASAP for Render diagnostics
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

logger.info(f"--- RENDER STARTUP DIAGNOSTICS ---")
logger.info(f"CWD: {os.getcwd()}")
logger.info(f"Python Version: {sys.version}")

# Add backend to path robustly
backend_dir = os.path.dirname(os.path.abspath(__file__))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)
    logger.info(f"Added {backend_dir} to sys.path")

# The system now uses OpenCV (YuNet + SFace) instead of dlib to reduce RAM usage.
try:
    import cv2
    logger.info(f"OpenCV version: {cv2.__version__}")
except ImportError:
    logger.error("OpenCV not found in environment")

from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
import json
import uvicorn

from database import init_db, get_db, User, FaceVector, AttendanceLog, AttendanceSession, Admin, WorkSchedule, ProductivityRating, CompanyGoal
import face_logic
import datetime
from sqlalchemy import func, extract
from decimal import Decimal
import os
from dotenv import load_dotenv
import google.generativeai as genai
from passlib.context import CryptContext

# Auth setup
pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")

def verify_password(plain, hashed):
    return pwd_context.verify(plain, hashed)

def get_password_hash(password):
    return pwd_context.hash(password)

# Load environment variables from .env file ONLY if they are not already set in the system
# This prevents a local .env file from overriding Render's environment variables
env_path = os.path.join(os.path.dirname(__file__), "..", ".env")
if os.path.exists(env_path):
    load_dotenv(env_path, override=False)
    logger.info("Loaded local .env file (non-override mode)")
else:
    logger.info("No local .env file found, using system environment variables")

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
    logger.info("--- APPLICATION STARTUP ---")
    try:
        logger.info("Initializing database...")
        init_db()
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
            
            if not user.is_active:
                logger.warning(f"Verify: User {user.username} is inactive")
                return {"status": "error", "title": "Cuenta Inactiva", "message": "Tu cuenta ha sido desactivada por el administrador.", "user": user.full_name}

            # Determine Punctuality Status
            attendance_status = "Puntual"
            if action == "entrada":
                schedule = db.query(WorkSchedule).filter(WorkSchedule.user_id == user.id).first()
                if schedule:
                    now_time = datetime.datetime.utcnow().time()
                    if now_time > schedule.start_time:
                        attendance_status = "Tardanza"

            # Register in General Log
            log = AttendanceLog(user_id=user.id, method="facial", action=action, status=attendance_status)
            db.add(log)
            
            # Manage Session with Strict Control
            last_session = db.query(AttendanceSession).filter(
                AttendanceSession.user_id == user.id, 
                AttendanceSession.check_out == None
            ).order_by(AttendanceSession.id.desc()).first()

            if action == "entrada":
                if last_session:
                    return {
                        "status": "error",
                        "title": "Sesión Activa",
                        "message": f"{user.full_name}, ya tienes una entrada registrada. Debes marcar salida primero.",
                        "user": user.full_name
                    }
                new_session = AttendanceSession(user_id=user.id, check_in=datetime.datetime.utcnow())
                db.add(new_session)
                msg_action = "entrada registrada"
                title_action = "¡Bienvenido!"
            else:
                if not last_session:
                    return {
                        "status": "error",
                        "title": "Sin Entrada",
                        "message": f"{user.full_name}, no tienes ninguna entrada activa. Marca entrada primero.",
                        "user": user.full_name
                    }
                last_session.check_out = datetime.datetime.utcnow()
                msg_action = "salida registrada"
                title_action = "¡Hasta pronto!"
            
            db.commit()
            
            return {
                "status": "success",
                "title": title_action,
                "message": f"{user.full_name}, tu {msg_action} correctamente.",
                "user": user.full_name
            }
            
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

            if action == "entrada":
                title = "¡Bienvenido!"
                msg = f"{user.full_name}, tu entrada ha sido registrada correctamente."
            else:
                title = "¡Hasta pronto!"
                msg = f"{user.full_name}, tu salida ha sido registrada correctamente."

            return {
                "status": "success", 
                "title": title,
                "user": user.full_name, 
                "message": msg,
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
    
    # Determine Punctuality Status
    attendance_status = "Puntual"
    if action == "entrada":
        schedule = db.query(WorkSchedule).filter(WorkSchedule.user_id == user.id).first()
        if schedule:
            now_time = datetime.datetime.utcnow().time()
            if now_time > schedule.start_time:
                attendance_status = "Tardanza"

    # Register manual in General Log
    log = AttendanceLog(user_id=user.id, method="manual", action=action, status=attendance_status)
    db.add(log)
    
    # Manage Session with Strict Control
    last_session = db.query(AttendanceSession).filter(
        AttendanceSession.user_id == user.id, 
        AttendanceSession.check_out == None
    ).order_by(AttendanceSession.id.desc()).first()

    if action == "entrada":
        if last_session:
            return {
                "status": "error",
                "title": "Sesión Activa",
                "message": f"{user.full_name}, ya tienes una entrada registrada. Debes marcar salida primero.",
                "user": user.full_name
            }
        new_session = AttendanceSession(user_id=user.id, check_in=datetime.datetime.utcnow())
        db.add(new_session)
        msg_action = "entrada registrada"
        title_action = "¡Bienvenido!"
    else:
        if not last_session:
            return {
                "status": "error",
                "title": "Sin Entrada",
                "message": f"{user.full_name}, no tienes ninguna entrada activa. Marca entrada primero.",
                "user": user.full_name
            }
        last_session.check_out = datetime.datetime.utcnow()
        msg_action = "salida registrada"
        title_action = "¡Hasta pronto!"

    db.commit()

    return {
        "status": "success", 
        "title": title_action,
        "user": user.full_name, 
        "message": f"{user.full_name}, tu {msg_action} (manual) correctamente.",
        "greeting": ""
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

@app.post("/admin/login")
async def admin_login(username: str = Form(...), password: str = Form(...), db: Session = Depends(get_db)):
    admin = db.query(Admin).filter(Admin.username == username).first()
    if not admin or not verify_password(password, admin.password_hash):
        raise HTTPException(status_code=401, detail="Credenciales de administrador inválidas")
    return {"status": "success", "message": "Login exitoso", "admin": admin.username}

@app.get("/admin/users")
async def get_admin_users(db: Session = Depends(get_db)):
    users = db.query(User).all()
    result = []
    for u in users:
        result.append({
            "id": u.id,
            "username": u.username,
            "full_name": u.full_name,
            "dni": u.dni,
            "base_salary": float(u.base_salary or 0),
            "is_active": u.is_active,
            "created_at": u.created_at
        })
    return result

@app.put("/admin/users/{user_id}")
async def update_user(
    user_id: int,
    full_name: str = Form(None),
    dni: str = Form(None),
    salary: float = Form(None),
    is_active: bool = Form(None),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    if full_name: user.full_name = full_name
    if dni: user.dni = dni
    if salary is not None: user.base_salary = Decimal(str(salary))
    if is_active is not None: user.is_active = is_active
    
    db.commit()
    return {"message": "Usuario actualizado correctamente"}

@app.post("/admin/ratings")
async def rate_user(user_id: int = Form(...), rating: int = Form(...), comment: str = Form(""), db: Session = Depends(get_db)):
    new_rating = ProductivityRating(user_id=user_id, rating=rating, comment=comment)
    db.add(new_rating)
    db.commit()
    return {"message": "Calificación registrada"}

@app.get("/admin/stats")
async def get_stats(db: Session = Depends(get_db)):
    # Simple attendance stats (this week)
    today = datetime.datetime.utcnow()
    start_of_week = today - datetime.timedelta(days=today.weekday())
    
    attendance_data = db.query(
        func.date(AttendanceLog.timestamp).label('date'),
        func.count(AttendanceLog.id).label('count')
    ).filter(AttendanceLog.timestamp >= start_of_week).group_by(func.date(AttendanceLog.timestamp)).all()
    
    # Financial Stats (Simple mockup for now based on goals vs salaries)
    total_salaries = db.query(func.sum(User.base_salary)).filter(User.is_active == True).scalar() or 0
    current_goal = db.query(CompanyGoal).filter(CompanyGoal.year == today.year, CompanyGoal.month == today.month).first()
    target = float(current_goal.target_revenue) if current_goal else 50000.0 # Default if none set
    achieved = float(current_goal.achieved_revenue) if current_goal else 42000.0
    
    return {
        "attendance": [{"date": str(d), "count": c} for d, c in attendance_data],
        "financials": {
            "total_expenses": float(total_salaries),
            "target_revenue": target,
            "achieved_revenue": achieved,
            "profit": achieved - float(total_salaries)
        }
    }

@app.post("/admin/goals")
async def set_goal(year: int = Form(...), month: int = Form(...), target: float = Form(...), achieved: float = Form(None), db: Session = Depends(get_db)):
    goal = db.query(CompanyGoal).filter(CompanyGoal.year == year, CompanyGoal.month == month).first()
    if goal:
        goal.target_revenue = Decimal(str(target))
        if achieved is not None: goal.achieved_revenue = Decimal(str(achieved))
    else:
        goal = CompanyGoal(year=year, month=month, target_revenue=Decimal(str(target)), achieved_revenue=Decimal(str(achieved or 0)))
        db.add(goal)
    db.commit()
    return {"message": "Meta actualizada"}

@app.get("/admin/schedules")
async def get_schedules(db: Session = Depends(get_db)):
    schedules = db.query(WorkSchedule).all()
    return [{
        "user_id": s.user_id,
        "start_time": s.start_time.strftime("%H:%M"),
        "end_time": s.end_time.strftime("%H:%M")
    } for s in schedules]

@app.post("/admin/schedules")
async def set_schedule(user_id: int = Form(...), start: str = Form(...), end: str = Form(...), db: Session = Depends(get_db)):
    try:
        s_time = datetime.datetime.strptime(start, "%H:%M").time()
        e_time = datetime.datetime.strptime(end, "%H:%M").time()
    except:
        raise HTTPException(status_code=400, detail="Formato de hora inválido (HH:MM)")
    
    sched = db.query(WorkSchedule).filter(WorkSchedule.user_id == user_id).first()
    if sched:
        sched.start_time = s_time
        sched.end_time = e_time
    else:
        sched = WorkSchedule(user_id=user_id, start_time=s_time, end_time=e_time)
        db.add(sched)
    db.commit()
    return {"message": "Horario actualizado"}

@app.get("/admin/logs")
async def get_admin_logs(db: Session = Depends(get_db)):
    logs = db.query(AttendanceLog, User).join(User, AttendanceLog.user_id == User.id).order_by(AttendanceLog.id.desc()).limit(100).all()
    return [{
        "id": l[0].id,
        "user_name": l[1].full_name,
        "timestamp": l[0].timestamp.strftime("%Y-%m-%d %H:%M:%S"),
        "method": l[0].method,
        "action": l[0].action,
        "status": l[0].status or "Puntual"
    } for l in logs]
