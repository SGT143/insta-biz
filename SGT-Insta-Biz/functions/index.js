'use strict';
const { setGlobalOptions } = require('firebase-functions/v2');
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');
const { onboardBusiness } = require('./lib/onboard');

initializeApp();
setGlobalOptions({ region: 'asia-south1', maxInstances: 10 });

const STAFF = new Set(['agent', 'admin']);

/** Agents and admins create a travel business + website for an owner. */
exports.onboardBusiness = onCall(async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Please log in first.');
  if (!STAFF.has(request.auth.token.role)) {
    throw new HttpsError('permission-denied', 'Ask the admin for agent access.');
  }
  return onboardBusiness({ db: getFirestore(), auth: getAuth() }, request.data, request.auth.uid);
});
