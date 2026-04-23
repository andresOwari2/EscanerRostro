import React, { useState, useRef, useCallback, useEffect } from 'react'
import Webcam from 'react-webcam'
import axios from 'axios'
import { Camera, User, LogIn, CheckCircle, AlertCircle, RefreshCw, Smartphone, Settings } from 'lucide-react'
import AdminPanel from './components/AdminPanel'

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000"
const API_KEY = import.meta.env.VITE_API_KEY || "test_key_123"

// Configure axios to always send the API Key
axios.defaults.headers.common['X-API-KEY'] = API_KEY

export default function App() {
  const [view, setView] = useState('menu') // menu, attendance, register, manual, admin
  const [attendanceAction, setAttendanceAction] = useState('entrada') // entrada, salida
  const [status, setStatus] = useState({ type: '', msg: '' })
  const [loading, setLoading] = useState(false)

  const [regStep, setRegStep] = useState(0)
  const [regImages, setRegImages] = useState([])
  const [welcomeMsg, setWelcomeMsg] = useState('Asistencia Registrada')
  const [welcomeTitle, setWelcomeTitle] = useState('¡Operación Exitosa!')
  const [userData, setUserData] = useState({ username: '', password: '', fullName: '' })
  const [poseMetrics, setPoseMetrics] = useState({ ratio_lr: 1, dist_y: 20 })
  const [distStatus, setDistStatus] = useState('none')
  const [faceBox, setFaceBox] = useState(null)
  const [landmarks, setLandmarks] = useState(null)
  const [loggedInUser, setLoggedInUser] = useState(null)
  const [greeting, setGreeting] = useState('')
  const [gracePeriodActive, setGracePeriodActive] = useState(false)
  const [frontVector, setFrontVector] = useState(null)

  const webcamRef = useRef(null)

  const speakGreeting = (text) => {
    if (!window.speechSynthesis) return
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'es-ES'
    utterance.rate = 1.0
    utterance.pitch = 1.1
    window.speechSynthesis.speak(utterance)
  }

  const showStatus = (type, msg) => {
    setStatus({ type, msg })
    setTimeout(() => setStatus({ type: '', msg: '' }), 5000)
  }

  // Attendance Logic (Face Scan)
  const captureAndVerify = useCallback(async () => {
    if (!webcamRef.current || loading || gracePeriodActive) return

    setLoading(true)
    const imageSrc = webcamRef.current.getScreenshot()

    try {
      const formData = new FormData()
      formData.append('image', imageSrc)
      formData.append('action', attendanceAction)

      const res = await axios.post(`${API_BASE}/verify`, formData)

      if (res.data.status === 'success') {
        setLoggedInUser(res.data.user)
        setWelcomeTitle(res.data.title || '¡Operación Exitosa!')
        setWelcomeMsg(res.data.message)
        setGreeting(res.data.greeting || '')
        setView('welcome')
        showStatus('success', res.data.message)
        if (res.data.greeting) speakGreeting(res.data.greeting)
      } else if (res.data.status === 'error') {
        setLoggedInUser(res.data.user || null)
        setWelcomeTitle(res.data.title || 'Atención')
        setWelcomeMsg(res.data.message)
        setView('welcome')
        showStatus('error', res.data.message)
      } else {
        showStatus('error', res.data.message || 'Rostro no reconocido / No estás registrado')
      }
    } catch (err) {
      console.error(err)
      showStatus('error', 'Error al conectar con el servidor')
    } finally {
      setLoading(false)
    }
  }, [loading, attendanceAction, gracePeriodActive])

  // Auto-scan cycle
  useEffect(() => {
    let interval
    if (view === 'attendance' && !gracePeriodActive) {
      interval = setInterval(captureAndVerify, 4000)
    }
    return () => clearInterval(interval)
  }, [view, captureAndVerify, gracePeriodActive])

  // Grace Period Logic
  useEffect(() => {
    if (view === 'attendance') {
      setGracePeriodActive(true)
      const timer = setTimeout(() => {
        setGracePeriodActive(false)
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [view])

  // Automatic Registration Logic
  const autoCaptureStep = useCallback(async () => {
    if (!webcamRef.current || loading || regStep >= 3 || view !== 'register') return

    const imageSrc = webcamRef.current.getScreenshot()
    if (!imageSrc) return

    const targetPos = ["front", "left", "right", "up"][regStep]

    try {
      const formData = new FormData()
      formData.append('image', imageSrc)
      formData.append('target_pos', targetPos)
      if (frontVector) {
        formData.append('ref_vector', JSON.stringify(frontVector))
      }

      const res = await axios.post(`${API_BASE}/register/check_face`, formData)

      if (res.data.metrics) {
        setPoseMetrics(res.data.metrics)
        setDistStatus(res.data.distance_status)
        setFaceBox(res.data.box)
        setLandmarks(res.data.landmarks)
      }

      if (res.data.face_detected) {
        if (regStep === 0 && res.data.encoding) {
          setFrontVector(res.data.encoding)
        }
        setRegImages(prev => [...prev, imageSrc])
        setRegStep(prev => prev + 1)
        showStatus('success', `Posición ${regStep + 1} capturada`)
      } else if (res.data.detected_pos === targetPos && res.data.distance_status === 'ok') {
        showStatus('error', 'El rostro no coincide con la foto frontal')
      }
    } catch (err) {
      console.error("Error in auto-capture:", err)
    }
  }, [loading, regStep, view])

  useEffect(() => {
    let interval
    if (view === 'register' && regStep < 3) {
      interval = setInterval(autoCaptureStep, 1000)
    }
    return () => {
      clearInterval(interval)
      if (view !== 'register') {
        setDistStatus('none')
        setFaceBox(null)
        setLandmarks(null)
      }
    }
  }, [view, regStep, autoCaptureStep])

  // Registration Logic
  const handleRegister = async () => {
    if (!userData.username || !userData.fullName) {
      showStatus('error', 'Por favor llena todos los campos')
      return
    }
    setLoading(true)
    try {
      const formData = new FormData()
      formData.append('username', userData.username)
      formData.append('password', userData.password)
      formData.append('full_name', userData.fullName)
      regImages.forEach(img => formData.append('images', img))

      await axios.post(`${API_BASE}/register`, formData)
      showStatus('success', 'Registro completado con éxito')
      setView('attendance')
      resetReg()
    } catch (err) {
      showStatus('error', err.response?.data?.detail || 'Error en el registro')
    } finally {
      setLoading(false)
    }
  }

  const resetReg = () => {
    setRegStep(0)
    setRegImages([])
    setFrontVector(null)
    setUserData({ username: '', password: '', fullName: '' })
  }

  // Manual Login Logic
  const handleManualLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const formData = new FormData()
      formData.append('username', userData.username)
      formData.append('password', userData.password)
      formData.append('action', attendanceAction)

      const res = await axios.post(`${API_BASE}/login_manual`, formData)
      setLoggedInUser(res.data.user)
      setWelcomeTitle(res.data.title || '¡Operación Exitosa!')
      setWelcomeMsg(res.data.message)
      setGreeting(res.data.greeting || '')
      setView('welcome')
      showStatus('success', res.data.message)
      if (res.data.greeting) speakGreeting(res.data.greeting)
    } catch (err) {
      showStatus('error', err.response?.data?.detail || 'Credenciales inválidas')
    } finally {
      setLoading(false)
    }
  }

  // Auto-return from welcome to menu
  useEffect(() => {
    let timeout
    if (view === 'welcome') {
      timeout = setTimeout(() => {
        setLoggedInUser(null)
        setView('menu')
      }, 3000)
    }
    return () => clearTimeout(timeout)
  }, [view])

  return (
    <div className="app-container">
      {view === 'admin' ? (
        <AdminPanel onBack={() => setView('menu')} />
      ) : (
        <div className="glass-card">
          <h1>Escaner Facial</h1>
          <p className="subtitle">
            {view === 'menu' && 'Bienvenido, selecciona una opción'}
            {view === 'attendance' && `Escaneando Rostro para ${attendanceAction.toUpperCase()}`}
            {view === 'register' && `Escaneo de Registro - Posición ${regStep + 1}/3`}
            {view === 'manual' && `Ingreso Manual - ${attendanceAction.toUpperCase()}`}
            {view === 'welcome' && '¡Operación Exitosa!'}
          </p>

          {(view === 'attendance' || view === 'register') && (
            <div className="camera-wrapper">
              <Webcam
                audio={false}
                ref={webcamRef}
                screenshotFormat="image/jpeg"
                videoConstraints={{ width: 640, height: 480, facingMode: "user" }}
                className="webcam-view"
              />
              <div className="camera-overlay">
                {view === 'register' && (
                  <div className="position-guide-mesh">
                    <div className="face-guide-frame"></div>
                    {distStatus === 'too_far' && <div className="guide-alert animate-pulse">¡Acércate más!</div>}
                    {distStatus === 'too_close' && <div className="guide-alert animate-pulse">¡Aléjate un poco!</div>}

                    {regStep === 1 && poseMetrics.ratio_lr <= 1.25 && <div className="guide-arrow left">← Gira a la Izquierda</div>}
                    {regStep === 2 && poseMetrics.ratio_lr >= 0.8 && <div className="guide-arrow right">Gira a la Derecha →</div>}

                    {distStatus === 'ok' && <div className="guide-ok-badge">Rostro en posición</div>}

                    {landmarks && (
                      <svg className="landmarks-overlay" viewBox="0 0 640 480" preserveAspectRatio="xMidYMid slice">
                        <polyline points={landmarks.jaw.map(p => `${p[0]},${p[1]}`).join(' ')} fill="none" stroke="rgba(0, 255, 127, 0.5)" strokeWidth="2" />
                        <polyline points={landmarks.nose.map(p => `${p[0]},${p[1]}`).join(' ')} fill="none" stroke="rgba(0, 255, 127, 0.8)" strokeWidth="2" />
                        <polygon points={landmarks.left_eye.map(p => `${p[0]},${p[1]}`).join(' ')} fill="rgba(0, 255, 127, 0.2)" stroke="rgba(0, 255, 127, 0.8)" strokeWidth="1" />
                        <polygon points={landmarks.right_eye.map(p => `${p[0]},${p[1]}`).join(' ')} fill="rgba(0, 255, 127, 0.2)" stroke="rgba(0, 255, 127, 0.8)" strokeWidth="1" />
                        {landmarks.left_pupil && <circle cx={landmarks.left_pupil[0][0]} cy={landmarks.left_pupil[0][1]} r="3" fill="var(--accent)" />}
                        {landmarks.right_pupil && <circle cx={landmarks.right_pupil[0][0]} cy={landmarks.right_pupil[0][1]} r="3" fill="var(--accent)" />}
                      </svg>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {view === 'menu' && (
            <div className="menu-grid">
              <button className="btn-menu entry" onClick={() => { setAttendanceAction('entrada'); setView('attendance'); }}>
                <LogIn size={40} />
                <span>REGISTRAR ENTRADA</span>
              </button>
              <button className="btn-menu exit" onClick={() => { setAttendanceAction('salida'); setView('attendance'); }}>
                <Smartphone size={40} />
                <span>REGISTRAR SALIDA</span>
              </button>
              <div className="menu-footer">
                <button className="btn btn-secondary" onClick={() => setView('register')}>
                  <User size={18} style={{ marginRight: '8px' }} /> Registro de Rostro
                </button>
                <button className="btn btn-secondary" onClick={() => setView('manual')}> Manual </button>
                <button className="btn btn-admin" onClick={() => setView('admin')}>
                  <Settings size={18} style={{ marginRight: '8px' }} /> Admin
                </button>
              </div>
            </div>
          )}

          {view === 'attendance' && (
            <button className="btn btn-secondary" style={{ marginTop: '16px' }} onClick={() => setView('menu')}>
              Volver al Menú
            </button>
          )}

          {view === 'register' && (
            <div>
              {regStep < 3 && regImages.length < 3 ? (
                <>
                  <div className="step-indicator">
                    {[0, 1, 2].map(i => <div key={i} className={`step-dot ${regStep === i ? 'active' : ''}`}></div>)}
                  </div>
                  <p style={{ textAlign: 'center', marginBottom: '16px', fontSize: '0.9rem', fontWeight: 'bold', color: 'var(--primary)' }}>
                    {regStep === 0 && "Mira de frente..."}
                    {regStep === 1 && "¡Bien! Ahora gira a la izquierda..."}
                    {regStep === 2 && "¡Excelente! Ahora gira a la derecha..."}
                  </p>
                  <div className="capture-status">
                    <RefreshCw className="animate-spin" size={24} style={{ margin: '0 auto', color: 'var(--primary)' }} />
                    <p style={{ fontSize: '0.8rem', marginTop: '8px' }}>Buscando rostro...</p>
                  </div>
                </>
              ) : (
                <div className="registration-form">
                  <div className="input-group">
                    <label>Nombre Completo</label>
                    <input type="text" value={userData.fullName} onChange={e => setUserData({ ...userData, fullName: e.target.value })} />
                  </div>
                  <div className="input-group">
                    <label>Usuario</label>
                    <input type="text" value={userData.username} onChange={e => setUserData({ ...userData, username: e.target.value })} />
                  </div>
                  <div className="input-group">
                    <label>Contraseña</label>
                    <input type="password" value={userData.password} onChange={e => setUserData({ ...userData, password: e.target.value })} />
                  </div>
                  <button className="btn btn-primary" onClick={handleRegister} disabled={loading}>
                    {loading ? <RefreshCw className="animate-spin" /> : "Finalizar Registro"}
                  </button>
                </div>
              )}
              <button className="btn btn-secondary" style={{ marginTop: '12px' }} onClick={() => { setView('attendance'); resetReg(); }}>Cancelar</button>
            </div>
          )}

          {view === 'manual' && (
            <form onSubmit={handleManualLogin}>
              <div className="input-group">
                <label>Usuario</label>
                <input type="text" value={userData.username} required onChange={e => setUserData({ ...userData, username: e.target.value })} />
              </div>
              <div className="input-group">
                <label>Contraseña</label>
                <input type="password" value={userData.password} required onChange={e => setUserData({ ...userData, password: e.target.value })} />
              </div>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? <RefreshCw className="animate-spin" /> : "Ingresar"}
              </button>
              <button className="btn btn-secondary" style={{ marginTop: '12px' }} onClick={() => setView('attendance')}>Volver al Escaner</button>
            </form>
          )}

          {view === 'welcome' && (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <CheckCircle size={80} color="var(--accent)" style={{ margin: '0 auto 20px' }} />
              <h2 style={{ fontSize: '2rem', marginBottom: '10px' }}>{welcomeTitle}</h2>
              <p style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{loggedInUser}</p>
              {greeting && <p className="greeting-text">"{greeting}"</p>}
              <p>{welcomeMsg}</p>
              <button className="btn btn-primary" onClick={() => { setLoggedInUser(null); setView('menu'); }}> Aceptar </button>
            </div>
          )}

          {status.msg && (
            <div className={`status-msg ${status.type === 'success' ? 'status-success' : 'status-error'}`}>
              <span style={{ marginLeft: '8px' }}>{status.msg}</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
