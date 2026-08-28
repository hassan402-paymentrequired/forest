from datetime import datetime
from typing import Any, List

from pydantic import BaseModel


class PredictionResponse(BaseModel):
    predictions: List[float]
    recommendation: str | None = None


class PredictionHistoryItem(BaseModel):
    id: int
    input_features: list[dict[str, Any]] | None
    prediction_output: list[float]
    recommendation_text: str | None
    created_at: datetime

    class Config:
        from_attributes = True
