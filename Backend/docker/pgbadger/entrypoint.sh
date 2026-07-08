#!/usr/bin/env bash
set -e

echo "pgBadger report generator starting..."
echo "Log source: /var/log/postgresql"
echo "Reports output: /var/www/pgbadger"

# Generate an initial report on startup if logs exist
if ls /var/log/postgresql/postgresql-*.log 1>/dev/null 2>&1; then
    echo "Generating initial report from existing logs..."
    /usr/local/bin/generate-report.sh incremental
else
    echo "No logs found yet — reports will generate once PostgreSQL produces logs."
fi

exec "$@"
