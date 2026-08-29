# Backend LLM Integration Plan

## 1. Context & Goal

The backend (`engine/`) has a working upload → clean → predict → save pipeline and a working chat thread/message CRUD layer, but neither talks to an LLM yet: `prediction_routes.py` leaves `recommendation_text` as a hardcoded `None`, and `chat_routes.py` is pure persistence — nothing server-side ever generates a reply.

The confirmed product vision: a school attaches a spreadsheet in a chat message, the backend cleans+predicts, and an LLM replies conversationally grounded in that prediction; follow-ups reference chat + prediction history without needing a new attachment.

**Goal for this pass:** finish the backend so it's testable end-to-end from FastAPI's Swagger UI (`/docs`) — signup/login, upload → real LLM recommendation, and a real conversational chat endpoint. Frontend rewiring is a separate, later task.

Model/provider choice for production hasn't been finalized with the client yet (and the dev Claude API key hit a billing block with no funds to top up), so the LLM layer talks to **any OpenAI-compatible chat completions endpoint** via three env vars (`LLM_BASE_URL`, `LLM_API_KEY`, `LLM_MODEL`). Default dev config points at a local Ollama install (`qwen2.5:3b`, free), and switching to a hosted provider (OpenAI, Claude via a compatible gateway, OpenRouter, etc.) later is a config change, not a code change.

## 2. Scope

**In scope:** LLM module, wiring into upload/predict, a new grounded chat-reply endpoint, requirements/env/compose plumbing, manual Swagger verification.

**Out of scope for this pass:**
- Frontend rewiring (Zola-clone integration with these endpoints).
- Streaming responses / Vercel AI SDK protocol compliance — not needed for Swagger JSON testing.
- Finalizing the production LLM provider/model with the client — the three `LLM_*` env vars make this a config-only swap later.
- Serving uploaded files back over HTTP (attachment `url` field stays `None`).
- Any DB migration tooling — no new tables needed (`ChatMessage.prediction_id` already supports grounding).

## 3. Env vars

| Var | Read in | Required? | Notes |
|---|---|---|---|
| `LLM_BASE_URL` | `app/llm/client.py` | No — unset falls back to the OpenAI SDK default (`https://api.openai.com/v1`) | The `/v1`-style base URL of any OpenAI-compatible endpoint. Dev default: `http://host.docker.internal:11434/v1` (local Ollama, reachable from inside the `api` container on Docker Desktop for Mac). Use `http://localhost:11434/v1` if running the backend outside Docker. |
| `LLM_API_KEY` | `app/llm/client.py` | No, defaults to the placeholder string `"not-needed"` | Most local servers (Ollama, LM Studio) don't validate this at all. A real key is required for hosted providers. |
| `LLM_MODEL` | `app/llm/client.py` | No, defaults to `qwen2.5:3b` | Must be a model id the target endpoint recognizes — an `ollama pull`ed tag locally, or a hosted provider's model id. |

Switching providers (Ollama → OpenAI → OpenRouter → a Claude-compatible gateway → back) is a matter of changing these three values in `.env` — no code changes.

## 4. New module: `engine/app/llm/`

New subpackage, sibling to `app/auth/`, `app/ml/`, `app/chat/`. Built on the **OpenAI Python SDK** (`openai` package) purely as an HTTP client against `LLM_BASE_URL` — this is the de facto standard client for the OpenAI-compatible chat completions wire protocol, not tied to using OpenAI as the actual provider.

- **`client.py`** — reads `LLM_MODEL`/`LLM_BASE_URL`/`LLM_API_KEY`, lazy-cached `get_client()`.
- **`prompts.py`** — system prompt strings + formatter functions (no API calls).
- **`generate.py`** — `generate_recommendation(...)` and `generate_chat_reply(...)`, each with a most-specific-first exception chain (`openai.RateLimitError` → `openai.APIStatusError` → `openai.APIConnectionError` → broad `Exception`), logged, and **never raising** — they degrade to `None` / a fallback string instead.

## 5. File-by-file changes

- `engine/app/ml/pipeline.py` (new) — `create_prediction_from_upload(file, user, db)`, extracted from `prediction_routes.upload_and_predict` so both the upload endpoint and the new chat endpoint share one pipeline implementation.
- `engine/app/routes/prediction_routes.py` (modified) — calls the shared pipeline function instead of inlining the logic; `recommendation` in the response is now the real LLM output.
- `engine/app/routes/chat_routes.py` (modified) — adds `POST /chat/threads/{thread_id}/respond`.
- `engine/app/chat/pydantic_models.py` (modified) — adds `ChatRespondResponse`.
- `engine/requirements.txt` — adds `openai`.
- `engine/docker-compose.yml` — passes `LLM_BASE_URL`, `LLM_API_KEY`, `LLM_MODEL` into the `api` service.
- `engine/.env.example` — documents the three `LLM_*` vars with an Ollama-default example plus commented-out hosted-provider examples.

## 6. Chat endpoint contract: `POST /chat/threads/{thread_id}/respond`

> **Update:** this endpoint now streams the reply as plain text (`StreamingResponse`) rather than returning the `ChatRespondResponse` JSON shape described below — see `docs/frontend-streaming-integration-plan.md` §1 for the current contract. The request shape (multipart form fields) is unchanged.

`POST /chat/threads/{thread_id}/messages` stays exactly as-is (pure CRUD, still useful for loading/seeding history). This new route is the only one that talks to the LLM.

**This route is `multipart/form-data`, not JSON** — FastAPI requires an optional `UploadFile` to be mixed with `Form(...)` fields rather than a Pydantic body. In Swagger this renders as form fields + a file picker instead of a JSON textarea — that's expected, not a bug.

**Request (form fields):**
- `content: str = Form("")` — user's text message (optional if a file is attached).
- `prediction_id: int | None = Form(None)` — ground this turn using an existing prediction instead of a fresh upload.
- `file: UploadFile | None = File(None)` — optional spreadsheet attachment.

**Validation:** 400 if `content` is empty AND no `file`. 400 if both `file` and `prediction_id` are given.

**Response:**
```python
class ChatRespondResponse(BaseModel):
    user_message: MessageResponse
    assistant_message: MessageResponse
    prediction: PredictionResponse | None = None  # set only when this call attached a new file
```

**Design note (updated):** pure follow-ups (no file, no `prediction_id`) now look up the most recent message in the thread that has a non-null `prediction_id` and re-ground the reply in that same `Prediction` every turn — not just relying on the model's own restatement of the data in earlier replies. This was tightened after live testing showed a small local model would sometimes fail to carry forward specific data points (e.g. an exact attendance rate) across turns if its own prior reply hadn't explicitly restated them. No schema change was needed — it's a lookup against existing `ChatMessage.prediction_id` values, scoped to the current thread.

## 7. Manual Swagger verification checklist

1. `docker compose up --build` — confirm `api` boots, `/health` responds.
2. `POST /auth/signup` → `POST /auth/login` → copy JWT, Authorize in Swagger.
3. `POST /predict/upload` with a sample CSV → `predictions` non-empty, `recommendation` is a non-null readable paragraph.
4. `GET /predict/history` → same row appears with `recommendation_text` populated.
5. `POST /chat/threads` (no title) → note `id`.
6. `POST /chat/threads/{id}/respond` (form: `content="Please review this school's data"`, attach the CSV, no `prediction_id`) → response has `user_message`, `assistant_message` (references the data), `prediction` populated.
7. `POST /chat/threads/{id}/respond` again — `content="What's the single biggest driver of that number?"`, no file, no `prediction_id` → assistant reply is coherent with turn 6 (proves history-based grounding).
8. `GET /chat/threads/{id}/messages` → all 4 messages present, correctly ordered.
9. Blank `LLM_BASE_URL`/`LLM_API_KEY` in `.env` (or stop Ollama), restart, repeat step 3 (still succeeds, `recommendation: null`, no 500) and step 6 (returns fallback string, no crash).

## 8. Known limitations

- Attachment `url` field stays `None` — no static file serving is mounted for uploads yet.
- No strict role-alternation enforcement on outgoing chat history sent to the API (the API tolerates consecutive same-role turns, so this is not currently a problem, just worth knowing).
- Non-spreadsheet attachments (images, PDFs, etc.) currently aren't persisted/tracked by engine at all — only a spreadsheet upload gets forwarded as a `file` and recorded against the message; other attachment types shown optimistically in the UI disappear from a thread's history after reload. Not addressed yet — a real gap if non-spreadsheet attachments matter for the product.
