"""
One-off script: creates a Ministry-role account. There is no self-serve
signup for this role (see app/routes/auth_routes.py's signup — it never
accepts a role field) — this script is the only way a "ministry" user gets
created, matching this project's existing manual-script culture (retrain.py,
the migrate_*.py scripts).

Run once per Ministry official needing access:
  docker compose exec api python -m app.auth.create_ministry_user <name> <email> <password>
"""

import sys

from app.auth.security import hash_password
from app.db.database import SessionLocal
from app.db.schema import User


def create_ministry_user(name: str, email: str, password: str) -> User:
    db = SessionLocal()
    try:
        existing = db.query(User).filter(User.email == email).first()
        if existing:
            raise ValueError(f"Email already registered: {email}")

        user = User(
            name=name,
            email=email,
            hashed_password=hash_password(password),
            role="ministry",
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        return user
    finally:
        db.close()


if __name__ == "__main__":
    if len(sys.argv) != 4:
        print("Usage: python -m app.auth.create_ministry_user <name> <email> <password>")
        sys.exit(1)

    _, name, email, password = sys.argv
    user = create_ministry_user(name, email, password)
    print(f"Created ministry user: id={user.id} email={user.email}")
