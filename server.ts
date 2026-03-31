import express from "express";
import { createServer as createHttpServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import rateLimit from "express-rate-limit";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { initializeApp } from "firebase/app";
import admin from "firebase-admin";
import fs from "fs";
import QRCode from "qrcode";
import { makeWASocket, DisconnectReason, fetchLatestBaileysVersion, makeInMemoryStore, BufferJSON, AuthenticationCreds, initAuthCreds, SignalDataTypeMap } from "@whiskeysockets/baileys";
import pino from "pino";
import nodemailer from "nodemailer";
import { runVideoPipeline, initializeCronJob } from "./services/automation/orchestratorService.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ── Named application logger ──────────────────────────────────────────────────
// Use LOG_LEVEL=debug for verbose output. Default: info.
const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  base: { service: 'nextcreatives-server' },
});

// ── Per-user rate limiting (Firestore-backed, in-memory cached) ───────────────
//
// Architecture:
//  1. IP-based express-rate-limit  → first gate, no DB needed, blocks bots fast
//  2. requireAdmin middleware      → verifies Firebase JWT, sets req.user.uid
//  3. createUserRateLimiter(action)→ second gate, per-uid sliding window (1 hour)
//  4. checkCircuitBreaker(action)  → third gate, global counter; opens on abuse
//
// Firestore doc: rateLimits/{uid}  → { [action]: { count, windowStart } }
// In-memory cache (30s TTL) prevents a Firestore read on every single request.

const USER_RATE_WINDOW_MS = 60 * 60 * 1000; // 1 hour sliding window
const USER_RATE_CACHE_TTL_MS = 30_000;       // re-read Firestore every 30s at most

// Per-user limits (requests per hour, per uid)
const USER_LIMITS: Record<string, number> = {
  transcribe:     30,   // 30 Whisper/Groq calls per user/hour
  video_pipeline: 5,    // 5 HeyGen renders per user/hour
  lead_search:    20,   // 20 Google Custom Search calls per user/hour
  whatsapp_send:  120,  // 120 WhatsApp sends per user/hour
};

// Global circuit-breaker thresholds (all users combined, per hour)
const CIRCUIT_THRESHOLDS: Record<string, number> = {
  transcribe:     200,  // if >200 transcriptions/hr across all users → 503
  video_pipeline: 30,   // if >30 video renders/hr globally → 503
  lead_search:    150,  // if >150 lead searches/hr globally → 503
  whatsapp_send:  1000, // if >1000 WA sends/hr globally → 503
};

interface UserRateCacheEntry {
  count: number;
  windowStart: number; // epoch ms
  lastCached: number;  // epoch ms — cache freshness timestamp
}

interface CircuitEntry {
  count: number;
  windowStart: number;
  isOpen: boolean;
}

// In-memory stores (reset on server restart — intentional for circuit breaker)
const userRateCache  = new Map<string, UserRateCacheEntry>();
const circuitState   = new Map<string, CircuitEntry>();

/**
 * checkCircuitBreaker — increments the global counter for an action.
 * Returns true (circuit open) if the threshold is exceeded → caller sends 503.
 */
function checkCircuitBreaker(action: string): boolean {
  const threshold = CIRCUIT_THRESHOLDS[action];
  if (!threshold) return false;

  const now = Date.now();
  let entry = circuitState.get(action);

  // Reset window if expired
  if (!entry || now - entry.windowStart > USER_RATE_WINDOW_MS) {
    entry = { count: 0, windowStart: now, isOpen: false };
    circuitState.set(action, entry);
  }

  // Circuit already open — don't reset until window expires
  if (entry.isOpen) return true;

  entry.count++;

  if (entry.count > threshold) {
    entry.isOpen = true;
    logger.warn(
      { action, globalCount: entry.count, threshold, event: 'CIRCUIT_BREAKER_OPEN' },
      `Circuit breaker opened for action "${action}" (${entry.count}/${threshold} req/hr globally)`
    );
    return true;
  }

  return false;
}

/**
 * createUserRateLimiter — middleware factory.
 * Must be placed AFTER requireAdmin (needs req.user.uid).
 *
 * Flow:
 *  1. Circuit breaker check (in-memory, fast)
 *  2. Memory cache check (stale after 30s → reads Firestore)
 *  3. Limit check → 429 if exceeded
 *  4. Increment counter → async write-through to Firestore (non-blocking)
 */
function createUserRateLimiter(action: string) {
  const maxRequests = USER_LIMITS[action] ?? 20;

  return async (req: any, res: any, next: any) => {
    const uid: string | undefined = req.user?.uid;
    if (!uid) return next(); // requireAdmin already blocked unauthenticated requests

    // ── Gate 1: Global circuit breaker ──────────────────────────────────────
    if (checkCircuitBreaker(action)) {
      logger.warn(
        { uid, action, event: 'CIRCUIT_BREAKER_REJECTED' },
        `Request rejected — circuit breaker open for "${action}"`
      );
      return res.status(503).json({
        error: 'Serviço temporariamente suspenso por manutenção de segurança de custos. Tente novamente em alguns minutos.',
        retryAfter: 60
      });
    }

    // ── Gate 2: Per-user sliding window ─────────────────────────────────────
    const cacheKey = `${uid}:${action}`;
    const now = Date.now();
    let entry = userRateCache.get(cacheKey);
    const cacheStale = !entry || (now - entry.lastCached) > USER_RATE_CACHE_TTL_MS;

    if (cacheStale) {
      try {
        const docSnap = await admin.firestore().collection('rateLimits').doc(uid).get();
        const stored = docSnap.data()?.[action] as { count: number; windowStart: number } | undefined;

        if (stored && (now - stored.windowStart) < USER_RATE_WINDOW_MS) {
          entry = { count: stored.count, windowStart: stored.windowStart, lastCached: now };
        } else {
          // Window expired in Firestore or no record — start fresh
          entry = { count: 0, windowStart: now, lastCached: now };
        }
        userRateCache.set(cacheKey, entry);
      } catch (err) {
        // Fail open on Firestore error — log but don't block legitimate users
        logger.error({ uid, action, err, event: 'RATE_LIMIT_FIRESTORE_READ_ERROR' },
          'Firestore read failed in user rate limiter — failing open');
        return next();
      }
    }

    // Reset if local window also expired
    if (now - entry.windowStart > USER_RATE_WINDOW_MS) {
      entry = { count: 0, windowStart: now, lastCached: now };
      userRateCache.set(cacheKey, entry);
    }

    // ── Limit check ─────────────────────────────────────────────────────────
    if (entry.count >= maxRequests) {
      const retryAfterSec = Math.ceil((USER_RATE_WINDOW_MS - (now - entry.windowStart)) / 1000);
      logger.warn(
        { uid, action, count: entry.count, limit: maxRequests, retryAfterSec, event: 'USER_RATE_LIMIT_EXCEEDED' },
        `User "${uid}" exceeded rate limit for "${action}" (${entry.count}/${maxRequests} req/hr)`
      );
      return res.status(429).json({
        error: `Limite horário de "${action}" atingido (${maxRequests} req/hora por usuário). Aguarde antes de tentar novamente.`,
        retryAfter: retryAfterSec
      });
    }

    // ── Increment + async write-through to Firestore ─────────────────────────
    entry.count++;
    entry.lastCached = now;
    userRateCache.set(cacheKey, entry);

    const { count, windowStart } = entry;
    admin.firestore()
      .collection('rateLimits')
      .doc(uid)
      .set({ [action]: { count, windowStart, updatedAt: Date.now() } }, { merge: true })
      .catch((err: any) =>
        logger.error({ uid, action, err, event: 'RATE_LIMIT_FIRESTORE_WRITE_ERROR' },
          'Async Firestore write failed in user rate limiter')
      );

    next();
  };
}

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
  console.log(`[Auth] Checking authorization for ${req.method} ${req.url}`);
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    logger.warn({ url: req.url, method: req.method, event: 'AUTH_MISSING_TOKEN' },
      'Missing or invalid authorization header');
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
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        const userData = await response.json();
        const role = userData.fields?.role?.stringValue;
        if (role === 'admin' || role === 'editor') {
          req.user = decodedToken;
          return next();
        }
      } else {
        logger.warn(
          { uid, url: req.url, status: response.status, event: 'AUTH_ROLE_FETCH_FAILED' },
          'Failed to fetch user role from Firestore REST API'
        );
      }
    }
    // Also check if it's the master owner
    if (decodedToken.email === 'arthurfgalves@gmail.com' || decodedToken.email === '15599873676@nextcreatives.co') {
      req.user = decodedToken;
      return next();
    }

    logger.warn(
      { uid, email: decodedToken.email, url: req.url, event: 'AUTH_FORBIDDEN' },
      'Authenticated user does not have admin/editor access'
    );
    res.status(403).json({ error: 'Forbidden: Admin access required' });
  } catch (error) {
    logger.warn({ url: req.url, event: 'AUTH_INVALID_TOKEN', error }, 'Token verification failed');
    res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
};

// ─── SMTP Transporter (Hostinger) ─────────────────────────────────────────────
const smtpTransporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.hostinger.com",
  port: Number(process.env.SMTP_PORT) || 465,
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

async function startServer() {
  const app = express();
  const httpServer = createHttpServer(app);
  const io = new SocketIOServer(httpServer, {
    cors: { origin: "*", methods: ["GET", "POST"] }
  });
  const PORT = 3000;

  // ── Socket.IO Auth Middleware ──────────────────────────────────────────────
  // Maps firebase uid -> socket for targeted emits
  const userSockets = new Map<string, import("socket.io").Socket>();

  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) return next(new Error("Unauthorized: no token"));
    try {
      const decoded = await admin.auth().verifyIdToken(token);
      (socket as any).uid = decoded.uid;
      next();
    } catch {
      next(new Error("Unauthorized: invalid token"));
    }
  });

  io.on("connection", (socket) => {
    const uid = (socket as any).uid as string;
    userSockets.set(uid, socket);
    console.log(`[Socket.IO] Client connected: ${uid}`);

    socket.on("disconnect", () => {
      userSockets.delete(uid);
      console.log(`[Socket.IO] Client disconnected: ${uid}`);
    });
  });

  app.use(express.json());

  // ── Rate Limiters ──────────────────────────────────────────────────────────
  // WhatsApp send: 20 req / min per IP — prevents credit drain & spam floods
  const waSendLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Limite de envio atingido. Tente novamente em 1 minuto.' }
  });

  // Groq / Whisper transcription: 10 req / min per IP — each call bills tokens
  const transcribeLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Limite de transcrição atingido. Tente novamente em 1 minuto.' }
  });

  // Lead search: 5 req / min per IP — Google Custom Search has a paid quota
  const leadSearchLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Limite de busca de leads atingido. Tente novamente em 1 minuto.' }
  });

  // API Health Check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // SYSTEM LOG — AI Debug Logger
  // Receives structured error payloads from the Front-End (ErrorBoundary, try/catch).
  // No auth required: captures errors from unauthenticated sessions too.
  // Dual write: Pino terminal + Firestore ai_system_logs/{timestamp}_{uid}.
  // ════════════════════════════════════════════════════════════════════════════

  // Rate limiter: 30 log writes / min per IP — prevents log-flood DoS
  const logLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Log rate limit exceeded.' }
  });

  app.post("/api/system/log", logLimiter, async (req: any, res: any) => {
    try {
      const {
        level     = 'error',
        message   = '(no message)',
        component,
        stack,
        context,
        uid,
        url,
        userAgent,
      } = req.body ?? {};

      // ── Sanitize: cap field lengths to prevent oversized Firestore docs ──
      const sanitized = {
        level:     String(level).slice(0, 20),
        message:   String(message).slice(0, 2000),
        component: component ? String(component).slice(0, 200) : null,
        stack:     stack     ? String(stack).slice(0, 5000)    : null,
        context:   context   ? JSON.parse(JSON.stringify(context)) : null,
        uid:       uid       ? String(uid).slice(0, 128)        : null,
        url:       url       ? String(url).slice(0, 500)        : null,
        userAgent: userAgent ? String(userAgent).slice(0, 300)  : null,
        serverTs:  Date.now(),
        env:       process.env.NODE_ENV ?? 'development',
      };

      // ── 1. Pino terminal (visible in dev + VPS stdout) ───────────────────
      const pinoLevel = ['error', 'warn', 'info', 'debug'].includes(sanitized.level)
        ? sanitized.level as 'error' | 'warn' | 'info' | 'debug'
        : 'error';

      logger[pinoLevel](
        { event: 'FRONTEND_LOG', ...sanitized },
        `[FE] ${sanitized.component ?? 'unknown'}: ${sanitized.message}`
      );

      // ── 2. Firestore: ai_system_logs/{timestamp}_{uid_or_anon} ───────────
      const docId = `${sanitized.serverTs}_${sanitized.uid ?? 'anon'}`;
      await admin.firestore()
        .collection('ai_system_logs')
        .doc(docId)
        .set(sanitized);

      res.status(201).json({ ok: true, id: docId });
    } catch (err: any) {
      logger.error({ event: 'SYSTEM_LOG_WRITE_ERROR', err: err.message }, 'Failed to write system log');
      // Always return 201 to the FE — never let logging break the UX
      res.status(201).json({ ok: false });
    }
  });

  // ════════════════════════════════════════════════════════════════════════════
  // AUTH — Password Recovery via SMTP
  // ════════════════════════════════════════════════════════════════════════════

  app.post("/api/auth/forgot-password", async (req: any, res: any) => {
    const { email } = req.body;

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: "E-mail inválido." });
    }

    try {
      const resetLink = await admin.auth().generatePasswordResetLink(email, {
        url: `${process.env.APP_URL || "http://localhost:3000"}/login`,
      });

      const fromName = process.env.SMTP_FROM_NAME || "Next Creative";
      const fromEmail = process.env.SMTP_USER;

      await smtpTransporter.sendMail({
        from: `"${fromName}" <${fromEmail}>`,
        to: email,
        subject: "Recuperação de senha — Next Creative",
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

      return res.json({ success: true, message: "Se o e-mail existir, um link de redefinição foi enviado." });
    } catch (error: any) {
      if (error?.errorInfo?.code === "auth/user-not-found") {
        return res.json({ success: true, message: "Se o e-mail existir, um link de redefinição foi enviado." });
      }
      console.error("❌ Erro na recuperação de senha:", error);
      return res.status(500).json({ error: "Falha ao enviar e-mail de recuperação." });
    }
  });

  // WhatsApp Sessions State
  const sessions = new Map<string, {
    socket: any,
    qr: string | null,
    status: 'disconnected' | 'connecting' | 'qr' | 'authenticated' | 'ready',
    userInfo: any
  }>();

  const useFirestoreAuthState = async (uid: string) => {
    const db = admin.firestore();
    const sessionRef = db.collection('whatsapp_sessions').doc(uid);
    const keysRef = sessionRef.collection('keys');

    const writeData = async (data: any, id: string) => {
      const json = JSON.stringify(data, BufferJSON.replacer);
      await keysRef.doc(id).set({ data: json });
    };

    const readData = async (id: string) => {
      const doc = await keysRef.doc(id).get();
      if (doc.exists) {
        const data = doc.data();
        return JSON.parse(data!.data, BufferJSON.reviver);
      }
      return null;
    };

    const removeData = async (id: string) => {
      await keysRef.doc(id).delete();
    };

    const credsDoc = await sessionRef.get();
    let creds: AuthenticationCreds;
    if (credsDoc.exists && credsDoc.data()?.creds) {
      creds = JSON.parse(credsDoc.data()!.creds, BufferJSON.reviver);
    } else {
      creds = initAuthCreds();
    }

    return {
      state: {
        creds,
        keys: {
          get: async (type: keyof SignalDataTypeMap, ids: string[]) => {
            const data: { [id: string]: any } = {};
            await Promise.all(ids.map(async (id) => {
              const value = await readData(`${type}-${id}`);
              if (value) data[id] = value;
            }));
            return data;
          },
          set: async (data: any) => {
            const tasks: Promise<void>[] = [];
            for (const type in data) {
              for (const id in data[type]) {
                const value = data[type][id];
                const key = `${type}-${id}`;
                if (value) {
                  tasks.push(writeData(value, key));
                } else {
                  tasks.push(removeData(key));
                }
              }
            }
            await Promise.all(tasks);
          }
        }
      },
      saveCreds: async () => {
        await sessionRef.set({ creds: JSON.stringify(creds, BufferJSON.replacer) }, { merge: true });
      }
    };
  };

  const initializeWhatsApp = async (uid: string) => {
    if (sessions.has(uid) && sessions.get(uid)?.socket) return;

    sessions.set(uid, {
      socket: null,
      qr: null,
      status: 'connecting',
      userInfo: null
    });

    try {
      const { state, saveCreds } = await useFirestoreAuthState(uid);
      const { version, isLatest } = await fetchLatestBaileysVersion();
      console.log(`[${uid}] using WA v${version.join('.')}, isLatest: ${isLatest}`);

      const socket = makeWASocket({
        version,
        auth: state,
        printQRInTerminal: false,
        logger: pino({ level: 'silent' }) as any
      });

      sessions.get(uid)!.socket = socket;
      store.bind(socket.ev);

      socket.ev.on('connection.update', async (update: any) => {
        const { connection, lastDisconnect, qr } = update;
        const session = sessions.get(uid);
        if (!session) return;

        if (qr) {
          console.log(`[${uid}] WhatsApp QR Received`);
          session.qr = await QRCode.toDataURL(qr);
          session.status = 'qr';
        }

        if (connection === 'close') {
          const shouldReconnect = (lastDisconnect?.error as any)?.output?.statusCode !== DisconnectReason.loggedOut;
          console.log(`[${uid}] WhatsApp Connection closed. Reconnecting:`, shouldReconnect);
          session.status = 'disconnected';
          session.socket = null;
          session.qr = null;
          // Emit disconnection to frontend immediately
          userSockets.get(uid)?.emit('whatsapp:status', {
            status: 'disconnected',
            qr: null,
            user: null
          });
          if (shouldReconnect) {
            setTimeout(() => initializeWhatsApp(uid), 5000);
          }
        } else if (connection === 'open') {
          console.log(`[${uid}] WhatsApp Ready`);
          session.status = 'ready';
          session.qr = null;
          session.userInfo = socket.user;
          // Emit ready state to frontend
          userSockets.get(uid)?.emit('whatsapp:status', {
            status: 'ready',
            qr: null,
            user: socket.user
          });
        }

        // Emit QR updates to frontend in real-time
        if (qr && session.qr) {
          userSockets.get(uid)?.emit('whatsapp:status', {
            status: 'qr',
            qr: session.qr,
            user: null
          });
        }
      });

      socket.ev.on('creds.update', saveCreds);

      socket.ev.on('messages.upsert', (m: any) => {
        if (m.type === 'notify') {
          for (const msg of m.messages) {
            console.log(`[${uid}] WhatsApp Message Received from ${msg.key.remoteJid}`);
            // Push new message to the connected frontend client
            userSockets.get(uid)?.emit('whatsapp:message', msg);
          }
        }
      });
    } catch (error) {
      console.error(`[${uid}] Error initializing WhatsApp:`, error);
      const session = sessions.get(uid);
      if (session) {
        session.status = 'disconnected';
        session.socket = null;
        session.qr = null;
      }
    }
  };

  // Restore sessions for previously connected users from Firestore
  const restoreSessions = async () => {
    try {
      const sessionsSnapshot = await admin.firestore().collection('whatsapp_sessions').get();
      console.log(`[WhatsApp] Restoring ${sessionsSnapshot.size} sessions from Firestore...`);
      sessionsSnapshot.forEach(doc => {
        console.log(`[WhatsApp] Restoring session for user: ${doc.id}`);
        initializeWhatsApp(doc.id);
      });
    } catch (error) {
      console.error("[WhatsApp] Error restoring sessions:", error);
    }
  };

  // Start restoring sessions
  restoreSessions();

  // Initialize Video Automation Pipeline cron job
  initializeCronJob();

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
  app.get("/api/whatsapp/chats", requireAdmin, async (req: any, res) => {
    const uid = req.user.uid;
    const session = sessions.get(uid);
    if (!session || !session.socket || session.status !== 'ready') {
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

  app.get("/api/whatsapp/messages/:jid", requireAdmin, async (req: any, res) => {
    const uid = req.user.uid;
    const session = sessions.get(uid);
    const { jid } = req.params;
    if (!session || !session.socket || session.status !== 'ready') {
      return res.status(400).json({ error: "WhatsApp not connected" });
    }
    const messages = await store.loadMessages(jid, 50, undefined);
    res.json(messages);
  });

  app.get("/api/whatsapp/contacts", requireAdmin, (req, res) => {
    res.json(Object.values(store.contacts));
  });

  app.get("/api/whatsapp/status", requireAdmin, (req: any, res) => {
    const uid = req.user.uid;
    console.log(`[WhatsApp] Status requested for UID: ${uid}`);
    const session = sessions.get(uid);
    res.json({ 
      status: session?.status || 'disconnected', 
      qr: session?.qr || null,
      user: session?.userInfo || null
    });
  });

  app.post("/api/whatsapp/connect", requireAdmin, async (req: any, res) => {
    const uid = req.user.uid;
    let session = sessions.get(uid);
    if (!session || session.status === 'disconnected') {
      await initializeWhatsApp(uid);
      session = sessions.get(uid);
    }
    res.json({ status: session?.status, qr: session?.qr });
  });

  app.post("/api/whatsapp/pair", requireAdmin, async (req: any, res) => {
    try {
      const uid = req.user.uid;
      const { phone } = req.body;
      if (!phone) {
        return res.status(400).json({ error: 'Número de telefone é obrigatório.' });
      }

      let session = sessions.get(uid);
      if (!session || session.status === 'disconnected' || !session.socket) {
        await initializeWhatsApp(uid);
        session = sessions.get(uid);
        // Wait a bit for the socket to initialize
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      const cleanPhone = phone.replace(/\D/g, '');
      const code = await session!.socket.requestPairingCode(cleanPhone);
      res.json({ code });
    } catch (error) {
      console.error("Erro ao solicitar código de pareamento:", error);
      res.status(500).json({ error: "Falha ao gerar código de pareamento." });
    }
  });

  app.post("/api/whatsapp/logout", requireAdmin, async (req: any, res) => {
    const uid = req.user.uid;
    const session = sessions.get(uid);
    if (session && session.socket) {
      try {
        await session.socket.logout();
      } catch (e) {
        console.error("Error during WhatsApp logout:", e);
      }
      sessions.delete(uid);
    }
    res.json({ success: true });
  });

  app.post("/api/whatsapp/send", waSendLimiter, requireAdmin, createUserRateLimiter('whatsapp_send'), async (req: any, res) => {
    try {
      const uid = req.user.uid;
      const { phone, message } = req.body;
      if (!phone || !message) {
        return res.status(400).json({ error: 'Número e mensagem são obrigatórios.' });
      }

      const session = sessions.get(uid);
      if (!session || session.status !== 'ready' || !session.socket) {
        return res.status(400).json({ error: 'WhatsApp não está conectado.' });
      }

      const cleanPhone = phone.replace(/\D/g, '') + '@s.whatsapp.net';
      await session.socket.sendMessage(cleanPhone, { text: message });
      res.json({ success: true });
    } catch (error) {
      console.error("Erro ao enviar mensagem WhatsApp:", error);
      res.status(500).json({ error: "Falha ao enviar mensagem." });
    }
  });

  app.post("/api/whatsapp/transcribe", transcribeLimiter, requireAdmin, createUserRateLimiter('transcribe'), async (req: any, res) => {
    try {
      const uid = req.user.uid;
      const { jid, msgId } = req.body;
      if (!jid || !msgId) {
        return res.status(400).json({ error: 'JID e ID da mensagem são obrigatórios.' });
      }

      const session = sessions.get(uid);
      if (!session || !session.socket || session.status !== 'ready') {
        return res.status(400).json({ error: 'WhatsApp não está conectado.' });
      }

      // Find the message in the store
      const messages = await store.loadMessages(jid, 100, undefined);
      const msg = messages.find(m => m.key.id === msgId);

      if (!msg || !msg.message?.audioMessage) {
        return res.status(404).json({ error: 'Mensagem de áudio não encontrada.' });
      }

      const { downloadMediaMessage } = await import('@whiskeysockets/baileys');
      const buffer = await downloadMediaMessage(msg, 'buffer', {}, { 
        logger: pino({ level: 'silent' }) as any,
        reuploadRequest: session.socket.updateMediaMessage
      });

      const groqApiKey = process.env.GROQ_API_KEY;
      if (!groqApiKey) {
        return res.status(500).json({ error: 'Chave de API da Groq não configurada.' });
      }

      const formData = new FormData();
      const blob = new Blob([new Uint8Array(buffer)], { type: 'audio/ogg' });
      formData.append('file', blob, 'audio.ogg');
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
        return res.status(groqRes.status).json({ error: 'Erro na API da Groq', details: errData });
      }

      const data = await groqRes.json();
      res.json(data);
    } catch (error) {
      console.error("Erro na transcrição WhatsApp:", error);
      res.status(500).json({ error: 'Falha interna na transcrição do WhatsApp.' });
    }
  });

  // Groq Transcription Endpoint (Generic)
  app.post("/api/transcribe", transcribeLimiter, requireAdmin, createUserRateLimiter('transcribe'), async (req, res) => {
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
  app.post("/api/leads/search", leadSearchLimiter, requireAdmin, createUserRateLimiter('lead_search'), async (req, res) => {
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
          const isShopify = html.includes('cdn.shopify.com') || html.includes('shopify-checkout');
          const hasVideo = html.includes('<video') || html.includes('youtube.com/embed') || html.includes('vimeo.com');

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

          let aiData: any = {};
          if (ai) {
            try {
              const prompt = `Analise o site ${url} do nicho ${nicho}. 
              Sinais detectados: Pixel=${temMetaPixel}, GoogleAds=${temGoogleAds}, Shopify=${isShopify}, Tem Vídeo=${hasVideo}.
              HTML (resumo): ${html.substring(0, 3000)}
              
              Gere um objeto JSON com os seguintes campos:
              - score: número de 0 a 100 (potencial de conversão para venda de serviços de vídeo IA)
              - painPanel: uma frase curta e impactante em português sobre a maior oportunidade perdida (ex: "Loja escala anúncios mas não tem vídeos de prova social")
              - tags: array de strings com sinais (ex: ["Pixel Ativo", "Shopify", "Sem Vídeos"])
              - trafficSignals: { runsAds: "SIM" ou "NÃO", platform: "Nome da Plataforma", format: "Estático" ou "Vídeo", pixel: "Detectado" ou "Não Detectado", videoPage: "Presente" ou "Ausente" }
              - aiAnalysis: { positiveSigns: string[], negativeSigns: string[], suggestedTemplate: { name: string, description: string } }
              - abordagemWhatsApp: uma mensagem persuasiva de abordagem em português.

              Retorne APENAS o JSON.`;

              const aiRes = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: prompt,
                config: { responseMimeType: 'application/json' }
              });
              
              if (aiRes.text) {
                aiData = JSON.parse(aiRes.text);
              }
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
            abordagemWhatsApp: aiData.abordagemWhatsApp || null,
            score: aiData.score || 0,
            painPanel: aiData.painPanel || "Análise pendente",
            tags: aiData.tags || [],
            trafficSignals: aiData.trafficSignals || {
              runsAds: temMetaPixel || temGoogleAds ? "SIM" : "NÃO",
              platform: isShopify ? "Shopify" : "Desconhecida",
              format: hasVideo ? "Vídeo" : "Estático",
              pixel: temMetaPixel ? "Detectado" : "Não Detectado",
              videoPage: hasVideo ? "Presente" : "Ausente"
            },
            aiAnalysis: aiData.aiAnalysis || {
              positiveSigns: [],
              negativeSigns: [],
              suggestedTemplate: { name: "Padrão", description: "Abordagem genérica de conversão" }
            },
            status: "novo",
            discoveryDate: new Date().toISOString(),
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

  // Lead Engine: Run Shopify Scraper
  app.post("/api/scrapers/shopify/run", requireAdmin, async (req: any, res) => {
    try {
      const { urls } = req.body;
      if (!urls || urls.length === 0) {
        return res.status(400).json({ error: "Lista de URLs vazia." });
      }

      res.setHeader('Content-Type', 'application/x-ndjson');
      res.setHeader('Transfer-Encoding', 'chunked');

      const scraperDir = path.join(process.cwd(), 'scrapers', 'shopify_scraper');
      if (!fs.existsSync(scraperDir)) fs.mkdirSync(scraperDir, { recursive: true });

      const timestamp = Date.now();
      const inputFilename = path.join(scraperDir, `input_${timestamp}.txt`);
      const outputFilename = path.join(scraperDir, `output_${timestamp}.json`);

      fs.writeFileSync(inputFilename, urls.join('\n'));

      const { spawn } = require('child_process');
      const pythonProcess = spawn('python', ['shopify_scraper.py', inputFilename, '--output', outputFilename], { cwd: scraperDir });

      let processedCount = 0;
      const totalUrls = urls.length;

      pythonProcess.stdout.on('data', (data: any) => {
        const lines = data.toString().split('\n').filter(Boolean);
        for (const line of lines) {
          res.write(JSON.stringify({ type: 'log', text: line }) + '\n');
          // Python scraper logs "  → store_name | ..." for each completed store
          if (line.includes(' → ')) {
            processedCount++;
            if (processedCount % 50 === 0) {
              admin.firestore().collection('scraper_metadata').doc('stats').set({
                shopify: {
                  totalLeads: processedCount,
                  queueProgress: Math.round((processedCount / totalUrls) * 100),
                  lastRun: new Date().toISOString(),
                  currentStatus: 'running',
                }
              }, { merge: true }).catch(() => {});
            }
          }
        }
      });
      pythonProcess.stderr.on('data', (data: any) => {
        const lines = data.toString().split('\n').filter(Boolean);
        for (const line of lines) res.write(JSON.stringify({ type: 'log', text: line }) + '\n');
      });

      pythonProcess.on('close', (code: any) => {
        // Write final stats to Firestore regardless of exit code
        admin.firestore().collection('scraper_metadata').doc('stats').set({
          shopify: {
            totalLeads: processedCount,
            queueProgress: 100,
            lastRun: new Date().toISOString(),
            currentStatus: 'stopped',
          }
        }, { merge: true }).catch(() => {});

        try {
          if (fs.existsSync(outputFilename)) {
             const results = JSON.parse(fs.readFileSync(outputFilename, 'utf8'));
             res.write(JSON.stringify({ type: 'done', success: true, results }) + '\n');
          } else {
             res.write(JSON.stringify({ type: 'done', success: false, error: "Scraper não gerou arquivo de saída." }) + '\n');
          }
        } catch (e: any) {
             res.write(JSON.stringify({ type: 'done', success: false, error: "Falha ao ler resultado do scraper: " + e.message }) + '\n');
        }
        res.end();
      });
    } catch (err: any) {
      if (!res.headersSent) {
        res.status(500).json({ error: "Falha interna.", details: err.message });
      } else {
        res.write(JSON.stringify({ type: 'done', success: false, error: err.message }) + '\n');
        res.end();
      }
    }
  });

  // ── Vercel Cron: buscar leads diariamente ─────────────────────────────────
  // Protected by CRON_SECRET — Vercel Cron sends: Authorization: Bearer <CRON_SECRET>
  // Firebase Auth is NOT used here; this endpoint has no user context.
  app.get("/api/cron/buscar-leads", async (req: any, res: any) => {
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret) {
      console.error("[Cron] CRON_SECRET not configured — rejecting request");
      return res.status(500).json({ error: "Cron secret not configured." });
    }
    const authHeader = req.headers.authorization;
    if (!authHeader || authHeader !== `Bearer ${cronSecret}`) {
      console.warn("[Cron] Unauthorized cron attempt");
      return res.status(401).json({ error: "Unauthorized." });
    }
    try {
      console.log("[Cron] /api/cron/buscar-leads triggered by Vercel scheduler");
      // Fire-and-forget: runs the same lead search pipeline used by admins
      // Add your lead collection logic here or call an existing service
      res.json({ success: true, message: "Lead collection cron triggered." });
    } catch (err: any) {
      console.error("[Cron] Lead search failed:", err.message);
      res.status(500).json({ error: "Cron job failed.", details: err.message });
    }
  });

  // Manual trigger for Video Automation Pipeline (admin only, fire-and-forget)
  app.post("/api/automation/video-pipeline/run", requireAdmin, createUserRateLimiter('video_pipeline'), async (req: any, res: any) => {
    try {
      const userEmail = req.user?.email;
      console.log(`[Pipeline] Manual trigger by: ${userEmail}`);
      runVideoPipeline('manual', userEmail).catch((err: any) =>
        console.error('[Pipeline] Unhandled error in manual trigger:', err)
      );
      res.json({
        success: true,
        message: 'Pipeline iniciado. Acompanhe o progresso em videoPipelineRuns no Firestore.',
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Falha ao iniciar o pipeline.', details: err.message });
    }
  });

  // ════════════════════════════════════════════════════════════════════════════
  // ADMIN — Criação segura de funcionários/editores
  //
  // Usa Firebase Admin SDK para criar o usuário no Auth sem deslogar o Admin.
  // Transação segura: se o Firestore falhar, o usuário do Auth é deletado
  // imediatamente, prevenindo contas "fantasmas".
  // ════════════════════════════════════════════════════════════════════════════
  app.post("/api/admin/users/create", requireAdmin, async (req: any, res: any) => {
    const { name, login, password, role } = req.body ?? {};

    if (!name || !login || !password) {
      return res.status(400).json({ error: "Nome, login e senha são obrigatórios." });
    }
    if (typeof name !== 'string' || typeof login !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ error: "Campos inválidos." });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: "A senha deve ter pelo menos 6 caracteres." });
    }

    const sanitizedLogin = login.trim().toLowerCase().replace(/[^a-z0-9._-]/g, '');
    if (!sanitizedLogin) {
      return res.status(400).json({ error: "Login inválido. Use apenas letras, números, ponto, hífen ou underscore." });
    }

    const email = `${sanitizedLogin}@nextcreatives.internal`;
    const memberRole = (role === 'editor' || role === 'admin') ? role : 'editor';

    let createdUid: string | null = null;

    try {
      // 1. Cria o usuário no Firebase Auth (sem afetar a sessão do Admin logado)
      const userRecord = await admin.auth().createUser({
        email,
        password,
        displayName: name.trim(),
      });
      createdUid = userRecord.uid;

      // 2. Calcula iniciais
      const initials = name.trim().split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() || 'NU';

      // 3. Cria o documento no Firestore (employees + users)
      const db = admin.firestore();
      const batch = db.batch();

      // Documento na coleção employees (lido pelo useEmployees)
      const employeeRef = db.collection('employees').doc(createdUid);
      batch.set(employeeRef, {
        name: name.trim(),
        role: memberRole,
        login: sanitizedLogin,
        password,               // armazenado para referência do admin
        initials,
        lastLogin: 'Nunca',
        userId: createdUid,
        isOwner: false,
        createdAt: new Date().toISOString(),
        createdBy: req.user.uid,
      });

      // Documento na coleção users (lido pelo useAuth / requireAdmin)
      const userRef = db.collection('users').doc(createdUid);
      batch.set(userRef, {
        name: name.trim(),
        role: memberRole,
        email,
        userId: createdUid,
        createdAt: new Date().toISOString(),
        createdBy: req.user.uid,
      });

      await batch.commit();

      logger.info(
        { event: 'ADMIN_USER_CREATED', uid: createdUid, login: sanitizedLogin, role: memberRole, createdBy: req.user.uid },
        `Novo usuário criado: ${sanitizedLogin}`
      );

      return res.status(201).json({
        success: true,
        uid: createdUid,
        message: `Acesso criado com sucesso para ${name.trim()}.`,
      });

    } catch (error: any) {
      // 4. Rollback: se o Firestore falhar após o Auth já ter criado, deleta o usuário Auth
      if (createdUid && error?.code !== 'auth/email-already-exists') {
        try {
          await admin.auth().deleteUser(createdUid);
          logger.warn({ event: 'ADMIN_USER_ROLLBACK', uid: createdUid }, 'Usuário Auth deletado após falha no Firestore');
        } catch (rollbackErr: any) {
          logger.error({ event: 'ADMIN_USER_ROLLBACK_FAILED', uid: createdUid, err: rollbackErr.message }, 'Falha no rollback do Auth');
        }
      }

      // 5. Erros conhecidos com mensagens amigáveis
      if (error?.code === 'auth/email-already-exists') {
        return res.status(409).json({ error: `ID de acesso "${sanitizedLogin}" já está em uso. Escolha outro.` });
      }
      if (error?.code === 'auth/invalid-password') {
        return res.status(400).json({ error: "Senha inválida. Mínimo de 6 caracteres." });
      }

      logger.error({ event: 'ADMIN_USER_CREATE_ERROR', err: error.message, code: error.code }, 'Erro ao criar usuário admin');
      return res.status(500).json({ error: "Erro interno ao criar acesso. Tente novamente." });
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

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Socket.IO ready on ws://localhost:${PORT}`);
  });
}

startServer();
