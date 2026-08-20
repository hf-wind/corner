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
archive_email="${BACKUP_ARCHIVE_EMAIL_TO:-huifeng680@gmail.com}"
notification_email="${BACKUP_NOTIFICATION_EMAIL_TO:-1833079849@qq.com}"
max_mail_mb="${BACKUP_EMAIL_MAX_MB:-20}"
encryption_key="${BACKUP_ENCRYPTION_KEY:-}"
timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
archive_name="corner-backup-$timestamp.tar.zst"

for command_name in docker git jq openssl tar zstd sha256sum; do
  command -v "$command_name" >/dev/null 2>&1 || {
    echo "Required command is missing: $command_name" >&2
    exit 1
  }
done

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
if ! [[ "$max_mail_mb" =~ ^[0-9]+$ ]] || (( max_mail_mb < 1 )); then
  echo "BACKUP_EMAIL_MAX_MB must be a positive integer" >&2
  exit 1
fi
if (( ${#encryption_key} < 32 )); then
  echo "BACKUP_ENCRYPTION_KEY must contain at least 32 characters" >&2
  exit 1
fi

destination="$backup_root/$timestamp"
mkdir -p "$backup_root"
staging="$(mktemp -d "$backup_root/.staging-$timestamp-XXXXXX")"
completed=0
cleanup() {
  rm -rf -- "$staging"
  if (( completed == 0 )); then
    rm -rf -- "$destination"
  fi
}
trap cleanup EXIT

umask 077
mkdir -p \
  "$destination" \
  "$staging/database" \
  "$staging/uploads" \
  "$staging/config/caddy" \
  "$staging/config/docker" \
  "$staging/config/systemd/repository" \
  "$staging/config/systemd/installed" \
  "$staging/config/cron" \
  "$staging/config/runtime" \
  "$staging/project" \
  "$staging/secrets"

docker compose config --quiet
docker compose exec -T postgres pg_dump \
  --username "$postgres_user" \
  --dbname "$postgres_db" \
  --format custom \
  --no-owner \
  --no-privileges > "$staging/database/blog.dump"

if [[ -d "$data_root/uploads" ]]; then
  tar -C "$data_root" -cf - uploads | zstd -q -T0 -10 -o "$staging/uploads/uploads.tar.zst"
fi

cp docker-compose.yml "$staging/config/docker/"
cp .env.example "$staging/config/docker/"
cp Caddyfile "$staging/config/caddy/"
cp deploy/systemd/* "$staging/config/systemd/repository/"

for unit in /etc/systemd/system/corner-*.service /etc/systemd/system/corner-*.timer /etc/systemd/system/corner-*.path; do
  [[ -f "$unit" ]] && sudo -n cp -- "$unit" "$staging/config/systemd/installed/"
done
sudo -n chown -R "$(id -u):$(id -g)" "$staging/config/systemd/installed"

crontab -l > "$staging/config/cron/ubuntu.crontab" 2>/dev/null || true
sudo -n cp /etc/crontab "$staging/config/cron/etc-crontab" 2>/dev/null || true
if [[ -d /etc/cron.d ]]; then
  sudo -n tar -C /etc -cf - cron.d | tar -C "$staging/config/cron" -xf -
fi
sudo -n chown -R "$(id -u):$(id -g)" "$staging/config/cron"

docker version > "$staging/config/runtime/docker-version.txt"
docker compose version > "$staging/config/runtime/docker-compose-version.txt"
docker compose ps --all > "$staging/config/runtime/compose-services.txt"
docker compose images > "$staging/config/runtime/compose-images.txt"
uname -a > "$staging/config/runtime/uname.txt"
if [[ -f /etc/os-release ]]; then cp /etc/os-release "$staging/config/runtime/os-release"; fi
for runtime in node npm php java; do
  if command -v "$runtime" >/dev/null 2>&1; then
    "$runtime" --version > "$staging/config/runtime/$runtime-version.txt" 2>&1 || true
  else
    printf '%s\n' 'not installed on host' > "$staging/config/runtime/$runtime-version.txt"
  fi
done

git rev-parse HEAD > "$staging/project/git-commit.txt"
git status --short > "$staging/project/git-status.txt"
git remote -v > "$staging/project/git-remotes.txt"
git bundle create "$staging/project/corner-source.bundle" --all

secret_paths=()
for secret_path in \
  "$project_dir/.env" \
  "/srv/corner/dev-data/.env" \
  "/home/ubuntu/.ssh" \
  "$data_root/caddy/data" \
  "$data_root/caddy/config"; do
  if [[ -e "$secret_path" ]]; then
    secret_paths+=("${secret_path#/}")
  fi
done
if (( ${#secret_paths[@]} == 0 )); then
  echo "No secret assets were found" >&2
  exit 1
fi
sudo -n tar -C / -cf - "${secret_paths[@]}" \
  | openssl enc -aes-256-cbc -salt -pbkdf2 -iter 600000 \
      -pass env:BACKUP_ENCRYPTION_KEY \
      -out "$staging/secrets/secrets.tar.enc"

jq -n \
  --arg createdAt "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
  --arg backupId "$timestamp" \
  --arg gitCommit "$(cat "$staging/project/git-commit.txt")" \
  --arg database "database/blog.dump" \
  --arg uploads "$(if [[ -f "$staging/uploads/uploads.tar.zst" ]]; then echo uploads/uploads.tar.zst; fi)" \
  --arg secrets "secrets/secrets.tar.enc" \
  '{
    version: 2,
    backupId: $backupId,
    createdAt: $createdAt,
    gitCommit: $gitCommit,
    contents: {
      database: $database,
      uploads: (if ($uploads | length) > 0 then $uploads else null end),
      config: "config/",
      project: "project/corner-source.bundle",
      encryptedSecrets: $secrets
    },
    encryption: {
      algorithm: "AES-256-CBC",
      keyDerivation: "PBKDF2-SHA256",
      iterations: 600000
    }
  }' > "$staging/manifest.json"

(
  cd "$staging"
  find . -type f ! -name SHA256SUMS -print0 \
    | sort -z \
    | xargs -0 sha256sum > SHA256SUMS
  sha256sum --check SHA256SUMS >/dev/null
)

tar -C "$staging" -cf - . | zstd -q -T0 -10 -o "$destination/$archive_name"
zstd -q -t "$destination/$archive_name"
(
  cd "$destination"
  sha256sum "$archive_name" > SHA256SUMS
  sha256sum --check SHA256SUMS >/dev/null
)

archive_bytes="$(stat -c '%s' "$destination/$archive_name")"
archive_human="$(du -h "$destination/$archive_name" | awk '{print $1}')"
database_human="$(du -h "$staging/database/blog.dump" | awk '{print $1}')"
uploads_human="0"
if [[ -f "$staging/uploads/uploads.tar.zst" ]]; then
  uploads_human="$(du -h "$staging/uploads/uploads.tar.zst" | awk '{print $1}')"
fi
mail_limit_bytes="$((max_mail_mb * 1024 * 1024))"
attach_archive=false
if (( archive_bytes <= mail_limit_bytes )); then attach_archive=true; fi
attachment_policy="仅发送报告"
if [[ "$attach_archive" == "true" ]]; then attachment_policy="包含归档附件"; fi

write_report() {
  cat > "$destination/backup-report.txt" <<EOF
风隅随笔生产备份报告

备份编号：$timestamp
完成时间（UTC）：$(date -u +%Y-%m-%dT%H:%M:%SZ)
Git 提交：$(cat "$staging/project/git-commit.txt")
完整归档：$archive_name（$archive_human）
数据库：$database_human
上传文件：$uploads_human
服务器路径：$destination
保留策略：$retention_days 天
完整性校验：内部文件与外部归档 SHA256 均通过
敏感资产：生产/开发环境变量、SSH 配置与密钥、Caddy 证书均已进入 AES-256 加密包
归档邮箱：$archive_email（${archive_mail_status:-待发送}）
通知邮箱：$notification_email（${notification_mail_status:-待发送}）
附件策略：上限 ${max_mail_mb}MB，本次$attachment_policy

恢复敏感资产必须使用独立保管的 BACKUP_ENCRYPTION_KEY。后台恢复只处理数据库和上传文件，不会覆盖服务器 SSH、证书或系统配置。
EOF
}

send_report() {
  local recipient="$1"
  local attachment="${2:-}"
  local args=(/backup/backup-report.txt)
  [[ -n "$attachment" ]] && args+=("/backup/$attachment")
  docker compose run --rm --no-deps \
    -e BACKUP_EMAIL_TO="$recipient" \
    -v "$destination:/backup:ro" \
    backend node dist/scripts/send-backup-email.js "${args[@]}"
}

archive_mail_status="已跳过"
notification_mail_status="已跳过"
write_report
if [[ "${SKIP_BACKUP_EMAIL:-0}" != "1" ]]; then
  archive_attachment=""
  if [[ "$attach_archive" == "true" ]]; then archive_attachment="$archive_name"; fi
  if send_report "$archive_email" "$archive_attachment"; then
    archive_mail_status="发送成功"
  else
    archive_mail_status="发送失败"
  fi
  write_report
  if send_report "$notification_email"; then
    notification_mail_status="发送成功"
  else
    notification_mail_status="发送失败"
  fi
fi
write_report

jq -n \
  --arg backupId "$timestamp" \
  --arg createdAt "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
  --arg archive "$archive_name" \
  --argjson archiveBytes "$archive_bytes" \
  --arg sha256 "$(awk '{print $1}' "$destination/SHA256SUMS")" \
  --arg gitCommit "$(cat "$staging/project/git-commit.txt")" \
  --arg archiveEmail "$archive_email" \
  --arg archiveMailStatus "$archive_mail_status" \
  --arg notificationEmail "$notification_email" \
  --arg notificationMailStatus "$notification_mail_status" \
  --argjson attached "$attach_archive" \
  --argjson mailLimitMb "$max_mail_mb" \
  '{
    version: 2,
    backupId: $backupId,
    createdAt: $createdAt,
    status: "completed",
    archive: $archive,
    archiveBytes: $archiveBytes,
    sha256: $sha256,
    gitCommit: $gitCommit,
    encryptedSecrets: true,
    email: {
      archive: { recipient: $archiveEmail, status: $archiveMailStatus, attached: $attached },
      notification: { recipient: $notificationEmail, status: $notificationMailStatus },
      attachmentLimitMb: $mailLimitMb
    }
  }' > "$destination/manifest.json"

find "$backup_root" -mindepth 1 -maxdepth 1 -type d \
  -mmin "+$((retention_days * 1440))" -print -exec rm -rf -- {} +

completed=1
echo "$destination"
