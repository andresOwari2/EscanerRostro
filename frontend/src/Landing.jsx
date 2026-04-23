import React from 'react';
import { Camera, ShieldCheck, BarChart3, Zap, Globe, MessageCircle, ArrowRight, UserPlus, Fingerprint } from 'lucide-react';

const Landing = ({ onEnterApp }) => {
  const whatsappNumber = "+51901615649";
  const whatsappMessage = encodeURIComponent("Hola, estoy interesado en el sistema de asistencia facial. Me gustaría recibir más información.");
  const whatsappLink = `https://wa.me/${whatsappNumber}?text=${whatsappMessage}`;

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-white font-sans overflow-x-hidden">
      {/* Background Glows */}
      <div className="fixed top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full"></div>
      <div className="fixed bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/10 blur-[120px] rounded-full"></div>

      {/* Navigation */}
      <nav className="relative z-10 flex items-center justify-between px-8 py-6 max-w-7xl mx-auto border-b border-white/5 backdrop-blur-md sticky top-0">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Fingerprint size={24} className="text-white" />
          </div>
          <span className="text-2xl font-bold tracking-tight">Bio<span className="text-blue-500">Face</span> SaaS</span>
        </div>
        <div className="hidden md:flex items-center gap-8 text-white/70 font-medium">
          <a href="#features" className="hover:text-white transition-colors">Características</a>
          <a href="#how-it-works" className="hover:text-white transition-colors">Funcionamiento</a>
          <button 
            onClick={onEnterApp}
            className="px-6 py-2 bg-white/10 hover:bg-white/20 rounded-full border border-white/10 transition-all active:scale-95"
          >
            Probar Demo
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="relative z-10 max-w-7xl mx-auto px-8 pt-20 pb-32 flex flex-col items-center text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-medium mb-8 animate-pulse">
          <Zap size={14} />
          <span>El futuro del control de asistencia está aquí</span>
        </div>
        <h1 className="text-5xl md:text-7xl font-extrabold mb-8 leading-tight">
          Gestiona tu empresa con <br />
          <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            Reconocimiento Facial
          </span>
        </h1>
        <p className="text-white/60 text-lg md:text-xl max-w-2xl mb-12 leading-relaxed">
          Sustituye los viejos marcadores por biometría de alta precisión. 
          Seguro, rápido y accesible desde cualquier lugar del mundo.
        </p>
        <div className="flex flex-col sm:flex-row gap-4">
          <a 
            href={whatsappLink}
            target="_blank"
            rel="noopener noreferrer"
            className="px-8 py-4 bg-blue-600 hover:bg-blue-500 rounded-2xl font-bold text-lg flex items-center gap-2 transition-all shadow-xl shadow-blue-600/30 active:scale-95"
          >
            Contactar ahora <MessageCircle size={20} />
          </a>
          <button 
            onClick={onEnterApp}
            className="px-8 py-4 bg-white/5 hover:bg-white/10 rounded-2xl font-bold text-lg border border-white/10 transition-all flex items-center gap-2 active:scale-95"
          >
            Ver Demo en Vivo <ArrowRight size={20} />
          </button>
        </div>
      </header>

      {/* Features Grid */}
      <section id="features" className="relative z-10 max-w-7xl mx-auto px-8 py-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <FeatureCard 
            icon={<Camera className="text-blue-400" size={32} />}
            title="Detección Inteligente"
            description="Reconocimiento 3D que evita fraudes con fotos o videos. Precisión del 99.8%."
          />
          <FeatureCard 
            icon={<Globe className="text-purple-400" size={32} />}
            title="Acceso en la Nube"
            description="Tus registros están seguros y disponibles 24/7 desde cualquier dispositivo."
          />
          <FeatureCard 
            icon={<ShieldCheck className="text-emerald-400" size={32} />}
            title="Seguridad Total"
            description="Encriptación de grado militar para proteger los datos de tus empleados."
          />
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="relative z-10 max-w-7xl mx-auto px-8 py-20 bg-white/5 rounded-[40px] border border-white/5 my-20">
        <div className="text-center mb-20">
          <h2 className="text-4xl font-bold mb-4">¿Cómo funciona?</h2>
          <p className="text-white/60">Implementa biometría en tan solo 3 pasos</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 text-center">
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 bg-blue-500/20 rounded-2xl flex items-center justify-center text-blue-400 font-bold text-2xl mb-6">1</div>
            <h3 className="text-xl font-bold mb-4">Registro Facial</h3>
            <p className="text-white/50 text-sm">El empleado registra su rostro en 10 segundos desde la cámara de cualquier PC.</p>
          </div>
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 bg-purple-500/20 rounded-2xl flex items-center justify-center text-purple-400 font-bold text-2xl mb-6">2</div>
            <h3 className="text-xl font-bold mb-4">Escaneo Diario</h3>
            <p className="text-white/50 text-sm">Al llegar, el empleado solo mira a la cámara. El sistema detecta entrada/salida automáticamente.</p>
          </div>
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 bg-emerald-500/20 rounded-2xl flex items-center justify-center text-emerald-400 font-bold text-2xl mb-6">3</div>
            <h3 className="text-xl font-bold mb-4">Reportes en Vivo</h3>
            <p className="text-white/50 text-sm">Como dueño, recibes reportes de puntualidad y asistencia en tiempo real.</p>
          </div>
        </div>
      </section>

      {/* Pricing Mockup Header */}
      <section className="relative z-10 max-w-7xl mx-auto px-8 py-20 text-center">
        <h2 className="text-4xl font-bold mb-12">Planes a tu medida</h2>
        <div className="max-w-md mx-auto p-1 bg-white/5 rounded-3xl border border-white/10 backdrop-blur-xl">
          <div className="bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl p-8">
            <h3 className="text-2xl font-bold mb-2">Servicio SaaS</h3>
            <div className="text-5xl font-extrabold mb-6">$19 <span className="text-lg font-normal text-white/70">/mes</span></div>
            <ul className="text-left space-y-4 mb-8">
              <li className="flex items-center gap-3 text-sm"><ShieldCheck size={18} /> Usuarios Ilimitados</li>
              <li className="flex items-center gap-3 text-sm"><ShieldCheck size={18} /> API Key Personalizada</li>
              <li className="flex items-center gap-3 text-sm"><ShieldCheck size={18} /> Soporte Técnico 24/7</li>
            </ul>
            <a 
              href={whatsappLink}
              target="_blank"
              rel="noopener noreferrer" 
              className="block w-full py-4 bg-white text-blue-600 rounded-xl font-bold transition-transform active:scale-95"
            >
              Solicitar Ahora
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5 mt-20 py-20">
        <div className="max-w-7xl mx-auto px-8 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-2">
            <Fingerprint size={32} className="text-blue-500" />
            <span className="text-xl font-bold">BioFace SaaS</span>
          </div>
          <div className="text-white/40 text-sm">
            © 2026 BioFace. Desarrollado para el control del futuro.
          </div>
          <div className="flex gap-6 text-white/60">
             <a href={whatsappLink} target="_blank" rel="noopener noreferrer" className="hover:text-whatsapp transition-colors">
               <MessageCircle size={24} />
             </a>
          </div>
        </div>
      </footer>

      {/* Floating WhatsApp */}
      <a 
        href={whatsappLink}
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-8 right-8 z-50 w-16 h-16 bg-[#25D366] rounded-full flex items-center justify-center shadow-2xl hover:scale-110 transition-transform active:scale-95 border-4 border-white/10"
      >
        <MessageCircle size={32} className="text-white" />
      </a>
    </div>
  );
};

const FeatureCard = ({ icon, title, description }) => (
  <div className="p-10 bg-white/5 rounded-[32px] border border-white/5 hover:border-white/10 transition-all hover:-translate-y-2 group">
    <div className="mb-6 group-hover:scale-110 transition-transform">{icon}</div>
    <h3 className="text-2xl font-bold mb-4">{title}</h3>
    <p className="text-white/50 leading-relaxed text-sm">{description}</p>
  </div>
);

export default Landing;
