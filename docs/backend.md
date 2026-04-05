# Arquitectura Backend (FastAPI)

El backend es el corazón del sistema, encargado de procesar imágenes, gestionar la base de datos y comunicarse con servicios de IA.

## 🛠 Tecnologías Principales

- **FastAPI**: Framework web moderno, rápido (de alto rendimiento) y basado en tipos estándar de Python.
- **SQLAlchemy**: ORM para interactuar con la base de datos SQLite.
- **OpenCV (cv2)**: Utilizado para la detección de rostros (**YuNet**) y reconocimiento (**SFace**).
- **Google Generative AI (Gemini)**: Genera saludos personalizados para los usuarios reconocidos.

## 📡 Endpoints Principales

### Auth & Registro
- `POST /register`: Registra un nuevo usuario con sus vectores faciales.
- `POST /login_manual`: Permite el acceso mediante usuario y contraseña si falla el reconocimiento.

### Reconocimiento
- `POST /register/check_face`: Valida la posición del rostro (frente, izquierda, derecha) antes de registrar.
- `POST /verify`: Endpoint principal para marcar asistencia (Entrada/Salida).

## 🧠 Lógica de Reconocimiento (`face_logic.py`)

El sistema extrae un "Face Vector" (una representación numérica del rostro) y lo compara con los guardados en la base de datos mediante **distancia coseno**.

```python
# Ejemplo de comparación simplificada
if face_logic.compare_faces([known_encoding], unknown_encoding, tolerance=0.4):
    # Usuario reconocido
```

## 🗄 Base de Datos (`database.py`)

- `User`: Información básica del empleado.
- `FaceVector`: Vectores faciales (múltiples por usuario).
- `AttendanceLog`: Registro histórico de todas las marcas.
- `AttendanceSession`: Gestión de sesiones abiertas/cerradas (Entrada -> Salida).

---

Para el desarrollo frontend, consulta la [Guía Frontend](frontend.md).
