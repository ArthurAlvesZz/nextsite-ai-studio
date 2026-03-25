import React from 'react';
import { motion } from 'motion/react';
import ClientSidebar from '../components/ClientSidebar';
import ClientTopbar from '../components/ClientTopbar';

export default function ClientSupport() {
  return (
    <div className="bg-[#020202] text-white font-body antialiased min-h-screen flex selection:bg-secondary selection:text-on-secondary">
      <ClientSidebar activePage="support" />

      <div className="flex-1 flex flex-col ml-64 relative">
        <div className="fixed bottom-0 right-0 w-[500px] h-[500px] bg-secondary/5 blur-[120px] rounded-full -z-10 pointer-events-none"></div>
        <div className="fixed top-0 right-0 w-[300px] h-[300px] bg-primary/5 blur-[100px] rounded-full -z-10 pointer-events-none"></div>

        <ClientTopbar title="Suporte" subtitle="Precisa de ajuda? Estamos aqui para você." />

        <main className="p-10 space-y-12 max-w-7xl mx-auto w-full">
          <section className="mb-12">
            <h2 className="text-4xl font-extrabold tracking-tighter text-white mb-4 font-headline">Central de Suporte</h2>
            <p className="text-white/40 text-sm max-w-2xl leading-relaxed font-light">Encontre respostas rápidas para suas dúvidas ou entre em contato com nossa equipe de especialistas para suporte personalizado.</p>
          </section>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
            <div className="bg-white/[0.01] backdrop-blur-3xl border border-white/5 rounded-[2rem] p-8 hover:bg-white/[0.02] transition-colors cursor-pointer group">
              <div className="w-14 h-14 rounded-2xl bg-secondary/10 text-secondary flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined text-2xl">chat</span>
              </div>
              <h3 className="text-xl font-bold text-white mb-2 font-headline">Chat ao Vivo</h3>
              <p className="text-white/40 text-xs font-light mb-6">Fale com um especialista em tempo real para resolver dúvidas urgentes.</p>
              <span className="text-secondary text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
                Iniciar Chat <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </span>
            </div>

            <div className="bg-white/[0.01] backdrop-blur-3xl border border-white/5 rounded-[2rem] p-8 hover:bg-white/[0.02] transition-colors cursor-pointer group">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined text-2xl">mail</span>
              </div>
              <h3 className="text-xl font-bold text-white mb-2 font-headline">Email Support</h3>
              <p className="text-white/40 text-xs font-light mb-6">Envie um email detalhado e responderemos em até 24 horas úteis.</p>
              <span className="text-primary text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
                Enviar Email <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </span>
            </div>

            <div className="bg-white/[0.01] backdrop-blur-3xl border border-white/5 rounded-[2rem] p-8 hover:bg-white/[0.02] transition-colors cursor-pointer group">
              <div className="w-14 h-14 rounded-2xl bg-tertiary/10 text-tertiary flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined text-2xl">menu_book</span>
              </div>
              <h3 className="text-xl font-bold text-white mb-2 font-headline">Base de Conhecimento</h3>
              <p className="text-white/40 text-xs font-light mb-6">Acesse tutoriais, guias e artigos sobre nossos processos e ferramentas.</p>
              <span className="text-tertiary text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
                Acessar Base <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </span>
            </div>
          </div>

          <section>
            <h3 className="text-2xl font-bold text-white mb-8 font-headline">Perguntas Frequentes (FAQ)</h3>
            <div className="space-y-4">
              <div className="bg-white/[0.01] backdrop-blur-3xl border border-white/5 rounded-2xl p-6 hover:bg-white/[0.02] transition-colors cursor-pointer">
                <div className="flex justify-between items-center">
                  <h4 className="font-bold text-white">Como solicito uma revisão no meu projeto?</h4>
                  <span className="material-symbols-outlined text-white/40">expand_more</span>
                </div>
              </div>
              <div className="bg-white/[0.01] backdrop-blur-3xl border border-white/5 rounded-2xl p-6 hover:bg-white/[0.02] transition-colors cursor-pointer">
                <div className="flex justify-between items-center">
                  <h4 className="font-bold text-white">Quais formatos de arquivo são entregues no final?</h4>
                  <span className="material-symbols-outlined text-white/40">expand_more</span>
                </div>
              </div>
              <div className="bg-white/[0.01] backdrop-blur-3xl border border-white/5 rounded-2xl p-6 hover:bg-white/[0.02] transition-colors cursor-pointer">
                <div className="flex justify-between items-center">
                  <h4 className="font-bold text-white">Como faço o upgrade do meu pacote atual?</h4>
                  <span className="material-symbols-outlined text-white/40">expand_more</span>
                </div>
              </div>
              <div className="bg-white/[0.01] backdrop-blur-3xl border border-white/5 rounded-2xl p-6 hover:bg-white/[0.02] transition-colors cursor-pointer">
                <div className="flex justify-between items-center">
                  <h4 className="font-bold text-white">Qual o prazo médio de entrega de um vídeo?</h4>
                  <span className="material-symbols-outlined text-white/40">expand_more</span>
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
