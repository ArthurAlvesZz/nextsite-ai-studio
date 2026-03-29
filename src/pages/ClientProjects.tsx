import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import ClientSidebar from '../components/ClientSidebar';
import ClientTopbar from '../components/ClientTopbar';
import { auth, db } from '../firebase';
import { collection, query, where, onSnapshot, orderBy, getDocs } from 'firebase/firestore';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function ClientProjects() {
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('Todos');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    let unsubscribeDemands: () => void;

    const unsubscribeAuth = auth.onAuthStateChanged(async (user) => {
      if (user) {
        const email = user.email || '';
        const accessId = email.split('@')[0];

        // First find the client by accessId
        const clientsQuery = query(
          collection(db, 'clients'),
          where('accessId', '==', accessId)
        );

        try {
          const snapshot = await getDocs(clientsQuery);
          if (!snapshot.empty) {
            const clientDoc = snapshot.docs[0];
            const clientId = clientDoc.id;

            // Then find demands for this client
            const demandsQuery = query(
              collection(db, 'demands'),
              where('clientId', '==', clientId),
              orderBy('createdAt', 'desc')
            );

            unsubscribeDemands = onSnapshot(demandsQuery, (demandsSnapshot) => {
              const demandsData = demandsSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
              }));
              setProjects(demandsData);
              setLoading(false);
            });
          } else {
            setLoading(false);
          }
        } catch (error) {
          console.error("Error fetching client:", error);
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeDemands) {
        unsubscribeDemands();
      }
    };
  }, []);

  const filteredProjects = projects.filter(p => {
    if (filter === 'Todos') return true;
    if (filter === 'Em Produção') return p.status === 'Em Produção' || p.status === 'Aberto';
    if (filter === 'Finalizados') return p.status === 'Finalizado';
    if (filter === 'Aguardando Review') return p.status === 'Revisão';
    return true;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Aberto': return 'bg-blue-400/10 text-blue-400 border-blue-400/20';
      case 'Em Produção': return 'bg-secondary/10 text-secondary border-secondary/20';
      case 'Revisão': return 'bg-orange-400/10 text-orange-400 border-orange-400/20';
      case 'Finalizado': return 'bg-tertiary/10 text-tertiary border-tertiary/20';
      default: return 'bg-white/10 text-white/40 border-white/20';
    }
  };

  const getStatusProgress = (status: string) => {
    switch (status) {
      case 'Aberto': return 15;
      case 'Em Produção': return 60;
      case 'Revisão': return 90;
      case 'Finalizado': return 100;
      default: return 0;
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
      return format(d, "dd MMM, yyyy", { locale: ptBR });
    } catch (e) {
      return 'N/A';
    }
  };

  return (
    <div className="bg-[#050505] text-white font-body antialiased min-h-screen flex selection:bg-secondary selection:text-on-secondary">
      <ClientSidebar activePage="projects" isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <div className="flex-1 flex flex-col md:ml-64 relative w-full overflow-hidden">
        <div className="fixed bottom-0 right-0 w-[400px] md:w-[800px] h-[400px] md:h-[800px] bg-secondary/5 blur-[100px] md:blur-[150px] rounded-full -z-10 pointer-events-none"></div>
        <div className="fixed top-0 right-0 w-[300px] md:w-[500px] h-[300px] md:h-[500px] bg-primary/5 blur-[80px] md:blur-[120px] rounded-full -z-10 pointer-events-none"></div>

        <ClientTopbar 
          title="Projetos" 
          subtitle="Gerencie suas produções em tempo real." 
          onMenuClick={() => setIsSidebarOpen(true)}
        />

        <main className="p-6 md:p-12 space-y-12 md:space-y-16 max-w-7xl mx-auto w-full">
          <div className="flex justify-between items-end mb-10">
            <div>
              <h2 className="text-5xl font-black tracking-tighter mb-4 font-headline">Meus Projetos</h2>
              <p className="text-white/30 max-w-md text-sm leading-relaxed font-medium">Acompanhe suas produções em andamento e acesse arquivos finais de campanhas concluídas.</p>
            </div>
            <button className="bg-white text-black px-10 py-5 rounded-2xl font-black flex items-center gap-3 hover:bg-secondary hover:text-white transition-all duration-500 shadow-2xl shadow-black text-[10px] uppercase tracking-[0.3em]">
              <span className="material-symbols-outlined text-sm">add</span>
              Novo Projeto
            </button>
          </div>

          <div className="flex gap-6 mb-16 overflow-x-auto pb-6 scrollbar-hide border-b border-white/5">
            <button 
              onClick={() => setFilter('Todos')}
              className={`${filter === 'Todos' ? 'text-secondary border-secondary' : 'text-white/30 border-transparent hover:text-white'} pb-4 text-[10px] font-black uppercase tracking-[0.3em] border-b-2 transition-all duration-300 whitespace-nowrap`}
            >
              Todos Projetos
            </button>
            <button 
              onClick={() => setFilter('Em Produção')}
              className={`${filter === 'Em Produção' ? 'text-secondary border-secondary' : 'text-white/30 border-transparent hover:text-white'} pb-4 text-[10px] font-black uppercase tracking-[0.3em] border-b-2 transition-all duration-300 whitespace-nowrap`}
            >
              Em Produção ({projects.filter(p => p.status === 'Em Produção' || p.status === 'Aberto').length})
            </button>
            <button 
              onClick={() => setFilter('Finalizados')}
              className={`${filter === 'Finalizados' ? 'text-secondary border-secondary' : 'text-white/30 border-transparent hover:text-white'} pb-4 text-[10px] font-black uppercase tracking-[0.3em] border-b-2 transition-all duration-300 whitespace-nowrap`}
            >
              Finalizados ({projects.filter(p => p.status === 'Finalizado').length})
            </button>
            <button 
              onClick={() => setFilter('Aguardando Review')}
              className={`${filter === 'Aguardando Review' ? 'text-secondary border-secondary' : 'text-white/30 border-transparent hover:text-white'} pb-4 text-[10px] font-black uppercase tracking-[0.3em] border-b-2 transition-all duration-300 whitespace-nowrap`}
            >
              Review ({projects.filter(p => p.status === 'Revisão').length})
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-10">
            {loading ? (
              <div className="col-span-12 py-32 text-center">
                <div className="inline-block w-8 h-8 border-2 border-secondary/20 border-t-secondary rounded-full animate-spin mb-4"></div>
                <p className="text-white/20 text-[10px] font-bold uppercase tracking-widest">Sincronizando projetos...</p>
              </div>
            ) : filteredProjects.length === 0 ? (
              <div className="col-span-12 py-32 text-center bg-white/[0.01] rounded-[2.5rem] border border-dashed border-white/10">
                <span className="material-symbols-outlined text-white/10 text-5xl mb-4">movie_off</span>
                <p className="text-white/20 text-[10px] font-bold uppercase tracking-widest">Nenhum projeto encontrado nesta categoria.</p>
              </div>
            ) : (
              filteredProjects.map((project, index) => (
                <motion.div 
                  key={project.id}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`${index % 3 === 0 ? 'lg:col-span-8' : 'lg:col-span-4'} group`}
                >
                  <div className="bg-white/[0.01] backdrop-blur-3xl border border-white/5 rounded-[2.5rem] overflow-hidden h-full flex flex-col relative hover:bg-white/[0.02] transition-all duration-700">
                    <div className={`relative ${index % 3 === 0 ? 'h-[450px]' : 'h-72'} overflow-hidden bg-black`}>
                      <img 
                        alt={project.title} 
                        className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110 opacity-40 group-hover:opacity-60" 
                        src={`https://images.unsplash.com/photo-${index % 2 === 0 ? '1536240478700-b869070f9279' : '1618005182384-a83a8bd57fbe'}?auto=format&fit=crop&q=80&w=1200`} 
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-transparent to-transparent"></div>
                      <div className="absolute top-8 left-8">
                        <span className={`${getStatusColor(project.status)} text-[9px] font-black uppercase tracking-[0.2em] px-5 py-2 rounded-full border backdrop-blur-xl`}>
                          {getStatusLabel(project.status)}
                        </span>
                      </div>
                    </div>
                    <div className="p-10 flex flex-col flex-1">
                      <div className="flex justify-between items-start mb-6">
                        <div>
                          <h3 className={`${index % 3 === 0 ? 'text-4xl' : 'text-2xl'} font-black tracking-tighter mb-3 font-headline group-hover:text-secondary transition-colors duration-500`}>{project.title}</h3>
                          <div className="flex items-center gap-5 text-white/30 text-[10px] font-bold uppercase tracking-widest">
                            <span className="flex items-center gap-2">
                              <span className="material-symbols-outlined text-xs">calendar_today</span> 
                              {formatDate(project.createdAt)}
                            </span>
                            <span className="w-1 h-1 bg-white/10 rounded-full"></span>
                            <span className="flex items-center gap-2">
                              <span className="material-symbols-outlined text-xs">video_library</span> 
                              {project.videoCount || 1} {project.videoCount === 1 ? 'Vídeo' : 'Vídeos'}
                            </span>
                          </div>
                        </div>
                        {project.status === 'Finalizado' && (
                          <button className="bg-white text-black px-8 py-4 rounded-xl font-black hover:bg-secondary hover:text-white transition-all duration-500 flex items-center gap-3 group/btn text-[9px] uppercase tracking-[0.2em] shadow-xl shadow-black">
                            Download
                            <span className="material-symbols-outlined transition-transform group-hover/btn:translate-x-1 text-sm">download</span>
                          </button>
                        )}
                      </div>
                      
                      {(project.status === 'Em Produção' || project.status === 'Aberto') && (
                        <div className="mt-auto space-y-5">
                          <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                            <div 
                              className="bg-gradient-to-r from-secondary to-primary h-full transition-all duration-1000 ease-out"
                              style={{ width: `${getStatusProgress(project.status)}%` }}
                            ></div>
                          </div>
                          <div className="flex justify-between text-[9px] font-black uppercase tracking-[0.3em]">
                            <span className="text-white/20 tracking-widest">Progresso da Produção</span>
                            <span className="text-secondary">{getStatusProgress(project.status)}%</span>
                          </div>
                        </div>
                      )}

                      {project.status === 'Revisão' && (
                        <div className="mt-auto">
                          <button className="w-full bg-secondary/10 border border-secondary/20 py-5 rounded-2xl font-black hover:bg-secondary hover:text-white transition-all duration-500 text-[10px] uppercase tracking-[0.3em] flex justify-center items-center gap-3">
                            <span className="material-symbols-outlined text-sm">rate_review</span>
                            Revisar Agora
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>

          <footer className="pt-12 border-t border-white/5 flex justify-between items-center">
            <p className="text-white/20 text-[10px] uppercase tracking-[0.3em] font-black">Mostrando {filteredProjects.length} de {projects.length} projetos</p>
          </footer>
        </main>
      </div>
    </div>
  );
}
