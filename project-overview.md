# Adaptive AI-Driven Planning Framework — Project Overview
**Client project:** Predictive ML component for adaptive planning in Lagos State secondary schools
**Based on:** Client's thesis chapter — "Developing Adaptive AI-Driven Planning Framework and Data Management in Lagos State Secondary Schools"

---

## 1. Project Scope

The deliverable is a **predictive ML model + web application** that lets schools upload data and receive AI-generated adaptive planning predictions and recommendations.

This is **not** the full academic research/methodology — that's the client's thesis work. Our job is the technical system that operationalizes it.

---

## 2. Core Concept

- Schools create an account and upload their data (Excel/CSV).
- A **trained Random Forest model** analyzes the data and produces predictions (e.g. dropout risk, resource strain, staffing needs).
- An **LLM (optional layer)** turns raw predictions into plain-English explanations and recommendations — similar to how ChatGPT reads and explains data, but powered by our custom-trained model underneath, not a generic pretrained one.

**Key distinction:**
| | Random Forest Model | LLM (Claude/GPT) |
|---|---|---|
| Job | Predicts the number/outcome | Explains the number in plain language |
| Trained on | Our school dataset | General language (pretrained by others) |
| Understands text? | No — numbers only | Yes |

---

## 3. Why Not Just Use a Downloaded/Pretrained Model

Pretrained models (LLMs, image models, etc.) work because there's massive public data to learn general patterns from. There is **no equivalent pretrained model for Lagos school planning data** — every dataset/schema is different, so nothing generic transfers. The predictive model has to be trained from scratch on relevant (currently synthetic, later real) school data. This is standard practice for tabular prediction tasks.

---

## 4. Data Ingestion Scope

| Format | MVP Status |
|---|---|
| Excel (.xlsx) / CSV | ✅ In scope — primary format |
| Word (.docx) | 🔜 Stretch goal / Phase 2 (via LLM-assisted extraction) |
| PDF | 🔜 Stretch goal / Phase 2 (via LLM-assisted extraction; scanned PDFs = higher risk) |

Schools send data in whatever format they already have; format handling/cleaning is done on our end. Multi-format ingestion (Word/PDF) is being held back as a scope lever — can be offered later if client wants to extend timeline/budget.

---

## 5. Data Cleaning & Mapping

Since different schools may structure their data differently, a **cleaning/mapping layer** (built by us, sits between upload and model) standardizes every submission into one fixed structure (e.g. `enrollment, teacher_ratio, budget, attendance_rate...` in a consistent order) before it reaches the model. The model itself never interprets raw/messy input — it only accepts pre-structured numeric input.

---

## 6. Tech Stack

| Layer | Choice |
|---|---|
| Frontend | Next.js |
| Backend | FastAPI |
| Database | PostgreSQL (self-hosted, local) |
| Auth | Custom-built (FastAPI + JWT, no third-party auth service) |
| File storage | Local server folder for now (path stored in Postgres); cloud storage decision deferred to hosting stage |
| ML Model | Random Forest (scikit-learn), saved as `.pkl` |
| LLM layer | Claude/GPT API — optional, for human-readable explanations |

**No paid/managed third-party services** (e.g. no Supabase, no Auth0) — everything self-hosted/custom for now.

---

## 7. System Flow

```
1. School signs up/logs in → FastAPI custom auth endpoints → Postgres (schools table, hashed password)
2. Login success → FastAPI issues JWT token → Next.js stores session
3. School uploads Excel/CSV → sent to FastAPI (with token)
4. FastAPI:
   - Validates token
   - Cleans/maps uploaded data into standard structure
   - Runs Random Forest model → prediction
   - (Optional) Sends prediction to LLM → plain-English explanation
   - Saves result to Postgres
   - Saves uploaded file to local server folder, stores file path in Postgres
5. FastAPI returns result → Next.js displays prediction + recommendation
6. Dashboard pulls prediction history from Postgres for that school
```

---

## 8. Database Tables (minimum viable)

- **schools** — id, name, email, hashed_password, created_at
- **uploads** — id, school_id, file_path, upload_date
- **predictions** — id, school_id, upload_id, prediction_output, recommendation_text, created_at

---

## 9. Current Status

- ✅ Working end-to-end prototype: synthetic data generation → data cleaning → Random Forest training (high R²) → prediction + plain-language recommendation script
- ✅ Sample CSV template with column explanations provided to client
- ✅ Client aligned on full scope and architecture
- ⬜ Real client data — not yet received; synthetic data in use for now
- ⬜ Full web app (Next.js + FastAPI + Postgres + auth) — build starting now

---

## 10. Open Items / Future Considerations

- **Hosting:** Not yet decided (client mentioned possibly "Database Mart" or similar) — to be addressed later, client will be kept informed
- **TensorFlow vs scikit-learn:** scikit-learn used in prototype (faster, equally effective for tabular data) — confirm this remains acceptable to client
- **Word/PDF ingestion:** available as a phase 2 upsell/timeline negotiation point if client requests it

---

*This document is a living reference — update as decisions change.*
