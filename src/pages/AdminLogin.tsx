import React, { useState } from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { useGlobalAuth } from '../contexts/AuthContext';

export default function AdminLogin() {
  const [accessId, setAccessId] = useState('');
  const [securityKey, setSecurityKey] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { loginMasterAdmin } = useGlobalAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check for master admin credentials first
    if (accessId === '15599873676' && securityKey === '963369') {
      loginMasterAdmin();
      navigate('/admin/dashboard');
      return;
    }

    // Proceed with Firebase Auth for other users
    try {
      await signInWithEmailAndPassword(auth, `${accessId}@nextcreatives.co`, securityKey);
      navigate('/admin/dashboard');
    } catch (e) {
      console.error("Erro ao logar no Firebase Auth:", e);
      setError('Invalid Access ID or Security Key');
    }
  };

  return (
    <div className="font-body text-on-background min-h-screen flex flex-col items-center justify-center relative bg-[#050505] overflow-hidden">
      {/* Background from Home */}
      <div className="absolute inset-0 w-full h-full -z-10 bg-[#050505] overflow-hidden">
        <div className="absolute inset-0 w-full h-full opacity-1 bg-gradient-to-b from-[#020202] to-transparent">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(0,102,255,0.05),transparent_60%)]"></div>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(153,0,255,0.05),transparent_40%)]"></div>
        </div>
      </div>

      {/* Top Navigation removed */}

      {/* Main Content: Admin Terminal */}
      <main className="relative z-10 w-full max-w-md px-6">
        <div className="bg-white/[0.02] backdrop-blur-3xl p-8 md:p-12 rounded-2xl border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)]">
          {/* Logo Section */}
          <div className="flex flex-col items-center mb-10">
            <img 
              alt="Next Creatives Corporate Logo" 
              className="h-12 md:h-14 object-contain logo-transparent mb-6" 
              src="/logo.png"
              referrerPolicy="no-referrer"
            />
            <h1 className="font-headline text-3xl md:text-4xl font-extrabold tracking-tighter leading-[1.05] bg-clip-text text-transparent bg-[linear-gradient(to_right,#ffffff,rgba(255,255,255,0.8),#adc6ff,#e9b3ff,#ffffff)] bg-[length:200%_auto] text-center">
              Admin Terminal
            </h1>
            <p className="font-serif italic text-secondary font-light text-xl mt-3 tracking-wide opacity-90 text-center">
              Cinematic Precision
            </p>
          </div>

          {/* Login Form */}
          <form className="space-y-8" onSubmit={handleLogin}>
            <div className="space-y-6">
              {/* Access ID */}
              <div className="relative group">
                <label className="block text-[10px] uppercase tracking-[0.3em] text-secondary/70 mb-2 ml-1 font-headline font-bold">Access ID</label>
                <div className="relative">
                  <input 
                    className="w-full bg-transparent border-0 border-b border-white/20 py-3 px-1 text-white focus:ring-0 focus:border-secondary transition-all duration-300 placeholder:text-white/20 font-light tracking-wider" 
                    placeholder="CR-XXXX-XXXX" 
                    type="text"
                    value={accessId}
                    onChange={(e) => setAccessId(e.target.value)}
                    required
                  />
                  <div className="absolute bottom-0 left-0 w-0 h-[2px] bg-secondary transition-all duration-500 group-focus-within:w-full"></div>
                </div>
              </div>

              {/* Security Key */}
              <div className="relative group">
                <label className="block text-[10px] uppercase tracking-[0.3em] text-secondary/70 mb-2 ml-1 font-headline font-bold">Security Key</label>
                <div className="relative">
                  <input 
                    className="w-full bg-transparent border-0 border-b border-white/20 py-3 px-1 text-white focus:ring-0 focus:border-secondary transition-all duration-300 placeholder:text-white/20 font-light tracking-wider" 
                    placeholder="••••••••••••" 
                    type="password"
                    value={securityKey}
                    onChange={(e) => setSecurityKey(e.target.value)}
                    required
                  />
                  <div className="absolute bottom-0 left-0 w-0 h-[2px] bg-secondary transition-all duration-500 group-focus-within:w-full"></div>
                </div>
              </div>
            </div>

            {error && (
              <p className="text-error text-xs font-bold uppercase tracking-widest text-center">{error}</p>
            )}

            {/* CTA Button */}
            <button 
              className="w-full relative group overflow-hidden rounded-xl py-4 bg-gradient-to-r from-secondary to-primary transition-all duration-500 hover:scale-[1.02] active:scale-95 shadow-[0_0_30px_rgba(233,179,255,0.2)] hover:shadow-[0_0_40px_rgba(233,179,255,0.4)]" 
              type="submit"
            >
              <span className="relative z-10 text-on-secondary font-headline font-bold uppercase text-sm tracking-widest flex items-center justify-center gap-3">
                Enter Dashboard
                <span className="material-symbols-outlined text-lg group-hover:translate-x-1 transition-transform">arrow_forward</span>
              </span>
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-500"></div>
            </button>
          </form>
        </div>
      </main>

      {/* Footer removed */}
    </div>
  );
}
