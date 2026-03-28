import React, { useState } from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { doc, setDoc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';

export default function AdminLogin() {
  const [accessId, setAccessId] = useState('');
  const [securityKey, setSecurityKey] = useState('');
  const [error, setError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const navigate = useNavigate();

  const handleGoogleLogin = async () => {
    setIsLoggingIn(true);
    setError('');
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // Check if this Google account is linked to any user in our database
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('googleUid', '==', user.uid));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        // User found, proceed to dashboard
        navigate('/admin/dashboard');
      } else {
        // Check if email matches any user in 'users' or 'employees'
        const qEmail = query(usersRef, where('email', '==', user.email));
        const emailSnapshot = await getDocs(qEmail);
        
        const empRef = collection(db, 'employees');
        const qEmp = query(empRef, where('email', '==', user.email));
        const empSnapshot = await getDocs(qEmp);

        if (!emailSnapshot.empty || !empSnapshot.empty) {
          // Email matches! Link it.
          const userId = !emailSnapshot.empty ? emailSnapshot.docs[0].id : empSnapshot.docs[0].id;
          
          await setDoc(doc(db, 'users', userId), {
            googleLinked: true,
            googleUid: user.uid,
            googleEmail: user.email
          }, { merge: true });
          
          navigate('/admin/dashboard');
        } else {
          // No user found with this Google account or email
          setError('Esta conta Google não está vinculada a nenhum perfil administrativo.');
          await auth.signOut();
        }
      }
    } catch (e: any) {
      console.error("Erro ao logar com Google:", e);
      setError('Erro na autenticação com Google.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const email = accessId.includes('@') ? accessId : `${accessId}@nextcreatives.co`;
      await signInWithEmailAndPassword(auth, email, securityKey);
      
      // If login successful, check if it's the owner
      if (accessId === '15599873676' || email === '15599873676@nextcreatives.co') {
        const user = auth.currentUser;
        if (user) {
          const docRef = doc(db, 'employees', user.uid);
          const docSnap = await getDoc(docRef);
          if (!docSnap.exists()) {
            await setDoc(docRef, {
              name: 'Arthur Fagundes #Owner',
              email: email,
              role: 'Admin',
              login: '15599873676',
              password: securityKey,
              initials: 'AF',
              lastLogin: new Date().toLocaleString(),
              isOwner: true,
              userId: user.uid,
              createdAt: Date.now(),
              updatedAt: Date.now()
            });
          } else {
            const data = docSnap.data();
            if (!data.isOwner || data.userId !== user.uid || !data.login || !data.initials) {
              await setDoc(docRef, {
                ...data,
                name: 'Arthur Fagundes #Owner',
                role: 'Admin',
                login: '15599873676',
                initials: 'AF',
                isOwner: true,
                userId: user.uid,
                updatedAt: Date.now()
              });
            }
          }
        }
      }
      
      navigate('/admin/dashboard');
    } catch (e: any) {
      // If user doesn't exist and it's the owner's default credentials, create it
      if (accessId === '15599873676' && securityKey === '15599873676' && (e.code === 'auth/user-not-found' || e.code === 'auth/invalid-credential')) {
        try {
          const ownerEmail = '15599873676@nextcreatives.co';
          const userCredential = await createUserWithEmailAndPassword(auth, ownerEmail, securityKey);
          const user = userCredential.user;
          
          await setDoc(doc(db, 'employees', user.uid), {
            name: 'Arthur Fagundes #Owner',
            email: ownerEmail,
            role: 'Admin',
            login: '15599873676',
            password: securityKey,
            initials: 'AF',
            lastLogin: new Date().toLocaleString(),
            isOwner: true,
            userId: user.uid,
            createdAt: Date.now(),
            updatedAt: Date.now()
          });
          
          navigate('/admin/dashboard');
        } catch (createError) {
          console.error("Erro ao criar conta owner:", createError);
          setError('Erro ao configurar conta owner.');
        }
      } else {
        console.error("Erro ao logar no Firebase Auth:", e);
        setError('Invalid Access ID or Security Key');
      }
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
                    className="w-full bg-transparent border-0 border-b border-white/20 py-3 px-1 text-white focus:ring-0 focus:border-secondary transition-all duration-300 placeholder:text-white/20 font-light tracking-wider outline-none" 
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
                    className="w-full bg-transparent border-0 border-b border-white/20 py-3 px-1 text-white focus:ring-0 focus:border-secondary transition-all duration-300 placeholder:text-white/20 font-light tracking-wider outline-none" 
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
              className="w-full relative group overflow-hidden rounded-xl py-4 bg-gradient-to-r from-secondary to-primary transition-all duration-500 hover:scale-[1.02] active:scale-95 shadow-[0_0_30px_rgba(233,179,255,0.2)] hover:shadow-[0_0_40px_rgba(233,179,255,0.4)] disabled:opacity-50" 
              type="submit"
              disabled={isLoggingIn}
            >
              <span className="relative z-10 text-on-secondary font-headline font-bold uppercase text-sm tracking-widest flex items-center justify-center gap-3">
                {isLoggingIn ? 'Processing...' : 'Enter Dashboard'}
                <span className="material-symbols-outlined text-lg group-hover:translate-x-1 transition-transform">arrow_forward</span>
              </span>
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-500"></div>
            </button>

            <div className="relative flex items-center justify-center py-2">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/10"></div>
              </div>
              <span className="relative px-4 bg-[#0a0a0a] text-[10px] uppercase tracking-[0.3em] text-white/30">OU</span>
            </div>

            <button 
              type="button"
              onClick={handleGoogleLogin}
              disabled={isLoggingIn}
              className="w-full flex items-center justify-center gap-3 py-4 bg-white/[0.03] border border-white/10 rounded-xl text-white hover:bg-white/5 transition-all disabled:opacity-50"
            >
              <img src="https://www.google.com/images/branding/googlelogo/2x/googlelogo_color_92x30dp.png" alt="Google" className="h-4 object-contain" />
              <span className="font-headline font-bold uppercase text-[10px] tracking-widest">Entrar com Google</span>
            </button>
          </form>
        </div>
      </main>

      {/* Footer removed */}
    </div>
  );
}
