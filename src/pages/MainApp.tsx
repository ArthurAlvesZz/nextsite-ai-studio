import React, { useState, useRef, useEffect, useCallback, memo } from 'react';
import { Link } from 'react-router-dom';
import { motion, useScroll, useTransform } from 'motion/react';
import { useAgencySettings } from '../hooks/useAgencySettings';
import type { PricingPlan } from '../hooks/useAgencySettings';
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
  ChevronLeft,
  ChevronRight,
  Cpu,
  Check,
  Phone,
  Video,
  MoreVertical,
  Mic,
} from 'lucide-react';
import Lenis from 'lenis';
import logo from '../assets/logo.png';
import SEO from '../components/SEO';

const LOGO_URL = logo;
gsap.registerPlugin(ScrollTrigger, TextPlugin);

// ---------------------------------------------------------------------------
// Root
// ---------------------------------------------------------------------------
export default function MainApp() {
  const { settings } = useAgencySettings();

  // -- Single RAF loop: Lenis + GSAP ticker (Three.js also hooks in below) --
  useEffect(() => {
    const lenis = new Lenis({
      lerp: 0.08,
      duration: 1.2,
      smoothWheel: true,
      autoRaf: false, // we drive it ourselves via gsap.ticker
    });

    lenis.on('scroll', ScrollTrigger.update);
    const onTick = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(onTick);
    gsap.ticker.lagSmoothing(0);

    return () => {
      lenis.off('scroll', ScrollTrigger.update);
      gsap.ticker.remove(onTick);
      lenis.destroy();
    };
  }, []);

  // -- Background section transitions via ScrollTrigger --
  useEffect(() => {
    const bgConstruct  = document.querySelector('#bg-construct');
    const bgProcessing = document.querySelector('#bg-processing');
    const bgReality    = document.querySelector('#bg-reality');
    if (!bgConstruct || !bgProcessing || !bgReality) return;

    const st1 = ScrollTrigger.create({
      trigger: '#results',
      start: 'top 60%',
      onEnter: () => {
        gsap.to(bgConstruct,  { opacity: 0, duration: 1.5, ease: 'power2.inOut' });
        gsap.fromTo(bgProcessing, { opacity: 0, scale: 1.05 }, { opacity: 1, scale: 1, duration: 1.5, ease: 'power2.inOut' });
      },
      onLeaveBack: () => {
        gsap.to(bgConstruct,  { opacity: 1, duration: 1.5, ease: 'power2.inOut' });
        gsap.to(bgProcessing, { opacity: 0, scale: 1.05, duration: 1.5, ease: 'power2.inOut' });
      },
    });

    const st2 = ScrollTrigger.create({
      trigger: '#pricing',
      start: 'top 70%',
      onEnter: () => {
        gsap.to(bgProcessing, { opacity: 0, duration: 1.5, ease: 'power2.inOut' });
        gsap.to(bgReality,    { opacity: 1, duration: 2,   ease: 'power2.inOut' });
      },
      onLeaveBack: () => {
        gsap.to(bgProcessing, { opacity: 1, duration: 1.5, ease: 'power2.inOut' });
        gsap.to(bgReality,    { opacity: 0, duration: 1.5, ease: 'power2.inOut' });
      },
    });

    return () => { st1.kill(); st2.kill(); };
  }, []);

  return (
    <div className="font-body selection:bg-primary selection:text-on-primary min-h-screen bg-transparent text-on-background relative">
      <SEO title="Vídeos com IA para o seu Negócio" />
      <ImmersiveBackground />
      <div className="relative z-10">
        <Navbar />
        <Hero settings={settings} />
        <Results settings={settings} />
        <Transformation settings={settings} />
        <Workflow settings={settings} />
        <Pricing settings={settings} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ImmersiveBackground — memoized, Three.js driven by gsap.ticker (no 2nd RAF)
// ---------------------------------------------------------------------------
const ImmersiveBackground = memo(function ImmersiveBackground() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mountRef.current) return;

    const scene    = new THREE.Scene();
    const camera   = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: false,           // cheaper on low-end devices
      powerPreference: 'low-power',
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5)); // was 2
    mountRef.current.appendChild(renderer.domElement);

    const isMobile      = window.innerWidth < 768;
    const particlesCount = isMobile ? 400 : 1200; // was 600 / 2000
    const posArray      = new Float32Array(particlesCount * 3);
    const colorsArray   = new Float32Array(particlesCount * 3);
    const color1 = new THREE.Color('#adc6ff');
    const color2 = new THREE.Color('#e9b3ff');

    for (let i = 0; i < particlesCount * 3; i += 3) {
      posArray[i]     = (Math.random() - 0.5) * 10;
      posArray[i + 1] = (Math.random() - 0.5) * 10;
      posArray[i + 2] = (Math.random() - 0.5) * 10;
      const c = color1.clone().lerp(color2, Math.random());
      colorsArray[i]     = c.r;
      colorsArray[i + 1] = c.g;
      colorsArray[i + 2] = c.b;
    }

    const particlesGeometry = new THREE.BufferGeometry();
    particlesGeometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
    particlesGeometry.setAttribute('color',    new THREE.BufferAttribute(colorsArray, 3));

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

    let mouseX = 0, mouseY = 0;
    const onMouseMove = (e: MouseEvent) => {
      mouseX = e.clientX - window.innerWidth  / 2;
      mouseY = e.clientY - window.innerHeight / 2;
    };
    document.addEventListener('mousemove', onMouseMove, { passive: true });

    const clock = new THREE.Clock();
    let frameCount = 0;

    // Joined into the same GSAP ticker — zero competing RAF loops
    const onTick = () => {
      frameCount++;
      const t = clock.getElapsedTime();

      particlesMesh.rotation.y += 0.001;
      particlesMesh.rotation.x += 0.0005;
      particlesMesh.rotation.y += 0.05 * (mouseX * 0.001 - particlesMesh.rotation.y);
      particlesMesh.rotation.x += 0.05 * (mouseY * 0.001 - particlesMesh.rotation.x);

      // Wave mutation: skip every other frame on mobile to halve CPU cost
      if (!isMobile || frameCount % 2 === 0) {
        const pos = particlesGeometry.attributes.position.array as Float32Array;
        for (let i = 0; i < particlesCount; i++) {
          const i3 = i * 3;
          pos[i3 + 1] += Math.sin(t + pos[i3])     * 0.002;
          pos[i3 + 2] += Math.cos(t + pos[i3 + 2]) * 0.002;
        }
        particlesGeometry.attributes.position.needsUpdate = true;
      }

      renderer.render(scene, camera);
    };
    gsap.ticker.add(onTick);

    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', onResize, { passive: true });

    return () => {
      gsap.ticker.remove(onTick);
      window.removeEventListener('resize', onResize);
      document.removeEventListener('mousemove', onMouseMove);
      if (mountRef.current?.contains(renderer.domElement)) {
        mountRef.current.removeChild(renderer.domElement);
      }
      particlesGeometry.dispose();
      particlesMaterial.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div id="immersive-bg" className="fixed inset-0 w-full h-full -z-10 bg-[#050505] overflow-hidden">
      <motion.div
        className="absolute inset-0 flex items-center justify-center opacity-40 mix-blend-screen pointer-events-none transform-gpu will-change-transform"
        animate={{ rotate: [0, 360], scale: [1, 1.1, 1] }}
        transition={{
          rotate: { duration: 80, repeat: Infinity, ease: 'linear' },
          scale:  { duration: 15, repeat: Infinity, ease: 'easeInOut' },
        }}
      >
        <motion.img
          src="/bg-shape.webp"
          alt=""
          aria-hidden="true"
          className="w-[120vw] h-[120vw] max-w-[1200px] max-h-[1200px] object-contain drop-shadow-[0_0_50px_rgba(153,0,255,0.3)] transform-gpu will-change-transform"
          loading="lazy"
          animate={{ y: [-30, 30, -30], x: [-20, 20, -20] }}
          transition={{
            y: { duration: 10, repeat: Infinity, ease: 'easeInOut' },
            x: { duration: 14, repeat: Infinity, ease: 'easeInOut' },
          }}
          onError={(e) => {
            e.currentTarget.src = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2000&auto=format&fit=crop';
            e.currentTarget.className = 'w-[120vw] h-[120vw] max-w-[1200px] max-h-[1200px] object-cover opacity-50 mix-blend-screen rounded-full blur-3xl';
          }}
        />
      </motion.div>
      <div ref={mountRef} className="absolute inset-0 w-full h-full opacity-40 mix-blend-screen" />
      <div id="bg-construct" className="absolute inset-0 w-full h-full bg-gradient-to-b from-[#020202] to-transparent">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(0,102,255,0.05),transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(153,0,255,0.05),transparent_40%)]" />
      </div>
      <div id="bg-processing" className="absolute inset-0 w-full h-full opacity-0">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0066ff]/5 to-[#9900ff]/5 mix-blend-overlay" />
        <div className="absolute inset-0 backdrop-blur-[2px] bg-black/80" />
      </div>
      <div id="bg-reality" className="absolute inset-0 w-full h-full opacity-0">
        <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/80 to-transparent" />
      </div>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px]" />
    </div>
  );
});

// ---------------------------------------------------------------------------
// Navbar — memoized (no internal state changes on every scroll pixel)
// ---------------------------------------------------------------------------
const Navbar = memo(function Navbar() {
  const { scrollY } = useScroll();
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    return scrollY.on('change', (latest) => {
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
          <button
            className={`flex items-center gap-3 border rounded-2xl font-body font-light text-[10px] uppercase tracking-[0.2em] transition-all duration-700 group px-6 py-3 ${
              isScrolled
                ? 'bg-secondary text-on-secondary border-secondary shadow-2xl scale-105'
                : 'border-white/10 hover:border-white/30 bg-white/[0.02] hover:bg-white/[0.05] text-white/80 hover:text-white'
            }`}
          >
            {isScrolled ? 'Assinar Agora' : 'Iniciar Projeto'}
            <ArrowUpRight
              className={`w-3 h-3 transition-all ${
                isScrolled ? 'text-on-secondary' : 'text-white/30 group-hover:text-white group-hover:translate-x-0.5 group-hover:-translate-y-0.5'
              }`}
              strokeWidth={1}
            />
          </button>
        </div>
      </div>
    </nav>
  );
});

// ---------------------------------------------------------------------------
// Hero
// ---------------------------------------------------------------------------
function Hero({ settings }: { settings: any }) {
  const { scrollY } = useScroll();
  const y       = useTransform(scrollY, [0, 500], [0, 100]);
  const scale   = useTransform(scrollY, [0, 500], [1.1, 1.2]);
  const opacity = useTransform(scrollY, [0, 500], [0.08, 0.15]);
  const textRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (!textRef.current) return;
    const text = textRef.current;
    text.innerHTML = settings.heroTitle;
    gsap.fromTo(
      text,
      { opacity: 0, backgroundPosition: '200% center' },
      {
        opacity: 1,
        backgroundPosition: '0% center',
        duration: 2.5,
        ease: 'power3.out',
        delay: 0.2,
        onComplete: () => {
          if (settings.heroTitle.includes('autoridade')) {
            text.innerHTML = settings.heroTitle.replace(
              'autoridade',
              '<span class="font-serif italic text-secondary font-light">autoridade</span>'
            );
          }
        },
      }
    );
  }, [settings.heroTitle]);

  return (
    <section id="hero" className="relative min-h-screen flex items-center justify-center pt-24 overflow-hidden bg-transparent">
      <motion.div
        style={{ y, scale, opacity }}
        className="absolute inset-0 z-0 flex items-center justify-center pointer-events-none overflow-hidden transform-gpu will-change-transform"
      >
        <img src={LOGO_URL} alt="" aria-hidden="true" className="w-[110%] h-[110%] object-contain opacity-50 blur-[15px] grayscale-[0.1] brightness-[0.9]" referrerPolicy="no-referrer" />
      </motion.div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 flex flex-col items-center text-center">
        <motion.span
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="inline-flex items-center gap-3 py-2 px-6 rounded-full border border-secondary/30 text-secondary text-xs font-bold tracking-[0.3em] uppercase mb-8 glass-card"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
          </span>
          NEXT CREATIVES STUDIO
        </motion.span>

        <h1
          ref={textRef}
          className="font-headline text-4xl md:text-8xl font-extrabold tracking-tighter leading-[1.05] mb-8 bg-clip-text text-transparent bg-[linear-gradient(to_right,#ffffff,rgba(255,255,255,0.8),#adc6ff,#e9b3ff,#ffffff)] bg-[length:200%_auto] opacity-0"
        />

        <motion.p
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1.5 }}
          className="text-on-surface-variant text-lg md:text-xl max-w-2xl mb-12 font-light leading-relaxed"
        >
          {settings.heroDescription}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1.8 }}
          className="flex flex-col items-center gap-10 transform-gpu will-change-transform"
        >
          <div className="flex flex-col sm:flex-row gap-6">
            <div className="relative group rounded-xl overflow-hidden p-[2px]">
              <div className="animated-border-bg opacity-70 group-hover:opacity-100 transition-opacity duration-500" />
              <button className="relative px-10 py-5 bg-gradient-to-r from-secondary to-primary text-on-secondary rounded-[10px] font-headline font-bold uppercase text-sm tracking-widest hover:shadow-[0_0_30px_rgba(233,179,255,0.5)] transition-all duration-500 w-full h-full">
                Solicitar Produção VIP
              </button>
            </div>
            <a href="#results">
              <button className="px-10 py-5 bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl font-headline font-bold uppercase text-sm tracking-widest text-white hover:bg-white/10 transition-all duration-500">
                Assistir ao Portfólio
              </button>
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// DynamicLightingEffect — memoized
// ---------------------------------------------------------------------------
const DynamicLightingEffect = memo(function DynamicLightingEffect() {
  const [isDay, setIsDay] = useState(true);
  useEffect(() => { const h = new Date().getHours(); setIsDay(h >= 6 && h < 18); }, []);
  return (
    <div className="absolute top-0 left-0 w-full h-full pointer-events-none z-0 overflow-hidden">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        whileInView={{ opacity: 1, scale: 1 }}
        animate={{ scale: [1, 1.05, 1], opacity: [0.35, 0.45, 0.35] }}
        viewport={{ once: false }}
        transition={{
          opacity: { duration: 5, repeat: Infinity, ease: 'easeInOut' },
          scale:   { duration: 8, repeat: Infinity, ease: 'easeInOut' },
          duration: 2.5, ease: 'easeOut',
        }}
        className={`absolute -top-40 -left-40 w-[800px] h-[800px] rounded-full blur-[150px] mix-blend-screen ${
          isDay
            ? 'bg-gradient-radial from-[#fff7e6] via-[#ffd27f] to-transparent'
            : 'bg-gradient-radial from-[#e6f0ff] via-[#7fb2ff] to-transparent'
        }`}
      />
    </div>
  );
});

// ---------------------------------------------------------------------------
// Results — first iPhone mockup (portfolio reels)
// FIX: video first-frame black → seek to 0.001 on loadedmetadata
// FIX: mobile nav controls restored
// FIX: case info (title, metric, description) rendered on the left
// ---------------------------------------------------------------------------
function Results({ settings }: { settings: any }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying]       = useState(false);
  const [videoLoading, setVideoLoading] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  const currentCase = settings.portfolioCases[currentIndex] ?? settings.portfolioCases[0];

  // Seek past the black first frame as soon as metadata arrives
  const handleLoadedMetadata = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.currentTime = 0.001;
    }
  }, []);

  const handleCanPlay = useCallback(() => {
    setVideoLoading(false);
  }, []);

  const animateTransition = useCallback(
    (nextIndex: number, direction: 'up' | 'down') => {
      if (!videoRef.current) return;
      const video = videoRef.current;
      setVideoLoading(true);

      gsap.to(video, {
        y: direction === 'up' ? -60 : 60,
        opacity: 0,
        duration: 0.3,
        ease: 'power2.in',
        onComplete: () => {
          // Update index + video source together after out-animation
          setCurrentIndex(nextIndex);
          setIsPlaying(false);
          video.pause();
          video.src = settings.portfolioCases[nextIndex].videoSrc;
          video.load();
          video.currentTime = 0.001;
          gsap.fromTo(
            video,
            { y: direction === 'up' ? 60 : -60, opacity: 0 },
            { y: 0, opacity: 1, duration: 0.5, ease: 'power2.out' }
          );
        },
      });
    },
    [settings.portfolioCases]
  );

  const handleNext = useCallback(() => {
    animateTransition((currentIndex + 1) % settings.portfolioCases.length, 'up');
  }, [currentIndex, settings.portfolioCases.length, animateTransition]);

  const handlePrev = useCallback(() => {
    animateTransition(
      (currentIndex - 1 + settings.portfolioCases.length) % settings.portfolioCases.length,
      'down'
    );
  }, [currentIndex, settings.portfolioCases.length, animateTransition]);

  const togglePlay = useCallback(() => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
  }, [isPlaying]);

  return (
    <section id="results" className="py-32 bg-transparent relative overflow-hidden">
      <DynamicLightingEffect />
      <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-16 relative z-10">

        {/* Left: heading + dynamic case info */}
        <div className="w-full md:w-1/2 text-left">
          <h2 className="font-headline text-5xl md:text-7xl font-extralight tracking-tight text-white mb-8 leading-[1.1]">
            Nosso <span className="font-serif italic text-secondary font-light">Portfólio</span>
          </h2>
          <div className="w-12 h-[1px] bg-secondary/30 mb-8" />

          {/* Case info — updates with carousel */}
          <motion.div key={currentIndex} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="mb-10">
            <p className="text-secondary text-[10px] tracking-[0.4em] uppercase font-mono mb-2">{currentCase.cliente}</p>
            <h3 className="text-white text-2xl font-light mb-3">{currentCase.tituloDaCampanha}</h3>
            <p className="text-white/40 text-base font-extralight leading-relaxed mb-4">{currentCase.descricao}</p>
            <span className="text-secondary font-bold text-xl">{currentCase.metricaPrincipal}</span>
          </motion.div>

          <div className="flex items-center gap-4 text-secondary/80 group cursor-pointer text-xs tracking-widest">
            <span className="font-headline uppercase">Explorar Portfólio</span>
            <ArrowRight className="group-hover:translate-x-2 transition-transform" strokeWidth={1} />
          </div>
        </div>

        {/* Right: phone + nav controls */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1.2 }}
          className="w-full md:w-1/2 flex flex-col items-center md:items-end gap-6 transform-gpu will-change-transform"
        >
          <div className="flex items-center gap-8">
            {/* Desktop vertical nav */}
            <div className="hidden md:flex flex-col gap-4">
              <button onClick={handlePrev} aria-label="Anterior" className="p-4 glass-card rounded-full text-white/50 hover:text-white transition-colors">
                <ChevronUp className="w-6 h-6" />
              </button>
              <button onClick={handleNext} aria-label="Próximo" className="p-4 glass-card rounded-full text-white/50 hover:text-white transition-colors">
                <ChevronDown className="w-6 h-6" />
              </button>
            </div>

            <div className={`iphone-x relative transition-all duration-700 transform-gpu will-change-transform ${isPlaying ? 'shadow-[0_0_80px_rgba(233,179,255,0.5)] scale-[1.02]' : 'scale-100'}`}>
              <div className="notch" />
              <div className="screen relative group cursor-pointer" onClick={togglePlay}>

                {/* Loading skeleton — shown while video buffers */}
                {videoLoading && (
                  <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#111]">
                    <div className="w-10 h-10 rounded-full border-2 border-secondary/30 border-t-secondary animate-spin" />
                  </div>
                )}

                {/* FIX: crossOrigin for external URLs; onLoadedMetadata seeks past black frame */}
                <video
                  ref={videoRef}
                  loop
                  muted
                  playsInline
                  preload="metadata"
                  crossOrigin="anonymous"
                  className="w-full h-full object-cover"
                  src={currentCase.videoSrc}
                  onLoadedMetadata={handleLoadedMetadata}
                  onCanPlay={handleCanPlay}
                  onError={() => setVideoLoading(false)}
                />

                {/* Play overlay — hidden while loading */}
                {!isPlaying && !videoLoading && (
                  <div className="absolute inset-0 flex items-center justify-center z-20 bg-black/40 backdrop-blur-[1px]">
                    <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="relative">
                      <div className="absolute inset-0 bg-primary/40 rounded-full animate-ping" />
                      <div className="relative p-8 bg-primary text-on-primary rounded-full">
                        <Play className="w-10 h-10 fill-current" />
                      </div>
                    </motion.div>
                  </div>
                )}

                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Mobile horizontal nav — restored */}
          <div className="flex md:hidden items-center gap-6">
            <button onClick={handlePrev} aria-label="Anterior" className="p-3 glass-card rounded-full text-white/50 hover:text-white transition-colors">
              <ChevronLeft className="w-5 h-5" />
            </button>
            {/* Dot indicators */}
            <div className="flex gap-2">
              {settings.portfolioCases.map((_: any, i: number) => (
                <button
                  key={i}
                  onClick={() => animateTransition(i, i > currentIndex ? 'up' : 'down')}
                  className={`rounded-full transition-all duration-300 ${i === currentIndex ? 'w-6 h-2 bg-secondary' : 'w-2 h-2 bg-white/20'}`}
                  aria-label={`Case ${i + 1}`}
                />
              ))}
            </div>
            <button onClick={handleNext} aria-label="Próximo" className="p-3 glass-card rounded-full text-white/50 hover:text-white transition-colors">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// NeuralWave (canvas) — unchanged, memoized
// ---------------------------------------------------------------------------
const NeuralWave = memo(function NeuralWave() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    let particles: any[] = [];
    const count = window.innerWidth < 768 ? 20 : 60;
    const init = () => {
      canvas.width  = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      particles = Array.from({ length: count }, () => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        size: Math.random() * 1.5 + 0.5,
      }));
    };
    let rafId: number;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p, i) => {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > canvas.width)  p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = i % 2 === 0 ? 'rgba(173,198,255,0.4)' : 'rgba(233,179,255,0.4)';
        ctx.fill();
        particles.slice(i + 1).forEach((p2) => {
          const d = Math.hypot(p.x - p2.x, p.y - p2.y);
          if (d < 80) {
            ctx.beginPath();
            ctx.strokeStyle = 'rgba(173,198,255,0.05)';
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }
        });
      });
      rafId = requestAnimationFrame(draw);
    };
    init();
    draw();
    window.addEventListener('resize', init, { passive: true });
    return () => { cancelAnimationFrame(rafId); window.removeEventListener('resize', init); };
  }, []);
  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full opacity-60" />;
});

// ---------------------------------------------------------------------------
// Transformation
// ---------------------------------------------------------------------------
function Transformation({ settings }: { settings: any }) {
  const [isGlowActive, setIsGlowActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const handlePlay = () => { videoRef.current?.play(); setIsGlowActive(true); };
  return (
    <section id="transformation" className="py-32 bg-transparent relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 text-center mb-24">
        <motion.span initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} className="text-white/40 text-[10px] tracking-[0.5em] uppercase mb-6 block">A ALQUIMIA DO SEU ATIVO</motion.span>
        <motion.h2 initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} className="font-headline text-5xl md:text-7xl font-extralight text-white leading-[1.1]">
          Transformamos o comum em <br /><span className="font-serif italic text-secondary font-light">desejo absoluto</span>
        </motion.h2>
      </div>
      <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-12 gap-8">
        <motion.div className="md:col-span-4 glass-card p-10 flex flex-col justify-between group border-white/5">
          <h3 className="text-2xl font-light text-white mb-4">O Ponto de Partida</h3>
          <p className="text-white/40 text-sm font-extralight">Você nos entrega a essência do seu produto em fotos brutas e sem tratamento.</p>
          <div className="relative mt-8 rounded-xl overflow-hidden border border-white/5 aspect-square">
            <img src={settings.transformationPanel1Image} className="w-full h-full object-cover grayscale opacity-40 group-hover:grayscale-0 group-hover:opacity-80 transition-all duration-1000" loading="lazy" alt="Produto original" />
          </div>
        </motion.div>
        <motion.div className="md:col-span-4 glass-card p-10 flex flex-col items-center justify-center relative overflow-hidden border-white/5">
          <NeuralWave />
          <div className="relative z-10 text-center">
            <h3 className="text-2xl font-light text-white mb-8">A Inteligência <br /><span className="font-serif italic text-secondary">por trás da cena</span></h3>
            <Cpu className="text-secondary/60 w-12 h-12 mb-8" strokeWidth={1} />
            <div className="font-mono text-[9px] text-secondary/50 space-y-2 bg-black/60 p-4 rounded-xl">
              <div> neural_mapping_geometry...</div>
              <div> volumetric_lighting_vfx...</div>
            </div>
          </div>
        </motion.div>
        <motion.div className={`md:col-span-4 glass-card p-10 flex flex-col justify-between overflow-hidden relative border-white/5 ${isGlowActive ? 'neon-glow-secondary' : ''}`}>
          <h3 className="text-2xl font-light text-white mb-4">O Resultado de Elite</h3>
          <p className="text-white/40 text-sm font-extralight">Transformamos dados estáticos em uma experiência de cinema que converte.</p>
          <div className="relative mt-8 rounded-xl overflow-hidden border border-white/10 aspect-square group cursor-pointer" onClick={handlePlay}>
            <video ref={videoRef} src={settings.transformationPanel3Video} className="w-full h-full object-cover" loop muted playsInline crossOrigin="anonymous" />
            {!isGlowActive && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                <Play className="fill-white w-6 h-6" />
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Workflow — second iPhone mockup (WhatsApp simulation)
// FIX: uses settings.whatsappMockupImage1 & whatsappMockupImage2
// FIX: proper WhatsApp header + input bar
// FIX: workflowSteps rendered on the left
// ---------------------------------------------------------------------------
function Workflow({ settings }: { settings: any }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const headerRef    = useRef<HTMLDivElement>(null);
  const msg1Ref      = useRef<HTMLDivElement>(null);
  const msg2Ref      = useRef<HTMLDivElement>(null);
  const img1Ref      = useRef<HTMLDivElement>(null);
  const msg3Ref      = useRef<HTMLDivElement>(null);
  const img2Ref      = useRef<HTMLDivElement>(null);
  const msg4Ref      = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: containerRef.current,
        start: 'top 55%',
        end: 'bottom 75%',
        scrub: 1.5,
      },
    });

    tl.fromTo(headerRef.current, { opacity: 0, y: -20 },        { opacity: 1, y: 0 })
      .fromTo(msg1Ref.current,   { opacity: 0, x: -30, y: 10 }, { opacity: 1, x: 0, y: 0 }, '+=0.1')
      .fromTo(msg2Ref.current,   { opacity: 0, x: 30,  y: 10 }, { opacity: 1, x: 0, y: 0 }, '+=0.15')
      .fromTo(img1Ref.current,   { opacity: 0, scale: 0.9 },    { opacity: 1, scale: 1 },    '+=0.15')
      .fromTo(msg3Ref.current,   { opacity: 0, x: 30,  y: 10 }, { opacity: 1, x: 0, y: 0 }, '+=0.15')
      .fromTo(img2Ref.current,   { opacity: 0, scale: 0.9 },    { opacity: 1, scale: 1 },    '+=0.15')
      .fromTo(msg4Ref.current,   { opacity: 0, x: -30, y: 10 }, { opacity: 1, x: 0, y: 0 }, '+=0.15');

    return () => { tl.kill(); };
  }, []);

  return (
    <section id="workflow" className="py-32 bg-transparent relative overflow-hidden">
      <div ref={containerRef} className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center gap-16">

        {/* Left: heading + workflow steps from settings */}
        <div className="w-full md:w-1/2">
          <h2 className="font-headline text-5xl md:text-7xl font-extralight text-white mb-8">
            A Engenharia por Trás do{' '}
            <span className="font-serif italic text-secondary">Impossível</span>
          </h2>
          <p className="text-white/40 text-lg font-extralight mb-12">
            Nós absorvemos toda a complexidade técnica para que você receba apenas conversão.
          </p>
          <div className="space-y-6">
            {settings.workflowSteps.map((step: any, i: number) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: i * 0.15 }}
                className="flex items-start gap-4"
              >
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-secondary/20 border border-secondary/30 flex items-center justify-center text-secondary text-xs font-mono">
                  {String(i + 1).padStart(2, '0')}
                </div>
                <div>
                  <h4 className="text-white font-light text-base mb-1">{step.title}</h4>
                  <p className="text-white/40 text-sm font-extralight">{step.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Right: WhatsApp phone — uses whatsappMockupImage1 & whatsappMockupImage2 */}
        <div className="w-full md:w-1/2 flex justify-center">
          <div className="iphone-x relative">
            <div className="notch" />
            <div className="screen flex flex-col bg-[#0b141a] overflow-hidden">

              {/* WhatsApp header */}
              <div ref={headerRef} className="flex items-center gap-3 px-3 py-2 bg-[#202c33] border-b border-white/5 flex-shrink-0" style={{ opacity: 0 }}>
                <div className="w-8 h-8 rounded-full bg-secondary/30 flex items-center justify-center flex-shrink-0 overflow-hidden">
                  <span className="text-secondary text-[10px] font-bold">NC</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-[11px] font-medium leading-none truncate">Next Creatives</p>
                  <p className="text-[#00a884] text-[9px] mt-0.5">online</p>
                </div>
                <div className="flex items-center gap-3 text-white/40">
                  <Video className="w-3.5 h-3.5" />
                  <Phone className="w-3.5 h-3.5" />
                  <MoreVertical className="w-3.5 h-3.5" />
                </div>
              </div>

              {/* Chat messages */}
              <div className="flex-1 px-3 py-4 flex flex-col gap-2.5 overflow-hidden">

                {/* Client sends: text */}
                <div ref={msg1Ref} className="self-start bg-[#202c33] rounded-lg rounded-tl-none px-3 py-2 max-w-[80%]" style={{ opacity: 0 }}>
                  <p className="text-white text-[10px] leading-relaxed">Mandando a foto do produto! 📸</p>
                  <span className="text-white/30 text-[8px] float-right mt-1 ml-2">09:42</span>
                </div>

                {/* Client sends: image 1 from settings */}
                {settings.whatsappMockupImage1 && (
                  <div ref={img1Ref} className="self-start max-w-[78%]" style={{ opacity: 0 }}>
                    <div className="bg-[#202c33] rounded-lg rounded-tl-none overflow-hidden">
                      <img
                        src={settings.whatsappMockupImage1}
                        alt="Foto do produto"
                        className="w-full h-28 object-cover"
                        loading="lazy"
                        crossOrigin="anonymous"
                      />
                      <div className="px-2 py-1 flex justify-end">
                        <span className="text-white/30 text-[8px]">09:42</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Agency replies */}
                <div ref={msg2Ref} className="self-end bg-[#005c4b] rounded-lg rounded-tr-none px-3 py-2 max-w-[80%]" style={{ opacity: 0 }}>
                  <p className="text-white text-[10px] leading-relaxed">IA em ação. Processando agora 🚀</p>
                  <span className="text-white/30 text-[8px] float-right mt-1 ml-2">09:43 ✓✓</span>
                </div>

                <div ref={msg3Ref} className="self-end bg-[#005c4b] rounded-lg rounded-tr-none px-3 py-2 max-w-[80%]" style={{ opacity: 0 }}>
                  <p className="text-white text-[10px] leading-relaxed">Render VIP finalizado! Confere 🎬✨</p>
                  <span className="text-white/30 text-[8px] float-right mt-1 ml-2">09:45 ✓✓</span>
                </div>

                {/* Agency sends: result image 2 from settings */}
                {settings.whatsappMockupImage2 && (
                  <div ref={img2Ref} className="self-end max-w-[78%]" style={{ opacity: 0 }}>
                    <div className="bg-[#005c4b] rounded-lg rounded-tr-none overflow-hidden">
                      <img
                        src={settings.whatsappMockupImage2}
                        alt="Resultado da produção"
                        className="w-full h-28 object-cover"
                        loading="lazy"
                        crossOrigin="anonymous"
                      />
                      <div className="px-2 py-1 flex justify-end">
                        <span className="text-white/30 text-[8px]">09:45 ✓✓</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Client reacts */}
                <div ref={msg4Ref} className="self-start bg-[#202c33] rounded-lg rounded-tl-none px-3 py-2 max-w-[80%]" style={{ opacity: 0 }}>
                  <p className="text-white text-[10px] leading-relaxed">Incrível!! 🔥 Quando lança?</p>
                  <span className="text-white/30 text-[8px] float-right mt-1 ml-2">09:46</span>
                </div>
              </div>

              {/* WhatsApp input bar */}
              <div className="flex items-center gap-2 px-3 py-2 bg-[#202c33] flex-shrink-0">
                <div className="flex-1 bg-[#2a3942] rounded-full px-3 py-1.5 flex items-center">
                  <span className="text-white/20 text-[9px]">Mensagem</span>
                </div>
                <div className="w-7 h-7 rounded-full bg-[#00a884] flex items-center justify-center flex-shrink-0">
                  <Mic className="w-3.5 h-3.5 text-white" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Pricing — reads settings.pricingPlans with full feature lists
// ---------------------------------------------------------------------------
function Pricing({ settings }: { settings: any }) {
  return (
    <section id="pricing" className="py-32 bg-transparent relative overflow-hidden">
      <motion.div className="absolute inset-0 bg-black/90 backdrop-blur-md -z-10" />
      <div className="max-w-7xl mx-auto px-6">

        {/* Section heading */}
        <div className="text-center mb-16">
          <motion.span
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-white/40 text-[10px] tracking-[0.5em] uppercase mb-4 block"
          >
            INVISTA NO SEU CRESCIMENTO
          </motion.span>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="font-headline text-5xl md:text-7xl font-extralight text-white"
          >
            Escolha seu <span className="font-serif italic text-secondary">Plano</span>
          </motion.h2>
        </div>

        {/* Plan cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {settings.pricingPlans.map((plan: PricingPlan, i: number) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: i * 0.15 }}
              className={`glass-card p-10 rounded-3xl border flex flex-col relative overflow-hidden ${
                plan.highlighted ? 'border-secondary' : 'border-white/10'
              }`}
            >
              {/* Top accent line on highlighted card */}
              {plan.highlighted && (
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-secondary to-transparent" />
              )}

              {/* Popular badge */}
              {plan.highlighted && (
                <span className="absolute top-5 right-6 text-[9px] text-secondary font-bold tracking-widest uppercase border border-secondary/40 rounded-full px-3 py-1">
                  Popular
                </span>
              )}

              <h3 className="text-2xl text-white font-light mb-2">{plan.name}</h3>

              {/* Price */}
              <div className="mb-3">
                <span className="text-white/40 text-xs align-super mr-0.5">R$</span>
                <span className="text-4xl text-white font-bold">{plan.price}</span>
                <span className="text-white/40 text-xs ml-1">/mês</span>
              </div>

              {/* Short description */}
              {plan.description && (
                <p className="text-white/40 text-sm font-extralight mb-6 pb-6 border-b border-white/5">
                  {plan.description}
                </p>
              )}

              {/* Feature list */}
              <ul className="space-y-3 flex-1 mb-8">
                {plan.features?.map((feature, fi) => (
                  <li key={fi} className="flex items-start gap-3 text-white/70 text-sm font-light">
                    <Check
                      className={`w-4 h-4 flex-shrink-0 mt-0.5 ${plan.highlighted ? 'text-secondary' : 'text-white/40'}`}
                      strokeWidth={2}
                    />
                    {feature}
                  </li>
                ))}
              </ul>

              <button
                className={`w-full py-4 rounded-xl uppercase text-[10px] tracking-widest font-bold transition-all duration-300 ${
                  plan.highlighted
                    ? 'bg-secondary text-white hover:bg-secondary/90 hover:shadow-[0_0_30px_rgba(233,179,255,0.4)]'
                    : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white border border-white/10'
                }`}
              >
                {plan.ctaLabel ?? 'Assinar Agora'}
              </button>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
