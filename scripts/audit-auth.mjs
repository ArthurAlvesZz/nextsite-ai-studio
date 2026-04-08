/**
 * audit-auth.mjs
 * Lista TODOS os usuários do Firebase Auth e cruza com Firestore
 * para entender exatamente qual role/isOwner cada um recebe via useAuth.
 */
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import admin from 'firebase-admin';

const __dirname = dirname(fileURLToPath(import.meta.url));

const serviceAccount = JSON.parse(
  readFileSync(join(__dirname, '../service-account.json'), 'utf8')
);
const appConfig = JSON.parse(
  readFileSync(join(__dirname, '../firebase-applet-config.json'), 'utf8')
);

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();
db.settings({ databaseId: appConfig.firestoreDatabaseId });

function pad(l) { return l.padEnd(24); }

async function run() {
  // 1. Listar todos os usuários do Firebase Auth
  const listResult = await admin.auth().listUsers(100);
  const authUsers = listResult.users;

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  Firebase Auth → ${authUsers.length} usuário(s) encontrado(s)`);
  console.log('═'.repeat(60));

  // 2. Buscar coleções Firestore
  const [empSnap, userSnap] = await Promise.all([
    db.collection('employees').get(),
    db.collection('users').get(),
  ]);

  const employees = empSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  const users     = userSnap.docs.map(d => ({ id: d.id, ...d.data() }));

  // 3. Simular exatamente o que useAuth.ts faz para cada usuário Auth
  console.log('\n  Simulação do useAuth para cada usuário:\n');

  for (const authUser of authUsers) {
    const uid   = authUser.uid;
    const email = authUser.email || authUser.phoneNumber || '(sem email)';

    console.log(`┌─ [uid: ${uid}]`);
    console.log(`│  ${pad('auth email:')}${email}`);

    // Passo 1: buscar users/{uid}
    const userDoc = users.find(u => u.id === uid);
    if (!userDoc) {
      // Fallback path de useAuth
      const isMaster =
        authUser.email === 'arthurfgalves@gmail.com' ||
        authUser.email === '15599873676@nextcreatives.co';
      const fallbackRole = isMaster ? 'owner' : 'editor';
      console.log(`│  ${pad('users doc:')}NÃO EXISTE → fallback role='${fallbackRole}'`);
      console.log(`│  ${pad('isOwner final:')}${fallbackRole === 'owner'}`);
      console.log(`│  ⚠  Esse usuário não tem users doc!`);
      console.log(`└─ AJUSTES visível: ${fallbackRole === 'owner'}\n`);
      continue;
    }

    let resolvedRole = (userDoc.role || '').toLowerCase() || 'editor';
    console.log(`│  ${pad('users doc role:')}${resolvedRole}`);

    // Passo 2: override com employees where userId == uid
    const matchingEmployees = employees.filter(e => e.userId === uid);
    if (matchingEmployees.length > 0) {
      const empRole = (matchingEmployees[0].role || '').toLowerCase();
      console.log(`│  ${pad('employees matches:')}${matchingEmployees.length} doc(s) | docs[0].role='${empRole}'`);
      if (matchingEmployees.length > 1) {
        console.log(`│  ⚠  MÚLTIPLOS MATCHES! docs: ${matchingEmployees.map(e => `${e.id}(${e.role})`).join(', ')}`);
      }
      resolvedRole = empRole || resolvedRole;
    } else {
      console.log(`│  ${pad('employees matches:')}nenhum → role mantida`);
    }

    const isOwner = resolvedRole === 'owner';
    console.log(`│  ${pad('resolvedRole final:')}${resolvedRole}`);
    console.log(`│  ${pad('isOwner derivado:')}${isOwner}`);
    console.log(`└─ AJUSTES visível: ${isOwner}  ${isOwner ? '⚠ VERIFIQUE!' : '✅'}\n`);
  }

  process.exit(0);
}

run().catch(err => {
  console.error('Erro:', err.message);
  process.exit(1);
});
