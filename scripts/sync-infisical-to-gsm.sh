#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [ -f ".env" ]; then
  set -a
  . ".env"
  set +a
fi

if ! command -v infisical >/dev/null 2>&1; then
  echo "CLI 'infisical' não encontrado. Instale antes de continuar." >&2
  exit 1
fi
if ! command -v gcloud >/dev/null 2>&1; then
  echo "CLI 'gcloud' não encontrado. Instale antes de continuar." >&2
  exit 1
fi
if ! command -v jq >/dev/null 2>&1; then
  echo "CLI 'jq' não encontrado. Instale antes de continuar." >&2
  exit 1
fi

PROJECT_ID="${PROJECT_ID:-${FIREBASE_PROJECT_ID:-}}"
if [ -z "$PROJECT_ID" ]; then
  echo "PROJECT_ID não definido (use PROJECT_ID ou FIREBASE_PROJECT_ID no .env)." >&2
  exit 1
fi

INF_ENV="${INFISICAL_ENV:-prod}"
INF_PATH="${INFISICAL_SECRET_PATH:-/}"
INF_PROJECT_ID="${INFISICAL_PROJECT_ID:-}"

if [ ! -f "apphosting.yaml" ]; then
  echo "Arquivo apphosting.yaml não encontrado na raiz do projeto." >&2
  exit 1
fi

TMP_JSON="$(mktemp /tmp/infisical-export.XXXXXX.json)"
trap 'rm -f "$TMP_JSON"' EXIT

EXPORT_ARGS=(export --format=json --env="$INF_ENV" --path="$INF_PATH")
if [ -n "$INF_PROJECT_ID" ]; then
  EXPORT_ARGS+=(--projectId="$INF_PROJECT_ID")
fi

infisical "${EXPORT_ARGS[@]}" > "$TMP_JSON"
jq empty "$TMP_JSON" >/dev/null

if [ -n "${SYNC_KEYS:-}" ]; then
  # Exemplo: SYNC_KEYS="FIREBASE_PRIVATE_KEY,ASSINAFY_API_KEY"
  IFS=',' read -r -a SECRET_KEYS <<< "$SYNC_KEYS"
else
  mapfile -t SECRET_KEYS < <(awk '/secret:/{print $2}' apphosting.yaml | sort -u)
fi

if [ "${#SECRET_KEYS[@]}" -eq 0 ]; then
  echo "Nenhum secret encontrado para sincronizar." >&2
  exit 1
fi

echo "Sincronizando ${#SECRET_KEYS[@]} secrets para o projeto '$PROJECT_ID' (env Infisical: '$INF_ENV')."

for secret_name in "${SECRET_KEYS[@]}"; do
  secret_name="$(echo "$secret_name" | xargs)"
  [ -z "$secret_name" ] && continue

  secret_value="$(jq -r --arg k "$secret_name" '.[$k] // empty' "$TMP_JSON")"
  if [ -z "$secret_value" ] || [ "$secret_value" = "null" ]; then
    echo "Secret '$secret_name' não encontrado no Infisical (env '$INF_ENV', path '$INF_PATH')." >&2
    exit 1
  fi

  if ! gcloud secrets describe "$secret_name" --project "$PROJECT_ID" >/dev/null 2>&1; then
    gcloud secrets create "$secret_name" --replication-policy="automatic" --project "$PROJECT_ID" >/dev/null
    echo "Criado secret no GCP: $secret_name"
  fi

  printf '%s' "$secret_value" | gcloud secrets versions add "$secret_name" --data-file=- --project "$PROJECT_ID" >/dev/null
  echo "Atualizado secret no GCP: $secret_name"
done

echo "Sincronização concluída com sucesso."
