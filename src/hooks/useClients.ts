import { useState, useEffect } from 'react';
import { collection, onSnapshot, addDoc, deleteDoc, doc, updateDoc, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';

export interface Client {
  id: string;
  name: string;
  email: string;
  niche: string;
  document: string;
  instagram: string;
  whatsapp: string;
  billedAmount: number;
  status: 'Ativo' | 'Inativo';
  createdAt: string;
}

export function useClients() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const path = 'clients';
    const q = query(collection(db, path), orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const clientsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Client[];
      setClients(clientsData);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, path);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const addClient = async (client: Omit<Client, 'id' | 'createdAt'>) => {
    const path = 'clients';
    try {
      const docRef = await addDoc(collection(db, path), {
        ...client,
        createdAt: new Date().toISOString()
      });
      return { id: docRef.id, ...client, createdAt: new Date().toISOString() };
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  };

  const deleteClient = async (id: string) => {
    const path = `clients/${id}`;
    try {
      await deleteDoc(doc(db, 'clients', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  };

  const updateClient = async (id: string, updates: Partial<Client>) => {
    const path = `clients/${id}`;
    try {
      await updateDoc(doc(db, 'clients', id), updates);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  };

  return { clients, addClient, deleteClient, updateClient, loading };
}
