/**
 * firestoreAuthState.ts
 *
 * Substituto do useMultiFileAuthState do Baileys, usando o Firestore como
 * storage persistente de sessão WhatsApp.
 *
 * Estrutura no Firestore:
 *   whatsapp_sessions/{uid}           → { creds, updatedAt, loggedOut? }
 *   whatsapp_sessions/{uid}/keys/{id} → { data: "<JSON serializado>" }
 *
 * Funciona em qualquer ambiente (VPS, Docker, Vercel com servidor persistente).
 * Se o processo reiniciar, lê as credenciais do Firestore e reconecta
 * automaticamente, sem pedir novo QR Code — desde que a sessão não
 * tenha expirado no lado do WhatsApp.
 */

import admin from 'firebase-admin';
import {
  BufferJSON,
  AuthenticationCreds,
  initAuthCreds,
  SignalDataTypeMap,
} from '@whiskeysockets/baileys';
import pino from 'pino';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  base: { service: 'wa-auth-state' },
});

// Máximo de operações por batch do Firestore (limite real: 500)
const BATCH_LIMIT = 490;

// Máximo de tentativas para salvar credenciais
const SAVE_MAX_RETRIES = 3;

// ─────────────────────────────────────────────────────────────────────────────

export async function useFirestoreAuthState(uid: string) {
  const db = admin.firestore();
  const sessionRef = db.collection('whatsapp_sessions').doc(uid);
  const keysRef   = sessionRef.collection('keys');

  // ── 1. Carrega credenciais existentes (ou inicializa nova sessão) ───────────
  let creds: AuthenticationCreds;

  const sessionSnap = await sessionRef.get();
  const sessionData = sessionSnap.data();

  if (sessionSnap.exists && sessionData?.creds) {
    try {
      creds = JSON.parse(sessionData.creds, BufferJSON.reviver);
      logger.info({ uid, event: 'WA_CREDS_RESTORED' },
        'Credenciais WhatsApp restauradas do Firestore');
    } catch (parseErr: any) {
      // Documento corrompido: inicia sessão limpa (vai pedir QR)
      logger.warn({ uid, event: 'WA_CREDS_CORRUPT', err: parseErr.message },
        'Credenciais corrompidas — iniciando nova sessão');
      creds = initAuthCreds();
    }
  } else {
    creds = initAuthCreds();
    logger.info({ uid, event: 'WA_CREDS_NEW' }, 'Nova sessão WhatsApp iniciada');
  }

  // ── 2. Helpers internos de leitura/escrita de chaves Signal ──────────────

  const readKey = async (docId: string): Promise<any> => {
    try {
      const snap = await keysRef.doc(docId).get();
      if (!snap.exists) return null;
      return JSON.parse(snap.data()!.data, BufferJSON.reviver);
    } catch {
      return null;
    }
  };

  // Escreve chaves em batches para não estourar o limite do Firestore
  const writeKeysBatched = async (
    entries: Array<{ id: string; value: any | null }>
  ) => {
    let batch  = db.batch();
    let opCount = 0;

    const flush = async () => {
      if (opCount === 0) return;
      await batch.commit();
      batch   = db.batch();
      opCount = 0;
    };

    for (const { id, value } of entries) {
      const ref = keysRef.doc(id);
      if (value != null) {
        batch.set(ref, { data: JSON.stringify(value, BufferJSON.replacer) });
      } else {
        batch.delete(ref);
      }
      opCount++;
      if (opCount >= BATCH_LIMIT) await flush();
    }

    await flush();
  };

  // ── 3. Interface de estado exigida pelo Baileys ────────────────────────────

  const state = {
    creds,
    keys: {
      /** Lê múltiplas chaves Signal de um determinado tipo */
      get: async (
        type: keyof SignalDataTypeMap,
        ids: string[]
      ): Promise<Record<string, any>> => {
        const result: Record<string, any> = {};
        await Promise.all(
          ids.map(async (id) => {
            const value = await readKey(`${type}-${id}`);
            if (value != null) result[id] = value;
          })
        );
        return result;
      },

      /**
       * Persiste as chaves Signal atualizadas pelo Baileys.
       * Usa batch para garantir atomicidade e não estourar quotas.
       */
      set: async (
        data: Partial<{
          [K in keyof SignalDataTypeMap]: {
            [id: string]: SignalDataTypeMap[K] | null;
          };
        }>
      ): Promise<void> => {
        const entries: Array<{ id: string; value: any | null }> = [];

        for (const type in data) {
          const typeData = (data as any)[type];
          for (const id in typeData) {
            entries.push({ id: `${type}-${id}`, value: typeData[id] });
          }
        }

        if (entries.length > 0) {
          await writeKeysBatched(entries);
        }
      },
    },
  };

  // ── 4. saveCreds — persiste as credenciais com retry automático ────────────
  //
  // O Baileys chama esta função sempre que as credenciais mudam
  // (ex: após login, após refresh de token interno).
  // O objeto `creds` é mutado in-place pelo Baileys antes do evento ser disparado.

  const saveCreds = async (): Promise<void> => {
    const serialized = JSON.stringify(creds, BufferJSON.replacer);
    let lastError: any;

    for (let attempt = 1; attempt <= SAVE_MAX_RETRIES; attempt++) {
      try {
        await sessionRef.set(
          { creds: serialized, updatedAt: new Date().toISOString() },
          { merge: true }
        );
        logger.debug({ uid, event: 'WA_CREDS_SAVED' }, 'Credenciais salvas no Firestore');
        return;
      } catch (err: any) {
        lastError = err;
        logger.warn(
          { uid, attempt, event: 'WA_CREDS_SAVE_RETRY', err: err.message },
          `Falha ao salvar credenciais (tentativa ${attempt}/${SAVE_MAX_RETRIES})`
        );
        if (attempt < SAVE_MAX_RETRIES) {
          await new Promise(r => setTimeout(r, attempt * 600));
        }
      }
    }

    // Se chegou aqui, todas as tentativas falharam.
    // Não lança erro para não travar o Baileys — apenas registra.
    logger.error(
      { uid, event: 'WA_CREDS_SAVE_FAILED', err: lastError?.message },
      'Credenciais NÃO salvas após todas as tentativas — sessão pode ser perdida'
    );
  };

  return { state, saveCreds };
}
