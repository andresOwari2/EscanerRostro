# Arquitectura Frontend (React)

El frontend está construido con **React** y **Vite**, proporcionando una interfaz de usuario rápida y reactiva para el registro y la verificación facial.

## 🛠 Tecnologías Principales

- **React 18**: Biblioteca de UI basada en componentes.
- **Vite**: Herramienta de construcción (build tool) de próxima generación.
- **Axios**: Cliente HTTP para comunicarse con el backend.
- **React Webcam**: Captura de video en tiempo real desde el navegador.
- **Lucide React**: Iconografía moderna y minimalista.

## 📷 Captura Facial

El sistema utiliza la cámara del usuario para capturar fotos en formato **Base64** que se envían al backend.

```javascript
// Captura simple
const imageSrc = webcamRef.current.getScreenshot();
sendToBackend(imageSrc);
```

## 🧩 Componentes Destacados

- `FaceScanner`: Gestiona la lógica de escaneo y la retroalimentación visual al usuario.
- `ManualLogin`: Formulario alternativo en caso de que el reconocimiento falle.
- `AttendanceStatus`: Muestra el mensaje de éxito o error con el saludo de la IA.

## 🚦 Flujo de Usuario

1. **Seleccionar Acción**: El usuario elige entre "Entrada" o "Salida".
2. **Reconocimiento**: Se activa la cámara y el sistema busca un rostro.
3. **Validación**: Los datos se envían al backend.
4. **Resultado**: Se muestra un modal con el nombre del usuario y su mensaje personalizado.

---

Para más detalles técnicos, consulta la [Documentación del Backend](backend.md).
