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

  // API Route: Cron Job for Automated Lead Harvesting
  app.get("/api/cron/buscar-leads", async (req, res) => {
    try {
      // Basic security check for Vercel Cron
      const authHeader = req.headers.authorization;
      if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      if (!db) {
        return res.status(500).json({ error: 'Firestore not initialized on server' });
      }

      const apiKey = process.env.SERPAPI_KEY?.trim();
      if (!apiKey) {
        return res.status(500).json({ error: 'SERPAPI_KEY not configured' });
      }

      // 1. Fetch all Dorks
      const dorksSnapshot = await getDocs(collection(db, 'dorks'));
      let dorks = dorksSnapshot.docs.map(doc => doc.data().termo);

      // Array de Super Dorks (Focados 100% em Lojas Virtuais Reais e Grandes no Brasil)
      const dorksMatadores = [
        // 1. Shopify Lojas BR: Foca na URL de coleções e exclui lixo
        'inurl:"/collections/todos" "adicionar ao carrinho" "CNPJ" -blog -tutorial -como -remove -forum',
        
        // 2. Nuvemshop / Lojas Integradas: Foca em produtos e políticas de troca
        'inurl:"/produto/" "comprar agora" "Trocas e devoluções" "CNPJ" -blog -curso -reclameaqui',
        
        // 3. E-commerces focados em Moda (Ticket Médio Alto)
        'inurl:"/categoria/" "moda feminina" "frete grátis" "CNPJ" -blog -pinterest -mercadolivre',
        
        // 4. Lojas de Dropshipping/Checkout Alta Conversão (Yampi/CartPanda)
        '"termos de serviço" "prazo de entrega" "código de rastreio" "CNPJ" -blog -youtube -curso'
      ];

      if (dorks.length === 0) {
        console.log('Nenhum dork encontrado no banco. Usando Super Dorks padrão.');
        dorks = dorksMatadores;
      }

      // 2. Fetch all saved URLs
      const leadsSnapshot = await getDocs(collection(db, 'leads'));
      const savedUrls = leadsSnapshot.docs.map(doc => doc.data().site);

      let totalNewLeads = 0;

      // 3. Process each Dork
      for (const termoBusca of dorks) {
        console.log(`Cron: Buscando leads para dork: ${termoBusca}`);
        let todosResultados: any[] = [];

        // Fetch 2 pages to avoid timing out the cron job
        for (let start = 0; start <= 20; start += 20) {
          const params = new URLSearchParams({
            engine: 'google',
            q: termoBusca,
            api_key: apiKey,
            start: String(start),
            num: '20',
            gl: 'br',
            hl: 'pt',
            google_domain: 'google.com.br'
          });

          const serpApiUrl = `https://serpapi.com/search.json?${params.toString()}`;
          const serpRes = await fetch(serpApiUrl);
          
          if (!serpRes.ok) continue;

          const serpData = await serpRes.json();
          if (serpData.organic_results) {
            todosResultados.push(...serpData.organic_results);
          }
        }

        const skipDomains = ['facebook.com', 'instagram.com', 'linkedin.com', 'youtube.com', 'twitter.com', 'yelp.com', 'tripadvisor.com', 'tiktok.com', 'pinterest.com'];
        
        const linksIneditos = todosResultados.filter(result => {
          if (!result.link) return false;
          if (savedUrls.includes(result.link)) return false;
          if (skipDomains.some(domain => result.link.includes(domain))) return false;
          return true;
        });

        const linksUnicos = Array.from(new Map(linksIneditos.map(item => [item.link, item])).values());
        
        for (const result of linksUnicos) {
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3000); // Shorter timeout for cron

            const siteRes = await fetch(result.link, { 
                signal: controller.signal,
                headers: { 
                  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                }
            });
            clearTimeout(timeoutId);

            if (!siteRes.ok) continue;

            const html = await siteRes.text();

            const temPixelMeta = html.includes("fbq('init'") || html.includes("connect.facebook.net") || html.includes("fbevents.js");
            const temPixelGoogle = html.includes("gtag(") || html.includes("googletagmanager.com/gtm.js") || html.includes("google-analytics.com/analytics.js");

            if (temPixelMeta || temPixelGoogle) {
              const instaMatch = html.match(/https?:\/\/(www\.)?instagram\.com\/[a-zA-Z0-9_.-]+/i);
              const instagram = instaMatch ? instaMatch[0] : null;

              const whatsMatch = html.match(/https?:\/\/(wa\.me|api\.whatsapp\.com\/send\?phone=|web\.whatsapp\.com\/send\?phone=)\/?([0-9]+)/i);
              const whatsapp = whatsMatch ? whatsMatch[0] : null;

              const newLead = {
                nome: result.title,
                site: result.link,
                plataformas: temPixelMeta && temPixelGoogle ? 'Meta & Google' : (temPixelMeta ? 'Meta Ads' : 'Google Ads'),
                contatos: {
                  instagram: instagram || 'Não encontrado',
                  whatsapp: whatsapp || 'Não encontrado'
                },
                termoBusca,
                createdAt: new Date().toISOString(),
                createdBy: 'cron-job'
              };

              await addDoc(collection(db, 'leads'), newLead);
              savedUrls.push(result.link); // Add to local cache to prevent duplicates in same run
              totalNewLeads++;
            }
          } catch (e) {
            // Ignore errors for individual sites during cron
          }
        }
      }

      res.json({ message: `Cron job completed. Harvested ${totalNewLeads} new leads.` });
    } catch (error) {
      console.error("Cron job error:", error);
      res.status(500).json({ error: 'Internal server error during cron job' });
    }
  });

  // API Route: Testar Conexão SerpApi
  app.get("/api/testar-serpapi", async (req, res) => {
    const apiKey = process.env.SERPAPI_KEY?.trim();
    if (!apiKey) {
      return res.status(500).json({ sucesso: false, error: 'SERPAPI_KEY não configurada.' });
    }

    try {
      const response = await fetch(`https://serpapi.com/search.json?engine=google&q=test&api_key=${apiKey}&num=1`);
      if (response.ok) {
        res.json({ sucesso: true, message: 'Conexão com SerpApi estabelecida com sucesso!' });
      } else {
        const data = await response.json().catch(() => ({}));
        res.status(response.status).json({ sucesso: false, error: data.error || `Erro ${response.status} na SerpApi` });
      }
    } catch (error) {
      res.status(500).json({ sucesso: false, error: 'Erro ao conectar com SerpApi.' });
    }
  });

  // API Route: Buscar Leads
  app.post("/api/buscar-leads", async (req, res) => {
    try {
      const { termoBusca, savedUrls = [], gl = 'br', hl = 'pt', google_domain = 'google.com.br' } = req.body;
      const apiKey = process.env.SERPAPI_KEY?.trim();

      if (!apiKey) {
        return res.status(500).json({ 
          sucesso: false, 
          error: 'Configuração incompleta: SERPAPI_KEY não encontrada no servidor. Verifique os Segredos (Secrets) no AI Studio.' 
        });
      }

      if (!termoBusca) {
        return res.status(400).json({ sucesso: false, error: 'Termo de busca não fornecido.' });
      }

      console.log(`Buscando leads via SerpApi para: ${termoBusca} (gl: ${gl}, hl: ${hl})`);

      let todosResultados: any[] = [];

      // Loop para pegar as 3 primeiras páginas do Google (60 resultados)
      for (let start = 0; start <= 40; start += 20) {
        const params = new URLSearchParams({
          engine: 'google',
          q: termoBusca,
          api_key: apiKey,
          start: String(start),
          num: '20',
          gl: String(gl),
          hl: String(hl),
          google_domain: String(google_domain)
        });

        const serpApiUrl = `https://serpapi.com/search.json?${params.toString()}`;
        const serpRes = await fetch(serpApiUrl);
        
        if (!serpRes.ok) {
          console.error(`Erro na SerpApi na página start=${start}: Status ${serpRes.status}`);
          if (serpRes.status === 401 && start === 0) {
            return res.status(401).json({
              sucesso: false,
              error: 'Chave de API da SerpApi inválida. Verifique os Segredos.'
            });
          }
          continue; // Se falhar uma página, tenta a próxima
        }

        const serpData = await serpRes.json();
        if (serpData.organic_results) {
          todosResultados.push(...serpData.organic_results);
        }
      }

      console.log(`Total de resultados brutos da SerpApi: ${todosResultados.length}`);

      // Filtro Anti-Duplicidade e Domínios Comuns
      const skipDomains = ['facebook.com', 'instagram.com', 'linkedin.com', 'youtube.com', 'twitter.com', 'yelp.com', 'tripadvisor.com', 'tiktok.com', 'pinterest.com'];
      
      const linksIneditos = todosResultados.filter(result => {
        if (!result.link) return false;
        
        // Verifica se já temos no banco (passado pelo frontend)
        if (savedUrls.includes(result.link)) {
          return false;
        }

        // Verifica se é um domínio ignorado
        if (skipDomains.some(domain => result.link.includes(domain))) {
          return false;
        }

        return true;
      });

      // Remove duplicatas dentro da própria busca atual
      const linksUnicos = Array.from(new Map(linksIneditos.map(item => [item.link, item])).values());

      console.log(`Links inéditos para varredura: ${linksUnicos.length}`);
      
      const leadsQuentes = [];

      // 2. O Radar de Pixel (apenas nos inéditos)
      for (const result of linksUnicos) {
        console.log(`Verificando site inédito: ${result.link}`);

        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000);

          const siteRes = await fetch(result.link, { 
              signal: controller.signal,
              headers: { 
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7'
              }
          });
          clearTimeout(timeoutId);

          if (!siteRes.ok) {
            console.log(`Falha ao carregar site: ${result.link} (Status: ${siteRes.status})`);
            continue;
          }

          const html = await siteRes.text();

          // 1. Verifica os Pixels
          const temPixelMeta = 
            html.includes("fbq('init'") || 
            html.includes("connect.facebook.net") || 
            html.includes("fbevents.js");
            
          const temPixelGoogle = 
            html.includes("gtag(") || 
            html.includes("googletagmanager.com/gtm.js") || 
            html.includes("google-analytics.com/analytics.js");

          // Só prossegue com a extração se for um Lead Quente (tem pixel)
          if (temPixelMeta || temPixelGoogle) {
            console.log(`Lead quente encontrado: ${result.title}`);
            
            // 2. Regex para pescar o Instagram
            const instaMatch = html.match(/https?:\/\/(www\.)?instagram\.com\/[a-zA-Z0-9_.-]+/i);
            const instagram = instaMatch ? instaMatch[0] : null;

            // 3. Regex para pescar o WhatsApp
            const whatsMatch = html.match(/https?:\/\/(wa\.me|api\.whatsapp\.com\/send\?phone=|web\.whatsapp\.com\/send\?phone=)\/?([0-9]+)/i);
            const whatsapp = whatsMatch ? whatsMatch[0] : null;

            leadsQuentes.push({
              nome: result.title,
              site: result.link,
              plataformas: temPixelMeta && temPixelGoogle ? 'Meta & Google' : (temPixelMeta ? 'Meta Ads' : 'Google Ads'),
              contatos: {
                instagram: instagram || 'Não encontrado',
                whatsapp: whatsapp || 'Não encontrado'
              }
            });
          } else {
            console.log(`Nenhum pixel detectado em: ${result.link}`);
          }
        } catch (e) {
           console.log(`Erro ao processar site ${result.link}:`, e instanceof Error ? e.message : 'Timeout/Network Error');
           continue; 
        }
      }

      console.log(`Varredura finalizada. ${leadsQuentes.length} novos leads quentes encontrados.`);
      res.json({ sucesso: true, leads: leadsQuentes });

    } catch (error) {
      console.error('Erro no rastreio:', error);
      res.status(500).json({ sucesso: false, error: 'Falha na varredura.' });
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
