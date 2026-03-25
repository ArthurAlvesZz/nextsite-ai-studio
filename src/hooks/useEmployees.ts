import { useState, useEffect } from 'react';
import { collection, onSnapshot, addDoc, deleteDoc, doc, updateDoc, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';

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
}

export function useEmployees() {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'employees'), orderBy('name', 'asc'));
    
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
  }, []);

  const addMember = async (member: Omit<TeamMember, 'id' | 'lastLogin' | 'initials'>) => {
    try {
      const initials = member.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'NU';
      const newMemberData = {
        ...member,
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
