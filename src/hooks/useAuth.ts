import { useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, onSnapshot, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
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

/**
 * Única fonte de verdade para isOwner.
 * Deriva SOMENTE do campo `role` normalizado — ignora qualquer campo
 * `isOwner` bruto do Firestore para evitar escalada de privilégio por
 * dados incorretos.
 */
function deriveIsOwner(role?: string): boolean {
  return role?.toLowerCase() === 'owner';
}

export function useAuth() {
  const [user, setUser]               = useState<User | null>(null);
  const [adminProfile, setAdminProfile] = useState<AdminProfile | null>(null);
  const [loading, setLoading]         = useState(true);

  // ── Listener de autenticação Firebase ──────────────────────────────────────
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

  // ── Listener de perfil Firestore ────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;

    // Previne updates assíncronos após desmonte do componente ou troca de user
    let isMounted = true;

    const userDocRef = doc(db, 'users', user.uid);

    const unsubscribe = onSnapshot(
      userDocRef,
      async (docSnap) => {
        if (!isMounted) return;

        if (docSnap.exists()) {
          const userData = docSnap.data() as AdminProfile;

          // Ponto de partida: normaliza role para lowercase
          let resolvedRole = userData.role?.toLowerCase() || 'editor';

          // Override com a role da coleção `employees` (gerenciada em Settings)
          // Esta é considerada mais confiável que o documento `users`.
          try {
            const employeeSnap = await getDocs(
              query(collection(db, 'employees'), where('userId', '==', user.uid))
            );
            if (!employeeSnap.empty) {
              const employeeData = employeeSnap.docs[0].data();
              resolvedRole = employeeData.role?.toLowerCase() || resolvedRole;
            }
          } catch (e) {
            console.warn('[useAuth] Erro ao sincronizar role de employees:', e);
          }

          if (!isMounted) return; // pode ter desmontado durante o await

          const isOwner = deriveIsOwner(resolvedRole);

          // Log temporário para diagnóstico — remover em produção
          console.log('[useAuth] isOwner:', isOwner, '| role:', resolvedRole, '| uid:', user.uid);

          const finalProfile: AdminProfile = {
            ...userData,
            role: resolvedRole,
            isOwner,
          };

          setAdminProfile(finalProfile);

        } else {
          // Fallback: usuário sem documento em `users/`
          const isMaster =
            user.email === 'arthurfgalves@gmail.com' ||
            user.email === '15599873676@nextcreatives.co';

          const resolvedRole = isMaster ? 'owner' : 'editor';
          const isOwner      = deriveIsOwner(resolvedRole);

          console.log('[useAuth] isOwner (fallback):', isOwner, '| role:', resolvedRole);

          const defaultProfile: AdminProfile = {
            name:     isMaster ? 'Arthur Fagundes #Owner' : (user.displayName || 'Usuário'),
            phone:    isMaster ? '15599873676' : (user.phoneNumber || ''),
            avatarUrl: user.photoURL || '',
            role:     resolvedRole,
            email:    user.email || '',
            userId:   user.uid,
            isOwner,
          };

          if (isMounted) setAdminProfile(defaultProfile);

          // Auto-cria documentos para o owner master se não existirem
          if (isMaster) {
            setDoc(userDocRef, defaultProfile).catch(err =>
              console.warn('[useAuth] Erro ao criar perfil master:', err)
            );

            const employeeDocRef = doc(db, 'employees', user.uid);
            getDocs(query(collection(db, 'employees'), where('userId', '==', user.uid)))
              .then(snap => {
                if (snap.empty) {
                  setDoc(employeeDocRef, {
                    name: 'Arthur Fagundes #Owner',
                    role: 'owner',
                    login: '15599873676',
                    password: '963369',
                    userId: user.uid,
                    lastLogin: new Date().toLocaleString(),
                    initials: 'AF',
                    isOwner: true,
                    createdAt: new Date().toISOString(),
                  }).catch(err => console.warn('[useAuth] Erro ao criar employee owner:', err));
                }
              });
          }
        }

        if (isMounted) setLoading(false);
      },
      (error) => {
        console.error('[useAuth] Erro no listener Firestore:', error);
        if (isMounted) setLoading(false);
      }
    );

    return () => {
      isMounted = false;
      unsubscribe();
    };
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
