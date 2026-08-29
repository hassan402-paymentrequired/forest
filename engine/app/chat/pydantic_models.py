"""
Request/response shapes for chat thread/message endpoints.
"""

from datetime import datetime
from typing import Any

from pydantic import BaseModel

from app.ml.pydantic_models import PredictionResponse


class ThreadCreate(BaseModel):
    title: str | None = None


class ThreadRename(BaseModel):
    title: str


class ThreadResponse(BaseModel):
    id: int
    title: str | None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class MessageCreate(BaseModel):
    role: str
    content: str
    experimental_attachments: list[dict[str, Any]] | None = None
    prediction_id: int | None = None


class MessageResponse(BaseModel):
    id: int
    thread_id: int
    role: str
    content: str
    experimental_attachments: list[dict[str, Any]] | None
    prediction_id: int | None
    created_at: datetime

    class Config:
        from_attributes = True


class ChatRespondResponse(BaseModel):
    user_message: MessageResponse
    assistant_message: MessageResponse
    prediction: PredictionResponse | None = None
