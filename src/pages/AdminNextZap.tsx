import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
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
}

const AdminNextZap: React.FC = () => {
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [whatsappStatus, setWhatsappStatus] = useState<'disconnected' | 'connecting' | 'qr' | 'ready'>('disconnected');
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [userInfo, setUserInfo] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/whatsapp/status');
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
      const res = await fetch('/api/whatsapp/chats');
      if (res.ok) {
        const data = await res.json();
        const mappedChats = data.map((c: any) => ({
          id: c.id,
          name: c.name || c.id.split('@')[0],
          lastMessage: c.lastMessage?.message?.conversation || 'Imagem/Arquivo',
          timestamp: c.lastMessageTimestamp ? c.lastMessageTimestamp * 1000 : Date.now(),
          unreadCount: c.unreadCount || 0,
          avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(c.name || c.id)}&background=random`,
        })).sort((a: any, b: any) => b.timestamp - a.timestamp);
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
      const res = await fetch(`/api/whatsapp/messages/${encodeURIComponent(jid)}`);
      if (res.ok) {
        const data = await res.json();
        const mappedMessages = data.map((m: any) => ({
          id: m.key.id,
          text: m.message?.conversation || m.message?.extendedTextMessage?.text || 'Media/Other',
          sender: m.key.fromMe ? 'me' : 'them',
          timestamp: m.messageTimestamp ? m.messageTimestamp * 1000 : Date.now(),
          status: m.status === 4 ? 'read' : m.status === 3 ? 'delivered' : 'sent'
        }));
        setMessages(mappedMessages);
      }
    } catch (error) {
      console.error("Error fetching messages:", error);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (selectedChat) {
      fetchMessages(selectedChat.id);
    }
  }, [selectedChat]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newMessage.trim() || !selectedChat) return;

    try {
      const res = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      await fetch('/api/whatsapp/connect', { method: 'POST' });
      fetchStatus();
    } catch (error) {
      console.error("Error connecting to WhatsApp:", error);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/whatsapp/logout', { method: 'POST' });
      setWhatsappStatus('disconnected');
      setQrCode(null);
      setUserInfo(null);
      setChats([]);
      setSelectedChat(null);
    } catch (error) {
      console.error("Error logging out from WhatsApp:", error);
    }
  };

  const filteredChats = chats.filter(chat => 
    chat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    chat.id.includes(searchQuery)
  );

  return (
    <div className="flex h-screen bg-[#0b141a] text-[#e9edef] font-sans overflow-hidden">
      <AdminSidebar activePage="tools" />
      
      <main className="flex-1 flex overflow-hidden">
        {/* Left Sidebar: Chat List */}
        <div className="w-[400px] flex flex-col border-r border-[#222d34] bg-[#111b21]">
          {/* Header */}
          <div className="h-[60px] px-4 flex items-center justify-between bg-[#202c33]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#2a3942] flex items-center justify-center overflow-hidden">
                {userInfo?.imgUrl ? (
                  <img src={userInfo.imgUrl} alt="Me" className="w-full h-full object-cover" />
                ) : (
                  <User size={24} className="text-[#8696a0]" />
                )}
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-medium">{userInfo?.name || 'NextZap'}</span>
                <span className="text-[10px] text-[#8696a0] uppercase tracking-wider">
                  {whatsappStatus === 'ready' ? 'Conectado' : 'Desconectado'}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-4 text-[#aebac1]">
              <button className="p-2 hover:bg-[#2a3942] rounded-full transition-colors" title="Novo Chat">
                <MessageSquare size={20} />
              </button>
              <div className="relative group">
                <button className="p-2 hover:bg-[#2a3942] rounded-full transition-colors">
                  <MoreVertical size={20} />
                </button>
                <div className="absolute right-0 mt-2 w-48 bg-[#233138] rounded shadow-xl border border-[#2a3942] hidden group-hover:block z-50">
                  <button onClick={handleLogout} className="w-full px-4 py-3 text-left text-sm hover:bg-[#111b21] flex items-center gap-3">
                    <LogOut size={16} /> Sair
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Search */}
          <div className="p-2 bg-[#111b21]">
            <div className="relative flex items-center bg-[#202c33] rounded-lg px-3 py-1.5 group">
              <Search size={18} className="text-[#8696a0] group-focus-within:text-[#00a884] transition-colors" />
              <input 
                type="text" 
                placeholder="Pesquisar ou começar uma nova conversa"
                className="bg-transparent border-none focus:ring-0 text-sm w-full ml-3 placeholder-[#8696a0]"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Chat List */}
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {whatsappStatus !== 'ready' ? (
              <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                {whatsappStatus === 'qr' && qrCode ? (
                  <div className="bg-white p-4 rounded-lg mb-6">
                    <img src={qrCode} alt="WhatsApp QR Code" className="w-48 h-48" />
                    <p className="text-[#111b21] mt-2 text-xs font-bold">Escaneie para conectar</p>
                  </div>
                ) : (
                  <div className="mb-6 p-4 bg-[#202c33] rounded-full">
                    <QrCode size={48} className="text-[#00a884]" />
                  </div>
                )}
                <h3 className="text-lg font-medium mb-2">Conecte seu WhatsApp</h3>
                <p className="text-sm text-[#8696a0] mb-6">
                  Escaneie o código QR ou clique no botão abaixo para iniciar a conexão com o NextZap.
                </p>
                <button 
                  onClick={handleConnect}
                  disabled={whatsappStatus === 'connecting'}
                  className="px-6 py-2 bg-[#00a884] text-[#111b21] rounded-full font-bold hover:bg-[#06cf9c] transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {whatsappStatus === 'connecting' ? <RefreshCw className="animate-spin" size={18} /> : <Zap size={18} />}
                  {whatsappStatus === 'connecting' ? 'Conectando...' : 'Conectar Agora'}
                </button>
              </div>
            ) : isLoading ? (
              <div className="flex items-center justify-center h-full">
                <RefreshCw className="animate-spin text-[#00a884]" size={32} />
              </div>
            ) : filteredChats.length > 0 ? (
              filteredChats.map(chat => (
                <div 
                  key={chat.id}
                  onClick={() => setSelectedChat(chat)}
                  className={`flex items-center px-3 py-3 cursor-pointer transition-colors border-b border-[#222d34] ${selectedChat?.id === chat.id ? 'bg-[#2a3942]' : 'hover:bg-[#202c33]'}`}
                >
                  <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0 bg-[#2a3942]">
                    <img src={chat.avatar} alt={chat.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="ml-3 flex-1 overflow-hidden">
                    <div className="flex justify-between items-center mb-1">
                      <h4 className="text-base font-normal truncate">{chat.name}</h4>
                      <span className="text-[11px] text-[#8696a0]">
                        {new Date(chat.timestamp || 0).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <p className="text-sm text-[#8696a0] truncate flex-1">{chat.lastMessage}</p>
                      {chat.unreadCount ? (
                        <span className="bg-[#00a884] text-[#111b21] text-[11px] font-bold min-w-[20px] h-5 rounded-full flex items-center justify-center px-1">
                          {chat.unreadCount}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center h-full p-8 text-center text-[#8696a0]">
                <p>Nenhuma conversa encontrada.</p>
              </div>
            )}
          </div>
        </div>

        {/* Main Chat Window */}
        <div className="flex-1 flex flex-col bg-[#0b141a] relative">
          {selectedChat ? (
            <>
              {/* Chat Header */}
              <div className="h-[60px] px-4 flex items-center justify-between bg-[#202c33] border-l border-[#222d34] z-10">
                <div className="flex items-center gap-3 cursor-pointer">
                  <div className="w-10 h-10 rounded-full overflow-hidden bg-[#2a3942]">
                    <img src={selectedChat.avatar} alt={selectedChat.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-base font-medium">{selectedChat.name}</span>
                    <span className="text-xs text-[#8696a0]">{selectedChat.id}</span>
                  </div>
                </div>
                <div className="flex items-center gap-5 text-[#aebac1]">
                  <button className="hover:text-white transition-colors"><Video size={20} /></button>
                  <button className="hover:text-white transition-colors"><Phone size={18} /></button>
                  <div className="w-[1px] h-6 bg-[#2a3942] mx-1"></div>
                  <button className="hover:text-white transition-colors"><Search size={20} /></button>
                  <button className="hover:text-white transition-colors"><MoreVertical size={20} /></button>
                </div>
              </div>

              {/* Messages Area */}
              <div 
                className="flex-1 overflow-y-auto p-6 space-y-2 bg-[url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')] bg-repeat opacity-90"
                style={{ backgroundColor: '#0b141a', backgroundBlendMode: 'overlay' }}
              >
                {messages.map((msg, idx) => {
                  const showDate = idx === 0 || new Date(messages[idx-1].timestamp).toDateString() !== new Date(msg.timestamp).toDateString();
                  
                  return (
                    <React.Fragment key={msg.id}>
                      {showDate && (
                        <div className="flex justify-center my-4">
                          <span className="bg-[#182229] text-[#8696a0] text-[11px] px-3 py-1 rounded-lg uppercase tracking-wider">
                            {new Date(msg.timestamp).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}
                          </span>
                        </div>
                      )}
                      <div className={`flex ${msg.sender === 'me' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[65%] px-3 py-1.5 rounded-lg relative shadow-sm ${msg.sender === 'me' ? 'bg-[#005c4b] text-[#e9edef] rounded-tr-none' : 'bg-[#202c33] text-[#e9edef] rounded-tl-none'}`}>
                          <p className="text-sm leading-relaxed pr-12">{msg.text}</p>
                          <div className="absolute bottom-1 right-2 flex items-center gap-1">
                            <span className="text-[10px] text-[#8696a0]">
                              {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            {msg.sender === 'me' && (
                              <span className="text-[#53bdeb]">
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
              <div className="min-h-[62px] px-4 py-2 flex items-center gap-3 bg-[#202c33] z-10">
                <div className="flex items-center gap-2 text-[#aebac1]">
                  <button className="p-2 hover:text-white transition-colors"><Smile size={24} /></button>
                  <button className="p-2 hover:text-white transition-colors"><Paperclip size={24} /></button>
                </div>
                <form onSubmit={handleSendMessage} className="flex-1">
                  <input 
                    type="text" 
                    placeholder="Digite uma mensagem"
                    className="w-full bg-[#2a3942] border-none rounded-lg px-4 py-2.5 text-sm focus:ring-0 placeholder-[#8696a0]"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                  />
                </form>
                <button 
                  onClick={() => handleSendMessage()}
                  className="p-2.5 bg-[#00a884] text-[#111b21] rounded-full hover:bg-[#06cf9c] transition-colors"
                >
                  <Send size={20} />
                </button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-[#222d34]">
              <div className="w-64 h-64 mb-8 opacity-20">
                <img src="https://static.whatsapp.net/rsrc.php/v3/y6/r/wa669ae5z23.png" alt="WhatsApp Web" className="w-full h-full object-contain" />
              </div>
              <h2 className="text-3xl font-light text-[#e9edef] mb-4">NextZap CRM</h2>
              <p className="text-sm text-[#8696a0] max-w-md leading-relaxed">
                Envie e receba mensagens diretamente do seu navegador. O NextZap conecta sua conta do WhatsApp para uma gestão de leads fluida e eficiente.
              </p>
              <div className="mt-12 flex items-center gap-2 text-[#8696a0] text-xs">
                <Zap size={14} className="text-[#00a884]" />
                <span>Criptografado de ponta a ponta</span>
              </div>
            </div>
          )}
        </div>

        {/* Right Sidebar: CRM Tools */}
        {selectedChat && (
          <div className="w-[300px] bg-[#111b21] border-l border-[#222d34] flex flex-col overflow-y-auto custom-scrollbar">
            <div className="h-[60px] px-4 flex items-center bg-[#202c33] border-b border-[#222d34]">
              <span className="font-medium">Dados do Lead</span>
            </div>
            
            <div className="p-6 flex flex-col items-center text-center border-b border-[#222d34]">
              <div className="w-24 h-24 rounded-full overflow-hidden mb-4 bg-[#2a3942]">
                <img src={selectedChat.avatar} alt={selectedChat.name} className="w-full h-full object-cover" />
              </div>
              <h3 className="text-lg font-medium">{selectedChat.name}</h3>
              <p className="text-sm text-[#8696a0]">{selectedChat.id}</p>
              
              <div className="flex gap-4 mt-6">
                <button className="flex flex-col items-center gap-1 group">
                  <div className="w-10 h-10 rounded-full bg-[#202c33] flex items-center justify-center group-hover:bg-[#2a3942] transition-colors">
                    <Star size={18} className="text-[#00a884]" />
                  </div>
                  <span className="text-[10px] text-[#8696a0]">Favorito</span>
                </button>
                <button className="flex flex-col items-center gap-1 group">
                  <div className="w-10 h-10 rounded-full bg-[#202c33] flex items-center justify-center group-hover:bg-[#2a3942] transition-colors">
                    <Archive size={18} className="text-[#00a884]" />
                  </div>
                  <span className="text-[10px] text-[#8696a0]">Arquivar</span>
                </button>
                <button className="flex flex-col items-center gap-1 group">
                  <div className="w-10 h-10 rounded-full bg-[#202c33] flex items-center justify-center group-hover:bg-[#2a3942] transition-colors text-red-400">
                    <Trash2 size={18} />
                  </div>
                  <span className="text-[10px] text-[#8696a0]">Excluir</span>
                </button>
              </div>
            </div>

            <div className="p-4 space-y-6">
              {/* CRM Info */}
              <div>
                <h4 className="text-xs font-bold text-[#00a884] uppercase tracking-wider mb-4">Informações CRM</h4>
                <div className="space-y-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-[#8696a0] uppercase">Status do Funil</label>
                    <select className="bg-[#202c33] border-none rounded text-sm py-1.5 focus:ring-1 focus:ring-[#00a884]">
                      <option>Novo Lead</option>
                      <option>Em Negociação</option>
                      <option>Aguardando Pagamento</option>
                      <option>Cliente Ativo</option>
                      <option>Perdido</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-[#8696a0] uppercase">Tags</label>
                    <div className="flex flex-wrap gap-2 mt-1">
                      <span className="bg-[#005c4b] text-[10px] px-2 py-0.5 rounded-full">Web Design</span>
                      <span className="bg-[#2a3942] text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Plus size={10} /> Adicionar
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div>
                <h4 className="text-xs font-bold text-[#00a884] uppercase tracking-wider mb-4">Anotações</h4>
                <textarea 
                  placeholder="Adicione uma nota sobre este lead..."
                  className="w-full bg-[#202c33] border-none rounded-lg text-sm p-3 focus:ring-1 focus:ring-[#00a884] min-h-[100px] placeholder-[#8696a0]"
                ></textarea>
              </div>

              {/* Quick Tools */}
              <div>
                <h4 className="text-xs font-bold text-[#00a884] uppercase tracking-wider mb-4">Ferramentas Rápidas</h4>
                <div className="grid grid-cols-2 gap-2">
                  <button className="p-3 bg-[#202c33] rounded-lg hover:bg-[#2a3942] transition-colors flex flex-col items-center gap-2">
                    <FileText size={20} className="text-[#8696a0]" />
                    <span className="text-[10px]">Proposta</span>
                  </button>
                  <button className="p-3 bg-[#202c33] rounded-lg hover:bg-[#2a3942] transition-colors flex flex-col items-center gap-2">
                    <Clock size={20} className="text-[#8696a0]" />
                    <span className="text-[10px]">Agendar</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #374045;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #4a555a;
        }
      `}</style>
    </div>
  );
};

export default AdminNextZap;
