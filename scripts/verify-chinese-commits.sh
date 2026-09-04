#!/usr/bin/env bash
set -Eeuo pipefail

before="${1:-}"
after="${2:-HEAD}"
if [[ -n "$before" && "$before" != 0000000000000000000000000000000000000000 ]]; then
  range="$before..$after"
else
  range="$after"
fi

failed=false
while IFS=$'\t' read -r sha subject; do
  [[ -z "$sha" ]] && continue
  if ! grep -Pq '\p{Han}' <<< "$subject"; then
    printf '提交 %s 的说明必须包含中文：%s\n' "${sha:0:12}" "$subject" >&2
    failed=true
  fi
done < <(git log --no-merges --pretty=format:'%H%x09%s' "$range")

if [[ "$failed" == true ]]; then
  echo '请将提交说明改为清晰的中文描述后再推送。' >&2
  exit 1
fi
