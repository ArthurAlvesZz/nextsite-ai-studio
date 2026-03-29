import React, { useState, useEffect, useMemo } from 'react';
import AdminSidebar from '../components/AdminSidebar';
import GlobalSearch from '../components/GlobalSearch';
import { motion, AnimatePresence } from 'motion/react';
import { collection, onSnapshot, query, orderBy, updateDoc, doc, addDoc, Timestamp, deleteDoc, serverTimestamp, limit } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { useAuth } from '../hooks/useAuth';
import { LeadColhido, LeadStatus, NICHOS } from '../types/lead';

export default function AdminCRM() {
  const [leads, setLeads] = useState<LeadColhido[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewLeadModal, setShowNewLeadModal] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [whatsappStatus, setWhatsappStatus] = useState<'disconnected' | 'connecting' | 'qr' | 'authenticated' | 'ready'>('disconnected');
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [customMessage, setCustomMessage] = useState('');
  const [editingLead, setEditingLead] = useState<LeadColhido | null>(null);
  const [viewingLead, setViewingLead] = useState<LeadColhido | null>(null);
  const [newLead, setNewLead] = useState<Partial<LeadColhido>>({
    razaoSocial: '',
    nicho: NICHOS[0],
    whatsapp: '',
    status: 'novo'
  });
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      setLeads([]);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'leadsColhidos'),
      orderBy('createdAt', 'desc'),
      limit(200)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const leadsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as LeadColhido[];
      setLeads(leadsData);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'leadsColhidos');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const columns: { id: LeadStatus; title: string; color: string }[] = [
    { id: 'novo', title: 'Novos Leads', color: 'text-white' },
    { id: 'contatado', title: 'Contatados', color: 'text-blue-400' },
    { id: 'negociacao', title: 'Em Negociação', color: 'text-amber-400' },
    { id: 'fechado', title: 'Fechados', color: 'text-emerald-400' }
  ];

  const leadsByStatus = useMemo(() => {
    const grouped: Record<LeadStatus, LeadColhido[]> = {
      novo: [],
      contatado: [],
      negociacao: [],
      fechado: []
    };
    leads.forEach(lead => {
      const status = lead.status || 'novo';
      if (grouped[status]) {
        grouped[status].push(lead);
      } else {
        grouped.novo.push(lead);
      }
    });
    return grouped;
  }, [leads]);

  const handleUpdateStatus = async (leadId: string, newStatus: LeadStatus) => {
    try {
      await updateDoc(doc(db, 'leadsColhidos', leadId), {
        status: newStatus,
        updatedAt: new Date().toISOString(),
        updatedBy: user?.uid
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `leadsColhidos/${leadId}`);
    }
  };

  const handleEditLead = (lead: LeadColhido) => {
    setEditingLead(lead);
    setNewLead({
      razaoSocial: lead.razaoSocial || '',
      nicho: lead.nicho || NICHOS[0],
      whatsapp: lead.whatsapp || '',
      status: lead.status || 'novo'
    });
    setIsEditModalOpen(true);
  };

  const handleViewDetails = (lead: LeadColhido) => {
    setViewingLead(lead);
    setCustomMessage(lead.abordagemWhatsApp || '');
    setIsDetailsModalOpen(true);
  };

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const res = await fetch('/api/whatsapp/status');
        if (res.ok) {
          const data = await res.json();
          setWhatsappStatus(data.status);
        }
      } catch (e) {
        console.warn("Error checking WhatsApp status in CRM");
      }
    };

    checkStatus();
    const interval = setInterval(checkStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleSendWhatsAppMessage = async () => {
    if (!viewingLead?.whatsapp || !customMessage) return;
    
    setIsSendingMessage(true);
    try {
      const response = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: viewingLead.whatsapp,
          message: customMessage
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao enviar mensagem.');
      }

      alert('Mensagem enviada com sucesso!');
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      alert(error instanceof Error ? error.message : 'Falha ao enviar mensagem.');
    } finally {
      setIsSendingMessage(false);
    }
  };

  const handleUpdateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLead?.id || !user) return;

    try {
      await updateDoc(doc(db, 'leadsColhidos', editingLead.id), {
        ...newLead,
        updatedAt: new Date().toISOString(),
        updatedBy: user.uid
      });
      setIsEditModalOpen(false);
      setEditingLead(null);
      setNewLead({ razaoSocial: '', nicho: NICHOS[0], whatsapp: '', status: 'novo' });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `leadsColhidos/${editingLead.id}`);
    }
  };

  const handleDeleteLead = async (leadId: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este lead?')) return;
    try {
      await deleteDoc(doc(db, 'leadsColhidos', leadId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `leadsColhidos/${leadId}`);
    }
  };

  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      await addDoc(collection(db, 'leadsColhidos'), {
        ...newLead,
        dominio: newLead.razaoSocial?.toLowerCase().replace(/\s+/g, '') + '.com',
        url: 'https://' + newLead.razaoSocial?.toLowerCase().replace(/\s+/g, '') + '.com',
        temMetaPixel: false,
        temGoogleAds: false,
        gruposWhatsApp: [],
        createdAt: new Date().toISOString(),
        createdBy: user.uid,
        status: newLead.status || 'novo'
      });
      setShowNewLeadModal(false);
      setNewLead({ razaoSocial: '', nicho: NICHOS[0], whatsapp: '', status: 'novo' });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'leadsColhidos');
    }
  };

  return (
    <div className="font-body text-on-background min-h-screen flex bg-[#050505] overflow-hidden selection:bg-primary/30">
      <div className="fixed inset-0 w-full h-full -z-10 bg-[#050505] overflow-hidden">
        <div className="absolute inset-0 w-full h-full opacity-1 bg-gradient-to-b from-[#020202] to-transparent">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(0,102,255,0.05),transparent_60%)]"></div>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(153,0,255,0.05),transparent_40%)]"></div>
        </div>
      </div>

      <AdminSidebar activePage="dashboard" />

      <main className="ml-64 flex-1 min-h-screen relative flex flex-col">
        <header className="w-full h-24 z-40 bg-[#050505]/80 backdrop-blur-2xl border-b border-white/10 flex justify-between items-center px-10 shrink-0">
          <GlobalSearch />
          <div className="flex items-center gap-6">
            <button className="relative text-white/60 hover:text-white transition-colors">
              <span className="material-symbols-outlined">notifications</span>
            </button>
            <div className="h-8 w-[1px] bg-white/10"></div>
            <button 
              onClick={() => setShowNewLeadModal(true)}
              className="bg-gradient-to-r from-secondary to-primary text-on-secondary px-6 py-2.5 rounded-full text-xs font-headline font-bold uppercase tracking-widest transition-all active:scale-95 flex items-center gap-2 shadow-[0_0_20px_rgba(233,179,255,0.2)] hover:shadow-[0_0_30px_rgba(233,179,255,0.4)]"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              <span>Novo Lead</span>
            </button>
          </div>
        </header>

        <div className="flex-1 p-10 overflow-hidden flex flex-col">
          <div className="flex justify-between items-end mb-8 shrink-0">
            <div>
              <h2 className="text-4xl md:text-5xl font-headline font-extrabold tracking-tighter text-white mb-3">
                CRM & Leads
              </h2>
              <p className="text-white/50 text-lg max-w-2xl font-light leading-relaxed">
                Acompanhe o funil de vendas, gerencie negociações e interaja com seus contatos.
              </p>
            </div>
          </div>

          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
            </div>
          ) : (
            <div className="flex-1 overflow-x-auto pb-4">
              <div className="flex gap-6 h-full min-w-max">
                {columns.map(column => (
                  <div key={column.id} className="w-80 flex flex-col bg-white/[0.02] border border-white/5 rounded-2xl p-4">
                    <div className="flex items-center justify-between mb-4 px-2">
                      <h3 className={`text-sm font-bold uppercase tracking-widest ${column.color}`}>{column.title}</h3>
                      <span className="bg-white/10 text-white text-xs px-2 py-0.5 rounded-full">
                        {leadsByStatus[column.id].length}
                      </span>
                    </div>
                    <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                      {leadsByStatus[column.id].length === 0 ? (
                        <div className="p-6 border border-dashed border-white/10 rounded-xl text-center text-white/30 text-xs">
                          Nenhum lead nesta etapa
                        </div>
                      ) : (
                        leadsByStatus[column.id].map(lead => (
                          <LeadCard 
                            key={lead.id} 
                            lead={lead} 
                            onUpdateStatus={(status) => handleUpdateStatus(lead.id!, status)} 
                            onEdit={() => handleEditLead(lead)}
                            onDelete={() => handleDeleteLead(lead.id!)}
                            onView={() => handleViewDetails(lead)}
                          />
                        ))
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Modal Novo/Editar Lead */}
      <AnimatePresence>
        {(showNewLeadModal || isEditModalOpen) && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { setShowNewLeadModal(false); setIsEditModalOpen(false); }}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-[#0a0a0a] border border-white/10 rounded-3xl p-8 shadow-2xl overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-secondary to-primary"></div>
              
              <h3 className="text-2xl font-headline font-bold text-white mb-6">
                {isEditModalOpen ? 'Editar Lead' : 'Cadastrar Novo Lead'}
              </h3>
              
              <form onSubmit={isEditModalOpen ? handleUpdateLead : handleCreateLead} className="space-y-6">
                <div>
                  <label className="block text-xs uppercase tracking-widest text-white/40 font-bold mb-2">Nome / Razão Social</label>
                  <input 
                    type="text" 
                    required
                    value={newLead.razaoSocial}
                    onChange={(e) => setNewLead({...newLead, razaoSocial: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white focus:border-secondary outline-none transition-all"
                    placeholder="Ex: Pizzaria do João"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs uppercase tracking-widest text-white/40 font-bold mb-2">Nicho</label>
                    <select 
                      value={newLead.nicho}
                      onChange={(e) => setNewLead({...newLead, nicho: e.target.value})}
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white focus:border-secondary outline-none transition-all appearance-none"
                    >
                      {NICHOS.map(n => <option key={n} value={n} className="bg-black">{n}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs uppercase tracking-widest text-white/40 font-bold mb-2">WhatsApp</label>
                    <input 
                      type="text" 
                      value={newLead.whatsapp || ''}
                      onChange={(e) => setNewLead({...newLead, whatsapp: e.target.value})}
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white focus:border-secondary outline-none transition-all"
                      placeholder="5511999999999"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-widest text-white/40 font-bold mb-2">Status</label>
                  <div className="grid grid-cols-2 gap-2">
                    {columns.map(col => (
                      <button
                        key={col.id}
                        type="button"
                        onClick={() => setNewLead({...newLead, status: col.id})}
                        className={`py-2 px-4 rounded-xl text-xs font-bold uppercase tracking-widest border transition-all ${
                          newLead.status === col.id 
                            ? 'bg-secondary/20 border-secondary text-secondary' 
                            : 'bg-white/5 border-white/10 text-white/40 hover:border-white/20'
                        }`}
                      >
                        {col.title}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button 
                    type="button"
                    onClick={() => { setShowNewLeadModal(false); setIsEditModalOpen(false); }}
                    className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl font-bold uppercase tracking-widest text-xs transition-all"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 py-3 bg-gradient-to-r from-secondary to-primary text-white rounded-xl font-bold uppercase tracking-widest text-xs shadow-lg shadow-primary/20 transition-all active:scale-95"
                  >
                    {isEditModalOpen ? 'Atualizar Lead' : 'Salvar Lead'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal Detalhes do Lead */}
      <AnimatePresence>
        {isDetailsModalOpen && viewingLead && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDetailsModalOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-[#0a0a0a] border border-white/10 rounded-3xl p-8 shadow-2xl overflow-y-auto max-h-[90vh]"
            >
              <div className="flex justify-between items-start mb-8">
                <div className="flex items-center gap-4">
                  {viewingLead.logo ? (
                    <img src={viewingLead.logo} alt="" className="w-16 h-16 rounded-2xl object-contain bg-white/5 p-2" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center">
                      <span className="material-symbols-outlined text-white/20 text-3xl">domain</span>
                    </div>
                  )}
                  <div>
                    <h3 className="text-2xl font-headline font-bold text-white">{viewingLead.razaoSocial || viewingLead.dominio}</h3>
                    <p className="text-secondary text-sm font-bold uppercase tracking-widest">{viewingLead.nicho}</p>
                  </div>
                </div>
                <button onClick={() => setIsDetailsModalOpen(false)} className="text-white/20 hover:text-white transition-colors">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div>
                    <h4 className="text-[10px] uppercase tracking-widest text-white/30 font-bold mb-3">Informações de Contato</h4>
                    <div className="space-y-3">
                      {viewingLead.whatsapp && (
                        <div className="flex items-center gap-3 text-white/70">
                          <span className="material-symbols-outlined text-secondary text-lg">chat</span>
                          <a href={`https://wa.me/${viewingLead.whatsapp}`} target="_blank" rel="noopener noreferrer" className="hover:text-secondary transition-colors">
                            {viewingLead.whatsapp}
                          </a>
                        </div>
                      )}
                      {viewingLead.instagram && (
                        <div className="flex items-center gap-3 text-white/70">
                          <span className="material-symbols-outlined text-secondary text-lg">photo_camera</span>
                          <a href={viewingLead.instagram} target="_blank" rel="noopener noreferrer" className="hover:text-secondary transition-colors truncate">
                            Instagram
                          </a>
                        </div>
                      )}
                      <div className="flex items-center gap-3 text-white/70">
                        <span className="material-symbols-outlined text-secondary text-lg">public</span>
                        <a href={viewingLead.url} target="_blank" rel="noopener noreferrer" className="hover:text-secondary transition-colors truncate">
                          {viewingLead.dominio}
                        </a>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-[10px] uppercase tracking-widest text-white/30 font-bold mb-3">Dados da Empresa</h4>
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between py-2 border-b border-white/5">
                        <span className="text-white/40">CNPJ</span>
                        <span className="text-white font-medium">{viewingLead.cnpj || 'Não informado'}</span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-white/5">
                        <span className="text-white/40">Capital Social</span>
                        <span className="text-white font-medium">
                          {viewingLead.capitalSocial ? `R$ ${viewingLead.capitalSocial.toLocaleString()}` : 'Não informado'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div>
                    <h4 className="text-[10px] uppercase tracking-widest text-white/30 font-bold mb-3">Tecnologias & Marketing</h4>
                    <div className="flex flex-wrap gap-2">
                      <div className={`px-3 py-1.5 rounded-lg border flex items-center gap-2 ${viewingLead.temMetaPixel ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' : 'bg-white/5 border-white/10 text-white/20'}`}>
                        <span className="material-symbols-outlined text-sm">{viewingLead.temMetaPixel ? 'check_circle' : 'cancel'}</span>
                        <span className="text-[10px] font-bold uppercase tracking-widest">Meta Pixel</span>
                      </div>
                      <div className={`px-3 py-1.5 rounded-lg border flex items-center gap-2 ${viewingLead.temGoogleAds ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-white/5 border-white/10 text-white/20'}`}>
                        <span className="material-symbols-outlined text-sm">{viewingLead.temGoogleAds ? 'check_circle' : 'cancel'}</span>
                        <span className="text-[10px] font-bold uppercase tracking-widest">Google Ads</span>
                      </div>
                    </div>
                  </div>

                  {viewingLead.abordagemWhatsApp && (
                    <div>
                      <h4 className="text-[10px] uppercase tracking-widest text-white/30 font-bold mb-3">Sugestão de Abordagem</h4>
                      <div className="bg-white/5 border border-white/10 p-4 rounded-2xl italic text-sm text-white/80 leading-relaxed mb-4">
                        "{viewingLead.abordagemWhatsApp}"
                      </div>
                      
                      <div className="space-y-3">
                        <textarea
                          value={customMessage}
                          onChange={(e) => setCustomMessage(e.target.value)}
                          className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-white focus:border-secondary transition-all outline-none min-h-[100px]"
                          placeholder="Digite sua mensagem personalizada..."
                        />
                        <button
                          onClick={handleSendWhatsAppMessage}
                          disabled={isSendingMessage || !customMessage || whatsappStatus !== 'ready'}
                          className="w-full py-3 bg-secondary text-on-secondary rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                          {isSendingMessage ? (
                            <div className="w-4 h-4 border-2 border-on-secondary/30 border-t-on-secondary rounded-full animate-spin" />
                          ) : (
                            <span className="material-symbols-outlined text-sm">send</span>
                          )}
                          {whatsappStatus === 'ready' ? 'Enviar via WhatsApp Web' : 'WhatsApp Desconectado'}
                        </button>
                        {whatsappStatus !== 'ready' && (
                          <p className="text-[10px] text-red-400 text-center font-bold uppercase tracking-widest">
                            Conecte o WhatsApp no Perfil para enviar mensagens
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-10 pt-6 border-t border-white/10 flex justify-between items-center">
                <div className="text-[10px] text-white/20 uppercase tracking-widest">
                  Adicionado em: {new Date(viewingLead.createdAt).toLocaleString()}
                </div>
                <div className="flex gap-4">
                  <button 
                    onClick={() => {
                      if (viewingLead.id) {
                        handleDeleteLead(viewingLead.id);
                        setIsDetailsModalOpen(false);
                      }
                    }}
                    className="px-6 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all"
                  >
                    Excluir
                  </button>
                  <button 
                    onClick={() => {
                      setIsDetailsModalOpen(false);
                      handleEditLead(viewingLead);
                    }}
                    className="px-6 py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all"
                  >
                    Editar
                  </button>
                  <button 
                    onClick={() => {
                      if (viewingLead.whatsapp) {
                        window.open(`https://wa.me/${viewingLead.whatsapp}`, '_blank');
                      }
                    }}
                    className="px-6 py-2 bg-secondary text-on-secondary rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all"
                  >
                    Iniciar Contato
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

function LeadCard({ 
  lead, 
  onUpdateStatus, 
  onEdit, 
  onDelete,
  onView
}: { 
  lead: LeadColhido; 
  onUpdateStatus: (status: LeadStatus) => any;
  onEdit: () => any;
  onDelete: () => any;
  onView: () => any;
  key?: any;
}) {
  const [showActions, setShowActions] = useState(false);

  const statuses: { id: LeadStatus; label: string; icon: string }[] = [
    { id: 'novo', label: 'Novo', icon: 'fiber_new' },
    { id: 'contatado', label: 'Contatado', icon: 'chat' },
    { id: 'negociacao', label: 'Negociação', icon: 'handshake' },
    { id: 'fechado', label: 'Fechado', icon: 'verified' }
  ];

  return (
    <motion.div 
      layout
      className="bg-white/[0.03] border border-white/10 rounded-xl p-4 hover:border-white/20 transition-all group relative"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          {lead.logo ? (
            <img src={lead.logo} alt="" className="w-8 h-8 rounded-lg object-contain bg-white/5" referrerPolicy="no-referrer" />
          ) : (
            <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
              <span className="material-symbols-outlined text-white/20 text-sm">domain</span>
            </div>
          )}
          <div>
            <h4 className="text-white font-bold text-sm truncate max-w-[140px]" title={lead.razaoSocial || lead.dominio}>
              {lead.razaoSocial || lead.dominio}
            </h4>
            <p className="text-white/30 text-[10px] uppercase tracking-widest">{lead.nicho}</p>
          </div>
        </div>
        <button 
          onClick={() => setShowActions(!showActions)}
          className="text-white/20 hover:text-white transition-colors"
        >
          <span className="material-symbols-outlined text-lg">more_vert</span>
        </button>
      </div>

      <div className="space-y-2 mb-4">
        {lead.whatsapp && (
          <div className="flex items-center gap-2 text-xs text-white/50">
            <span className="material-symbols-outlined text-[14px] text-secondary">chat</span>
            <span className="truncate">{lead.whatsapp}</span>
          </div>
        )}
        <div className="flex flex-wrap gap-1">
          {lead.temMetaPixel && <span className="px-1.5 py-0.5 bg-blue-500/10 text-blue-400 text-[8px] uppercase tracking-wider rounded border border-blue-500/10">Pixel</span>}
          {lead.temGoogleAds && <span className="px-1.5 py-0.5 bg-green-500/10 text-green-400 text-[8px] uppercase tracking-wider rounded border border-green-500/10">Ads</span>}
        </div>
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-white/5">
        <div className="text-[9px] text-white/20 uppercase tracking-widest">
          {new Date(lead.createdAt).toLocaleDateString()}
        </div>
        <div className="flex gap-1">
          {lead.whatsapp && (
            <a 
              href={`https://wa.me/${lead.whatsapp}`} 
              target="_blank" 
              rel="noopener noreferrer"
              className="w-7 h-7 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center hover:bg-emerald-500 hover:text-white transition-all"
            >
              <span className="material-symbols-outlined text-sm">chat</span>
            </a>
          )}
          <button 
            onClick={onView}
            className="w-7 h-7 rounded-full bg-white/5 text-white/40 flex items-center justify-center hover:bg-white/10 transition-all"
          >
            <span className="material-symbols-outlined text-sm">visibility</span>
          </button>
        </div>
      </div>

      {/* Menu de Ações / Mudar Status */}
      <AnimatePresence>
        {showActions && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setShowActions(false)} />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              className="absolute top-12 right-0 z-20 w-48 bg-[#111] border border-white/10 rounded-xl shadow-2xl p-2"
            >
              <p className="text-[10px] uppercase tracking-widest text-white/30 font-bold px-3 py-2">Ações:</p>
              <button
                onClick={() => {
                  onEdit();
                  setShowActions(false);
                }}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs text-white/70 hover:bg-white/10 hover:text-white transition-all"
              >
                <span className="material-symbols-outlined text-sm">edit</span>
                <span>Editar Lead</span>
              </button>
              <button 
                onClick={() => {
                  onDelete();
                  setShowActions(false);
                }}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs text-error/60 hover:bg-error/10 hover:text-error transition-all"
              >
                <span className="material-symbols-outlined text-sm">delete</span>
                <span>Excluir Lead</span>
              </button>
              <div className="h-[1px] bg-white/5 my-1"></div>
              <p className="text-[10px] uppercase tracking-widest text-white/30 font-bold px-3 py-2">Mover para:</p>
              {statuses.map(status => (
                <button
                  key={status.id}
                  disabled={lead.status === status.id}
                  onClick={() => {
                    onUpdateStatus(status.id);
                    setShowActions(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs transition-all ${
                    lead.status === status.id 
                      ? 'bg-white/5 text-white/20 cursor-not-allowed' 
                      : 'text-white/70 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <span className="material-symbols-outlined text-sm">{status.icon}</span>
                  <span>{status.label}</span>
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
