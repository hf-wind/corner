#!/usr/bin/env bash
set -Eeuo pipefail

project_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
env_file="$project_dir/.env"
incoming="$(mktemp)"
merged="$(mktemp)"
cleanup() { rm -f -- "$incoming" "$merged"; }
trap cleanup EXIT

cat > "$incoming"
touch "$env_file"
chmod 0600 "$env_file"

allowed='^(BAIDU_TRANSLATE_APP_ID|BAIDU_TRANSLATE_SECRET_KEY|BAIDU_TRANSLATE_API_KEY|CHANGELOG_GITHUB_TOKEN)='
if grep -Ev "$allowed|^$" "$incoming" | grep -q .; then
  echo "部署密钥包含不允许的变量" >&2
  exit 1
fi

grep -Ev "$allowed" "$env_file" > "$merged" || true
while IFS= read -r line; do
  [[ -z "$line" || "$line" == *= ]] && continue
  printf '%s\n' "$line" >> "$merged"
done < "$incoming"

chmod 0600 "$merged"
mv -f -- "$merged" "$env_file"
trap - EXIT
rm -f -- "$incoming"
