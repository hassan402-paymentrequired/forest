"""
Shared upload -> clean -> predict -> persist pipeline, used by both the
/predict/upload endpoint and the chat /respond endpoint so the logic exists
in exactly one place.

Three outcomes, expressed via UploadPredictionResult.status:
- "ok": clean_dataframe succeeded (fast path), or LLM-assisted mapping
  recovered enough columns to impute the rest and run the real model.
- "insufficient_data": the upload's structure is too different from
  STANDARD_COLUMNS to trust a model prediction at all — no Prediction row
  is created; callers decide how to respond (see prediction_routes.py /
  chat_routes.py).
"""

import json
import os
import shutil
import uuid
from dataclasses import dataclass, field
from typing import Literal

import pandas as pd
from fastapi import UploadFile
from sqlalchemy.orm import Session

from app.db.schema import Prediction, Upload, User
from app.llm.generate import generate_recommendation
from app.ml.clean import (
    MAX_IMPUTABLE_MISSING_COLUMNS,
    STANDARD_COLUMNS,
    clean_dataframe,
    impute_missing_columns,
    load_upload_file,
)
from app.ml.mapping import map_via_llm
from app.ml.predict import predict

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)


@dataclass
class UploadPredictionResult:
    status: Literal["ok", "insufficient_data"]
    prediction: Prediction | None = None
    predictions: list | None = None
    raw_df: pd.DataFrame | None = None  # only set when status == "insufficient_data"
    unavailable_columns: list = field(default_factory=list)
    used_llm_mapping: bool = False
    imputed_columns: list = field(default_factory=list)


def create_prediction_from_upload(file: UploadFile, user: User, db: Session) -> UploadPredictionResult:
    ext = os.path.splitext(file.filename)[1]
    saved_name = f"{uuid.uuid4()}{ext}"
    saved_path = os.path.join(UPLOAD_DIR, saved_name)

    with open(saved_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    upload_record = Upload(user_id=user.id, file_path=saved_path)
    db.add(upload_record)
    db.commit()
    db.refresh(upload_record)

    raw_df = load_upload_file(saved_path)

    used_llm_mapping = False
    imputed_columns: list = []
    try:
        cleaned_df = clean_dataframe(raw_df)  # unchanged fast path, zero added cost on success
    except ValueError:
        mapping_result = map_via_llm(raw_df)
        unavailable = mapping_result[1] if mapping_result else list(STANDARD_COLUMNS)

        if len(unavailable) > MAX_IMPUTABLE_MISSING_COLUMNS:
            return UploadPredictionResult(
                status="insufficient_data",
                raw_df=raw_df,
                unavailable_columns=unavailable,
                used_llm_mapping=mapping_result is not None,
            )

        used_llm_mapping = True
        imputed_columns = unavailable
        cleaned_df = impute_missing_columns(mapping_result[0], unavailable)

    # Let FileNotFoundError (no model.pkl) propagate — callers map it to an HTTP response.
    predictions = predict(cleaned_df)

    recommendation = generate_recommendation(cleaned_df, predictions, imputed_columns=imputed_columns)

    prediction_record = Prediction(
        user_id=user.id,
        upload_id=upload_record.id,
        input_features=cleaned_df.to_dict(orient="records"),
        prediction_output=json.dumps(predictions),
        recommendation_text=recommendation,
    )
    db.add(prediction_record)
    db.commit()
    db.refresh(prediction_record)

    return UploadPredictionResult(
        status="ok",
        prediction=prediction_record,
        predictions=predictions,
        used_llm_mapping=used_llm_mapping,
        imputed_columns=imputed_columns,
    )
