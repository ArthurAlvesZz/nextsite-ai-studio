import React, { useState, useEffect, useRef } from 'react';
import SEO from '../components/SEO';
import { motion, AnimatePresence } from 'motion/react';
import { io, Socket } from 'socket.io-client';
import { auth } from '../firebase';
import { 
  Search, 
  MoreVertical, 
  MessageSquare, 
  Phone, 
  Video, 
  Paperclip, 
  Smile, 
  Send, 
  User, 
  Settings, 
  LogOut, 
  Check, 
  CheckCheck,
  Clock,
  Filter,
  Plus,
  ArrowLeft,
  Info,
  Zap,
  Star,
  Archive,
  Trash2,
  Image as ImageIcon,
  FileText,
  UserPlus,
  X,
  RefreshCw,
  QrCode
} from 'lucide-react';
import AdminSidebar from '../components/AdminSidebar';
import { usePageTitle } from '../hooks/usePageTitle';

interface Chat {
  id: string;
  name: string;
  lastMessage?: string;
  timestamp?: number;
  unreadCount?: number;
  avatar?: string;
  status?: 'online' | 'offline' | 'away';
}

interface Message {
  id: string;
  text: string;
  sender: 'me' | 'them';
  timestamp: number;
  status: 'sent' | 'delivered' | 'read';
  type?: 'text' | 'image' | 'video' | 'audio' | 'document';
  transcription?: string;
  isTranscribing?: boolean;
}

const AdminNextZap: React.FC = () => {
  usePageTitle('NextZap CRM');
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'groups'>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [whatsappStatus, setWhatsappStatus] = useState<'disconnected' | 'connecting' | 'qr' | 'ready'>('disconnected');
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [userInfo, setUserInfo] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);
  const selectedChatRef = useRef<Chat | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchStatus = async () => {
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch('/api/whatsapp/status', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setWhatsappStatus(data.status);
      setQrCode(data.qr);
      setUserInfo(data.user);
      
      if (data.status === 'ready') {
        fetchChats();
      }
    } catch (error) {
      console.error("Error fetching WhatsApp status:", error);
    }
  };

  const fetchChats = async () => {
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch('/api/whatsapp/chats', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const mappedChats = data.map((c: any) => ({
          id: c.id,
          name: c.name || c.id.split('@')[0],
          lastMessage: c.lastMessageText || 'Nova Mensagem',
          timestamp: c.lastMessageTimestamp ? Number(c.lastMessageTimestamp) * 1000 : Date.now(),
          unreadCount: c.unreadCount || 0,
          leadScore: c.leadScore || 0,
          avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(c.name || c.id.split('@')[0])}&background=random`,
        })).sort((a: any, b: any) => b.leadScore - a.leadScore);
        setChats(mappedChats);
      }
    } catch (error) {
      console.error("Error fetching chats:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMessages = async (jid: string) => {
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch(`/api/whatsapp/messages/${encodeURIComponent(jid)}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        const mappedMessages = data.map((m: any) => {
          let type: Message['type'] = 'text';
          let text = m.message?.conversation || m.message?.extendedTextMessage?.text || '';
          
          if (m.message?.imageMessage) {
            type = 'image';
            text = m.message.imageMessage.url || 'Imagem';
          } else if (m.message?.videoMessage) {
            type = 'video';
            text = m.message.videoMessage.url || 'Vídeo';
          } else if (m.message?.audioMessage) {
            type = 'audio';
            text = 'Mensagem de áudio';
          } else if (m.message?.documentMessage) {
            type = 'document';
            text = m.message.documentMessage.fileName || 'Documento';
          }

          return {
            id: m.key.id,
            text,
            type,
            sender: m.key.fromMe ? 'me' : 'them',
            timestamp: m.messageTimestamp ? m.messageTimestamp * 1000 : Date.now(),
            status: m.status === 4 ? 'read' : m.status === 3 ? 'delivered' : 'sent'
          };
        });
        setMessages(mappedMessages);
      }
    } catch (error) {
      console.error("Error fetching messages:", error);
    }
  };

  // Keep selectedChatRef in sync so the socket handler can read it without stale closure
  useEffect(() => {
    selectedChatRef.current = selectedChat;
  }, [selectedChat]);

  // ── Socket.IO real-time connection ──────────────────────────────────────────
  useEffect(() => {
    let socket: Socket;

    const connectSocket = async () => {
      const token = await auth.currentUser?.getIdToken();
      if (!token) return;

      socket = io({ auth: { token } });
      socketRef.current = socket;

      socket.on('connect', () => {
        console.log('[NextZap] Socket connected:', socket.id);
      });

      // Real-time status + QR from server
      socket.on('whatsapp:status', (data: { status: typeof whatsappStatus; qr: string | null; user: any }) => {
        setWhatsappStatus(data.status);
        setQrCode(data.qr);
        setUserInfo(data.user);
        if (data.status === 'ready') {
          fetchChats();
        }
      });

      // Real-time incoming messages
      socket.on('whatsapp:message', (msg: any) => {
        const jid = msg.key?.remoteJid;
        if (!jid) return;

        // Derive message shape same as fetchMessages
        let type: Message['type'] = 'text';
        let text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
        if (msg.message?.imageMessage) { type = 'image'; text = msg.message.imageMessage.url || 'Imagem'; }
        else if (msg.message?.videoMessage) { type = 'video'; text = msg.message.videoMessage.url || 'Vídeo'; }
        else if (msg.message?.audioMessage) { type = 'audio'; text = 'Mensagem de áudio'; }
        else if (msg.message?.documentMessage) { type = 'document'; text = msg.message.documentMessage.fileName || 'Documento'; }

        const newMsg: Message = {
          id: msg.key.id,
          text,
          type,
          sender: msg.key.fromMe ? 'me' : 'them',
          timestamp: msg.messageTimestamp ? msg.messageTimestamp * 1000 : Date.now(),
          status: 'sent'
        };

        // Append to open chat if it matches, otherwise update unread count in list
        if (selectedChatRef.current?.id === jid) {
          setMessages(prev => {
            if (prev.some(m => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
        } else {
          setChats(prev => prev.map(c =>
            c.id === jid
              ? { ...c, lastMessage: text, timestamp: newMsg.timestamp, unreadCount: (c.unreadCount || 0) + 1 }
              : c
          ));
        }
      });

      socket.on('disconnect', () => {
        console.log('[NextZap] Socket disconnected');
      });
    };

    // Initial HTTP fetch for status (one-time, replaces the old polling)
    fetchStatus();
    connectSocket();

    return () => {
      socket?.disconnect();
      socketRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (selectedChat) {
      fetchMessages(selectedChat.id);
    }
  }, [selectedChat]);

  // Automatic transcription for new audio messages
  useEffect(() => {
    const untranscribedAudios = messages.filter(m => m.type === 'audio' && !m.transcription && !m.isTranscribing);
    if (untranscribedAudios.length > 0) {
      // Transcribe only the last one to avoid flooding
      const lastAudio = untranscribedAudios[untranscribedAudios.length - 1];
      transcribeAudio(lastAudio.id);
    }
  }, [messages]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newMessage.trim() || !selectedChat) return;

    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          phone: selectedChat.id.split('@')[0],
          message: newMessage
        })
      });

      if (res.ok) {
        const msg: Message = {
          id: Date.now().toString(),
          text: newMessage,
          sender: 'me',
          timestamp: Date.now(),
          status: 'sent'
        };
        setMessages(prev => [...prev, msg]);
        setNewMessage('');
      }
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const handleConnect = async () => {
    try {
      const token = await auth.currentUser?.getIdToken();
      await fetch('/api/whatsapp/connect', { 
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      fetchStatus();
    } catch (error) {
      console.error("Error connecting to WhatsApp:", error);
    }
  };

  const handleLogout = async () => {
    try {
      const token = await auth.currentUser?.getIdToken();
      await fetch('/api/whatsapp/logout', { 
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setWhatsappStatus('disconnected');
      setQrCode(null);
      setUserInfo(null);
      setChats([]);
      setSelectedChat(null);
    } catch (error) {
      console.error("Error logging out from WhatsApp:", error);
    }
  };
  
  const transcribeAudio = async (msgId: string) => {
    if (!selectedChat) return;
    
    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, isTranscribing: true } : m));
    
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch('/api/whatsapp/transcribe', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          jid: selectedChat.id,
          msgId
        })
      });
      
      if (res.ok) {
        const data = await res.json();
        setMessages(prev => prev.map(m => m.id === msgId ? { ...m, transcription: data.text, isTranscribing: false } : m));
      } else {
        throw new Error('Falha na transcrição');
      }
    } catch (error) {
      console.error("Error transcribing audio:", error);
      setMessages(prev => prev.map(m => m.id === msgId ? { ...m, isTranscribing: false } : m));
    }
  };

  const filteredChats = chats.filter(chat => {
    const matchesSearch = chat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          chat.id.includes(searchQuery);
    const matchesFilter = filterType === 'all' || (filterType === 'groups' && chat.id.endsWith('@g.us'));
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="flex h-[100dvh] bg-surface text-on-surface font-sans overflow-hidden relative">
      <SEO title="NextZap" />
      <AdminSidebar activePage="tools" isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      
      <main className="flex-1 lg:ml-64 flex overflow-hidden w-full relative">
        {/* Left Sidebar: Chat List */}
        <div className={`w-full lg:w-80 xl:w-96 flex-col border-r border-outline-variant/10 bg-surface-container-low shrink-0 h-full ${selectedChat ? 'hidden lg:flex' : 'flex'}`}>
          {/* Header */}
          <div className="h-[60px] px-4 flex items-center justify-between bg-surface-container shrink-0">
            <div className="flex items-center gap-3">
              <button 
                className="lg:hidden p-2 -ml-2 hover:bg-surface-container-high rounded-full text-on-surface transition-colors"
                onClick={() => setIsSidebarOpen(true)}
              >
                <div className="w-5 h-[2px] bg-current mb-1" />
                <div className="w-5 h-[2px] bg-current mb-1" />
                <div className="w-5 h-[2px] bg-current" />
              </button>
              <div className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center overflow-hidden shrink-0">
                {userInfo?.imgUrl ? (
                  <img src={userInfo.imgUrl} alt="Me" className="w-full h-full object-cover" />
                ) : (
                  <User size={24} className="text-on-surface-variant" />
                )}
              </div>
              <div className="flex flex-col truncate">
                <span className="text-sm font-medium truncate">{userInfo?.name || 'NextZap'}</span>
                <span className="text-[10px] text-on-surface-variant uppercase tracking-wider truncate">
                  {whatsappStatus === 'ready' ? 'Conectado' : 'Desconectado'}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1 md:gap-4 text-on-surface-variant shrink-0">
              <button className="p-2 hover:bg-surface-container-high rounded-full transition-colors" title="Novo Chat">
                <MessageSquare size={20} />
              </button>
              <div className="relative group">
                <button className="p-2 hover:bg-surface-container-high rounded-full transition-colors">
                  <MoreVertical size={20} />
                </button>
                <div className="absolute right-0 mt-2 w-48 bg-surface-container-high rounded shadow-xl border border-outline-variant/20 hidden group-hover:block z-50">
                  <button onClick={handleLogout} className="w-full px-4 py-3 text-left text-sm hover:bg-surface-container flex items-center gap-3">
                    <LogOut size={16} /> Sair
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Search */}
          <div className="p-2 bg-surface-container-low border-b border-outline-variant/10 shrink-0">
            <div className="relative flex items-center bg-surface-container rounded-lg px-3 py-1.5 group">
              <Search size={18} className="text-on-surface-variant group-focus-within:text-primary transition-colors shrink-0" />
              <input 
                type="text" 
                placeholder="Pesquisar nova conversa"
                className="bg-transparent border-none focus:ring-0 text-sm w-full ml-3 placeholder-on-surface-variant text-on-surface"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex gap-2 mt-2">
              <button 
                onClick={() => setFilterType('all')}
                className={`px-3 py-1 rounded-full text-xs ${filterType === 'all' ? 'bg-primary text-on-primary' : 'bg-surface-container-high text-on-surface'}`}
              >
                Todos
              </button>
              <button 
                onClick={() => setFilterType('groups')}
                className={`px-3 py-1 rounded-full text-xs ${filterType === 'groups' ? 'bg-primary text-on-primary' : 'bg-surface-container-high text-on-surface'}`}
              >
                Grupos
              </button>
            </div>
          </div>

          {/* Chat List */}
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {whatsappStatus !== 'ready' ? (
              <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                {whatsappStatus === 'qr' && qrCode ? (
                  <div className="bg-white p-4 rounded-lg mb-6">
                    <img src={qrCode} alt="WhatsApp QR Code" className="w-48 h-48" />
                    <p className="text-surface mt-2 text-xs font-bold">Escaneie para conectar</p>
                  </div>
                ) : (
                  <div className="mb-6 p-4 bg-surface-container rounded-full">
                    <QrCode size={48} className="text-primary" />
                  </div>
                )}
                <h3 className="text-lg font-medium mb-2">Conecte seu WhatsApp</h3>
                <p className="text-sm text-on-surface-variant mb-6">
                  Escaneie o código QR ou clique no botão abaixo para iniciar a conexão.
                </p>
                <button 
                  onClick={handleConnect}
                  disabled={whatsappStatus === 'connecting'}
                  className="px-6 py-2 bg-primary text-on-primary rounded-full font-bold hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {whatsappStatus === 'connecting' ? <RefreshCw className="animate-spin" size={18} /> : <Zap size={18} />}
                  {whatsappStatus === 'connecting' ? 'Conectando...' : 'Conectar Agora'}
                </button>
              </div>
            ) : isLoading ? (
              <div className="flex items-center justify-center h-full">
                <RefreshCw className="animate-spin text-primary" size={32} />
              </div>
            ) : filteredChats.length > 0 ? (
              filteredChats.map(chat => (
                <div 
                  key={chat.id}
                  onClick={() => setSelectedChat(chat)}
                  className={`flex items-center px-3 py-3 cursor-pointer transition-colors border-b border-outline-variant/10 ${selectedChat?.id === chat.id ? 'bg-surface-container-high' : 'hover:bg-surface-container'}`}
                >
                  <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0 bg-surface-container-high border border-outline-variant/20">
                    <img src={chat.avatar} alt={chat.name} className="w-full h-full object-cover" onError={(e) => (e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(chat.name)}&background=random`)} />
                  </div>
                  <div className="ml-3 flex-1 overflow-hidden">
                    <div className="flex justify-between items-center mb-1">
                      <h4 className="text-base font-normal truncate pr-2">{chat.name}</h4>
                      <span className="text-[11px] text-on-surface-variant whitespace-nowrap">
                        {new Date(chat.timestamp || 0).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <p className="text-sm text-on-surface-variant truncate flex-1 pr-2">{chat.lastMessage}</p>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${chat.leadScore > 70 ? 'bg-error text-on-error' : chat.leadScore > 50 ? 'bg-secondary text-on-secondary' : 'bg-surface-container-high text-on-surface-variant'}`}>
                          {chat.leadScore}
                        </span>
                        {chat.unreadCount ? (
                          <span className="bg-primary text-on-primary text-[11px] font-bold min-w-[20px] h-5 rounded-full flex items-center justify-center px-1">
                            {chat.unreadCount}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center h-full p-8 text-center text-on-surface-variant">
                <p>Nenhuma conversa encontrada.</p>
              </div>
            )}
          </div>
        </div>

        {/* Main Chat Window (Mobile slide-in, Desktop fixed) */}
        <AnimatePresence mode="wait">
          {selectedChat ? (
            <motion.div 
              key="chat-window"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="absolute inset-0 z-30 flex flex-col bg-surface lg:static lg:flex-1 lg:h-full lg:z-auto lg:transform-none"
            >
              {/* Chat Header */}
              <div className="h-[60px] px-4 flex items-center justify-between bg-surface-container border-b border-outline-variant/10 z-10 shrink-0">
                <div className="flex items-center gap-3 cursor-pointer overflow-hidden">
                  <button 
                    onClick={() => setSelectedChat(null)}
                    className="lg:hidden p-2 -ml-2 rounded-full hover:bg-surface-container-high transition-colors text-on-surface-variant shrink-0"
                  >
                    <ArrowLeft size={20} />
                  </button>
                  <div className="w-10 h-10 rounded-full overflow-hidden bg-surface-container-high shrink-0">
                    <img src={selectedChat.avatar} alt={selectedChat.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex flex-col overflow-hidden">
                    <span className="text-base font-medium text-on-surface truncate pr-2">{selectedChat.name}</span>
                    <span className="text-xs text-on-surface-variant truncate pr-2">{selectedChat.id}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 lg:gap-5 text-on-surface-variant shrink-0">
                  <button className="hover:text-on-surface transition-colors hidden sm:block"><Video size={20} /></button>
                  <button className="hover:text-on-surface transition-colors hidden sm:block"><Phone size={18} /></button>
                  <div className="w-[1px] h-6 bg-surface-container-high mx-1 hidden sm:block"></div>
                  <button className="hover:text-on-surface transition-colors"><Search size={20} /></button>
                  <button className="hover:text-on-surface transition-colors"><MoreVertical size={20} /></button>
                </div>
              </div>

              {/* Messages Area */}
              <div 
                className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-2 bg-[url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')] bg-repeat opacity-90"
                style={{ backgroundColor: 'var(--color-surface)', backgroundBlendMode: 'overlay' }}
              >
                {messages.map((msg, idx) => {
                  const showDate = idx === 0 || new Date(messages[idx-1].timestamp).toDateString() !== new Date(msg.timestamp).toDateString();
                  
                  return (
                    <React.Fragment key={msg.id}>
                      {showDate && (
                        <div className="flex justify-center my-4">
                          <span className="bg-surface-container-high text-on-surface-variant text-[11px] px-3 py-1 rounded-lg uppercase tracking-wider">
                            {new Date(msg.timestamp).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}
                          </span>
                        </div>
                      )}
                      <div className={`flex ${msg.sender === 'me' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] lg:max-w-[65%] px-3 py-1.5 rounded-lg relative shadow-sm ${msg.sender === 'me' ? 'bg-primary-container text-on-primary-container rounded-tr-none' : 'bg-surface-container text-on-surface rounded-tl-none'}`}>
                          <div className="text-sm leading-relaxed pr-12 break-words">
                            {msg.type === 'image' ? (
                              <img src={msg.text} alt="media" className="max-w-full rounded-lg" onError={(e) => (e.currentTarget.style.display = 'none')} />
                            ) : msg.type === 'video' ? (
                              <video src={msg.text} controls className="max-w-full rounded-lg" />
                            ) : msg.type === 'audio' ? (
                              <div className="flex flex-col gap-2 min-w-[200px]">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                                    <Phone size={14} className="text-primary" />
                                  </div>
                                  <span className="text-xs font-medium truncate">Áudio</span>
                                  {!msg.transcription && !msg.isTranscribing && (
                                    <button 
                                      onClick={() => transcribeAudio(msg.id)}
                                      className="ml-auto text-[10px] font-bold uppercase tracking-wider text-primary hover:underline"
                                    >
                                      Ouvir
                                    </button>
                                  )}
                                </div>
                                {msg.isTranscribing && (
                                  <div className="flex items-center gap-2 text-[10px] text-on-surface-variant italic">
                                    <RefreshCw className="animate-spin shrink-0" size={10} />
                                    Transcrevendo...
                                  </div>
                                )}
                                {msg.transcription && (
                                  <div className="p-2 bg-black/5 rounded border-l-2 border-primary/30 mt-1">
                                    <p className="text-xs italic text-on-surface-variant leading-relaxed">
                                      "{msg.transcription}"
                                    </p>
                                  </div>
                                )}
                              </div>
                            ) : (
                              msg.text
                            )}
                          </div>
                          <div className="absolute bottom-1 right-2 flex items-center gap-1 shrink-0">
                            <span className="text-[10px] opacity-70">
                              {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            {msg.sender === 'me' && (
                              <span className="text-primary">
                                {msg.status === 'read' ? <CheckCheck size={14} /> : <Check size={14} />}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </React.Fragment>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div className="min-h-[62px] px-2 lg:px-4 py-2 flex items-center gap-2 lg:gap-3 bg-surface-container z-10 shrink-0">
                <div className="flex items-center gap-1 lg:gap-2 text-on-surface-variant shrink-0">
                  <button className="p-2 hover:text-on-surface transition-colors hidden sm:block"><Smile size={24} /></button>
                  <button className="p-2 hover:text-on-surface transition-colors"><Paperclip size={24} /></button>
                </div>
                <form onSubmit={handleSendMessage} className="flex-1 min-w-0">
                  <input 
                    type="text" 
                    placeholder="Mensagem"
                    className="w-full bg-surface-container-high border-none rounded-lg px-4 py-2.5 text-sm focus:ring-0 placeholder-on-surface-variant text-on-surface"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                  />
                </form>
                <button 
                  onClick={() => handleSendMessage()}
                  className="p-2.5 bg-primary text-on-primary rounded-full hover:bg-primary/90 transition-colors shrink-0"
                >
                  <Send size={20} />
                </button>
              </div>
            </motion.div>
          ) : (
            <div className="flex-1 lg:flex flex-col items-center justify-center p-12 text-center bg-surface-container hidden">
              <div className="w-64 h-64 mb-8 opacity-20">
                <img src="https://static.whatsapp.net/rsrc.php/v3/y6/r/wa669ae5z23.png" alt="WhatsApp Web" className="w-full h-full object-contain" />
              </div>
              <h2 className="text-3xl font-light text-on-surface mb-4">NextZap CRM</h2>
              <p className="text-sm text-on-surface-variant max-w-md leading-relaxed">
                Envie e receba mensagens diretamente do seu navegador. O NextZap conecta sua conta do WhatsApp para uma gestão de leads fluida e eficiente.
              </p>
              <div className="mt-12 flex items-center gap-2 text-on-surface-variant text-xs">
                <Zap size={14} className="text-primary" />
                <span>Criptografado de ponta a ponta</span>
              </div>
            </div>
          )}
        </AnimatePresence>

        {/* Right Sidebar: CRM Tools (Desliza e sobrepõe ou fica fixa no lg) */}
        <AnimatePresence>
          {selectedChat && (
            <motion.div 
              initial={{ x: '100%', opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="hidden lg:flex w-80 xl:w-96 bg-surface-container-low border-l border-outline-variant/10 flex-col overflow-y-auto custom-scrollbar shrink-0"
            >
              <div className="h-[60px] px-4 flex items-center shrink-0 bg-surface-container border-b border-outline-variant/10">
                <span className="font-medium text-on-surface">Dados do Lead</span>
              </div>
              
              <div className="p-6 flex flex-col items-center text-center border-b border-outline-variant/10">
                <div className="w-24 h-24 rounded-full overflow-hidden mb-4 bg-surface-container-high shrink-0">
                  <img src={selectedChat.avatar} alt={selectedChat.name} className="w-full h-full object-cover" />
                </div>
                <h3 className="text-lg font-medium text-on-surface w-full truncate">{selectedChat.name}</h3>
                <p className="text-sm text-on-surface-variant w-full truncate">{selectedChat.id}</p>
                
                <div className="flex gap-4 mt-6">
                  <button className="flex flex-col items-center gap-1 group">
                    <div className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center group-hover:bg-surface-container-high transition-colors">
                      <Star size={18} className="text-primary" />
                    </div>
                    <span className="text-[10px] text-on-surface-variant">Favorito</span>
                  </button>
                  <button className="flex flex-col items-center gap-1 group">
                    <div className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center group-hover:bg-surface-container-high transition-colors">
                      <Archive size={18} className="text-primary" />
                    </div>
                    <span className="text-[10px] text-on-surface-variant">Arquivar</span>
                  </button>
                  <button className="flex flex-col items-center gap-1 group">
                    <div className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center group-hover:bg-surface-container-high transition-colors text-error">
                      <Trash2 size={18} />
                    </div>
                    <span className="text-[10px] text-on-surface-variant">Excluir</span>
                  </button>
                </div>
              </div>

              <div className="p-4 space-y-6 flex-1">
                {/* CRM Info */}
                <div>
                  <h4 className="text-xs font-bold text-primary uppercase tracking-wider mb-4">Informações CRM</h4>
                  <div className="space-y-4">
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] text-on-surface-variant uppercase">Status do Funil</label>
                      <select className="bg-surface-container border-none rounded text-sm py-1.5 focus:ring-1 focus:ring-primary text-on-surface w-full">
                        <option>Novo Lead</option>
                        <option>Em Negociação</option>
                        <option>Aguardando Pagamento</option>
                        <option>Cliente Ativo</option>
                        <option>Perdido</option>
                      </select>
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] text-on-surface-variant uppercase">Tags</label>
                      <div className="flex flex-wrap gap-2 mt-1">
                        <span className="bg-primary-container text-on-primary-container text-[10px] px-2 py-0.5 rounded-full">Web Design</span>
                        <span className="bg-surface-container-high text-on-surface text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1 hover:bg-surface-container transition-colors cursor-pointer">
                          <Plus size={10} /> Adicionar
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <h4 className="text-xs font-bold text-primary uppercase tracking-wider mb-4">Anotações</h4>
                  <textarea 
                    placeholder="Adicione uma nota sobre este lead..."
                    className="w-full bg-surface-container border-none rounded-lg text-sm p-3 focus:ring-1 focus:ring-primary min-h-[100px] placeholder-on-surface-variant text-on-surface"
                  ></textarea>
                </div>

                {/* Quick Tools */}
                <div>
                  <h4 className="text-xs font-bold text-primary uppercase tracking-wider mb-4">Ferramentas Rápidas</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <button className="p-3 bg-surface-container rounded-lg hover:bg-surface-container-high transition-colors flex flex-col items-center gap-2 text-on-surface">
                      <FileText size={20} className="text-on-surface-variant" />
                      <span className="text-[10px]">Proposta</span>
                    </button>
                    <button className="p-3 bg-surface-container rounded-lg hover:bg-surface-container-high transition-colors flex flex-col items-center gap-2 text-on-surface">
                      <Clock size={20} className="text-on-surface-variant" />
                      <span className="text-[10px]">Agendar</span>
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: var(--color-surface-container-high);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: var(--color-outline-variant);
        }
      `}</style>
    </div>
  );
};

export default AdminNextZap;
