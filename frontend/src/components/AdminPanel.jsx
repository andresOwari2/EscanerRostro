import React, { useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  LineChart, Line, PieChart, Pie, Cell 
} from 'recharts';
import { 
  Users, Calendar, TrendingUp, DollarSign, Activity, 
  Settings, LogOut, Edit2, Trash2, Check, X, Star,
  ChevronRight, LayoutDashboard, Target
} from 'lucide-react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

export default function AdminPanel({ onBack }) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [editUser, setEditUser] = useState(null);
  
  const [schedules, setSchedules] = useState([]);
  const [targetGoal, setTargetGoal] = useState({ target: 0, achieved: 0 });
  const [logs, setLogs] = useState([]);

  const loadLogs = async () => {
    try {
      const res = await axios.get(`${API_BASE}/admin/logs`);
      setLogs(res.data);
    } catch (err) { console.error(err); }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const formData = new FormData();
      formData.append('username', credentials.username);
      formData.append('password', credentials.password);
      const res = await axios.post(`${API_BASE}/admin/login`, formData);
      if (res.data.status === 'success') {
        setIsLoggedIn(true);
      }
    } catch (err) {
      alert("Credenciales incorrectas");
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [uRes, sRes] = await Promise.all([
        axios.get(`${API_BASE}/admin/users`),
        axios.get(`${API_BASE}/admin/stats`)
      ]);
      setUsers(uRes.data);
      setStats(sRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadSchedules = async () => {
    try {
      const res = await axios.get(`${API_BASE}/admin/schedules`);
      setSchedules(res.data);
    } catch (err) { console.error(err); }
  };

  const handleUpdateUser = async (userId, data) => {
    const formData = new FormData();
    Object.entries(data).forEach(([key, val]) => formData.append(key, val));
    try {
      await axios.put(`${API_BASE}/admin/users/${userId}`, formData);
      loadData();
      setEditUser(null);
    } catch (err) {
      alert("Error al actualizar usuario");
    }
  };

  const handleUpdateSchedule = async (userId, start, end) => {
    const formData = new FormData();
    formData.append('user_id', userId);
    formData.append('start', start);
    formData.append('end', end);
    try {
      await axios.post(`${API_BASE}/admin/schedules`, formData);
      alert("Horario actualizado");
      loadSchedules();
    } catch (err) { alert("Formato inválido (HH:MM)"); }
  };

  const handleRateUser = async (userId, rating) => {
    const formData = new FormData();
    formData.append('user_id', userId);
    formData.append('rating', rating);
    formData.append('comment', "Calificación rápida del administrador");
    try {
      await axios.post(`${API_BASE}/admin/ratings`, formData);
      alert("Calificación guardada");
    } catch (err) { console.error(err); }
  };

  const handleUpdateGoal = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('year', new Date().getFullYear());
    formData.append('month', new Date().getMonth() + 1);
    formData.append('target', targetGoal.target);
    formData.append('achieved', targetGoal.achieved);
    try {
      await axios.post(`${API_BASE}/admin/goals`, formData);
      alert("Meta financiera actualizada");
      loadData();
    } catch (err) { console.error(err); }
  };

  useEffect(() => {
    if (isLoggedIn) {
      loadData();
      loadSchedules();
      if (activeTab === 'reports') loadLogs();
    }
  }, [isLoggedIn, activeTab]);

  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444'];

  if (!isLoggedIn) {
    return (
      <div className="admin-login-overlay">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="admin-login-card"
        >
          <div className="admin-lock-icon">
            <Settings size={40} className="text-primary" />
          </div>
          <h2>Acceso Administrativo</h2>
          <form onSubmit={handleLogin}>
            <div className="input-group">
              <label>Usuario</label>
              <input 
                type="text" 
                value={credentials.username}
                onChange={e => setCredentials({...credentials, username: e.target.value})}
                placeholder="superadmin"
                required 
              />
            </div>
            <div className="input-group">
              <label>Contraseña</label>
              <input 
                type="password" 
                value={credentials.password}
                onChange={e => setCredentials({...credentials, password: e.target.value})}
                placeholder="123"
                required 
              />
            </div>
            <button type="submit" className="btn btn-primary w-full">Entrar al Panel</button>
            <button type="button" onClick={onBack} className="btn btn-secondary w-full mt-4">Volver</button>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="admin-layout">
      {/* Sidebar */}
      <aside className="admin-sidebar">
        <div className="sidebar-header">
          <TrendingUp size={24} className="text-secondary" />
          <span>Admin Portal</span>
        </div>
        <nav className="sidebar-nav">
          <NavItem icon={<LayoutDashboard size={20}/>} label="Dashboard" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
          <NavItem icon={<Users size={20}/>} label="Trabajadores" active={activeTab === 'users'} onClick={() => setActiveTab('users')} />
          <NavItem icon={<Calendar size={20}/>} label="Horarios" active={activeTab === 'schedules'} onClick={() => setActiveTab('schedules')} />
          <NavItem icon={<Star size={20}/>} label="Productividad" active={activeTab === 'productivity'} onClick={() => setActiveTab('productivity')} />
          <NavItem icon={<Activity size={20}/>} label="Reportes" active={activeTab === 'reports'} onClick={() => setActiveTab('reports')} />
          <NavItem icon={<DollarSign size={20}/>} label="Finanzas & Metas" active={activeTab === 'financials'} onClick={() => setActiveTab('financials')} />
        </nav>
        <div className="sidebar-footer">
          <button className="logout-btn" onClick={() => setIsLoggedIn(false)}>
            <LogOut size={18} /> Salir
          </button>
        </div>
      </aside>

      {/* Content */}
      <main className="admin-main">
        <header className="admin-header">
          <div className="header-title">
            <h1 className="capitalize">{activeTab === 'financials' ? 'Finanzas' : activeTab}</h1>
            <p>Bienvenido al control central de asistencia.</p>
          </div>
          <div className="header-actions">
            <button className="btn btn-secondary" onClick={loadData}>
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Actualizar
            </button>
          </div>
        </header>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="content-area"
          >
            {activeTab === 'dashboard' && stats && (
              <div className="dashboard-grid">
                <StatCard icon={<Users/>} label="Total Empleados" value={users.length} color="indigo" />
                <StatCard icon={<Check/>} label="Asistencia Hoy" value={stats.attendance[stats.attendance.length-1]?.count || 0} color="emerald" />
                <StatCard icon={<DollarSign/>} label="Gastos Salariales" value={`$${stats.financials.total_expenses.toLocaleString()}`} color="amber" />
                <StatCard icon={<Activity/>} label="Ganancia Est." value={`$${stats.financials.profit.toLocaleString()}`} color="rose" />
                
                <div className="chart-card col-span-2">
                  <h3>Asistencia Semanal</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={stats.attendance}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="count" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="chart-card">
                  <h3>Metas Financieras</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'Logrado', value: stats.financials.achieved_revenue },
                            { name: 'Pendiente', value: Math.max(0, stats.financials.target_revenue - stats.financials.achieved_revenue) }
                          ]}
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          <Cell fill="#10b981" />
                          <Cell fill="#e2e8f0" />
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="text-center mt-2">
                       <p className="text-sm font-bold">${stats.financials.target_revenue.toLocaleString()} Meta</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'users' && (
              <div className="table-card">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>DNI</th>
                      <th>Nombre</th>
                      <th>Sueldo</th>
                      <th>Estado</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(u => (
                      <tr key={u.id}>
                        <td>{u.dni || 'N/A'}</td>
                        <td>{u.full_name}</td>
                        <td>${u.base_salary.toLocaleString()}</td>
                        <td>
                          <span className={`badge ${u.is_active ? 'badge-success' : 'badge-error'}`}>
                            {u.is_active ? 'Activo' : 'Inactivo'}
                          </span>
                        </td>
                        <td>
                          <div className="flex gap-2">
                            <button className="icon-btn" onClick={() => setEditUser(u)}><Edit2 size={16}/></button>
                            <button className="icon-btn text-error" onClick={() => handleUpdateUser(u.id, { is_active: !u.is_active })}>
                              {u.is_active ? <Trash2 size={16}/> : <Check size={16}/>}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === 'schedules' && (
              <div className="table-card">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Empleado</th>
                      <th>Hora Entrada</th>
                      <th>Hora Salida</th>
                      <th>Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(u => {
                      const s = schedules.find(sc => sc.user_id === u.id) || { start_time: '08:00', end_time: '17:00' };
                      return (
                        <tr key={u.id}>
                          <td>{u.full_name}</td>
                          <td><input type="time" defaultValue={s.start_time} id={`start-${u.id}`} className="admin-input-small" /></td>
                          <td><input type="time" defaultValue={s.end_time} id={`end-${u.id}`} className="admin-input-small" /></td>
                          <td>
                            <button className="btn btn-primary py-1 px-3 text-sm" onClick={() => {
                              const start = document.getElementById(`start-${u.id}`).value;
                              const end = document.getElementById(`end-${u.id}`).value;
                              handleUpdateSchedule(u.id, start, end);
                            }}>Guardar</button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === 'reports' && (
              <div className="table-card">
                <div className="flex justify-between items-center mb-6 p-4 border-b border-white/5">
                  <h3 className="text-lg font-bold">Historial de Asistencia</h3>
                  <div className="flex gap-2">
                    <input type="text" placeholder="Buscar trabajador..." className="admin-input-small !w-64" />
                    <button className="btn btn-secondary px-4 py-2" onClick={loadLogs}>Refrescar</button>
                  </div>
                </div>
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Trabajador</th>
                      <th>Fecha y Hora</th>
                      <th>Método</th>
                      <th>Acción</th>
                      <th>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map(log => (
                      <tr key={log.id}>
                        <td>{log.user_name}</td>
                        <td>{log.timestamp}</td>
                        <td><span className="capitalize">{log.method}</span></td>
                        <td><span className={`badge ${log.action === 'entrada' ? 'badge-success' : 'badge-error'}`}>{log.action}</span></td>
                        <td>
                          <span className={`badge ${log.status === 'Tardanza' ? 'badge-error' : 'badge-success'}`}>
                            {log.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === 'productivity' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {users.map(u => (
                  <div key={u.id} className="chart-card !grid-cols-1">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center font-bold">
                        {u.full_name[0]}
                      </div>
                      <div>
                        <h4 className="font-bold">{u.full_name}</h4>
                        <p className="text-dim text-xs">Calificación Actual: 4.2</p>
                      </div>
                    </div>
                    <div className="flex gap-2 justify-center py-4 border-t border-b border-white/5">
                      {[1, 2, 3, 4, 5].map(star => (
                        <button 
                          key={star} 
                          onClick={() => handleRateUser(u.id, star)}
                          className="hover:scale-110 transition-transform text-amber-400"
                        >
                          <Star size={24} fill={star <= 4 ? "currentColor" : "none"} />
                        </button>
                      ))}
                    </div>
                    <button className="btn btn-secondary mt-4 py-2 text-xs">Ver Historial</button>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'financials' && stats && (
              <div className="max-w-2xl mx-auto">
                <div className="chart-card !w-full mb-8">
                  <h3 className="flex items-center gap-2"><Target size={20} className="text-primary"/> Ajustar Metas Mensuales</h3>
                  <form onSubmit={handleUpdateGoal} className="space-y-6 mt-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="input-group">
                        <label>Meta de Ingresos ($)</label>
                        <input 
                          type="number" 
                          placeholder="Ej: 10000"
                          value={targetGoal.target}
                          onChange={e => setTargetGoal({...targetGoal, target: e.target.value})}
                        />
                      </div>
                      <div className="input-group">
                        <label>Ingresos Actuales ($)</label>
                        <input 
                          type="number" 
                          placeholder="Ej: 8000"
                          value={targetGoal.achieved}
                          onChange={e => setTargetGoal({...targetGoal, achieved: e.target.value})}
                        />
                      </div>
                    </div>
                    <div className="p-4 bg-white/5 rounded-xl border border-white/5">
                      <div className="flex justify-between mb-2">
                        <span>Gastos en Salarios:</span>
                        <span className="text-rose-400">-${stats.financials.total_expenses.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between font-bold text-lg border-t border-white/10 pt-2">
                        <span>Utilidad Estimada:</span>
                        <span className={stats.financials.profit >= 0 ? "text-emerald-400" : "text-rose-400"}>
                          ${stats.financials.profit.toLocaleString()}
                        </span>
                      </div>
                    </div>
                    <button type="submit" className="btn btn-primary w-full">Guardar Configuración</button>
                  </form>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Edit Modal */}
        {editUser && (
          <div className="modal-overlay">
            <div className="modal-content">
              <h3>Editar Trabajador</h3>
              <div className="input-group">
                <label>Nombre Completo</label>
                <input 
                  type="text" 
                  defaultValue={editUser.full_name} 
                  id="edit_name"
                />
              </div>
              <div className="input-group">
                <label>DNI</label>
                <input 
                  type="text" 
                  defaultValue={editUser.dni} 
                  id="edit_dni"
                />
              </div>
              <div className="input-group">
                <label>Sueldo Base</label>
                <input 
                  type="number" 
                  defaultValue={editUser.base_salary} 
                  id="edit_salary"
                />
              </div>
              <div className="modal-actions">
                <button className="btn btn-secondary" onClick={() => setEditUser(null)}>Cancelar</button>
                <button className="btn btn-primary" onClick={() => {
                  handleUpdateUser(editUser.id, {
                    full_name: document.getElementById('edit_name').value,
                    dni: document.getElementById('edit_dni').value,
                    salary: document.getElementById('edit_salary').value
                  })
                }}>Guardar Cambios</button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function NavItem({ icon, label, active, onClick }) {
  return (
    <button className={`nav-item ${active ? 'active' : ''}`} onClick={onClick}>
      {icon}
      <span>{label}</span>
      {active && <ChevronRight size={16} className="ml-auto" />}
    </button>
  );
}

function StatCard({ icon, label, value, color }) {
  return (
    <div className={`stat-card border-${color}`}>
      <div className={`stat-icon bg-${color}-light text-${color}`}>
        {icon}
      </div>
      <div className="stat-info">
        <span className="text-dim text-sm">{label}</span>
        <h4 className="text-2xl font-bold">{value}</h4>
      </div>
    </div>
  );
}

function RefreshCw({ size, className }) {
  return (
    <Activity size={size} className={className} />
  );
}
