#!/usr/bin/env python3
"""Parse every .sql file in the repository with the real PostgreSQL grammar.

We cannot run a Postgres server in this workspace, so this is the strongest
local check available: `pglast` wraps libpg_query, the parser PostgreSQL itself
uses. It catches syntax errors, not semantic ones (missing tables, wrong types).

Usage:
    python3 -m venv .venv-sqlcheck
    .venv-sqlcheck/bin/pip install pglast
    .venv-sqlcheck/bin/python scripts/check_sql.py

Exit code is non-zero if any file fails to parse.
"""

from __future__ import annotations

import pathlib
import sys

try:
    import pglast
except ImportError:  # pragma: no cover - developer feedback only
    sys.exit("pglast is not installed. See the usage note in this file.")

ROOT = pathlib.Path(__file__).resolve().parent.parent
SKIP_DIRS = {"node_modules", "dist", "build", ".git", "dist-sdk54-check", ".pgstack"}


def sql_files() -> list[pathlib.Path]:
    files: list[pathlib.Path] = []
    for path in ROOT.rglob("*.sql"):
        relative = path.relative_to(ROOT)
        if any(part in SKIP_DIRS for part in relative.parts):
            continue
        # Tooling directories (.venv-sqlcheck, .pgstack, …) are never our SQL.
        if any(part.startswith(".") for part in relative.parts):
            continue
        files.append(path)
    return sorted(files)


def strip_psql_meta_commands(sql: str) -> str:
    """Test scripts are psql scripts: drop backslash commands before parsing.

    `pglast` implements the PostgreSQL grammar, which has no `\\echo`, so meta
    command lines would otherwise be reported as syntax errors.
    """
    return "\n".join(line for line in sql.splitlines() if not line.lstrip().startswith("\\"))


def main() -> int:
    failures = 0
    files = sql_files()
    for path in files:
        relative = path.relative_to(ROOT)
        try:
            pglast.parse_sql(strip_psql_meta_commands(path.read_text(encoding="utf-8")))
        except Exception as exc:  # noqa: BLE001 - report any parse failure
            failures += 1
            print(f"FAIL {relative}: {exc}")
        else:
            print(f"ok   {relative}")

    print(f"\n{len(files) - failures}/{len(files)} SQL files parsed")
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
