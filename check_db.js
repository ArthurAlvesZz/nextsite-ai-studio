import admin from "firebase-admin";
import fs from "fs";

const firebaseConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));

admin.initializeApp({
  projectId: firebaseConfig.projectId,
});

const db = admin.firestore();
db.settings({ databaseId: firebaseConfig.firestoreDatabaseId });

async function check() {
  const employeesSnap = await db.collection('employees').get();
  console.log("EMPLOYEES:");
  employeesSnap.forEach(doc => console.log(doc.id, doc.data()));
  
  const usersSnap = await db.collection('users').get();
  console.log("\nUSERS:");
  usersSnap.forEach(doc => console.log(doc.id, doc.data()));
  process.exit(0);
}
check();
