// Firebase setup shared by every page.
// On localhost it talks to the emulators; when deployed it reads the project
// config from Firebase Hosting's reserved /__/firebase/init.json.
const V = '11.0.2';
const CDN = `https://www.gstatic.com/firebasejs/${V}`;

export const IS_LOCAL = ['localhost', '127.0.0.1'].includes(location.hostname);
export const LOCAL_PROJECT = 'instabiz-dev';
export const EMU = { host: '127.0.0.1', auth: 9099, firestore: 8080, functions: 5001 };
export const REGION = 'asia-south1';

const appMod = import(`${CDN}/firebase-app.js`);

async function config() {
  if (IS_LOCAL) return { projectId: LOCAL_PROJECT, apiKey: 'fake-api-key', authDomain: `${LOCAL_PROJECT}.firebaseapp.com` };
  const res = await fetch('/__/firebase/init.json');
  if (!res.ok) throw new Error('Could not load Firebase settings.');
  return res.json();
}

let appPromise;
export function app() {
  appPromise ||= Promise.all([appMod, config()]).then(([{ initializeApp }, cfg]) => initializeApp(cfg));
  return appPromise;
}

let dbPromise;
export function db() {
  dbPromise ||= (async () => {
    const fs = await import(`${CDN}/firebase-firestore.js`);
    const a = await app();
    let instance;
    try {
      // Offline cache so a site that was opened once keeps working without network.
      instance = fs.initializeFirestore(a, {
        localCache: fs.persistentLocalCache({ tabManager: fs.persistentMultipleTabManager() }),
      });
    } catch {
      instance = fs.getFirestore(a);
    }
    if (IS_LOCAL) fs.connectFirestoreEmulator(instance, EMU.host, EMU.firestore);
    return instance;
  })();
  return dbPromise;
}

export const firestore = () => import(`${CDN}/firebase-firestore.js`);

let authPromise;
export function auth() {
  authPromise ||= (async () => {
    const m = await import(`${CDN}/firebase-auth.js`);
    const a = m.getAuth(await app());
    if (IS_LOCAL) {
      m.connectAuthEmulator(a, `http://${EMU.host}:${EMU.auth}`, { disableWarnings: true });
      a.settings.appVerificationDisabledForTesting = true;
    }
    a.useDeviceLanguage();
    return { auth: a, m };
  })();
  return authPromise;
}

let fnPromise;
export function callable(name) {
  fnPromise ||= (async () => {
    const m = await import(`${CDN}/firebase-functions.js`);
    const f = m.getFunctions(await app(), REGION);
    if (IS_LOCAL) m.connectFunctionsEmulator(f, EMU.host, EMU.functions);
    return { f, m };
  })();
  return async (data) => {
    const { f, m } = await fnPromise;
    return (await m.httpsCallable(f, name)(data)).data;
  };
}

/** In the emulator, fetch the last OTP sent to a phone so you don't need a real SMS. */
export async function emulatorOtp(phone) {
  if (!IS_LOCAL) return null;
  try {
    const res = await fetch(`http://${EMU.host}:${EMU.auth}/emulator/v1/projects/${LOCAL_PROJECT}/verificationCodes`);
    const { verificationCodes = [] } = await res.json();
    const mine = verificationCodes.filter((c) => c.phoneNumber === phone);
    return mine.length ? mine[mine.length - 1].code : null;
  } catch {
    return null;
  }
}

/** Public link for a business site. Later: `https://${slug}.instabiz.in`. */
export function siteUrl(slug) {
  return `${location.origin}/${slug}`;
}

export function registerSW() {
  if ('serviceWorker' in navigator) {
    addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
  }
}
