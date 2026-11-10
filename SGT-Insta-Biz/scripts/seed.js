// Seed the emulators: one admin login and one demo travel business.
import { auth, db, onboard } from './admin.js';

export const DEMO_ADMIN_PHONE = '+919999999999';

async function ensureUser(phoneNumber, displayName, claims) {
  let user;
  try {
    user = await auth.getUserByPhoneNumber(phoneNumber);
  } catch {
    user = await auth.createUser({ phoneNumber, displayName });
  }
  if (claims) await auth.setCustomUserClaims(user.uid, claims);
  return user.uid;
}

const adminUid = await ensureUser(DEMO_ADMIN_PHONE, 'Demo Admin', { role: 'admin' });

const demo = {
  name: 'Himalayan Trails',
  city: 'Manali',
  ownerName: 'Ravi Thakur',
  ownerPhone: '9876543210',
};

const existing = await db.doc(`slugs/${onboard.preferredSlug(demo.name)}`).get();
if (existing.exists) {
  console.log('Seed: demo business already exists.');
} else {
  const res = await onboard.onboardBusiness({ db, auth }, demo, adminUid);
  console.log(`Seed: created "${demo.name}" at /${res.slug}`);
}
console.log(`Seed: admin login ${DEMO_ADMIN_PHONE} (OTP shows on the login screen in the emulator)`);
