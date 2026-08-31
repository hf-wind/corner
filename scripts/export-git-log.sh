#!/usr/bin/env bash
set -Eeuo pipefail

project_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$project_dir"

# The production image deliberately contains no .git directory. Export a
# complete, immutable view of the checked-out history before Docker builds it.
output="$project_dir/backend/.runtime-git-log"
temporary="$(mktemp "$output.XXXXXX")"
cleanup() { rm -f -- "$temporary"; }
trap cleanup EXIT

git log -n 240 \
  --date=iso-strict \
  --pretty=format:'%H%x09%aI%x09%an%x09%s' > "$temporary"

if [[ ! -s "$temporary" ]]; then
  echo "Unable to export Git history: the repository has no commits" >&2
  exit 1
fi

chmod 0644 "$temporary"
mv -f -- "$temporary" "$output"
trap - EXIT
echo "Exported Git history to $output"
