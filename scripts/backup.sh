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
retention_days="${BACKUP_RETENTION_DAYS:-14}"
timestamp="$(date -u +%Y%m%dT%H%M%SZ)"

backup_root="$(realpath -m "$backup_root")"
data_root="$(realpath -m "$data_root")"
if [[ "$backup_root" == "/" || "$backup_root" == "/srv" || ${#backup_root} -lt 10 ]]; then
  echo "Unsafe BACKUP_ROOT: $backup_root" >&2
  exit 1
fi
if ! [[ "$retention_days" =~ ^[0-9]+$ ]] || (( retention_days < 1 )); then
  echo "BACKUP_RETENTION_DAYS must be a positive integer" >&2
  exit 1
fi

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

(
  cd "$destination"
  sha256sum --check SHA256SUMS >/dev/null
)

database_size="$(du -h "$destination/database.dump" | awk '{print $1}')"
uploads_size="0"
if [[ -f "$destination/uploads.tar.gz" ]]; then
  uploads_size="$(du -h "$destination/uploads.tar.gz" | awk '{print $1}')"
fi
cat > "$destination/backup-report.txt" <<EOF
风隅随笔生产备份成功

时间（UTC）：$timestamp
Git 提交：$(cat "$destination/git-commit.txt")
数据库备份：$database_size
上传文件备份：$uploads_size
服务器路径：$destination
保留策略：$retention_days 天
完整性校验：SHA256 通过

邮件附件不包含 environment.env。迁移所需的完整服务器备份仍保存在上述路径。
EOF

if [[ "${SKIP_BACKUP_EMAIL:-0}" != "1" ]]; then
  mail_archive="$destination/corner-backup-$timestamp.tar.gz"
  mail_files=(database.dump git-commit.txt SHA256SUMS backup-report.txt)
  if [[ -f "$destination/uploads.tar.gz" ]]; then mail_files+=(uploads.tar.gz); fi
  tar -C "$destination" -czf "$mail_archive" "${mail_files[@]}"

  max_mail_mb="${BACKUP_EMAIL_MAX_MB:-20}"
  mail_size_bytes="$(stat -c '%s' "$mail_archive")"
  mail_limit_bytes="$((max_mail_mb * 1024 * 1024))"
  attachment_arg=()
  if (( mail_size_bytes <= mail_limit_bytes )); then
    attachment_arg=("/backup/$(basename "$mail_archive")")
  else
    echo "Backup mail attachment skipped because it exceeds ${max_mail_mb}MB" >&2
  fi

  if ! docker compose run --rm --no-deps \
    -v "$destination:/backup:ro" \
    backend node dist/scripts/send-backup-email.js \
    /backup/backup-report.txt "${attachment_arg[@]}"; then
    echo "Backup completed, but the email report failed" >&2
  fi
  rm -f -- "$mail_archive"
fi

find "$backup_root" -mindepth 1 -maxdepth 1 -type d \
  -mmin "+$((retention_days * 1440))" -print -exec rm -rf -- {} +

echo "$destination"
