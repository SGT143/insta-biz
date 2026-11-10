// Shared Admin SDK setup for local scripts and tests. Always points at the emulators.
import { createRequire } from 'node:module';

const require = createRequire(new URL('../functions/package.json', import.meta.url));

export const PROJECT_ID = process.env.GCLOUD_PROJECT || 'instabiz-dev';
process.env.FIRESTORE_EMULATOR_HOST ||= '127.0.0.1:8080';
process.env.FIREBASE_AUTH_EMULATOR_HOST ||= '127.0.0.1:9099';

const { initializeApp, getApps } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');

if (!getApps().length) initializeApp({ projectId: PROJECT_ID });

export const db = getFirestore();
export const auth = getAuth();
export const onboard = require('./lib/onboard.js');
export const HOSTING_URL = 'http://localhost:5000';
