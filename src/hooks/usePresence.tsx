import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { db } from '../firebase';
import { doc, setDoc, deleteDoc, collection, onSnapshot, query } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';

interface PresenceContextType {
  onlineUsers: number;
  onlineAdminUsers: number;
}

const PresenceContext = createContext<PresenceContextType>({ onlineUsers: 0, onlineAdminUsers: 0 });

export const PresenceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [onlineUsers, setOnlineUsers] = useState(0);
  const [onlineAdminUsers, setOnlineAdminUsers] = useState(0);
  const location = useLocation();
  const sessionIdRef = useRef(Math.random().toString(36).substring(2, 15));

  useEffect(() => {
    const sessionId = sessionIdRef.current;
    const presenceRef = doc(db, 'presence', sessionId);

    const updatePresenceLocalTime = async () => {
      try {
        await setDoc(presenceRef, {
          lastActive: Date.now(),
          userAgent: navigator.userAgent,
          pathname: window.location.pathname,
        }, { merge: true });
      } catch (e) {
        handleFirestoreError(e, OperationType.WRITE, `presence/${sessionId}`);
      }
    };
    
    updatePresenceLocalTime();
    const localInterval = setInterval(updatePresenceLocalTime, 30000);

    const handleUnload = () => {
      deleteDoc(presenceRef).catch(() => {});
    };

    window.addEventListener('beforeunload', handleUnload);

    const q = query(collection(db, 'presence'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const now = Date.now();
      let count = 0;
      let adminCount = 0;
      snapshot.forEach((doc) => {
        const data = doc.data();
        if (data.lastActive && now - data.lastActive < 60000) { // Active in last 60 seconds
          count++;
          if (data.pathname && data.pathname.startsWith('/admin')) {
            adminCount++;
          }
        }
      });
      setOnlineUsers(count);
      setOnlineAdminUsers(adminCount);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'presence');
    });

    return () => {
      clearInterval(localInterval);
      window.removeEventListener('beforeunload', handleUnload);
      deleteDoc(presenceRef).catch(() => {});
      unsubscribe();
    };
  }, []);

  // Update pathname when it changes
  useEffect(() => {
    const sessionId = sessionIdRef.current;
    const presenceRef = doc(db, 'presence', sessionId);
    setDoc(presenceRef, {
      lastActive: Date.now(),
      pathname: location.pathname,
    }, { merge: true }).catch(() => {});
  }, [location.pathname]);

  return (
    <PresenceContext.Provider value={{ onlineUsers, onlineAdminUsers }}>
      {children}
    </PresenceContext.Provider>
  );
};

export const usePresence = () => useContext(PresenceContext);
