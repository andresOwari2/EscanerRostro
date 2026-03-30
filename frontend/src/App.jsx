import React, { useState, useRef, useCallback, useEffect } from 'react'
import Webcam from 'react-webcam'
import axios from 'axios'
import { Camera, User, LogIn, CheckCircle, AlertCircle, RefreshCw, Smartphone, BarChart, Users, Settings, Briefcase, Star, TrendingUp, DollarSign } from 'lucide-react'

const API_BASE = import.meta.env.VITE_API_URL || "https://escanerrostro-2.onrender.com"

export default function App() {
  const [view, setView] = useState('menu') // menu, attendance, register, manual
  const [attendanceAction, setAttendanceAction] = useState('entrada') // entrada, salida
  const [status, setStatus] = useState({ type: '', msg: '' })
  const [loading, setLoading] = useState(false)

  const [regStep, setRegStep] = useState(0)
  const [regImages, setRegImages] = useState([])
  const [welcomeMsg, setWelcomeMsg] = useState('Asistencia Registrada')
  const [userData, setUserData] = useState({ username: '', password: '', fullName: '' })
  const [poseMetrics, setPoseMetrics] = useState({ ratio_lr: 1, dist_y: 20 })
  const [distStatus, setDistStatus] = useState('none')
  const [faceBox, setFaceBox] = useState(null)
  const [landmarks, setLandmarks] = useState(null)
  const [loggedInUser, setLoggedInUser] = useState(null)
  const [greeting, setGreeting] = useState('')
  const [adminAuth, setAdminAuth] = useState(false)
  const [adminView, setAdminView] = useState('dash') // dash, projects, surveys, reports
  const [adminData, setAdminData] = useState({ users: [], projects: [], reports: [] })
  const [selectedProjectId, setSelectedProjectId] = useState('')
  const [tempSurvey, setTempSurvey] = useState({ 
    user_id: '', productivity: 3, quality: 3, teamwork: 3, problem_solving: 3, punctuality: 3, comments: '' 
  })

  const webcamRef = useRef(null)

  const speakGreeting = (text) => {
    if (!window.speechSynthesis) return
    window.speechSynthesis.cancel() // Stop any previous speech
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'es-ES' // Set to Spanish
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
    if (!webcamRef.current || loading) return

    setLoading(true)
    const imageSrc = webcamRef.current.getScreenshot()

    try {
      const formData = new FormData()
      formData.append('image', imageSrc)
      formData.append('action', attendanceAction)

      const res = await axios.post(`${API_BASE}/verify`, formData)

      if (res.data.status === 'success') {
        setLoggedInUser(res.data.user)
        setWelcomeMsg(res.data.message)
        setGreeting(res.data.greeting || '')
        setView('welcome')
        showStatus('success', res.data.message)
        if (res.data.greeting) speakGreeting(res.data.greeting)
      } else {
        showStatus('error', 'Rostro no reconocido / No estás registrado')
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [loading])

  // Auto-scan every 3 seconds if in attendance view
  useEffect(() => {
    let interval
    if (view === 'attendance') {
      interval = setInterval(captureAndVerify, 4000)
    }
    return () => clearInterval(interval)
  }, [view, captureAndVerify])

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

      const res = await axios.post(`${API_BASE}/register/check_face`, formData)

      if (res.data.metrics) {
        setPoseMetrics(res.data.metrics)
        setDistStatus(res.data.distance_status)
        setFaceBox(res.data.box)
        setLandmarks(res.data.landmarks)
      }

      if (res.data.face_detected) {
        setRegImages(prev => [...prev, imageSrc])
        setRegStep(prev => prev + 1)
        showStatus('success', `Posición ${regStep + 1} capturada`)
      }
    } catch (err) {
      console.error("Error in auto-capture:", err)
    }
  }, [loading, regStep, view])

  useEffect(() => {
    let interval
    if (view === 'register' && regStep < 3) {
      interval = setInterval(autoCaptureStep, 1000) // Polling faster for better UX
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

  // --- ADMIN LOGIC ---
  const handleAdminLogin = (e) => {
    e.preventDefault()
    // Using simple credentials for thesis purposes
    if (userData.username === 'admin' && userData.password === '1234') {
      setAdminAuth(true)
      fetchAdminData()
      setAdminView('dash')
      showStatus('success', 'Sesión de Administrador iniciada')
    } else {
      showStatus('error', 'Credenciales de Admin incorrectas')
    }
  }

  const fetchAdminData = async () => {
    try {
      const [uRes, pRes] = await Promise.all([
        axios.get(`${API_BASE}/admin/users`),
        axios.get(`${API_BASE}/admin/projects`)
      ])
      setAdminData(prev => ({ ...prev, users: uRes.data, projects: pRes.data }))
    } catch (err) { console.error(err) }
  }

  const fetchReports = async (pid, pType) => {
    if (!pid) return
    try {
      const res = await axios.get(`${API_BASE}/admin/reports?project_id=${pid}&period=${pType}`)
      setAdminData(prev => ({ ...prev, reports: res.data }))
    } catch (err) { showStatus('error', 'Error cargando reportes') }
  }

  const handleCreateProject = async (name) => {
    const fd = new FormData(); fd.append('name', name);
    await axios.post(`${API_BASE}/admin/projects`, fd)
    fetchAdminData()
  }

  const handleAssignProject = async (uid, pid) => {
    const fd = new FormData(); fd.append('user_id', uid); fd.append('project_id', pid);
    await axios.post(`${API_BASE}/admin/assign`, fd)
    fetchAdminData()
  }

  const handleUpdateSalary = async (uid, salary) => {
    const fd = new FormData(); fd.append('user_id', uid); fd.append('salary', salary);
    await axios.post(`${API_BASE}/admin/salary`, fd)
    fetchAdminData()
  }

  const handleSubmitSurvey = async () => {
    const fd = new FormData()
    Object.keys(tempSurvey).forEach(k => fd.append(k, tempSurvey[k]))
    fd.append('project_id', selectedProjectId)
    await axios.post(`${API_BASE}/admin/surveys`, fd)
    showStatus('success', 'Encuesta enviada')
    setAdminView('dash')
  }

  // Auto-return from welcome to attendance
  useEffect(() => {
    let timeout
    if (view === 'welcome') {
      timeout = setTimeout(() => {
        setLoggedInUser(null)
        setView('menu')
      }, 5000)
    }
    return () => clearTimeout(timeout)
  }, [view])

  return (
    <div className="glass-card main-container">
      <h1>Escaner Facial</h1>
      <p className="subtitle">
        {view === 'admin' && 'Panel de Administración y Reportes'}
      {/* Admin View */}
      {view === 'admin' && !adminAuth && (
        <div className="admin-login-box">
          <h3>Ingreso Administrativo</h3>
          <form onSubmit={handleAdminLogin}>
            <div className="input-group">
              <label>Usuario Master</label>
              <input type="text" onChange={e => setUserData({ ...userData, username: e.target.value })} />
            </div>
            <div className="input-group">
              <label>Pin de Acceso</label>
              <input type="password" onChange={e => setUserData({ ...userData, password: e.target.value })} />
            </div>
            <button className="btn btn-primary">Entrar al Panel</button>
            <button className="btn btn-secondary" style={{marginTop:'10px'}} onClick={() => setView('menu')}>Salir</button>
          </form>
        </div>
      )}

      {view === 'admin' && adminAuth && (
        <div className="admin-dashboard">
          <div className="admin-nav">
            <button className={adminView === 'dash' ? 'active' : ''} onClick={() => setAdminView('dash')}><BarChart size={18}/> Dash</button>
            <button className={adminView === 'projects' ? 'active' : ''} onClick={() => setAdminView('projects')}><Briefcase size={18}/> Proyectos</button>
            <button className={adminView === 'surveys' ? 'active' : ''} onClick={() => setAdminView('surveys')}><Star size={18}/> Encuestas</button>
            <button className={adminView === 'reports' ? 'active' : ''} onClick={() => setAdminView('reports')}><TrendingUp size={18}/> Reportes</button>
            <button onClick={() => setView('menu')}><LogIn size={18}/> Cerrar</button>
          </div>

          <div className="admin-content">
            {adminView === 'dash' && (
              <div className="stats-grid">
                <div className="stat-card">
                  <Users size={24} color="var(--primary)"/>
                  <div className="stat-val">{adminData.users.length}</div>
                  <div className="stat-lbl">Usuarios</div>
                </div>
                <div className="stat-card">
                  <Briefcase size={24} color="var(--accent)"/>
                  <div className="stat-val">{adminData.projects.length}</div>
                  <div className="stat-lbl">Proyectos</div>
                </div>
              </div>
            )}

            {adminView === 'projects' && (
              <div className="admin-sections">
                <h4>Crear Proyecto</h4>
                <div className="inline-form">
                  <input type="text" id="newProjName" placeholder="Nombre Proyecto" />
                  <button onClick={() => handleCreateProject(document.getElementById('newProjName').value)}>Crear</button>
                </div>
                <h4 style={{marginTop:'20px'}}>Asignar Trabajadores</h4>
                <div className="users-list-admin">
                  {adminData.users.filter(u => !u.is_admin).map(u => (
                    <div key={u.id} className="user-admin-row">
                      <span>{u.full_name}</span>
                      <select defaultValue={u.project_id || ''} onChange={(e) => handleAssignProject(u.id, e.target.value)}>
                        <option value="">Sin Proyecto</option>
                        {adminData.projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                      <input type="number" defaultValue={u.monthly_salary} onBlur={(e) => handleUpdateSalary(u.id, e.target.value)} placeholder="Sueldo" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {adminView === 'surveys' && (
              <div className="admin-sections">
                <select onChange={(e) => setSelectedProjectId(e.target.value)}>
                   <option value="">Selecciona Proyecto</option>
                   {adminData.projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                {selectedProjectId && (
                  <div className="survey-users">
                    {adminData.users.filter(u => u.project_id == selectedProjectId).map(u => (
                      <div key={u.id} className="survey-card">
                        <h5>{u.full_name}</h5>
                        <div className="rating-group">
                          <label>Productividad</label>
                          <div className="stars">
                            {[1,2,3,4,5].map(i => (
                              <input key={i} type="radio" name={`prod-${u.id}`} checked={tempSurvey.user_id === u.id && tempSurvey.productivity === i} onChange={() => setTempSurvey({...tempSurvey, user_id: u.id, productivity: i})} />
                            ))}
                          </div>
                        </div>
                        <button className="btn btn-primary btn-sm" onClick={handleSubmitSurvey}>Enviar</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {adminView === 'reports' && (
              <div className="admin-sections">
                 <div className="report-controls">
                    <select id="repProj" onChange={(e) => setSelectedProjectId(e.target.value)}>
                        <option value="">Proyecto</option>
                        {adminData.projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    <select id="repTime">
                        <option value="weekly">Semanal</option>
                        <option value="monthly">Mensual</option>
                        <option value="annual">Anual</option>
                    </select>
                    <button onClick={() => fetchReports(selectedProjectId, document.getElementById('repTime').value)}>Generar</button>
                 </div>
                 <div className="reports-table-container">
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>Nombre</th>
                                <th>Horas</th>
                                <th>Prod.</th>
                                <th>Tendencia</th>
                                <th>Gasto Est.</th>
                            </tr>
                        </thead>
                        <tbody>
                            {adminData.reports.map(r => (
                                <tr key={r.user_id}>
                                    <td>{r.name}</td>
                                    <td>{r.hours}h</td>
                                    <td>{r.productivity}</td>
                                    <td className={`trend-${r.trend}`}>{r.trend === 'up' ? '↑ Mejoró' : r.trend === 'down' ? '↓ Bajó' : '↔ Estable'}</td>
                                    <td>${r.estimated_cost}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                 </div>
              </div>
            )}
          </div>
        </div>
      )}
        {view === 'attendance' && `Escaneando Rostro para ${attendanceAction.toUpperCase()}`}
        {view === 'register' && `Escaneo de Registro - Posición ${regStep + 1}/3`}
        {view === 'manual' && `Ingreso Manual - ${attendanceAction.toUpperCase()}`}
        {view === 'welcome' && '¡Operación Exitosa!'}
      </p>

      {/* Main View Area */}
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

                {distStatus === 'ok' && (
                  <div className="guide-ok-badge">Rostro en posición</div>
                )}

                {/* Visualización de Vectores Faciales */}
                {landmarks && (
                  <svg
                    className="landmarks-overlay"
                    viewBox="0 0 640 480"
                    preserveAspectRatio="xMidYMid slice"
                  >
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
            <button className="btn btn-secondary" onClick={() => setView('manual')}>
              Manual
            </button>
          </div>
          <button className="btn-admin-access" onClick={() => setView('admin')}>
            <Settings size={14} /> Acceso Admin
          </button>
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

              <div className="pose-guide">
                <div className="gauge-container">
                  <div className="gauge-label">Giro</div>
                  <div className="gauge-bar">
                    <div
                      className="gauge-indicator"
                      style={{
                        left: `${Math.min(Math.max((poseMetrics.ratio_lr - 0.5) * 100 / 1.5, 0), 100)}%`,
                        backgroundColor: (regStep === 1 && poseMetrics.ratio_lr > 1.25) || (regStep === 2 && poseMetrics.ratio_lr < 0.8) || (regStep === 0 && poseMetrics.ratio_lr >= 0.8 && poseMetrics.ratio_lr <= 1.25) ? 'var(--accent)' : 'var(--primary)'
                      }}
                    ></div>
                    <div className="gauge-target right" style={{ opacity: regStep === 2 ? 1 : 0.2 }}></div>
                  </div>
                </div>
              </div>

              <div className="capture-status">
                <RefreshCw className="animate-spin" size={24} style={{ margin: '0 auto', color: 'var(--primary)' }} />
                <p style={{ fontSize: '0.8rem', marginTop: '8px' }}>Buscando rostro...</p>
              </div>
            </>
          ) : (
            <div className="registration-form">
              <div className="input-group">
                <label>Nombre Completo</label>
                <input type="text" value={userData.fullName} onChange={e => setUserData({ ...userData, fullName: e.target.value })} placeholder="Ej. Juan Pérez" />
              </div>
              <div className="input-group">
                <label>Usuario</label>
                <input type="text" value={userData.username} onChange={e => setUserData({ ...userData, username: e.target.value })} placeholder="juan.perez" />
              </div>
              <div className="input-group">
                <label>Contraseña</label>
                <input type="password" value={userData.password} onChange={e => setUserData({ ...userData, password: e.target.value })} placeholder="••••••••" />
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
          <div className="welcome-icon">
            <CheckCircle size={80} color="var(--accent)" style={{ margin: '0 auto 20px' }} />
          </div>
          <h2 style={{ fontSize: '2rem', marginBottom: '10px' }}>¡Bienvenido!</h2>
          <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--primary)', marginBottom: '10px' }}>
            {loggedInUser}
          </p>
          {greeting && (
            <p style={{
              fontSize: '1.1rem',
              color: 'var(--accent)',
              marginBottom: '30px',
              fontStyle: 'italic',
              padding: '10px 20px',
              borderLeft: '4px solid var(--accent)',
              backgroundColor: 'rgba(0, 255, 127, 0.1)',
              borderRadius: '0 8px 8px 0'
            }}>
              "{greeting}"
            </p>
          )}
          <p style={{ color: 'var(--text-dim)', marginBottom: '20px' }}>{welcomeMsg}</p>
          <button className="btn btn-primary" onClick={() => { setLoggedInUser(null); setView('attendance'); }}>
            Cerrar Sesión
          </button>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginTop: '20px' }}>
            Regresando al escaner automáticamente en unos segundos...
          </p>
        </div>
      )}

      {/* Status Messages */}
      {status.msg && (
        <div className={`status-msg ${status.type === 'success' ? 'status-success' : 'status-error'}`}>
          {status.type === 'success' ? <CheckCircle size={18} inline /> : <AlertCircle size={18} inline />}
          <span style={{ marginLeft: '8px' }}>{status.msg}</span>
        </div>
      )}
    </div>
  )
}
