# Running on Windows

This guide explains how to run the project on a Windows machine.

## 1) Prerequisites

- **Git**: https://git-scm.com/download/win
- **Node.js (LTS)**: https://nodejs.org/
- **Firebase CLI** (optional but recommended):
  ```bash
  npm install -g firebase-tools
  ```
- **Google Cloud CLI** (optional, for Genkit/Gemini auth):
  https://cloud.google.com/sdk/docs/install

## 2) Clone and install dependencies

```bash
git clone <your-repo-url>
cd studio
npm install
```

## 3) Environment variables

Create a `.env` file in the project root. You can start from `env.template` if it exists:

```bash
copy env.template .env
```

Fill in:

```
FIREBASE_PROJECT_ID="your-project-id"
FIREBASE_CLIENT_EMAIL="firebase-adminsdk-xxxx@your-project-id.iam.gserviceaccount.com"
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...your key...\n-----END PRIVATE KEY-----\n"

# Optional (only if you are not using gcloud auth)
GEMINI_API_KEY="your-gemini-api-key"

# Optional
N8N_PRODUCTION_URL="https://your.n8n.url/webhook/production"
GENAI_MODEL="googleai/gemini-2.5-flash"
```

Important: in `FIREBASE_PRIVATE_KEY`, keep `\n` as literal characters in a single line.

## 4) Auth for Genkit/Gemini (optional)

If you prefer using Google Cloud credentials instead of `GEMINI_API_KEY`:

```bash
gcloud auth application-default login
```

## 5) Run the app

```bash
npm run dev
```

The dev server starts on:
```
http://localhost:9002
```

## 6) Firestore rules and indexes (optional)

If you change `firestore.rules` or `firestore.indexes.json`:

```bash
npm run update-firestore
```

## 7) Maintenance scripts (optional)

Migration script:
```bash
npm run migrate-deleted-at
```

Pull Firestore rules from Firebase (requires Google auth):
```bash
npm run pull-firestore-rules
```

## 8) Troubleshooting

- **Node version mismatch**: install Node LTS and re-run `npm install`.
- **Firebase auth errors**: confirm your `.env` values and that the service account is valid.
- **Genkit/Gemini errors**: either configure `GEMINI_API_KEY` or login with `gcloud`.
