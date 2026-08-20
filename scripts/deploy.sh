#!/usr/bin/env bash
set -Eeuo pipefail

project_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$project_dir"

set -a
# shellcheck disable=SC1091
source ./.env
set +a
data_root="$(realpath -m "${DATA_ROOT:-$project_dir/data}")"
sudo -n install -d -m 0750 -o ubuntu -g ubuntu "$data_root/backup-control"
sudo -n install -m 0644 deploy/systemd/corner-backup.service /etc/systemd/system/corner-backup.service
sudo -n install -m 0644 deploy/systemd/corner-backup.timer /etc/systemd/system/corner-backup.timer
sudo -n install -m 0644 deploy/systemd/corner-backup-control.service /etc/systemd/system/corner-backup-control.service
sudo -n install -m 0644 deploy/systemd/corner-backup-control.path /etc/systemd/system/corner-backup-control.path
sudo -n systemctl daemon-reload
sudo -n systemctl enable --now corner-backup.timer corner-backup-control.path

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
if docker compose exec -T postgres pg_isready >/dev/null 2>&1; then
  docker compose run --rm backend node dist/scripts/seed-bottles.js || true
fi
curl --fail --silent --show-error \
  --retry 24 \
  --retry-delay 5 \
  --retry-all-errors \
  --max-time 15 \
  https://corner.ink/api/health >/dev/null

echo "Deployment completed: $(git rev-parse --short HEAD)"
