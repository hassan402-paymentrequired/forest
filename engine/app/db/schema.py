"""
Database tables: users, uploads, predictions.
Run create_tables() once on startup (or via a migration tool later) to create these.

Note: "users" here represents schools (the account holders), named generically
in case other account types get added later.
"""

from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Text, JSON
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
    input_features = Column(JSON, nullable=True)  # cleaned STANDARD_COLUMNS row(s) that produced this prediction
    prediction_output = Column(Text, nullable=False)
    recommendation_text = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class ChatThread(Base):
    __tablename__ = "chat_threads"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True, index=True)
    thread_id = Column(Integer, ForeignKey("chat_threads.id"), nullable=False)
    role = Column(String, nullable=False)  # "user" | "assistant" | "system"
    content = Column(Text, nullable=False)
    experimental_attachments = Column(JSON, nullable=True)  # Zola's Attachment[] shape: [{name, contentType, url}]
    prediction_id = Column(Integer, ForeignKey("predictions.id"), nullable=True)
    message_group_id = Column(String, nullable=True)  # groups edit/regenerate variants of the same turn
    created_at = Column(DateTime(timezone=True), server_default=func.now())


def create_tables():
    """Call this once (e.g. from a setup script) to create all tables."""
    Base.metadata.create_all(bind=engine)
