# Implementation Plan — Ministry Assistant: Gaps and Fixes

Status: Gaps A-H and J fixed on 22 September 2026. Gap I reassessed and left
open (see its section). Phases 3 and 4 remain proposed.
Scope: `server/resources/js/pages/ministry/assistant.tsx` and everything behind it —
the shared chat components, `Ministry\AssistantController`, `MinistryAssistant`,
`MinistryTopicGuard`, and the read-only query layer.

## Summary

The ministry assistant is a solid **read-only reporting agent** and a poor
**application assistant**. The data path is well built: row-level security,
read-only Postgres roles, a conservative SQL guard, curated views, and real test
coverage. What is missing is everything that would make it an assistant *of the
product* rather than a natural-language front end to a database.

There are also five concrete defects in the chat loop that affect users today.

Ranked by impact:

| # | Gap | Severity | Status |
|---|-----|----------|--------|
| A | Topic guard refuses ordinary ministry questions | High | Fixed |
| B | Agent has no model of the application | High | Fixed |
| C | Ministry context budget overflows on ministry-sized results | High | Fixed |
| D | Thread list/title goes stale after the first message | Medium | Fixed |
| E | Empty "New chat" threads accumulate with no way to remove them | Medium | Fixed |
| F | `regenerate()` duplicates the user turn in stored history | Medium | Fixed |
| G | Prompt and schema contradictions specific to the ministry scope | Medium | Fixed |
| H | The docked assistant panel is non-functional, and ministry has none | Medium | Fixed |
| I | Stopping a reply discards the whole exchange | Low | Open, needs a decision |
| J | No test coverage for the streaming client behaviour | Low | Fixed |

## What changed

New, in `server/`:

- `app/Ai/Product/PageCatalog.php` — the curated page list, keyed by route name, per portal.
- `app/Ai/Tools/NavigateToPage.php` — a display tool that draws a link to one of those pages.
- `resources/js/components/chat/page-links.tsx` — context carrying the server-resolved links to the link card.

Changed:

- `TopicGuard` gained `PRODUCT` and `INTENT` patterns; `MinistryTopicGuard` inherits them. Both refusal texts now mention finding your way around.
- `SchoolAssistant` and `MinistryAssistant` carry a PAGES block and a rewritten instruction 8. `contextTokens()` is overridable; the ministry asks Ollama for 24576 rather than 12288.
- `QueryScope` carries `maxRows`, capped at 60 for the ministry through the new `ai.query.ministry_max_rows` setting. `QueryResult` drops null values from rows.
- `SchemaCatalog` no longer tells the ministry agent to group by `school_id`. `RunSqlQuery` describes its own scope and row cap.
- `HandlesAiConversations` gained `startConversationFor()` and `rewindLastExchange()`; both chat controllers use them and both pass a `pages` prop.
- `useAiChat` reloads the `threads` prop on finish, flags a regenerate, and understands the new visual.
- `ai-sidebar.tsx` was rebuilt as a working composer that hands its draft to the portal's assistant, and now renders in both portals.

Tests added across `TopicGuardTest`, `AiDataAgentTest`, `AiChatControllerTest` and `Ministry/AssistantTest`: 457 pass, 2 skipped.

---

## Part 1 — What is wrong

### A. The topic guard refuses ordinary ministry questions

`MinistryTopicGuard::DOMAIN` is a regex word list. On the **first** message of a
thread, anything that does not match is refused without ever reaching the model.
Running the live regex against realistic ministry questions:

```
How do I onboard a new school?               ALLOWED
Which schools are understaffed?              ALLOWED
Take me to the watchlist                     REFUSED
What does the coverage page show?            REFUSED
Show me the audit log                        REFUSED
Who is on my ministry team?                  REFUSED
Export this to CSV                           REFUSED
What is data quality?                        REFUSED
summarise this for me                        REFUSED
explain what these numbers mean              REFUSED
```

Six of the ten are legitimate, in-scope requests about the ministry portal. The
guard is the single largest blocker to the assistant feeling like part of the
application. A word list cannot classify intent, and every new feature silently
widens the false-refusal surface.

Relevant files: `app/Ai/MinistryTopicGuard.php`, `app/Ai/TopicGuard.php`.

### B. The agent has no model of the application

`MinistryAssistant::instructions()` ends with:

> 8. You can only read data. If asked to change anything (suspend a school, edit
>    a record), say you can't and point them to the relevant page in the ministry portal.

Nothing in the prompt lists what pages exist. There are fifteen ministry pages
(dashboard, enrolment, staffing, attendance, performance, coverage, geography,
data quality, watchlist, reports, team, audit log, announcements, schools,
assistant) and the model knows none of them by name. Told to point at a page, it
will invent one.

The agent also has no idea what the user is currently looking at. "Explain these
numbers" while standing on the coverage page is unanswerable, because the page and
its active filters are never passed to the agent.

### C. The ministry context budget overflows on ministry-sized results

Measured on this codebase:

| Quantity | Value |
|---|---|
| Ministry system prompt | 11,863 chars (~3.3k tokens) |
| School system prompt | 8,565 chars |
| `num_ctx` set for Ollama | 12,288 tokens |
| `ai.query.max_rows` | 200 |
| Cost of one `school_summary` row as JSON | ~436 chars |

A `SELECT * FROM school_summary` at the 200-row cap is ~87,000 characters, roughly
24k tokens, in a **single** tool result — twice the whole context window, on top of
a 3.3k-token system prompt, with `MaxSteps(8)` allowing several such results per
turn. Ollama truncates from the start of the context, which is the system prompt
and schema, so the agent loses its column list mid-conversation and starts
inventing columns. This is specific to the ministry agent: a school agent's
results are one school's worth of rows.

Relevant: `SchoolAssistant::providerOptions()`, `config/ai.php` → `query.max_rows`.

### D. The thread list and title go stale after the first message

`AssistantController::respond()` renames a `New chat` thread to the first message
in its `then()` callback. The client never learns. `useAiChat` streams over a raw
`fetch` and nothing calls `router.reload`, so the history panel and the sidebar
keep showing "New chat" until the user navigates. Inertia props are documented as
the source of truth for history, but they are never refreshed after a turn.

Relevant: `resources/js/hooks/use-ai-chat.ts`, `resources/js/components/chat/assistant-chat.tsx`.

### E. Empty threads accumulate and the ministry cannot delete them

`AssistantChat` posts to `storeUrl` whenever no thread is active, and the
new-chat button posts unconditionally. Every click creates a row titled
"New chat". By design (and correctly, per the project's no-deletion rule) the
ministry has no destroy route, verified by a test. The result is that the history
panel fills with identical empty threads that can never be cleared.

Note the related inconsistency: the **school** portal does expose
`ai.chat.threads.destroy`, which contradicts the project's "records change status,
never get deleted" rule. Worth a separate decision.

### F. `regenerate()` duplicates the user turn

`useChat`'s `regenerate` re-posts through `prepareSendMessagesRequest`, which
picks the last user message and sends it to `respond`. The server is not
idempotent: it re-runs the topic guard and `RemembersConversations` appends the
same user message to `conversation_messages` again. Every retry inflates the
stored transcript and the history replayed to the model, which degrades the next
answer.

### G. Prompt and schema contradictions in the ministry scope

- `SchemaCatalog::describe()` tells the ministry agent *"every table has a
  `school_id` column you can group by"*, while `ministryNotes()` and instruction 6
  say to group and label by `school_name` and never use an id. Contradictory
  instructions to a small model.
- `RunSqlQuery::description()` says *"against the school database"* even when the
  scope is the ministry.
- The ministry prompt says to call the data *"the school records"*, which reads
  oddly for a ministry user looking across every school.
- Instruction 2 says *"ONE SELECT on a single table"*, while several
  `ministryExamples()` need reasoning across more than one.

### H. The docked assistant panel is a non-functional mock

`resources/js/components/ai-sidebar.tsx` is dead UI:

- the body is a hardcoded `Empty` state reading "Morning, shadcn!";
- the History button is `disabled`;
- the "Add Photos & Files", "Deep Research" and "Web Search" menu items do nothing;
- the composer's only behaviour is to navigate to the full assistant page;
- `data-status={status}` reads the DOM global `window.status`, not any chat state.
  It type-checks (`tsc --noEmit` passes), so nothing catches it.

It is gated on `isSchoolUser`, commented out of `app-sidebar-layout.tsx`, and
`ministry-layout.tsx` never renders it — ministry users have no docked assistant at all.

### I. Stopping a reply discards the whole exchange

**This finding was wrong as first written, and is corrected here.** The original
claim was that the server keeps generating and persists an answer nobody saw.
Reading the vendor code shows the opposite.

`ignore_user_abort` is 0 and `output_buffering` is 0, so PHP terminates the
script on the first write to a closed connection. The generation therefore does
stop, at the next chunk boundary, which is at worst one model step or one tool
call later. Laravel's own `eventStream()` checks `connection_aborted()` between
chunks, but the SDK's `CanStreamUsingVercelProtocol` uses plain
`response()->stream()`, which does not, so the stop is implicit rather than
explicit.

The real consequence is at the other end. `RememberConversation` stores the user
message and the assistant message together, in middleware, after the response
completes. When the script dies mid-stream neither is written. Stopping a reply
therefore discards **the user's own question as well as the partial answer**,
while both stay on screen until the next navigation.

Fixing it needs a decision that is not ours to make: either stop means "discard
the exchange" and the UI should drop it to match, or stop means "keep what I
asked" and the user message must be persisted before streaming begins. A third
option is an upstream change adding an abort check to the SDK's stream. Chasing
it inside the application would mean reimplementing about a hundred lines of the
vendor's protocol mapping, which is not worth it for the severity.

### J. Streaming client behaviour is untested

`tests/Feature/Ministry/AssistantTest.php` and `AiDataAgentTest.php` cover the
backend well. Nothing covers the client loop: title refresh, regenerate, empty
threads, or visual replay from history.

---

## Part 2 — Can it be flexible? Can it operate as an assistant of the application?

**Not as built.** It is a text-to-SQL reporter with four display tools. Three
structural reasons, each fixable:

1. **Its only real tool is `run_sql_query`.** Everything else (`render_chart`,
   `render_table`, `render_list`, `ask_clarifying_question`) is a display
   instruction, not a capability. The agent can read and it can draw. It cannot
   navigate, explain the product, or do anything.
2. **It has no model of the application.** No page registry, no route names, no
   feature descriptions, no awareness of where the user is or what they are
   filtering by.
3. **The guard blocks product questions before the model sees them** (Gap A).

The foundation, though, is the right one. Scope is enforced by the database rather
than the model, the SQL guard fails fast with model-actionable errors, and the
agent/tool split in `app/Ai` extends cleanly. Becoming an application assistant is
additive work, not a rewrite.

One constraint to record before anyone plans around it: **the watchlist is
computed**, not stored. `App\Actions\Ministry\SchoolAlerts::watchlist()` derives it
from metrics. "Add this school to the watchlist" is not an action that exists.

---

## Part 3 — The plan

Four layers. Each is independently shippable and each is useful on its own.

### Phase 0 — Fix the chat loop (no new capability)

Smallest change set, largest immediate quality gain.

1. **Refresh props after a turn.** Give `useAiChat` an `onFinish` that calls
   `router.reload({ only: ['threads'] })`, so the renamed thread appears in
   history immediately.
2. **Stop creating empty threads.** In `AssistantController::store()`, reuse the
   participant's most recent conversation when it has no messages instead of
   creating another. Alternatively, exclude empty threads from `conversationsFor()`.
   Do not add a delete route — the no-deletion rule stands.
3. **Make regenerate idempotent.** Send an explicit `regenerate: true` from
   `prepareSendMessagesRequest`; in `respond()`, when it is set, drop the trailing
   assistant message and re-run against the stored user message rather than
   appending a new one.
4. **Size the ministry context.** Override `providerOptions()` on
   `MinistryAssistant` with a larger `num_ctx`, and cap ministry results lower
   than 200 (60 is a reasonable start). Consider compacting `QueryResult::toArray()`
   by dropping null columns.
5. **Resolve the prompt contradictions in Gap G**: drop the `school_id` line from
   the ministry branch of `describe()`, make `RunSqlQuery::description()` scope-aware,
   and change "the school records" to "the ministry's records" in the ministry prompt.
6. **Delete or finish `ai-sidebar.tsx`.** It is a mock that ships in the bundle.
   Either remove it, or rebuild it on `useAiChat` and render it from both layouts.

Tests to add alongside: `store()` reuses an empty thread; regenerate does not
duplicate the user row; the ministry prompt no longer mentions `school_id`.

### Phase 1 — Teach it the product (read-only, no new risk)

Add a **page registry** as the single source of product knowledge — one curated PHP
class beside `SchemaCatalog`, listing for each ministry page: route name, title,
one line on what it answers, and what can be done there.

```php
// app/Ai/Product/PageCatalog.php  (sketch)
'ministry.coverage' => [
    'title' => 'Coverage',
    'answers' => 'Which schools have reported data this term, and which are silent.',
    'actions' => ['Filter by LGA or district', 'Open a school\'s data-quality detail'],
],
```

Then two new tools:

- **`navigate_to_page`** — returns a route name and label; the chat renders it as a
  link card the user can click. Add it to `VISUAL_TOOLS` in
  `HandlesAiConversations` and to the `ChatVisual` union so it replays from history.
- **`explain_feature`** — answers "what does coverage mean", "where do I download a
  report", grounded in the registry rather than invented.

Feed the registry into the prompt as a compact list so instruction 8 can name real
pages. Watch the context budget from Gap C when adding to the prompt.

**Relax the guard in the same phase.** Reduce `TopicGuard` to what it is actually
good at — catching prompt-injection probing — and let the model's own instructions
handle off-topic refusal, which they already do. If the deterministic gate is kept,
it must at minimum learn the product vocabulary: watchlist, coverage, data quality,
audit, announcement, export, download, team, onboard, navigate, page, explain.

### Phase 2 — Teach it where the user is

Pass the current page and its active filters to the agent with each message, so
"explain these numbers" and "why is this school flagged" resolve against what is on
screen. Two pieces:

- The client sends `page` and `filters` alongside `content`.
- A `school_health` tool wraps `SchoolMetrics` and `SchoolAlerts` so flag reasons
  come from the same code the watchlist page uses, instead of the model
  re-deriving them in SQL and disagreeing with the UI.

### Phase 3 — Let it act, with confirmation

Only after Phases 0–2 are stable. A short list of write tools that mirror existing
controller actions and respect the project's status-only rule:

| Tool | Mirrors | Rule |
|---|---|---|
| `post_announcement` | `Ministry\AnnouncementController@store` | confirm first |
| `set_school_status` | `SchoolController@suspend` / `@reactivate` | status change only, never delete |
| `invite_school` | `SchoolController@store` | confirm first |
| `resend_invitation` | `SchoolController@resendInvitation` | confirm first |
| `set_team_member_status` | `Ministry\TeamController@updateStatus` | status change only |
| `prepare_report` | `Ministry\ReportController` | returns a download link |

Non-negotiables for this phase:

1. Every write goes through `App\Actions\Ministry\AuditLogger`, exactly as the
   controllers do. An assistant-initiated change must be indistinguishable in the
   audit log from a hand-made one, except for a flag in `metadata`.
2. Nothing executes silently. Use `laravel/ai`'s built-in approval mechanism
   (`PendingApproval`, the `approval_state` column already on
   `conversation_messages`) rather than inventing a confirmation flow. The chat
   renders a confirm card; the tool runs on the user's click.
3. Authorization is re-checked server-side on the approved call. The agent
   proposing an action is not authorization.
4. No `destroy` tool, ever.

### Phase 4 — Model fit

`qwen3:8b` over Ollama is the ceiling on everything above. Eight tools with
multi-step planning and an approval loop is past what an 8B model does reliably.
`config/ai.php` already defines Anthropic, OpenAI and others. Plan a provider
switch for the ministry agent with Ollama kept as the local/offline fallback, and
measure before and after on a fixed set of ministry questions.

---

## Suggested order

1. Phase 0 — one focused pass, mostly small diffs.
2. Phase 1 — the page registry plus `navigate_to_page`, and the guard change.
   This is where the assistant starts feeling like part of the product.
3. Phase 2 — page context.
4. Phase 4 — model evaluation, before Phase 3 rather than after.
5. Phase 3 — write tools behind approvals.
