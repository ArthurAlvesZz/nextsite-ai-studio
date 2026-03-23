import { useState, useEffect } from 'react';

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
}

const STORAGE_KEY = 'next_creatives_demands';

const DEFAULT_DEMANDS: VideoDemand[] = [
  { 
    id: '1', 
    client: 'Expert Digital', 
    clientId: '5',
    saleId: '#8492',
    title: 'Anúncio Lançamento Março', 
    deadline: '2024-03-25', 
    priority: 'Alta', 
    status: 'Em Produção',
    videoCount: 5,
    niche: 'Infoprodutos',
    type: 'Anúncio VSL',
    description: 'Vídeos curtos para tráfego pago focados em conversão direta.',
    plan: 'Scale',
    createdAt: new Date().toISOString()
  },
  { 
    id: '2', 
    client: 'Tech Elite', 
    clientId: '3',
    saleId: '#8491',
    title: 'Review Teclado Mecânico', 
    deadline: '2024-03-28', 
    priority: 'Média', 
    status: 'Aberto',
    videoCount: 1,
    niche: 'Tecnologia',
    type: 'Review/Unboxing',
    description: 'Review detalhado do novo teclado mecânico RGB.',
    plan: 'Growth',
    createdAt: new Date().toISOString()
  },
  { 
    id: '3', 
    client: 'Fitness Pro', 
    clientId: '6',
    saleId: '#8489',
    title: 'Série Treino em Casa', 
    deadline: '2024-03-30', 
    priority: 'Alta', 
    status: 'Revisão',
    videoCount: 12,
    niche: 'Fitness',
    type: 'Série de Aulas',
    description: '12 vídeos de treinos rápidos para iniciantes.',
    plan: 'Scale',
    createdAt: new Date().toISOString()
  },
  { 
    id: '4', 
    client: 'Luxury Brand', 
    clientId: '4',
    saleId: '#8489',
    title: 'Fashion Film Outono', 
    deadline: '2024-04-05', 
    priority: 'Baixa', 
    status: 'Finalizado',
    videoCount: 1,
    niche: 'Luxo',
    type: 'Cinematográfico',
    description: 'Vídeo conceito para a nova coleção de outono.',
    plan: 'Starter',
    createdAt: new Date().toISOString(),
    finishedAt: new Date().toISOString(),
    revisionCount: 0
  }
];

export function useDemands() {
  const [demands, setDemands] = useState<VideoDemand[]>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : DEFAULT_DEMANDS;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(demands));
  }, [demands]);

  const addDemand = (demand: Omit<VideoDemand, 'id' | 'createdAt'>) => {
    const newDemand: VideoDemand = {
      ...demand,
      id: Math.random().toString(36).substr(2, 9),
      createdAt: new Date().toISOString()
    };
    setDemands(prev => [newDemand, ...prev]);
    return newDemand;
  };

  const updateDemand = (id: string, updates: Partial<VideoDemand>) => {
    setDemands(prev => prev.map(d => {
      if (d.id === id) {
        const updatedDemand = { ...d, ...updates };
        // If status changed to Finalizado and it wasn't before, set finishedAt
        if (updates.status === 'Finalizado' && d.status !== 'Finalizado') {
          updatedDemand.finishedAt = new Date().toISOString();
        }
        return updatedDemand;
      }
      return d;
    }));
  };

  const deleteDemand = (id: string) => {
    setDemands(prev => prev.filter(d => d.id !== id));
  };

  return { demands, addDemand, updateDemand, deleteDemand };
}
