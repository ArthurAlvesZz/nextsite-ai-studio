/**
 * config/whatsapp.config.ts
 *
 * Configuração centralizada do Baileys in-memory store.
 * O store persiste conversas/mensagens em memória e sincroniza
 * com disco a cada 10s para sobreviver a reinícios suaves.
 *
 * Singleton — importe { store } onde precisar.
 */

import { makeInMemoryStore } from '@whiskeysockets/baileys';
import pino from 'pino';
import fs from 'fs';
import path from 'path';

const projectRoot = process.cwd();

/** Caminho do arquivo de persistência do store Baileys. */
export const BAILEYS_STORE_PATH = path.join(projectRoot, '.baileys_store.json');

/** Store global de conversas e contatos do Baileys. */
export const store = makeInMemoryStore({
  logger: pino({ level: 'silent' }) as any,
});

// Restaura estado do disco se existir
if (fs.existsSync(BAILEYS_STORE_PATH)) {
  store.readFromFile(BAILEYS_STORE_PATH);
}

// Persiste a cada 10s (não bloqueia o event loop)
setInterval(() => {
  store.writeToFile(BAILEYS_STORE_PATH);
}, 10_000);

// ── Cache da versão Baileys (evita N chamadas CDN WhatsApp no restart) ────────
let _waVersion: [number, number, number] | null = null;

export async function getWAVersion(): Promise<[number, number, number]> {
  if (_waVersion) return _waVersion;
  const { fetchLatestBaileysVersion } = await import('@whiskeysockets/baileys');
  const { version } = await fetchLatestBaileysVersion();
  _waVersion = version;
  return version;
}
