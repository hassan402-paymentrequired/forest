"""
Signup / login endpoints. Issues a JWT on successful login,
which the frontend attaches to future requests as a Bearer token.
"""

import os
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user
from app.auth.pydantic_models import (
    ForgotPasswordRequest,
    ForgotPasswordResponse,
    ResetPasswordRequest,
    UserSignup,
    UserLogin,
    TokenResponse,
    UserMeResponse,
)
from app.auth.security import hash_password, verify_password, create_access_token
from app.db.database import get_db
from app.db.schema import User
from app.email.send import send_password_reset_email

router = APIRouter()

RESET_TOKEN_EXPIRE_MINUTES = 30


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


@router.post("/forgot-password", response_model=ForgotPasswordResponse)
def forgot_password(payload: ForgotPasswordRequest, db: Session = Depends(get_db)):
    """
    Always returns the same generic response whether or not the email is
    registered — standard practice, avoids leaking which emails have
    accounts. The actual token/email only happen if a matching user exists.
    """
    user = db.query(User).filter(User.email == payload.email).first()
    if user is not None:
        user.reset_token = secrets.token_urlsafe(32)
        user.reset_token_expires_at = datetime.now(timezone.utc) + timedelta(
            minutes=RESET_TOKEN_EXPIRE_MINUTES
        )
        db.commit()

        frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
        reset_link = f"{frontend_url}/auth/reset-password?token={user.reset_token}"
        send_password_reset_email(user.email, reset_link)

    return ForgotPasswordResponse()


@router.post("/reset-password", response_model=TokenResponse)
def reset_password(payload: ResetPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.reset_token == payload.token).first()

    if user is None or user.reset_token_expires_at is None:
        raise HTTPException(status_code=400, detail="Invalid or expired reset link")

    expires_at = user.reset_token_expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Invalid or expired reset link")

    user.hashed_password = hash_password(payload.new_password)
    # One-time use — clear the token so it can't be reused.
    user.reset_token = None
    user.reset_token_expires_at = None
    db.commit()

    # Auto-login after a successful reset, matching signup/login's behavior.
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
