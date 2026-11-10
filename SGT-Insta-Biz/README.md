# InstaBiz

Mobile websites for tour & travel operators. Plain HTML/CSS/JS PWA on Firebase
(Hosting, Firestore, Auth phone login, Cloud Functions in `asia-south1`).

## Run locally (Chrome)

Needs **Node 22**, **Java 21** (for the Firestore emulator) and the Firebase CLI.

```bash
npm install                 # also installs functions/
npm run dev                 # starts emulators, seeds demo data, prints URLs
```

Open:

| Page | URL |
|---|---|
| Home | http://localhost:5000/ |
| Onboarding (agents/admins) | http://localhost:5000/onboard |
| Demo travel site | http://localhost:5000/himalayan-trails |
| Emulator UI (data, users, logs) | http://localhost:4000 |

Log in on `/onboard` with the seeded admin **9999999999**. In local mode the
OTP is filled in for you (it comes from the Auth emulator, no SMS is sent).

Give someone a role (emulator by default, `--live` for the real project):

```bash
npm --prefix functions run set-role -- +919876543210 agent
```

Emulator data is wiped when `npm run dev` stops. Re-run it to get fresh demo data.

### Install as an app
In Chrome, open http://localhost:5000 and use **Install app** (button on the home
page, or the install icon in the address bar). Sites keep working offline once
opened; enquiries sent offline are saved when the connection comes back.

## Tests

```bash
npm run test:unit   # address rules only, no emulator
npm test            # everything: unit + security rules + onboarding function (starts emulators)
```

## Layout

```
app/public/          Hosting root (the PWA)
  index.html         InstaBiz home
  onboard.html       Agent/admin onboarding form       js/onboard.js
  site.html          Travel website for /{slug}        js/site.js
  js/fb.js           Firebase setup (emulators on localhost, /__/firebase/init.json when deployed)
  js/slug.js         Address rules for the browser (mirror of functions/lib/onboard.js)
  sw.js, manifest.webmanifest, icons/
functions/           Cloud Functions (onboardBusiness callable)
  lib/onboard.js     Address rules + onboarding logic
  scripts/set-role.js
firestore.rules      Security rules
scripts/             seed, demo, icon generator
test/                node:test suites
```

## Data

```
slugs/{slug}                       { businessId }                 public read, function writes
businesses/{id}                    name, city, ownerName, ownerPhone, ownerUid, slug, tagline
businesses/{id}/packages/{pid}     title, destination, nights, days, price, highlights[], order, image?
businesses/{id}/leads/{lid}        name, phone, packageId?, travelDate?, people?, message?, status
```

Website addresses: 3–40 chars, `a-z 0-9 -`, no double/edge hyphens, not reserved.
Same name twice → `name`, then `name-city`, then `name-city-2` …

## Deploy (dev)

1. `firebase login`, make sure project `instabiz-dev` exists (Blaze plan) with
   Firestore, Phone Auth and a Hosting site called `instabiz-sites-dev`
   (`firebase hosting:sites:create instabiz-sites-dev`).
2. `npm run deploy:dev`, or push to `main` and CI deploys.
3. Make yourself admin: `npm --prefix functions run set-role -- +91XXXXXXXXXX admin --live`
   (needs `gcloud auth application-default login`).

GitHub secrets for CI: `FIREBASE_SERVICE_ACCOUNT_INSTABIZ_DEV`, the JSON key of a service
account with Firebase Admin + Cloud Functions Admin + Service Account User roles.
Pull requests get a 7-day Hosting preview link; merges to `main` deploy to dev.
