// Auditoria de usuários: Firebase Auth vs Firestore employees
// Identifica e pode deletar usuários "fantasmas"
// Uso: node scripts/audit-auth-users.mjs [--delete-ghost <uid>]

import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serviceAccount = JSON.parse(readFileSync(path.join(__dirname, '../service-account.json'), 'utf8'));
const firebaseConfig = JSON.parse(readFileSync(path.join(__dirname, '../firebase-applet-config.json'), 'utf8'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: firebaseConfig.projectId,
});

const db = admin.firestore();
const dbId = firebaseConfig.firestoreDatabaseId;

// Firestore com database customizado
const fsDb = admin.firestore();
fsDb.settings({ databaseId: dbId });

async function main() {
  const args = process.argv.slice(2);
  const deleteIdx = args.indexOf('--delete-ghost');
  const uidToDelete = deleteIdx !== -1 ? args[deleteIdx + 1] : null;

  console.log('\n🔍 Listando todos os usuários no Firebase Auth...\n');

  // Lista todos os usuários do Auth
  const authUsers = [];
  let pageToken;
  do {
    const result = await admin.auth().listUsers(1000, pageToken);
    authUsers.push(...result.users);
    pageToken = result.pageToken;
  } while (pageToken);

  console.log(`📋 Total no Auth: ${authUsers.length} usuário(s)\n`);
  console.log('─'.repeat(80));

  // Lista documentos na coleção employees
  const employeeSnap = await fsDb.collection('employees').get();
  const employeeUids = new Set(employeeSnap.docs.map(d => d.id));
  const employeeByLogin = new Map(employeeSnap.docs.map(d => [d.data().login, d.id]));

  console.log(`📦 Total no Firestore (employees): ${employeeSnap.size} documento(s)\n`);
  console.log('─'.repeat(80));

  const ghosts = [];

  for (const user of authUsers) {
    const inFirestore = employeeUids.has(user.uid);
    const status = inFirestore ? '✅ OK     ' : '👻 FANTASMA';
    const email = user.email || '(sem email)';
    const name = user.displayName || '(sem nome)';
    const created = new Date(user.metadata.creationTime).toLocaleString('pt-BR');

    console.log(`${status} | UID: ${user.uid}`);
    console.log(`          | Email: ${email}`);
    console.log(`          | Nome:  ${name}`);
    console.log(`          | Criado: ${created}`);
    console.log('');

    if (!inFirestore) {
      ghosts.push({ uid: user.uid, email, name, created });
    }
  }

  console.log('─'.repeat(80));

  if (ghosts.length === 0) {
    console.log('\n✅ Nenhum usuário fantasma encontrado. Auth e Firestore estão sincronizados.\n');
  } else {
    console.log(`\n⚠️  ${ghosts.length} usuário(s) FANTASMA encontrado(s):\n`);
    ghosts.forEach((g, i) => {
      console.log(`  ${i + 1}. UID: ${g.uid}`);
      console.log(`     Email: ${g.email}`);
      console.log(`     Nome:  ${g.name}`);
      console.log(`     Criado: ${g.created}`);
      console.log('');
    });
    console.log('Para deletar um fantasma, rode:');
    ghosts.forEach(g => {
      console.log(`  node scripts/audit-auth-users.mjs --delete-ghost ${g.uid}`);
    });
    console.log('');
  }

  // Deletar fantasma se solicitado
  if (uidToDelete) {
    const ghost = ghosts.find(g => g.uid === uidToDelete);
    if (!ghost) {
      console.log(`❌ UID ${uidToDelete} não está na lista de fantasmas ou não existe no Auth.\n`);
      process.exit(1);
    }
    console.log(`🗑️  Deletando fantasma: ${ghost.email} (${ghost.uid})...`);
    await admin.auth().deleteUser(uidToDelete);
    console.log(`✅ Usuário deletado do Firebase Auth com sucesso.\n`);
  }

  process.exit(0);
}

main().catch(err => {
  console.error('❌ Erro:', err.message);
  process.exit(1);
});
