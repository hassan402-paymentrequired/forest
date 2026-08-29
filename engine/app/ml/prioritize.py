"""
Deterministic ranking of schools by predicted dropout_rate, with SHAP-driven
per-school reasons attached. This module never decides *how many* schools
matter or *why* the user is asking — that's for the LLM to read off the
user's actual question (see app/llm/prompts.py). Its only job is to make
sure the full, correctly-ordered picture is available for the LLM to draw
from, for any question, at any N.
"""

# The model is trained on a single target, dropout_rate — higher predicted
# value means more urgent need for intervention. Revisit this constant if a
# second target metric (with the opposite direction) is ever trained.
TARGET_HIGHER_IS_HIGHER_PRIORITY = True


def rank_schools(row_labels: list[str], predictions: list[float], drivers: list[list[dict]]) -> list[dict]:
    """
    Ranks every row (not a subset) descending by predicted dropout_rate.
    Each entry: {"rank", "label", "predicted_dropout_rate", "top_drivers"}.
    """
    combined = list(zip(row_labels, predictions, drivers))
    combined.sort(key=lambda item: item[1], reverse=TARGET_HIGHER_IS_HIGHER_PRIORITY)

    return [
        {
            "rank": rank,
            "label": label,
            "predicted_dropout_rate": prediction,
            "top_drivers": row_drivers,
        }
        for rank, (label, prediction, row_drivers) in enumerate(combined, start=1)
    ]


def bounded_ranking_summary(ranked: list[dict], max_rows: int = 15) -> dict:
    """
    Caps the ranking payload size regardless of dataset size (matches the
    size-boundedness principle in app/llm/prompts.py) — this is a token
    budget cap, unrelated to how many schools any given question is about.
    Below the cap, returns every school; above it, the top 10 + bottom 5
    (the two ends any prioritization question would plausibly need).
    """
    total = len(ranked)
    if total <= max_rows:
        return {"total_schools": total, "schools": ranked, "omitted_middle": 0}

    top = ranked[:10]
    bottom = ranked[-5:]
    return {
        "total_schools": total,
        "schools": top + bottom,
        "omitted_middle": total - len(top) - len(bottom),
    }
