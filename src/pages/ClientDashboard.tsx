import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import ClientSidebar from '../components/ClientSidebar';
import ClientTopbar from '../components/ClientTopbar';
import { auth, db } from '../firebase';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';

export default function ClientDashboard() {
  const [clientPlan, setClientPlan] = useState<string>('Carregando...');
  const [clientName, setClientName] = useState<string>('Carregando...');
  const [totalProduced, setTotalProduced] = useState<number>(0);
  const [activeProjects, setActiveProjects] = useState<any[]>([]);
  const [finishedProjects, setFinishedProjects] = useState<any[]>([]);
  const [planUsage, setPlanUsage] = useState<{ used: number; limit: number; percentage: number }>({ used: 0, limit: 0, percentage: 0 });
  const [loading, setLoading] = useState(true);

  const planLimits: Record<string, number> = {
    'Pacote Start': 2,
    'Pacote Growth': 5,
    'Pacote Scale': 10,
    'Plano Start': 2,
    'Plano Growth': 5,
    'Plano Scale': 10,
    'Start': 2,
    'Growth': 5,
    'Scale': 10,
  };

  useEffect(() => {
    const fetchClientData = async () => {
      const user = auth.currentUser;
      if (!user) {
        setClientPlan('Nenhum plano ativo');
        setClientName('Usuário');
        setLoading(false);
        return;
      }

      try {
        const email = user.email;
        if (!email) return;
        
        const accessId = email.split('@')[0];
        
        // 1. Get client document
        const clientsRef = collection(db, 'clients');
        const qClient = query(clientsRef, where('accessId', '==', accessId));
        const clientSnap = await getDocs(qClient);
        
        if (clientSnap.empty) {
          setClientPlan('Nenhum plano ativo');
          setClientName('Cliente não encontrado');
          setLoading(false);
          return;
        }

        const clientDoc = clientSnap.docs[0];
        const clientId = clientDoc.id;
        setClientName(clientDoc.data().name || 'Cliente');

        // 2. Get demands (projects)
        const demandsRef = collection(db, 'demands');
        const qDemands = query(demandsRef, where('clientId', '==', clientId));
        const demandsSnap = await getDocs(qDemands);
        
        const allDemands = demandsSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as any[];

        setTotalProduced(allDemands.length);
        
        // Sort by date
        const sortedDemands = [...allDemands].sort((a, b) => {
          const dateA = a.createdAt?.seconds ? a.createdAt.seconds * 1000 : new Date(a.createdAt || 0).getTime();
          const dateB = b.createdAt?.seconds ? b.createdAt.seconds * 1000 : new Date(b.createdAt || 0).getTime();
          return dateB - dateA;
        });

        // Active projects (latest 2)
        setActiveProjects(sortedDemands.slice(0, 1));

        // Finished projects for history (latest 5)
        const finished = sortedDemands.filter(p => p.status === 'Finalizado');
        setFinishedProjects(finished.slice(0, 5));

        // 3. Get latest sale for this client to calculate plan usage
        const salesRef = collection(db, 'sales');
        const qSales = query(
          salesRef, 
          where('clientId', '==', clientId),
          where('status', '==', 'Confirmado')
        );
        const salesSnap = await getDocs(qSales);

        if (salesSnap.empty) {
          setClientPlan('Nenhum plano ativo');
          setPlanUsage({ used: 0, limit: 0, percentage: 0 });
        } else {
          const sales = salesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];
          sales.sort((a, b) => {
            const dateA = a.createdAt?.seconds ? a.createdAt.seconds * 1000 : new Date(a.createdAt || 0).getTime();
            const dateB = b.createdAt?.seconds ? b.createdAt.seconds * 1000 : new Date(b.createdAt || 0).getTime();
            return dateB - dateA;
          });
          
          const latestSale = sales[0];
          const planName = latestSale.plan || 'Plano Personalizado';
          setClientPlan(planName);

          // Calculate usage: demands created after this sale
          const saleDate = latestSale.createdAt?.seconds ? latestSale.createdAt.seconds * 1000 : new Date(latestSale.createdAt || 0).getTime();
          const demandsSinceSale = allDemands.filter(d => {
            const demandDate = d.createdAt?.seconds ? d.createdAt.seconds * 1000 : new Date(d.createdAt || 0).getTime();
            return demandDate >= saleDate;
          });

          const limit = planLimits[planName] || 0;
          const used = demandsSinceSale.length;
          const percentage = limit > 0 ? Math.min(Math.round((used / limit) * 100), 100) : 0;
          
          setPlanUsage({ used, limit, percentage });
        }

        setLoading(false);

      } catch (error) {
        console.error("Erro ao buscar dados do cliente:", error);
        setClientPlan('Erro ao carregar');
        setLoading(false);
      }
    };

    fetchClientData();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Aberto': return 'bg-blue-400/10 text-blue-400 border-blue-400/20';
      case 'Em Produção': return 'bg-secondary/10 text-secondary border-secondary/20';
      case 'Revisão': return 'bg-orange-400/10 text-orange-400 border-orange-400/20';
      case 'Finalizado': return 'bg-tertiary/10 text-tertiary border-tertiary/20';
      default: return 'bg-white/10 text-white/40 border-white/20';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'Aberto': return 'Iniciado';
      case 'Em Produção': return 'Em Produção';
      case 'Revisão': return 'Em Revisão';
      case 'Finalizado': return 'Finalizado';
      default: return status;
    }
  };

  const formatDate = (date: any) => {
    if (!date) return 'N/A';
    try {
      const d = date.seconds ? new Date(date.seconds * 1000) : new Date(date);
      return d.toLocaleDateString('pt-BR');
    } catch (e) {
      return 'N/A';
    }
  };

  return (
    <div className="bg-[#050505] text-white font-body antialiased min-h-screen flex selection:bg-secondary selection:text-on-secondary">
      {/* SideNavBar Shell */}
      <ClientSidebar activePage="dashboard" />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col ml-64 relative">
        {/* Background Effects */}
        <div className="fixed bottom-0 right-0 w-[800px] h-[800px] bg-secondary/5 blur-[150px] rounded-full -z-10 pointer-events-none"></div>
        <div className="fixed top-0 right-0 w-[500px] h-[500px] bg-primary/5 blur-[120px] rounded-full -z-10 pointer-events-none"></div>

        {/* TopNavBar Shell */}
        <ClientTopbar subtitle={loading ? 'Carregando...' : `Olá, ${clientName} 👋`} />

        {/* Main Canvas */}
        <main className="p-12 space-y-16 max-w-7xl mx-auto w-full">
          {/* 1. KPIs Section */}
          <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="col-span-1 bg-white/[0.01] backdrop-blur-3xl border border-white/5 p-10 rounded-[2.5rem] flex flex-col justify-between overflow-hidden relative group hover:bg-white/[0.02] transition-all duration-500"
            >
              <div className="z-10">
                <span className="text-[10px] uppercase tracking-[0.3em] text-secondary font-bold font-headline">Seu Plano Atual</span>
                <h2 className="text-3xl font-black mt-3 tracking-tighter font-headline text-white">{clientPlan}</h2>
              </div>
              <div className="mt-12 z-10">
                <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-secondary to-primary rounded-full transition-all duration-1000 ease-out"
                    style={{ width: `${planUsage.percentage}%` }}
                  ></div>
                </div>
                <div className="flex justify-between items-center mt-4">
                  <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest">
                    {planUsage.limit > 0 
                      ? `${planUsage.used} de ${planUsage.limit} vídeos`
                      : 'Consulte seu limite'}
                  </p>
                  <span className="text-xs font-black text-secondary">{planUsage.percentage}%</span>
                </div>
              </div>
              <div className="absolute -right-8 -bottom-8 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity duration-1000">
                <span className="material-symbols-outlined text-[180px] text-secondary">auto_awesome</span>
              </div>
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="col-span-1 bg-white/[0.01] backdrop-blur-3xl border border-white/5 p-10 rounded-[2.5rem] flex flex-col justify-between hover:bg-white/[0.02] transition-all duration-500"
            >
              <div>
                <span className="text-[10px] uppercase tracking-[0.3em] text-tertiary font-bold font-headline">Total Entregue</span>
                <div className="flex items-baseline gap-3 mt-3">
                  <span className="text-6xl font-black font-headline tracking-tighter">{totalProduced}</span>
                  <span className="text-white/20 text-[10px] font-bold uppercase tracking-widest italic font-serif">produções</span>
                </div>
              </div>
              <div className="mt-12 flex items-center gap-3 text-white/20">
                <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center">
                  <span className="material-symbols-outlined text-sm">history</span>
                </div>
                <span className="text-[9px] uppercase tracking-[0.2em] font-bold">Histórico sincronizado</span>
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="col-span-1 bg-gradient-to-br from-secondary/5 to-primary/5 backdrop-blur-3xl border border-white/5 p-10 rounded-[2.5rem] flex flex-col justify-between group hover:from-secondary/10 hover:to-primary/10 transition-all duration-500"
            >
              <div>
                <span className="text-[10px] uppercase tracking-[0.3em] text-white/40 font-bold font-headline">Status da Conta</span>
                <div className="flex items-center gap-3 mt-4">
                  <div className="w-3 h-3 bg-tertiary rounded-full animate-pulse shadow-[0_0_10px_rgba(0,255,153,0.5)]"></div>
                  <span className="text-xl font-bold font-headline tracking-tight">Ativa & Verificada</span>
                </div>
              </div>
              <button 
                onClick={() => window.open('https://wa.me/5511999999999', '_blank')}
                className="mt-12 w-full py-4 bg-white text-black rounded-2xl text-[10px] font-bold uppercase tracking-[0.2em] hover:bg-secondary hover:text-white transition-all shadow-xl shadow-white/5"
              >
                Falar com Suporte
              </button>
            </motion.div>
          </section>

          {/* 2. Galeria de Projetos */}
          <section>
            <div className="flex justify-between items-end mb-10">
              <div>
                <h3 className="text-4xl font-black font-headline tracking-tighter">Projetos Ativos</h3>
                <p className="text-white/30 mt-3 font-medium text-sm">Acompanhe suas produções em tempo real.</p>
              </div>
              <a href="/client/projects" className="group flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.2em] text-secondary hover:text-white transition-all duration-300">
                Ver Todos <span className="material-symbols-outlined text-sm group-hover:translate-x-1 transition-transform">arrow_forward</span>
              </a>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
              {loading ? (
                <div className="col-span-2 py-32 text-center">
                  <div className="inline-block w-8 h-8 border-2 border-secondary/20 border-t-secondary rounded-full animate-spin mb-4"></div>
                  <p className="text-white/20 text-[10px] font-bold uppercase tracking-widest">Sincronizando projetos...</p>
                </div>
              ) : activeProjects.length === 0 ? (
                <div className="col-span-2 py-32 text-center bg-white/[0.01] rounded-[2.5rem] border border-dashed border-white/10">
                  <span className="material-symbols-outlined text-white/10 text-5xl mb-4">movie_off</span>
                  <p className="text-white/20 text-[10px] font-bold uppercase tracking-widest">Nenhum projeto ativo no momento.</p>
                </div>
              ) : (
                activeProjects.map((project, index) => (
                  <motion.div 
                    key={project.id}
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3 + (index * 0.1) }}
                    className="group relative bg-white/[0.01] rounded-[2.5rem] overflow-hidden border border-white/5 hover:border-white/10 transition-all duration-700"
                  >
                    <div className="aspect-video overflow-hidden relative bg-black">
                      <img 
                        src={`https://images.unsplash.com/photo-${index === 0 ? '1536240478700-b869070f9279' : '1618005182384-a83a8bd57fbe'}?auto=format&fit=crop&q=80&w=1200`} 
                        alt={project.title} 
                        className="w-full h-full object-cover opacity-40 group-hover:scale-110 group-hover:opacity-60 transition-all duration-1000 ease-out" 
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-transparent to-transparent z-10"></div>
                      <div className="absolute top-8 right-8 z-20">
                        <span className={`${getStatusColor(project.status)} text-[9px] font-black px-5 py-2 rounded-full border backdrop-blur-xl uppercase tracking-[0.2em]`}>
                          {getStatusLabel(project.status)}
                        </span>
                      </div>
                    </div>
                    <div className="p-10 relative">
                      <div className="flex justify-between items-start mb-10">
                        <div>
                          <h4 className="text-3xl font-black font-headline tracking-tighter group-hover:text-secondary transition-colors duration-500">{project.title}</h4>
                          <div className="flex items-center gap-4 mt-3">
                            <p className="text-[10px] text-white/30 flex items-center gap-2 font-bold uppercase tracking-widest">
                              <span className="material-symbols-outlined text-xs">calendar_today</span>
                              {formatDate(project.createdAt)}
                            </p>
                            <span className="w-1 h-1 bg-white/10 rounded-full"></span>
                            <span className="text-white/20 text-[10px] uppercase tracking-widest font-mono">ID: {project.id.slice(-6).toUpperCase()}</span>
                          </div>
                        </div>
                      </div>
                      
                      {project.status === 'Finalizado' ? (
                        <button 
                          onClick={() => project.videoUrl && window.open(project.videoUrl, '_blank')}
                          className={`w-full bg-white text-black hover:bg-secondary hover:text-white font-black py-5 rounded-2xl transition-all duration-500 text-[10px] uppercase tracking-[0.3em] shadow-2xl shadow-black flex items-center justify-center gap-3 ${!project.videoUrl ? 'opacity-50 cursor-not-allowed' : ''}`}
                          disabled={!project.videoUrl}
                        >
                          <span className="material-symbols-outlined text-lg">download</span>
                          {project.videoUrl ? 'Download Master 4K' : 'Link não disponível'}
                        </button>
                      ) : (
                        <div className="w-full bg-white/5 border border-white/5 text-white/20 font-bold py-5 rounded-2xl flex items-center justify-center gap-3 text-[10px] uppercase tracking-[0.2em]">
                          <div className="w-4 h-4 border-2 border-white/10 border-t-white/30 rounded-full animate-spin"></div>
                          Produção em Andamento
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </section>

          {/* 3. Histórico de Arquivos */}
          <section className="space-y-10">
            <h3 className="text-3xl font-black font-headline tracking-tighter">Histórico de Arquivos</h3>
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="w-full overflow-hidden bg-white/[0.01] backdrop-blur-3xl rounded-[2.5rem] border border-white/5"
            >
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-white/[0.02] border-b border-white/5">
                    <th className="px-10 py-8 text-[10px] font-bold uppercase tracking-[0.3em] text-white/30">Nome do Arquivo</th>
                    <th className="px-10 py-8 text-[10px] font-bold uppercase tracking-[0.3em] text-white/30">Projeto</th>
                    <th className="px-10 py-8 text-[10px] font-bold uppercase tracking-[0.3em] text-white/30">Status</th>
                    <th className="px-10 py-8 text-[10px] font-bold uppercase tracking-[0.3em] text-white/30 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {loading ? (
                    <tr>
                      <td colSpan={4} className="px-10 py-16 text-center text-white/20 text-[10px] font-bold uppercase tracking-widest">Sincronizando arquivos...</td>
                    </tr>
                  ) : finishedProjects.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-10 py-16 text-center text-white/20 text-[10px] font-bold uppercase tracking-widest">Nenhum arquivo finalizado disponível.</td>
                    </tr>
                  ) : (
                    finishedProjects.map((project) => (
                      <tr key={project.id} className="hover:bg-white/[0.02] transition-all duration-300 group">
                        <td className="px-10 py-8">
                          <div className="flex items-center gap-6">
                            <div className="w-12 h-12 rounded-2xl bg-secondary/10 flex items-center justify-center border border-secondary/20 group-hover:bg-secondary group-hover:text-white transition-all duration-500">
                              <span className="material-symbols-outlined text-sm">movie</span>
                            </div>
                            <div>
                              <p className="text-sm font-black text-white group-hover:text-secondary transition-colors">{project.title}_Master.mp4</p>
                              <p className="text-[10px] text-white/30 mt-1 font-bold uppercase tracking-widest">
                                {formatDate(project.createdAt)}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-10 py-8 text-[10px] text-white/40 font-bold uppercase tracking-widest">{project.title}</td>
                        <td className="px-10 py-8">
                          <span className="text-[9px] font-black uppercase tracking-[0.2em] text-tertiary bg-tertiary/10 px-4 py-1.5 rounded-full border border-tertiary/20">Disponível</span>
                        </td>
                        <td className="px-10 py-8 text-right">
                          <button 
                            onClick={() => project.videoUrl && window.open(project.videoUrl, '_blank')}
                            className={`w-10 h-10 rounded-xl bg-white/5 hover:bg-white hover:text-black transition-all duration-500 flex items-center justify-center border border-white/5 ${!project.videoUrl ? 'opacity-30 cursor-not-allowed' : ''}`}
                            disabled={!project.videoUrl}
                          >
                            <span className="material-symbols-outlined text-sm">download</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
              <div className="bg-white/[0.01] px-10 py-8 flex justify-center border-t border-white/5">
                <a href="/client/projects" className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20 hover:text-secondary transition-all duration-300">Ver todos os projetos</a>
              </div>
            </motion.div>
          </section>
        </main>
      </div>
    </div>
  );
}
