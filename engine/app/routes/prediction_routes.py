"""
The main working endpoint: user uploads a file -> cleaned -> predicted -> saved.
Protected by JWT (get_current_user) so only logged-in users can use it.
"""

import json
import os
import shutil
import uuid

from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user
from app.db.database import get_db
from app.db.schema import User, Upload, Prediction
from app.ml.clean import load_upload_file, clean_dataframe
from app.ml.predict import predict
from app.ml.pydantic_models import PredictionHistoryItem, PredictionResponse

router = APIRouter()

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.post("/upload", response_model=PredictionResponse)
def upload_and_predict(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # 1. Save the raw file to disk, record its path.
    ext = os.path.splitext(file.filename)[1]
    saved_name = f"{uuid.uuid4()}{ext}"
    saved_path = os.path.join(UPLOAD_DIR, saved_name)

    with open(saved_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    upload_record = Upload(user_id=current_user.id, file_path=saved_path)
    db.add(upload_record)
    db.commit()
    db.refresh(upload_record)

    # 2. Clean/map the uploaded data into the model's expected structure.
    try:
        raw_df = load_upload_file(saved_path)
        cleaned_df = clean_dataframe(raw_df)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    # 3. Run the model.
    try:
        predictions = predict(cleaned_df)
    except FileNotFoundError as e:
        raise HTTPException(status_code=500, detail=str(e))

    # 4. Save prediction result.
    # TODO: plug in LLM call here to turn `predictions` into recommendation_text.
    recommendation = None

    prediction_record = Prediction(
        user_id=current_user.id,
        upload_id=upload_record.id,
        input_features=cleaned_df.to_dict(orient="records"),
        prediction_output=json.dumps(predictions),
        recommendation_text=recommendation,
    )
    db.add(prediction_record)
    db.commit()

    return PredictionResponse(predictions=predictions, recommendation=recommendation)


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
            prediction_output=json.loads(r.prediction_output),
            recommendation_text=r.recommendation_text,
            created_at=r.created_at,
        )
        for r in records
    ]
