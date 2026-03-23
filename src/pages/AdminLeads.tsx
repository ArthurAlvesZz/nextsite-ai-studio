import React, { useState, useEffect } from 'react';
import AdminSidebar from '../components/AdminSidebar';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Loader2, Globe, CheckCircle2, AlertCircle, ExternalLink, Building2, Instagram, MessageCircle, MapPin, Database, Clock } from 'lucide-react';
import { collection, addDoc, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db, auth } from '../firebase';

import { onAuthStateChanged } from 'firebase/auth';

interface Lead {
  id?: string;
  nome: string;
  site: string;
  plataformas: string;
  termoBusca?: string;
  createdAt?: string;
  contatos?: {
    instagram: string;
    whatsapp: string;
  };
}

interface Dork {
  id?: string;
  termo: string;
  createdAt?: string;
}

const PRE_SELECOES = [
  {
    label: "🛒 E-commerce Geral (Alta Escala - Shopify/CartPanda)",
    dork: 'site:.br inurl:"/collections/todos" OR inurl:"/produtos/" "comprar agora" "CNPJ" -blog -curso -tutorial'
  },
  {
    label: "🛍️ Lojas Nuvemshop (Foco em Produtos Físicos)",
    // Nuvemshop no Brasil usa essa exata frase no rodapé de lojas profissionais
    dork: 'site:.br "Tecnologia Nuvemshop" "CNPJ" "Frete" -blog -reclameaqui -forum'
  },
  {
    label: "👗 Moda e Vestuário (Ticket Médio Alto)",
    dork: 'site:.br inurl:"/categoria/" "moda feminina" OR "roupas" "CNPJ" "trocas e devoluções" -pinterest -blog'
  },
  {
    label: "🦷 Clínicas Premium (Odonto/Estética)",
    dork: 'site:.br "agendar avaliação" OR "marcar consulta" "harmonização" OR "implante" "CNPJ" -jusbrasil -vagas'
  },
  {
    label: "📦 Lojas de Dropshipping (Foco em Vídeos Virais)",
    dork: 'site:.br "prazo de entrega" "código de rastreio" "política de reembolso" "CNPJ" -correios -reclameaqui'
  }
];

export default function AdminLeads() {
  const [activeTab, setActiveTab] = useState<'buscar' | 'colhidos' | 'dorks'>('buscar');
  const [termoBusca, setTermoBusca] = useState('');
  const [numResults, setNumResults] = useState(15);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [loading, setLoading] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [status, setStatus] = useState('');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [savedLeads, setSavedLeads] = useState<Lead[]>([]);
  const [dorks, setDorks] = useState<Dork[]>([]);
  const [newDork, setNewDork] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (!user) {
        setSavedLeads([]);
        setDorks([]);
        return;
      }
      
      const q = query(collection(db, 'leads'), orderBy('createdAt', 'desc'));
      const unsubscribeLeads = onSnapshot(q, (snapshot) => {
        const leadsData: Lead[] = [];
        snapshot.forEach((doc) => {
          leadsData.push({ id: doc.id, ...doc.data() } as Lead);
        });
        setSavedLeads(leadsData);
      }, (error) => {
        console.error("Erro ao buscar leads salvos:", error);
      });

      const qDorks = query(collection(db, 'dorks'), orderBy('createdAt', 'desc'));
      const unsubscribeDorks = onSnapshot(qDorks, (snapshot) => {
        const dorksData: Dork[] = [];
        snapshot.forEach((doc) => {
          dorksData.push({ id: doc.id, ...doc.data() } as Dork);
        });
        setDorks(dorksData);
      }, (error) => {
        console.error("Erro ao buscar dorks salvos:", error);
      });

      return () => {
        unsubscribeLeads();
        unsubscribeDorks();
      };
    });

    return () => unsubscribeAuth();
  }, []);

  const testarConexao = async () => {
    setTestingConnection(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await fetch('/api/testar-serpapi');
      const data = await res.json();
      if (data.sucesso) {
        setSuccessMsg(data.message);
      } else {
        setError(data.error || 'Falha na conexão.');
      }
    } catch (e) {
      setError('Erro ao conectar com o servidor.');
    } finally {
      setTestingConnection(false);
    }
  };

  const buscarLeads = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!termoBusca) return;

    const opcaoEscolhida = PRE_SELECOES.find(opt => opt.label === termoBusca);
    const dorkExistente = dorks.find(d => d.termo === termoBusca);
    
    if (!opcaoEscolhida && !dorkExistente) {
      alert("Por favor, selecione uma das opções válidas na lista.");
      return;
    }

    const dorkFinal = opcaoEscolhida ? opcaoEscolhida.dork : termoBusca;

    setLoading(true);
    setStatus('Iniciando busca na SerpApi...');
    setError(null);
    setSuccessMsg(null);
    setLeads([]);
    
    try {
      // Simulando progresso para o usuário
      const statusInterval = setInterval(() => {
        setStatus(prev => {
          if (prev.includes('SerpApi')) return 'Analisando sites encontrados...';
          if (prev.includes('Analisando')) return 'Verificando pixels de rastreamento...';
          if (prev.includes('Verificando')) return 'Quase lá, finalizando varredura...';
          return prev;
        });
      }, 3000);

      const savedUrls = savedLeads.map(lead => lead.site);

      const response = await fetch('/api/buscar-leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          termoBusca: dorkFinal, 
          num: numResults,
          savedUrls
        }) 
      });

      clearInterval(statusInterval);
      const data = await response.json();
      
      if (data.sucesso) {
        setLeads(data.leads);
        
        // Salvar leads no Firestore
        if (data.leads.length > 0) {
          const leadsRef = collection(db, 'leads');
          const timestamp = new Date().toISOString();
          const uid = auth.currentUser?.uid || 'unknown';
          
          for (const lead of data.leads) {
            try {
              await addDoc(leadsRef, {
                ...lead,
                termoBusca,
                createdAt: timestamp,
                createdBy: uid
              });
            } catch (e) {
              console.error("Erro ao salvar lead:", e);
            }
          }
          
          // Mudar para a aba de leads colhidos após salvar
          setActiveTab('colhidos');
        }

        if (data.leads.length === 0) {
          setError('Nenhum lead com pixel detectado nesta região ou todos já foram colhidos.');
        }
      } else {
        setError(data.error || 'Erro ao buscar leads.');
      }
    } catch (error) {
      console.error("Erro ao buscar leads:", error);
      setError('Falha na conexão com o servidor. Verifique se a SERPAPI_KEY está configurada.');
    } finally {
      setLoading(false);
      setStatus('');
    }
  };

  const salvarDork = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDork) return;

    try {
      const dorksRef = collection(db, 'dorks');
      await addDoc(dorksRef, {
        termo: newDork,
        createdAt: new Date().toISOString()
      });
      setNewDork('');
      setSuccessMsg('Dork salvo com sucesso!');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (error) {
      console.error("Erro ao salvar dork:", error);
      setError('Erro ao salvar dork.');
    }
  };

  return (
    <div className="min-h-screen bg-[#020202] text-white font-body selection:bg-secondary selection:text-on-secondary flex">
      <AdminSidebar activePage="leads" />

      <main className="ml-64 flex-1 min-h-screen relative flex flex-col">
        {/* Decorative Background Elements */}
        <div className="fixed bottom-0 right-0 w-[500px] h-[500px] bg-secondary/5 blur-[120px] rounded-full -z-10 pointer-events-none"></div>
        <div className="fixed top-0 right-0 w-[300px] h-[300px] bg-primary/5 blur-[100px] rounded-full -z-10 pointer-events-none"></div>

          <div className="pt-32 pb-20 px-12 max-w-7xl mx-auto w-full space-y-12">
            {/* Header Section */}
            <section className="mb-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center justify-between mb-6"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-secondary/20 flex items-center justify-center border border-secondary/30">
                  <Search className="text-secondary w-6 h-6" />
                </div>
                <h2 className="text-[10px] font-bold tracking-[0.4em] text-secondary uppercase">Ferramenta de Prospecção</h2>
              </div>
              
              <div className="flex items-center gap-2 bg-white/5 p-1.5 rounded-2xl border border-white/10">
                <button
                  onClick={() => setActiveTab('buscar')}
                  className={`px-6 py-3 rounded-xl text-[10px] font-bold tracking-[0.2em] uppercase transition-all ${
                    activeTab === 'buscar' 
                      ? 'bg-secondary text-on-secondary shadow-lg' 
                      : 'text-white/40 hover:text-white hover:bg-white/5'
                  }`}
                >
                  Buscar Leads
                </button>
                <button
                  onClick={() => setActiveTab('colhidos')}
                  className={`px-6 py-3 rounded-xl text-[10px] font-bold tracking-[0.2em] uppercase transition-all flex items-center gap-2 ${
                    activeTab === 'colhidos' 
                      ? 'bg-secondary text-on-secondary shadow-lg' 
                      : 'text-white/40 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Database className="w-3 h-3" />
                  Leads Colhidos
                  {savedLeads.length > 0 && (
                    <span className={`ml-2 px-2 py-0.5 rounded-full text-[9px] ${activeTab === 'colhidos' ? 'bg-black/20' : 'bg-white/10'}`}>
                      {savedLeads.length}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setActiveTab('dorks')}
                  className={`px-6 py-3 rounded-xl text-[10px] font-bold tracking-[0.2em] uppercase transition-all flex items-center gap-2 ${
                    activeTab === 'dorks' 
                      ? 'bg-secondary text-on-secondary shadow-lg' 
                      : 'text-white/40 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Search className="w-3 h-3" />
                  Dorks
                </button>
              </div>
            </motion.div>

            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-7xl font-extrabold tracking-tighter text-white font-headline mb-8 leading-[1.05]"
            >
              {activeTab === 'buscar' ? (
                <>
                  Buscar <br/>
                  <span className="font-serif italic text-secondary font-light">Leads Quentes</span>
                </>
              ) : activeTab === 'colhidos' ? (
                <>
                  Leads <br/>
                  <span className="font-serif italic text-secondary font-light">Colhidos</span>
                </>
              ) : (
                <>
                  Gerenciar <br/>
                  <span className="font-serif italic text-secondary font-light">Dorks</span>
                </>
              )}
            </motion.h1>
            
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-xl text-white/40 font-light max-w-2xl leading-relaxed"
            >
              {activeTab === 'buscar' 
                ? 'Varra a internet em busca de pegadas tecnológicas (Footprints) e preencha sua base de leads no automático usando buscas avançadas.'
                : activeTab === 'colhidos'
                ? 'Histórico de todos os leads pesquisados e salvos pela equipe. Acesse rapidamente os contatos e plataformas detectadas.'
                : 'Gerencie os termos de busca avançados (Dorks) que serão utilizados pela automação (Cron Job) para colher leads diariamente.'}
            </motion.p>
          </section>

          {activeTab === 'buscar' ? (
            <>
              {/* Search Form */}
              <section className="mb-12">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white/[0.02] backdrop-blur-3xl p-10 rounded-[3rem] border border-white/10 shadow-2xl relative overflow-hidden group"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-secondary/50 to-transparent opacity-30"></div>
              
              <form onSubmit={buscarLeads} className="flex flex-col gap-8">
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col md:flex-row gap-6 items-end">
                    <div className="flex-1 space-y-3 w-full">
                      <label className="text-[10px] font-bold tracking-[0.2em] text-white/40 uppercase ml-4 flex items-center gap-2">
                        <div className="w-1 h-1 rounded-full bg-secondary"></div>
                        Selecione o Público Alvo:
                      </label>
                      <div className="relative">
                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20" />
                        <input 
                          list="opcoes-nichos"
                          value={termoBusca}
                          onChange={(e) => setTermoBusca(e.target.value)}
                          placeholder='Digite ou clique para selecionar o nicho...'
                          className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-5 pl-14 pr-6 text-white placeholder:text-white/10 focus:outline-none focus:border-secondary/50 focus:bg-white/[0.05] transition-all font-light text-lg"
                          required
                        />
                        <datalist id="opcoes-nichos">
                          {PRE_SELECOES.map((opcao, index) => (
                            <option key={index} value={opcao.label} />
                          ))}
                          {dorks.map((dork, index) => (
                            <option key={`dork-${index}`} value={dork.termo} />
                          ))}
                        </datalist>
                      </div>
                    </div>

                    <button 
                      type="submit"
                      disabled={loading || !termoBusca}
                      className="bg-secondary text-on-secondary font-bold py-5 px-12 rounded-2xl transition-all text-[11px] uppercase tracking-[0.2em] shadow-[0_20px_40px_rgba(242,125,38,0.2)] hover:shadow-[0_20px_60px_rgba(242,125,38,0.4)] hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-3 h-[68px] min-w-[220px] relative overflow-hidden group"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                      {loading ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Varrendo...
                        </>
                      ) : (
                        <>
                          <Search className="w-5 h-5" />
                          Buscar Leads
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Advanced Options Toggle */}
                <div className="pt-4 border-t border-white/5 flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-6">
                    <button 
                      type="button"
                      onClick={() => setShowAdvanced(!showAdvanced)}
                      className="text-[10px] font-bold tracking-widest text-white/40 uppercase hover:text-secondary transition-colors flex items-center gap-2"
                    >
                      {showAdvanced ? 'Ocultar Opções' : 'Opções Avançadas'}
                      <motion.span animate={{ rotate: showAdvanced ? 180 : 0 }}>▼</motion.span>
                    </button>

                    <button 
                      type="button"
                      onClick={testarConexao}
                      disabled={testingConnection}
                      className="text-[10px] font-bold tracking-widest text-white/40 uppercase hover:text-emerald-400 transition-colors flex items-center gap-2"
                    >
                      {testingConnection ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                      Testar API Key
                    </button>
                  </div>

                  <AnimatePresence>
                    {showAdvanced && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="w-full grid grid-cols-1 md:grid-cols-3 gap-6 pt-4"
                      >
                        <div className="space-y-2">
                          <label className="text-[9px] font-bold tracking-widest text-white/20 uppercase ml-2">Qtd. Resultados</label>
                          <select 
                            value={numResults}
                            onChange={(e) => setNumResults(Number(e.target.value))}
                            className="w-full bg-white/[0.03] border border-white/10 rounded-xl py-3 px-4 text-white/60 text-xs focus:outline-none focus:border-secondary/30"
                          >
                            <option value={10}>10 Resultados</option>
                            <option value={15}>15 Resultados (Padrão)</option>
                            <option value={20}>20 Resultados</option>
                            <option value={30}>30 Resultados</option>
                            <option value={50}>50 Resultados</option>
                          </select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[9px] font-bold tracking-widest text-white/20 uppercase ml-2">País / Idioma</label>
                          <div className="bg-white/[0.03] border border-white/10 rounded-xl py-3 px-4 text-white/40 text-xs">
                            Brasil (br) / Português (pt-br)
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[9px] font-bold tracking-widest text-white/20 uppercase ml-2">Motor de Busca</label>
                          <div className="bg-white/[0.03] border border-white/10 rounded-xl py-3 px-4 text-white/40 text-xs">
                            Google Search (SerpApi)
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </form>
            </motion.div>
          </section>

          {/* Results Section */}
          <section>
            <AnimatePresence mode="wait">
              {loading ? (
                <motion.div 
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center justify-center py-20 text-center"
                >
                  <div className="relative w-20 h-20 mb-8">
                    <div className="absolute inset-0 border-4 border-secondary/20 rounded-full"></div>
                    <div className="absolute inset-0 border-4 border-secondary border-t-transparent rounded-full animate-spin"></div>
                  </div>
                  <h3 className="text-2xl font-headline font-light text-white mb-2">{status || 'Analisando Sites...'}</h3>
                  <p className="text-white/30 font-light max-w-sm">Estamos verificando os pixels de rastreamento nos sites encontrados. Isso pode levar alguns segundos.</p>
                </motion.div>
              ) : error ? (
                <motion.div 
                  key="error"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="bg-red-500/10 border border-red-500/20 p-10 rounded-[2.5rem] flex items-center gap-8 text-red-400 shadow-2xl"
                >
                  <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center shrink-0">
                    <AlertCircle className="w-8 h-8" />
                  </div>
                  <div>
                    <h4 className="font-bold uppercase tracking-[0.3em] text-xs mb-2">Erro na Operação</h4>
                    <p className="text-lg font-light opacity-90 leading-relaxed">{error}</p>
                  </div>
                </motion.div>
              ) : successMsg ? (
                <motion.div 
                  key="success"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="bg-emerald-500/10 border border-emerald-500/20 p-10 rounded-[2.5rem] flex items-center gap-8 text-emerald-400 shadow-2xl"
                >
                  <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <div>
                    <h4 className="font-bold uppercase tracking-[0.3em] text-xs mb-2">Sucesso</h4>
                    <p className="text-lg font-light opacity-90 leading-relaxed">{successMsg}</p>
                  </div>
                </motion.div>
              ) : leads.length > 0 ? (
                <motion.div 
                  key="results"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-6"
                >
                  <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                      <h3 className="text-[10px] font-bold tracking-[0.4em] text-white/20 uppercase">Leads Encontrados</h3>
                      <span className="bg-secondary/20 text-secondary text-[10px] font-bold px-3 py-1 rounded-full border border-secondary/30">
                        {leads.length} RESULTADOS
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    {leads.map((lead, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="bg-white/[0.01] backdrop-blur-3xl p-6 rounded-3xl border border-white/5 flex flex-col md:flex-row items-center justify-between group hover:bg-white/[0.03] hover:border-secondary/20 transition-all duration-500"
                      >
                        <div className="flex items-center gap-6 mb-4 md:mb-0">
                          <div className="w-14 h-14 rounded-2xl bg-white/[0.02] border border-white/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
                            <Building2 className="text-white/40 w-6 h-6" />
                          </div>
                          <div>
                            <h4 className="text-xl font-headline font-bold text-white mb-1 tracking-tight">{lead.nome}</h4>
                            <div className="flex items-center gap-4">
                              <a 
                                href={lead.site} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-secondary text-xs font-light hover:underline flex items-center gap-1"
                              >
                                {lead.site.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')}
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-8">
                          <div className="text-right">
                            <p className="text-[10px] font-bold tracking-[0.2em] text-white/20 uppercase mb-1">Plataformas Detectadas</p>
                            <div className="flex items-center gap-2 justify-end">
                              <CheckCircle2 className="w-4 h-4 text-secondary" />
                              <span className="text-sm font-bold text-white/80">{lead.plataformas}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            {lead.contatos?.instagram && lead.contatos.instagram !== 'Não encontrado' && (
                              <a 
                                href={lead.contatos.instagram}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-secondary hover:border-secondary/50 hover:bg-secondary/10 transition-all duration-300 group/btn"
                                title="Abrir Instagram"
                              >
                                <Instagram className="w-5 h-5 group-hover/btn:scale-110 transition-transform" />
                              </a>
                            )}
                            {lead.contatos?.whatsapp && lead.contatos.whatsapp !== 'Não encontrado' && (
                              <a 
                                href={lead.contatos.whatsapp}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-emerald-400 hover:border-emerald-500/50 hover:bg-emerald-500/10 transition-all duration-300 group/btn"
                                title="Abrir WhatsApp"
                              >
                                <MessageCircle className="w-5 h-5 group-hover/btn:scale-110 transition-transform" />
                              </a>
                            )}
                          </div>
                          
                          <button className="bg-white/5 hover:bg-secondary hover:text-on-secondary border border-white/10 hover:border-secondary text-white font-bold py-4 px-8 rounded-2xl transition-all text-[10px] uppercase tracking-[0.2em]">
                            Abrir no CRM
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              ) : (
                <motion.div 
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center justify-center py-32 text-center opacity-20"
                >
                  <Search className="w-20 h-20 mb-8 font-thin" strokeWidth={1} />
                  <h3 className="text-2xl font-headline font-light text-white mb-2">Nenhum Lead Carregado</h3>
                  <p className="text-white/60 font-light max-w-sm">Preencha o termo de busca avançado acima para iniciar a varredura automática.</p>
                </motion.div>
              )}
            </AnimatePresence>
          </section>
            </>
          ) : activeTab === 'colhidos' ? (
            <section>
              <AnimatePresence mode="wait">
                {savedLeads.length > 0 ? (
                  <motion.div 
                    key="saved-results"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-6"
                  >
                    <div className="flex items-center justify-between mb-8">
                      <div className="flex items-center gap-4">
                        <h3 className="text-[10px] font-bold tracking-[0.4em] text-white/20 uppercase">Histórico de Leads</h3>
                        <span className="bg-secondary/20 text-secondary text-[10px] font-bold px-3 py-1 rounded-full border border-secondary/30">
                          {savedLeads.length} SALVOS
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                      {savedLeads.map((lead, index) => (
                        <motion.div
                          key={lead.id || index}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="bg-white/[0.01] backdrop-blur-3xl p-6 rounded-3xl border border-white/5 flex flex-col md:flex-row items-center justify-between group hover:bg-white/[0.03] hover:border-secondary/20 transition-all duration-500"
                        >
                          <div className="flex items-center gap-6 mb-4 md:mb-0">
                            <div className="w-14 h-14 rounded-2xl bg-white/[0.02] border border-white/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
                              <Building2 className="text-white/40 w-6 h-6" />
                            </div>
                            <div>
                              <h4 className="text-xl font-headline font-bold text-white mb-1 tracking-tight">{lead.nome}</h4>
                              <div className="flex items-center gap-4">
                                <a 
                                  href={lead.site} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-secondary text-xs font-light hover:underline flex items-center gap-1"
                                >
                                  {lead.site.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')}
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                                {lead.termoBusca && (
                                  <span className="text-[10px] text-white/30 uppercase tracking-wider border border-white/10 px-2 py-0.5 rounded-full">
                                    {lead.termoBusca}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-8">
                            <div className="text-right">
                              <p className="text-[10px] font-bold tracking-[0.2em] text-white/20 uppercase mb-1">Plataformas</p>
                              <div className="flex items-center gap-2 justify-end">
                                <CheckCircle2 className="w-4 h-4 text-secondary" />
                                <span className="text-sm font-bold text-white/80">{lead.plataformas}</span>
                              </div>
                            </div>

                            <div className="flex items-center gap-3">
                              {lead.contatos?.instagram && lead.contatos.instagram !== 'Não encontrado' && (
                                <a 
                                  href={lead.contatos.instagram}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-secondary hover:border-secondary/50 hover:bg-secondary/10 transition-all duration-300 group/btn"
                                  title="Abrir Instagram"
                                >
                                  <Instagram className="w-5 h-5 group-hover/btn:scale-110 transition-transform" />
                                </a>
                              )}
                              {lead.contatos?.whatsapp && lead.contatos.whatsapp !== 'Não encontrado' && (
                                <a 
                                  href={lead.contatos.whatsapp}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-emerald-400 hover:border-emerald-500/50 hover:bg-emerald-500/10 transition-all duration-300 group/btn"
                                  title="Abrir WhatsApp"
                                >
                                  <MessageCircle className="w-5 h-5 group-hover/btn:scale-110 transition-transform" />
                                </a>
                              )}
                            </div>
                            
                            <div className="flex flex-col items-end gap-2">
                              {lead.createdAt && (
                                <div className="text-[9px] text-white/30 flex items-center gap-1 uppercase tracking-wider">
                                  <Clock className="w-3 h-3" />
                                  {new Date(lead.createdAt).toLocaleDateString('pt-BR')}
                                </div>
                              )}
                              <button className="bg-white/5 hover:bg-secondary hover:text-on-secondary border border-white/10 hover:border-secondary text-white font-bold py-3 px-6 rounded-xl transition-all text-[10px] uppercase tracking-[0.2em]">
                                Abrir no CRM
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                ) : (
                  <motion.div 
                    key="empty-saved"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col items-center justify-center py-32 text-center opacity-20"
                  >
                    <Database className="w-20 h-20 mb-8 font-thin" strokeWidth={1} />
                    <h3 className="text-2xl font-headline font-light text-white mb-2">Nenhum Lead Colhido</h3>
                    <p className="text-white/60 font-light max-w-sm">Os leads encontrados na aba "Buscar Leads" aparecerão aqui automaticamente.</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </section>
          ) : activeTab === 'dorks' ? (
            <section>
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white/[0.02] backdrop-blur-3xl p-10 rounded-[3rem] border border-white/10 shadow-2xl relative overflow-hidden mb-12"
              >
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-secondary/50 to-transparent opacity-30"></div>
                
                <form onSubmit={salvarDork} className="flex flex-col md:flex-row gap-6 items-end">
                  <div className="flex-1 space-y-3 w-full">
                    <label className="text-[10px] font-bold tracking-[0.2em] text-white/40 uppercase ml-4 flex items-center gap-2">
                      <div className="w-1 h-1 rounded-full bg-secondary"></div>
                      Novo Dork
                    </label>
                    <div className="relative">
                      <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20" />
                      <input 
                        type="text" 
                        value={newDork}
                        onChange={(e) => setNewDork(e.target.value)}
                        placeholder='Ex: inurl:"/collections/todos" "adicionar ao carrinho" "CNPJ" -blog'
                        className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-5 pl-14 pr-6 text-white placeholder:text-white/10 focus:outline-none focus:border-secondary/50 focus:bg-white/[0.05] transition-all font-light text-lg"
                        required
                      />
                    </div>
                  </div>

                  <button 
                    type="submit"
                    disabled={!newDork}
                    className="bg-secondary text-on-secondary font-bold py-5 px-12 rounded-2xl transition-all text-[11px] uppercase tracking-[0.2em] shadow-[0_20px_40px_rgba(242,125,38,0.2)] hover:shadow-[0_20px_60px_rgba(242,125,38,0.4)] hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-3 h-[68px] min-w-[220px]"
                  >
                    Salvar Dork
                  </button>
                </form>
              </motion.div>

              <div className="space-y-6">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-4">
                    <h3 className="text-[10px] font-bold tracking-[0.4em] text-white/20 uppercase">Dorks Salvos</h3>
                    <span className="bg-secondary/20 text-secondary text-[10px] font-bold px-3 py-1 rounded-full border border-secondary/30">
                      {dorks.length} DORKS
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  {dorks.map((dork, index) => (
                    <motion.div
                      key={dork.id || index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="bg-white/[0.01] backdrop-blur-3xl p-6 rounded-3xl border border-white/5 flex flex-col md:flex-row items-center justify-between group hover:bg-white/[0.03] hover:border-secondary/20 transition-all duration-500"
                    >
                      <div className="flex items-center gap-6">
                        <div className="w-14 h-14 rounded-2xl bg-white/[0.02] border border-white/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
                          <Search className="text-white/40 w-6 h-6" />
                        </div>
                        <div>
                          <h4 className="text-xl font-headline font-bold text-white mb-1 tracking-tight">{dork.termo}</h4>
                          {dork.createdAt && (
                            <div className="text-[9px] text-white/30 flex items-center gap-1 uppercase tracking-wider">
                              <Clock className="w-3 h-3" />
                              {new Date(dork.createdAt).toLocaleDateString('pt-BR')}
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                  {dorks.length === 0 && (
                    <div className="text-center py-12 text-white/40 font-light">
                      Nenhum Dork salvo ainda.
                    </div>
                  )}
                </div>
              </div>
            </section>
          ) : null}
        </div>

        {/* Floating Help Button */}
        <button className="fixed bottom-10 right-10 w-16 h-16 bg-white text-black rounded-full shadow-[0_0_50px_rgba(255,255,255,0.2)] flex items-center justify-center hover:scale-110 transition-transform z-50">
          <span className="material-symbols-outlined text-2xl">help</span>
        </button>
      </main>
    </div>
  );
}
