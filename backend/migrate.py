import os
import sys

# Add the current directory to sys.path to allow importing from backend
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import init_db

if __name__ == "__main__":
    print("Iniciando la creación de la base de datos y el administrador...")
    try:
        init_db()
        print("✅ Base de datos configurada y tablas creadas exitosamente.")
        print("✅ Usuario 'superadmin' creado (si no existía).")
    except Exception as e:
        print(f"❌ Error durante la migración: {e}")
