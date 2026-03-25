import { useState, useEffect } from 'react';
import { collection, onSnapshot, addDoc, deleteDoc, doc, updateDoc, query, orderBy, where } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { useAuth } from './useAuth';

export interface VideoDemand {
  id: string;
  client: string;
  clientId: string;
  saleId: string;
  title: string;
  deadline: string;
  priority: 'Baixa' | 'Média' | 'Alta';
  status: 'Aberto' | 'Em Produção' | 'Revisão' | 'Finalizado';
  videoCount: number;
  niche: string;
  type: string;
  description: string;
  plan: 'Starter' | 'Growth' | 'Scale';
  createdAt: string;
  assignedTo?: string;
  assignedToName?: string;
  finishedAt?: string;
  revisionCount?: number;
  userId?: string;
}

export function useDemands() {
  const [demands, setDemands] = useState<VideoDemand[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      setDemands([]);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'demands'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const demandsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as VideoDemand[];
      setDemands(demandsData);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'demands');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const addDemand = async (demand: Omit<VideoDemand, 'id' | 'createdAt'>) => {
    if (!auth.currentUser) throw new Error("Usuário não autenticado");
    try {
      const newDemandData = {
        ...demand,
        userId: auth.currentUser.uid,
        createdAt: new Date().toISOString()
      };
      const docRef = await addDoc(collection(db, 'demands'), newDemandData);
      return { id: docRef.id, ...newDemandData };
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'demands');
      throw error;
    }
  };

  const updateDemand = async (id: string, updates: Partial<VideoDemand>) => {
    try {
      const demandRef = doc(db, 'demands', id);
      const currentDemand = demands.find(d => d.id === id);
      
      const updatedData = { ...updates };
      if (updates.status === 'Finalizado' && currentDemand?.status !== 'Finalizado') {
        updatedData.finishedAt = new Date().toISOString();
      }
      
      await updateDoc(demandRef, updatedData);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `demands/${id}`);
      throw error;
    }
  };

  const deleteDemand = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'demands', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `demands/${id}`);
      throw error;
    }
  };

  return { demands, addDemand, updateDemand, deleteDemand, loading };
}
