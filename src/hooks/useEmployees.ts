import { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  login: string;
  password?: string;
  lastLogin?: string;
  lastActive?: number;
  initials: string;
  monthlySalesGoal?: number;
  monthlyVideoGoal?: number;
  avatarUrl?: string;
}

export function useEmployees() {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);

  useEffect(() => {
    // Sincronizar ao vivo com a coleção 'users' do Firestore
    const unsubscribe = onSnapshot(collection(db, 'users'), (snapshot) => {
      const members: TeamMember[] = [];
      snapshot.forEach(docSnap => {
        const data = docSnap.data();
        members.push({
          id: docSnap.id,
          name: data.name || '',
          role: data.role || 'Usuário',
          login: data.login || '',
          password: data.password || '',
          lastActive: data.lastActive || 0,
          lastLogin: data.lastActive ? 'Recentemente' : 'Nunca',
          initials: data.name ? data.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() : 'NU',
          monthlySalesGoal: data.monthlySalesGoal,
          monthlyVideoGoal: data.monthlyVideoGoal,
          avatarUrl: data.avatarUrl
        });
      });
      setTeamMembers(members);
    });

    return () => unsubscribe();
  }, []);

  const updateMember = async (id: string, data: Partial<Omit<TeamMember, 'id'>>) => {
    try {
      await updateDoc(doc(db, 'users', id), {
         ...data
      });
    } catch (e) {
       console.error("Erro update member", e);
    }
  };

  const deleteMember = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'users', id));
    } catch(e) {
       console.error("Erro delete member", e);
    }
  };

  return { teamMembers, updateMember, deleteMember };
}
