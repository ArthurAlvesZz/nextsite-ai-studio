import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { initializeApp } from "firebase/app";
import admin from "firebase-admin";
import fs from "fs";
import QRCode from "qrcode";
import { makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, makeInMemoryStore } from "@whiskeysockets/baileys";
import pino from "pino";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Baileys Store
const store = makeInMemoryStore({ logger: pino({ level: 'silent' }) as any });
const storePath = path.join(__dirname, '.baileys_store.json');
if (fs.existsSync(storePath)) {
  store.readFromFile(storePath);
}
setInterval(() => {
  store.writeToFile(storePath);
}, 10000);

// Initialize Firebase for server
try {
  const firebaseConfigPath = path.join(__dirname, 'firebase-applet-config.json');
  if (fs.existsSync(firebaseConfigPath)) {
    const firebaseConfig = JSON.parse(fs.readFileSync(firebaseConfigPath, 'utf8'));
    const app = initializeApp(firebaseConfig);
    console.log("Firebase initialized on server");
    
    // Initialize Firebase Admin
    if (!admin.apps.length) {
      admin.initializeApp({
        projectId: firebaseConfig.projectId,
      });
      console.log("Firebase Admin initialized");
    }
  } else {
    console.warn("firebase-applet-config.json not found. Server-side Firebase features will be disabled.");
  }
} catch (error) {
  console.error("Error initializing Firebase on server:", error);
}

// Middleware to protect API routes
const requireAdmin = async (req: any, res: any, next: any) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing or invalid token' });
  }
  const token = authHeader.split('Bearer ')[1];
  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    const uid = decodedToken.uid;
    
    // Check if user is admin or editor using REST API
    const firebaseConfigPath = path.join(__dirname, 'firebase-applet-config.json');
    if (fs.existsSync(firebaseConfigPath)) {
      const firebaseConfig = JSON.parse(fs.readFileSync(firebaseConfigPath, 'utf8'));
      const url = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/${firebaseConfig.firestoreDatabaseId}/documents/users/${uid}`;
      
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const userData = await response.json();
        const role = userData.fields?.role?.stringValue;
        if (role === 'admin' || role === 'editor') {
          req.user = decodedToken;
          return next();
        }
      } else {
        console.warn(`Failed to fetch user role via REST API: ${response.status} ${response.statusText}`);
      }
    }
    // Also check if it's the master owner
    if (decodedToken.email === 'arthurfgalves@gmail.com' || decodedToken.email === '15599873676@nextcreatives.co') {
      req.user = decodedToken;
      return next();
    }
    
    res.status(403).json({ error: 'Forbidden: Admin access required' });
  } catch (error) {
    console.error("Token verification failed:", error);
    res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
};

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Health Check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // WhatsApp Client State
  let whatsappSocket: any = null;
  let whatsappQR: string | null = null;
  let whatsappStatus: 'disconnected' | 'connecting' | 'qr' | 'authenticated' | 'ready' = 'disconnected';

  const initializeWhatsApp = async () => {
    if (whatsappSocket) return;

    whatsappStatus = 'connecting';
    try {
      const { state, saveCreds } = await useMultiFileAuthState(path.join(__dirname, '.baileys_auth'));
      const { version, isLatest } = await fetchLatestBaileysVersion();
      console.log(`using WA v${version.join('.')}, isLatest: ${isLatest}`);

      whatsappSocket = makeWASocket({
        version,
        auth: state,
        printQRInTerminal: false,
        logger: pino({ level: 'silent' }) as any
      });

      store.bind(whatsappSocket.ev);

      whatsappSocket.ev.on('connection.update', async (update: any) => {
        const { connection, lastDisconnect, qr } = update;
        
        if (qr) {
          console.log('WhatsApp QR Received');
          whatsappQR = await QRCode.toDataURL(qr);
          whatsappStatus = 'qr';
        }

        if (connection === 'close') {
          const shouldReconnect = (lastDisconnect?.error as any)?.output?.statusCode !== DisconnectReason.loggedOut;
          console.log('WhatsApp Connection closed. Reconnecting:', shouldReconnect);
          whatsappStatus = 'disconnected';
          whatsappSocket = null;
          whatsappQR = null;
          if (shouldReconnect) {
            setTimeout(initializeWhatsApp, 5000); // Wait 5 seconds before reconnecting
          }
        } else if (connection === 'open') {
          console.log('WhatsApp Ready');
          whatsappStatus = 'ready';
          whatsappQR = null;
        }
      });

      whatsappSocket.ev.on('creds.update', saveCreds);

      whatsappSocket.ev.on('messages.upsert', (m: any) => {
        if (m.type === 'notify') {
          for (const msg of m.messages) {
            console.log(`WhatsApp Message Received from ${msg.key.remoteJid}: ${msg.message?.conversation || msg.message?.extendedTextMessage?.text || 'Media/Other'}`);
          }
        }
      });
    } catch (error) {
      console.error('Error initializing WhatsApp:', error);
      whatsappStatus = 'disconnected';
      whatsappSocket = null;
      whatsappQR = null;
    }
  };

  // Helper: Lead Scoring
  const calculateLeadScore = (chat: any, lastMessage: any): number => {
    let score = 50; // Base score
    
    // 1. Unread count impact
    if (chat.unreadCount) score += chat.unreadCount * 5;
    
    // 2. Recency impact (if last message is from them)
    if (lastMessage && !lastMessage.key.fromMe) {
        const now = Date.now() / 1000;
        const diff = now - (lastMessage.messageTimestamp || 0);
        if (diff < 3600) score += 20; // Last hour
        else if (diff < 86400) score += 10; // Last day
    }
    
    return Math.min(100, Math.max(0, score));
  };

  // WhatsApp CRM Endpoints
  app.get("/api/whatsapp/chats", requireAdmin, async (req, res) => {
    if (!whatsappSocket || whatsappStatus !== 'ready') {
      return res.status(400).json({ error: "WhatsApp not connected" });
    }
    const chats = store.chats.all();
    const enrichedChats = await Promise.all(chats.map(async (chat) => {
      const messages = await store.loadMessages(chat.id, 1, undefined);
      const lastMessage = messages[messages.length - 1];
      let text = 'Nova Mensagem';
      if (lastMessage?.message?.conversation) text = lastMessage.message.conversation;
      else if (lastMessage?.message?.extendedTextMessage?.text) text = lastMessage.message.extendedTextMessage.text;
      else if (lastMessage?.message?.imageMessage) text = '📷 Imagem';
      else if (lastMessage?.message?.videoMessage) text = '🎥 Vídeo';
      else if (lastMessage?.message?.audioMessage) text = '🎵 Áudio';
      else if (lastMessage?.message?.documentMessage) text = '📄 Documento';
      
      return {
        ...chat,
        lastMessageText: text,
        lastMessageTimestamp: lastMessage?.messageTimestamp || chat.conversationTimestamp || chat.lastMsgTimestamp || Date.now() / 1000,
        leadScore: calculateLeadScore(chat, lastMessage)
      };
    }));
    res.json(enrichedChats);
  });

  app.get("/api/whatsapp/messages/:jid", requireAdmin, async (req, res) => {
    const { jid } = req.params;
    if (!whatsappSocket || whatsappStatus !== 'ready') {
      return res.status(400).json({ error: "WhatsApp not connected" });
    }
    const messages = await store.loadMessages(jid, 50, undefined);
    res.json(messages);
  });

  app.get("/api/whatsapp/contacts", requireAdmin, (req, res) => {
    res.json(Object.values(store.contacts));
  });

  app.get("/api/whatsapp/status", requireAdmin, (req, res) => {
    res.json({ 
      status: whatsappStatus, 
      qr: whatsappQR,
      user: whatsappSocket?.user || null
    });
  });

  app.post("/api/whatsapp/connect", requireAdmin, async (req, res) => {
    if (whatsappStatus === 'disconnected') {
      await initializeWhatsApp();
    }
    res.json({ status: whatsappStatus, qr: whatsappQR });
  });

  app.post("/api/whatsapp/pair", requireAdmin, async (req, res) => {
    try {
      const { phone } = req.body;
      if (!phone) {
        return res.status(400).json({ error: 'Número de telefone é obrigatório.' });
      }

      if (whatsappStatus === 'disconnected' || !whatsappSocket) {
        await initializeWhatsApp();
        // Wait a bit for the socket to initialize
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      const cleanPhone = phone.replace(/\D/g, '');
      const code = await whatsappSocket.requestPairingCode(cleanPhone);
      res.json({ code });
    } catch (error) {
      console.error("Erro ao solicitar código de pareamento:", error);
      res.status(500).json({ error: "Falha ao gerar código de pareamento." });
    }
  });

  app.post("/api/whatsapp/logout", requireAdmin, async (req, res) => {
    if (whatsappSocket) {
      try {
        await whatsappSocket.logout();
      } catch (e) {
        console.error("Error during WhatsApp logout:", e);
      }
      whatsappSocket = null;
      whatsappStatus = 'disconnected';
      whatsappQR = null;
    }
    res.json({ success: true });
  });

  app.post("/api/whatsapp/send", requireAdmin, async (req, res) => {
    try {
      const { phone, message } = req.body;
      if (!phone || !message) {
        return res.status(400).json({ error: 'Número e mensagem são obrigatórios.' });
      }

      if (whatsappStatus !== 'ready' || !whatsappSocket) {
        return res.status(400).json({ error: 'WhatsApp não está conectado.' });
      }

      const cleanPhone = phone.replace(/\D/g, '') + '@s.whatsapp.net';
      await whatsappSocket.sendMessage(cleanPhone, { text: message });
      res.json({ success: true });
    } catch (error) {
      console.error("Erro ao enviar mensagem WhatsApp:", error);
      res.status(500).json({ error: "Falha ao enviar mensagem." });
    }
  });

  // Groq Transcription Endpoint
  app.post("/api/transcribe", requireAdmin, async (req, res) => {
    try {
      const { audioUrl } = req.body;
      if (!audioUrl) {
        return res.status(400).json({ error: 'URL do áudio é obrigatória.' });
      }

      const groqApiKey = process.env.GROQ_API_KEY;
      if (!groqApiKey) {
        return res.status(500).json({ error: 'Chave de API da Groq não configurada.' });
      }

      // Fetch the audio file
      const audioRes = await fetch(audioUrl);
      if (!audioRes.ok) {
        return res.status(400).json({ error: 'Falha ao baixar o arquivo de áudio.' });
      }
      const audioBuffer = await audioRes.arrayBuffer();

      // Form data for Groq
      const formData = new FormData();
      const blob = new Blob([audioBuffer], { type: 'audio/mpeg' });
      formData.append('file', blob, 'audio.mp3');
      formData.append('model', 'whisper-large-v3');

      const groqRes = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${groqApiKey}`
        },
        body: formData
      });

      if (!groqRes.ok) {
        const errData = await groqRes.json();
        console.error("Groq API Error:", errData);
        return res.status(groqRes.status).json({ error: 'Erro na API da Groq', details: errData });
      }

      const data = await groqRes.json();
      res.json(data);
    } catch (error) {
      console.error("Erro na transcrição:", error);
      res.status(500).json({ error: 'Falha interna na transcrição.' });
    }
  });

  // API Route: Buscar Leads (New Architecture)
  app.post("/api/leads/search", requireAdmin, async (req, res) => {
    try {
      const { nicho, uid, savedUrls = [] } = req.body;
      
      if (!nicho || !uid) {
        return res.status(400).json({ error: 'Nicho e UID são obrigatórios.' });
      }

      const apiKey = process.env.GOOGLE_CUSTOM_SEARCH_API_KEY?.trim();
      const cx = process.env.GOOGLE_CUSTOM_SEARCH_ENGINE_ID?.trim();

      if (!apiKey || !cx) {
        return res.status(500).json({ error: 'Configuração do Google Custom Search ausente.' });
      }

      // Passo 1 - Acionamento por nicho
      const queryStr = `"${nicho}" "contato" OR "whatsapp" -blog -jusbrasil -reclameaqui`;
      
      // Passo 2 - Varredura com proteção
      const searchUrl = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${cx}&q=${encodeURIComponent(queryStr)}&num=10`;
      
      const searchRes = await fetch(searchUrl);
      if (!searchRes.ok) {
        const errData = await searchRes.json().catch(() => ({}));
        console.error(`Google Search API Error (Status ${searchRes.status}):`, JSON.stringify(errData, null, 2));
        return res.status(searchRes.status).json({ 
          error: `Erro na Google Custom Search API (Status ${searchRes.status})`,
          details: errData.error?.message || 'Erro desconhecido',
          fullError: errData
        });
      }

      const searchData = await searchRes.json();
      const items = searchData.items || [];
      
      if (items.length === 0) {
        return res.json({ message: 'Nenhum resultado encontrado.', leads: [] });
      }

      // Checar no Firestore se já existe em leadsColhidos (Otimizado)
      const itemLinks = items.map((item: any) => item.link);
      
      const urlsParaProcessar = itemLinks.filter((link: string) => !savedUrls.includes(link));

      if (urlsParaProcessar.length === 0) {
        return res.json({ message: 'Todos os leads encontrados já foram colhidos.', leads: [] });
      }

      // Import p-limit dynamically because it's ESM
      const pLimit = (await import('p-limit')).default;
      const limitConcurrency = pLimit(3);
      const cheerio = await import('cheerio');
      const { GoogleGenAI } = await import('@google/genai');
      const ai = process.env.GEMINI_API_KEY ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }) : null;

      const userAgents = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Safari/605.1.15',
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36'
      ];

      const processUrl = async (url: string) => {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000);
          
          const randomUA = userAgents[Math.floor(Math.random() * userAgents.length)];

          const siteRes = await fetch(url, {
            signal: controller.signal,
            headers: { 'User-Agent': randomUA }
          });
          clearTimeout(timeoutId);

          if (!siteRes.ok) return null;

          const html = await siteRes.text();
          const $ = cheerio.load(html);

          // Passo 3 - Radar de tecnologias
          const temMetaPixel = html.includes("fbq(") || html.includes("fbevents.js");
          const temGoogleAds = html.includes("gtag(") || html.includes("googletagmanager.com/gtm.js");
          
          const whatsMatch = html.match(/(?:https?:\/\/)?(?:wa\.me|api\.whatsapp\.com\/send\?phone=|web\.whatsapp\.com\/send\?phone=)\/?([0-9]+)/i);
          const whatsapp = whatsMatch ? whatsMatch[1] : null;

          const instaMatch = html.match(/https?:\/\/(www\.)?instagram\.com\/([a-zA-Z0-9_.-]+)/i);
          const instagram = instaMatch ? instaMatch[0] : null;

          const gruposWhatsApp: string[] = [];
          $('a[href*="chat.whatsapp.com"]').each((_, el) => {
            const href = $(el).attr('href');
            if (href) gruposWhatsApp.push(href);
          });

          const cnpjMatch = html.match(/\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/);
          const cnpj = cnpjMatch ? cnpjMatch[0] : null;

          const dominio = new URL(url).hostname.replace('www.', '');

          // Passo 4 - Enriquecimento de dados
          let razaoSocial = null;
          let capitalSocial = null;
          if (cnpj) {
            try {
              const cnpjClean = cnpj.replace(/\D/g, '');
              const controllerCnpj = new AbortController();
              const timeoutCnpj = setTimeout(() => controllerCnpj.abort(), 5000);
              const cnpjRes = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpjClean}`, { signal: controllerCnpj.signal });
              clearTimeout(timeoutCnpj);
              if (cnpjRes.ok) {
                const cnpjData = await cnpjRes.json();
                razaoSocial = cnpjData.razao_social || null;
                capitalSocial = cnpjData.capital_social || null;
              }
            } catch (e) { console.error("BrasilAPI Error", e); }
          }

          let logo = null;
          try {
            const controllerLogo = new AbortController();
            const timeoutLogo = setTimeout(() => controllerLogo.abort(), 5000);
            const logoRes = await fetch(`https://logo.clearbit.com/${dominio}`, { signal: controllerLogo.signal });
            clearTimeout(timeoutLogo);
            if (logoRes.ok) {
              logo = `https://logo.clearbit.com/${dominio}`;
            }
          } catch (e) { console.error("Clearbit Error", e); }

          let abordagemWhatsApp = null;
          if (ai) {
            try {
              const prompt = `Gere uma mensagem curta e persuasiva de WhatsApp (fria) para oferecer vídeos de conversão feitos por IA para uma empresa do nicho de ${nicho}. O site deles é ${url}. Seja direto e profissional.`;
              const aiRes = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: prompt
              });
              abordagemWhatsApp = aiRes.text || null;
            } catch (e) { console.error("Gemini Error", e); }
          }

          // Passo 5 - Salvamento no Firestore
          const leadData = {
            url,
            dominio,
            nicho,
            temMetaPixel,
            temGoogleAds,
            whatsapp,
            instagram,
            gruposWhatsApp,
            cnpj,
            razaoSocial,
            capitalSocial,
            logo,
            abordagemWhatsApp,
            createdAt: new Date().toISOString(),
            createdBy: uid,
            updatedBy: uid
          };

          return leadData;

        } catch (error) {
          console.error(`Erro ao processar ${url}:`, error);
          return null;
        }
      };

      const processPromises = urlsParaProcessar.map((url: string) => limitConcurrency(() => processUrl(url)));
      const results = await Promise.all(processPromises);
      
      const leadsSalvos = results.filter(r => r !== null);

      res.json({ sucesso: true, message: `${leadsSalvos.length} leads colhidos e salvos.`, leads: leadsSalvos });

    } catch (error) {
      console.error('Erro no motor de leads:', error);
      res.status(500).json({ sucesso: false, error: 'Falha interna no motor de leads.' });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
