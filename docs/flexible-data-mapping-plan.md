# Flexible Data Mapping — Handle Any Uploaded Structure

## Context

The trained Random Forest model needs exactly 5 fixed school-level numbers per row (`STANDARD_COLUMNS` in `app/ml/clean.py`): `enrollment`, `teacher_student_ratio`, `attendance_rate`, `budget_allocation`, `infrastructure_score`. `clean_dataframe`'s static alias dict only renames columns that already represent the same concept under a different name — it can't invent data. Testing exposed the gap: a **student-level roster** CSV (one row per student, missing teacher/budget/infrastructure data entirely) hit `clean_dataframe`'s `ValueError` and surfaced as a blunt error in chat.

**Agreed direction:** add an LLM-assisted mapping layer, with a hard constraint — **the LLM must never do arithmetic itself** (a small local model like `qwen2.5:3b` is unreliable at aggregating many rows). The LLM only *plans* (which raw column maps to which target column, and by what operation, chosen from a small fixed whitelist); deterministic pandas code *executes* the plan.

Raw upload → existing fast deterministic `clean_dataframe` alias-check (unchanged, zero added cost when it already succeeds) → if that fails → LLM proposes a structured mapping plan from raw columns + sample rows → code validates the plan against a strict whitelist and executes it deterministically (never `eval`, never LLM-authored code) → if few enough columns are structurally unrecoverable, impute the rest from training-data means and run the real model as normal, with the recommendation text honestly disclosing what was estimated → if too many are missing, skip the model entirely and (chat endpoint only) have the LLM answer directly from the raw data with a clear "no formal prediction" caveat. `/predict/upload` stays a clean succeed-or-error endpoint — it returns a 422 pointing at chat instead of a soft fallback.

**Large-file performance:** the mapping-plan LLM call is bounded regardless of upload size — it only ever sees column names/dtypes + 5 sample rows, never the full file; pandas (fast, vectorized) does the actual aggregation across however many rows exist. This pass also fixes a pre-existing gap: `build_recommendation_user_message` previously serialized *every row* into the prompt with no cap — rewritten to send summary statistics + a capped sample instead, so no LLM call in the system scales with upload size.

## 1. Mapping-plan JSON contract

```json
{
  "group_by": "school_name" | "__all__" | null,
  "mapping": {
    "enrollment":            {"op": "row_count"},
    "teacher_student_ratio":  {"op": "unavailable"},
    "attendance_rate":        {"op": "mean", "column": "attendance_percentage", "scale": 0.01},
    "budget_allocation":      {"op": "unavailable"},
    "infrastructure_score":   {"op": "unavailable"}
  }
}
```

**`group_by` — three modes:**
- a real column name → file has multiple entities identified by that column (multi-school roster); group by distinct values, one output row per group.
- `"__all__"` → no entity-identifier column, file is not already one-row-per-school; treat the whole file as one group → one output row.
- `null`/absent → file is *already* one row per school; no aggregation, 1:1 row mapping.

**Op whitelist (exactly these 5, nothing else ever executed):**
- `alias` — requires `column`. Row-wise: that row's value. Grouped: first non-null value in the group.
- `row_count` — count of rows in the group. Only legal when `group_by` is not null.
- `mean` — requires `column`, optional `scale` (default 1). Group mean × scale. Only legal when `group_by` is not null.
- `sum` — requires `column`, optional `scale`. Group sum × scale. Only legal when `group_by` is not null.
- `unavailable` — not derivable from this file. Produces `NaN` for every output row.

**Prompt/response strategy:** request `response_format={"type": "json_object"}` as a best-effort hint; never trust the provider honored it — always defensively `json.loads` (stripping a leading/trailing code-fence if present) plus full structural validation regardless. `temperature=0` for this call.

## 2. Validation rules (`app/ml/mapping.py`)

A plan is invalid (whole attempt fails, treated as total failure) if any of:
1. Raw text is `None`, or JSON parsing fails.
2. Parsed value isn't a dict, has no `mapping` key, or `mapping` isn't a dict.
3. `mapping` doesn't contain all 5 `STANDARD_COLUMNS` as keys.
4. Any entry isn't a dict, or its `op` is missing/not in the whitelist.
5. For `alias`/`mean`/`sum`: `column` missing, empty, or not present in the uploaded dataframe's columns.
6. For `mean`/`sum`: `scale` (if present) must be numeric, not `bool`, and finite.
7. `group_by` (if present/non-null) must be exactly `"__all__"` or an actual column in the dataframe.
8. If `group_by` is null: no entry may use `row_count`/`mean`/`sum` — only `alias`/`unavailable` are legal.

Execution is pandas-only: never `eval`, never LLM-authored code runs.

## 3. Imputation & threshold (`app/ml/clean.py`)

`MAX_IMPUTABLE_MISSING_COLUMNS = 1` — at most this many of the 5 required columns may be unavailable/imputed before the RF model is skipped entirely. Imputed values come from `engine/training_data.csv` column means (same file `retrain.py` trains on), lazily cached.

## 4. Three-outcome pipeline result (`app/ml/pipeline.py`)

`create_prediction_from_upload` now returns an `UploadPredictionResult` with `status: "ok" | "insufficient_data"`. `ValueError` from `clean_dataframe` no longer escapes the function — it's caught internally and triggers the LLM mapping fallback. `FileNotFoundError` from `predict()` is unchanged and still propagates. No DB schema change — the mapping/imputation caveat is folded entirely into `recommendation_text`.

## 5. Route behavior

- **`POST /predict/upload`**: on `status == "insufficient_data"`, returns HTTP 422 naming the missing columns and pointing the user at chat instead. Stays a clean succeed-or-error endpoint, no soft LLM fallback.
- **`POST /chat/threads/{id}/respond`**: on `status == "insufficient_data"`, no `Prediction` row is created; the assistant reply is generated directly from the raw uploaded data (via a new `RAW_DATA_CHAT_SYSTEM_PROMPT` + `build_raw_data_context_block`), clearly caveated as "no formal model prediction."

## 6. Manual verification checklist

1. Sign up, log in, create a chat thread.
2. **Insufficient-data case**: attach a student-level roster CSV with `content="what should we do about the student attendance"` → expect HTTP 200, `prediction: null`, a coherent reply that clearly states no formal model prediction was made.
3. **Fast-path regression**: attach a normal school-level CSV → expect identical behavior to before this change (no mapping call triggered, real prediction returned).
4. **Impute-and-proceed case**: same school-level CSV with exactly one required column renamed unrecognizably → expect a real prediction, with `recommendation_text` disclosing that field was estimated.
5. **Direct endpoint check**: `POST /predict/upload` with the student roster → expect HTTP 422, not a silent LLM answer.
6. **Size-bound check**: upload a CSV with a few hundred rows → recommendation call should stay fast, using summary stats + a small sample rather than dumping every row into the prompt.

## Out of scope

- Frontend/UI surfacing of "this was an estimate" beyond the text already in the response.
- Persisting the LLM's mapping plan for audit/debugging.
- Retraining the RF model on real multi-shape data.
- Non-CSV/Excel upload formats.
- Any API schema change or DB migration.
