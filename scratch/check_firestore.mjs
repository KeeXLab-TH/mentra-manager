import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import { FIREBASE_CONFIG } from './assets/js/firebase-config.js';

const app = initializeApp(FIREBASE_CONFIG);
const db = getFirestore(app);

async function check() {
  console.log("Checking Firestore...");
  try {
    const userSnap = await getDocs(collection(db, 'users'));
    console.log(`Found ${userSnap.size} users:`);
    userSnap.forEach(d => {
      const u = d.data();
      console.log(`  - ${u.email} | role: ${u.role} | status: ${u.status} | allowedPages:`, u.allowedPages);
    });

    const matSnap = await getDocs(collection(db, 'material_projects'));
    console.log(`Found ${matSnap.size} material_projects.`);
    matSnap.forEach(d => {
      const p = d.data();
      console.log(`  - Project: ${p.name || d.id} | inst: ${p.institution} | comp: ${p.company}`);
    });
  } catch (e) {
    console.error("Firestore error:", e);
  }
  process.exit(0);
}

check();
