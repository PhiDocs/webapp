#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

# Carrega .env se existir
if [ -f ".env" ]; then
  set -a
  . ".env"
  set +a
fi

BACKEND_ID="${BACKEND_ID:-}"
if [ -z "$BACKEND_ID" ]; then
  echo "BACKEND_ID não definido (preencha no .env ou exporte)."
  exit 1
fi

PROJECT_ID="${PROJECT_ID:-${FIREBASE_PROJECT_ID:-}}"
if [ -z "$PROJECT_ID" ]; then
  echo "PROJECT_ID não definido (preencha PROJECT_ID ou FIREBASE_PROJECT_ID no .env)."
  exit 1
fi

APP_VERSION="$(git describe --tags --abbrev=7 --always 2>/dev/null || git rev-parse --short HEAD)"
export NEXT_PUBLIC_APP_VERSION="$APP_VERSION"

HAS_PROJECT_FLAG="false"
for arg in "$@"; do
  if [ "$arg" = "--project" ] || [[ "$arg" == --project=* ]]; then
    HAS_PROJECT_FLAG="true"
    break
  fi
done

if [ "$HAS_PROJECT_FLAG" = "true" ]; then
  firebase apphosting:rollouts:create --config apphosting.yaml --backend "$BACKEND_ID" "$@"
else
  firebase apphosting:rollouts:create --config apphosting.yaml --backend "$BACKEND_ID" --project "$PROJECT_ID" "$@"
fi
