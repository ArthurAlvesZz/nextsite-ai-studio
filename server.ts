/**
 * server.ts — Entry point do servidor NextCreatives
 *
 * Arquitetura pós-Fase-1:
 *  - Configuração do Express, Socket.IO e middlewares globais → src/backend/app.ts
 *  - Firebase Admin SDK                                        → src/backend/config/firebase.ts
 *  - Baileys store + versão WA                                → src/backend/config/whatsapp.config.ts
 *  - requireAdmin, requireOwner, rate limiters UID            → src/backend/middlewares/auth.ts
 *  - Logger Pino centralizado                                 → src/backend/utils/logger.ts
 *  - Schemas Zod                                              → src/backend/types/validators.ts
 *
 * Este arquivo: handlers de rota + gerenciamento de sessão WhatsApp.
 * Fase 2 extrairá cada domínio para src/backend/routes/*.ts e services/*.ts.
 */

import dotenv from 'dotenv';
dotenv.config();

// ── Módulos backend (nova arquitetura) ────────────────────────────────────────
import {
  app, httpServer, userSockets,
  waSendLimiter, transcribeLimiter, leadSearchLimiter, logLimiter,
} from './src/backend/app.js';
import { admin, db } from './src/backend/config/firebase.js';
import { store, getWAVersion } from './src/backend/config/whatsapp.config.js';
import { requireAdmin, requireOwner, createUserRateLimiter } from './src/backend/middlewares/auth.js';
import { logger } from './src/backend/utils/logger.js';
import {
  SystemLogSchema,
  ForgotPasswordSchema,
  CreateUserSchema,
  LeadSearchSchema,
  GenerateScriptSchema,
  WhatsappSendSchema,
  WhatsappPairSchema,
  WhatsappTranscribeSchema,
  ShopifyScraperSchema,
} from './src/backend/types/validators.js';

// ── Node / npm imports ────────────────────────────────────────────────────────
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import QRCode from 'qrcode';
import { makeWASocket, DisconnectReason } from '@whiskeysockets/baileys';
import pino from 'pino';
import nodemailer from 'nodemailer';
import { spawn } from 'child_process';
import { createServer as createViteServer } from 'vite';
import { runVideoPipeline, initializeCronJob } from './services/automation/orchestratorService.js';
import { useFirestoreAuthState } from './services/whatsapp/firestoreAuthState.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const PORT       = Number(process.env.PORT) || 3000;

// ════════════════════════════════════════════════════════════════════════════════
// SMTP Transporter (Hostinger)
// ════════════════════════════════════════════════════════════════════════════════
const smtpTransporter = nodemailer.createTransport({
  host:   process.env.SMTP_HOST || 'smtp.hostinger.com',
  port:   Number(process.env.SMTP_PORT) || 465,
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// ════════════════════════════════════════════════════════════════════════════════
// WhatsApp — Gerenciamento de sessões em memória
// (será extraído para src/backend/services/whatsapp.service.ts na Fase 2)
// ════════════════════════════════════════════════════════════════════════════════

type WASessionStatus = 'disconnected' | 'connecting' | 'qr' | 'authenticated' | 'ready';

interface WASession {
  socket: any;
  qr: string | null;
  status: WASessionStatus;
  userInfo: any;
}

/** Mapa UID → sessão WhatsApp ativa. */
const sessions = new Map<string, WASession>();

/**
 * initializeWhatsApp — cria e gerencia uma sessão Baileys para um uid.
 * Reconecta automaticamente (exceto quando loggedOut).
 */
async function initializeWhatsApp(uid: string): Promise<void> {
  if (sessions.has(uid) && sessions.get(uid)?.socket) return;

  sessions.set(uid, { socket: null, qr: null, status: 'connecting', userInfo: null });

  try {
    const { state, saveCreds } = await useFirestoreAuthState(uid);
    const version = await getWAVersion();
    logger.info({ uid, version: version.join('.'), event: 'WA_SESSION_INIT' }, `Usando WA v${version.join('.')}`);

    const socket = makeWASocket({
      version,
      auth:               state,
      printQRInTerminal:  false,
      logger:             pino({ level: 'silent' }) as any,
    });

    sessions.get(uid)!.socket = socket;
    store.bind(socket.ev);

    // ── Eventos de conexão ────────────────────────────────────────────────────
    socket.ev.on('connection.update', async (update: any) => {
      const { connection, lastDisconnect, qr } = update;
      const session = sessions.get(uid);
      if (!session) return;

      if (qr) {
        session.qr = await QRCode.toDataURL(qr);
        session.status = 'qr';
        userSockets.get(uid)?.emit('whatsapp:status', { status: 'qr', qr: session.qr, user: null });
      }

      if (connection === 'close') {
        const statusCode   = (lastDisconnect?.error as any)?.output?.statusCode;
        const isLoggedOut  = statusCode === DisconnectReason.loggedOut;
        const shouldReconnect = !isLoggedOut;

        logger.info({ uid, isLoggedOut, shouldReconnect, event: 'WA_CONNECTION_CLOSE' });

        session.status = 'disconnected';
        session.socket = null;
        session.qr     = null;

        if (isLoggedOut) {
          db.collection('whatsapp_sessions').doc(uid)
            .set({ loggedOut: true, loggedOutAt: new Date().toISOString() }, { merge: true })
            .catch(err => logger.warn({ uid, err: err.message }, 'Falha ao marcar loggedOut'));
        }

        userSockets.get(uid)?.emit('whatsapp:status', { status: 'disconnected', qr: null, user: null });

        if (shouldReconnect) {
          setTimeout(() => initializeWhatsApp(uid), 5_000);
        }
      }

      if (connection === 'open') {
        logger.info({ uid, event: 'WA_READY' }, 'WhatsApp conectado');
        const session = sessions.get(uid)!;
        session.status   = 'ready';
        session.qr       = null;
        session.userInfo = socket.user;
        userSockets.get(uid)?.emit('whatsapp:status', { status: 'ready', qr: null, user: socket.user });
      }
    });

    socket.ev.on('creds.update', saveCreds);

    socket.ev.on('messages.upsert', (m: any) => {
      if (m.type === 'notify') {
        for (const msg of m.messages) {
          userSockets.get(uid)?.emit('whatsapp:message', msg);
        }
      }
    });

  } catch (error) {
    logger.error({ uid, error, event: 'WA_INIT_ERROR' }, 'Erro ao inicializar WhatsApp');
    const session = sessions.get(uid);
    if (session) { session.status = 'disconnected'; session.socket = null; session.qr = null; }
  }
}

/**
 * restoreSessions — reconecta sessões ativas do Firestore ao iniciar o servidor.
 * Ignora sessões com loggedOut:true ou sem credenciais.
 */
async function restoreSessions(): Promise<void> {
  try {
    const snapshot = await db.collection('whatsapp_sessions').get();
    let restored = 0, skipped = 0;

    for (const doc of snapshot.docs) {
      const data = doc.data();
      if (data?.loggedOut === true || !data?.creds) { skipped++; continue; }
      initializeWhatsApp(doc.id);
      restored++;
    }

    logger.info({ event: 'WA_RESTORE_DONE', restored, skipped });
  } catch (error: any) {
    logger.error({ event: 'WA_RESTORE_ERROR', err: error.message });
  }
}

// ── Helper: Lead Scoring ──────────────────────────────────────────────────────
function calculateLeadScore(chat: any, lastMessage: any): number {
  let score = 50;
  if (chat.unreadCount) score += chat.unreadCount * 5;
  if (lastMessage && !lastMessage.key.fromMe) {
    const diff = Date.now() / 1000 - (lastMessage.messageTimestamp || 0);
    if (diff < 3600)  score += 20;
    else if (diff < 86400) score += 10;
  }
  return Math.min(100, Math.max(0, score));
}

// ── Script Generator System Prompt ───────────────────────────────────────────
const SCRIPT_SYSTEM_PROMPT = `You are an elite video scriptwriter and AI prompt engineer specializing in ultra-high-conversion video content for digital marketing agencies.

YOUR ONLY OUTPUT IS A SINGLE RAW JSON OBJECT.
- DO NOT write markdown. DO NOT use \`\`\`json fences. DO NOT add explanations.
- DO NOT add any text before or after the JSON.
- The JSON must be valid and parseable by JSON.parse() with zero preprocessing.
- Any deviation from pure JSON will cause a critical system failure.

OUTPUT SCHEMA (follow it exactly — no extra or missing keys):
{
  "title": "string — creative, punchy video title (max 12 words)",
  "scenes": [
    {
      "id": number,
      "setting": "string — screenplay format: INT./EXT. LOCATION - TIME",
      "title": "string — evocative scene name (3-6 words)",
      "description": "string — cinematic narrative description, 3-5 sentences",
      "tags": ["array", "of", "visual", "style", "tags"]
    }
  ],
  "prompts": [
    {
      "sceneId": number,
      "prompt_text": "string — ultra-detailed Midjourney/Runway prompt starting with /imagine prompt:"
    }
  ]
}

RULES:
- Generate between 3 and 6 scenes per script.
- Each scene must have exactly one matching prompt (sceneId links them).
- Narrative arc: Hook → Problem/Desire → Solution/Proof → CTA.
- Language of all text fields: Brazilian Portuguese (except tags and prompt_text which stay in English).`;

// ════════════════════════════════════════════════════════════════════════════════
// startServer — registra rotas e inicia o listener
// ════════════════════════════════════════════════════════════════════════════════
async function startServer() {

  // ── SYSTEM LOG ──────────────────────────────────────────────────────────────
  app.post('/api/system/log', logLimiter, async (req: any, res: any) => {
    try {
      const parsed = SystemLogSchema.safeParse(req.body ?? {});
      const body   = parsed.success ? parsed.data : (req.body ?? {});

      const sanitized = {
        level:     String(body.level     ?? 'error').slice(0, 20),
        message:   String(body.message   ?? '(no message)').slice(0, 2000),
        component: body.component ? String(body.component).slice(0, 200) : null,
        stack:     body.stack     ? String(body.stack).slice(0, 5000)    : null,
        context:   body.context   ? JSON.parse(JSON.stringify(body.context)) : null,
        uid:       body.uid       ? String(body.uid).slice(0, 128)        : null,
        url:       body.url       ? String(body.url).slice(0, 500)        : null,
        userAgent: body.userAgent ? String(body.userAgent).slice(0, 300)  : null,
        serverTs:  Date.now(),
        env:       process.env.NODE_ENV ?? 'development',
      };

      const lvl = (['error','warn','info','debug'] as const).includes(sanitized.level as any)
        ? sanitized.level as 'error' | 'warn' | 'info' | 'debug' : 'error';

      logger[lvl]({ event: 'FRONTEND_LOG', ...sanitized },
        `[FE] ${sanitized.component ?? 'unknown'}: ${sanitized.message}`);

      const docId = `${sanitized.serverTs}_${sanitized.uid ?? 'anon'}`;
      await db.collection('ai_system_logs').doc(docId).set(sanitized);

      res.status(201).json({ ok: true, id: docId });
    } catch (err: any) {
      logger.error({ event: 'SYSTEM_LOG_WRITE_ERROR', err: err.message });
      res.status(201).json({ ok: false });
    }
  });

  // ── AUTH — Recuperação de senha ──────────────────────────────────────────────
  app.post('/api/auth/forgot-password', async (req: any, res: any) => {
    const parsed = ForgotPasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'E-mail inválido.' });
    }
    const { email } = parsed.data;

    try {
      const resetLink = await admin.auth().generatePasswordResetLink(email, {
        url: `${process.env.APP_URL || 'http://localhost:3000'}/login`,
      });

      await smtpTransporter.sendMail({
        from:    `"${process.env.SMTP_FROM_NAME || 'Next Creative'}" <${process.env.SMTP_USER}>`,
        to:      email,
        subject: 'Recuperação de senha — Next Creative',
        html: `
          <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#0f0f0f;color:#fff;border-radius:12px;">
            <h2 style="color:#a855f7;margin-bottom:8px;">Recuperação de senha</h2>
            <p style="color:#ccc;margin-bottom:24px;">Recebemos uma solicitação para redefinir a senha da sua conta.</p>
            <a href="${resetLink}"
               style="display:inline-block;padding:14px 28px;background:#a855f7;color:#fff;text-decoration:none;border-radius:8px;font-weight:bold;">
              Redefinir minha senha
            </a>
            <p style="color:#666;font-size:12px;margin-top:24px;">
              Este link expira em 1 hora. Se você não solicitou a redefinição, ignore este e-mail.
            </p>
          </div>
        `,
      });

      return res.json({ success: true, message: 'Se o e-mail existir, um link de redefinição foi enviado.' });
    } catch (error: any) {
      if (error?.errorInfo?.code === 'auth/user-not-found') {
        return res.json({ success: true, message: 'Se o e-mail existir, um link de redefinição foi enviado.' });
      }
      logger.error({ event: 'FORGOT_PASSWORD_ERROR', err: error.message });
      return res.status(500).json({ error: 'Falha ao enviar e-mail de recuperação.' });
    }
  });

  // ── WhatsApp — Status / QR / Connect / Pair / Logout ────────────────────────

  app.get('/api/whatsapp/status', requireAdmin, (req: any, res) => {
    const session = sessions.get(req.user.uid);
    res.json({ status: session?.status || 'disconnected', qr: session?.qr || null, user: session?.userInfo || null });
  });

  app.post('/api/whatsapp/connect', requireAdmin, async (req: any, res) => {
    const uid = req.user.uid;
    let session = sessions.get(uid);
    if (!session || session.status === 'disconnected') {
      await db.collection('whatsapp_sessions').doc(uid)
        .set({ loggedOut: false }, { merge: true }).catch(() => {});
      await initializeWhatsApp(uid);
      session = sessions.get(uid);
    }
    res.json({ status: session?.status, qr: session?.qr });
  });

  app.post('/api/whatsapp/pair', requireAdmin, async (req: any, res) => {
    try {
      const parsed = WhatsappPairSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: 'Número de telefone inválido.' });
      const { phone } = parsed.data;

      const uid = req.user.uid;
      let session = sessions.get(uid);
      if (!session || session.status === 'disconnected' || !session.socket) {
        await initializeWhatsApp(uid);
        session = sessions.get(uid);
        await new Promise(r => setTimeout(r, 2_000));
      }
      const code = await session!.socket.requestPairingCode(phone);
      res.json({ code });
    } catch (error) {
      logger.error({ event: 'WA_PAIR_ERROR', error });
      res.status(500).json({ error: 'Falha ao gerar código de pareamento.' });
    }
  });

  app.post('/api/whatsapp/logout', requireAdmin, async (req: any, res) => {
    const uid = req.user.uid;
    const session = sessions.get(uid);
    if (session?.socket) {
      try { await session.socket.logout(); } catch (e) { /* ignorado */ }
      sessions.delete(uid);
    }
    await db.collection('whatsapp_sessions').doc(uid)
      .set({ loggedOut: true, loggedOutAt: new Date().toISOString() }, { merge: true })
      .catch((err: any) => logger.warn({ uid, err: err.message }, 'Falha ao marcar loggedOut'));
    res.json({ success: true });
  });

  // ── WhatsApp CRM ─────────────────────────────────────────────────────────────

  app.get('/api/whatsapp/chats', requireAdmin, async (req: any, res) => {
    const session = sessions.get(req.user.uid);
    if (!session?.socket || session.status !== 'ready') {
      return res.status(400).json({ error: 'WhatsApp não conectado.' });
    }
    const chats = store.chats.all();
    const enriched = await Promise.all(chats.map(async (chat) => {
      const messages   = await store.loadMessages(chat.id, 1, undefined);
      const lastMessage = messages[messages.length - 1];
      let text = 'Nova Mensagem';
      if (lastMessage?.message?.conversation)                  text = lastMessage.message.conversation;
      else if (lastMessage?.message?.extendedTextMessage?.text) text = lastMessage.message.extendedTextMessage.text;
      else if (lastMessage?.message?.imageMessage)              text = '📷 Imagem';
      else if (lastMessage?.message?.videoMessage)              text = '🎥 Vídeo';
      else if (lastMessage?.message?.audioMessage)              text = '🎵 Áudio';
      else if (lastMessage?.message?.documentMessage)           text = '📄 Documento';
      return {
        ...chat,
        lastMessageText:      text,
        lastMessageTimestamp: lastMessage?.messageTimestamp || chat.conversationTimestamp || Date.now() / 1000,
        leadScore:            calculateLeadScore(chat, lastMessage),
      };
    }));
    res.json(enriched);
  });

  app.get('/api/whatsapp/messages/:jid', requireAdmin, async (req: any, res) => {
    try {
      const session = sessions.get(req.user.uid);
      if (!session?.socket || session.status !== 'ready') {
        return res.status(400).json({ error: 'WhatsApp não conectado.' });
      }
      const messages = await store.loadMessages(req.params.jid, 50, undefined);
      res.json(messages);
    } catch (error) {
      logger.error({ event: 'WA_MESSAGES_ERROR', error });
      res.status(500).json({ error: 'Falha ao buscar mensagens.' });
    }
  });

  app.get('/api/whatsapp/contacts', requireAdmin, (req, res) => {
    try {
      res.json(Object.values(store.contacts));
    } catch (error) {
      logger.error({ event: 'WA_CONTACTS_ERROR', error });
      res.status(500).json({ error: 'Falha ao buscar contatos.' });
    }
  });

  // ── WhatsApp — Envio de mensagem ──────────────────────────────────────────────
  app.post('/api/whatsapp/send', waSendLimiter, requireAdmin, createUserRateLimiter('whatsapp_send'), async (req: any, res) => {
    try {
      const parsed = WhatsappSendSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
      const { phone, message } = parsed.data;

      const session = sessions.get(req.user.uid);
      if (!session?.socket || session.status !== 'ready') {
        return res.status(400).json({ error: 'WhatsApp não conectado.' });
      }
      await session.socket.sendMessage(`${phone}@s.whatsapp.net`, { text: message });
      res.json({ success: true });
    } catch (error) {
      logger.error({ event: 'WA_SEND_ERROR', error });
      res.status(500).json({ error: 'Falha ao enviar mensagem.' });
    }
  });

  // ── WhatsApp — Transcrição de áudio ──────────────────────────────────────────
  app.post('/api/whatsapp/transcribe', transcribeLimiter, requireAdmin, createUserRateLimiter('transcribe'), async (req: any, res) => {
    try {
      const parsed = WhatsappTranscribeSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
      const { jid, msgId } = parsed.data;

      const session = sessions.get(req.user.uid);
      if (!session?.socket || session.status !== 'ready') {
        return res.status(400).json({ error: 'WhatsApp não conectado.' });
      }

      const messages = await store.loadMessages(jid, 100, undefined);
      const msg = messages.find(m => m.key.id === msgId);
      if (!msg?.message?.audioMessage) {
        return res.status(404).json({ error: 'Mensagem de áudio não encontrada.' });
      }

      const groqApiKey = process.env.GROQ_API_KEY;
      if (!groqApiKey) return res.status(500).json({ error: 'GROQ_API_KEY não configurada.' });

      const { downloadMediaMessage } = await import('@whiskeysockets/baileys');
      const buffer = await downloadMediaMessage(msg, 'buffer', {}, {
        logger: pino({ level: 'silent' }) as any,
        reuploadRequest: session.socket.updateMediaMessage,
      });

      const formData = new FormData();
      formData.append('file', new Blob([new Uint8Array(buffer)], { type: 'audio/ogg' }), 'audio.ogg');
      formData.append('model', 'whisper-large-v3');

      const groqRes = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${groqApiKey}` },
        body: formData,
      });

      if (!groqRes.ok) {
        const errData = await groqRes.json();
        return res.status(groqRes.status).json({ error: 'Erro na API da Groq', details: errData });
      }

      res.json(await groqRes.json());
    } catch (error) {
      logger.error({ event: 'WA_TRANSCRIBE_ERROR', error });
      res.status(500).json({ error: 'Falha na transcrição.' });
    }
  });

  // ── Transcrição genérica (URL) ────────────────────────────────────────────────
  app.post('/api/transcribe', transcribeLimiter, requireAdmin, createUserRateLimiter('transcribe'), async (req, res) => {
    try {
      const { audioUrl } = req.body;
      if (!audioUrl) return res.status(400).json({ error: 'URL do áudio é obrigatória.' });

      const groqApiKey = process.env.GROQ_API_KEY;
      if (!groqApiKey) return res.status(500).json({ error: 'GROQ_API_KEY não configurada.' });

      const audioRes = await fetch(audioUrl);
      if (!audioRes.ok) return res.status(400).json({ error: 'Falha ao baixar o arquivo de áudio.' });

      const formData = new FormData();
      formData.append('file', new Blob([await audioRes.arrayBuffer()], { type: 'audio/mpeg' }), 'audio.mp3');
      formData.append('model', 'whisper-large-v3');

      const groqRes = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${groqApiKey}` },
        body: formData,
      });

      if (!groqRes.ok) {
        const errData = await groqRes.json();
        return res.status(groqRes.status).json({ error: 'Erro na API da Groq', details: errData });
      }

      res.json(await groqRes.json());
    } catch (error) {
      logger.error({ event: 'TRANSCRIBE_ERROR', error });
      res.status(500).json({ error: 'Falha interna na transcrição.' });
    }
  });

  // ── Lead Engine ───────────────────────────────────────────────────────────────
  app.post('/api/leads/search', leadSearchLimiter, requireAdmin, createUserRateLimiter('lead_search'), async (req, res) => {
    try {
      const parsed = LeadSearchSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
      const { nicho, uid, savedUrls } = parsed.data;

      const apiKey = process.env.GOOGLE_CUSTOM_SEARCH_API_KEY?.trim();
      const cx     = process.env.GOOGLE_CUSTOM_SEARCH_ENGINE_ID?.trim();
      if (!apiKey || !cx) return res.status(500).json({ error: 'Configuração do Google Custom Search ausente.' });

      const queryStr  = `"${nicho}" "contato" OR "whatsapp" -blog -jusbrasil -reclameaqui`;
      const searchUrl = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${cx}&q=${encodeURIComponent(queryStr)}&num=10`;

      const searchRes = await fetch(searchUrl);
      if (!searchRes.ok) {
        const errData = await searchRes.json().catch(() => ({}));
        return res.status(searchRes.status).json({
          error:     `Erro na Google Custom Search API (Status ${searchRes.status})`,
          details:   (errData as any).error?.message || 'Erro desconhecido',
          fullError: errData,
        });
      }

      const searchData = await searchRes.json() as any;
      const items      = searchData.items || [];
      if (items.length === 0) return res.json({ message: 'Nenhum resultado encontrado.', leads: [] });

      const itemLinks        = items.map((i: any) => i.link) as string[];
      const urlsParaProcessar = itemLinks.filter((link: string) => !savedUrls.includes(link));
      if (urlsParaProcessar.length === 0) {
        return res.json({ message: 'Todos os leads encontrados já foram colhidos.', leads: [] });
      }

      const pLimit          = (await import('p-limit')).default;
      const limitConcurrency = pLimit(3);
      const cheerio          = await import('cheerio');
      const { GoogleGenAI }  = await import('@google/genai');
      const ai = process.env.GEMINI_API_KEY ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }) : null;

      const userAgents = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/16.6 Safari/605.1.15',
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/119.0.0.0 Safari/537.36',
      ];

      const processUrl = async (url: string) => {
        try {
          const controller = new AbortController();
          const timeoutId  = setTimeout(() => controller.abort(), 5_000);
          const siteRes    = await fetch(url, {
            signal:  controller.signal,
            headers: { 'User-Agent': userAgents[Math.floor(Math.random() * userAgents.length)] },
          });
          clearTimeout(timeoutId);
          if (!siteRes.ok) return null;

          const html = await siteRes.text();
          const $    = cheerio.load(html);

          const temMetaPixel  = html.includes('fbq(') || html.includes('fbevents.js');
          const temGoogleAds  = html.includes('gtag(') || html.includes('googletagmanager.com/gtm.js');
          const whatsMatch    = html.match(/(?:https?:\/\/)?(?:wa\.me|api\.whatsapp\.com\/send\?phone=)\/?([0-9]+)/i);
          const whatsapp      = whatsMatch ? whatsMatch[1] : null;
          const instaMatch    = html.match(/https?:\/\/(www\.)?instagram\.com\/([a-zA-Z0-9_.-]+)/i);
          const instagram     = instaMatch ? instaMatch[0] : null;
          const gruposWhatsApp: string[] = [];
          $('a[href*="chat.whatsapp.com"]').each((_, el) => { const h = $(el).attr('href'); if (h) gruposWhatsApp.push(h); });
          const cnpjMatch     = html.match(/\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/);
          const cnpj          = cnpjMatch ? cnpjMatch[0] : null;
          const dominio       = new URL(url).hostname.replace('www.', '');
          const isShopify     = html.includes('cdn.shopify.com') || html.includes('shopify-checkout');
          const hasVideo      = html.includes('<video') || html.includes('youtube.com/embed') || html.includes('vimeo.com');

          let razaoSocial = null, capitalSocial = null;
          if (cnpj) {
            try {
              const ctrl = new AbortController();
              const tid  = setTimeout(() => ctrl.abort(), 5_000);
              const r    = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj.replace(/\D/g,'')}`, { signal: ctrl.signal });
              clearTimeout(tid);
              if (r.ok) { const d = await r.json() as any; razaoSocial = d.razao_social || null; capitalSocial = d.capital_social || null; }
            } catch { /* ignora */ }
          }

          let logo = null;
          try {
            const ctrl = new AbortController();
            const tid  = setTimeout(() => ctrl.abort(), 5_000);
            const r    = await fetch(`https://logo.clearbit.com/${dominio}`, { signal: ctrl.signal });
            clearTimeout(tid);
            if (r.ok) logo = `https://logo.clearbit.com/${dominio}`;
          } catch { /* ignora */ }

          let aiData: any = {};
          if (ai) {
            try {
              const prompt = `Analise o site ${url} do nicho ${nicho}.
Sinais detectados: Pixel=${temMetaPixel}, GoogleAds=${temGoogleAds}, Shopify=${isShopify}, Tem Vídeo=${hasVideo}.
HTML (resumo): ${html.substring(0, 3000)}

Gere um objeto JSON com: score (0-100), painPanel (string), tags (array), trafficSignals, aiAnalysis, abordagemWhatsApp.
Retorne APENAS o JSON.`;

              const aiRes = await ai.models.generateContent({
                model:    'gemini-3-flash-preview',
                contents: prompt,
                config:   { responseMimeType: 'application/json' },
              });
              if (aiRes.text) aiData = JSON.parse(aiRes.text);
            } catch { /* ignora */ }
          }

          return {
            url, dominio, nicho, temMetaPixel, temGoogleAds, whatsapp, instagram,
            gruposWhatsApp, cnpj, razaoSocial, capitalSocial, logo,
            abordagemWhatsApp: aiData.abordagemWhatsApp || null,
            score:             aiData.score || 0,
            painPanel:         aiData.painPanel || 'Análise pendente',
            tags:              aiData.tags || [],
            trafficSignals:    aiData.trafficSignals || {
              runsAds: temMetaPixel || temGoogleAds ? 'SIM' : 'NÃO',
              platform: isShopify ? 'Shopify' : 'Desconhecida',
              format:   hasVideo ? 'Vídeo' : 'Estático',
              pixel:    temMetaPixel ? 'Detectado' : 'Não Detectado',
              videoPage: hasVideo ? 'Presente' : 'Ausente',
            },
            aiAnalysis: aiData.aiAnalysis || {
              positiveSigns: [], negativeSigns: [],
              suggestedTemplate: { name: 'Padrão', description: 'Abordagem genérica de conversão' },
            },
            status:        'novo',
            discoveryDate: new Date().toISOString(),
            createdAt:     new Date().toISOString(),
            createdBy:     uid,
            updatedBy:     uid,
          };
        } catch { return null; }
      };

      const results    = await Promise.all(urlsParaProcessar.map((url: string) => limitConcurrency(() => processUrl(url))));
      const leadsSalvos = results.filter(r => r !== null);
      res.json({ sucesso: true, message: `${leadsSalvos.length} leads colhidos.`, leads: leadsSalvos });

    } catch (error) {
      logger.error({ event: 'LEADS_SEARCH_ERROR', error });
      res.status(500).json({ sucesso: false, error: 'Falha interna no motor de leads.' });
    }
  });

  // ── Scraper Shopify ───────────────────────────────────────────────────────────
  app.post('/api/scrapers/shopify/run', requireOwner, async (req: any, res) => {
    try {
      const parsed = ShopifyScraperSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: 'Lista de URLs inválida.' });
      const { urls } = parsed.data;

      res.setHeader('Content-Type', 'application/x-ndjson');
      res.setHeader('Transfer-Encoding', 'chunked');

      const scraperDir = path.join(process.cwd(), 'scrapers', 'shopify_scraper');
      if (!fs.existsSync(scraperDir)) fs.mkdirSync(scraperDir, { recursive: true });

      const timestamp      = Date.now();
      const inputFilename  = path.join(scraperDir, `input_${timestamp}.txt`);
      const outputFilename = path.join(scraperDir, `output_${timestamp}.json`);
      fs.writeFileSync(inputFilename, urls.join('\n'));

      const pythonProcess = spawn('python', ['shopify_scraper.py', inputFilename, '--output', outputFilename], { cwd: scraperDir });
      let processedCount  = 0;
      const runStartedAt  = new Date().toISOString();

      db.collection('scraper_metadata').doc('stats').set({
        shopify: { processados: 0, total: urls.length, totalLeads: 0, queueProgress: 0, lastRun: runStartedAt, currentStatus: 'running' },
      }, { merge: true }).catch(() => {});

      pythonProcess.stdout.on('data', (data: any) => {
        for (const line of data.toString().split('\n').filter(Boolean)) {
          res.write(JSON.stringify({ type: 'log', text: line }) + '\n');
          if (line.includes(' → ')) {
            processedCount++;
            if (processedCount % 5 === 0 || processedCount === urls.length) {
              db.collection('scraper_metadata').doc('stats').set({
                shopify: { processados: processedCount, total: urls.length, totalLeads: processedCount, queueProgress: Math.round(processedCount / urls.length * 100), lastRun: runStartedAt, currentStatus: 'running' },
              }, { merge: true }).catch(() => {});
            }
          }
        }
      });

      pythonProcess.stderr.on('data', (data: any) => {
        for (const line of data.toString().split('\n').filter(Boolean)) {
          res.write(JSON.stringify({ type: 'log', text: line }) + '\n');
        }
      });

      pythonProcess.on('close', () => {
        db.collection('scraper_metadata').doc('stats').set({
          shopify: { processados: processedCount, total: urls.length, totalLeads: processedCount, queueProgress: 100, lastRun: runStartedAt, currentStatus: 'stopped' },
        }, { merge: true }).catch(() => {});

        try {
          if (fs.existsSync(outputFilename)) {
            const results = JSON.parse(fs.readFileSync(outputFilename, 'utf8'));
            res.write(JSON.stringify({ type: 'done', success: true, results }) + '\n');
          } else {
            res.write(JSON.stringify({ type: 'done', success: false, error: 'Scraper não gerou arquivo de saída.' }) + '\n');
          }
        } catch (e: any) {
          res.write(JSON.stringify({ type: 'done', success: false, error: `Falha ao ler resultado: ${e.message}` }) + '\n');
        }
        res.end();
      });

    } catch (err: any) {
      if (!res.headersSent) res.status(500).json({ error: 'Falha interna.', details: err.message });
      else { res.write(JSON.stringify({ type: 'done', success: false, error: err.message }) + '\n'); res.end(); }
    }
  });

  // ── Cron — Busca de leads agendada ───────────────────────────────────────────
  app.get('/api/cron/buscar-leads', async (req: any, res: any) => {
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret) return res.status(500).json({ error: 'Cron secret não configurado.' });
    if (req.headers.authorization !== `Bearer ${cronSecret}`) return res.status(401).json({ error: 'Unauthorized.' });
    try {
      logger.info({ event: 'CRON_LEAD_TRIGGERED' }, 'Cron de leads acionado');
      res.json({ success: true, message: 'Lead collection cron triggered.' });
    } catch (err: any) {
      logger.error({ event: 'CRON_LEAD_ERROR', err: err.message });
      res.status(500).json({ error: 'Cron job failed.', details: err.message });
    }
  });

  // ── Video Pipeline ────────────────────────────────────────────────────────────
  app.post('/api/automation/video-pipeline/run', requireAdmin, createUserRateLimiter('video_pipeline'), async (req: any, res: any) => {
    try {
      logger.info({ event: 'PIPELINE_MANUAL_TRIGGER', user: req.user?.email });
      runVideoPipeline('manual', req.user?.email).catch((err: any) =>
        logger.error({ event: 'PIPELINE_UNHANDLED_ERROR', err: err.message })
      );
      res.json({ success: true, message: 'Pipeline iniciado. Acompanhe em videoPipelineRuns no Firestore.' });
    } catch (err: any) {
      res.status(500).json({ error: 'Falha ao iniciar o pipeline.', details: err.message });
    }
  });

  // ── Admin — Criar usuário/editor ──────────────────────────────────────────────
  app.post('/api/admin/users/create', requireOwner, async (req: any, res: any) => {
    const parsed = CreateUserSchema.safeParse(req.body);
    if (!parsed.success) {
      const errs = parsed.error.flatten().fieldErrors;
      const msg  = Object.values(errs).flat()[0] || 'Dados inválidos.';
      return res.status(400).json({ error: msg });
    }

    const { name, login, password, role } = parsed.data;
    const sanitizedLogin = login.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9._-]/g, '');
    if (!sanitizedLogin) return res.status(400).json({ error: 'Login inválido.' });

    const email      = `${sanitizedLogin}@nextcreatives.internal`;
    const memberRole = role ?? 'editor';
    let createdUid: string | null = null;

    try {
      const userRecord = await admin.auth().createUser({ email, password, displayName: name.trim() });
      createdUid = userRecord.uid;

      const initials = name.trim().split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() || 'NU';
      const batch    = db.batch();

      batch.set(db.collection('employees').doc(createdUid), {
        name: name.trim(), role: memberRole, login: sanitizedLogin,
        password, initials, lastLogin: 'Nunca',
        userId: createdUid, isOwner: false,
        createdAt: new Date().toISOString(), createdBy: req.user.uid,
      });

      batch.set(db.collection('users').doc(createdUid), {
        name: name.trim(), role: memberRole, email,
        userId: createdUid, isOwner: false,
        createdAt: new Date().toISOString(), createdBy: req.user.uid,
      });

      await batch.commit();

      logger.info({ event: 'ADMIN_USER_CREATED', uid: createdUid, login: sanitizedLogin, role: memberRole });
      return res.status(201).json({ success: true, uid: createdUid, message: `Acesso criado para ${name.trim()}.` });

    } catch (error: any) {
      if (createdUid && error?.code !== 'auth/email-already-exists') {
        await admin.auth().deleteUser(createdUid).catch(() => {});
        logger.warn({ event: 'ADMIN_USER_ROLLBACK', uid: createdUid });
      }
      if (error?.code === 'auth/email-already-exists') return res.status(409).json({ error: `Login "${sanitizedLogin}" já está em uso.` });
      if (error?.code === 'auth/invalid-password')      return res.status(400).json({ error: 'Senha inválida. Mínimo 6 caracteres.' });
      logger.error({ event: 'ADMIN_USER_CREATE_ERROR', err: error.message });
      return res.status(500).json({ error: 'Erro interno ao criar acesso.' });
    }
  });

  // ── Admin — Gerador de roteiro ────────────────────────────────────────────────
  app.post('/api/admin/generate-script', requireOwner, async (req: any, res: any) => {
    const parsed = GenerateScriptSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten().fieldErrors.briefing?.[0] || 'Dados inválidos.' });
    }
    const { briefing, engine } = parsed.data;

    const userMessage  = `BRIEFING DO CLIENTE:\n${briefing.trim()}\n\nGere o roteiro e os prompts agora. Retorne APENAS o JSON.`;
    const controller   = new AbortController();
    const timeoutId    = setTimeout(() => controller.abort(), 30_000);

    try {
      let scriptData: any;

      if (engine === 'groq') {
        const groqKey = process.env.GROQ_API_KEY;
        if (!groqKey) { clearTimeout(timeoutId); return res.status(500).json({ error: 'GROQ_API_KEY não configurada.' }); }

        const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${groqKey}` },
          body:    JSON.stringify({
            model:           'llama-3.3-70b-versatile',
            messages:        [{ role: 'system', content: SCRIPT_SYSTEM_PROMPT }, { role: 'user', content: userMessage }],
            temperature:     0.75,
            max_tokens:      4096,
            response_format: { type: 'json_object' },
          }),
          signal: controller.signal,
        });

        if (!groqRes.ok) {
          const errBody = await groqRes.json().catch(() => ({}));
          clearTimeout(timeoutId);
          return res.status(502).json({ error: 'Erro na API da Groq.', details: errBody });
        }

        const groqData = await groqRes.json() as any;
        const raw: string | undefined = groqData.choices?.[0]?.message?.content;
        if (!raw) { clearTimeout(timeoutId); return res.status(502).json({ error: 'Groq retornou resposta vazia.' }); }
        scriptData = JSON.parse(raw);

      } else {
        const geminiKey = process.env.GEMINI_API_KEY;
        if (!geminiKey) { clearTimeout(timeoutId); return res.status(500).json({ error: 'GEMINI_API_KEY não configurada.' }); }

        const { GoogleGenAI } = await import('@google/genai');
        const aiClient = new GoogleGenAI({ apiKey: geminiKey });
        const aiRes    = await aiClient.models.generateContent({
          model:    'gemini-3-flash-preview',
          contents: `${SCRIPT_SYSTEM_PROMPT}\n\n${userMessage}`,
          config:   { responseMimeType: 'application/json' },
        });
        if (!aiRes.text) { clearTimeout(timeoutId); return res.status(502).json({ error: 'Gemini retornou resposta vazia.' }); }
        scriptData = JSON.parse(aiRes.text);
      }

      clearTimeout(timeoutId);

      if (typeof scriptData?.title !== 'string' || !Array.isArray(scriptData?.scenes) || !Array.isArray(scriptData?.prompts)) {
        return res.status(502).json({ error: 'LLM retornou JSON com estrutura inválida.', raw: scriptData });
      }

      logger.info({ event: 'GENERATE_SCRIPT_SUCCESS', engine, scenes: scriptData.scenes.length });
      return res.status(200).json(scriptData);

    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError')   return res.status(504).json({ error: 'Timeout: LLM demorou mais de 30 segundos.' });
      if (err instanceof SyntaxError) return res.status(502).json({ error: 'LLM retornou conteúdo não-JSON.' });
      logger.error({ event: 'GENERATE_SCRIPT_ERROR', err: err.message });
      return res.status(500).json({ error: 'Erro interno ao gerar roteiro.', details: err.message });
    }
  });

  // ── Inicia sessões e crons ─────────────────────────────────────────────────
  restoreSessions();
  initializeCronJob();

  // ── Vite (dev) / Static (prod) ────────────────────────────────────────────
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => res.sendFile(path.join(distPath, 'index.html')));
  }

  // ── Listen ─────────────────────────────────────────────────────────────────
  httpServer.listen(PORT, '0.0.0.0', () => {
    logger.info({ event: 'SERVER_START', port: PORT }, `Servidor rodando em http://localhost:${PORT}`);
    logger.info({ event: 'SOCKET_IO_READY', port: PORT }, `Socket.IO pronto em ws://localhost:${PORT}`);
  });
}

// ── Boot ──────────────────────────────────────────────────────────────────────
startServer().catch(err => {
  logger.error({ event: 'SERVER_BOOT_FAILED', err: err.message }, 'Falha crítica ao iniciar servidor');
  process.exit(1);
});
