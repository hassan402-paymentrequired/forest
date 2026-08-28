"""
Signup / login endpoints. Issues a JWT on successful login,
which the frontend attaches to future requests as a Bearer token.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user
from app.auth.pydantic_models import UserSignup, UserLogin, TokenResponse, UserMeResponse
from app.auth.security import hash_password, verify_password, create_access_token
from app.db.database import get_db
from app.db.schema import User

router = APIRouter()


@router.post("/signup", response_model=TokenResponse)
def signup(payload: UserSignup, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(
        name=payload.name,
        email=payload.email,
        hashed_password=hash_password(payload.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token({"sub": str(user.id)})
    return TokenResponse(access_token=token)


@router.get("/me", response_model=UserMeResponse)
def me(current_user: User = Depends(get_current_user)):
    return current_user


@router.post("/login", response_model=TokenResponse)
def login(payload: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )

    token = create_access_token({"sub": str(user.id)})
    return TokenResponse(access_token=token)
