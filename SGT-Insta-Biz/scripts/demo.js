// Print the local URLs for every business in the emulator.
import { db, HOSTING_URL } from './admin.js';

const snap = await db.collection('businesses').orderBy('createdAt').get();
console.log('\nInstaBiz is running locally:');
console.log(`  Home ........... ${HOSTING_URL}/`);
console.log(`  Onboarding ..... ${HOSTING_URL}/onboard`);
console.log('  Emulator UI .... http://localhost:4000');
if (snap.empty) console.log('  (no businesses yet — run npm run seed)');
for (const d of snap.docs) {
  const b = d.data();
  console.log(`  Site ........... ${HOSTING_URL}/${b.slug}   (${b.name}, ${b.city})`);
}
console.log('');
