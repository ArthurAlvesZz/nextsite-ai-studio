/**
 * Simula a NOVA lógica do useAuth (lookup por doc ID, não por userId)
 */
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import admin from 'firebase-admin';

const __dirname = dirname(fileURLToPath(import.meta.url));
const serviceAccount = JSON.parse(readFileSync(join(__dirname, '../service-account.json'), 'utf8'));
const appConfig = JSON.parse(readFileSync(join(__dirname, '../firebase-applet-config.json'), 'utf8'));

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();
db.settings({ databaseId: appConfig.firestoreDatabaseId });

async function run() {
  const [empSnap, userSnap, { users: authUsers }] = await Promise.all([
    db.collection('employees').get(),
    db.collection('users').get(),
    admin.auth().listUsers(100),
  ]);

  const employees = Object.fromEntries(empSnap.docs.map(d => [d.id, d.data()]));
  const usersMap  = Object.fromEntries(userSnap.docs.map(d => [d.id, d.data()]));

  console.log('\n  Nova lógica (getDoc por UID):\n');

  for (const u of authUsers) {
    const userDoc = usersMap[u.uid];
    let resolvedRole = (userDoc?.role || 'editor').toLowerCase();

    // Nova lógica: lookup direto pelo doc ID
    const empDoc = employees[u.uid];
    if (empDoc) {
      resolvedRole = (empDoc.role || resolvedRole).toLowerCase();
    }

    const isOwner = resolvedRole === 'owner';
    const ajustes = isOwner ? '⚠  VISÍVEL' : '✅ oculto';
    console.log(`  [${(u.email || u.phoneNumber || u.uid).padEnd(40)}] role=${resolvedRole.padEnd(10)} AJUSTES: ${ajustes}`);
  }

  process.exit(0);
}

run().catch(e => { console.error(e.message); process.exit(1); });
