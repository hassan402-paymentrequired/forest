"""
One-off migration: adds User.reset_token / User.reset_token_expires_at (see
schema.py) to an already-existing users table. Safe to re-run — every step
is guarded. Same pattern as migrate_add_thread_public_id.py — no migration
framework (no Alembic) in this project.

Run once: docker compose exec api python -m app.db.migrate_add_reset_token_columns
"""

from sqlalchemy import text

from app.db.database import engine


def migrate():
    with engine.begin() as conn:
        conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token VARCHAR"))
        conn.execute(
            text("ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token_expires_at TIMESTAMPTZ")
        )
        conn.execute(
            text(
                "DO $$ BEGIN "
                "IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_reset_token_key') THEN "
                "ALTER TABLE users ADD CONSTRAINT users_reset_token_key UNIQUE (reset_token); "
                "END IF; END $$;"
            )
        )
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_users_reset_token ON users (reset_token)"))

    print("Migration complete.")


if __name__ == "__main__":
    migrate()
