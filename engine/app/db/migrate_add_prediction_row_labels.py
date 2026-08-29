"""
One-off migration: adds Prediction.row_labels (see schema.py) to an already-
existing predictions table. No backfill needed — old rows just get NULL,
same as any other prediction made before this field existed.

Run once: docker compose exec api python -m app.db.migrate_add_prediction_row_labels
"""

from sqlalchemy import text

from app.db.database import engine


def migrate():
    with engine.begin() as conn:
        conn.execute(text("ALTER TABLE predictions ADD COLUMN IF NOT EXISTS row_labels JSON"))
    print("Migration complete.")


if __name__ == "__main__":
    migrate()
