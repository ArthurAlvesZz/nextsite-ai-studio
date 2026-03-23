import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSales, Sale } from '../hooks/useSales';
import { useClients, Client } from '../hooks/useClients';
import { useEmployees, TeamMember } from '../hooks/useEmployees';
import { motion, AnimatePresence } from 'motion/react';

type SearchResult = 
  | { type: 'sale'; data: Sale; score: number }
  | { type: 'client'; data: Client; score: number }
  | { type: 'seller'; data: TeamMember; score: number };

export default function GlobalSearch() {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const { sales } = useSales();
  const { clients } = useClients();
  const { teamMembers } = useEmployees();

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const results = useMemo(() => {
    if (!query.trim()) return [];

    const q = query.toLowerCase();
    const searchResults: SearchResult[] = [];

    // Search Sales
    sales.forEach(sale => {
      let score = 0;
      if (sale.id.toLowerCase().includes(q)) score += 100;
      if (sale.clientName.toLowerCase().includes(q)) score += 50;
      if (sale.sellerName.toLowerCase().includes(q)) score += 30;
      if (sale.plan.toLowerCase().includes(q)) score += 20;
      
      if (score > 0) searchResults.push({ type: 'sale', data: sale, score });
    });

    // Search Clients
    clients.forEach(client => {
      let score = 0;
      if (client.name.toLowerCase().includes(q)) score += 80;
      if (client.email.toLowerCase().includes(q)) score += 40;
      if (client.niche.toLowerCase().includes(q)) score += 20;
      
      if (score > 0) searchResults.push({ type: 'client', data: client, score });
    });

    // Search Sellers
    teamMembers.forEach(member => {
      let score = 0;
      if (member.name.toLowerCase().includes(q)) score += 90;
      if (member.role.toLowerCase().includes(q)) score += 30;
      
      if (score > 0) searchResults.push({ type: 'seller', data: member, score });
    });

    return searchResults.sort((a, b) => b.score - a.score).slice(0, 8);
  }, [query, sales, clients, teamMembers]);

  const handleSelect = (result: SearchResult) => {
    setIsOpen(false);
    setQuery('');

    if (result.type === 'sale') {
      setSelectedSale(result.data);
    } else if (result.type === 'client') {
      navigate(`/admin/clients?id=${result.data.id}`);
    } else if (result.type === 'seller') {
      navigate(`/admin/team/${result.data.id}`);
    }
  };



  return (
    <div className="relative w-96" ref={dropdownRef}>
      <div className="relative group">
        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-secondary transition-colors">search</span>
        <input 
          className="w-full bg-white/[0.03] border border-white/10 rounded-full py-3 pl-12 pr-4 text-sm focus:ring-1 focus:ring-secondary/50 focus:border-secondary/50 transition-all text-white placeholder:text-white/20 font-light" 
          placeholder="Buscar vendas, clientes ou vendedores..." 
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
        />
      </div>

      {/* Dropdown Results */}
      <AnimatePresence>
        {isOpen && results.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute top-full left-0 right-0 mt-2 bg-[#0A0A0A] border border-white/10 rounded-2xl overflow-hidden z-50 shadow-2xl backdrop-blur-xl"
          >
            <div className="max-h-[400px] overflow-y-auto py-2">
              {results.map((result, idx) => (
                <button
                  key={`${result.type}-${idx}`}
                  onClick={() => handleSelect(result)}
                  className="w-full px-4 py-3 flex items-center gap-4 hover:bg-white/5 transition-colors text-left border-b border-white/5 last:border-0"
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    result.type === 'sale' ? 'bg-secondary/10 text-secondary' :
                    result.type === 'client' ? 'bg-primary/10 text-primary' :
                    'bg-emerald-500/10 text-emerald-500'
                  }`}>
                    <span className="material-symbols-outlined">
                      {result.type === 'sale' ? 'receipt_long' :
                       result.type === 'client' ? 'person' :
                       'badge'}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                      <p className="text-sm font-bold text-white truncate">
                        {result.type === 'sale' ? result.data.clientName : result.data.name}
                      </p>
                      <span className="text-[10px] uppercase tracking-widest text-white/30 font-bold">
                        {result.type === 'sale' ? 'Venda' :
                         result.type === 'client' ? 'Cliente' :
                         'Vendedor'}
                      </span>
                    </div>
                    <p className="text-xs text-white/40 truncate">
                      {result.type === 'sale' ? `${result.data.id} • R$ ${result.data.value.toLocaleString('pt-BR')}` :
                       result.type === 'client' ? result.data.email :
                       result.data.role}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sale Details Modal */}
      <AnimatePresence>
        {selectedSale && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#0A0A0A] border border-white/10 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl"
            >
              <div className="p-8 space-y-6">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <p className="text-secondary text-[10px] font-bold uppercase tracking-[0.2em]">Detalhes da Venda</p>
                    <h3 className="text-2xl font-headline font-bold text-white">{selectedSale.id}</h3>
                  </div>
                  <button onClick={() => setSelectedSale(null)} className="text-white/20 hover:text-white transition-colors">
                    <span className="material-symbols-outlined">close</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <p className="text-white/30 text-[10px] uppercase font-bold tracking-widest">Cliente</p>
                    <p className="text-white font-medium">{selectedSale.clientName}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-white/30 text-[10px] uppercase font-bold tracking-widest">Vendedor</p>
                    <p className="text-white font-medium">{selectedSale.sellerName}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-white/30 text-[10px] uppercase font-bold tracking-widest">Plano</p>
                    <p className="text-white font-medium">{selectedSale.plan}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-white/30 text-[10px] uppercase font-bold tracking-widest">Valor</p>
                    <p className="text-secondary font-bold">R$ {selectedSale.value.toLocaleString('pt-BR')}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-white/30 text-[10px] uppercase font-bold tracking-widest">Data</p>
                    <p className="text-white font-medium">{selectedSale.date}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-white/30 text-[10px] uppercase font-bold tracking-widest">Status</p>
                    <div className="flex items-center gap-2">
                      <div className={`w-1.5 h-1.5 rounded-full bg-current ${
                        selectedSale.status === 'Confirmado' ? 'text-emerald-400' : 'text-orange-400'
                      }`}></div>
                      <p className={`text-sm font-bold ${
                        selectedSale.status === 'Confirmado' ? 'text-emerald-400' : 'text-orange-400'
                      }`}>{selectedSale.status}</p>
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-white/5">
                  <button 
                    onClick={() => setSelectedSale(null)}
                    className="w-full py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-white font-bold transition-all"
                  >
                    Fechar
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
