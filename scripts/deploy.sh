#!/usr/bin/env bash
set -Eeuo pipefail

project_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$project_dir"

if [[ -x scripts/backup.sh ]] && docker compose ps --status running postgres | grep -q postgres; then
  ./scripts/backup.sh
fi

docker compose config --quiet
docker compose build --pull
docker compose up -d --remove-orphans --wait
curl --fail --silent --show-error --retry 12 --retry-delay 5 https://corner.ink/api/health >/dev/null

echo "Deployment completed: $(git rev-parse --short HEAD)"
