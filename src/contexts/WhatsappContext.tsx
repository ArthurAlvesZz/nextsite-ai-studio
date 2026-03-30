import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type WhatsappStatus = 'disconnected' | 'connecting' | 'qr' | 'authenticated' | 'ready';

interface WhatsappContextType {
  whatsappStatus: WhatsappStatus;
  whatsappQR: string | null;
  whatsappUser: any;
  showQRModal: boolean;
  setShowQRModal: (show: boolean) => void;
  setWhatsappStatus: (status: WhatsappStatus) => void;
  setWhatsappQR: (qr: string | null) => void;
  setWhatsappUser: (user: any) => void;
  handleConnectWhatsApp: () => Promise<void>;
  handleLogoutWhatsApp: () => Promise<void>;
}

const WhatsappContext = createContext<WhatsappContextType | undefined>(undefined);

export function WhatsappProvider({ children }: { children: ReactNode }) {
  const [whatsappStatus, setWhatsappStatus] = useState<WhatsappStatus>('disconnected');
  const [whatsappQR, setWhatsappQR] = useState<string | null>(null);
  const [whatsappUser, setWhatsappUser] = useState<any>(null);
  const [showQRModal, setShowQRModal] = useState(false);
  const [connectionMethod, setConnectionMethod] = useState<'qr' | 'phone'>('qr');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [isRequestingCode, setIsRequestingCode] = useState(false);

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const res = await fetch('/api/whatsapp/status');
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        const text = await res.text();
        try {
          const data = JSON.parse(text);
          setWhatsappStatus(data.status);
          setWhatsappQR(data.qr);
          setWhatsappUser(data.user);
        } catch (e) {
          console.warn("Received non-JSON response for WhatsApp status.");
        }
      } catch (e) {
        console.error("Error checking WhatsApp status:", e);
      }
    };

    checkStatus();
    const interval = setInterval(checkStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleConnectWhatsApp = async () => {
    setShowQRModal(true);
    setWhatsappStatus('connecting');
    try {
      const res = await fetch('/api/whatsapp/connect', { method: 'POST' });
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const text = await res.text();
      try {
        const data = JSON.parse(text);
        setWhatsappStatus(data.status);
        setWhatsappQR(data.qr);
      } catch (e) {
        console.warn("Server restarting...", e);
      }
    } catch (e) {
      console.error("Error connecting WhatsApp:", e);
    }
  };

  const handleRequestPairingCode = async () => {
    if (!phoneNumber) {
      alert('Por favor, insira o número de telefone com DDI e DDD (ex: 5511999999999).');
      return;
    }
    setIsRequestingCode(true);
    try {
      const res = await fetch('/api/whatsapp/pair', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phoneNumber })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Erro ao solicitar código');
      }
      const data = await res.json();
      setPairingCode(data.code);
    } catch (error: any) {
      console.error("Error requesting pairing code:", error);
      alert(error.message || "Erro ao solicitar código de pareamento.");
    } finally {
      setIsRequestingCode(false);
    }
  };

  const handleLogoutWhatsApp = async () => {
    if (!confirm("Deseja realmente desconectar o WhatsApp?")) return;
    try {
      await fetch('/api/whatsapp/logout', { method: 'POST' });
      setWhatsappStatus('disconnected');
      setWhatsappQR(null);
      setWhatsappUser(null);
      setShowQRModal(false);
    } catch (e) {
      console.error("Error logging out WhatsApp:", e);
    }
  };

  const renderModal = () => {
    if (!showQRModal) return null;
    
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowQRModal(false)}></div>
        <div className="relative bg-[#0e0e0e] border border-white/10 p-8 rounded-3xl max-w-sm w-full text-center space-y-6 shadow-2xl">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-headline font-bold text-white">Conectar WhatsApp</h3>
            <button onClick={() => setShowQRModal(false)} className="text-white/40 hover:text-white">
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>

          <div className="flex bg-white/5 p-1 rounded-xl mb-6">
            <button 
              onClick={() => setConnectionMethod('qr')}
              className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-widest rounded-lg transition-all ${connectionMethod === 'qr' ? 'bg-secondary text-white shadow-lg' : 'text-white/50 hover:text-white'}`}
            >
              QR Code
            </button>
            <button 
              onClick={() => setConnectionMethod('phone')}
              className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-widest rounded-lg transition-all ${connectionMethod === 'phone' ? 'bg-secondary text-white shadow-lg' : 'text-white/50 hover:text-white'}`}
            >
              Telefone (SMS)
            </button>
          </div>
          
          {connectionMethod === 'qr' ? (
            <>
              <div className="bg-white p-4 rounded-2xl inline-block mx-auto">
                {whatsappQR && whatsappStatus === 'qr' ? (
                  <img src={whatsappQR} alt="WhatsApp QR Code" className="w-64 h-64" />
                ) : (
                  <div className="w-64 h-64 flex items-center justify-center bg-black/5 rounded-2xl">
                    <div className="w-8 h-8 border-2 border-secondary border-t-transparent rounded-full animate-spin"></div>
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
                      className="w-full bg-white/[0.03] border border-white/10 rounded-xl py-3 px-4 text-sm text-white font-light focus:ring-1 focus:ring-secondary/50 outline-none"
                    />
                    <p className="text-[10px] text-white/30 mt-1">Inclua o código do país (55) e DDD.</p>
                  </div>
                  <button 
                    onClick={handleRequestPairingCode}
                    disabled={isRequestingCode || !phoneNumber}
                    className="w-full bg-secondary text-on-secondary px-6 py-3 rounded-xl font-headline font-bold text-xs uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50"
                  >
                    {isRequestingCode ? 'Gerando...' : 'Gerar Código'}
                  </button>
                </>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-white font-medium">Seu código de pareamento:</p>
                  <div className="bg-white/5 border border-white/10 p-6 rounded-2xl">
                    <span className="text-4xl font-mono font-bold text-secondary tracking-[0.2em]">{pairingCode}</span>
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
        </div>
      </div>
    );
  };

  return (
    <WhatsappContext.Provider value={{
      whatsappStatus,
      whatsappQR,
      whatsappUser,
      showQRModal,
      setShowQRModal,
      setWhatsappStatus,
      setWhatsappQR,
      setWhatsappUser,
      handleConnectWhatsApp,
      handleLogoutWhatsApp
    }}>
      {children}
      {renderModal()}
    </WhatsappContext.Provider>
  );
}

export function useWhatsapp() {
  const context = useContext(WhatsappContext);
  if (context === undefined) {
    throw new Error('useWhatsapp must be used within a WhatsappProvider');
  }
  return context;
}
