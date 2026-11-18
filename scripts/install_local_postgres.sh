#!/usr/bin/env bash
# ============================================================================
# LeftBehind — throwaway local PostgreSQL + PostGIS for schema verification
#
# Supabase's CLI needs Docker, which is unavailable in restricted environments.
# This script builds an equivalent-enough cluster from Ubuntu packages without
# root: it resolves the dependency tree with a writable apt state directory,
# extracts the .debs into .pgstack/root, runs initdb as the current user and
# starts a server on a non-default port.
#
#   scripts/install_local_postgres.sh
#   scripts/local_db.sh start
#
# What this is NOT: a Supabase replacement. Auth, Storage and Realtime are
# stubbed by backend/supabase/tests/00_shims.sql. Use the real CLI wherever
# Docker is available.
# ============================================================================
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
STACK="${PGSTACK:-$ROOT/.pgstack}"
PG_MAJOR=16
SUITE=noble

say() { printf '%s\n' "$*"; }
die() { printf 'error: %s\n' "$*" >&2; exit 1; }

if [ -x "$STACK/root/usr/lib/postgresql/$PG_MAJOR/bin/initdb" ]; then
  say "already installed in $STACK"
  exit 0
fi

command -v apt-get >/dev/null || die "apt-get is required to fetch PostgreSQL"
command -v dpkg    >/dev/null || die "dpkg is required to extract packages"
[ "$(id -u)" -ne 0 ] || die "run as a normal user; this intentionally does not install system-wide"

mkdir -p "$STACK"/{lists,archives,etc,root,run}
mkdir -p "$STACK/cache/archives/partial"

cat > "$STACK/etc/sources.list" <<EOF
deb http://archive.ubuntu.com/ubuntu $SUITE main universe
deb http://archive.ubuntu.com/ubuntu $SUITE-updates main universe
EOF

APTOPT=(
  -o "Dir::State::lists=$STACK/lists"
  -o "Dir::Cache=$STACK/cache"
  -o "Dir::Etc::sourcelist=$STACK/etc/sources.list"
  -o "Dir::Etc::sourceparts=/dev/null"
  -o "Dir::State::status=/dev/null"
  -o "Debug::NoLocking=1"
  -o "APT::Get::List-Cleanup=0"
  -o "Dpkg::Use-Pty=0"
)

say "resolving package lists…"
apt-get "${APTOPT[@]}" update >/dev/null

say "downloading postgresql-$PG_MAJOR + postgis (this is a few hundred MB)…"
apt-get "${APTOPT[@]}" --yes -d install \
  "postgresql-$PG_MAJOR" "postgresql-$PG_MAJOR-postgis-3" "postgresql-client-$PG_MAJOR" >/dev/null

say "extracting into $STACK/root…"
for deb in "$STACK"/cache/archives/*.deb; do
  dpkg -x "$deb" "$STACK/root"
done

say "normalising extension control files…"
# Ubuntu ships the PostGIS control file as `postgis-3.control`, while the
# extension is universally created as `postgis`. Alias it so migrations written
# for Supabase (and every other platform) work unchanged.
EXTDIR="$STACK/root/usr/share/postgresql/$PG_MAJOR/extension"
if [ -f "$EXTDIR/postgis-3.control" ] && [ ! -f "$EXTDIR/postgis.control" ]; then
  cp "$EXTDIR/postgis-3.control" "$EXTDIR/postgis.control"
fi

say "initialising cluster…"
export LD_LIBRARY_PATH="$STACK/root/usr/lib/x86_64-linux-gnu:${LD_LIBRARY_PATH:-}"
"$STACK/root/usr/lib/postgresql/$PG_MAJOR/bin/initdb" \
  -D "$STACK/data" -U postgres --encoding=UTF8 --locale=C.UTF-8 >/dev/null

say "done. Next: scripts/local_db.sh start && scripts/local_db.sh test"
