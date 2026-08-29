"""
The main working endpoint: user uploads a file -> cleaned -> predicted -> saved.
Protected by JWT (get_current_user) so only logged-in users can use it.
"""

import json

from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user
from app.db.database import get_db
from app.db.schema import User, Prediction
from app.ml.pipeline import create_prediction_from_upload
from app.ml.pydantic_models import PredictionHistoryItem, PredictionResponse

router = APIRouter()


@router.post("/upload", response_model=PredictionResponse)
def upload_and_predict(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        result = create_prediction_from_upload(file, current_user, db)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except FileNotFoundError as e:
        raise HTTPException(status_code=500, detail=str(e))

    if result.status == "insufficient_data":
        raise HTTPException(
            status_code=422,
            detail=(
                "This file's structure is too different from the expected school-level data "
                f"(missing: {', '.join(result.unavailable_columns)}) for a formal prediction. "
                "Try the chat assistant instead — it can analyze this data directly."
            ),
        )

    return PredictionResponse(
        predictions=result.predictions,
        recommendation=result.prediction.recommendation_text,
        row_labels=result.prediction.row_labels,
    )


@router.get("/history", response_model=list[PredictionHistoryItem])
def prediction_history(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Past predictions for the current user — lets the chat reference earlier
    uploads even in a conversation that didn't just attach a file."""
    records = (
        db.query(Prediction)
        .filter(Prediction.user_id == current_user.id)
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
