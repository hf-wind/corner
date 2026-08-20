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

data_root="$(realpath -m "${DATA_ROOT:-$project_dir/data}")"
backup_root="$(realpath -m "${BACKUP_ROOT:-$project_dir/backups}")"
control_root="$(realpath -m "${BACKUP_CONTROL_ROOT:-$data_root/backup-control}")"
mkdir -p "$control_root"

exec 9>"$control_root/control.lock"
flock -n 9 || exit 0

write_result() {
  local action="$1"
  local status="$2"
  local message="$3"
  local backup_id="${4:-}"
  local temporary="$control_root/last-result.json.tmp"
  jq -n \
    --arg action "$action" \
    --arg status "$status" \
    --arg message "$message" \
    --arg backupId "$backup_id" \
    --arg finishedAt "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
    '{ action: $action, status: $status, message: $message, backupId: $backupId, finishedAt: $finishedAt }' \
    > "$temporary"
  mv "$temporary" "$control_root/last-result.json"
}

if [[ -f "$control_root/backup.request" ]]; then
  mv "$control_root/backup.request" "$control_root/backup.processing"
  write_result backup running "正在生成完整服务器备份"
  if output="$("$project_dir/scripts/backup.sh" 2>&1)"; then
    backup_id="$(basename "$(printf '%s\n' "$output" | tail -n 1)")"
    write_result backup completed "完整服务器备份已完成" "$backup_id"
  else
    write_result backup failed "备份失败，请查看 corner-backup-control.service 日志"
    printf '%s\n' "$output" >&2
  fi
  rm -f -- "$control_root/backup.processing"
fi

if [[ -f "$control_root/restore.request" ]]; then
  mv "$control_root/restore.request" "$control_root/restore.processing"
  backup_id="$(jq -r '.backupId // empty' "$control_root/restore.processing")"
  if ! [[ "$backup_id" =~ ^[0-9]{8}T[0-9]{6}Z$ ]]; then
    write_result restore failed "恢复请求中的备份编号无效" "$backup_id"
    rm -f -- "$control_root/restore.processing"
    exit 1
  fi
  backup_dir="$(realpath -m "$backup_root/$backup_id")"
  if [[ "$backup_dir" != "$backup_root/$backup_id" || ! -d "$backup_dir" ]]; then
    write_result restore failed "指定备份不存在" "$backup_id"
    rm -f -- "$control_root/restore.processing"
    exit 1
  fi

  write_result restore running "正在创建恢复前备份" "$backup_id"
  if ! pre_restore_output="$("$project_dir/scripts/backup.sh" 2>&1)"; then
    write_result restore failed "恢复前安全备份失败，已取消恢复" "$backup_id"
    printf '%s\n' "$pre_restore_output" >&2
    rm -f -- "$control_root/restore.processing"
    exit 1
  fi

  write_result restore running "安全备份完成，正在恢复数据库和上传文件" "$backup_id"
  if restore_output="$(CONFIRM_RESTORE=corner SKIP_PRE_RESTORE_BACKUP=1 "$project_dir/scripts/restore.sh" "$backup_dir" 2>&1)"; then
    write_result restore completed "数据恢复完成，服务健康检查已通过" "$backup_id"
  else
    write_result restore failed "数据恢复失败，请立即查看服务日志和恢复前备份" "$backup_id"
    printf '%s\n' "$restore_output" >&2
    rm -f -- "$control_root/restore.processing"
    exit 1
  fi
  rm -f -- "$control_root/restore.processing"
fi
