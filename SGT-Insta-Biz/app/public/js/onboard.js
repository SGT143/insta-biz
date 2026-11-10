// Onboarding page for agents/admins: phone login, business form, success screen.
import { auth, db, firestore, callable, emulatorOtp, siteUrl, registerSW, IS_LOCAL } from './fb.js';
import { slugify, slugProblem, slugCandidates, normalizeIndianMobile } from './slug.js';

registerSW();

const $ = (id) => document.getElementById(id);
const VIEWS = ['boot', 'v-login', 'v-denied', 'v-form', 'v-done'];
const show = (id) => VIEWS.forEach((v) => { $(v).hidden = v !== id; });
const STAFF = ['agent', 'admin'];
const pretty = (p) => p.replace(/^\+91(\d{5})(\d{5})$/, '+91 $1 $2');

function setAlert(id, text, kind = 'err') {
  const a = $(id);
  a.className = `alert ${kind}`;
  a.textContent = text || '';
  a.hidden = !text;
}

function busy(btn, on, label) {
  btn.disabled = on;
  if (on) { btn.dataset.label = btn.textContent; btn.textContent = label; }
  else if (btn.dataset.label) btn.textContent = btn.dataset.label;
}

if (IS_LOCAL) $('dev-note').hidden = false;

/* ---------- Login ---------- */

const { auth: A, m } = await auth();
let verifier = null;
let confirmation = null;
let loginPhone = null;

function freshVerifier() {
  try { verifier?.clear(); } catch { /* already cleared */ }
  verifier = new m.RecaptchaVerifier(A, 'send-otp', { size: 'invisible' });
  return verifier;
}

const AUTH_ERRORS = {
  'auth/invalid-phone-number': 'That mobile number doesn\'t look right.',
  'auth/too-many-requests': 'Too many tries. Please wait a few minutes and try again.',
  'auth/invalid-verification-code': 'Wrong code. Please check the SMS and try again.',
  'auth/code-expired': 'This code has expired. Please ask for a new one.',
  'auth/network-request-failed': 'No internet connection. Please try again.',
  'auth/quota-exceeded': 'SMS limit reached for today. Please try later.',
};
const authMessage = (e) => AUTH_ERRORS[e.code] || 'Something went wrong. Please try again.';

$('phone-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  setAlert('login-alert', '');
  const phone = normalizeIndianMobile($('login-phone').value);
  if (!phone) { setAlert('login-alert', 'Please enter a 10-digit mobile number.'); return; }
  const btn = $('send-otp');
  busy(btn, true, 'Sending…');
  try {
    confirmation = await m.signInWithPhoneNumber(A, phone, freshVerifier());
    loginPhone = phone;
    $('otp-phone').textContent = pretty(phone);
    $('phone-form').hidden = true;
    $('otp-form').hidden = false;
    const code = await emulatorOtp(phone);
    if (code) $('otp').value = code;
    $('otp').focus();
  } catch (err) {
    console.error(err);
    setAlert('login-alert', authMessage(err));
  } finally {
    busy(btn, false);
  }
});

$('otp-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  setAlert('login-alert', '');
  const code = $('otp').value.trim();
  if (!/^\d{6}$/.test(code)) { setAlert('login-alert', 'Enter the 6-digit code.'); return; }
  const btn = $('verify-otp');
  busy(btn, true, 'Checking…');
  try {
    await confirmation.confirm(code);
  } catch (err) {
    console.error(err);
    setAlert('login-alert', authMessage(err));
  } finally {
    busy(btn, false);
  }
});

$('change-phone').addEventListener('click', () => {
  $('otp-form').hidden = true;
  $('phone-form').hidden = false;
  $('otp').value = '';
  $('login-phone').focus();
});

async function logout() {
  await m.signOut(A);
  $('otp-form').hidden = true;
  $('phone-form').hidden = false;
  $('otp').value = '';
}
$('logout').addEventListener('click', logout);
$('denied-logout').addEventListener('click', logout);

m.onAuthStateChanged(A, async (user) => {
  $('logout').hidden = !user;
  if (!user) { show('v-login'); return; }
  const token = await user.getIdTokenResult(true);
  const phone = user.phoneNumber || loginPhone || '';
  if (!STAFF.includes(token.claims.role)) {
    $('denied-phone').textContent = pretty(phone);
    show('v-denied');
    return;
  }
  $('me-phone').textContent = `${pretty(phone)} (${token.claims.role})`;
  show('v-form');
  $('f-name').focus();
});

/* ---------- Website address check ---------- */

const fs = await firestore();
const store = await db();
let slugTouched = false;
let checkSeq = 0;
let debounce = null;
let suggestion = null;

const slugTaken = async (s) => (await fs.getDoc(fs.doc(store, 'slugs', s))).exists();

async function firstFree(candidates, skip) {
  for (const c of candidates) {
    if (c === skip) continue;
    if (!(await slugTaken(c))) return c;
  }
  return null;
}

function slugHint(text, kind = '') {
  const h = $('slug-hint');
  h.textContent = text;
  h.className = `hint ${kind}`;
}

function offerSuggestion(s) {
  suggestion = s;
  const b = $('use-suggestion');
  b.hidden = !s;
  if (s) b.textContent = `Use ${s}.instabiz.in`;
}

async function checkSlug() {
  const seq = ++checkSeq;
  const name = $('f-name').value;
  const city = $('f-city').value;
  const slug = $('f-slug').value.trim().toLowerCase();
  offerSuggestion(null);
  if (!slug) { slugHint(''); return; }
  const problem = slugProblem(slug);
  if (problem) { slugHint(problem, 'err'); return; }
  slugHint('Checking…');
  try {
    if (!(await slugTaken(slug))) {
      if (seq === checkSeq) slugHint(`${slug}.instabiz.in is available`, 'ok');
      return;
    }
    const free = await firstFree(slugCandidates(name || slug, city), slug);
    if (seq !== checkSeq) return;
    if (!slugTouched && free) {
      // Address was auto-filled: just move to the next free one.
      $('f-slug').value = free;
      slugHint(`${free}.instabiz.in is available (${slug} is taken)`, 'ok');
    } else {
      slugHint(`${slug}.instabiz.in is already taken.`, 'err');
      offerSuggestion(free);
    }
  } catch (err) {
    console.error(err);
    if (seq === checkSeq) slugHint('Could not check the address. Check your internet.', 'err');
  }
}

function scheduleCheck() {
  clearTimeout(debounce);
  debounce = setTimeout(checkSlug, 400);
}

function autofillSlug() {
  if (slugTouched) return;
  $('f-slug').value = slugify($('f-name').value);
  scheduleCheck();
}

$('f-name').addEventListener('input', autofillSlug);
$('f-city').addEventListener('input', () => { if (!slugTouched) autofillSlug(); });
$('f-slug').addEventListener('input', () => {
  slugTouched = $('f-slug').value.trim() !== '';
  const cleaned = $('f-slug').value.toLowerCase().replace(/[^a-z0-9-]/g, '-');
  if (cleaned !== $('f-slug').value) $('f-slug').value = cleaned;
  if (!slugTouched) autofillSlug(); else scheduleCheck();
});
$('use-suggestion').addEventListener('click', () => {
  if (!suggestion) return;
  $('f-slug').value = suggestion;
  slugTouched = true;
  checkSlug();
});
$('f-phone').addEventListener('input', () => {
  const v = $('f-phone').value;
  const ok = normalizeIndianMobile(v);
  $('phone-hint').textContent = v && !ok ? 'Enter a 10-digit mobile number.' : ok ? `WhatsApp: ${pretty(ok)}` : '';
  $('phone-hint').className = `hint ${v && !ok ? 'err' : ''}`;
});

/* ---------- Submit ---------- */

const onboardBusiness = callable('onboardBusiness');

const FN_ERRORS = {
  'functions/unauthenticated': 'Your login has expired. Please log in again.',
  'functions/permission-denied': 'Ask the admin for agent access.',
  'functions/unavailable': 'Could not reach the server. Check your internet and try again.',
  'functions/deadline-exceeded': 'The server took too long. Please try again.',
  'functions/internal': 'Something went wrong on the server. Please try again.',
};

$('biz-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  setAlert('form-alert', '');
  const data = {
    name: $('f-name').value.trim(),
    city: $('f-city').value.trim(),
    ownerName: $('f-owner').value.trim(),
    ownerPhone: $('f-phone').value.trim(),
    preferredSlug: $('f-slug').value.trim().toLowerCase(),
  };
  const missing = [
    [data.name.length < 2, 'f-name', 'Please enter the business name.'],
    [data.city.length < 2, 'f-city', 'Please enter the city or area.'],
    [data.ownerName.length < 2, 'f-owner', 'Please enter the owner\'s name.'],
    [!normalizeIndianMobile(data.ownerPhone), 'f-phone', 'Owner WhatsApp number must be 10 digits.'],
    [!!slugProblem(data.preferredSlug), 'f-slug', slugProblem(data.preferredSlug)],
  ].find(([bad]) => bad);
  if (missing) { setAlert('form-alert', missing[2]); $(missing[1]).focus(); return; }

  const btn = $('submit');
  busy(btn, true, 'Creating website…');
  try {
    const res = await onboardBusiness(data);
    showDone({ ...data, ownerPhone: normalizeIndianMobile(data.ownerPhone), slug: res.slug });
  } catch (err) {
    console.error(err);
    if (err.code === 'functions/already-exists' || err.code === 'functions/invalid-argument') {
      setAlert('form-alert', err.message);
      if (err.details?.suggestion) offerSuggestion(err.details.suggestion);
      if (err.code === 'functions/already-exists') { slugHint(err.message, 'err'); $('f-slug').focus(); }
    } else {
      setAlert('form-alert', FN_ERRORS[err.code] || 'Something went wrong. Please try again.');
    }
  } finally {
    busy(btn, false);
  }
});

function showDone(b) {
  const url = siteUrl(b.slug);
  $('done-sub').textContent = `${b.name}, ${b.city}`;
  $('done-link').textContent = url;
  $('done-open').href = url;
  const msg = [
    `Namaste ${b.ownerName} ji! 🙏`,
    `Your website for ${b.name} is ready:`,
    url,
    '',
    'Customers can see your tour packages and send enquiries straight to this WhatsApp number.',
    `To update your packages, you'll log in with this number (${pretty(b.ownerPhone)}) using an SMS code. We'll share the login link soon.`,
    '— InstaBiz',
  ].join('\n');
  $('done-wa').href = `https://wa.me/${b.ownerPhone.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`;
  show('v-done');
  scrollTo(0, 0);
}

$('done-again').addEventListener('click', () => {
  $('biz-form').reset();
  slugTouched = false;
  slugHint('');
  offerSuggestion(null);
  $('phone-hint').textContent = '';
  show('v-form');
  $('f-name').focus();
});
