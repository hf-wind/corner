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

if [[ ! -f .env ]]; then
  echo "Missing $project_dir/.env" >&2
  exit 1
fi

set -a
# shellcheck disable=SC1091
source ./.env
set +a

postgres_db="${POSTGRES_DB:-corner}"
postgres_user="${POSTGRES_USER:-corner}"
data_root="$(realpath -m "${DATA_ROOT:-$project_dir/data}")"
timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
work_dir="$(mktemp -d)"
cleanup() { rm -rf -- "$work_dir"; }
trap cleanup EXIT

database_dump=""
uploads_archive=""
if [[ -f "$backup_dir/manifest.json" ]]; then
  archive_name="$(jq -r '.archive // empty' "$backup_dir/manifest.json")"
  if [[ -z "$archive_name" || "$archive_name" == */* || ! -f "$backup_dir/$archive_name" ]]; then
    echo "Backup archive declared by manifest is missing" >&2
    exit 1
  fi
  (
    cd "$backup_dir"
    sha256sum --check SHA256SUMS >/dev/null
  )
  zstd -q -t "$backup_dir/$archive_name"
  zstd -q -dc "$backup_dir/$archive_name" | tar -C "$work_dir" -xf -
  (
    cd "$work_dir"
    sha256sum --check SHA256SUMS >/dev/null
  )
  database_dump="$work_dir/database/blog.dump"
  uploads_archive="$work_dir/uploads/uploads.tar.zst"
else
  database_dump="$backup_dir/database.dump"
  uploads_archive="$backup_dir/uploads.tar.gz"
fi

if [[ ! -f "$database_dump" ]]; then
  echo "Database dump is missing from backup" >&2
  exit 1
fi

if [[ "${SKIP_PRE_RESTORE_BACKUP:-0}" != "1" ]]; then
  "$project_dir/scripts/backup.sh"
fi

docker compose up -d postgres redis
docker compose stop backend 2>/dev/null || true
docker compose exec -T postgres dropdb --if-exists --force --username "$postgres_user" "$postgres_db"
docker compose exec -T postgres createdb --username "$postgres_user" "$postgres_db"
docker compose exec -T postgres pg_restore \
  --username "$postgres_user" \
  --dbname "$postgres_db" \
  --no-owner \
  --no-privileges < "$database_dump"

if [[ -f "$uploads_archive" ]]; then
  uploads_stage="$work_dir/uploads-restored"
  mkdir -p "$uploads_stage"
  if [[ "$uploads_archive" == *.tar.zst ]]; then
    zstd -q -dc "$uploads_archive" | tar -C "$uploads_stage" -xf -
  else
    tar -C "$uploads_stage" -xzf "$uploads_archive"
  fi
  if [[ ! -d "$uploads_stage/uploads" ]]; then
    echo "Uploads archive does not contain an uploads directory" >&2
    exit 1
  fi
  mkdir -p "$data_root"
  if [[ -d "$data_root/uploads" ]]; then
    mv "$data_root/uploads" "$data_root/uploads.pre-restore-$timestamp"
  fi
  mv "$uploads_stage/uploads" "$data_root/uploads"
fi

docker compose up -d --remove-orphans --wait
echo "Restore completed from $backup_dir"
