"""
The LLM entry points used by the app. All degrade gracefully on failure
(return None / a fallback string) instead of raising, so an LLM outage never
breaks the upload or chat endpoints that call them.
"""

import logging

import openai
import pandas as pd

from app.llm.client import LLM_MODEL, get_async_client, get_client
from app.llm.prompts import (
    CHAT_SYSTEM_PROMPT,
    MAPPING_SYSTEM_PROMPT,
    RECOMMENDATION_SYSTEM_PROMPT,
    build_mapping_user_message,
    build_recommendation_user_message,
)

logger = logging.getLogger(__name__)

CHAT_FALLBACK_MESSAGE = "Sorry, I couldn't generate a response right now."

# Only the last N messages of a thread are sent as context, to bound token usage.
MAX_HISTORY_MESSAGES = 30


def _log_call_failure(context: str, e: Exception) -> None:
    logger.warning("LLM call failed (%s): %s", context, e)


def _call_chat_completion(
    system: str,
    messages: list,
    max_tokens: int,
    temperature: float | None = None,
    response_format: dict | None = None,
    stream: bool = False,
):
    kwargs = {}
    if temperature is not None:
        kwargs["temperature"] = temperature
    if response_format is not None:
        kwargs["response_format"] = response_format
    if stream:
        kwargs["stream"] = True

    return get_client().chat.completions.create(
        model=LLM_MODEL,
        max_tokens=max_tokens,
        messages=[{"role": "system", "content": system}] + messages,
        **kwargs,
    )


def generate_recommendation(
    cleaned_df: pd.DataFrame, predictions: list, imputed_columns: list | None = None
) -> str | None:
    try:
        response = _call_chat_completion(
            system=RECOMMENDATION_SYSTEM_PROMPT,
            messages=[
                {
                    "role": "user",
                    "content": build_recommendation_user_message(
                        cleaned_df, predictions, imputed_columns=imputed_columns
                    ),
                }
            ],
            max_tokens=1024,
        )
    except openai.RateLimitError as e:
        _log_call_failure("recommendation, rate limited", e)
        return None
    except openai.APIStatusError as e:
        _log_call_failure("recommendation, API status error", e)
        return None
    except openai.APIConnectionError as e:
        _log_call_failure("recommendation, connection error", e)
        return None
    except Exception as e:
        _log_call_failure("recommendation, unexpected error", e)
        return None

    return response.choices[0].message.content


def generate_chat_reply(
    history_messages: list, context_block: str | None = None, system_prompt: str = CHAT_SYSTEM_PROMPT
) -> str:
    system = system_prompt if context_block is None else f"{system_prompt}\n\n{context_block}"

    conversational = [m for m in history_messages if m.role in ("user", "assistant")]
    conversational = conversational[-MAX_HISTORY_MESSAGES:]

    messages = [{"role": m.role, "content": m.content} for m in conversational]

    try:
        response = _call_chat_completion(system=system, messages=messages, max_tokens=2048)
    except openai.RateLimitError as e:
        _log_call_failure("chat reply, rate limited", e)
        return CHAT_FALLBACK_MESSAGE
    except openai.APIStatusError as e:
        _log_call_failure("chat reply, API status error", e)
        return CHAT_FALLBACK_MESSAGE
    except openai.APIConnectionError as e:
        _log_call_failure("chat reply, connection error", e)
        return CHAT_FALLBACK_MESSAGE
    except Exception as e:
        _log_call_failure("chat reply, unexpected error", e)
        return CHAT_FALLBACK_MESSAGE

    return response.choices[0].message.content or CHAT_FALLBACK_MESSAGE


async def _call_chat_completion_stream_async(system: str, messages: list, max_tokens: int):
    return await get_async_client().chat.completions.create(
        model=LLM_MODEL,
        max_tokens=max_tokens,
        messages=[{"role": "system", "content": system}] + messages,
        stream=True,
    )


async def stream_chat_reply(
    history_messages: list, context_block: str | None = None, system_prompt: str = CHAT_SYSTEM_PROMPT
):
    """
    Same context-building as generate_chat_reply, but yields text deltas as
    they arrive instead of returning the full reply at once. On any call
    failure, yields CHAT_FALLBACK_MESSAGE once and stops — never raises.

    Uses the async client specifically (unlike every other function here):
    a disconnected client needs real asyncio cancellation to interrupt an
    in-flight call and let the caller's cleanup (persisting whatever was
    generated so far) actually run — a sync client blocks a worker thread
    that can't be interrupted mid-call, silently leaving nothing persisted.
    """
    system = system_prompt if context_block is None else f"{system_prompt}\n\n{context_block}"

    conversational = [m for m in history_messages if m.role in ("user", "assistant")]
    conversational = conversational[-MAX_HISTORY_MESSAGES:]

    messages = [{"role": m.role, "content": m.content} for m in conversational]

    try:
        stream = await _call_chat_completion_stream_async(system=system, messages=messages, max_tokens=2048)
        async for chunk in stream:
            delta = chunk.choices[0].delta.content
            if delta:
                yield delta
    except openai.RateLimitError as e:
        _log_call_failure("chat reply stream, rate limited", e)
        yield CHAT_FALLBACK_MESSAGE
    except openai.APIStatusError as e:
        _log_call_failure("chat reply stream, API status error", e)
        yield CHAT_FALLBACK_MESSAGE
    except openai.APIConnectionError as e:
        _log_call_failure("chat reply stream, connection error", e)
        yield CHAT_FALLBACK_MESSAGE
    except Exception as e:
        _log_call_failure("chat reply stream, unexpected error", e)
        yield CHAT_FALLBACK_MESSAGE


def generate_mapping_plan(raw_df: pd.DataFrame) -> str | None:
    """
    Asks the LLM to propose a mapping plan (never executes arithmetic itself —
    see app/ml/mapping.py for validation and execution). Returns the raw
    response text, or None on any call failure; this function does no JSON
    parsing/validation, that stays in app/ml/mapping.py.
    """
    try:
        response = _call_chat_completion(
            system=MAPPING_SYSTEM_PROMPT,
            messages=[{"role": "user", "content": build_mapping_user_message(raw_df)}],
            max_tokens=512,
            temperature=0,
            response_format={"type": "json_object"},
        )
    except openai.RateLimitError as e:
        _log_call_failure("mapping plan, rate limited", e)
        return None
    except openai.APIStatusError as e:
        _log_call_failure("mapping plan, API status error", e)
        return None
    except openai.APIConnectionError as e:
        _log_call_failure("mapping plan, connection error", e)
        return None
    except Exception as e:
        _log_call_failure("mapping plan, unexpected error", e)
        return None

    return response.choices[0].message.content
