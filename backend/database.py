from sqlalchemy import create_engine, Column, Integer, String, ForeignKey, DateTime, Text, Float, Boolean, Numeric
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from passlib.hash import pbkdf2_sha256
import datetime
import os

# Using MariaDB (XAMPP) - Default: root without password on localhost
# Format: mysql+pymysql://user:password@host:port/dbname
# Using MariaDB (XAMPP) locally or PostgreSQL in Render
# Render provides DATABASE_URL in environment
DATABASE_URL = os.getenv("DATABASE_URL")

if DATABASE_URL:
    # Render uses "postgres://" which SQLAlchemy 1.4+ doesn't like, needs "postgresql://"
    if DATABASE_URL.startswith("postgres://"):
        DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)
else:
    # Default local MySQL
    DATABASE_URL = "mysql+pymysql://root@localhost/asistencia_rostros"

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class Client(Base):
    __tablename__ = "clients"
    id = Column(Integer, primary_key=True, index=True)
    company_name = Column(String(100), unique=True, nullable=False)
    api_key = Column(String(100), unique=True, index=True, nullable=False)
    is_active = Column(Boolean, default=True)
    # SaaS Quota Management
    max_requests_per_month = Column(Integer, default=-1) # -1 means unlimited for now
    total_requests_made = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id", ondelete="CASCADE"), nullable=False)
    username = Column(String(50), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(100))
    dni = Column(String(20), unique=True, index=True)
    base_salary = Column(Numeric(10, 2), default=0.0)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class FaceVector(Base):
    __tablename__ = "face_vectors"
    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    vector = Column(Text, nullable=False)  # Stored as JSON string [float, float, ...]
    position_label = Column(String(20))    # front, left, right, up, down
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class AttendanceLog(Base):
    __tablename__ = "attendance_logs"
    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    method = Column(String(20), default="face") # face or manual
    action = Column(String(20), default="entrada") # entrada or salida
    status = Column(String(20), default="success")

class AttendanceSession(Base):
    __tablename__ = "attendance_sessions"
    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    check_in = Column(DateTime, nullable=True)
    check_out = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class Admin(Base):
    __tablename__ = "admins"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False) # In prod use hashing

class WorkSchedule(Base):
    __tablename__ = "work_schedules"
    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    day_of_week = Column(Integer) # 0-6 (Mon-Sun)
    start_time = Column(String(10)) # "08:00"
    end_time = Column(String(10)) # "17:00"

class ProductivityRating(Base):
    __tablename__ = "productivity_ratings"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    rating = Column(Integer) # 1-5
    comment = Column(Text)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class CompanyGoal(Base):
    __tablename__ = "company_goals"
    id = Column(Integer, primary_key=True, index=True)
    year = Column(Integer)
    month = Column(Integer) # 0 for annual
    target_revenue = Column(Numeric(15, 2))
    achieved_revenue = Column(Numeric(15, 2), default=0.0)


def init_db():
    Base.metadata.create_all(bind=engine)
    
    # Initialize superadmin
    db = SessionLocal()
    try:
        admin = db.query(Admin).filter(Admin.username == "superadmin").first()
        if not admin:
            hashed_pass = pbkdf2_sha256.hash("123")
            new_admin = Admin(username="superadmin", password_hash=hashed_pass)
            db.add(new_admin)
        
        # Initialize a test client with a sample API Key
        test_client = db.query(Client).filter(Client.company_name == "Empresa Test").first()
        if not test_client:
            new_client = Client(company_name="Empresa Test", api_key="test_key_123", is_active=True)
            db.add(new_client)
            
        db.commit()
    except Exception as e:
        print(f"Error seeding admin: {e}")
    finally:
        db.close()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
