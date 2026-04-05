from sqlalchemy import create_engine, text
from passlib.hash import pbkdf2_sha256
import os
from dotenv import load_dotenv

# Load environment variables
env_path = os.path.join(os.path.dirname(__file__), ".env")
load_dotenv(env_path)

DATABASE_URL = os.getenv("DATABASE_URL") or "mysql+pymysql://root@localhost/asistencia_rostros"

engine = create_engine(DATABASE_URL)

def migrate():
    print(f"Connecting to {DATABASE_URL}...")
    with engine.connect() as conn:
        print("Updating admin password to hash...")
        try:
            hashed = pbkdf2_sha256.hash("123")
            conn.execute(text("UPDATE admins SET password_hash = :hp WHERE username = 'superadmin'"), {"hp": hashed})
            print("- Admin password hashed (PBKDF2).")
        except Exception as e:
            print(f"- Error updating admin: {e}")
        
        # Adding missing columns
        try:
            conn.execute(text("ALTER TABLE users ADD COLUMN dni VARCHAR(20) UNIQUE"))
            print("- Column 'dni' added.")
        except: pass
        
        try:
            conn.execute(text("ALTER TABLE users ADD COLUMN base_salary DECIMAL(10, 2) DEFAULT 0.0"))
            print("- Column 'base_salary' added.")
        except: pass

        try:
            conn.execute(text("ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT TRUE"))
            print("- Column 'is_active' added.")
        except: pass
        
        conn.commit()
        print("Migration completed successfully!")

if __name__ == "__main__":
    migrate()
