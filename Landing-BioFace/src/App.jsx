import React, { useEffect, useState } from 'react';
import { Camera, ShieldCheck, BarChart3, Zap, Globe, MessageCircle, ArrowRight, UserPlus, Fingerprint, Eye, Lock, LockKeyhole as LockOpen, CheckCircle2 } from 'lucide-react';

const testimonials = [
  { name: "Andrés García", company: "Zeus Gym", quote: "Increíble la precisión. Mis clientes ya no tienen que llevar carnets, solo miran a la cámara." },
  { name: "Sofía Martínez", company: "Retail S.A.", quote: "El soporte técnico es de primer nivel. Nos ayudaron a integrar el API en una tarde." },
  { name: "Carlos Ruiz", company: "Colegio Harvard", quote: "Seguridad total para los alumnos. Los padres están tranquilos recibiendo alertas." },
  { name: "Lucía Pineda", company: "Innova Oficinas", quote: "Adiós a las colas en la entrada. El reconocimiento es instantáneo incluso con mascarilla." },
  { name: "Marcos Torres", company: "Logística 360", quote: "El sistema de detección de vida evitó que usaran fotos para marcar asistencia. Brutal." },
  { name: "Elena Ramos", company: "Star Fitness", quote: "La mejor inversión para mi negocio SaaS. Mis gastos en tarjetas NFC bajaron a cero." },
  { name: "Daniel Vega", company: "Finanzas Corp", quote: "La API es súper limpia y documentada. La implementación fue un juego de niños." },
  { name: "Paola Soto", company: "Hospital Central", quote: "Control de médicos eficiente. Saben que su rostro es su firma de ingreso." },
  { name: "Ricardo Luna", company: "Club El Olivar", quote: "El diseño de la aplicación móvil que nos hicieron quedó simplemente espectacular." },
  { name: "Valeria Cruz", company: "Gymnasio Olympus", quote: "Recuperé mi inversión en un mes gracias a que eliminé fraudes en los ingresos." },
  { name: "Hugo Méndez", company: "Tech solutions", quote: "Soporte constante y actualizaciones que siempre mejoran la precisión." },
  { name: "Camila Paz", company: "Co-working Space", quote: "Muy versátil. Lo usamos tanto para asistencia como para abrir la puerta principal." },
  { name: "Fernando Gil", company: "Cadena de Farmacias", quote: "Gestionar 50 sedes desde un solo panel administrativo es vida." },
  { name: "Gabriela Rios", company: "Seguros Andes", quote: "Cumple con todos los estándares legales y de seguridad de datos. Recomendado." },
  { name: "Javier Vargas", company: "Almacenes Unidos", quote: "Pude automatizar el pago de horas extra gracias a los reportes en tiempo real." },
  { name: "Natalia Benítez", company: "Estudio Contable", quote: "Mis colaboradores están felices con la modernidad del sistema facial." },
  { name: "Esteban Mora", company: "Crossfit Box", quote: "Resistente a sudor y cambios de luz. Sigue detectando perfectamente." },
  { name: "Lorena Flores", company: "Supermercado Sol", quote: "El reconocimiento de múltiples rostros al mismo tiempo agiliza el ingreso del personal." },
  { name: "Mario Duarte", company: "Inmobiliaria Real", quote: "Excelente panel de administración. Puedo ver quién está en la oficina desde mi casa." },
  { name: "Beatriz Díaz", company: "Escuela Profesional", quote: "Un antes y un después en nuestra gestión educativa. 100% confiable." }
];

const BiometricMorph = () => {
  const [step, setStep] = useState(0);
  const [isValidated, setIsValidated] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setIsValidated(false);
      setStep((prev) => (prev + 1) % 3);
      
      // Validation trigger after 2.5 seconds in each step
      setTimeout(() => setIsValidated(true), 2500);
    }, 5000);
    
    // Initial validation
    const initialTimer = setTimeout(() => setIsValidated(true), 2500);
    
    return () => {
      clearInterval(timer);
      clearTimeout(initialTimer);
    };
  }, []);

  return (
    <div className="relative w-48 h-48 flex items-center justify-center">
      {/* Eye Outer Frame */}
      <div className={`absolute inset-0 border-2 rounded-full transition-colors duration-1000 ${isValidated ? 'border-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.3)]' : 'border-blue-500/30'} animate-[spin_15s_linear_infinite]`}></div>
      <div className="absolute inset-4 border border-blue-400/10 rounded-full"></div>
      
      {/* Morphing Icons */}
      <div className="relative z-10 transition-all duration-700">
        {step === 0 && (
          <div className="animate-in fade-in zoom-in duration-700 animate-blink">
            <div className={!isValidated ? "animate-scan-x" : ""}>
              <Eye size={80} className={`${isValidated ? 'text-emerald-400' : 'text-blue-400'} transition-all duration-1000 drop-shadow-[0_0_15px_rgba(59,130,246,0.5)]`} />
            </div>
          </div>
        )}
        
        {step === 1 && (
          <div className={`animate-in fade-in zoom-in duration-700 ${isValidated ? 'animate-success-pulse' : ''}`}>
             {isValidated ? (
               <LockOpen size={80} className="text-emerald-400 drop-shadow-[0_0_20px_rgba(16,185,129,0.6)]" />
             ) : (
               <Lock size={80} className="text-red-400 drop-shadow-[0_0_15px_rgba(248,113,113,0.5)]" />
             )}
          </div>
        )}

        {step === 2 && (
          <div className={`animate-in fade-in zoom-in duration-700 ${isValidated ? 'animate-success-pulse' : ''}`}>
            <Fingerprint size={80} className={`${isValidated ? 'text-emerald-400' : 'text-red-400'} transition-all duration-1000 drop-shadow-[0_0_20px_rgba(16,185,129,0.6)]`} />
          </div>
        )}
      </div>

      {/* Success Symbol Overlay */}
      {isValidated && (
        <div className="absolute top-2 right-2 animate-in zoom-in spin-in-90 duration-500">
          <CheckCircle2 size={36} className="text-emerald-500 fill-emerald-500/10 backdrop-blur-xl rounded-full" />
        </div>
      )}

      {/* Scanning Line */}
      {!isValidated && (
        <div className="absolute inset-0 flex items-center justify-center overflow-hidden rounded-full pointer-events-none">
          <div className="w-full h-[1px] bg-blue-400/50 shadow-[0_0_15px_rgba(96,165,250,1)] animate-[scan-y_2s_ease-in-out_infinite]"></div>
        </div>
      )}
    </div>
  );
};

export default function App() {
  const whatsappNumber = "+51901615649";
  const whatsappMessage = encodeURIComponent("Hola, estoy interesado en el sistema de asistencia facial. Me gustaría recibir más información.");
  const whatsappLink = `https://wa.me/${whatsappNumber}?text=${whatsappMessage}`;

  // Link for the Demo App
  const demoAppLink = "https://asistencia-rostros.vercel.app/app";

  // Scroll Reveal Logic
  useEffect(() => {
    const observerOptions = {
      threshold: 0.1,
      rootMargin: "0px 0px -50px 0px"
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('reveal-visible');
        } else {
          entry.target.classList.remove('reveal-visible');
        }
      });
    }, observerOptions);

    const elements = document.querySelectorAll('.reveal');
    elements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-white font-sans overflow-x-hidden selection:bg-blue-500/30">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-blue-600/20 blur-[140px] rounded-full animate-bubble opacity-50"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-purple-600/20 blur-[140px] rounded-full animate-bubble-delayed opacity-50"></div>
        
        {/* Animated 2D Grid Layer */}
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>
        <div className="absolute inset-0 [perspective:800px] opacity-40">
          <div className="absolute inset-0 [transform:rotateX(60deg)] bg-[linear-gradient(to_right,#3b82f6_1px,transparent_1px),linear-gradient(to_bottom,#3b82f6_1px,transparent_1px)] bg-[size:40px_40px] animate-grid-scroll [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_100%)]"></div>
        </div>

        {/* Data Bars */}
        <div className="absolute inset-x-0 bottom-0 h-64 flex items-end justify-center gap-1 opacity-20 pointer-events-none">
          {[...Array(40)].map((_, i) => (
            <div 
              key={i}
              className="w-full bg-gradient-to-t from-blue-600 to-purple-500 rounded-t-full animate-bar-pulse"
              style={{ 
                height: `${20 + Math.random() * 80}%`,
                animationDelay: `${i * 0.1}s`,
                width: '12px'
              }}
            ></div>
          ))}
        </div>
      </div>

      {/* Navigation */}
      <nav className="relative z-20 flex border-b border-white/5 backdrop-blur-md sticky top-0 bg-[#0a0a0c]/50">
        <div className="max-w-7xl mx-auto w-full flex items-center justify-between px-8 py-6">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Fingerprint size={24} className="text-white" />
            </div>
            <span className="text-2xl font-bold tracking-tight">Bio<span className="text-blue-500">Face</span> SaaS</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-white/70 font-medium">
            <a href="#features" className="hover:text-white transition-colors">Características</a>
            <a href="#how-it-works" className="hover:text-white transition-colors">Funcionamiento</a>
            <a
              href={demoAppLink}
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-2 bg-white/10 hover:bg-white/20 rounded-full border border-white/10 transition-all active:scale-95 text-sm"
            >
              Probar Demo
            </a>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="relative z-10 max-w-7xl mx-auto px-8 pt-20 pb-32 flex flex-col items-center text-center animate-float">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold mb-8 animate-pulse uppercase tracking-widest">
          <Zap size={14} />
          <span>El futuro del control de asistencia</span>
        </div>
        <h1 className="text-5xl md:text-8xl font-black mb-8 leading-tight tracking-tighter">
          Empodera tu empresa <br />
          <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            Reconocimiento Facial
          </span>
        </h1>
        <p className="text-white/60 text-lg md:text-xl max-w-2xl mb-12 leading-relaxed">
          Sustituye los viejos marcadores por biometría de alta precisión.
          Controla entradas, salidas and puntualidad con el poder de la IA.
        </p>
        <div className="flex flex-col sm:flex-row gap-4">
          <a
            href={whatsappLink}
            target="_blank"
            rel="noopener noreferrer"
            className="px-8 py-5 bg-blue-600 hover:bg-blue-500 rounded-2xl font-black text-lg flex items-center gap-3 transition-all shadow-xl shadow-blue-600/30 active:scale-95 border-t border-white/20"
          >
            Contactar ahora <MessageCircle size={22} />
          </a>
          <a
            href={demoAppLink}
            target="_blank"
            rel="noopener noreferrer"
            className="px-8 py-5 bg-white/5 hover:bg-white/10 rounded-2xl font-black text-lg border border-white/10 transition-all flex items-center gap-3 active:scale-95 backdrop-blur-lg"
          >
            Ver Demo en Vivo <ArrowRight size={22} />
          </a>
        </div>
      </header>

      {/* Features Grid */}
      <section id="features" className="relative z-10 max-w-7xl mx-auto px-8 py-20 reveal">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <FeatureCard
            icon={<Camera className="text-blue-400" size={36} />}
            title="Detección de Vida"
            description="Algoritmos avanzados que distinguen entre un rostro real y una fotografía o video."
          />
          <FeatureCard
            icon={<Globe className="text-purple-400" size={36} />}
            title="SaaS Multi-plataforma"
            description="Úsalo en cualquier PC con cámara. La IA inteligente hará el trabajo pesado por ti."
          />
          <FeatureCard
            icon={<ShieldCheck className="text-emerald-400" size={36} />}
            title="Seguridad de Datos"
            description="Toda la información se encripta y se aisla por cada cliente registrado."
          />
        </div>
      </section>

      {/* Iris Ocular - Upcoming Section */}
      <section className="relative z-10 max-w-7xl mx-auto px-8 py-10 reveal">
        <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-[48px] border border-white/5 p-12 backdrop-blur-3xl overflow-hidden relative group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 blur-[100px] -mr-32 -mt-32 group-hover:bg-blue-500/20 transition-all duration-1000"></div>
          
          <div className="flex flex-col md:flex-row items-center gap-12 relative z-10">
            <div className="flex-shrink-0">
               <BiometricMorph />
            </div>
            
            <div className="text-center md:text-left flex-grow">
              <span className="inline-block px-4 py-1 rounded-full bg-blue-500/20 text-blue-300 text-[10px] font-black uppercase tracking-widest mb-4 border border-blue-500/30">
                Próximamente: Q3 2026
              </span>
              <h2 className="text-4xl font-black mb-4 bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent uppercase tracking-tighter">
                Integración con <span className="text-blue-400">Iris Ocular</span>
              </h2>
              <p className="text-white/50 text-lg max-w-xl font-medium leading-relaxed">
                Estamos llevando la biometría al siguiente nivel. Identificación por patrones IRIS: <br />
                <span className="text-white/80">Seguro, higiénico y 100% infalible.</span>
              </p>
            </div>
            
            <div className="flex-shrink-0">
              <div className="px-8 py-4 bg-white text-blue-900 rounded-2xl font-black text-sm shadow-xl shadow-white/10 hover:scale-105 transition-transform cursor-default">
                Serás de los primeros
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="relative z-10 py-20 overflow-hidden reveal">
        <div className="max-w-7xl mx-auto px-8 mb-12 flex items-end justify-between">
          <div>
            <h2 className="text-4xl font-black mb-4">Confían en nosotros</h2>
            <p className="text-white/40 font-medium">Más de 200 empresas transformando su seguridad</p>
          </div>
          <div className="hidden md:block px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-full text-blue-400 text-xs font-bold uppercase tracking-widest">
            Reseñas Reales
          </div>
        </div>

        {/* Scrolling Track */}
        <div className="relative flex overflow-hidden py-10">
          <div className="flex animate-infinite-scroll hover:[animation-play-state:paused] gap-6">
            {[...testimonials, ...testimonials].map((t, i) => (
              <div key={i} className="flex-shrink-0 w-80 p-8 bg-white/5 backdrop-blur-3xl rounded-[32px] border border-white/5 hover:border-white/20 transition-all group">
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, i) => <Zap key={i} size={14} className="text-yellow-400 fill-yellow-400" />)}
                </div>
                <p className="text-white/70 text-sm italic mb-6 leading-relaxed group-hover:text-white transition-colors">
                  "{t.quote}"
                </p>
                <div className="flex items-center gap-4 border-t border-white/5 pt-6">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center font-black text-xs">
                    {t.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <h4 className="font-bold text-sm tracking-tight">{t.name}</h4>
                    <p className="text-[10px] text-white/30 uppercase tracking-widest font-bold">{t.company}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="relative z-10 max-w-7xl mx-auto px-8 py-20 bg-white/5 rounded-[48px] border border-white/5 my-20 backdrop-blur-3xl overflow-hidden reveal">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 blur-[150px] -mr-48 -mt-48"></div>
        <div className="text-center mb-24">
          <h2 className="text-5xl font-black mb-6">Implementación Express</h2>
          <p className="text-white/40 text-lg">Tu empresa configurada en menos de 5 minutos</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-16 text-center">
          <Step
            number="1"
            title="Registro de Staff"
            desc="Toma 3 fotos de cada empleado para crear su firma biométrica única."
            color="text-blue-400"
            bg="bg-blue-400/20"
          />
          <Step
            number="2"
            title="Escaneo Diario"
            desc="El empleado se identifica al entrar y salir con solo mirar a la cámara."
            color="text-purple-400"
            bg="bg-purple-400/20"
          />
          <Step
            number="3"
            title="Gestión Total"
            desc="Accede a reportes detallados de asistencia, tardanzas y productividad."
            color="text-pink-400"
            bg="bg-pink-400/20"
          />
        </div>
      </section>

      {/* Pricing Mockup */}
      <section className="relative z-10 max-w-7xl mx-auto px-8 py-20 reveal">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-black mb-4 text-white">Planes para tu Empresa</h2>
          <p className="text-white/40">Escala tu seguridad con la mejor tecnología biométrica</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-7xl mx-auto">
          {/* Plan Trial Gratuito */}
          <div className="bg-white/5 backdrop-blur-xl rounded-[40px] p-8 border border-white/5 hover:border-white/20 transition-all flex flex-col hover:-translate-y-1">
            <h3 className="text-xl font-black mb-2 text-white/80 uppercase tracking-tighter">Trial Gratuito</h3>
            <p className="text-white/40 mb-6 text-xs italic">Prueba la potencia de la IA</p>
            <div className="text-5xl font-black mb-8 flex items-end">
              S/.0 <span className="text-base font-bold opacity-30 ml-2 mb-1">/7 días</span>
            </div>
            <ul className="text-left space-y-4 mb-10 flex-grow">
              <li className="flex items-center gap-3 text-xs font-medium text-white/70"><ShieldCheck className="text-white/40" size={16} /> API Key de Prueba</li>
              <li className="flex items-center gap-3 text-xs font-medium text-white/70"><ShieldCheck className="text-white/40" size={16} /> Soporte de Integración</li>
              <li className="flex items-center gap-3 text-xs font-medium text-white/70"><ShieldCheck className="text-white/40" size={16} /> Acceso a Demo App</li>
              <li className="flex items-center gap-3 text-xs font-medium text-white/70 opacity-30"><ShieldCheck size={16} /> Dashboard de reportes</li>
            </ul>
            <a
              href={whatsappLink}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full py-3 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-xl font-bold text-center text-sm transition-all active:scale-95"
            >
              Solicitar 7 Días
            </a>
          </div>

          {/* Plan Mensual */}
          <div className="bg-white/5 backdrop-blur-xl rounded-[40px] p-8 border border-white/10 hover:border-blue-500/30 transition-all flex flex-col hover:-translate-y-1 relative">
            <div className="absolute top-4 right-6 bg-blue-500 text-white text-[10px] font-black px-3 py-1 rounded-full uppercase">Más Popular</div>
            <h3 className="text-xl font-black mb-2 text-blue-400 uppercase tracking-tighter">SaaS Mensual</h3>
            <p className="text-white/50 mb-6 text-xs italic">Control total mes a mes</p>
            <div className="text-5xl font-black mb-8 flex items-end">
              S/.60 <span className="text-base font-bold opacity-40 ml-2 mb-1">/mes</span>
            </div>
            <ul className="text-left space-y-4 mb-10 flex-grow">
              <li className="flex items-center gap-3 text-xs font-medium"><ShieldCheck className="text-blue-500" size={16} /> Gratis el primer mes</li>
              <li className="flex items-center gap-3 text-xs font-medium"><ShieldCheck className="text-blue-500" size={16} /> Usuarios sin límite</li>
              <li className="flex items-center gap-3 text-xs font-medium"><ShieldCheck className="text-blue-500" size={16} /> Dashboard de reportes</li>
              <li className="flex items-center gap-3 text-xs font-medium"><ShieldCheck className="text-blue-500" size={16} /> Guía de integración</li>
              <li className="flex items-center gap-3 text-xs font-medium"><ShieldCheck className="text-blue-500" size={16} /> API Personalizada</li>
              <li className="flex items-center gap-3 text-xs font-medium"><ShieldCheck className="text-blue-500" size={16} /> Soporte 24/7</li>
            </ul>
            <a
              href={whatsappLink}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full py-4 bg-blue-600/20 hover:bg-blue-600/40 text-white border border-blue-500/30 rounded-xl font-black text-center transition-all active:scale-95"
            >
              Iniciar Mensual
            </a>
          </div>

          {/* Plan Anual Pro */}
          <div className="bg-gradient-to-br from-blue-600 to-purple-700 rounded-[40px] p-8 text-center shadow-2xl shadow-blue-600/20 border border-white/20 relative overflow-hidden flex flex-col hover:-translate-y-1 transition-all">
            <div className="absolute top-4 right-[-35px] bg-yellow-400 text-black text-[9px] font-black px-10 py-1 rotate-45 uppercase tracking-tighter shadow-lg">Mejor Valor</div>
            <h3 className="text-xl font-black mb-2 text-white uppercase tracking-tighter">Empresa Anual Pro</h3>
            <p className="text-white/80 mb-6 text-xs italic font-medium">Solución Premium 360°</p>
            <div className="text-5xl font-black mb-8 flex items-end justify-center">
              S/.550 <span className="text-base font-bold opacity-70 ml-2 mb-1">/año</span>
            </div>
            <ul className="text-left space-y-3 mb-10 flex-grow">
              <li className="flex items-center gap-3 text-[11px] font-bold bg-white/10 p-2 rounded-lg"><Zap className="text-yellow-400" size={16} /> Desarrollo Web de Accesos</li>
              <li className="flex items-center gap-3 text-[11px] font-bold bg-white/10 p-2 rounded-lg"><Zap className="text-yellow-400" size={16} /> Panel Admin Personalizado</li>
              <li className="flex items-center gap-3 text-[11px] font-medium"><ShieldCheck size={16} /> Hosting incluido</li>
              <li className="flex items-center gap-3 text-[11px] font-medium"><ShieldCheck size={16} /> Visita técnica Trimestral</li>
              <li className="flex items-center gap-3 text-[11px] font-medium"><ShieldCheck size={16} /> Auditoría de Seguridad</li>
              <li className="flex items-center gap-3 text-[11px] font-medium"><ShieldCheck size={16} /> Soporte Prioritario</li>
            </ul>
            <a
              href={whatsappLink}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full py-4 bg-white text-blue-700 rounded-xl font-black text-lg transition-all hover:scale-[1.02] active:scale-95 shadow-xl"
            >
              Adquirir Plan Pro
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5 py-20 mt-20">
        <div className="max-w-7xl mx-auto px-8 flex flex-col md:flex-row justify-between items-center gap-12">
          <div className="flex items-center gap-3">
            <Fingerprint size={40} className="text-blue-500" />
            <span className="text-2xl font-black tracking-tighter">BioFace</span>
          </div>
          <div className="text-white/30 font-medium text-center md:text-left">
            © 2026 BioFace SaaS Platform. <br className="md:hidden" /> Todos los derechos reservados.
          </div>
          <div className="flex gap-6">
            <SocialIcon link={whatsappLink} />
          </div>
        </div>
      </footer>

      {/* Whatsapp Float */}
      <a
        href={whatsappLink}
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-10 right-10 z-50 w-20 h-20 bg-whatsapp rounded-full flex items-center justify-center shadow-2xl hover:scale-110 transition-transform active:scale-95 group"
      >
        <MessageCircle size={38} className="text-white" />
        <span className="absolute right-full mr-4 bg-white text-black px-4 py-2 rounded-xl text-sm font-bold opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-xl">
          ¿Dudas? Habla con nosotros
        </span>
      </a>
    </div>
  );
}

const FeatureCard = ({ icon, title, description }) => (
  <div className="p-12 bg-white/5 rounded-[40px] border border-white/5 hover:border-white/10 transition-all hover:-translate-y-2 group backdrop-blur-xl">
    <div className="mb-8 group-hover:scale-110 transition-transform">{icon}</div>
    <h3 className="text-2xl font-black mb-4">{title}</h3>
    <p className="text-white/40 leading-relaxed font-medium">{description}</p>
  </div>
);

const Step = ({ number, title, desc, color, bg }) => (
  <div className="flex flex-col items-center">
    <div className={`w-20 h-20 ${bg} ${color} rounded-3xl flex items-center justify-center font-black text-3xl mb-8`}>{number}</div>
    <h3 className="text-2xl font-black mb-4">{title}</h3>
    <p className="text-white/40 font-medium leading-relaxed">{desc}</p>
  </div>
);

const SocialIcon = ({ link }) => (
  <a href={link} target="_blank" rel="noopener noreferrer" className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center hover:bg-white/10 transition-all text-white/60 hover:text-white">
    <MessageCircle size={24} />
  </a>
);
