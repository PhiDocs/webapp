#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

INF_ENV="${INFISICAL_ENV:-prod}"
INF_PATH="${INFISICAL_SECRET_PATH:-/}"
BUMP="${BUMP:-patch}"
TAG="${TAG:-}"

if ! command -v npm >/dev/null 2>&1; then
  echo "npm não encontrado no PATH." >&2
  exit 1
fi

if ! command -v infisical >/dev/null 2>&1; then
  echo "CLI 'infisical' não encontrada." >&2
  exit 1
fi

if ! command -v firebase >/dev/null 2>&1; then
  echo "CLI 'firebase' não encontrada." >&2
  exit 1
fi

echo "[1/4] Gerando .env a partir do Infisical (env: $INF_ENV, path: $INF_PATH)..."
INFISICAL_ENV="$INF_ENV" INFISICAL_SECRET_PATH="$INF_PATH" npm run env:pull

set -a
. ".env"
set +a

PROJECT_ID="${PROJECT_ID:-${FIREBASE_PROJECT_ID:-}}"
BACKEND_ID="${BACKEND_ID:-}"
if [ -z "$PROJECT_ID" ]; then
  echo "PROJECT_ID/FIREBASE_PROJECT_ID ausente no .env." >&2
  exit 1
fi
if [ -z "$BACKEND_ID" ]; then
  echo "BACKEND_ID ausente no .env." >&2
  exit 1
fi

echo "[2/4] Sincronizando secrets Infisical -> Google Secret Manager..."
INFISICAL_ENV="$INF_ENV" INFISICAL_SECRET_PATH="$INF_PATH" npm run secrets:sync

echo "[3/4] Garantindo grant de acesso dos secrets para o backend '$BACKEND_ID'..."
mapfile -t SECRET_KEYS < <(awk '/secret:/{print $2}' apphosting.yaml | sort -u)
for secret_name in "${SECRET_KEYS[@]}"; do
  [ -z "$secret_name" ] && continue
  firebase apphosting:secrets:grantaccess "$secret_name" "$BACKEND_ID" --project "$PROJECT_ID" >/dev/null
  echo "Grant OK: $secret_name"
done

echo "[4/4] Publicando release no App Hosting..."
if [ -n "$TAG" ]; then
  TAG="$TAG" npm run release:apphosting
else
  case "$BUMP" in
    patch|minor|major) ;;
    *)
      echo "BUMP inválido: $BUMP (use patch|minor|major)." >&2
      exit 1
      ;;
  esac
  npm run "release:apphosting:$BUMP"
fi

echo "Release concluído com sucesso."
