import React, { useState, useRef, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import AdminSettings from './pages/AdminSettings';
import AdminClients from './pages/AdminClients';
import AdminVideos from './pages/AdminVideos';
import AdminSales from './pages/AdminSales';
import AdminTools from './pages/AdminTools';
import AdminSoraRemover from './pages/AdminSoraRemover';
import LeadSearch from './pages/LeadSearch';
import AdminLeads from './pages/AdminLeads';
import EmployeeProfile from './pages/EmployeeProfile';
import ClientLogin from './pages/ClientLogin';
import ClientDashboard from './pages/ClientDashboard';
import ClientProjects from './pages/ClientProjects';
import ClientPurchases from './pages/ClientPurchases';
import ClientSettings from './pages/ClientSettings';
import ProtectedRoute from './components/ProtectedRoute';
import { motion, useScroll, useTransform, AnimatePresence } from 'motion/react';
import { useAgencySettings } from './hooks/useAgencySettings';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { TextPlugin } from 'gsap/TextPlugin';
import * as THREE from 'three';
import { 
  Play, 
  ArrowRight, 
  ChevronsLeftRight, 
  Check, 
  CheckCircle2, 
  X, 
  Sparkles,
  ArrowUpRight,
  Heart,
  MessageCircle,
  Send,
  ChevronUp,
  ChevronDown,
  Camera,
  Cpu,
  Music,
  MoreHorizontal,
  Bookmark
} from 'lucide-react';

const LOGO_URL = "/logo.png";

gsap.registerPlugin(ScrollTrigger, TextPlugin);

const cases = [
  {
    videoSrc: "https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
    tituloDaCampanha: "SaaS Elite",
    metricaPrincipal: "+40% ROI",
    descricao: "Vídeos cinematográficos aplicados em funis de alta performance para o mercado B2B.",
    cliente: "@saas_elite"
  },
  {
    videoSrc: "https://storage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
    tituloDaCampanha: "Moda & E-commerce",
    metricaPrincipal: "2.5x ROAS",
    descricao: "Storytelling visual que transforma a percepção da marca e gera desejo imediato.",
    cliente: "@fashion_luxury"
  },
  {
    videoSrc: "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
    tituloDaCampanha: "Infoprodutos",
    metricaPrincipal: "12M Views",
    descricao: "Conteúdo viral estratégico para lançamentos de sete dígitos.",
    cliente: "@expert_digital"
  }
];

function MainApp() {
  const { settings } = useAgencySettings();
  const [isReady, setIsReady] = useState(true); // Set to true by default since we removed the preloader

  useEffect(() => {
    // Cinematic Matrix Background Logic
    const bgConstruct = document.querySelector('#bg-construct');
    const bgProcessing = document.querySelector('#bg-processing');
    const bgReality = document.querySelector('#bg-reality');

    if (bgConstruct && bgProcessing && bgReality) {
      // Act 1 to Act 2: Results/Portfolio
      ScrollTrigger.create({
        trigger: "#results",
        start: "top 60%",
        onEnter: () => {
          gsap.to(bgConstruct, { opacity: 0, duration: 1.5, ease: "power2.inOut" });
          gsap.fromTo(bgProcessing, 
            { opacity: 0, scale: 1.05 },
            { opacity: 1, scale: 1, duration: 1.5, ease: "power2.inOut" }
          );
        },
        onLeaveBack: () => {
          gsap.to(bgConstruct, { opacity: 1, duration: 1.5, ease: "power2.inOut" });
          gsap.to(bgProcessing, { opacity: 0, scale: 1.05, duration: 1.5, ease: "power2.inOut" });
        }
      });

      // Act 2 to Act 3: Pricing (The Revelation)
      ScrollTrigger.create({
        trigger: "#pricing",
        start: "top 70%",
        onEnter: () => {
          gsap.to(bgProcessing, { opacity: 0, duration: 1.5, ease: "power2.inOut" });
          gsap.to(bgReality, { opacity: 1, duration: 2, ease: "power2.inOut" });
        },
        onLeaveBack: () => {
          gsap.to(bgProcessing, { opacity: 1, duration: 1.5, ease: "power2.inOut" });
          gsap.to(bgReality, { opacity: 0, duration: 1.5, ease: "power2.inOut" });
        }
      });
    }
  }, []);

  return (
    <div className="font-body selection:bg-primary selection:text-on-primary min-h-screen bg-transparent text-on-background relative">
      {/* Main Content */}
      <div id="main-content" className={`transition-opacity duration-1000 ${isReady ? 'opacity-100' : 'opacity-0'}`}>
        <ImmersiveBackground />
        <div className="relative z-10">
          <Navbar />
          <Hero isReady={isReady} settings={settings} />
          <Results settings={settings} />
          <Transformation settings={settings} />
          <Workflow settings={settings} />
          <Pricing />
          <Footer />
        </div>
      </div>
    </div>
  );
}

function Footer() {
  return (
    <footer className="py-12 border-t border-white/10 bg-[#020202] relative z-10">
      <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <img 
            alt="Next Creatives Corporate Logo" 
            className="h-8 object-contain logo-transparent opacity-50 hover:opacity-100 transition-opacity" 
            src="/logo.png"
            referrerPolicy="no-referrer"
          />
          <span className="text-white/30 text-xs font-light">© {new Date().getFullYear()} Next Creatives. All rights reserved.</span>
        </div>
        
        <div className="flex items-center gap-6">
          <Link to="/admin" className="text-white/30 hover:text-secondary text-xs font-light transition-colors flex items-center gap-2">
            <span className="material-symbols-outlined text-[14px]">admin_panel_settings</span>
            Admin Access
          </Link>
        </div>
      </div>
    </footer>
  );
}

function ImmersiveBackground() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mountRef.current) return;

    // Three.js Setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mountRef.current.appendChild(renderer.domElement);

    // Particles
    const particlesGeometry = new THREE.BufferGeometry();
    const isMobile = window.innerWidth < 768;
    const particlesCount = isMobile ? 600 : 2000;
    
    const posArray = new Float32Array(particlesCount * 3);
    const colorsArray = new Float32Array(particlesCount * 3);
    
    const color1 = new THREE.Color('#adc6ff'); // Electric Blue
    const color2 = new THREE.Color('#e9b3ff'); // Neon Purple

    for(let i = 0; i < particlesCount * 3; i+=3) {
      // Position
      posArray[i] = (Math.random() - 0.5) * 10;
      posArray[i+1] = (Math.random() - 0.5) * 10;
      posArray[i+2] = (Math.random() - 0.5) * 10;

      // Color interpolation
      const mixedColor = color1.clone().lerp(color2, Math.random());
      colorsArray[i] = mixedColor.r;
      colorsArray[i+1] = mixedColor.g;
      colorsArray[i+2] = mixedColor.b;
    }

    particlesGeometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
    particlesGeometry.setAttribute('color', new THREE.BufferAttribute(colorsArray, 3));

    // Custom Shader Material for glow and color transition
    const particlesMaterial = new THREE.PointsMaterial({
      size: 0.02,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      transparent: true,
      opacity: 0.4,
    });

    const particlesMesh = new THREE.Points(particlesGeometry, particlesMaterial);
    scene.add(particlesMesh);

    camera.position.z = 3;

    // Mouse Interaction
    let mouseX = 0;
    let mouseY = 0;
    let targetX = 0;
    let targetY = 0;

    const windowHalfX = window.innerWidth / 2;
    const windowHalfY = window.innerHeight / 2;

    const onDocumentMouseMove = (event: MouseEvent) => {
      mouseX = (event.clientX - windowHalfX);
      mouseY = (event.clientY - windowHalfY);
    };

    document.addEventListener('mousemove', onDocumentMouseMove);

    // Animation Loop
    const clock = new THREE.Clock();

    const animate = () => {
      requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      targetX = mouseX * 0.001;
      targetY = mouseY * 0.001;

      // Rotate entire system slowly
      particlesMesh.rotation.y += 0.001;
      particlesMesh.rotation.x += 0.0005;

      // Mouse interaction - subtle tilt
      particlesMesh.rotation.y += 0.05 * (targetX - particlesMesh.rotation.y);
      particlesMesh.rotation.x += 0.05 * (targetY - particlesMesh.rotation.x);

      // Wave effect on particles
      const positions = particlesGeometry.attributes.position.array as Float32Array;
      for(let i = 0; i < particlesCount; i++) {
        const i3 = i * 3;
        const x = particlesGeometry.attributes.position.array[i3];
        const z = particlesGeometry.attributes.position.array[i3+2];
        
        // Organic wave motion
        positions[i3+1] += Math.sin(elapsedTime + x) * 0.002;
        positions[i3+2] += Math.cos(elapsedTime + z) * 0.002;
      }
      particlesGeometry.attributes.position.needsUpdate = true;

      renderer.render(scene, camera);
    };

    animate();

    // Resize Handler
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('mousemove', onDocumentMouseMove);
      if (mountRef.current) {
        mountRef.current.removeChild(renderer.domElement);
      }
      particlesGeometry.dispose();
      particlesMaterial.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div id="immersive-bg" className="fixed inset-0 w-full h-full -z-10 bg-[#050505] overflow-hidden">
      {/* 3D Shape Animated Background */}
      <motion.div 
        className="absolute inset-0 flex items-center justify-center opacity-40 mix-blend-screen pointer-events-none transform-gpu will-change-transform"
        animate={{
          rotate: [0, 360],
          scale: [1, 1.1, 1],
        }}
        transition={{
          rotate: { duration: 80, repeat: Infinity, ease: "linear" },
          scale: { duration: 15, repeat: Infinity, ease: "easeInOut" }
        }}
      >
        <motion.img 
          src="/bg-shape.png" 
          alt="3D Background Shape" 
          className="w-[120vw] h-[120vw] max-w-[1200px] max-h-[1200px] object-contain drop-shadow-[0_0_50px_rgba(153,0,255,0.3)] transform-gpu will-change-transform"
          loading="lazy"
          animate={{
            y: [-30, 30, -30],
            x: [-20, 20, -20],
          }}
          transition={{
            y: { duration: 10, repeat: Infinity, ease: "easeInOut" },
            x: { duration: 14, repeat: Infinity, ease: "easeInOut" }
          }}
          onError={(e) => {
            // Fallback to a similar 3D abstract shape if the user hasn't uploaded the image yet
            e.currentTarget.src = "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2000&auto=format&fit=crop";
            e.currentTarget.className = "w-[120vw] h-[120vw] max-w-[1200px] max-h-[1200px] object-cover opacity-50 mix-blend-screen rounded-full blur-3xl";
          }}
        />
      </motion.div>

      {/* WebGL Canvas Container */}
      <div ref={mountRef} className="absolute inset-0 w-full h-full opacity-40 mix-blend-screen"></div>

      {/* Layer 1 (Hero): Deep Void with Subtle Data Flows */}
      <div id="bg-construct" className="absolute inset-0 w-full h-full opacity-1 transition-opacity duration-1000 bg-gradient-to-b from-[#020202] to-transparent">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(0,102,255,0.05),transparent_60%)]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(153,0,255,0.05),transparent_40%)]"></div>
      </div>
      
      {/* Layer 2 (Portfolio/Results): Digital Processing Environment */}
      <div id="bg-processing" className="absolute inset-0 w-full h-full opacity-0 transition-opacity duration-1000">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0066ff]/5 to-[#9900ff]/5 mix-blend-overlay"></div>
        <div className="absolute inset-0 backdrop-blur-[2px] bg-black/80"></div>
      </div>

      {/* Layer 3 (Pricing/Planos): Hyper-realistic Cinematic Reality */}
      <div id="bg-reality" className="absolute inset-0 w-full h-full opacity-0 transition-opacity duration-1000">
        <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/80 to-transparent"></div>
      </div>

      {/* Global Overlay for Legibility */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px]"></div>
    </div>
  );
}

function Navbar() {
  const { scrollY } = useScroll();
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    return scrollY.on("change", (latest) => {
      setIsScrolled(latest > window.innerHeight - 100);
    });
  }, [scrollY]);

  return (
    <nav className="fixed top-6 left-1/2 -translate-x-1/2 w-[95%] max-w-screen-2xl z-50">
      <div className="bg-[#131313]/60 backdrop-blur-2xl border border-white/10 rounded-full px-6 md:px-10 py-3 flex justify-between items-center shadow-2xl">
        <div className="flex items-center">
          <img alt="Next Creatives Logo" className="w-auto object-contain logo-transparent h-8 md:h-9" src={LOGO_URL} referrerPolicy="no-referrer" />
        </div>
        
        <div className="hidden md:flex gap-10 font-body font-light text-xs uppercase tracking-[0.2em]">
          <a className="text-white/60 hover:text-white transition-colors duration-300" href="#results">Portfólio</a>
          <a className="text-white/60 hover:text-white transition-colors duration-300" href="#pricing">Pacotes</a>
        </div>
        
        <div className="flex items-center gap-6 md:gap-8">
          <Link className="hidden sm:block text-white font-body font-medium text-sm hover:text-primary transition-colors duration-300" to="/client/login">
            Área do Cliente
          </Link>
          <button className={`flex items-center gap-3 border rounded-2xl font-body font-light text-[10px] uppercase tracking-[0.2em] transition-all duration-700 group px-6 py-3 ${
            isScrolled 
              ? 'bg-secondary text-on-secondary border-secondary shadow-2xl scale-105' 
              : 'border-white/10 hover:border-white/30 bg-white/[0.02] hover:bg-white/[0.05] text-white/80 hover:text-white'
          }`}>
            {isScrolled ? 'Assinar Agora' : 'Iniciar Projeto'}
            <ArrowUpRight className={`w-3 h-3 transition-all ${
              isScrolled ? 'text-on-secondary' : 'text-white/30 group-hover:text-white group-hover:translate-x-0.5 group-hover:-translate-y-0.5'
            }`} strokeWidth={1} />
          </button>
        </div>
      </div>
    </nav>
  );
}

function Hero({ isReady, settings }: { isReady: boolean, settings: any }) {
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [0, 500], [0, 100]);
  const scale = useTransform(scrollY, [0, 500], [1.1, 1.2]);
  const opacity = useTransform(scrollY, [0, 500], [0.08, 0.15]);
  const textRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (isReady && textRef.current) {
      // GSAP Text Reveal Animation
      const text = textRef.current;
      
      // Split text into words for animation (simple approach without SplitText plugin)
      const content = settings.heroTitle;
      text.innerHTML = content;
      
      gsap.fromTo(text, 
        { 
          opacity: 0,
          backgroundPosition: "200% center"
        },
        {
          opacity: 1,
          backgroundPosition: "0% center",
          duration: 2.5,
          ease: "power3.out",
          delay: 0.2,
          onComplete: () => {
            // Re-inject with span if it was the default one, or just keep it as is
            if (settings.heroTitle.includes("autoridade")) {
               text.innerHTML = settings.heroTitle.replace("autoridade", '<span class="font-serif italic text-secondary font-light">autoridade</span>');
            } else {
               text.innerHTML = settings.heroTitle;
            }
          }
        }
      );
    }
  }, [isReady, settings.heroTitle]);

  return (
    <section id="hero" className="relative min-h-screen flex items-center justify-center pt-24 overflow-hidden bg-transparent">
      {/* Logo Watermark Background */}
      <motion.div 
        style={{ y, scale, opacity }}
        className="absolute inset-0 z-0 flex items-center justify-center pointer-events-none overflow-hidden transform-gpu will-change-transform"
      >
        <img 
          src={LOGO_URL} 
          alt="Watermark" 
          className="w-[110%] h-[110%] object-contain opacity-50 blur-[15px] grayscale-[0.1] brightness-[0.9]"
          referrerPolicy="no-referrer"
        />
      </motion.div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 flex flex-col items-center text-center">
        <motion.span 
          initial={{ opacity: 0, y: 20 }}
          animate={isReady ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.8 }}
          className="inline-flex items-center gap-3 py-2 px-6 rounded-full border border-secondary/30 text-secondary text-xs font-bold tracking-[0.3em] uppercase mb-8 glass-card"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
          </span>
          NEXT CREATIVES STUDIO
        </motion.span>
        
        <h1 
          ref={textRef}
          className="font-headline text-4xl md:text-8xl font-extrabold tracking-tighter leading-[1.05] mb-8 bg-clip-text text-transparent bg-[linear-gradient(to_right,#ffffff,rgba(255,255,255,0.8),#adc6ff,#e9b3ff,#ffffff)] bg-[length:200%_auto] opacity-0"
        >
          {/* Content injected via GSAP */}
        </h1>
        
        <motion.p 
          initial={{ opacity: 0, y: 30 }}
          animate={isReady ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.8, delay: 1.5 }} // Delayed to appear after title
          className="text-on-surface-variant text-lg md:text-xl max-w-2xl mb-12 font-light leading-relaxed"
        >
          {settings.heroDescription}
        </motion.p>
        
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={isReady ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.8, delay: 1.8 }} // Delayed to appear after paragraph
          className="flex flex-col items-center gap-10 transform-gpu will-change-transform"
        >
          <div className="flex flex-col sm:flex-row gap-6">
            <div className="relative group rounded-xl overflow-hidden p-[2px]">
              <div className="animated-border-bg opacity-70 group-hover:opacity-100 transition-opacity duration-500"></div>
              <button className="relative px-10 py-5 bg-gradient-to-r from-secondary to-primary text-on-secondary rounded-[10px] font-headline font-bold uppercase text-sm tracking-widest hover:shadow-[0_0_30px_rgba(233,179,255,0.5)] transition-all duration-500 w-full h-full">
                Solicitar Produção VIP
              </button>
            </div>
            <button className="px-10 py-5 bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl font-headline font-bold uppercase text-sm tracking-widest text-white hover:bg-white/10 transition-all duration-500">
              Assistir ao Portfólio
            </button>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function DynamicLightingEffect() {
  const [isDay, setIsDay] = useState(true);

  useEffect(() => {
    const hour = new Date().getHours();
    setIsDay(hour >= 6 && hour < 18);
  }, []);

  return (
    <div className="absolute top-0 left-0 w-full h-full pointer-events-none z-0 overflow-hidden">
      {/* Cinematic Light Source (Top Left) */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        whileInView={{ opacity: 1, scale: 1 }}
        animate={{ 
          scale: [1, 1.05, 1],
          opacity: [0.35, 0.45, 0.35]
        }}
        viewport={{ once: false }}
        transition={{ 
          opacity: { duration: 5, repeat: Infinity, ease: "easeInOut" },
          scale: { duration: 8, repeat: Infinity, ease: "easeInOut" },
          duration: 2.5, 
          ease: "easeOut" 
        }}
        className={`absolute -top-40 -left-40 w-[800px] h-[800px] rounded-full blur-[150px] mix-blend-screen ${
          isDay 
            ? 'bg-gradient-radial from-[#fff7e6] via-[#ffd27f] to-transparent' 
            : 'bg-gradient-radial from-[#e6f0ff] via-[#7fb2ff] to-transparent'
        }`}
      />
      
      {/* Subtle Lens Flare Elements */}
      {isDay && (
        <>
          <motion.div 
            animate={{ 
              x: [0, 10, 0],
              y: [0, -10, 0],
              opacity: [0.1, 0.2, 0.1]
            }}
            transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
            className="absolute top-[10%] left-[15%] w-16 h-16 rounded-full bg-white/20 blur-xl mix-blend-overlay"
          />
          <motion.div 
            animate={{ 
              x: [0, -15, 0],
              y: [0, 15, 0],
              opacity: [0.05, 0.15, 0.05]
            }}
            transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
            className="absolute top-[25%] left-[30%] w-24 h-24 rounded-full bg-secondary/10 blur-2xl mix-blend-overlay"
          />
        </>
      )}

      {!isDay && (
        <motion.div 
          animate={{ 
            opacity: [0.1, 0.3, 0.1],
            scale: [1, 1.1, 1]
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[5%] left-[10%] w-32 h-32 rounded-full bg-blue-200/5 blur-3xl mix-blend-overlay"
        />
      )}
    </div>
  );
}

function Results({ settings }: { settings: any }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const currentCase = settings.portfolioCases[currentIndex] || settings.portfolioCases[0];

  const handleNext = () => {
    const nextIndex = (currentIndex + 1) % settings.portfolioCases.length;
    animateTransition(nextIndex, 'up');
  };

  const handlePrev = () => {
    const nextIndex = (currentIndex - 1 + settings.portfolioCases.length) % settings.portfolioCases.length;
    animateTransition(nextIndex, 'down');
  };

  const animateTransition = (nextIndex: number, direction: 'up' | 'down') => {
    if (!videoRef.current) return;

    setCurrentIndex(nextIndex);

    // Simulate swipe on video
    gsap.to(videoRef.current, {
      y: direction === 'up' ? -100 : 100,
      opacity: 0,
      duration: 0.4,
      onComplete: () => {
        if (videoRef.current) {
          videoRef.current.src = settings.portfolioCases[nextIndex].videoSrc;
          videoRef.current.load();
          gsap.fromTo(videoRef.current,
            { y: direction === 'up' ? 100 : -100, opacity: 0 },
            { y: 0, opacity: 1, duration: 0.6, ease: "power2.out", onComplete: () => {
              if (isPlaying) videoRef.current?.play();
            }}
          );
        }
      }
    });
  };

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && videoRef.current && !isPlaying) {
          // Auto-play on first sight if desired
        }
      });
    }, { threshold: 0.5 });

    if (videoRef.current) {
      observer.observe(videoRef.current);
    }

    return () => observer.disconnect();
  }, [isPlaying]);

  return (
    <section id="results" className="py-32 bg-transparent relative overflow-hidden">
      <DynamicLightingEffect />
      <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-16 relative z-10">
        <div className="w-full md:w-1/2 text-left">
          <h2 className="font-headline text-5xl md:text-7xl font-extralight tracking-tight text-white mb-8 leading-[1.1]">
            Nosso <span className="font-serif italic text-secondary font-light">Portfólio</span>
          </h2>
          <div className="w-12 h-[1px] bg-secondary/30 mb-8"></div>
          <p className="text-white/40 text-xl font-extralight leading-relaxed max-w-lg mb-12">
            Explore um acervo onde a estética refinada encontra a conversão. Cada produção é uma peça única, desenhada meticulosamente para elevar o padrão visual da sua marca.
          </p>
          <div className="flex items-center gap-4 text-secondary/80 group cursor-pointer">
            <span className="font-headline font-light uppercase tracking-[0.3em] text-[10px]">Explorar o Portfólio</span>
            <ArrowRight className="group-hover:translate-x-2 transition-transform font-light" strokeWidth={1} />
          </div>
        </div>
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1.2 }}
          className="w-full md:w-1/2 flex items-center justify-center md:justify-end gap-8 transform-gpu will-change-transform"
        >
          {/* Navigation Controls */}
          <div className="hidden md:flex flex-col gap-4">
            <button onClick={handlePrev} className="p-4 glass-card rounded-full text-white/50 hover:text-white hover:bg-white/10 transition-all">
              <ChevronUp className="w-6 h-6" />
            </button>
            <button onClick={handleNext} className="p-4 glass-card rounded-full text-white/50 hover:text-white hover:bg-white/10 transition-all">
              <ChevronDown className="w-6 h-6" />
            </button>
          </div>

          <div className={`iphone-x relative transition-all duration-700 transform-gpu will-change-transform ${isPlaying ? 'shadow-[0_0_80px_rgba(233,179,255,0.5)] scale-[1.02]' : 'scale-100'}`}>
            <div className="notch"></div>
            <div className="screen relative group cursor-pointer" onClick={togglePlay}>
              <video 
                ref={videoRef}
                loop 
                muted 
                playsInline 
                preload="metadata"
                className="w-full h-full object-cover"
                src={currentCase.videoSrc}
              />
              
              {/* Reels UI Overlay */}
              <div className="absolute inset-0 z-10 pointer-events-none flex flex-col justify-between">
                {/* Top Header */}
                <div className="pt-12 px-6 flex justify-between items-center bg-gradient-to-b from-black/60 to-transparent pb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-white font-bold text-xl tracking-tight">Reels</span>
                    <ChevronDown className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex items-center gap-4">
                    <Camera className="w-6 h-6 text-white" />
                  </div>
                </div>

                {/* Bottom Section */}
                <div className="p-4 pb-8 flex flex-col justify-end relative h-full bg-gradient-to-t from-black/80 via-black/20 to-transparent">
                  {/* Right Side Icons */}
                  <div className="absolute right-4 bottom-8 flex flex-col gap-6 items-center z-20">
                    <motion.div whileHover={{ scale: 1.1 }} className="flex flex-col items-center gap-1">
                      <Heart className="w-7 h-7 text-white" />
                      <span className="text-xs font-semibold text-white drop-shadow-md">12.4k</span>
                    </motion.div>
                    <motion.div whileHover={{ scale: 1.1 }} className="flex flex-col items-center gap-1">
                      <MessageCircle className="w-7 h-7 text-white" />
                      <span className="text-xs font-semibold text-white drop-shadow-md">842</span>
                    </motion.div>
                    <motion.div whileHover={{ scale: 1.1 }} className="flex flex-col items-center gap-1">
                      <Send className="w-7 h-7 text-white" />
                      <span className="text-xs font-semibold text-white drop-shadow-md">2.1k</span>
                    </motion.div>
                    <motion.div whileHover={{ scale: 1.1 }} className="flex flex-col items-center gap-1">
                      <MoreHorizontal className="w-6 h-6 text-white" />
                    </motion.div>
                    <motion.div whileHover={{ scale: 1.1 }} className="mt-2 w-8 h-8 rounded-md border-2 border-white overflow-hidden flex items-center justify-center bg-black">
                      <img src={LOGO_URL} alt="Audio" className="w-full h-full object-contain p-1 animate-[spin_4s_linear_infinite]" loading="lazy" />
                    </motion.div>
                  </div>

                  {/* Bottom Info with Marquee */}
                  <div className="text-white space-y-3 w-[85%] z-20">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-500 p-[2px]">
                        <div className="w-full h-full rounded-full bg-black flex items-center justify-center overflow-hidden">
                          <img src={LOGO_URL} alt="Next Creatives" className="w-full h-full object-contain p-1.5" loading="lazy" />
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold drop-shadow-md">nextcreatives.co</p>
                        <button className="px-3 py-1 bg-transparent rounded-lg text-xs font-semibold border border-white/40">Seguir</button>
                      </div>
                    </div>
                    <p className="text-sm font-normal opacity-95 line-clamp-2 drop-shadow-md leading-snug">
                      {currentCase.descricao} <span className="font-bold">{currentCase.cliente}</span> <span className="font-bold">#performance #criativos</span>
                    </p>
                    
                    {/* Scrolling Music/Client Name */}
                    <div className="flex items-center gap-2 overflow-hidden w-48 bg-black/30 backdrop-blur-md rounded-full px-3 py-1.5 border border-white/10">
                      <div className="flex items-center gap-2 animate-marquee whitespace-nowrap">
                        <Music className="w-3 h-3 text-white" />
                        <span className="text-xs font-medium opacity-90">Áudio original - nextcreatives.co</span>
                        <Music className="w-3 h-3 text-white ml-4" />
                        <span className="text-xs font-medium opacity-90">Áudio original - nextcreatives.co</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Play Button Overlay */}
              {!isPlaying && (
                <div className="absolute inset-0 flex items-center justify-center z-20 bg-black/40 backdrop-blur-[1px]">
                  <motion.div 
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="relative transform-gpu will-change-transform"
                  >
                    <div className="absolute inset-0 bg-primary/40 rounded-full animate-ping"></div>
                    <div className="relative p-8 bg-primary text-on-primary rounded-full shadow-[0_0_30px_rgba(173,198,255,0.6)]">
                      <Play className="w-10 h-10 fill-current" />
                    </div>
                  </motion.div>
                </div>
              )}

              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 pointer-events-none"></div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function NeuralWave() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: 0, y: 0 });
  const scrollRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let particles: { x: number; y: number; vx: number; vy: number; size: number }[] = [];
    const isMobile = window.innerWidth < 768;
    const particleCount = isMobile ? 20 : 60;

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      initParticles();
    };

    const initParticles = () => {
      particles = [];
      for (let i = 0; i < particleCount; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 0.5,
          vy: (Math.random() - 0.5) * 0.5,
          size: Math.random() * 1.5 + 0.5
        });
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      mouseRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
    };

    const handleScroll = () => {
      scrollRef.current = window.scrollY;
    };

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const scrollSpeed = Math.sin(scrollRef.current * 0.01) * 2;
      
      ctx.strokeStyle = 'rgba(173, 198, 255, 0.15)';
      ctx.lineWidth = 0.5;

      particles.forEach((p, i) => {
        // Mouse attraction
        const dxMouse = mouseRef.current.x - p.x;
        const dyMouse = mouseRef.current.y - p.y;
        const distMouse = Math.sqrt(dxMouse * dxMouse + dyMouse * dyMouse);
        
        if (distMouse < 150) {
          p.x += dxMouse * 0.01;
          p.y += dyMouse * 0.01;
        }

        p.x += p.vx * (1 + Math.abs(scrollSpeed));
        p.y += p.vy * (1 + Math.abs(scrollSpeed));

        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = i % 2 === 0 ? 'rgba(173, 198, 255, 0.4)' : 'rgba(233, 179, 255, 0.4)';
        ctx.fill();

        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dx = p.x - p2.x;
          const dy = p.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 80) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }
        }
      });

      animationFrameId = requestAnimationFrame(draw);
    };

    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('scroll', handleScroll);
    
    resize();
    draw();

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('scroll', handleScroll);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full opacity-60" />;
}

function Transformation({ settings }: { settings: any }) {
  const [isGlowActive, setIsGlowActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handlePlay = () => {
    if (videoRef.current) {
      videoRef.current.play();
      setIsGlowActive(true);
    }
  };

  return (
    <section id="transformation" className="py-32 bg-transparent relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-24">
          <motion.span 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-white/40 text-[10px] font-light tracking-[0.5em] uppercase mb-6 block"
          >
            A ALQUIMIA DO SEU ATIVO
          </motion.span>
          <motion.h2 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="font-headline text-5xl md:text-7xl font-extralight tracking-tight text-white leading-[1.1]"
          >
            Transformamos o comum em <br /> 
            <span className="font-serif italic text-secondary font-light">desejo absoluto</span>
          </motion.h2>
        </div>

        {/* Bento Box Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 h-auto md:h-[650px]">
          
          {/* Panel 1: The Input */}
          <motion.div 
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 1 }}
            className="md:col-span-4 glass-card p-10 flex flex-col justify-between overflow-hidden group border-white/5 transform-gpu will-change-transform"
          >
            <div>
              <h3 className="font-headline text-2xl font-light text-white mb-4 leading-tight">
                O Ponto de Partida
              </h3>
              <p className="text-white/40 text-sm font-extralight leading-relaxed">
                Você nos entrega a essência do seu produto em fotos brutas e sem tratamento.
              </p>
            </div>
            <div className="relative mt-12 rounded-2xl overflow-hidden border border-white/5 aspect-square md:aspect-auto md:h-72">
              <img 
                src={settings.transformationPanel1Image} 
                alt="Raw Product" 
                className="w-full h-full object-cover grayscale opacity-40 group-hover:grayscale-0 group-hover:opacity-80 transition-all duration-1000 ease-out"
                referrerPolicy="no-referrer"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
              <div className="absolute bottom-6 left-6 font-mono text-[9px] text-white/30 tracking-[0.2em] uppercase">
                ASSET_RAW_01
              </div>
            </div>
          </motion.div>

          {/* Panel 2: The Process */}
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 1, delay: 0.2 }}
            className="md:col-span-4 glass-card p-10 flex flex-col items-center justify-center relative overflow-hidden border-white/5 transform-gpu will-change-transform"
          >
            <NeuralWave />
            <div className="relative z-10 text-center">
              <h3 className="font-headline text-2xl font-light text-white mb-8 leading-tight">
                A Inteligência <br /> <span className="font-serif italic text-secondary">por trás da cena</span>
              </h3>
              
              <div className="flex flex-col items-center gap-8">
                <div className="w-20 h-20 rounded-3xl bg-white/[0.02] border border-white/10 flex items-center justify-center relative">
                  <div className="absolute inset-0 bg-secondary/5 blur-xl rounded-full"></div>
                  <Cpu className="text-secondary/60 w-10 h-10 font-thin" strokeWidth={1} />
                </div>
                
                <div className="font-mono text-[9px] text-secondary/50 space-y-3 text-left bg-black/60 p-6 rounded-2xl border border-white/5 backdrop-blur-2xl max-w-[240px]">
                  <div className="flex gap-3"><span className="text-white/30">01</span> <span>neural_mapping_geometry...</span></div>
                  <div className="flex gap-3"><span className="text-white/30">02</span> <span>volumetric_lighting_vfx...</span></div>
                  <div className="flex gap-3"><span className="text-white/30">03</span> <span>high_fidelity_rendering...</span></div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Panel 3: The Output */}
          <motion.div 
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 1, delay: 0.4 }}
            className={`md:col-span-4 glass-card p-10 flex flex-col justify-between overflow-hidden relative transition-all duration-1000 border-white/5 ${isGlowActive ? 'neon-glow-secondary border-secondary/20' : ''}`}
          >
            <div>
              <h3 className="font-headline text-2xl font-light text-white mb-4 leading-tight">
                O Resultado de Elite
              </h3>
              <p className="text-white/40 text-sm font-extralight leading-relaxed">
                Transformamos dados estáticos em uma experiência de cinema que converte.
              </p>
            </div>
            
            <div className="relative mt-12 rounded-2xl overflow-hidden border border-white/10 aspect-square md:aspect-auto md:h-72 group cursor-pointer" onClick={handlePlay}>
              <video 
                ref={videoRef}
                src={settings.transformationPanel3Video} 
                className="w-full h-full object-cover"
                loop
                muted
                playsInline
              />
              {!isGlowActive && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-md group-hover:bg-black/40 transition-all duration-500">
                  <div className="w-20 h-20 rounded-full bg-white/[0.03] border border-white/10 flex items-center justify-center text-white group-hover:scale-110 group-hover:bg-white/[0.08] transition-all duration-500">
                    <Play className="fill-white w-6 h-6 ml-1" />
                  </div>
                </div>
              )}
              <div className="absolute top-6 right-6 px-4 py-1.5 bg-secondary/10 backdrop-blur-xl rounded-full text-[8px] font-bold uppercase tracking-[0.2em] text-secondary border border-secondary/20">
                MASTER_RENDER_V1
              </div>
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  );
}

function Workflow({ settings }: { settings: any }) {
  const containerRef = useRef<HTMLElement>(null);
  const bubble1Ref = useRef<HTMLDivElement>(null);
  const bubble2Ref = useRef<HTMLDivElement>(null);
  const bubble3Ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: containerRef.current,
        start: "top 60%",
        end: "bottom 80%",
        scrub: 1,
      }
    });

    tl.fromTo(bubble1Ref.current, 
      { opacity: 0, y: 50 }, 
      { opacity: 1, y: 0, duration: 1 }
    )
    .fromTo(bubble2Ref.current, 
      { opacity: 0, y: 50 }, 
      { opacity: 1, y: 0, duration: 1 },
      "+=0.2"
    )
    .fromTo(bubble3Ref.current, 
      { opacity: 0, y: 50 }, 
      { opacity: 1, y: 0, duration: 1 },
      "+=0.2"
    );

    return () => {
      tl.kill();
    };
  }, []);

  return (
    <section id="workflow" ref={containerRef} className="py-32 bg-transparent relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-16">
        
        {/* Left Column - Copy */}
        <div className="w-full md:w-1/2 text-left">
          <h2 className="font-headline text-5xl md:text-7xl font-extralight tracking-tight text-white mb-12 leading-[1.1]">
            A Engenharia por Trás do <span className="font-serif italic text-secondary font-light">Impossível</span>
          </h2>
          
          <p className="text-white/40 text-lg font-extralight mb-16 max-w-md leading-relaxed">
            Nós absorvemos toda a complexidade técnica da Inteligência Artificial para que você receba apenas o que importa: <span className="text-white font-light">atenção absoluta e conversão.</span>
          </p>
          
          <div className="space-y-12">
            {/* Step 1 */}
            <div className="flex items-start gap-8">
              <div className="w-14 h-14 rounded-2xl bg-white/[0.02] border border-white/10 flex items-center justify-center shrink-0">
                <Sparkles className="w-6 h-6 text-secondary/60 font-thin" strokeWidth={1} />
              </div>
              <div>
                <h3 className="text-white font-light text-xl mb-2 tracking-tight">{settings.workflowSteps[0].title}</h3>
                <p className="text-white/30 font-extralight text-sm leading-relaxed">{settings.workflowSteps[0].description}</p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex items-start gap-8">
              <div className="w-14 h-14 rounded-2xl bg-white/[0.02] border border-white/10 flex items-center justify-center shrink-0">
                <Camera className="w-6 h-6 text-secondary/60 font-thin" strokeWidth={1} />
              </div>
              <div>
                <h3 className="text-white font-light text-xl mb-2 tracking-tight">{settings.workflowSteps[1].title}</h3>
                <p className="text-white/30 font-extralight text-sm leading-relaxed">{settings.workflowSteps[1].description}</p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex items-start gap-8">
              <div className="w-14 h-14 rounded-2xl bg-white/[0.02] border border-white/10 flex items-center justify-center shrink-0">
                <Play className="w-6 h-6 text-secondary/60 font-thin" strokeWidth={1} />
              </div>
              <div>
                <h3 className="text-white font-light text-xl mb-2 tracking-tight">{settings.workflowSteps[2].title}</h3>
                <p className="text-white/30 font-extralight text-sm leading-relaxed">{settings.workflowSteps[2].description}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - iPhone Mockup */}
        <div className="w-full md:w-1/2 flex justify-center md:justify-end">
          <div className="iphone-x relative scale-[0.85] md:scale-100 transform-gpu shadow-[0_0_50px_rgba(0,0,0,0.5)]">
            <div className="notch"></div>
            <div className="screen relative bg-[#111b21] flex flex-col overflow-hidden">
              
              {/* WhatsApp Header */}
              <div className="bg-[#202c33] px-4 py-3 flex items-center gap-3 z-10 shadow-md pt-12">
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-primary to-secondary p-[2px]">
                  <div className="w-full h-full rounded-full bg-black overflow-hidden flex items-center justify-center">
                    <img src={LOGO_URL} alt="Next Creatives" className="w-6 h-6 object-contain" loading="lazy" />
                  </div>
                </div>
                <div className="flex flex-col">
                  <span className="text-white font-semibold text-sm">Equipe Next Creatives</span>
                  <span className="text-white/60 text-xs">online</span>
                </div>
              </div>

              {/* WhatsApp Background Pattern (Simulated with CSS) */}
              <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/cubes.png")' }}></div>

              {/* Chat Area */}
              <div className="flex-1 p-4 flex flex-col gap-4 overflow-y-auto relative z-10 pb-8">
                
                {/* Bubble 1 - Client (Right) */}
                <div ref={bubble1Ref} className="self-end max-w-[85%] flex flex-col items-end opacity-0">
                  <div className="bg-[#005c4b] text-[#e9edef] p-2 rounded-lg rounded-tr-none shadow-sm text-sm relative">
                    <p className="mb-2">Fala equipe! Segue a foto do óculos novo. Objetivo é vender muito no tráfego pago.</p>
                    <div className="w-full h-32 bg-black/40 rounded-md overflow-hidden flex items-center justify-center relative">
                      <img src={settings.whatsappMockupImage1} alt="Óculos" className="w-full h-full object-cover opacity-80" loading="lazy" />
                    </div>
                    <span className="text-[10px] text-white/50 absolute bottom-1 right-2">10:42</span>
                  </div>
                </div>

                {/* Bubble 2 - Agency (Left) */}
                <div ref={bubble2Ref} className="self-start max-w-[85%] flex flex-col items-start opacity-0">
                  <div className="bg-[#202c33] text-[#e9edef] p-3 rounded-lg rounded-tl-none shadow-sm text-sm relative pr-12">
                    <p>Recebido! IA processando cenário e editores em ação. 🚀</p>
                    <span className="text-[10px] text-white/50 absolute bottom-1 right-2">10:45</span>
                  </div>
                </div>

                {/* Bubble 3 - Agency (Left) */}
                <div ref={bubble3Ref} className="self-start max-w-[85%] flex flex-col items-start opacity-0">
                  <div className="bg-[#202c33] text-[#e9edef] p-2 rounded-lg rounded-tl-none shadow-sm text-sm relative">
                    <p className="mb-2">Renderizado em 4K. Confere a máquina de vendas:</p>
                    <div className="w-full h-48 bg-black/40 rounded-md overflow-hidden flex items-center justify-center relative group cursor-pointer">
                      <img src={settings.whatsappMockupImage2} alt="Vídeo Pronto" className="w-full h-full object-cover opacity-60 group-hover:opacity-40 transition-opacity" loading="lazy" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-12 h-12 bg-black/50 rounded-full flex items-center justify-center backdrop-blur-sm">
                          <Play className="w-5 h-5 text-white fill-white ml-1" />
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] text-white/50 absolute bottom-1 right-2">14:30</span>
                  </div>
                </div>

              </div>
              
              {/* WhatsApp Input Area */}
              <div className="bg-[#202c33] px-2 py-2 flex items-center gap-2 z-10">
                <div className="w-8 h-8 flex items-center justify-center text-white/50">
                  <span className="material-symbols-outlined text-xl">add</span>
                </div>
                <div className="flex-1 bg-[#2a3942] rounded-full h-10 px-4 flex items-center">
                  <span className="text-white/40 text-sm">Mensagem</span>
                </div>
                <div className="w-10 h-10 rounded-full bg-[#00a884] flex items-center justify-center text-white">
                  <span className="material-symbols-outlined text-lg">mic</span>
                </div>
              </div>

            </div>
          </div>
        </div>

      </div>
    </section>
  );
}

function Pricing() {
  const plans = [
    {
      tag: "validação visual",
      name: "Pacote Start",
      price: "297",
      currency: "R$",
      priceLabel: "TEST-DRIVE",
      description: "Ideal para testar novos produtos e sentir o poder do audiovisual gerado por IA antes de colocar dinheiro pesado em anúncios.",
      features: [
        "2 Vídeos de Alta Conversão (Até 30s)",
        "Motores de IA Padrão (Alta Qualidade Visual)",
        "Roteiros com Ganchos de Retenção",
        "Edição e Legendas Dinâmicas",
        "1 Rodada de Lapidação (Ajustes leves)"
      ],
      buttonText: "Iniciar Test-Drive ➔",
      highlight: false
    },
    {
      tag: "máquina de conversão",
      name: "Pacote Growth",
      price: "497",
      currency: "R$",
      priceLabel: "PROFISSIONAL",
      description: "O ponto de equilíbrio perfeito. Vídeos com ultra-realismo gerados por IAs de alto custo para dominar a atenção do seu cliente.",
      features: [
        "5 Vídeos Cinematográficos",
        "Motores de IA Premium (Maior Realismo e Textura)",
        "Variações de Ganchos (Ideal para Teste A/B)",
        "Sound Design e Efeitos Sonoros Imersivos",
        "2 Rodadas de Revisões"
      ],
      buttonText: "Escalar com Growth ➔",
      highlight: true
    },
    {
      tag: "domínio de mercado",
      name: "Pacote Scale",
      price: "897",
      currency: "R$",
      priceLabel: "ELITE",
      description: "Arsenal completo de nível Hollywood. Acesso às IAs mais caras e pesadas do mercado, com pós-produção humana impecável.",
      features: [
        "10 Vídeos Nível Cinema",
        "IA de Última Geração (Acesso aos modelos mais caros)",
        "Upscale 4K e Color Grading (Correção de Cor)",
        "Locução Neural Premium Clonada",
        "Passe VIP (Prioridade Máxima na Fila de Renderização)"
      ],
      buttonText: "Dominar Mercado ➔",
      highlight: false
    }
  ];

  return (
    <section id="pricing" className="py-32 bg-transparent relative overflow-hidden">
      {/* Background Obfuscation Overlay */}
      <motion.div 
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: false, amount: 0.3 }}
        transition={{ duration: 1 }}
        className="absolute inset-0 bg-black/90 backdrop-blur-md z-0 pointer-events-none"
      />

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <div className="text-center mb-24">
          <motion.h2 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="font-headline text-5xl md:text-7xl font-light tracking-tight text-white mb-6"
          >
            Escolha Seu Nível de <span className="font-serif italic text-secondary font-light">Domínio</span>
          </motion.h2>
          
          <motion.p 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-white/70 max-w-2xl mx-auto font-light text-lg leading-relaxed"
          >
            Planos estratégicos desenhados para marcas que não aceitam o comum. <br className="hidden md:block" />
            Selecione a escala que o seu negócio exige hoje.
          </motion.p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
          {plans.map((plan, index) => (
            <motion.div 
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: index * 0.1 }}
              className={`flex flex-col h-full relative transform-gpu will-change-transform ${plan.highlight ? 'z-10' : 'z-0'}`}
            >
              <div className={`rounded-3xl flex flex-col h-full relative overflow-hidden transition-all duration-700 group ${
                plan.highlight 
                  ? 'bg-[#0a0a0a] border border-secondary/50 shadow-[0_0_50px_rgba(233,179,255,0.1)] p-8 md:p-10' 
                  : 'bg-[#0d0d0d] border border-white/10 p-8 md:p-10 hover:border-white/20'
              }`}>
                {plan.highlight && (
                  <div className="absolute top-0 right-0 px-6 py-2 bg-secondary text-on-secondary text-[10px] font-bold tracking-[0.2em] uppercase rounded-bl-2xl">
                    Mais Popular
                  </div>
                )}

                <div className="mb-10">
                  <span className="text-[10px] font-medium text-secondary tracking-[0.3em] uppercase mb-4 block">{plan.tag}</span>
                  <h3 className="font-headline text-2xl font-normal text-white mb-6 tracking-tight">{plan.name}</h3>
                  <div className="flex items-baseline gap-2">
                    <span className="text-lg font-light text-white/40">{plan.currency}</span>
                    <span className="text-6xl font-medium text-white tracking-tighter">{plan.price}</span>
                    <span className="text-[10px] font-medium text-white/50 tracking-[0.2em] uppercase ml-2">/ projeto</span>
                  </div>
                </div>
                
                <p className="text-white/60 text-sm font-light mb-10 leading-relaxed">
                  {plan.description}
                </p>

                <ul className="space-y-5 mb-12 flex-grow">
                  {plan.features.map((feature, fIndex) => (
                    <li key={fIndex} className="flex items-start gap-4 group/item">
                      <div className={`w-1.5 h-1.5 rounded-full mt-2 transition-all duration-300 ${
                        plan.highlight ? 'bg-secondary shadow-[0_0_10px_rgba(233,179,255,0.8)]' : 'bg-white/40'
                      }`} />
                      <span className="text-sm text-white/70 font-light leading-relaxed group-hover/item:text-white transition-colors">{feature}</span>
                    </li>
                  ))}
                </ul>
                
                <button className={`w-full py-5 font-medium rounded-2xl uppercase tracking-[0.3em] text-[10px] transition-all duration-500 ${
                  plan.highlight 
                    ? 'bg-secondary text-on-secondary shadow-2xl hover:shadow-secondary/40 hover:scale-[1.02]' 
                    : 'bg-white/10 border border-white/10 text-white hover:bg-white/20 hover:border-white/30'
                }`}>
                  {plan.buttonText}
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

import { PresenceProvider } from './hooks/usePresence';

export default function App() {
  return (
    <BrowserRouter>
      <PresenceProvider>
        <Routes>
          <Route path="/" element={<MainApp />} />
          <Route path="/admin" element={<AdminLogin />} />
          
          {/* Client Routes */}
          <Route path="/client/login" element={<ClientLogin />} />
          <Route path="/client/dashboard" element={<ClientDashboard />} />
          <Route path="/client/projects" element={<ClientProjects />} />
          <Route path="/client/purchases" element={<ClientPurchases />} />
          <Route path="/client/settings" element={<ClientSettings />} />

          {/* Protected Admin Routes */}
          <Route path="/admin/dashboard" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
          <Route path="/admin/settings" element={<ProtectedRoute><AdminSettings /></ProtectedRoute>} />
          <Route path="/admin/clients" element={<ProtectedRoute><AdminClients /></ProtectedRoute>} />
          <Route path="/admin/videos" element={<ProtectedRoute><AdminVideos /></ProtectedRoute>} />
          <Route path="/admin/sales" element={<ProtectedRoute><AdminSales /></ProtectedRoute>} />
          <Route path="/admin/tools" element={<ProtectedRoute><AdminTools /></ProtectedRoute>} />
          <Route path="/admin/sora-remover" element={<ProtectedRoute><AdminSoraRemover /></ProtectedRoute>} />
          <Route path="/admin/leads" element={<ProtectedRoute><AdminLeads /></ProtectedRoute>} />
          <Route path="/admin/leads/search" element={<ProtectedRoute><LeadSearch /></ProtectedRoute>} />
          <Route path="/admin/team/:id" element={<ProtectedRoute><EmployeeProfile /></ProtectedRoute>} />
        </Routes>
      </PresenceProvider>
    </BrowserRouter>
  );
}