import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function ClientLogin() {
  const navigate = useNavigate();
  const [accessId, setAccessId] = useState('');
  const [securityKey, setSecurityKey] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // For now, just navigate to the dashboard
    navigate('/client/dashboard');
  };

  return (
    <div className="font-body text-on-background min-h-screen flex flex-col items-center justify-center relative bg-[#0e0e0e] overflow-hidden">
      {/* Background Orbs */}
      <div className="absolute w-[600px] h-[600px] rounded-full blur-[120px] opacity-15 z-0 bg-[#97a9ff] -top-[10%] -left-[10%]"></div>
      <div className="absolute w-[600px] h-[600px] rounded-full blur-[120px] opacity-15 z-0 bg-[#cb7bff] -bottom-[10%] -right-[10%]"></div>

      {/* Top Navigation */}
      <header className="fixed top-0 w-full flex justify-center items-center py-8 z-20">
        <div className="text-2xl font-black tracking-tighter text-white uppercase font-headline">
          Next Creatives
        </div>
      </header>

      {/* Main Content: Admin Terminal */}
      <main className="relative z-10 w-full max-w-md px-6">
        <div className="bg-[#131313]/70 backdrop-blur-3xl p-8 md:p-12 rounded-xl border border-[#494847]/15 shadow-2xl">
          {/* Logo Section */}
          <div className="flex flex-col items-center mb-10">
            <div className="w-16 h-16 mb-6 rounded-2xl overflow-hidden bg-[#262626] flex items-center justify-center">
              <img alt="Next Creatives Corporate Logo" className="w-12 h-12 object-contain" src="/logo.png" />
            </div>
            <h1 className="text-3xl font-bold text-white font-headline tracking-tight text-center">
              Portal do Cliente
            </h1>
            <p className="text-[#adaaaa] text-sm mt-2 font-label uppercase tracking-widest opacity-60">
              Acesso Restrito
            </p>
          </div>

          {/* Login Form */}
          <form className="space-y-8" onSubmit={handleLogin}>
            <div className="space-y-6">
              {/* Access ID */}
              <div className="relative group">
                <label className="block text-[10px] uppercase tracking-[0.2em] text-[#adaaaa] mb-2 ml-1">Access ID</label>
                <div className="relative">
                  <input 
                    className="w-full bg-transparent border-0 border-b border-[#494847] py-3 px-1 text-white focus:ring-0 focus:border-[#97a9ff] transition-all duration-300 placeholder:text-[#777575]/40 outline-none" 
                    placeholder="CR-XXXX-XXXX" 
                    type="text"
                    value={accessId}
                    onChange={(e) => setAccessId(e.target.value)}
                    required
                  />
                  <div className="absolute bottom-0 left-0 w-0 h-[2px] bg-[#97a9ff] transition-all duration-500 group-focus-within:w-full"></div>
                </div>
              </div>

              {/* Security Key */}
              <div className="relative group">
                <label className="block text-[10px] uppercase tracking-[0.2em] text-[#adaaaa] mb-2 ml-1">Security Key</label>
                <div className="relative">
                  <input 
                    className="w-full bg-transparent border-0 border-b border-[#494847] py-3 px-1 text-white focus:ring-0 focus:border-[#97a9ff] transition-all duration-300 placeholder:text-[#777575]/40 outline-none" 
                    placeholder="••••••••••••" 
                    type="password"
                    value={securityKey}
                    onChange={(e) => setSecurityKey(e.target.value)}
                    required
                  />
                  <div className="absolute bottom-0 left-0 w-0 h-[2px] bg-[#97a9ff] transition-all duration-500 group-focus-within:w-full"></div>
                </div>
              </div>
            </div>

            {/* CTA Button */}
            <button 
              className="w-full relative group overflow-hidden rounded-full py-4 bg-gradient-to-r from-[#97a9ff] to-[#cb7bff] transition-all duration-300 hover:scale-[1.02] active:scale-95 shadow-[0_0_20px_-5px_rgba(151,169,255,0.4)]" 
              type="submit"
            >
              <span className="relative z-10 text-[#002283] font-bold tracking-tight flex items-center justify-center gap-2">
                Acessar Painel
                <span className="material-symbols-outlined text-lg">arrow_forward</span>
              </span>
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
            </button>

            {/* Auxiliary Actions */}
            <div className="flex justify-between items-center text-[11px] font-label uppercase tracking-wider text-[#adaaaa] pt-2">
              <a className="hover:text-[#97a9ff] transition-colors" href="#">Solicitar Acesso</a>
              <a className="hover:text-[#97a9ff] transition-colors" href="#">Recuperar Senha</a>
            </div>
          </form>
        </div>

        {/* System Status */}
        <div className="mt-8 flex items-center justify-center gap-4 opacity-40">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-[#b5ffc2] animate-pulse"></div>
            <span className="text-[10px] font-label tracking-widest uppercase text-white">Conexão Segura</span>
          </div>
          <div className="w-px h-3 bg-[#494847]"></div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-label tracking-widest uppercase text-white">Node: CL-01</span>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="fixed bottom-0 w-full flex flex-col md:flex-row justify-between items-center px-12 py-6 bg-[#131313] z-20">
        <div className="text-white font-bold font-headline text-[12px] tracking-widest uppercase mb-4 md:mb-0">
          © {new Date().getFullYear()} Next Creatives. Cinematic Precision.
        </div>
        <div className="flex gap-8">
          <a className="text-white/40 font-headline text-[12px] tracking-widest uppercase hover:text-[#cb7bff] transition-all opacity-80 hover:opacity-100" href="#">Privacy Policy</a>
          <a className="text-white/40 font-headline text-[12px] tracking-widest uppercase hover:text-[#cb7bff] transition-all opacity-80 hover:opacity-100" href="#">Terms of Service</a>
        </div>
      </footer>
    </div>
  );
}
