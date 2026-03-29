import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { NICHOS, LeadColhido } from '../types/lead';
import { auth, db } from '../firebase';
import AdminSidebar from '../components/AdminSidebar';
import { useAuth } from '../hooks/useAuth';
import { collection, addDoc, query, where, getDocs, deleteDoc, doc, onSnapshot, limit, orderBy } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';

export default function LeadSearch() {
  const [nicho, setNicho] = useState(NICHOS[0]);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<LeadColhido[]>([]);
  const [savedLeadUrls, setSavedLeadUrls] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState('');
  const { adminProfile, user } = useAuth();

  useEffect(() => {
    if (!user) {
      setSavedLeadUrls(new Set());
      return;
    }

    const q = query(
      collection(db, 'leadsColhidos'),
      orderBy('createdAt', 'desc'),
      limit(200)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const urls = new Set(snapshot.docs.map(doc => doc.data().url));
      setSavedLeadUrls(urls);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'leadsColhidos');
    });
    return () => unsubscribe();
  }, [user]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const uid = auth.currentUser?.uid || (adminProfile ? 'admin-master' : null);
    
    if (!uid) {
      setMessage('Erro: Usuário não autenticado.');
      return;
    }

    setLoading(true);
    setMessage('Buscando e qualificando leads... Isso pode levar alguns segundos.');
    setResults([]);

    try {
      const token = await auth.currentUser?.getIdToken();
      const response = await fetch('/api/leads/search', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          nicho,
          uid,
          savedUrls: Array.from(savedLeadUrls)
        })
      });

      const data = await response.json();
      
      if (response.ok) {
        setMessage(data.message || 'Busca concluída.');
        if (data.leads) {
          setResults(data.leads);
          
          // Auto-save new leads to preserve original behavior
          data.leads.forEach(async (lead: LeadColhido) => {
            if (!savedLeadUrls.has(lead.url)) {
              try {
                await addDoc(collection(db, 'leadsColhidos'), {
                  ...lead,
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                  updatedBy: auth.currentUser?.uid
                });
              } catch (error) {
                console.error("Error auto-saving lead:", error);
              }
            }
          });
        }
      } else {
        const errorMsg = data.details ? `${data.error}: ${data.details}` : data.error;
        setMessage(`Erro: ${errorMsg}`);
      }
    } catch (error) {
      console.error('Search error:', error);
      setMessage('Erro ao conectar com o servidor.');
    } finally {
      setLoading(false);
    }
  };

  const toggleSaveLead = async (lead: LeadColhido) => {
    if (!auth.currentUser) return;
    try {
      if (savedLeadUrls.has(lead.url)) {
        // Remove from saved
        const q = query(
          collection(db, 'leadsColhidos'), 
          where('url', '==', lead.url)
        );
        const snapshot = await getDocs(q);
        snapshot.forEach(async (document) => {
          await deleteDoc(doc(db, 'leadsColhidos', document.id));
        });
      } else {
        // Add to saved
        await addDoc(collection(db, 'leadsColhidos'), {
          ...lead,
          status: 'novo',
          userId: auth.currentUser.uid,
          createdAt: new Date().toISOString()
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'leadsColhidos');
    }
  };

  return (
    <div className="font-body text-on-background min-h-screen flex bg-[#050505] overflow-hidden">
      <AdminSidebar activePage="dashboard" />
      
      <main className="flex-1 ml-64 p-8 h-screen overflow-y-auto relative z-10">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-headline font-bold text-white tracking-tight mb-2">Motor de Leads</h1>
              <p className="text-white/50 font-light">Busca, qualificação e enriquecimento automático de leads B2B.</p>
            </div>
            <div className="flex gap-4">
              <button 
                onClick={() => window.location.href = '/admin/leads'}
                className="px-6 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl border border-white/10 transition-all text-xs font-bold uppercase tracking-widest flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-lg">list_alt</span>
                Ver Leads Salvos
              </button>
            </div>
          </div>

          <div className="bg-white/[0.02] border border-white/10 backdrop-blur-xl rounded-2xl p-6 md:p-8">
            <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4 items-end">
              <div className="flex-1 w-full">
                <label className="block text-xs uppercase tracking-widest text-white/40 font-bold mb-3">Selecione o Nicho</label>
                <select 
                  value={nicho}
                  onChange={(e) => setNicho(e.target.value)}
                  className="w-full bg-black/50 border border-white/10 rounded-xl py-4 px-4 text-white focus:ring-2 focus:ring-secondary focus:border-transparent transition-all outline-none appearance-none"
                  disabled={loading}
                >
                  {NICHOS.map(n => (
                    <option key={n} value={n} className="bg-[#0a0a0a]">{n}</option>
                  ))}
                </select>
              </div>
              
              <button 
                type="submit"
                disabled={loading}
                className="w-full md:w-auto px-8 py-4 bg-gradient-to-r from-secondary to-primary text-white font-headline font-bold uppercase tracking-widest rounded-xl hover:scale-[1.02] transition-transform disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <span className="animate-spin h-5 w-5 border-2 border-white/20 border-t-white rounded-full"></span>
                    Processando...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined">radar</span>
                    Iniciar Varredura
                  </>
                )}
              </button>
            </form>

            {message && (
              <div className={`mt-6 p-4 rounded-xl border ${message.includes('Erro') ? 'bg-error/10 border-error/20 text-error' : 'bg-secondary/10 border-secondary/20 text-secondary'} text-sm font-medium`}>
                {message}
              </div>
            )}
          </div>

          {results.length > 0 && (
            <div className="space-y-6">
              <h2 className="text-xl font-headline font-bold text-white">Leads Encontrados ({results.length})</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {results.map((lead, idx) => {
                  const isSaved = savedLeadUrls.has(lead.url);
                  return (
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      key={idx} 
                      className="bg-white/[0.02] border border-white/10 rounded-2xl p-6 flex flex-col h-full group hover:border-secondary/30 transition-all"
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
                            onClick={() => toggleSaveLead(lead)}
                            className={`transition-colors ${isSaved ? 'text-secondary' : 'text-white/20 hover:text-secondary'}`}
                          >
                            <span className="material-symbols-outlined text-lg">
                              {isSaved ? 'bookmark_added' : 'bookmark_add'}
                            </span>
                          </button>
                        </div>
                      </div>

                      <div className="space-y-3 flex-1">
                        <div className="flex flex-wrap gap-2">
                          {lead.temMetaPixel && <span className="px-2 py-1 bg-blue-500/10 text-blue-400 text-[10px] uppercase tracking-wider rounded border border-blue-500/20">Meta Pixel</span>}
                          {lead.temGoogleAds && <span className="px-2 py-1 bg-green-500/10 text-green-400 text-[10px] uppercase tracking-wider rounded border border-green-500/20">Google Ads</span>}
                        </div>

                        <div className="text-sm text-white/60 space-y-1">
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
                          <p className="text-sm text-white/80 italic line-clamp-3" title={lead.abordagemWhatsApp}>
                            "{lead.abordagemWhatsApp}"
                          </p>
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
