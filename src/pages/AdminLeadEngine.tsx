import React, { useState, useEffect, useRef } from 'react';
import AdminSidebar from '../components/AdminSidebar';
import { motion, AnimatePresence } from 'motion/react';
import { auth, db } from '../firebase';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, Filter, Download, MoreHorizontal, ArrowUpRight, ChevronRight, Zap, Users, Target, BarChart3, MessageSquare, Phone, Mail, Globe, MapPin, Calendar, Clock, CheckCircle2, AlertCircle, Loader2, Settings, TrendingUp, PieChart as PieChartIcon, Briefcase, Star, ShoppingBag, Megaphone, Send, Plus, Activity, Cpu, X, Info, ChevronDown, MessageCircle, Bolt } from 'lucide-react';
import { LeadColhido } from '../types/lead';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell } from 'recharts';
import { ScraperStats } from '../services/scrapersService';
import { onSnapshot, doc } from 'firebase/firestore';
import SEO from '../components/SEO';

const leadInflowData = [
  { date: '01/03', leads: 45 },
  { date: '05/03', leads: 52 },
  { date: '10/03', leads: 48 },
  { date: '15/03', leads: 61 },
  { date: '20/03', leads: 55 },
  { date: '25/03', leads: 67 },
  { date: '30/03', leads: 72 },
];

const trafficSourcesData = [
  { name: 'Google Maps', value: 450, color: '#E9B3FF' },
  { name: 'LinkedIn', value: 320, color: '#60A5FA' },
  { name: 'Instagram', value: 280, color: '#F472B6' },
  { name: 'Others', value: 234, color: '#94A3B8' },
];

const nichesDistribution = [
  { name: 'Imobiliário', percentage: 35, color: '#E9B3FF' },
  { name: 'E-commerce', percentage: 25, color: '#60A5FA' },
  { name: 'Saúde', percentage: 20, color: '#F472B6' },
  { name: 'Tecnologia', percentage: 20, color: '#94A3B8' },
];

const priorityProspects = [
  { name: 'Empresa Alpha', status: 'Hot', score: 98, company: 'Alpha Corp' },
  { name: 'Beta Solutions', status: 'Hot', score: 95, company: 'Beta Group' },
  { name: 'Gamma Tech', status: 'Warm', score: 82, company: 'Gamma Inc' },
];

export default function AdminLeadEngine() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const rawTab = searchParams.get('tab');
  const activeTab = (rawTab === 'leads' || rawTab === 'scrapers' || rawTab === 'templates' || rawTab === 'settings') ? rawTab as 'overview' | 'leads' | 'scrapers' | 'templates' | 'settings' : 'overview';
  const setActiveTab = (tab: string) => setSearchParams({ tab });
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
  const [isBulkSendModalOpen, setIsBulkSendModalOpen] = useState(false);
  const [whatsappStatus, setWhatsappStatus] = useState<'disconnected' | 'connecting' | 'qr' | 'ready'>('disconnected');
  const [userInfo, setUserInfo] = useState<any>(null);
  const [isSending, setIsSending] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState('Aproximação E-com');
  const [whatsappQR, setWhatsappQR] = useState<string | null>(null);
  const [showQRModal, setShowQRModal] = useState(false);
  const [connectionMethod, setConnectionMethod] = useState<'qr' | 'phone'>('qr');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [isRequestingCode, setIsRequestingCode] = useState(false);
  const [leads, setLeads] = useState<LeadColhido[]>([]);
  const [isLoadingLeads, setIsLoadingLeads] = useState(true);
  const [scraperStats, setScraperStats] = useState<ScraperStats>({
    shopify: { totalLeads: 847, successRate: 98.2, queueProgress: 74, lastSync: "5m ago", status: 'running' },
    adLibrary: { newAdsFound: 312, velocity: 24, memoryLoad: 42, lastSync: "12m ago", status: 'running' },
    telegram: { leadsToday: 45, activeListeners: 8, connectionStability: 99, lastSync: "Active", status: 'running' },
    global: { enginesRunning: 3, lastSync: "2m ago" }
  });

  const [showNewJobModal, setShowNewJobModal] = useState<'shopify' | null>(null);
  const [jobUrlsInput, setJobUrlsInput] = useState('');
  const [isShopifyScannerRunning, setIsShopifyScannerRunning] = useState(false);
  const [scraperLogs, setScraperLogs] = useState<string[]>([]);
  const [showLogsModal, setShowLogsModal] = useState(false);

  const submitScraperJob = async () => {
    if (!jobUrlsInput.trim()) return;
    setShowNewJobModal(null);
    setIsShopifyScannerRunning(true);
    setScraperLogs(["[SYSTEM] Iniciando motor remoto... aguardando alocação do scraper..."]);
    setShowLogsModal(true);
    
    try {
      const urls = jobUrlsInput.split('\n').map(url => url.trim()).filter(url => url && url.startsWith('http'));

      const user = auth.currentUser;
      const token = user ? await user.getIdToken() : '';
      
      const res = await fetch('/api/scrapers/shopify/run', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ urls })
      });
      
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Falha ao iniciar motor remoto');
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let finalResults = null;

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (value) {
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';
            for (const line of lines) {
              if (line.trim()) {
                try {
                  const event = JSON.parse(line);
                  if (event.type === 'log') {
                    setScraperLogs(prev => [...prev, event.text]);
                  } else if (event.type === 'done') {
                    if (event.success) finalResults = event.results;
                    else throw new Error(event.error);
                  }
                } catch(e) {}
              }
            }
          }
          if (done) break;
        }
      }
      
      if (finalResults) {
        setScraperLogs(prev => [...prev, `\n[SYSTEM] Scraper finalizado com sucesso! ${finalResults.length} resultados.`]);
        // Download the result as JSON
        const blob = new Blob([JSON.stringify(finalResults, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `shopify_leads_${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch(err: any) {
      setScraperLogs(prev => [...prev, `\n[ERRO CRÍTICO] ${err.message}`]);
    } finally {
      setIsShopifyScannerRunning(false);
      setJobUrlsInput('');
    }
  };

  const fetchLeads = async () => {
    try {
      setIsLoadingLeads(true);
      const q = query(collection(db, 'leadsColhidos'), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      const leadsData = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          name: data.razaoSocial || data.name || data.dominio?.split('.')[0] || 'Sem Nome',
          company: data.company || data.razaoSocial || 'Sem Empresa',
          email: data.email || 'N/A',
          phone: data.whatsapp || data.phone || 'N/A',
          status: data.status || 'new',
          source: data.source || 'Scraper',
          value: data.value || 0,
          lastContact: data.lastContact || data.createdAt || new Date().toISOString(),
          score: data.score || 0
        } as unknown as LeadColhido;
      });
      setLeads(leadsData);
    } catch (err) {
      console.error('Error fetching leads:', err);
    } finally {
      setIsLoadingLeads(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'leads') {
      fetchLeads();
    }
  }, [activeTab]);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'scraper_metadata', 'stats'), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setScraperStats(prev => ({
          ...prev,
          shopify: { ...prev.shopify, ...data.shopify },
          adLibrary: { ...prev.adLibrary, ...data.adLibrary },
          telegram: { ...prev.telegram, ...data.telegram },
          global: { ...prev.global, ...data.global }
        }));
      }
    });

    return () => unsub();
  }, []);

  const templates = {
    'Aproximação E-com': 'Oi, {company}, vimos que vocês rodam ads sem vídeo e isso pode estar afetando sua conversão... 🚀',
    'Oferta Dropshipping': 'Olá {name}, temos uma proposta exclusiva para a {company} sobre novos fornecedores...',
    'Follow-up Abandoned Cart': 'Oi {name}, vimos que você deixou alguns itens no carrinho da {company}...',
    'Retenção VIP': 'Olá {name}, como cliente VIP da {company}, você acaba de ganhar um bônus especial!'
  };

  const fetchStatus = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const token = await user.getIdToken();
      const res = await fetch('/api/whatsapp/status', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (res.status === 401) {
        console.warn("Unauthorized to fetch WhatsApp status. User might not be logged in or token expired.");
        return;
      }

      if (!res.ok) {
        const text = await res.text();
        console.error(`WhatsApp status fetch failed: ${res.status} ${res.statusText}. Response: ${text.substring(0, 100)}...`);
        return;
      }

      const contentType = res.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await res.text();
        console.error(`WhatsApp status returned non-JSON response: ${contentType}. Body: ${text.substring(0, 100)}...`);
        return;
      }

      const data = await res.json();
      setWhatsappStatus(data.status);
      setWhatsappQR(data.qr);
      setUserInfo(data.user);
    } catch (error) {
      console.error("Error fetching WhatsApp status:", error);
    }
  };

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        fetchStatus();
      }
    });

    const interval = setInterval(() => {
      if (auth.currentUser) {
        fetchStatus();
      }
    }, 5000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  const handleConnectWhatsApp = async () => {
    try {
      const user = auth.currentUser;
      if (!user) {
        alert("Você precisa estar logado para conectar o WhatsApp.");
        return;
      }
      const token = await user.getIdToken();
      const res = await fetch('/api/whatsapp/connect', { 
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setWhatsappStatus(data.status);
      setWhatsappQR(data.qr);
      setShowQRModal(true);
    } catch (e) {
      console.error("Error connecting WhatsApp:", e);
      alert("Erro ao conectar WhatsApp.");
    }
  };

  const handleRequestPairingCode = async () => {
    if (!phoneNumber) {
      alert('Por favor, insira o número de telefone com DDI e DDD (ex: 5511999999999).');
      return;
    }
    const user = auth.currentUser;
    if (!user) {
      alert("Você precisa estar logado para solicitar o código.");
      return;
    }
    setIsRequestingCode(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/whatsapp/pair', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ phone: phoneNumber })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao solicitar código');
      setPairingCode(data.code);
    } catch (error: any) {
      console.error("Error requesting pairing code:", error);
      alert(error.message || "Erro ao solicitar código de pareamento.");
    } finally {
      setIsRequestingCode(false);
    }
  };

  const handleBulkSend = async () => {
    if (whatsappStatus !== 'ready') {
      alert('WhatsApp não está conectado. Por favor, conecte no menu NextZap.');
      return;
    }

    const user = auth.currentUser;
    if (!user) {
      alert("Você precisa estar logado para realizar disparos.");
      return;
    }

    setIsSending(true);
    const selectedLeadsData = sortedLeads.filter(l => selectedLeads.includes(l.id));
    
    for (const lead of selectedLeadsData) {
      try {
        const token = await user.getIdToken();
        await fetch('/api/whatsapp/send', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            to: lead.phone.replace(/\D/g, ''),
            message: templates[selectedTemplate as keyof typeof templates]
              .replace('{company}', lead.company)
              .replace('{name}', lead.name)
          })
        });
        // Delay entre envios
        await new Promise(resolve => setTimeout(resolve, 3000));
      } catch (error) {
        console.error(`Erro ao enviar para ${lead.name}:`, error);
      }
    }
    
    setIsSending(false);
    setIsBulkSendModalOpen(false);
    setSelectedLeads([]);
    alert('Disparo concluído com sucesso via NextZap!');
  };

  // Sort leads by most recent first
  const sortedLeads = leads;

  const toggleLeadSelection = (id: string) => {
    setSelectedLeads(prev => 
      prev.includes(id) ? prev.filter(leadId => leadId !== id) : [...prev, id]
    );
  };

  const toggleAllLeads = () => {
    if (selectedLeads.length === sortedLeads.length) {
      setSelectedLeads([]);
    } else {
      setSelectedLeads(sortedLeads.map(l => l.id));
    }
  };

  const stats = [
    { label: 'Total de Leads', value: '1,284', change: '+12%', icon: Users, color: 'text-blue-400' },
    { label: 'Hot Leads', value: '156', change: '+24%', icon: Star, color: 'text-secondary' },
    { label: 'Contatados', value: '432', change: '+8%', icon: MessageSquare, color: 'text-emerald-400' },
    { label: 'Faturamento', value: 'R$ 12.4k', change: '+18%', icon: Zap, color: 'text-purple-400' },
    { 
      label: 'WhatsApp Status', 
      value: whatsappStatus === 'ready' ? 'Ativo' : 'Inativo', 
      change: userInfo?.id ? `+${userInfo.id.split('@')[0]}` : 'Sessão Exclusiva', 
      icon: MessageCircle, 
      color: whatsappStatus === 'ready' ? 'text-emerald-400' : 'text-red-400',
      isWhatsApp: true 
    },
  ];

  const handleSearch = () => {
    setIsSearching(true);
    setTimeout(() => setIsSearching(false), 1500);
  };

  return (
    <div className="min-h-screen bg-[#020202] text-white font-body selection:bg-secondary selection:text-on-secondary flex">
      <SEO title="Motor de Leads" />
      <AdminSidebar activePage="tools" />

      <main className="ml-64 flex-1 min-h-screen relative flex flex-col">
        {/* Decorative Background */}
        <div className="fixed top-0 right-0 w-[800px] h-[800px] bg-secondary/5 blur-[150px] rounded-full -z-10 pointer-events-none"></div>
        <div className="fixed bottom-0 left-0 w-[600px] h-[600px] bg-primary/5 blur-[120px] rounded-full -z-10 pointer-events-none"></div>

        <div className="pt-32 pb-20 px-12 max-w-7xl mx-auto w-full">
          {/* Header */}
          <header className="mb-16 flex flex-col md:flex-row md:items-end justify-between gap-8">
            <div>
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-3 mb-4"
              >
                <div className="w-10 h-10 rounded-xl bg-secondary/20 flex items-center justify-center border border-secondary/30">
                  <Target className="w-5 h-5 text-secondary" />
                </div>
                <span className="text-[10px] font-bold tracking-[0.4em] text-secondary uppercase">Lead Engine v2.0</span>
              </motion.div>
              <motion.h1 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-6xl font-extrabold tracking-tighter text-white font-headline leading-none"
              >
                Motor de <span className="font-serif italic text-secondary font-light">Leads</span>
              </motion.h1>
            </div>

            <div className="flex items-center gap-4">
              <button className="px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[10px] font-bold uppercase tracking-[0.2em] transition-all flex items-center gap-3">
                <Download className="w-4 h-4" />
                Exportar CSV
              </button>
              <button className="px-8 py-3 bg-secondary text-on-secondary rounded-xl text-[10px] font-bold uppercase tracking-[0.2em] transition-all hover:scale-105 shadow-2xl shadow-secondary/20 flex items-center gap-3">
                <Zap className="w-4 h-4" />
                Novo Lead
              </button>
            </div>
          </header>

          {/* Navigation Tabs */}
          <nav className="flex items-center gap-8 mb-12 border-b border-white/5 overflow-x-auto no-scrollbar">
            {[
              { id: 'overview', label: 'VISÃO GERAL', icon: BarChart3 },
              { id: 'leads', label: 'LEADS', icon: Users },
              { id: 'scrapers', label: 'SCRAPPERS', icon: Globe },
              { id: 'templates', label: 'TEMPLATES', icon: MessageSquare },
              { id: 'settings', label: 'SETTINGS', icon: Settings },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`pb-4 text-[10px] font-bold uppercase tracking-[0.3em] transition-all relative flex items-center gap-3 whitespace-nowrap ${
                  activeTab === tab.id ? 'text-secondary' : 'text-white/40 hover:text-white'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
                {activeTab === tab.id && (
                  <motion.div 
                    layoutId="activeTab"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-secondary shadow-[0_0_10px_rgba(233,179,255,0.5)]"
                  />
                )}
              </button>
            ))}
          </nav>

          <AnimatePresence mode="wait">
            {activeTab === 'overview' && (
              <motion.div
                key="overview"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-12"
              >
                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
                  {stats.map((stat) => (
                    <div key={stat.label} className="bg-white/[0.02] border border-white/5 p-6 rounded-[1.5rem] group hover:bg-white/[0.04] transition-all duration-500">
                      <div className="flex items-center justify-between mb-4">
                        <div className={`w-10 h-10 rounded-xl bg-white/[0.03] flex items-center justify-center border border-white/5 group-hover:scale-110 transition-transform duration-500`}>
                          <stat.icon className={`w-5 h-5 ${stat.color}`} />
                        </div>
                        <span className="text-[9px] font-bold text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full">{stat.change}</span>
                      </div>
                      <div className="text-2xl font-headline font-bold text-white mb-1">{stat.value}</div>
                      <div className="flex items-center justify-between">
                        <div className="text-[9px] font-bold uppercase tracking-[0.2em] text-white/30">{stat.label}</div>
                        {stat.isWhatsApp && whatsappStatus === 'ready' && (
                          <div className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-400/10 border border-emerald-400/20 rounded-full">
                            <div className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse"></div>
                            <span className="text-[7px] font-bold uppercase text-emerald-400 tracking-widest">Sincronizado</span>
                          </div>
                        )}
                      </div>
                      {stat.isWhatsApp && whatsappStatus !== 'ready' && (
                        <button 
                          onClick={handleConnectWhatsApp}
                          className="mt-4 w-full py-2 bg-red-400/10 border border-red-400/20 rounded-xl text-[8px] font-bold uppercase tracking-widest text-red-400 hover:bg-red-400/20 transition-all flex items-center justify-center gap-2 group/btn"
                        >
                          <Bolt className="w-3 h-3 group-hover/btn:animate-pulse" /> Conectar Agora
                        </button>
                      )}
                      {stat.isWhatsApp && whatsappStatus === 'ready' && (
                        <div className="mt-4 p-2 bg-white/[0.03] border border-white/5 rounded-xl flex items-center justify-between">
                          <span className="text-[8px] font-bold text-white/40 uppercase tracking-widest">Sessão Ativa</span>
                          <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400"></div>
                            <span className="text-[9px] font-mono text-emerald-400/80">+{userInfo?.id?.split('@')[0]}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Charts Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-2 bg-white/[0.01] border border-white/5 rounded-[2.5rem] p-8">
                    <div className="flex items-center justify-between mb-8">
                      <div>
                        <h3 className="text-lg font-headline font-bold text-white">Fluxo de Leads</h3>
                        <p className="text-[10px] text-white/30 uppercase tracking-widest">Últimos 30 dias</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-secondary"></div>
                        <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Novos Leads</span>
                      </div>
                    </div>
                    <div className="h-[300px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={leadInflowData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                          <XAxis 
                            dataKey="date" 
                            stroke="rgba(255,255,255,0.2)" 
                            fontSize={10} 
                            tickLine={false} 
                            axisLine={false}
                            dy={10}
                          />
                          <YAxis 
                            stroke="rgba(255,255,255,0.2)" 
                            fontSize={10} 
                            tickLine={false} 
                            axisLine={false}
                            dx={-10}
                          />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: '#1a1919', 
                              border: '1px solid rgba(255,255,255,0.1)',
                              borderRadius: '12px',
                              fontSize: '12px'
                            }}
                            itemStyle={{ color: '#E9B3FF' }}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="leads" 
                            stroke="#E9B3FF" 
                            strokeWidth={3} 
                            dot={{ r: 4, fill: '#E9B3FF', strokeWidth: 2, stroke: '#020202' }}
                            activeDot={{ r: 6, strokeWidth: 0 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="bg-white/[0.01] border border-white/5 rounded-[2.5rem] p-8">
                    <h3 className="text-lg font-headline font-bold text-white mb-2">Fontes de Tráfego</h3>
                    <p className="text-[10px] text-white/30 uppercase tracking-widest mb-8">Distribuição por canal</p>
                    <div className="h-[200px] w-full relative">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={trafficSourcesData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {trafficSourcesData.map((entry) => (
                              <Cell key={`cell-${entry.name}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: '#1a1919', 
                              border: '1px solid rgba(255,255,255,0.1)',
                              borderRadius: '12px',
                              fontSize: '12px'
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-2xl font-bold text-white">1.2k</span>
                        <span className="text-[8px] font-bold text-white/20 uppercase tracking-widest">Total</span>
                      </div>
                    </div>
                    <div className="mt-8 space-y-3">
                      {trafficSourcesData.map((source) => (
                        <div key={source.name} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: source.color }}></div>
                            <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">{source.name}</span>
                          </div>
                          <span className="text-[10px] font-bold text-white">{source.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Niches and Priority Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Niches Distribution */}
                  <div className="bg-white/[0.01] border border-white/5 rounded-[2.5rem] p-8">
                    <div className="flex items-center justify-between mb-8">
                      <div>
                        <h3 className="text-lg font-headline font-bold text-white">Distribuição por Nicho</h3>
                        <p className="text-[10px] text-white/30 uppercase tracking-widest">Segmentos dominantes</p>
                      </div>
                      <Briefcase className="w-6 h-6 text-secondary/40" />
                    </div>
                    <div className="space-y-6">
                      {nichesDistribution.map((niche, i) => (
                        <div key={niche.name} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-white/60 uppercase tracking-widest">{niche.name}</span>
                            <span className="text-[11px] font-bold text-white">{niche.percentage}%</span>
                          </div>
                          <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${niche.percentage}%` }}
                              transition={{ duration: 1, delay: i * 0.1 }}
                              className="h-full rounded-full"
                              style={{ backgroundColor: niche.color }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-10 p-6 bg-secondary/5 border border-secondary/10 rounded-2xl">
                      <p className="text-xs text-secondary/80 italic font-light leading-relaxed">
                        "O nicho imobiliário continua sendo o mais lucrativo este mês, com um ticket médio 40% superior aos demais."
                      </p>
                    </div>
                  </div>

                  {/* Priority Prospects */}
                  <div className="bg-white/[0.01] border border-white/5 rounded-[2.5rem] p-8">
                    <div className="flex items-center justify-between mb-8">
                      <div>
                        <h3 className="text-lg font-headline font-bold text-white">Prospectos Prioritários</h3>
                        <p className="text-[10px] text-white/30 uppercase tracking-widest">Ações imediatas sugeridas</p>
                      </div>
                      <AlertCircle className="w-6 h-6 text-amber-400/40" />
                    </div>
                    <div className="space-y-4">
                      {priorityProspects.map((prospect) => (
                        <div key={prospect.name} className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/5 rounded-2xl hover:bg-white/[0.04] transition-all group cursor-pointer">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-white/10 to-white/5 flex items-center justify-center text-white font-bold text-xs border border-white/10 group-hover:border-secondary/50 transition-all">
                              {prospect.name.charAt(0)}
                            </div>
                            <div>
                              <div className="text-sm font-bold text-white group-hover:text-secondary transition-colors">{prospect.name}</div>
                              <div className="text-[10px] text-white/40 uppercase tracking-wider">{prospect.company}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-6">
                            <div className="text-right">
                              <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">{prospect.status}</div>
                              <div className="text-[10px] text-white/20 uppercase tracking-widest">Score: {prospect.score}</div>
                            </div>
                            <ChevronRight className="w-4 h-4 text-white/10 group-hover:text-secondary transition-all" />
                          </div>
                        </div>
                      ))}
                    </div>
                    <button className="w-full mt-6 py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-[10px] font-bold uppercase tracking-[0.2em] transition-all">
                      Ver Todos os Prospectos
                    </button>
                  </div>
                </div>

                {/* Recent Leads Table */}
                <div className="bg-white/[0.01] border border-white/5 rounded-[2.5rem] overflow-hidden">
                  <div className="p-8 border-b border-white/5 flex items-center justify-between">
                    <h3 className="text-lg font-headline font-bold text-white">Leads Recentes</h3>
                    <button className="text-[10px] font-bold uppercase tracking-[0.2em] text-secondary hover:underline flex items-center gap-2">
                      Ver Todos <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-white/5">
                          <th className="px-8 py-6 text-[10px] font-bold uppercase tracking-[0.2em] text-white/20">Lead</th>
                          <th className="px-8 py-6 text-[10px] font-bold uppercase tracking-[0.2em] text-white/20">Status</th>
                          <th className="px-8 py-6 text-[10px] font-bold uppercase tracking-[0.2em] text-white/20">Valor</th>
                          <th className="px-8 py-6 text-[10px] font-bold uppercase tracking-[0.2em] text-white/20">Score</th>
                          <th className="px-8 py-6 text-[10px] font-bold uppercase tracking-[0.2em] text-white/20">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {leads.slice(0, 5).map((lead) => (
                          <tr key={lead.id} className="group hover:bg-white/[0.02] transition-colors">
                            <td className="px-8 py-6">
                              <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-white/10 to-white/5 flex items-center justify-center text-white font-bold text-xs border border-white/10">
                                  {lead.name.charAt(0)}
                                </div>
                                <div>
                                  <div className="text-sm font-bold text-white group-hover:text-secondary transition-colors">{lead.name}</div>
                                  <div className="text-[10px] text-white/40 uppercase tracking-wider">{lead.company}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-8 py-6">
                              <span className={`px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                                lead.status === 'qualified' ? 'bg-emerald-400/10 text-emerald-400' :
                                lead.status === 'contacted' ? 'bg-blue-400/10 text-blue-400' :
                                lead.status === 'new' ? 'bg-amber-400/10 text-amber-400' :
                                'bg-red-400/10 text-red-400'
                              }`}>
                                {lead.status}
                              </span>
                            </td>
                            <td className="px-8 py-6 text-sm font-medium text-white/70">
                              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(lead.value)}
                            </td>
                            <td className="px-8 py-6">
                              <div className="flex items-center gap-3">
                                <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden max-w-[80px]">
                                  <div 
                                    className={`h-full rounded-full ${
                                      lead.score > 80 ? 'bg-emerald-400' : lead.score > 50 ? 'bg-amber-400' : 'bg-red-400'
                                    }`}
                                    style={{ width: `${lead.score}%` }}
                                  />
                                </div>
                                <span className="text-[10px] font-bold text-white/40">{lead.score}</span>
                              </div>
                            </td>
                            <td className="px-8 py-6">
                              <button className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                                <MoreHorizontal className="w-5 h-5 text-white/20" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'leads' && (
              <motion.div
                key="leads"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-8"
              >
                {/* Search and Filters */}
                <div className="flex flex-col md:flex-row gap-6">
                  <div className="flex-1 relative group">
                    <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20 group-focus-within:text-secondary transition-colors" />
                    <input 
                      type="text" 
                      placeholder="Buscar por nome, empresa, email ou telefone..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-white/[0.02] border border-white/10 rounded-[1.5rem] py-6 pl-16 pr-8 text-sm focus:outline-none focus:border-secondary/50 focus:bg-white/[0.04] transition-all"
                    />
                  </div>
                  <div className="flex gap-4">
                    <button 
                      onClick={handleSearch}
                      disabled={isSearching}
                      className="px-8 py-6 bg-secondary text-on-secondary rounded-[1.5rem] text-[10px] font-bold uppercase tracking-[0.2em] transition-all hover:scale-105 disabled:opacity-50 disabled:scale-100 flex items-center gap-3"
                    >
                      {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                      Pesquisar
                    </button>
                    {selectedLeads.length > 0 && (
                      <button 
                        onClick={() => setIsBulkSendModalOpen(true)}
                        className="px-8 py-6 bg-emerald-500 text-black rounded-[1.5rem] text-[10px] font-bold uppercase tracking-[0.2em] transition-all hover:scale-105 flex items-center gap-3 shadow-[0_0_20px_rgba(16,185,129,0.3)]"
                      >
                        <MessageCircle className="w-4 h-4" />
                        Enviar Via NextZap ({selectedLeads.length})
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  {['Status', 'Fonte', 'Valor Mínimo', 'Data'].map((filter) => (
                    <button key={filter} className="p-6 bg-white/[0.01] border border-white/5 rounded-2xl flex items-center justify-between hover:bg-white/[0.03] transition-all group">
                      <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40 group-hover:text-white transition-colors">{filter}</span>
                      <Filter className="w-4 h-4 text-white/20" />
                    </button>
                  ))}
                </div>

                {/* Base de Dados Table */}
                <div className="bg-white/[0.01] border border-white/5 rounded-[2.5rem] overflow-hidden">
                  <div className="p-8 border-b border-white/5 flex items-center justify-between">
                    <h3 className="text-lg font-headline font-bold text-white">Base de Dados de Leads</h3>
                    <div className="flex items-center gap-4">
                      <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest">
                        {selectedLeads.length} selecionados
                      </span>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-white/5">
                          <th className="px-8 py-6 w-10">
                            <input 
                              type="checkbox" 
                              checked={selectedLeads.length === sortedLeads.length && sortedLeads.length > 0}
                              onChange={toggleAllLeads}
                              className="w-4 h-4 rounded border-white/10 bg-white/5 text-secondary focus:ring-secondary focus:ring-offset-0"
                            />
                          </th>
                          <th className="px-8 py-6 text-[10px] font-bold uppercase tracking-[0.2em] text-white/20">Lead</th>
                          <th className="px-8 py-6 text-[10px] font-bold uppercase tracking-[0.2em] text-white/20">Status</th>
                          <th className="px-8 py-6 text-[10px] font-bold uppercase tracking-[0.2em] text-white/20">Valor</th>
                          <th className="px-8 py-6 text-[10px] font-bold uppercase tracking-[0.2em] text-white/20">Score</th>
                          <th className="px-8 py-6 text-[10px] font-bold uppercase tracking-[0.2em] text-white/20">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {isLoadingLeads ? (
                          <tr>
                            <td colSpan={6} className="px-8 py-20 text-center">
                              <div className="flex flex-col items-center gap-4">
                                <Loader2 className="w-8 h-8 text-secondary animate-spin" />
                                <p className="text-white/40 text-sm font-medium font-headline">Carregando base de leads...</p>
                              </div>
                            </td>
                          </tr>
                        ) : sortedLeads.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="px-8 py-20 text-center">
                              <p className="text-white/40 text-sm font-medium font-headline">Nenhum lead encontrado.</p>
                            </td>
                          </tr>
                        ) : sortedLeads.map((lead) => (
                          <tr 
                            key={lead.id} 
                            onClick={() => navigate(`/admin/lead/${lead.id}`)}
                            className={`group hover:bg-white/[0.02] transition-colors cursor-pointer ${selectedLeads.includes(lead.id) ? 'bg-secondary/5' : ''}`}
                          >
                            <td className="px-8 py-6" onClick={(e) => e.stopPropagation()}>
                              <input 
                                type="checkbox" 
                                checked={selectedLeads.includes(lead.id)}
                                onChange={() => toggleLeadSelection(lead.id)}
                                className="w-4 h-4 rounded border-white/10 bg-white/5 text-secondary focus:ring-secondary focus:ring-offset-0"
                              />
                            </td>
                            <td className="px-8 py-6">
                              <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-white/10 to-white/5 flex items-center justify-center text-white font-bold text-xs border border-white/10">
                                  {lead.name.charAt(0)}
                                </div>
                                <div>
                                  <div className="text-sm font-bold text-white group-hover:text-secondary transition-colors">{lead.name}</div>
                                  <div className="text-[10px] text-white/40 uppercase tracking-wider">{lead.company}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-8 py-6">
                              <span className={`px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                                lead.status === 'qualified' ? 'bg-emerald-400/10 text-emerald-400' :
                                lead.status === 'contacted' ? 'bg-blue-400/10 text-blue-400' :
                                lead.status === 'new' ? 'bg-amber-400/10 text-amber-400' :
                                'bg-red-400/10 text-red-400'
                              }`}>
                                {lead.status}
                              </span>
                            </td>
                            <td className="px-8 py-6 text-sm font-medium text-white/70">
                              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(lead.value)}
                            </td>
                            <td className="px-8 py-6">
                              <div className="flex items-center gap-3">
                                <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden max-w-[80px]">
                                  <div 
                                    className={`h-full rounded-full ${
                                      lead.score > 80 ? 'bg-emerald-400' : lead.score > 50 ? 'bg-amber-400' : 'bg-red-400'
                                    }`}
                                    style={{ width: `${lead.score}%` }}
                                  />
                                </div>
                                <span className="text-[10px] font-bold text-white/40">{lead.score}</span>
                              </div>
                            </td>
                            <td className="px-8 py-6">
                              <button className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                                <MoreHorizontal className="w-5 h-5 text-white/20" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'scrapers' && (
              <motion.div
                key="scrapers"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-12"
              >
                {/* Page Header */}
                <div className="mb-8">
                  <h2 className="font-headline font-bold text-5xl tracking-tight mb-4 text-white">
                    Active <span className="text-secondary italic">Scraper</span> Status
                  </h2>
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-400/10 text-emerald-400 text-xs font-bold border border-emerald-400/20">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                      {scraperStats.global.enginesRunning} ENGINES RUNNING
                    </span>
                    <span className="text-white/30 text-sm font-medium">Last sync {scraperStats.global.lastSync} across all nodes</span>
                  </div>
                </div>

                {/* Bento Grid of Scrapers */}
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8 items-start">
                  {/* Card 1: Shopify Scanner */}
                  <div className="bg-white/[0.02] border border-secondary/20 p-8 rounded-[2rem] relative overflow-hidden group backdrop-blur-xl">
                    <div className="absolute top-0 right-0 p-6">
                      <div className="w-12 h-12 rounded-full bg-secondary/10 flex items-center justify-center border border-secondary/30">
                        <ShoppingBag className="w-6 h-6 text-secondary" />
                      </div>
                    </div>
                    <div className="mb-8">
                      <h3 className="text-2xl font-bold text-white mb-1">Shopify Scanner</h3>
                      <p className="text-white/30 text-sm font-medium uppercase tracking-wider">Active monitoring • {scraperStats.shopify.lastSync}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mb-8">
                      <div className="bg-white/[0.02] p-4 rounded-xl border border-white/5">
                        <p className="text-[10px] uppercase tracking-widest text-white/30 mb-1">Total Leads</p>
                        <p className="text-2xl font-black text-white">{scraperStats.shopify.totalLeads}</p>
                      </div>
                      <div className="bg-white/[0.02] p-4 rounded-xl border border-white/5">
                        <p className="text-[10px] uppercase tracking-widest text-white/30 mb-1">Success Rate</p>
                        <p className="text-2xl font-black text-emerald-400">{scraperStats.shopify.successRate.toFixed(1)}%</p>
                      </div>
                    </div>
                    <div className="mb-8">
                      <div className="flex justify-between items-end mb-2">
                        <span className="text-xs font-bold text-white/40 uppercase tracking-tighter">Queue Progress</span>
                        <span className="text-sm font-mono text-secondary">{scraperStats.shopify.queueProgress}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-secondary rounded-full shadow-[0_0_10px_rgba(233,179,255,0.5)] transition-all duration-1000"
                          style={{ width: `${scraperStats.shopify.queueProgress}%` }}
                        ></div>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 mb-8">
                      {['E-commerce', 'Dropshipping', 'US Market'].map((tag, idx) => (
                        <span key={`tag-shopify-${idx}`} className="px-3 py-1 rounded-full bg-white/5 text-[10px] font-bold text-white/40 border border-white/5 uppercase tracking-widest">{tag}</span>
                      ))}
                    </div>
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={() => !isShopifyScannerRunning && setShowNewJobModal('shopify')}
                        disabled={isShopifyScannerRunning}
                        className={`flex-1 ${isShopifyScannerRunning ? 'bg-amber-400/10 text-amber-400 border-amber-400/20 cursor-wait' : 'bg-secondary/10 text-secondary border-secondary/20 hover:bg-secondary/20'} py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-colors border`}
                      >
                         {isShopifyScannerRunning ? (
                           <><Loader2 className="w-4 h-4 animate-spin" /> RUNNING...</>
                         ) : (
                           <><Zap className="w-4 h-4" /> START SCANNER</>
                         )}
                      </button>
                      <button className="w-14 h-12 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center hover:bg-white/10 transition-colors">
                        <Settings className="w-5 h-5 text-white/40" />
                      </button>
                    </div>
                  </div>

                  {/* Card 2: Ad Library Monitor */}
                  <div className="bg-white/[0.02] border border-blue-400/20 p-8 rounded-[2rem] relative overflow-hidden group backdrop-blur-xl">
                    <div className="absolute top-0 right-0 p-6">
                      <div className="w-12 h-12 rounded-full bg-blue-400/10 flex items-center justify-center border border-blue-400/30">
                        <Megaphone className="w-6 h-6 text-blue-400" />
                      </div>
                    </div>
                    <div className="mb-8">
                      <h3 className="text-2xl font-bold text-white mb-1">Ad Library Monitor</h3>
                      <p className="text-white/30 text-sm font-medium uppercase tracking-wider">Tracking Meta APIs • {scraperStats.adLibrary.lastSync}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mb-8">
                      <div className="bg-white/[0.02] p-4 rounded-xl border border-white/5">
                        <p className="text-[10px] uppercase tracking-widest text-white/30 mb-1">New Ads Found</p>
                        <p className="text-2xl font-black text-white">{scraperStats.adLibrary.newAdsFound}</p>
                      </div>
                      <div className="bg-white/[0.02] p-4 rounded-xl border border-white/5">
                        <p className="text-[10px] uppercase tracking-widest text-white/30 mb-1">Velocity</p>
                        <p className="text-2xl font-black text-blue-400">{scraperStats.adLibrary.velocity}/hr</p>
                      </div>
                    </div>
                    <div className="mb-8">
                      <div className="flex justify-between items-end mb-2">
                        <span className="text-xs font-bold text-white/40 uppercase tracking-tighter">Memory Load</span>
                        <span className="text-sm font-mono text-blue-400">{scraperStats.adLibrary.memoryLoad}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-blue-400 rounded-full shadow-[0_0_10px_rgba(96,165,250,0.5)] transition-all duration-1000"
                          style={{ width: `${scraperStats.adLibrary.memoryLoad}%` }}
                        ></div>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 mb-8">
                      {['Marketing', 'SaaS'].map((tag, idx) => (
                        <span key={`tag-ads-${idx}`} className="px-3 py-1 rounded-full bg-white/5 text-[10px] font-bold text-white/40 border border-white/5 uppercase tracking-widest">{tag}</span>
                      ))}
                    </div>
                    <div className="flex items-center gap-3">
                      <button className="flex-1 bg-red-400/10 text-red-400 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-red-400/20 transition-colors border border-red-400/20">
                        <AlertCircle className="w-4 h-4" />
                        SHUT DOWN
                      </button>
                      <button className="w-14 h-12 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center hover:bg-white/10 transition-colors">
                        <Settings className="w-5 h-5 text-white/40" />
                      </button>
                    </div>
                  </div>

                  {/* Card 3: Telegram Bot */}
                  <div className="bg-white/[0.02] border border-emerald-400/20 p-8 rounded-[2rem] relative overflow-hidden group backdrop-blur-xl">
                    <div className="absolute top-0 right-0 p-6">
                      <div className="w-12 h-12 rounded-full bg-emerald-400/10 flex items-center justify-center border border-emerald-400/30">
                        <Send className="w-6 h-6 text-emerald-400" />
                      </div>
                    </div>
                    <div className="mb-8">
                      <h3 className="text-2xl font-bold text-white mb-1">Telegram Bot</h3>
                      <p className="text-white/30 text-sm font-medium uppercase tracking-wider">Listening to {scraperStats.telegram.activeListeners} groups • {scraperStats.telegram.lastSync}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mb-8">
                      <div className="bg-white/[0.02] p-4 rounded-xl border border-white/5">
                        <p className="text-[10px] uppercase tracking-widest text-white/30 mb-1">Leads Today</p>
                        <p className="text-2xl font-black text-white">{scraperStats.telegram.leadsToday}</p>
                      </div>
                      <div className="bg-white/[0.02] p-4 rounded-xl border border-white/5">
                        <p className="text-[10px] uppercase tracking-widest text-white/30 mb-1">Active Listeners</p>
                        <p className="text-2xl font-black text-emerald-400">{scraperStats.telegram.activeListeners}</p>
                      </div>
                    </div>
                    <div className="mb-8">
                      <div className="flex justify-between items-end mb-2">
                        <span className="text-xs font-bold text-white/40 uppercase tracking-tighter">Connection Stability</span>
                        <span className="text-sm font-mono text-emerald-400">{scraperStats.telegram.connectionStability.toFixed(0)}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-emerald-400 rounded-full shadow-[0_0_10px_rgba(52,211,153,0.5)] transition-all duration-1000"
                          style={{ width: `${scraperStats.telegram.connectionStability}%` }}
                        ></div>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 mb-8">
                      {['Crypto', 'AI Tools', 'Networking'].map((tag, idx) => (
                        <span key={`tag-telegram-${idx}`} className="px-3 py-1 rounded-full bg-white/5 text-[10px] font-bold text-white/40 border border-white/5 uppercase tracking-widest">{tag}</span>
                      ))}
                    </div>
                    <div className="flex items-center gap-3">
                      <button className="flex-1 bg-amber-400/10 text-amber-400 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-amber-400/20 transition-colors border border-amber-400/20">
                        <Clock className="w-4 h-4" />
                        PAUSE BOT
                      </button>
                      <button className="w-14 h-12 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center hover:bg-white/10 transition-colors">
                        <Settings className="w-5 h-5 text-white/40" />
                      </button>
                    </div>
                  </div>

                  {/* Empty State / New Scraper Card */}
                  <div className="bg-white/[0.01] border-2 border-dashed border-white/10 rounded-[2rem] p-8 flex flex-col items-center justify-center text-center min-h-[450px] group hover:border-secondary/50 transition-all cursor-pointer">
                    <div className="w-20 h-20 rounded-full bg-white/[0.02] flex items-center justify-center mb-6 group-hover:scale-110 transition-transform border border-white/5">
                      <Plus className="w-10 h-10 text-white/20 group-hover:text-secondary transition-colors" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">Deploy New Engine</h3>
                    <p className="text-white/30 text-sm max-w-[200px] leading-relaxed uppercase tracking-widest">
                      Select a source and define your scraping parameters.
                    </p>
                  </div>
                </div>

                {/* Bottom Stats Bar (Floating) */}
                <div className="mt-12 bg-white/[0.02] border border-white/5 p-8 rounded-[2rem] flex flex-col md:flex-row items-center justify-between gap-8 backdrop-blur-xl">
                  <div className="flex flex-wrap items-center gap-12">
                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-white/30 mb-1">Total Daily Throughput</p>
                      <p className="text-xl font-black text-white">1,204 <span className="text-sm font-medium text-white/20">leads/24h</span></p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-white/30 mb-1">Compute Usage</p>
                      <p className="text-xl font-black text-secondary">14.8 <span className="text-sm font-medium text-white/20">GB</span></p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-white/30 mb-1">API Latency</p>
                      <p className="text-xl font-black text-emerald-400">142 <span className="text-sm font-medium text-white/20">ms</span></p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-32 h-10 bg-white/5 rounded-lg overflow-hidden flex items-end gap-1 px-2">
                      {[40, 60, 30, 80, 50, 90].map((h, i) => (
                        <div 
                          key={`bar-${i}`} 
                          className={`flex-1 rounded-t-sm transition-all duration-1000 ${i === 5 ? 'bg-secondary shadow-[0_-4px_8px_rgba(233,179,255,0.3)]' : 'bg-secondary/20'}`} 
                          style={{ height: `${h}%` }}
                        ></div>
                      ))}
                    </div>
                    <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest leading-tight">NETWORK<br/>ACTIVITY</p>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'templates' && (
              <motion.div
                key="templates"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-8"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {[
                    { title: 'Primeiro Contato (Frio)', type: 'WhatsApp', text: 'Olá {{name}}, vi que a {{company}} está crescendo e gostaria de...' },
                    { title: 'Follow-up 24h', type: 'Email', text: 'Oi {{name}}, passando para garantir que você recebeu minha mensagem anterior...' },
                    { title: 'Proposta Comercial', type: 'WhatsApp', text: 'Conforme conversamos, aqui está o detalhamento da nossa solução para a {{company}}...' },
                    { title: 'Reativação de Lead', type: 'WhatsApp', text: 'Olá {{name}}, faz um tempo que não nos falamos. Como estão os projetos na {{company}}?' },
                  ].map((template) => (
                    <div key={template.title} className="bg-white/[0.02] border border-white/5 p-8 rounded-[2rem] group hover:bg-white/[0.04] transition-all">
                      <div className="flex items-center justify-between mb-6">
                        <h4 className="text-lg font-bold text-white group-hover:text-secondary transition-colors">{template.title}</h4>
                        <span className="text-[10px] font-bold text-white/20 bg-white/5 px-3 py-1 rounded-full uppercase tracking-widest">{template.type}</span>
                      </div>
                      <p className="text-sm text-white/40 font-light leading-relaxed mb-8 line-clamp-2 italic">"{template.text}"</p>
                      <div className="flex gap-4">
                        <button className="flex-1 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[10px] font-bold uppercase tracking-[0.2em] transition-all">Editar</button>
                        <button className="flex-1 py-3 bg-secondary/10 hover:bg-secondary/20 text-secondary rounded-xl text-[10px] font-bold uppercase tracking-[0.2em] transition-all">Usar</button>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {activeTab === 'settings' && (
              <motion.div
                key="settings"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="max-w-2xl space-y-12"
              >
                <div className="space-y-8">
                  <h3 className="text-2xl font-headline font-bold text-white">Configurações do Motor</h3>
                  
                  <div className="space-y-6">
                    <div className="flex items-center justify-between p-6 bg-white/[0.02] border border-white/5 rounded-2xl">
                      <div>
                        <h4 className="text-sm font-bold text-white mb-1">Auto-Scraping</h4>
                        <p className="text-[10px] text-white/40 uppercase tracking-widest">Executar buscas automaticamente a cada 24h</p>
                      </div>
                      <div className="w-12 h-6 bg-secondary rounded-full relative">
                        <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full"></div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-6 bg-white/[0.02] border border-white/5 rounded-2xl">
                      <div>
                        <h4 className="text-sm font-bold text-white mb-1">Notificações de Novos Leads</h4>
                        <p className="text-[10px] text-white/40 uppercase tracking-widest">Enviar alerta no WhatsApp para cada lead qualificado</p>
                      </div>
                      <div className="w-12 h-6 bg-white/10 rounded-full relative">
                        <div className="absolute left-1 top-1 w-4 h-4 bg-white/20 rounded-full"></div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">Groq API Key</label>
                      <input 
                        type="password" 
                        value="••••••••••••••••"
                        readOnly
                        className="w-full bg-white/[0.02] border border-white/10 rounded-xl py-4 px-6 text-sm focus:outline-none focus:border-secondary/50"
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Bulk Send Modal */}
        <AnimatePresence>
          {isBulkSendModalOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-8">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsBulkSendModalOpen(false)}
                className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              />
              <motion.section
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="relative w-full max-w-4xl bg-[#1a1919] rounded-[2rem] overflow-hidden shadow-[0_0_64px_rgba(0,0,0,0.5)] border border-white/10"
              >
                {/* Modal Header */}
                <div className="px-8 py-6 flex items-center justify-between border-b border-white/5">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-400/10 rounded-lg">
                      <MessageSquare className="w-6 h-6 text-emerald-400" />
                    </div>
                    <h2 className="text-xl font-bold tracking-tight text-white">Configurar Envio em Massa — NextZap</h2>
                  </div>
                  <button 
                    onClick={() => setIsBulkSendModalOpen(false)}
                    className="text-white/40 hover:text-white transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                {/* Modal Body */}
                <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-10">
                  {/* Left Column: Settings */}
                  <div className="space-y-8">
                    {/* Summary Card */}
                    <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5">
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-sm font-medium text-white/40">Resumo do Público</span>
                        <Info className="w-4 h-4 text-white/20" />
                      </div>
                      <div className="flex items-end justify-between">
                        <div>
                          <p className="text-2xl font-extrabold text-white">{selectedLeads.length} Leads</p>
                          <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider mt-1">Qualificados</p>
                        </div>
                        <div className={`flex flex-col items-end gap-1`}>
                          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${whatsappStatus === 'ready' ? 'bg-emerald-400/10 border-emerald-400/20' : 'bg-red-400/10 border-red-400/20'}`}>
                            <div className={`w-2 h-2 rounded-full ${whatsappStatus === 'ready' ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`}></div>
                            {whatsappStatus === 'ready' ? (
                              <span className="text-[10px] font-bold uppercase text-emerald-400">NextZap Conectado</span>
                            ) : (
                              <button 
                                onClick={handleConnectWhatsApp}
                                className="text-[10px] font-bold uppercase text-red-400 hover:text-red-300 transition-colors flex items-center gap-1"
                              >
                                NextZap Desconectado <span className="opacity-50">(Conectar)</span>
                              </button>
                            )}
                          </div>
                          {whatsappStatus === 'ready' && (
                            <div className="flex items-center gap-2">
                              <span className="text-[8px] font-bold text-white/20 uppercase tracking-widest">Sessão Exclusiva</span>
                              <span className="text-[10px] font-mono text-emerald-400/60">+{userInfo?.id?.split('@')[0]}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-3">
                        <p className="text-[11px] text-white/20 font-mono">
                          {userInfo?.id ? `+${userInfo.id.split('@')[0]}` : 'Nenhum número vinculado'}
                        </p>
                      </div>
                    </div>

                    {/* Configuration Form */}
                    <div className="space-y-6">
                      <div className="group">
                        <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-2 px-1">Selecione um Template</label>
                        <div className="relative">
                          <select 
                            value={selectedTemplate}
                            onChange={(e) => setSelectedTemplate(e.target.value)}
                            className="w-full bg-white/[0.02] border-b-2 border-white/10 focus:border-emerald-400 transition-all duration-300 rounded-t-xl px-4 py-3 appearance-none text-white font-medium outline-none"
                          >
                            {Object.keys(templates).map((t, idx) => (
                              <option key={`${t}-${idx}`} value={t} className="bg-[#1a1919]">{t}</option>
                            ))}
                          </select>
                          <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-white/20 w-5 h-5" />
                        </div>
                      </div>

                      <div className="p-4 rounded-xl bg-emerald-400/5 border border-emerald-400/10">
                        <h4 className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                          <Zap className="w-3 h-3" /> Otimização por IA Ativada 
                        </h4>
                        <p className="text-xs text-white/40 leading-relaxed">
                          Variáveis dinâmicas como <span className="text-emerald-400">{"{store_name}"}</span> e <span className="text-emerald-400">{"{first_name}"}</span> serão extraídas automaticamente do banco de dados qualificado.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Preview */}
                  <div className="flex flex-col">
                    <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-4 px-1">Visualização em Tempo Real</label>
                    {/* WhatsApp Simulator */}
                    <div className="flex-1 bg-black/40 rounded-2xl border border-white/10 overflow-hidden flex flex-col relative shadow-inner">
                      {/* WP Header */}
                      <div className="bg-white/[0.03] px-4 py-3 flex items-center gap-3 border-b border-white/5">
                        <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                          <Users className="w-4 h-4 text-white/40" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-white">Lead: Nome da Loja</p>
                          <p className="text-[10px] text-emerald-400">online</p>
                        </div>
                      </div>
                      {/* WP Chat Area */}
                      <div className="flex-1 p-6 space-y-4 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-80 overflow-y-auto">
                        <div className="bg-white/[0.05] text-white p-4 rounded-2xl rounded-tl-none max-w-[90%] text-sm leading-relaxed border-l-2 border-emerald-400 shadow-lg">
                          {templates[selectedTemplate as keyof typeof templates]
                            .replace('{company}', 'Nome da Loja')
                            .replace('{name}', 'Cliente')}
                          <div className="mt-2 text-[10px] text-right text-white/20">14:20</div>
                        </div>
                      </div>
                      {/* WP Footer */}
                      <div className="p-3 bg-white/[0.03] flex items-center gap-3">
                        <Plus className="w-5 h-5 text-white/20" />
                        <div className="flex-1 bg-black/20 rounded-full px-4 py-1.5 text-xs text-white/20 italic">Mensagem de teste...</div>
                        <Activity className="w-5 h-5 text-emerald-400" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="px-8 py-6 bg-white/[0.01] border-t border-white/5 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4 text-[10px] font-bold text-white/20 uppercase tracking-widest">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Delay: 30-60s 
                    </div>
                    <div className="flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Anti-Ban Active 
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <button 
                      onClick={() => setIsBulkSendModalOpen(false)}
                      className="px-6 py-3 rounded-full font-bold text-sm text-white/40 hover:text-white hover:bg-white/5 transition-all duration-200"
                    >
                      Cancelar
                    </button>
                    <button 
                      onClick={handleBulkSend}
                      disabled={isSending || whatsappStatus !== 'ready'}
                      className={`px-8 py-3 rounded-full bg-emerald-400 text-black font-bold text-sm shadow-[0_0_20px_rgba(52,211,153,0.3)] transition-all duration-300 flex items-center gap-2 active:scale-95 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {isSending ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" /> Enviando...
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" /> Confirmar e Iniciar Envio
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </motion.section>
            </div>
          )}
        </AnimatePresence>

        {/* FAB for quick action */}
        <button className="fixed bottom-8 right-8 w-16 h-16 bg-secondary text-black rounded-full shadow-[0_0_20px_rgba(233,179,255,0.4)] flex items-center justify-center group hover:scale-105 transition-transform z-50">
          <Bolt className="w-8 h-8 font-bold" />
        </button>
        {/* QR Code / Pairing Modal */}
        <AnimatePresence>
          {showQRModal && (
            <div className="fixed inset-0 z-[110] flex items-center justify-center p-6">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/80 backdrop-blur-sm" 
                onClick={() => setShowQRModal(false)}
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="relative bg-[#0e0e0e] border border-white/10 p-8 rounded-3xl max-w-sm w-full text-center space-y-6 shadow-2xl"
              >
                <div className="flex justify-between items-center">
                  <h3 className="text-xl font-headline font-bold text-white">Conectar WhatsApp</h3>
                  <button onClick={() => setShowQRModal(false)} className="text-white/40 hover:text-white">
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <div className="flex bg-white/5 p-1 rounded-xl mb-6">
                  <button 
                    onClick={() => setConnectionMethod('qr')}
                    className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-widest rounded-lg transition-all ${connectionMethod === 'qr' ? 'bg-emerald-400 text-black shadow-lg' : 'text-white/50 hover:text-white'}`}
                  >
                    QR Code
                  </button>
                  <button 
                    onClick={() => setConnectionMethod('phone')}
                    className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-widest rounded-lg transition-all ${connectionMethod === 'phone' ? 'bg-emerald-400 text-black shadow-lg' : 'text-white/50 hover:text-white'}`}
                  >
                    Telefone (SMS)
                  </button>
                </div>
                
                {connectionMethod === 'qr' ? (
                  <>
                    <div className="bg-white p-4 rounded-2xl inline-block mx-auto">
                      {whatsappQR ? (
                        <img src={whatsappQR} alt="WhatsApp QR Code" className="w-64 h-64" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-64 h-64 flex items-center justify-center bg-black/5">
                          <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <p className="text-sm text-white font-medium">Escaneie o código acima</p>
                      <p className="text-xs text-white/40 leading-relaxed">
                        Abra o WhatsApp no seu celular, vá em Aparelhos Conectados e escaneie este código para autenticar. O código atualiza automaticamente.
                      </p>
                    </div>
                  </>
                ) : (
                  <div className="space-y-6">
                    {!pairingCode ? (
                      <>
                        <div className="space-y-2 text-left">
                          <label className="block text-[10px] uppercase tracking-[0.2em] text-white/50 font-bold mb-2">Número do WhatsApp</label>
                          <input 
                            type="text" 
                            placeholder="Ex: 5511999999999"
                            value={phoneNumber}
                            onChange={(e) => setPhoneNumber(e.target.value)}
                            className="w-full bg-white/[0.03] border border-white/10 rounded-xl py-3 px-4 text-sm text-white font-light focus:ring-1 focus:ring-emerald-400/50 outline-none"
                          />
                          <p className="text-[10px] text-white/30 mt-1">Inclua o código do país (55) e DDD.</p>
                        </div>
                        <button 
                          onClick={handleRequestPairingCode}
                          disabled={isRequestingCode || !phoneNumber}
                          className="w-full bg-emerald-400 text-black px-6 py-3 rounded-xl font-headline font-bold text-xs uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50"
                        >
                          {isRequestingCode ? 'Gerando...' : 'Gerar Código'}
                        </button>
                      </>
                    ) : (
                      <div className="space-y-4">
                        <p className="text-sm text-white font-medium">Seu código de pareamento:</p>
                        <div className="bg-white/5 border border-white/10 p-6 rounded-2xl">
                          <span className="text-4xl font-mono font-bold text-emerald-400 tracking-[0.2em]">{pairingCode}</span>
                        </div>
                        <p className="text-xs text-white/40 leading-relaxed">
                          Abra o WhatsApp no seu celular, vá em Aparelhos Conectados &gt; Conectar com número de telefone e insira o código acima.
                        </p>
                        <button 
                          onClick={() => setPairingCode(null)}
                          className="text-[10px] text-white/50 hover:text-white uppercase tracking-widest font-bold"
                        >
                          Gerar novo código
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {whatsappStatus === 'ready' && (
                  <div className="bg-emerald-500/10 text-emerald-500 py-3 rounded-xl text-xs font-bold uppercase tracking-widest mt-4">
                    Conectado com Sucesso!
                  </div>
                )}
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* New Scanner Job Modal */}
        <AnimatePresence>
          {showNewJobModal === 'shopify' && (
            <div className="fixed inset-0 z-[105] flex items-center justify-center p-6">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowNewJobModal(null)} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
              <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative bg-[#0a0a0a] border border-white/10 p-8 rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col">
                <div className="flex justify-between items-center mb-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-secondary/10 flex items-center justify-center border border-secondary/30">
                      <ShoppingBag className="w-6 h-6 text-secondary" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-white">Configurar Shopify Scanner</h2>
                      <p className="text-xs text-white/40 uppercase tracking-widest mt-1">Insira as URLs alvo para varredura</p>
                    </div>
                  </div>
                  <button onClick={() => setShowNewJobModal(null)} className="text-white/30 hover:text-white transition-colors bg-white/5 hover:bg-white/10 p-2 rounded-xl">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                
                <div className="space-y-6">
                  <div>
                    <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-3">URLs (Uma por linha)</label>
                    <textarea 
                      value={jobUrlsInput}
                      onChange={(e) => setJobUrlsInput(e.target.value)}
                      placeholder="https://loja1.com&#10;https://loja2.com"
                      className="w-full h-48 bg-white/[0.02] border border-white/10 rounded-xl p-4 text-sm text-white font-mono leading-relaxed focus:border-secondary/50 focus:outline-none focus:ring-1 focus:ring-secondary/50 resize-none shadow-inner"
                    />
                  </div>
                  
                  <div className="bg-secondary/5 border border-secondary/20 rounded-xl p-5 flex gap-4">
                    <Info className="w-5 h-5 text-secondary shrink-0" />
                    <p className="text-xs text-white/60 leading-relaxed">
                      O robô irá iterar por todas as URLs processando as métricas e o <strong className="text-emerald-400">Score de Qualificação</strong> de forma inteligente. Ao iniciar, você acompanha o log rodando em tempo real.
                    </p>
                  </div>
                </div>

                <div className="mt-8 flex justify-end gap-3 border-t border-white/10 pt-6">
                  <button 
                    onClick={() => setShowNewJobModal(null)} 
                    className="px-6 py-3 rounded-xl font-bold text-sm text-white/40 hover:text-white hover:bg-white/5 transition-all"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={submitScraperJob}
                    disabled={!jobUrlsInput.trim() || isShopifyScannerRunning}
                    className="px-8 py-3 rounded-xl bg-secondary text-black font-bold text-sm shadow-[0_0_20px_rgba(233,179,255,0.3)] transition-all flex items-center gap-2 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                  >
                    <Zap className="w-4 h-4 fill-black" />
                    INICIAR VARREDURA ASSÍNCRONA
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Scraper Logs Terminal Modal */}
        <AnimatePresence>
          {showLogsModal && (
            <div className="fixed inset-0 z-[120] flex items-center justify-center p-6">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => !isShopifyScannerRunning && setShowLogsModal(false)} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
              <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative bg-[#0a0a0a] border border-white/10 p-6 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col h-[75vh]">
                <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4">
                  <div className="flex items-center gap-4">
                    <div className="flex gap-2">
                      <div className="w-3.5 h-3.5 rounded-full bg-red-500/80 shadow-[0_0_10px_rgba(239,68,68,0.3)]"></div>
                      <div className="w-3.5 h-3.5 rounded-full bg-amber-500/80 shadow-[0_0_10px_rgba(245,158,11,0.3)]"></div>
                      <div className="w-3.5 h-3.5 rounded-full bg-emerald-500/80 shadow-[0_0_10px_rgba(16,185,129,0.3)]"></div>
                    </div>
                    <span className="text-sm font-mono text-white/50 bg-white/5 px-4 py-1.5 rounded-full font-medium">shopify_core_engine.py — Terminal</span>
                  </div>
                  <button onClick={() => setShowLogsModal(false)} className="text-white/30 hover:text-white transition-colors bg-white/5 hover:bg-white/10 p-2 rounded-xl">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto bg-black border border-white/5 rounded-2xl p-6 font-mono text-sm leading-relaxed text-emerald-400/90 space-y-2 shadow-inner">
                  {scraperLogs.map((log, i) => (
                    <div key={i} className={`${log.includes('[ERRO') ? 'text-red-400' : log.includes('hot') ? 'text-amber-400 font-bold' : ''}`}>{log}</div>
                  ))}
                  {isShopifyScannerRunning && <div className="text-emerald-400 animate-pulse mt-4">_</div>}
                  <div ref={(el) => el?.scrollIntoView({ behavior: 'smooth' })} />
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
