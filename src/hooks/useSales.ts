import { useState, useEffect } from 'react';
import { collection, onSnapshot, addDoc, doc, updateDoc, query, orderBy, where } from 'firebase/firestore';
import { db } from '../firebase';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { useAuth } from './useAuth';

export interface Sale {
  id: string;
  date: string;
  clientId: string;
  clientName: string;
  sellerId: string;
  sellerName: string;
  plan: string;
  value: number;
  status: 'Confirmado' | 'Pendente' | 'Cancelado';
  pixReceipt?: string;
  hasDemand?: boolean;
  createdAt?: string;
  userId?: string;
}

export function useSales() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      setSales([]);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'sales'), 
      orderBy('createdAt', 'desc')
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const salesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Sale[];
      setSales(salesData);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'sales');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const addSale = async (sale: Omit<Sale, 'id' | 'date' | 'status' | 'hasDemand' | 'createdAt' | 'userId'>) => {
    if (!user) throw new Error("Usuário não autenticado");
    
    try {
      const newSaleData = {
        ...sale,
        date: new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }),
        createdAt: new Date().toISOString(),
        status: 'Confirmado',
        hasDemand: false,
        userId: user.uid
      };
      const docRef = await addDoc(collection(db, 'sales'), newSaleData);
      return { id: docRef.id, ...newSaleData };
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'sales');
      throw error;
    }
  };

  const updateSale = async (id: string, data: Partial<Sale>) => {
    try {
      await updateDoc(doc(db, 'sales', id), data);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `sales/${id}`);
      throw error;
    }
  };

  const totalRevenue = sales.reduce((acc, sale) => sale.status === 'Confirmado' ? acc + sale.value : acc, 0);

  return { sales, addSale, updateSale, totalRevenue, loading };
}
