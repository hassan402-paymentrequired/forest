"""
Chat thread/message CRUD — the persistence layer behind the frontend's chat UI.
All routes are scoped to the current JWT-authenticated user; a thread belonging
to another user is treated as not found, not forbidden (avoids leaking existence).
"""

import asyncio
import uuid

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.concurrency import run_in_threadpool
from fastapi.responses import StreamingResponse
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
from app.db.database import SessionLocal, get_db
from app.db.schema import ChatMessage, ChatThread, Prediction, User
from app.llm.generate import CHAT_FALLBACK_MESSAGE, stream_chat_reply
from app.llm.prompts import (
    RAW_DATA_CHAT_SYSTEM_PROMPT,
    build_prediction_context_block,
    build_raw_data_context_block,
)
from app.ml.pipeline import create_prediction_from_upload

router = APIRouter()


def _get_owned_thread(db: Session, public_id: uuid.UUID, user_id: int) -> ChatThread:
    thread = (
        db.query(ChatThread)
        .filter(ChatThread.public_id == public_id, ChatThread.user_id == user_id)
        .first()
    )
    if thread is None:
        raise HTTPException(status_code=404, detail="Thread not found")
    return thread


def _to_thread_response(thread: ChatThread) -> ThreadResponse:
    return ThreadResponse(
        id=thread.public_id,
        title=thread.title,
        created_at=thread.created_at,
        updated_at=thread.updated_at,
    )


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
    return _to_thread_response(thread)


@router.get("/threads", response_model=list[ThreadResponse])
def list_threads(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    threads = (
        db.query(ChatThread)
        .filter(ChatThread.user_id == current_user.id)
        .order_by(ChatThread.updated_at.desc())
        .all()
    )
    return [_to_thread_response(t) for t in threads]


@router.patch("/threads/{thread_id}", response_model=ThreadResponse)
def rename_thread(
    thread_id: uuid.UUID,
    payload: ThreadRename,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    thread = _get_owned_thread(db, thread_id, current_user.id)
    thread.title = payload.title
    db.commit()
    db.refresh(thread)
    return _to_thread_response(thread)


@router.delete("/threads/{thread_id}", status_code=204)
def delete_thread(
    thread_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    thread = _get_owned_thread(db, thread_id, current_user.id)
    db.query(ChatMessage).filter(ChatMessage.thread_id == thread.id).delete()
    db.delete(thread)
    db.commit()


@router.get("/threads/{thread_id}/messages", response_model=list[MessageResponse])
def list_messages(
    thread_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    thread = _get_owned_thread(db, thread_id, current_user.id)
    return (
        db.query(ChatMessage)
        .filter(ChatMessage.thread_id == thread.id)
        .order_by(ChatMessage.created_at.asc())
        .all()
    )


@router.delete("/threads/{thread_id}/messages", status_code=204)
def clear_messages(
    thread_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Clears all messages in a thread without deleting the thread itself."""
    thread = _get_owned_thread(db, thread_id, current_user.id)
    db.query(ChatMessage).filter(ChatMessage.thread_id == thread.id).delete()
    db.commit()


@router.post("/threads/{thread_id}/messages", response_model=MessageResponse)
def create_message(
    thread_id: uuid.UUID,
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


@router.post("/threads/{thread_id}/respond")
async def respond(
    thread_id: uuid.UUID,
    content: str = Form(""),
    prediction_id: int | None = Form(None),
    file: UploadFile | None = File(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    The one route that actually talks to the LLM: stores the user's message
    (optionally attaching a file, which runs the same clean->predict pipeline
    as /predict/upload, or referencing an existing prediction), then streams
    a reply grounded in that prediction plus thread history.

    Everything up to building context_block/system_prompt is synchronous
    (file I/O, pandas, a blocking LLM call for the recommendation, DB
    queries) and runs via run_in_threadpool rather than directly on this
    async route's event loop — otherwise it would block every other
    concurrent request on this process for as long as that work takes
    (measured up to ~56s for a large file's recommendation call). Only the
    final streaming step needs to be genuinely async (see stream_chat_reply's
    docstring for why).
    """
    prepared = await run_in_threadpool(
        _prepare_respond, thread_id, content, prediction_id, file, db, current_user
    )
    history, context_block, system_prompt, thread_id_value, prediction_id_value = prepared

    async def generate_and_persist():
        chunks = []
        stream_kwargs = {"context_block": context_block}
        if system_prompt is not None:
            stream_kwargs["system_prompt"] = system_prompt

        try:
            async for delta in stream_chat_reply(history, **stream_kwargs):
                chunks.append(delta)
                yield delta
        finally:
            # Runs even if the client disconnects mid-stream — persists
            # whatever was generated so far rather than losing the turn
            # entirely. `chunks` may be a partial reply in that case.
            #
            # shield() matters here: on disconnect, this finally block is
            # itself running because the surrounding task was cancelled —
            # without shielding, the `await` below would immediately raise
            # CancelledError again (the task is still marked as cancelled)
            # before the persist ever ran, silently skipping it exactly
            # like the unshielded version did.
            await asyncio.shield(
                run_in_threadpool(_persist_assistant_reply, thread_id_value, prediction_id_value, chunks)
            )

    return StreamingResponse(generate_and_persist(), media_type="text/plain; charset=utf-8")


def _persist_assistant_reply(thread_id_value: int, prediction_id_value: int | None, chunks: list) -> None:
    full_text = "".join(chunks) or CHAT_FALLBACK_MESSAGE

    persist_db = SessionLocal()
    try:
        assistant_message = ChatMessage(
            thread_id=thread_id_value,
            role="assistant",
            content=full_text,
            prediction_id=prediction_id_value,
        )
        persist_db.add(assistant_message)
        persist_db.query(ChatThread).filter(ChatThread.id == thread_id_value).update(
            {"updated_at": func.now()}
        )
        persist_db.commit()
    finally:
        persist_db.close()


def _prepare_respond(
    thread_id: uuid.UUID,
    content: str,
    prediction_id: int | None,
    file: UploadFile | None,
    db: Session,
    current_user: User,
):
    """
    Everything synchronous that /respond needs before it can start
    streaming: validation, resolving grounding (file upload / prediction_id /
    carried-forward thread prediction), persisting the user message, and
    fetching history. Runs inside run_in_threadpool — see respond()'s
    docstring.
    """
    thread = _get_owned_thread(db, thread_id, current_user.id)

    # Swagger's multipart form can't send a true null for an optional number
    # field — an untouched prediction_id field submits as 0. Real IDs start at
    # 1, so treat 0 (and any other non-positive value) as "not provided."
    if not prediction_id:
        prediction_id = None

    if not content.strip() and file is None:
        raise HTTPException(status_code=400, detail="Provide a message or a file attachment")
    if file is not None and prediction_id is not None:
        raise HTTPException(
            status_code=400, detail="Provide either a file or a prediction_id, not both"
        )

    grounding_prediction = None
    new_predictions = None
    attachments = None
    insufficient_data_context = None  # (raw_df, unavailable_columns) when set

    if file is not None:
        try:
            result = create_prediction_from_upload(file, current_user, db)
        except FileNotFoundError as e:
            raise HTTPException(status_code=500, detail=str(e))

        if result.status == "insufficient_data":
            insufficient_data_context = (result.raw_df, result.unavailable_columns)
        else:
            grounding_prediction = result.prediction
            new_predictions = result.predictions

        attachments = [
            {"name": file.filename, "contentType": file.content_type, "url": None}
        ]
    elif prediction_id is not None:
        grounding_prediction = (
            db.query(Prediction)
            .filter(Prediction.id == prediction_id, Prediction.user_id == current_user.id)
            .first()
        )
        if grounding_prediction is None:
            raise HTTPException(status_code=404, detail="Prediction not found")
    else:
        # No new file/prediction_id this turn — if this thread has grounded a
        # reply in a prediction before, keep re-grounding follow-ups in it
        # rather than relying solely on the model's own (not always
        # faithful, especially on a small local model) restatement of the
        # data in earlier replies.
        last_grounded_message = (
            db.query(ChatMessage)
            .filter(ChatMessage.thread_id == thread.id, ChatMessage.prediction_id.isnot(None))
            .order_by(ChatMessage.created_at.desc())
            .first()
        )
        if last_grounded_message is not None:
            grounding_prediction = (
                db.query(Prediction)
                .filter(
                    Prediction.id == last_grounded_message.prediction_id,
                    Prediction.user_id == current_user.id,
                )
                .first()
            )

    # Captured as plain values before any further commits — the ORM objects
    # themselves aren't safe to touch inside generate_and_persist(), which
    # runs after this function returns, once FastAPI has already torn down
    # this request's `db` session.
    thread_id_value = thread.id
    prediction_id_value = grounding_prediction.id if grounding_prediction else None

    user_message = ChatMessage(
        thread_id=thread.id,
        role="user",
        content=content,
        experimental_attachments=attachments,
        prediction_id=prediction_id_value,
    )
    db.add(user_message)
    db.commit()
    db.refresh(user_message)

    history = (
        db.query(ChatMessage)
        .filter(ChatMessage.thread_id == thread.id)
        .order_by(ChatMessage.created_at.asc())
        .all()
    )

    if insufficient_data_context is not None:
        raw_df, unavailable_columns = insufficient_data_context
        context_block = build_raw_data_context_block(raw_df, unavailable_columns)
        system_prompt = RAW_DATA_CHAT_SYSTEM_PROMPT
    else:
        context_block = (
            build_prediction_context_block(grounding_prediction) if grounding_prediction else None
        )
        system_prompt = None

    return history, context_block, system_prompt, thread_id_value, prediction_id_value
