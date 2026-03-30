import React, { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import { 
  LogIn, LogOut, UserPlus, Settings, BarChart, 
  Briefcase, Star, TrendingUp, Users, CheckCircle, 
  AlertCircle, Keyboard, RefreshCw, Smartphone, User
} from 'lucide-react'
import Webcam from 'react-webcam'

const API_BASE = 'https://escanerrostro-2.onrender.com' // Ajustado al backend real

function App() {
  const [view, setView] = useState('menu')
  const [userData, setUserData] = useState({ username: '', password: '', fullName: '' })
  const [status, setStatus] = useState({ type: '', msg: '' })
  const [loading, setLoading] = useState(false)
  const [loggedInUser, setLoggedInUser] = useState(null)
  
  // Admin State
  const [adminAuth, setAdminAuth] = useState(false)
  const [adminView, setAdminView] = useState('dash')
  const [adminData, setAdminData] = useState({ users: [], projects: [], reports: [] })
  const [selectedProjectId, setSelectedProjectId] = useState('')
  const [tempSurvey, setTempSurvey] = useState({ user_id: '', productivity: 1 })
  const [attendanceAction, setAttendanceAction] = useState('entrada')

  // Webcam & Face Logic Refs
  const webcamRef = useRef(null)
  const [regStep, setRegStep] = useState(0)
  const [regImages, setRegImages] = useState([])
  const [poseMetrics, setPoseMetrics] = useState({ ratio_lr: 1, ratio_ud: 1 })
  const [distStatus, setDistStatus] = useState('ok')
  const [landmarks, setLandmarks] = useState(null)

  const showStatus = (type, msg) => {
    setStatus({ type, msg })
    setTimeout(() => setStatus({ type: '', msg: '' }), 4000)
  }

  // --- ADMIN LOGIC ---
  const handleAdminLogin = (e) => {
    e.preventDefault()
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
    if (!name) return
    const fd = new FormData(); fd.append('name', name);
    await axios.post(`${API_BASE}/admin/projects`, fd)
    fetchAdminData()
    showStatus('success', 'Proyecto creado')
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
    showStatus('success', 'Sueldo actualizado')
  }

  const handleSubmitSurvey = async () => {
    const fd = new FormData()
    fd.append('user_id', tempSurvey.user_id)
    fd.append('productivity', tempSurvey.productivity)
    fd.append('quality', 3) // Defaults for MVP
    fd.append('teamwork', 3)
    fd.append('problem_solving', 3)
    fd.append('punctuality', 3)
    fd.append('project_id', selectedProjectId)
    
    await axios.post(`${API_BASE}/admin/surveys`, fd)
    showStatus('success', 'Encuesta guardada')
  }

  // --- ATTENDANCE & REGISTER LOGIC ---
  const handleManualLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    const fd = new FormData()
    fd.append('username', userData.username)
    fd.append('password', userData.password)
    fd.append('action', attendanceAction)
    
    try {
      const res = await axios.post(`${API_BASE}/attendance/manual`, fd)
      setLoggedInUser(res.data.full_name)
      setView('welcome')
    } catch (err) {
      showStatus('error', err.response?.data?.detail || 'Error en login manual')
    } finally { setLoading(false) }
  }

  const handleRegisterStep = () => {
    const imageSrc = webcamRef.current.getScreenshot()
    setRegImages([...regImages, imageSrc])
    if (regStep < 2) {
      setRegStep(regStep + 1)
    } else {
      setRegStep(3) // Form view
    }
  }

  const handleRegister = async () => {
    setLoading(true)
    const fd = new FormData()
    fd.append('username', userData.username)
    fd.append('password', userData.password)
    fd.append('full_name', userData.fullName)
    regImages.forEach((img, i) => fd.append('images', img))

    try {
      await axios.post(`${API_BASE}/register`, fd)
      showStatus('success', 'Registro completado correctamente')
      resetReg()
      setView('menu')
    } catch (err) {
      showStatus('error', 'Error en registro facial')
    } finally { setLoading(false) }
  }

  const resetReg = () => {
    setRegStep(0)
    setRegImages([])
    setUserData({ username: '', password: '', fullName: '' })
  }

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

  // --- RENDER ---
  return (
    <div className={(view === 'admin' && adminAuth) ? "admin-full-layout" : "glass-card main-container"}>
      {view === 'admin' && adminAuth ? (
        <>
          <div className="admin-sidebar">
            <div className="sidebar-header">
              <Settings size={28} color="var(--primary)" />
              <h2>ADMIN PANEL</h2>
            </div>
            <div className="sidebar-nav">
              <button className={adminView === 'dash' ? 'active' : ''} onClick={() => setAdminView('dash')}>
                <BarChart size={20}/> Dashboard
              </button>
              <button className={adminView === 'projects' ? 'active' : ''} onClick={() => setAdminView('projects')}>
                <Briefcase size={20}/> Gestión Proyectos
              </button>
              <button className={adminView === 'surveys' ? 'active' : ''} onClick={() => setAdminView('surveys')}>
                <Star size={20}/> Encuestas
              </button>
              <button className={adminView === 'reports' ? 'active' : ''} onClick={() => setAdminView('reports')}>
                <TrendingUp size={20}/> Reportes Proyectados
              </button>
            </div>
            <div className="sidebar-footer">
              <button className="btn-logout" onClick={() => { setAdminAuth(false); setView('menu'); }}>
                <LogOut size={18}/> Salir al Menú
              </button>
            </div>
          </div>

          <div className="admin-main-view">
            <header className="admin-header">
              <h3>{adminView === 'dash' ? 'Resumen General' : 
                   adminView === 'projects' ? 'Gestión de Proyectos y Sueldos' : 
                   adminView === 'surveys' ? 'Calificación de Programadores' : 'Reportes de Productividad'}</h3>
            </header>
            
            <div className="admin-scroll-content">
              {adminView === 'dash' && (
                <div className="stats-grid">
                  <div className="stat-card">
                    <Users size={40} color="var(--primary)"/>
                    <div className="stat-val">{adminData.users.length}</div>
                    <div className="stat-lbl">Usuarios Registrados</div>
                  </div>
                  <div className="stat-card">
                    <Briefcase size={40} color="var(--accent)"/>
                    <div className="stat-val">{adminData.projects.length}</div>
                    <div className="stat-lbl">Proyectos Activos</div>
                  </div>
                </div>
              )}

              {adminView === 'projects' && (
                <div className="admin-sections">
                  <div className="section-card">
                    <h4>+ Nuevo Proyecto</h4>
                    <div className="inline-form">
                      <input type="text" id="newProjName" placeholder="Nombre del Proyecto" />
                      <button className="btn btn-primary" style={{width:'auto'}} onClick={() => handleCreateProject(document.getElementById('newProjName').value)}>Crear Proyecto</button>
                    </div>
                  </div>

                  <div className="section-card" style={{marginTop:'30px'}}>
                    <h4>Asignación y Sueldos</h4>
                    <div className="admin-table-container">
                      <table className="admin-table">
                        <thead>
                          <tr>
                            <th>Trabajador</th>
                            <th>Proyecto Asignado</th>
                            <th>Sueldo Mensual ($)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {adminData.users.filter(u => !u.is_admin).map(u => (
                            <tr key={u.id}>
                              <td>{u.full_name}</td>
                              <td>
                                <select defaultValue={u.project_id || ''} onChange={(e) => handleAssignProject(u.id, e.target.value)}>
                                  <option value="">Sin Proyecto</option>
                                  {adminData.projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                              </td>
                              <td>
                                <input type="number" defaultValue={u.monthly_salary} onBlur={(e) => handleUpdateSalary(u.id, e.target.value)} />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {adminView === 'surveys' && (
                <div className="admin-sections">
                  <div className="selector-bar">
                    <label>Proyecto:</label>
                    <select onChange={(e) => setSelectedProjectId(e.target.value)}>
                       <option value="">Selección comercial...</option>
                       {adminData.projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                  
                  {selectedProjectId && (
                    <div className="survey-grid">
                      {adminData.users.filter(u => u.project_id == selectedProjectId).map(u => (
                        <div key={u.id} className="survey-card">
                          <h5>{u.full_name}</h5>
                          <div className="rating-form">
                            <div className="rating-item">
                              <span>Nivel de Productividad</span>
                              <div className="rating-options">
                                {[1,2,3,4,5].map(i => (
                                  <label key={i} className="radio-pill">
                                    <input type="radio" name={`prod-${u.id}`} checked={tempSurvey.user_id === u.id && tempSurvey.productivity === i} onChange={() => setTempSurvey({...tempSurvey, user_id: u.id, productivity: i})} />
                                    <span>{i}</span>
                                  </label>
                                ))}
                              </div>
                            </div>
                            <button className="btn btn-primary" onClick={handleSubmitSurvey}>Guardar Evaluación</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {adminView === 'reports' && (
                <div className="admin-sections">
                   <div className="selector-bar report-filters">
                      <select id="repProj" onChange={(e) => setSelectedProjectId(e.target.value)}>
                          <option value="">Filtrar Proyecto...</option>
                          {adminData.projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                      <select id="repTime">
                          <option value="weekly">Vista Semanal</option>
                          <option value="monthly">Vista Mensual</option>
                          <option value="annual">Vista Anual</option>
                      </select>
                      <button className="btn btn-accent" onClick={() => fetchReports(selectedProjectId, document.getElementById('repTime').value)}>
                        Generar Reporte
                      </button>
                   </div>
                   
                   <div className="admin-table-container">
                      <table className="admin-table">
                          <thead>
                              <tr>
                                  <th>Colaborador</th>
                                  <th>Horas Totales</th>
                                  <th>Prom. Prod.</th>
                                  <th>Tendencia</th>
                                  <th>Gasto Proyectado</th>
                              </tr>
                          </thead>
                          <tbody>
                              {adminData.reports.map(r => (
                                  <tr key={r.user_id}>
                                      <td>{r.name}</td>
                                      <td>{r.hours} hr</td>
                                      <td>{r.productivity} / 5</td>
                                      <td className={`trend-${r.trend}`}>
                                        <div className="trend-badge">
                                          {r.trend === 'up' ? '📈 ALTA' : r.trend === 'down' ? '📉 BAJA' : '📊 ESTABLE'}
                                        </div>
                                      </td>
                                      <td className="cost-val">${r.estimated_cost}</td>
                                  </tr>
                              ))}
                          </tbody>
                      </table>
                   </div>
                </div>
              )}
            </div>
          </div>
        </>
      ) : (
        <>
          <h1>Escaner Facial</h1>
          <p className="subtitle">
            {view === 'menu' && 'Bienvenido, selecciona una opción'}
            {view === 'attendance' && `Escaneando Rostro para ${attendanceAction.toUpperCase()}`}
            {view === 'register' && `Escaneo de Registro - Posición ${regStep + 1}/3`}
            {view === 'manual' && `Ingreso Manual - ${attendanceAction.toUpperCase()}`}
            {view === 'welcome' && '¡Operación Exitosa!'}
          </p>

          <div className="content">
            {/* Status Messages */}
            {status.msg && (
              <div className={`status-msg status-${status.type}`}>
                {status.msg}
              </div>
            )}

            {/* Main Menu */}
            {view === 'menu' && (
              <div className="menu-grid">
                <button className="btn-menu entry" onClick={() => { setAttendanceAction('entrada'); setView('attendance'); }}>
                  <LogIn size={40} />
                  <span>ENTRADA</span>
                </button>
                <button className="btn-menu exit" onClick={() => { setAttendanceAction('salida'); setView('attendance'); }}>
                  <LogOut size={40} />
                  <span>SALIDA</span>
                </button>
                <button className="btn-menu register" onClick={() => setView('register')}>
                  <UserPlus size={40} />
                  <span>REGISTRO</span>
                </button>
                <button className="btn-menu manual" onClick={() => { setView('manual'); setAttendanceAction('entrada'); }}>
                  <Keyboard size={40} />
                  <span>MANUAL</span>
                </button>
                <button className="btn-admin-access" onClick={() => setView('admin')}>
                   <Settings size={14}/> Acceso Admin
                </button>
              </div>
            )}

            {/* Attendance Face Scan */}
            {view === 'attendance' && (
              <div className="camera-container">
                <div className="camera-wrapper">
                  <Webcam
                    audio={false}
                    ref={webcamRef}
                    screenshotFormat="image/jpeg"
                    videoConstraints={{ width: 640, height: 480, facingMode: "user" }}
                    className="webcam-view"
                  />
                  <div className="camera-overlay">
                    <div className="face-guide-frame"></div>
                  </div>
                </div>
                <div className="capture-status">
                  <div className="animate-spin"><RefreshCw size={24}/></div>
                  <span>Procesando...</span>
                </div>
                <button className="btn btn-secondary" style={{ marginTop: '20px' }} onClick={() => setView('menu')}>Cancelar</button>
              </div>
            )}

            {/* Register Face Scan */}
            {view === 'register' && (
              <div className="registration-flow">
                <div className="step-indicator">
                  {[0, 1, 2].map(s => <div key={s} className={`step-dot ${regStep === s ? 'active' : ''}`} />)}
                </div>
                
                <div className="camera-container">
                  <div className="camera-wrapper">
                    <Webcam
                      audio={false}
                      ref={webcamRef}
                      screenshotFormat="image/jpeg"
                      videoConstraints={{ width: 640, height: 480, facingMode: "user" }}
                      className="webcam-view"
                    />
                    <div className="camera-overlay">
                      <div className="face-guide-frame"></div>
                      {regStep === 0 && <div className="guide-ok-badge">Mira al centro</div>}
                      {regStep === 1 && <div className="guide-arrow left">← Gira a la Izquierda</div>}
                      {regStep === 2 && <div className="guide-arrow right">Gira a la Derecha →</div>}
                    </div>
                  </div>
                </div>

                <div className="pose-guide">
                  <div className="gauge-container">
                    <span className="gauge-label">Giro:</span>
                    <div className="gauge-bar">
                      <div className="gauge-indicator" style={{ 
                        left: `${regStep === 0 ? 50 : (regStep === 1 ? 20 : 80)}%`,
                        backgroundColor: 'var(--accent)'
                      }}></div>
                    </div>
                  </div>
                </div>

                {regStep < 3 ? (
                  <button className="btn btn-primary" onClick={handleRegisterStep}>
                    Capturar Posición {regStep + 1}
                  </button>
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
                <button className="btn btn-secondary" style={{ marginTop: '10px' }} onClick={() => { setView('menu'); resetReg(); }}>Cancelar</button>
              </div>
            )}

            {/* Manual Attendance */}
            {view === 'manual' && (
              <div className="manual-form">
                <div className="input-group">
                  <label>Usuario</label>
                  <input type="text" value={userData.username} onChange={e => setUserData({ ...userData, username: e.target.value })} />
                </div>
                <div className="input-group">
                  <label>PIN de Seguridad</label>
                  <input type="password" value={userData.password} onChange={e => setUserData({ ...userData, password: e.target.value })} />
                </div>
                <button className="btn btn-primary" onClick={handleManualLogin}>Confirmar {attendanceAction.toUpperCase()}</button>
                <button className="btn btn-secondary" style={{ marginTop: '10px' }} onClick={() => setView('menu')}>Regresar</button>
              </div>
            )}

            {/* Welcome / Success View */}
            {view === 'welcome' && (
              <div className="welcome-screen">
                <div className="success-icon">✅</div>
                <h2>¡Hola, {loggedInUser}!</h2>
                <p>Tu {attendanceAction.toUpperCase()} ha sido registrada.</p>
                <button className="btn btn-primary" style={{ marginTop: '30px' }} onClick={() => setView('menu')}>Volver al Menú</button>
              </div>
            )}

            {/* Admin Login Overlay */}
            {view === 'admin' && !adminAuth && (
              <div className="admin-login-overlay">
                <div className="admin-login-box">
                  <h3>🔐 Acceso Administrativo</h3>
                  <form onSubmit={handleAdminLogin}>
                    <div className="input-group">
                      <label>Usuario</label>
                      <input type="text" onChange={e => setUserData({ ...userData, username: e.target.value })} placeholder="admin" />
                    </div>
                    <div className="input-group">
                      <label>PIN</label>
                      <input type="password" onChange={e => setUserData({ ...userData, password: e.target.value })} placeholder="****" />
                    </div>
                    <button className="btn btn-primary">Iniciar Sesión</button>
                    <button className="btn btn-secondary" style={{marginTop:'10px'}} onClick={() => setView('menu')}>Regresar</button>
                  </form>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

export default App
