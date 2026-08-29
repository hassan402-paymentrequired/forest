"""
Per-prediction explainability: which input features drove a given school's
predicted dropout_rate, and in which direction. The RF gives a number with
no reasoning attached — this is what actually computes the "why" that the
LLM layer narrates (it never invents this itself, see app/llm/prompts.py).

Uses SHAP's TreeExplainer, which is exact and cheap for tree ensembles
(no background dataset/sampling needed, unlike model-agnostic SHAP).
"""

import shap

from app.ml.clean import STANDARD_COLUMNS
from app.ml.predict import get_model

_explainer = None


def get_explainer():
    global _explainer
    if _explainer is None:
        _explainer = shap.TreeExplainer(get_model())
    return _explainer


def explain(cleaned_df, top_n: int = 2) -> list[list[dict]]:
    """
    Returns one list of driver dicts per row of cleaned_df, each row's list
    sorted by |SHAP value| descending and capped to top_n. Each driver:
    {"feature": <STANDARD_COLUMNS name>, "direction": "increases"|"decreases",
    "current_value": <that row's own raw input value for the feature — not a
    target or recommended value>}, direction being relative to the predicted
    dropout_rate.
    """
    shap_values = get_explainer().shap_values(cleaned_df)

    drivers_per_row = []
    for row_idx in range(len(cleaned_df)):
        row_shap = shap_values[row_idx]
        ranked_features = sorted(
            range(len(STANDARD_COLUMNS)), key=lambda i: abs(row_shap[i]), reverse=True
        )[:top_n]
        drivers_per_row.append(
            [
                {
                    "feature": STANDARD_COLUMNS[i],
                    "direction": "increases" if row_shap[i] > 0 else "decreases",
                    "current_value": float(cleaned_df.iloc[row_idx][STANDARD_COLUMNS[i]]),
                }
                for i in ranked_features
            ]
        )
    return drivers_per_row
