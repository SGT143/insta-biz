'use strict';
/**
 * Onboarding rules for InstaBiz travel businesses.
 *
 * Website address ("slug") rules are mirrored in app/public/js/slug.js for the
 * browser. test/slug.test.js checks both files give the same answers, so if you
 * change one, change the other.
 */
const { HttpsError } = require('firebase-functions/v2/https');
const { FieldValue } = require('firebase-admin/firestore');
const { samplePackages } = require('./samples');

// 3–40 chars, lowercase letters/digits/hyphens, no leading/trailing/double hyphen.
const SLUG_RE = /^(?!.*--)[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/;

const RESERVED = new Set([
  'admin', 'agent', 'api', 'app', 'apps', 'assets', 'auth', 'blog', 'cdn', 'css',
  'dashboard', 'dev', 'docs', 'firebase', 'help', 'home', 'icons', 'img', 'images',
  'index', 'instabiz', 'js', 'login', 'logout', 'mail', 'manifest', 'offline',
  'onboard', 'owner', 'privacy', 'site', 'staging', 'static', 'support', 'sw',
  'terms', 'test', 'www',
]);

const MAX_CANDIDATES = 10;

/** "Sharma Tours & Travels!" -> "sharma-tours-travels" */
function slugify(text) {
  return String(text || '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
    .replace(/-+$/g, '');
}

/** Why an address can't be used, or null when it's fine. */
function slugProblem(slug) {
  if (!slug) return 'Enter a website address.';
  if (slug.length < 3) return 'Use at least 3 letters.';
  if (slug.length > 40) return 'Use 40 characters or fewer.';
  if (!SLUG_RE.test(slug)) return 'Use only small letters, numbers and single hyphens (not at the start or end).';
  if (RESERVED.has(slug)) return `"${slug}" is reserved. Try another address.`;
  return null;
}

function isValidSlug(slug) {
  return slugProblem(slug) === null;
}

/** The address we'd pick first for a business name (may be invalid, e.g. reserved). */
function preferredSlug(name) {
  return slugify(name);
}

/**
 * Addresses to try, in order: name, name-city, name-city-2, name-city-3 …
 * Only valid, non-reserved addresses are returned.
 */
function slugCandidates(name, city, max = MAX_CANDIDATES) {
  const base = slugify(name);
  const withCity = slugify(`${name} ${city}`);
  const out = [];
  const push = (s) => { if (isValidSlug(s) && !out.includes(s)) out.push(s); };
  push(base);
  push(withCity);
  for (let n = 2; out.length < max && n < max + 2; n++) {
    const suffix = `-${n}`;
    push(withCity.slice(0, 40 - suffix.length).replace(/-+$/, '') + suffix);
  }
  return out.slice(0, max);
}

/** "98765 43210", "+91 98765-43210", "09876543210" -> "+919876543210", else null. */
function normalizeIndianMobile(input) {
  let d = String(input || '').replace(/\D/g, '');
  if (d.length === 12 && d.startsWith('91')) d = d.slice(2);
  else if (d.length === 11 && d.startsWith('0')) d = d.slice(1);
  if (!/^[6-9]\d{9}$/.test(d)) return null;
  return `+91${d}`;
}

function cleanText(v, field, min, max) {
  const s = String(v ?? '').replace(/\s+/g, ' ').trim();
  if (s.length < min) throw new HttpsError('invalid-argument', `Please enter the ${field}.`);
  if (s.length > max) throw new HttpsError('invalid-argument', `The ${field} is too long (max ${max} characters).`);
  return s;
}

function validateInput(data = {}) {
  const name = cleanText(data.name, 'business name', 2, 80);
  const city = cleanText(data.city, 'city or area', 2, 60);
  const ownerName = cleanText(data.ownerName, 'owner name', 2, 60);
  const ownerPhone = normalizeIndianMobile(data.ownerPhone);
  if (!ownerPhone) {
    throw new HttpsError('invalid-argument', 'Owner WhatsApp number must be a 10-digit Indian mobile number.');
  }
  let slug = null;
  if (data.preferredSlug != null && String(data.preferredSlug).trim() !== '') {
    slug = String(data.preferredSlug).trim().toLowerCase();
    const problem = slugProblem(slug);
    if (problem) throw new HttpsError('invalid-argument', problem);
  }
  return { name, city, ownerName, ownerPhone, preferredSlug: slug };
}

async function findOrCreateOwner(auth, phoneNumber, displayName) {
  try {
    return (await auth.getUserByPhoneNumber(phoneNumber)).uid;
  } catch (e) {
    if (e.code !== 'auth/user-not-found') throw e;
    return (await auth.createUser({ phoneNumber, displayName })).uid;
  }
}

/** First free address among the candidates, or null. */
async function firstFreeSlug(db, candidates) {
  if (!candidates.length) return null;
  const snaps = await db.getAll(...candidates.map((s) => db.doc(`slugs/${s}`)));
  const i = snaps.findIndex((s) => !s.exists);
  return i < 0 ? null : candidates[i];
}

/**
 * Create a travel business with its address and sample packages.
 * @param {{db: FirebaseFirestore.Firestore, auth: import('firebase-admin/auth').Auth}} deps
 * @param {object} data form data (name, city, ownerName, ownerPhone, preferredSlug?)
 * @param {string} actorUid the agent/admin doing the onboarding
 */
async function onboardBusiness({ db, auth }, data, actorUid) {
  const input = validateInput(data);
  const candidates = input.preferredSlug ? [input.preferredSlug] : slugCandidates(input.name, input.city);
  if (!candidates.length) {
    throw new HttpsError('invalid-argument', 'Could not make a website address from this name. Please type one.');
  }

  const ownerUid = await findOrCreateOwner(auth, input.ownerPhone, input.ownerName);
  const bizRef = db.collection('businesses').doc();

  const slug = await db.runTransaction(async (tx) => {
    const snaps = await tx.getAll(...candidates.map((s) => db.doc(`slugs/${s}`)));
    const i = snaps.findIndex((s) => !s.exists);
    if (i < 0) return null;
    const chosen = candidates[i];
    const now = FieldValue.serverTimestamp();
    tx.create(db.doc(`slugs/${chosen}`), { businessId: bizRef.id, createdAt: now });
    tx.create(bizRef, {
      type: 'travel',
      name: input.name,
      city: input.city,
      ownerName: input.ownerName,
      ownerPhone: input.ownerPhone,
      ownerUid,
      slug: chosen,
      tagline: `Trusted tour & travel services in ${input.city}`,
      createdBy: actorUid,
      createdAt: now,
    });
    samplePackages().forEach((p, order) => {
      tx.set(bizRef.collection('packages').doc(), { ...p, order, sample: true, createdAt: now });
    });
    return chosen;
  });

  if (!slug) {
    if (input.preferredSlug) {
      const suggestion = await firstFreeSlug(db, slugCandidates(input.name, input.city));
      throw new HttpsError(
        'already-exists',
        `"${input.preferredSlug}" is already taken.` + (suggestion ? ` Try "${suggestion}".` : ' Please choose another address.'),
        { suggestion },
      );
    }
    throw new HttpsError('already-exists', 'All suggested addresses are taken. Please type a different address.');
  }

  return { businessId: bizRef.id, slug, ownerUid };
}

module.exports = {
  SLUG_RE,
  RESERVED,
  MAX_CANDIDATES,
  slugify,
  slugProblem,
  isValidSlug,
  preferredSlug,
  slugCandidates,
  normalizeIndianMobile,
  validateInput,
  firstFreeSlug,
  onboardBusiness,
};
