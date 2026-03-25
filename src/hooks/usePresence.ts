import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { doc, setDoc, deleteDoc, collection, onSnapshot, query } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';

export function usePresence() {
  const [onlineUsers, setOnlineUsers] = useState(0);

  useEffect(() => {
    const sessionId = Math.random().toString(36).substring(2, 15);
    const presenceRef = doc(db, 'presence', sessionId);

    const updatePresenceLocalTime = async () => {
      try {
        await setDoc(presenceRef, {
          lastActive: Date.now(),
          userAgent: navigator.userAgent,
        });
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
      snapshot.forEach((doc) => {
        const data = doc.data();
        if (data.lastActive && now - data.lastActive < 60000) { // Active in last 60 seconds
          count++;
        }
      });
      setOnlineUsers(count);
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

  return { onlineUsers };
}
