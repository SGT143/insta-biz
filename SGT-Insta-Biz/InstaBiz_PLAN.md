# InstaBiz — Travel build planner

Firebase only (no Neon for now). Tour & Travel operators only.
Work through the steps in order. Tick each box when its "Done when" is true.
Paste the prompt blocks into Claude Code, run from this folder.

---

## Step 0 — Manual setup (once, ~half a day)

- [ ] Create Firebase project `instabiz-dev`
  - [ ] Upgrade to Blaze, set budget alert ₹500
  - [ ] Firestore databases `(default)` and `platform`, region asia-south1
  - [ ] Authentication → Phone sign-in on
  - [ ] Storage on
- [ ] Install Node 20, Java 21, Firebase CLI (`npm i -g firebase-tools`), Claude Code
- [ ] Buy `instabiz.in` (Cloudflare can wait — sites work on `/slug` URLs first)
- [ ] Create a GitHub repo and push this folder

**Done when:** `firebase login` works and the project shows both databases.

---

## Step 1 — Get the kit running locally

```
Read CLAUDE.md and PLAN.md. Install all dependencies, start the Firebase
emulators, run `npm run seed` and `npm run demo`, then `npm test`. Fix any
failing tests without loosening security rules. Tell me the demo site URL.
```

- [ ] Emulators start
- [ ] Demo travel site opens at `http://localhost:5000/{slug}`
- [ ] `npm test` passes

---

## Step 2 — Website address rules (mostly done in code)

Already in `functions/lib/onboard.js`: `preferredSlug`, `slugCandidates`,
`SLUG_RE`, reserved words, admin can onboard for an owner.

```
Add unit tests for the slug rules in functions/lib/onboard.js (valid and
invalid addresses, reserved words) and an emulator test that onboards two
businesses with the same name and checks they get different addresses.
```

- [ ] Same name twice → `name` then `name-city`
- [ ] Taken chosen address → clear "already taken" error

---

## Step 3 — Onboarding form (`app/public/onboard.html`)

```
Build app/public/onboard.html, a mobile-first page for agents/admins:
1. Login with phone OTP (Firebase Auth, invisible reCAPTCHA). If the user's
   token has no agent/admin role, show "Ask the admin for agent access".
2. Form fields: business name*, city/area*, owner name*, owner WhatsApp
   number* (10 digits, saved as +91…), website address* (auto-filled from
   name, editable).
3. While typing the address (debounce 400 ms), check slugs/{address} in
   Firestore and show "<address>.instabiz.in is available" or the next free
   suggestion. Use the same rules as functions/lib/onboard.js.
4. Submit calls the onboardBusiness callable (region asia-south1) with
   preferredSlug. Show server errors in plain words.
5. Success screen: website link, "Send to owner on WhatsApp" (wa.me link with
   the site link and how to log in), "Open website", "Onboard another".
Plain HTML/CSS/JS, no framework. Connect to emulators on localhost.
Same fonts as the travel site. Large tap targets.
```

- [ ] Form works on a phone-sized screen
- [ ] Address check updates while typing
- [ ] Success screen shows a working site link

---

## Step 4 — Make yourself admin and test the full flow

```
npm --prefix functions run set-role -- +91XXXXXXXXXX admin
```

```
In the emulator: onboard two businesses with the same name, confirm
different addresses, open each site, send an enquiry from the travel site,
and confirm the lead is saved with status "new".
```

- [ ] Two businesses, two addresses
- [ ] Enquiry saved and WhatsApp opens with the message typed

---

## Step 5 — Deploy to dev

- [ ] Add GitHub secrets (see README.md)
- [ ] Open a pull request → tests pass → check the preview link
- [ ] Merge to `main` → deploys to dev
- [ ] Site works at `instabiz-sites-dev.web.app/{slug}`

---

## Step 6 — Wildcard domain (when ready)

```
Set up worker/wrangler.toml for instabiz.in, deploy the Cloudflare Worker,
and update the travel site and onboarding success screen to show
{slug}.instabiz.in links.
```

- [ ] `{slug}.instabiz.in` opens the right business

---

## Step 7 — First travel operator

- [ ] Fill the onboarding form with the owner present
- [ ] Replace sample packages with real ones (Firebase console for now)
- [ ] Send the link to the owner on WhatsApp
- [ ] Note what confused the owner → fix list for next step

---

## Next (after the first operator)

- [ ] Owner app: phone login, package editor (itinerary, inclusions, photos), leads list with status
- [ ] Agent app: prospects, survey with consent, follow-ups
- [ ] Production project `instabiz-prod` + tag `v*` deploys
