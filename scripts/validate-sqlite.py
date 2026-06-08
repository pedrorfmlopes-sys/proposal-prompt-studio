#!/usr/bin/env python3
"""Validate the Proposal Prompt Studio SQLite schema and seed data."""

from __future__ import annotations

import sqlite3
import sys
import tempfile
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DATABASE_DIR = ROOT / "database"
SCHEMA_PATH = DATABASE_DIR / "schema.sql"
SEED_PATH = DATABASE_DIR / "seed.sql"

EXPECTED_SEED_COUNTS = {
    "app_settings": 9,
    "brands": 5,
    "layouts": 3,
    "pricing_rules": 4,
}


def read_sql(path: Path) -> str:
    if not path.exists():
        raise AssertionError(f"Missing SQL file: {path}")
    return path.read_text(encoding="utf-8")


def assert_count(conn: sqlite3.Connection, table: str, expected: int) -> None:
    actual = conn.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0]
    if actual != expected:
        raise AssertionError(
            f"Expected {expected} rows in {table}, found {actual}"
        )


def validate_line_total_trigger(conn: sqlite3.Connection) -> None:
    conn.execute("INSERT INTO clients(name) VALUES (?)", ("Cliente Teste",))
    conn.execute(
        """
        INSERT INTO proposals(proposal_number, title, client_id)
        VALUES (?, ?, ?)
        """,
        ("PROP-2026-001", "Proposta de teste", 1),
    )

    conn.execute(
        """
        INSERT INTO proposal_items(
            proposal_id,
            reference,
            quantity,
            final_unit_price,
            line_total
        )
        VALUES (?, ?, ?, ?, ?)
        """,
        (1, "F3121WLX8CR", 220, 61.57, 13545.40),
    )

    valid_count = conn.execute(
        "SELECT COUNT(*) FROM proposal_items WHERE reference = ?",
        ("F3121WLX8CR",),
    ).fetchone()[0]
    if valid_count != 1:
        raise AssertionError("Valid proposal item was not inserted")

    try:
        conn.execute(
            """
            INSERT INTO proposal_items(
                proposal_id,
                reference,
                quantity,
                final_unit_price,
                line_total
            )
            VALUES (?, ?, ?, ?, ?)
            """,
            (1, "INVALID-TOTAL", 2, 10, 19),
        )
    except sqlite3.IntegrityError as exc:
        message = str(exc)
        if "line_total must equal" not in message:
            raise AssertionError(
                f"Invalid row failed for an unexpected reason: {message}"
            ) from exc
    else:
        raise AssertionError("Invalid proposal item total was accepted")


def validate() -> None:
    schema_sql = read_sql(SCHEMA_PATH)
    seed_sql = read_sql(SEED_PATH)

    with tempfile.TemporaryDirectory() as temp_dir:
        db_path = Path(temp_dir) / "validation.sqlite"
        conn = sqlite3.connect(db_path)
        try:
            conn.execute("PRAGMA foreign_keys = ON")
            conn.executescript(schema_sql)
            conn.executescript(seed_sql)

            for table, expected in EXPECTED_SEED_COUNTS.items():
                assert_count(conn, table, expected)

            validate_line_total_trigger(conn)
        finally:
            conn.close()


def main() -> int:
    try:
        validate()
    except Exception as exc:
        print(f"SQLite validation failed: {exc}", file=sys.stderr)
        return 1

    print("SQLite validation passed.")
    print("Seed counts:")
    for table, expected in EXPECTED_SEED_COUNTS.items():
        print(f"- {table}: {expected}")
    print("Line total trigger: valid row accepted, invalid row rejected.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
