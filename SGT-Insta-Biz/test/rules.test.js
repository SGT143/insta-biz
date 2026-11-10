// Firestore security rules tests (run with `npm test`).
import { test, before, after, beforeEach } from 'node:test';
import { readFileSync } from 'node:fs';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, addDoc, updateDoc, getDocs, collection, serverTimestamp, deleteDoc } from 'firebase/firestore';

let env;
const BID = 'biz1';

before(async () => {
  const [host, port] = (process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080').split(':');
  env = await initializeTestEnvironment({
    projectId: 'instabiz-dev',
    firestore: { rules: readFileSync('firestore.rules', 'utf8'), host, port: Number(port) },
  });
});
after(() => env?.cleanup());

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const d = ctx.firestore();
    await setDoc(doc(d, 'slugs/demo'), { businessId: BID });
    await setDoc(doc(d, `businesses/${BID}`), { name: 'Demo', ownerUid: 'owner1', ownerPhone: '+919876543210' });
    await setDoc(doc(d, `businesses/${BID}/packages/p1`), { title: 'Goa', price: 9999, order: 0 });
    await setDoc(doc(d, `businesses/${BID}/leads/l1`), { name: 'A', phone: '+919000000000', status: 'new' });
  });
});

const anon = () => env.unauthenticatedContext().firestore();
const user = (uid, claims = {}) => env.authenticatedContext(uid, claims).firestore();
const lead = (extra = {}) => ({ name: 'Priya', phone: '+919812345678', status: 'new', createdAt: serverTimestamp(), ...extra });
const leads = (d, bid = BID) => collection(d, `businesses/${bid}/leads`);

test('public can read sites, addresses and packages', async () => {
  await assertSucceeds(getDoc(doc(anon(), 'slugs/demo')));
  await assertSucceeds(getDoc(doc(anon(), `businesses/${BID}`)));
  await assertSucceeds(getDocs(collection(anon(), `businesses/${BID}/packages`)));
});

test('nobody writes businesses or addresses directly (function only)', async () => {
  await assertFails(setDoc(doc(anon(), 'slugs/new'), { businessId: 'x' }));
  await assertFails(setDoc(doc(user('a', { role: 'admin' }), 'slugs/new'), { businessId: 'x' }));
  await assertFails(setDoc(doc(user('a', { role: 'agent' }), 'businesses/x'), { name: 'x' }));
  await assertFails(updateDoc(doc(user('owner1'), `businesses/${BID}`), { name: 'x' }));
});

test('anyone can send a valid enquiry', async () => {
  await assertSucceeds(addDoc(leads(anon()), lead()));
  await assertSucceeds(addDoc(leads(anon()), lead({ message: 'Hi', packageId: 'p1', packageTitle: 'Goa', travelDate: '2026-12-01', people: 2 })));
});

test('bad enquiries are rejected', async () => {
  await assertFails(addDoc(leads(anon()), lead({ status: 'booked' })));
  await assertFails(addDoc(leads(anon()), lead({ phone: 'call me' })));
  await assertFails(addDoc(leads(anon()), lead({ name: '' })));
  await assertFails(addDoc(leads(anon()), lead({ createdAt: new Date(2020, 0, 1) })));
  await assertFails(addDoc(leads(anon()), lead({ isAdmin: true })));
  await assertFails(addDoc(leads(anon()), lead({ people: 0 })));
  await assertFails(addDoc(leads(anon(), 'no-such-business'), lead()));
});

test('only staff and the owner can read leads', async () => {
  await assertFails(getDocs(leads(anon())));
  await assertFails(getDocs(leads(user('stranger'))));
  await assertSucceeds(getDocs(leads(user('owner1'))));
  await assertSucceeds(getDocs(leads(user('a', { role: 'agent' }))));
  await assertSucceeds(getDocs(leads(user('a', { role: 'admin' }))));
});

test('owner can change only lead status; nobody deletes leads', async () => {
  await assertSucceeds(updateDoc(doc(user('owner1'), `businesses/${BID}/leads/l1`), { status: 'contacted' }));
  await assertFails(updateDoc(doc(user('owner1'), `businesses/${BID}/leads/l1`), { status: 'whatever' }));
  await assertFails(updateDoc(doc(user('owner1'), `businesses/${BID}/leads/l1`), { name: 'B' }));
  await assertFails(updateDoc(doc(user('a', { role: 'agent' }), `businesses/${BID}/leads/l1`), { status: 'closed' }));
  await assertFails(deleteDoc(doc(user('owner1'), `businesses/${BID}/leads/l1`)));
});

test('owner and admin can edit packages; others cannot', async () => {
  await assertSucceeds(setDoc(doc(user('owner1'), `businesses/${BID}/packages/p2`), { title: 'Kerala' }));
  await assertSucceeds(setDoc(doc(user('a', { role: 'admin' }), `businesses/${BID}/packages/p3`), { title: 'Ooty' }));
  await assertFails(setDoc(doc(user('stranger'), `businesses/${BID}/packages/p4`), { title: 'x' }));
  await assertFails(setDoc(doc(anon(), `businesses/${BID}/packages/p4`), { title: 'x' }));
});
