"""
Aggregates each school's most recent prediction into the shape
app/ml/prioritize.py's rank_schools/bounded_ranking_summary already expect —
those were built generic (labels + predictions + drivers from any source),
so a Ministry-wide "latest prediction per school" view needs nothing new
from them, just this query.
"""

import json

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.db.schema import Prediction, User


def latest_predictions_all_schools(db: Session) -> list[dict]:
    """
    One row per "school" user, using their most recent Prediction (if any).
    Schools that have never uploaded data are omitted — nothing to rank yet.
    """
    latest_created_at = (
        db.query(
            Prediction.user_id,
            func.max(Prediction.created_at).label("max_created_at"),
        )
        .group_by(Prediction.user_id)
        .subquery()
    )

    rows = (
        db.query(User, Prediction)
        .join(Prediction, Prediction.user_id == User.id)
        .join(
            latest_created_at,
            (Prediction.user_id == latest_created_at.c.user_id)
            & (Prediction.created_at == latest_created_at.c.max_created_at),
        )
        .filter(User.role == "school")
        .all()
    )

    results = []
    for user, prediction in rows:
        predictions = json.loads(prediction.prediction_output)
        row_labels = prediction.row_labels or [user.name]
        results.append(
            {
                "user_id": user.id,
                "school_name": user.name,
                "prediction_id": prediction.id,
                "predictions": predictions,
                "row_labels": row_labels,
                "created_at": prediction.created_at,
            }
        )
    return results
