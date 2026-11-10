# Handoff notes

Last updated: 2026-11-11. Read this first when continuing on a new machine.

Repo: https://github.com/SGT143/insta-biz (private, branch `main`). Local folder name used: `SGT-APP`.

## What is in this repo

| Folder | What it is | Hosted on |
|---|---|---|
| `SGT-Insta-Biz/` | InstaBiz: mobile websites for tour & travel operators (PWA + Firestore + Cloud Functions). Its own `README.md`, `CLAUDE.md` and `InstaBiz_PLAN.md` (steps 0–7) have the details. | Firebase project `instabiz-dev`, Hosting site `instabiz-sites-dev` |
| `SGT-site/` | SGT company site (static HTML/CSS/JS, lists the products). | Same Firebase project, Hosting site `sgt-site-dev` |

## Set up a new laptop

Needs **Node 22**, **Java 21** and the **Firebase CLI**.

```bash
git clone https://github.com/SGT143/insta-biz.git SGT-APP
cd SGT-APP/SGT-Insta-Biz
npm i -g firebase-tools        # if `firebase` is not installed
npm install                    # also installs functions/
```

Java 21 without admin rights (what was done on the first laptop):

```bash
mkdir -p ~/.local/jdk && cd ~/.local/jdk
curl -fsSL -o jdk21.tar.gz "https://api.adoptium.net/v3/binary/latest/21/ga/linux/x64/jdk/hotspot/normal/eclipse"
tar xzf jdk21.tar.gz && rm jdk21.tar.gz
export JAVA_HOME=$(ls -d ~/.local/jdk/jdk-21*) PATH=$JAVA_HOME/bin:$PATH   # add to ~/.bashrc
java -version
```

With admin rights: `sudo apt install openjdk-21-jre-headless` (Linux) or `brew install openjdk@21` (Mac).

## Run locally

```bash
cd SGT-Insta-Biz
npm run dev
```

| Page | URL |
|---|---|
| Home | http://localhost:5000/ |
| Onboarding | http://localhost:5000/onboard (admin login **9999999999**, OTP auto-filled) |
| Demo site | http://localhost:5000/himalayan-trails |
| Emulator UI | http://localhost:4000 |

Warnings about "firebase login" / "web app configuration" at startup are harmless:
on localhost the app only talks to the emulators. Emulator data is wiped when `npm run dev` stops.

SGT site: open `SGT-site/index.html`, or `cd SGT-site && firebase emulators:start --only hosting`
(http://localhost:5050).

## CI/CD (GitHub Actions)

Workflows live at the repo root in `.github/workflows/` (GitHub ignores workflows in subfolders):

- `instabiz.yml` runs only when `SGT-Insta-Biz/**` changes: tests on every PR and push,
  7-day preview link on PRs, deploy to `instabiz-dev` on push to `main`.
- `sgt-site.yml` runs only when `SGT-site/**` changes: preview on PRs, deploy on push to `main`.
- Markdown-only changes run nothing (saves Actions minutes; repo is meant to be private).

## Status / what is left to do

Done:
- [x] InstaBiz runs locally (emulators, seed, demo site all working, checked 2026-11-11)
- [x] Both sites in one repo with path-filtered CI
- [x] Pushed to https://github.com/SGT143/insta-biz (first commit 2026-11-11)

To do before CI deploys work:
- [ ] `firebase login` and confirm project `instabiz-dev` exists on the Blaze plan
- [ ] Create Hosting sites: `firebase hosting:sites:create instabiz-sites-dev` and
      `firebase hosting:sites:create sgt-site-dev` (if `sgt-site-dev` is taken, pick another
      name and update `SGT-site/.firebaserc`)
- [ ] Add GitHub secret `FIREBASE_SERVICE_ACCOUNT_INSTABIZ_DEV` (service-account JSON with
      Firebase Admin + Cloud Functions Admin + Service Account User). Until then deploy jobs fail; tests still run.
- [ ] Run `npm test` in `SGT-Insta-Biz` (not run yet on any machine)
- [ ] Continue `SGT-Insta-Biz/InstaBiz_PLAN.md` from Step 1 checkboxes onward

## Git

Push uses HTTPS + a GitHub personal access token (fine-grained, repo `SGT143/insta-biz`,
Contents: read/write; add Workflows: read/write so `.github/workflows` changes can be pushed).
Use the token as the password when git asks. To not type it every time:
`git config --global credential.helper store` (saves it in plain text in ~/.git-credentials).

```bash
git pull                 # start of every session
git add -A && git commit -m "..." && git push
```
