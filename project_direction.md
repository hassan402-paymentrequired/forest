# Project Direction — AI-Powered School Management Platform (Ministry of Education)

## What changed
Original ask (from the shared document) sounded like a data-science project:
build/train a Python + TensorFlow predictive model. After a client meeting,
the real ask is different: a **multi-tenant school management platform**
with a **conversational AI assistant** layered on top — closer to an HR/ops
system (like the "Samira" example shown) than a forecasting model.

## What the client actually wants
- **Ministry of Education = super-admin** on the platform
- Ministry invites/onboards schools via email
- Each school manages its own data: students, teachers, curriculum, records
- Ministry doesn't need to "request" info from schools manually — they can
  ask the AI assistant directly (e.g. "which schools are understaffed?",
  "is teacher X on leave?") and it answers from live platform data
- The AI is a **chat assistant with access to live data**, not a predictive
  model — see reference screenshots (Samira, by Seamless Technologies)

## Architecture (current decision)
| Layer | Tech | Notes |
|---|---|---|
| Frontend | **Next.js** | Unchanged, stays as-is |
| Backend | **Laravel** | New — replaces Python as the main backend. Chosen because Laravel has an AI SDK for agent/tool-calling integration |
| AI Agent | LLM via Laravel AI SDK | Answers questions using **live function/tool calls to the database** — NOT a fine-tuned or retrained model |
| Python | Reserved, role TBD | See open question below — NOT for "retraining the AI on school data" (see reasoning) |

## Key technical decision: no retraining
The AI assistant must answer questions using **current, live data**
(attendance, leave status, records that change daily). Fine-tuning/retraining
a model on this data would go stale immediately and require constant
retraining — expensive and impractical.

**Correct approach:** the AI agent uses **tool/function calling** — at query
time, it runs a live query against the Laravel backend's database and
answers from that result. No training step involved. This is what Laravel's
AI SDK is designed for.

## Open questions / decisions needed
1. **Python's role going forward** — is it still needed at all? Possible
   uses: data import/ETL from schools' existing spreadsheets during
   onboarding, or keeping the earlier enrolment-forecasting model as a
   *separate optional feature* (not the core deliverable anymore).
2. Scope has expanded significantly from the original ask (single script →
   full multi-tenant platform + AI agent). Pricing/quotation needs revisiting.
3. Timeline was originally 2 weeks — client has said to ignore this for now;
   needs a realistic re-estimate once scope is locked.

## What NOT to build
- Do not build/train a custom ML model as the core AI feature
- Do not treat this as a data-science/forecasting project
- TensorFlow is not needed for this direction
