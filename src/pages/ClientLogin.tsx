import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import logo from '../assets/logo.png';

export default function ClientLogin() {
  const navigate = useNavigate();
  const [accessId, setAccessId] = useState('');
  const [securityKey, setSecurityKey] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Forgot password states
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotMessage, setForgotMessage] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) return;
    setForgotLoading(true);
    setForgotMessage('');
    try {
      // Mocked Backend API Call (Waiting for real endpoint)
      await fetch('https://api.nextcreatives.co/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email: forgotEmail })
      });
      // Simulate network delay
      await new Promise(r => setTimeout(r, 1000));
      setForgotMessage('E-mail de recuperação enviado com sucesso!');
      setForgotEmail('');
    } catch (err) {
      setForgotMessage('Erro ao enviar e-mail. Tente novamente.');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Test credentials bypass
    if (accessId === '123' && securityKey === '123') {
      navigate('/client/dashboard');
      return;
    }
    
    try {
      const email = `${accessId}@nextcreatives.co`;
      const userCredential = await signInWithEmailAndPassword(auth, email, securityKey);
      
      // Verify if the user is actually a client
      const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
      if (userDoc.exists() && userDoc.data().role === 'client') {
        navigate('/client/dashboard');
      } else {
        // Not a client, sign out
        await auth.signOut();
        setError('Acesso negado. Esta conta não é de cliente.');
      }
    } catch (err) {
      console.error(err);
      setError('Acesso negado. Credenciais inválidas.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="font-body text-white min-h-screen flex flex-col items-center justify-center relative bg-[#020202] overflow-hidden selection:bg-secondary selection:text-on-secondary">
      <div className="absolute w-[600px] h-[600px] rounded-full blur-[120px] opacity-10 z-0 bg-primary -top-[10%] -left-[10%] pointer-events-none"></div>
      <div className="absolute w-[600px] h-[600px] rounded-full blur-[120px] opacity-10 z-0 bg-secondary -bottom-[10%] -right-[10%] pointer-events-none"></div>

      <main className="relative z-10 w-full max-w-md px-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/[0.02] backdrop-blur-3xl p-8 md:p-12 rounded-[2rem] border border-white/10 shadow-2xl relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-secondary to-primary"></div>
          
          <div className="flex flex-col items-center mb-10">
            <div className="w-24 h-24 mb-6 rounded-3xl overflow-hidden bg-white/[0.02] border border-white/10 flex items-center justify-center shadow-2xl shadow-secondary/10 group p-4">
              <img 
                src={logo} 
                alt="Next Creatives Logo" 
                className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-500"
              />
            </div>
            <h1 className="text-3xl font-black tracking-[0.1em] text-center uppercase font-headline bg-gradient-to-r from-secondary to-primary bg-clip-text text-transparent">
              Next Creatives Studio
            </h1>
            <p className="text-xl italic text-secondary/60 font-serif mt-2 tracking-wider">
              Portal do Cliente
            </p>
          </div>

          <div className="mb-8 text-center p-3 rounded-xl bg-secondary/10 border border-secondary/20">
            <p className="text-xs text-secondary/80 font-medium mb-1">Credenciais de Teste:</p>
            <p className="text-[10px] text-white/60 font-mono">ID: 123 | Key: 123</p>
          </div>

          <form className="space-y-8" onSubmit={handleLogin}>
            <div className="space-y-6">
              <div className="relative group">
                <label className="block text-[10px] uppercase tracking-[0.2em] text-white/40 mb-2 ml-1 font-headline font-bold">Access ID</label>
                <div className="relative">
                  <input 
                    className="w-full bg-white/[0.02] border border-white/10 rounded-xl py-3 px-4 text-white focus:ring-1 focus:ring-secondary focus:border-secondary transition-all duration-300 placeholder:text-white/20 outline-none" 
                    placeholder="Ex: CLIENT-123" 
                    type="text"
                    value={accessId}
                    onChange={(e) => { setAccessId(e.target.value); setError(''); }}
                    required
                  />
                </div>
              </div>

              <div className="relative group">
                <label className="block text-[10px] uppercase tracking-[0.2em] text-white/40 mb-2 ml-1 font-headline font-bold">Security Key</label>
                <div className="relative">
                  <input 
                    className="w-full bg-white/[0.02] border border-white/10 rounded-xl py-3 px-4 text-white focus:ring-1 focus:ring-secondary focus:border-secondary transition-all duration-300 placeholder:text-white/20 outline-none" 
                    placeholder="••••••••••••" 
                    type="password"
                    value={securityKey}
                    onChange={(e) => { setSecurityKey(e.target.value); setError(''); }}
                    required
                  />
                </div>
              </div>
            </div>

            {error && (
              <motion.p 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="text-error text-xs font-bold text-center bg-error/10 py-2 rounded-lg border border-error/20"
              >
                {error}
              </motion.p>
            )}

            <button 
              className="w-full relative group overflow-hidden rounded-xl py-4 bg-gradient-to-r from-secondary to-primary transition-all duration-300 hover:scale-[1.02] active:scale-95 shadow-[0_0_20px_rgba(233,179,255,0.2)] disabled:opacity-50 disabled:hover:scale-100" 
              type="submit"
              disabled={loading}
            >
              <span className="relative z-10 text-on-secondary font-headline font-bold uppercase tracking-widest text-xs flex items-center justify-center gap-2">
                {loading ? 'Acessando...' : 'Acessar Painel'}
                {!loading && <span className="material-symbols-outlined text-lg">arrow_forward</span>}
              </span>
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
            </button>

            <div className="flex justify-between items-center text-[10px] font-headline font-bold uppercase tracking-widest text-white/40 pt-2">
              <a className="hover:text-secondary transition-colors" href="#">Solicitar Acesso</a>
              <button type="button" onClick={() => setShowForgotModal(true)} className="hover:text-secondary transition-colors">Recuperar Senha</button>
            </div>
          </form>
        </motion.div>

      </main>

      {/* Forgot Password Modal */}
      <AnimatePresence>
        {showForgotModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowForgotModal(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-[#0a0a0a] border border-white/10 rounded-[2.5rem] p-10 shadow-2xl"
            >
              <h3 className="text-2xl font-black text-white font-headline tracking-tighter mb-2">Recuperar Senha</h3>
              <p className="text-sm text-white/30 font-medium mb-8">Digite seu e-mail corporativo para receber um link de recuperação.</p>
              
              <form onSubmit={handleForgotPassword} className="space-y-6">
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30 ml-1 font-headline">E-mail</label>
                  <input 
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    className="w-full bg-white/[0.02] border border-white/5 rounded-2xl p-5 text-sm text-white focus:ring-1 focus:ring-secondary transition-all outline-none" 
                    type="email" 
                    placeholder="seu@email.com"
                    required
                  />
                </div>
                
                {forgotMessage && (
                  <p className={`text-[10px] font-bold uppercase tracking-widest text-center ${forgotMessage.includes('Erro') ? 'text-error' : 'text-secondary'}`}>
                    {forgotMessage}
                  </p>
                )}

                <div className="flex gap-4 pt-4">
                  <button 
                    type="button"
                    onClick={() => setShowForgotModal(false)}
                    className="flex-1 px-6 py-4 rounded-xl text-[10px] font-black text-white/30 hover:text-white transition-all uppercase tracking-[0.3em]"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    disabled={forgotLoading}
                    className="flex-1 bg-white text-black px-6 py-4 rounded-xl text-[10px] font-black uppercase tracking-[0.3em] hover:bg-secondary hover:text-white transition-all duration-500 disabled:opacity-50"
                  >
                    {forgotLoading ? 'Enviando...' : 'Enviar Link'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
