import { useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';

export interface AdminProfile {
  name: string;
  phone: string;
  avatarUrl: string;
  role?: 'admin' | 'editor';
  password?: string;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [adminProfile, setAdminProfile] = useState<AdminProfile>({
    name: 'Admin Master',
    phone: '15599873676',
    avatarUrl: '',
    role: 'admin'
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;

    // Listen to user profile in Firestore
    const userDocRef = doc(db, 'users', user.uid);
    const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        setAdminProfile(docSnap.data() as AdminProfile);
      } else {
        // Fallback or default profile if doc doesn't exist
        const defaultProfile: AdminProfile = {
          name: user.displayName || 'Usuário',
          phone: user.phoneNumber || '',
          avatarUrl: user.photoURL || '',
          role: user.email === 'arthurfgalves@gmail.com' ? 'admin' : 'editor'
        };
        setAdminProfile(defaultProfile);

        // Auto-create profile for master email if it doesn't exist
        if (user.email === 'arthurfgalves@gmail.com') {
          setDoc(userDocRef, defaultProfile).catch(err => {
            console.warn("Could not auto-create master profile:", err);
          });
        }
      }
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const updateAdminProfile = async (updates: Partial<AdminProfile>) => {
    if (!user) return;
    const userDocRef = doc(db, 'users', user.uid);
    try {
      await setDoc(userDocRef, { ...adminProfile, ...updates }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  return { user, adminProfile, loading, updateAdminProfile };
}
