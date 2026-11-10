# InstaBiz — notes for Claude

- Build plan: `InstaBiz_PLAN.md` (steps 0–7). README.md has commands and data model.
- Front end is plain HTML/CSS/JS ES modules in `app/public`, no framework and no build step.
  Firebase JS SDK is loaded from gstatic (version pinned in `app/public/js/fb.js`).
- On localhost the app always uses the emulators (auth 9099, firestore 8080, functions 5001,
  hosting 5000, UI 4000). Project id `instabiz-dev`, functions region `asia-south1`.
- Address (slug) rules exist twice: `functions/lib/onboard.js` (CommonJS) and
  `app/public/js/slug.js` (ESM). Change both; `test/slug.test.js` checks they match.
- Businesses and slugs are written only by the `onboardBusiness` function. Never loosen
  `firestore.rules` to make a test pass.
- Bump `VERSION` in `app/public/sw.js` when you add files to the precache list.
- Copy is for small-business owners in India: short, plain words, numbers as +91.
