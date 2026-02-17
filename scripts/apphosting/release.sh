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

TAG="${TAG:-}"
if [ -z "$TAG" ]; then
  BUMP="${BUMP:-patch}"
  LAST_TAG="$(git tag --sort=-v:refname | head -n 1)"

  if [ -z "$LAST_TAG" ]; then
    TAG="v0.0.1"
  elif echo "$LAST_TAG" | grep -Eq '^v[0-9]+\.[0-9]+\.[0-9]+$'; then
    VERSION="${LAST_TAG#v}"
    MAJOR="${VERSION%%.*}"
    REST="${VERSION#*.}"
    MINOR="${REST%%.*}"
    PATCH="${VERSION##*.}"

    case "$BUMP" in
      major)
        MAJOR=$((MAJOR + 1))
        MINOR=0
        PATCH=0
        ;;
      minor)
        MINOR=$((MINOR + 1))
        PATCH=0
        ;;
      patch)
        PATCH=$((PATCH + 1))
        ;;
      *)
        echo "BUMP inválido: $BUMP (use major, minor ou patch)."
        exit 1
        ;;
    esac

    TAG="v${MAJOR}.${MINOR}.${PATCH}"
  else
    echo "Última tag '$LAST_TAG' não está no formato semver (vX.Y.Z). Defina TAG manualmente."
    exit 1
  fi
fi

# Evita recriar tag existente
if git rev-parse "refs/tags/$TAG" >/dev/null 2>&1; then
  echo "Tag $TAG já existe. Abortando."
  exit 1
fi

git tag "$TAG"
git push origin "$TAG"

echo "Release tag: $TAG"

APP_VERSION="${TAG}-$(git rev-parse --short HEAD)"
export NEXT_PUBLIC_APP_VERSION="$APP_VERSION"

# O App Hosting sempre executa o build no backend durante o rollout.
HAS_PROJECT_FLAG="false"
for arg in "$@"; do
  if [ "$arg" = "--project" ] || [[ "$arg" == --project=* ]]; then
    HAS_PROJECT_FLAG="true"
    break
  fi
done

if [ "$HAS_PROJECT_FLAG" = "true" ]; then
  firebase apphosting:rollouts:create "$BACKEND_ID" "$@"
else
  firebase apphosting:rollouts:create "$BACKEND_ID" --project "$PROJECT_ID" "$@"
fi
