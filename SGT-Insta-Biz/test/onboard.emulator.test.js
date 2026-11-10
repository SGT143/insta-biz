// Calls the real onboardBusiness function in the emulator (run with `npm test`).
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { auth, db, PROJECT_ID } from '../scripts/admin.js';

const FN = `http://127.0.0.1:5001/${PROJECT_ID}/asia-south1/onboardBusiness`;
const AUTH = `http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}`;
const run = Date.now().toString(36);

async function idToken(uid, claims) {
  await auth.createUser({ uid }).catch(() => {});
  await auth.setCustomUserClaims(uid, claims);
  const custom = await auth.createCustomToken(uid);
  const res = await fetch(`${AUTH}/identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=fake`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ token: custom, returnSecureToken: true }),
  });
  return (await res.json()).idToken;
}

async function call(token, data) {
  const res = await fetch(FN, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify({ data }),
  });
  return res.json();
}

let agent;
before(async () => {
  agent = await idToken(`agent-${run}`, { role: 'agent' });
});

const biz = (extra = {}) => ({
  name: `Test Travels ${run}`, city: 'Pune', ownerName: 'Asha', ownerPhone: '9123456780', ...extra,
});

test('rejects users who are not logged in or not agents', async () => {
  assert.equal((await call(null, biz())).error.status, 'UNAUTHENTICATED');
  const nobody = await idToken(`nobody-${run}`, {});
  const r = await call(nobody, biz());
  assert.equal(r.error.status, 'PERMISSION_DENIED');
  assert.match(r.error.message, /Ask the admin for agent access/);
});

test('same name twice gets name, then name-city', async () => {
  const a = await call(agent, biz());
  const b = await call(agent, biz({ ownerPhone: '9123456781' }));
  assert.ok(a.result, JSON.stringify(a));
  assert.ok(b.result, JSON.stringify(b));
  assert.equal(a.result.slug, `test-travels-${run}`);
  assert.equal(b.result.slug, `test-travels-${run}-pune`);

  const doc = (await db.doc(`businesses/${b.result.businessId}`).get()).data();
  assert.equal(doc.ownerPhone, '+919123456781');
  assert.equal(doc.slug, b.result.slug);
  assert.equal((await db.doc(`slugs/${b.result.slug}`).get()).data().businessId, b.result.businessId);
  const pkgs = await db.collection(`businesses/${b.result.businessId}/packages`).get();
  assert.ok(pkgs.size >= 1, 'sample packages created');
});

test('taken chosen address gives a clear "already taken" error with a suggestion', async () => {
  const name = `Taken Tours ${run}`;
  const first = await call(agent, biz({ name, preferredSlug: `taken-tours-${run}` }));
  assert.ok(first.result, JSON.stringify(first));
  const r = await call(agent, biz({ name, preferredSlug: `taken-tours-${run}` }));
  assert.equal(r.error.status, 'ALREADY_EXISTS');
  assert.match(r.error.message, /already taken/);
  assert.equal(r.error.details.suggestion, `taken-tours-${run}-pune`);
});

test('bad input is explained in plain words', async () => {
  const r = await call(agent, biz({ ownerPhone: '12345' }));
  assert.equal(r.error.status, 'INVALID_ARGUMENT');
  assert.match(r.error.message, /10-digit/);
  const r2 = await call(agent, biz({ preferredSlug: 'admin' }));
  assert.match(r2.error.message, /reserved/);
});
