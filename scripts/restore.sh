#!/usr/bin/env bash
set -Eeuo pipefail

if [[ $# -ne 1 ]]; then
  echo "Usage: CONFIRM_RESTORE=corner $0 /path/to/backup" >&2
  exit 1
fi
if [[ "${CONFIRM_RESTORE:-}" != "corner" ]]; then
  echo "Set CONFIRM_RESTORE=corner to acknowledge database replacement" >&2
  exit 1
fi

project_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
backup_dir="$(cd "$1" && pwd)"
cd "$project_dir"

if [[ ! -f .env || ! -f "$backup_dir/database.dump" ]]; then
  echo "Missing .env or database.dump" >&2
  exit 1
fi

set -a
# shellcheck disable=SC1091
source ./.env
set +a

postgres_db="${POSTGRES_DB:-corner}"
postgres_user="${POSTGRES_USER:-corner}"
data_root="${DATA_ROOT:-$project_dir/data}"
timestamp="$(date -u +%Y%m%dT%H%M%SZ)"

docker compose up -d postgres redis
docker compose stop backend 2>/dev/null || true
docker compose exec -T postgres dropdb --if-exists --force --username "$postgres_user" "$postgres_db"
docker compose exec -T postgres createdb --username "$postgres_user" "$postgres_db"
docker compose exec -T postgres pg_restore \
  --username "$postgres_user" \
  --dbname "$postgres_db" \
  --no-owner \
  --no-privileges < "$backup_dir/database.dump"

if [[ -f "$backup_dir/uploads.tar.gz" ]]; then
  if [[ -d "$data_root/uploads" ]]; then
    mv "$data_root/uploads" "$data_root/uploads.pre-restore-$timestamp"
  fi
  mkdir -p "$data_root"
  tar -C "$data_root" -xzf "$backup_dir/uploads.tar.gz"
fi

docker compose up -d --remove-orphans --wait
echo "Restore completed from $backup_dir"
