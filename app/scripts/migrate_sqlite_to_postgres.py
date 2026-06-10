from __future__ import annotations

import argparse
import json
import sqlite3
from datetime import date, datetime
from pathlib import Path
from typing import Any

import psycopg
from dotenv import load_dotenv

from app.config import settings


EXCLUDED_TABLES = {"alembic_version", "sqlite_sequence"}


def _sqlite_tables(connection: sqlite3.Connection) -> list[str]:
    rows = connection.execute(
        """
        select name
        from sqlite_master
        where type = 'table'
          and name not like 'sqlite_%'
        order by name
        """
    ).fetchall()
    return [row[0] for row in rows if row[0] not in EXCLUDED_TABLES]


def _sqlite_columns(connection: sqlite3.Connection, table_name: str) -> list[str]:
    return [row[1] for row in connection.execute(f'pragma table_info("{table_name}")')]


def _postgres_tables(connection: psycopg.Connection[Any]) -> set[str]:
    rows = connection.execute(
        """
        select tablename
        from pg_tables
        where schemaname = 'public'
        """
    ).fetchall()
    return {row[0] for row in rows if row[0] not in EXCLUDED_TABLES}


def _postgres_columns(connection: psycopg.Connection[Any], table_name: str) -> set[str]:
    rows = connection.execute(
        """
        select column_name
        from information_schema.columns
        where table_schema = 'public'
          and table_name = %s
        """,
        (table_name,),
    ).fetchall()
    return {row[0] for row in rows}


def _postgres_column_types(connection: psycopg.Connection[Any], table_name: str) -> dict[str, tuple[str, str]]:
    rows = connection.execute(
        """
        select column_name, data_type, udt_name
        from information_schema.columns
        where table_schema = 'public'
          and table_name = %s
        """,
        (table_name,),
    ).fetchall()
    return {row[0]: (row[1], row[2]) for row in rows}


def _quote_identifier(name: str) -> str:
    return '"' + name.replace('"', '""') + '"'


def _placeholder(column_type: tuple[str, str]) -> str:
    data_type, udt_name = column_type
    if data_type == "USER-DEFINED":
        return f"%s::{_quote_identifier(udt_name)}"
    if data_type == "json":
        return "%s::json"
    if data_type == "jsonb":
        return "%s::jsonb"
    if data_type == "date":
        return "%s::date"
    if data_type.startswith("timestamp"):
        return "%s::timestamptz" if "time zone" in data_type else "%s::timestamp"
    return "%s"


def _convert_value(value: Any, column_type: tuple[str, str]) -> Any:
    if value is None:
        return None

    data_type, _ = column_type
    if data_type == "boolean":
        return bool(value)
    if data_type in {"json", "jsonb"}:
        if isinstance(value, str):
            return json.dumps(json.loads(value))
        return json.dumps(value)
    if data_type == "date" and isinstance(value, str):
        return date.fromisoformat(value)
    if data_type.startswith("timestamp") and isinstance(value, str):
        normalized = value.replace("Z", "+00:00")
        return datetime.fromisoformat(normalized)
    return value


def _copy_table(
    sqlite_connection: sqlite3.Connection,
    postgres_connection: psycopg.Connection[Any],
    table_name: str,
) -> int:
    sqlite_columns = _sqlite_columns(sqlite_connection, table_name)
    postgres_column_types = _postgres_column_types(postgres_connection, table_name)
    postgres_columns = set(postgres_column_types)
    columns = [column for column in sqlite_columns if column in postgres_columns]

    if not columns:
        return 0

    selected_columns = ", ".join(_quote_identifier(column) for column in columns)
    rows = sqlite_connection.execute(
        f"select {selected_columns} from {_quote_identifier(table_name)}"
    ).fetchall()

    if not rows:
        return 0

    insert_columns = ", ".join(_quote_identifier(column) for column in columns)
    placeholders = ", ".join(_placeholder(postgres_column_types[column]) for column in columns)
    converted_rows = [
        tuple(_convert_value(row[column], postgres_column_types[column]) for column in columns)
        for row in rows
    ]
    with postgres_connection.cursor() as cursor:
        cursor.executemany(
            f"insert into {_quote_identifier(table_name)} ({insert_columns}) values ({placeholders})",
            converted_rows,
        )
    return len(rows)


def _reset_sequences(connection: psycopg.Connection[Any], table_names: list[str]) -> None:
    for table_name in table_names:
        if "id" not in _postgres_columns(connection, table_name):
            continue

        sequence_row = connection.execute(
            "select pg_get_serial_sequence(%s, 'id')",
            (f"public.{table_name}",),
        ).fetchone()
        if sequence_row is None or sequence_row[0] is None:
            continue

        connection.execute(
            f"""
            select setval(
                %s,
                coalesce((select max(id) from {_quote_identifier(table_name)}), 1),
                (select count(*) > 0 from {_quote_identifier(table_name)})
            )
            """,
            (sequence_row[0],),
        )


def migrate(sqlite_path: Path, database_url: str) -> dict[str, int]:
    if not sqlite_path.exists():
        raise FileNotFoundError(f"SQLite database not found: {sqlite_path}")

    sqlite_connection = sqlite3.connect(sqlite_path)
    sqlite_connection.row_factory = sqlite3.Row

    with sqlite_connection:
        sqlite_table_names = _sqlite_tables(sqlite_connection)

    copied: dict[str, int] = {}

    with psycopg.connect(database_url) as postgres_connection:
        postgres_table_names = _postgres_tables(postgres_connection)
        table_names = [table for table in sqlite_table_names if table in postgres_table_names]

        with postgres_connection.transaction():
            postgres_connection.execute("set local session_replication_role = replica")
            truncated_tables = ", ".join(_quote_identifier(table_name) for table_name in table_names)
            if truncated_tables:
                postgres_connection.execute(f"truncate table {truncated_tables} restart identity cascade")

            for table_name in table_names:
                copied[table_name] = _copy_table(sqlite_connection, postgres_connection, table_name)

            _reset_sequences(postgres_connection, table_names)

    sqlite_connection.close()
    return copied


def main() -> None:
    parser = argparse.ArgumentParser(description="Copy all application data from SQLite to PostgreSQL.")
    parser.add_argument("--sqlite", default="app.db", help="Path to SQLite database file.")
    parser.add_argument(
        "--database-url",
        default=None,
        help="PostgreSQL SQLAlchemy/psycopg URL. Defaults to DATABASE_URL from .env/environment.",
    )
    args = parser.parse_args()

    load_dotenv()
    database_url = args.database_url or settings.database_url
    if not database_url.startswith(("postgresql://", "postgresql+psycopg://")):
        raise ValueError(f"DATABASE_URL must point to PostgreSQL, got: {database_url}")

    psycopg_url = database_url.replace("postgresql+psycopg://", "postgresql://", 1)
    copied = migrate(Path(args.sqlite), psycopg_url)

    for table_name, count in copied.items():
        print(f"{table_name}: {count}")


if __name__ == "__main__":
    main()
