import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { motion, AnimatePresence } from 'motion/react';
import { LeadColhido } from '../types/lead';
import { 
  ArrowLeft, 
  ExternalLink, 
  Mail, 
  Instagram, 
  Phone, 
  Send, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  MoreHorizontal,
  Globe,
  Library,
  MessageSquare,
  History,
  Zap,
  Target,
  Brain,
  Activity,
  LayoutDashboard,
  Loader2
} from 'lucide-react';

const LeadDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [lead, setLead] = useState<LeadColhido | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);

  const handleSendNextZap = async () => {
    if (!lead || !lead.whatsapp) {
      alert('Lead sem número de WhatsApp.');
      return;
    }

    const user = auth.currentUser;
    if (!user) {
      alert('Você precisa estar logado.');
      return;
    }

    setIsSending(true);
    try {
      const token = await user.getIdToken();
      
      // First check status
      const statusRes = await fetch('/api/whatsapp/status', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const statusData = await statusRes.json();
      
      if (statusData.status !== 'ready') {
        alert('WhatsApp não está conectado. Conecte-o no Lead Engine.');
        setIsSending(false);
        return;
      }

      const res = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          to: lead.whatsapp.replace(/\D/g, ''),
          message: lead.abordagemWhatsApp
        })
      });

      if (res.ok) {
        alert('Mensagem enviada com sucesso!');
        // Update last contact in Firestore
        const docRef = doc(db, 'leadsColhidos', lead.id);
        const now = new Date().toISOString();
        await updateDoc(docRef, {
          lastContact: now,
          status: 'contacted',
          latestLog: 'Mensagem enviada via NextZap'
        });
        setLead(prev => prev ? { 
          ...prev, 
          status: 'contacted', 
          lastContact: now, 
          latestLog: 'Mensagem enviada via NextZap' 
        } : null);
      } else {
        const data = await res.json();
        alert(`Erro ao enviar: ${data.error || 'Erro desconhecido'}`);
      }
    } catch (err) {
      console.error('Erro ao enviar via NextZap:', err);
      alert('Erro na comunicação com o servidor.');
    } finally {
      setIsSending(false);
    }
  };

  useEffect(() => {
    const fetchLead = async () => {
      if (!id) return;
      try {
        const docRef = doc(db, 'leadsColhidos', id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setLead({ id: docSnap.id, ...docSnap.data() } as LeadColhido);
        } else {
          setError('Lead não encontrado.');
        }
      } catch (err) {
        console.error('Erro ao buscar lead:', err);
        setError('Falha ao carregar dados do lead.');
      } finally {
        setLoading(false);
      }
    };

    fetchLead();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0e0e0e] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
          <p className="text-white/40 text-sm font-medium animate-pulse">Carregando inteligência do lead...</p>
        </div>
      </div>
    );
  }

  if (error || !lead) {
    return (
      <div className="min-h-screen bg-[#0e0e0e] flex flex-col items-center justify-center p-6">
        <div className="bg-red-500/10 border border-red-500/20 p-8 rounded-3xl max-w-md text-center">
          <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Erro</h2>
          <p className="text-white/60 mb-6">{error || 'Lead não encontrado'}</p>
          <Link to="/admin/lead-engine" className="inline-flex items-center gap-2 bg-white/5 hover:bg-white/10 text-white px-6 py-3 rounded-full transition-all">
            <ArrowLeft className="w-4 h-4" />
            Voltar para Lead Engine
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0e0e0e] text-white font-headline selection:bg-primary selection:text-on-primary">
      {/* TopNavBar */}
      <nav className="fixed top-0 w-full z-50 bg-[#0e0e0e]/80 backdrop-blur-xl border-b border-white/5 shadow-[0_8px_32px_0_rgba(0,0,0,0.4)] flex justify-between items-center px-8 h-16">
        <div className="flex items-center gap-8">
          <Link to="/admin/dashboard" className="text-xl font-black text-[#97a9ff] tracking-tighter">Prospector AI</Link>
          <div className="hidden md:flex gap-6 items-center">
            <Link to="/admin/dashboard" className="text-white/60 hover:text-white transition-colors text-sm font-medium">Dashboard</Link>
            <Link to="/admin/lead-engine" className="text-[#97a9ff] border-b-2 border-[#97a9ff] pb-1 text-sm font-medium">Leads</Link>
            <Link to="/admin/tools" className="text-white/60 hover:text-white transition-colors text-sm font-medium">Ferramentas</Link>
            <Link to="/admin/settings" className="text-white/60 hover:text-white transition-colors text-sm font-medium">Configurações</Link>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button className="p-2 text-white/60 hover:bg-white/5 rounded-full transition-all">
            <span className="material-symbols-outlined">notifications</span>
          </button>
          <Link to="/admin/profile" className="h-8 w-8 rounded-full bg-white/5 flex items-center justify-center overflow-hidden border border-white/10">
            <img src={auth.currentUser?.photoURL || "https://lh3.googleusercontent.com/a/default-user=s96-c"} alt="User" className="w-full h-full object-cover" />
          </Link>
          <button 
            onClick={handleSendNextZap}
            disabled={isSending}
            className="bg-primary text-on-primary font-bold px-4 py-2 rounded-full text-sm hover:opacity-90 active:scale-95 transition-all disabled:opacity-50 flex items-center gap-2"
          >
            {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Send via NextZap
          </button>
        </div>
      </nav>

      {/* SideNavBar */}
      <aside className="fixed left-0 top-16 h-[calc(100vh-64px)] w-64 bg-[#131313] flex flex-col py-6 border-r border-white/5">
        <div className="px-6 mb-8">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-8 h-8 rounded-lg bg-[#97a9ff]/20 flex items-center justify-center">
              <Target className="w-4 h-4 text-[#97a9ff]" />
            </div>
            <div>
              <h3 className="text-white font-bold text-sm">Lead Detail</h3>
              <p className="text-white/40 text-[10px] uppercase tracking-widest">High Intent Prospect</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 space-y-1">
          <button className="w-full flex items-center gap-3 text-white/40 py-3 px-6 hover:text-white/80 transition-all hover:bg-white/5">
            <Activity className="w-4 h-4" />
            <span className="text-sm font-medium">Overview</span>
          </button>
          <button className="w-full flex items-center gap-3 text-white/40 py-3 px-6 hover:text-white/80 transition-all hover:bg-white/5">
            <Zap className="w-4 h-4" />
            <span className="text-sm font-medium">Activity</span>
          </button>
          <button className="w-full flex items-center gap-3 bg-[#97a9ff]/10 text-[#97a9ff] rounded-r-full py-3 px-6 border-l-4 border-[#97a9ff] transition-all">
            <Brain className="w-4 h-4" />
            <span className="text-sm font-medium">Pain Points</span>
          </button>
          <button className="w-full flex items-center gap-3 text-white/40 py-3 px-6 hover:text-white/80 transition-all hover:bg-white/5">
            <Zap className="w-4 h-4" />
            <span className="text-sm font-medium">Intelligence</span>
          </button>
          <button className="w-full flex items-center gap-3 text-white/40 py-3 px-6 hover:text-white/80 transition-all hover:bg-white/5">
            <History className="w-4 h-4" />
            <span className="text-sm font-medium">History</span>
          </button>
        </nav>
        <div className="mt-auto px-6 pt-6 border-t border-white/5 space-y-4">
          <button className="flex items-center gap-3 text-white/40 text-sm hover:text-white/80 transition-colors">
            <AlertCircle className="w-4 h-4" />
            Support
          </button>
          <button className="w-full bg-white/5 border border-white/10 text-white/80 text-xs font-bold uppercase tracking-widest py-3 rounded-xl hover:bg-white/10 transition-all">
            Export Lead
          </button>
        </div>
      </aside>

      {/* Main Content Canvas */}
      <main className="ml-64 pt-24 px-10 pb-20 max-w-[1600px] mx-auto">
        {/* Header Section */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="bg-secondary/20 text-secondary px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest">
                {lead.status === 'novo' ? 'Hot Lead' : lead.status}
              </span>
              <span className="text-white/40 text-xs font-mono tracking-tighter">ID: {lead.id.substring(0, 8).toUpperCase()}</span>
            </div>
            <h1 className="text-6xl md:text-8xl font-black tracking-tighter text-white leading-none">
              {lead.razaoSocial || lead.dominio?.split('.')[0] || 'Lead'}
            </h1>
            <div className="flex items-center gap-6 pt-2">
              <div className="flex items-center gap-2 text-white/60">
                <span className="material-symbols-outlined text-primary">shopping_bag</span>
                <span className="text-sm font-medium">{lead.nicho}</span>
              </div>
              <div className="flex items-center gap-2 text-white/60">
                <span className="material-symbols-outlined text-primary">link</span>
                <a href={lead.url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium underline underline-offset-4 decoration-primary/40 hover:decoration-primary transition-all">
                  {lead.dominio}
                </a>
              </div>
              <div className="flex items-center gap-2 text-white/60">
                <span className="material-symbols-outlined text-primary">ads_click</span>
                <span className="text-sm font-medium">Source: Ad Library</span>
              </div>
            </div>
          </div>
          <div className="relative group">
            <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full scale-125"></div>
            <div className="relative w-32 h-32 rounded-full border-[6px] border-primary/30 flex flex-col items-center justify-center bg-[#131313] shadow-[0_0_20px_rgba(151,169,255,0.2)]">
              <span className="text-4xl font-black text-primary">{lead.score}</span>
              <span className="text-[10px] uppercase font-bold tracking-widest text-primary/60">Score</span>
            </div>
          </div>
        </header>

        {/* Bento Layout */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Painel de Dor (Priority Box) */}
          <section className="md:col-span-8 bg-[#131313]/70 backdrop-blur-xl border-l-8 border-secondary rounded-xl p-8 shadow-2xl relative overflow-hidden border border-white/5">
            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
              <span className="material-symbols-outlined text-[120px]" style={{ fontVariationSettings: "'FILL' 1" }}>warning</span>
            </div>
            <div className="flex items-center gap-3 mb-6">
              <span className="material-symbols-outlined text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>psychology</span>
              <h2 className="text-xl font-bold tracking-tight uppercase tracking-widest text-secondary">Painel de Dor</h2>
            </div>
            <p className="text-2xl md:text-3xl font-bold leading-relaxed text-white">
              <span className="text-secondary">Atenção:</span> {lead.painPanel}
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              {lead.tags.map((tag, idx) => (
                <div key={idx} className="bg-white/5 px-4 py-2 rounded-full flex items-center gap-2 border border-white/5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span className="text-sm font-medium text-white/80">{tag}</span>
                </div>
              ))}
            </div>
          </section>

          {/* CRM Quick Stats */}
          <section className="md:col-span-4 bg-[#1a1919] rounded-xl p-8 flex flex-col justify-between border border-white/5">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-white/40 mb-6">CRM Status</h3>
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <span className="text-white/60 text-sm">Current Status</span>
                  <span className="bg-primary/20 text-primary px-3 py-1 rounded-full text-xs font-bold capitalize">{lead.status}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-white/60 text-sm">Discovery</span>
                  <span className="text-white font-medium text-sm">
                    {lead.discoveryDate ? new Date(lead.discoveryDate).toLocaleDateString() : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-white/60 text-sm">Last Contact</span>
                  <span className="text-white font-medium text-sm">
                    {lead.lastContact ? new Date(lead.lastContact).toLocaleDateString() : 'Never'}
                  </span>
                </div>
              </div>
            </div>
            <div className="mt-8 pt-6 border-t border-white/5">
              <div className="flex items-center gap-3 text-white/60 mb-2">
                <MessageSquare className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-widest">Latest Log</span>
              </div>
              <p className="text-xs italic text-white/40 leading-relaxed">
                "{lead.latestLog || 'No logs recorded yet.'}"
              </p>
            </div>
          </section>

          {/* Traffic & Tech Signals */}
          <section className="md:col-span-4 bg-[#131313] rounded-xl p-8 border border-white/5">
            <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-white/40 mb-8">Traffic Signals</h3>
            <div className="grid grid-cols-2 gap-y-8">
              <div>
                <p className="text-[10px] text-white/40 uppercase mb-1">Runs Ads</p>
                <p className={`text-lg font-bold ${lead.trafficSignals?.runsAds === 'SIM' ? 'text-emerald-400' : 'text-red-400'}`}>
                  {lead.trafficSignals?.runsAds || 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-white/40 uppercase mb-1">Platform</p>
                <p className="text-lg font-bold text-white">{lead.trafficSignals?.platform || 'N/A'}</p>
              </div>
              <div className="col-span-2">
                <p className="text-[10px] text-white/40 uppercase mb-1">Format (High Pain)</p>
                <p className="text-lg font-bold text-secondary">{lead.trafficSignals?.format || 'N/A'}</p>
              </div>
              <div>
                <p className="text-[10px] text-white/40 uppercase mb-1">Pixel</p>
                <p className={`text-lg font-bold ${lead.trafficSignals?.pixel === 'Detectado' ? 'text-emerald-400' : 'text-red-400'}`}>
                  {lead.trafficSignals?.pixel || 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-white/40 uppercase mb-1">Video Page</p>
                <p className={`text-lg font-bold ${lead.trafficSignals?.videoPage === 'Presente' ? 'text-emerald-400' : 'text-red-400'}`}>
                  {lead.trafficSignals?.videoPage || 'N/A'}
                </p>
              </div>
            </div>
          </section>

          {/* AI Intelligence Details */}
          <section className="md:col-span-8 bg-[#131313]/70 backdrop-blur-xl rounded-xl p-8 border border-white/10 relative">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-white/40">AI Intelligence Analysis</h3>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                <span className="text-[10px] font-bold uppercase text-white/60 tracking-widest">
                  Temp: {lead.score > 80 ? 'Hot' : lead.score > 50 ? 'Warm' : 'Cold'}
                </span>
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-12">
              <div className="space-y-6">
                <div>
                  <div className="flex items-center gap-2 text-emerald-400 mb-3">
                    <span className="material-symbols-outlined text-sm">add_circle</span>
                    <span className="text-xs font-bold uppercase tracking-widest">Positive Signs</span>
                  </div>
                  <ul className="space-y-3">
                    {lead.aiAnalysis?.positiveSigns?.map((sign, idx) => (
                      <li key={idx} className="flex items-center gap-3 text-sm text-white/80">
                        <span className="w-1 h-1 rounded-full bg-emerald-400"></span>
                        {sign}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <div className="flex items-center gap-2 text-white/20 mb-3">
                    <span className="material-symbols-outlined text-sm">remove_circle</span>
                    <span className="text-xs font-bold uppercase tracking-widest">Negative Signs</span>
                  </div>
                  {lead.aiAnalysis?.negativeSigns?.length > 0 ? (
                    <ul className="space-y-3">
                      {lead.aiAnalysis.negativeSigns.map((sign, idx) => (
                        <li key={idx} className="flex items-center gap-3 text-sm text-white/40">
                          <span className="w-1 h-1 rounded-full bg-white/20"></span>
                          {sign}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-white/40">None detected. High convertibility profile.</p>
                  )}
                </div>
              </div>
              <div className="bg-[#1a1919] rounded-xl p-6 border border-white/5">
                <div className="flex items-center gap-2 text-primary mb-4">
                  <span className="material-symbols-outlined text-sm">auto_awesome</span>
                  <span className="text-xs font-bold uppercase tracking-widest">Suggested Template</span>
                </div>
                <p className="text-lg font-bold text-white mb-2">"{lead.aiAnalysis?.suggestedTemplate?.name || 'N/A'}"</p>
                <p className="text-xs text-white/60 leading-relaxed">{lead.aiAnalysis?.suggestedTemplate?.description || 'N/A'}</p>
              </div>
            </div>
          </section>

          {/* Contact & Social */}
          <section className="md:col-span-12 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-[#1a1919] rounded-xl p-6 flex items-center justify-between border border-white/5 group hover:bg-[#201f1f] transition-all cursor-pointer">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-[#25D366]/10 flex items-center justify-center text-[#25D366]">
                  <Phone className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-[10px] text-white/40 uppercase tracking-widest">WhatsApp</p>
                  <p className="font-bold">{lead.whatsapp || 'Not found'}</p>
                </div>
              </div>
              <ArrowLeft className="w-4 h-4 text-white/20 group-hover:text-white transition-all rotate-180" />
            </div>
            <div className="bg-[#1a1919] rounded-xl p-6 flex items-center justify-between border border-white/5 group hover:bg-[#201f1f] transition-all cursor-pointer">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-secondary/10 flex items-center justify-center text-secondary">
                  <Instagram className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-[10px] text-white/40 uppercase tracking-widest">Instagram</p>
                  <p className="font-bold">{lead.instagram ? `@${lead.instagram.split('/').pop()}` : 'Not found'}</p>
                </div>
              </div>
              <ExternalLink className="w-4 h-4 text-white/20 group-hover:text-white transition-all" />
            </div>
            <div className="bg-[#1a1919] rounded-xl p-6 flex items-center justify-between border border-white/5 group hover:bg-[#201f1f] transition-all cursor-pointer">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  <Mail className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-[10px] text-white/40 uppercase tracking-widest">Email</p>
                  <p className="font-bold">contact@{lead.dominio}</p>
                </div>
              </div>
              <ArrowLeft className="w-4 h-4 text-white/20 group-hover:text-white transition-all rotate-180" />
            </div>
          </section>
        </div>

        {/* Call to Action Section */}
        <section className="mt-16 bg-[#262626] rounded-[3rem] p-12 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-400/10 to-transparent pointer-events-none"></div>
          <div className="relative z-10 flex flex-col md:flex-row items-center gap-12">
            <div className="flex-1 space-y-6">
              <div className="inline-flex items-center gap-2 bg-emerald-400/20 text-emerald-400 px-4 py-1 rounded-full text-xs font-bold uppercase tracking-widest">
                <Zap className="w-3 h-3" />
                AI Approach Ready
              </div>
              <div className="space-y-4">
                <p className="text-white/40 text-sm font-medium">Draft Message Preview:</p>
                <div className="bg-black/40 p-6 rounded-2xl border border-white/5 italic text-white/80 leading-relaxed text-lg">
                  "{lead.abordagemWhatsApp}"
                </div>
              </div>
            </div>
            <div className="w-full md:w-auto flex flex-col gap-4">
              <button 
                onClick={handleSendNextZap}
                disabled={isSending}
                className="bg-emerald-400 text-[#004820] hover:scale-[1.02] active:scale-95 transition-all px-12 py-6 rounded-full font-black text-xl flex items-center justify-center gap-4 shadow-[0_0_30px_rgba(63,255,139,0.3)] disabled:opacity-50"
              >
                {isSending ? <Loader2 className="w-6 h-6 animate-spin" /> : <Send className="w-6 h-6" />}
                Disparar Oferta via NextZap
              </button>
              <div className="flex items-center justify-center gap-4">
                <button className="p-4 rounded-full bg-white/5 border border-white/10 text-white/60 hover:text-white transition-all">
                  <Globe className="w-5 h-5" />
                </button>
                <button className="p-4 rounded-full bg-white/5 border border-white/10 text-white/60 hover:text-white transition-all">
                  <Library className="w-5 h-5" />
                </button>
                <button className="p-4 rounded-full bg-white/5 border border-white/10 text-white/60 hover:text-white transition-all">
                  <MoreHorizontal className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Map/Location Decoration */}
      <div className="fixed bottom-10 right-10 w-48 h-48 rounded-3xl overflow-hidden grayscale opacity-30 pointer-events-none border border-white/10">
        <div className="w-full h-full bg-[#201f1f] flex items-center justify-center">
          <div className="absolute inset-0 bg-gradient-to-t from-[#0e0e0e] to-transparent"></div>
          <span className="material-symbols-outlined text-white/10 text-6xl">map</span>
        </div>
      </div>
    </div>
  );
};

export default LeadDetail;
