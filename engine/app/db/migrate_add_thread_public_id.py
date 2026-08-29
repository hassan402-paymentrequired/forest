"""
One-off migration: adds ChatThread.public_id (see schema.py) to an already-
existing chat_threads table and backfills it for any rows created before
this column existed. Safe to re-run — every step is guarded.

This project has no migration framework (no Alembic) — schema changes are
applied via create_tables() for brand-new tables, and via a manually-run
script like this one for existing tables that already have data.

Run once: docker compose exec api python -m app.db.migrate_add_thread_public_id
"""

import uuid

from sqlalchemy import text

from app.db.database import engine


def migrate():
    with engine.begin() as conn:
        conn.execute(text("ALTER TABLE chat_threads ADD COLUMN IF NOT EXISTS public_id UUID"))

        rows = conn.execute(text("SELECT id FROM chat_threads WHERE public_id IS NULL")).fetchall()
        for (row_id,) in rows:
            conn.execute(
                text("UPDATE chat_threads SET public_id = :pid WHERE id = :id"),
                {"pid": str(uuid.uuid4()), "id": row_id},
            )

        conn.execute(text("ALTER TABLE chat_threads ALTER COLUMN public_id SET NOT NULL"))
        conn.execute(
            text(
                "DO $$ BEGIN "
                "IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chat_threads_public_id_key') THEN "
                "ALTER TABLE chat_threads ADD CONSTRAINT chat_threads_public_id_key UNIQUE (public_id); "
                "END IF; END $$;"
            )
        )
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_chat_threads_public_id ON chat_threads (public_id)"))

    print(f"Migration complete. Backfilled {len(rows)} row(s).")


if __name__ == "__main__":
    migrate()
