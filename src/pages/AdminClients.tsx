import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import AdminSidebar from '../components/AdminSidebar';
import GlobalSearch from '../components/GlobalSearch';
import { motion, AnimatePresence } from 'motion/react';
import { useClients, Client } from '../hooks/useClients';

export default function AdminClients() {
  const { clients, addClient, deleteClient, updateClient } = useClients();
  const [searchParams, setSearchParams] = useSearchParams();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  useEffect(() => {
    const id = searchParams.get('id');
    if (id) {
      const client = clients.find(c => c.id === id);
      if (client) {
        setSelectedClient(client);
        setIsDetailsModalOpen(true);
      }
    }
  }, [searchParams, clients]);
  const [formData, setFormData] = useState<Omit<Client, 'id' | 'createdAt'>>({
    name: '',
    email: '',
    niche: '',
    document: '',
    instagram: '',
    whatsapp: '',
    billedAmount: 0,
    status: 'Ativo'
  });

  const handleAddClient = (e: React.FormEvent) => {
    e.preventDefault();
    addClient(formData);
    setFormData({ name: '', email: '', niche: '', document: '', instagram: '', whatsapp: '', billedAmount: 0, status: 'Ativo' });
    setIsModalOpen(false);
  };

  const handleDeleteClient = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Tem certeza que deseja excluir este cliente?')) {
      deleteClient(id);
    }
  };

  const handleEditClient = (client: Client) => {
    setSelectedClient(client);
    setEditFormData({
      name: client.name,
      email: client.email,
      niche: client.niche,
      document: client.document,
      instagram: client.instagram,
      whatsapp: client.whatsapp,
      billedAmount: client.billedAmount,
      status: client.status
    });
    setIsEditModalOpen(true);
  };

  const [editFormData, setEditFormData] = useState<Omit<Client, 'id' | 'createdAt'>>({
    name: '',
    email: '',
    niche: '',
    document: '',
    instagram: '',
    whatsapp: '',
    billedAmount: 0,
    status: 'Ativo'
  });

  const handleUpdateClient = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedClient) {
      updateClient(selectedClient.id, editFormData);
      setIsEditModalOpen(false);
      setSelectedClient(null);
    }
  };

  // Stats calculation
  const totalClients = clients.length;
  const activeClients = clients.filter(c => c.status === 'Ativo').length;
  const retentionRate = totalClients > 0 ? Math.round((activeClients / totalClients) * 100) : 0;
  
  // Find dominant niche
  const nicheCounts = clients.reduce((acc, client) => {
    acc[client.niche] = (acc[client.niche] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const dominantNiche = Object.entries(nicheCounts).sort((a: [string, number], b: [string, number]) => b[1] - a[1])[0]?.[0] || 'Nenhum';

  return (
    <div className="font-body text-on-surface min-h-screen flex bg-[#050505] overflow-hidden selection:bg-primary/30">
      {/* Background from Home */}
      <div className="fixed inset-0 w-full h-full -z-10 bg-[#050505] overflow-hidden">
        <div className="absolute inset-0 w-full h-full opacity-1 bg-gradient-to-b from-[#020202] to-transparent">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(0,102,255,0.05),transparent_60%)]"></div>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(153,0,255,0.05),transparent_40%)]"></div>
        </div>
      </div>

      <AdminSidebar activePage="clientes" />

      {/* Main Content Area */}
      <main className="ml-64 flex-1 min-h-screen relative flex flex-col">
        {/* TopNavBar */}
        <header className="fixed top-0 right-0 w-[calc(100%-16rem)] h-24 z-40 bg-[#050505]/80 backdrop-blur-2xl border-b border-white/10 flex justify-between items-center px-10">
          <GlobalSearch />
          <div className="flex items-center gap-6">
            <button className="relative text-white/60 hover:text-white transition-colors" onClick={() => alert('Notificações em breve')}>
              <span className="material-symbols-outlined">notifications</span>
            </button>
            <button className="text-white/60 hover:text-white transition-colors" onClick={() => alert('Mensagens em breve')}>
              <span className="material-symbols-outlined">mail</span>
            </button>
            <div className="h-8 w-[1px] bg-white/10"></div>
            <button 
              className="bg-gradient-to-r from-secondary to-primary text-on-secondary font-headline font-bold px-6 py-3 rounded-xl flex items-center gap-2 hover:shadow-[0_0_20px_rgba(203,123,255,0.4)] transition-all active:scale-95 text-[10px] uppercase tracking-widest"
              onClick={() => setIsModalOpen(true)}
            >
              <span className="material-symbols-outlined text-lg">person_add</span>
              Novo Cliente
            </button>
          </div>
        </header>

        {/* Canvas Content */}
        <div id="client-main-container" className="pt-32 pb-12 px-10 max-w-7xl mx-auto w-full space-y-12">
          {/* Hero Header */}
          <div className="space-y-3">
            <h2 className="text-4xl md:text-5xl font-headline font-extrabold tracking-tighter text-white">
              Área do <span className="font-serif italic text-secondary font-light">Cliente</span>
            </h2>
            <p className="text-white/50 text-lg max-w-2xl font-light leading-relaxed">
              Gestão centralizada de parceiros, nichos e status de produção da Next Creatives.
            </p>
          </div>

          {/* Statistics Bar */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 bg-white/[0.02] border border-white/10 backdrop-blur-xl p-8 rounded-2xl flex items-center justify-between group hover:border-white/20 transition-all">
              <div>
                <p className="text-white/40 text-[10px] font-bold uppercase tracking-[0.2em] mb-1">Visão de Crescimento</p>
                <h3 className="text-2xl font-headline font-bold tracking-tight text-white">Expansão de Clientes Ativos</h3>
              </div>
              <div className="flex gap-10">
                <div className="text-center">
                  <p className="text-primary text-3xl font-headline font-extrabold tracking-tight">{totalClients}</p>
                  <p className="text-white/40 text-[10px] uppercase font-bold tracking-widest">Total</p>
                </div>
                <div className="text-center">
                  <p className="text-secondary text-3xl font-headline font-extrabold tracking-tight">R$ {clients.reduce((acc, c) => acc + c.billedAmount, 0).toLocaleString('pt-BR')}</p>
                  <p className="text-white/40 text-[10px] uppercase font-bold tracking-widest">Faturamento Total</p>
                </div>
              </div>
            </div>
            <div className="bg-secondary/5 rounded-2xl p-8 border border-secondary/20 flex flex-col justify-center relative overflow-hidden group hover:bg-secondary/10 transition-all border-l-4 border-l-secondary">
              <div className="relative z-10">
                <p className="text-secondary text-[10px] font-bold uppercase tracking-[0.2em]">Campanhas Ativas</p>
                <p className="text-white text-4xl font-headline font-extrabold mt-2 tracking-tight">{activeClients}</p>
              </div>
              <span className="material-symbols-outlined absolute -bottom-4 -right-4 text-9xl text-secondary/10 rotate-12 group-hover:rotate-0 transition-transform duration-700">rocket_launch</span>
            </div>
          </div>

          {/* Main Data Table Container */}
          <div className="bg-white/[0.02] border border-white/10 backdrop-blur-xl rounded-2xl overflow-hidden shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-white/5">
                    <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-[0.2em] text-white/30">Cliente / Empresa</th>
                    <th className="px-6 py-5 text-[10px] font-bold uppercase tracking-[0.2em] text-white/30">Documento / Nicho</th>
                    <th className="px-6 py-5 text-[10px] font-bold uppercase tracking-[0.2em] text-white/30">Social / Contato</th>
                    <th className="px-6 py-5 text-[10px] font-bold uppercase tracking-[0.2em] text-white/30 text-center">Faturamento</th>
                    <th className="px-6 py-5 text-[10px] font-bold uppercase tracking-[0.2em] text-white/30 text-center">Status</th>
                    <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-[0.2em] text-white/30 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {clients.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-8 py-32 text-center">
                        <div className="flex flex-col items-center gap-6 opacity-20">
                          <div className="p-6 bg-white/5 rounded-full border border-white/10">
                            <span className="material-symbols-outlined text-6xl">person_search</span>
                          </div>
                          <div className="space-y-1">
                            <p className="font-headline font-bold text-sm uppercase tracking-[0.2em]">Nenhum cliente cadastrado</p>
                            <p className="text-xs font-light lowercase tracking-widest">Inicie sua base de dados clicando em novo cliente</p>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    clients.map((client) => (
                      <tr 
                        key={client.id} 
                        onClick={() => handleEditClient(client)}
                        className="hover:bg-white/[0.04] transition-colors group cursor-pointer"
                      >
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-secondary/20 to-primary/20 flex items-center justify-center border border-white/10 font-headline font-bold text-white text-xs shrink-0">
                              {client.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-bold text-white text-sm">{client.name}</p>
                              <p className="text-[10px] text-white/40 font-medium">{client.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-6">
                          <p className="text-xs font-mono text-white/70">{client.document}</p>
                          <p className="text-[10px] text-white/30 uppercase tracking-widest mt-1">{client.niche}</p>
                        </td>
                        <td className="px-6 py-6">
                          <div className="flex items-center gap-3">
                            {client.instagram && (
                              <a 
                                href={`https://instagram.com/${client.instagram.replace('@', '')}`} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="flex items-center gap-1.5 text-[10px] text-white/50 hover:text-secondary transition-colors"
                              >
                                <span className="material-symbols-outlined text-sm">photo_camera</span>
                                {client.instagram}
                              </a>
                            )}
                            <div className="w-[1px] h-3 bg-white/10"></div>
                            <a 
                              href={`https://wa.me/${client.whatsapp.replace(/\D/g, '')}`} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="flex items-center gap-1.5 text-[10px] text-white/50 hover:text-green-400 transition-colors"
                            >
                              <span className="material-symbols-outlined text-sm">chat</span>
                              WhatsApp
                            </a>
                          </div>
                        </td>
                        <td className="px-6 py-6 text-center">
                          <p className="text-sm font-headline font-bold text-white">R$ {client.billedAmount.toLocaleString('pt-BR')}</p>
                        </td>
                        <td className="px-6 py-6 text-center">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold border uppercase tracking-wide ${
                            client.status === 'Ativo' 
                              ? 'bg-secondary/10 text-secondary border-secondary/20' 
                              : 'bg-white/5 text-white/40 border-white/10'
                          }`}>
                            {client.status}
                          </span>
                        </td>
                        <td className="px-8 py-6 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <a 
                              href={`https://wa.me/${client.whatsapp.replace(/\D/g, '')}`} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="p-2 hover:bg-green-500/10 rounded-xl transition-all text-white/20 hover:text-green-400 border border-transparent hover:border-green-500/20"
                              title="Enviar Mensagem"
                            >
                              <span className="material-symbols-outlined text-lg">send</span>
                            </a>
                            <button 
                              onClick={(e) => handleDeleteClient(client.id, e)}
                              className="p-2 hover:bg-red-500/10 rounded-xl transition-all text-white/20 hover:text-red-500 border border-transparent hover:border-red-500/20"
                              title="Excluir Cliente"
                            >
                              <span className="material-symbols-outlined text-lg">delete</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {/* Pagination */}
            <div className="p-6 bg-white/2 flex items-center justify-between border-t border-white/5">
              <p className="text-[10px] uppercase tracking-widest text-white/20 font-bold">Exibindo {clients.length} de {clients.length} clientes</p>
              <div className="flex gap-3">
                <button className="p-2 rounded-xl bg-white/5 text-white/20 cursor-not-allowed border border-white/5">
                  <span className="material-symbols-outlined text-sm">chevron_left</span>
                </button>
                <button className="p-2 rounded-xl bg-white/5 text-white/20 cursor-not-allowed border border-white/5">
                  <span className="material-symbols-outlined text-sm">chevron_right</span>
                </button>
              </div>
            </div>
          </div>

          {/* Floating Quick Insights */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white/[0.02] border border-white/10 backdrop-blur-xl p-8 rounded-2xl hover:border-white/20 transition-all">
              <p className="text-white/40 text-[10px] font-bold uppercase tracking-[0.2em] mb-6">Nicho Dominante</p>
              <div className="flex items-end justify-between">
                <h4 className={`text-xl font-headline font-bold ${dominantNiche === 'Nenhum' ? 'text-white/20' : 'text-white'}`}>{dominantNiche}</h4>
                <span className="text-white/10 text-[10px] font-bold uppercase tracking-widest">
                  {dominantNiche === 'Nenhum' ? 'Sem dados' : 'Foco Atual'}
                </span>
              </div>
            </div>
            <div className="bg-white/[0.02] border border-white/10 backdrop-blur-xl p-8 rounded-2xl hover:border-white/20 transition-all">
              <p className="text-white/40 text-[10px] font-bold uppercase tracking-[0.2em] mb-6">Distribuição de Status</p>
              <div className="flex items-center gap-2 h-1.5 rounded-full bg-white/5 overflow-hidden mt-8">
                <div 
                  className="h-full bg-secondary transition-all duration-500" 
                  style={{ width: `${retentionRate}%` }}
                ></div>
                <div 
                  className="h-full bg-white/10 transition-all duration-500" 
                  style={{ width: `${100 - retentionRate}%` }}
                ></div>
              </div>
            </div>
            <div className="bg-white/[0.02] border border-white/10 backdrop-blur-xl p-8 rounded-2xl hover:border-white/20 transition-all flex items-center justify-between">
              <div>
                <p className="text-white/40 text-[10px] font-bold uppercase tracking-[0.2em] mb-1">Fila de Suporte</p>
                <h4 className="text-2xl font-headline font-extrabold text-white tracking-tight">00 <span className="text-xs font-light text-white/30 uppercase tracking-widest ml-1">Tickets</span></h4>
              </div>
              <div className="p-3 bg-secondary/10 rounded-xl border border-secondary/20">
                <span className="material-symbols-outlined text-secondary text-2xl">confirmation_number</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Modals */}
      <AnimatePresence>
        {isEditModalOpen && selectedClient && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsEditModalOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-[#0e0e0e] border border-white/10 rounded-3xl p-8 shadow-2xl overflow-hidden"
            >
              {/* Modal Glow */}
              <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/20 blur-[80px] rounded-full" />
              
              <div className="relative z-10">
                <div className="flex justify-between items-start mb-8">
                  <div>
                    <h3 className="text-2xl font-headline font-bold text-white tracking-tight">Editar <span className="font-serif italic text-primary font-light">Cliente</span></h3>
                    <p className="text-white/40 text-xs mt-1 font-light">Altere os dados de cadastro ou o status do cliente.</p>
                  </div>
                  <button 
                    onClick={() => setIsEditModalOpen(false)}
                    className="p-2 hover:bg-white/5 rounded-full transition-colors text-white/40 hover:text-white"
                  >
                    <span className="material-symbols-outlined">close</span>
                  </button>
                </div>

                <form onSubmit={handleUpdateClient} className="space-y-5">
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest text-white/30 font-bold ml-1">Nome / Empresa</label>
                    <input 
                      required
                      value={editFormData.name}
                      onChange={(e) => setEditFormData({...editFormData, name: e.target.value})}
                      className="w-full bg-white/[0.03] border border-white/10 rounded-xl py-3 px-4 text-sm text-white focus:ring-1 focus:ring-primary/50 outline-none transition-all"
                      placeholder="Ex: Titan Industries"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-widest text-white/30 font-bold ml-1">Email</label>
                      <input 
                        required
                        type="email"
                        value={editFormData.email}
                        onChange={(e) => setEditFormData({...editFormData, email: e.target.value})}
                        className="w-full bg-white/[0.03] border border-white/10 rounded-xl py-3 px-4 text-sm text-white focus:ring-1 focus:ring-primary/50 outline-none transition-all"
                        placeholder="contato@empresa.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-widest text-white/30 font-bold ml-1">Nicho</label>
                      <input 
                        required
                        value={editFormData.niche}
                        onChange={(e) => setEditFormData({...editFormData, niche: e.target.value})}
                        className="w-full bg-white/[0.03] border border-white/10 rounded-xl py-3 px-4 text-sm text-white focus:ring-1 focus:ring-primary/50 outline-none transition-all"
                        placeholder="Ex: Tecnologia"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-widest text-white/30 font-bold ml-1">Instagram</label>
                      <input 
                        value={editFormData.instagram}
                        onChange={(e) => setEditFormData({...editFormData, instagram: e.target.value})}
                        className="w-full bg-white/[0.03] border border-white/10 rounded-xl py-3 px-4 text-sm text-white focus:ring-1 focus:ring-primary/50 outline-none transition-all"
                        placeholder="@usuario"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-widest text-white/30 font-bold ml-1">WhatsApp</label>
                      <input 
                        required
                        value={editFormData.whatsapp}
                        onChange={(e) => setEditFormData({...editFormData, whatsapp: e.target.value})}
                        className="w-full bg-white/[0.03] border border-white/10 rounded-xl py-3 px-4 text-sm text-white focus:ring-1 focus:ring-primary/50 outline-none transition-all"
                        placeholder="(00) 00000-0000"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-widest text-white/30 font-bold ml-1">CPF / CNPJ</label>
                      <input 
                        required
                        value={editFormData.document}
                        onChange={(e) => setEditFormData({...editFormData, document: e.target.value})}
                        className="w-full bg-white/[0.03] border border-white/10 rounded-xl py-3 px-4 text-sm text-white focus:ring-1 focus:ring-primary/50 outline-none transition-all"
                        placeholder="00.000.000/0001-00"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-widest text-white/30 font-bold ml-1">Valor Faturado (R$)</label>
                      <input 
                        type="number"
                        value={editFormData.billedAmount}
                        onChange={(e) => setEditFormData({...editFormData, billedAmount: Number(e.target.value)})}
                        className="w-full bg-white/[0.03] border border-white/10 rounded-xl py-3 px-4 text-sm text-white focus:ring-1 focus:ring-primary/50 outline-none transition-all"
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-widest text-white/30 font-bold ml-1">Status</label>
                      <select 
                        value={editFormData.status}
                        onChange={(e) => setEditFormData({...editFormData, status: e.target.value as 'Ativo' | 'Inativo'})}
                        className="w-full bg-white/[0.03] border border-white/10 rounded-xl py-3 px-4 text-sm text-white focus:ring-1 focus:ring-primary/50 outline-none transition-all appearance-none"
                      >
                        <option value="Ativo" className="bg-[#0e0e0e]">Ativo</option>
                        <option value="Inativo" className="bg-[#0e0e0e]">Inativo</option>
                      </select>
                    </div>
                  </div>

                  <div className="pt-4">
                    <button 
                      type="submit"
                      className="w-full bg-gradient-to-r from-primary to-secondary text-on-primary font-headline font-bold py-4 rounded-xl hover:shadow-[0_0_30px_rgba(0,102,255,0.3)] transition-all active:scale-[0.98] uppercase tracking-widest text-xs"
                    >
                      Salvar Alterações
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}

        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-[#0e0e0e] border border-white/10 rounded-3xl p-8 shadow-2xl overflow-hidden"
            >
              {/* Modal Glow */}
              <div className="absolute -top-24 -right-24 w-48 h-48 bg-secondary/20 blur-[80px] rounded-full" />
              
              <div className="relative z-10">
                <div className="flex justify-between items-start mb-8">
                  <div>
                    <h3 className="text-2xl font-headline font-bold text-white tracking-tight">Novo <span className="font-serif italic text-secondary font-light">Cliente</span></h3>
                    <p className="text-white/40 text-xs mt-1 font-light">Preencha os dados para cadastrar na base.</p>
                  </div>
                  <button 
                    onClick={() => setIsModalOpen(false)}
                    className="p-2 hover:bg-white/5 rounded-full transition-colors text-white/40 hover:text-white"
                  >
                    <span className="material-symbols-outlined">close</span>
                  </button>
                </div>

                <form onSubmit={handleAddClient} className="space-y-5">
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest text-white/30 font-bold ml-1">Nome / Empresa</label>
                    <input 
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      className="w-full bg-white/[0.03] border border-white/10 rounded-xl py-3 px-4 text-sm text-white focus:ring-1 focus:ring-secondary/50 outline-none transition-all"
                      placeholder="Ex: Titan Industries"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-widest text-white/30 font-bold ml-1">Email</label>
                      <input 
                        required
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                        className="w-full bg-white/[0.03] border border-white/10 rounded-xl py-3 px-4 text-sm text-white focus:ring-1 focus:ring-secondary/50 outline-none transition-all"
                        placeholder="contato@empresa.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-widest text-white/30 font-bold ml-1">Nicho</label>
                      <input 
                        required
                        value={formData.niche}
                        onChange={(e) => setFormData({...formData, niche: e.target.value})}
                        className="w-full bg-white/[0.03] border border-white/10 rounded-xl py-3 px-4 text-sm text-white focus:ring-1 focus:ring-secondary/50 outline-none transition-all"
                        placeholder="Ex: Tecnologia"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-widest text-white/30 font-bold ml-1">Instagram</label>
                      <input 
                        value={formData.instagram}
                        onChange={(e) => setFormData({...formData, instagram: e.target.value})}
                        className="w-full bg-white/[0.03] border border-white/10 rounded-xl py-3 px-4 text-sm text-white focus:ring-1 focus:ring-secondary/50 outline-none transition-all"
                        placeholder="@usuario"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-widest text-white/30 font-bold ml-1">WhatsApp</label>
                      <input 
                        required
                        value={formData.whatsapp}
                        onChange={(e) => setFormData({...formData, whatsapp: e.target.value})}
                        className="w-full bg-white/[0.03] border border-white/10 rounded-xl py-3 px-4 text-sm text-white focus:ring-1 focus:ring-secondary/50 outline-none transition-all"
                        placeholder="(00) 00000-0000"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-widest text-white/30 font-bold ml-1">CPF / CNPJ</label>
                      <input 
                        required
                        value={formData.document}
                        onChange={(e) => setFormData({...formData, document: e.target.value})}
                        className="w-full bg-white/[0.03] border border-white/10 rounded-xl py-3 px-4 text-sm text-white focus:ring-1 focus:ring-secondary/50 outline-none transition-all"
                        placeholder="00.000.000/0001-00"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-widest text-white/30 font-bold ml-1">Valor Faturado (R$)</label>
                      <input 
                        type="number"
                        value={formData.billedAmount}
                        onChange={(e) => setFormData({...formData, billedAmount: Number(e.target.value)})}
                        className="w-full bg-white/[0.03] border border-white/10 rounded-xl py-3 px-4 text-sm text-white focus:ring-1 focus:ring-secondary/50 outline-none transition-all"
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-widest text-white/30 font-bold ml-1">Status Inicial</label>
                      <select 
                        value={formData.status}
                        onChange={(e) => setFormData({...formData, status: e.target.value as 'Ativo' | 'Inativo'})}
                        className="w-full bg-white/[0.03] border border-white/10 rounded-xl py-3 px-4 text-sm text-white focus:ring-1 focus:ring-secondary/50 outline-none transition-all appearance-none"
                      >
                        <option value="Ativo" className="bg-[#0e0e0e]">Ativo</option>
                        <option value="Inativo" className="bg-[#0e0e0e]">Inativo</option>
                      </select>
                    </div>
                  </div>

                  <div className="pt-4">
                    <button 
                      type="submit"
                      className="w-full bg-gradient-to-r from-secondary to-primary text-on-secondary font-headline font-bold py-4 rounded-xl hover:shadow-[0_0_30px_rgba(203,123,255,0.3)] transition-all active:scale-[0.98] uppercase tracking-widest text-xs"
                    >
                      Finalizar Cadastro
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}

        {isDetailsModalOpen && selectedClient && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="w-full max-w-2xl bg-[#0e0e0e] border border-white/10 rounded-3xl overflow-hidden relative"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-secondary/10 via-transparent to-primary/10"></div>
              
              <div className="relative z-10 p-10">
                <div className="flex justify-between items-start mb-10">
                  <div className="flex items-center gap-6">
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-secondary to-primary flex items-center justify-center text-3xl font-headline font-bold text-on-secondary shadow-lg shadow-secondary/20">
                      {selectedClient.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="text-3xl font-headline font-bold text-white tracking-tight">{selectedClient.name}</h3>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-bold uppercase tracking-widest text-white/60">
                          {selectedClient.id}
                        </span>
                        <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border ${
                          selectedClient.status === 'Ativo' 
                            ? 'bg-emerald-400/10 border-emerald-400/20 text-emerald-400' 
                            : 'bg-red-400/10 border-red-400/20 text-red-400'
                        }`}>
                          {selectedClient.status}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button 
                    onClick={() => {
                      setIsDetailsModalOpen(false);
                      setSearchParams({});
                    }}
                    className="p-3 hover:bg-white/5 rounded-full transition-colors text-white/40 hover:text-white"
                  >
                    <span className="material-symbols-outlined">close</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div>
                      <label className="text-[10px] uppercase tracking-widest text-white/20 font-bold block mb-2">Contato</label>
                      <div className="space-y-3">
                        <div className="flex items-center gap-3 text-white/80">
                          <span className="material-symbols-outlined text-secondary text-lg">mail</span>
                          <span className="text-sm font-light">{selectedClient.email}</span>
                        </div>
                        <div className="flex items-center gap-3 text-white/80">
                          <span className="material-symbols-outlined text-secondary text-lg">call</span>
                          <span className="text-sm font-light">{selectedClient.whatsapp}</span>
                        </div>
                        <div className="flex items-center gap-3 text-white/80">
                          <span className="material-symbols-outlined text-secondary text-lg">alternate_email</span>
                          <span className="text-sm font-light">{selectedClient.instagram}</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] uppercase tracking-widest text-white/20 font-bold block mb-2">Informações de Negócio</label>
                      <div className="space-y-3">
                        <div className="flex items-center gap-3 text-white/80">
                          <span className="material-symbols-outlined text-primary text-lg">category</span>
                          <span className="text-sm font-light">{selectedClient.niche}</span>
                        </div>
                        <div className="flex items-center gap-3 text-white/80">
                          <span className="material-symbols-outlined text-primary text-lg">description</span>
                          <span className="text-sm font-light">{selectedClient.document}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5">
                      <label className="text-[10px] uppercase tracking-widest text-white/20 font-bold block mb-4">Faturamento Total</label>
                      <div className="text-4xl font-headline font-bold text-white tracking-tighter">
                        R$ {selectedClient.billedAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </div>
                      <div className="mt-4 flex items-center gap-2 text-emerald-400 text-[10px] font-bold uppercase tracking-widest">
                        <span className="material-symbols-outlined text-sm">trending_up</span>
                        <span>+12% este mês</span>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <button className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 text-white py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all">
                        Editar Perfil
                      </button>
                      <button className="flex-1 bg-secondary/10 hover:bg-secondary text-secondary hover:text-white border border-secondary/20 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all">
                        Ver Vendas
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
