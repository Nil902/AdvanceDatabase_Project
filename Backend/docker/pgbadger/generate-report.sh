#!/usr/bin/env bash
set -e

LOG_DIR="/var/log/postgresql"
REPORT_DIR="/var/www/pgbadger"
INCREMENTAL_DIR="/var/lib/pgbadger"

mkdir -p "$REPORT_DIR" "$INCREMENTAL_DIR"

MODE="${1:-incremental}"

case "$MODE" in
    incremental)
        # Hourly incremental report — fast, processes only new log entries
        pgbadger \
            --prefix '%t [%p]: user=%u,db=%d,app=%a,client=%h ' \
            --outdir "$REPORT_DIR" \
            --incremental \
            --last-parsed "$INCREMENTAL_DIR/last_parsed" \
            "$LOG_DIR"/postgresql-*.log 2>/dev/null || true
        ;;
    daily)
        # Full daily report for today's log
        TODAY=$(date +%Y-%m-%d)
        LOG_FILE="$LOG_DIR/postgresql-${TODAY}.log"
        if [ -f "$LOG_FILE" ]; then
            pgbadger \
                --prefix '%t [%p]: user=%u,db=%d,app=%a,client=%h ' \
                --outfile "$REPORT_DIR/report-${TODAY}.html" \
                "$LOG_FILE" 2>/dev/null || true
        fi
        # Keep an index of all reports
        pgbadger \
            --prefix '%t [%p]: user=%u,db=%d,app=%a,client=%h ' \
            --outdir "$REPORT_DIR" \
            --incremental \
            --last-parsed "$INCREMENTAL_DIR/last_parsed" \
            "$LOG_DIR"/postgresql-*.log 2>/dev/null || true
        ;;
    weekly)
        # Weekly summary covering last 7 days
        pgbadger \
            --prefix '%t [%p]: user=%u,db=%d,app=%a,client=%h ' \
            --outfile "$REPORT_DIR/report-weekly.html" \
            "$LOG_DIR"/postgresql-*.log 2>/dev/null || true
        ;;
esac

echo "[$(date)] pgBadger $MODE report generated."
