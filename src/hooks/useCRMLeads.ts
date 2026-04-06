import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, limit, addDoc, updateDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { useAuth } from './useAuth';

export interface CRMLead {
  id: string;
  businessName: string;
  phone: string;
  leadSource: 'B2B Local' | 'Google Dorks' | string;
  status: 'Novo' | 'Contato Feito' | 'Em Negociação' | 'Convertido';
  createdAt: string;
  userId?: string;
}

export function useCRMLeads() {
  const [leads, setLeads] = useState<CRMLead[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      setLeads([]);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'crm_leads'),
      orderBy('createdAt', 'desc'),
      limit(200)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const leadsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as CRMLead[];
      setLeads(leadsData);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'crm_leads');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const addLead = async (leadData: Omit<CRMLead, 'id' | 'createdAt' | 'userId'>) => {
    if (!user) throw new Error("Usuário não autenticado");

    try {
      const newLeadData = {
        ...leadData,
        createdAt: new Date().toISOString(),
        userId: user.uid
      };
      const docRef = await addDoc(collection(db, 'crm_leads'), newLeadData);
      return { id: docRef.id, ...newLeadData };
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'crm_leads');
      throw error;
    }
  };

  const updateLead = async (id: string, data: Partial<CRMLead>) => {
    try {
      await updateDoc(doc(db, 'crm_leads', id), data);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `crm_leads/${id}`);
      throw error;
    }
  };

  return { leads, addLead, updateLead, loading };
}
