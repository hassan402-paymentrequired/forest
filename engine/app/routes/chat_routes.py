"""
Chat thread/message CRUD — the persistence layer behind the frontend's chat UI.
All routes are scoped to the current JWT-authenticated user; a thread belonging
to another user is treated as not found, not forbidden (avoids leaking existence).
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy.sql import func

from app.auth.dependencies import get_current_user
from app.chat.pydantic_models import (
    MessageCreate,
    MessageResponse,
    ThreadCreate,
    ThreadRename,
    ThreadResponse,
)
from app.db.database import get_db
from app.db.schema import ChatMessage, ChatThread, User

router = APIRouter()


def _get_owned_thread(db: Session, thread_id: int, user_id: int) -> ChatThread:
    thread = (
        db.query(ChatThread)
        .filter(ChatThread.id == thread_id, ChatThread.user_id == user_id)
        .first()
    )
    if thread is None:
        raise HTTPException(status_code=404, detail="Thread not found")
    return thread


@router.post("/threads", response_model=ThreadResponse)
def create_thread(
    payload: ThreadCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    thread = ChatThread(user_id=current_user.id, title=payload.title)
    db.add(thread)
    db.commit()
    db.refresh(thread)
    return thread


@router.get("/threads", response_model=list[ThreadResponse])
def list_threads(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return (
        db.query(ChatThread)
        .filter(ChatThread.user_id == current_user.id)
        .order_by(ChatThread.updated_at.desc())
        .all()
    )


@router.patch("/threads/{thread_id}", response_model=ThreadResponse)
def rename_thread(
    thread_id: int,
    payload: ThreadRename,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    thread = _get_owned_thread(db, thread_id, current_user.id)
    thread.title = payload.title
    db.commit()
    db.refresh(thread)
    return thread


@router.delete("/threads/{thread_id}", status_code=204)
def delete_thread(
    thread_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    thread = _get_owned_thread(db, thread_id, current_user.id)
    db.query(ChatMessage).filter(ChatMessage.thread_id == thread.id).delete()
    db.delete(thread)
    db.commit()


@router.get("/threads/{thread_id}/messages", response_model=list[MessageResponse])
def list_messages(
    thread_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _get_owned_thread(db, thread_id, current_user.id)
    return (
        db.query(ChatMessage)
        .filter(ChatMessage.thread_id == thread_id)
        .order_by(ChatMessage.created_at.asc())
        .all()
    )


@router.delete("/threads/{thread_id}/messages", status_code=204)
def clear_messages(
    thread_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Clears all messages in a thread without deleting the thread itself."""
    thread = _get_owned_thread(db, thread_id, current_user.id)
    db.query(ChatMessage).filter(ChatMessage.thread_id == thread.id).delete()
    db.commit()


@router.post("/threads/{thread_id}/messages", response_model=MessageResponse)
def create_message(
    thread_id: int,
    payload: MessageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    thread = _get_owned_thread(db, thread_id, current_user.id)

    message = ChatMessage(
        thread_id=thread.id,
        role=payload.role,
        content=payload.content,
        experimental_attachments=payload.experimental_attachments,
        prediction_id=payload.prediction_id,
    )
    db.add(message)

    thread.updated_at = func.now()

    db.commit()
    db.refresh(message)
    return message
