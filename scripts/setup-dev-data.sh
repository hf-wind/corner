#!/usr/bin/env bash
set -Eeuo pipefail

project_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
config_dir="${DEV_CONFIG_DIR:-/srv/corner/dev-data}"
env_file="$config_dir/.env"
data_root="$config_dir/data"

umask 077
mkdir -p "$config_dir" "$data_root/postgres" "$data_root/redis"

if [[ ! -f "$env_file" ]]; then
  postgres_password="$(openssl rand -hex 24)"
  redis_password="$(openssl rand -hex 24)"
  jwt_secret="$(openssl rand -hex 32)"
  seed_password="$(openssl rand -hex 16)"
  cat > "$env_file" <<EOF
DEV_POSTGRES_DB=corner_dev
DEV_POSTGRES_USER=corner_dev
DEV_POSTGRES_PASSWORD=$postgres_password
DEV_POSTGRES_PORT=15432
DEV_REDIS_PASSWORD=$redis_password
DEV_REDIS_PORT=16379
DEV_DATA_ROOT=$data_root
DEV_JWT_SECRET=$jwt_secret
DEV_SEED_ADMIN_PASSWORD=$seed_password
EOF
fi

chmod 600 "$env_file"
docker compose \
  --project-name corner-dev-data \
  --env-file "$env_file" \
  -f "$project_dir/docker-compose.dev-data.yml" \
  up -d --wait

echo "Independent development data services are ready on server loopback ports 15432 and 16379."
