import { useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, onSnapshot, setDoc, collection, query, where, getDocs, addDoc } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';

export interface AdminProfile {
  name: string;
  phone: string;
  avatarUrl: string;
  role?: 'owner' | 'admin' | 'editor' | 'vendedor' | string;
  password?: string;
  email?: string;
  googleLinked?: boolean;
  googleEmail?: string;
  googleUid?: string;
  userId?: string;
  isOwner?: boolean;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [adminProfile, setAdminProfile] = useState<AdminProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        setAdminProfile(null);
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
      let finalProfile: AdminProfile | null = null;
      
      if (docSnap.exists()) {
        const userData = docSnap.data() as AdminProfile;
        finalProfile = {
          ...userData,
          role: userData.role?.toLowerCase() || 'editor'
        };

        // Deep check: Ensure the role from the 'employees' collection 
        // (managed in Settings) overrides the potentially stale 'users' doc role
        try {
          const employeeSnap = await getDocs(query(collection(db, 'employees'), where('userId', '==', user.uid)));
          if (!employeeSnap.empty) {
            const employeeData = employeeSnap.docs[0].data();
            finalProfile.role = employeeData.role?.toLowerCase() || finalProfile.role;
            finalProfile.isOwner = !!employeeData.isOwner;
          }
        } catch (e) {
          console.warn("[Auth] Error syncing role from employees:", e);
        }
        
        setAdminProfile(finalProfile);
      } else {
        // Fallback logic for new users
        let isMaster = user.email === 'arthurfgalves@gmail.com' || user.email === '15599873676@nextcreatives.co';

        const defaultProfile: AdminProfile = {
          name: isMaster ? 'Arthur Fagundes #Owner' : (user.displayName || 'Usuário'),
          phone: isMaster ? '15599873676' : (user.phoneNumber || ''),
          avatarUrl: user.photoURL || '',
          role: isMaster ? 'owner' : 'editor',
          email: user.email || '',
          userId: user.uid,
          isOwner: isMaster
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
                role: 'Owner',
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
      console.error('[Auth] Erro no listener de perfil Firestore:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const updateAdminProfile = async (updates: Partial<AdminProfile>) => {
    if (!user) return;
    const userDocRef = doc(db, 'users', user.uid);
    try {
      const currentProfile = adminProfile || {} as AdminProfile;
      await setDoc(userDocRef, { ...currentProfile, ...updates }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  return { user, adminProfile, loading, updateAdminProfile };
}
