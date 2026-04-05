# Guía de Instalación

Sigue estos pasos para poner el proyecto en marcha en tu entorno local.

## 📋 Prerrequisitos

- **Python 3.12+**
- **Node.js 18+**
- **Cámara Web** (Integrada o USB)

## 🐍 Backend (Python)

1. **Crear entorno virtual**:
   ```bash
   python -m venv venv
   source venv/bin/activate  # En Windows: venv\Scripts\activate
   ```

2. **Instalar dependencias**:
   ```bash
   pip install -r backend/requirements.txt
   ```

3. **Variables de entorno**: Crea un archivo `.env` en la raíz con:
   ```api_key
   gemini_APIKEY=tu_clave_aqui
   ```

4. **Ejecutar**:
   ```bash
   cd backend
   python main.py
   ```
   *La API estará disponible en `http://localhost:8001`.*

## ⚛️ Frontend (React)

1. **Entrar al directorio**:
   ```bash
   cd frontend
   ```

2. **Instalar dependencias**:
   ```bash
   npm install
   ```

3. **Ejecutar en modo desarrollo**:
   ```bash
   npm run dev
   ```
   *Accede a `http://localhost:5173`.*

---

Para configuraciones más avanzadas, consulta la sección de [Arquitectura Backend](backend.md).
