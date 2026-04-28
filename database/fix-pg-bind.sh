#!/bin/bash
# ============================================================
# RoomLink — bulletproof PostgreSQL bind fix for WSL2
# ============================================================
# Makes Postgres listen on every interface so the .NET backend
# running on Windows can reach localhost:5432.
# Idempotent — safe to run as many times as you want.
# ============================================================
set -e

echo
echo "=== RoomLink — PostgreSQL bind fix ==="
echo

# Sudo upfront so it asks for the password once, then runs cleanly.
sudo -v

PGCONF=$(ls /etc/postgresql/*/main/postgresql.conf 2>/dev/null | head -1)
HBA=$(ls   /etc/postgresql/*/main/pg_hba.conf      2>/dev/null | head -1)

if [ -z "$PGCONF" ] || [ -z "$HBA" ]; then
    echo "ERROR: PostgreSQL config files not found. Is Postgres installed?"
    exit 1
fi

echo "  Config: $PGCONF"
echo "  HBA:    $HBA"
echo

# 1. Make sure the daemon is running
echo "[1/4] Starting PostgreSQL service..."
sudo service postgresql start || true
sleep 1

# 2. Force listen_addresses = '*' by APPENDING (Postgres uses the last
#    directive, so this wins regardless of what was there before).
echo "[2/4] Pinning listen_addresses = '*' ..."
# Strip every existing listen_addresses line first to avoid clutter.
sudo sed -i '/^[[:space:]]*#*[[:space:]]*listen_addresses[[:space:]]*=/d' "$PGCONF"
echo "listen_addresses = '*'" | sudo tee -a "$PGCONF" >/dev/null

# 3. Make sure pg_hba.conf accepts md5 from any IPv4
echo "[3/4] Allowing md5 auth from 0.0.0.0/0 ..."
if ! sudo grep -qE '^host[[:space:]]+all[[:space:]]+all[[:space:]]+0\.0\.0\.0/0' "$HBA"; then
    echo 'host    all             all             0.0.0.0/0               md5' | sudo tee -a "$HBA" >/dev/null
fi

# 4. Hard restart and verify
echo "[4/4] Restarting PostgreSQL ..."
sudo service postgresql restart
sleep 2

echo
echo "=== Verification ==="
echo "  listen_addresses now set to:"
sudo grep -E '^[[:space:]]*listen_addresses' "$PGCONF" | sed 's/^/    /'
echo "  Postgres bind:"
ss -ltn 'sport = :5432' 2>/dev/null | tail -n +2 | sed 's/^/    /'
echo "  Connection test:"
if PGPASSWORD=postgres psql -U postgres -h localhost -c 'SELECT 1' >/dev/null 2>&1; then
    echo "    OK"
else
    echo "    FAILED — check logs with: journalctl -u postgresql -n 30"
    exit 1
fi
echo
echo "Done. Now run start-demo.bat from Windows."
echo
