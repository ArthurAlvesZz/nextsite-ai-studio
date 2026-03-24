import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { auth, db } from '../firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';

interface AuthContextType {
  currentUser: User | null;
  isMasterAdmin: boolean;
  loading: boolean;
  loginMasterAdmin: () => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function useGlobalAuth() {
  return useContext(AuthContext);
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isMasterAdmin, setIsMasterAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const presenceIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Check master admin session in localStorage
    const masterSession = localStorage.getItem('master_admin_session');
    if (masterSession === 'true') {
      setIsMasterAdmin(true);
    }

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false);
      
      if (presenceIntervalRef.current) {
        clearInterval(presenceIntervalRef.current);
      }

      if (user) {
        const pingPresence = () => {
          setDoc(doc(db, 'users', user.uid), {
            lastActive: Date.now()
          }, { merge: true }).catch(() => {});
        };
        
        // Initial ping
        pingPresence();
        
        // Ping every 1 minute
        presenceIntervalRef.current = setInterval(pingPresence, 60000);
      }
    });

    return () => {
      unsubscribe();
      if (presenceIntervalRef.current) {
        clearInterval(presenceIntervalRef.current);
      }
    };
  }, []);

  const loginMasterAdmin = () => {
    localStorage.setItem('master_admin_session', 'true');
    setIsMasterAdmin(true);
  };

  const logout = () => {
    auth.signOut();
    localStorage.removeItem('master_admin_session');
    setIsMasterAdmin(false);
  };

  const value = {
    currentUser,
    isMasterAdmin,
    loading,
    loginMasterAdmin,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
