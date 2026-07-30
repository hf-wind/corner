#!/usr/bin/env bash
set -Eeuo pipefail

project_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$project_dir"

if [[ -x scripts/backup.sh ]] && docker compose ps --status running postgres | grep -q postgres; then
  SKIP_BACKUP_EMAIL=1 ./scripts/backup.sh
fi

docker compose config --quiet
docker compose build --pull
docker compose up -d --remove-orphans --wait
# A Git checkout replaces Caddyfile's inode, so recreate the container to refresh
# the read-only single-file bind mount after validating the new configuration.
docker compose run --rm --no-deps caddy caddy validate --config /etc/caddy/Caddyfile
docker compose up -d --force-recreate --no-deps caddy
docker compose exec -T caddy caddy validate --config /etc/caddy/Caddyfile
curl --fail --silent --show-error \
  --retry 24 \
  --retry-delay 5 \
  --retry-all-errors \
  --max-time 15 \
  https://corner.ink/api/health >/dev/null

echo "Deployment completed: $(git rev-parse --short HEAD)"
