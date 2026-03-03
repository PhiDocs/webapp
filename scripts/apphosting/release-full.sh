#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

INF_ENV="${INFISICAL_ENV:-prod}"
INF_PATH="${INFISICAL_SECRET_PATH:-/}"
BUMP="${BUMP:-patch}"
TAG="${TAG:-}"
SKIP_SECRETS_SYNC="false"

for arg in "$@"; do
  case "$arg" in
    --skip-sync-keys|--skip-secrets-sync)
      SKIP_SECRETS_SYNC="true"
      ;;
  esac
done

load_env_safely() {
  local env_file="$1"
  [ -f "$env_file" ] || return 0

  while IFS= read -r line || [ -n "$line" ]; do
    # Skip empty lines and comments
    case "$line" in
      ''|\#*) continue ;;
    esac
    # Accept only KEY=VALUE assignments; ignore any noisy/interactive output lines.
    if [[ "$line" =~ ^[A-Za-z_][A-Za-z0-9_]*= ]]; then
      local key="${line%%=*}"
      local value="${line#*=}"

      # Strip optional wrapping quotes from dotenv style values.
      if [[ "$value" =~ ^\".*\"$ ]]; then
        value="${value:1:${#value}-2}"
      elif [[ "$value" =~ ^\'.*\'$ ]]; then
        value="${value:1:${#value}-2}"
      fi

      export "$key=$value"
    fi
  done < <(tr '\r' '\n' < "$env_file")
}

# Carrega .env local de forma segura (ignora linhas inválidas).
load_env_safely ".env"

if ! command -v npm >/dev/null 2>&1; then
  echo "npm não encontrado no PATH." >&2
  exit 1
fi

if [ "$SKIP_SECRETS_SYNC" != "true" ]; then
  if ! command -v infisical >/dev/null 2>&1; then
    echo "CLI 'infisical' não encontrada." >&2
    exit 1
  fi
fi

if ! command -v firebase >/dev/null 2>&1; then
  echo "CLI 'firebase' não encontrada." >&2
  exit 1
fi

if [ "$SKIP_SECRETS_SYNC" = "true" ]; then
  echo "[1/4] Pulando pull de .env do Infisical (--skip-sync-keys)."
else
  echo "[1/4] Gerando .env a partir do Infisical (env: $INF_ENV, path: $INF_PATH)..."
  INFISICAL_ENV="$INF_ENV" INFISICAL_SECRET_PATH="$INF_PATH" npm run env:pull

  load_env_safely ".env"
fi

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

if [ "$SKIP_SECRETS_SYNC" = "true" ]; then
  echo "[2/4] Pulando sincronização de secrets (--skip-sync-keys)."
else
  echo "[2/4] Sincronizando secrets Infisical -> Google Secret Manager..."
  INFISICAL_ENV="$INF_ENV" INFISICAL_SECRET_PATH="$INF_PATH" npm run secrets:sync
fi

if [ "$SKIP_SECRETS_SYNC" = "true" ]; then
  echo "[3/4] Pulando grant de acesso dos secrets (--skip-sync-keys)."
else
  echo "[3/4] Garantindo grant de acesso dos secrets para o backend '$BACKEND_ID'..."
  SECRET_KEYS=()
  while IFS= read -r secret_key; do
    SECRET_KEYS+=("$secret_key")
  done < <(awk '/secret:/{print $2}' apphosting.yaml | sort -u)
  for secret_name in "${SECRET_KEYS[@]}"; do
    [ -z "$secret_name" ] && continue
    if firebase apphosting:secrets:grantaccess "$secret_name" --backend "$BACKEND_ID" --project "$PROJECT_ID"; then
      echo "Grant OK: $secret_name"
    else
      echo "Falha no grantaccess para secret '$secret_name' (backend: '$BACKEND_ID', project: '$PROJECT_ID')." >&2
      exit 1
    fi
  done
fi

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
