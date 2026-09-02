#!/usr/bin/env bash
set -Eeuo pipefail

# Only removes unused Docker build cache, images, containers and networks.
# Volumes are intentionally never pruned because they contain application data.
retention_hours="${DOCKER_CLEANUP_RETENTION_HOURS:-48}"
if ! [[ "$retention_hours" =~ ^[0-9]+$ ]] || (( retention_hours < 1 )); then
  echo "DOCKER_CLEANUP_RETENTION_HOURS must be a positive integer" >&2
  exit 1
fi
command -v docker >/dev/null 2>&1 || { echo "Required command is missing: docker" >&2; exit 1; }
filter="until=${retention_hours}h"
echo "Docker disk usage before cleanup:"
docker system df
docker builder prune --all --force --filter "$filter"
docker image prune --all --force --filter "$filter"
docker container prune --force --filter "$filter"
docker network prune --force --filter "$filter"
echo "Docker disk usage after cleanup:"
docker system df
