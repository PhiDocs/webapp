#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

if [ -f ".env" ]; then
  set -a
  . ".env"
  set +a
fi

PROJECT_ID="${PROJECT_ID:-${FIREBASE_PROJECT_ID:-}}"
if [ -z "$PROJECT_ID" ]; then
  echo "PROJECT_ID não definido (use PROJECT_ID no .env ou FIREBASE_PROJECT_ID)." >&2
  exit 1
fi

SOURCE_FILE=".env.example"
if [ -f "env.example" ]; then
  SOURCE_FILE="env.example"
fi

if [ ! -f "$SOURCE_FILE" ]; then
  echo "Arquivo $SOURCE_FILE não encontrado." >&2
  exit 1
fi

TMP_JSON="$(mktemp /tmp/env.resolved.XXXXXX.json)"
trap 'rm -f "$TMP_JSON"' EXIT

# Converte .env(.example) para JSON (sem expandir variáveis)
BASE_JSON="$(awk '
  BEGIN { print "{"; first=1 }
  /^[[:space:]]*#/ { next }
  /^[[:space:]]*$/ { next }
  {
    line=$0
    pos=index(line,"=")
    if (pos==0) next
    key=substr(line,1,pos-1)
    val=substr(line,pos+1)
    gsub(/^[[:space:]]+|[[:space:]]+$/, "", key)
    gsub(/^[[:space:]]+|[[:space:]]+$/, "", val)

    if (val ~ /^".*"$/) {
      val=substr(val,2,length(val)-2)
    } else if (val ~ /^'\''.*'\''$/) {
      val=substr(val,2,length(val)-2)
    }

    gsub(/\\/, "\\\\", val)
    gsub(/"/, "\\\"", val)
    gsub(/\r/, "\\r", val)
    gsub(/\n/, "\\n", val)

    if (!first) printf(",\n")
    first=0
    printf("  \"%s\": \"%s\"", key, val)
  }
  END { print "\n}" }
' "$SOURCE_FILE")"

# Lista placeholders de secret no formato <from-secret:SECRET_NAME>
SECRETS="$(printf '%s' "$BASE_JSON" | jq -r 'to_entries[] | select(.value | test("^<from-secret:[^>]+>$")) | .value | capture("^<from-secret:(?<name>[^>]+)>$").name')"

if [ -n "$SECRETS" ]; then
  while IFS= read -r secret_name; do
    [ -z "$secret_name" ] && continue

    # Captura stdout+stderr para validar erro sem vazar no JSON
    out="$(firebase -P "$PROJECT_ID" apphosting:secrets:access "$secret_name" 2>&1)" || {
      echo "Falha ao acessar secret '$secret_name' no projeto '$PROJECT_ID'." >&2
      echo "$out" >&2
      exit 1
    }

    if printf '%s' "$out" | rg -q '^Error:|Authentication Error'; then
      echo "Retorno inválido ao acessar secret '$secret_name' no projeto '$PROJECT_ID'." >&2
      echo "$out" >&2
      exit 1
    fi

    # remove warnings comuns do firebase-tools se vierem no stdout
    value="$(printf '%s' "$out" | awk 'BEGIN{skip=0}
      /^\(node:[0-9]+\) \[DEP0040\]/ {next}
      /^\(Use `node --trace-deprecation/ {next}
      /^┌────────────────/ {skip=1; next}
      /^└────────────────/ {skip=0; next}
      { if (!skip) print }
    ' | sed '/^$/d')"

    if [ -z "$value" ]; then
      echo "Secret '$secret_name' retornou vazio ou inválido." >&2
      exit 1
    fi

    BASE_JSON="$(printf '%s' "$BASE_JSON" | jq --arg s "$secret_name" --arg v "$value" 'with_entries(if .value == ("<from-secret:" + $s + ">") then .value = $v else . end)')"
  done <<< "$SECRETS"
fi

printf '%s\n' "$BASE_JSON" > "$TMP_JSON"

# Só grava arquivo final se JSON ficou válido
jq empty "$TMP_JSON"
mv "$TMP_JSON" env.resolved.json

echo "env.resolved.json gerado com sucesso para o projeto '$PROJECT_ID'."
