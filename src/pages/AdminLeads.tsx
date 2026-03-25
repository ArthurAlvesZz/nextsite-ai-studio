import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import AdminSidebar from '../components/AdminSidebar';
import GlobalSearch from '../components/GlobalSearch';
import { collection, onSnapshot, query, orderBy, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { useEffect } from 'react';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';

interface Lead {
  id: string;
  url: string;
  dominio: string;
  nicho: string;
  temMetaPixel: boolean;
  temGoogleAds: boolean;
  whatsapp?: string;
  instagram?: string;
  cnpj?: string;
  razaoSocial?: string;
  logo?: string;
  abordagemWhatsApp?: string;
  createdAt: string;
}

export default function AdminLeads() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNiche, setSelectedNiche] = useState('Todos');

  useEffect(() => {
    const q = query(collection(db, 'leadsColhidos'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const leadsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Lead[];
      setLeads(leadsData);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'leadsColhidos');
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const niches = useMemo(() => {
    const uniqueNiches = Array.from(new Set(leads.map(l => l.nicho)));
    return ['Todos', ...uniqueNiches];
  }, [leads]);

  const filteredLeads = useMemo(() => {
    return leads.filter(lead => {
      const matchesSearch = 
        lead.dominio.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (lead.razaoSocial?.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesNiche = selectedNiche === 'Todos' || lead.nicho === selectedNiche;
      return matchesSearch && matchesNiche;
    });
  }, [leads, searchQuery, selectedNiche]);

  const handleDelete = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este lead?')) {
      try {
        await deleteDoc(doc(db, 'leadsColhidos', id));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `leadsColhidos/${id}`);
      }
    }
  };

  return (
    <div className="flex min-h-screen bg-[#050505] text-white font-body">
      <AdminSidebar activePage="tools" />
      
      <main className="flex-1 p-8 md:p-12 overflow-y-auto">
        <div className="max-w-7xl mx-auto">
          <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
            <div>
              <h1 className="text-4xl font-headline font-bold mb-2">Leads Salvos</h1>
              <p className="text-white/40 font-light">Gerencie e qualifique os leads prospectados pela ferramenta de busca.</p>
            </div>
            <GlobalSearch />
          </header>

          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-4 mb-8">
            <div className="flex-1 relative">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-white/40">search</span>
              <input 
                type="text"
                placeholder="Buscar por domínio ou razão social..."
                className="w-full bg-white/[0.02] border border-white/10 rounded-xl py-3 pl-12 pr-4 focus:border-secondary transition-all outline-none"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <select 
              className="bg-white/[0.02] border border-white/10 rounded-xl py-3 px-4 focus:border-secondary transition-all outline-none"
              value={selectedNiche}
              onChange={(e) => setSelectedNiche(e.target.value)}
            >
              {niches.map(niche => (
                <option key={niche} value={niche} className="bg-[#0a0a0a]">{niche}</option>
              ))}
            </select>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-10 h-10 border-4 border-secondary/20 border-t-secondary rounded-full animate-spin"></div>
            </div>
          ) : filteredLeads.length === 0 ? (
            <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-20 text-center">
              <span className="material-symbols-outlined text-6xl text-white/10 mb-4">person_search</span>
              <h3 className="text-xl font-bold mb-2">Nenhum lead encontrado</h3>
              <p className="text-white/40">Use a ferramenta de busca para prospectar novos leads.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <AnimatePresence mode="popLayout">
                {filteredLeads.map((lead) => (
                  <motion.div 
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    key={lead.id} 
                    className="bg-white/[0.02] border border-white/10 rounded-2xl p-6 flex flex-col group hover:border-secondary/30 transition-all"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        {lead.logo ? (
                          <img src={lead.logo} alt="Logo" className="w-10 h-10 rounded-lg object-contain bg-white/5" referrerPolicy="no-referrer" />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center">
                            <span className="material-symbols-outlined text-white/40">domain</span>
                          </div>
                        )}
                        <div>
                          <h3 className="text-white font-bold truncate max-w-[150px]" title={lead.razaoSocial || lead.dominio}>
                            {lead.razaoSocial || lead.dominio}
                          </h3>
                          <p className="text-white/40 text-xs">{lead.nicho}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <a href={lead.url} target="_blank" rel="noopener noreferrer" className="text-white/40 hover:text-secondary transition-colors">
                          <span className="material-symbols-outlined text-lg">open_in_new</span>
                        </a>
                        <button 
                          onClick={() => handleDelete(lead.id)}
                          className="text-white/20 hover:text-error transition-colors"
                        >
                          <span className="material-symbols-outlined text-lg">delete</span>
                        </button>
                      </div>
                    </div>

                    <div className="space-y-3 flex-1">
                      <div className="flex flex-wrap gap-2">
                        {lead.temMetaPixel && <span className="px-2 py-1 bg-blue-500/10 text-blue-400 text-[10px] uppercase tracking-wider rounded border border-blue-500/20">Meta Pixel</span>}
                        {lead.temGoogleAds && <span className="px-2 py-1 bg-green-500/10 text-green-400 text-[10px] uppercase tracking-wider rounded border border-green-500/20">Google Ads</span>}
                      </div>

                      <div className="text-sm text-white/60 space-y-2">
                        {lead.whatsapp && (
                          <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-[16px] text-secondary">chat</span>
                            <a href={`https://wa.me/${lead.whatsapp}`} target="_blank" rel="noopener noreferrer" className="hover:text-secondary">{lead.whatsapp}</a>
                          </div>
                        )}
                        {lead.instagram && (
                          <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-[16px] text-secondary">photo_camera</span>
                            <a href={lead.instagram} target="_blank" rel="noopener noreferrer" className="hover:text-secondary truncate">Instagram</a>
                          </div>
                        )}
                        {lead.cnpj && (
                          <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-[16px] text-secondary">receipt_long</span>
                            <span>{lead.cnpj}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {lead.abordagemWhatsApp && (
                      <div className="mt-4 pt-4 border-t border-white/10">
                        <p className="text-xs text-white/40 mb-2 uppercase tracking-widest font-bold">Sugestão de Abordagem</p>
                        <p className="text-sm text-white/80 italic line-clamp-2">
                          "{lead.abordagemWhatsApp}"
                        </p>
                      </div>
                    )}

                    <div className="mt-6">
                      <button className="w-full py-2 bg-secondary/10 hover:bg-secondary text-secondary hover:text-on-secondary rounded-xl border border-secondary/20 transition-all text-xs font-bold uppercase tracking-widest">
                        Iniciar Contato
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
