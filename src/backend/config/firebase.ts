/**
 * config/firebase.ts
 *
 * Inicialização centralizada do Firebase Admin SDK.
 * Singleton — safe para importar múltiplas vezes.
 *
 * Suporte a credentials:
 *  1. GOOGLE_APPLICATION_CREDENTIALS env var → arquivo de service account
 *  2. service-account.json na raiz do projeto
 *  3. Fallback: projectId apenas (funciona em GCP/Cloud Run com identidade padrão)
 */

import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';
import { logger } from '../utils/logger.js';

// ── Encontra o arquivo de configuração do cliente Firebase ────────────────────
const projectRoot = process.cwd();
const clientConfigPath = path.join(projectRoot, 'firebase-applet-config.json');

let _firebaseClientConfig: Record<string, string> | null = null;

function loadClientConfig(): Record<string, string> | null {
  if (_firebaseClientConfig) return _firebaseClientConfig;
  if (!fs.existsSync(clientConfigPath)) {
    logger.warn(
      { event: 'FIREBASE_CLIENT_CONFIG_MISSING', path: clientConfigPath },
      'firebase-applet-config.json não encontrado — recursos Firebase desativados.'
    );
    return null;
  }
  try {
    _firebaseClientConfig = JSON.parse(fs.readFileSync(clientConfigPath, 'utf8'));
    return _firebaseClientConfig;
  } catch (err: any) {
    logger.error({ event: 'FIREBASE_CLIENT_CONFIG_PARSE_ERROR', err: err.message },
      'Falha ao parsear firebase-applet-config.json');
    return null;
  }
}

// ── Inicialização do Firebase Admin (singleton) ───────────────────────────────
function initAdmin(): void {
  if (admin.apps.length > 0) return; // já inicializado

  const clientConfig = loadClientConfig();
  const projectId = clientConfig?.projectId;

  // Tenta carregar credenciais explícitas
  const serviceAccountPath = path.join(projectRoot, 'service-account.json');
  const credEnv = process.env.GOOGLE_APPLICATION_CREDENTIALS;

  try {
    // 1. FIREBASE_SERVICE_ACCOUNT — JSON string (Vercel / ambientes cloud sem filesystem)
    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (serviceAccountJson) {
      const serviceAccount = JSON.parse(serviceAccountJson);
      admin.initializeApp({ credential: admin.credential.cert(serviceAccount), projectId });
      logger.info({ event: 'FIREBASE_ADMIN_INIT', source: 'env_json' }, 'Firebase Admin iniciado via FIREBASE_SERVICE_ACCOUNT (JSON env var)');
    } else if (credEnv) {
      // 2. GOOGLE_APPLICATION_CREDENTIALS — caminho para arquivo (dev local / GCP)
      const cred = admin.credential.cert(credEnv);
      admin.initializeApp({ credential: cred, projectId });
      logger.info({ event: 'FIREBASE_ADMIN_INIT', source: 'env_cred' }, 'Firebase Admin iniciado via GOOGLE_APPLICATION_CREDENTIALS');
    } else if (fs.existsSync(serviceAccountPath)) {
      // 3. service-account.json na raiz (dev local)
      const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
      const cred = admin.credential.cert(serviceAccount);
      admin.initializeApp({ credential: cred, projectId });
      logger.info({ event: 'FIREBASE_ADMIN_INIT', source: 'service_account_file' }, 'Firebase Admin iniciado via service-account.json');
    } else {
      // 4. Fallback: identidade padrão (GCP / Cloud Run com ADC configurado)
      admin.initializeApp({ projectId });
      logger.info({ event: 'FIREBASE_ADMIN_INIT', source: 'default_credentials' }, 'Firebase Admin iniciado com credenciais padrão (ADC)');
    }
  } catch (err: any) {
    logger.error({ event: 'FIREBASE_ADMIN_INIT_ERROR', err: err.message }, 'Falha ao inicializar Firebase Admin');
    throw err;
  }
}

// Inicializa ao importar o módulo
initAdmin();

// ── Exports ───────────────────────────────────────────────────────────────────
export { admin };
export const db = admin.firestore();
export const adminAuth = admin.auth();

/** Configuração do cliente Firebase (para o SDK client-side no servidor se necessário). */
export function getFirebaseClientConfig(): Record<string, string> | null {
  return loadClientConfig();
}
