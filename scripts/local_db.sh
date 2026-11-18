#!/usr/bin/env bash
# ============================================================================
# LeftBehind — local database harness
#
#   scripts/local_db.sh start     start the throwaway cluster
#   scripts/local_db.sh stop      stop it
#   scripts/local_db.sh reset     recreate the database and apply every migration
#   scripts/local_db.sh demo      reset, then load the fictional demo seed
#   scripts/local_db.sh test      reset, load fixtures and run the assertion suites
#   scripts/local_db.sh psql      open a psql session on the test database
#
# Requires scripts/install_local_postgres.sh to have run once.
# ============================================================================
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
STACK="${PGSTACK:-$ROOT/.pgstack}"
PG_MAJOR=16
PGBIN="$STACK/root/usr/lib/postgresql/$PG_MAJOR/bin"
SOCK="$STACK/run"
PORT="${PGPORT:-55432}"
DB="${PGDATABASE:-leftbehind_test}"

[ -x "$PGBIN/psql" ] || { echo "error: run scripts/install_local_postgres.sh first" >&2; exit 1; }

export LD_LIBRARY_PATH="$STACK/root/usr/lib/x86_64-linux-gnu:${LD_LIBRARY_PATH:-}"
export PROJ_DATA="$STACK/root/usr/share/proj"
export PROJ_LIB="$STACK/root/usr/share/proj"

qs() { "$PGBIN/psql" -h "$SOCK" -p "$PORT" -U postgres -v ON_ERROR_STOP=1 -q "$@"; }
ap() { "$PGBIN/psql" -h "$SOCK" -p "$PORT" -U postgres -v ON_ERROR_STOP=1 -q -d "$DB" "$@"; }

start_cluster() {
  if "$PGBIN/pg_isready" -h "$SOCK" -p "$PORT" >/dev/null 2>&1; then
    return 0
  fi
  mkdir -p "$SOCK"
  "$PGBIN/pg_ctl" -D "$STACK/data" -l "$STACK/server.log" \
    -o "-p $PORT -k $SOCK -c listen_addresses=127.0.0.1 -c fsync=off" start >/dev/null
  for _ in $(seq 1 30); do
    "$PGBIN/pg_isready" -h "$SOCK" -p "$PORT" >/dev/null 2>&1 && return 0
    sleep 0.5
  done
  echo "error: cluster did not become ready; see $STACK/server.log" >&2
  exit 1
}

apply_migrations() {
  qs -d postgres -c "drop database if exists $DB" -c "create database $DB"
  ap -f "$ROOT/backend/supabase/tests/00_shims.sql"
  for migration in "$ROOT"/backend/supabase/migrations/*.sql; do
    echo "  migration $(basename "$migration")"
    ap -f "$migration"
  done
}

case "${1:-}" in
  start)
    start_cluster
    echo "cluster ready on $SOCK (port $PORT)"
    ;;
  stop)
    "$PGBIN/pg_ctl" -D "$STACK/data" stop >/dev/null 2>&1 || true
    echo "stopped"
    ;;
  reset)
    start_cluster
    apply_migrations
    ap -f "$ROOT/backend/supabase/seed/0001_reference.sql"
    echo "database $DB reset: shims + migrations + reference seed"
    ;;
  demo)
    start_cluster
    apply_migrations
    ap -f "$ROOT/backend/supabase/seed/0001_reference.sql"
    ap -c "set leftbehind.allow_demo_seed = 'on'" -f "$ROOT/backend/supabase/seed/dev_demo.sql"
    echo "database $DB reset and loaded with the fictional demo seed"
    ;;
  test)
    start_cluster
    apply_migrations
    ap -f "$ROOT/backend/supabase/seed/0001_reference.sql"
    ap -f "$ROOT/backend/supabase/tests/05_fixtures.sql"
    for suite in "$ROOT"/backend/supabase/tests/[1-9]*.sql; do
      echo "  suite $(basename "$suite")"
      ap -f "$suite"
    done

    echo
    "$PGBIN/psql" -h "$SOCK" -p "$PORT" -U postgres -d "$DB" -P pager=off -q \
      -c "select case when ok then 'PASS' else 'FAIL' end as result, name, detail
          from tests.results order by id"

    total=$("$PGBIN/psql" -h "$SOCK" -p "$PORT" -U postgres -d "$DB" -tA -c "select count(*) from tests.results")
    failed=$("$PGBIN/psql" -h "$SOCK" -p "$PORT" -U postgres -d "$DB" -tA -c "select count(*) from tests.results where not ok")
    echo
    echo "$((total - failed))/$total assertions passed"
    [ "$failed" -eq 0 ]
    ;;
  psql)
    start_cluster
    exec "$PGBIN/psql" -h "$SOCK" -p "$PORT" -U postgres -d "$DB"
    ;;
  *)
    sed -n '3,13p' "$0"
    exit 1
    ;;
esac
