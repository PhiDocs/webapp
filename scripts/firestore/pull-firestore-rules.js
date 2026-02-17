const { execSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

function readProjectId() {
  if (process.env.FIREBASE_PROJECT_ID) {
    return process.env.FIREBASE_PROJECT_ID;
  }

  const rcPath = path.join(process.cwd(), '.firebaserc');
  if (fs.existsSync(rcPath)) {
    const raw = fs.readFileSync(rcPath, 'utf8');
    const data = JSON.parse(raw);
    const projectId = data?.projects?.default;
    if (projectId) {
      return projectId;
    }
  }

  throw new Error('Project ID not found. Set FIREBASE_PROJECT_ID or configure .firebaserc.');
}

function getAccessToken() {
  try {
    return execSync('gcloud auth print-access-token', { encoding: 'utf8' }).trim();
  } catch (error) {
    throw new Error('Failed to get access token. Run `gcloud auth application-default login` or `gcloud auth login`.');
  }
}

async function fetchJson(url, token) {
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Request failed (${res.status}): ${text}`);
  }

  return res.json();
}

async function main() {
  const projectId = readProjectId();
  const token = getAccessToken();

  const releaseUrl = `https://firebaserules.googleapis.com/v1/projects/${projectId}/releases/cloud.firestore`;
  const release = await fetchJson(releaseUrl, token);
  const rulesetName = release?.rulesetName;

  if (!rulesetName) {
    throw new Error('No ruleset found for cloud.firestore.');
  }

  const rulesetUrl = `https://firebaserules.googleapis.com/v1/${rulesetName}`;
  const ruleset = await fetchJson(rulesetUrl, token);

  const files = ruleset?.source?.files || [];
  const firestoreFile = files.find((file) => file.name === 'firestore.rules') || files[0];

  if (!firestoreFile?.content) {
    throw new Error('Ruleset content not found.');
  }

  const outPath = path.join(process.cwd(), 'firestore.rules');
  fs.writeFileSync(outPath, firestoreFile.content, 'utf8');
  console.log(`firestore.rules updated from Firebase project ${projectId}.`);
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
