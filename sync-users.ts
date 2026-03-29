/**
 * sync-users.ts
 *
 * Utility script (run locally) that syncs Firebase Auth users into the
 * Firestore /users collection using the Admin SDK.
 *
 * Usage:
 *   npx tsx sync-users.ts
 *
 * Requirements:
 *   - service-account.json present in the project root, OR
 *   - GOOGLE_APPLICATION_CREDENTIALS env var pointing to a service account file.
 *   - users.json exported from Firebase Auth (e.g. via `firebase auth:export users.json`)
 *
 * NEVER commit service-account.json to version control.
 */

import { readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import * as admin from "firebase-admin";
import * as dotenv from "dotenv";
import fs from "fs";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ── Firebase Admin init ────────────────────────────────────────────────────────
const firebaseConfigPath = path.join(__dirname, "firebase-applet-config.json");
const firebaseConfig = JSON.parse(readFileSync(firebaseConfigPath, "utf8"));
const { projectId, firestoreDatabaseId } = firebaseConfig;

if (!admin.apps.length) {
  const serviceAccountPath = path.join(__dirname, "service-account.json");
  const credential = fs.existsSync(serviceAccountPath)
    ? admin.credential.cert(JSON.parse(readFileSync(serviceAccountPath, "utf8")))
    : admin.credential.applicationDefault();

  admin.initializeApp({ credential, projectId });
}

const db = admin.firestore();
db.settings({ databaseId: firestoreDatabaseId });

// ── Master owner UID to skip (defined by env var, not hardcoded) ───────────────
// Set MASTER_OWNER_EMAIL in your .env file.
const MASTER_OWNER_EMAIL = process.env.MASTER_OWNER_EMAIL || "";

// ── Sync ───────────────────────────────────────────────────────────────────────
async function syncUsers() {
  console.log("📄 Buscando usuários diretamente do Firebase Auth via Admin SDK...");

  let authUsers: admin.auth.UserRecord[] = [];
  try {
    let listUsersResult = await admin.auth().listUsers(1000);
    authUsers.push(...listUsersResult.users);
    while (listUsersResult.pageToken) {
      listUsersResult = await admin.auth().listUsers(1000, listUsersResult.pageToken);
      authUsers.push(...listUsersResult.users);
    }
  } catch (err) {
    console.error("❌ Erro ao buscar usuários do Auth:", err);
    process.exit(1);
  }

  console.log(`Encontradas ${authUsers.length} contas no Auth. Iniciando sincronização...`);

  let count = 0;

  for (const user of authUsers) {
    try {
      const email: string = user.email || user.providerData?.[0]?.email || "";

      if (MASTER_OWNER_EMAIL && email === MASTER_OWNER_EMAIL) {
        console.log(`⏭  Pulo: Master owner (${user.uid}) já garantido na UI.`);
        continue;
      }

      const login = email.split("@")[0] || user.uid.substring(0, 6);
      const name: string = user.displayName || login;
      const initials = name
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .substring(0, 2)
        .toUpperCase() || "NU";

      await db.collection("users").doc(user.uid).set(
        {
          name,
          login,
          role: "editor",
          initials,
          lastActive: 0,
        },
        { merge: true } // preserves existing fields (avatar, etc.)
      );

      console.log(`✔️  Sincronizado: ${login}`);
      count++;
    } catch (e) {
      console.error(`❌ Erro ao sincronizar UID ${user.uid}:`, e);
    }
  }

  console.log(`\n🎉 Sincronização concluída! ${count} usuários importados/atualizados.`);
  process.exit(0);
}

syncUsers();
