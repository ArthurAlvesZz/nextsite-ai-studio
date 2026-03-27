import { useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, onSnapshot, setDoc, collection, query, where, getDocs, addDoc } from 'firebase/firestore';
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
    name: 'Arthur Fagundes #Owner',
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
    const unsubscribe = onSnapshot(userDocRef, async (docSnap) => {
      if (docSnap.exists()) {
        setAdminProfile(docSnap.data() as AdminProfile);
      } else {
        // Fallback or default profile if doc doesn't exist
        let isMaster = user.email === 'arthurfgalves@gmail.com' || user.email === '15599873676@nextcreatives.co';
        
        // Check if they are an owner in the employees collection
        if (!isMaster) {
          try {
            const employeeDocRef = doc(db, 'employees', user.uid);
            const employeeSnap = await getDocs(query(collection(db, 'employees'), where('userId', '==', user.uid)));
            if (!employeeSnap.empty) {
              const employeeData = employeeSnap.docs[0].data();
              if (employeeData.isOwner) {
                isMaster = true;
              }
            }
          } catch (e) {
            console.error("Error checking employee owner status:", e);
          }
        }

        const defaultProfile: AdminProfile = {
          name: isMaster ? 'Arthur Fagundes #Owner' : (user.displayName || 'Usuário'),
          phone: isMaster ? '15599873676' : (user.phoneNumber || ''),
          avatarUrl: user.photoURL || '',
          role: isMaster ? 'admin' : 'editor'
        };
        setAdminProfile(defaultProfile);

        // Auto-create profile for master email if it doesn't exist
        if (isMaster) {
          setDoc(userDocRef, defaultProfile).catch(err => {
            console.warn("Could not auto-create master profile:", err);
          });

          // Also ensure they are in the employees collection so they appear in the team list
          const employeeDocRef = doc(db, 'employees', user.uid);
          getDocs(query(collection(db, 'employees'), where('userId', '==', user.uid))).then(snap => {
            if (snap.empty) {
              setDoc(employeeDocRef, {
                name: 'Arthur Fagundes #Owner',
                role: 'Admin',
                login: '15599873676',
                password: '963369',
                userId: user.uid,
                lastLogin: new Date().toLocaleString(),
                initials: 'AF',
                isOwner: true,
                createdAt: new Date().toISOString()
              }).catch(err => console.warn("Error creating owner employee doc:", err));
            }
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
