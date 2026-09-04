#!/usr/bin/env bash
set -Eeuo pipefail

project_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$project_dir"

run_with_retries() {
  local max_attempts="$1"
  shift
  local attempt=1

  until "$@"; do
    if (( attempt >= max_attempts )); then
      return 1
    fi
    echo "Command failed (attempt ${attempt}/${max_attempts}); retrying in 3 seconds: $*" >&2
    sleep 3
    ((attempt++))
  done
}

# The backend image intentionally has no checkout metadata. Export the current
# history so the changelog can still show real commits in production.
bash ./scripts/export-git-log.sh

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
sudo -n install -m 0644 deploy/systemd/corner-docker-cleanup.service /etc/systemd/system/corner-docker-cleanup.service
sudo -n install -m 0644 deploy/systemd/corner-docker-cleanup.timer /etc/systemd/system/corner-docker-cleanup.timer
sudo -n systemctl daemon-reload
sudo -n systemctl enable --now corner-backup.timer corner-backup-control.path corner-docker-cleanup.timer

if [[ -x scripts/backup.sh ]] && docker compose ps --status running postgres | grep -q postgres; then
  SKIP_BACKUP_EMAIL=1 ./scripts/backup.sh
fi

docker compose config --quiet
# Production hosts may not be able to reach Docker Hub reliably. Reuse cached
# base images and let an explicit image refresh happen through host maintenance.
run_with_retries 3 docker compose build
run_with_retries 3 docker compose up -d --remove-orphans --wait
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

# BuildKit keeps layers and npm cache outside the project (usually /var/lib/docker).
# Reclaim stale build artifacts after a successful rollout. Never prune volumes.
bash ./scripts/docker-cleanup.sh

echo "Deployment completed: $(git rev-parse --short HEAD)"
