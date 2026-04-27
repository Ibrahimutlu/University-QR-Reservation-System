#!/bin/bash
# One-time fix: make PostgreSQL inside WSL accept connections from
# Windows localhost. Binds to *all* interfaces and adds an md5-auth
# rule so the .NET backend on Windows can reach localhost:5432.
set -e

PGCONF=$(sudo find /etc/postgresql -name 'postgresql.conf' | head -1)
HBA=$(sudo find /etc/postgresql -name 'pg_hba.conf' | head -1)

echo "Config: $PGCONF"
echo "HBA:    $HBA"

# 1. Bind to all interfaces
sudo sed -i "s/^#\?listen_addresses.*/listen_addresses = '*'/" "$PGCONF"

# 2. Allow md5 auth from any IPv4 (only if not already there)
if ! sudo grep -qE '^host[[:space:]]+all[[:space:]]+all[[:space:]]+0\.0\.0\.0/0' "$HBA"; then
    echo 'host    all             all             0.0.0.0/0               md5' | sudo tee -a "$HBA" >/dev/null
fi

echo '--- Effective listen_addresses ---'
sudo grep '^listen_addresses' "$PGCONF"
echo '--- Last 3 lines of pg_hba.conf ---'
sudo tail -3 "$HBA"

echo '--- Restarting service ---'
sudo service postgresql restart
echo 'Restarted.'

echo '--- New bind ---'
ss -ltn 'sport = :5432'
