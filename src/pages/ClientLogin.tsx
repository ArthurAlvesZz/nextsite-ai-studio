import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';

export default function ClientLogin() {
  const navigate = useNavigate();
  const [accessId, setAccessId] = useState('');
  const [securityKey, setSecurityKey] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
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
            <div className="w-16 h-16 mb-6 rounded-2xl overflow-hidden bg-white/[0.02] border border-white/10 flex items-center justify-center shadow-lg">
              <img alt="Next Creatives Corporate Logo" className="w-10 h-10 object-contain" src="/logo.png" />
            </div>
            <h1 className="text-3xl font-bold text-white font-headline tracking-tight text-center">
              Portal do Cliente
            </h1>
            <p className="text-white/40 text-sm mt-2 font-headline uppercase tracking-widest">
              Acesso Restrito
            </p>
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
              <a className="hover:text-secondary transition-colors" href="#">Recuperar Senha</a>
            </div>
          </form>
        </motion.div>

      </main>


    </div>
  );
}
