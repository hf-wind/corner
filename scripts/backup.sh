#!/usr/bin/env bash
set -Eeuo pipefail

project_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
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
data_root="${DATA_ROOT:-$project_dir/data}"
backup_root="${BACKUP_ROOT:-$project_dir/backups}"
timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
destination="$backup_root/$timestamp"

umask 077
mkdir -p "$destination"

docker compose config --quiet
docker compose exec -T postgres pg_dump \
  --username "$postgres_user" \
  --dbname "$postgres_db" \
  --format custom \
  --no-owner \
  --no-privileges > "$destination/database.dump"

if [[ -d "$data_root/uploads" ]]; then
  tar -C "$data_root" -czf "$destination/uploads.tar.gz" uploads
fi

cp .env "$destination/environment.env"
git rev-parse HEAD > "$destination/git-commit.txt"
(
  cd "$destination"
  sha256sum database.dump environment.env git-commit.txt > SHA256SUMS
  if [[ -f uploads.tar.gz ]]; then
    sha256sum uploads.tar.gz >> SHA256SUMS
  fi
)

echo "$destination"
