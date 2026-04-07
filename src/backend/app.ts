/**
 * src/backend/app.ts
 *
 * Configuração central da instância Express + Socket.IO.
 *
 * Responsabilidades desta camada:
 *  - Criar e exportar o app Express configurado
 *  - Registrar middlewares globais (CORS, JSON parser, rate limiters IP)
 *  - Configurar o servidor HTTP e o Socket.IO (auth middleware + event map)
 *  - Aplicar guardas de prefixo de rota RBAC (requireOwner para /api/admin, etc.)
 *
 * O que NÃO faz: handlers de rota individuais (esses vivem em routes/*.ts — Fase 2).
 *
 * Exporta:
 *   app          → instância Express configurada
 *   httpServer   → instância http.Server (para listen e Socket.IO)
 *   io           → instância Socket.IO Server
 *   userSockets  → Map<uid, Socket> para emits direcionados
 */

import express, { Application } from 'express';
import { createServer as createHttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { admin } from './config/firebase.js';
import { requireOwner } from './middlewares/auth.js';
import { logger } from './utils/logger.js';

// ── Express App ───────────────────────────────────────────────────────────────
export const app: Application = express();
export const httpServer = createHttpServer(app);

// ── Socket.IO ─────────────────────────────────────────────────────────────────

/** Map UID → Socket para emits direcionados a usuários específicos. */
export const userSockets = new Map<string, Socket>();

export const io = new SocketIOServer(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

// Middleware de auth do Socket.IO — verifica token Firebase na handshake
io.use(async (socket, next) => {
  const token = socket.handshake.auth?.token as string | undefined;
  if (!token) return next(new Error('Unauthorized: no token'));
  try {
    const decoded = await admin.auth().verifyIdToken(token);
    (socket as any).uid = decoded.uid;
    next();
  } catch {
    next(new Error('Unauthorized: invalid token'));
  }
});

io.on('connection', (socket) => {
  const uid = (socket as any).uid as string;
  userSockets.set(uid, socket);
  logger.info({ uid, event: 'SOCKET_CONNECTED' }, `Socket.IO: cliente conectado — ${uid}`);

  socket.on('disconnect', () => {
    userSockets.delete(uid);
    logger.info({ uid, event: 'SOCKET_DISCONNECTED' }, `Socket.IO: cliente desconectado — ${uid}`);
  });
});

// ── Middlewares Globais ───────────────────────────────────────────────────────

// CORS — permite acesso de qualquer origem em dev; restringir em produção via env
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Body parser JSON
app.use(express.json({ limit: '2mb' }));

// ── Rate Limiters IP (primeira camada de defesa, sem DB) ─────────────────────

/** WhatsApp send: 20 req/min por IP */
export const waSendLimiter = rateLimit({
  windowMs: 60_000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Limite de envio atingido. Tente novamente em 1 minuto.' },
});

/** Groq / Whisper: 10 req/min por IP */
export const transcribeLimiter = rateLimit({
  windowMs: 60_000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Limite de transcrição atingido. Tente novamente em 1 minuto.' },
});

/** Google Custom Search: 5 req/min por IP */
export const leadSearchLimiter = rateLimit({
  windowMs: 60_000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Limite de busca de leads atingido. Tente novamente em 1 minuto.' },
});

/** Sistema de log frontend: 30 req/min por IP */
export const logLimiter = rateLimit({
  windowMs: 60_000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Log rate limit exceeded.' },
});

// ── Guardas de Prefixo de Rota (RBAC) ────────────────────────────────────────
//
// Qualquer rota sob estes prefixos exige role owner.
// O app.use() registra o middleware ANTES dos handlers específicos,
// bloqueando o acesso antes de chegar à lógica de negócio.
app.use('/api/settings', requireOwner);
app.use('/api/tools',    requireOwner);
app.use('/api/admin',    requireOwner);

// ── Health Check (público) ────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', ts: new Date().toISOString() });
});

logger.info({ event: 'APP_CONFIGURED' }, 'Express app configurado e pronto para receber rotas.');
