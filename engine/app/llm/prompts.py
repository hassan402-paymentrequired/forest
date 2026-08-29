"""
System prompts and context-formatting helpers for the LLM call sites.
Pure string building — no API calls here. Every builder here is size-bounded
(summary stats + a small capped sample) regardless of upload size, so no
prompt scales with how large a school's uploaded file is.
"""

import json

import pandas as pd

from app.ml.clean import STANDARD_COLUMNS
from app.ml.explain import explain
from app.ml.prioritize import bounded_ranking_summary, rank_schools

# Appended to both chat-facing system prompts (not the recommendation or
# mapping prompts, which are never open-ended conversation) to keep the
# assistant from wandering into general-purpose chatbot territory. Small
# local models follow a concrete example far more reliably than an abstract
# "don't do X" rule, so this spells out exactly what a refusal looks like
# rather than just stating the policy.
SCOPE_RESTRICTION = """

STRICT TOPIC BOUNDARY: You ONLY discuss this school's planning data, model predictions, and decisions about \
enrollment, attendance, staffing, budget, and infrastructure. You have NO knowledge of and NEVER answer anything \
else — general knowledge, current events, politics, geography, entertainment, people, or any other topic outside \
school planning — even if you think you know the answer. Treat every such request exactly like a question about \
a topic you have never heard of.

For ANY off-topic request, your entire reply must be only a short decline plus a redirect, nothing else. Example — \
if asked "who is the president of Nigeria" or any comparable off-topic question, reply only with something like: \
"I'm only able to help with this school's planning data and decisions — I can't answer that. Is there something \
about your enrollment, attendance, staffing, budget, or infrastructure data I can help with instead?" Never give \
the actual answer to an off-topic question first and add a redirect after — refuse immediately, with no factual \
content about the off-topic subject anywhere in the reply."""

RECOMMENDATION_SYSTEM_PROMPT = """You are an assistant helping Lagos State secondary school administrators \
understand output from a predictive planning model. You will be given a summary of the school data that was fed \
into the model and the model's raw numeric predictions. Write a short, plain-English explanation of what the \
numbers mean and 2-4 concrete, actionable recommendations. If any input fields are flagged as estimated rather \
than reported by the school, clearly disclose that in your response — never present an estimated figure as if \
the school reported it. Do not mention that you are an AI or describe your own reasoning process. Address the \
school administrator directly and keep it concise.

If a "school_ranking" is included, it is precomputed and correct — every school's rank, predicted dropout_rate, \
and top_drivers were already calculated deterministically, not estimated by you. Its "schools" list is already \
sorted with rank 1 = highest predicted dropout_rate = most urgent. If you mention which schools need the most \
attention, take them from the start of that list in order (or the end, for least-urgent schools) — never pick \
from the middle or reorder by anything other than the rank already given, and ground every reason in the \
top_drivers already provided rather than inventing one. Each driver's "current_value" is that school's own \
existing reading for that feature, not a target — never invent a "from X to Y" or "instead of X" change figure \
that isn't explicitly given to you; describe the direction of the problem (too high/too low) instead."""


def build_recommendation_user_message(
    cleaned_df: pd.DataFrame,
    predictions: list,
    imputed_columns: list | None = None,
    ranking_summary: dict | None = None,
) -> str:
    n_rows = len(cleaned_df)
    summary_stats = {
        col: {
            "mean": float(cleaned_df[col].mean()),
            "min": float(cleaned_df[col].min()),
            "max": float(cleaned_df[col].max()),
        }
        for col in cleaned_df.columns
    }
    payload = {
        "row_count": n_rows,
        "column_summary_stats": summary_stats,
        "sample_rows": cleaned_df.head(5).to_dict(orient="records"),
        "sample_predictions": predictions[:5],
        "prediction_count": len(predictions),
    }
    if ranking_summary is not None:
        payload["school_ranking"] = ranking_summary
    message = (
        f"Here is a summary of the cleaned school data and the model's predictions "
        f"({n_rows} row(s) total; a sample of up to 5 is included for context, not the full dataset):\n\n"
        f"{json.dumps(payload, indent=2, default=str)}"
    )
    if imputed_columns:
        message += (
            "\n\nNote: the following fields were NOT present in the uploaded data and were estimated from "
            f"historical averages rather than reported by the school: {', '.join(imputed_columns)}. Clearly "
            "disclose this and do not present these as if the school reported them."
        )
    return message


CHAT_SYSTEM_PROMPT = """You are an assistant embedded in a chat product used by Lagos State secondary school \
administrators. Schools attach spreadsheets of their data and receive predictions from a trained planning \
model; your job is to discuss those predictions and the underlying data in plain English, answer follow-up \
questions, and give practical planning advice grounded in whatever prediction context is provided. If no \
prediction context is available for the current turn, answer from the conversation history alone and say so \
if the question requires data that hasn't been provided. Do not mention that you are an AI or describe your \
own reasoning process.

If a "School ranking" is included in the prediction context, it is precomputed and correct — every school's \
rank, predicted dropout_rate, and top drivers were already calculated deterministically, not estimated by you. \
The "schools" list is already sorted with rank 1 = highest predicted dropout_rate = most urgent need for \
intervention, counting down to the lowest/safest school at the end. To answer "prioritize N schools," "N most \
urgent," "top N," or similar, take exactly the first N schools in that list, in order — do not skip entries, do \
not pick from the middle or end, do not reorder by anything other than the rank already given. For the opposite \
kind of question ("safest to deprioritize," "least urgent"), take from the end of the list instead. Ground every \
reason you give in the top_drivers already provided for that school — never state a reason not present there. \
Each driver's "current_value" is that school's own existing reading for that feature, not a target — never \
invent a "from X to Y" or "instead of X" change figure that isn't explicitly given to you; describe the direction \
of the problem (too high/too low) instead. Whatever the exact phrasing or count asked for, read it from the \
actual question; never default to a fixed count like 3 unless the user's question specifies it.""" + SCOPE_RESTRICTION


def build_prediction_context_block(prediction) -> str:
    input_features = prediction.input_features
    prediction_output = json.loads(prediction.prediction_output)
    recommendation = prediction.recommendation_text
    row_labels = getattr(prediction, "row_labels", None)

    lines = [
        "Prediction context for this conversation:",
        f"School data: {json.dumps(input_features, default=str)}",
        f"Model predictions: {json.dumps(prediction_output, default=str)}",
    ]
    if recommendation:
        lines.append(f"Previously generated recommendation: {recommendation}")

    if row_labels and len(input_features) > 1:
        cleaned_df = pd.DataFrame(input_features)[STANDARD_COLUMNS]
        drivers = explain(cleaned_df)
        ranked = rank_schools(row_labels, prediction_output, drivers)
        ranking_summary = bounded_ranking_summary(ranked)
        lines.append(f"School ranking (precomputed, use directly): {json.dumps(ranking_summary, default=str)}")

    return "\n".join(lines)


MAPPING_SYSTEM_PROMPT = """You analyze the structure of an uploaded spreadsheet and produce a JSON plan for \
mapping/aggregating it into 5 fixed school-level numeric fields. You NEVER perform arithmetic yourself — you \
only choose, per field, which raw column to use and which of a small set of operations to apply; the actual \
computation is always done by separate code afterward. Respond with strict JSON only — no markdown, no code \
fences, no explanation before or after the JSON.

The 5 target fields and what they mean:
- enrollment: total number of students in the school
- teacher_student_ratio: average number of students per teacher
- attendance_rate: fraction (0-1) of students present on average
- budget_allocation: total budget allocated to the school (in Naira)
- infrastructure_score: a numeric rating of school infrastructure quality

Allowed operations, one per target field:
- {"op": "alias", "column": "<raw column name>"} — this raw column already IS the target value, just needs renaming.
- {"op": "row_count"} — the target is the number of rows (e.g. enrollment from a student-level roster). Only valid when group_by is not null.
- {"op": "mean", "column": "<raw column name>", "scale": <number, optional, default 1>} — target = mean of that column, times scale (e.g. a percentage column needs scale 0.01 to become a 0-1 fraction). Only valid when group_by is not null.
- {"op": "sum", "column": "<raw column name>", "scale": <number, optional, default 1>} — target = sum of that column, times scale. Only valid when group_by is not null.
- {"op": "unavailable"} — this target genuinely cannot be derived from the given data at all.

Top-level "group_by" decides how rows collapse into school-level output rows:
- a real column name — the file has multiple schools identified by that column (e.g. "school_name"); group by it, one output row per school.
- "__all__" — the file has no school-identifier column, but is NOT already one-row-per-school either (e.g. a single school's student roster); treat the whole file as one school.
- null — the file is ALREADY one row per school (each input row is its own output row); no aggregation happens, so only "alias" or "unavailable" are valid ops in this mode.

Respond with exactly this JSON shape (all 5 target fields must be present in "mapping"):
{"group_by": <string or null>, "mapping": {"enrollment": {...}, "teacher_student_ratio": {...}, "attendance_rate": {...}, "budget_allocation": {...}, "infrastructure_score": {...}}}"""


def build_mapping_user_message(raw_df: pd.DataFrame) -> str:
    payload = {
        "columns_and_types": {col: str(dtype) for col, dtype in raw_df.dtypes.items()},
        "sample_rows": raw_df.head(5).to_dict(orient="records"),
        "total_row_count": len(raw_df),
    }
    return (
        f"Here is the uploaded file's structure (columns/types and up to 5 sample rows; "
        f"the file has {len(raw_df)} row(s) total, not all shown):\n\n"
        f"{json.dumps(payload, indent=2, default=str)}\n\n"
        "Produce the mapping plan JSON now."
    )


RAW_DATA_CHAT_SYSTEM_PROMPT = """You are an assistant embedded in a chat product used by Lagos State secondary \
school administrators. A school has uploaded data, but its structure is too different from what the trained \
planning model requires — so NO formal model prediction was made this turn. Instead, read the raw uploaded data \
directly and answer the school's question as helpfully as you can, grounded in the actual rows given to you. You \
MUST clearly state early in your reply that this is a direct analysis of their data, not a prediction from the \
trained planning model, since the required fields aren't all present in what they uploaded. Do not mention that \
you are an AI or describe your own reasoning process.""" + SCOPE_RESTRICTION


def build_raw_data_context_block(raw_df: pd.DataFrame, unavailable_columns: list) -> str:
    lines = [
        "Raw data context for this conversation (no formal model prediction was made):",
        f"Uploaded columns: {list(raw_df.columns)}",
        f"Total rows in upload: {len(raw_df)}",
        f"Sample rows (up to 5 of {len(raw_df)}): {json.dumps(raw_df.head(5).to_dict(orient='records'), default=str)}",
        f"Planning fields the trained model needs but could not be found in this data: {', '.join(unavailable_columns)}",
    ]
    return "\n".join(lines)
