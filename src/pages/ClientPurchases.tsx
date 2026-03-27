import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import ClientSidebar from '../components/ClientSidebar';
import ClientTopbar from '../components/ClientTopbar';
import { auth, db } from '../firebase';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function ClientPurchases() {
  const [purchases, setPurchases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalInvested, setTotalInvested] = useState(0);
  const [filter, setFilter] = useState('Todos');

  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      if (user) {
        const email = user.email || '';
        const accessId = email.split('@')[0];

        // First find the client by accessId
        const clientsQuery = query(
          collection(db, 'clients'),
          where('accessId', '==', accessId)
        );

        const unsubscribeClients = onSnapshot(clientsQuery, (snapshot) => {
          if (!snapshot.empty) {
            const clientDoc = snapshot.docs[0];
            const clientId = clientDoc.id;

            // Then find sales for this client
            const salesQuery = query(
              collection(db, 'sales'),
              where('clientId', '==', clientId),
              orderBy('createdAt', 'desc')
            );

            const unsubscribeSales = onSnapshot(salesQuery, (salesSnapshot) => {
              const salesData = salesSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
              }));
              setPurchases(salesData);
              
              const total = salesData.reduce((acc, sale: any) => acc + (Number(sale.value) || 0), 0);
              setTotalInvested(total);
              setLoading(false);
            });

            return () => unsubscribeSales();
          } else {
            setLoading(false);
          }
        });

        return () => unsubscribeClients();
      } else {
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  const filteredPurchases = purchases.filter(p => {
    if (filter === 'Todos') return true;
    return p.status === filter;
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  return (
    <div className="bg-[#050505] text-white font-body antialiased min-h-screen flex selection:bg-secondary selection:text-on-secondary">
      <ClientSidebar activePage="purchases" />

      <div className="flex-1 flex flex-col ml-64 relative">
        <div className="fixed bottom-0 right-0 w-[800px] h-[800px] bg-secondary/5 blur-[150px] rounded-full -z-10 pointer-events-none"></div>
        <div className="fixed top-0 right-0 w-[500px] h-[500px] bg-primary/5 blur-[120px] rounded-full -z-10 pointer-events-none"></div>

        <ClientTopbar title="Finanças" subtitle="Histórico de investimentos e pacotes." />

        <main className="p-12 space-y-16 max-w-7xl mx-auto w-full">
          <section className="mb-16">
            <h2 className="text-5xl font-black tracking-tighter text-white mb-6 font-headline">Meus Pacotes</h2>
            <p className="text-white/30 text-sm max-w-2xl leading-relaxed font-medium">Acompanhe seu histórico de investimentos e pacotes de vídeos contratados. Gerencie seus recibos e visualize o status de cada transação em tempo real.</p>
          </section>

          <div className="grid grid-cols-12 gap-10 mb-16">
            <div className="col-span-12 md:col-span-8 flex items-end gap-6">
              <div className="flex-1">
                <label className="block text-[10px] uppercase tracking-[0.3em] text-white/30 mb-4 ml-1 font-black font-headline">Filtrar por Status</label>
                <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide border-b border-white/5">
                  <button 
                    onClick={() => setFilter('Todos')}
                    className={`pb-3 text-[10px] font-black uppercase tracking-[0.3em] transition-all duration-300 border-b-2 ${filter === 'Todos' ? 'text-secondary border-secondary' : 'text-white/20 border-transparent hover:text-white'}`}
                  >
                    Todos
                  </button>
                  <button 
                    onClick={() => setFilter('Confirmado')}
                    className={`pb-3 text-[10px] font-black uppercase tracking-[0.3em] transition-all duration-300 border-b-2 ${filter === 'Confirmado' ? 'text-secondary border-secondary' : 'text-white/20 border-transparent hover:text-white'}`}
                  >
                    Confirmado
                  </button>
                  <button 
                    onClick={() => setFilter('Processando')}
                    className={`pb-3 text-[10px] font-black uppercase tracking-[0.3em] transition-all duration-300 border-b-2 ${filter === 'Processando' ? 'text-secondary border-secondary' : 'text-white/20 border-transparent hover:text-white'}`}
                  >
                    Processando
                  </button>
                </div>
              </div>
            </div>
            <div className="col-span-12 md:col-span-4 bg-white/[0.01] backdrop-blur-3xl border border-white/5 rounded-[2.5rem] p-10 flex flex-col justify-center hover:bg-white/[0.02] transition-all duration-500">
              <span className="text-white/30 text-[10px] uppercase tracking-[0.3em] mb-3 font-black font-headline">Investimento Total</span>
              <div className="flex items-baseline gap-3">
                <span className="text-4xl font-black text-secondary font-headline tracking-tighter">{formatCurrency(totalInvested)}</span>
              </div>
            </div>
          </div>

          <div className="bg-white/[0.01] backdrop-blur-3xl border border-white/5 rounded-[2.5rem] overflow-hidden mb-16">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-white/[0.02] border-b border-white/5">
                    <th className="px-10 py-8 text-[10px] uppercase tracking-[0.3em] text-white/30 font-black font-headline">Data</th>
                    <th className="px-10 py-8 text-[10px] uppercase tracking-[0.3em] text-white/30 font-black font-headline">Plano</th>
                    <th className="px-10 py-8 text-[10px] uppercase tracking-[0.3em] text-white/30 font-black font-headline">Código</th>
                    <th className="px-10 py-8 text-[10px] uppercase tracking-[0.3em] text-white/30 font-black font-headline">Valor</th>
                    <th className="px-10 py-8 text-[10px] uppercase tracking-[0.3em] text-white/30 font-black font-headline">Status</th>
                    <th className="px-10 py-8 text-[10px] uppercase tracking-[0.3em] text-white/30 font-black font-headline text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="px-10 py-16 text-center text-white/20 text-[10px] font-black uppercase tracking-widest">Sincronizando histórico...</td>
                    </tr>
                  ) : filteredPurchases.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-10 py-16 text-center text-white/20 text-[10px] font-black uppercase tracking-widest">Nenhum registro encontrado.</td>
                    </tr>
                  ) : (
                    filteredPurchases.map((purchase) => (
                      <tr key={purchase.id} className="hover:bg-white/[0.02] transition-all duration-300 group">
                        <td className="px-10 py-8">
                          <span className="text-sm font-black text-white group-hover:text-secondary transition-colors">
                            {purchase.createdAt?.toDate ? format(purchase.createdAt.toDate(), "dd MMM, yyyy", { locale: ptBR }) : 'N/A'}
                          </span>
                        </td>
                        <td className="px-10 py-8">
                          <div className="flex items-center gap-6">
                            <div className="w-12 h-12 rounded-2xl bg-secondary/10 border border-secondary/20 flex items-center justify-center text-secondary group-hover:bg-secondary group-hover:text-white transition-all duration-500">
                              <span className="material-symbols-outlined text-sm">video_camera_front</span>
                            </div>
                            <div>
                              <p className="text-sm font-black text-white group-hover:text-secondary transition-colors">{purchase.plan}</p>
                              <p className="text-[10px] text-white/30 mt-1 font-bold uppercase tracking-widest">Pacote de Vídeos</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-10 py-8">
                          <span className="text-[10px] font-bold font-mono text-white/20 uppercase tracking-widest">#{purchase.id.slice(0, 8).toUpperCase()}</span>
                        </td>
                        <td className="px-10 py-8">
                          <span className="text-sm font-black text-white">{formatCurrency(Number(purchase.value) || 0)}</span>
                        </td>
                        <td className="px-10 py-8">
                          <span className={`inline-flex items-center px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-[0.2em] border backdrop-blur-xl ${
                            purchase.status === 'Confirmado' 
                              ? 'bg-tertiary/10 text-tertiary border-tertiary/20' 
                              : purchase.status === 'Processando'
                              ? 'bg-secondary/10 text-secondary border-secondary/20'
                              : 'bg-white/10 text-white/40 border-white/20'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full mr-2 ${
                              purchase.status === 'Confirmado' 
                                ? 'bg-tertiary shadow-[0_0_8px_rgba(0,255,153,0.5)]' 
                                : purchase.status === 'Processando'
                                ? 'bg-secondary shadow-[0_0_8px_rgba(233,179,255,0.5)]'
                                : 'bg-white/40'
                            }`}></span>
                            {purchase.status || 'Pendente'}
                          </span>
                        </td>
                        <td className="px-10 py-8 text-right">
                          <div className="flex items-center justify-end gap-4">
                            <button className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white hover:text-black transition-all duration-500 flex items-center justify-center border border-white/5">
                              <span className="material-symbols-outlined text-sm">download</span>
                            </button>
                            <button className="text-[9px] font-black text-white/20 hover:text-secondary transition-all duration-300 uppercase tracking-[0.2em]">Detalhes</button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            
            <div className="p-10 bg-white/[0.01] border-t border-white/5 flex justify-between items-center">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20">Total de {purchases.length} registros</p>
            </div>
          </div>

          <div className="grid grid-cols-12 gap-10">
            <div className="col-span-12 lg:col-span-7 h-80 relative rounded-[2.5rem] overflow-hidden group cursor-pointer border border-white/5">
              <img className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110 opacity-40" src="https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&q=80&w=1200" alt="Upgrade" />
              <div className="absolute inset-0 bg-gradient-to-r from-[#050505] via-[#050505]/80 to-transparent p-12 flex flex-col justify-center">
                <span className="text-secondary text-[10px] font-black uppercase tracking-[0.4em] mb-4">Upgrade Disponível</span>
                <h3 className="text-4xl font-black text-white mb-8 leading-tight font-headline tracking-tighter">Mude para o plano Unlimited<br/>e economize 30%</h3>
                <div>
                  <button className="px-10 py-5 bg-white text-black rounded-2xl font-black text-[10px] uppercase tracking-[0.3em] hover:bg-secondary hover:text-white transition-all duration-500 shadow-2xl shadow-black">Saiba Mais</button>
                </div>
              </div>
            </div>
            <div className="col-span-12 lg:col-span-5 bg-white/[0.01] backdrop-blur-3xl border border-white/5 rounded-[2.5rem] p-12 flex flex-col justify-between hover:bg-white/[0.02] transition-all duration-700">
              <div>
                <h4 className="text-3xl font-black text-white mb-4 font-headline tracking-tighter">Precisa de suporte?</h4>
                <p className="text-white/30 text-sm leading-relaxed font-medium">Nossa equipe financeira está disponível para tirar dúvidas sobre seus pagamentos ou faturamento corporativo.</p>
              </div>
              <a className="flex items-center gap-3 text-secondary font-black text-[10px] uppercase tracking-[0.3em] group mt-10" href="#">
                Falar com especialista 
                <span className="material-symbols-outlined text-sm transition-transform group-hover:translate-x-2">arrow_forward</span>
              </a>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
