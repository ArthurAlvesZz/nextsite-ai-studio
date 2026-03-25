import { useState, useEffect } from 'react';
import { collection, onSnapshot, addDoc, deleteDoc, doc, updateDoc, query, orderBy, where } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { useAuth } from './useAuth';

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  login: string;
  password?: string;
  lastLogin: string;
  initials: string;
  monthlySalesGoal?: number;
  monthlyVideoGoal?: number;
  userId?: string;
  isOwner?: boolean;
}

export function useEmployees() {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      setTeamMembers([]);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'employees'),
      where('userId', '==', user.uid),
      orderBy('name', 'asc')
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const membersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as TeamMember[];
      setTeamMembers(membersData);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'employees');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const addMember = async (member: Omit<TeamMember, 'id' | 'lastLogin' | 'initials'>) => {
    if (!auth.currentUser) throw new Error("Usuário não autenticado");
    try {
      const initials = member.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'NU';
      const newMemberData = {
        ...member,
        userId: auth.currentUser.uid,
        lastLogin: 'Nunca',
        initials,
        createdAt: new Date().toISOString()
      };
      const docRef = await addDoc(collection(db, 'employees'), newMemberData);
      return { id: docRef.id, ...newMemberData };
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'employees');
      throw error;
    }
  };

  const updateMember = async (id: string, data: Partial<Omit<TeamMember, 'id'>>) => {
    try {
      const updatedData = { ...data };
      if (data.name) {
        updatedData.initials = data.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'NU';
      }
      await updateDoc(doc(db, 'employees', id), updatedData);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `employees/${id}`);
      throw error;
    }
  };

  const deleteMember = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'employees', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `employees/${id}`);
      throw error;
    }
  };

  return { teamMembers, addMember, updateMember, deleteMember, loading };
}
