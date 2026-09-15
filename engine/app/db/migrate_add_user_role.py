"""
One-off migration: adds User.role (see schema.py) to an already-existing
users table, and drops the NOT NULL constraint on Prediction.upload_id (a
prediction may not always come from an uploaded file). Existing rows/behavior
are unaffected either way.

Run once: docker compose exec api python -m app.db.migrate_add_user_role
"""

from sqlalchemy import text

from app.db.database import engine


def migrate():
    with engine.begin() as conn:
        conn.execute(
            text(
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR NOT NULL DEFAULT 'school'"
            )
        )
        conn.execute(text("ALTER TABLE predictions ALTER COLUMN upload_id DROP NOT NULL"))
    print("Migration complete.")


if __name__ == "__main__":
    migrate()
