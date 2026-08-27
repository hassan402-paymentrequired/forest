"""
Database tables: users, uploads, predictions.
Run create_tables() once on startup (or via a migration tool later) to create these.

Note: "users" here represents schools (the account holders), named generically
in case other account types get added later.
"""

from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Text
from sqlalchemy.sql import func

from app.db.database import Base, engine


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False, index=True)
    hashed_password = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Upload(Base):
    __tablename__ = "uploads"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    file_path = Column(String, nullable=False)
    upload_date = Column(DateTime(timezone=True), server_default=func.now())


class Prediction(Base):
    __tablename__ = "predictions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    upload_id = Column(Integer, ForeignKey("uploads.id"), nullable=False)
    prediction_output = Column(Text, nullable=False)
    recommendation_text = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


def create_tables():
    """Call this once (e.g. from a setup script) to create all tables."""
    Base.metadata.create_all(bind=engine)
