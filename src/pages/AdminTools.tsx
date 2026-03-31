import React, { useState, useEffect } from 'react';
import SEO from '../components/SEO';
import { Link, useNavigate } from 'react-router-dom';
import AdminSidebar from '../components/AdminSidebar';
import { motion } from 'motion/react';
import { useAuth } from '../hooks/useAuth';

export default function AdminTools() {
  const { adminProfile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Route Protection
  useEffect(() => {
    if (!authLoading && adminProfile) {
      if (adminProfile.role?.toLowerCase() !== 'owner') {
        navigate('/admin/dashboard', { replace: true });
      }
    }
  }, [adminProfile, authLoading, navigate]);

  const manuals = [
    {
      title: 'Manual de Cultura',
      description: 'O Brand Book completo com visão, missão e tom de voz da Next Creatives.',
      icon: 'description',
      color: 'from-secondary/20 to-secondary/40',
      textColor: 'text-secondary',
      borderColor: 'border-secondary/20'
    },
    {
      title: 'Manual de Vendas',
      description: 'Scripts de prospecção, fluxos de vendas e guias de fechamento comercial.',
      icon: 'auto_awesome_motion',
      color: 'from-primary/20 to-primary/40',
      textColor: 'text-primary',
      borderColor: 'border-primary/20'
    },
    {
      title: 'Manual de Produção',
      description: 'Workflows de edição, exportação de arquivos e diretrizes de captação.',
      icon: 'movie',
      color: 'from-white/10 to-white/20',
      textColor: 'text-white',
      borderColor: 'border-white/20'
    }
  ];

  const tools = [
    { name: 'Remove WaterMark Sora 2', icon: 'water_drop', color: 'text-secondary', link: '/admin/sora-remover' },
    { name: 'NextZap CRM', icon: 'chat', color: 'text-[#00a884]', link: '/admin/nextzap' },
    { name: 'Lead Engine', icon: 'target', color: 'text-secondary', link: '/admin/lead-engine' },
    { name: 'Color Palettes', icon: 'palette', color: 'text-secondary/70' }
  ];

  if (authLoading || (adminProfile && adminProfile.role !== 'owner')) {
    return <div className="min-h-screen bg-[#020202] flex items-center justify-center">
      <div className="w-12 h-12 border-4 border-secondary/20 border-t-secondary rounded-full animate-spin"></div>
    </div>;
  }

  return (
    <div className="min-h-screen bg-[#020202] text-white font-body selection:bg-secondary selection:text-on-secondary flex">
      <SEO title="Ferramentas" />
      <AdminSidebar activePage="tools" isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <main className="lg:ml-64 w-full flex-1 min-h-screen relative flex flex-col">
        {/* Decorative Background Elements */}
        <div className="fixed bottom-0 right-0 w-[500px] h-[500px] bg-secondary/5 blur-[120px] rounded-full -z-10 pointer-events-none"></div>
        <div className="fixed top-0 right-0 w-[300px] h-[300px] bg-primary/5 blur-[100px] rounded-full -z-10 pointer-events-none"></div>

        <div className="pt-32 pb-20 px-6 lg:px-12 max-w-7xl mx-auto w-full">
          {/* Hero Section */}
          <section className="mb-24 max-w-4xl">
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-5xl lg:text-7xl font-extrabold tracking-tighter text-white font-headline mb-8 leading-[1.05]"
            >
              Central de Recursos <br/>
              <span className="font-serif italic text-secondary font-light">& Ferramentas</span>
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-lg lg:text-xl text-white/40 font-light max-w-2xl leading-relaxed"
            >
              Tudo o que a equipe precisa para produzir com excelência. Acesse diretrizes, ferramentas externas e bibliotecas de ativos.
            </motion.p>
          </section>

          {/* Manuals Section */}
          <section className="mb-28">
            <div className="flex items-center gap-6 mb-16">
              <h3 className="text-[10px] font-bold tracking-[0.4em] text-white/20 uppercase whitespace-nowrap">Manuais da Empresa</h3>
              <div className="h-px flex-1 bg-gradient-to-r from-white/5 to-transparent"></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
              {manuals.map((manual, index) => (
                <motion.div
                  key={manual.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + index * 0.1 }}
                  className="bg-white/[0.01] backdrop-blur-3xl p-10 rounded-[2.5rem] border border-white/5 flex flex-col h-full group hover:bg-white/[0.03] hover:border-secondary/20 transition-all duration-700 relative overflow-hidden"
                >
                  <div className={`absolute -right-10 -top-10 w-40 h-40 bg-gradient-to-br ${manual.color} blur-[80px] opacity-0 group-hover:opacity-100 transition-all duration-1000`}></div>
                  
                  <div className={`mb-10 w-16 h-16 rounded-2xl flex items-center justify-center border ${manual.borderColor} bg-white/[0.02] relative z-10 group-hover:scale-110 transition-transform duration-700`}>
                    <span className={`material-symbols-outlined ${manual.textColor} text-3xl`}>{manual.icon}</span>
                  </div>
                  
                  <h4 className="text-2xl font-headline font-bold text-white mb-4 relative z-10 tracking-tight">{manual.title}</h4>
                  <p className="text-white/40 text-sm mb-10 leading-relaxed relative z-10 font-light">{manual.description}</p>
                  
                  <div className="mt-auto flex flex-col gap-4 relative z-10">
                    <button className="w-full bg-white/5 hover:bg-secondary hover:text-on-secondary border border-white/10 hover:border-secondary text-white font-bold py-5 rounded-2xl transition-all text-[10px] uppercase tracking-[0.2em] shadow-2xl">
                      Visualizar PDF
                    </button>
                    <button className="w-full flex items-center justify-center gap-3 py-2 text-[10px] font-bold uppercase tracking-[0.2em] text-white/20 hover:text-white transition-colors">
                      <span className="material-symbols-outlined text-sm">download</span>
                      Download
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          </section>

          {/* Toolkit Section */}
          <section>
            <div className="flex items-center gap-6 mb-16">
              <h3 className="text-[10px] font-bold tracking-[0.4em] text-white/20 uppercase whitespace-nowrap">Toolkit de Produção</h3>
              <div className="h-px flex-1 bg-gradient-to-r from-white/5 to-transparent"></div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
              {tools.map((tool, index) => (
                <motion.div
                  key={tool.name}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.5 + index * 0.1 }}
                  className="bg-white/[0.01] p-10 rounded-[2rem] border border-white/5 hover:border-secondary/20 transition-all duration-500 flex flex-col items-center text-center group hover:bg-white/[0.03]"
                >
                  <div className="w-20 h-20 rounded-3xl bg-white/[0.02] flex items-center justify-center mb-8 group-hover:scale-110 transition-transform duration-700 border border-white/5 group-hover:border-secondary/20">
                    <span className={`material-symbols-outlined ${tool.color} text-4xl`}>{tool.icon}</span>
                  </div>
                  <span className="text-white font-bold text-sm mb-8 tracking-tight font-headline">{tool.name}</span>
                  <Link 
                    to={tool.link || '#'} 
                    className="w-full py-4 bg-white/5 rounded-xl text-[10px] font-bold tracking-[0.2em] uppercase text-white/30 hover:bg-secondary hover:text-on-secondary transition-all border border-white/5 hover:border-secondary flex items-center justify-center"
                  >
                    Acessar
                  </Link>
                </motion.div>
              ))}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
