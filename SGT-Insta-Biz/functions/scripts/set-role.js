'use strict';
/**
 * Give a phone number a role.
 *   npm --prefix functions run set-role -- +919876543210 admin
 *   npm --prefix functions run set-role -- +919876543210 agent --live   (real project)
 * Roles: admin | agent | none
 * Uses the local emulators unless --live is passed.
 */
const { initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { normalizeIndianMobile } = require('../lib/onboard');

const args = process.argv.slice(2);
const live = args.includes('--live');
const [phoneArg, role] = args.filter((a) => !a.startsWith('--'));
const ROLES = ['admin', 'agent', 'none'];

if (!phoneArg || !ROLES.includes(role)) {
  console.error('Usage: npm --prefix functions run set-role -- <phone> <admin|agent|none> [--live]');
  process.exit(1);
}
const phone = normalizeIndianMobile(phoneArg);
if (!phone) {
  console.error(`"${phoneArg}" is not a 10-digit Indian mobile number.`);
  process.exit(1);
}

if (!live) {
  process.env.FIREBASE_AUTH_EMULATOR_HOST ||= '127.0.0.1:9099';
}
initializeApp({ projectId: process.env.GCLOUD_PROJECT || 'instabiz-dev' });

(async () => {
  const auth = getAuth();
  let user;
  try {
    user = await auth.getUserByPhoneNumber(phone);
  } catch (e) {
    if (e.code !== 'auth/user-not-found') throw e;
    user = await auth.createUser({ phoneNumber: phone });
  }
  const claims = { ...(user.customClaims || {}) };
  if (role === 'none') delete claims.role;
  else claims.role = role;
  await auth.setCustomUserClaims(user.uid, claims);
  console.log(`${phone} -> ${role} (${live ? 'LIVE project' : 'emulator'}). Log out and in again to pick it up.`);
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
