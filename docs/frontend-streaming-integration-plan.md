# Wire the Frontend's Real Chat Flow to Engine (Streaming)

## Context

The frontend (`frontend/`) turned out to already be mid-migration, not a pristine Zola clone: auth (JWT cookie via `lib/auth/session.ts`'s `engineFetch`), thread CRUD, and file upload all already correctly call `engine/`. But the actual chat-reply generation — the core of the product — currently bypasses engine entirely: `app/api/chat/route.ts` calls Anthropic directly (hardcoded `claude-sonnet-5`, via Vercel AI SDK's `streamText`) using its own simplified system prompt built from `/predict/history`. This means none of this session's engine work (LLM-assisted column mapping, imputation disclosure, the insufficient-data conversational fallback, the provider-agnostic Ollama config) is reachable from the real product, and the chat route would fail outright with no Claude credits.

Two decisions already confirmed with the user for this pass:
1. **Chat replies must be engine-generated, with streaming** — rewire the frontend to call engine's `/chat/threads/{id}/respond`, and add streaming to that endpoint so the live-typing UX Zola normally has is preserved (not a single JSON blob).
2. **File attachments move from "upload immediately on attach" to "bundled with the message at send time"** — today, attaching a spreadsheet immediately POSTs to `/predict/upload` (separate from the chat text, glued only by `/predict/history` grounding). That means an oddly-shaped file gets rejected at attach-time with a plain error — the LLM-reads-raw-data-directly fallback built this session never triggers. Deferring the upload to send-time, bundled into the same call as the message text, is what actually realizes the product vision and uses that fallback.

**Scope for this pass:** the core send-message flow only (text + optional spreadsheet attachment, streamed, engine-generated). Explicitly NOT touching: the model-picker UI cluster (files stay, per "don't remove features" — just not the focus here), rate limiting/guest-mode/BYOK/projects/sharing/feedback (already dead/no-op, left alone), or the message-edit-truncation gap (`editCutoffTimestamp` is sent but ignored server-side — pre-existing, unrelated to this pass).

## 1. Engine: add streaming to `POST /chat/threads/{thread_id}/respond`

**New function in `app/llm/generate.py`** — `stream_chat_reply(history_messages, context_block=None, system_prompt=CHAT_SYSTEM_PROMPT)`, a generator yielding text deltas (mirrors `generate_chat_reply`'s system/message-building logic exactly, but calls `get_client().chat.completions.create(..., stream=True)` and yields `chunk.choices[0].delta.content` whenever non-empty). Same most-specific-first exception handling as the existing non-streaming version — on any call failure, yield `CHAT_FALLBACK_MESSAGE` once. `generate_chat_reply` (non-streaming) stays as-is, unused by `/respond` after this change but harmless to keep (used nowhere else currently, but no reason to delete a working, tested function).

**Route changes in `app/routes/chat_routes.py`** — everything up through building `context_block`/`system_prompt` (thread ownership check, file/prediction_id resolution, persisting the user message, fetching history) stays exactly as today, using the request-scoped `db` session as normal. Only the final "generate reply → persist assistant message → return" step changes:

```python
from fastapi.responses import StreamingResponse
from app.db.database import SessionLocal

def generate_and_persist():
    chunks = []
    for delta in stream_chat_reply(history, context_block=context_block, system_prompt=system_prompt):
        chunks.append(delta)
        yield delta

    full_text = "".join(chunks) or CHAT_FALLBACK_MESSAGE
    # A fresh session is required here — this generator body runs AFTER the
    # route function returns the StreamingResponse, by which point FastAPI has
    # already torn down the request-scoped `db` (Depends(get_db)) session.
    persist_db = SessionLocal()
    try:
        assistant_message = ChatMessage(
            thread_id=thread.id, role="assistant", content=full_text,
            prediction_id=grounding_prediction.id if grounding_prediction else None,
        )
        persist_db.add(assistant_message)
        persist_db.query(ChatThread).filter(ChatThread.id == thread.id).update({"updated_at": func.now()})
        persist_db.commit()
    finally:
        persist_db.close()

return StreamingResponse(generate_and_persist(), media_type="text/plain; charset=utf-8")
```

**Consequence to note explicitly:** `/respond` can no longer declare `response_model=ChatRespondResponse` — it now returns a raw streamed-text body, not JSON. This means **Swagger's "Try it out" on this specific route will show a text stream, not the structured response** we tested against earlier — that's an expected, deliberate trade for the frontend's streaming UX, not a regression in what was built (the endpoint's *logic* — mapping, imputation, insufficient-data fallback — is unchanged; only the transport for the final reply changes). `ChatRespondResponse` stays defined in `app/chat/pydantic_models.py` (unused by this route now, harmless).

**Known limitation to flag, not fix now:** for a file-attached turn, `create_prediction_from_upload` (which includes its own blocking `generate_recommendation` LLM call) still runs to completion *before* streaming starts — so there's a real pause (we measured ~56s for a 300-row file's recommendation call alone on the local `qwen2.5:3b`/Ollama setup) before the chat reply even begins streaming. This is a pre-existing characteristic of doing two LLM calls per file-attached turn (recommendation + chat reply), not something introduced by this pass — worth knowing, not worth fixing today.

## 2. Frontend: read files as data URLs instead of uploading on attach

**`lib/file-handling.ts`** — `processFiles` currently calls `uploadSpreadsheetForPrediction(file)` (a `fetch("/api/upload", ...)`) immediately for spreadsheet MIME types, then returns a name-only `Attachment` (`url: ""`). Change: for spreadsheet MIME types, instead read the file client-side into a base64 data URL (`FileReader.readAsDataURL`, wrapped in a `Promise`) and set `Attachment.url` to that data URL — no network call at attach-time at all. Non-spreadsheet types (images/PDF/txt/md/json) keep their current behavior unchanged (`url: ""`, name-only — engine's pipeline only understands CSV/XLSX, so there's nothing useful to send for other types). Remove `uploadSpreadsheetForPrediction` (dead once nothing calls it eagerly) — this is a plumbing/implementation-detail change, not a removal of a user-facing feature; the "attach a spreadsheet" feature itself is unchanged from the user's perspective, just its timing.

No changes needed to `use-file-upload.ts` or `use-chat-core.ts`'s attachment wiring — `experimental_attachments` already flows through `handleSubmit(undefined, options)` into the request body exactly as today; it'll just now carry a real data URL instead of an empty string for spreadsheets.

## 3. Frontend: rewrite `app/api/chat/route.ts` to proxy engine's streaming endpoint

Replace the Anthropic/`streamText`/`buildGroundedSystemPrompt` implementation entirely:

```typescript
import { engineFetch, requireUserId } from "@/lib/auth/session"

export const maxDuration = 60

function dataUrlToBlob(dataUrl: string): Blob {
  const [meta, base64] = dataUrl.split(",")
  const mime = meta.match(/data:(.*?);base64/)?.[1] || "application/octet-stream"
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return new Blob([bytes], { type: mime })
}

export async function POST(req: Request) {
  try {
    await requireUserId()
    const { messages, chatId } = await req.json()
    if (!messages || !chatId) {
      return new Response(JSON.stringify({ error: "Error, missing information" }), { status: 400 })
    }

    const userMessage = messages[messages.length - 1]
    const attachment = userMessage?.experimental_attachments?.find((a: { url?: string }) =>
      a.url?.startsWith("data:")
    )

    const form = new FormData()
    form.append("content", userMessage?.content ?? "")
    if (attachment) {
      form.append("file", dataUrlToBlob(attachment.url), attachment.name)
    }

    const engineRes = await engineFetch(`/chat/threads/${chatId}/respond`, { method: "POST", body: form })

    if (!engineRes.ok || !engineRes.body) {
      const data = await engineRes.json().catch(() => null)
      return new Response(JSON.stringify({ error: data?.detail || "Chat failed" }), {
        status: engineRes.status || 500,
      })
    }

    return new Response(engineRes.body, { headers: { "Content-Type": "text/plain; charset=utf-8" } })
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "UNAUTHENTICATED") {
      return new Response(JSON.stringify({ error: "Not authenticated" }), { status: 401 })
    }
    return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500 })
  }
}
```

**Deliberate behavior changes to call out:**
- The route **no longer resends the full `messages` history** to the backend — only the latest user turn (text + optional file). Engine's `/respond` already reconstructs conversation context from its own persisted `ChatMessage` history, so resending the client's local array would be redundant (and previously was the *only* context source, since the old route called Anthropic directly and had no other memory).
- The route **no longer persists the user message itself** — engine's `/respond` already does that internally as its first step. The old code's explicit `engineFetch(POST /chat/threads/{id}/messages)` before calling the LLM is removed entirely; keeping it would create a duplicate user message.
- `buildGroundedSystemPrompt()` and its `/predict/history` call are removed — engine builds its own grounding context server-side now.
- `model`, `userId`, `isAuthenticated`, `systemPrompt`, `enableSearch`, `message_group_id` sent in the client's `options.body` (from `use-chat-core.ts`) are left as-is on the client side (harmless — the survey already confirmed the old route ignored most of these too) but this route reads none of them; only `messages`/`chatId` matter now.

## 4. Frontend: `app/components/chat/use-chat-core.ts` — one-line addition

Add `streamProtocol: "text"` to the `useChat({...})` config. This tells `@ai-sdk/react` to treat the response body as a plain incremental text stream (matching engine's `text/plain` streaming body) rather than the default AI SDK "data stream" protocol (which expects a specific prefixed-line envelope engine doesn't produce). `onFinish`/`onError` and the existing `syncRecentMessages` reconciliation (which re-fetches canonical messages from `/api/chat-threads/[id]/messages` after the stream ends) need no changes — they already work against whatever final message text `useChat` accumulates, regardless of protocol.

## 5. Frontend: unblock the attach-file button

**`app/components/chat-input/button-file-upload.tsx`** — two independent gates currently prevent the button from ever rendering in this deployment:
- `if (!isSupabaseEnabled) { return null }` at the top — remove this check entirely (Supabase auth isn't used in this deployment at all; this gate is a leftover from vanilla Zola).
- `const isFileUploadAvailable = getModelInfo(model)?.vision` — this ties file upload to *vision* model support, a generic-multimodal-Zola assumption that doesn't fit here (we're attaching spreadsheets for the prediction pipeline, not images for a vision model, and the single fixed model in use isn't a vision model). Change this to just check `isUserAuthenticated` (the gate already below it) — i.e. drop the vision-capability requirement entirely for this deployment.
- `accept=".txt,.md,image/jpeg,image/png,image/gif,image/webp,image/svg,image/heic,image/heif"` on the `<FileUpload>` component doesn't include spreadsheet types at all, even though `lib/file-handling.ts` already validates and specially handles CSV/XLSX — add `.csv,.xlsx,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` to the accept list so users can actually pick a spreadsheet through the native file picker (drag-and-drop already bypasses `accept`, which is presumably how this went unnoticed).

## Out of scope for this pass

- Model-picker UI cluster (`components/common/model-selector/*`, `lib/models/*`, `lib/openproviders/*`, `lib/providers/index.ts`, `lib/config.ts`'s `MODEL_DEFAULT`) — code comments already mark this "slated for deletion" and `.env.example` already documents the single-fixed-model end state, but hardcoding/hiding it is a separate, lower-priority pass, not blocking the core chat flow.
- Rate limiting, guest/anonymous mode, BYOK/API keys, projects/folders, chat sharing, feedback widget — all currently dead/no-op in this deployment; left untouched. If any of these turns out to be something the user actually wants working, that's a separate follow-up per the "cater for it on the backend if it's a good frontend feature" approach agreed for this phase.
- Message edit/regenerate truncation (`editCutoffTimestamp` sent by the client, ignored by the server) — pre-existing gap, would need a new engine endpoint (delete-messages-from-timestamp) to actually implement; not part of getting the core send flow working.
- `app/api/upload/route.ts` (proxies to `/predict/upload` directly) becomes unused by the main chat flow after this change but is left in place, not deleted — harmless, still independently functional.
- Serving the uploaded file's bytes back over HTTP — the data URL is used transiently client→server for one request; `experimental_attachments[].url` in persisted messages stays `null`/empty as before.
- Any change to `predict.py`, `retrain.py`, the trained model, or the mapping/imputation logic built earlier this session — this pass only changes how the reply is *transported*, not how it's generated.

## Manual verification

1. `docker compose up --build` (engine) + `npm run dev` (or frontend's own Docker compose) with `ENGINE_URL`/`JWT_SECRET_KEY` matching between both `.env` files (already required by `lib/auth/session.ts`).
2. Sign up / log in through the actual UI (not Swagger) — confirm the session cookie flow works (already-migrated, should be unaffected).
3. Send a plain text message with no attachment — confirm it streams token-by-token in the UI (not all-at-once), and a page refresh shows the same messages persisted (proves `syncRecentMessages` reconciliation still works against the new protocol).
4. Attach the student-roster CSV (the exact file that triggered the insufficient-data path earlier this session) and send a message like "what should we do about attendance" — confirm: the attach button is visible and accepts `.csv`, the message sends with the file bundled (not uploaded separately beforehand), the reply streams in, and it reads like a direct-data-analysis answer (matching the raw-data fallback tested via Swagger).
5. Attach a normal, well-shaped school-level CSV — confirm a real prediction gets created (verify via engine logs or `GET /predict/history`) and the reply streams in referencing it.
6. Send a follow-up text-only message in the same thread — confirm the reply is coherent with prior context (proves engine-side history reconstruction works without the client resending `messages`).
7. Kill the network to Ollama mid-conversation (or temporarily misconfigure `LLM_BASE_URL`) and confirm a chat send still fails gracefully (the fallback message streams back, or a clean error surfaces) rather than hanging or crashing the UI.

## Critical files

- `engine/app/llm/generate.py` (modified — new `stream_chat_reply`)
- `engine/app/routes/chat_routes.py` (modified — `/respond` returns `StreamingResponse`)
- `frontend/lib/file-handling.ts` (modified — data-URL instead of eager upload)
- `frontend/app/api/chat/route.ts` (rewritten — proxy engine's streaming `/respond`)
- `frontend/app/components/chat/use-chat-core.ts` (modified — `streamProtocol: "text"`)
- `frontend/app/components/chat-input/button-file-upload.tsx` (modified — remove dead gates, fix `accept`)
- `docs/frontend-streaming-integration-plan.md` (new — this plan, written as a permanent doc per the project's `docs/` convention)
