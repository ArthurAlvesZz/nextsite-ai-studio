import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, addDoc, query, orderBy, limit } from "firebase/firestore";
import fs from "fs";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Firebase for server
let db: any = null;
try {
  const firebaseConfigPath = path.join(__dirname, 'firebase-applet-config.json');
  if (fs.existsSync(firebaseConfigPath)) {
    const firebaseConfig = JSON.parse(fs.readFileSync(firebaseConfigPath, 'utf8'));
    const app = initializeApp(firebaseConfig);
    db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
    console.log("Firebase initialized on server");
  } else {
    console.warn("firebase-applet-config.json not found. Server-side Firebase features will be disabled.");
  }
} catch (error) {
  console.error("Error initializing Firebase on server:", error);
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route: Buscar Leads (New Architecture)
  app.post("/api/leads/search", async (req, res) => {
    try {
      const { nicho, uid } = req.body;
      
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

      // Checar no Firestore se já existe em leadsColhidos
      const leadsSnapshot = await getDocs(collection(db, 'leadsColhidos'));
      const savedUrls = leadsSnapshot.docs.map(doc => doc.data().url);

      const urlsParaProcessar = items
        .map((item: any) => item.link)
        .filter((link: string) => !savedUrls.includes(link));

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

          await addDoc(collection(db, 'leadsColhidos'), leadData);
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
