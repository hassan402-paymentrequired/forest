"""
Ministry-only endpoints — see a school can only see itself; a Ministry
account can see every school. Gated by require_ministry (app/auth/dependencies.py).
"""

import json

import pandas as pd
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.auth.dependencies import require_ministry
from app.db.database import get_db
from app.db.schema import Prediction, User
from app.ml.clean import STANDARD_COLUMNS
from app.ml.cross_school import latest_predictions_all_schools
from app.ml.explain import explain
from app.ml.prioritize import bounded_ranking_summary, rank_schools
from app.ml.pydantic_models import PredictionHistoryItem

router = APIRouter()


@router.get("/schools")
def list_schools(
    db: Session = Depends(get_db),
    _: User = Depends(require_ministry),
):
    """Every school's most recent prediction, ranked by predicted dropout_rate."""
    latest = latest_predictions_all_schools(db)
    if not latest:
        return {"total_schools": 0, "schools": [], "omitted_middle": 0}

    predictions_by_id = {
        p.id: p
        for p in db.query(Prediction)
        .filter(Prediction.id.in_([s["prediction_id"] for s in latest]))
        .all()
    }

    labels = []
    representative_predictions = []
    drivers = []
    extra_by_label = {}

    for school in latest:
        # A school account should almost always have exactly one row; if it
        # somehow has more, the worst (max) row becomes its representative
        # score so the ranking never crashes on it.
        worst_idx = max(
            range(len(school["predictions"])), key=lambda i: school["predictions"][i]
        )
        prediction = predictions_by_id[school["prediction_id"]]
        cleaned_df = pd.DataFrame(prediction.input_features)[STANDARD_COLUMNS]
        row_drivers = explain(cleaned_df)

        labels.append(school["school_name"])
        representative_predictions.append(school["predictions"][worst_idx])
        drivers.append(row_drivers[worst_idx])
        extra_by_label[school["school_name"]] = {
            "user_id": school["user_id"],
            "prediction_id": school["prediction_id"],
        }

    ranked = rank_schools(labels, representative_predictions, drivers)
    for entry in ranked:
        entry.update(extra_by_label[entry["label"]])

    return bounded_ranking_summary(ranked)


@router.get("/schools/{user_id}/predictions", response_model=list[PredictionHistoryItem])
def school_prediction_history(
    user_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_ministry),
):
    school = db.query(User).filter(User.id == user_id, User.role == "school").first()
    if school is None:
        raise HTTPException(status_code=404, detail="School not found")

    records = (
        db.query(Prediction)
        .filter(Prediction.user_id == user_id)
        .order_by(Prediction.created_at.desc())
        .all()
    )
    return [
        PredictionHistoryItem(
            id=r.id,
            input_features=r.input_features,
            row_labels=r.row_labels,
            prediction_output=json.loads(r.prediction_output),
            recommendation_text=r.recommendation_text,
            created_at=r.created_at,
        )
        for r in records
    ]
