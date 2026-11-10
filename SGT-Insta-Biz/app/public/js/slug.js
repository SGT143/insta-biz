// Website address rules for the browser.
// Mirror of functions/lib/onboard.js — test/slug.test.js keeps them in sync.

export const SLUG_RE = /^(?!.*--)[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/;

export const RESERVED = new Set([
  'admin', 'agent', 'api', 'app', 'apps', 'assets', 'auth', 'blog', 'cdn', 'css',
  'dashboard', 'dev', 'docs', 'firebase', 'help', 'home', 'icons', 'img', 'images',
  'index', 'instabiz', 'js', 'login', 'logout', 'mail', 'manifest', 'offline',
  'onboard', 'owner', 'privacy', 'site', 'staging', 'static', 'support', 'sw',
  'terms', 'test', 'www',
]);

export const MAX_CANDIDATES = 10;

export function slugify(text) {
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

export function slugProblem(slug) {
  if (!slug) return 'Enter a website address.';
  if (slug.length < 3) return 'Use at least 3 letters.';
  if (slug.length > 40) return 'Use 40 characters or fewer.';
  if (!SLUG_RE.test(slug)) return 'Use only small letters, numbers and single hyphens (not at the start or end).';
  if (RESERVED.has(slug)) return `"${slug}" is reserved. Try another address.`;
  return null;
}

export function isValidSlug(slug) {
  return slugProblem(slug) === null;
}

export function preferredSlug(name) {
  return slugify(name);
}

export function slugCandidates(name, city, max = MAX_CANDIDATES) {
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

export function normalizeIndianMobile(input) {
  let d = String(input || '').replace(/\D/g, '');
  if (d.length === 12 && d.startsWith('91')) d = d.slice(2);
  else if (d.length === 11 && d.startsWith('0')) d = d.slice(1);
  if (!/^[6-9]\d{9}$/.test(d)) return null;
  return `+91${d}`;
}
