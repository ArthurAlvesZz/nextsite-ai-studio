import { useState, useEffect } from 'react';

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
}

export function useSales() {
  const [sales, setSales] = useState<Sale[]>(() => {
    const saved = localStorage.getItem('sales_history');
    if (saved) return JSON.parse(saved);
    return [
      { id: '#8492', date: '22 Mar, 2024', clientId: '1', clientName: 'Tech Solutions', sellerId: '1', sellerName: 'Carlos Mendes', plan: 'Enterprise', value: 15000, status: 'Confirmado', hasDemand: true },
      { id: '#8491', date: '21 Mar, 2024', clientId: '2', clientName: 'Global Media', sellerId: '2', sellerName: 'Ana Souza', plan: 'Pro', value: 8000, status: 'Confirmado', hasDemand: true },
      { id: '#8490', date: '21 Mar, 2024', clientId: '3', clientName: 'Inova Corp', sellerId: '1', sellerName: 'Carlos Mendes', plan: 'Enterprise', value: 12000, status: 'Pendente', hasDemand: false },
      { id: '#8489', date: '20 Mar, 2024', clientId: '4', clientName: 'Studio X', sellerId: '3', sellerName: 'Ricardo Lima', plan: 'Pro', value: 7000, status: 'Confirmado', hasDemand: true },
      { id: '#8488', date: '20 Mar, 2024', clientId: '5', clientName: 'Digital Flow', sellerId: '2', sellerName: 'Ana Souza', plan: 'Starter', value: 3500, status: 'Cancelado', hasDemand: false },
    ];
  });

  useEffect(() => {
    localStorage.setItem('sales_history', JSON.stringify(sales));
  }, [sales]);

  const addSale = (sale: Omit<Sale, 'id' | 'date' | 'status' | 'hasDemand' | 'createdAt'>) => {
    const newSale: Sale = {
      ...sale,
      id: `#${Math.floor(1000 + Math.random() * 9000)}`,
      date: new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }),
      createdAt: new Date().toISOString(),
      status: 'Confirmado',
      hasDemand: false
    };
    setSales(prev => [newSale, ...prev]);
    return newSale;
  };

  const updateSale = (id: string, data: Partial<Sale>) => {
    setSales(prev => prev.map(s => s.id === id ? { ...s, ...data } : s));
  };

  const totalRevenue = sales.reduce((acc, sale) => sale.status === 'Confirmado' ? acc + sale.value : acc, 0);

  return { sales, addSale, updateSale, totalRevenue };
}
