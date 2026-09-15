"""
Dependency that protects routes — extracts and validates the JWT
from the Authorization header, then loads the matching user from the DB.
"""

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.auth.security import decode_access_token
from app.db.database import get_db
from app.db.schema import User

# HTTPBearer (not OAuth2PasswordBearer) since our /auth/login takes a JSON
# body {email, password}, not the OAuth2 spec's form-encoded username/password —
# this just needs Swagger to offer a plain "paste your token" field.
bearer_scheme = HTTPBearer()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    token = credentials.credentials
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    payload = decode_access_token(token)
    if payload is None:
        raise credentials_exception

    user_id = payload.get("sub")
    if user_id is None:
        raise credentials_exception

    user = db.query(User).filter(User.id == int(user_id)).first()
    if user is None:
        raise credentials_exception

    return user


def require_ministry(current_user: User = Depends(get_current_user)) -> User:
    """Gate for Ministry-only routes — see app/routes/ministry_routes.py.
    Ministry accounts are never self-serve; see app/scripts/create_ministry_user.py."""
    if current_user.role != "ministry":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Ministry access only",
        )
    return current_user
