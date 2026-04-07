/**
 * middlewares/auth.ts
 *
 * Middlewares de autenticação e autorização RBAC para a API.
 *
 * Camadas de proteção (em ordem de execução por request):
 *  1. IP-based rate limit     → express-rate-limit, bloqueia bots
 *  2. requireAdmin            → verifica JWT Firebase + role admin/editor
 *  3. requireOwner            → verifica JWT Firebase + role owner
 *  4. createUserRateLimiter() → janela deslizante por UID (Firestore-backed)
 *  5. checkCircuitBreaker()   → disjuntor global por ação
 *
 * FIX aplicado: requireAdmin agora usa admin.firestore() (Admin SDK) ao invés
 * de chamada REST com token do cliente — mais rápido, sem round-trip HTTP,
 * independente das Firestore Security Rules.
 */

import { Request, Response, NextFunction } from 'express';
import { admin, db } from '../config/firebase.js';
import { logger } from '../utils/logger.js';

// ── E-mails master hardcoded ───────────────────────────────────────────────────
export const MASTER_EMAILS = new Set([
  'arthurfgalves@gmail.com',
  '15599873676@nextcreatives.co',
]);

// ════════════════════════════════════════════════════════════════════════════════
// RATE LIMITING — Janela deslizante por UID (Firestore-backed, cache em memória)
// ════════════════════════════════════════════════════════════════════════════════

const USER_RATE_WINDOW_MS   = 60 * 60 * 1000; // 1 hora
const USER_RATE_CACHE_TTL_MS = 30_000;         // re-lê Firestore a cada 30s

/** Limites por ação/usuário (requisições por hora por UID). */
export const USER_LIMITS: Record<string, number> = {
  transcribe:      30,  // Whisper/Groq
  video_pipeline:   5,  // HeyGen renders
  lead_search:     20,  // Google Custom Search
  whatsapp_send:  120,  // Envios WhatsApp
};

/** Limites globais — circuit breaker (todos os usuários combinados, por hora). */
export const CIRCUIT_THRESHOLDS: Record<string, number> = {
  transcribe:      200,
  video_pipeline:   30,
  lead_search:     150,
  whatsapp_send:  1000,
};

interface UserRateCacheEntry {
  count: number;
  windowStart: number; // epoch ms
  lastCached: number;  // epoch ms — timestamp de frescor do cache
}

interface CircuitEntry {
  count: number;
  windowStart: number;
  isOpen: boolean;
}

// In-memory stores (reset no restart do servidor — intencional para o circuit breaker)
const userRateCache = new Map<string, UserRateCacheEntry>();
const circuitState  = new Map<string, CircuitEntry>();

/**
 * checkCircuitBreaker — incrementa o contador global para uma ação.
 * Retorna true (circuito aberto) se o threshold for excedido → caller envia 503.
 */
export function checkCircuitBreaker(action: string): boolean {
  const threshold = CIRCUIT_THRESHOLDS[action];
  if (!threshold) return false;

  const now = Date.now();
  let entry = circuitState.get(action);

  if (!entry || now - entry.windowStart > USER_RATE_WINDOW_MS) {
    entry = { count: 0, windowStart: now, isOpen: false };
    circuitState.set(action, entry);
  }

  if (entry.isOpen) return true;

  entry.count++;
  if (entry.count > threshold) {
    entry.isOpen = true;
    logger.warn(
      { action, globalCount: entry.count, threshold, event: 'CIRCUIT_BREAKER_OPEN' },
      `Circuit breaker aberto para "${action}" (${entry.count}/${threshold} req/hr global)`
    );
    // TODO: migrar para Redis (ioredis) para persistir entre reinícios e instâncias
    return true;
  }

  return false;
}

/**
 * createUserRateLimiter — middleware factory.
 * DEVE ser colocado APÓS requireAdmin (precisa de req.user.uid).
 */
export function createUserRateLimiter(action: string) {
  const maxRequests = USER_LIMITS[action] ?? 20;

  return async (req: any, res: Response, next: NextFunction) => {
    const uid: string | undefined = req.user?.uid;
    if (!uid) return next();

    // Gate 1: Circuit breaker global
    if (checkCircuitBreaker(action)) {
      logger.warn({ uid, action, event: 'CIRCUIT_BREAKER_REJECTED' },
        `Requisição rejeitada — circuit breaker aberto para "${action}"`);
      return res.status(503).json({
        error: 'Serviço temporariamente suspenso por manutenção de segurança de custos. Tente novamente em alguns minutos.',
        retryAfter: 60,
      });
    }

    // Gate 2: Janela deslizante por UID
    const cacheKey = `${uid}:${action}`;
    const now = Date.now();
    let entry = userRateCache.get(cacheKey);
    const cacheStale = !entry || (now - entry.lastCached) > USER_RATE_CACHE_TTL_MS;

    if (cacheStale) {
      try {
        const docSnap = await db.collection('rateLimits').doc(uid).get();
        const stored = docSnap.data()?.[action] as { count: number; windowStart: number } | undefined;

        entry = (stored && (now - stored.windowStart) < USER_RATE_WINDOW_MS)
          ? { count: stored.count, windowStart: stored.windowStart, lastCached: now }
          : { count: 0, windowStart: now, lastCached: now };

        userRateCache.set(cacheKey, entry);
      } catch (err: any) {
        logger.error({ uid, action, err: err.message, event: 'RATE_LIMIT_FIRESTORE_READ_ERROR' },
          'Leitura Firestore falhou no rate limiter — fail open');
        return next();
      }
    }

    // Reset da janela local expirada
    if (now - entry!.windowStart > USER_RATE_WINDOW_MS) {
      entry = { count: 0, windowStart: now, lastCached: now };
      userRateCache.set(cacheKey, entry);
    }

    // Verificação do limite
    if (entry!.count >= maxRequests) {
      const retryAfterSec = Math.ceil((USER_RATE_WINDOW_MS - (now - entry!.windowStart)) / 1000);
      logger.warn({ uid, action, count: entry!.count, limit: maxRequests, retryAfterSec, event: 'USER_RATE_LIMIT_EXCEEDED' },
        `Usuário "${uid}" excedeu rate limit para "${action}"`);
      return res.status(429).json({
        error: `Limite horário de "${action}" atingido (${maxRequests} req/hora por usuário). Aguarde antes de tentar novamente.`,
        retryAfter: retryAfterSec,
      });
    }

    // Incrementa + write-through assíncrono para Firestore
    entry!.count++;
    entry!.lastCached = now;
    userRateCache.set(cacheKey, entry!);

    const { count, windowStart } = entry!;
    db.collection('rateLimits').doc(uid)
      .set({ [action]: { count, windowStart, updatedAt: Date.now() } }, { merge: true })
      .catch((err: any) =>
        logger.error({ uid, action, err: err.message, event: 'RATE_LIMIT_FIRESTORE_WRITE_ERROR' },
          'Write assíncrono Firestore falhou no rate limiter')
      );

    next();
  };
}

// ════════════════════════════════════════════════════════════════════════════════
// requireAdmin — Verifica JWT Firebase e role admin/editor
//
// FIX: usa admin.firestore().get() ao invés de fetch REST com token do cliente.
//      Mais rápido (sem round-trip HTTP), sem depender de Security Rules.
// ════════════════════════════════════════════════════════════════════════════════
export const requireAdmin = async (req: any, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization as string | undefined;

  if (!authHeader?.startsWith('Bearer ')) {
    logger.warn({ url: req.url, method: req.method, event: 'AUTH_MISSING_TOKEN' },
      'Header Authorization ausente ou inválido');
    return res.status(401).json({ error: 'Unauthorized: Missing or invalid token' });
  }

  const token = authHeader.split('Bearer ')[1];

  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    const uid = decodedToken.uid;

    // ── FAST PATH: e-mail master hardcoded ───────────────────────────────────
    if (MASTER_EMAILS.has(decodedToken.email ?? '')) {
      req.user = decodedToken;
      return next();
    }

    // ── Admin SDK lookup (sem REST, sem Security Rules) ───────────────────────
    const userDoc = await db.collection('users').doc(uid).get();
    const role = userDoc.data()?.role as string | undefined;

    if (role === 'admin' || role === 'editor') {
      req.user = decodedToken;
      return next();
    }

    logger.warn({ uid, email: decodedToken.email, url: req.url, event: 'AUTH_FORBIDDEN' },
      'Usuário autenticado sem acesso admin/editor');
    return res.status(403).json({ error: 'Forbidden: Admin access required' });

  } catch (error: any) {
    logger.warn({ url: req.url, event: 'AUTH_INVALID_TOKEN', error: error.message },
      'Verificação de token falhou');
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
};

// ════════════════════════════════════════════════════════════════════════════════
// requireOwner — Verifica JWT Firebase e role owner
//
// Critérios (qualquer um satisfaz):
//   1. E-mail bate com MASTER_EMAILS
//   2. employees/{uid}.isOwner === true (Admin SDK — bypass de Security Rules)
// ════════════════════════════════════════════════════════════════════════════════
export const requireOwner = async (req: any, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization as string | undefined;

  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: token ausente.' });
  }

  const token = authHeader.split('Bearer ')[1];

  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    const uid = decodedToken.uid;

    // Critério 1: e-mail master
    if (MASTER_EMAILS.has(decodedToken.email ?? '')) {
      req.user = decodedToken;
      return next();
    }

    // Critério 2: employees/{uid}.isOwner via Admin SDK
    const employeeSnap = await db.collection('employees').doc(uid).get();
    if (employeeSnap.exists && employeeSnap.data()?.isOwner === true) {
      req.user = decodedToken;
      return next();
    }

    logger.warn({ uid, email: decodedToken.email, url: req.url, event: 'OWNER_FORBIDDEN' },
      'Usuário autenticado sem permissão de owner');
    return res.status(403).json({ error: 'Forbidden: Esta operação requer permissão de proprietário.' });

  } catch (error: any) {
    logger.warn({ url: req.url, event: 'OWNER_INVALID_TOKEN', error: error.message },
      'Token inválido no requireOwner');
    return res.status(401).json({ error: 'Unauthorized: token inválido.' });
  }
};
