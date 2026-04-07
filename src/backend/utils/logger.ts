/**
 * utils/logger.ts
 *
 * Logger centralizado usando Pino.
 * Use LOG_LEVEL=debug para saída verbose. Padrão: info.
 *
 * Uso: import { logger } from '../utils/logger.js';
 *       logger.info({ event: 'MY_EVENT' }, 'mensagem');
 */

import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  base: { service: 'nextcreatives-server' },
});
