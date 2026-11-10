// Public travel website for one business, found by its address (slug).
import { db, firestore, registerSW } from './fb.js';
import { normalizeIndianMobile } from './slug.js';

registerSW();

const $ = (id) => document.getElementById(id);
const rupees = (n) => '₹' + Number(n || 0).toLocaleString('en-IN');
const waNumber = (phone) => String(phone || '').replace(/\D/g, '');
const waLink = (phone, text) => `https://wa.me/${waNumber(phone)}?text=${encodeURIComponent(text)}`;

/** {slug}.instabiz.in, or /{slug}, or ?s={slug} */
function currentSlug() {
  const host = location.hostname;
  if (host.endsWith('.instabiz.in')) return host.slice(0, -'.instabiz.in'.length);
  const q = new URLSearchParams(location.search).get('s');
  if (q) return q.toLowerCase();
  return decodeURIComponent(location.pathname.split('/')[1] || '').toLowerCase();
}

function hue(text) {
  let h = 0;
  for (const ch of String(text)) h = (h * 31 + ch.charCodeAt(0)) % 360;
  return h;
}

function el(tag, attrs = {}, ...children) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') n.className = v;
    else if (k === 'style') n.style.cssText = v;
    else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
    else n.setAttribute(k, v);
  }
  for (const c of children.flat()) if (c != null) n.append(c);
  return n;
}

function showNotFound(msg) {
  $('loading').hidden = true;
  $('not-found').hidden = false;
  if (msg) $('not-found-msg').textContent = msg;
  $('brand-name').textContent = 'InstaBiz';
  document.title = 'Website not found';
}

let business = null;
let packages = [];

function renderPackages() {
  const list = $('package-list');
  list.replaceChildren();
  if (!packages.length) {
    list.append(el('p', { class: 'muted' }, 'Packages coming soon. Send us an enquiry for a custom trip.'));
    return;
  }
  for (const p of packages) {
    const h = hue(p.title);
    const art = el('div', {
      class: 'pkg-art',
      style: p.image
        ? `background-image:linear-gradient(transparent 50%,rgba(0,0,0,.45)),url("${encodeURI(p.image)}")`
        : `background-image:linear-gradient(150deg,hsl(${h} 60% 42%),hsl(${(h + 40) % 360} 55% 28%))`,
    }, el('span', { class: 'badge' }, `${p.nights}N / ${p.days}D`));
    list.append(el('article', { class: 'card pkg' },
      art,
      el('div', { class: 'pkg-body' },
        el('h3', {}, p.title),
        p.destination ? el('div', { class: 'muted small' }, p.destination) : null,
        Array.isArray(p.highlights) && p.highlights.length
          ? el('ul', {}, p.highlights.slice(0, 5).map((x) => el('li', {}, x)))
          : null,
        el('div', { class: 'pkg-foot' },
          el('div', { class: 'price' }, rupees(p.price), el('small', {}, 'per person')),
          el('button', { class: 'btn', type: 'button', onclick: () => pickPackage(p.id) }, 'Enquire'),
        ),
      ),
    ));
  }
  const sel = $('l-pkg');
  sel.replaceChildren(el('option', { value: '' }, 'Not sure yet / custom trip'));
  for (const p of packages) sel.append(el('option', { value: p.id }, `${p.title} — ${rupees(p.price)}`));
}

function pickPackage(id) {
  $('l-pkg').value = id;
  $('enquire').scrollIntoView({ behavior: 'smooth' });
  setTimeout(() => $('l-name').focus({ preventScroll: true }), 400);
}

function render() {
  const b = business;
  document.title = `${b.name} — Tours & Travels in ${b.city}`;
  document.querySelector('meta[name="description"]').content = b.tagline || `Tour packages by ${b.name}, ${b.city}.`;
  $('brand-name').textContent = b.name;
  $('hero-city').textContent = `📍 ${b.city}`;
  $('hero-name').textContent = b.name;
  $('hero-tagline').textContent = b.tagline || `Tour & travel packages from ${b.city}.`;
  const hello = `Hi ${b.name}, I found your website and want to know about your tour packages.`;
  for (const id of ['hero-wa', 'contact-wa', 'fab-wa']) $(id).href = waLink(b.ownerPhone, hello);
  $('contact-call').href = `tel:${b.ownerPhone}`;
  $('contact-call').textContent = b.ownerPhone.replace(/^\+91(\d{5})(\d{5})$/, '+91 $1 $2');
  $('owner-line').textContent = b.ownerName ? `${b.ownerName} will get back to you quickly.` : '';
  $('footer-name').textContent = `© ${new Date().getFullYear()} ${b.name}, ${b.city}`;
  renderPackages();
  $('loading').hidden = true;
  $('site').hidden = false;
  $('top-cta').hidden = false;
}

async function load() {
  const slug = currentSlug();
  if (!slug) return showNotFound();
  const fs = await firestore();
  const d = await db();
  const slugSnap = await fs.getDoc(fs.doc(d, 'slugs', slug));
  if (!slugSnap.exists()) return showNotFound(`No business uses the address "${slug}".`);
  const bid = slugSnap.data().businessId;
  const [bizSnap, pkgSnap] = await Promise.all([
    fs.getDoc(fs.doc(d, 'businesses', bid)),
    fs.getDocs(fs.query(fs.collection(d, 'businesses', bid, 'packages'), fs.orderBy('order'))),
  ]);
  if (!bizSnap.exists()) return showNotFound();
  business = { id: bid, ...bizSnap.data() };
  packages = pkgSnap.docs.map((x) => ({ id: x.id, ...x.data() }));
  render();
}

function alertMsg(kind, text) {
  const a = $('lead-alert');
  a.className = `alert ${kind}`;
  a.textContent = text;
  a.hidden = !text;
}

$('lead-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!business) return;
  const f = e.target;
  const name = $('l-name').value.trim();
  const phone = normalizeIndianMobile($('l-phone').value);
  if (!name) { alertMsg('err', 'Please enter your name.'); $('l-name').focus(); return; }
  if (!phone) { alertMsg('err', 'Please enter a 10-digit mobile number.'); $('l-phone').focus(); return; }

  const pkg = packages.find((p) => p.id === $('l-pkg').value);
  const people = parseInt($('l-people').value, 10);
  const fs = await firestore();
  const lead = { name, phone, status: 'new', createdAt: fs.serverTimestamp() };
  if (pkg) { lead.packageId = pkg.id; lead.packageTitle = pkg.title.slice(0, 120); }
  if ($('l-date').value) lead.travelDate = $('l-date').value;
  if (people >= 1 && people <= 100) lead.people = people;
  if ($('l-msg').value.trim()) lead.message = $('l-msg').value.trim().slice(0, 1000);

  const text = [
    `Hi ${business.name}, I'd like to enquire about a trip.`,
    `Name: ${name}`,
    `Mobile: ${phone}`,
    pkg ? `Package: ${pkg.title} (${rupees(pkg.price)})` : 'Package: custom trip',
    lead.travelDate ? `Travel date: ${lead.travelDate}` : null,
    lead.people ? `People: ${lead.people}` : null,
    lead.message ? `Message: ${lead.message}` : null,
  ].filter(Boolean).join('\n');
  const link = waLink(business.ownerPhone, text);

  // Open the tab now (inside the tap) so the popup isn't blocked; point it at WhatsApp after saving.
  const win = window.open('', '_blank');
  const btn = $('lead-submit');
  btn.disabled = true;
  alertMsg('', '');
  try {
    const d = await db();
    const save = fs.addDoc(fs.collection(d, 'businesses', business.id, 'leads'), lead);
    // Offline: Firestore queues the write and sends it later, so don't wait forever.
    const result = await Promise.race([save.then(() => 'saved'), new Promise((r) => setTimeout(() => r('queued'), 5000))]);
    alertMsg('ok', result === 'saved'
      ? 'Thank you! Your enquiry is saved. Opening WhatsApp…'
      : 'You seem to be offline. Your enquiry will be sent when you are back online.');
    if (win) win.location.href = link; else location.href = link;
    f.reset();
  } catch (err) {
    console.error(err);
    if (win) win.close();
    alertMsg('err', 'Sorry, we could not save your enquiry. Please try WhatsApp directly.');
  } finally {
    btn.disabled = false;
  }
});

load().catch((err) => {
  console.error(err);
  showNotFound('Could not load this website. Check your internet and try again.');
});
