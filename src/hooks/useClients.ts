import { useState, useEffect } from 'react';

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

const STORAGE_KEY = 'next_creatives_clients';

const DEFAULT_CLIENTS: Client[] = [
  { 
    id: '1', 
    name: 'João Victor', 
    email: 'joao@example.com', 
    niche: 'E-commerce', 
    document: '123.456.789-00', 
    instagram: '@joaovictor', 
    whatsapp: '(11) 99999-9999', 
    billedAmount: 5000, 
    status: 'Ativo', 
    createdAt: new Date().toISOString() 
  },
  { 
    id: '2', 
    name: 'Maria Silva', 
    email: 'maria@example.com', 
    niche: 'Moda', 
    document: '987.654.321-11', 
    instagram: '@mariasilva', 
    whatsapp: '(11) 88888-8888', 
    billedAmount: 3500, 
    status: 'Ativo', 
    createdAt: new Date().toISOString() 
  },
  { 
    id: '3', 
    name: 'Tech Elite', 
    email: 'contato@techelite.com', 
    niche: 'Tecnologia', 
    document: '12.345.678/0001-99', 
    instagram: '@tech_elite', 
    whatsapp: '(11) 77777-7777', 
    billedAmount: 12000, 
    status: 'Ativo', 
    createdAt: new Date().toISOString() 
  },
  { 
    id: '4', 
    name: 'Luxury Brand', 
    email: 'luxury@brand.com', 
    niche: 'Luxo', 
    document: '44.555.666/0001-77', 
    instagram: '@luxury_brand', 
    whatsapp: '(11) 66666-6666', 
    billedAmount: 25000, 
    status: 'Ativo', 
    createdAt: new Date().toISOString() 
  },
  { 
    id: '5', 
    name: 'Expert Digital', 
    email: 'expert@digital.com', 
    niche: 'Infoprodutos', 
    document: '33.222.111/0001-00', 
    instagram: '@expert_digital', 
    whatsapp: '(11) 55555-5555', 
    billedAmount: 45000, 
    status: 'Ativo', 
    createdAt: new Date().toISOString() 
  },
  { 
    id: '6', 
    name: 'Fitness Pro', 
    email: 'fitness@pro.com', 
    niche: 'Fitness', 
    document: '11.222.333/0001-44', 
    instagram: '@fitness_pro', 
    whatsapp: '(11) 44444-4444', 
    billedAmount: 8000, 
    status: 'Ativo', 
    createdAt: new Date().toISOString() 
  }
];

export function useClients() {
  const [clients, setClients] = useState<Client[]>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : DEFAULT_CLIENTS;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(clients));
  }, [clients]);

  const addClient = (client: Omit<Client, 'id' | 'createdAt'>) => {
    const newClient: Client = {
      ...client,
      id: Math.random().toString(36).substr(2, 9),
      createdAt: new Date().toISOString()
    };
    setClients(prev => [newClient, ...prev]);
    return newClient;
  };

  const deleteClient = (id: string) => {
    setClients(prev => prev.filter(c => c.id !== id));
  };

  const updateClient = (id: string, updates: Partial<Client>) => {
    setClients(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
  };

  return { clients, addClient, deleteClient, updateClient };
}
