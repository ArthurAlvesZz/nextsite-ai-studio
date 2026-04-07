import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, useScroll, useTransform } from 'motion/react';
import { useAgencySettings } from '../hooks/useAgencySettings';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { TextPlugin } from 'gsap/TextPlugin';
import * as THREE from 'three';
import { 
  Play, 
  ArrowRight, 
  ArrowUpRight,
  ChevronUp,
  ChevronDown,
  Cpu,
} from 'lucide-react';
import { useLenis } from '@studio-freight/react-lenis';
import logo from '../assets/logo.png';
import SEO from '../components/SEO';

const LOGO_URL = logo;
gsap.registerPlugin(ScrollTrigger, TextPlugin);

export default function MainApp() {
  const { settings } = useAgencySettings();
  const [isReady, setIsReady] = useState(true);
  const lenis = useLenis();

  useEffect(() => {
    if (!lenis) return;
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
    return () => {
      lenis.off('scroll', ScrollTrigger.update);
      gsap.ticker.remove((time) => lenis.raf(time * 1000));
    };
  }, [lenis]);

  useEffect(() => {
    const bgConstruct = document.querySelector('#bg-construct');
    const bgProcessing = document.querySelector('#bg-processing');
    const bgReality = document.querySelector('#bg-reality');

    if (bgConstruct && bgProcessing && bgReality) {
      ScrollTrigger.create({
        trigger: "#results",
        start: "top 60%",
        onEnter: () => {
          gsap.to(bgConstruct, { opacity: 0, duration: 1.5, ease: "power2.inOut" });
          gsap.fromTo(bgProcessing, { opacity: 0, scale: 1.05 }, { opacity: 1, scale: 1, duration: 1.5, ease: "power2.inOut" });
        },
        onLeaveBack: () => {
          gsap.to(bgConstruct, { opacity: 1, duration: 1.5, ease: "power2.inOut" });
          gsap.to(bgProcessing, { opacity: 0, scale: 1.05, duration: 1.5, ease: "power2.inOut" });
        }
      });
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
      <SEO title="Vídeos com IA para o seu Negócio" />
      <div id="main-content" className={`transition-opacity duration-1000 ${isReady ? 'opacity-100' : 'opacity-0'}`}>
        <ImmersiveBackground />
        <div className="relative z-10">
          <Navbar />
          <Hero isReady={isReady} settings={settings} />
          <Results settings={settings} />
          <Transformation settings={settings} />
          <Workflow settings={settings} />
          <Pricing />
        </div>
      </div>
    </div>
  );
}

function ImmersiveBackground() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mountRef.current) return;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mountRef.current.appendChild(renderer.domElement);

    const particlesGeometry = new THREE.BufferGeometry();
    const isMobile = window.innerWidth < 768;
    const particlesCount = isMobile ? 600 : 2000;
    const posArray = new Float32Array(particlesCount * 3);
    const colorsArray = new Float32Array(particlesCount * 3);
    const color1 = new THREE.Color('#adc6ff');
    const color2 = new THREE.Color('#e9b3ff');

    for(let i = 0; i < particlesCount * 3; i+=3) {
      posArray[i] = (Math.random() - 0.5) * 10;
      posArray[i+1] = (Math.random() - 0.5) * 10;
      posArray[i+2] = (Math.random() - 0.5) * 10;
      const mixedColor = color1.clone().lerp(color2, Math.random());
      colorsArray[i] = mixedColor.r;
      colorsArray[i+1] = mixedColor.g;
      colorsArray[i+2] = mixedColor.b;
    }

    particlesGeometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
    particlesGeometry.setAttribute('color', new THREE.BufferAttribute(colorsArray, 3));
    const particlesMaterial = new THREE.PointsMaterial({ size: 0.02, vertexColors: true, blending: THREE.AdditiveBlending, transparent: true, opacity: 0.4 });
    const particlesMesh = new THREE.Points(particlesGeometry, particlesMaterial);
    scene.add(particlesMesh);
    camera.position.z = 3;

    let mouseX = 0, mouseY = 0;
    const onDocumentMouseMove = (event: MouseEvent) => { mouseX = (event.clientX - window.innerWidth/2); mouseY = (event.clientY - window.innerHeight/2); };
    document.addEventListener('mousemove', onDocumentMouseMove);

    const clock = new THREE.Clock();
    const animate = () => {
      requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();
      particlesMesh.rotation.y += 0.001;
      particlesMesh.rotation.x += 0.0005;
      particlesMesh.rotation.y += 0.05 * (mouseX * 0.001 - particlesMesh.rotation.y);
      particlesMesh.rotation.x += 0.05 * (mouseY * 0.001 - particlesMesh.rotation.x);
      const positions = particlesGeometry.attributes.position.array as Float32Array;
      for(let i = 0; i < particlesCount; i++) {
        const i3 = i * 3;
        positions[i3+1] += Math.sin(elapsedTime + positions[i3]) * 0.002;
        positions[i3+2] += Math.cos(elapsedTime + positions[i3+2]) * 0.002;
      }
      particlesGeometry.attributes.position.needsUpdate = true;
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => { camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix(); renderer.setSize(window.innerWidth, window.innerHeight); };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('mousemove', onDocumentMouseMove);
      if (mountRef.current) mountRef.current.removeChild(renderer.domElement);
      particlesGeometry.dispose();
      particlesMaterial.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div id="immersive-bg" className="fixed inset-0 w-full h-full -z-10 bg-[#050505] overflow-hidden">
      <motion.div className="absolute inset-0 flex items-center justify-center opacity-40 mix-blend-screen pointer-events-none transform-gpu will-change-transform" animate={{ rotate: [0, 360], scale: [1, 1.1, 1] }} transition={{ rotate: { duration: 80, repeat: Infinity, ease: "linear" }, scale: { duration: 15, repeat: Infinity, ease: "easeInOut" } }}>
        <motion.img src="/bg-shape.webp" alt="3D Background Shape" className="w-[120vw] h-[120vw] max-w-[1200px] max-h-[1200px] object-contain drop-shadow-[0_0_50px_rgba(153,0,255,0.3)] transform-gpu will-change-transform" loading="lazy" animate={{ y: [-30, 30, -30], x: [-20, 20, -20] }} transition={{ y: { duration: 10, repeat: Infinity, ease: "easeInOut" }, x: { duration: 14, repeat: Infinity, ease: "easeInOut" } }} onError={(e) => { e.currentTarget.src = "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2000&auto=format&fit=crop"; e.currentTarget.className = "w-[120vw] h-[120vw] max-w-[1200px] max-h-[1200px] object-cover opacity-50 mix-blend-screen rounded-full blur-3xl"; }} />
      </motion.div>
      <div ref={mountRef} className="absolute inset-0 w-full h-full opacity-40 mix-blend-screen"></div>
      <div id="bg-construct" className="absolute inset-0 w-full h-full opacity-1 transition-opacity duration-1000 bg-gradient-to-b from-[#020202] to-transparent">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(0,102,255,0.05),transparent_60%)]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(153,0,255,0.05),transparent_40%)]"></div>
      </div>
      <div id="bg-processing" className="absolute inset-0 w-full h-full opacity-0 transition-opacity duration-1000"><div className="absolute inset-0 bg-gradient-to-br from-[#0066ff]/5 to-[#9900ff]/5 mix-blend-overlay"></div><div className="absolute inset-0 backdrop-blur-[2px] bg-black/80"></div></div>
      <div id="bg-reality" className="absolute inset-0 w-full h-full opacity-0 transition-opacity duration-1000"><div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/80 to-transparent"></div></div>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px]"></div>
    </div>
  );
}

function Navbar() {
  const { scrollY } = useScroll();
  const [isScrolled, setIsScrolled] = useState(false);
  useEffect(() => { return scrollY.on("change", (latest) => { setIsScrolled(latest > window.innerHeight - 100); }); }, [scrollY]);
  return (
    <nav className="fixed top-6 left-1/2 -translate-x-1/2 w-[95%] max-w-screen-2xl z-50">
      <div className="bg-[#131313]/60 backdrop-blur-2xl border border-white/10 rounded-full px-6 md:px-10 py-3 flex justify-between items-center shadow-2xl">
        <div className="flex items-center"><img alt="Next Creatives Logo" className="w-auto object-contain logo-transparent h-8 md:h-9" src={LOGO_URL} referrerPolicy="no-referrer" /></div>
        <div className="hidden md:flex gap-10 font-body font-light text-xs uppercase tracking-[0.2em]"><a className="text-white/60 hover:text-white transition-colors duration-300" href="#results">Portfólio</a><a className="text-white/60 hover:text-white transition-colors duration-300" href="#pricing">Pacotes</a></div>
        <div className="flex items-center gap-6 md:gap-8"><Link className="hidden sm:block text-white font-body font-medium text-sm hover:text-primary transition-colors duration-300" to="/client/login">Área do Cliente</Link><button className={`flex items-center gap-3 border rounded-2xl font-body font-light text-[10px] uppercase tracking-[0.2em] transition-all duration-700 group px-6 py-3 ${isScrolled ? 'bg-secondary text-on-secondary border-secondary shadow-2xl scale-105' : 'border-white/10 hover:border-white/30 bg-white/[0.02] hover:bg-white/[0.05] text-white/80 hover:text-white'}`}>{isScrolled ? 'Assinar Agora' : 'Iniciar Projeto'}<ArrowUpRight className={`w-3 h-3 transition-all ${isScrolled ? 'text-on-secondary' : 'text-white/30 group-hover:text-white group-hover:translate-x-0.5 group-hover:-translate-y-0.5'}`} strokeWidth={1} /></button></div>
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
      const text = textRef.current;
      text.innerHTML = settings.heroTitle;
      gsap.fromTo(text, { opacity: 0, backgroundPosition: "200% center" }, { opacity: 1, backgroundPosition: "0% center", duration: 2.5, ease: "power3.out", delay: 0.2, onComplete: () => { if (settings.heroTitle.includes("autoridade")) { text.innerHTML = settings.heroTitle.replace("autoridade", '<span class="font-serif italic text-secondary font-light">autoridade</span>'); } else { text.innerHTML = settings.heroTitle; } } });
    }
  }, [isReady, settings.heroTitle]);
  return (
    <section id="hero" className="relative min-h-screen flex items-center justify-center pt-24 overflow-hidden bg-transparent">
      <motion.div style={{ y, scale, opacity }} className="absolute inset-0 z-0 flex items-center justify-center pointer-events-none overflow-hidden transform-gpu will-change-transform"><img src={LOGO_URL} alt="Watermark" className="w-[110%] h-[110%] object-contain opacity-50 blur-[15px] grayscale-[0.1] brightness-[0.9]" referrerPolicy="no-referrer" /></motion.div>
      <div className="relative z-10 max-w-7xl mx-auto px-6 flex flex-col items-center text-center"><motion.span initial={{ opacity: 0, y: 20 }} animate={isReady ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }} transition={{ duration: 0.8 }} className="inline-flex items-center gap-3 py-2 px-6 rounded-full border border-secondary/30 text-secondary text-xs font-bold tracking-[0.3em] uppercase mb-8 glass-card"><span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span></span>NEXT CREATIVES STUDIO</motion.span><h1 ref={textRef} className="font-headline text-4xl md:text-8xl font-extrabold tracking-tighter leading-[1.05] mb-8 bg-clip-text text-transparent bg-[linear-gradient(to_right,#ffffff,rgba(255,255,255,0.8),#adc6ff,#e9b3ff,#ffffff)] bg-[length:200%_auto] opacity-0" /><motion.p initial={{ opacity: 0, y: 30 }} animate={isReady ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }} transition={{ duration: 0.8, delay: 1.5 }} className="text-on-surface-variant text-lg md:text-xl max-w-2xl mb-12 font-light leading-relaxed">{settings.heroDescription}</motion.p><motion.div initial={{ opacity: 0, y: 30 }} animate={isReady ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }} transition={{ duration: 0.8, delay: 1.8 }} className="flex flex-col items-center gap-10 transform-gpu will-change-transform"><div className="flex flex-col sm:flex-row gap-6"><div className="relative group rounded-xl overflow-hidden p-[2px]"><div className="animated-border-bg opacity-70 group-hover:opacity-100 transition-opacity duration-500"></div><button className="relative px-10 py-5 bg-gradient-to-r from-secondary to-primary text-on-secondary rounded-[10px] font-headline font-bold uppercase text-sm tracking-widest hover:shadow-[0_0_30px_rgba(233,179,255,0.5)] transition-all duration-500 w-full h-full">Solicitar Produção VIP</button></div><button className="px-10 py-5 bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl font-headline font-bold uppercase text-sm tracking-widest text-white hover:bg-white/10 transition-all duration-500">Assistir ao Portfólio</button></div></motion.div></div>
    </section>
  );
}

function DynamicLightingEffect() {
  const [isDay, setIsDay] = useState(true);
  useEffect(() => { const hour = new Date().getHours(); setIsDay(hour >= 6 && hour < 18); }, []);
  return (
    <div className="absolute top-0 left-0 w-full h-full pointer-events-none z-0 overflow-hidden">
      <motion.div initial={{ opacity: 0, scale: 0.8 }} whileInView={{ opacity: 1, scale: 1 }} animate={{ scale: [1, 1.05, 1], opacity: [0.35, 0.45, 0.35] }} viewport={{ once: false }} transition={{ opacity: { duration: 5, repeat: Infinity, ease: "easeInOut" }, scale: { duration: 8, repeat: Infinity, ease: "easeInOut" }, duration: 2.5, ease: "easeOut" }} className={`absolute -top-40 -left-40 w-[800px] h-[800px] rounded-full blur-[150px] mix-blend-screen ${isDay ? 'bg-gradient-radial from-[#fff7e6] via-[#ffd27f] to-transparent' : 'bg-gradient-radial from-[#e6f0ff] via-[#7fb2ff] to-transparent'}`} />
      {isDay && <><motion.div animate={{ x: [0, 10, 0], y: [0, -10, 0], opacity: [0.1, 0.2, 0.1] }} transition={{ duration: 8, repeat: Infinity, ease: "linear" }} className="absolute top-[10%] left-[15%] w-16 h-16 rounded-full bg-white/20 blur-xl mix-blend-overlay" /><motion.div animate={{ x: [0, -15, 0], y: [0, 15, 0], opacity: [0.05, 0.15, 0.05] }} transition={{ duration: 12, repeat: Infinity, ease: "linear" }} className="absolute top-[25%] left-[30%] w-24 h-24 rounded-full bg-secondary/10 blur-2xl mix-blend-overlay" /></>}
      {!isDay && <motion.div animate={{ opacity: [0.1, 0.3, 0.1], scale: [1, 1.1, 1] }} transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }} className="absolute top-[5%] left-[10%] w-32 h-32 rounded-full bg-blue-200/5 blur-3xl mix-blend-overlay" />}
    </div>
  );
}

function Results({ settings }: { settings: any }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const currentCase = settings.portfolioCases[currentIndex] || settings.portfolioCases[0];
  const handleNext = () => { const nextIndex = (currentIndex + 1) % settings.portfolioCases.length; animateTransition(nextIndex, 'up'); };
  const handlePrev = () => { const nextIndex = (currentIndex - 1 + settings.portfolioCases.length) % settings.portfolioCases.length; animateTransition(nextIndex, 'down'); };
  const animateTransition = (nextIndex: number, direction: 'up' | 'down') => {
    if (!videoRef.current) return;
    setCurrentIndex(nextIndex);
    gsap.to(videoRef.current, { y: direction === 'up' ? -100 : 100, opacity: 0, duration: 0.4, onComplete: () => { if (videoRef.current) { videoRef.current.src = settings.portfolioCases[nextIndex].videoSrc; videoRef.current.load(); gsap.fromTo(videoRef.current, { y: direction === 'up' ? 100 : -100, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, ease: "power2.out", onComplete: () => { if (isPlaying) videoRef.current?.play(); } }); } } });
  };
  const togglePlay = () => { if (videoRef.current) { if (isPlaying) videoRef.current.pause(); else videoRef.current.play(); setIsPlaying(!isPlaying); } };
  return (
    <section id="results" className="py-32 bg-transparent relative overflow-hidden">
      <DynamicLightingEffect />
      <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-16 relative z-10"><div className="w-full md:w-1/2 text-left"><h2 className="font-headline text-5xl md:text-7xl font-extralight tracking-tight text-white mb-8 leading-[1.1]">Nosso <span className="font-serif italic text-secondary font-light">Portfólio</span></h2><div className="w-12 h-[1px] bg-secondary/30 mb-8" /><p className="text-white/40 text-xl font-extralight leading-relaxed max-w-lg mb-12">Explore um acervo onde a estética refinada encontra a conversão. Cada produção é uma peça única, desenhada meticulosamente para elevar o padrão visual da sua marca.</p><div className="flex items-center gap-4 text-secondary/80 group cursor-pointer text-xs tracking-widest"><span className="font-headline uppercase">Explorar Portfólio</span><ArrowRight className="group-hover:translate-x-2 transition-transform" strokeWidth={1} /></div></div><motion.div initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ duration: 1.2 }} className="w-full md:w-1/2 flex items-center justify-center md:justify-end gap-8 transform-gpu will-change-transform"><div className="hidden md:flex flex-col gap-4"><button onClick={handlePrev} className="p-4 glass-card rounded-full text-white/50 hover:text-white"><ChevronUp className="w-6 h-6" /></button><button onClick={handleNext} className="p-4 glass-card rounded-full text-white/50 hover:text-white"><ChevronDown className="w-6 h-6" /></button></div><div className={`iphone-x relative transition-all duration-700 transform-gpu will-change-transform ${isPlaying ? 'shadow-[0_0_80px_rgba(233,179,255,0.5)] scale-[1.02]' : 'scale-100'}`}><div className="notch" /><div className="screen relative group cursor-pointer" onClick={togglePlay}><video ref={videoRef} loop muted playsInline preload="metadata" className="w-full h-full object-cover" src={currentCase.videoSrc} />{!isPlaying && <div className="absolute inset-0 flex items-center justify-center z-20 bg-black/40 backdrop-blur-[1px]"><motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="relative"><div className="absolute inset-0 bg-primary/40 rounded-full animate-ping" /><div className="relative p-8 bg-primary text-on-primary rounded-full"><Play className="w-10 h-10 fill-current" /></div></motion.div></div>}<div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 pointer-events-none" /></div></div></motion.div></div>
    </section>
  );
}

function NeuralWave() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current, ctx = canvas?.getContext('2d'); if (!canvas || !ctx) return;
    let particles: any[] = []; const count = window.innerWidth < 768 ? 20 : 60;
    const init = () => { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight; particles = Array.from({length: count}, () => ({ x: Math.random()*canvas.width, y: Math.random()*canvas.height, vx: (Math.random()-0.5)*0.5, vy: (Math.random()-0.5)*0.5, size: Math.random()*1.5+0.5 })); };
    const draw = () => { ctx.clearRect(0,0,canvas.width,canvas.height); particles.forEach((p, i) => { p.x+=p.vx; p.y+=p.vy; if (p.x<0||p.x>canvas.width) p.vx*=-1; if (p.y<0||p.y>canvas.height) p.vy*=-1; ctx.beginPath(); ctx.arc(p.x,p.y,p.size,0,Math.PI*2); ctx.fillStyle = i%2===0 ? 'rgba(173,198,255,0.4)' : 'rgba(233,179,255,0.4)'; ctx.fill(); particles.slice(i+1).forEach(p2 => { const d = Math.hypot(p.x-p2.x, p.y-p2.y); if (d<80) { ctx.beginPath(); ctx.strokeStyle='rgba(173,198,255,0.05)'; ctx.moveTo(p.x,p.y); ctx.lineTo(p2.x,p2.y); ctx.stroke(); } }); }); requestAnimationFrame(draw); };
    init(); draw(); window.addEventListener('resize', init); return () => window.removeEventListener('resize', init);
  }, []);
  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full opacity-60" />;
}

function Transformation({ settings }: { settings: any }) {
  const [isGlowActive, setIsGlowActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const handlePlay = () => { if (videoRef.current) { videoRef.current.play(); setIsGlowActive(true); } };
  return (
    <section id="transformation" className="py-32 bg-transparent relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 text-center mb-24"><motion.span initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} className="text-white/40 text-[10px] tracking-[0.5em] uppercase mb-6 block">A ALQUIMIA DO SEU ATIVO</motion.span><motion.h2 initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} className="font-headline text-5xl md:text-7xl font-extralight text-white leading-[1.1]">Transformamos o comum em <br /><span className="font-serif italic text-secondary font-light">desejo absoluto</span></motion.h2></div>
      <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-12 gap-8"><motion.div className="md:col-span-4 glass-card p-10 flex flex-col justify-between group border-white/5"><h3 className="text-2xl font-light text-white mb-4">O Ponto de Partida</h3><p className="text-white/40 text-sm font-extralight">Você nos entrega a essência do seu produto em fotos brutas e sem tratamento.</p><div className="relative mt-8 rounded-xl overflow-hidden border border-white/5 aspect-square"><img src={settings.transformationPanel1Image} className="w-full h-full object-cover grayscale opacity-40 group-hover:grayscale-0 group-hover:opacity-80 transition-all duration-1000" loading="lazy" /></div></motion.div><motion.div className="md:col-span-4 glass-card p-10 flex flex-col items-center justify-center relative overflow-hidden border-white/5"><NeuralWave /><div className="relative z-10 text-center"><h3 className="text-2xl font-light text-white mb-8">A Inteligência <br /><span className="font-serif italic text-secondary">por trás da cena</span></h3><Cpu className="text-secondary/60 w-12 h-12 mb-8" strokeWidth={1} /><div className="font-mono text-[9px] text-secondary/50 space-y-2 bg-black/60 p-4 rounded-xl"><div> neural_mapping_geometry...</div><div> volumetric_lighting_vfx...</div></div></div></motion.div><motion.div className={`md:col-span-4 glass-card p-10 flex flex-col justify-between overflow-hidden relative border-white/5 ${isGlowActive ? 'neon-glow-secondary' : ''}`}><h3 className="text-2xl font-light text-white mb-4">O Resultado de Elite</h3><p className="text-white/40 text-sm font-extralight">Transformamos dados estáticos em uma experiência de cinema que converte.</p><div className="relative mt-8 rounded-xl overflow-hidden border border-white/10 aspect-square group cursor-pointer" onClick={handlePlay}><video ref={videoRef} src={settings.transformationPanel3Video} className="w-full h-full object-cover" loop muted playsInline />{!isGlowActive && <div className="absolute inset-0 flex items-center justify-center bg-black/60"><Play className="fill-white w-6 h-6" /></div>}</div></motion.div></div>
    </section>
  );
}

function Workflow({ settings }: { settings: any }) {
  const b1 = useRef(null), b2 = useRef(null), b3 = useRef(null), c = useRef(null);
  useEffect(() => { const tl = gsap.timeline({ scrollTrigger: { trigger: c.current, start: "top 60%", end: "bottom 80%", scrub: 1 } }); tl.fromTo(b1.current, { opacity:0, y:50 }, { opacity:1, y:0 }).fromTo(b2.current, { opacity:0, y:50 }, { opacity:1, y:0 }, "+=0.2").fromTo(b3.current, { opacity:0, y:50 }, { opacity:1, y:0 }, "+=0.2"); return () => { tl.kill(); }; }, []);
  return (
    <section id="workflow" ref={c} className="py-32 bg-transparent relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center gap-16"><div className="w-full md:w-1/2"><h2 className="font-headline text-5xl md:text-7xl font-extralight text-white mb-8">A Engenharia por Trás do <span className="font-serif italic text-secondary">Impossível</span></h2><p className="text-white/40 text-lg font-extralight mb-12">Nós absorvemos toda a complexidade técnica para que você receba apenas conversão.</p></div><div className="w-full md:w-1/2 flex justify-center"><div className="iphone-x relative"><div className="notch" /><div className="screen relative bg-[#111b21] flex flex-col pt-12"><div className="flex-1 p-4 flex flex-col gap-4 overflow-y-auto"><div ref={b1} className="self-end bg-[#005c4b] p-2 rounded-lg text-xs opacity-0">Mandando a foto do novo produto!</div><div ref={b2} className="self-start bg-[#202c33] p-2 rounded-lg text-xs opacity-0">IA em ação. 🚀</div><div ref={b3} className="self-start bg-[#202c33] p-2 rounded-lg text-xs opacity-0">Confere o render VIP:</div></div></div></div></div></div>
    </section>
  );
}

function Pricing() {
  const plans = [{name: "Start", price: "297"}, {name: "Growth", price: "497", high: true}, {name: "Scale", price: "897"}];
  return (
    <section id="pricing" className="py-32 bg-transparent relative overflow-hidden"><motion.div className="absolute inset-0 bg-black/90 backdrop-blur-md -z-10" />
      <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-8">{plans.map((p, i) => (
        <div key={i} className={`glass-card p-10 rounded-3xl border ${p.high ? 'border-secondary' : 'border-white/10'}`}><h3 className="text-2xl text-white mb-4">{p.name}</h3><div className="text-4xl text-white font-bold mb-6">R$ {p.price}</div><button className={`w-full py-4 rounded-xl uppercase text-[10px] tracking-widest ${p.high ? 'bg-secondary text-white' : 'bg-white/5 text-white/50'}`}>Assinar Agora</button></div>
      ))}</div>
    </section>
  );
}
