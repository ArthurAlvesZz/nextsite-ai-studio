/**
 * fix-rbac.mjs
 * Correção cirúrgica de permissões RBAC no Firestore.
 *
 * Regra: isOwnerDoc = o documento em si tem o UID do owner como ID.
 *   NÃO usa o campo userId (que está incorreto por bug no addMember).
 *
 * Correções aplicadas:
 *  employees/L1P3... (Arthur Fagundes) → role: 'owner', isOwner: true
 *  employees/eXfk.. (Arthur Braga)     → role: 'vendedor', isOwner: false  (revert)
 *  employees/r7tS.. (Lucas)            → role: 'editor',   isOwner: false  (revert)
 *  users/L1P3...    (Arthur Fagundes)  → role: 'owner', isOwner: true
 *
 * Uso: node scripts/fix-rbac.mjs [--fix]
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

const DRY_RUN = !process.argv.includes('--fix');

// UID do owner legítimo — único critério para identificar o doc de owner
const OWNER_UID = 'L1P3orqO2pgkJ8T9FCQnQ9LSa3p1';

// Estado correto esperado para cada employee doc (pelo ID do documento)
const EXPECTED_EMPLOYEE_ROLES = {
  'L1P3orqO2pgkJ8T9FCQnQ9LSa3p1': { role: 'owner',   isOwner: true  },
  'eXfkmcriKKT9bK0vvO78':         { role: 'vendedor', isOwner: false },
  'r7tSnvBLpLuDFhhrFKG2':         { role: 'editor',   isOwner: false },
};

function pad(label) { return label.padEnd(22); }

async function run() {
  console.log(`\n🔍 DIAGNÓSTICO RBAC`);
  console.log(`   Modo: ${DRY_RUN ? 'DRY-RUN (somente leitura)' : '⚠  WRITE — aplicando correções'}\n`);

  const fixes = [];

  // ── employees ──────────────────────────────────────────────────────────────
  console.log('══ employees ══════════════════════════════════════');
  const empSnap = await db.collection('employees').get();

  for (const d of empSnap.docs) {
    const data = d.data();
    const role = (data.role || '').toLowerCase();
    const name = data.name || '(sem nome)';

    console.log(`\n  [${d.id}] ${name}`);
    console.log(`  ${pad('role atual:')}${role}`);
    console.log(`  ${pad('isOwner (campo):')}${data.isOwner}`);

    const expected = EXPECTED_EMPLOYEE_ROLES[d.id];
    if (!expected) {
      console.log(`  ⚠  Doc não mapeado — ignorando`);
      continue;
    }

    console.log(`  ${pad('role esperado:')}${expected.role}`);

    if (role !== expected.role || data.isOwner !== expected.isOwner) {
      const diff = [];
      if (role !== expected.role) diff.push(`role: '${role}' → '${expected.role}'`);
      if (data.isOwner !== expected.isOwner) diff.push(`isOwner: ${data.isOwner} → ${expected.isOwner}`);
      console.log(`  ❌  ${diff.join(', ')}`);
      fixes.push({ ref: d.ref, label: `employees/${d.id} (${name})`, update: expected });
    } else {
      console.log(`  ✅  OK`);
    }
  }

  // ── users ──────────────────────────────────────────────────────────────────
  console.log('\n══ users ══════════════════════════════════════════');
  const userSnap = await db.collection('users').get();

  for (const d of userSnap.docs) {
    const data = d.data();
    const role = (data.role || '').toLowerCase();
    const name = data.name || '(sem nome)';
    const isOwnerDoc = d.id === OWNER_UID;

    console.log(`\n  [${d.id}] ${name}`);
    console.log(`  ${pad('role:')}${role}`);

    if (isOwnerDoc && role !== 'owner') {
      console.log(`  ❌  Owner com role='${role}' → 'owner'`);
      fixes.push({ ref: d.ref, label: `users/${d.id} (${name})`, update: { role: 'owner', isOwner: true } });
    } else if (!isOwnerDoc && role === 'owner') {
      console.log(`  ❌  Não-owner com role='owner' → 'editor'`);
      fixes.push({ ref: d.ref, label: `users/${d.id} (${name})`, update: { role: 'editor', isOwner: false } });
    } else {
      console.log(`  ✅  OK`);
    }
  }

  // ── resumo / aplicar ───────────────────────────────────────────────────────
  console.log(`\n══ RESUMO ══════════════════════════════════════════`);

  if (fixes.length === 0) {
    console.log('  ✅  Nenhum problema encontrado.\n');
    process.exit(0);
  }

  console.log(`  ${fixes.length} correção(ões):`);
  for (const f of fixes) console.log(`   → ${f.label}`);

  if (DRY_RUN) {
    console.log('\n  ℹ  Execute com --fix para aplicar.\n');
    process.exit(0);
  }

  console.log('\n🔧 Aplicando...');
  for (const f of fixes) {
    await f.ref.update(f.update);
    console.log(`  ✅  ${f.label} → ${JSON.stringify(f.update)}`);
  }
  console.log('\n✅ Todas as correções aplicadas.\n');
  process.exit(0);
}

run().catch(err => {
  console.error('\n❌ Erro fatal:', err.message);
  process.exit(1);
});
