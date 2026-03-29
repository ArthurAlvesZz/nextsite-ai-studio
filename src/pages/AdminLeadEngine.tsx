import React, { useState } from 'react';
import AdminSidebar from '../components/AdminSidebar';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Filter, Download, MoreHorizontal, ArrowUpRight, ChevronRight, Zap, Users, Target, BarChart3, MessageSquare, Phone, Mail, Globe, MapPin, Calendar, Clock, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

interface Lead {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  status: 'new' | 'contacted' | 'qualified' | 'lost';
  source: string;
  value: number;
  lastContact: string;
  score: number;
}

const mockLeads: Lead[] = [
  { id: '1', name: 'Ricardo Santos', company: 'TechFlow Solutions', email: 'ricardo@techflow.com', phone: '+55 11 98888-7777', status: 'qualified', source: 'LinkedIn', value: 15000, lastContact: '2024-03-28', score: 85 },
  { id: '2', name: 'Ana Oliveira', company: 'Creative Minds', email: 'ana@creative.io', phone: '+55 21 97777-6666', status: 'new', source: 'Google Ads', value: 8000, lastContact: '2024-03-29', score: 62 },
  { id: '3', name: 'Marcos Pereira', company: 'Global Logistics', email: 'marcos@global.log', phone: '+55 31 96666-5555', status: 'contacted', source: 'Referral', value: 25000, lastContact: '2024-03-27', score: 94 },
  { id: '4', name: 'Juliana Lima', company: 'EcoStyle', email: 'juliana@ecostyle.com', phone: '+55 41 95555-4444', status: 'lost', source: 'Instagram', value: 5000, lastContact: '2024-03-25', score: 45 },
  { id: '5', name: 'Fabio Costa', company: 'Smart Systems', email: 'fabio@smart.sys', phone: '+55 11 94444-3333', status: 'qualified', source: 'Direct', value: 12000, lastContact: '2024-03-28', score: 78 },
];

export default function AdminLeadEngine() {
  const [activeTab, setActiveTab] = useState<'overview' | 'search' | 'transcription'>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  const stats = [
    { label: 'Total de Leads', value: '1,284', change: '+12%', icon: Users, color: 'text-blue-400' },
    { label: 'Qualificados', value: '452', change: '+8%', icon: Target, color: 'text-secondary' },
    { label: 'Taxa de Conversão', value: '18.4%', change: '+2.1%', icon: BarChart3, color: 'text-emerald-400' },
    { label: 'Valor em Pipeline', value: 'R$ 420k', change: '+15%', icon: Zap, color: 'text-amber-400' },
  ];

  const handleSearch = () => {
    setIsSearching(true);
    setTimeout(() => setIsSearching(false), 1500);
  };

  return (
    <div className="min-h-screen bg-[#020202] text-white font-body selection:bg-secondary selection:text-on-secondary flex">
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
          <nav className="flex items-center gap-8 mb-12 border-b border-white/5">
            {[
              { id: 'overview', label: 'Visão Geral', icon: BarChart3 },
              { id: 'search', label: 'Busca & Filtros', icon: Search },
              { id: 'transcription', label: 'Transcrição Ninja', icon: MessageSquare },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`pb-4 text-[10px] font-bold uppercase tracking-[0.3em] transition-all relative flex items-center gap-3 ${
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
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                  {stats.map((stat, index) => (
                    <div key={index} className="bg-white/[0.02] border border-white/5 p-8 rounded-[2rem] group hover:bg-white/[0.04] transition-all duration-500">
                      <div className="flex items-center justify-between mb-6">
                        <div className={`w-12 h-12 rounded-2xl bg-white/[0.03] flex items-center justify-center border border-white/5 group-hover:scale-110 transition-transform duration-500`}>
                          <stat.icon className={`w-6 h-6 ${stat.color}`} />
                        </div>
                        <span className="text-[10px] font-bold text-emerald-400 bg-emerald-400/10 px-3 py-1 rounded-full">{stat.change}</span>
                      </div>
                      <div className="text-3xl font-headline font-bold text-white mb-2">{stat.value}</div>
                      <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/30">{stat.label}</div>
                    </div>
                  ))}
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
                        {mockLeads.map((lead) => (
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

            {activeTab === 'search' && (
              <motion.div
                key="search"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-8"
              >
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
                  <button 
                    onClick={handleSearch}
                    disabled={isSearching}
                    className="px-12 py-6 bg-secondary text-on-secondary rounded-[1.5rem] text-[10px] font-bold uppercase tracking-[0.2em] transition-all hover:scale-105 disabled:opacity-50 disabled:scale-100 flex items-center gap-3"
                  >
                    {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                    Pesquisar
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  {['Status', 'Fonte', 'Valor Mínimo', 'Data'].map((filter) => (
                    <button key={filter} className="p-6 bg-white/[0.01] border border-white/5 rounded-2xl flex items-center justify-between hover:bg-white/[0.03] transition-all group">
                      <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40 group-hover:text-white transition-colors">{filter}</span>
                      <Filter className="w-4 h-4 text-white/20" />
                    </button>
                  ))}
                </div>

                <div className="p-20 border border-dashed border-white/10 rounded-[3rem] flex flex-col items-center text-center">
                  <div className="w-20 h-20 rounded-full bg-white/[0.02] flex items-center justify-center mb-8 border border-white/5">
                    <Search className="w-8 h-8 text-white/10" />
                  </div>
                  <h3 className="text-2xl font-headline font-bold text-white mb-4">Inicie sua busca</h3>
                  <p className="text-white/40 text-sm max-w-md leading-relaxed font-light">
                    Utilize os filtros acima para encontrar leads específicos ou use a barra de busca para localizar por dados de contato.
                  </p>
                </div>
              </motion.div>
            )}

            {activeTab === 'transcription' && (
              <motion.div
                key="transcription"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-12"
              >
                <div className="max-w-3xl">
                  <h2 className="text-3xl font-headline font-bold text-white mb-6">Transcrição Ninja (Groq Cloud)</h2>
                  <p className="text-white/40 text-lg font-light leading-relaxed mb-12">
                    Converta áudios de reuniões, ligações ou mensagens de voz do WhatsApp em texto qualificado instantaneamente usando o modelo Whisper via Groq.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
                    <div className="p-8 bg-white/[0.02] border border-white/5 rounded-[2rem] space-y-4">
                      <div className="w-12 h-12 rounded-2xl bg-amber-400/10 flex items-center justify-center border border-amber-400/20">
                        <Zap className="w-6 h-6 text-amber-400" />
                      </div>
                      <h4 className="text-lg font-bold text-white">Velocidade Surreal</h4>
                      <p className="text-xs text-white/40 leading-relaxed">Transcrição em milissegundos usando a infraestrutura LPU da Groq Cloud.</p>
                    </div>
                    <div className="p-8 bg-white/[0.02] border border-white/5 rounded-[2rem] space-y-4">
                      <div className="w-12 h-12 rounded-2xl bg-blue-400/10 flex items-center justify-center border border-blue-400/20">
                        <CheckCircle2 className="w-6 h-6 text-blue-400" />
                      </div>
                      <h4 className="text-lg font-bold text-white">Precisão Whisper</h4>
                      <p className="text-xs text-white/40 leading-relaxed">O melhor modelo de reconhecimento de fala do mundo agora no seu CRM.</p>
                    </div>
                  </div>

                  <div className="p-12 bg-white/[0.01] border border-white/5 rounded-[3rem] flex flex-col items-center text-center border-dashed group hover:border-secondary/30 transition-all">
                    <div className="w-24 h-24 rounded-full bg-secondary/10 flex items-center justify-center mb-8 border border-secondary/20 group-hover:scale-110 transition-transform duration-700">
                      <MessageSquare className="w-10 h-10 text-secondary" />
                    </div>
                    <h3 className="text-2xl font-headline font-bold text-white mb-4">Arraste seu áudio aqui</h3>
                    <p className="text-white/40 text-sm mb-10 max-w-xs leading-relaxed">Suporta MP3, WAV, M4A e OGG. Tamanho máximo: 25MB.</p>
                    <button className="px-12 py-5 bg-white text-black rounded-2xl text-[10px] font-bold uppercase tracking-[0.3em] hover:scale-105 transition-all shadow-2xl">
                      Selecionar Arquivo
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Floating Action Button */}
        <button className="fixed bottom-10 right-10 w-16 h-16 bg-white text-black rounded-full shadow-[0_0_50px_rgba(255,255,255,0.2)] flex items-center justify-center hover:scale-110 transition-transform z-50">
          <Zap className="w-6 h-6 fill-current" />
        </button>
      </main>
    </div>
  );
}
