from sqlalchemy import create_engine, Column, Integer, String, ForeignKey, DateTime, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
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

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(100))
    is_admin = Column(Integer, default=0) # 0=False, 1=True
    monthly_salary = Column(Integer, default=0) # Total monthly salary
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class FaceVector(Base):
    __tablename__ = "face_vectors"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    vector = Column(Text, nullable=False)  # Stored as JSON string [float, float, ...]
    position_label = Column(String(20))    # front, left, right, up, down
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class AttendanceLog(Base):
    __tablename__ = "attendance_logs"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    method = Column(String(20), default="face") # face or manual
    action = Column(String(20), default="entrada") # entrada or salida
    status = Column(String(20), default="success")

    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class AttendanceSession(Base):
    __tablename__ = "attendance_sessions"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    check_in = Column(DateTime, nullable=True)
    check_out = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class Project(Base):
    __tablename__ = "projects"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    description = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class Survey(Base):
    __tablename__ = "surveys"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"))
    
    # 1-5 ratings for programmers
    productivity = Column(Integer)     # Code volume / Speed
    quality = Column(Integer)          # Bugs / Refactors
    teamwork = Column(Integer)         # Collaboration
    problem_solving = Column(Integer)  # Logic / Bug fixing
    punctuality = Column(Integer)      # Deadlines
    
    comments = Column(String(255), nullable=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)

def init_db():
    Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
